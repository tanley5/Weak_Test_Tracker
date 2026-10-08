import type { WeakTrackerApi } from '../../shared/api'

declare global {
  interface Window {
    weakTracker: WeakTrackerApi
    widgetShell?: {
      notifyCollapsed: () => void
      notifyExpanded: () => void
    }
  }
}

export {}
