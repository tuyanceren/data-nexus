import type { SQLiteDatabase } from 'expo-sqlite';

export type ScheduleItem = {
  id: number;
  day: string;
  title: string;
  start_time: string;
  end_time: string | null;
  note: string;
  created_at: number;
};

export type Note = {
  id: number;
  title: string;
  body: string;
  photo: string | null;
  updated_at: number;
};

export type Reminder = {
  id: number;
  title: string;
  at: number;
  done: number;
  notification_id: string | null;
};

export type Countdown = {
  id: number;
  title: string;
  target_at: number;
  notification_id: string | null;
};

export type Topic = {
  id: number;
  title: string;
  deadline: string;
  planned: number;
  done: number;
  schedule_id: number | null;
  created_at: number;
  subject_id: number | null;
  question_total: number;
  question_done: number;
};

export type Subject = {
  id: number;
  title: string;
  color: number;
  exam_id: number | null;
  created_at: number;
};

export type StudySession = {
  id: number;
  day: string;
  topic_id: number | null;
  study_ms: number;
  break_ms: number;
  ended_at: number;
};

export type Exam = {
  id: number;
  title: string;
  exam_on: string;
  created_at: number;
  notification_id: string | null;
};

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schedule_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      title TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      note TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS schedule_day_idx ON schedule_items (day, start_time);
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      at INTEGER NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      notification_id TEXT
    );
    CREATE TABLE IF NOT EXISTS countdowns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_at INTEGER NOT NULL,
      notification_id TEXT
    );
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      deadline TEXT NOT NULL,
      planned INTEGER NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0,
      schedule_id INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      topic_id INTEGER,
      study_ms INTEGER NOT NULL,
      break_ms INTEGER NOT NULL,
      ended_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      exam_on TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      notification_id TEXT
    );
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      color INTEGER NOT NULL DEFAULT 0,
      exam_id INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  await ensureColumn(db, 'notes', 'photo', 'TEXT');
  await ensureColumn(db, 'topics', 'subject_id', 'INTEGER');
  await ensureColumn(db, 'topics', 'question_total', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn(db, 'topics', 'question_done', 'INTEGER NOT NULL DEFAULT 0');
  await resetStoredData(db);
  const orphans = await db.getAllAsync<{ id: number; title: string; done: number; created_at: number }>(
    'SELECT id, title, done, created_at FROM topics WHERE subject_id IS NULL',
  );
  for (const topic of orphans) {
    const subject = await db.runAsync(
      'INSERT INTO subjects (title, color, exam_id, created_at) VALUES (?, ?, NULL, ?)',
      topic.title,
      topic.id % 6,
      topic.created_at,
    );
    await db.runAsync('UPDATE topics SET subject_id = ? WHERE id = ?', subject.lastInsertRowId, topic.id);
  }
}

const DATA_RESET = '2026-10-17';

async function resetStoredData(db: SQLiteDatabase) {
  const mark = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', 'data_reset');
  if (mark?.value === DATA_RESET) return;
  await db.execAsync(`
    DELETE FROM schedule_items;
    DELETE FROM notes;
    DELETE FROM reminders;
    DELETE FROM countdowns;
    DELETE FROM study_sessions;
    DELETE FROM topics;
    DELETE FROM exams;
    DELETE FROM subjects;
    DELETE FROM settings;
  `);
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', 'data_reset', DATA_RESET);
}

async function ensureColumn(db: SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (columns.some((item) => item.name === column)) return;
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function getSchedule(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<ScheduleItem>(
    `SELECT id, day, title, start_time, end_time, note, created_at
     FROM schedule_items WHERE id = ?`,
    id,
  );
}

export function listSchedule(db: SQLiteDatabase, day: string) {
  return db.getAllAsync<ScheduleItem>(
    `SELECT id, day, title, start_time, end_time, note, created_at
     FROM schedule_items WHERE day = ? ORDER BY start_time ASC, id ASC`,
    day,
  );
}

export function listBusyDays(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<{ day: string }>(
    'SELECT DISTINCT day FROM schedule_items WHERE day >= ? AND day <= ?',
    from,
    to,
  );
}

export async function saveSchedule(
  db: SQLiteDatabase,
  item: {
    id: number | null;
    day: string;
    title: string;
    startTime: string;
    endTime: string | null;
    note: string;
  },
) {
  if (item.id == null) {
    await db.runAsync(
      `INSERT INTO schedule_items (day, title, start_time, end_time, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      item.day,
      item.title,
      item.startTime,
      item.endTime,
      item.note,
      Date.now(),
    );
    return;
  }
  await db.runAsync(
    `UPDATE schedule_items SET day = ?, title = ?, start_time = ?, end_time = ?, note = ? WHERE id = ?`,
    item.day,
    item.title,
    item.startTime,
    item.endTime,
    item.note,
    item.id,
  );
}

export function deleteSchedule(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM schedule_items WHERE id = ?', id);
}

export function getNote(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Note>('SELECT id, title, body, photo, updated_at FROM notes WHERE id = ?', id);
}

export function listNotes(db: SQLiteDatabase) {
  return db.getAllAsync<Note>(
    'SELECT id, title, body, photo, updated_at FROM notes ORDER BY updated_at DESC',
  );
}

export async function saveNote(
  db: SQLiteDatabase,
  note: { id: number | null; title: string; body: string; photo: string | null },
) {
  const updatedAt = Date.now();
  if (note.id == null) {
    await db.runAsync(
      'INSERT INTO notes (title, body, photo, updated_at) VALUES (?, ?, ?, ?)',
      note.title,
      note.body,
      note.photo,
      updatedAt,
    );
    return;
  }
  await db.runAsync(
    'UPDATE notes SET title = ?, body = ?, photo = ?, updated_at = ? WHERE id = ?',
    note.title,
    note.body,
    note.photo,
    updatedAt,
    note.id,
  );
}

export function deleteNote(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM notes WHERE id = ?', id);
}

export function getReminder(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<Reminder>(
    'SELECT id, title, at, done, notification_id FROM reminders WHERE id = ?',
    id,
  );
}

export function listReminders(db: SQLiteDatabase) {
  return db.getAllAsync<Reminder>(
    'SELECT id, title, at, done, notification_id FROM reminders ORDER BY done ASC, at ASC',
  );
}

export async function insertReminder(
  db: SQLiteDatabase,
  reminder: { title: string; at: number; notificationId: string | null },
) {
  const result = await db.runAsync(
    'INSERT INTO reminders (title, at, done, notification_id) VALUES (?, ?, 0, ?)',
    reminder.title,
    reminder.at,
    reminder.notificationId,
  );
  return result.lastInsertRowId;
}

export function updateReminder(
  db: SQLiteDatabase,
  reminder: { id: number; title: string; at: number; done: number; notificationId: string | null },
) {
  return db.runAsync(
    'UPDATE reminders SET title = ?, at = ?, done = ?, notification_id = ? WHERE id = ?',
    reminder.title,
    reminder.at,
    reminder.done,
    reminder.notificationId,
    reminder.id,
  );
}

export function deleteReminder(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM reminders WHERE id = ?', id);
}

export function listCountdowns(db: SQLiteDatabase) {
  return db.getAllAsync<Countdown>(
    'SELECT id, title, target_at, notification_id FROM countdowns ORDER BY target_at ASC',
  );
}

export async function insertCountdown(
  db: SQLiteDatabase,
  countdown: { title: string; targetAt: number; notificationId: string | null },
) {
  const result = await db.runAsync(
    'INSERT INTO countdowns (title, target_at, notification_id) VALUES (?, ?, ?)',
    countdown.title,
    countdown.targetAt,
    countdown.notificationId,
  );
  return result.lastInsertRowId;
}

export function updateCountdown(
  db: SQLiteDatabase,
  countdown: { id: number; title: string; targetAt: number; notificationId: string | null },
) {
  return db.runAsync(
    'UPDATE countdowns SET title = ?, target_at = ?, notification_id = ? WHERE id = ?',
    countdown.title,
    countdown.targetAt,
    countdown.notificationId,
    countdown.id,
  );
}

export function deleteCountdown(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM countdowns WHERE id = ?', id);
}

export function listTopics(db: SQLiteDatabase) {
  return db.getAllAsync<Topic>(
    `SELECT id, title, deadline, planned, done, schedule_id, created_at, subject_id, question_total, question_done
     FROM topics ORDER BY done ASC, deadline ASC, id ASC`,
  );
}

export function listSubjects(db: SQLiteDatabase) {
  return db.getAllAsync<Subject>(
    'SELECT id, title, color, exam_id, created_at FROM subjects ORDER BY id ASC',
  );
}

export async function insertSubject(
  db: SQLiteDatabase,
  subject: { title: string; color: number; examId: number | null },
) {
  const result = await db.runAsync(
    'INSERT INTO subjects (title, color, exam_id, created_at) VALUES (?, ?, ?, ?)',
    subject.title,
    subject.color,
    subject.examId,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function insertKonu(
  db: SQLiteDatabase,
  konu: { subjectId: number; title: string; questionTotal: number },
) {
  const result = await db.runAsync(
    `INSERT INTO topics (title, deadline, planned, done, schedule_id, created_at, subject_id, question_total, question_done)
     VALUES (?, '2099-12-31', 1, 0, NULL, ?, ?, ?, 0)`,
    konu.title,
    Date.now(),
    konu.subjectId,
    Math.max(0, konu.questionTotal),
  );
  return result.lastInsertRowId;
}

export async function deleteSubject(db: SQLiteDatabase, id: number) {
  const topics = await db.getAllAsync<{ id: number; schedule_id: number | null }>(
    'SELECT id, schedule_id FROM topics WHERE subject_id = ?',
    id,
  );
  for (const topic of topics) {
    if (topic.schedule_id != null) {
      await db.runAsync('DELETE FROM schedule_items WHERE id = ?', topic.schedule_id);
    }
  }
  await db.runAsync('DELETE FROM topics WHERE subject_id = ?', id);
  await db.runAsync('DELETE FROM subjects WHERE id = ?', id);
}

export async function planTopic(db: SQLiteDatabase, topic: { title: string; deadline: string }) {
  const now = Date.now();
  const schedule = await db.runAsync(
    `INSERT INTO schedule_items (day, title, start_time, end_time, note, created_at)
     VALUES (?, ?, '09:00', NULL, 'Planlandı', ?)`,
    topic.deadline,
    topic.title,
    now,
  );
  const result = await db.runAsync(
    `INSERT INTO topics (title, deadline, planned, done, schedule_id, created_at)
     VALUES (?, ?, 1, 0, ?, ?)`,
    topic.title,
    topic.deadline,
    schedule.lastInsertRowId,
    now,
  );
  return result.lastInsertRowId;
}

export async function setTopicDone(db: SQLiteDatabase, topic: Topic, done: boolean) {
  const questionDone = done ? topic.question_total : 0;
  await db.runAsync(
    'UPDATE topics SET done = ?, question_done = ? WHERE id = ?',
    done ? 1 : 0,
    questionDone,
    topic.id,
  );
  if (topic.schedule_id != null) {
    await db.runAsync(
      'UPDATE schedule_items SET note = ? WHERE id = ?',
      done ? 'Yapıldı' : 'Planlandı',
      topic.schedule_id,
    );
  }
}

export async function deleteTopic(db: SQLiteDatabase, topic: Topic) {
  if (topic.schedule_id != null) {
    await db.runAsync('DELETE FROM schedule_items WHERE id = ?', topic.schedule_id);
  }
  await db.runAsync('DELETE FROM topics WHERE id = ?', topic.id);
}

export function listStudySessions(db: SQLiteDatabase) {
  return db.getAllAsync<StudySession>(
    `SELECT id, day, topic_id, study_ms, break_ms, ended_at
     FROM study_sessions ORDER BY ended_at ASC`,
  );
}

export function insertStudySession(
  db: SQLiteDatabase,
  session: { day: string; topicId: number | null; studyMs: number; breakMs: number },
) {
  return db.runAsync(
    `INSERT INTO study_sessions (day, topic_id, study_ms, break_ms, ended_at)
     VALUES (?, ?, ?, ?, ?)`,
    session.day,
    session.topicId,
    session.studyMs,
    session.breakMs,
    Date.now(),
  );
}

export function listExams(db: SQLiteDatabase) {
  return db.getAllAsync<Exam>(
    `SELECT id, title, exam_on, created_at, notification_id
     FROM exams ORDER BY exam_on ASC, id ASC`,
  );
}

export function insertExam(
  db: SQLiteDatabase,
  exam: { title: string; examOn: string; notificationId: string | null },
) {
  return db.runAsync(
    'INSERT INTO exams (title, exam_on, created_at, notification_id) VALUES (?, ?, ?, ?)',
    exam.title,
    exam.examOn,
    Date.now(),
    exam.notificationId,
  );
}

export function getSetting(db: SQLiteDatabase, key: string) {
  return db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key).then((row) => row?.value ?? null);
}

export function setSetting(db: SQLiteDatabase, key: string, value: string) {
  return db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export function deleteExam(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM exams WHERE id = ?', id);
}

export async function saveSingleExam(
  db: SQLiteDatabase,
  exam: { title: string; examOn: string; notificationId: string | null },
) {
  const existing = await listExams(db);
  const current = existing[0];
  if (!current) {
    const result = await insertExam(db, exam);
    return result.lastInsertRowId;
  }
  await db.runAsync(
    'UPDATE exams SET title = ?, exam_on = ?, notification_id = ? WHERE id = ?',
    exam.title,
    exam.examOn,
    exam.notificationId,
    current.id,
  );
  for (const extra of existing.slice(1)) {
    await db.runAsync('DELETE FROM exams WHERE id = ?', extra.id);
  }
  return current.id;
}
