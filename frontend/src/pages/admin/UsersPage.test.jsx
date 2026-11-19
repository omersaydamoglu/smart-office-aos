// #42 / #43 — Admin › Kullanıcılar: kendi hesabı korumaları ve "Pasife al" onayı
import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { json, mockApi, sessionResponse, USERS } from '../../test/api'
import { renderApp } from '../../test/render'

const listItem = (user, status = 'ACTIVE') => ({ ...user, phone: null, status, department: null })

function usersApi() {
  const state = {
    users: [listItem(USERS.ADMIN), listItem(USERS.EMPLOYEE)],
    statusRequests: [],
  }
  mockApi((request) => {
    if (request.method === 'GET' && request.path.startsWith('/users?')) {
      return json(200, { data: state.users, pagination: { page: 1, limit: 20, total: state.users.length, totalPages: 1 } })
    }
    const statusMatch = request.path.match(/^\/users\/([^/]+)\/status$/)
    if (request.method === 'PATCH' && statusMatch) {
      state.statusRequests.push({ id: statusMatch[1], ...request.body })
      const user = state.users.find((item) => item.id === statusMatch[1])
      user.status = request.body.status
      return json(200, { data: user })
    }
    return sessionResponse(request, USERS.ADMIN)
  })
  return state
}

// Tablodaki, adı verilen kişinin satırı (sağ üstteki kullanıcı menüsü hariç)
async function rowOf(name) {
  const table = await screen.findByRole('table')
  const row = within(table).getAllByRole('row').find((item) => item.textContent.includes(name))
  if (!row) throw new Error(`Satır bulunamadı: ${name}`)
  return row
}

describe('Kullanıcılar sayfası', () => {
  it('admin kendi satırında "Pasife al" kullanamaz, başkasında kullanabilir', async () => {
    usersApi()
    renderApp('/admin/users')

    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(2))
    const ownRow = await rowOf('Sistem Yöneticisi')
    const otherRow = await rowOf('Örnek Çalışan')
    expect(ownRow).toHaveTextContent('(siz)')

    expect(within(ownRow).getByRole('button', { name: 'Pasife al' })).toBeDisabled()
    expect(within(otherRow).getByRole('button', { name: 'Pasife al' })).toBeEnabled()
  })

  it('"Pasife al" önce onay sorar, onaylanınca istek gider ve bildirim çıkar', async () => {
    const state = usersApi()
    const { user } = renderApp('/admin/users')

    await screen.findByText('Örnek Çalışan')
    await user.click(within(await rowOf('Örnek Çalışan')).getByRole('button', { name: 'Pasife al' }))

    const dialog = await screen.findByRole('dialog', { name: 'Kullanıcıyı pasife al' })
    expect(state.statusRequests).toHaveLength(0) // onay verilmeden istek gitmez

    await user.click(within(dialog).getByRole('button', { name: 'Pasife al' }))

    expect(await screen.findByText('Örnek Çalışan pasife alındı.')).toBeInTheDocument()
    expect(state.statusRequests).toEqual([{ id: USERS.EMPLOYEE.id, status: 'INACTIVE' }])
  })

  it('kendi ADMIN rolünü kaldırmaya çalışınca uyarı gösterir ve kaydetmeyi engeller', async () => {
    usersApi()
    const { user } = renderApp('/admin/users')

    await screen.findByText('Örnek Çalışan')
    await user.click(within(await rowOf('Sistem Yöneticisi')).getByRole('button', { name: 'Roller' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /Yönetici/ }))

    expect(within(dialog).getByText('Kendi yönetici (ADMIN) rolünüzü kaldıramazsınız.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Rolleri kaydet' })).toBeDisabled()
  })
})
