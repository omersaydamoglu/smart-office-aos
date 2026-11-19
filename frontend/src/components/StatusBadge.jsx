// Durum rozeti. Renkler docs/ui/ekran-icerik-listesi.md "Durum rozetleri" tablosuna göre.
// tone: 'success' (yeşil) | 'neutral' (gri) | 'info' (mavi) | 'warning' (turuncu) | 'danger' (kırmızı)
export default function StatusBadge({ tone = 'neutral', children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function UserStatusBadge({ status }) {
  return status === 'ACTIVE'
    ? <StatusBadge tone="success">Aktif</StatusBadge>
    : <StatusBadge tone="neutral">Pasif</StatusBadge>
}
