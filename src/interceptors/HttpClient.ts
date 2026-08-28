import { StorageKey, StorageUtils } from '@/utilities/StorageUtils'
import axios, { type AxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { i18n } from '@/i18n'
const t = (key: string) => i18n.global.t(key)
import { useAuthenticationStore } from '@/stores/authentication'
import { useLayoutStateStore } from '@/stores/layoutState'

// Holds the active X-API-Key (personal key takes priority over trial key).
// Updated by the marketplace store whenever the key changes.
let _activeApiKey: string | null = null
export function setActiveApiKey(key: string | null): void {
  _activeApiKey = key
}

const HttpClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_BASE_URL,
  withCredentials: true,
})

function getCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

// Request interceptor
HttpClient.interceptors.request.use(
  (config) => {
    if (config.method && config.method.toUpperCase() !== 'GET') {
      const csrfToken = getCsrfCookie()
      if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken
    }

    // Inject X-API-Key only on chat endpoints — not on wallet, sessions, models, etc.
    const url = config.url ?? ''
    const CHAT_ENDPOINTS = ['/api/llm/chat', '/api/llm/trial/chat']
    if (CHAT_ENDPOINTS.some(p => url.startsWith(p))) {
      if (_activeApiKey) config.headers['X-API-Key'] = _activeApiKey
    }

    // Inject X-API-Key for Siri Shortcut baby-tracking endpoints, from the user-pasted
    // key stored in localStorage (no backend-issued/rotated key for this one, unlike the
    // marketplace key above).
    if (url.startsWith('/v1/ss/baby')) {
      const ssApiKey = StorageUtils.get<string>(StorageKey.SS_API_KEY, 'local')
      if (ssApiKey) config.headers['X-API-Key'] = ssApiKey
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor — handles globally when the server rejects a JWT
HttpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const data = error.response?.data as { status?: string } | undefined
    if (error.response?.status === 401 && data?.status === 'token_invalid') {
      const authStore = useAuthenticationStore()
      if (authStore.isAuthenticated) {
        const layoutStore = useLayoutStateStore()
        authStore.handleLogout()
        ElMessage.warning(t('toast.sessionExpired'))
        layoutStore.loginDialog.setTrue()
      }
    }
    return Promise.reject(error)
  },
)

export default HttpClient
