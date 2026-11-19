// Yeni departman / departman adını düzenleme formu.
import { useState } from 'react'
import Modal from '../../components/Modal'
import FormAlert from '../../components/FormAlert'
import { createDepartment, updateDepartment } from '../../api/departments'

export default function DepartmentFormModal({ department, onClose, onSaved }) {
  const isNew = !department
  const [name, setName] = useState(department?.name ?? '')
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    setFormError('')

    const trimmed = name.trim()
    if (!trimmed) return setNameError('Departman adı zorunludur.')
    if (trimmed.length > 100) return setNameError('Departman adı en fazla 100 karakter olabilir.')
    if (!isNew && trimmed === department.name) return onClose()

    setBusy(true)
    try {
      const body = isNew
        ? await createDepartment({ name: trimmed })
        : await updateDepartment(department.id, { name: trimmed })
      onSaved(body.data, isNew)
    } catch (error) {
      if (error.status === 409) setNameError(error.message)
      else setFormError(error.message || 'Kaydedilemedi. Lütfen tekrar deneyin.')
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isNew ? 'Yeni departman' : 'Departmanı düzenle'}
      size="small"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
          <button type="submit" form="department-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Kaydediliyor…' : isNew ? 'Departmanı oluştur' : 'Kaydet'}
          </button>
        </>
      }
    >
      <FormAlert message={formError} />
      <form id="department-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="department-name">
            Departman adı <span className="required" aria-hidden="true">*</span>
          </label>
          <input
            id="department-name"
            type="text"
            autoComplete="off"
            maxLength={100}
            placeholder="Örn. Yazılım"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setNameError('')
            }}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? 'department-name-error' : undefined}
            disabled={busy}
          />
          {nameError && <p id="department-name-error" className="field-error">{nameError}</p>}
          {isNew && !nameError && <p className="form-hint">Yöneticiyi, departmana üye ekledikten sonra atayabilirsiniz.</p>}
        </div>
      </form>
    </Modal>
  )
}
