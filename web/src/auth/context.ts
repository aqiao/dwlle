import { createContext } from 'react'
import type { CurrentUser } from './types'

export interface AuthContextValue {
  loading: boolean
  user: CurrentUser | null
  error: string
  login: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
