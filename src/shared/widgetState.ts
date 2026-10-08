export type MissReason = 'didnt_know' | 'misread' | 'blanked'

export type PendingLog = {
  domain: string
  correct_bool: 0 | 1
  miss_reason_tag: MissReason | null
}

export type WidgetStep = 'idle' | 'awaiting_result' | 'awaiting_miss_reason'

export type WidgetState = {
  expanded: boolean
  domains: string[]
  domain: string
  step: WidgetStep
  pendingLog: PendingLog | null
  ignoreFocusUntil: number
}

export type WidgetAction =
  | { type: 'expand'; trigger: 'click' | 'hotkey' | 'focus'; now?: number }
  | { type: 'collapse'; now?: number }
  | { type: 'set_domain'; domain: string }
  | { type: 'set_domains'; domains: string[]; defaultDomain: string }
  | { type: 'answer'; correct: boolean }
  | { type: 'miss_reason'; reason: MissReason }
  | { type: 'clear_pending' }

const FOCUS_IGNORE_MS = 400

export function createWidgetState(domains: string[], defaultDomain: string): WidgetState {
  return {
    expanded: false,
    domains,
    domain: defaultDomain || domains[0] || '',
    step: 'idle',
    pendingLog: null,
    ignoreFocusUntil: 0,
  }
}

function collapse(state: WidgetState, now: number): WidgetState {
  return {
    ...state,
    expanded: false,
    step: 'idle',
    ignoreFocusUntil: now + FOCUS_IGNORE_MS,
  }
}

export function reduceWidget(state: WidgetState, action: WidgetAction): WidgetState {
  const now = 'now' in action && action.now != null ? action.now : Date.now()

  switch (action.type) {
    case 'expand': {
      if (action.trigger === 'focus' && now < state.ignoreFocusUntil) {
        return state
      }
      if (state.expanded) return state
      return {
        ...state,
        expanded: true,
        step: 'awaiting_result',
        pendingLog: null,
      }
    }
    case 'collapse':
      return collapse(state, now)
    case 'set_domain':
      return { ...state, domain: action.domain }
    case 'set_domains': {
      const domain =
        action.domains.includes(state.domain) && state.domain
          ? state.domain
          : action.defaultDomain || action.domains[0] || ''
      return { ...state, domains: action.domains, domain }
    }
    case 'answer': {
      if (action.correct) {
        return {
          ...collapse(state, now),
          pendingLog: {
            domain: state.domain,
            correct_bool: 1,
            miss_reason_tag: null,
          },
        }
      }
      return { ...state, step: 'awaiting_miss_reason', pendingLog: null }
    }
    case 'miss_reason':
      return {
        ...collapse(state, now),
        pendingLog: {
          domain: state.domain,
          correct_bool: 0,
          miss_reason_tag: action.reason,
        },
      }
    case 'clear_pending':
      return { ...state, pendingLog: null }
    default:
      return state
  }
}
