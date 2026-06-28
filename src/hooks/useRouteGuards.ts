import { useTokenVerification } from '@/hooks/useTokenVerification'
import { useAuthenticationStore } from '@/stores/authentication'
import { ElMessage } from 'element-plus'
import type { NavigationGuardNext } from 'vue-router'
import { i18n } from '@/i18n'
const t = (key: string) => i18n.global.t(key)

export function useRouteGuards() {
  const authGuard = async ({ next }: { next: NavigationGuardNext }) => {
    try {
      const { verifyToken } = useTokenVerification()
      const validity = await verifyToken()

      if (!validity) {
        ElMessage.error(t('toast.notLoggedIn'))
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
        ElMessage.error(t('toast.itineraryAccessDenied'))
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
        ElMessage.error(t('toast.loginRequired'))
        return next({ path: '/', query: { showLogin: 'true' } })
      }
      const authStore = useAuthenticationStore()
      if (!authStore.userProfile.roles?.includes('SYSTEM_R5')) {
        ElMessage.error(t('toast.accessDenied'))
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
  }
}
