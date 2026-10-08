/** Numeric exam-part id (DB primary key). Seeded 1–3; users can add more. */
export type ExamPart = number

export type ExamPartRecord = {
  id: number
  name: string
  sort_order: number
}

export type DomainRecord = {
  id: number
  exam_part: ExamPart
  name: string
  sort_order: number
}

/** Seeded into SQLite on first migrate for Part 1. */
export const DEFAULT_DOMAINS_BY_PART: Record<number, string[]> = {
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

export const DEFAULT_EXAM_PARTS: { id: number; name: string }[] = [
  { id: 1, name: 'Part 1' },
  { id: 2, name: 'Part 2' },
  { id: 3, name: 'Part 3' },
]

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

export function normalizeExamPartName(raw: string): string {
  return normalizeDomainName(raw)
}

export function validateExamPartName(raw: string): string | null {
  const name = normalizeExamPartName(raw)
  if (!name) return 'Exam part name is required'
  if (name.length > 80) return 'Exam part name must be 80 characters or fewer'
  return null
}
