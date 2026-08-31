import { ref } from 'vue'
import { useAuthenticationStore } from '@/stores/authentication'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

export const useTokenVerification = () => {
  const authStore = useAuthenticationStore()
  const isVerifying = ref(false)
  const verificationError = ref<string | null>(null)

  const verifyToken = async (): Promise<boolean> => {
    isVerifying.value = true
    verificationError.value = null

    try {
      // The session cookie is sent automatically and verified server-side; body is just
      // {} so RequestHeaderFilter sees a Content-Type: application/json header from axios
      const response = await HttpClient.post(ApiRoute.AUTHENTICATE.TOKEN_VERIFICATION, {})

      if (response.data.data.exist) {
        authStore.isAuthenticated = true
        authStore.userProfile.roles = response.data.data.roles ?? []
        authStore.userProfile.username = response.data.data.username
        return true
      } else {
        authStore.isAuthenticated = false
        return false
      }
    } catch (error) {
      console.error('Token verification error: ', error)
      verificationError.value = 'Token verification failed'
      authStore.isAuthenticated = false
      return false
    } finally {
      isVerifying.value = false
    }
  }

  return {
    verifyToken,
    isVerifying,
    verificationError,
  }
}
