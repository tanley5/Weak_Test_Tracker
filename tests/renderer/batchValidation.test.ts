import { describe, expect, it } from 'vitest'
import { validateBatch } from '../../src/renderer/src/components/BatchEntryModal'

describe('validateBatch', () => {
  it('accepts valid counts', () => {
    expect(validateBatch(0, 1)).toBeNull()
    expect(validateBatch(7, 10)).toBeNull()
  })

  it('rejects invalid totals and correct counts', () => {
    expect(validateBatch(0, 0)).toMatch(/Total/)
    expect(validateBatch(11, 10)).toMatch(/Correct/)
    expect(validateBatch(-1, 5)).toMatch(/Correct/)
  })
})
