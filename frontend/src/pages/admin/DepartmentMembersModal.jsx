// Departman › Yönetici ve üyeler penceresi.
// - Yönetici atama: backend kuralı gereği aday; aktif, DEPT_MANAGER rolüne sahip ve bu departmanın üyesi olmalı.
// - Üyeler listesi: API'de departman filtresi olmadığı için tüm kullanıcılar getirilip süzülür.

import { useState } from 'react'
import Modal from '../../components/Modal'
import FormAlert from '../../components/FormAlert'
import { UserStatusBadge } from '../../components/StatusBadge'
import { ErrorState, LoadingState } from '../../components/PageStates'
import { ROLE_LABELS } from '../../auth/roles'
import { listAllUsers } from '../../api/users'
import { setDepartmentManager } from '../../api/departments'
import { useApiResource } from '../../hooks/useApiResource'

export default function DepartmentMembersModal({ department, onClose, onSaved }) {
  const [managerId, setManagerId] = useState(department.manager?.id ?? '')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const users = useApiResource((signal) => listAllUsers({}, { signal }), `members-${department.id}`)
  const members = (users.data ?? []).filter((user) => user.department?.id === department.id)
  const candidates = members.filter((user) => user.status === 'ACTIVE' && user.roles.includes('DEPT_MANAGER'))
  const unchanged = managerId === (department.manager?.id ?? '')

  async function handleSave() {
    if (busy || unchanged) return
    setBusy(true)
    setFormError('')
    try {
      const body = await setDepartmentManager(department.id, managerId || null)
      onSaved(body.data)
    } catch (error) {
      setFormError(error.message || 'Yönetici kaydedilemedi.')
      setBusy(false)
    }
  }

  function renderBody() {
    if (users.error) return <ErrorState message={users.error.message} onRetry={users.reload} />
    if (!users.data) return <LoadingState rows={4} label="Üyeler yükleniyor…" />

    return (
      <>
        <FormAlert message={formError} />

        <div className="form-field">
          <label htmlFor="department-manager">Departman yöneticisi</label>
          <select
            id="department-manager"
            value={managerId}
            onChange={(event) => setManagerId(event.target.value)}
            disabled={busy}
          >
            <option value="">Yönetici yok</option>
            {/* Mevcut yönetici artık aday değilse (ör. rolü kaldırıldı) yine de görünsün. */}
            {department.manager && !candidates.some((user) => user.id === department.manager.id) && (
              <option value={department.manager.id}>
                {department.manager.firstName} {department.manager.lastName} (şu anki yönetici)
              </option>
            )}
            {candidates.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} · {user.email}
              </option>
            ))}
          </select>
          <p className="form-hint">
            Yalnızca bu departmanın aktif ve “Departman yöneticisi” rolüne sahip üyeleri seçilebilir.
          </p>
        </div>

        {candidates.length === 0 && (
          <FormAlert tone="warning">
            <p>Bu departmanda yönetici olabilecek üye yok. Önce Kullanıcılar ekranından bir üyeye “Departman yöneticisi” rolünü verin.</p>
          </FormAlert>
        )}

        <h3 className="members-title">Üyeler ({members.length})</h3>
        {members.length === 0 ? (
          <p className="form-hint">Bu departmanda henüz üye yok. Kullanıcıları düzenlerken departman seçerek ekleyebilirsiniz.</p>
        ) : (
          <ul className="members-list">
            {members.map((user) => (
              <li key={user.id}>
                <div>
                  <p className="members-list__name">
                    {user.firstName} {user.lastName}
                    {user.id === department.manager?.id && <span className="badge badge--info">Yönetici</span>}
                  </p>
                  <p className="members-list__meta">
                    {user.email} · {user.roles.map((role) => ROLE_LABELS[role] || role).join(', ')}
                  </p>
                </div>
                <UserStatusBadge status={user.status} />
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }

  return (
    <Modal
      title="Yönetici ve üyeler"
      description={department.name}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Kapat
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy || unchanged || !users.data}>
            {busy ? 'Kaydediliyor…' : 'Yöneticiyi kaydet'}
          </button>
        </>
      }
    >
      {renderBody()}
    </Modal>
  )
}
