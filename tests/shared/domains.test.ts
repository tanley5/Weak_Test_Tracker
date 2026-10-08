import { describe, expect, it } from 'vitest'
import { DOMAINS_BY_PART, getDomainsForPart } from '../../src/shared/domains'

describe('domains', () => {
  it('provides Part 1 EA domains', () => {
    expect(getDomainsForPart(1)).toEqual([
      'Individual Taxation',
      'Income',
      'Deductions/Credits',
      'Retirement Plans',
      'Basis/Capital Gains',
      'Estate/Gift Tax',
      'Ethics/Circular 230',
    ])
  })

  it('returns empty lists for Part 2 and 3 until syllabus is filled', () => {
    expect(getDomainsForPart(2)).toEqual([])
    expect(getDomainsForPart(3)).toEqual([])
  })

  it('exposes all parts on DOMAINS_BY_PART', () => {
    expect(Object.keys(DOMAINS_BY_PART).map(Number).sort()).toEqual([1, 2, 3])
  })
})
