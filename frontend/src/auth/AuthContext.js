import { createContext, useContext } from 'react'

// status: 'loading' (açılışta oturum kontrol ediliyor) | 'authenticated' | 'anonymous'
export const AuthContext = createContext(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.')
  return value
}
