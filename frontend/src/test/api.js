// Testlerde backend'i taklit etmek için yardımcılar.
// mockApi(handler): global fetch'i, isteğe göre yanıt üreten sahte bir fonksiyonla değiştirir.
//   handler({ method, path, body, headers }) -> Response | undefined (undefined: 404)

import { vi } from 'vitest'

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

export function mockApi(handler) {
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = String(url).replace(/^\/api/, '')
    const request = {
      method: (init.method || 'GET').toUpperCase(),
      path,
      body: init.body ? JSON.parse(init.body) : undefined,
      headers: init.headers || {},
    }
    const response = await handler(request)
    if (response instanceof Error) throw response
    return response ?? json(404, { message: `Taklit edilmeyen istek: ${request.method} ${path}` })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Seed kullanıcılarıyla aynı örnek kullanıcılar
export const USERS = {
  ADMIN: { id: 'u-admin', email: 'admin@smartoffice.test', firstName: 'Sistem', lastName: 'Yöneticisi', roles: ['ADMIN'] },
  RECEPTION: { id: 'u-reception', email: 'resepsiyon@smartoffice.test', firstName: 'Resepsiyon', lastName: 'Görevlisi', roles: ['RECEPTION'] },
  DEPT_MANAGER: { id: 'u-manager', email: 'yonetici@smartoffice.test', firstName: 'Departman', lastName: 'Yöneticisi', roles: ['DEPT_MANAGER'] },
  EMPLOYEE: { id: 'u-employee', email: 'calisan@smartoffice.test', firstName: 'Örnek', lastName: 'Çalışan', roles: ['EMPLOYEE'] },
}

// Sayfa açılışında oturum geri yükleme isteklerine yanıt verir:
// user verilirse oturum açık (refresh + /users/me), null ise oturum yok.
export function sessionResponse(request, user) {
  if (request.method === 'POST' && request.path === '/auth/refresh') {
    return user ? json(200, { data: { accessToken: 'access-1' } }) : json(401, { message: 'Geçersiz oturum.' })
  }
  if (request.method === 'GET' && request.path === '/users/me') {
    return user ? json(200, { data: user }) : json(401, { message: 'Yetkisiz.' })
  }
  if (request.method === 'POST' && request.path === '/auth/logout') {
    return json(200, { message: 'ok' })
  }
  return undefined
}
