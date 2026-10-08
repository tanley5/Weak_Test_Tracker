import { describe, expect, it } from 'vitest'
import { normalizeDomainName, validateDomainName } from '../../src/shared/domains'

describe('domain name validation', () => {
  it('normalizes whitespace', () => {
    expect(normalizeDomainName('  Gross   Income  ')).toBe('Gross Income')
  })

  it('rejects empty names', () => {
    expect(validateDomainName('')).toMatch(/required/i)
    expect(validateDomainName('   ')).toMatch(/required/i)
  })

  it('rejects overly long names', () => {
    expect(validateDomainName('x'.repeat(81))).toMatch(/80/)
  })

  it('accepts normal names', () => {
    expect(validateDomainName('Income')).toBeNull()
  })
})
