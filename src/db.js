// src/db.js
import * as SQLite from 'expo-sqlite';

let _db;
async function getDb() {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('studyquiz.db');
  }
  return _db;
}

/**
 * Inicializa banco, cria/migra tabelas e índices.
 */
export async function initDb() {
  const db = await getDb();

  // PRAGMAs e schema
  await db.execAsync(`
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
      explanation TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      difficulty INTEGER DEFAULT 1,
      answer TEXT DEFAULT '',
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

    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_question_quiz ON question(quizId);
    CREATE INDEX IF NOT EXISTS idx_question_due ON question(due_at);
    CREATE INDEX IF NOT EXISTS idx_option_question ON option_item(questionId);
  `);

  // Normaliza due_at (preenche agora quando 0/null)
  await db.runAsync(`
    UPDATE question
    SET due_at = CASE
      WHEN due_at IS NULL OR due_at = 0 THEN CAST(strftime('%s','now') AS INTEGER) * 1000
      ELSE due_at
    END
  `);
}

/* =========================
 * QUIZ
 * ========================= */

export async function getQuizzes() {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM quiz ORDER BY id DESC');
}

export async function createQuiz(title, description = '') {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO quiz(title, description) VALUES (?,?)',
    [String(title || '').trim(), String(description || '')]
  );
  return res.lastInsertRowId;
}

export async function deleteQuiz(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM quiz WHERE id = ?', [id]);
}

export async function countQuestions(quizId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) AS c FROM question WHERE quizId = ?',
    [quizId]
  );
  return row?.c || 0;
}

/* =========================
 * PERGUNTA
 * ========================= */

export async function getQuestionsByQuiz(quizId) {
  const db = await getDb();
  return await db.getAllAsync(
    'SELECT * FROM question WHERE quizId = ? ORDER BY id DESC',
    [quizId]
  );
}

export async function getQuestionById(id) {
  const db = await getDb();
  return await db.getFirstAsync('SELECT * FROM question WHERE id = ?', [id]);
}

export async function createQuestion(quizId, text, answer, explanation = '', tags = '') {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO question(quizId, text, answer, explanation, tags)
     VALUES (?,?,?,?,?)`,
    [quizId, String(text || '').trim(), String(answer || '').trim(), String(explanation || ''), String(tags || '')]
  );
  return res.lastInsertRowId;
}

export async function updateQuestion(id, fields = {}) {
  const allowed = ['text', 'answer', 'explanation', 'tags', 'difficulty'];
  const sets = [];
  const args = [];
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, k)) {
      sets.push(`${k} = ?`);
      args.push(fields[k]);
    }
  }
  if (sets.length === 0) return;
  args.push(id);

  const db = await getDb();
  await db.runAsync(`UPDATE question SET ${sets.join(', ')} WHERE id = ?`, args);
}

export async function deleteQuestion(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM question WHERE id = ?', [id]);
  // thanks to ON DELETE CASCADE, related option_item rows are removed automatically
}

/* =========================
 * OPÇÕES (Múltipla escolha)
 * ========================= */

export async function getOptionsByQuestion(questionId) {
  const db = await getDb();
  return await db.getAllAsync(
    `SELECT id, questionId, text, isCorrect
     FROM option_item
     WHERE questionId = ?
     ORDER BY id ASC`,
    [questionId]
  );
}

/**
 * Substitui TODAS as alternativas por `options`:
 * options: [{ text: string, isCorrect: boolean }]
 */
export async function replaceOptions(questionId, options) {
  const db = await getDb();
  await db.execAsync('BEGIN');
  try {
    await db.runAsync('DELETE FROM option_item WHERE questionId = ?', [questionId]);
    for (const opt of options || []) {
      await db.runAsync(
        'INSERT INTO option_item (questionId, text, isCorrect) VALUES (?,?,?)',
        [questionId, String(opt.text || ''), opt.isCorrect ? 1 : 0]
      );
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}

/* =========================
 * SRS (Leitner)
 * ========================= */

export async function applySrsResult(questionId, isCorrect) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT box FROM question WHERE id = ?', [questionId]);
  const curBox = row?.box || 1;
  const nextBox = isCorrect ? Math.min(5, curBox + 1) : 1;

  const intervals = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 15 }; // dias
  const now = Date.now();
  const dueAt = now + (intervals[nextBox] || 1) * 24 * 60 * 60 * 1000;

  await db.runAsync(
    `UPDATE question
     SET box = ?,
         due_at = ?,
         correct_count = correct_count + (?),
         wrong_count   = wrong_count   + (?)
     WHERE id = ?`,
    [nextBox, dueAt, isCorrect ? 1 : 0, isCorrect ? 0 : 1, questionId]
  );
}

export async function getQuestionMeta(questionId) {
  const db = await getDb();
  return await db.getFirstAsync(
    'SELECT box, due_at, correct_count, wrong_count FROM question WHERE id = ?',
    [questionId]
  );
}

/* =========================
 * BACKUP / IMPORT
 * ========================= */

export async function exportAllData() {
  const db = await getDb();
  const quizzes = await db.getAllAsync('SELECT * FROM quiz');
  const result = [];
  for (const quiz of quizzes) {
    const questions = await db.getAllAsync(
      'SELECT * FROM question WHERE quizId = ? ORDER BY id ASC',
      [quiz.id]
    );
    // inclui alternativas
    const questionsWithOptions = [];
    for (const q of questions) {
      const opts = await db.getAllAsync(
        `SELECT id, text, isCorrect
         FROM option_item
         WHERE questionId = ?
         ORDER BY id ASC`,
        [q.id]
      );
      questionsWithOptions.push({ ...q, options: opts });
    }
    result.push({
      quiz: { id: quiz.id, title: quiz.title, description: quiz.description },
      questions: questionsWithOptions
    });
  }
  return result;
}

export async function importFullBackup(data) {
  const db = await getDb();
  await db.execAsync('BEGIN');
  try {
    for (const deck of data || []) {
      const { quiz, questions } = deck || {};
      const ins = await db.runAsync(
        'INSERT INTO quiz(title, description) VALUES (?,?)',
        [quiz?.title || 'Importado', quiz?.description || '']
      );
      const newQuizId = ins.lastInsertRowId;

      for (const q of (questions || [])) {
        const qIns = await db.runAsync(
          `INSERT INTO question(quizId, text, answer, explanation, tags, difficulty, box, due_at, correct_count, wrong_count)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            newQuizId,
            q.text || '',
            q.answer || '',
            q.explanation || '',
            q.tags || '',
            q.difficulty || 1,
            q.box || 1,
            q.due_at || 0,
            q.correct_count || 0,
            q.wrong_count || 0
          ]
        );
        const newQId = qIns.lastInsertRowId;

        // opções (se vierem no backup)
        if (Array.isArray(q.options)) {
          for (const opt of q.options) {
            await db.runAsync(
              'INSERT INTO option_item (questionId, text, isCorrect) VALUES (?,?,?)',
              [newQId, String(opt.text || ''), opt.isCorrect ? 1 : 0]
            );
          }
        }
      }
    }

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}
