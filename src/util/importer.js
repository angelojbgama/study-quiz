// src/util/importer.js
/**
 * Aceita:
 * - JSON array de objetos
 * - JSONL (uma linha por JSON)
 * - CSV (com ou sem cabeçalho)
 *
 * Campos aceitos (sinônimos):
 * quiz/deck, question/pergunta/questao, answer/resposta, explanation/explicacao, tags,
 * wrong1..3 / incorreta1..3 / errada1..3 / alternativaN
 */
export function normalizeRecord(obj) {
  const o = obj || {};
  const quiz = (o.quiz ?? o.deck ?? 'Geral').toString().trim();
  const question = (o.question ?? o.pergunta ?? o.questao ?? o['questão'] ?? o.termo ?? '').toString().trim();
  const answer = (o.answer ?? o.resposta ?? '').toString().trim();
  const explanation = (o.explanation ?? o.explicacao ?? o['explicação'] ?? '').toString().trim();

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
    `alternativa${n}`, `alt${n}`, `distrator${n}`, `distrator_${n}`
  ];
  for (const k of keys) {
    if (o[k] != null && String(o[k]).trim() !== '') return String(o[k]).trim();
  }
  return '';
}

export function looksLikeJSONArray(s) { return s.startsWith('[') && s.trim().endsWith(']'); }
export function looksLikeJSONL(s) {
  const lines = s.split(/\r?\n/).filter(Boolean);
  if (lines.length < 1) return false;
  return lines.every((t) => t.trim().startsWith('{') && t.trim().endsWith('}'));
}

export function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  const first = lines[0] || '';
  const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';

  const rows = [];
  let row = [], field = '', inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1];
        if (next === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === sep) { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  row.push(field); rows.push(row);
  let clean = rows.filter((r) => r.some((v) => String(v || '').trim() !== ''));

  let header = null;
  if (clean.length) {
    const maybe = clean[0].map((c) => String(c || '').trim().toLowerCase());
    const known = new Set([
      'quiz','deck',
      'pergunta','questão','questao','question',
      'resposta','answer',
      'explicacao','explicação','explanation',
      'tags',
      'wrong1','wrong2','wrong3',
      'incorreta1','incorreta2','incorreta3',
      'errada1','errada2','errada3'
    ]);
    if (maybe.some((c) => known.has(c))) {
      header = maybe;
      clean = clean.slice(1);
    }
  }
  return { rows: clean, header, sep };
}
