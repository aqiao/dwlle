import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser } from '../api/client'
import { AuthContext } from './context'
import { beginLogin, clearTokens, completeLogin, endLogin, getAccessToken } from './oidc'
import type { CurrentUser } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const authenticate = async () => {
      try {
        await completeLogin()
        if (!getAccessToken()) return
        const currentUser = await getCurrentUser()
        if (active) setUser(currentUser)
      } catch {
        clearTokens()
        if (active) setError('登录已失效，请重新通过 OIDC 登录')
      } finally {
        if (active) setLoading(false)
      }
    }
    void authenticate()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      clearTokens()
      setUser(null)
      setError('登录已过期，请重新登录')
    }
    window.addEventListener('dwlle:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('dwlle:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async () => {
    setError('')
    try {
      await beginLogin()
    } catch {
      setError('无法连接 OIDC 身份服务，请稍后重试')
    }
  }, [])

  const logout = useCallback(async () => {
    await endLogin()
    clearTokens()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ loading, user, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
