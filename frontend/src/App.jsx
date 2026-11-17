import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import { logout } from './api/auth'
import './App.css'

const ROLE_LABELS = {
  ADMIN: 'Yönetici',
  RECEPTION: 'Resepsiyon',
  DEPT_MANAGER: 'Departman yöneticisi',
  EMPLOYEE: 'Çalışan',
}

function App() {
  const [user, setUser] = useState(null)

  async function handleLogout() {
    await logout()
    setUser(null)
  }

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />
  }

  // Geçici karşılama ekranı: rol bazlı paneller (admin, resepsiyon, çalışan portalı)
  // sonraki adımlarda buraya eklenecek.
  return (
    <main className="welcome">
      <div className="welcome-card">
        <h1>Hoş geldin, {user.firstName} {user.lastName}</h1>
        <p className="welcome-meta">{user.email}</p>
        <ul className="welcome-roles">
          {user.roles.map((role) => (
            <li key={role}>{ROLE_LABELS[role] || role}</li>
          ))}
        </ul>
        <button type="button" className="btn btn-secondary" onClick={handleLogout}>
          Çıkış yap
        </button>
      </div>
    </main>
  )
}

export default App
