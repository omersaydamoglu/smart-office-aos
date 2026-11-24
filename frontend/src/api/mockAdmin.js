// Mock (sahte) kullanıcı ve departman API'si — yalnızca VITE_USE_MOCK=true iken yüklenir.
// Yanıt biçimleri ve kurallar backend ile aynıdır:
//   backend/src/services/userService.js, backend/src/services/departmentService.js
// Veriler bellekte tutulur; sayfa yenilenince başa döner.

import { ApiError } from './client'
import { getMockSessionUser } from './auth'

const ADMIN = 'ADMIN'
const MANAGER = 'DEPT_MANAGER'

function wait(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fail(status, message) {
  throw new ApiError(message, { status })
}

let idCounter = 0
function newId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

const now = () => new Date().toISOString()

// --- Başlangıç verisi -------------------------------------------------------

const departments = [
  { id: 'dep-yazilim', name: 'Yazılım', isActive: true, managerId: 'mock-manager' },
  { id: 'dep-ik', name: 'İnsan Kaynakları', isActive: true, managerId: null },
  { id: 'dep-muhasebe', name: 'Muhasebe', isActive: true, managerId: null },
  { id: 'dep-arsiv', name: 'Arşiv', isActive: false, managerId: null },
].map((department) => ({ ...department, createdAt: now(), updatedAt: now() }))

function makeUser(id, email, firstName, lastName, roles, departmentId, status = 'ACTIVE', phone = null) {
  return { id, email, firstName, lastName, phone, status, roles, departmentId, createdAt: now(), updatedAt: now() }
}

function toAscii(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }
  return text.toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (char) => map[char])
}

// Kimlikleri api/auth.js'teki mock kullanıcılarla aynıdır (kendi hesabı kontrolleri için).
const users = [
  makeUser('mock-admin', 'admin@smartoffice.test', 'Sistem', 'Yöneticisi', [ADMIN], null),
  makeUser('mock-reception', 'resepsiyon@smartoffice.test', 'Resepsiyon', 'Görevlisi', ['RECEPTION'], null),
  makeUser('mock-manager', 'yonetici@smartoffice.test', 'Departman', 'Yöneticisi', [MANAGER], 'dep-yazilim'),
  makeUser('mock-employee', 'calisan@smartoffice.test', 'Örnek', 'Çalışan', ['EMPLOYEE'], 'dep-yazilim'),
]

// Seed'deki 4 kullanıcıya ek 8 örnek çalışan (toplam 12): sayfa başına 10 seçilince
// sayfalama denenebilir. 5. kişi (Elif) İK'da departman yöneticisi adayı, 7. kişi (Deniz) pasif.
const FIRST_NAMES = ['Ayşe', 'Mehmet', 'Zeynep', 'Can', 'Elif', 'Burak', 'Deniz', 'Selin']
const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Koç']
const ACTIVE_DEPARTMENTS = ['dep-yazilim', 'dep-ik', 'dep-muhasebe']

FIRST_NAMES.forEach((firstName, index) => {
  const lastName = LAST_NAMES[index % LAST_NAMES.length]
  users.push(
    makeUser(
      `mock-user-${index + 1}`,
      `${toAscii(firstName)}.${toAscii(lastName)}@smartoffice.test`,
      firstName,
      lastName,
      index === 4 ? [MANAGER, 'EMPLOYEE'] : ['EMPLOYEE'],
      ACTIVE_DEPARTMENTS[index % ACTIVE_DEPARTMENTS.length],
      index % 7 === 6 ? 'INACTIVE' : 'ACTIVE',
      `0555 000 ${String(1000 + index).slice(-4)}`,
    ),
  )
})

// --- Yardımcılar -----------------------------------------------------------

function findDepartment(id) {
  return departments.find((department) => department.id === id)
}

function findUserOr404(id) {
  const user = users.find((item) => item.id === id)
  if (!user) fail(404, 'Kullanıcı bulunamadı.')
  return user
}

function findDepartmentOr404(id) {
  const department = findDepartment(id)
  if (!department) fail(404, 'Departman bulunamadı.')
  return department
}

function toPublicUser(user) {
  const department = findDepartment(user.departmentId)
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    status: user.status,
    roles: [...user.roles],
    department: department ? { id: department.id, name: department.name } : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function toAdminDepartment(department) {
  const manager = users.find((user) => user.id === department.managerId)
  return {
    id: department.id,
    name: department.name,
    isActive: department.isActive,
    manager: manager
      ? { id: manager.id, firstName: manager.firstName, lastName: manager.lastName, email: manager.email }
      : null,
    memberCount: users.filter((user) => user.departmentId === department.id && user.status === 'ACTIVE').length,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
  }
}

function paginate(list, page = 1, limit = 20) {
  const total = list.length
  return {
    data: list.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

function contains(text, search) {
  return String(text ?? '').toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))
}

function actorId() {
  return getMockSessionUser()?.id
}

function countOtherActiveAdmins(userId) {
  return users.filter((user) => user.id !== userId && user.status === 'ACTIVE' && user.roles.includes(ADMIN)).length
}

function assertDepartmentExists(departmentId) {
  if (departmentId && !findDepartment(departmentId)) fail(400, 'Departman bulunamadı.')
}

function assertEmailFree(email, exceptId) {
  if (users.some((user) => user.email === email && user.id !== exceptId)) {
    fail(409, 'Bu e-posta adresi zaten kayıtlı.')
  }
}

// --- Kullanıcılar ------------------------------------------------------------

export async function listUsers({ page = 1, limit = 20, search, status } = {}) {
  await wait()
  let result = users
  if (status) result = result.filter((user) => user.status === status)
  if (search) {
    result = result.filter((user) => [user.email, user.firstName, user.lastName].some((field) => contains(field, search)))
  }
  result = [...result].sort(
    (a, b) => a.firstName.localeCompare(b.firstName, 'tr') || a.lastName.localeCompare(b.lastName, 'tr'),
  )
  const body = paginate(result, Number(page), Number(limit))
  return { ...body, data: body.data.map(toPublicUser) }
}

export async function getUser(id) {
  await wait()
  return { data: toPublicUser(findUserOr404(id)) }
}

export async function createUser(input) {
  await wait()
  const email = input.email.trim().toLowerCase()
  if (!input.password || input.password.length < 8 || !input.roles?.length) fail(400, 'Geçersiz istek.')
  assertDepartmentExists(input.departmentId)
  assertEmailFree(email)

  const user = makeUser(
    newId('mock-user'),
    email,
    input.firstName.trim(),
    input.lastName.trim(),
    [...new Set(input.roles)],
    input.departmentId ?? null,
    'ACTIVE',
    input.phone ?? null,
  )
  users.push(user)
  return { data: toPublicUser(user) }
}

export async function updateUser(id, changes) {
  await wait()
  const user = findUserOr404(id)
  const data = { ...changes }
  if (data.email) {
    data.email = data.email.trim().toLowerCase()
    assertEmailFree(data.email, id)
  }
  if ('departmentId' in data) assertDepartmentExists(data.departmentId)
  Object.assign(user, data, { updatedAt: now() })
  return { data: toPublicUser(user) }
}

export async function setUserStatus(id, status) {
  await wait()
  if (id === actorId() && status === 'INACTIVE') fail(409, 'Kendi hesabınızı pasife alamazsınız.')
  const user = findUserOr404(id)
  if (user.status === status) return { data: toPublicUser(user) }
  if (status === 'INACTIVE' && user.roles.includes(ADMIN) && countOtherActiveAdmins(id) === 0) {
    fail(409, 'Son aktif ADMIN pasife alınamaz.')
  }
  user.status = status
  user.updatedAt = now()
  return { data: toPublicUser(user) }
}

export async function setUserRoles(id, roles) {
  await wait()
  const removesAdmin = !roles.includes(ADMIN)
  if (id === actorId() && removesAdmin) fail(409, 'Kendi ADMIN rolünüzü kaldıramazsınız.')
  const user = findUserOr404(id)
  const wasActiveAdmin = user.status === 'ACTIVE' && user.roles.includes(ADMIN)
  if (wasActiveAdmin && removesAdmin && countOtherActiveAdmins(id) === 0) {
    fail(409, 'Son aktif ADMIN rolü kaldırılamaz.')
  }
  if (!roles.length) fail(400, 'Geçersiz istek.')
  user.roles = [...new Set(roles)]
  user.updatedAt = now()
  return { data: toPublicUser(user) }
}

// --- Departmanlar ----------------------------------------------------------

export async function listDepartments({ page = 1, limit = 20, search, isActive } = {}) {
  await wait()
  let result = departments
  if (search) result = result.filter((department) => contains(department.name, search))
  if (isActive !== undefined && isActive !== '') {
    const wanted = isActive === true || isActive === 'true'
    result = result.filter((department) => department.isActive === wanted)
  }
  result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  const body = paginate(result, Number(page), Number(limit))
  return { ...body, data: body.data.map(toAdminDepartment) }
}

function assertNameFree(name, exceptId) {
  if (departments.some((department) => department.name === name && department.id !== exceptId)) {
    fail(409, 'Bu isimde bir departman zaten var.')
  }
}

export async function createDepartment({ name }) {
  await wait()
  const trimmed = name.trim()
  assertNameFree(trimmed)
  const department = { id: newId('dep'), name: trimmed, isActive: true, managerId: null, createdAt: now(), updatedAt: now() }
  departments.push(department)
  return { data: toAdminDepartment(department) }
}

export async function updateDepartment(id, changes) {
  await wait()
  const department = findDepartmentOr404(id)
  const data = { ...changes }
  if (data.name !== undefined) {
    data.name = data.name.trim()
    assertNameFree(data.name, id)
  }
  Object.assign(department, data, { updatedAt: now() })
  return { data: toAdminDepartment(department) }
}

export async function setDepartmentManager(id, managerId) {
  await wait()
  const department = findDepartmentOr404(id)
  if (managerId) {
    const user = users.find((item) => item.id === managerId)
    if (!user || user.status !== 'ACTIVE') fail(400, 'Yönetici olarak atanacak aktif kullanıcı bulunamadı.')
    if (!user.roles.includes(MANAGER)) fail(400, 'Kullanıcının DEPT_MANAGER rolü yok.')
    if (user.departmentId !== id) fail(400, 'Yönetici bu departmanın üyesi olmalıdır.')
  }
  department.managerId = managerId
  department.updatedAt = now()
  return { data: toAdminDepartment(department) }
}
