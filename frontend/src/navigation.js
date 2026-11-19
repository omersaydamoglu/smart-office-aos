// Uygulamadaki tüm sayfalar ve menü yapısı tek yerde.
// Kaynak: docs/ui/ekran-icerik-listesi.md (her bölümün "Menü" satırı).
// Bir bölümü yalnızca `roles` listesindeki rollerden birine sahip kullanıcı görür.
// Yeni bir ekran eklemek için ilgili bölüme bir satır eklemek yeterlidir.

import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  ClipboardCheck,
  Clock,
  FileBarChart,
  Home,
  LayoutDashboard,
  Mail,
  Package,
  QrCode,
  ScrollText,
  Settings,
  Siren,
  UserCircle,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { ALL_ROLES, ROLES, hasAnyRole, homePathFor } from './auth/roles'

export const NAV_SECTIONS = [
  {
    id: 'admin',
    title: 'Yönetim',
    roles: [ROLES.ADMIN],
    items: [
      { path: '/admin', label: 'Genel bakış', icon: LayoutDashboard },
      { path: '/admin/users', label: 'Kullanıcılar', icon: Users },
      { path: '/admin/departments', label: 'Departmanlar', icon: Building2 },
      { path: '/admin/reports', label: 'Raporlar', icon: BarChart3 },
      { path: '/admin/audit-log', label: 'Audit log', icon: ScrollText },
      { path: '/admin/emergency', label: 'Acil durum', icon: Siren },
      { path: '/admin/settings', label: 'Sistem ayarları', icon: Settings },
    ],
  },
  {
    id: 'reception',
    title: 'Resepsiyon',
    roles: [ROLES.RECEPTION, ROLES.ADMIN],
    items: [
      { path: '/reception', label: 'Bugünkü ziyaretler', icon: CalendarCheck },
      { path: '/reception/scan', label: 'QR tarama', icon: QrCode },
      { path: '/reception/walk-ins', label: 'Davetsiz kayıt', icon: UserPlus },
      { path: '/reception/packages', label: 'Kargo', icon: Package },
    ],
  },
  {
    id: 'manager',
    title: 'Departmanım',
    roles: [ROLES.DEPT_MANAGER],
    items: [
      { path: '/manager/team', label: 'Ekibim', icon: UsersRound },
      { path: '/manager/approvals', label: 'Onay bekleyenler', icon: ClipboardCheck },
      { path: '/manager/reports', label: 'Departman raporları', icon: FileBarChart },
    ],
  },
  {
    id: 'portal',
    title: 'Kişisel',
    // Çalışan portalı: tüm roller kendi verileri için kullanır.
    roles: ALL_ROLES,
    items: [
      { path: '/portal', label: 'Ana sayfa', icon: Home },
      { path: '/portal/invitations', label: 'Davetlerim', icon: Mail },
      { path: '/portal/attendance', label: 'Devamım', icon: Clock },
      { path: '/portal/reservations', label: 'Rezervasyon', icon: CalendarDays },
      { path: '/portal/leave', label: 'İzin taleplerim', icon: CalendarOff },
      { path: '/portal/packages', label: 'Kargolarım', icon: Package },
      { path: '/portal/notifications', label: 'Bildirimler', icon: Bell },
      { path: '/portal/profile', label: 'Profil', icon: UserCircle },
    ],
  },
]

// Kullanıcının rollerine göre görünen menü bölümleri (çoklu rolde birleşim).
export function sectionsForRoles(userRoles) {
  return NAV_SECTIONS.filter((section) => hasAnyRole(userRoles, section.roles))
}

// Verilen adrese ait sayfa ve bölüm; bilinmeyen adreste null.
export function findPage(pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((entry) => entry.path === normalized)
    if (item) return { section, item }
  }
  return null
}

export function canAccessPath(userRoles, pathname) {
  const page = findPage(pathname)
  return Boolean(page) && hasAnyRole(userRoles, page.section.roles)
}

// Telefonda alt sekme çubuğu: kullanıcının ana bölümünden ilk 4 sayfa.
// Geri kalanı "Menü" sekmesiyle açılan çekmecededir.
export function bottomTabsForRoles(userRoles) {
  const home = findPage(homePathFor(userRoles))
  return home ? home.section.items.slice(0, 4) : []
}
