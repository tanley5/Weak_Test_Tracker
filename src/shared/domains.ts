export type ExamPart = 1 | 2 | 3

export type DomainRecord = {
  id: number
  exam_part: ExamPart
  name: string
  sort_order: number
}

/** Seeded into SQLite on first migrate for Part 1. */
export const DEFAULT_DOMAINS_BY_PART: Record<ExamPart, string[]> = {
  1: [
    'Individual Taxation',
    'Income',
    'Deductions/Credits',
    'Retirement Plans',
    'Basis/Capital Gains',
    'Estate/Gift Tax',
    'Ethics/Circular 230',
  ],
  2: [],
  3: [],
}

/** @deprecated Prefer DB-backed lists; kept for seed / tests. */
export const DOMAINS_BY_PART = DEFAULT_DOMAINS_BY_PART

export function getDomainsForPart(part: ExamPart): string[] {
  return DEFAULT_DOMAINS_BY_PART[part] ?? []
}

export function normalizeDomainName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function validateDomainName(raw: string): string | null {
  const name = normalizeDomainName(raw)
  if (!name) return 'Domain name is required'
  if (name.length > 80) return 'Domain name must be 80 characters or fewer'
  return null
}
