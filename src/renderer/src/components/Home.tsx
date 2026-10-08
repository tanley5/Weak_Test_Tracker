import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, TodayStats } from '../../../shared/api'
import type { ExamPart, ExamPartRecord } from '../../../shared/domains'
import { daysUntil } from '../../../shared/stats'
import { formatPct, todayIsoLocal } from '../lib/format'
import { BatchEntryModal } from './BatchEntryModal'

type Props = {
  onOpenDashboard: () => void
  onOpenDomains: (part: ExamPart, name: string) => void
  onOpenExamParts: () => void
}

export function Home({ onOpenDashboard, onOpenDomains, onOpenExamParts }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [today, setToday] = useState<TodayStats | null>(null)
  const [running, setRunning] = useState<TodayStats | null>(null)
  const [domains, setDomains] = useState<string[]>([])
  const [examParts, setExamParts] = useState<ExamPartRecord[]>([])
  const [showBatch, setShowBatch] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!window.weakTracker) {
      setLoadError('Preload API missing — restart the app (npm run rebuild:electron && npm run dev).')
      return
    }
    try {
      const [s, t, r, d, parts] = await Promise.all([
        window.weakTracker.getSettings(),
        window.weakTracker.getTodayStats(),
        window.weakTracker.getRunningAccuracy(),
        window.weakTracker.getDomains(),
        window.weakTracker.listExamParts(),
      ])
      setSettings(s)
      setToday(t)
      setRunning(r)
      setDomains(d)
      setExamParts(parts)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load data')
    }
  }, [])

  useEffect(() => {
    void refresh()
    if (!window.weakTracker) return
    const offSettings = window.weakTracker.onSettingsChanged(() => {
      void refresh()
    })
    const offDomains = window.weakTracker.onDomainsChanged(() => {
      void refresh()
    })
    const offParts = window.weakTracker.onExamPartsChanged(() => {
      void refresh()
    })
    return () => {
      offSettings()
      offDomains()
      offParts()
    }
  }, [refresh])

  async function onPartChange(part: ExamPart) {
    const next = await window.weakTracker.setActiveExamPart(part)
    setSettings(next)
    await refresh()
  }

  async function onTargetChange(date: string) {
    const next = await window.weakTracker.setTargetExamDate(date)
    setSettings(next)
  }

  if (loadError) {
    return (
      <div className="app-shell">
        <h1 className="brand">Weak-Area Tracker</h1>
        <p className="error">{loadError}</p>
      </div>
    )
  }

  if (!settings || !today || !running) {
    return <div className="app-shell">Loading…</div>
  }

  const remaining = daysUntil(settings.target_exam_date, todayIsoLocal())
  const activePart =
    examParts.find((p) => p.id === settings.active_exam_part) ??
    ({ id: settings.active_exam_part, name: `Part ${settings.active_exam_part}`, sort_order: 0 } as ExamPartRecord)

  return (
    <div className="app-shell">
      <h1 className="brand">Weak-Area Tracker</h1>
      <p className="lede">
        Log EA practice by domain. Active part drives the floating widget so you never re-select
        the part mid-drill.
      </p>

      <div className="top-row">
        <div className="field">
          <label htmlFor="exam-part">Active exam part</label>
          <select
            id="exam-part"
            value={settings.active_exam_part}
            onChange={(e) => void onPartChange(Number(e.target.value))}
          >
            {examParts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="target-date">Target exam date</label>
          <input
            id="target-date"
            type="date"
            value={settings.target_exam_date}
            onChange={(e) => void onTargetChange(e.target.value)}
          />
        </div>
        <div className="countdown" data-testid="countdown">
          <span>{remaining}</span> days to {activePart.name} target
        </div>
      </div>

      <div className="stats-row">
        <div className="stat">
          <div className="label">Logged today</div>
          <div className="value">{today.questionsLogged}</div>
        </div>
        <div className="stat">
          <div className="label">Running accuracy ({activePart.name})</div>
          <div className="value">{formatPct(running.accuracy)}</div>
        </div>
      </div>

      <div className="actions actions-4">
        <button type="button" onClick={() => void window.weakTracker.expandWidget()}>
          Log question
        </button>
        <button type="button" className="secondary" onClick={() => setShowBatch(true)}>
          Batch entry
        </button>
        <button type="button" className="secondary" onClick={onOpenDashboard}>
          View dashboard
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => onOpenDomains(activePart.id, activePart.name)}
        >
          Manage domains
        </button>
        <button type="button" className="secondary" onClick={onOpenExamParts}>
          Manage exam parts
        </button>
      </div>

      {domains.length === 0 && (
        <p className="error">
          No domains configured for {activePart.name} yet. Use Manage domains to add them.
        </p>
      )}

      {showBatch && (
        <BatchEntryModal
          domains={domains}
          onClose={() => setShowBatch(false)}
          onSaved={() => void refresh()}
        />
      )}
    </div>
  )
}
