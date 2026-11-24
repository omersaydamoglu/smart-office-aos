import { useEffect, useState } from 'react'

// Arama kutusu için: kullanıcı yazmayı bırakınca (varsayılan 300 ms) değeri günceller,
// böylece her tuşta API isteği atılmaz.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
