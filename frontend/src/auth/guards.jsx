import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthContext'
import { hasAnyRole } from './roles'
import { ForbiddenState, FullPageLoader } from '../components/PageStates'

// Oturum yoksa giriş ekranına gönderir; giriş sonrası geri dönmek için
// gidilmek istenen adresi `state.from` içinde taşır.
export function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageLoader />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

// Rol yetmiyorsa sayfa yerine 403 durumunu gösterir (kabuk ve menü yerinde kalır).
export function RequireRole({ roles, children }) {
  const { roles: userRoles } = useAuth()
  if (!hasAnyRole(userRoles, roles)) return <ForbiddenState />
  return children
}
