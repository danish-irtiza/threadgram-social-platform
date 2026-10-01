import axios from 'axios'

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'
const api = axios.create({
  baseURL: `${serverUrl}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let refreshSubscribers = []

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb)
}

const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

api.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('accessToken')
    try {
      const { store } = await import('../redux/store/store.js')
      const state = store.getState()
      if (state.auth?.accessToken) {
        token = state.auth.accessToken
      }
    } catch (e) {
      // fallback to token from localStorage
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Remove default application/json header when data is FormData so browser generates proper boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers?.delete) {
        config.headers.delete('Content-Type')
        config.headers.delete('content-type')
      } else if (config.headers) {
        delete config.headers['Content-Type']
        delete config.headers['content-type']
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refreshToken'
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const [{ store }, { refreshToken, clearAuth }] = await Promise.all([
          import('../redux/store/store.js'),
          import('../redux/features/auth/authSlice.js'),
        ])
        const resultAction = await store.dispatch(refreshToken())
        if (refreshToken.fulfilled.match(resultAction)) {
          const newToken = resultAction.payload.accessToken
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          onTokenRefreshed(newToken)
          isRefreshing = false
          return api(originalRequest)
        } else {
          store.dispatch(clearAuth())
          isRefreshing = false
          refreshSubscribers = []
          return Promise.reject(error)
        }
      } catch (err) {
        try {
          const [{ store }, { clearAuth }] = await Promise.all([
            import('../redux/store/store.js'),
            import('../redux/features/auth/authSlice.js'),
          ])
          store.dispatch(clearAuth())
        } catch (e) {
          // ignore
        }
        isRefreshing = false
        refreshSubscribers = []
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default api

