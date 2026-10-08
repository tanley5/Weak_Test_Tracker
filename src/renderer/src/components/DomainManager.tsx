import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { DomainRecord } from '../../../shared/domains'
import { validateDomainName } from '../../../shared/domains'

type Props = {
  examPart: number
  examPartName: string
  onBack: () => void
}

export function DomainManager({ examPart, examPartName, onBack }: Props) {
  const [domains, setDomains] = useState<DomainRecord[]>([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const rows = await window.weakTracker.listDomains()
    setDomains(rows)
  }, [])

  useEffect(() => {
    void refresh()
    return window.weakTracker.onDomainsChanged(() => {
      void refresh()
    })
  }, [refresh])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const validation = validateDomainName(newName)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await window.weakTracker.createDomain(newName)
      setNewName('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add domain')
    } finally {
      setBusy(false)
    }
  }

  async function onSaveEdit(id: number) {
    const validation = validateDomainName(editName)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await window.weakTracker.updateDomain(id, editName)
      setEditingId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename domain')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id: number, name: string) {
    if (!confirm(`Remove “${name}” from ${examPartName}? Past logs keep the old label.`)) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await window.weakTracker.deleteDomain(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete domain')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <button type="button" className="back-link" onClick={onBack}>
        ← Home
      </button>
      <h1 className="brand">Domains</h1>
      <p className="lede">
        Manage the {examPartName} domain list used by the floating widget and batch entry.
      </p>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Add domain</h2>
        <form className="domain-add" onSubmit={(e) => void onCreate(e)}>
          <input
            type="text"
            placeholder="e.g. Partnerships"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={80}
            aria-label="New domain name"
          />
          <button type="submit" className="primary" disabled={busy}>
            Add
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>{examPartName} list</h2>
        {domains.length === 0 ? (
          <p className="lede">No domains yet — add the HOCK breakdown for this part.</p>
        ) : (
          <ul className="domain-list">
            {domains.map((d) => (
              <li key={d.id}>
                {editingId === d.id ? (
                  <div className="domain-edit-row">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={80}
                      aria-label={`Rename ${d.name}`}
                    />
                    <button
                      type="button"
                      className="primary"
                      disabled={busy}
                      onClick={() => void onSaveEdit(d.id)}
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
                    <span>{d.name}</span>
                    <div className="domain-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setEditingId(d.id)
                          setEditName(d.name)
                          setError(null)
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        disabled={busy}
                        onClick={() => void onDelete(d.id, d.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
