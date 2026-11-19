// Rol adları backend (Prisma/seed) ile aynıdır: docs/rol-yetki-matrisi.md
export const ROLES = {
  ADMIN: 'ADMIN',
  RECEPTION: 'RECEPTION',
  DEPT_MANAGER: 'DEPT_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
}

export const ALL_ROLES = Object.values(ROLES)

export const ROLE_LABELS = {
  ADMIN: 'Yönetici',
  RECEPTION: 'Resepsiyon',
  DEPT_MANAGER: 'Departman yöneticisi',
  EMPLOYEE: 'Çalışan',
}

export function hasAnyRole(userRoles = [], allowedRoles = []) {
  return allowedRoles.some((role) => userRoles.includes(role))
}

// Girişten sonra açılacak ilk sayfa. Birden çok rolü olan kullanıcıda
// en geniş yetkili rol kazanır: ADMIN > RECEPTION > (DEPT_MANAGER, EMPLOYEE).
// Departman yöneticisi de önce çalışan portalını görür; ek sekmeleri menüdedir.
export function homePathFor(userRoles = []) {
  if (userRoles.includes(ROLES.ADMIN)) return '/admin'
  if (userRoles.includes(ROLES.RECEPTION)) return '/reception'
  return '/portal'
}
