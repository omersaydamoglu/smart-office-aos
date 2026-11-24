// Henüz yazılmamış ekranlar için geçici sayfa. Gerçek ekran hazır olunca
// App.jsx'teki PAGE_COMPONENTS içine eklenir ve bu sayfa o adreste görünmez olur.
import PageHeader from '../components/PageHeader'
import { EmptyState } from '../components/PageStates'

export default function PlaceholderPage({ title, sectionTitle }) {
  return (
    <>
      <PageHeader title={title} description={sectionTitle} />
      <EmptyState
        title="Bu ekran hazırlanıyor"
        description="Bu sayfanın içeriği sonraki adımlarda eklenecek."
      />
    </>
  )
}
