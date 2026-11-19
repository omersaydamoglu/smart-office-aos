import { useCallback, useEffect, useRef, useState } from 'react'

// API'den veri yükleyen ortak hook.
//   const { data, error, isLoading, reload } = useApiResource((signal) => listUsers(query, { signal }), key)
// - `key` değişince (ör. arama/sayfa) yeniden yükler; eski istek iptal edilir.
// - Yeniden yüklenirken önceki veri ekranda kalır (tablo zıplamaz); ilk yüklemede data null'dır.
export function useApiResource(loader, key = '') {
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  })

  const [reloadCount, setReloadCount] = useState(0)
  const [result, setResult] = useState({ requestKey: null, data: null, error: null })
  const requestKey = `${key}#${reloadCount}`

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve()
      .then(() => loaderRef.current(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted) setResult({ requestKey, data, error: null })
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === 'AbortError') return
        setResult((previous) => ({ requestKey, data: previous.data, error }))
      })
    return () => controller.abort()
  }, [requestKey])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])
  const isLoading = result.requestKey !== requestKey

  return {
    data: result.data,
    error: isLoading ? null : result.error,
    isLoading,
    reload,
  }
}
