// #43 — Rol bazlı erişim (RBAC): her rol için menü ve sayfa yetkileri
import { describe, expect, it } from 'vitest'
import { canAccessPath, sectionsForRoles } from './navigation'
import { homePathFor } from './auth/roles'

const sectionIds = (roles) => sectionsForRoles(roles).map((section) => section.id)

describe('rol bazlı menü ve yetki', () => {
  it('ADMIN: yönetim + resepsiyon + kişisel bölümlerini görür', () => {
    expect(sectionIds(['ADMIN'])).toEqual(['admin', 'reception', 'portal'])
    expect(homePathFor(['ADMIN'])).toBe('/admin')
    expect(canAccessPath(['ADMIN'], '/admin/users')).toBe(true)
    expect(canAccessPath(['ADMIN'], '/manager/team')).toBe(false)
  })

  it('RECEPTION: resepsiyon + kişisel; yönetim sayfalarına erişemez', () => {
    expect(sectionIds(['RECEPTION'])).toEqual(['reception', 'portal'])
    expect(homePathFor(['RECEPTION'])).toBe('/reception')
    expect(canAccessPath(['RECEPTION'], '/reception/scan')).toBe(true)
    expect(canAccessPath(['RECEPTION'], '/admin/users')).toBe(false)
  })

  it('DEPT_MANAGER: departmanım + kişisel; resepsiyon ve yönetime erişemez', () => {
    expect(sectionIds(['DEPT_MANAGER'])).toEqual(['manager', 'portal'])
    expect(homePathFor(['DEPT_MANAGER'])).toBe('/portal')
    expect(canAccessPath(['DEPT_MANAGER'], '/manager/approvals')).toBe(true)
    expect(canAccessPath(['DEPT_MANAGER'], '/reception')).toBe(false)
    expect(canAccessPath(['DEPT_MANAGER'], '/admin')).toBe(false)
  })

  it('EMPLOYEE: yalnızca kişisel bölüm', () => {
    expect(sectionIds(['EMPLOYEE'])).toEqual(['portal'])
    expect(homePathFor(['EMPLOYEE'])).toBe('/portal')
    expect(canAccessPath(['EMPLOYEE'], '/portal/leave')).toBe(true)
    expect(canAccessPath(['EMPLOYEE'], '/admin')).toBe(false)
    expect(canAccessPath(['EMPLOYEE'], '/manager/team')).toBe(false)
  })

  it('çoklu rolde bölümler birleşir', () => {
    expect(sectionIds(['DEPT_MANAGER', 'RECEPTION'])).toEqual(['reception', 'manager', 'portal'])
  })

  it('rolü olmayan ya da bilinmeyen adres erişilemez', () => {
    expect(sectionIds([])).toEqual([])
    expect(canAccessPath(['ADMIN'], '/olmayan-sayfa')).toBe(false)
  })
})
