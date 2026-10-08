import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type WeakTrackerDb } from '../../src/main/db'
import { DEFAULT_DOMAINS_BY_PART } from '../../src/shared/domains'

describe('domain CRUD', () => {
  let dbPath: string
  let db: WeakTrackerDb

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `weak-tracker-domains-${Date.now()}-${Math.random()}.db`)
    db = openDatabase(dbPath)
  })

  afterEach(() => {
    db?.close()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('seeds Part 1 defaults on migrate and leaves Part 2/3 empty', () => {
    expect(db.listDomainNames(1)).toEqual(DEFAULT_DOMAINS_BY_PART[1])
    expect(db.listDomainNames(2)).toEqual([])
    expect(db.listDomainNames(3)).toEqual([])
  })

  it('creates a domain for a part', () => {
    const row = db.createDomain(2, 'Business Entities')
    expect(row.name).toBe('Business Entities')
    expect(row.exam_part).toBe(2)
    expect(db.listDomainNames(2)).toEqual(['Business Entities'])
  })

  it('rejects blank and duplicate names within a part', () => {
    expect(() => db.createDomain(1, '   ')).toThrow(/name/i)
    expect(() => db.createDomain(1, 'Income')).toThrow(/exists/i)
    // same name allowed on another part
    expect(() => db.createDomain(2, 'Income')).not.toThrow()
  })

  it('updates a domain name and rewrites historical attempt/batch labels', () => {
    const income = db.listDomains(1).find((d) => d.name === 'Income')!
    db.createAttempt({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_bool: 1,
      miss_reason_tag: null,
      entry_mode: 'widget',
    })
    db.createBatchSession({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_count: 2,
      total_count: 3,
    })

    const updated = db.updateDomain(income.id, 'Gross Income')
    expect(updated.name).toBe('Gross Income')
    expect(db.listAttempts(1)[0].domain).toBe('Gross Income')
    expect(db.listBatchSessions(1)[0].domain).toBe('Gross Income')
    expect(db.getLastDomain(1)).toBe('Gross Income')
  })

  it('deletes a domain without deleting historical rows', () => {
    const income = db.listDomains(1).find((d) => d.name === 'Income')!
    db.createAttempt({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_bool: 1,
      miss_reason_tag: null,
      entry_mode: 'widget',
    })
    db.deleteDomain(income.id)
    expect(db.listDomainNames(1)).not.toContain('Income')
    expect(db.listAttempts(1)).toHaveLength(1)
    expect(db.listAttempts(1)[0].domain).toBe('Income')
  })

  it('trims names on create/update', () => {
    const row = db.createDomain(3, '  Partnerships  ')
    expect(row.name).toBe('Partnerships')
    const renamed = db.updateDomain(row.id, '  S Corps  ')
    expect(renamed.name).toBe('S Corps')
  })
})
