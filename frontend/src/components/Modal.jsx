// Ortak pencere (modal). Tarayıcının yerleşik <dialog> öğesini kullanır:
// odak pencere içinde kalır, Esc ile kapanır, arka plan tıklanamaz.
// Kullanım: koşullu render edin — {open && <Modal title="…" onClose={…}>…</Modal>}

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import './Modal.css'

export default function Modal({ title, description, onClose, children, footer, size = 'medium', busy = false }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '') // eski tarayıcı / test ortamı
  }, [])

  // Esc: kaydetme sürerken kapatma; değilse üst bileşene bildir.
  function handleCancel(event) {
    event.preventDefault()
    if (!busy) onClose()
  }

  // Pencerenin dışına (karartılmış alana) tıklayınca kapat.
  function handleClick(event) {
    if (event.target === dialogRef.current && !busy) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="modal__content">
        <header className="modal__header">
          <div>
            <h2 id={titleId} className="modal__title">{title}</h2>
            {description && <p id={descriptionId} className="modal__description">{description}</p>}
          </div>
          <button type="button" className="icon-button" aria-label="Kapat" onClick={onClose} disabled={busy}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </dialog>
  )
}
