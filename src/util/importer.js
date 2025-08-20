// src/util/importer.js — sem dependências externas
import { createQuiz, createQuestion } from '../db';

/** Importa texto como JSON (lista de objetos) ou CSV.
 * JSON: [{ quiz, question, answer, explanation?, tags? }]
 * CSV: quiz,pergunta,resposta,explicacao,tags
 */
export async function importText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  if (trimmed.startsWith('[')) {
    const data = JSON.parse(trimmed);
    await importJson(data);
  } else {
    await importCsv(trimmed);
  }
}

async function importJson(list) {
  const byQuiz = groupBy(list, x => (x.quiz || 'Geral').trim());
  for (const [quizTitle, items] of Object.entries(byQuiz)) {
    const quizId = await createQuiz(quizTitle, '');
    for (const b of items) {
      await createQuestion(
        quizId,
        b.question || '',
        b.answer || '',
        b.explanation || '',
        b.tags || ''
      );
    }
  }
}

async function importCsv(text) {
  const rows = parseCsv(text); // [[quiz,pergunta,resposta,explicacao,tags],...]
  const bundles = rows.map(cols => ({
    quiz: (cols[0] || 'Geral').trim(),
    question: (cols[1] || '').trim(),
    answer: (cols[2] || '').trim(),
    explanation: (cols[3] || '').trim(),
    tags: (cols[4] || '').trim()
  })).filter(b => b.question && b.answer);
  await importJson(bundles);
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

/** Parser CSV simples com suporte a aspas e "" (escape).
 * Delimitador: vírgula, quebra de linha: \n (ignora \r).
 * Ex.: a,"b,c","d""e",f
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') { field += '"'; i++; } // escape ""
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n') {
        row.push(field); rows.push(row);
        row = []; field = '';
      } else if (c === '\r') {
        // ignore
      } else {
        field += c;
      }
    }
  }
  // último campo/linha
  row.push(field);
  rows.push(row);
  // remove linhas vazias
  return rows.filter(r => r.some(v => String(v || '').trim() !== ''));
}
