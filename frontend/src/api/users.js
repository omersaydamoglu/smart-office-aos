// Kullanıcı yönetimi API'si (yalnızca ADMIN). Backend: backend/src/routes/userRoutes.js
// Tüm fonksiyonlar backend yanıtını olduğu gibi döner: { data } veya { data, pagination }.

import { apiFetch, toQuery } from './client'
import { USE_MOCK } from './config'

// Mock dosyası yalnızca mock modda yüklenir; gerçek uygulama paketine girmez.
const mock = () => import('./mockAdmin')

export async function listUsers(params = {}, { signal } = {}) {
  if (USE_MOCK) return (await mock()).listUsers(params)
  return apiFetch(`/users${toQuery(params)}`, { signal })
}

// API'de departman filtresi olmadığı için departman üyeleri tüm liste süzülerek bulunur.
// Sayfa sayfa (100'er) getirir; güvenlik için en fazla 20 sayfa.
export async function listAllUsers(params = {}, options = {}) {
  const all = []
  for (let page = 1; page <= 20; page += 1) {
    const body = await listUsers({ ...params, page, limit: 100 }, options)
    all.push(...body.data)
    if (page >= body.pagination.totalPages) break
  }
  return all
}

export async function createUser(input) {
  if (USE_MOCK) return (await mock()).createUser(input)
  return apiFetch('/users', { method: 'POST', body: input })
}

// Yalnızca e-posta, ad, soyad, telefon, departman değişir (rol/durum ayrı uç noktalarda).
export async function updateUser(id, changes) {
  if (USE_MOCK) return (await mock()).updateUser(id, changes)
  return apiFetch(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes })
}

export async function setUserStatus(id, status) {
  if (USE_MOCK) return (await mock()).setUserStatus(id, status)
  return apiFetch(`/users/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } })
}

export async function setUserRoles(id, roles) {
  if (USE_MOCK) return (await mock()).setUserRoles(id, roles)
  return apiFetch(`/users/${encodeURIComponent(id)}/roles`, { method: 'PUT', body: { roles } })
}
