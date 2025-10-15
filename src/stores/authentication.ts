import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage, type FormInstance } from 'element-plus'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { LoginForm } from '@/interfaces/forms/LoginForm.model'
import { StorageUtils, StorageKey } from '@/utilities/StorageUtils'
import { getLoginFormRules } from '@/validations/LoginFormRules'
import type { AxiosError } from 'axios'

export const useAuthenticationStore = defineStore('authentication', () => {
  const isAuthenticated = ref(false)
  const authenticationStep = ref<'email' | 'register' | 'login'>('email')
  const formRef = ref<FormInstance>()
  const loading = ref(false)
  const registerError = ref('')

  const redirectAfterLogin = ref(true)

  const setRedirectAfterLogin = (value: boolean) => {
    redirectAfterLogin.value = value
  }

  const form = reactive<LoginForm>({
    identity: '',
    password: '',
    terms: true,
  })

  const rules = getLoginFormRules()
  const resetForm = () => {
    form.identity = ''
    form.password = ''
  }

  const isLoginFormValid = (): boolean => {
    if (form.identity?.length < 3) {
      registerError.value = `Has to be at least 3 characters`
      return false
    }

    if (!form.terms) {
      registerError.value = `Must agree to terms`
      return false
    }

    return true
  }

  const handleAuthenticate = async () => {
    loading.value = true
    registerError.value = ''

    try {
      if (!form.terms) {
        throw new Error('You must agree to the terms and conditions')
      }

      if (!isLoginFormValid()) {
        ElMessage.error('Authentication unsuccessful!')
        return
      }

      return await HttpClient.post(ApiRoute.AUTHENTICATE.AUTHENTICATE, { ...form })
        .then((res) => {
          return res.data.exist ?? false
        })
        .catch(() => {
          ElMessage.error('Invalid Credentials.')
        })
    } catch {
      registerError.value = 'Login failed. Please try again.'
      ElMessage.error('Something went wrong. Please try again.')
    } finally {
      loading.value = false
    }
  }

  const handleLogin = async (): Promise<boolean> => {
    loading.value = true
    registerError.value = ''

    try {
      if (!form.terms) {
        throw new Error('You must agree to the terms and conditions')
      }

      if (!isLoginFormValid()) {
        ElMessage.error('Authentication unsuccessful!')
        return false
      }

      const isLoginRequestSuccessful = await HttpClient.post(ApiRoute.AUTHENTICATE.LOGIN, {
        ...form,
      })
        .then((res) => {
          const token = res.data.token.replace(/^"|"$/g, '')
          StorageUtils.set(StorageKey.JWT, token, 'local')
          ElMessage.success('Login success')
          return !!token
        })
        .catch(() => {
          ElMessage.error('Invalid Credentials.')
          return false
        })

      isAuthenticated.value = isLoginRequestSuccessful
      return isLoginRequestSuccessful
    } catch {
      registerError.value = 'Login failed. Please try again.'
      ElMessage.error('Something went wrong. Please try again.')
      return false
    } finally {
      loading.value = false
    }
  }

  const isRegistrationFormValid = (): boolean => {
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

    if (form.password.length < 8) {
      registerError.value = `Password length too short (Must be at least 8)`
      return false
    }

    if (!emailRegex.test(form.identity)) {
      registerError.value = `Invalid Email Address`
      return false
    }

    return true
  }

  const handleRegister = async () => {
    loading.value = true
    registerError.value = ''

    try {
      if (!isRegistrationFormValid()) {
        ElMessage.error('Registration unsuccessful!')
        return
      }

      return await HttpClient.post(ApiRoute.AUTHENTICATE.REGISTER, { ...form }).then((res) => {
        const token = res.data.token.replace(/^"|"$/g, '')
        StorageUtils.set(StorageKey.JWT, token, 'local')
        ElMessage.success('Login success')
        isAuthenticated.value = true
        return !!token
      })
    } catch (err) {
      if ((err as AxiosError).isAxiosError) {
        const axiosError = err as AxiosError
        const { displayMessage } = axiosError.response?.data as {
          code: string
          displayMessage: string
        }
        ElMessage.error(`${displayMessage}`)
      }

      registerError.value = 'Registration failed. Please try again.'
    } finally {
      console.log('Loading: false')
      loading.value = false
    }
  }

  const verifyToken = async (): Promise<boolean> => {
    const token = StorageUtils.get(StorageKey.JWT, 'local')
    if (!token) return false

    try {
      const response = await HttpClient.post(ApiRoute.AUTHENTICATE.TOKEN_VERIFICATION, { token })
      if (response.data.valid) {
        isAuthenticated.value = true
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const handleLogout = () => {
    StorageUtils.remove(StorageKey.JWT, 'local')
    isAuthenticated.value = false
  }

  return {
    isAuthenticated,
    authenticationStep,
    formRef,
    form,
    rules,
    resetForm,
    handleAuthenticate,
    handleLogin,
    handleRegister,
    handleLogout,
    verifyToken,
    registerError,
    loading,
    setRedirectAfterLogin,
    redirectAfterLogin,
  }
})
