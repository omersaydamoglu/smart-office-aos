// Ortak sayfa durumları (docs/ui/ekran-icerik-listesi.md, Bölüm 2.5):
// yükleniyor (iskelet), boş durum, hata (yeniden dene), yetkisiz (403), bulunamadı (404).

import { Link } from 'react-router'
import { Inbox, RefreshCw, SearchX, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { homePathFor } from '../auth/roles'
import './PageStates.css'

export function LoadingState({ rows = 4, label = 'Yükleniyor…' }) {
  return (
    <div className="state-skeleton" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="state-skeleton__row" aria-hidden="true" />
      ))}
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="state-fullpage" role="status" aria-live="polite">
      <div className="state-spinner" aria-hidden="true" />
      <span className="visually-hidden">Oturum kontrol ediliyor…</span>
    </div>
  )
}

function StateBox({ icon: Icon, tone = 'neutral', title, children, actions }) {
  return (
    <div className={`state-box state-box--${tone}`}>
      <div className="state-box__icon" aria-hidden="true">
        <Icon size={28} strokeWidth={1.75} />
      </div>
      <h2 className="state-box__title">{title}</h2>
      {children && <div className="state-box__text">{children}</div>}
      {actions && <div className="state-box__actions">{actions}</div>}
    </div>
  )
}

export function EmptyState({ title = 'Henüz kayıt yok', description, action }) {
  return (
    <StateBox icon={Inbox} title={title} actions={action}>
      {description && <p>{description}</p>}
    </StateBox>
  )
}

export function ErrorState({
  title = 'Bir şeyler ters gitti',
  message = 'Bilgiler yüklenemedi. Lütfen tekrar deneyin.',
  onRetry,
}) {
  return (
    <div role="alert">
      <StateBox
        icon={TriangleAlert}
        tone="danger"
        title={title}
        actions={
          onRetry && (
            <button type="button" className="btn btn-secondary btn-with-icon" onClick={onRetry}>
              <RefreshCw size={16} aria-hidden="true" />
              Tekrar dene
            </button>
          )
        }
      >
        <p>{message}</p>
      </StateBox>
    </div>
  )
}

function HomeLink() {
  const { roles } = useAuth()
  return (
    <Link className="btn btn-primary btn-link" to={homePathFor(roles)}>
      Ana sayfama dön
    </Link>
  )
}

export function ForbiddenState() {
  return (
    <StateBox icon={ShieldAlert} tone="warning" title="Bu sayfaya erişim yetkiniz yok" actions={<HomeLink />}>
      <p>Hesabınızın rolleri bu sayfayı görüntülemeye izin vermiyor. Erişime ihtiyacınız varsa sistem yöneticinize başvurun.</p>
      <p className="state-box__code">Hata kodu: 403</p>
    </StateBox>
  )
}

export function NotFoundState() {
  return (
    <StateBox icon={SearchX} title="Sayfa bulunamadı" actions={<HomeLink />}>
      <p>Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
      <p className="state-box__code">Hata kodu: 404</p>
    </StateBox>
  )
}
