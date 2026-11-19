// Departman API'si. Backend: backend/src/routes/departmentRoutes.js
// Liste herkese açık (ADMIN dışındakiler yalnızca aktif departmanların id/ad bilgisini görür);
// oluşturma, güncelleme ve yönetici atama yalnızca ADMIN.

import { apiFetch, toQuery } from './client'
import { USE_MOCK } from './config'

const mock = () => import('./mockAdmin')

export async function listDepartments(params = {}, { signal } = {}) {
  if (USE_MOCK) return (await mock()).listDepartments(params)
  return apiFetch(`/departments${toQuery(params)}`, { signal })
}

export async function createDepartment({ name }) {
  if (USE_MOCK) return (await mock()).createDepartment({ name })
  return apiFetch('/departments', { method: 'POST', body: { name } })
}

// changes: { name } ve/veya { isActive }
export async function updateDepartment(id, changes) {
  if (USE_MOCK) return (await mock()).updateDepartment(id, changes)
  return apiFetch(`/departments/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes })
}

// managerId: kullanıcı id'si veya null (yöneticiyi kaldırır)
export async function setDepartmentManager(id, managerId) {
  if (USE_MOCK) return (await mock()).setDepartmentManager(id, managerId)
  return apiFetch(`/departments/${encodeURIComponent(id)}/manager`, { method: 'PUT', body: { managerId } })
}
