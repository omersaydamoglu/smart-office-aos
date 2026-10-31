# Smart Office (AOS) – Sistem Mimarisi ve UML Diyagramları

**Belge türü:** Mimari taslak  
**Durum:** Tasarım dokümanı – mevcut kod ile planlanan bileşenler ayrıştırılmıştır  
**Teknoloji temeli:** Node.js, Express 5, Prisma 6, PostgreSQL  
**Son güncelleme:** 31.10.2026

> **Önemli:** Bu belge, mevcut GitHub deposunda incelenen `backend/src/index.js`, `backend/prisma/schema.prisma`, `backend/prisma/seed.js`, `backend/package.json` ve klasör yapısına dayanır. Prisma modellerinin bulunması ilgili API işlevlerinin tamamlandığı anlamına gelmez. Frontend klasörü şu an boştur. Diyagramlarda mevcut altyapı ile hedeflenen işlevler açıkça ayrılmıştır.

## 1. Mevcut sistemin teknik görünümü

| Katman | Mevcut durum |
|---|---|
| Backend çalışma zamanı | Node.js, CommonJS |
| HTTP uygulaması | Express 5 |
| Güvenlik başlıkları | Helmet |
| CORS | `cors` middleware'i etkin |
| İstek gövdesi | `express.json()` |
| Veritabanı | PostgreSQL |
| ORM | Prisma 6 |
| Kimlik doğrulama paketleri | `jsonwebtoken`, `bcryptjs` kurulu; akış henüz `index.js` içinde uygulanmamış |
| Gerçek zamanlı iletişim | `socket.io` kurulu; henüz uygulamaya bağlanmamış |
| Veri doğrulama | `zod` kurulu; henüz endpoint'lerde gösterilmemiş |
| Test | Jest ve Supertest kurulu |
| Frontend | `frontend/` klasörü boş; teknoloji ve ekranlar henüz uygulanmamış |
| Mevcut HTTP endpoint'i | `GET /api/health` |

### 1.1 Mevcut backend başlangıç akışı

`backend/src/index.js` şu anda Helmet, CORS ve JSON middleware'lerini etkinleştirir; `/api/health` endpoint'ini sunar ve `PORT` değişkeni yoksa 3000 portunda dinler.

### 1.2 Prisma veri modeli

Mevcut Prisma şemasında 12 model vardır:

- Kullanıcı ve yetki: `User`, `Role`, `UserRole`, `Session`, `LoginAttempt`
- Organizasyon: `Department`
- Ziyaretçi yönetimi: `Visitor`, `Visit`, `Invitation`
- QR: `QrToken`, `QrScanLog`
- Denetim: `AuditLog`

Şemadaki enum'lar: `UserStatus`, `VisitSource`, `VisitStatus`, `InvitationStatus`, `QrTokenType`, `QrTokenStatus`, `ScanResult`.

### 1.3 Seed ile oluşturulan roller

Seed dosyasındaki gerçek rol adları `ADMIN`, `RECEPTION`, `DEPT_MANAGER`, `EMPLOYEE` şeklindedir. Ziyaretçi, kullanıcı rolü olarak seed edilmez; ayrı `Visitor` modeliyle temsil edilir.

> **İsim standardı kararı:** Rol isimleri uygulama genelinde Prisma/seed ile aynı tutulmalıdır: `RECEPTION` ve `DEPT_MANAGER`. Önceki yetki matrisinde geçen `RECEPTIONIST` ve `DEPARTMENT_MANAGER` adları kodla eşleştirilmeden kullanılmamalıdır.

---

## 2. Sistem mimarisi

Aşağıdaki görünüm hedeflenen mantıksal mimariyi gösterir. Düz çizgili mevcut bileşenler depoda görülen altyapıyı; `Planlanan` olarak belirtilenler henüz uygulanmamış modülleri ifade eder.

```mermaid
flowchart TB
    subgraph Clients["İstemci katmanı – planlanan"]
        WEB["Web arayüzü"]
        MOBILE["Mobil arayüz"]
        KIOSK["Kiosk arayüzü"]
    end

    subgraph API["Backend – mevcut başlangıç"]
        EXPRESS["Express 5 uygulaması"]
        MIDDLEWARE["Helmet · CORS · JSON middleware"]
        HEALTH["GET /api/health"]
        AUTH["Kimlik doğrulama ve oturum modülü – planlanan"]
        RBAC["Yetkilendirme / kapsam kontrolleri – planlanan"]
        MODULES["Kullanıcı · Departman · İzin · Ziyaret · QR servisleri – planlanan"]
        REALTIME["Socket.IO gerçek zamanlı katmanı – planlanan"]
    end

    subgraph DATA["Veri katmanı"]
        PRISMA["Prisma ORM 6"]
        DB[("PostgreSQL")]
    end

    WEB -. "HTTPS / JSON – planlanan" .-> EXPRESS
    MOBILE -. "HTTPS / JSON – planlanan" .-> EXPRESS
    KIOSK -. "HTTPS / JSON – planlanan" .-> EXPRESS
    EXPRESS --> MIDDLEWARE
    MIDDLEWARE --> HEALTH
    MIDDLEWARE -.-> AUTH
    AUTH -.-> RBAC
    RBAC -.-> MODULES
    MODULES -.-> PRISMA
    REALTIME -. "Planlanan entegrasyon" .-> EXPRESS
    PRISMA --> DB
```

## 3. Use Case Diagram – kullanıcı rolleri

Bu diyagram, hedeflenen işlevsel kapsamı gösterir; use case'lerin tamamı mevcut backend'de uygulanmış değildir.

```mermaid
flowchart LR
    ADMIN["Sistem yöneticisi<br/>ADMIN"]
    MANAGER["Departman yöneticisi<br/>DEPT_MANAGER"]
    EMPLOYEE["Çalışan<br/>EMPLOYEE"]
    RECEPTION["Resepsiyon görevlisi<br/>RECEPTION"]
    VISITOR["Ziyaretçi"]

    subgraph SYS["Smart Office AOS"]
        UC1(["Oturum açma"])
        UC2(["Kullanıcı ve rol yönetimi"])
        UC3(["Departman yönetimi"])
        UC4(["Departman izin taleplerini inceleme"])
        UC5(["Kendi izin talebini oluşturma"])
        UC6(["Ziyaret daveti oluşturma"])
        UC7(["Ziyaret bilgilerini görüntüleme"])
        UC8(["QR kod ile giriş / çıkış"])
        UC9(["Ziyaretçi kaydı oluşturma"])
        UC10(["Ziyaretçiyi girişte karşılama"])
        UC11(["Denetim kayıtlarını görüntüleme"])
    end

    ADMIN --> UC1
    MANAGER --> UC1
    EMPLOYEE --> UC1
    RECEPTION --> UC1
    ADMIN --> UC2
    ADMIN --> UC3
    ADMIN --> UC11
    MANAGER --> UC4
    EMPLOYEE --> UC5
    EMPLOYEE --> UC6
    EMPLOYEE --> UC7
    VISITOR --> UC8
    RECEPTION --> UC8
    RECEPTION --> UC9
    RECEPTION --> UC10
    RECEPTION --> UC7
```

**Yetki notları:** Bu işlevlerin kesin izinleri `docs/rol-yetki-matrisi.md` ile birlikte değerlendirilmelidir. Çalışan kendi izin talebini onaylayamaz. Departman yöneticisinin kendi talebi için ayrı onay kuralı belirlenmelidir. Ziyaretçinin normal sistem hesabı yoktur.

---

## 4. Class Diagram – Prisma veri modeli

Aşağıdaki sınıf diyagramı uygulama sınıflarından ziyade mevcut Prisma modellerini ve temel ilişkilerini temsil eder. Alanlar okunabilirlik için seçilmiştir; tam alan listesi `backend/prisma/schema.prisma` dosyasındadır.

```mermaid
classDiagram
    class User {
      +String id
      +String email
      +String passwordHash
      +String firstName
      +String lastName
      +UserStatus status
      +String departmentId
    }
    class Role {
      +String id
      +String name
      +String description
    }
    class UserRole {
      +String userId
      +String roleId
    }
    class Session {
      +String id
      +String userId
      +String refreshTokenHash
      +DateTime expiresAt
      +DateTime revokedAt
    }
    class LoginAttempt {
      +String id
      +String email
      +Boolean success
      +DateTime createdAt
    }
    class Department {
      +String id
      +String name
      +Boolean isActive
      +String managerId
    }
    class Visitor {
      +String id
      +String fullName
      +String email
      +String company
    }
    class Visit {
      +String id
      +String visitorId
      +String hostId
      +VisitSource source
      +VisitStatus status
      +DateTime scheduledStart
      +DateTime scheduledEnd
    }
    class Invitation {
      +String id
      +String visitId
      +InvitationStatus status
    }
    class QrToken {
      +String id
      +String visitId
      +QrTokenType type
      +String tokenHash
      +QrTokenStatus status
      +DateTime validUntil
    }
    class QrScanLog {
      +String id
      +String qrTokenId
      +String scannedById
      +ScanResult result
      +DateTime createdAt
    }
    class AuditLog {
      +String id
      +String actorId
      +String action
      +String entityType
      +String entityId
      +DateTime createdAt
    }

    User "1" --> "0..*" UserRole
    Role "1" --> "0..*" UserRole
    User "1" --> "0..*" Session
    User "0..1" --> "0..*" LoginAttempt
    Department "0..1" --> "0..*" User : members
    User "0..1" --> "0..*" Department : manages
    Visitor "1" --> "0..*" Visit
    User "1" --> "0..*" Visit : host
    Visit "1" --> "0..1" Invitation
    Visit "1" --> "0..*" QrToken
    QrToken "0..1" --> "0..*" QrScanLog
    User "0..1" --> "0..*" QrScanLog : scannedBy
    User "0..1" --> "0..*" AuditLog : actor
```

### 4.1 İlişki açıklamaları

- `User` ile `Role` arasındaki çoktan çoğa ilişki `UserRole` ara modeliyle kurulur.
- Bir `Department` bir yöneticiye (`manager`) ve birden fazla üyeye sahip olabilir.
- Bir `Visitor` birden fazla `Visit` kaydına sahip olabilir.
- Her `Visit` bir çalışanı ev sahibi (`host`) olarak ve bir ziyaretçiyi referans alır.
- Bir ziyaretin en fazla bir `Invitation` kaydı vardır.
- Bir ziyaret için birden fazla `QrToken` üretilebilir.
- QR tarama denemeleri `QrScanLog` ile kaydedilir.
- `AuditLog` işlemi yapan kullanıcıyı ve etkilenen varlığı ilişkilendirir.

---

## 5. Component Diagram – yazılım bileşenleri

Bu diyagram hedeflenen modüler backend ayrımını gösterir. Mevcut kodda yalnızca Express başlangıç uygulaması ve health endpoint'i vardır; servis/controller/repository ayrımı henüz oluşturulmamıştır.

```mermaid
flowchart TB
    CLIENT["Web / Mobil / Kiosk istemcileri<br/>(planlanan)"]
    ROUTER["Express Router katmanı<br/>(planlanan)"]
    MIDDLEWARE["Middleware<br/>Helmet · CORS · JSON<br/>(mevcut)"]
    AUTH["Auth Controller / Service<br/>(planlanan)"]
    USER["User & Role modülü<br/>(planlanan)"]
    DEPT["Department modülü<br/>(planlanan)"]
    VISIT["Visitor & Visit modülü<br/>(planlanan)"]
    QR["QR & Check-in modülü<br/>(planlanan)"]
    AUDIT["Audit modülü<br/>(planlanan)"]
    PRISMA["Prisma Client"]
    DB[("PostgreSQL")]
    SOCKET["Socket.IO<br/>(paket kurulu, entegrasyon planlanan)"]

    CLIENT -.-> ROUTER
    ROUTER -.-> MIDDLEWARE
    MIDDLEWARE -.-> AUTH
    MIDDLEWARE -.-> USER
    MIDDLEWARE -.-> DEPT
    MIDDLEWARE -.-> VISIT
    MIDDLEWARE -.-> QR
    AUTH -.-> PRISMA
    USER -.-> PRISMA
    DEPT -.-> PRISMA
    VISIT -.-> PRISMA
    QR -.-> PRISMA
    AUDIT -.-> PRISMA
    PRISMA --> DB
    VISIT -. "olay bildirimi" .-> SOCKET
```

---

## 6. Sequence Diagram – oturum açma

Bu akış API sözleşmesindeki hedef davranışı gösterir. JWT ve bcryptjs paketleri kurulu olsa da giriş endpoint'i ve oturum yönetimi henüz `index.js` içinde uygulanmamıştır.

```mermaid
sequenceDiagram
    autonumber
    actor User as Kullanıcı
    participant UI as Web / Mobil arayüz
    participant API as Express API
    participant DB as PostgreSQL

    User->>UI: E-posta ve parola girer
    UI->>API: POST /api/auth/login
    API->>DB: Kullanıcıyı e-posta ile bul
    DB-->>API: Kullanıcı ve passwordHash
    API->>API: Parolayı bcryptjs ile doğrula
    alt Bilgiler doğru ve hesap aktif
        API->>API: Access token üret
        API->>DB: Refresh token hash ile Session oluştur
        DB-->>API: Session kaydı
        API-->>UI: Access token + HttpOnly refresh cookie
        UI-->>User: Ana ekrana yönlendir
    else Hatalı parola veya pasif hesap
        API->>DB: LoginAttempt kaydı oluştur
        API-->>UI: 401/403 hata yanıtı
        UI-->>User: Güvenli hata mesajı göster
    end
```

---

## 7. Sequence Diagram – QR ile ziyaretçi girişi

Bu akış hedeflenen QR ziyaretçi sürecidir. QR token güvenliğinin temel kuralı: veritabanında ham token değil, token özeti saklanır. Token tek kullanımlı olmalı ve durum güncellemesi atomik yapılmalıdır.

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Ziyaretçi
    participant Reception as Resepsiyon / QR okuyucu
    participant API as Express API
    participant DB as PostgreSQL

    Visitor->>Reception: QR kodunu gösterir
    Reception->>API: QR doğrulama isteği
    API->>API: Token biçimini ve hash değerini kontrol et
    API->>DB: Token kaydını ve ziyaret durumunu bul
    DB-->>API: QR token + Visit bilgisi
    API->>API: Süre, iptal ve ziyaret durumunu kontrol et
    alt Token geçerli ve kullanılmamış
        API->>DB: ACTIVE koşuluyla atomik USED güncellemesi
        DB-->>API: Etkilenen satır sayısı = 1
        API->>DB: QrScanLog SUCCESS kaydı
        API->>DB: Visit durumunu CHECKED_IN yap
        API-->>Reception: Giriş başarılı
        Reception-->>Visitor: Giriş onayı
    else Token geçersiz / süresi dolmuş / kullanılmış
        API->>DB: Reddedilen taramayı QrScanLog'a yaz
        API-->>Reception: Giriş reddedildi
        Reception-->>Visitor: Resepsiyona yönlendir
    end
```

> **İşlem bütünlüğü:** QR token'ın tek kullanımlı olması için token durumunun `ACTIVE` koşuluyla atomik güncellenmesi gerekir. Güncellemeden etkilenen satır sayısı 1 değilse işlem reddedilmelidir. Visit durum değişikliği ve log kayıtları da uygun bir veritabanı transaction'ı içinde ele alınmalıdır.

---

## 8. Ziyaret durum makinesi

Prisma şemasındaki yorum ve enum değerlerine göre:

```mermaid
stateDiagram-v2
    [*] --> PLANNED
    PLANNED --> CHECKED_IN: Başarılı giriş
    CHECKED_IN --> CHECKED_OUT: Başarılı çıkış
    PLANNED --> CANCELLED: İptal
    PLANNED --> EXPIRED: Süre dolumu
    CHECKED_OUT --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

## 9. Güvenlik ve tasarım kuralları

1. Parolalar düz metin saklanmaz; `passwordHash` alanında güçlü parola özeti tutulur.
2. Refresh token'ın kendisi değil, özeti `Session.refreshTokenHash` alanında saklanır.
3. QR token'ın kendisi değil, SHA-256 özeti `QrToken.tokenHash` alanında saklanır.
4. QR token tek kullanımlı olmalı; tekrar kullanım atomik güncellemeyle engellenmelidir.
5. Yetkilendirme varsayılan olarak reddetmeli; rol kontrolü yanında kaynak sahipliği ve kapsam kontrolü de uygulanmalıdır.
6. Ziyaretçi kişisel verileri içerdiği için saklama süresi ve anonimleştirme politikası ayrıca tasarlanmalıdır.
7. Zaman alanları UTC saklanmalı; `Europe/Istanbul` dönüşümü yalnızca gösterim katmanında yapılmalıdır.
8. Manuel QR/giriş geçersiz kılma işlemleri gerekçe ve denetim kaydı içermelidir.

## 10. Uygulama öncesi netleştirilmesi gerekenler

- Yetki matrisi ile seed rol adları tek standarda getirilmeli.
- API sözleşmesindeki alan adları ve durum kodları gerçek Prisma alanlarıyla eşleştirilmeli.
- `Visit` oluşturma, iptal, check-in ve check-out işlemlerinin transaction sınırları tanımlanmalı.
- Kiosk kimlik doğrulama yöntemi ve kiosk sırrının saklanma yeri belirlenmeli.
- Frontend teknolojisi, web/mobil istemci ayrımı ve ortak API istemcisi kararlaştırılmalı.
- Socket.IO'nun hangi olaylarda kullanılacağı belirlenmeli; yalnızca paket kurulu olması gerçek zamanlı özelliğin hazır olduğu anlamına gelmez.
- KVKK kapsamındaki aydınlatma, veri saklama, silme/anonimleştirme ve erişim kayıtları tasarlanmalı.
- Prisma şeması ile API sözleşmesi arasında otomatik veya düzenli uyumluluk kontrolü kurulmalı.

## 11. Dosya yerleşimi önerisi

```text
docs/
├── api/
│   └── api-sozlesmesi.md
├── uml/
│   └── sistem-mimarisi-ve-uml.md
└── rol-yetki-matrisi.md
```

## 12. Belge durumu

Bu belge, tasarım ve analiz aşamasındaki mimari referanstır. Diyagramlar Mermaid destekleyen GitHub Markdown görüntüleyicisinde render edilebilir. Kod geliştikçe diyagramlar Prisma şeması, API endpoint'leri ve gerçek frontend yapısıyla birlikte güncellenmelidir.
