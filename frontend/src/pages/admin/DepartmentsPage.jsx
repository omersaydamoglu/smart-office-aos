// Admin › Departmanlar (issue #42) — docs/ui/ekran-icerik-listesi.md 3.2 (c)
// Liste (ad, yönetici, üye sayısı, durum) + arama + durum filtresi + sayfalama,
// yeni/düzenle formu, yönetici atama ve üyeler listesi, pasife al / aktifleştir.

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import { ActiveBadge } from '../../components/StatusBadge'
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '../../components/PageStates'
import { useToast } from '../../components/ToastContext'
import { listDepartments, updateDepartment } from '../../api/departments'
import { useApiResource } from '../../hooks/useApiResource'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import DepartmentFormModal from './DepartmentFormModal'
import DepartmentMembersModal from './DepartmentMembersModal'

const STATUS_FILTERS = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Pasif' },
]

export default function DepartmentsPage() {
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  // Açık pencere: { type: 'create' | 'edit' | 'members' | 'status', department }
  const [dialog, setDialog] = useState(null)

  const debouncedSearch = useDebouncedValue(search.trim())
  const query = { page, limit, search: debouncedSearch || undefined, isActive: isActive || undefined }
  const { data, error, isLoading, reload } = useApiResource(
    (signal) => listDepartments(query, { signal }),
    JSON.stringify(query),
  )

  const hasFilters = Boolean(debouncedSearch || isActive)
  const departments = data?.data ?? []
  const closeDialog = () => setDialog(null)

  function clearFilters() {
    setSearch('')
    setIsActive('')
    setPage(1)
  }

  function handleSaved(message) {
    toast.success(message)
    closeDialog()
    reload()
  }

  async function confirmStatusChange() {
    const target = dialog.department
    await updateDepartment(target.id, { isActive: !target.isActive })
    handleSaved(target.isActive ? `${target.name} pasife alındı.` : `${target.name} yeniden aktifleştirildi.`)
  }

  function renderContent() {
    if (error?.status === 403) return <ForbiddenState />
    if (error) return <ErrorState message={error.message} onRetry={reload} />
    if (!data) return <div className="card__body"><LoadingState rows={5} label="Departmanlar yükleniyor…" /></div>

    if (departments.length === 0) {
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
          title="Eşleşen departman bulunamadı"
          description="Arama ya da filtreleri değiştirip tekrar deneyin."
          action={<button type="button" className="btn btn-secondary" onClick={clearFilters}>Filtreleri temizle</button>}
        />
      ) : (
        <EmptyState
          title="Henüz departman yok"
          description="İlk departmanı ekleyerek başlayın."
          action={<button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'create' })}>Yeni departman</button>}
        />
      )
    }

    return (
      <>
        <div className="table-wrap">
          <table className={`data-table ${isLoading ? 'is-refreshing' : ''}`} aria-busy={isLoading}>
            <thead>
              <tr>
                <th scope="col">Departman</th>
                <th scope="col">Yönetici</th>
                <th scope="col">Aktif üye</th>
                <th scope="col">Durum</th>
                <th scope="col"><span className="visually-hidden">Eylemler</span></th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td className="cell-strong">{department.name}</td>
                  <td>
                    {department.manager ? (
                      <>
                        {department.manager.firstName} {department.manager.lastName}
                        <span className="cell-muted"> · {department.manager.email}</span>
                      </>
                    ) : (
                      <span className="cell-muted">Atanmadı</span>
                    )}
                  </td>
                  <td>{department.memberCount}</td>
                  <td>
                    <ActiveBadge isActive={department.isActive} />
                  </td>
                  <td className="cell-actions">
                    <button type="button" className="btn btn-text" onClick={() => setDialog({ type: 'edit', department })}>
                      Düzenle
                    </button>
                    <button type="button" className="btn btn-text" onClick={() => setDialog({ type: 'members', department })}>
                      Yönetici ve üyeler
                    </button>
                    {department.isActive ? (
                      <button type="button" className="btn btn-text btn-text--danger" onClick={() => setDialog({ type: 'status', department })}>
                        Pasife al
                      </button>
                    ) : (
                      <button type="button" className="btn btn-text btn-text--primary" onClick={() => setDialog({ type: 'status', department })}>
                        Aktifleştir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
        title="Departmanlar"
        description="Departmanları, yöneticilerini ve üyelerini yönetin."
        actions={
          <button type="button" className="btn btn-primary btn-with-icon" onClick={() => setDialog({ type: 'create' })}>
            <Plus size={18} aria-hidden="true" />
            Yeni departman
          </button>
        }
      />

      <section className="card" aria-label="Departman listesi">
        <div className="toolbar" role="search">
          <label className="toolbar__search">
            <span className="visually-hidden">Departman ara</span>
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Departman adı ara"
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
              value={isActive}
              onChange={(event) => {
                setIsActive(event.target.value)
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
        <DepartmentFormModal
          department={dialog.type === 'edit' ? dialog.department : null}
          onClose={closeDialog}
          onSaved={(saved, isNew) => handleSaved(isNew ? `${saved.name} oluşturuldu.` : `${saved.name} güncellendi.`)}
        />
      )}

      {dialog?.type === 'members' && (
        <DepartmentMembersModal
          department={dialog.department}
          onClose={closeDialog}
          onSaved={(saved) =>
            handleSaved(
              saved.manager
                ? `${saved.manager.firstName} ${saved.manager.lastName}, ${saved.name} yöneticisi olarak atandı.`
                : `${saved.name} için yönetici kaldırıldı.`,
            )
          }
        />
      )}

      {dialog?.type === 'status' && (
        <ConfirmDialog
          title={dialog.department.isActive ? 'Departmanı pasife al' : 'Departmanı aktifleştir'}
          confirmLabel={dialog.department.isActive ? 'Pasife al' : 'Aktifleştir'}
          tone={dialog.department.isActive ? 'danger' : 'primary'}
          onConfirm={confirmStatusChange}
          onClose={closeDialog}
        >
          {dialog.department.isActive ? (
            <>
              <p><strong>{dialog.department.name}</strong> pasife alınacak.</p>
              <p>Pasif departmanlar seçim listelerinde görünmez. Mevcut üyelerin kayıtları değişmez; daha sonra yeniden aktifleştirebilirsiniz.</p>
            </>
          ) : (
            <p><strong>{dialog.department.name}</strong> yeniden aktifleştirilecek ve seçim listelerinde görünecek.</p>
          )}
        </ConfirmDialog>
      )}
    </>
  )
}
