export type CloseChoice = 'main' | 'app' | 'cancel'

/** Maps Electron message-box button index for the close-main dialog. */
export function mapCloseDialogIndex(index: number): CloseChoice {
  if (index === 0) return 'main'
  if (index === 1) return 'app'
  return 'cancel'
}

export const CLOSE_DIALOG_BUTTONS = ['Main window only', 'Quit app', 'Cancel'] as const
