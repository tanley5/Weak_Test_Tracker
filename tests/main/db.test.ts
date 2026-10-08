import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type WeakTrackerDb } from '../../src/main/db'

describe('WeakTrackerDb', () => {
  let dbPath: string
  let db: WeakTrackerDb

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `weak-tracker-${Date.now()}-${Math.random()}.db`)
    db = openDatabase(dbPath)
  })

  afterEach(() => {
    db?.close()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('migrates schema and seeds default settings', () => {
    expect(db.getSetting('active_exam_part')).toBe('1')
    expect(db.getSetting('target_exam_date')).toBe('2027-02-01')
    expect(JSON.parse(db.getSetting('last_domain_by_part')!)).toEqual({})
  })

  it('persists settings updates', () => {
    db.setSetting('active_exam_part', '3')
    expect(db.getSetting('active_exam_part')).toBe('3')
    db.setLastDomain(3, 'Business Entities')
    expect(db.getLastDomain(3)).toBe('Business Entities')
  })

  it('inserts attempts with widget entry mode', () => {
    const id = db.createAttempt({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_bool: 0,
      miss_reason_tag: 'didnt_know',
      entry_mode: 'widget',
    })
    expect(id).toBe(1)
    const rows = db.listAttempts(1)
    expect(rows).toHaveLength(1)
    expect(rows[0].miss_reason_tag).toBe('didnt_know')
  })

  it('inserts batch sessions and rejects invalid counts', () => {
    const id = db.createBatchSession({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_count: 7,
      total_count: 10,
    })
    expect(id).toBe(1)
    expect(() =>
      db.createBatchSession({
        date: '2026-10-08',
        exam_part: 1,
        domain: 'Income',
        correct_count: 11,
        total_count: 10,
      }),
    ).toThrow(/correct/)
    expect(() =>
      db.createBatchSession({
        date: '2026-10-08',
        exam_part: 1,
        domain: 'Income',
        correct_count: 0,
        total_count: 0,
      }),
    ).toThrow(/total/)
  })

  it('scopes today stats to active part and unions attempts + batches', () => {
    db.createAttempt({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_bool: 1,
      miss_reason_tag: null,
      entry_mode: 'widget',
    })
    db.createAttempt({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_bool: 0,
      miss_reason_tag: 'blanked',
      entry_mode: 'widget',
    })
    db.createBatchSession({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_count: 3,
      total_count: 5,
    })
    // other part / other day ignored
    db.createBatchSession({
      date: '2026-10-08',
      exam_part: 2,
      domain: 'Other',
      correct_count: 1,
      total_count: 1,
    })
    db.createAttempt({
      date: '2026-10-07',
      exam_part: 1,
      domain: 'Income',
      correct_bool: 1,
      miss_reason_tag: null,
      entry_mode: 'widget',
    })

    const today = db.getTodayStats(1, '2026-10-08')
    expect(today.questionsLogged).toBe(7) // 2 attempts + 5 batch
    expect(today.correct).toBe(4) // 1 + 3
    expect(today.accuracy).toBeCloseTo(4 / 7)
  })

  it('lists attempts and batches filtered by exam part', () => {
    db.createAttempt({
      date: '2026-10-08',
      exam_part: 3,
      domain: 'Foo',
      correct_bool: 1,
      miss_reason_tag: null,
      entry_mode: 'widget',
    })
    db.createBatchSession({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_count: 1,
      total_count: 2,
    })
    expect(db.listAttempts(3)).toHaveLength(1)
    expect(db.listAttempts(1)).toHaveLength(0)
    expect(db.listBatchSessions(1)).toHaveLength(1)
    expect(db.listBatchSessions(3)).toHaveLength(0)
  })
})
