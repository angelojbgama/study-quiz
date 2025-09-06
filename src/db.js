// src/db.js — Camada única e simples (expo-sqlite)
import * as SQLite from 'expo-sqlite';

// --- SRS (Leitner) simples
const BOX_INTERVALS_DAYS = { 1:1, 2:2, 3:4, 4:7, 5:15 };
function nextBox(currentBox, isCorrect) { return isCorrect ? Math.min(5, (currentBox || 1) + 1) : 1; }
function nextDueAt(box, now = Date.now()) {
  const days = BOX_INTERVALS_DAYS[box] ?? 1;
  return now + days * 24 * 60 * 60 * 1000;
}

let _db;

export async function initDb() {
  if (_db) return;
  _db = await SQLite.openDatabaseAsync('studyquiz.db');
  await _db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS quiz(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS question(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quizId INTEGER NOT NULL,
      text TEXT NOT NULL,
      answer TEXT DEFAULT '',
      explanation TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      difficulty INTEGER DEFAULT 1,
      box INTEGER DEFAULT 1,
      due_at INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      wrong_count INTEGER DEFAULT 0,
      FOREIGN KEY(quizId) REFERENCES quiz(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS option_item(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      questionId INTEGER NOT NULL,
      text TEXT NOT NULL,
      isCorrect INTEGER DEFAULT 0,
      FOREIGN KEY(questionId) REFERENCES question(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_question_quiz ON question(quizId);
    CREATE INDEX IF NOT EXISTS idx_question_due ON question(due_at);
    CREATE INDEX IF NOT EXISTS idx_option_question ON option_item(questionId);
  `);

  await _db.runAsync(`
    UPDATE question
    SET due_at = CASE
      WHEN due_at IS NULL OR due_at = 0 THEN CAST(strftime('%s','now') AS INTEGER) * 1000
      ELSE due_at
    END
  `);
}

// --- helpers
async function all(sql, params=[]) { await initDb(); return _db.getAllAsync(sql, params); }
async function one(sql, params=[]) { await initDb(); return _db.getFirstAsync(sql, params); }
async function run(sql, params=[]) { await initDb(); return _db.runAsync(sql, params); }
async function tx(fn) {
  await initDb();
  await _db.execAsync('BEGIN');
  try { const res = await fn(); await _db.execAsync('COMMIT'); return res; }
  catch (e) { await _db.execAsync('ROLLBACK'); throw e; }
}

// --- QUIZ
export async function getQuizzes() {
  const rows = await all('SELECT * FROM quiz ORDER BY id DESC');
  return rows.map((r) => ({ id: r.id, title: r.title, description: r.description ?? '' }));
}
export async function createQuiz(title, description='') {
  const res = await run('INSERT INTO quiz(title, description) VALUES (?,?)', [String(title||'').trim(), String(description||'')]);
  return res.lastInsertRowId;
}
export async function deleteQuiz(id) { await run('DELETE FROM quiz WHERE id = ?', [id]); }

// --- QUESTION
export async function getQuestionsByQuiz(quizId) {
  const rows = await all('SELECT * FROM question WHERE quizId = ? ORDER BY id DESC', [quizId]);
  return rows.map((q) => ({
    id: q.id, quizId: q.quizId, text: q.text, answer: q.answer ?? '',
    explanation: q.explanation ?? '', tags: q.tags ?? '',
    difficulty: q.difficulty ?? 1, box: q.box ?? 1, due_at: q.due_at ?? 0,
    correct_count: q.correct_count ?? 0, wrong_count: q.wrong_count ?? 0,
  }));
}
export async function getQuestionById(id) {
  const q = await one('SELECT * FROM question WHERE id = ?', [id]);
  if (!q) return null;
  return {
    id: q.id, quizId: q.quizId, text: q.text, answer: q.answer ?? '',
    explanation: q.explanation ?? '', tags: q.tags ?? '',
    difficulty: q.difficulty ?? 1, box: q.box ?? 1, due_at: q.due_at ?? 0,
    correct_count: q.correct_count ?? 0, wrong_count: q.wrong_count ?? 0,
  };
}
export async function createQuestion(quizId, text, answer, explanation='', tags='') {
  const res = await run(
    `INSERT INTO question(quizId, text, answer, explanation, tags, box, due_at)
     VALUES (?,?,?,?,?,?,?)`,
    [quizId, String(text||'').trim(), String(answer||'').trim(), String(explanation||''), String(tags||''), 1, Date.now()]
  );
  return res.lastInsertRowId;
}
export async function updateQuestion(id, fields={}) {
  const allowed = ['text','answer','explanation','tags','difficulty'];
  const sets = [], args = [];
  for (const k of allowed) if (Object.prototype.hasOwnProperty.call(fields, k)) { sets.push(`${k} = ?`); args.push(fields[k]); }
  if (!sets.length) return;
  args.push(id);
  await run(`UPDATE question SET ${sets.join(', ')} WHERE id = ?`, args);
}
export async function deleteQuestion(id) { await run('DELETE FROM question WHERE id = ?', [id]); }

// --- OPTIONS
export async function getOptionsByQuestion(questionId) {
  const rows = await all('SELECT id, questionId, text, isCorrect FROM option_item WHERE questionId = ? ORDER BY id ASC', [questionId]);
  return rows.map((r) => ({ id: r.id, questionId: r.questionId, text: r.text, isCorrect: !!r.isCorrect }));
}
export async function replaceOptions(questionId, options=[]) {
  await tx(async () => {
    await run('DELETE FROM option_item WHERE questionId = ?', [questionId]);
    for (const o of options) {
      await run('INSERT INTO option_item (questionId, text, isCorrect) VALUES (?,?,?)', [questionId, String(o.text||''), o.isCorrect?1:0]);
    }
  });
}

// --- SRS
export async function applySrsResult(questionId, isCorrect) {
  const row = await one('SELECT box FROM question WHERE id = ?', [questionId]);
  const curBox = row?.box || 1;
  const nb = nextBox(curBox, !!isCorrect);
  const due = nextDueAt(nb);
  await run(
    `UPDATE question
     SET box = ?, due_at = ?, correct_count = correct_count + (?), wrong_count = wrong_count + (?)
     WHERE id = ?`,
    [nb, due, isCorrect?1:0, isCorrect?0:1, questionId]
  );
}

// --- BACKUP (local)
export async function exportAllData() {
  const quizzes = await all('SELECT * FROM quiz');
  const result = [];
  for (const q of quizzes) {
    const questions = await all('SELECT * FROM question WHERE quizId = ? ORDER BY id ASC', [q.id]);
    const enriched = [];
    for (const row of questions) {
      const opts = await all('SELECT id, text, isCorrect FROM option_item WHERE questionId = ? ORDER BY id ASC', [row.id]);
      enriched.push({ ...row, options: opts });
    }
    result.push({ quiz: { id: q.id, title: q.title, description: q.description ?? '' }, questions: enriched });
  }
  return result;
}

export async function importFullBackup(data) {
  await tx(async () => {
    for (const deck of data || []) {
      const ins = await run('INSERT INTO quiz(title, description) VALUES (?,?)', [deck?.quiz?.title || 'Importado', deck?.quiz?.description || '']);
      const newQuizId = ins.lastInsertRowId;
      for (const q of deck.questions || []) {
        const qIns = await run(
          `INSERT INTO question(quizId, text, answer, explanation, tags, difficulty, box, due_at, correct_count, wrong_count)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [ newQuizId, q.text||'', q.answer||'', q.explanation||'', q.tags||'', q.difficulty||1, q.box||1, q.due_at||Date.now(), q.correct_count||0, q.wrong_count||0 ]
        );
        const newQId = qIns.lastInsertRowId;
        if (Array.isArray(q.options)) {
          for (const opt of q.options) {
            await run('INSERT INTO option_item (questionId, text, isCorrect) VALUES (?,?,?)', [newQId, String(opt.text||''), opt.isCorrect?1:0]);
          }
        }
      }
    }
  });
}

// --- Importador “texto solto”
import { looksLikeJSONArray, looksLikeJSONL, normalizeRecord, parseCsv } from './util/importer';

export async function importText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return { importedCount: 0, quizzesCount: 0 };

  if (looksLikeJSONArray(trimmed)) {
    const data = JSON.parse(trimmed);
    return await importJsonArray(data);
  }
  if (looksLikeJSONL(trimmed)) {
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const objs = lines.map((l, i) => { try { return JSON.parse(l); } catch { throw new Error(`Linha ${i+1} inválida.`); } });
    return await importJsonArray(objs);
  }
  return await importCsv(trimmed);
}

async function importJsonArray(list) {
  if (!Array.isArray(list)) throw new Error('JSON deve ser um array de objetos.');
  const bundles = list.map(normalizeRecord).filter((b) => b.question && b.answer);
  return persistBundles(bundles);
}

async function importCsv(text) {
  const { rows, header } = parseCsv(text);
  let bundles;
  if (header && header.length) {
    bundles = rows.map((cols) => {
      const obj = {}; header.forEach((h, i) => { obj[h] = cols[i]; });
      return normalizeRecord(obj);
    });
  } else {
    bundles = rows.map((cols) =>
      normalizeRecord({
        quiz: cols[0], question: cols[1], answer: cols[2],
        explanation: cols[3], tags: cols[4], wrong1: cols[5], wrong2: cols[6], wrong3: cols[7]
      })
    );
  }
  bundles = bundles.filter((b) => b.question && b.answer);
  return persistBundles(bundles);
}

async function persistBundles(bundles) {
  if (!bundles.length) return { importedCount: 0, quizzesCount: 0 };
  const byQuiz = bundles.reduce((acc, b) => { (acc[b.quiz || 'Geral'] = acc[b.quiz || 'Geral'] || []).push(b); return acc; }, {});
  let imported = 0, quizzes = 0;

  await tx(async () => {
    for (const [title, items] of Object.entries(byQuiz)) {
      const ins = await run('INSERT INTO quiz(title, description) VALUES (?,?)', [title || 'Geral', '']);
      const quizId = ins.lastInsertRowId; quizzes++;
      for (const b of items) {
        const qIns = await run(
          `INSERT INTO question(quizId, text, answer, explanation, tags, box, due_at)
           VALUES (?,?,?,?,?,?,?)`,
          [quizId, b.question, b.answer, b.explanation, b.tags, 1, Date.now()]
        );
        const questionId = qIns.lastInsertRowId;
        const wrongs = [b.wrong1, b.wrong2, b.wrong3].map((x)=>String(x||'').trim()).filter(Boolean);
        const options = Array.from(new Set([b.answer, ...wrongs])).filter(Boolean);
        if (options.length >= 2) {
          for (const opt of options) {
            await run('INSERT INTO option_item (questionId, text, isCorrect) VALUES (?,?,?)', [questionId, opt, opt === b.answer ? 1 : 0]);
          }
        }
        imported++;
      }
    }
  });
  return { importedCount: imported, quizzesCount: quizzes };
}
