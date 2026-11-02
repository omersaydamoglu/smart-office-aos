# Smart Office (AOS) – Ekran İçerik Listesi (Wireframe Girdisi)

> Durum: **Taslak v1** · Hazırlayan: Ömer · Tasarım: Google Stitch (Figma aktarımı teknik hata nedeniyle yapılamadı)
> Bu liste, her ekranda **neyin olacağını** söyler; **nasıl görüneceğine** karar vermek tasarım çalışmasıdır. İlk hedef kaba kutular (wireframe), görsel cila sonradan.
> Kaynaklar: `docs/srs/srs.md` (Bölüm 5), `docs/srs/kullanici-hikayeleri.md`, `docs/api/api-sozlesmesi.md`, `docs/rol-yetki-matrisi.md`

## 1. Çizim kuralları

| Konu | Karar |
|---|---|
| Çerçeve boyutları | Masaüstü **1440×1024**, tablet **1024×768** (resepsiyon ve kiosk yatay), telefon **390×844** |
| Öncelik | Çalışan portalı **telefon öncelikli**; resepsiyon ve admin **masaüstü**; kiosk **tablet yatay** |
| Dil | Metinler Türkçe yazılır; uzun İngilizce karşılıklara yer bırakılır (P2) |
| Tarih/saat | Türkiye saati, `GG.AA.YYYY SS:DD` |
| Roller | Menüde yalnızca rolün erişebildiği öğeler görünür |
| Renk | Wireframe aşamasında gri tonları + tek vurgu rengi; durum renkleri aşağıda |
| Sorumluluk reddi | Acil durum ekranında zorunlu uyarı (SRS EMG-06) |

### Durum rozetleri (tüm ekranlarda aynı)

| Durum | Metin | Önerilen renk |
|---|---|---|
| `PLANNED` | Planlandı | Mavi |
| `CHECKED_IN` | İçeride | Yeşil |
| `CHECKED_OUT` | Ayrıldı | Gri |
| `CANCELLED` | İptal | Kırmızı |
| `EXPIRED` | Süresi doldu | Turuncu |
| Kargo: bekliyor / teslim edildi / iade | Bekliyor / Teslim edildi / İade | Turuncu / Yeşil / Gri |
| İzin/düzeltme: bekliyor / onaylandı / reddedildi | – | Turuncu / Yeşil / Kırmızı |

## 2. Önce çizilecek ortak bileşenler (yaklaşık 1 saat)

Ekranlardan önce bunları bileşen (component) olarak çiz, her yerde yeniden kullan:

1. **Uygulama kabuğu:** üst çubuk (logo, bildirim zili + okunmamış sayısı, kullanıcı menüsü, dil seçici) + yan menü (rol bazlı) + sayfa başlığı alanı. Telefonda yan menü alt sekme çubuğuna ya da hamburger menüye dönüşür.
2. **Veri tablosu:** arama kutusu, filtre alanları, sıralanabilir sütun başlıkları, satır eylemleri, sayfalama (`Önceki / 1 2 3 / Sonraki`, sayfa başına adet).
3. **Form alanları:** metin, seçim, tarih-saat, çoklu seçim, hata mesajı altta, zorunlu alan işareti.
4. **Durum rozeti**, **buton** (birincil, ikincil, tehlikeli), **onay penceresi** (modal), **toast** bildirimi.
5. **Ortak durumlar:** yükleniyor (iskelet), boş durum (“Henüz kayıt yok” + yönlendirme), hata (genel + yeniden dene), yetkisiz (403).

## 3. Ekranlar

### 3.1 Giriş (issue #14)
**Rol:** herkes · **Çerçeve:** masaüstü + telefon

| Öğe | Not |
|---|---|
| Logo ve ürün adı | |
| E-posta, parola (göster/gizle), **Giriş yap** | |
| “Parolamı unuttum” bağlantısı | P1 (Hafta 7) |
| Dil seçici (TR/EN) | |

**Durumlar (ayrı çizin):** geçersiz e-posta/parola (genel mesaj, hangisinin yanlış olduğu belirtilmez); hesap pasif; **çok fazla deneme** (“15 dakika sonra tekrar deneyin”, kalan süre); ağ hatası.
**API:** `POST /auth/login`

---

### 3.2 Yönetici paneli (issue #14)
**Rol:** ADMIN · **Çerçeve:** masaüstü (telefon düşük öncelik)

**Menü:** Genel bakış · Kullanıcılar · Departmanlar · Raporlar · Audit log · Acil durum · Sistem ayarları

**a) Genel bakış**
- KPI kartları: **içerideki çalışan**, **içerideki ziyaretçi**, bugünkü ziyaret sayısı, bekleyen kargo, bugünkü rezervasyon
- Grafik 1: saatlik yoğunluk (çubuk)
- Grafik 2: günlük ziyaretçi sayısı (çizgi, son 14 gün)
- “Son işlemler” kısa listesi (audit log'dan 5 satır)
- Tarih aralığı seçici

**b) Kullanıcılar** — tablo (ad, e-posta, departman, roller, durum) + arama + filtre (departman, durum) + sayfalama; **Yeni kullanıcı** butonu; satır eylemleri: düzenle, rolleri düzenle, pasife al.
- *Kullanıcı formu (panel/modal):* e-posta, ad, soyad, telefon, departman, rol(ler) (çoklu seçim), geçici parola.
- *Onay penceresi:* “Pasife al” (açıklamalı); kendi `ADMIN` rolünü kaldırma denemesinde **uyarı durumu**.

**c) Departmanlar** — liste (ad, yönetici, üye sayısı, durum) + yeni/düzenle formu + yönetici atama seçimi + üyeler listesi.

**d) Raporlar** — rapor türü seçimi (ziyaretçi, devam, kargo, rezervasyon), tarih aralığı, departman filtresi, **önizleme tablosu**, **Excel / PDF indir** butonları.

**e) Audit log** — tablo (zaman, kullanıcı, eylem, kaynak, IP) + filtre (kullanıcı, eylem türü, tarih aralığı) + satır detayı paneli (gerekçe, ek bilgi).

**f) Acil durum (P1)** — görünür **sorumluluk reddi bandı** (“Bu modül fiziksel alarm/sensör/turnikeye bağlı değildir…”), **Acil durum başlat** (tehlikeli buton + onay), durum: içeride görünen kişi listesi (ad, tür, durum: kontrol edildi / tahliye edildi / henüz doğrulanmadı), **Olayı sonlandır**, olay raporu.

**API:** `GET/POST/PATCH /users`, `PUT /users/:id/roles`, `GET/POST/PATCH /departments`, `PUT /departments/:id/manager`, rapor ve audit uç noktaları (Hafta 6).

---

### 3.3 Resepsiyon (issue #15)
**Rol:** RECEPTION (+ ADMIN) · **Çerçeve:** tablet yatay ve masaüstü

**Menü:** Bugünkü ziyaretler · QR tarama · Davetsiz kayıt · Kargo

**a) Bugünkü ziyaretler**
- Tablo/kart listesi: ziyaretçi adı, şirket, ev sahibi, planlanan saat, **durum rozeti**, hızlı eylem (**Giriş**, **Çıkış**)
- Üstte arama + durum sekmeleri (Tümü / Bekleyenler / İçeridekiler / Ayrılanlar)
- Satıra tıklayınca **ziyaret detayı:** bilgiler, zaman çizelgesi (davet, giriş, çıkış), tarama kayıtları

**b) QR tarama**
- Büyük kamera alanı + **elle QR kodu girme** alanı (kamera çalışmazsa)
- Tür seçici: **Giriş / Çıkış**
- **Sonuç paneli** (ayrı çerçeveler):
  - ✔ Başarılı: ziyaretçi adı, şirket, ev sahibi, “Giriş kaydedildi”
  - ✖ Reddedilen: **süresi doldu / henüz geçerli değil / iptal edilmiş / daha önce kullanıldı / geçersiz QR / geçersiz sıra**, her biri için kısa, anlaşılır mesaj ve “Ne yapmalı?” yönlendirmesi
- Reddedilen sonuçta **Manuel işlem** butonu

**c) Manuel işlem (modal)**
- Ziyaret seçimi, işlem (Giriş/Çıkış), **gerekçe (zorunlu, en az 10 karakter)**, kimlik kontrolü yapıldı onay kutusu, **Kaydet**
- Altta bilgi notu: “Bu işlem denetim kaydına yazılır.”

**d) Davetsiz kayıt** — form: ad soyad, şirket, telefon, ev sahibi (aramalı seçim), amaç; “Doğrudan giriş yap” seçeneği.

**e) Kargo**
- *Bekleyen kargolar* listesi (alıcı, zaman, açıklama, durum) + arama
- *Yeni kargo formu:* alıcı (çalışan seçimi), açıklama, geliş zamanı
- *Teslim modalı:* teslim alan kişi adı, zaman, **Teslim et**; ayrıca iade/iptal eylemi

**API:** `GET /reception/today`, `POST /reception/scan`, `POST /reception/manual`, `POST /reception/walk-ins`, kargo uç noktaları (Hafta 5).

---

### 3.4 Ziyaretçi kiosk (issue #15)
**Rol:** ziyaretçi (oturumsuz) · **Çerçeve:** tablet yatay **1024×768**

Büyük yazı, büyük dokunmatik butonlar, **her ekranda tek ana eylem**, **60 saniye hareketsizlikte başa dönme** (geri sayım uyarısı).

| # | Ekran | İçerik |
|---|---|---|
| 1 | Karşılama | Logo, “Hoş geldiniz”, iki büyük buton: **Davetim var** / **Davetim yok**, dil seçici |
| 2 | Davet sorgulama | Kamera alanı (QR göster), geri butonu |
| 3 | Davet sonucu | “Merhaba Mehmet K.”, ev sahibi (Ayşe D.), saat; “Lütfen **resepsiyona** ilerleyin.” (kiosk giriş yapmaz) |
| 4 | Kayıt – bilgiler | Ad soyad, şirket, telefon, amaç (adım göstergesi 1/4) |
| 5 | Kayıt – ev sahibi | Arama kutusu, sonuç listesi (**yalnızca ad ve departman**) (2/4) |
| 6 | Kayıt – bilgilendirme | **KVKK aydınlatma metni** ve **İSG bilgilendirmesi** (kaydırılabilir), onay kutuları (ayrı ayrı), sürüm bilgisi (3/4) |
| 7 | Kayıt – özet | Girilen bilgiler, **Kaydı tamamla** (4/4) |
| 8 | Tamamlandı | “Kaydınız alındı, lütfen resepsiyona başvurun.”, otomatik başa dönüş geri sayımı |
| 9 | Hata/uyarılar | QR bulunamadı, ağ hatası, çok fazla deneme (hız sınırı), zorunlu onay eksik |

**API:** `GET /kiosk/notices`, `GET /kiosk/hosts`, `POST /kiosk/walk-ins`, `POST /kiosk/invitations/lookup`

---

### 3.5 Çalışan portalı (issue #15)
**Rol:** EMPLOYEE (ve diğer roller kendi verileri için) · **Çerçeve:** **telefon öncelikli**, masaüstü uyumlu

**Menü / alt sekmeler:** Ana sayfa · Davetlerim · Devamım · Rezervasyon · Diğer (İzin, Kargolarım, Bildirimler, Profil)

**a) Ana sayfa** — bugünün özeti: devam durumu (içeride/dışarıda) + **Giriş/Çıkış QR tara** butonu; yaklaşan ziyaretçilerim; kargolarım (bekleyen sayı); bugünkü rezervasyonlarım; son bildirimler.

**b) Davet oluştur (form)** — ziyaretçi adı, e-posta, telefon, şirket, amaç, başlangıç ve bitiş zamanı, **Davet gönder**. Hata durumları: geçmiş tarih, bitiş başlangıçtan önce, e-posta biçimi.

**c) Davetlerim** — liste (ziyaretçi, zaman, durum rozeti) + filtre; detayda **İptal et** (onay + isteğe bağlı gerekçe) ve **Yeniden gönder** (yalnızca `PLANNED`); geçmiş ziyaretler sekmesi.

**d) Devamım** — **QR tara** butonu (kamera), konum izni uyarısı ve konum alınamadığında **alternatif yönlendirme** (“Resepsiyona başvurun”), kayıt tablosu (tarih, giriş, çıkış, çalışma süresi), satırdan **Düzeltme talebi** (eski/yeni değer, gerekçe), talep durumu.

**e) İzin talepleri** — **Yeni talep** (başlangıç, bitiş, açıklama), talep geçmişi (durum rozeti, yönetici notu).

**f) Rezervasyon** — oda/masa seçimi sekmesi, **takvim görünümü** (gün/hafta, dolu saatler kapalı), filtre (kapasite, ekipman), rezervasyon formu (oda, tarih, başlangıç-bitiş, konu), **çakışma hata durumu**, “Rezervasyonlarım” listesi, **İptal** ve **`.ics` indir**.

**g) Kargolarım** — liste (gönderen/açıklama, geliş zamanı, durum).

**h) Bildirimler** — liste (okundu/okunmadı), **tümünü okundu işaretle**, tercih bağlantısı (P2).

**i) Profil ve oturumlar** — ad/telefon düzenleme, parola değiştirme (P1), **açık oturumlar** listesi (cihaz, IP, zaman) + **Sonlandır**.

**API:** `POST/GET /visits`, `POST /visits/:id/cancel|resend`, devam, izin, rezervasyon, kargo, bildirim uç noktaları (Hafta 4-5), `GET /auth/sessions`.

---

### 3.6 Departman yöneticisi (ek ekranlar, düşük öncelik)
**Rol:** DEPT_MANAGER · Çalışan portalına ek olarak üç sekme:

- **Ekibim:** departman üyeleri tablosu (ad, durum); ziyaretçi bilgisinde yalnızca ad/şirket
- **Onay bekleyenler:** izin ve düzeltme talepleri listesi, her satırda **Onayla / Reddet** (red için gerekçe alanı); kendi talebinde onay butonu **yok**
- **Departman raporları:** devam ve ziyaretçi özeti, tarih aralığı, Excel/PDF

## 4. Çizim sırası ve süre

| Sıra | İş | Süre |
|---|---|---|
| 1 | Ortak bileşenler (Bölüm 2) | ~1 saat |
| 2 | Giriş (+ hata durumları) | ~20 dk |
| 3 | Çalışan portalı, telefon: ana sayfa, davet, devam | ~1 saat |
| 4 | Resepsiyon: ziyaretler, QR tarama + sonuçlar, manuel işlem | ~1 saat |
| 5 | Kiosk: 9 ekran | ~45 dk |
| 6 | Admin: genel bakış, kullanıcılar (diğerleri aynı tablo kalıbı) | ~45 dk |
| 7 | Yönetici ekranları ve kalanlar | gerektiğinde |

**Tamamlanma ölçütü (issue #14 ve #15):** Beş temel ekran için kutu seviyesinde çizim, durum varyantlarıyla birlikte; Stitch proje bağlantıları README'de.

## 5. Tasarım düzeni (Google Stitch)

Figma aktarımı teknik hata nedeniyle yapılamadığı için tasarımlar Google Stitch üzerinden paylaşılır.

- **Mobil (Çalışan Portalı):** https://stitch.withgoogle.com/projects/16392963363715010478
- **Web (Resepsiyon, Kiosk, Admin):** https://stitch.withgoogle.com/projects/5439068229676821256
- Ekran adları `Giriş / Hata – Kilit`, `Resepsiyon / QR – Başarılı`, `Kiosk / 6 Bilgilendirme` biçiminde verilir
- Paylaşım: bağlantılar `README.md` ve ilgili issue'lara eklenir; ekip üyelerinin projeye erişebildiği kontrol edilir (veriler sentetik de olsa)
- Figma'ya aktarım ileride yapılırsa sayfa düzeni: `00 Bileşenler`, `01 Giriş`, `02 Admin`, `03 Resepsiyon`, `04 Kiosk`, `05 Çalışan`, `06 Yönetici`
