import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

interface RetryConfig extends InternalAxiosRequestConfig {
  __retryCount?: number
}

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8030') + '/v1',
  timeout: 15000,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config

  const token = localStorage.getItem('access_token_fallback')
  if (!token) return config

  config.headers = config.headers ?? {}
  config.headers.Authorization = `Bearer ${token}`
  return config
})

// Long-running endpoints get their own timeout via the second axios argument.
// Usage: api.post('/assignments/preview', body, { timeout: API_TIMEOUTS.CONSTRAINT_PREVIEW })
export const API_TIMEOUTS = {
  CONSTRAINT_PREVIEW: 90_000, // 90s — constraint check + suggestions against Supabase
}

// Track X-RateLimit-* headers from server responses
export const rateLimitState: {
  limit: number | null
  remaining: number | null
  resetAt: number | null
} = { limit: null, remaining: null, resetAt: null }

api.interceptors.response.use(
  (res: AxiosResponse) => {
    const limit = res.headers['x-ratelimit-limit']
    const remaining = res.headers['x-ratelimit-remaining']
    const reset = res.headers['x-ratelimit-reset']
    if (limit) rateLimitState.limit = parseInt(limit, 10)
    if (remaining) rateLimitState.remaining = parseInt(remaining, 10)
    if (reset) rateLimitState.resetAt = parseInt(reset, 10) * 1000
    return res
  },
  async (err: AxiosError) => {
    const config = err.config as RetryConfig | undefined
    const status = err.response?.status

    // ECONNABORTED = axios timeout; ERR_CANCELED = AbortController
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      toast.error('Request timed out. The server is taking longer than expected — please try again.', {
        duration: 6000,
      })
      return Promise.reject(err)
    }

    // 401 — cookie expired or missing → redirect to login
    if (status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('access_token_fallback')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    // 429 — rate limited: exponential backoff with Retry-After header (RFC 6585)
    if (status === 429 && config && (config.__retryCount ?? 0) < 2) {
      config.__retryCount = (config.__retryCount ?? 0) + 1
      const retryAfter = err.response?.headers['retry-after']
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : Math.min(2 ** config.__retryCount * 1000, 8000)

      toast.warning(`Too many requests. Retrying in ${Math.ceil(waitMs / 1000)}s…`, { duration: waitMs })
      await new Promise((r) => setTimeout(r, waitMs))
      return api.request(config)
    }

    if (status === 429) {
      toast.error('Too many requests. Please wait a moment and try again.')
    }

    return Promise.reject(err)
  }
)

export default api
