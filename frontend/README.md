# Smart Office — Frontend

React 19 + Vite 8. Tasarım: Stitch "Kurumsal Akıllı Ofis" tasarım sistemi (Inter, Slate griler, vurgu #2563EB).

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm install` | Paketleri kurar (ilk seferde) |
| `npm run dev` | Geliştirme sunucusu: http://localhost:5173 (`/api` istekleri `localhost:3000`'e gider) |
| `npm test` | Testleri bir kez çalıştırır (CI'da da çalışır) |
| `npm run test:watch` | Dosya değiştikçe testleri yeniden çalıştırır |
| `npm run lint` | Kod kurallarını kontrol eder |
| `npm run build` | Yayın için `dist/` klasörüne derler |

## Backend olmadan çalışmak (mock modu)

`frontend/.env.local` dosyasına şunu yazın ve `npm run dev`'i yeniden başlatın:

```
VITE_USE_MOCK=true
```

Seed kullanıcılarıyla giriş yapılabilir (ör. `admin@smartoffice.test` / `Admin123!dev`, diğerleri `Test123!dev`). Kullanıcı ve departman verileri bellekte tutulur, sayfa yenilenince başa döner.

## Testler

Vitest + Testing Library, jsdom ortamında. Mock modu testlerde kapalıdır: gerçek API kodu çalışır, ağ istekleri `src/test/api.js` ile taklit edilir.

- `src/api/auth.test.js` — giriş, kilit (429), ağ hatası, token yenileme
- `src/navigation.test.js` — her rol için menü ve sayfa yetkileri
- `src/auth/guards.test.jsx` — her rol için izinli / yasak (403) sayfa, oturumsuz yönlendirme
- `src/pages/LoginPage.test.jsx` — form doğrulama, hata kutuları, role göre yönlendirme
- `src/pages/admin/UsersPage.test.jsx` — kendi hesabı korumaları ve "Pasife al" onayı
