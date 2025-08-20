// src/db.js — API nova do expo-sqlite (SDK 53+), sem warnings e sem /legacy
import * as SQLite from 'expo-sqlite';

let _db;
async function getDb() {
  if (!_db) _db = await SQLite.openDatabaseAsync('studyquiz.db');
  return _db;
}

export async function initDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

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
  `);

  await db.runAsync(
    `UPDATE question
     SET due_at = COALESCE(NULLIF(due_at,0), strftime('%s','now')*1000)`
  );
}

// ----- CRUD base -----
export async function getQuizzes() {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM quiz ORDER BY id DESC');
}
export async function createQuiz(title, description='') {
  const db = await getDb();
  const res = await db.runAsync('INSERT INTO quiz(title, description) VALUES (?,?)', [title, description]);
  return res.lastInsertRowId;
}
export async function countQuestions(quizId) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT COUNT(*) as c FROM question WHERE quizId = ?', [quizId]);
  return row?.c || 0;
}
export async function getQuestionsByQuiz(quizId) {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM question WHERE quizId = ? ORDER BY id DESC', [quizId]);
}
export async function createQuestion(quizId, text, answer, explanation='', tags='') {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO question(quizId, text, answer, explanation, tags) VALUES (?,?,?,?,?)',
    [quizId, text, answer, explanation, tags]
  );
  return res.lastInsertRowId;
}

// ----- SRS / Estatísticas -----
export async function applySrsResult(questionId, isCorrect) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT box FROM question WHERE id = ?', [questionId]);
  const curBox = row?.box || 1;
  const nextBox = isCorrect ? Math.min(5, curBox + 1) : 1;
  const now = Date.now();
  const intervals = {1:1,2:2,3:4,4:7,5:15}; // dias
  const dueAt = now + (intervals[nextBox] || 1) * 24 * 60 * 60 * 1000;

  await db.runAsync(
    `UPDATE question
     SET box = ?, due_at = ?,
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

// ----- Backup (export/import) -----
export async function exportAllData() {
  const db = await getDb();
  const quizzes = await db.getAllAsync('SELECT * FROM quiz');
  const result = [];
  for (const quiz of quizzes) {
    const questions = await db.getAllAsync('SELECT * FROM question WHERE quizId = ?', [quiz.id]);
    result.push({ quiz: { id: quiz.id, title: quiz.title, description: quiz.description }, questions });
  }
  return result;
}

export async function importFullBackup(data) {
  const db = await getDb();
  for (const deck of data) {
    const { quiz, questions } = deck;
    const ins = await db.runAsync(
      'INSERT INTO quiz(title, description) VALUES (?,?)',
      [quiz?.title || 'Importado', quiz?.description || '']
    );
    const newQuizId = ins.lastInsertRowId;

    for (const q of (questions || [])) {
      await db.runAsync(
        `INSERT INTO question(quizId, text, answer, explanation, tags, difficulty, box, due_at, correct_count, wrong_count)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [newQuizId, q.text || '', q.answer || '', q.explanation || '', q.tags || '', q.difficulty || 1,
         q.box || 1, q.due_at || 0, q.correct_count || 0, q.wrong_count || 0]
      );
    }
  }
}
