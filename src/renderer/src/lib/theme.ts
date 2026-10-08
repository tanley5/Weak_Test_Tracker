export type ChartTheme = {
  grid: string
  axis: string
  tooltipBg: string
  line: string
  bar: string
  border: string
}

const FALLBACK: ChartTheme = {
  grid: '#c5d2cb',
  axis: '#5a6b62',
  tooltipBg: '#ffffff',
  line: '#2f7d62',
  bar: '#a88412',
  border: '#c5d2cb',
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/** Reads live CSS variables so Recharts follows system light/dark. */
export function getChartTheme(): ChartTheme {
  return {
    grid: readVar('--chart-grid', FALLBACK.grid),
    axis: readVar('--chart-axis', FALLBACK.axis),
    tooltipBg: readVar('--chart-tooltip-bg', FALLBACK.tooltipBg),
    line: readVar('--chart-line', FALLBACK.line),
    bar: readVar('--chart-bar', FALLBACK.bar),
    border: readVar('--line', FALLBACK.border),
  }
}

export function subscribeSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => onChange()
  mq.addEventListener('change', listener)
  return () => mq.removeEventListener('change', listener)
}
