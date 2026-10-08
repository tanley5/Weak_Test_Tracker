export function formatPct(accuracy: number): string {
  if (!Number.isFinite(accuracy)) return '—'
  return `${Math.round(accuracy * 100)}%`
}

export function todayIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
