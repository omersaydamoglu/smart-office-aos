// #41 / #43 — Rol bazlı erişim: her rol için izinli ve yasak sayfa, menü içeriği
import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { mockApi, sessionResponse, USERS } from '../test/api'
import { renderApp } from '../test/render'

const FORBIDDEN = 'Bu sayfaya erişim yetkiniz yok'

function signedInAs(user) {
  mockApi((request) => sessionResponse(request, user))
}

describe('sayfa yetkileri', () => {
  it('oturum yoksa korumalı sayfa yerine giriş ekranı açılır', async () => {
    mockApi((request) => sessionResponse(request, null))
    renderApp('/admin')

    expect(await screen.findByRole('heading', { name: 'Hesabınıza giriş yapın' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it.each([
    ['ADMIN', '/admin/reports', 'Raporlar', '/manager/team', 'Kullanıcılar'],
    ['RECEPTION', '/reception/scan', 'QR tarama', '/admin/users', 'Bugünkü ziyaretler'],
    ['DEPT_MANAGER', '/manager/team', 'Ekibim', '/reception', 'Onay bekleyenler'],
    ['EMPLOYEE', '/portal/leave', 'İzin taleplerim', '/admin', 'Davetlerim'],
  ])('%s: %s açılır, %s yasaklanır', async (role, allowedPath, allowedHeading, forbiddenPath, menuItem) => {
    signedInAs(USERS[role])

    const allowed = renderApp(allowedPath)
    expect(await screen.findByRole('heading', { level: 1, name: allowedHeading })).toBeInTheDocument()
    expect(screen.queryByText(FORBIDDEN)).not.toBeInTheDocument()
    const nav = screen.getAllByRole('navigation', { name: 'Ana menü' })[0]
    expect(within(nav).getByRole('link', { name: menuItem })).toBeInTheDocument()
    allowed.unmount()

    renderApp(forbiddenPath)
    expect(await screen.findByText(FORBIDDEN)).toBeInTheDocument()
  })

  it('çalışanın menüsünde yönetim, resepsiyon ve departman bölümleri yoktur', async () => {
    signedInAs(USERS.EMPLOYEE)
    renderApp('/portal')

    const nav = (await screen.findAllByRole('navigation', { name: 'Ana menü' }))[0]
    expect(within(nav).getByText('Kişisel')).toBeInTheDocument()
    expect(within(nav).queryByText('Yönetim')).not.toBeInTheDocument()
    expect(within(nav).queryByText('Resepsiyon')).not.toBeInTheDocument()
    expect(within(nav).queryByText('Departmanım')).not.toBeInTheDocument()
  })
})
