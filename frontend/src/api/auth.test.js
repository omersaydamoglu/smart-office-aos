// #43 — Giriş, kilitlenme ve token yenileme (API katmanı)
import { describe, expect, it, vi } from 'vitest'
import { AuthError, getAccessToken, login, logout, onSessionExpired } from './auth'
import { apiFetch, ApiError } from './client'
import { json, mockApi, USERS } from '../test/api'

const credentials = { email: 'admin@smartoffice.test', password: 'Admin123!dev' }

describe('login', () => {
  it('başarılı girişte kullanıcıyı döner ve access token bellekte tutulur', async () => {
    mockApi(() => json(200, { data: { accessToken: 'access-1', user: USERS.ADMIN } }))

    const user = await login(credentials)

    expect(user).toEqual(USERS.ADMIN)
    expect(getAccessToken()).toBe('access-1')
    expect(localStorage.length).toBe(0) // token tarayıcı deposuna yazılmaz
    await logout()
  })

  it('yanlış şifrede hangi alanın hatalı olduğunu söylemeden hata verir', async () => {
    mockApi(() => json(401, { message: 'E-posta veya şifre hatalı.' }))

    await expect(login(credentials)).rejects.toMatchObject({
      name: 'AuthError',
      status: 401,
      message: 'E-posta veya şifre hatalı.',
    })
  })

  it('pasif hesapta da aynı genel hatayı verir (backend ayırt etmez)', async () => {
    mockApi(() => json(401, { message: 'E-posta veya şifre hatalı.' }))
    await expect(login(credentials)).rejects.toThrow('E-posta veya şifre hatalı.')
  })

  it('çok fazla denemede (429) kilit süresini Retry-After başlığından alır', async () => {
    mockApi(() => json(429, { message: 'Çok fazla giriş denemesi yaptınız. 15 dakika sonra tekrar deneyin.' }, { 'Retry-After': '120' }))

    const error = await login(credentials).catch((err) => err)

    expect(error).toBeInstanceOf(AuthError)
    expect(error.status).toBe(429)
    expect(error.retryAfterSeconds).toBe(120)
  })

  it('Retry-After yoksa kilit süresi 15 dakika kabul edilir', async () => {
    mockApi(() => json(429, { message: 'Çok fazla deneme.' }))
    await expect(login(credentials)).rejects.toMatchObject({ retryAfterSeconds: 15 * 60 })
  })

  it('sunucuya ulaşılamazsa ağ hatası mesajı verir', async () => {
    mockApi(() => new TypeError('Failed to fetch'))
    await expect(login(credentials)).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Sunucuya ulaşılamıyor') })
  })
})

describe('token yenileme (apiFetch)', () => {
  async function signIn() {
    mockApi(() => json(200, { data: { accessToken: 'eski-token', user: USERS.ADMIN } }))
    await login(credentials)
  }

  it('istekte access token Authorization başlığında gider', async () => {
    await signIn()
    const fetchMock = mockApi(() => json(200, { data: [] }))

    await apiFetch('/users')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer eski-token')
    await logout()
  })

  it('401 gelince bir kez token yeniler ve isteği yeni token ile tekrarlar', async () => {
    await signIn()
    const fetchMock = mockApi(({ path, headers }) => {
      if (path === '/auth/refresh') return json(200, { data: { accessToken: 'yeni-token' } })
      return headers.Authorization === 'Bearer yeni-token'
        ? json(200, { data: ['tamam'] })
        : json(401, { message: 'Token süresi doldu.' })
    })

    const body = await apiFetch('/users')

    expect(body.data).toEqual(['tamam'])
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/users', '/api/auth/refresh', '/api/users'])
    expect(getAccessToken()).toBe('yeni-token')
    await logout()
  })

  it('aynı anda gelen 401lerde refresh isteği yalnızca bir kez gönderilir (tek kullanımlık refresh token)', async () => {
    await signIn()
    let refreshCount = 0
    mockApi(async ({ path, headers }) => {
      if (path === '/auth/refresh') {
        refreshCount += 1
        await new Promise((resolve) => setTimeout(resolve, 10))
        return json(200, { data: { accessToken: 'yeni-token' } })
      }
      return headers.Authorization === 'Bearer yeni-token' ? json(200, { data: path }) : json(401, {})
    })

    const results = await Promise.all([apiFetch('/users'), apiFetch('/departments')])

    expect(results.map((body) => body.data)).toEqual(['/users', '/departments'])
    expect(refreshCount).toBe(1)
    await logout()
  })

  it('yenileme de başarısızsa oturum kapanır ve 401 hatası fırlatılır', async () => {
    await signIn()
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)
    mockApi(() => json(401, { message: 'Geçersiz oturum.' }))

    await expect(apiFetch('/users')).rejects.toMatchObject({ status: 401 })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
    unsubscribe()
  })

  it('403 (yetkisiz rol) hatasını sunucu mesajıyla iletir, oturumu kapatmaz', async () => {
    await signIn()
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)
    mockApi(() => json(403, { message: 'Bu işlem için yetkiniz yok.' }))

    const error = await apiFetch('/users').catch((err) => err)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(403)
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
    await logout()
  })
})
