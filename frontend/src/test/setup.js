// Her test dosyasından önce çalışır.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Node 25 ve sonrası kendi localStorage/sessionStorage nesnelerini global olarak tanımlıyor;
// bunlar jsdom'unkilerin önüne geçiyor ve --localstorage-file verilmezse kullanılamıyor.
// Testlerde her Node sürümünde jsdom'un tarayıcı depolarını kullan.
for (const name of ['localStorage', 'sessionStorage']) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: globalThis.jsdom.window[name],
  })
}

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
