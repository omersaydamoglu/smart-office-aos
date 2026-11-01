# Smart Office (AOS)

Bulut tabanlı ziyaretçi, çalışan devam, kargo ve ofis rezervasyon yönetim platformu. Merkezinde imzalı, süreli ve **tek kullanımlık QR** ile çalışan ziyaretçi yönetimi bulunur.

> Bitirme projesi · Süre: **9 hafta** · Akademik danışman: Dr. Öğr. Üyesi Abbas Uğuren

## Ekip

| Üye | Rol | Ana sorumluluk |
|---|---|---|
| Ömer Saydamoğlu | Backend ve mimari lideri | REST API, auth/RBAC, ziyaretçi daveti, QR doğrulama, devam API'leri, acil durum iş kuralları, KVKK yaşam döngüsü |
| Nazlım Aynacı | Frontend ve UI/UX lideri | Figma, React arayüzleri (admin, resepsiyon, kiosk, çalışan portalı), bildirim arayüzü, kullanılabilirlik testi |
| Talha Soydaş | Veritabanı, entegrasyon ve DevOps lideri | PostgreSQL/Prisma, ER tasarımı, kargo/rezervasyon verisi, bildirim entegrasyonu, rapor dışa aktarma, test otomasyonu, Docker, CI/CD, yedekleme |

## Teknoloji

React (Vite) · Node.js / Express · PostgreSQL · Prisma · Socket.IO · Firebase Cloud Messaging + SMTP · Jest · Supertest · Playwright · k6 · Docker · GitHub Actions

Mimari: **modüler monolit** (tek backend, tek veritabanı). Mobil için PWA/responsive web; native uygulama yok.

## Klasör Yapısı

```
smart-office-aos/
├── backend/            # Express + Prisma
├── frontend/           # React
├── docs/               # SRS, UML, ER, API dokümanları
├── .github/workflows/  # CI/CD
├── docker-compose.yml
└── README.md
```

## Kurulum

Gereksinimler: Node.js 20 LTS, Docker, Git.

```bash
git clone https://github.com/omersaydamoglu/smart-office-aos.git
cd smart-office-aos

# Veritabanı
docker compose up -d

# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev

# Frontend (yeni terminal)
cd frontend
npm install
npm run dev
```

`.env` dosyaları **asla** commit edilmez; yalnızca `.env.example` paylaşılır.

## Çalışma Kuralları

- `main` korumalıdır: doğrudan push yok, **Pull Request + en az 1 onay** zorunlu.
- Her iş bir issue'ya bağlıdır; her iş ayrı branch'te yapılır: `feature/...`, `fix/...`, `docs/...`
- Kritik kod (auth, QR, yetki) mutlaka başka bir ekip üyesince incelenir.
- Commit formatı: `feat:`, `fix:`, `docs:`, `chore:`, `test:`
- API sözleşmesi ve şema değişiklikleri ekibe önceden bildirilir; frontend, backend hazır olana kadar mock veri kullanır.
- Test ve demo verileri **sentetik** olmalıdır, gerçek kişisel veri kullanılmaz.
- Etiketler: `P0`, `P1`, `P2`, `backend`, `frontend`, `db`

## Öncelikler (9 haftaya göre)

| Öncelik | Kapsam |
|---|---|
| **P0 – Zorunlu** | Auth + RBAC, ziyaretçi daveti ve QR giriş/çıkış, resepsiyon ekranı, kiosk (temel), çalışan devamı (temel), temel kargo, temel rezervasyon, temel dashboard, audit log, KVKK temel kontroller, otomatik test, canlı demo |
| **P1 – Yüksek değer** | Departman yönetimi, bildirim merkezi (uygulama içi + e-posta), acil durum/tahliye (sade), Excel/PDF rapor, şifre sıfırlama, e-posta doğrulama, yedekleme/geri yükleme testi |
| **P2 – Zaman kalırsa** | 2FA, gelişmiş bildirim tercihleri, tam çoklu dil, gelişmiş rezervasyon analitiği, görsel iyileştirmeler |

**Kapsam daraltma sırası:** P2 → rezervasyon ileri takvim/analitik → kargo ek durumları → FCM push (e-posta + Socket.IO kalır).
**Asla ertelenmeyecekler:** QR güvenliği, RBAC, temel ziyaretçi akışı, veri koruma, testler.

## 9 Haftalık Plan

| Hafta | Hedef | Çıktı | Sorumlu ağırlığı |
|---|---|---|---|
| **1** | Analiz, tasarım, altyapı | Repo, Docker, CI, SRS (sade), kullanıcı hikâyeleri, mimari, UML, ER taslağı, Figma ana ekranlar, proje iskeleti | Hepsi |
| **2** | Hesap güvenliği ve organizasyon | Login, parola hash, JWT/refresh, RBAC, kullanıcı/rol/departman CRUD, giriş denemesi sınırlama | Ömer (API), Nazlım (ekranlar), Talha (şema/seed) |
| **3** | Ziyaretçi çekirdek akışı | Davet oluşturma, QR token (atomik tek kullanım), e-posta gönderimi, resepsiyon tarama, giriş/çıkış durum makinesi | Ömer, Nazlım, Talha |
| **4** | Kiosk, bildirim, çalışan devamı | Kiosk akışı, KVKK/İSG kayıtları, Socket.IO + uygulama içi bildirim, devam giriş/çıkış, izin talebi | Hepsi |
| **5** | Kargo ve rezervasyon | Kargo kabul/teslim + bildirim, oda/masa tanımı, çakışma kontrolü, iptal, otomatik iptal | Talha (veri), Nazlım (ekran), Ömer (kurallar) |
| **6** | Dashboard ve raporlama | Anlık doluluk, KPI kartları, filtreler, Excel/PDF dışa aktarma, audit log ekranı | Talha, Nazlım, Ömer |
| **7** | Acil durum ve gizlilik | Acil durum olayı + tahliye işaretleme + rapor, KVKK veri talepleri, saklama/anonimleştirme, şifre sıfırlama, e-posta doğrulama | Ömer, Nazlım, Talha |
| **8** | Güvenlik ve test | E2E (Playwright), eşzamanlılık (aynı QR 2 kez), IDOR/yetki testleri, k6 yük testi (30–40 kullanıcı), yedek geri yükleme, kullanılabilirlik testi (SUS) | Hepsi |
| **9** | Teslim ve sunum | Cloud deploy, canlı demo senaryosu, son düzeltmeler, kullanıcı kılavuzu, Swagger/OpenAPI, final raporu, sunum | Hepsi |

### Haftalık ritim

- **Pazartesi:** Sprint planlama (30 dk), issue'lar dağıtılır
- **Çarşamba:** Kısa durum toplantısı, engeller konuşulur
- **Cuma:** PR'lar birleştirilir, entegrasyon kontrolü, demo
- **Her hafta sonu:** `main` çalışır durumda olmalı

### Kritik kontrol noktaları

- **Hafta 3 sonu:** Ziyaretçi daveti → QR → giriş/çıkış uçtan uca çalışmalı. Çalışmıyorsa P1 işleri durdurulur.
- **Hafta 6 sonu:** Tüm P0 modüller çalışır olmalı.
- **Hafta 7 sonu:** Yeni özellik geliştirme **durur**; Hafta 8–9 yalnızca test, düzeltme ve teslim.

## Kabul Kriterleri

- [ ] Davet oluşturulur, QR gönderilir, geçerli QR ile giriş/çıkış yapılır
- [ ] Tekrar kullanılan, süresi dolmuş, iptal edilmiş, değiştirilmiş QR reddedilir
- [ ] Aynı QR'nin eşzamanlı iki taramasında yalnızca biri başarılı olur
- [ ] Yetkisiz kullanıcı başka rolün/kullanıcının verisine API'den erişemez
- [ ] Devam, kargo ve rezervasyon akışları uçtan uca çalışır
- [ ] Rezervasyon çakışması veritabanı/iş mantığı seviyesinde engellenir
- [ ] Dashboard verileri veritabanıyla tutarlıdır
- [ ] Acil durum ekranı içerideki kişileri listeler ve tahliye durumunu kaydeder
- [ ] Audit log, bildirim ve yedek geri yükleme test edilmiştir
- [ ] Kurulum ve demo başka bir bilgisayarda tekrarlanabilir

## Sınırlar ve Uyarılar

- Sistem idari kayıt platformudur; fiziksel güvenlik ekipmanı veya resmi acil durum sistemlerinin yerine geçmez.
- Acil durum modülü yangın alarmı, sensör veya turnikeye bağlı değildir; gerçek zamanlı fiziksel konum garantisi vermez.
- Biyometrik veri / yüz tanıma kullanılmaz; çalışanlar giriş-çıkış dışında izlenmez.
- GPS konumu tek başına kesin kanıt değildir; QR + konum + gerektiğinde resepsiyon incelemesi birlikte değerlendirilir.
- Bu doküman teknik gereksinimdir, hukuki görüş değildir. KVKK metinleri ve saklama süreleri yetkili danışmanca doğrulanmalıdır.
- Performans için ölçülmemiş değerler başarı iddiası olarak yazılmaz.

## Teslim Paketi

Kaynak kod · Jira/GitHub Projects kayıtları · SRS, UML, ER · Swagger/OpenAPI ve veri sözlüğü · Test planı ve çıktıları · Güvenlik/gizlilik belgesi · Kullanıcı kılavuzu ve kurulum rehberi · Canlı demo, sunum ve final raporu
## Tasarım ve UI/UX

### Google Stitch Tasarımları

- Mobil (Çalışan Portalı): https://stitch.withgoogle.com/projects/16392963363715010478
- Web (Resepsiyon, Kiosk, Admin): https://stitch.withgoogle.com/projects/5439068229676821256

### Ekran İçerik Listesi

- [Ekran İçerik Listesi](docs/ui/ekran-icerik-listesi.md)

> Not: Figma aktarımında teknik hata yaşandığı için tasarım referansları Google Stitch üzerinden paylaşılmaktadır.
