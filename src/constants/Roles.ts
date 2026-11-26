export interface RoleDefinition {
  value: string
  label: string
  module: string
  level: number
  description: string
  danger?: boolean
}

export const GRANTABLE_ROLES: RoleDefinition[] = [
  // Travel
  { value: 'TRAVEL_R1', label: 'Travel Member', module: 'TRAVEL', level: 1, description: 'Authenticated — can upload files in Travel' },
  { value: 'TRAVEL_R4', label: 'Travel Admin',  module: 'TRAVEL', level: 4, description: 'Travel admin privileges' },
  { value: 'TRAVEL_R5', label: 'Travel Super',  module: 'TRAVEL', level: 5, description: 'Full Travel control', danger: true },
  // System
  { value: 'SYSTEM_R5', label: 'System Super Admin', module: 'SYSTEM', level: 5, description: 'Full platform access — all modules', danger: true },
]

export const MODULE_COLORS: Record<string, string> = {
  TRAVEL: 'success',
  SYSTEM: 'danger',
}
