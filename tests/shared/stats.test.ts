import { describe, expect, it } from 'vitest'
import {
  accuracyColor,
  combineDomainAccuracy,
  daysUntil,
  missReasonBreakdown,
  needsDrilling,
  weeklyAccuracy,
  type AttemptRow,
  type BatchRow,
} from '../../src/shared/stats'

describe('combineDomainAccuracy', () => {
  it('unions attempts and batch sessions per domain', () => {
    const attempts: AttemptRow[] = [
      { domain: 'Income', correct_bool: 1, date: '2026-10-01' },
      { domain: 'Income', correct_bool: 0, date: '2026-10-01' },
      { domain: 'Ethics/Circular 230', correct_bool: 1, date: '2026-10-02' },
    ]
    const batches: BatchRow[] = [
      { domain: 'Income', correct_count: 8, total_count: 10, date: '2026-10-03' },
    ]

    const result = combineDomainAccuracy(attempts, batches)
    expect(result).toEqual(
      expect.arrayContaining([
        { domain: 'Income', correct: 9, total: 12, accuracy: 9 / 12 },
        { domain: 'Ethics/Circular 230', correct: 1, total: 1, accuracy: 1 },
      ]),
    )
  })

  it('returns empty list when no data', () => {
    expect(combineDomainAccuracy([], [])).toEqual([])
  })
})

describe('accuracyColor', () => {
  it('maps thresholds red / yellow / green', () => {
    expect(accuracyColor(0.59)).toBe('red')
    expect(accuracyColor(0.6)).toBe('yellow')
    expect(accuracyColor(0.8)).toBe('yellow')
    expect(accuracyColor(0.801)).toBe('green')
  })
})

describe('needsDrilling', () => {
  it('sorts worst to best accuracy', () => {
    const sorted = needsDrilling([
      { domain: 'A', correct: 9, total: 10, accuracy: 0.9 },
      { domain: 'B', correct: 3, total: 10, accuracy: 0.3 },
      { domain: 'C', correct: 7, total: 10, accuracy: 0.7 },
    ])
    expect(sorted.map((d) => d.domain)).toEqual(['B', 'C', 'A'])
  })
})

describe('missReasonBreakdown', () => {
  it('counts miss tags and ignores correct rows', () => {
    const attempts: AttemptRow[] = [
      { domain: 'Income', correct_bool: 0, miss_reason_tag: 'didnt_know', date: '2026-10-01' },
      { domain: 'Income', correct_bool: 0, miss_reason_tag: 'misread', date: '2026-10-01' },
      { domain: 'Income', correct_bool: 0, miss_reason_tag: 'didnt_know', date: '2026-10-01' },
      { domain: 'Income', correct_bool: 1, miss_reason_tag: null, date: '2026-10-01' },
      { domain: 'Income', correct_bool: 0, miss_reason_tag: 'blanked', date: '2026-10-01' },
    ]
    expect(missReasonBreakdown(attempts)).toEqual({
      didnt_know: 2,
      misread: 1,
      blanked: 1,
    })
  })
})

describe('weeklyAccuracy', () => {
  it('buckets overall accuracy by ISO week', () => {
    const attempts: AttemptRow[] = [
      { domain: 'Income', correct_bool: 1, date: '2026-10-05' }, // week of Oct 5 2026 (Mon)
      { domain: 'Income', correct_bool: 0, date: '2026-10-06' },
      { domain: 'Income', correct_bool: 1, date: '2026-10-12' },
    ]
    const batches: BatchRow[] = [
      { domain: 'Income', correct_count: 2, total_count: 4, date: '2026-10-07' },
    ]
    const weeks = weeklyAccuracy(attempts, batches)
    expect(weeks.length).toBe(2)
    expect(weeks[0].correct).toBe(3)
    expect(weeks[0].total).toBe(6)
    expect(weeks[1].correct).toBe(1)
    expect(weeks[1].total).toBe(1)
  })

  it('can filter to a single domain', () => {
    const attempts: AttemptRow[] = [
      { domain: 'Income', correct_bool: 1, date: '2026-10-05' },
      { domain: 'Ethics/Circular 230', correct_bool: 0, date: '2026-10-05' },
    ]
    const weeks = weeklyAccuracy(attempts, [], 'Income')
    expect(weeks).toHaveLength(1)
    expect(weeks[0].correct).toBe(1)
    expect(weeks[0].total).toBe(1)
  })
})

describe('daysUntil', () => {
  it('returns whole days from today to target', () => {
    expect(daysUntil('2026-10-10', '2026-10-08')).toBe(2)
    expect(daysUntil('2026-10-08', '2026-10-08')).toBe(0)
  })
})
