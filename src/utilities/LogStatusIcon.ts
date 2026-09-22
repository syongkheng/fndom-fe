import { CircleCheck, CircleClose, WarningFilled } from '@element-plus/icons-vue'

export type LogStatusLevel = 'success' | 'warning' | 'danger'

export function logStatusLevel(code: number): LogStatusLevel {
  if (code >= 500) return 'danger'
  if (code >= 400) return 'warning'
  return 'success'
}

export function logStatusIcon(code: number) {
  const level = logStatusLevel(code)
  const icon = level === 'danger' ? CircleClose : level === 'warning' ? WarningFilled : CircleCheck
  return { level, icon }
}
