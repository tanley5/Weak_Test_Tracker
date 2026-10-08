import { useState, type FormEvent } from 'react'
import { todayIsoLocal } from '../lib/format'

type Props = {
  domains: string[]
  onClose: () => void
  onSaved: () => void
}

export function validateBatch(correct: number, total: number): string | null {
  if (!Number.isFinite(total) || total <= 0) return 'Total must be greater than 0'
  if (!Number.isFinite(correct) || correct < 0 || correct > total) {
    return 'Correct must be between 0 and total'
  }
  return null
}

export function BatchEntryModal({ domains, onClose, onSaved }: Props) {
  const [domain, setDomain] = useState(domains[0] ?? '')
  const [correct, setCorrect] = useState('0')
  const [total, setTotal] = useState('10')
  const [date, setDate] = useState(todayIsoLocal())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const correct_count = Number(correct)
    const total_count = Number(total)
    const validation = validateBatch(correct_count, total_count)
    if (validation) {
      setError(validation)
      return
    }
    if (!domain) {
      setError('Pick a domain')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await window.weakTracker.createBatchSession({
        date,
        domain,
        correct_count,
        total_count,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save batch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="batch-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="batch-title">Batch entry</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="batch-domain">Domain</label>
            <select
              id="batch-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            >
              {domains.length === 0 && <option value="">No domains for this part</option>}
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="batch-correct">Correct count</label>
            <input
              id="batch-correct"
              type="number"
              min={0}
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="batch-total">Total count</label>
            <input
              id="batch-total"
              type="number"
              min={1}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="batch-date">Date</label>
            <input
              id="batch-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving || domains.length === 0}>
              {saving ? 'Saving…' : 'Save batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
