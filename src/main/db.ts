import Database from 'better-sqlite3'
import type { ExamPart } from '../shared/domains'
import type { MissReason } from '../shared/widgetState'

export type AttemptRecord = {
  id: number
  date: string
  exam_part: ExamPart
  domain: string
  correct_bool: number
  miss_reason_tag: MissReason | null
  entry_mode: 'widget' | 'batch'
}

export type BatchSessionRecord = {
  id: number
  date: string
  exam_part: ExamPart
  domain: string
  correct_count: number
  total_count: number
}

export type CreateAttemptInput = {
  date: string
  exam_part: ExamPart
  domain: string
  correct_bool: 0 | 1
  miss_reason_tag: MissReason | null
  entry_mode: 'widget' | 'batch'
}

export type CreateBatchInput = {
  date: string
  exam_part: ExamPart
  domain: string
  correct_count: number
  total_count: number
}

export type TodayStats = {
  questionsLogged: number
  correct: number
  accuracy: number
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  exam_part INTEGER NOT NULL CHECK (exam_part IN (1, 2, 3)),
  domain TEXT NOT NULL,
  correct_bool INTEGER NOT NULL,
  miss_reason_tag TEXT,
  entry_mode TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batch_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  exam_part INTEGER NOT NULL CHECK (exam_part IN (1, 2, 3)),
  domain TEXT NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export class WeakTrackerDb {
  constructor(private readonly db: Database.Database) {}

  migrate(): void {
    this.db.exec(SCHEMA)
    const defaults: Record<string, string> = {
      active_exam_part: '1',
      target_exam_date: '2027-02-01',
      last_domain_by_part: '{}',
    }
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    )
    for (const [key, value] of Object.entries(defaults)) {
      insert.run(key, value)
    }
  }

  close(): void {
    this.db.close()
  }

  getSetting(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return row?.value
  }

  setSetting(key: string, value: string): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value)
  }

  getLastDomain(part: ExamPart): string | undefined {
    const raw = this.getSetting('last_domain_by_part') ?? '{}'
    const map = JSON.parse(raw) as Record<string, string>
    return map[String(part)]
  }

  setLastDomain(part: ExamPart, domain: string): void {
    const raw = this.getSetting('last_domain_by_part') ?? '{}'
    const map = JSON.parse(raw) as Record<string, string>
    map[String(part)] = domain
    this.setSetting('last_domain_by_part', JSON.stringify(map))
  }

  createAttempt(input: CreateAttemptInput): number {
    const result = this.db
      .prepare(
        `INSERT INTO attempts (date, exam_part, domain, correct_bool, miss_reason_tag, entry_mode)
         VALUES (@date, @exam_part, @domain, @correct_bool, @miss_reason_tag, @entry_mode)`,
      )
      .run(input)
    this.setLastDomain(input.exam_part, input.domain)
    return Number(result.lastInsertRowid)
  }

  createBatchSession(input: CreateBatchInput): number {
    if (input.total_count <= 0) {
      throw new Error('total_count must be greater than 0')
    }
    if (input.correct_count < 0 || input.correct_count > input.total_count) {
      throw new Error('correct_count must be between 0 and total_count')
    }
    const result = this.db
      .prepare(
        `INSERT INTO batch_sessions (date, exam_part, domain, correct_count, total_count)
         VALUES (@date, @exam_part, @domain, @correct_count, @total_count)`,
      )
      .run(input)
    this.setLastDomain(input.exam_part, input.domain)
    return Number(result.lastInsertRowid)
  }

  listAttempts(examPart: ExamPart): AttemptRecord[] {
    return this.db
      .prepare('SELECT * FROM attempts WHERE exam_part = ? ORDER BY date ASC, id ASC')
      .all(examPart) as AttemptRecord[]
  }

  listBatchSessions(examPart: ExamPart): BatchSessionRecord[] {
    return this.db
      .prepare('SELECT * FROM batch_sessions WHERE exam_part = ? ORDER BY date ASC, id ASC')
      .all(examPart) as BatchSessionRecord[]
  }

  getTodayStats(examPart: ExamPart, date: string): TodayStats {
    const attemptRow = this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           COALESCE(SUM(correct_bool), 0) as correct
         FROM attempts
         WHERE exam_part = ? AND date = ?`,
      )
      .get(examPart, date) as { total: number; correct: number }

    const batchRow = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(total_count), 0) as total,
           COALESCE(SUM(correct_count), 0) as correct
         FROM batch_sessions
         WHERE exam_part = ? AND date = ?`,
      )
      .get(examPart, date) as { total: number; correct: number }

    const questionsLogged = attemptRow.total + batchRow.total
    const correct = attemptRow.correct + batchRow.correct
    return {
      questionsLogged,
      correct,
      accuracy: questionsLogged === 0 ? 0 : correct / questionsLogged,
    }
  }

  getRunningAccuracy(examPart: ExamPart): TodayStats {
    const attemptRow = this.db
      .prepare(
        `SELECT
           COUNT(*) as total,
           COALESCE(SUM(correct_bool), 0) as correct
         FROM attempts
         WHERE exam_part = ?`,
      )
      .get(examPart) as { total: number; correct: number }

    const batchRow = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(total_count), 0) as total,
           COALESCE(SUM(correct_count), 0) as correct
         FROM batch_sessions
         WHERE exam_part = ?`,
      )
      .get(examPart) as { total: number; correct: number }

    const questionsLogged = attemptRow.total + batchRow.total
    const correct = attemptRow.correct + batchRow.correct
    return {
      questionsLogged,
      correct,
      accuracy: questionsLogged === 0 ? 0 : correct / questionsLogged,
    }
  }
}

export function openDatabase(dbPath: string): WeakTrackerDb {
  const raw = new Database(dbPath)
  raw.pragma('journal_mode = WAL')
  const db = new WeakTrackerDb(raw)
  db.migrate()
  return db
}
