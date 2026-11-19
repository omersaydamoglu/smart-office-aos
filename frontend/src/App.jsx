import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AuthProvider from './auth/AuthProvider'
import { useAuth } from './auth/AuthContext'
import { RequireAuth, RequireRole } from './auth/guards'
import { homePathFor } from './auth/roles'
import { NAV_SECTIONS } from './navigation'
import AppShell from './components/AppShell'
import { NotFoundState } from './components/PageStates'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'

// Hazır olan ekranlar burada adreslerine bağlanır; listede olmayanlar
// "Bu ekran hazırlanıyor" sayfasını gösterir. Örn. #42 için:
//   '/admin/users': UsersPage,
const PAGE_COMPONENTS = {}

// "/" adresi: kullanıcıyı rolüne göre kendi ana sayfasına gönder.
function HomeRedirect() {
  const { roles } = useAuth()
  return <Navigate to={homePathFor(roles)} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<HomeRedirect />} />

            {NAV_SECTIONS.flatMap((section) =>
              section.items.map((item) => {
                const Page = PAGE_COMPONENTS[item.path]
                return (
                  <Route
                    key={item.path}
                    path={item.path}
                    element={
                      <RequireRole roles={section.roles}>
                        {Page ? <Page /> : <PlaceholderPage title={item.label} sectionTitle={section.title} />}
                      </RequireRole>
                    }
                  />
                )
              }),
            )}

            <Route path="*" element={<NotFoundState />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
