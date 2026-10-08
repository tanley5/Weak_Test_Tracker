import { BrowserWindow, ipcMain } from 'electron'
import type { ExamPart } from '../shared/domains'
import {
  combineDomainAccuracy,
  missReasonBreakdown,
  needsDrilling,
  weeklyAccuracy,
} from '../shared/stats'
import type { MissReason } from '../shared/widgetState'
import type { WeakTrackerDb } from './db'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function readSettings(db: WeakTrackerDb) {
  const part = Number(db.getSetting('active_exam_part') ?? '1') as ExamPart
  const last = JSON.parse(db.getSetting('last_domain_by_part') ?? '{}') as Record<
    string,
    string
  >
  return {
    active_exam_part: part,
    target_exam_date: db.getSetting('target_exam_date') ?? '2027-02-01',
    last_domain_by_part: last,
  }
}

function broadcastSettings(db: WeakTrackerDb): void {
  const settings = readSettings(db)
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('settings:changed', settings)
  }
}

function broadcastDomainsChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('domains:changed')
  }
}

function broadcastExamPartsChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('examParts:changed')
  }
}

export function registerIpc(db: WeakTrackerDb, expandWidget: () => void): void {
  ipcMain.handle('settings:get', () => readSettings(db))

  ipcMain.handle('settings:setActiveExamPart', (_e, part: ExamPart) => {
    if (!db.getExamPart(part)) {
      throw new Error('Exam part not found')
    }
    db.setSetting('active_exam_part', String(part))
    broadcastSettings(db)
    return readSettings(db)
  })

  ipcMain.handle('settings:setTargetExamDate', (_e, date: string) => {
    db.setSetting('target_exam_date', date)
    broadcastSettings(db)
    return readSettings(db)
  })

  ipcMain.handle('stats:today', (_e, date?: string) => {
    const settings = readSettings(db)
    return db.getTodayStats(settings.active_exam_part, date ?? todayIso())
  })

  ipcMain.handle('stats:running', () => {
    const settings = readSettings(db)
    return db.getRunningAccuracy(settings.active_exam_part)
  })

  ipcMain.handle('domains:list', () => {
    const settings = readSettings(db)
    return db.listDomainNames(settings.active_exam_part)
  })

  ipcMain.handle('domains:listRecords', () => {
    const settings = readSettings(db)
    return db.listDomains(settings.active_exam_part)
  })

  ipcMain.handle('domains:create', (_e, name: string) => {
    const settings = readSettings(db)
    const row = db.createDomain(settings.active_exam_part, name)
    broadcastDomainsChanged()
    return row
  })

  ipcMain.handle('domains:update', (_e, id: number, name: string) => {
    const row = db.updateDomain(id, name)
    broadcastDomainsChanged()
    broadcastSettings(db)
    return row
  })

  ipcMain.handle('domains:delete', (_e, id: number) => {
    db.deleteDomain(id)
    broadcastDomainsChanged()
  })

  ipcMain.handle('examParts:list', () => db.listExamParts())

  ipcMain.handle('examParts:create', (_e, name: string) => {
    const row = db.createExamPart(name)
    broadcastExamPartsChanged()
    return row
  })

  ipcMain.handle('examParts:update', (_e, id: number, name: string) => {
    const row = db.updateExamPart(id, name)
    broadcastExamPartsChanged()
    broadcastSettings(db)
    return row
  })

  ipcMain.handle('examParts:delete', (_e, id: number) => {
    db.deleteExamPart(id)
    broadcastExamPartsChanged()
    broadcastDomainsChanged()
    broadcastSettings(db)
  })

  ipcMain.handle(
    'batch:create',
    (
      _e,
      input: { date: string; domain: string; correct_count: number; total_count: number },
    ) => {
      const settings = readSettings(db)
      const id = db.createBatchSession({
        ...input,
        exam_part: settings.active_exam_part,
      })
      return { id }
    },
  )

  ipcMain.handle(
    'attempts:create',
    (
      _e,
      input: {
        domain: string
        correct_bool: 0 | 1
        miss_reason_tag: MissReason | null
      },
    ) => {
      const settings = readSettings(db)
      const id = db.createAttempt({
        date: todayIso(),
        exam_part: settings.active_exam_part,
        domain: input.domain,
        correct_bool: input.correct_bool,
        miss_reason_tag: input.miss_reason_tag,
        entry_mode: 'widget',
      })
      return { id }
    },
  )

  ipcMain.handle('dashboard:get', (_e, domainFilter?: string) => {
    const settings = readSettings(db)
    const attempts = db.listAttempts(settings.active_exam_part)
    const batches = db.listBatchSessions(settings.active_exam_part)
    const domains = combineDomainAccuracy(attempts, batches)
    return {
      domains,
      needsDrilling: needsDrilling(domains),
      weekly: weeklyAccuracy(attempts, batches, domainFilter),
      missReasons: missReasonBreakdown(attempts),
    }
  })

  ipcMain.handle('widget:expand', () => {
    expandWidget()
  })
}
