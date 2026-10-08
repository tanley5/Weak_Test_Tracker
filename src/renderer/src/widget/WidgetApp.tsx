import { useEffect, useReducer, useRef } from 'react'
import type { AppSettings } from '../../../shared/api'
import { createWidgetState, reduceWidget } from '../../../shared/widgetState'

function defaultDomain(settings: AppSettings, domains: string[]): string {
  const remembered = settings.last_domain_by_part[String(settings.active_exam_part)]
  if (remembered && domains.includes(remembered)) return remembered
  return domains[0] ?? ''
}

export function WidgetApp() {
  const [state, dispatch] = useReducer(reduceWidget, createWidgetState([], ''))
  const logging = useRef(false)

  useEffect(() => {
    async function loadDomains(settings?: AppSettings) {
      const s = settings ?? (await window.weakTracker.getSettings())
      const domains = await window.weakTracker.getDomains()
      dispatch({
        type: 'set_domains',
        domains,
        defaultDomain: defaultDomain(s, domains),
      })
    }

    void loadDomains()

    const offSettings = window.weakTracker.onSettingsChanged((settings) => {
      void loadDomains(settings)
    })
    const offDomains = window.weakTracker.onDomainsChanged(() => {
      void loadDomains()
    })
    const offExpand = window.weakTracker.onExpandWidget(() => {
      dispatch({ type: 'expand', trigger: 'hotkey' })
      window.widgetShell?.notifyExpanded()
    })
    const offCollapse = window.weakTracker.onCollapseWidget(() => {
      dispatch({ type: 'collapse' })
    })

    return () => {
      offSettings()
      offDomains()
      offExpand()
      offCollapse()
    }
  }, [])

  useEffect(() => {
    if (state.expanded) {
      window.widgetShell?.notifyExpanded()
    } else {
      window.widgetShell?.notifyCollapsed()
    }
  }, [state.expanded])

  useEffect(() => {
    if (!state.pendingLog || logging.current) return
    logging.current = true
    void window.weakTracker
      .createAttempt(state.pendingLog)
      .finally(() => {
        dispatch({ type: 'clear_pending' })
        logging.current = false
      })
  }, [state.pendingLog])

  if (!state.expanded) {
    return (
      <div className="widget-root">
        <button
          type="button"
          className="pill"
          onClick={() => dispatch({ type: 'expand', trigger: 'click' })}
        >
          Log Q
        </button>
      </div>
    )
  }

  return (
    <div className="widget-root">
      <div className="expanded">
        <div>
          <label htmlFor="widget-domain">Domain</label>
          <select
            id="widget-domain"
            value={state.domain}
            onChange={(e) => dispatch({ type: 'set_domain', domain: e.target.value })}
          >
            {state.domains.length === 0 && <option value="">No domains</option>}
            {state.domains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {state.step === 'awaiting_result' && (
          <div className="row">
            <button
              type="button"
              className="ok"
              disabled={!state.domain}
              onClick={() => dispatch({ type: 'answer', correct: true })}
            >
              Correct
            </button>
            <button
              type="button"
              className="bad"
              disabled={!state.domain}
              onClick={() => dispatch({ type: 'answer', correct: false })}
            >
              Incorrect
            </button>
          </div>
        )}

        {state.step === 'awaiting_miss_reason' && (
          <>
            <p className="hint">Why miss?</p>
            <div className="row three">
              <button
                type="button"
                className="reason"
                onClick={() => dispatch({ type: 'miss_reason', reason: 'didnt_know' })}
              >
                Didn&apos;t know
              </button>
              <button
                type="button"
                className="reason"
                onClick={() => dispatch({ type: 'miss_reason', reason: 'misread' })}
              >
                Misread
              </button>
              <button
                type="button"
                className="reason"
                onClick={() => dispatch({ type: 'miss_reason', reason: 'blanked' })}
              >
                Blanked
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          className="open-main"
          onClick={() => void window.weakTracker.showMainWindow()}
        >
          Open main window
        </button>
      </div>
    </div>
  )
}
