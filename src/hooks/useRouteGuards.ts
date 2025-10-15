import { useTokenVerification } from '@/hooks/useTokenVerification'
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

  return {
    authGuard,
    collabListGuard,
  }
}
