// Admin › Kullanıcılar (issue #42) — docs/ui/ekran-icerik-listesi.md 3.2 (b)
// Tablo (ad, e-posta, departman, roller, durum) + arama + durum filtresi + sayfalama,
// Yeni kullanıcı, satırda: düzenle, rolleri düzenle, pasife al / aktifleştir.
//
// Not: API'de departmana göre filtre henüz yok (GET /users yalnızca search ve status alıyor).

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { RoleBadges, UserStatusBadge } from '../../components/StatusBadge'
import PersonCell from '../../components/PersonCell'
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/PageStates'
import { useToast } from '../../components/ToastContext'
import { useAuth } from '../../auth/AuthContext'
import { listUsers, setUserStatus } from '../../api/users'
import { useApiResource } from '../../hooks/useApiResource'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import UserFormModal from './UserFormModal'
import UserRolesModal from './UserRolesModal'

const STATUS_FILTERS = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'INACTIVE', label: 'Pasif' },
]

function fullName(user) {
  return `${user.firstName} ${user.lastName}`
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  // Açık pencere: { type: 'create' | 'edit' | 'roles' | 'status', user }
  const [dialog, setDialog] = useState(null)

  const debouncedSearch = useDebouncedValue(search.trim())
  const query = { page, limit, search: debouncedSearch || undefined, status: status || undefined }
  const { data, error, isLoading, reload } = useApiResource(
    (signal) => listUsers(query, { signal }),
    JSON.stringify(query),
  )

  const hasFilters = Boolean(debouncedSearch || status)
  const users = data?.data ?? []
  const closeDialog = () => setDialog(null)

  function clearFilters() {
    setSearch('')
    setStatus('')
    setPage(1)
  }

  function handleSaved(message) {
    toast.success(message)
    closeDialog()
    reload()
  }

  async function confirmStatusChange() {
    const target = dialog.user
    const nextStatus = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await setUserStatus(target.id, nextStatus)
    handleSaved(
      nextStatus === 'INACTIVE'
        ? `${fullName(target)} pasife alındı.`
        : `${fullName(target)} yeniden aktifleştirildi.`,
    )
  }

  function renderContent() {
    if (error?.status === 403) return <ForbiddenState />
    if (error) {
      return <ErrorState message={error.message} onRetry={reload} />
    }
    if (!data) return <div className="card__body"><LoadingState rows={6} label="Kullanıcılar yükleniyor…" /></div>

    if (users.length === 0) {
      if (page > 1) {
        return (
          <EmptyState
            title="Bu sayfada kayıt kalmadı"
            action={<button type="button" className="btn btn-secondary" onClick={() => setPage(1)}>İlk sayfaya dön</button>}
          />
        )
      }
      return hasFilters ? (
        <EmptyState
          title="Eşleşen kullanıcı bulunamadı"
          description="Arama ya da filtreleri değiştirip tekrar deneyin."
          action={<button type="button" className="btn btn-secondary" onClick={clearFilters}>Filtreleri temizle</button>}
        />
      ) : (
        <EmptyState
          title="Henüz kullanıcı yok"
          description="İlk kullanıcıyı ekleyerek başlayın."
          action={<button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'create' })}>Yeni kullanıcı</button>}
        />
      )
    }

    return (
      <>
        <div className="table-wrap">
          <table className={`data-table ${isLoading ? 'is-refreshing' : ''}`} aria-busy={isLoading}>
            <thead>
              <tr>
                <th scope="col">Ad soyad</th>
                <th scope="col">E-posta</th>
                <th scope="col">Departman</th>
                <th scope="col">Roller</th>
                <th scope="col">Durum</th>
                <th scope="col"><span className="visually-hidden">Eylemler</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUser?.id
                return (
                  <tr key={user.id}>
                    <td>
                      <PersonCell
                        user={user}
                        highlight={isSelf}
                        inactive={user.status !== 'ACTIVE'}
                        suffix={isSelf && <span className="cell-muted"> (siz)</span>}
                      />
                    </td>
                    <td className="cell-secondary">{user.email}</td>
                    <td>{user.department?.name ?? <span className="cell-muted">—</span>}</td>
                    <td><RoleBadges roles={user.roles} /></td>
                    <td><UserStatusBadge status={user.status} /></td>
                    <td className="cell-actions">
                      <button type="button" className="btn btn-text" onClick={() => setDialog({ type: 'edit', user })}>
                        Düzenle
                      </button>
                      <button type="button" className="btn btn-text" onClick={() => setDialog({ type: 'roles', user })}>
                        Roller
                      </button>
                      {user.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          className="btn btn-text btn-text--danger"
                          onClick={() => setDialog({ type: 'status', user })}
                          disabled={isSelf}
                          title={isSelf ? 'Kendi hesabınızı pasife alamazsınız.' : undefined}
                        >
                          Pasife al
                        </button>
                      ) : (
                        <button type="button" className="btn btn-text btn-text--primary" onClick={() => setDialog({ type: 'status', user })}>
                          Aktifleştir
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          pagination={data.pagination}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value)
            setPage(1)
          }}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Kullanıcılar"
        description="Kullanıcı hesaplarını, rollerini ve durumlarını yönetin."
        actions={
          <button type="button" className="btn btn-primary btn-with-icon" onClick={() => setDialog({ type: 'create' })}>
            <Plus size={18} aria-hidden="true" />
            Yeni kullanıcı
          </button>
        }
      />

      <section className="card" aria-label="Kullanıcı listesi">
        <div className="toolbar" role="search">
          <label className="toolbar__search">
            <span className="visually-hidden">Kullanıcı ara</span>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Ad, soyad veya e-posta ara"
              maxLength={100}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label>
            <span className="visually-hidden">Durum</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {renderContent()}
      </section>

      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <UserFormModal
          user={dialog.type === 'edit' ? dialog.user : null}
          onClose={closeDialog}
          onSaved={(saved, isNew) =>
            handleSaved(isNew ? `${fullName(saved)} oluşturuldu.` : `${fullName(saved)} güncellendi.`)
          }
        />
      )}

      {dialog?.type === 'roles' && (
        <UserRolesModal
          user={dialog.user}
          currentUserId={currentUser?.id}
          onClose={closeDialog}
          onSaved={(saved) => handleSaved(`${fullName(saved)} kullanıcısının rolleri güncellendi.`)}
        />
      )}

      {dialog?.type === 'status' && (
        <ConfirmDialog
          title={dialog.user.status === 'ACTIVE' ? 'Kullanıcıyı pasife al' : 'Kullanıcıyı aktifleştir'}
          confirmLabel={dialog.user.status === 'ACTIVE' ? 'Pasife al' : 'Aktifleştir'}
          tone={dialog.user.status === 'ACTIVE' ? 'danger' : 'primary'}
          onConfirm={confirmStatusChange}
          onClose={closeDialog}
        >
          {dialog.user.status === 'ACTIVE' ? (
            <>
              <p><strong>{fullName(dialog.user)}</strong> pasife alınacak.</p>
              <p>Kullanıcı sisteme giriş yapamayacak ve açık oturumları hemen kapatılacak. Kayıtları silinmez; daha sonra yeniden aktifleştirebilirsiniz.</p>
            </>
          ) : (
            <p><strong>{fullName(dialog.user)}</strong> yeniden aktifleştirilecek ve sisteme giriş yapabilecek.</p>
          )}
        </ConfirmDialog>
      )}
    </>
  )
}
