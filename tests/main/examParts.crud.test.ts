import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type WeakTrackerDb } from '../../src/main/db'

describe('exam part CRUD', () => {
  let dbPath: string
  let db: WeakTrackerDb

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `weak-tracker-parts-${Date.now()}-${Math.random()}.db`)
    db = openDatabase(dbPath)
  })

  afterEach(() => {
    db?.close()
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  })

  it('seeds Part 1–3 by default', () => {
    const parts = db.listExamParts()
    expect(parts.map((p) => p.name)).toEqual(['Part 1', 'Part 2', 'Part 3'])
    expect(parts.map((p) => p.id)).toEqual([1, 2, 3])
  })

  it('creates a new exam part', () => {
    const row = db.createExamPart('Part 4 — Practice')
    expect(row.name).toBe('Part 4 — Practice')
    expect(db.listExamParts()).toHaveLength(4)
  })

  it('rejects blank and duplicate part names', () => {
    expect(() => db.createExamPart('  ')).toThrow(/required/i)
    expect(() => db.createExamPart('Part 1')).toThrow(/exists/i)
  })

  it('renames an exam part', () => {
    const updated = db.updateExamPart(2, 'Businesses')
    expect(updated.name).toBe('Businesses')
    expect(db.getExamPart(2)?.name).toBe('Businesses')
  })

  it('deletes an empty part and reassigns active setting', () => {
    db.setSetting('active_exam_part', '3')
    db.deleteExamPart(3)
    expect(db.listExamParts().map((p) => p.id)).toEqual([1, 2])
    expect(db.getSetting('active_exam_part')).toBe('1')
  })

  it('refuses to delete the last remaining part', () => {
    db.deleteExamPart(2)
    db.deleteExamPart(3)
    expect(() => db.deleteExamPart(1)).toThrow(/last/i)
  })

  it('refuses to delete a part that has logged attempts or batches', () => {
    db.createAttempt({
      date: '2026-10-08',
      exam_part: 1,
      domain: 'Income',
      correct_bool: 1,
      miss_reason_tag: null,
      entry_mode: 'widget',
    })
    expect(() => db.deleteExamPart(1)).toThrow(/logged/i)
  })

  it('deletes domains belonging to a removed empty part', () => {
    db.createDomain(2, 'Corporations')
    expect(db.listDomainNames(2)).toEqual(['Corporations'])
    db.deleteExamPart(2)
    expect(db.listDomainNames(2)).toEqual([])
  })
})
