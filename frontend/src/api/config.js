// API ayarları tek yerde.
// Mock modu: backend çalışmıyorsa frontend/.env.local dosyasına VITE_USE_MOCK=true yazın.
export const API_BASE = '/api'
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
