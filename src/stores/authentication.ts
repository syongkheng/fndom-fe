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
  const turnOffAdminFeatures = ref(false)
  const authenticationStep = ref<'email' | 'register' | 'login' | 'verify'>('email')
  const formRef = ref<FormInstance>()
  const loading = ref(false)
  const registerError = ref('')
  const redirectAfterLogin = ref(true)

  const userProfile = ref({ username: '', roles: [] as string[] })

  const setRedirectAfterLogin = (value: boolean) => {
    redirectAfterLogin.value = value
  }

  const form = reactive<LoginForm>({
    email: '',
    username: '',
    password: '',
    verifyCode: '',
    terms: true,
  })

  const rules = getLoginFormRules()

  const resetForm = () => {
    form.email = ''
    form.username = ''
    form.password = ''
    form.verifyCode = ''
    authenticationStep.value = 'email'
    registerError.value = ''
  }

  // ── Preflight ────────────────────────────────────────────────────────────────
  const handleAuthenticate = async () => {
    loading.value = true
    registerError.value = ''
    try {
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        registerError.value = 'Please enter a valid email address'
        return
      }
      const res = await HttpClient.post(ApiRoute.AUTHENTICATE.PREFLIGHT, {
        email: form.email,
        system: 'fnd',
      }).catch(() => null)
      return res?.data?.data?.exist ?? false
    } catch {
      registerError.value = 'Something went wrong. Please try again.'
    } finally {
      loading.value = false
    }
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async (): Promise<boolean> => {
    loading.value = true
    registerError.value = ''
    try {
      if (!form.terms) {
        registerError.value = 'You must agree to the terms and conditions'
        return false
      }
      const res = await HttpClient.post(ApiRoute.AUTHENTICATE.LOGIN, {
        email: form.email,
        password: form.password,
        system: 'fnd',
      }).catch((err: AxiosError) => {
        const data = err.response?.data as any
        if (data?.data?.code === 'email_not_verified') {
          authenticationStep.value = 'verify'
          registerError.value = 'Please verify your email first.'
        } else {
          ElMessage.error('Invalid credentials.')
        }
        return null
      })
      if (!res) return false

      const token = res.data.data.token.replace(/^"|"$/g, '')
      StorageUtils.set(StorageKey.JWT, token, 'local')
      ElMessage.success('Login successful')
      isAuthenticated.value = true
      return true
    } catch {
      registerError.value = 'Login failed. Please try again.'
      return false
    } finally {
      loading.value = false
    }
  }

  // ── Register ─────────────────────────────────────────────────────────────────
  const handleRegister = async (): Promise<boolean> => {
    loading.value = true
    registerError.value = ''
    try {
      if (!form.terms) {
        registerError.value = 'You must agree to the terms and conditions'
        return false
      }
      if (form.username.trim().length < 3) {
        registerError.value = 'Display name must be at least 3 characters'
        return false
      }
      if (form.password.length < 8) {
        registerError.value = 'Password must be at least 8 characters'
        return false
      }
      const res = await HttpClient.post(ApiRoute.AUTHENTICATE.REGISTER, {
        username: form.username.trim(),
        email: form.email,
        password: form.password,
        system: 'fnd',
      }).catch((err: AxiosError) => {
        const data = err.response?.data as any
        const code = data?.data?.code
        if (code === 'email_already_registered') {
          registerError.value = 'This email is already registered.'
        } else if (code === 'username_already_taken') {
          registerError.value = 'This username is already taken.'
        } else {
          registerError.value = data?.data?.message ?? 'Registration failed. Please try again.'
        }
        return null
      })
      if (!res) return false

      // Backend sends verification email — move to verify step
      authenticationStep.value = 'verify'
      ElMessage.success('Account created! Check your email for the verification code.')
      return true
    } catch {
      registerError.value = 'Registration failed. Please try again.'
      return false
    } finally {
      loading.value = false
    }
  }

  // ── Email verification ────────────────────────────────────────────────────────
  const handleVerifyEmail = async (): Promise<boolean> => {
    loading.value = true
    registerError.value = ''
    try {
      if (!/^\d{6}$/.test(form.verifyCode)) {
        registerError.value = 'Please enter the 6-digit code from your email'
        return false
      }
      const res = await HttpClient.post(ApiRoute.AUTHENTICATE.VERIFY_EMAIL, {
        email: form.email,
        system: 'fnd',
        code: form.verifyCode,
      }).catch((err: AxiosError) => {
        const code = (err.response?.data as any)?.data?.code
        if (code === 'code_expired') {
          registerError.value = "Your code has expired. Click 'Resend code' to get a new one."
        } else if (code === 'max_verify_attempts') {
          registerError.value = "Too many incorrect attempts. Click 'Resend code' for a new code."
        } else {
          registerError.value = 'Incorrect code. Please try again.'
        }
        return null
      })
      if (!res) return false

      const token = res.data.data.token.replace(/^"|"$/g, '')
      StorageUtils.set(StorageKey.JWT, token, 'local')
      ElMessage.success('Email verified! Welcome.')
      isAuthenticated.value = true
      return true
    } catch {
      registerError.value = 'Verification failed. Please try again.'
      return false
    } finally {
      loading.value = false
    }
  }

  // ── Resend code ───────────────────────────────────────────────────────────────
  const handleResendCode = async () => {
    try {
      await HttpClient.post(ApiRoute.AUTHENTICATE.RESEND_VERIFY, {
        email: form.email,
        system: 'fnd',
      })
      ElMessage.success('A new code has been sent to your email.')
    } catch {
      ElMessage.error('Could not resend the code. Please try again.')
    }
  }

  const handleLogout = () => {
    StorageUtils.remove(StorageKey.JWT, 'local')
    isAuthenticated.value = false
    userProfile.value = { username: '', roles: [] }
    ElMessage.success('Logged out successfully.')
  }

  return {
    isAuthenticated,
    userProfile,
    turnOffAdminFeatures,
    authenticationStep,
    formRef,
    form,
    rules,
    resetForm,
    handleAuthenticate,
    handleLogin,
    handleRegister,
    handleVerifyEmail,
    handleResendCode,
    handleLogout,
    registerError,
    loading,
    setRedirectAfterLogin,
    redirectAfterLogin,
  }
})
