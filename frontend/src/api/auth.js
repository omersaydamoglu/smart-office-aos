// Kimlik doğrulama API çağrıları.
// Backend sözleşmesi: backend/src/routes/authRoutes.js
//
// Mock modu: backend çalışmıyorsa frontend/.env.local dosyasına
//   VITE_USE_MOCK=true
// yazın. Bu durumda istekler sahte veriyle yanıtlanır (seed kullanıcıları).

const API_BASE = '/api'
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

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

export async function logout() {
  accessToken = null

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
  return match.user
}
