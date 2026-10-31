# Smart Office (AOS) – Yazılım Gereksinim Şartnamesi (SRS)

> Durum: **Taslak v1** · Hazırlayan: Ömer Saydamoğlu · Gözden geçirecekler: Nazlım Aynacı (Bölüm 5), Talha Soydaş (Bölüm 4)
> Kaynaklar: Güncellenmiş Proje Kapsamı, `docs/rol-yetki-matrisi.md`, `docs/api/api-sozlesmesi.md`, `docs/er/er-diagram.md`
> Hukuki not: Bu belge teknik gereksinimdir, hukuki görüş değildir. KVKK metinleri, saklama süreleri ve çalışan verilerinin işlenmesi yetkili hukuk/KVKK danışmanınca doğrulanmalıdır.

## 1. Giriş

### 1.1 Amaç
Bu belge, Smart Office (AOS) sisteminin fonksiyonel ve fonksiyonel olmayan gereksinimlerini tanımlar. Geliştirme, test ve kabul süreçlerinde tek referans olarak kullanılır.

### 1.2 Kapsam
Smart Office; ziyaretçi kabulü, çalışan giriş-çıkış takibi, kargo teslimatı, toplantı odası/masa rezervasyonu, departman yönetimi, bildirimler, yönetici analitiği ve acil durum/tahliye kaydını **tek platformda** birleştiren, bulut tabanlı bir web uygulamasıdır. Merkezinde imzalı, süreli ve **tek kullanımlık QR** ile çalışan ziyaretçi yönetimi bulunur.

### 1.3 Sistem sınırları (yapmayacağı şeyler)
- Fiziksel güvenlik ekipmanının, güvenlik personelinin veya resmi acil durum sistemlerinin **yerine geçmez**; idari iş akışı ve kayıt platformudur.
- **Biyometrik veri veya yüz tanıma kullanmaz.**
- Çalışanları giriş-çıkış süreci dışında **takip etmez**; çalışan performansı hakkında otomatik karar vermez.
- Acil durum modülü fiziksel alarm, sensör, turnike veya resmi tahliye altyapısına bağlı değildir ve gerçek zamanlı fiziksel konum garantisi vermez.
- Ayrı native Android ve iOS uygulaması ilk sürüm kapsamı dışındadır (mobil uyumlu web/PWA sunulur).
- Test ve demo aşamasında **yalnızca sentetik veri** kullanılır.

### 1.4 Tanımlar
| Terim | Açıklama |
|---|---|
| AOS | Smart Office sisteminin proje kodu |
| RBAC | Rol bazlı erişim kontrolü |
| QR token | Sunucuda üretilen, süreli, tek kullanımlık doğrulama değeri |
| Kiosk | Giriş alanındaki, ziyaretçinin kendi kaydını yaptığı tablet/ekran |
| Walk-in | Davetsiz ziyaretçi |
| IDOR | Kimliği değiştirerek başkasının verisine erişme açığı |
| KVKK | 6698 sayılı Kişisel Verilerin Korunması Kanunu |
| İSG | İş sağlığı ve güvenliği |
| P0 / P1 / P2 | Öncelik: zorunlu / yüksek değer / zaman kalırsa |

### 1.5 Öncelik düzeyleri
| Düzey | Anlamı |
|---|---|
| **P0** | Zorunlu. Eksikse proje teslim edilemez |
| **P1** | Yüksek değer. Planlı biçimde eklenir |
| **P2** | Zaman kalırsa. İlk ertelenen özellikler |

## 2. Genel tanım

### 2.1 Kullanıcı sınıfları
| Sınıf | Kod | Özet |
|---|---|---|
| Sistem yöneticisi | `ADMIN` | Kullanıcı, rol, departman, sistem ayarı ve tüm raporlar |
| Resepsiyon | `RECEPTION` | Ziyaretçi giriş/çıkış, QR doğrulama, kargo, manuel işlem |
| Departman yöneticisi | `DEPT_MANAGER` | Kendi departmanının ekibi, talepleri ve raporları |
| Çalışan | `EMPLOYEE` | Davet, kendi devamı, izin, rezervasyon |
| Ziyaretçi | – | Hesabı yoktur; davet/QR ve kiosk üzerinden etkileşir |

Ayrıntılı yetkiler: `docs/rol-yetki-matrisi.md`.

### 2.2 Çalışma ortamı
- İstemci: güncel masaüstü, tablet ve telefon tarayıcıları (React, mobil uyumlu/PWA).
- Sunucu: Node.js + Express REST API, PostgreSQL, Prisma, Socket.IO; Docker ile paketlenmiş, bulut sunucuda çalışır.
- Harici servisler: SMTP/e-posta servisi, Firebase Cloud Messaging.

### 2.3 Tasarım ve gerçekleme kısıtları
- Mimari **modüler monolit**tir; mikroservis kullanılmaz.
- Üç kişilik ekip ve **9 haftalık** süre ile sınırlıdır.
- Parola özeti bcrypt/Argon2 ile saklanır; HTTPS zorunludur.
- Tüm tarih-saat alanları **UTC** saklanır, arayüzde Türkiye saati (`Europe/Istanbul`) gösterilir.

### 2.4 Varsayımlar ve bağımlılıklar
- Kurumun SMTP hesabı veya e-posta servisi demo için sağlanır.
- Ofis girişinde kiosk olarak kullanılacak bir tablet/ekran bulunur (demoda tarayıcı yeterlidir).
- KVKK aydınlatma metinleri kurumun danışmanı tarafından sağlanır; demoda örnek metin kullanılır.
- GPS/IP konumu yardımcı sinyaldir; kesin kanıt değildir.

## 3. Fonksiyonel gereksinimler

Gösterim: **Rol** sütunu işlemi yapabilen rolleri (A: ADMIN, R: RECEPTION, M: DEPT_MANAGER, E: EMPLOYEE) belirtir.

### 3.1 Kimlik ve hesap güvenliği (AUTH)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| AUTH-01 | Kullanıcı e-posta ve parola ile giriş yapabilmeli; hatalı girişte e-posta/parola ayrımı yapılmadan genel hata dönmeli | P0 | Tümü |
| AUTH-02 | Parolalar bcrypt veya Argon2 ile özetlenerek saklanmalı; düz metin parola tutulmamalı | P0 | – |
| AUTH-03 | Kısa ömürlü erişim token'ı ve döndürülen (rotating) yenileme token'ı kullanılmalı; yenileme token'ının yalnızca özeti saklanmalı | P0 | Tümü |
| AUTH-04 | Kullanıcı çıkış yapabilmeli; çıkışta oturum iptal edilmeli | P0 | Tümü |
| AUTH-05 | Aynı e-posta/IP için ardışık başarısız denemelerden sonra geçici kilit (hız sınırlama) uygulanmalı | P0 | – |
| AUTH-06 | Kullanıcı açık oturumlarını görüntüleyip sonlandırabilmeli; ADMIN herhangi bir oturumu sonlandırabilmeli | P1 | Tümü / A |
| AUTH-07 | Parola sıfırlama (tek kullanımlık, kısa ömürlü bağlantı) sunulmalı; e-postanın kayıtlı olup olmadığı belli edilmemeli | P1 | Tümü |
| AUTH-08 | Yeni hesaplar için e-posta doğrulaması yapılmalı | P1 | Tümü |
| AUTH-09 | Yönetici hesapları için iki faktörlü doğrulama değerlendirilmeli | P2 | A |
| AUTH-10 | Pasif kullanıcı giriş yapamamalı ve mevcut oturumları geçersiz olmalı | P0 | – |

### 3.2 Kullanıcı, rol ve departman yönetimi (ORG)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| ORG-01 | Yönetici kullanıcı oluşturup güncelleyebilmeli ve pasife alabilmeli | P0 | A |
| ORG-02 | Yönetici kullanıcıya bir veya birden fazla rol atayabilmeli | P0 | A |
| ORG-03 | Yönetici kendi `ADMIN` rolünü kaldıramamalı; son aktif `ADMIN` pasife alınamamalı | P0 | A |
| ORG-04 | Kullanıcılar listelenirken arama, filtreleme, sıralama ve sayfalama desteklenmeli | P0 | A, M |
| ORG-05 | Departman oluşturma, güncelleme ve pasife alma yapılabilmeli | P1 | A |
| ORG-06 | Departmana yönetici atanabilmeli; çalışanlar departmanlara atanabilmeli | P1 | A |
| ORG-07 | Departman yöneticisi yalnızca kendi departmanının üyelerini, taleplerini ve raporlarını görebilmeli | P1 | M |
| ORG-08 | Kullanıcı kendi profilindeki ad ve telefon bilgisini güncelleyebilmeli | P0 | Tümü |

### 3.3 Ziyaretçi yönetimi (VIS)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| VIS-01 | Çalışan; ziyaretçi adı, iletişim bilgisi, ziyaret amacı ve planlanan zamanı girerek davet oluşturabilmeli (ev sahibi oturumdaki kullanıcıdır) | P0 | A, M, E |
| VIS-02 | Davet oluşturulunca ziyaretçiye davet bağlantısı ve süreli, imzalı QR e-posta ile gönderilmeli | P0 | – |
| VIS-03 | Başlangıç zamanı geçmiş veya bitiş zamanı başlangıçtan önce olan davet reddedilmeli | P0 | – |
| VIS-04 | Ev sahibi davetini iptal edebilmeli, yeniden gönderebilmeli; iptal/yeniden gönderimde eski QR'lar iptal edilmeli | P0 | A, E, M |
| VIS-05 | Süresi dolan davetler `EXPIRED` durumuna geçmeli | P0 | – |
| VIS-06 | Resepsiyon bugünkü ziyaretleri listeleyip arayabilmeli | P0 | A, R |
| VIS-07 | Ziyaret durumları açık bir durum makinesiyle yönetilmeli (PLANNED → CHECKED_IN → CHECKED_OUT; PLANNED → CANCELLED / EXPIRED); geçersiz sıra ve tekrar işlemler reddedilmeli | P0 | – |
| VIS-08 | Çalışan kendi daveti olan ziyaretlerin geçmişini görüntüleyebilmeli | P0 | E |
| VIS-09 | Ev sahibine ziyaretçi geldiğinde anlık uygulama içi bildirim, e-posta ve uygun cihazda push bildirimi gönderilmeli | P1 | – |
| VIS-10 | Ziyaretçi kayıtlarında kişisel veri yalnızca gerektiği kadar gösterilmeli (ör. departman yöneticisi için iletişim bilgisi gizli) | P0 | – |

### 3.4 QR doğrulama ve resepsiyon (QR)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| QR-01 | QR token'ı sunucuda kriptografik olarak güvenli rastgele değerle üretilmeli; ziyaret, geçerlilik aralığı ve benzersiz kimlikle ilişkilendirilmeli | P0 | – |
| QR-02 | Token'ın kendisi değil yalnızca özeti saklanmalı; QR içinde kişisel veri bulunmamalı | P0 | – |
| QR-03 | Sunucu; imza/özet doğrulamasını, geçerlilik aralığını, iptal durumunu ve önceki kullanımı kontrol etmeli | P0 | – |
| QR-04 | Tek kullanımlık durum güncellemesi atomik işlemle yapılmalı; aynı QR'nin eşzamanlı iki taramasında yalnızca biri başarılı olmalı | P0 | – |
| QR-05 | Resepsiyon, QR'yi tarayarak giriş ve çıkış kaydedebilmeli | P0 | A, R |
| QR-06 | Tekrar kullanılan, süresi dolmuş, henüz geçerli olmayan, iptal edilmiş veya değiştirilmiş QR ayrı hata koduyla reddedilmeli | P0 | – |
| QR-07 | Her tarama denemesi (başarılı veya reddedilen) kaydedilmeli | P0 | – |
| QR-08 | QR kaybı veya teknik sorun halinde resepsiyon, **zorunlu gerekçeyle** manuel giriş/çıkış yapabilmeli; işlem audit log'a yazılmalı | P0 | A, R |
| QR-09 | Kopyalanan veya başkasınca kullanılan QR riskine karşı resepsiyonda kimlik kontrolü/ek doğrulama prosedürü tanımlanmalı | P0 | R |

### 3.5 Kiosk (KSK)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| KSK-01 | Davetsiz ziyaretçi kiosk üzerinden gerekli bilgileri girerek kayıt oluşturabilmeli | P0 | Ziyaretçi |
| KSK-02 | Kayıt öncesi KVKK aydınlatma metni ve İSG bilgilendirmesi gösterilmeli; onay, sürüm ve zaman bilgisiyle kaydedilmeli | P0 | Ziyaretçi |
| KSK-03 | Ziyaretçi kiosk üzerinden kendi davetini QR ile sorgulayabilmeli; sorgu QR'yi tüketmemeli ve giriş yapmamalı | P0 | Ziyaretçi |
| KSK-04 | Ev sahibi seçiminde yalnızca ad ve departman gösterilmeli; e-posta/telefon gösterilmemeli | P0 | Ziyaretçi |
| KSK-05 | Kiosk uç noktaları hız sınırlı, cihaz anahtarıyla korunmalı ve başka kişilerin kayıtlarını listelememeli | P0 | – |
| KSK-06 | Davetsiz kayıtta ev sahibine bildirim gönderilmeli | P1 | – |

### 3.6 Çalışan devamı ve izin (ATT, LEA)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| ATT-01 | Çalışan, girişte gösterilen kısa süreli/yenilenen QR'yi tarayarak giriş-çıkış kaydı oluşturabilmeli | P0 | E |
| ATT-02 | Doğrulamada QR geçerliliği ile ofis çevresinde konum sinyali birlikte değerlendirilmeli; konum tek başına kesin kanıt sayılmamalı | P0 | – |
| ATT-03 | Çalışma süresi hesaplanmalı; geç kalma raporu üretilebilmeli | P0 | A, M |
| ATT-04 | Çalışan kendi devam kayıtlarını görüntüleyebilmeli | P0 | E |
| ATT-05 | Çalışan hatalı kayıt için düzeltme talebi açabilmeli; yönetici onaylayıp reddedebilmeli | P1 | E / M, A |
| ATT-06 | Konum doğrulaması başarısız olduğunda alternatif prosedür (resepsiyon incelemesi) sunulmalı | P1 | R |
| LEA-01 | Çalışan izin talebi oluşturabilmeli ve talep geçmişini görebilmeli | P0 | E |
| LEA-02 | Departman yöneticisi kendi departmanındaki izin taleplerini onaylayıp reddedebilmeli | P0 | M, A |
| LEA-03 | Hiç kimse kendi izin veya düzeltme talebini onaylayamamalı; yöneticinin talebini yalnızca `ADMIN` onaylamalı | P0 | – |

### 3.7 Kargo ve teslimat (PRC)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| PRC-01 | Resepsiyon, gelen kargoyu alıcı, teslimat zamanı ve temel açıklamayla kaydedebilmeli | P0 | A, R |
| PRC-02 | Alıcıya kargo geldiğinde bildirim gönderilmeli | P0 | – |
| PRC-03 | Kargo durumları izlenebilmeli: bekliyor, teslim edildi, iade/iptal | P0 | A, R |
| PRC-04 | Teslim alan kişi ve teslim zamanı kaydedilmeli | P0 | A, R |
| PRC-05 | Çalışan kendi adına gelen kargoları görebilmeli | P0 | E |

### 3.8 Toplantı odası ve masa rezervasyonu (RES)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| RES-01 | Yönetici oda ve masa tanımlayabilmeli; kapasite, ekipman ve bakım/kullanım dışı durumu belirtilebilmeli | P0 | A |
| RES-02 | Çalışan takvimden rezervasyon oluşturup iptal edebilmeli | P0 | Tümü |
| RES-03 | Tarih-saat çakışması hem iş mantığında hem veritabanı/işlem katmanında engellenmeli | P0 | – |
| RES-04 | Kullanılmayan rezervasyonlar belirlenmiş kurala göre otomatik iptal edilmeli | P1 | – |
| RES-05 | Rezervasyon iCalendar (`.ics`) olarak dışa aktarılabilmeli | P1 | Tümü |
| RES-06 | Oda doluluk ve kullanım raporları üretilebilmeli | P1 | A, M |
| RES-07 | Gelişmiş rezervasyon analitiği sunulabilmeli | P2 | A |

### 3.9 Yönetici paneli, raporlama ve dışa aktarma (RPT)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| RPT-01 | Anlık bina doluluğu gösterilmeli: içeride giriş yapmış ve henüz çıkış kaydı olmayan çalışan ve ziyaretçi sayıları | P0 | A, R, M |
| RPT-02 | Günlük, haftalık, aylık ve tarih aralığına göre ziyaretçi, devam, kargo ve rezervasyon raporları üretilebilmeli | P0 | A, R, M |
| RPT-03 | Raporlar departman ve yetki kapsamına göre filtrelenebilmeli | P1 | A, M |
| RPT-04 | Yoğun saatler, ortalama ziyaret süresi ve oda kullanım oranı gösterilmeli | P1 | A |
| RPT-05 | Raporlar Excel ve PDF olarak dışa aktarılabilmeli; yalnızca yetkili kullanıcılarca | P1 | A, R, M |
| RPT-06 | Dashboard verileri gerçek veritabanı kayıtlarıyla tutarlı olmalı | P0 | – |
| RPT-07 | Raporlarda kişisel veriler gereksiz yere gösterilmemeli | P0 | – |

### 3.10 Acil durum ve tahliye takibi (EMG)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| EMG-01 | Yetkili yönetici, demo/simülasyon kapsamında acil durum kaydı başlatıp sonlandırabilmeli | P1 | A |
| EMG-02 | Başlatma anında sistemde içeride görünen çalışan ve ziyaretçilerin listesi oluşturulmalı | P1 | – |
| EMG-03 | Yetkili kullanıcılara acil durum bildirimi gönderilmeli | P1 | – |
| EMG-04 | Yetkili kullanıcı kişileri “kontrol edildi / tahliye edildi / henüz doğrulanmadı” olarak işaretleyebilmeli | P1 | A, R |
| EMG-05 | Olay zamanı, işlemi yapan kullanıcı ve durum değişiklikleri kaydedilmeli; olay raporu oluşturulabilmeli | P1 | A |
| EMG-06 | Arayüzde modülün fiziksel alarm/sensör/turnikeye bağlı olmadığı ve gerçek zamanlı konum garantisi vermediği açıkça belirtilmeli | P1 | – |

### 3.11 Bildirim (NTF)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| NTF-01 | Uygulama içi bildirim kutusu; okundu/okunmadı durumu | P1 | Tümü |
| NTF-02 | Ziyaretçi gelişi, kargo, rezervasyon ve acil durum bildirimleri uygun ekranlara gecikmeden Socket.IO ile iletilmeli | P1 | – |
| NTF-03 | E-posta ve Firebase Cloud Messaging ile bildirim gönderilmeli | P1 | – |
| NTF-04 | İş kaydı bildirimden bağımsız tutulmalı; bildirim servisi kesilirse işlem başarısız olmamalı, bildirim tekrar denenmeli | P1 | – |
| NTF-05 | Kullanıcı bildirim tercihlerini düzenleyebilmeli | P2 | Tümü |

### 3.12 Denetim ve KVKK (AUD, PRV)
| ID | Gereksinim | Öncelik | Rol |
|---|---|---|---|
| AUD-01 | Kritik işlemler (rol/kullanıcı değişikliği, manuel giriş/çıkış, iptaller, onaylar, rapor dışa aktarma, acil durum, ayar değişikliği) audit log'a yazılmalı | P0 | – |
| AUD-02 | Audit log kaydı: işlemi yapan kullanıcı, eylem, kaynak, zaman, IP ve gerekiyorsa gerekçe | P0 | – |
| AUD-03 | Yönetici audit log ekranında arama ve filtreleme yapabilmeli | P0 | A |
| PRV-01 | KVKK aydınlatma metni ve İSG bilgilendirmesi sürüm ve zaman bilgisiyle kayıt altına alınmalı | P0 | – |
| PRV-02 | Aydınlatma metni ile açık rıza birbirinden ayrılmalı; her veri işleme faaliyeti için amaç belirlenmeli | P0 | – |
| PRV-03 | Veri saklama süresi, silme ve anonimleştirme süreçleri tasarlanmalı; ilişkili kayıtlar ve audit izi dikkate alınmalı | P0 | – |
| PRV-04 | KVKK veri talepleri (erişim, düzeltme, silme) kayıt ve takip akışıyla yönetilebilmeli | P1 | Tümü / A |
| PRV-05 | Kişisel veri ile raporlama için gereken anonim/istatistiksel veri ayrıştırılmalı | P1 | – |

## 4. Fonksiyonel olmayan gereksinimler

*(Talha gözden geçirecek.)*

### 4.1 Güvenlik (SEC)
| ID | Gereksinim | Öncelik |
|---|---|---|
| SEC-01 | Her API isteğinde sunucu tarafında rol **ve** kaynak kapsamı (kendi/departman/tümü) kontrolü yapılmalı; kullanıcı başka birinin verisine ID değiştirerek erişememeli | P0 |
| SEC-02 | Yetkisiz veya erişilemeyen kayıtlar için varlık sızdırmayan yanıt (`404`) dönülmeli | P0 |
| SEC-03 | Rate limiting, giriş denemesi sınırlama, güvenli CORS, girdi doğrulama (şema kontrolü) ve güvenli hata mesajları uygulanmalı | P0 |
| SEC-04 | Tüm trafik HTTPS ile iletilmeli; hassas alanlar uygun şekilde korunmalı | P0 |
| SEC-05 | XSS, CSRF, SQL injection, yetkisiz erişim, dosya yükleme ve oturum yönetimi riskleri test edilmeli; uygulama OWASP Top 10'a göre gözden geçirilmeli | P0 |
| SEC-06 | Yenileme token'ı `httpOnly`, `SameSite=Strict` çerezinde taşınmalı; erişim token'ı kalıcı depolamaya yazılmamalı | P0 |
| SEC-07 | Gizli bilgiler (`.env`, anahtarlar) kaynak koduna işlenmemeli | P0 |
| SEC-08 | Bağımlılıklardaki bilinen güvenlik açıkları düzenli taranmalı | P1 |

### 4.2 Performans ve ölçeklenebilirlik (PERF)
| ID | Gereksinim | Öncelik |
|---|---|---|
| PERF-01 | Test ortamında 30–40 eşzamanlı kullanıcı senaryosu çalıştırılmalı; yanıt süresi, hata oranı ve kaynak kullanımı **ölçülüp raporlanmalı** | P0 |
| PERF-02 | Listeleme uç noktaları sayfalama kullanmalı; sık sorgulanan alanlara veritabanı indeksi tanımlanmalı | P0 |

Kesin milisaniye hedefleri, test ortamı ve bulut kaynakları belirlendikten sonra danışmanla kararlaştırılır. **Ölçülmemiş performans değeri başarı iddiası olarak yazılmaz.**

### 4.3 Güvenilirlik, yedekleme ve veri bütünlüğü (REL)
| ID | Gereksinim | Öncelik |
|---|---|---|
| REL-01 | QR tek kullanımlılığı ve rezervasyon çakışması gibi kurallar yalnızca arayüzde değil, veritabanı/işlem katmanında da korunmalı | P0 |
| REL-02 | Planlı veritabanı yedeği alınmalı ve yedekleme kayıtları tutulmalı | P1 |
| REL-03 | Yedekten geri yükleme **en az bir kez başarıyla uygulanmalı** ve sonucu belgelenmeli | P1 |
| REL-04 | Birincil/yabancı anahtarlar, benzersiz alanlar ve gerekli indeksler tanımlanmalı | P0 |
| REL-05 | Tarih-saat alanları UTC saklanmalı; Türkiye yerel saati arayüzde tutarlı gösterilmeli | P0 |

### 4.4 Kullanılabilirlik ve erişilebilirlik (USA)
| ID | Gereksinim | Öncelik |
|---|---|---|
| USA-01 | Arayüz masaüstü, tablet ve telefonda kullanılabilmeli (duyarlı tasarım/PWA) | P0 |
| USA-02 | Arayüz Türkçe sunulmalı; İngilizce temel ekranlarda desteklenmeli, tüm ekranlara genişletilmesi P2 | P0 / P2 |
| USA-03 | Tutarlı gezinme, erişilebilir formlar ve anlaşılır hata mesajları sunulmalı | P0 |
| USA-04 | Modüllerde arama, filtreleme, sıralama ve sayfalama bulunmalı | P0 |
| USA-05 | Kullanılabilirlik, 15–20 gönüllüyle senaryo testi ve SUS anketiyle değerlendirilmeli; kâğıt süreçle süre karşılaştırması yapılmalı | P1 |

### 4.5 Bakım, taşınabilirlik ve süreç (MNT)
| ID | Gereksinim | Öncelik |
|---|---|---|
| MNT-01 | Kurulum ve canlı demo başka bir bilgisayarda tekrarlanabilmeli | P0 |
| MNT-02 | Docker ile ortam standardizasyonu; GitHub Actions ile otomatik test | P0 |
| MNT-03 | Her geliştirme ayrı dal ve Pull Request ile ana dala alınmalı; kritik kod en az bir başka üye tarafından incelenmeli | P0 |
| MNT-04 | API, Swagger/OpenAPI ile belgelenmeli; veri sözlüğü ve migration açıklamaları sunulmalı | P1 |

### 4.6 Uyumluluk (CMP)
| ID | Gereksinim | Öncelik |
|---|---|---|
| CMP-01 | Veri minimizasyonu, amaç sınırlılığı ve en az yetki ilkeleri uygulanmalı | P0 |
| CMP-02 | Test ve demoda yalnızca sentetik veri kullanılmalı | P0 |
| CMP-03 | Veri envanteri, saklama süreleri ve veri sahibi talepleri işleyişi belgelenmeli | P1 |

## 5. Kullanıcı arayüzü gereksinimleri

*(Nazlım gözden geçirecek.)*

| Arayüz | Temel ekranlar |
|---|---|
| Giriş | E-posta/parola, parola sıfırlama |
| Yönetici paneli | Genel bakış (doluluk, KPI), kullanıcılar, roller, departmanlar, raporlar, audit log, sistem ayarları, acil durum |
| Resepsiyon | Bugünkü ziyaretler, QR tarama, davetsiz kayıt, manuel işlem, kargo kabul/teslim |
| Çalışan portalı | Profil, davet oluşturma, kendi devamı, izin/düzeltme talepleri, oda/masa rezervasyonu, bildirimler |
| Departman yöneticisi | Ekip listesi, departman raporları, onay bekleyen talepler |
| Ziyaretçi kiosk | Davet QR sorgulama veya davetsiz kayıt, bilgilendirme metinleri, kayıt onayı |

| ID | Gereksinim | Öncelik |
|---|---|---|
| UI-01 | Menü ve butonlar kullanıcının rolüne göre gösterilmeli; ancak asıl yetki kontrolü sunucuda yapılır | P0 |
| UI-02 | Hata durumları (401, 403, QR red kodları, 429) kullanıcıya anlaşılır biçimde gösterilmeli | P0 |
| UI-03 | Kiosk ekranı büyük, dokunmatik uyumlu, az adımlı ve boşta kalınca sıfırlanan bir akış sunmalı | P0 |
| UI-04 | Tarihler UTC alınıp `Europe/Istanbul` saatinde gösterilmeli | P0 |
| UI-05 | Acil durum ekranı sorumluluk reddini görünür biçimde içermeli | P1 |

### Harici arayüzler
| Arayüz | Kullanım |
|---|---|
| SMTP / e-posta servisi | Davet, bildirim, parola sıfırlama |
| Firebase Cloud Messaging | Push bildirimi |
| Socket.IO | Uygulama açıkken gerçek zamanlı ekran/bildirim güncellemeleri |

## 6. Kapsam dışı (ilk sürüm)

- Native Android/iOS uygulaması
- Biyometrik/yüz tanıma, çalışan konum takibi, performans değerlendirme
- Fiziksel alarm, sensör, turnike veya resmi acil durum sistemi entegrasyonu
- Mikroservis mimarisi
- Gerçek kişisel veriyle test

## 7. Haftalara göre kapsam eşlemesi

| Hafta | Modüller |
|---|---|
| 1 | Analiz, tasarım, altyapı (bu belge, ER, mimari, matris, API) |
| 2 | AUTH, ORG (kimlik, RBAC, kullanıcı, departman) |
| 3 | VIS, QR (davet, QR, resepsiyon giriş/çıkış) |
| 4 | KSK, NTF (temel), ATT, LEA |
| 5 | PRC, RES |
| 6 | RPT, AUD (ekranlar) |
| 7 | EMG, PRV, AUTH-07/08 |
| 8 | Güvenlik, performans, kullanılabilirlik, yedekleme testleri |
| 9 | Teslim, canlı demo, belgeler |

Kapsam daralırsa sıra: **P2 → rezervasyon ileri özellikleri → kargo ek durumları → FCM push.** QR güvenliği, rol bazlı erişim, temel ziyaretçi akışı, veri koruma ve testler son aşamaya bırakılmaz.

## 8. Kabul kriterleri

- [ ] Ziyaretçi daveti oluşturulabiliyor, QR gönderilebiliyor, geçerli QR ile giriş/çıkış yapılabiliyor (VIS-01, VIS-02, QR-05)
- [ ] Tekrar kullanılan, süresi dolmuş, iptal edilmiş ve değiştirilmiş QR reddediliyor (QR-06)
- [ ] Aynı QR'nin eşzamanlı iki taramasında yalnızca biri başarılı oluyor (QR-04)
- [ ] Yetkisiz kullanıcı API üzerinden başka rolün/kullanıcının verisine erişemiyor (SEC-01)
- [ ] Çalışan devamı, kargo ve rezervasyon akışları uçtan uca çalışıyor (ATT, PRC, RES)
- [ ] Rezervasyon çakışması veritabanı/iş mantığı seviyesinde engelleniyor (RES-03)
- [ ] Dashboard verileri gerçek veritabanı kayıtlarıyla tutarlı (RPT-06)
- [ ] Acil durum ekranı içerideki kişileri listeliyor ve tahliye durumlarını kaydediyor (EMG-02, EMG-04)
- [ ] Bildirim, audit log, veri saklama ve yedekleme akışları test edilmiş (NTF, AUD, REL-03)
- [ ] 30–40 eşzamanlı kullanıcı senaryosu çalıştırılmış ve sonuçları raporlanmış (PERF-01)
- [ ] Kurulum, test ve canlı demo başka bir bilgisayarda tekrarlanabiliyor (MNT-01)

## 9. Açık maddeler

| # | Konu | Durum |
|---|---|---|
| 1 | Kiosk cihaz kimliği yöntemi | `docs/api/api-sozlesmesi.md` Bölüm 9'da öneri var, ekip onayı bekliyor |
| 2 | QR geçerlilik penceresi | Öneri: başlangıçtan 30 dk önce, bitişten 30 dk sonra |
| 3 | Çıkış QR'sinin dağıtımı | Ekip kararı bekleniyor |
| 4 | Konum doğrulama eşiği ve yarıçap | Hafta 4'te ofis koordinatıyla belirlenecek |
| 5 | Otomatik rezervasyon iptal kuralı süresi | Hafta 5'te belirlenecek |
| 6 | Saklama süreleri | KVKK danışmanı onayıyla Hafta 7'de netleşecek |
| 7 | Performans hedefleri | Test ortamı kurulunca danışmanla kararlaştırılacak |
