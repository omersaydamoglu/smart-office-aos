# Smart Office (AOS) – Kullanıcı Hikâyeleri

> Durum: **Taslak v1** · Hazırlayan: Ömer Saydamoğlu
> Her hikâye, `docs/srs/srs.md` içindeki gereksinim numaralarına bağlıdır. Öncelikler SRS ile aynıdır (P0 zorunlu, P1 yüksek değer, P2 zaman kalırsa).
> Biçim: **… olarak, … yapmak istiyorum, böylece …**. Kabul ölçütleri her hikâyenin testidir.

## İçindekiler

| Rol | Hikâye | Sayı |
|---|---|---|
| Sistem yöneticisi (ADMIN) | A-01 … A-07 | 7 |
| Resepsiyon (RECEPTION) | R-01 … R-08 | 8 |
| Departman yöneticisi (DEPT_MANAGER) | M-01 … M-06 | 6 |
| Çalışan (EMPLOYEE) | E-01 … E-09 | 9 |
| Ziyaretçi | Z-01 … Z-05 | 5 |
| **Toplam** | | **35** |

---

## 1. Sistem yöneticisi (ADMIN)

### A-01 · Kullanıcı hesabı yönetimi · P0 · ORG-01, ORG-02, ORG-04
**Sistem yöneticisi olarak**, yeni kullanıcı oluşturup rol atamak ve gerektiğinde pasife almak istiyorum, **böylece** kurumdaki herkes yalnızca işine uygun yetkilerle sisteme girebilir.
- Kullanıcı e-posta, ad, soyad, departman ve rollerle oluşturulur; aynı e-posta ikinci kez kullanılamaz.
- Pasife alınan kullanıcı giriş yapamaz ve açık oturumları geçersiz olur.
- Kullanıcı listesi arama, filtreleme ve sayfalama ile görüntülenir.

### A-02 · Kilitlenmeye karşı koruma · P0 · ORG-03
**Sistem yöneticisi olarak**, kendi yönetici rolümü yanlışlıkla kaldıramamak istiyorum, **böylece** sistemin yönetimsiz kalması önlenir.
- Kendi `ADMIN` rolümü kaldırma isteği reddedilir.
- Sistemdeki son aktif `ADMIN` pasife alınamaz.

### A-03 · Departman ve organizasyon · P1 · ORG-05, ORG-06
**Sistem yöneticisi olarak**, departman oluşturup yönetici atamak ve çalışanları departmanlara yerleştirmek istiyorum, **böylece** yetkiler ve raporlar departman yapısına göre çalışır.
- Departman oluşturulur, güncellenir ve pasife alınır.
- Departmana atanan yöneticiye `DEPT_MANAGER` rolü verilir.
- Departman bazlı kullanıcı listesi görüntülenir.

### A-04 · Denetim kaydı · P0 · AUD-01, AUD-02, AUD-03
**Sistem yöneticisi olarak**, kritik işlemlerin kaydını arayıp filtreleyebilmek istiyorum, **böylece** bir sorun veya itiraz halinde kimin ne yaptığını gösterebilirim.
- Rol değişikliği, manuel giriş/çıkış, iptal ve dışa aktarma işlemleri kayıtta görünür.
- Kayıtta işlemi yapan kullanıcı, zaman, eylem ve kaynak bulunur.
- Kayıtlar kullanıcıya, eyleme ve tarihe göre süzülebilir.

### A-05 · Bina doluluğu ve raporlar · P0 · RPT-01, RPT-02, RPT-06
**Sistem yöneticisi olarak**, binada anlık kaç çalışan ve ziyaretçi olduğunu ve dönemsel raporları görmek istiyorum, **böylece** ofis kullanımını ölçebilir ve karar alabilirim.
- Doluluk, giriş yapmış ve henüz çıkış kaydı olmayanları sayar.
- Raporlar günlük, haftalık, aylık ve tarih aralığına göre alınır.
- Gösterilen değerler veritabanı kayıtlarıyla tutarlıdır.

### A-06 · Rapor dışa aktarma · P1 · RPT-05, RPT-07
**Sistem yöneticisi olarak**, raporları Excel ve PDF olarak almak istiyorum, **böylece** yönetime ve danışmana sunabilirim.
- Yalnızca yetkili kullanıcı dışa aktarabilir.
- Raporlarda kişisel veri gereksiz yere yer almaz.

### A-07 · Acil durum simülasyonu · P1 · EMG-01, EMG-02, EMG-05
**Sistem yöneticisi olarak**, demo kapsamında acil durum kaydı başlatıp içeride görünenleri listelemek istiyorum, **böylece** tahliye sürecini prova edebilir ve olay raporu alabilirim.
- Başlatma anındaki içeride görünen çalışan ve ziyaretçiler listelenir.
- Olay zamanı, işlemi yapan kullanıcı ve durum değişiklikleri kaydedilir.
- Ekranda modülün fiziksel alarm veya resmi sistemlere bağlı olmadığı yazar.

---

## 2. Resepsiyon (RECEPTION)

### R-01 · QR ile giriş · P0 · QR-05, VIS-07
**Resepsiyon görevlisi olarak**, ziyaretçinin QR kodunu tarayıp girişini kaydetmek istiyorum, **böylece** kimin binada olduğunu doğru takip ederim.
- Geçerli QR, ziyaret durumunu `PLANNED`'den `CHECKED_IN`'e geçirir.
- Ekranda ziyaretçi adı, şirketi ve ev sahibi görünür.
- Ev sahibine bildirim gider.

### R-02 · Hatalı QR'ların reddedilmesi · P0 · QR-06, QR-07
**Resepsiyon görevlisi olarak**, geçersiz QR'lerin neden reddedildiğini net görmek istiyorum, **böylece** ziyaretçiye doğru yönlendirme yapabilirim.
- Süresi dolmuş, kullanılmış, iptal edilmiş ve değiştirilmiş QR ayrı mesajlarla reddedilir.
- Reddedilen her deneme kayıt altına alınır.
- Reddedilen QR ile giriş yapılmaz.

### R-03 · Aynı QR'nin iki kez okutulması · P0 · QR-04
**Resepsiyon görevlisi olarak**, aynı QR'nin iki kez geçerli sayılmamasını istiyorum, **böylece** kopyalanan kodla ikinci bir kişi giremez.
- Aynı QR'nin eşzamanlı iki taramasında yalnızca biri başarılı olur.
- İkinci tarama “zaten kullanılmış” olarak reddedilir.

### R-04 · Gerekçeli manuel işlem · P0 · QR-08, QR-09
**Resepsiyon görevlisi olarak**, QR kaybı veya teknik sorun halinde gerekçe yazarak manuel giriş/çıkış yapmak istiyorum, **böylece** ziyaretçi mağdur olmaz ama işlem de izlenebilir kalır.
- Gerekçe girilmeden manuel işlem yapılamaz.
- İşlem “manuel” olarak işaretlenir ve audit log'a yazılır.
- Ziyaretçinin kimliği kontrol edilmeden işlem yapılmaması prosedürde belirtilir.

### R-05 · Davetsiz ziyaretçi kaydı · P0 · KSK-01, VIS-06
**Resepsiyon görevlisi olarak**, davetsiz gelen ziyaretçiyi kaydetmek ve bugünkü ziyaretleri görmek istiyorum, **böylece** herkes sistemde izlenir.
- Davetsiz ziyaretçi ev sahibi ve amaçla kaydedilir.
- Bugünkü ziyaretler arama ve durum filtresiyle listelenir.

### R-06 · Kargo kabul ve teslim · P0 · PRC-01, PRC-03, PRC-04
**Resepsiyon görevlisi olarak**, gelen kargoyu alıcıyla kaydedip teslim anında teslim alanı işlemek istiyorum, **böylece** kargoların izi kaybolmaz.
- Kargo alıcı, zaman ve açıklamayla kaydedilir; durumu “bekliyor” olur.
- Teslimde teslim alan kişi ve zaman kaydedilir; durum “teslim edildi” olur.
- İade veya iptal durumu işaretlenebilir.

### R-07 · Çıkış kaydı · P0 · QR-05, VIS-07
**Resepsiyon görevlisi olarak**, ziyaretçinin çıkışını kaydetmek istiyorum, **böylece** bina doluluğu ve acil durum listeleri doğru kalır.
- Girişi olmayan ziyaret için çıkış reddedilir.
- Çıkış kaydı sonrası ziyaret `CHECKED_OUT` olur ve doluluk sayısından düşer.

### R-08 · Tahliye işaretleme · P1 · EMG-04
**Resepsiyon görevlisi olarak**, acil durumda içerideki kişileri “kontrol edildi” veya “tahliye edildi” olarak işaretlemek istiyorum, **böylece** kimin doğrulandığı kayıt altında olur.
- Her kişi için üç durumdan biri seçilir: kontrol edildi, tahliye edildi, henüz doğrulanmadı.
- Her değişiklik zaman ve işlemi yapan kullanıcıyla kaydedilir.

---

## 3. Departman yöneticisi (DEPT_MANAGER)

### M-01 · Ekip listesi · P1 · ORG-07
**Departman yöneticisi olarak**, yalnızca kendi departmanımdaki çalışanları görmek istiyorum, **böylece** ekibimi yönetirken başka departmanların verisine erişmem.
- Liste yalnızca kendi departmanımı içerir.
- Başka departmanın bir kaydına kimlik değiştirerek erişim denenirse reddedilir.

### M-02 · İzin talebi onayı · P0 · LEA-02, LEA-03
**Departman yöneticisi olarak**, ekibimin izin taleplerini onaylamak veya reddetmek istiyorum, **böylece** planlamayı kontrol ederim.
- Bekleyen talepler listelenir; onay veya red gerekçeyle kaydedilir.
- Kendi izin talebimi onaylayamam; yönetici talebi yalnızca `ADMIN` onaylar.

### M-03 · Devam düzeltme talebi onayı · P1 · ATT-05
**Departman yöneticisi olarak**, ekibimin devam düzeltme taleplerini incelemek istiyorum, **böylece** hatalı kayıtlar doğru biçimde düzeltilir.
- Talep eski ve yeni değeri gösterir.
- Onay veya red audit log'a yazılır.

### M-04 · Departman raporları · P1 · RPT-02, RPT-03
**Departman yöneticisi olarak**, ekibimin devam ve ziyaretçi raporlarını görmek istiyorum, **böylece** departmanın ofis kullanımını izleyebilirim.
- Raporlar yalnızca kendi departmanımı kapsar.
- Geç kalma özeti raporda yer alır.

### M-05 · Ziyaretçi verisinde veri minimizasyonu · P0 · VIS-10
**Departman yöneticisi olarak**, ekibimin ziyaretçilerini görürken yalnızca gerekli bilgiyi görmek istiyorum, **böylece** kişisel veriler gereksiz yere açığa çıkmaz.
- Ziyaretçinin adı ve şirketi görünür; e-posta ve telefonu görünmez.

### M-06 · Doluluk özeti · P0 · RPT-01
**Departman yöneticisi olarak**, binadaki anlık doluluk sayısını görmek istiyorum, **böylece** ofise ne zaman gelinmesi gerektiğine karar verebilirim.
- Yalnızca sayı gösterilir, kişi listesi gösterilmez.

---

## 4. Çalışan (EMPLOYEE)

### E-01 · Ziyaretçi daveti oluşturma · P0 · VIS-01, VIS-02, VIS-03
**Çalışan olarak**, ziyaretçi adı, iletişim bilgisi, amaç ve zamanı girip davet oluşturmak istiyorum, **böylece** ziyaretçim QR koduyla sorunsuz içeri girer.
- Davet oluşturulunca ziyaretçiye bağlantı ve QR e-postayla gider.
- Geçmiş tarihli veya bitişi başlangıçtan önce olan davet kaydedilmez.

### E-02 · Davet iptal ve yeniden gönderim · P0 · VIS-04
**Çalışan olarak**, davetimi iptal etmek veya yeniden göndermek istiyorum, **böylece** plan değişince eski QR kullanılamaz.
- İptal veya yeniden gönderimde eski QR geçersiz olur.
- Yalnızca `PLANNED` durumdaki davet iptal edilebilir.

### E-03 · Ziyaretçim geldi bildirimi · P1 · VIS-09, NTF-02
**Çalışan olarak**, ziyaretçim geldiğinde anında haberdar olmak istiyorum, **böylece** onu karşılamaya gecikmem.
- Ziyaretçi girişinde uygulama içi bildirim ve e-posta gelir.
- Bildirim okundu/okunmadı olarak izlenir.

### E-04 · Kendi devamımı görme · P0 · ATT-01, ATT-04
**Çalışan olarak**, giriş QR'sini tarayıp kendi giriş-çıkış kayıtlarımı ve çalışma sürelerimi görmek istiyorum, **böylece** kayıtlarımın doğru olduğundan emin olurum.
- Girişte gösterilen QR'yi tarayarak giriş/çıkış kaydı oluşur.
- Başkasının devam kaydına erişemem.

### E-05 · Devam düzeltme talebi · P1 · ATT-05
**Çalışan olarak**, hatalı bir kayıt için düzeltme talebi açmak istiyorum, **böylece** kaydım yöneticim onayıyla düzeltilir.
- Talep gerekçeyle açılır ve durumu (bekliyor/onaylandı/reddedildi) izlenir.

### E-06 · İzin talebi · P0 · LEA-01
**Çalışan olarak**, izin talebi oluşturup talep geçmişimi görmek istiyorum, **böylece** izin sürecim şeffaf olur.
- Talep tarih aralığı ve açıklamayla oluşturulur.
- Yönetici kararı bildirim olarak gelir.

### E-07 · Oda ve masa rezervasyonu · P0 · RES-02, RES-03
**Çalışan olarak**, takvimden toplantı odası veya masa rezerve etmek istiyorum, **böylece** çakışma yaşamadan çalışabilirim.
- Dolu saat dilimi seçilemez; çakışan rezervasyon reddedilir.
- Kendi rezervasyonumu iptal edebilirim.

### E-08 · Takvime aktarma · P1 · RES-05
**Çalışan olarak**, rezervasyonumu takvime aktarmak istiyorum, **böylece** toplantımı unutmam.
- Rezervasyon `.ics` dosyası olarak indirilir.

### E-09 · Kargo bildirimi · P0 · PRC-02, PRC-05
**Çalışan olarak**, adıma kargo geldiğinde bildirim almak ve kargolarımı görmek istiyorum, **böylece** kargomu zamanında teslim alırım.
- Kargo kaydında bildirim gelir.
- Yalnızca kendi adıma gelen kargoları görürüm.

---

## 5. Ziyaretçi

Ziyaretçinin hesabı yoktur; davet e-postası ve kiosk üzerinden etkileşir.

### Z-01 · Davet ve QR alma · P0 · VIS-02
**Ziyaretçi olarak**, davet e-postasında giriş QR'mi almak istiyorum, **böylece** resepsiyonda hızlıca içeri girebilirim.
- E-postada ziyaret zamanı ve QR yer alır.
- QR içinde kişisel veri bulunmaz.

### Z-02 · Kiosk ile davetsiz kayıt · P0 · KSK-01, KSK-04
**Ziyaretçi olarak**, davetim yoksa kiosktan kendi bilgilerimle kayıt oluşturmak istiyorum, **böylece** kimseyi beklemeden işlemim başlar.
- Ad, şirket, amaç ve ev sahibi seçilerek kayıt yapılır.
- Ev sahibi seçiminde yalnızca ad ve departman görünür.

### Z-03 · Bilgilendirmeyi okuma ve onaylama · P0 · KSK-02, PRV-01
**Ziyaretçi olarak**, KVKK aydınlatma metnini ve İSG bilgilendirmesini okuyup onaylamak istiyorum, **böylece** verilerimin nasıl kullanılacağını bilirim.
- Kayıt, bilgilendirmeler gösterilmeden tamamlanmaz.
- Onay, metin sürümü ve zamanla saklanır.

### Z-04 · Davetimi sorgulama · P0 · KSK-03
**Ziyaretçi olarak**, kiosktan davetimi QR ile sorgulamak istiyorum, **böylece** kaydımın doğru olduğunu görürüm.
- Sorgu ziyaret zamanını ve ev sahibini gösterir.
- Sorgu QR'yi kullanılmış saymaz ve giriş yapmaz; giriş resepsiyonda yapılır.

### Z-05 · Çıkış · P0 · QR-05
**Ziyaretçi olarak**, ayrılırken çıkışımın kaydedilmesini istiyorum, **böylece** binada görünmeye devam etmem.
- Çıkış resepsiyonda kaydedilir.
- Çıkıştan sonra tekrar çıkış yapılamaz.

---

## Hikâye – gereksinim eşlemesi (kontrol)

| SRS modülü | İlgili hikâyeler |
|---|---|
| AUTH | A-01, A-02 (giriş ve oturum akışları teknik hikâye olarak Hafta 2'de issue'laşır) |
| ORG | A-01, A-02, A-03, M-01 |
| VIS | E-01, E-02, E-03, R-01, R-07, M-05, Z-01, Z-05 |
| QR | R-01, R-02, R-03, R-04, R-07, Z-04 |
| KSK | R-05, Z-02, Z-03, Z-04 |
| ATT, LEA | E-04, E-05, E-06, M-02, M-03 |
| PRC | R-06, E-09 |
| RES | E-07, E-08 |
| RPT | A-05, A-06, M-04, M-06 |
| EMG | A-07, R-08 |
| AUD | A-04 |
| NTF | E-03 |

> Giriş, parola sıfırlama ve oturum yönetimi (AUTH-01…AUTH-08) tüm rolleri kapsadığı için ayrı birer rol hikâyesi yerine **teknik hikâye** olarak Hafta 2 issue'larında izlenecektir.
