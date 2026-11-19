import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { AuthError } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { homePathFor } from '../auth/roles'
import { canAccessPath } from '../navigation'
import { FullPageLoader } from '../components/PageStates'
import './LoginPage.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Girişten sonra nereye gidilecek: önce açılmak istenen sayfa (yetkisi varsa),
// yoksa rolüne göre ana sayfa (ADMIN -> /admin, RECEPTION -> /reception, diğerleri -> /portal).
function redirectTarget(user, from) {
  const roles = user?.roles ?? []
  if (from && canAccessPath(roles, from)) return from
  return homePathFor(roles)
}

export default function LoginPage() {
  const { status, user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0)

  const isLocked = lockSecondsLeft > 0

  // Çok fazla denemede kalan süreyi saniye saniye geri say.
  useEffect(() => {
    if (!isLocked) return undefined
    const timer = setInterval(() => {
      setLockSecondsLeft((seconds) => Math.max(seconds - 1, 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isLocked])

  function validate() {
    const errors = {}
    if (!email.trim()) {
      errors.email = 'E-posta adresi zorunludur.'
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      errors.email = 'Geçerli bir e-posta adresi girin.'
    }
    if (!password) {
      errors.password = 'Şifre zorunludur.'
    }
    return errors
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting || isLocked) return

    setFormError('')
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      const signedInUser = await signIn({ email: email.trim(), password })
      navigate(redirectTarget(signedInUser, from), { replace: true })
      return
    } catch (error) {
      if (error instanceof AuthError && error.status === 429) {
        setLockSecondsLeft(error.retryAfterSeconds)
        setFormError(error.message)
      } else {
        setFormError(error.message || 'Beklenmeyen bir hata oluştu.')
      }
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    document.title = 'Giriş yap · Smart Office'
  }, [])

  // Açılışta oturum kontrolü sürerken bekle; zaten giriş yapılmışsa formu gösterme.
  if (status === 'loading') return <FullPageLoader />
  if (status === 'authenticated') {
    return <Navigate to={redirectTarget(user, from)} replace />
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <header className="login-brand">
          <div className="login-logo" aria-hidden="true">AOS</div>
          <div>
            <p className="login-product">Smart Office</p>
            <h1 id="login-title" className="login-title">Giriş yap</h1>
          </div>
        </header>

        {formError && (
          <div className={`login-alert ${isLocked ? 'login-alert--warning' : ''}`} role="alert">
            <p>{formError}</p>
            {isLocked && (
              <p className="login-alert__countdown">
                Kalan süre: <strong>{formatCountdown(lockSecondsLeft)}</strong>
              </p>
            )}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="email">
              E-posta <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="username"
              placeholder="ornek@sirket.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              disabled={isSubmitting}
            />
            {fieldErrors.email && (
              <p id="email-error" className="field-error">{fieldErrors.email}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">
              Şifre <span className="required" aria-hidden="true">*</span>
            </label>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="field-error">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={isSubmitting || isLocked}
          >
            {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </button>

          {/* Parola sıfırlama P1 (Hafta 7) kapsamında eklenecek. */}
          <a className="login-forgot" href="#" aria-disabled="true" onClick={(event) => event.preventDefault()}>
            Parolamı unuttum
          </a>
        </form>
      </section>
    </main>
  )
}
