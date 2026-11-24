// Durum rozeti. Renkler docs/ui/ekran-icerik-listesi.md "Durum rozetleri" tablosuna göre.
// tone: 'success' (yeşil) | 'neutral' (gri) | 'info' (mavi) | 'warning' (turuncu) | 'danger' (kırmızı)
// dot: solda küçük durum noktası (Aktif / Pasif gibi durumlar için)
import { ROLE_LABELS } from '../auth/roles'

export default function StatusBadge({ tone = 'neutral', dot = false, children }) {
  return <span className={`badge badge--${tone} ${dot ? 'badge--dot' : ''}`}>{children}</span>
}

export function UserStatusBadge({ status }) {
  return status === 'ACTIVE'
    ? <StatusBadge tone="success" dot>Aktif</StatusBadge>
    : <StatusBadge tone="neutral" dot>Pasif</StatusBadge>
}

export function ActiveBadge({ isActive }) {
  return isActive
    ? <StatusBadge tone="success" dot>Aktif</StatusBadge>
    : <StatusBadge tone="neutral" dot>Pasif</StatusBadge>
}

// Rol rozetleri: Yönetici mavi, diğerleri gri.
export function RoleBadges({ roles = [] }) {
  return (
    <ul className="role-badges" aria-label="Roller">
      {roles.map((role) => (
        <li key={role} className={`badge ${role === 'ADMIN' ? 'badge--role-admin' : 'badge--role'}`}>
          {ROLE_LABELS[role] || role}
        </li>
      ))}
    </ul>
  )
}
