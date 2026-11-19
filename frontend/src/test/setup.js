// Her test dosyasından önce çalışır.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom'da olmayan tarayıcı özelliği: ekran genişliği sorgusu (masaüstü kabul edilir).
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})
