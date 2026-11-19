export type ScreenSize = 'small' | 'medium' | 'large'

export interface AnalyticsBreakpoint {
  key: string
  label: string
  maxWidth: number | null
  size: ScreenSize
}

export interface AnalyticsSystem {
  key: string
  displayName: string
  breakpoints: AnalyticsBreakpoint[]
}

export interface AnalyticsSystemAdmin extends AnalyticsSystem {
  allowedOrigins: string[]
  active: boolean
}

export interface AnalyticsBucket {
  key: string
  label: string
  views: number
  sessions: number
}

export interface AnalyticsSummary {
  system: AnalyticsSystem
  range: { from: number; to: number; bucket: 'hour'; hours: number }
  views: { total: number; uniqueSessions: number; series: { t: number; views: number; sessions: number }[] }
  breakpoints: AnalyticsBucket[]
  sizes: AnalyticsBucket[]
  topPages: { page: string; views: number }[]
}

export interface AnalyticsGrant {
  userId: number
  username: string
  email: string | null
  system: string
  accessLevel: string
  grantedDt: number
}
