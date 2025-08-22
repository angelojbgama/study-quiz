import { createQuiz, createQuestion } from '../db';

/**
 * Importa texto em JSON, JSONL ou CSV.
 * - JSON: array de objetos. Chaves aceitas (flexíveis):
 *   { quiz|deck, question|pergunta|questao|termo, answer|resposta, explanation|explicacao,
 *     tags, wrong1|incorreta1|errada1, wrong2|incorreta2|errada2, wrong3|incorreta3|errada3 }
 *   -> tags pode ser string ou array
 * - JSONL: um objeto JSON por linha (mesmas chaves acima)
 * - CSV (com ou sem cabeçalho):
 *   quiz,pergunta/resposta/explicacao/tags,wrong1,wrong2,wrong3
 *
 * Retorna: { importedCount, quizzesCount }
 */
export async function importText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { importedCount: 0, quizzesCount: 0 };

  if (looksLikeJSONArray(trimmed)) {
    const data = JSON.parse(trimmed);
    return await importJsonArray(data);
  }

  if (looksLikeJSONL(trimmed)) {
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const objs = lines.map((l, idx) => {
      try { return JSON.parse(l); }
      catch (e) { throw new Error(`Linha ${idx + 1} não é JSON válido.`); }
    });
    return await importJsonArray(objs);
  }

  // Caso contrário, trata como CSV
  return await importCsv(trimmed);
}

/* ===================== Helpers de formato ===================== */

function looksLikeJSONArray(s) {
  return s.startsWith('[') && s.endsWith(']');
}
function looksLikeJSONL(s) {
  const lines = s.split(/\r?\n/).filter(Boolean);
  if (lines.length < 1) return false;
  return lines.every(l => {
    const t = l.trim();
    return t.startsWith('{') && t.endsWith('}');
  });
}

/* ===================== Normalização ===================== */

function normalizeRecord(obj) {
  const o = obj || {};
  const quiz = (o.quiz ?? o.deck ?? 'Geral').toString().trim();
  const question = (o.question ?? o.pergunta ?? o.questao ?? o.termo ?? '').toString().trim();
  const answer = (o.answer ?? o.resposta ?? '').toString().trim();
  const explanation = (o.explanation ?? o.explicacao ?? '').toString().trim();

  let tags = o.tags ?? '';
  if (Array.isArray(tags)) tags = tags.join(', ');
  tags = String(tags || '').trim();

  const wrong1 = pickWrong(o, 1);
  const wrong2 = pickWrong(o, 2);
  const wrong3 = pickWrong(o, 3);

  return { quiz, question, answer, explanation, tags, wrong1, wrong2, wrong3 };
}

function pickWrong(o, n) {
  const keys = [
    `wrong${n}`, `incorreta${n}`, `errada${n}`,
    `distrator${n}`, `distrator_${n}`, `alt${n}`, `alternativa${n}`
  ];
  for (const k of keys) {
    if (o[k] != null && String(o[k]).trim() !== '') return String(o[k]).trim();
  }
  return '';
}

/* ===================== Import JSON Array/JSONL ===================== */

async function importJsonArray(list) {
  if (!Array.isArray(list)) throw new Error('JSON deve ser um array de objetos.');

  const bundles = list.map(normalizeRecord).filter(b => b.question && b.answer);
  return await importBundles(bundles);
}

/* ===================== Import CSV ===================== */

async function importCsv(text) {
  const { rows, header } = parseCsv(text);
  let bundles;

  if (header && header.length) {
    // Com cabeçalho: mapear por nome
    bundles = rows.map(cols => {
      const obj = {};
      header.forEach((h, i) => { obj[h] = cols[i]; });
      return normalizeRecord(obj);
    });
  } else {
    // Sem cabeçalho: posições fixas
    bundles = rows.map(cols => normalizeRecord({
      quiz: cols[0],
      question: cols[1],
      answer: cols[2],
      explanation: cols[3],
      tags: cols[4],
      wrong1: cols[5],
      wrong2: cols[6],
      wrong3: cols[7],
    }));
  }

  bundles = bundles.filter(b => b.question && b.answer);
  return await importBundles(bundles);
}

// CSV com aspas e "" escape; detecta ; ou , ; identifica cabeçalho
function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  const first = lines[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === sep) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* ignore */ }
      else field += c;
    }
  }
  row.push(field); rows.push(row);

  // remove linhas completamente vazias
  let clean = rows.filter(r => r.some(v => String(v || '').trim() !== ''));

  // detecta header
  let header = null;
  if (clean.length) {
    const maybe = clean[0].map(c => String(c || '').trim().toLowerCase());
    const known = new Set([
      'quiz',
      'pergunta','questão','questao','question',
      'resposta','answer',
      'explicacao','explicação','explanation',
      'tags',
      'wrong1','wrong2','wrong3',
      'incorreta1','incorreta2','incorreta3',
      'errada1','errada2','errada3'
    ]);
    if (maybe.some(c => known.has(c))) {
      header = maybe;
      clean = clean.slice(1);
    }
  }

  return { rows: clean, header };
}

/* ===================== Persistência ===================== */

async function importBundles(bundles) {
  if (!bundles.length) return { importedCount: 0, quizzesCount: 0 };

  const byQuiz = groupBy(bundles, b => (b.quiz || 'Geral').trim() || 'Geral');

  let imported = 0;
  let quizzes = 0;
  for (const [quizTitle, items] of Object.entries(byQuiz)) {
    const quizId = await createQuiz(quizTitle, '');
    quizzes++;
    for (const b of items) {
      await createQuestion(
        quizId,
        b.question,
        b.answer,
        b.explanation,
        b.tags,
        b.wrong1,
        b.wrong2,
        b.wrong3
      );
      imported++;
    }
  }
  return { importedCount: imported, quizzesCount: quizzes };
}

/* ===================== Utils ===================== */

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}
