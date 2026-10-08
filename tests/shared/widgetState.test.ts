import { describe, expect, it } from 'vitest'
import {
  createWidgetState,
  reduceWidget,
  type WidgetState,
} from '../../src/shared/widgetState'

describe('widgetState', () => {
  it('starts collapsed', () => {
    const state = createWidgetState(['Income', 'Ethics/Circular 230'], 'Income')
    expect(state.expanded).toBe(false)
    expect(state.domain).toBe('Income')
    expect(state.step).toBe('idle')
  })

  it('expands on click, hotkey, and focus', () => {
    let state = createWidgetState(['Income'], 'Income')
    for (const trigger of ['click', 'hotkey', 'focus'] as const) {
      state = createWidgetState(['Income'], 'Income')
      state = reduceWidget(state, { type: 'expand', trigger })
      expect(state.expanded).toBe(true)
      expect(state.step).toBe('awaiting_result')
    }
  })

  it('ignores focus expand briefly after collapse to avoid reopen loop', () => {
    let state = createWidgetState(['Income'], 'Income')
    state = reduceWidget(state, { type: 'expand', trigger: 'click' })
    state = reduceWidget(state, { type: 'answer', correct: true })
    expect(state.expanded).toBe(false)
    expect(state.ignoreFocusUntil).toBeGreaterThan(Date.now())

    state = reduceWidget(state, {
      type: 'expand',
      trigger: 'focus',
      now: state.ignoreFocusUntil - 1,
    })
    expect(state.expanded).toBe(false)

    state = reduceWidget(state, {
      type: 'expand',
      trigger: 'focus',
      now: state.ignoreFocusUntil + 1,
    })
    expect(state.expanded).toBe(true)
  })

  it('shows miss reasons after incorrect, then collapses on reason select', () => {
    let state: WidgetState = createWidgetState(['Income'], 'Income')
    state = reduceWidget(state, { type: 'expand', trigger: 'click' })
    state = reduceWidget(state, { type: 'answer', correct: false })
    expect(state.expanded).toBe(true)
    expect(state.step).toBe('awaiting_miss_reason')

    state = reduceWidget(state, { type: 'miss_reason', reason: 'misread' })
    expect(state.expanded).toBe(false)
    expect(state.step).toBe('idle')
    expect(state.pendingLog).toEqual({
      domain: 'Income',
      correct_bool: 0,
      miss_reason_tag: 'misread',
    })
  })

  it('logs correct immediately and collapses', () => {
    let state = createWidgetState(['Income'], 'Income')
    state = reduceWidget(state, { type: 'expand', trigger: 'hotkey' })
    state = reduceWidget(state, { type: 'answer', correct: true })
    expect(state.pendingLog).toEqual({
      domain: 'Income',
      correct_bool: 1,
      miss_reason_tag: null,
    })
    expect(state.expanded).toBe(false)
  })

  it('updates domains when active part changes without asking for part', () => {
    let state = createWidgetState(['Income'], 'Income')
    state = reduceWidget(state, {
      type: 'set_domains',
      domains: ['Business Entities'],
      defaultDomain: 'Business Entities',
    })
    expect(state.domains).toEqual(['Business Entities'])
    expect(state.domain).toBe('Business Entities')
  })

  it('collapses to pill on blur without logging', () => {
    let state = createWidgetState(['Income'], 'Income')
    state = reduceWidget(state, { type: 'expand', trigger: 'click' })
    state = reduceWidget(state, { type: 'collapse', now: 1_000 })
    expect(state.expanded).toBe(false)
    expect(state.step).toBe('idle')
    expect(state.pendingLog).toBeNull()
    expect(state.ignoreFocusUntil).toBeGreaterThan(1_000)
  })
})