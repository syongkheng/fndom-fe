import { StorageKey, StorageUtils } from '@/utilities/StorageUtils'
import axios from 'axios'

// Holds the active X-API-Key (personal key takes priority over trial key).
// Updated by the marketplace store whenever the key changes.
let _activeApiKey: string | null = null
export function setActiveApiKey(key: string | null): void {
  _activeApiKey = key
}

const HttpClient = axios.create({
  baseURL: import.meta.env.VITE_SERVER_BASE_URL,
})

// Request interceptor
HttpClient.interceptors.request.use(
  (config) => {
    const token = StorageUtils.get(StorageKey.JWT, 'local')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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

export default HttpClient
