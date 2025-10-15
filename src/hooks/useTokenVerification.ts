import { ref } from 'vue'
import { useAuthenticationStore } from '@/stores/authentication'
import { StorageUtils, StorageKey } from '@/utilities/StorageUtils'
import HttpClient from '@/interceptors/HttpClient'
import { ApiRoute } from '@/constants/ApiRoute'

export const useTokenVerification = () => {
  const authStore = useAuthenticationStore()
  const isVerifying = ref(false)
  const verificationError = ref<string | null>(null)

  const verifyToken = async (): Promise<boolean> => {
    const token = StorageUtils.get(StorageKey.JWT, 'local')
    if (!token) {
      authStore.isAuthenticated = false
      return false
    }

    isVerifying.value = true
    verificationError.value = null

    try {
      const response = await HttpClient.post(ApiRoute.AUTHENTICATE.TOKEN_VERIFICATION, { token })

      if (response.data.valid) {
        authStore.isAuthenticated = true
        return true
      } else {
        StorageUtils.remove(StorageKey.JWT, 'local')
        authStore.isAuthenticated = false
        return false
      }
    } catch (error) {
      console.error('Token verification error: ', error)
      verificationError.value = 'Token verification failed'
      StorageUtils.remove(StorageKey.JWT, 'local')
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
