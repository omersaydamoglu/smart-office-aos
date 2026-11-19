// Ekranın altında birkaç saniye görünen kısa bildirimler (toast).

import { useCallback, useMemo, useRef, useState } from 'react'
import { CircleCheck, CircleAlert, X } from 'lucide-react'
import { ToastContext } from './ToastContext'

const DURATION_MS = 4000

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message, tone) => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-2), { id, message, tone }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'danger'),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CircleCheck : CircleAlert
          return (
            <div key={toast.id} className={`toast toast--${toast.tone}`}>
              <Icon size={18} aria-hidden="true" />
              <p>{toast.message}</p>
              <button type="button" className="toast__close" aria-label="Bildirimi kapat" onClick={() => dismiss(toast.id)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
