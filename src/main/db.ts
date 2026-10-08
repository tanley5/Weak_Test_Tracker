import Database from 'better-sqlite3'
import {
  DEFAULT_DOMAINS_BY_PART,
  DEFAULT_EXAM_PARTS,
  normalizeDomainName,
  normalizeExamPartName,
  validateDomainName,
  validateExamPartName,
  type DomainRecord,
  type ExamPart,
  type ExamPartRecord,
} from '../shared/domains'
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
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  exam_part INTEGER NOT NULL,
  domain TEXT NOT NULL,
  correct_bool INTEGER NOT NULL,
  miss_reason_tag TEXT,
  entry_mode TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batch_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  exam_part INTEGER NOT NULL,
  domain TEXT NOT NULL,
  correct_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_part INTEGER NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (exam_part, name)
);
`

const SCHEMA_VERSION = '2'

export class WeakTrackerDb {
  constructor(private readonly db: Database.Database) {}

  migrate(): void {
    this.db.exec(SCHEMA)
    const defaults: Record<string, string> = {
      active_exam_part: '1',
      target_exam_date: '2027-02-01',
      last_domain_by_part: '{}',
      schema_version: '1',
    }
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    )
    for (const [key, value] of Object.entries(defaults)) {
      insert.run(key, value)
    }
    this.migrateDropPartCheckConstraints()
    this.seedDefaultExamParts()
    this.seedDefaultDomains()
    this.setSetting('schema_version', SCHEMA_VERSION)
  }

  /** Older builds constrained exam_part to 1–3; rebuild those tables without the CHECK. */
  private migrateDropPartCheckConstraints(): void {
    const version = this.getSetting('schema_version') ?? '1'
    if (Number(version) >= 2) return

    const rebuild = (table: string, columns: string, createSql: string) => {
      this.db.exec(`ALTER TABLE ${table} RENAME TO ${table}_old`)
      this.db.exec(createSql)
      this.db.exec(`INSERT INTO ${table} (${columns}) SELECT ${columns} FROM ${table}_old`)
      this.db.exec(`DROP TABLE ${table}_old`)
    }

    // Only rebuild if the old constrained tables exist (fresh DBs already match SCHEMA).
    const hasCheck = (table: string) => {
      const row = this.db
        .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table) as { sql: string } | undefined
      return Boolean(row?.sql?.includes('CHECK'))
    }

    if (hasCheck('attempts')) {
      rebuild(
        'attempts',
        'id, date, exam_part, domain, correct_bool, miss_reason_tag, entry_mode',
        `CREATE TABLE attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          exam_part INTEGER NOT NULL,
          domain TEXT NOT NULL,
          correct_bool INTEGER NOT NULL,
          miss_reason_tag TEXT,
          entry_mode TEXT NOT NULL
        )`,
      )
    }
    if (hasCheck('batch_sessions')) {
      rebuild(
        'batch_sessions',
        'id, date, exam_part, domain, correct_count, total_count',
        `CREATE TABLE batch_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL,
          exam_part INTEGER NOT NULL,
          domain TEXT NOT NULL,
          correct_count INTEGER NOT NULL,
          total_count INTEGER NOT NULL
        )`,
      )
    }
    if (hasCheck('domains')) {
      rebuild(
        'domains',
        'id, exam_part, name, sort_order',
        `CREATE TABLE domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exam_part INTEGER NOT NULL,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          UNIQUE (exam_part, name)
        )`,
      )
    }
  }

  private seedDefaultExamParts(): void {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM exam_parts').get() as { c: number }
    if (count.c > 0) return
    const insert = this.db.prepare(
      'INSERT INTO exam_parts (id, name, sort_order) VALUES (?, ?, ?)',
    )
    DEFAULT_EXAM_PARTS.forEach((part, index) => {
      insert.run(part.id, part.name, index)
    })
  }

  private seedDefaultDomains(): void {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM domains').get() as { c: number }
    if (count.c > 0) return
    const insert = this.db.prepare(
      'INSERT INTO domains (exam_part, name, sort_order) VALUES (?, ?, ?)',
    )
    for (const part of Object.keys(DEFAULT_DOMAINS_BY_PART).map(Number)) {
      DEFAULT_DOMAINS_BY_PART[part].forEach((name, index) => {
        insert.run(part, name, index)
      })
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

  listDomains(examPart: ExamPart): DomainRecord[] {
    return this.db
      .prepare(
        `SELECT id, exam_part, name, sort_order
         FROM domains
         WHERE exam_part = ?
         ORDER BY sort_order ASC, id ASC`,
      )
      .all(examPart) as DomainRecord[]
  }

  listDomainNames(examPart: ExamPart): string[] {
    return this.listDomains(examPart).map((d) => d.name)
  }

  getDomain(id: number): DomainRecord | undefined {
    return this.db
      .prepare('SELECT id, exam_part, name, sort_order FROM domains WHERE id = ?')
      .get(id) as DomainRecord | undefined
  }

  createDomain(examPart: ExamPart, rawName: string): DomainRecord {
    const name = normalizeDomainName(rawName)
    const error = validateDomainName(name)
    if (error) throw new Error(error)

    const existing = this.db
      .prepare('SELECT id FROM domains WHERE exam_part = ? AND name = ?')
      .get(examPart, name)
    if (existing) throw new Error('Domain already exists for this part')

    const maxRow = this.db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM domains WHERE exam_part = ?')
      .get(examPart) as { m: number }

    const result = this.db
      .prepare(
        'INSERT INTO domains (exam_part, name, sort_order) VALUES (?, ?, ?)',
      )
      .run(examPart, name, maxRow.m + 1)

    return this.getDomain(Number(result.lastInsertRowid))!
  }

  updateDomain(id: number, rawName: string): DomainRecord {
    const current = this.getDomain(id)
    if (!current) throw new Error('Domain not found')

    const name = normalizeDomainName(rawName)
    const error = validateDomainName(name)
    if (error) throw new Error(error)

    if (name !== current.name) {
      const clash = this.db
        .prepare('SELECT id FROM domains WHERE exam_part = ? AND name = ? AND id != ?')
        .get(current.exam_part, name, id)
      if (clash) throw new Error('Domain already exists for this part')

      const rename = this.db.transaction(() => {
        this.db
          .prepare('UPDATE domains SET name = ? WHERE id = ?')
          .run(name, id)
        this.db
          .prepare(
            'UPDATE attempts SET domain = ? WHERE exam_part = ? AND domain = ?',
          )
          .run(name, current.exam_part, current.name)
        this.db
          .prepare(
            'UPDATE batch_sessions SET domain = ? WHERE exam_part = ? AND domain = ?',
          )
          .run(name, current.exam_part, current.name)

        if (this.getLastDomain(current.exam_part) === current.name) {
          this.setLastDomain(current.exam_part, name)
        }
      })
      rename()
    }

    return this.getDomain(id)!
  }

  deleteDomain(id: number): void {
    const current = this.getDomain(id)
    if (!current) throw new Error('Domain not found')
    this.db.prepare('DELETE FROM domains WHERE id = ?').run(id)
    if (this.getLastDomain(current.exam_part) === current.name) {
      const next = this.listDomainNames(current.exam_part)[0]
      const raw = this.getSetting('last_domain_by_part') ?? '{}'
      const map = JSON.parse(raw) as Record<string, string>
      if (next) map[String(current.exam_part)] = next
      else delete map[String(current.exam_part)]
      this.setSetting('last_domain_by_part', JSON.stringify(map))
    }
  }

  listExamParts(): ExamPartRecord[] {
    return this.db
      .prepare(
        `SELECT id, name, sort_order FROM exam_parts ORDER BY sort_order ASC, id ASC`,
      )
      .all() as ExamPartRecord[]
  }

  getExamPart(id: number): ExamPartRecord | undefined {
    return this.db
      .prepare('SELECT id, name, sort_order FROM exam_parts WHERE id = ?')
      .get(id) as ExamPartRecord | undefined
  }

  createExamPart(rawName: string): ExamPartRecord {
    const name = normalizeExamPartName(rawName)
    const error = validateExamPartName(name)
    if (error) throw new Error(error)

    const existing = this.db.prepare('SELECT id FROM exam_parts WHERE name = ?').get(name)
    if (existing) throw new Error('Exam part already exists')

    const maxRow = this.db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM exam_parts')
      .get() as { m: number }

    const result = this.db
      .prepare('INSERT INTO exam_parts (name, sort_order) VALUES (?, ?)')
      .run(name, maxRow.m + 1)

    return this.getExamPart(Number(result.lastInsertRowid))!
  }

  updateExamPart(id: number, rawName: string): ExamPartRecord {
    const current = this.getExamPart(id)
    if (!current) throw new Error('Exam part not found')

    const name = normalizeExamPartName(rawName)
    const error = validateExamPartName(name)
    if (error) throw new Error(error)

    if (name !== current.name) {
      const clash = this.db
        .prepare('SELECT id FROM exam_parts WHERE name = ? AND id != ?')
        .get(name, id)
      if (clash) throw new Error('Exam part already exists')
      this.db.prepare('UPDATE exam_parts SET name = ? WHERE id = ?').run(name, id)
    }

    return this.getExamPart(id)!
  }

  deleteExamPart(id: number): void {
    const current = this.getExamPart(id)
    if (!current) throw new Error('Exam part not found')

    const parts = this.listExamParts()
    if (parts.length <= 1) {
      throw new Error('Cannot delete the last exam part')
    }

    const attemptCount = (
      this.db.prepare('SELECT COUNT(*) as c FROM attempts WHERE exam_part = ?').get(id) as {
        c: number
      }
    ).c
    const batchCount = (
      this.db
        .prepare('SELECT COUNT(*) as c FROM batch_sessions WHERE exam_part = ?')
        .get(id) as { c: number }
    ).c
    if (attemptCount > 0 || batchCount > 0) {
      throw new Error('Cannot delete an exam part that has logged attempts or batches')
    }

    const remove = this.db.transaction(() => {
      this.db.prepare('DELETE FROM domains WHERE exam_part = ?').run(id)
      this.db.prepare('DELETE FROM exam_parts WHERE id = ?').run(id)

      const raw = this.getSetting('last_domain_by_part') ?? '{}'
      const map = JSON.parse(raw) as Record<string, string>
      delete map[String(id)]
      this.setSetting('last_domain_by_part', JSON.stringify(map))

      if (this.getSetting('active_exam_part') === String(id)) {
        const next = this.listExamParts()[0]
        this.setSetting('active_exam_part', String(next.id))
      }
    })
    remove()
  }
}

export function openDatabase(dbPath: string): WeakTrackerDb {
  const raw = new Database(dbPath)
  raw.pragma('journal_mode = WAL')
  const db = new WeakTrackerDb(raw)
  db.migrate()
  return db
}
