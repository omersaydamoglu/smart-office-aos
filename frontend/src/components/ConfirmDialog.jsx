// Onay penceresi: "Pasife al" gibi geri alınması dikkat isteyen işlemler için.
// onConfirm bir Promise dönebilir; bu sırada butonlar kilitlenir, hata olursa pencerede gösterilir.

import { useState } from 'react'
import Modal from './Modal'
import FormAlert from './FormAlert'

export default function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  tone = 'danger',
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (err) {
      setError(err.message || 'İşlem tamamlanamadı.')
      setBusy(false)
    }
  }

  return (
    <Modal
      title={title}
      size="small"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'İşleniyor…' : confirmLabel}
          </button>
        </>
      }
    >
      <FormAlert message={error} />
      <div className="confirm-text">{children}</div>
    </Modal>
  )
}
