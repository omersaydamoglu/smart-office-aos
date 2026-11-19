// Korumalı API uç noktaları için ortak istemci.
// - Access token'ı Authorization başlığına ekler.
// - 401 gelirse bir kez token yeniler ve isteği tekrarlar; yine olmazsa oturumu kapatır.
// - Hataları ApiError olarak fırlatır; ekranlar status'a göre (403, 404, 0 = ağ) durum gösterir.

import { getAccessToken, refreshAccessToken, notifySessionExpired } from './auth'
import { API_BASE } from './config'

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const DEFAULT_MESSAGES = {
  0: 'Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip tekrar deneyin.',
  401: 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.',
  403: 'Bu işlem için yetkiniz bulunmuyor.',
  404: 'Aradığınız kayıt bulunamadı.',
  429: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyip tekrar deneyin.',
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function send(path, { method, body, signal }) {
  const token = getAccessToken()
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    return await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError(DEFAULT_MESSAGES[0], { status: 0 })
  }
}

export async function apiFetch(path, { method = 'GET', body, signal } = {}) {
  let response = await send(path, { method, body, signal })

  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      notifySessionExpired()
      throw new ApiError(DEFAULT_MESSAGES[401], { status: 401 })
    }
    response = await send(path, { method, body, signal })
  }

  const data = await readJson(response)

  if (!response.ok) {
    if (response.status === 401) notifySessionExpired()
    const fallback = DEFAULT_MESSAGES[response.status] ||
      'Beklenmeyen bir hata oluştu. Lütfen biraz sonra tekrar deneyin.'
    throw new ApiError(data?.message || fallback, {
      status: response.status,
      details: data?.errors ?? data?.details,
    })
  }

  return data
}

// { page: 2, search: '' } -> "?page=2" (boş değerler atlanır)
export function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  const text = query.toString()
  return text ? `?${text}` : ''
}
