import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DOMAINS_BY_PART,
  DOMAINS_BY_PART,
  getDomainsForPart,
} from '../../src/shared/domains'

describe('default domain seeds', () => {
  it('provides Part 1 EA domains for first-run seed', () => {
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

  it('leaves Part 2 and 3 empty until user adds them', () => {
    expect(getDomainsForPart(2)).toEqual([])
    expect(getDomainsForPart(3)).toEqual([])
  })

  it('exposes all parts on DEFAULT_DOMAINS_BY_PART', () => {
    expect(Object.keys(DEFAULT_DOMAINS_BY_PART).map(Number).sort()).toEqual([1, 2, 3])
    expect(DOMAINS_BY_PART).toBe(DEFAULT_DOMAINS_BY_PART)
  })
})
