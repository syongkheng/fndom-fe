import { useTokenVerification } from '@/hooks/useTokenVerification'
import { useAuthenticationStore } from '@/stores/authentication'
import { ElMessage } from 'element-plus'
import { START_LOCATION, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router'
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

  // Signed-in users skip the landing page. Only the first page load hits the
  // server (the store isn't populated yet); in-app navigations trust the store
  // so a just-logged-out user isn't bounced back before the cookie clears.
  const landingGuard = async ({ from, next }: { from: RouteLocationNormalized; next: NavigationGuardNext }) => {
    const authStore = useAuthenticationStore()
    if (authStore.isAuthenticated) return next('/dashboard')
    if (from !== START_LOCATION) return next()
    try {
      const { verifyToken } = useTokenVerification()
      return (await verifyToken()) ? next('/dashboard') : next()
    } catch {
      return next()
    }
  }

  return {
    landingGuard,
    authGuard,
    collabListGuard,
    systemR5Guard,
  }
}
