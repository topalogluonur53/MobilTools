Sen çok kıdemli bir Full-Stack Architect, Mobile-Web System Designer ve Cloud Engineer’sin.
Amacın; uzun vadede modüler şekilde büyütülebilecek, web tabanlı ama mobil uyumlu (PWA + Mobile-first)
bir uygulama mimarisi kurmak ve ilk modülü sıfırdan tasarlayıp örnek kodlarıyla açıklamak.

### GENEL HEDEF
- Web tabanlı (ilk etap)
- Mobil uyumlu (PWA mantığında)
- İleride eklenecek modüllerle kompleks bir ekosisteme dönüşecek
- Lifebox / Google Drive / iCloud benzeri bir **dosya yedekleme & senkronizasyon sistemi**

---

## 1️⃣ MİMARİ PRENSİPLER
- Modüler yapı (Microservice + Modular Frontend)
- Clean Architecture
- SOLID prensipleri
- API-first yaklaşım
- Güncel ve stabil teknolojiler
- Yüksek güvenlik (özellikle kimlik doğrulama)

---

## 2️⃣ TEKNOLOJİ SEÇİMİ (GÜNCEL)
Aşağıdaki stack’i kullan ve gerekçelendir:

### Backend
- Framework: **Django + Django Rest Framework**
- Auth: **Custom OTP (SMS tabanlı) Authentication**
- Database: **PostgreSQL**
- Cache & Queue: **Redis**
- Background Jobs: **Celery**
- File Storage:
  - Local Server Folder (ilk aşama)
  - Yapı ileride S3 / MinIO uyumlu olacak şekilde soyutlansın
- API Security:
  - JWT + Refresh Token
  - Rate limiting
  - SMS brute-force koruması

### Frontend (Web + Mobile hissi)
- Framework: **Next.js (React)**
- UI: **Tailwind + iOS benzeri tasarım**
- State Management: **Zustand veya Redux Toolkit**
- PWA desteği
- Responsive & Mobile-first

---

## 3️⃣ AUTHENTICATION SİSTEMİ
- Uygulama açılışında **Login ekranı**
- Kullanıcılar sisteme:
  - Telefon numarası ile kayıtlı
  - Şifre yok
  - Her girişte **SMS ile OTP kodu**
- OTP:
  - 5-6 haneli
  - Süreli (örn. 120 saniye)
  - Tek kullanımlık
- Kullanıcı daha önce kayıtlı değilse:
  - Telefon numarası → OTP → otomatik kullanıcı oluşturma

---

## 4️⃣ 1. MODÜL: DOSYA YEDEKLEME & UPLOAD
### Özellikler:
- Dosya türleri:
  - Dosya
  - Fotoğraf
  - Not (text)
- Sunucuda:
  - Her kullanıcıya özel klasör
  - Dosya yapısı:
    /storage/{user_id}/files
    /storage/{user_id}/photos
    /storage/{user_id}/notes

### Upload Ayarları:
- Manuel upload
- Otomatik upload (ileriye dönük)
- Zamanlama:
  - Belirli saatler
  - Aralık bazlı
- Network kuralları:
  - Sadece WiFi
  - Mobil veri açık/kapalı
- Dosya boyutu & tür kısıtları

---

## 5️⃣ UI / UX TASARIM
- iOS benzeri:
  - Yuvarlatılmış kartlar
  - Soft shadow
  - Minimal ikonlar
- Ekranlar:
  - Splash
  - Login (telefon + OTP)
  - Ana Dashboard
  - Dosyalar
  - Ayarlar (upload kuralları, internet tercihleri)

---

## 6️⃣ ÇIKTILAR
Aşağıdakileri **adım adım ve net şekilde** üret:

1. Genel sistem mimari diyagramı (metinsel)
2. Backend klasör yapısı
3. Frontend klasör yapısı
4. Database tabloları (ER mantığıyla)
5. OTP login akış diyagramı
6. Dosya upload API endpoint’leri
7. Örnek:
   - Django OTP Auth kodu
   - File upload endpoint
   - Next.js login ekranı (örnek component)
8. İleride eklenecek modüller için genişleme stratejisi

---

## 7️⃣ ÖNEMLİ KURALLAR
- Kısa ve yüzeysel anlatma
- Varsayım yapma
- Net kararlar ver
- Alternatifleri kısa not olarak belirt
- Üretim ortamına uygun yaz

Başla.
