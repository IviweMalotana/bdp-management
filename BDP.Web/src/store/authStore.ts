import { create } from 'zustand'
import { auth } from '../services/api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  // True once we've checked localStorage for an existing session. Route guards must
  // wait for this before redirecting, otherwise a hard reload of a deep link bounces
  // an authenticated user to login (the token is read in an effect, after first render).
  isInitialized: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  initializeFromStorage: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  initializeFromStorage: () => {
    const token = localStorage.getItem('bdp_token')
    const userRaw = localStorage.getItem('bdp_user')
    if (token && userRaw) {
      try {
        const user: User = JSON.parse(userRaw)
        set({ token, user, isAuthenticated: true, isInitialized: true })
        return
      } catch {
        localStorage.removeItem('bdp_token')
        localStorage.removeItem('bdp_user')
      }
    }
    set({ isInitialized: true })
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const response = await auth.login({ email, password })
      localStorage.setItem('bdp_token', response.token)
      localStorage.setItem('bdp_user', JSON.stringify(response.user))
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid email or password.'
      set({ isLoading: false, error: message, isAuthenticated: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('bdp_token')
    localStorage.removeItem('bdp_user')
    set({ user: null, token: null, isAuthenticated: false, error: null })
  },

  clearError: () => set({ error: null }),
}))
