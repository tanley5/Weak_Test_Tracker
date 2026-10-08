export type AttemptRow = {
  domain: string
  correct_bool: 0 | 1 | number
  date: string
  miss_reason_tag?: string | null
}

export type BatchRow = {
  domain: string
  correct_count: number
  total_count: number
  date: string
}

export type DomainAccuracy = {
  domain: string
  correct: number
  total: number
  accuracy: number
}

export type AccuracyColor = 'red' | 'yellow' | 'green'

export type WeeklyBucket = {
  weekStart: string
  correct: number
  total: number
  accuracy: number
}

export type MissReasonCounts = {
  didnt_know: number
  misread: number
  blanked: number
}

export function combineDomainAccuracy(
  attempts: AttemptRow[],
  batches: BatchRow[],
): DomainAccuracy[] {
  const map = new Map<string, { correct: number; total: number }>()

  for (const a of attempts) {
    const cur = map.get(a.domain) ?? { correct: 0, total: 0 }
    cur.correct += a.correct_bool ? 1 : 0
    cur.total += 1
    map.set(a.domain, cur)
  }

  for (const b of batches) {
    const cur = map.get(b.domain) ?? { correct: 0, total: 0 }
    cur.correct += b.correct_count
    cur.total += b.total_count
    map.set(b.domain, cur)
  }

  return [...map.entries()].map(([domain, { correct, total }]) => ({
    domain,
    correct,
    total,
    accuracy: total === 0 ? 0 : correct / total,
  }))
}

export function accuracyColor(accuracy: number): AccuracyColor {
  if (accuracy < 0.6) return 'red'
  if (accuracy <= 0.8) return 'yellow'
  return 'green'
}

export function needsDrilling(domains: DomainAccuracy[]): DomainAccuracy[] {
  return [...domains].sort((a, b) => a.accuracy - b.accuracy)
}

export function missReasonBreakdown(attempts: AttemptRow[]): MissReasonCounts {
  const counts: MissReasonCounts = { didnt_know: 0, misread: 0, blanked: 0 }
  for (const a of attempts) {
    if (a.correct_bool) continue
    if (a.miss_reason_tag === 'didnt_know') counts.didnt_know++
    else if (a.miss_reason_tag === 'misread') counts.misread++
    else if (a.miss_reason_tag === 'blanked') counts.blanked++
  }
  return counts
}

/** Monday (UTC date string) of the ISO week containing `date` (YYYY-MM-DD). */
export function isoWeekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  const day = d.getUTCDay() // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function weeklyAccuracy(
  attempts: AttemptRow[],
  batches: BatchRow[],
  domainFilter?: string,
): WeeklyBucket[] {
  const map = new Map<string, { correct: number; total: number }>()

  const bump = (date: string, correct: number, total: number, domain: string) => {
    if (domainFilter && domain !== domainFilter) return
    const key = isoWeekStart(date)
    const cur = map.get(key) ?? { correct: 0, total: 0 }
    cur.correct += correct
    cur.total += total
    map.set(key, cur)
  }

  for (const a of attempts) {
    bump(a.date, a.correct_bool ? 1 : 0, 1, a.domain)
  }
  for (const b of batches) {
    bump(b.date, b.correct_count, b.total_count, b.domain)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, { correct, total }]) => ({
      weekStart,
      correct,
      total,
      accuracy: total === 0 ? 0 : correct / total,
    }))
}

export function daysUntil(targetDate: string, today: string): number {
  const t = Date.parse(`${targetDate}T00:00:00Z`)
  const n = Date.parse(`${today}T00:00:00Z`)
  return Math.round((t - n) / (24 * 60 * 60 * 1000))
}
