// src/api.js (or similar)
import { StorageKey, StorageUtils } from '@/utilities/StorageUtils'
import axios from 'axios'

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

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

export default HttpClient
