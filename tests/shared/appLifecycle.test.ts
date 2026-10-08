import { describe, expect, it } from 'vitest'
import { CLOSE_DIALOG_BUTTONS, mapCloseDialogIndex } from '../../src/shared/appLifecycle'

describe('mapCloseDialogIndex', () => {
  it('maps main / app / cancel buttons', () => {
    expect(CLOSE_DIALOG_BUTTONS).toEqual(['Main window only', 'Quit app', 'Cancel'])
    expect(mapCloseDialogIndex(0)).toBe('main')
    expect(mapCloseDialogIndex(1)).toBe('app')
    expect(mapCloseDialogIndex(2)).toBe('cancel')
    expect(mapCloseDialogIndex(99)).toBe('cancel')
  })
})
