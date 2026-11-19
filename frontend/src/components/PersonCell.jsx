// Tablolarda "baş harf avatarı + ad soyad" hücresi (Stitch Kullanıcılar tasarımı).
import { displayName, initials } from '../utils/person'

export default function PersonCell({ user, highlight = false, inactive = false, suffix }) {
  return (
    <div className={`person-cell ${inactive ? 'person-cell--inactive' : ''}`}>
      <span className={`initials ${highlight ? 'initials--primary' : ''}`} aria-hidden="true">
        {initials(user)}
      </span>
      <span className="person-cell__name">
        {displayName(user)}
        {suffix}
      </span>
    </div>
  )
}
