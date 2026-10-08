import type { DomainRecord, ExamPart } from './domains'
import type { MissReason } from './widgetState'
import type { DomainAccuracy, MissReasonCounts, WeeklyBucket } from './stats'

export type TodayStats = {
  questionsLogged: number
  correct: number
  accuracy: number
}

export type AppSettings = {
  active_exam_part: ExamPart
  target_exam_date: string
  last_domain_by_part: Record<string, string>
}

export type DashboardData = {
  domains: DomainAccuracy[]
  needsDrilling: DomainAccuracy[]
  weekly: WeeklyBucket[]
  missReasons: MissReasonCounts
}

export type WeakTrackerApi = {
  getSettings: () => Promise<AppSettings>
  setActiveExamPart: (part: ExamPart) => Promise<AppSettings>
  setTargetExamDate: (date: string) => Promise<AppSettings>
  getTodayStats: (date?: string) => Promise<TodayStats>
  getRunningAccuracy: () => Promise<TodayStats>
  createBatchSession: (input: {
    date: string
    domain: string
    correct_count: number
    total_count: number
  }) => Promise<{ id: number }>
  createAttempt: (input: {
    domain: string
    correct_bool: 0 | 1
    miss_reason_tag: MissReason | null
  }) => Promise<{ id: number }>
  getDashboard: (domainFilter?: string) => Promise<DashboardData>
  getDomains: () => Promise<string[]>
  listDomains: () => Promise<DomainRecord[]>
  createDomain: (name: string) => Promise<DomainRecord>
  updateDomain: (id: number, name: string) => Promise<DomainRecord>
  deleteDomain: (id: number) => Promise<void>
  expandWidget: () => Promise<void>
  onSettingsChanged: (cb: (settings: AppSettings) => void) => () => void
  onDomainsChanged: (cb: () => void) => () => void
  onExpandWidget: (cb: () => void) => () => void
}
