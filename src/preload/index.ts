import { contextBridge, ipcRenderer } from 'electron'
import type { WeakTrackerApi } from '../shared/api'
import type { ExamPart } from '../shared/domains'
import type { MissReason } from '../shared/widgetState'

const api: WeakTrackerApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setActiveExamPart: (part: ExamPart) => ipcRenderer.invoke('settings:setActiveExamPart', part),
  setTargetExamDate: (date: string) => ipcRenderer.invoke('settings:setTargetExamDate', date),
  getTodayStats: (date?: string) => ipcRenderer.invoke('stats:today', date),
  getRunningAccuracy: () => ipcRenderer.invoke('stats:running'),
  createBatchSession: (input) => ipcRenderer.invoke('batch:create', input),
  createAttempt: (input: {
    domain: string
    correct_bool: 0 | 1
    miss_reason_tag: MissReason | null
  }) => ipcRenderer.invoke('attempts:create', input),
  getDashboard: (domainFilter?: string) => ipcRenderer.invoke('dashboard:get', domainFilter),
  getDomains: () => ipcRenderer.invoke('domains:list'),
  listDomains: () => ipcRenderer.invoke('domains:listRecords'),
  createDomain: (name: string) => ipcRenderer.invoke('domains:create', name),
  updateDomain: (id: number, name: string) => ipcRenderer.invoke('domains:update', id, name),
  deleteDomain: (id: number) => ipcRenderer.invoke('domains:delete', id),
  listExamParts: () => ipcRenderer.invoke('examParts:list'),
  createExamPart: (name: string) => ipcRenderer.invoke('examParts:create', name),
  updateExamPart: (id: number, name: string) => ipcRenderer.invoke('examParts:update', id, name),
  deleteExamPart: (id: number) => ipcRenderer.invoke('examParts:delete', id),
  expandWidget: () => ipcRenderer.invoke('widget:expand'),
  showMainWindow: () => ipcRenderer.invoke('app:showMain'),
  requestCloseMain: () => ipcRenderer.invoke('app:requestCloseMain'),
  onSettingsChanged: (cb) => {
    const listener = (_: Electron.IpcRendererEvent, settings: unknown) => {
      cb(settings as Parameters<typeof cb>[0])
    }
    ipcRenderer.on('settings:changed', listener)
    return () => ipcRenderer.removeListener('settings:changed', listener)
  },
  onDomainsChanged: (cb) => {
    const listener = () => cb()
    ipcRenderer.on('domains:changed', listener)
    return () => ipcRenderer.removeListener('domains:changed', listener)
  },
  onExamPartsChanged: (cb) => {
    const listener = () => cb()
    ipcRenderer.on('examParts:changed', listener)
    return () => ipcRenderer.removeListener('examParts:changed', listener)
  },
  onExpandWidget: (cb) => {
    const listener = () => cb()
    ipcRenderer.on('widget:expand', listener)
    return () => ipcRenderer.removeListener('widget:expand', listener)
  },
  onCollapseWidget: (cb) => {
    const listener = () => cb()
    ipcRenderer.on('widget:collapse', listener)
    return () => ipcRenderer.removeListener('widget:collapse', listener)
  },
}

contextBridge.exposeInMainWorld('weakTracker', api)

// Widget resize notifications (fire-and-forget)
contextBridge.exposeInMainWorld('widgetShell', {
  notifyCollapsed: () => ipcRenderer.send('widget:collapsed'),
  notifyExpanded: () => ipcRenderer.send('widget:expanded'),
})
