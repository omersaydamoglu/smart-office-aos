# Smart Office (AOS) – API Sözleşmesi

**Belge türü:** Taslak  
**Sürüm:** 0.1  
**Proje:** Smart Office – Akıllı Ofis Yönetim Sistemi  
**Kapsam:** Hafta 2 (kimlik doğrulama, kullanıcı, departman, izin) ve Hafta 3 (ziyaretçi, QR, kiosk)  
**İlgili belge:** [`docs/rol-yetki-matrisi.md`](../rol-yetki-matrisi.md)

> **Önemli:** Bu belge geliştirme ve frontend mock verileri için başlangıç sözleşmesidir. Endpoint adları, alanlar ve durum geçişleri ekipçe onaylanmalıdır. Mevcut Prisma şemasıyla uyuşmayan alanlar uygulama öncesinde şemaya göre eşitlenmelidir. Bu taslak tek başına API'nin tamamının geliştirildiği anlamına gelmez.

---

## 1. Genel kurallar

### 1.1 Temel URL ve sürümleme

Yerel geliştirme temel adresi:

```text
http://localhost:3000/api
```

Bu taslakta sürüm yolu kullanılmamıştır. API kararlı hale geldiğinde `/api/v1` sürümlemesine geçilmesi değerlendirilebilir. Frontend, temel URL'yi ortam değişkeninden almalıdır.

Örnek:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 1.2 İstek ve yanıt biçimi

- İstek gövdeleri JSON olmalıdır: `Content-Type: application/json`.
- Başarılı yanıtlar JSON döndürmelidir.
- Tarih-saat alanları ISO 8601 ve UTC biçiminde taşınmalıdır; arayüz yerel saate dönüştürebilir.
- Kimlik alanları string olarak taşınmalıdır.
- İstemci tarafından gönderilen rol, sahiplik veya departman bilgileri yetki kanıtı kabul edilmemelidir.
- Liste endpoint'leri sayfalama kullanmalıdır.

### 1.3 Standart liste biçimi

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Sorgu parametreleri:

| Parametre | Tür | Varsayılan | Açıklama |
|---|---|---:|---|
| `page` | integer | 1 | 1'den başlayan sayfa |
| `limit` | integer | 20 | Sayfa boyutu; sunucu üst sınır uygular |
| `search` | string | - | Desteklenen alanlarda arama |
| `sortBy` | string | kaynağa göre | İzin verilen sıralama alanı |
| `sortOrder` | `asc` / `desc` | `desc` | Sıralama yönü |

Sunucu, izin verilmeyen `sortBy` alanlarını reddetmeli veya güvenli varsayılan kullanmalıdır.

---

## 2. Kimlik doğrulama ve oturum

### 2.1 Token yaklaşımı

- Access token ömrü önerisi: **15 dakika**.
- Access token istemci tarafında yalnızca bellekte tutulur; `localStorage` veya `sessionStorage` içine yazılmaz.
- Refresh token `HttpOnly`, `Secure` (HTTPS ortamında) ve uygun `SameSite` ayarlı cookie içinde tutulur.
- Frontend cookie kullanan isteklerde `credentials: "include"` ayarını kullanır.
- Cookie tabanlı refresh/logout işlemleri CSRF ve origin kontrolleriyle korunmalıdır.
- Access token doğrulaması sunucu tarafında yapılır. Rol ve departman bilgileri güncel yetki kontrolünün yerine geçmez.

### 2.2 `POST /auth/login`

Kullanıcı girişi.

**Erişim:** Herkese açık; hız sınırı uygulanır.

İstek:

```json
{
  "email": "admin@smartoffice.test",
  "password": "example-password"
}
```

Başarılı yanıt (`200`):

```json
{
  "data": {
    "accessToken": "<access-token>",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "user-id",
      "email": "admin@smartoffice.test",
      "fullName": "System Admin",
      "roles": ["ADMIN"],
      "departmentId": null
    }
  }
}
```

Refresh token response JSON içinde dönmez; HttpOnly cookie olarak ayarlanır. Gerçek parola veya token loglara yazılmaz.

### 2.3 `POST /auth/refresh`

Refresh cookie kullanılarak yeni access token üretir. Refresh token rotation uygulanması önerilir.

**Erişim:** Geçerli refresh cookie; CSRF/origin kontrolleri.

Başarılı yanıt (`200`):

```json
{
  "data": {
    "accessToken": "<new-access-token>",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

Refresh cookie yenilenir. Geçersiz, süresi dolmuş veya tekrar kullanılmış refresh token için `401` döner ve oturum sonlandırılır.

### 2.4 `POST /auth/logout`

Refresh oturumunu iptal eder ve refresh cookie'yi temizler.

**Erişim:** Oturum gerektirir.

Başarılı yanıt (`200`):

```json
{
  "data": {
    "message": "Oturum kapatıldı."
  }
}
```

### 2.5 `GET /auth/me`

Giriş yapan kullanıcının güncel profilini ve rollerini döndürür.

**Erişim:** Giriş yapmış kullanıcı.

Yanıt (`200`):

```json
{
  "data": {
    "id": "user-id",
    "email": "employee@smartoffice.test",
    "fullName": "Example Employee",
    "roles": ["EMPLOYEE"],
    "department": {
      "id": "department-id",
      "name": "Human Resources"
    }
  }
}
```

---

## 3. Kullanıcı yönetimi

### 3.1 `GET /users`

Kullanıcıları sayfalı listeler.

**Erişim:** `ADMIN`; `DEPT_MANAGER` yalnızca kendi departmanındaki kullanıcılar için. Resepsiyonun erişimi matriste belirtilen sınırlı operasyonel alanlarla kısıtlıdır.

Örnek yanıt (`200`):

```json
{
  "data": [
    {
      "id": "user-id",
      "fullName": "Example Employee",
      "email": "employee@smartoffice.test",
      "isActive": true,
      "roles": ["EMPLOYEE"],
      "department": {
        "id": "department-id",
        "name": "Human Resources"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 3.2 `GET /users/:id`

Kullanıcı detayını döndürür.

**Erişim:** `ADMIN`; departman yöneticisi kendi departmanında; çalışan yalnızca kendi kaydında. Resepsiyon yalnızca görev için gereken alanları görür.

### 3.3 `POST /users`

Kullanıcı oluşturur.

**Erişim:** İlk sürüm önerisi `ADMIN` בלבד.

İstek:

```json
{
  "fullName": "Example Employee",
  "email": "employee@smartoffice.test",
  "password": "temporary-password",
  "departmentId": "department-id",
  "roles": ["EMPLOYEE"]
}
```

Yanıt (`201`):

```json
{
  "data": {
    "id": "new-user-id",
    "fullName": "Example Employee",
    "email": "employee@smartoffice.test",
    "isActive": true,
    "roles": ["EMPLOYEE"],
    "departmentId": "department-id"
  }
}
```

Parola yanıt içinde hiçbir zaman dönmez. Parola saklama ve ilk girişte değiştirme politikası backend tarafından uygulanmalıdır.

### 3.4 `PATCH /users/:id`

Kullanıcının izin verilen profil alanlarını günceller.

**Erişim:** `ADMIN`; kullanıcı kendi izin verilen profil alanlarını; departman yöneticisi yalnızca ekipçe onaylanmış alanları kendi departmanında güncelleyebilir.

Örnek istek:

```json
{
  "fullName": "Updated Name"
}
```

İstemci bu endpoint üzerinden rol veya ayrıcalık yükseltemez.

### 3.5 `PATCH /users/:id/status`

Kullanıcıyı aktif/pasif yapar.

**Erişim:** `ADMIN`.

İstek:

```json
{
  "isActive": false
}
```

Son aktif `ADMIN` hesabı pasifleştirilemez. Kontrol eşzamanlı isteklerde de atomik olmalıdır.

### 3.6 `PUT /users/:id/roles`

Kullanıcının rollerini değiştirir.

**Erişim:** `ADMIN`.

İstek:

```json
{
  "roles": ["EMPLOYEE", "RECEPTION"]
}
```

Rol değişikliği audit log'a yazılır. Son aktif `ADMIN` rolünün kaldırılması engellenir.

---

## 4. Departman yönetimi

### 4.1 `GET /departments`

Departmanları listeler.

**Erişim:** `ADMIN`; diğer roller yalnızca işlerini yapmak için gereken departman bilgilerini görür.

### 4.2 `GET /departments/:id`

Departman detayını döndürür.

**Erişim:** `ADMIN`; departman yöneticisi kendi departmanında; diğer kullanıcılar yalnızca açıkça izin verilen sınırlı alanlarda.

### 4.3 `POST /departments`

Departman oluşturur.

**Erişim:** `ADMIN`.

İstek:

```json
{
  "name": "Human Resources",
  "description": "Human resources department"
}
```

### 4.4 `PATCH /departments/:id`

Departman bilgilerini günceller.

**Erişim:** `ADMIN`.

### 4.5 `GET /departments/:id/users`

Departman çalışanlarını sayfalı listeler.

**Erişim:** `ADMIN`; ilgili departmanın `DEPT_MANAGER` rolü.

---

## 5. İzin talepleri

> Bu bölüm, rol-yetki matrisindeki izin onayı kurallarıyla birlikte uygulanmalıdır. Mevcut veri modelindeki izin türü, tarih ve durum alanları Prisma şemasıyla eşitlenmelidir.

### 5.1 `POST /leave-requests`

Giriş yapan kullanıcı kendi adına izin talebi oluşturur.

**Erişim:** `ADMIN`, `DEPT_MANAGER`, `EMPLOYEE`, `RECEPTION`.

İstek:

```json
{
  "startDate": "2026-11-10",
  "endDate": "2026-11-12",
  "type": "ANNUAL",
  "reason": "Personal leave"
}
```

Yanıt (`201`):

```json
{
  "data": {
    "id": "leave-request-id",
    "status": "PENDING",
    "startDate": "2026-11-10",
    "endDate": "2026-11-12",
    "type": "ANNUAL",
    "reason": "Personal leave"
  }
}
```

Talep sahibi kullanıcı kimliği token'dan alınır; body içindeki `userId` dikkate alınmaz.

### 5.2 `GET /leave-requests`

İzin taleplerini listeler.

**Erişim:** Kullanıcı kendi taleplerini; departman yöneticisi kendi departmanındaki talepleri; `ADMIN` tüm talepleri görür.

### 5.3 `GET /leave-requests/:id`

Tek bir izin talebini görüntüler. Kaynak sahipliği ve departman kapsamı kontrol edilir.

### 5.4 `POST /leave-requests/:id/approve`

İzin talebini onaylar.

**Erişim:** `ADMIN` veya kendi departmanındaki uygun talepler için `DEPT_MANAGER`.

İstek:

```json
{
  "comment": "Approved"
}
```

Talep sahibi kendi talebini onaylayamaz. Departman yöneticisi kendi talebini yalnızca `ADMIN` onaylayabilir.

### 5.5 `POST /leave-requests/:id/reject`

İzin talebini reddeder. Onay endpoint'iyle aynı rol, kapsam ve kendi talebini değerlendirememe kuralları uygulanır.

İstek:

```json
{
  "comment": "Insufficient information"
}
```

### 5.6 `POST /leave-requests/:id/cancel`

Kullanıcı kendi talebini, yalnızca iş akışının izin verdiği durumlarda iptal edebilir. İptal edilmiş veya sonuçlanmış talepler için durum geçişi kuralları uygulanır.

---

## 6. Ziyaretçi yönetimi

### 6.1 `POST /visitors`

Ziyaretçi kaydı oluşturur.

**Erişim:** `ADMIN`, `RECEPTION`.

İstek:

```json
{
  "fullName": "Example Visitor",
  "company": "Example Company",
  "hostUserId": "host-user-id",
  "departmentId": "department-id",
  "visitPurpose": "Meeting",
  "scheduledAt": "2026-11-05T10:00:00Z"
}
```

Yanıt (`201`):

```json
{
  "data": {
    "id": "visitor-record-id",
    "fullName": "Example Visitor",
    "status": "SCHEDULED",
    "scheduledAt": "2026-11-05T10:00:00Z"
  }
}
```

Ziyaretçi için uygulama kullanıcı hesabı oluşturulmaz. Kişisel veriler yalnızca ziyaretçi yönetimi için gerekli ölçüde işlenir.

### 6.2 `GET /visitors`

Ziyaretçi kayıtlarını listeler.

**Erişim:** `ADMIN`; resepsiyon operasyonel kapsamda; departman yöneticisi yalnızca kendi departmanıyla ilgili kayıtları görür.

### 6.3 `GET /visitors/:id`

Ziyaretçi kaydını görüntüler. Kapsam kontrolü uygulanır.

### 6.4 `PATCH /visitors/:id`

Ziyaretçi kaydının izin verilen alanlarını günceller.

**Erişim:** `ADMIN`, `RECEPTION`; diğer roller için ekipçe onaylanmış dar kapsam.

### 6.5 `POST /visitors/:id/check-in`

Resepsiyon kimlik kontrolünden sonra ziyaretçinin girişini kaydeder.

**Erişim:** `ADMIN`, `RECEPTION`.

İstek:

```json
{
  "note": "Identity checked at reception"
}
```

### 6.6 `POST /visitors/:id/check-out`

Ziyaretçinin çıkışını kaydeder.

**Erişim:** `ADMIN`, `RECEPTION`.

Giriş/çıkış işlemleri zaman damgası ve işlemi yapan kullanıcıyla audit log'a yazılır.

---

## 7. QR işlemleri

### 7.1 QR biçimi

Önerilen biçim:

```text
aos1.<tokenId>.<secret>
```

QR içinde kişisel veri bulunmaz. Sunucuda secret'ın güvenli özeti saklanır; ham secret loglara yazılmaz.

### 7.2 `POST /qr-tokens`

Yetkili ziyaretçi/işlem için tek kullanımlık QR token üretir.

**Erişim:** `ADMIN`, `RECEPTION`; diğer roller için yalnızca matriste açıkça izin verilmiş senaryolar.

İstek:

```json
{
  "visitorId": "visitor-record-id",
  "expiresAt": "2026-11-05T12:00:00Z"
}
```

Yanıt (`201`):

```json
{
  "data": {
    "qrPayload": "aos1.<tokenId>.<secret>",
    "expiresAt": "2026-11-05T12:00:00Z"
  }
}
```

`qrPayload` yalnızca oluşturma yanıtında bir kez gösterilmelidir. Uygulama, QR içeriğini analytics veya uygulama loglarına göndermemelidir.

### 7.3 `POST /qr-tokens/validate`

QR içeriğini doğrular; tek başına ziyaretçi check-in işlemi yapmaz.

**Erişim:** Kimliği doğrulanmış ve ilgili akış için yetkili kullanıcı; kiosk akışı ayrıca cihaz anahtarıyla korunur.

İstek:

```json
{
  "qrPayload": "aos1.<tokenId>.<secret>"
}
```

Başarılı yanıt (`200`):

```json
{
  "data": {
    "valid": true,
    "visitor": {
      "id": "visitor-record-id",
      "displayName": "Example Visitor"
    },
    "expiresAt": "2026-11-05T12:00:00Z"
  }
}
```

Bu endpoint'in doğrulama yapması token'ı tüketmez. Kullanımın tek seferlik ve atomik olması gereken işlem ayrı bir consume/check-in akışında gerçekleştirilir.

### 7.4 `POST /qr-tokens/:id/revoke`

QR token'ı iptal eder.

**Erişim:** Token üzerinde kapsam yetkisi olan `ADMIN`, `RECEPTION` veya ekipçe onaylanmış sahibi.

### 7.5 QR hata kodları

| Kod | Açıklama |
|---|---|
| `QR_INVALID` | QR biçimi veya secret geçersiz |
| `QR_EXPIRED` | QR süresi dolmuş |
| `QR_USED` | QR daha önce kullanılmış |
| `QR_REVOKED` | QR iptal edilmiş |
| `QR_NOT_FOUND` | Token bulunamadı |
| `QR_DEVICE_UNAUTHORIZED` | Kiosk cihazı yetkisiz |

QR'nin tüketilmesi gereken işlem veritabanında atomik olmalıdır; aynı token ile eşzamanlı iki isteğin ikisi birden başarılı olmamalıdır.

---

## 8. Kiosk API

Kiosk, ziyaretçi hesabı veya normal kullanıcı oturumu açmaz. Kiosk endpoint'leri yalnızca dar kapsamlı doğrulama/sorgu işlevleri sunar.

### 8.1 `POST /kiosk/qr/validate`

QR'yi doğrular ve yalnızca gerekli asgari sonucu döndürür.

**Erişim:** Cihaz anahtarı, hız sınırı ve girdi doğrulaması zorunlu.

İstek:

```json
{
  "qrPayload": "aos1.<tokenId>.<secret>"
}
```

Örnek yanıt:

```json
{
  "data": {
    "valid": true,
    "message": "Please proceed to reception."
  }
}
```

Kiosk bu endpoint üzerinden doğrudan giriş kaydı oluşturmaz. Ziyaretçinin girişi resepsiyonda kimlik kontrolüyle tamamlanır. Bu akış ekip tarafından değiştirilecekse risk analizi ve ek doğrulama gerekir.

### 8.2 Cihaz anahtarı

- Anahtar sunucu ortam değişkeni veya güvenli secret yönetiminde tutulur.
- Anahtar frontend bundle'ına, mobil uygulama paketine veya herkese açık kaynak koda gömülmemelidir.
- Kiosk kimlik bilgileri için rotasyon ve iptal süreci tanımlanmalıdır.
- Üretimde tek bir ortak ve kalıcı anahtar yerine cihaz bazlı kimlik doğrulama tercih edilmelidir.
- Anahtar URL veya log içinde taşınmamalıdır.

---

## 9. Audit log

Aşağıdaki olaylar sunucu tarafından audit log'a yazılmalıdır:

- Başarılı/başarısız giriş ve oturum kapatma (parola/token olmadan).
- Kullanıcı rolü değişikliği ve hesap pasifleştirme.
- İzin onaylama, reddetme ve iptal.
- Ziyaretçi check-in/check-out.
- QR oluşturma, iptal, doğrulama ve tüketme.
- Hassas yönetim işlemleri.

Audit kaydı için önerilen alanlar:

```json
{
  "actorUserId": "user-id",
  "action": "VISITOR_CHECK_IN",
  "resourceType": "VISITOR",
  "resourceId": "visitor-record-id",
  "createdAt": "2026-11-05T10:05:00Z",
  "metadata": {
    "source": "RECEPTION"
  }
}
```

Parola, access token, refresh token, QR secret veya gereksiz kişisel veri audit metadata'sına eklenmemelidir. Audit log kayıtları normal kullanıcılar tarafından değiştirilememelidir.

---

## 10. Ortak hata yanıtları

Hata yanıtları tutarlı bir biçimde dönmelidir.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "İstek doğrulanamadı.",
    "details": [
      {
        "field": "email",
        "message": "Geçerli bir e-posta adresi girilmelidir."
      }
    ]
  }
}
```

| HTTP | Kod örneği | Kullanım |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Geçersiz gövde veya parametre |
| 401 | `UNAUTHENTICATED` | Oturum/token yok veya geçersiz |
| 403 | `FORBIDDEN` | Rol/işlem yetkisi yok |
| 404 | `NOT_FOUND` | Kaynak yok veya varlığı gizleniyor |
| 409 | `CONFLICT` | Durum çakışması veya yinelenen kayıt |
| 429 | `RATE_LIMITED` | Hız sınırı aşıldı |
| 500 | `INTERNAL_ERROR` | Beklenmeyen sunucu hatası |

Kaynak varlığını gizlemek gereken durumlarda `404` kullanılabilir. Bu davranış endpoint bazında tutarlı olmalıdır. Genel kimlik doğrulama hataları `401`, doğrulanmış ancak yetkisiz istekler `403` olmalıdır.

---

## 11. Yetkilendirme özeti

Her korumalı endpoint aşağıdaki kontrolleri uygulamalıdır:

1. Kimlik doğrulama: access token geçerli mi?
2. Rol: rol-yetki matrisinde bu işlem için izin var mı?
3. Kapsam: kaynak kullanıcının kendisine, departmanına veya izin verilen operasyon alanına mı ait?
4. İş kuralı: durum geçişi ve özel kısıtlar sağlanıyor mu?
5. Audit: işlem kaydedilmesi gereken hassas bir işlem mi?

`requireRole` yalnızca rol kontrolüdür; kaynak sahipliği/kapsam kontrolünün yerine geçmez. İstemcinin gönderdiği kaynak sahibi veya departman kimliği yetki kanıtı değildir.

---

## 12. Frontend entegrasyon kuralları

- API temel URL'si ortam değişkeninden okunmalıdır.
- Access token uygulama belleğinde tutulmalıdır.
- Refresh cookie gerektiren isteklerde `credentials: "include"` kullanılmalıdır.
- `401` alındığında kontrollü refresh akışı denenmeli; başarısızsa kullanıcı giriş ekranına yönlendirilmelidir.
- `403` kullanıcıya yetki yetersizliği olarak gösterilmelidir.
- `404` için kaydın bulunamadığı şeklinde genel mesaj kullanılmalıdır.
- Form doğrulama hatalarında `details[].field` alanları ilgili input'lara bağlanabilir.
- UI'da buton gizlemek güvenlik kontrolü değildir; sunucu her istekte yetkiyi doğrulamalıdır.
- Mock veriler bu sözleşmedeki JSON örnekleriyle uyumlu tutulmalıdır.

Örnek fetch:

```js
const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json"
  }
});
```

Korumalı endpoint örneği:

```js
const response = await fetch(`${API_BASE_URL}/auth/me`, {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
```

---

## 13. Açık kararlar ve ekip onayı

| No | Karar | Öneri | Etki |
|---:|---|---|---|
| 1 | API yolu sürümlemeli mi? | İlk geliştirmede `/api`; kararlı sürüm öncesi `/api/v1` değerlendirmesi | Routing, frontend config |
| 2 | Refresh token politikası | HttpOnly cookie, rotation, reuse tespiti | Auth, cookie, CSRF |
| 3 | Kiosk QR doğrulaması check-in yapacak mı? | Hayır; resepsiyon kimlik kontrolü sonrası check-in yapar | Kiosk ve ziyaretçi akışı |
| 4 | Kiosk cihaz anahtarı | Sunucu tarafında secret; üretimde cihaz bazlı kimlik | Kiosk middleware, deployment |
| 5 | ADMIN QR tarayabilir mi? | Evet; audit log zorunlu | QR endpoint yetkisi |
| 6 | Departman yöneticisi kullanıcı oluşturabilir mi? | İlk sürümde hayır; ADMIN ile sınırlı | Kullanıcı endpoint'leri |
| 7 | Ziyaretçi kaydını kim oluşturabilir? | ADMIN ve RECEPTION | Ziyaretçi endpoint'leri |
| 8 | İzin türleri ve durumları | Prisma şeması ve iş kurallarıyla birlikte kesinleştirilmeli | Leave request modeli |

---

## 14. Geliştirme ve test kabul kriterleri

### Hafta 2 – Auth, kullanıcı ve departman

- Login geçerli kullanıcıda access token üretir ve refresh cookie ayarlar.
- Yanlış parola genel bir kimlik doğrulama hatası döndürür.
- Refresh token rotation ve logout davranışı test edilir.
- `/auth/me` yalnızca geçerli access token ile çalışır.
- Kullanıcı listesi ve detayları rol/kapsam kurallarına uyar.
- Kullanıcı rolü değiştirme yalnızca ADMIN tarafından yapılır.
- Son aktif ADMIN koruması test edilir.
- Departman yöneticisi başka departmanın kullanıcılarını yönetemez.

### Hafta 3 – Ziyaretçi, QR ve kiosk

- Ziyaretçi hesabı oluşturulmadan ziyaretçi kaydı oluşturulabilir.
- Check-in/check-out yalnızca yetkili resepsiyon/ADMIN işlemiyle yapılır.
- QR kişisel veri içermez ve secret özeti saklanır.
- Süresi dolmuş, iptal edilmiş veya kullanılmış QR reddedilir.
- Tek kullanımlık QR tüketimi atomik olarak doğrulanır.
- Kiosk geçerli cihaz kimliği olmadan kullanılamaz.
- Kiosk yanıtı gereksiz kişisel veri döndürmez.
- Hız sınırı ve audit log testleri geçer.

---

## 15. Değişiklik geçmişi

| Sürüm | Tarih | Açıklama |
|---|---|---|
| 0.1 | 2026-10-31 | İlk API sözleşmesi taslağı |
| 0.2 | 2026-11-03 | Rol adları Prisma/seed ile eşitlendi: `RECEPTION`, `DEPT_MANAGER` |

**Onay notu:** Endpoint'ler ve alanlar Prisma şeması, rol-yetki matrisi ve ekip kararlarıyla eşleştirildikten sonra sözleşme 1.0 sürümüne yükseltilmelidir.
