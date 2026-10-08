export type ExamPart = 1 | 2 | 3

export const DOMAINS_BY_PART: Record<ExamPart, string[]> = {
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

export function getDomainsForPart(part: ExamPart): string[] {
  return DOMAINS_BY_PART[part] ?? []
}
