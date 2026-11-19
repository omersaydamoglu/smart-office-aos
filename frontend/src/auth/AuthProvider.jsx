import { useCallback, useEffect, useMemo, useState } from 'react'
import { login, logout, onSessionExpired, restoreSession } from '../api/auth'
import { AuthContext } from './AuthContext'

const ANONYMOUS = { status: 'anonymous', user: null }

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  // Açılışta (ve sayfa yenilenince) mevcut oturumu geri yükle.
  useEffect(() => {
    let cancelled = false
    restoreSession().then((user) => {
      if (cancelled) return
      setState(user ? { status: 'authenticated', user } : ANONYMOUS)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Bir API isteği oturumun bittiğini fark ederse giriş ekranına dön.
  useEffect(() => onSessionExpired(() => setState(ANONYMOUS)), [])

  const signIn = useCallback(async (credentials) => {
    const user = await login(credentials)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const signOut = useCallback(async () => {
    await logout()
    setState(ANONYMOUS)
  }, [])

  const value = useMemo(
    () => ({ ...state, roles: state.user?.roles ?? [], signIn, signOut }),
    [state, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
