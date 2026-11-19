import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

// const toast = useToast(); toast.success('Kaydedildi'); toast.error('Olmadı')
export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast, ToastProvider içinde kullanılmalıdır.')
  return value
}
