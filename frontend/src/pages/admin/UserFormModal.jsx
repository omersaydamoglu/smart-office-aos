// Yeni kullanıcı / kullanıcı düzenleme formu.
// Yeni kullanıcıda roller ve geçici parola da sorulur; düzenlemede roller ayrı pencereden
// (UserRolesModal) değiştirilir, çünkü API'de ayrı uç noktadır (PUT /users/:id/roles).

import { useState } from 'react'
import Modal from '../../components/Modal'
import FormAlert from '../../components/FormAlert'
import { createUser, updateUser } from '../../api/users'
import { listDepartments } from '../../api/departments'
import { useApiResource } from '../../hooks/useApiResource'
import RoleCheckboxes from './RoleCheckboxes'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function initialValues(user) {
  return {
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    departmentId: user?.department?.id ?? '',
    roles: ['EMPLOYEE'],
    password: '',
  }
}

// Kurallar backend ile aynı (userRoutes.js içindeki zod şemaları).
function validate(values, isNew) {
  const errors = {}
  if (!values.email.trim()) errors.email = 'E-posta zorunludur.'
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Geçerli bir e-posta adresi girin.'
  if (!values.firstName.trim()) errors.firstName = 'Ad zorunludur.'
  else if (values.firstName.trim().length > 100) errors.firstName = 'Ad en fazla 100 karakter olabilir.'
  if (!values.lastName.trim()) errors.lastName = 'Soyad zorunludur.'
  else if (values.lastName.trim().length > 100) errors.lastName = 'Soyad en fazla 100 karakter olabilir.'
  if (values.phone.trim().length > 30) errors.phone = 'Telefon en fazla 30 karakter olabilir.'
  if (isNew) {
    if (values.roles.length === 0) errors.roles = 'En az bir rol seçin.'
    if (values.password.length < 8) errors.password = 'Geçici parola en az 8 karakter olmalıdır.'
    else if (values.password.length > 128) errors.password = 'Parola en fazla 128 karakter olabilir.'
  }
  return errors
}

function Field({ id, label, required, error, hint, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label} {required && <span className="required" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  )
}

export default function UserFormModal({ user, onClose, onSaved }) {
  const isNew = !user
  const [values, setValues] = useState(() => initialValues(user))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const departments = useApiResource(
    (signal) => listDepartments({ isActive: true, limit: 100 }, { signal }),
    'active-departments',
  )

  // Kullanıcının mevcut departmanı pasifse listede yine görünsün.
  const departmentOptions = [...(departments.data?.data ?? [])]
  if (user?.department && !departmentOptions.some((item) => item.id === user.department.id)) {
    departmentOptions.push({ ...user.department, name: `${user.department.name} (pasif)` })
  }

  function setField(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }))
    if (errors[name]) setErrors((previous) => ({ ...previous, [name]: undefined }))
  }

  function inputProps(name) {
    return {
      id: `user-${name}`,
      name,
      value: values[name],
      onChange: (event) => setField(name, event.target.value),
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': errors[name] ? `user-${name}-error` : undefined,
      disabled: busy,
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    setFormError('')
    const nextErrors = validate(values, isNew)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    const profile = {
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim() || null,
      departmentId: values.departmentId || null,
    }

    let request
    if (isNew) {
      request = () => createUser({ ...profile, roles: values.roles, password: values.password })
    } else {
      // Yalnızca değişen alanlar gönderilir; hiçbir şey değişmediyse pencere kapanır.
      const before = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? null,
        departmentId: user.department?.id ?? null,
      }
      const changes = Object.fromEntries(Object.entries(profile).filter(([key, value]) => value !== before[key]))
      if (Object.keys(changes).length === 0) {
        onClose()
        return
      }
      request = () => updateUser(user.id, changes)
    }

    setBusy(true)
    try {
      const body = await request()
      onSaved(body.data, isNew)
    } catch (error) {
      if (error.status === 409 && /e-posta/i.test(error.message)) {
        setErrors((previous) => ({ ...previous, email: error.message }))
      } else {
        setFormError(error.message || 'Kaydedilemedi. Lütfen tekrar deneyin.')
      }
      setBusy(false)
    }
  }

  return (
    <Modal
      title={isNew ? 'Yeni kullanıcı' : 'Kullanıcıyı düzenle'}
      description={isNew ? undefined : `${user.firstName} ${user.lastName}`}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Kaydediliyor…' : isNew ? 'Kullanıcıyı oluştur' : 'Kaydet'}
          </button>
        </>
      }
    >
      <FormAlert message={formError} />
      <form id="user-form" className="form-grid" onSubmit={handleSubmit} noValidate>
        <Field id="user-firstName" label="Ad" required error={errors.firstName}>
          <input type="text" autoComplete="off" maxLength={100} {...inputProps('firstName')} />
        </Field>
        <Field id="user-lastName" label="Soyad" required error={errors.lastName}>
          <input type="text" autoComplete="off" maxLength={100} {...inputProps('lastName')} />
        </Field>
        <div className="form-field--full">
          <Field id="user-email" label="E-posta" required error={errors.email}>
            <input type="email" autoComplete="off" placeholder="ornek@sirket.com" {...inputProps('email')} />
          </Field>
        </div>
        <Field id="user-phone" label="Telefon" error={errors.phone}>
          <input type="tel" autoComplete="off" maxLength={30} placeholder="0555 000 0000" {...inputProps('phone')} />
        </Field>
        <Field
          id="user-departmentId"
          label="Departman"
          error={departments.error ? 'Departmanlar yüklenemedi.' : undefined}
        >
          <select {...inputProps('departmentId')} disabled={busy || departments.isLoading}>
            <option value="">{departments.isLoading ? 'Yükleniyor…' : 'Departman yok'}</option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </select>
        </Field>

        {isNew && (
          <>
            <div className="form-field--full">
              <Field
                id="user-password"
                label="Geçici parola"
                required
                error={errors.password}
                hint="En az 8 karakter. Kullanıcıya güvenli bir kanaldan iletin."
              >
                <input type="text" autoComplete="new-password" maxLength={128} {...inputProps('password')} />
              </Field>
            </div>
            <div className="form-field--full">
              <RoleCheckboxes
                value={values.roles}
                onChange={(roles) => setField('roles', roles)}
                error={errors.roles}
                disabled={busy}
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
