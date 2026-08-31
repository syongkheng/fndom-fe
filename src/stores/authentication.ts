import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { ElMessage, type FormInstance } from 'element-plus'
import { ApiRoute } from '@/constants/ApiRoute'
import HttpClient from '@/interceptors/HttpClient'
import type { LoginForm } from '@/interfaces/forms/LoginForm.model'
import { getLoginFormRules } from '@/validations/LoginFormRules'
import { getRegisterFormRules } from '@/validations/RegisterFormRules'
import type { AxiosError } from 'axios'
import { i18n } from '@/i18n'
import { Analytics } from '@/analytics/events'

const t = (key: string) => i18n.global.t(key)
const isNetworkError = (err: AxiosError) => !err.response && !!err.request

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

  const rules = computed(() => getLoginFormRules(t))
  const registerRules = computed(() => getRegisterFormRules(form, t))

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
        registerError.value = t('auth.errors.invalid_email_format')
        return
      }
      const res = await HttpClient.post(ApiRoute.AUTHENTICATE.PREFLIGHT, {
        email: form.email,
        system: 'fnd',
      }).catch((err: AxiosError) => {
        if (isNetworkError(err)) registerError.value = t('auth.errors.network')
        return null
      })
      return res?.data?.data?.exist ?? false
    } catch {
      registerError.value = t('auth.errors.unknown')
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
        registerError.value = t('auth.errors.terms_required')
        return false
      }
      const res = await HttpClient.post(ApiRoute.AUTHENTICATE.LOGIN, {
        email: form.email,
        password: form.password,
        system: 'fnd',
      }).catch((err: AxiosError) => {
        if (isNetworkError(err)) {
          registerError.value = t('auth.errors.network')
          return null
        }
        const code = (err.response?.data as any)?.data?.code
        if (code === 'email_not_verified') {
          authenticationStep.value = 'verify'
          registerError.value = t('auth.errors.email_not_verified')
        } else if (code === 'invalid_login_credentials' || code === 'token_expired') {
          registerError.value = t('auth.errors.invalid_login_credentials')
        } else {
          registerError.value = t('auth.errors.invalid_login_credentials')
        }
        return null
      })
      if (!res) return false

      ElMessage.success(t('auth.success.login'))
      isAuthenticated.value = true
      Analytics.authLogin()
      return true
    } catch {
      registerError.value = t('auth.errors.login_failed')
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
        registerError.value = t('auth.errors.terms_required')
        return false
      }
      if (form.username.trim().length < 3) {
        registerError.value = t('auth.validation.username_min')
        return false
      }
      if (form.password.length < 8) {
        registerError.value = t('auth.validation.password_min')
        return false
      }
      const res = await HttpClient.post(ApiRoute.AUTHENTICATE.REGISTER, {
        username: form.username.trim(),
        email: form.email,
        password: form.password,
        system: 'fnd',
      }).catch((err: AxiosError) => {
        if (isNetworkError(err)) {
          registerError.value = t('auth.errors.network')
          return null
        }
        const data = err.response?.data as any
        const code = data?.data?.code
        if (code === 'email_already_registered') {
          registerError.value = t('auth.errors.email_already_registered')
        } else if (code === 'username_already_taken') {
          registerError.value = t('auth.errors.username_already_taken')
        } else if (code === 'weak_password') {
          registerError.value = t('auth.errors.weak_password')
        } else if (code === 'registration_failed') {
          registerError.value = t('auth.errors.registration_failed')
        } else if (code?.startsWith('invalid_request_')) {
          const field = code.replace('invalid_request_', '')
          const key = `auth.errors.invalid_request_${field}`
          registerError.value = i18n.global.te(key)
            ? t(key)
            : t('auth.errors.invalid_request_generic')
        } else {
          registerError.value = t('auth.errors.registration_failed')
        }
        return null
      })
      if (!res) return false

      authenticationStep.value = 'verify'
      ElMessage.success(t('auth.success.register'))
      Analytics.authRegister()
      return true
    } catch {
      registerError.value = t('auth.errors.registration_failed')
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
        registerError.value = t('auth.errors.invalid_otp_format')
        return false
      }
      const res = await HttpClient.post(ApiRoute.AUTHENTICATE.VERIFY_EMAIL, {
        email: form.email,
        system: 'fnd',
        code: form.verifyCode,
      }).catch((err: AxiosError) => {
        if (isNetworkError(err)) {
          registerError.value = t('auth.errors.network')
          return null
        }
        const code = (err.response?.data as any)?.data?.code
        if (code === 'code_expired') {
          registerError.value = t('auth.errors.code_expired')
        } else if (code === 'max_verify_attempts') {
          registerError.value = t('auth.errors.max_verify_attempts')
        } else {
          registerError.value = t('auth.errors.verify_failed')
        }
        return null
      })
      if (!res) return false

      ElMessage.success(t('auth.success.verified'))
      isAuthenticated.value = true
      Analytics.authVerified()
      return true
    } catch {
      registerError.value = t('auth.errors.verify_failed')
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
      ElMessage.success(t('auth.success.resent'))
    } catch (err) {
      const e = err as AxiosError
      ElMessage.error(isNetworkError(e) ? t('auth.errors.network') : t('auth.errors.resend_failed'))
    }
  }

  const updateUsernameInStore = (newUsername: string) => {
    userProfile.value = { ...userProfile.value, username: newUsername }
  }

  const handleLogout = () => {
    Analytics.authLogout()
    isAuthenticated.value = false
    userProfile.value = { username: '', roles: [] }
    ElMessage.success(t('auth.success.logged_out'))
    // Best-effort — clears the httpOnly cookies server-side; local state above already reflects logout
    HttpClient.post(ApiRoute.AUTHENTICATE.LOGOUT, {}).catch(() => {})
  }

  return {
    isAuthenticated,
    userProfile,
    turnOffAdminFeatures,
    authenticationStep,
    formRef,
    form,
    rules,
    registerRules,
    resetForm,
    handleAuthenticate,
    handleLogin,
    handleRegister,
    handleVerifyEmail,
    handleResendCode,
    handleLogout,
    updateUsernameInStore,
    registerError,
    loading,
    setRedirectAfterLogin,
    redirectAfterLogin,
  }
})
