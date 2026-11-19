// #40 / #43 — Giriş ekranı: doğrulama, hata, kilit süresi ve role göre yönlendirme
import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { json, mockApi, sessionResponse, USERS } from '../test/api'
import { renderApp } from '../test/render'

function loginApi(loginResponse, extra = () => undefined) {
  return mockApi((request) => {
    if (request.method === 'POST' && request.path === '/auth/login') return loginResponse(request)
    return extra(request) ?? sessionResponse(request, null)
  })
}

async function fillAndSubmit(user, email = 'admin@smartoffice.test', password = 'Admin123!dev') {
  await user.type(await screen.findByLabelText(/E-posta/), email)
  await user.type(screen.getByLabelText(/^Şifre/, { selector: 'input' }), password)
  await user.click(screen.getByRole('button', { name: /Giriş yap/ }))
}

describe('Giriş ekranı', () => {
  it('boş gönderimde alan hatalarını gösterir ve istek atmaz', async () => {
    const fetchMock = loginApi(() => json(500, {}))
    const { user } = renderApp('/login')

    await user.click(await screen.findByRole('button', { name: /Giriş yap/ }))

    expect(screen.getByText('E-posta adresi zorunludur.')).toBeInTheDocument()
    expect(screen.getByText('Şifre zorunludur.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(false)
  })

  it('yanlış şifrede hata kutusunu gösterir ve şifre alanını temizler', async () => {
    loginApi(() => json(401, { message: 'E-posta veya şifre hatalı.' }))
    const { user } = renderApp('/login')

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('E-posta veya şifre hatalı.')
    expect(screen.getByLabelText(/^Şifre/, { selector: 'input' })).toHaveValue('')
  })

  it('çok fazla denemede kalan süreyi gösterir ve butonu kilitler', async () => {
    loginApi(() => json(429, { message: 'Çok fazla giriş denemesi yaptınız. 15 dakika sonra tekrar deneyin.' }, { 'Retry-After': '90' }))
    const { user } = renderApp('/login')

    await fillAndSubmit(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Giriş geçici olarak engellendi')
    expect(alert).toHaveTextContent(/01:(30|29)/)
    expect(screen.getByRole('button', { name: /Giriş yap/ })).toBeDisabled()
  })

  it('ağ hatasında anlaşılır mesaj gösterir', async () => {
    loginApi(() => new TypeError('Failed to fetch'))
    const { user } = renderApp('/login')

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Sunucuya ulaşılamıyor')
  })

  it.each([
    ['ADMIN', '/admin', 'Genel bakış'],
    ['RECEPTION', '/reception', 'Bugünkü ziyaretler'],
    ['DEPT_MANAGER', '/portal', 'Ana sayfa'],
    ['EMPLOYEE', '/portal', 'Ana sayfa'],
  ])('%s girişinde %s sayfasına yönlendirir', async (role, path, heading) => {
    loginApi(() => json(200, { data: { accessToken: 'access-1', user: USERS[role] } }))
    const { user } = renderApp('/login')

    await fillAndSubmit(user, USERS[role].email)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(window.location.pathname).toBe(path)
  })

  it('oturum yokken açılmak istenen sayfaya girişten sonra geri döner', async () => {
    loginApi(
      () => json(200, { data: { accessToken: 'access-1', user: USERS.ADMIN } }),
      (request) => (request.path.startsWith('/users?')
        ? json(200, { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
        : undefined),
    )
    const { user } = renderApp('/admin/users')

    await fillAndSubmit(user)

    expect(await screen.findByRole('heading', { level: 1, name: 'Kullanıcılar' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.pathname).toBe('/admin/users'))
  })
})
