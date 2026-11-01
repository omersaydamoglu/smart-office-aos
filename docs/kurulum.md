# Smart Office (AOS) – Kurulum ve Sorun Giderme

> Bu rehber, projenin temiz bir klasörde sıfırdan kurulup çalıştırılmasıyla doğrulanmıştır (issue #18). Yeni bir bilgisayarda yaşanan sorunlar buraya eklenmelidir.

## 1. Gereksinimler

| Araç | Not |
|---|---|
| Git | Windows'ta Git Bash ile gelir |
| Node.js | 20 veya üzeri (LTS önerilir) |
| Docker Desktop | **Açık olmalı** (sol altta "Engine running" görünene kadar bekleyin) |

Windows'ta komutları **Git Bash**'te çalıştırın. Satır başındaki `$` işaretini kopyalamayın. Etkileşimli araçlar (`gh auth login`, `npm create vite`) Git Bash'te takılırsa **PowerShell** kullanın.

## 2. Kurulum

### 2.1 Repoyu indirin
```bash
git clone https://github.com/omersaydamoglu/smart-office-aos.git
cd smart-office-aos
```

### 2.2 Veritabanını başlatın
```bash
docker compose up -d
docker ps
```
`postgres:16` konteyneri `Up` ve `5432` portunda görünmelidir.

### 2.3 Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev
```
Beklenen çıktılar:

- `npm run db:seed`: `Roller hazir: ADMIN, RECEPTION, DEPT_MANAGER, EMPLOYEE` ve `Test admin hazir: admin@smartoffice.test`
- `npm run dev`: `API 3000 portunda calisiyor`

Tarayıcıda http://localhost:3000/api/health adresi `{"status":"ok"}` döndürmelidir.

> `.env.example` geliştirme için hazır değerler içerir (gerçek parola değildir). Üretimde bu değerler **kullanılmaz**.

### 2.4 Frontend
Yeni bir terminalde:
```bash
cd frontend
npm install
npm run dev
```
http://localhost:5173 adresinde sayfa açılmalıdır.

### 2.5 Test kullanıcısı (yalnızca geliştirme)
| Alan | Değer |
|---|---|
| E-posta | `admin@smartoffice.test` |
| Parola | `Admin123!dev` |

## 3. Günlük kullanım

| İş | Komut |
|---|---|
| Veritabanını başlat / durdur | `docker compose up -d` / `docker compose stop` |
| Şema değiştirdikten sonra migration | `cd backend && npx prisma migrate dev --name aciklama` |
| Başkasının şema değişikliğini alma | `git pull origin main` sonra `cd backend && npx prisma migrate deploy` |
| Veritabanını **tamamen sıfırlama** | `docker compose down -v` sonra `docker compose up -d`, `npx prisma migrate deploy`, `npm run db:seed` |

`docker compose down -v` veritabanı verisini **siler**. `docker volume prune` ya da `docker system prune --volumes` komutlarını kullanmayın: bilgisayarınızdaki diğer projelerin birimlerini de silebilir.

## 4. Sorun giderme

### 4.1 `P1000: Authentication failed against database server`
En sık neden: **bilgisayarınızda Docker dışında kurulu bir PostgreSQL**, aynı portu tutuyor ve bağlantı yanlış sunucuya gidiyor. Parolanız doğru olsa bile bu hata çıkar ve Docker loglarında hiç iz görünmez.

Teşhis (Git Bash'te):
```bash
powershell.exe -Command "netstat -ano | findstr :5432"
powershell.exe -Command "Get-Process -Id PID | Select-Object ProcessName,Id"
```
İkinci komutta `PID` yerine ilk komuttaki `LISTENING` satırının en sağındaki gerçek sayıyı yazın (yer tutucu bir sayı çalışmaz). `com.docker.backend` ya da `wslrelay` normaldir. `postgres` görüyorsanız çakışma vardır.

Sağlıklı bir kurulumda Docker portu `netstat` çıktısında `LISTENING` olarak **görünmeyebilir** (Docker Desktop portları Windows'ta farklı bir mekanizmayla açar). Bu bir sorun değildir. Asıl doğrulama, uygulamanın izleyeceği yolu deneyen şu komuttur:
```bash
cd backend
npx prisma migrate status
```
`Database schema is up to date!` (ya da henüz uygulanmamış migration listesi) görüyorsanız bağlantı doğru sunucuya gidiyor demektir. `P1000` görüyorsanız yukarıdaki çakışma teşhisini uygulayın.

Çözüm: Docker'ın dış portunu değiştirin. `docker-compose.yml` içinde `"5432:5432"` yerine `"5434:5432"` yazın, `backend/.env` içindeki `DATABASE_URL`'de portu da `5434` yapın. Sonra veritabanını sıfırlayın (Bölüm 3). Bu değişikliği **commit etmeyin**, yalnızca kendi bilgisayarınıza özeldir.

Diğer olası neden: konteyner eski bir parolayla oluşmuştur. `POSTGRES_PASSWORD` yalnızca veri klasörü **ilk oluşurken** uygulanır, sonradan değiştirmek etkisizdir. Çözüm yine `docker compose down -v` ve yeniden kurulumdur.

### 4.2 `Can't reach database server`
Docker Desktop kapalı ya da konteyner çalışmıyor. Docker Desktop'ı açın, `docker compose up -d` çalıştırın, `docker ps` ile `Up` durumunu doğrulayın.

### 4.3 `cannot connect to the Docker daemon` / `error during connect`
Docker Desktop henüz tam açılmamış. "Engine running" görünene kadar bekleyin ve komutu tekrarlayın.

### 4.4 `port is already allocated`
Aynı portu başka bir konteyner ya da program kullanıyor. Bölüm 4.1'deki teşhisi uygulayıp portu değiştirin.

### 4.5 npm: `packages have install scripts not yet covered by allowScripts`
npm 11 ve üzeri, paketlerin kurulum betiklerini onay istemeden çalıştırmaz. Prisma paketleri için:
```bash
npm install-scripts ls
npm install-scripts approve prisma
npm install-scripts approve @prisma/client
npm install-scripts approve @prisma/engines
npm rebuild
```
Listede başka paket çıkarsa, güvendiğiniz geliştirme araçlarıysa (ör. `@parcel/watcher`, `unrs-resolver`) onaylayın.

### 4.6 `npm audit` güvenlik uyarıları
`npm audit fix --force` çalıştırmayın, paketleri bozabilir. Uyarıların çoğu geliştirme araçlarının dolaylı bağımlılıklarındandır. Güncelleme gerekiyorsa ayrı bir dalda ve PR ile yapılır.

### 4.7 Terminal yapıştırma sorunları (Git Bash)
Yapıştırılan komutun başında `^[[200~` görünüyorsa:
```bash
bind 'set enable-bracketed-paste off'
echo "set enable-bracketed-paste off" >> ~/.inputrc
```
Çok satırlı komutlar bozuluyorsa satırları tek tek yapıştırın.

### 4.8 `.env` hakkında
`backend/.env` dosyası **asla commit edilmez**. `git status` çıktısında `.env` görünüyorsa commit etmeyin. Yeni bir ortam değişkeni eklerseniz yalnızca `backend/.env.example` dosyasına ekleyin.
