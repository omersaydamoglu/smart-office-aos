# Smart Office (AOS) – ER Diyagramı (P0 çekirdeği)

> Bu diyagram `backend/prisma/schema.prisma` ile birlikte güncel tutulur. Kargo, rezervasyon, acil durum ve KVKK talep tabloları ilgili haftalarda eklenecektir.

```mermaid
erDiagram
    ROLES ||--o{ USER_ROLES : "atanır"
    USERS ||--o{ USER_ROLES : "sahiptir"
    DEPARTMENTS ||--o{ USERS : "üyeleri"
    USERS ||--o{ DEPARTMENTS : "yönetir"
    USERS ||--o{ SESSIONS : "açar"
    USERS ||--o{ LOGIN_ATTEMPTS : "dener"
    USERS ||--o{ VISITS : "ev sahibi"
    VISITORS ||--o{ VISITS : "yapar"
    VISITS ||--o| INVITATIONS : "daveti"
    VISITS ||--o{ QR_TOKENS : "tokenları"
    QR_TOKENS ||--o{ QR_SCAN_LOGS : "taramaları"
    USERS ||--o{ QR_SCAN_LOGS : "tarar"
    USERS ||--o{ AUDIT_LOGS : "işlem yapar"

    USERS {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum status
        datetime emailVerifiedAt
        uuid departmentId FK
    }
    ROLES {
        uuid id PK
        string name UK
    }
    USER_ROLES {
        uuid userId PK
        uuid roleId PK
    }
    DEPARTMENTS {
        uuid id PK
        string name UK
        boolean isActive
        uuid managerId FK
    }
    SESSIONS {
        uuid id PK
        uuid userId FK
        string refreshTokenHash UK
        datetime expiresAt
        datetime revokedAt
    }
    LOGIN_ATTEMPTS {
        uuid id PK
        string email
        string ipAddress
        boolean success
    }
    VISITORS {
        uuid id PK
        string fullName
        string email
        string phone
        string company
    }
    VISITS {
        uuid id PK
        uuid visitorId FK
        uuid hostId FK
        enum source
        enum status
        datetime scheduledStart
        datetime scheduledEnd
        datetime checkedInAt
        datetime checkedOutAt
    }
    INVITATIONS {
        uuid id PK
        uuid visitId FK
        enum status
        datetime sentAt
        int resendCount
    }
    QR_TOKENS {
        uuid id PK
        uuid visitId FK
        enum type
        string tokenHash UK
        datetime validFrom
        datetime validUntil
        enum status
        datetime usedAt
    }
    QR_SCAN_LOGS {
        uuid id PK
        uuid qrTokenId FK
        uuid scannedById FK
        enum scanType
        enum result
        string reason
    }
    AUDIT_LOGS {
        uuid id PK
        uuid actorId FK
        string action
        string entityType
        string entityId
        json metadata
    }
```

## Ziyaret durum makinesi

```mermaid
stateDiagram-v2
    [*] --> PLANNED
    PLANNED --> CHECKED_IN : geçerli QR taraması
    CHECKED_IN --> CHECKED_OUT : çıkış taraması
    PLANNED --> CANCELLED : davet iptali
    PLANNED --> EXPIRED : süre dolumu
    CHECKED_OUT --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

Geçersiz sıra (ör. girişsiz çıkış) ve tekrar işlemleri `REJECTED_INVALID_STATE` olarak reddedilir ve `qr_scan_logs` içine kaydedilir.
