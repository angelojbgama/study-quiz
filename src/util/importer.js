// src/util/importer.js
import { createQuiz, createQuestion } from '../db';

/**
 * Importa texto em JSON, JSONL ou CSV.
 * - JSON: array de objetos. Chaves aceitas (flexíveis):
 *   { quiz|deck, question|pergunta|questao|termo, answer|resposta, explanation|explicacao, tags }
 *   -> tags pode ser string ou array
 * - JSONL: um objeto JSON por linha (mesmas chaves acima)
 * - CSV: quiz, pergunta/question, resposta/answer, explicacao/explanation, tags
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
  // Ex.: [ { ... }, { ... } ]
  return s.startsWith('[') && s.endsWith(']');
}

function looksLikeJSONL(s) {
  // Heurística: várias linhas iniciando com { e terminando com }
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

  return { quiz, question, answer, explanation, tags };
}

/* ===================== Import JSON Array/JSONL ===================== */

async function importJsonArray(list) {
  if (!Array.isArray(list)) throw new Error('JSON deve ser um array de objetos.');

  const bundles = list.map(normalizeRecord).filter(b => b.question && b.answer);
  return await importBundles(bundles);
}

/* ===================== Import CSV ===================== */

async function importCsv(text) {
  const rows = parseCsv(text);
  // Mapeia tanto PT quanto EN nas colunas
  const bundles = rows.map(cols => normalizeRecord({
    quiz: cols[0],
    question: cols[1],
    answer: cols[2],
    explanation: cols[3],
    tags: cols[4]
  })).filter(b => b.question && b.answer);

  return await importBundles(bundles);
}

// CSV com aspas e "" escape; detecta ; ou , ; ignora cabeçalho conhecido
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
  const clean = rows.filter(r => r.some(v => String(v || '').trim() !== ''));

  // detecta e remove cabeçalho se presente
  if (clean.length && isHeaderRow(clean[0])) clean.shift();

  return clean;
}

function isHeaderRow(cols) {
  const header = cols.map(c => String(c || '').trim().toLowerCase());
  const known = new Set([
    'quiz',
    'pergunta', 'questão', 'questao', 'question',
    'resposta', 'answer',
    'explicacao', 'explicação', 'explanation',
    'tags'
  ]);
  // Se alguma coluna bate com nomes conhecidos, tratamos como header
  return header.some(c => known.has(c));
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
      await createQuestion(quizId, b.question, b.answer, b.explanation, b.tags);
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
