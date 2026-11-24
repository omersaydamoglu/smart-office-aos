// Kimlik doğrulama API çağrıları.
// Backend sözleşmesi: backend/src/routes/authRoutes.js
//
// Mock modu: backend çalışmıyorsa frontend/.env.local dosyasına
//   VITE_USE_MOCK=true
// yazın. Bu durumda istekler sahte veriyle yanıtlanır (seed kullanıcıları).

import { API_BASE, USE_MOCK } from './config'

// Access token yalnızca bellekte tutulur (localStorage'a yazılmaz, XSS riskini azaltır).
// Refresh token backend tarafından httpOnly çerez olarak ayarlanır.
let accessToken = null

export function getAccessToken() {
  return accessToken
}

export class AuthError extends Error {
  constructor(message, { status, retryAfterSeconds } = {}) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const DEFAULT_LOCK_SECONDS = 15 * 60

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function login({ email, password }) {
  if (USE_MOCK) {
    return mockLogin({ email, password })
  }

  let response
  try {
    response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new AuthError('Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip tekrar deneyin.', {
      status: 0,
    })
  }

  const body = await readJson(response)

  if (response.ok) {
    accessToken = body?.data?.accessToken ?? null
    return body?.data?.user
  }

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    throw new AuthError(
      body?.message || 'Çok fazla giriş denemesi yaptınız. 15 dakika sonra tekrar deneyin.',
      {
        status: 429,
        retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : DEFAULT_LOCK_SECONDS,
      },
    )
  }

  if (response.status === 400 || response.status === 401) {
    // Güvenlik gereği hangi alanın yanlış olduğu söylenmez.
    throw new AuthError('E-posta veya şifre hatalı.', { status: response.status })
  }

  throw new AuthError('Beklenmeyen bir hata oluştu. Lütfen biraz sonra tekrar deneyin.', {
    status: response.status,
  })
}

// Oturum süresi dolduğunda (refresh de başarısız olursa) arayüzü haberdar etmek için.
const sessionExpiredListeners = new Set()

export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

export function notifySessionExpired() {
  accessToken = null
  clearMockUser()
  sessionExpiredListeners.forEach((listener) => listener())
}

// Refresh token tek kullanımlıktır: aynı token iki kez gönderilirse backend
// TÜM oturumları kapatır (bkz. backend fix #49). Bu yüzden aynı anda gelen
// yenileme istekleri tek bir isteği paylaşır. (React StrictMode geliştirmede
// açılış kodunu iki kez çalıştırdığı için bu koruma şarttır.)
let refreshPromise = null

export function refreshAccessToken() {
  if (USE_MOCK) return Promise.resolve(Boolean(accessToken))

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        })
        const body = await readJson(response)
        accessToken = response.ok ? (body?.data?.accessToken ?? null) : null
        return Boolean(accessToken)
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

// Sayfa yenilendiğinde: httpOnly çerezdeki refresh token ile yeni access token alıp
// kullanıcı bilgisini getirir. Oturum yoksa null döner.
// Not: /users/me şu an ad-soyad döndürmüyor (yalnızca id, e-posta, roller).
export async function restoreSession() {
  if (USE_MOCK) {
    const user = readMockUser()
    if (user) accessToken = 'mock-access-token'
    return user
  }

  const refreshed = await refreshAccessToken()
  if (!refreshed) return null

  try {
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    })
    if (!response.ok) return null
    const body = await readJson(response)
    return body?.data ?? null
  } catch {
    return null
  }
}

export async function logout() {
  accessToken = null
  clearMockUser()

  if (USE_MOCK) return

  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Çıkış isteği başarısız olsa bile kullanıcı arayüzden çıkarılır.
  }
}

// ---------------------------------------------------------------------------
// Mock (sahte) backend — yalnızca VITE_USE_MOCK=true iken kullanılır.
// Kullanıcılar backend/prisma/seed.js ile aynıdır.
// ---------------------------------------------------------------------------

const MOCK_USERS = [
  {
    email: 'admin@smartoffice.test',
    password: 'Admin123!dev',
    user: { id: 'mock-admin', email: 'admin@smartoffice.test', firstName: 'Sistem', lastName: 'Yöneticisi', roles: ['ADMIN'], department: null },
  },
  {
    email: 'resepsiyon@smartoffice.test',
    password: 'Test123!dev',
    user: { id: 'mock-reception', email: 'resepsiyon@smartoffice.test', firstName: 'Resepsiyon', lastName: 'Görevlisi', roles: ['RECEPTION'], department: null },
  },
  {
    email: 'yonetici@smartoffice.test',
    password: 'Test123!dev',
    user: { id: 'mock-manager', email: 'yonetici@smartoffice.test', firstName: 'Departman', lastName: 'Yöneticisi', roles: ['DEPT_MANAGER'], department: 'Yazılım' },
  },
  {
    email: 'calisan@smartoffice.test',
    password: 'Test123!dev',
    user: { id: 'mock-employee', email: 'calisan@smartoffice.test', firstName: 'Örnek', lastName: 'Çalışan', roles: ['EMPLOYEE'], department: 'Yazılım' },
  },
]

const mockState = { failedAttempts: 0, lockedUntil: 0 }

// Yalnızca mock modda: sayfa yenilenince tekrar giriş yapmamak için kullanıcı
// sekme kapanana kadar sessionStorage'da tutulur. Gerçek modda kullanılmaz.
const MOCK_USER_KEY = 'aos-mock-user'

// Mock API (mockAdmin.js) "kendi hesabını pasife alamazsın" gibi kontroller için kullanır.
export function getMockSessionUser() {
  return readMockUser()
}

function readMockUser() {
  try {
    const raw = sessionStorage.getItem(MOCK_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveMockUser(user) {
  try {
    sessionStorage.setItem(MOCK_USER_KEY, JSON.stringify(user))
  } catch {
    // Depolama kapalıysa sorun değil; yenilemede tekrar giriş istenir.
  }
}

function clearMockUser() {
  if (!USE_MOCK) return
  try {
    sessionStorage.removeItem(MOCK_USER_KEY)
  } catch {
    // yok say
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mockLogin({ email, password }) {
  await wait(600)

  const now = Date.now()
  if (mockState.lockedUntil > now) {
    throw new AuthError('Çok fazla giriş denemesi yaptınız. 15 dakika sonra tekrar deneyin.', {
      status: 429,
      retryAfterSeconds: Math.ceil((mockState.lockedUntil - now) / 1000),
    })
  }

  const match = MOCK_USERS.find(
    (item) => item.email === email.trim().toLowerCase() && item.password === password,
  )

  if (!match) {
    mockState.failedAttempts += 1
    if (mockState.failedAttempts >= 5) {
      mockState.failedAttempts = 0
      mockState.lockedUntil = now + DEFAULT_LOCK_SECONDS * 1000
    }
    throw new AuthError('E-posta veya şifre hatalı.', { status: 401 })
  }

  mockState.failedAttempts = 0
  accessToken = 'mock-access-token'
  saveMockUser(match.user)
  return match.user
}
