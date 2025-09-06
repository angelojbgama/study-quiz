// src/util/logger.js
// Loga erros em TXT sempre que ocorrer uma exceção JS não tratada
// e oferece helpers para compartilhar/inspecionar o último log.

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const LOG_DIR = FileSystem.documentDirectory + 'logs/';

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${yyyy}${MM}${dd}-${hh}${mm}${ss}-${ms}`;
}

async function ensureLogDir() {
  try {
    const info = await FileSystem.getInfoAsync(LOG_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(LOG_DIR, { intermediates: true });
    }
  } catch {}
}

function serializeError(err) {
  if (err instanceof Error) {
    return `${err.name || 'Error'}: ${err.message}\n${err.stack || ''}`.trim();
  }
  try {
    return typeof err === 'string' ? err : JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

export async function writeErrorTxt(err, extra = {}) {
  try {
    await ensureLogDir();
    const stamp = nowStamp();
    const filename = `error-${stamp}.txt`;
    const path = LOG_DIR + filename;

    const payload = {
      when: new Date().toISOString(),
      isFatal: !!extra.isFatal,
      context: extra.context || null,
      message: err?.message || String(err),
      stack: err?.stack || null,
      raw: serializeError(err),
      // você pode incluir infos do app/dispositivo aqui se quiser
    };

    const body =
`==== APP ERROR LOG ====
Timestamp: ${payload.when}
Fatal: ${payload.isFatal}
Context: ${payload.context ?? '-'}
Message: ${payload.message}
----------------------------------------
Stack:
${payload.stack ?? '(sem stack)'}
----------------------------------------
Raw:
${payload.raw}
========================================
`;

    await FileSystem.writeAsStringAsync(path, body, { encoding: FileSystem.EncodingType.UTF8 });
    return path;
  } catch (e) {
    // último recurso: nada a fazer se não conseguir escrever
    return null;
  }
}

// Para usar em catch(): await logCaughtError(e, 'importacao');
export async function logCaughtError(err, context) {
  return writeErrorTxt(err, { isFatal: false, context });
}

// Compartilha o log mais recente (útil no dev para “chegar” no VSCode via compartilhamento)
export async function shareLatestLog() {
  await ensureLogDir();
  const files = (await FileSystem.readDirectoryAsync(LOG_DIR))
    .filter((n) => n.endsWith('.txt'))
    .sort(); // nomes têm timestamp -> ordena por nome resolve
  if (!files.length) return null;

  const latest = LOG_DIR + files[files.length - 1];
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(latest, { mimeType: 'text/plain' });
    }
  } catch {}
  return latest;
}

export async function listLogFiles() {
  await ensureLogDir();
  const files = await FileSystem.readDirectoryAsync(LOG_DIR);
  return files.filter((n) => n.endsWith('.txt')).map((n) => LOG_DIR + n).sort();
}

export async function clearLogs() {
  try {
    await FileSystem.deleteAsync(LOG_DIR, { idempotent: true });
    await ensureLogDir();
  } catch {}
}

// Liga os handlers globais: exceções JS e “possible unhandled promise rejection”
export function initErrorLogging() {
  // Handler padrão do RN
  const defaultHandler =
    global.ErrorUtils?.getGlobalHandler?.() ??
    ((e) => console.error('Unhandled JS Exception', e));

  // Exceções JS não tratadas
  try {
    global.ErrorUtils?.setGlobalHandler?.(async (error, isFatal) => {
      await writeErrorTxt(error, { isFatal: !!isFatal, context: 'GlobalErrorHandler' });
      defaultHandler?.(error, isFatal);
    });
  } catch {}

  // Promises não tratadas: RN costuma logar no console com essa string
  const originalConsoleError = console.error;
  console.error = (...args) => {
    try {
      const joined = args
        .map((a) => (a instanceof Error ? a.stack || a.message : typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ');

      // Pega mensagens do RN para rejeições não tratadas
      if (/Possible Unhandled Promise Rejection/i.test(joined)) {
        writeErrorTxt(new Error(joined), { isFatal: false, context: 'UnhandledPromiseRejection' });
      }
    } catch {}
    originalConsoleError(...args);
  };
}

export const LOGS_DIR = LOG_DIR;
