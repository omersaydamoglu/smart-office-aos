// Rolleri düzenle penceresi.
// - Kendi ADMIN rolünü kaldırmaya çalışan yöneticiye uyarı gösterilir ve kaydet kilitlenir
//   (backend de reddeder: "Kendi ADMIN rolünüzü kaldıramazsınız.").
// - Başka bir yöneticinin ADMIN rolü kaldırılırken bilgilendirme gösterilir;
//   son aktif ADMIN ise backend 409 döner ve mesaj pencerede görünür.

import { useState } from 'react'
import Modal from '../../components/Modal'
import FormAlert from '../../components/FormAlert'
import { setUserRoles } from '../../api/users'
import RoleCheckboxes from './RoleCheckboxes'

function sameRoles(a, b) {
  return a.length === b.length && a.every((role) => b.includes(role))
}

export default function UserRolesModal({ user, currentUserId, onClose, onSaved }) {
  const [roles, setRoles] = useState(user.roles)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const isSelf = user.id === currentUserId
  const removesAdmin = user.roles.includes('ADMIN') && !roles.includes('ADMIN')
  const removesOwnAdmin = isSelf && removesAdmin
  const unchanged = sameRoles(roles, user.roles)
  const canSave = !busy && !unchanged && roles.length > 0 && !removesOwnAdmin

  async function handleSave() {
    if (!canSave) return
    setBusy(true)
    setFormError('')
    try {
      const body = await setUserRoles(user.id, roles)
      onSaved(body.data)
    } catch (error) {
      setFormError(error.message || 'Roller kaydedilemedi.')
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Rolleri düzenle"
      description={`${user.firstName} ${user.lastName} · ${user.email}`}
      size="small"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
            {busy ? 'Kaydediliyor…' : 'Rolleri kaydet'}
          </button>
        </>
      }
    >
      <FormAlert message={formError} />

      {removesOwnAdmin && (
        <FormAlert tone="warning">
          <p><strong>Kendi yönetici (ADMIN) rolünüzü kaldıramazsınız.</strong></p>
          <p>Bu değişiklik yönetim ekranlarına erişiminizi keser. Gerekirse başka bir yönetici bu işlemi yapmalıdır.</p>
        </FormAlert>
      )}

      {removesAdmin && !isSelf && (
        <FormAlert tone="warning">
          <p>Bu kullanıcı yönetim ekranlarına erişimini kaybedecek. Sistemdeki son aktif yönetici ise işlem reddedilir.</p>
        </FormAlert>
      )}

      <RoleCheckboxes
        value={roles}
        onChange={setRoles}
        error={roles.length === 0 ? 'En az bir rol seçin.' : undefined}
        disabled={busy}
      />
    </Modal>
  )
}
