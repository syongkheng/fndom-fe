import { useTokenVerification } from '@/hooks/useTokenVerification'
import { useAuthenticationStore } from '@/stores/authentication'
import { useFeatureFlagStore } from '@/stores/featureFlags'
import { ElMessage } from 'element-plus'
import type { NavigationGuardNext } from 'vue-router'

export function useRouteGuards() {
  const authGuard = async ({ next }: { next: NavigationGuardNext }) => {
    try {
      const { verifyToken } = useTokenVerification()
      const validity = await verifyToken()

      if (!validity) {
        ElMessage.error('You are not logged in. Please login')
        next({
          path: '/',
          query: { showLogin: 'true' },
        })
      } else {
        next()
      }
    } catch (error) {
      console.error('Auth guard error:', error)
      next('/')
    }
  }

  const collabListGuard = async ({ next }: { next: NavigationGuardNext }) => {
    try {
      const { verifyToken } = useTokenVerification()
      const validity = await verifyToken()

      if (!validity) {
        ElMessage.error('You are not allowed to edit the itinerary. Please contact the owner.')
      } else {
        next()
      }
    } catch (error) {
      console.error('Auth guard error:', error)
      next('/')
    }
  }

  const systemR5Guard = async ({ next }: { next: NavigationGuardNext }) => {
    try {
      const { verifyToken } = useTokenVerification()
      const validity = await verifyToken()
      if (!validity) {
        ElMessage.error('You must be logged in.')
        return next({ path: '/', query: { showLogin: 'true' } })
      }
      const authStore = useAuthenticationStore()
      if (!authStore.userProfile.roles?.includes('SYSTEM_R5')) {
        ElMessage.error('Access denied.')
        return next('/')
      }
      next()
    } catch {
      next('/')
    }
  }

  const featureGuard = async ({ next, featureKey }: { next: NavigationGuardNext; featureKey: string }) => {
    try {
      const flagStore = useFeatureFlagStore()
      if (!flagStore.loaded) await flagStore.fetchFlags()
      if (!flagStore.isEnabled(featureKey)) {
        ElMessage.warning('This feature is currently unavailable.')
        return next('/')
      }
      next()
    } catch {
      next('/')
    }
  }

  const authAndFeatureGuard = async ({ next, featureKey }: { next: NavigationGuardNext; featureKey: string }) => {
    try {
      const { verifyToken } = useTokenVerification()
      const validity = await verifyToken()
      if (!validity) {
        ElMessage.error('You are not logged in. Please login')
        return next({ path: '/', query: { showLogin: 'true' } })
      }
      const flagStore = useFeatureFlagStore()
      if (!flagStore.loaded) await flagStore.fetchFlags()
      if (!flagStore.isEnabled(featureKey)) {
        ElMessage.warning('This feature is currently unavailable.')
        return next('/')
      }
      next()
    } catch {
      next('/')
    }
  }

  return {
    authGuard,
    collabListGuard,
    systemR5Guard,
    featureGuard,
    authAndFeatureGuard,
  }
}
