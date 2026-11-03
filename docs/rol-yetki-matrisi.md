# Smart Office (AOS) – Rol-Yetki Matrisi

**Belge türü:** Taslak  
**Proje:** Smart Office – Akıllı Ofis Yönetim Sistemi  
**Amaç:** Hafta 2'de geliştirilecek RBAC (Role-Based Access Control), `requireRole` middleware'i ve kaynak sahipliği/kapsam kontrolleri için ortak yetki kurallarını tanımlamak.

> **Onay notu:** Bu belge geliştirme başlangıcı için taslaktır. Bölüm 9'daki açık kararlar ekip tarafından Hafta 2 başında onaylanmalıdır. Onaylanmamış varsayımlar doğrudan üretim kuralı kabul edilmemelidir.

---

## 1. Temel güvenlik ilkeleri

1. **Varsayılan reddet (deny by default):** Açıkça izin verilmeyen her işlem reddedilir.
2. **Kimlik doğrulama ve yetkilendirme ayrıdır:** Önce kullanıcının kimliği doğrulanır; ardından rol, işlem ve kaynak kapsamı kontrol edilir.
3. **Rol tek başına yeterli değildir:** Kullanıcının bir işlemi yapabilmesi için hem gerekli role hem de ilgili kaynak üzerinde yeterli kapsama sahip olması gerekir.
4. **Kaynak sahipliği sunucuda doğrulanır:** İstemciden gelen `userId`, `departmentId` veya benzeri alanlara güvenilmez. İlişkiler veritabanından doğrulanır.
5. **En az ayrıcalık:** Her rol yalnızca işini yapması için gereken minimum yetkiye sahip olur.
6. **Hassas işlemler kayıt altına alınır:** Rol değişikliği, kullanıcı pasifleştirme, ziyaretçi girişi/çıkışı, QR üretme/iptal etme ve benzeri işlemler audit log'a yazılır.
7. **Yetkisiz kaynak erişiminde bilgi sızdırılmaz:** Kaynak varlığının anlaşılmasını önlemek gereken uç noktalarda `404` kullanılabilir. Kimlik doğrulama gerektiren genel durumlarda `401`, kimliği doğrulanmış ancak yetkisiz kullanıcıda `403` kullanılır.

## 2. Roller ve kapsam tanımları

| Rol | Açıklama | Varsayılan kapsam |
|---|---|---|
| `ADMIN` | Sistem yöneticisi; kullanıcı, rol ve sistem yönetimi | Tüm sistem |
| `DEPT_MANAGER` | Kendi departmanının operasyonlarını yöneten kullanıcı | Kendi departmanı |
| `EMPLOYEE` | Standart çalışan | Kendi kayıtları |
| `RECEPTION` | Resepsiyon ve ziyaretçi süreçlerini yürüten kullanıcı | Resepsiyon işlemleri; gerekli ziyaretçi kayıtları |
| `VISITOR` | Sistemde kullanıcı hesabı bulunmayan ziyaretçi | Yalnızca açıkça tanımlanmış kiosk/QR işlemleri |

`VISITOR` bir uygulama rolü gibi listelenmiş olsa da normal kullanıcı hesabı ve oturumu yoktur. Ziyaretçi işlemleri sınırlı, ayrı kiosk/QR kurallarıyla korunur.

### 2.1 Kapsam seviyeleri

- **`SELF`:** Kullanıcının kendisine ait kayıtlar.
- **`DEPARTMENT`:** Kullanıcının bağlı olduğu departmana ait kayıtlar.
- **`ALL`:** Sistem genelindeki kayıtlar.
- **`OPERATIONAL`:** Resepsiyonun görevini yerine getirmesi için gereken sınırlı operasyonel kayıtlar. Bu kapsam, tüm kullanıcı verilerine genel erişim anlamına gelmez.
- **`PUBLIC_KIOSK`:** Kimlik doğrulamasız kullanılabilen, yalnızca açıkça izin verilmiş kiosk işlemleri.

## 3. Yetki matrisi

Aşağıdaki tablo başlangıç yetki taslağıdır. “Kapsamlı” ifadesi, ilgili kapsam kontrolünün ayrıca uygulanması gerektiğini belirtir.

| Kaynak / İşlem | `ADMIN` | `DEPT_MANAGER` | `EMPLOYEE` | `RECEPTION` | `VISITOR` |
|---|---|---|---|---|---|
| Kullanıcı listesini görüntüleme | Tümü | Kendi departmanı | Hayır | Sınırlı operasyonel | Hayır |
| Kullanıcı detayını görüntüleme | Tümü | Kendi departmanı | Kendi kaydı | Görev için gerekli sınırlı alanlar | Hayır |
| Kullanıcı oluşturma | Evet | Hayır* | Hayır | Hayır | Hayır |
| Kullanıcı bilgisi güncelleme | Tümü | Kendi departmanında izin verilen alanlar* | Kendi izin verilen alanları | Hayır | Hayır |
| Kullanıcıyı pasifleştirme | Evet** | Hayır | Hayır | Hayır | Hayır |
| Rol atama/değiştirme | Evet** | Hayır | Hayır | Hayır | Hayır |
| Departmanları görüntüleme | Tümü | Kendi departmanı / gerekli liste | Gerekli sınırlı liste | Gerekli sınırlı liste | Hayır |
| Departman oluşturma/güncelleme | Evet | Hayır | Hayır | Hayır | Hayır |
| Kendi izin talebini oluşturma | Evet | Evet | Evet | Evet | Hayır |
| Kendi izin talebini görüntüleme | Tümü | Kendi kaydı | Kendi kaydı | Kendi kaydı | Hayır |
| Departman izin taleplerini görüntüleme | Tümü | Kendi departmanı | Hayır | Hayır | Hayır |
| İzin talebini onaylama/reddetme | Evet | Kendi departmanı*** | Hayır | Hayır | Hayır |
| Ziyaretçi kaydı oluşturma | Evet | Hayır | Hayır | Evet | Hayır |
| Ziyaretçi kayıtlarını görüntüleme | Tümü | Kendi departmanıyla ilgili kayıtlar* | Kendi davet/ilişkili kayıtları* | Operasyonel kapsam | Hayır |
| Ziyaretçi kaydını güncelleme/iptal | Evet | Kendi departmanıyla ilgili kayıtlar* | Kendi oluşturduğu kayıtlar* | Operasyonel kapsam | Hayır |
| QR üretme | Evet | İzin verilen ziyaret/işlem için* | Kendi yetkili işlemi için* | Ziyaretçi operasyonu için | Hayır |
| QR iptal etme | Tümü | Kendi kapsamındaki QR* | Kendi QR'ı* | Operasyonel kapsam* | Hayır |
| QR tarama/doğrulama | Evet**** | İzin verilen akış* | İzin verilen akış* | Evet | Sadece kendisine verilen QR ile |
| Kiosk sorgusu | Evet | Hayır | Hayır | Hayır | Sınırlı |
| Audit log görüntüleme | Tümü | Hayır* | Hayır | Hayır | Hayır |
| Sistem ayarlarını yönetme | Evet | Hayır | Hayır | Hayır | Hayır |

**Notlar**

- `*` İş kuralı ve veri modeli netleştirildikten sonra kapsamı kesinleştirilecektir.
- `**` Son aktif `ADMIN` hesabının pasifleştirilmesi veya rolünün kaldırılması engellenir. Yönetici rolü değişikliği audit log'a yazılır.
- `***` Departman yöneticisi kendi izin talebini onaylayamaz. Kendi talebinin onayı yalnızca `ADMIN` tarafından yapılabilir.
- `****` `ADMIN` rolünün QR tarama yapabilmesi önerilir; işlem audit log'a kaydedilmelidir. Ekip onayı Bölüm 9'dadır.

## 4. Çoklu rol davranışı

Bir kullanıcı birden fazla role sahip olabilir. Örneğin resepsiyon görevlisi aynı zamanda çalışan olabilir.

- Etkin yetkiler, atanmış rollerin izinlerinin **birleşimi** olarak hesaplanır.
- Birleşim, kaynak kapsamı kontrollerini devre dışı bırakmaz.
- Bir rolün `ALL` kapsamı yoksa başka bir rolün varlığı otomatik olarak `ALL` kapsamı sağlamaz.
- Çakışan veya hassas işlemlerde açık iş kuralı uygulanır; özellikle onaylayan kişinin talep sahibi olması engellenir.
- Rol atama ve kaldırma yalnızca `ADMIN` tarafından yapılır.

## 5. `requireRole` ve kaynak sahipliği kontrolleri

Yetkilendirme iki aşamada uygulanmalıdır:

### 5.1 Rol kontrolü

`requireRole(...allowedRoles)` kullanıcının oturumunda bulunan rollerden en az birinin uç nokta için izinli olup olmadığını kontrol eder.

Örnek sözde kullanım:

```js
router.get(
  "/users",
  authenticate,
  requireRole("ADMIN", "DEPT_MANAGER"),
  userController.list
);
```

Bu kontrol tek başına yeterli değildir. Kontrol yalnızca kullanıcının ilgili işlem sınıfına aday olup olmadığını belirler.

### 5.2 Kaynak kapsamı / sahiplik kontrolü

İşlem yapılan kaydın kullanıcıya ait olup olmadığı veya kullanıcının departman kapsamına girip girmediği ayrıca doğrulanır.

Örnek kurallar:

- Çalışan yalnızca kendi profilini ve kendi izin taleplerini okuyabilir.
- Departman yöneticisi yalnızca kendi departmanına bağlı kayıtları yönetebilir.
- Resepsiyon görevlisi yalnızca ziyaretçi operasyonu için gerekli alanlara erişebilir.
- `ADMIN` sistem genelinde erişebilir; hassas işlemleri audit log'a yazılır.
- İstemcinin gönderdiği `departmentId` veya `ownerId` tek başına yetki kanıtı değildir.

Örnek sözde kod:

```js
const request = await prisma.leaveRequest.findUnique({
  where: { id: req.params.id },
  select: { id: true, userId: true, departmentId: true }
});

if (!request) {
  return res.status(404).json({ code: "NOT_FOUND" });
}

const isOwner = request.userId === req.user.id;
const isDepartmentManager =
  req.user.roles.includes("DEPT_MANAGER") &&
  request.departmentId === req.user.departmentId;
const isAdmin = req.user.roles.includes("ADMIN");

if (!isOwner && !isDepartmentManager && !isAdmin) {
  return res.status(404).json({ code: "NOT_FOUND" });
}
```

Bu örnek açıklama amaçlıdır; gerçek kodda rol birleştirme, departman üyeliği, işlem türü ve özel iş kuralları merkezi bir policy/service katmanında uygulanmalıdır.

## 6. Özel güvenlik kuralları

### 6.1 İzin onayı

- Kullanıcı kendi talebini onaylayamaz veya reddedemez.
- Departman yöneticisi yalnızca kendi departmanındaki uygun talepleri değerlendirebilir.
- Departman yöneticisinin kendi talebini yalnızca `ADMIN` değerlendirebilir.
- Her karar; karar veren kullanıcı, tarih, önceki durum ve yeni durum bilgileriyle kaydedilir.

### 6.2 Son ADMIN koruması

- Sistem genelinde en az bir aktif `ADMIN` bulunmalıdır.
- Son aktif `ADMIN` pasifleştirilemez.
- Son aktif `ADMIN` rolünü kaldıramaz veya başka bir role düşürülemez.
- Kontrol veritabanı işlemi içinde atomik şekilde yapılmalıdır; eşzamanlı istekler bu kuralı aşamamalıdır.

### 6.3 Kiosk ve ziyaretçi

- Ziyaretçinin normal kullanıcı hesabı bulunmaz.
- Kiosk uç noktaları yalnızca açıkça tanımlanmış sınırlı işlemleri sunar.
- Kiosk isteklerinde cihaz anahtarı, hız sınırı ve girdi doğrulaması zorunludur.
- Cihaz anahtarı istemci tarafındaki kaynak koduna gömülmemeli; sunucu ortam değişkeni veya güvenli secret yönetimi üzerinden sağlanmalıdır.
- Kiosk yanıtları gereksiz kişisel veri içermemelidir.
- Kiosk akışının QR ile giriş kaydı oluşturup oluşturmayacağı Bölüm 9'da ekip kararı gerektirir.

### 6.4 QR güvenliği

- QR içinde kişisel veri veya tahmin edilebilir kayıt kimliği bulunmamalıdır.
- Önerilen biçim: `aos1.<tokenId>.<secret>`.
- Veritabanında `secret` değerinin kendisi değil, güvenli özeti saklanmalıdır.
- QR tek kullanımlık olmalı; kullanım/iptal işlemi atomik gerçekleştirilmelidir.
- Süresi dolmuş, kullanılmış veya iptal edilmiş QR ayrı hata kodlarıyla ele alınmalıdır.
- QR tarama ve doğrulama işlemleri audit log'a yazılmalıdır.

## 7. API yanıt ve hata davranışı

| Durum | HTTP | Örnek hata kodu |
|---|---:|---|
| Oturum yok/geçersiz | 401 | `UNAUTHENTICATED` |
| Rol veya işlem izni yok | 403 | `FORBIDDEN` |
| Kaynak yok veya erişim varlığını gizlemek gerekiyor | 404 | `NOT_FOUND` |
| İstek doğrulaması başarısız | 400 | `VALIDATION_ERROR` |
| Kaynak durumu işlem için uygun değil | 409 | `CONFLICT` |
| Hız sınırı aşıldı | 429 | `RATE_LIMITED` |

Kaynak varlığını gizlemek için 404 kullanımı tutarlı bir politika olmalıdır; aynı uç noktada benzer erişim senaryoları farklı yanıtlarla kaynak bilgisi sızdırmamalıdır.

## 8. Uygulama notları

- Rol adları kodda sabit ve merkezi tanımlanmalıdır.
- Yetki eşlemesi başlangıç sürümünde `permissions.js` gibi tek bir modülde tutulabilir.
- Her route için kimlik doğrulama, rol kontrolü ve gerekiyorsa kaynak kapsamı kontrolü açıkça tanımlanmalıdır.
- Controller içinde dağınık rol kontrolleri yerine policy/service fonksiyonları tercih edilmelidir.
- Audit log kayıtları istemci tarafından oluşturulmamalı; sunucu tarafından yazılmalıdır.
- Testlerde olumlu senaryoların yanında rol dışı erişim, başka departman kaydı, başka kullanıcı kaydı, kendi talebini onaylama ve son ADMIN koruması da doğrulanmalıdır.

Önerilen başlangıç testleri:

1. Oturumsuz istek korumalı endpoint'e erişemez.
2. Çalışan başka çalışanın profilini okuyamaz.
3. Departman yöneticisi başka departmanın kaydına erişemez.
4. Resepsiyon görevlisi yönetim endpoint'ine erişemez.
5. Kullanıcı kendi izin talebini onaylayamaz.
6. Son aktif ADMIN pasifleştirilemez.
7. Süresi dolmuş/kullanılmış/iptal edilmiş QR tekrar kullanılamaz.
8. Kiosk cihaz anahtarı olmadan kiosk endpoint'i kullanılamaz.
9. Çoklu rol birleşimi kapsam kontrollerini atlayamaz.

## 9. Ekip tarafından onaylanacak açık kararlar

Aşağıdaki maddeler geliştirme başlamadan önce ekip ve danışmanla netleştirilmelidir.

| No | Açık karar | Öneri | Etkilediği alan |
|---:|---|---|---|
| 1 | Kiosk cihaz anahtarı nasıl saklanacak? | Sunucu ortam değişkeni/secret yönetimi; anahtar istemci koduna gömülmemeli | Kiosk middleware, deployment |
| 2 | `ADMIN` QR taraması yapabilecek mi? | Evet; her tarama audit log'a yazılmalı | QR endpoint yetkisi, audit |
| 3 | Departman yöneticisi çalışan oluşturabilecek veya çalışan bilgisi güncelleyebilecek mi? | İlk sürümde hayır; yalnızca kendi departmanındaki izin/operasyon süreçleri | Kullanıcı yönetimi, RBAC |
| 4 | Kiosk QR taraması doğrudan giriş kaydı oluşturacak mı? | Hayır; resepsiyon kimlik kontrolüyle giriş kaydı oluşturmalı. Farklı akış istenirse ek güvenlik gerekir | Ziyaretçi akışı, QR |
| 5 | Resepsiyon hangi ziyaretçi verilerini görebilecek? | Yalnızca ziyaretçi kabulü için gerekli asgari alanlar | API response alanları, gizlilik |

## 10. Değişiklik geçmişi

| Sürüm | Tarih | Açıklama |
|---|---|---|
| 0.1 | 2026-10-31 | İlk RBAC ve kaynak kapsamı taslağı |
| 0.2 | 2026-11-03 | Rol adları Prisma/seed ile eşitlendi: `RECEPTION`, `DEPT_MANAGER` |

---

**Onay:** Bu belge ekip tarafından gözden geçirildikten sonra yetki matrisi ve Bölüm 9 kararları kesinleştirilmelidir.
