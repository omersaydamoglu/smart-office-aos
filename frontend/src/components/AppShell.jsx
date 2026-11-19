// Uygulama kabuğu (issue #41): üst çubuk + rol bazlı yan menü + sayfa alanı.
// Telefonda (<900px) yan menü gizlenir; altta sekme çubuğu çıkar, "Menü" sekmesi
// tüm menüyü soldan açılan çekmecede gösterir.

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Bell, ChevronDown, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ROLE_LABELS, homePathFor } from '../auth/roles'
import { bottomTabsForRoles, findPage, sectionsForRoles } from '../navigation'
import './AppShell.css'

function displayName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  return fullName || user?.email || 'Kullanıcı'
}

function initials(user) {
  const name = displayName(user)
  const parts = name.includes('@') ? [name] : name.split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('')
}

function SideNav({ sections, onNavigate }) {
  return (
    <nav className="sidenav" aria-label="Ana menü">
      {sections.map((section) => (
        <div key={section.id} className="sidenav__section">
          {sections.length > 1 && <p className="sidenav__title">{section.title}</p>}
          <ul>
            {section.items.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <NavLink to={path} end className="sidenav__link" onClick={onNavigate}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function handlePointer(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden="true">{initials(user)}</span>
        <span className="user-menu__name">{displayName(user)}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="user-menu__panel">
          <div className="user-menu__info">
            <p className="user-menu__fullname">{displayName(user)}</p>
            <p className="user-menu__email">{user?.email}</p>
            <ul className="role-chips" aria-label="Rolleriniz">
              {(user?.roles ?? []).map((role) => (
                <li key={role}>{ROLE_LABELS[role] || role}</li>
              ))}
            </ul>
          </div>
          <Link className="user-menu__item" to="/portal/profile" onClick={() => setOpen(false)}>
            Profil ve oturumlar
          </Link>
          <button type="button" className="user-menu__item user-menu__item--danger" onClick={onSignOut}>
            <LogOut size={16} aria-hidden="true" />
            Çıkış yap
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppShell() {
  const { user, roles, signOut } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeButtonRef = useRef(null)

  const sections = sectionsForRoles(roles)
  const tabs = bottomTabsForRoles(roles)
  const currentPage = findPage(location.pathname)

  // Sekme başlığı: "Kullanıcılar · Smart Office"
  useEffect(() => {
    document.title = currentPage ? `${currentPage.item.label} · Smart Office` : 'Smart Office'
  }, [currentPage])

  // Çekmece açıkken: Esc ile kapat, arka plan kaymasın, odağı kapat düğmesine taşı.
  useEffect(() => {
    if (!drawerOpen) return undefined
    function handleKey(event) {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  // Ekran genişlerse (ör. tablet yan çevrilince) çekmeceyi kapat; masaüstünde yan menü zaten görünür.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 900px)')
    const handleChange = (event) => {
      if (event.matches) setDrawerOpen(false)
    }
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">İçeriğe atla</a>

      <header className="topbar">
        <Link to={homePathFor(roles)} className="topbar__brand">
          <span className="topbar__logo" aria-hidden="true">AOS</span>
          <span className="topbar__product">Smart Office</span>
        </Link>

        <div className="topbar__actions">
          {/* Okunmamış sayısı, bildirim API'si gelince (Hafta 4-5) eklenecek. */}
          <Link to="/portal/notifications" className="icon-button" aria-label="Bildirimler">
            <Bell size={20} aria-hidden="true" />
          </Link>
          <UserMenu user={user} onSignOut={signOut} />
        </div>
      </header>

      <aside className="sidebar">
        <SideNav sections={sections} />
      </aside>

      {/* Telefon: soldan açılan menü çekmecesi */}
      {drawerOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menü">
          <div className="drawer__backdrop" onClick={closeDrawer} />
          <div className="drawer__panel">
            <div className="drawer__header">
              <span className="topbar__product">Menü</span>
              <button
                ref={closeButtonRef}
                type="button"
                className="icon-button"
                aria-label="Menüyü kapat"
                onClick={closeDrawer}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <SideNav sections={sections} onNavigate={closeDrawer} />
          </div>
        </div>
      )}

      <main id="main-content" className="shell-main" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="bottom-tabs" aria-label="Hızlı erişim">
        {tabs.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} end className="bottom-tabs__item">
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className="bottom-tabs__item"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} aria-hidden="true" />
          <span>Menü</span>
        </button>
      </nav>
    </div>
  )
}
