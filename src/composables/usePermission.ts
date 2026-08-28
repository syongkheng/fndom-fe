import { useAuthenticationStore } from '@/stores/authentication'

/**
 * Scoped role format: `{MODULE}_{LEVEL}`
 * Examples: PPHS_R5, TRAVEL_R4, SYSTEM_R5
 *
 * Modules:  PPHS | TRAVEL | SYSTEM
 * Levels:   R3 (officer) | R4 (admin) | R5 (super admin)
 *
 * SYSTEM_R5 grants access to every module at every level.
 *
 * Access matrix:
 * ┌──────────────────────┬──────────────────────────────────────┐
 * │ Feature              │ Required role                        │
 * ├──────────────────────┼──────────────────────────────────────┤
 * │ PPHS edit coords     │ PPHS_R5 (or SYSTEM_R5)               │
 * │ Travel admin         │ TRAVEL_R4+                           │
 * │ Full platform access │ SYSTEM_R5                            │
 * └──────────────────────┴──────────────────────────────────────┘
 */

const parseRole = (role: string): { module: string; level: number } | null => {
  const match = role.match(/^([A-Z]+)_R(\d)$/)
  if (!match) return null
  return { module: match[1], level: parseInt(match[2]) }
}

export const usePermission = () => {
  const authStore = useAuthenticationStore()

  const getRoles = (): string[] => {
    if (authStore.turnOffAdminFeatures) return []
    return authStore.userProfile.roles ?? []
  }

  /**
   * Check if the user has access to a module at a minimum level.
   * SYSTEM_R5 always passes.
   *
   * @example hasModuleAccess('PPHS', 5)   // only PPHS_R5 or SYSTEM_R5
   * @example hasModuleAccess('TRAVEL', 4) // TRAVEL_R4, TRAVEL_R5, or SYSTEM_R5
   */
  const hasModuleAccess = (module: string, minLevel: number): boolean => {
    const roles = getRoles()
    if (roles.includes('SYSTEM_R5')) return true
    return roles.some((r) => {
      const parsed = parseRole(r)
      return parsed !== null && parsed.module === module && parsed.level >= minLevel
    })
  }

  /**
   * Check if the user has an exact role string.
   * @example hasRole('PPHS_R5')
   */
  const hasRole = (role: string): boolean => {
    return getRoles().includes(role)
  }

  return { hasModuleAccess, hasRole }
}
