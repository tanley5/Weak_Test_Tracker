import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { ExamPartRecord } from '../../../shared/domains'
import { validateExamPartName } from '../../../shared/domains'

type Props = {
  onBack: () => void
}

export function ExamPartManager({ onBack }: Props) {
  const [parts, setParts] = useState<ExamPartRecord[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [rows, settings] = await Promise.all([
      window.weakTracker.listExamParts(),
      window.weakTracker.getSettings(),
    ])
    setParts(rows)
    setActiveId(settings.active_exam_part)
  }, [])

  useEffect(() => {
    void refresh()
    const offParts = window.weakTracker.onExamPartsChanged(() => {
      void refresh()
    })
    const offSettings = window.weakTracker.onSettingsChanged(() => {
      void refresh()
    })
    return () => {
      offParts()
      offSettings()
    }
  }, [refresh])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const validation = validateExamPartName(newName)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await window.weakTracker.createExamPart(newName)
      setNewName('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add exam part')
    } finally {
      setBusy(false)
    }
  }

  async function onSaveEdit(id: number) {
    const validation = validateExamPartName(editName)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await window.weakTracker.updateExamPart(id, editName)
      setEditingId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename exam part')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: number, name: string) {
    if (
      !confirm(
        `Remove “${name}”? Domains for this part are deleted. Parts with logged attempts cannot be removed.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await window.weakTracker.deleteExamPart(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete exam part')
    } finally {
      setBusy(false)
    }
  }

  async function onMakeActive(id: number) {
    setBusy(true)
    setError(null)
    try {
      await window.weakTracker.setActiveExamPart(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set active part')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <button type="button" className="back-link" onClick={onBack}>
        ← Home
      </button>
      <h1 className="brand">Exam parts</h1>
      <p className="lede">
        Add, rename, or delete exam parts. The active part drives the floating widget and batch
        entry domain list.
      </p>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Add exam part</h2>
        <form className="domain-add" onSubmit={(e) => void onCreate(e)}>
          <input
            type="text"
            placeholder="e.g. Part 4"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            aria-label="New exam part name"
          />
          <button type="submit" className="primary" disabled={busy}>
            Add
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>Parts</h2>
        <ul className="domain-list">
          {parts.map((p) => (
            <li key={p.id}>
              {editingId === p.id ? (
                <div className="domain-edit-row">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={80}
                    aria-label={`Rename ${p.name}`}
                  />
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={() => void onSaveEdit(p.id)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setEditingId(null)
                      setError(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="domain-row">
                  <span>
                    {p.name}
                    {activeId === p.id ? ' · active' : ''}
                  </span>
                  <div className="domain-actions">
                    {activeId !== p.id && (
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy}
                        onClick={() => void onMakeActive(p.id)}
                      >
                        Set active
                      </button>
                    )}
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setEditingId(p.id)
                        setEditName(p.name)
                        setError(null)
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      disabled={busy}
                      onClick={() => void onDelete(p.id, p.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
