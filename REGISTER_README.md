# MobilTools - Kayıt Sistemi

## 🎉 Yeni Özellik: Kullanıcı Kaydı

Artık kullanıcılar kendi hesaplarını oluşturabilir!

### ✨ Özellikler

#### 📝 Kayıt Formu
- **Ad Soyad**: Kullanıcının tam adı
- **Telefon Numarası**: Benzersiz telefon numarası (giriş için kullanılır)
- **Şifre**: Minimum 4 karakter

#### 🗂️ Otomatik Klasör Oluşturma
Kayıt olunca kullanıcıya özel klasörler otomatik oluşturulur:

```
D:\ooCloud\
  └── ONUR_TOPALOGLU\          (Kullanıcı adı - büyük harf, boşluklar _ ile)
      ├── Dosyalar\            (Genel dosyalar için)
      └── Fotograflar\         (Fotoğraflar için)
```

#### 🔐 Otomatik Giriş
Kayıt tamamlandığında kullanıcı otomatik olarak giriş yapar.

### 🚀 Kullanım

#### Yeni Kullanıcı Kaydı

1. **Login Sayfasına Git**: http://localhost:3001/login
2. **"Kayıt Ol" Linkine Tıkla**
3. **Formu Doldur**:
   - Ad Soyad: `Onur Topaloğlu`
   - Telefon: `5551234567`
   - Şifre: `12345`
4. **"Kayıt Ol" Butonuna Tıkla**
5. ✅ Otomatik giriş yapılır ve ana sayfaya yönlendirilir

#### Oluşturulan Klasörler

Kayıt sonrası `D:\ooCloud\ONUR_TOPALOGLU` klasörü ve alt klasörleri otomatik oluşturulur.

### 🔧 Backend API

#### Register Endpoint
```
POST /api/core/auth/register/
```

**Request Body:**
```json
{
  "full_name": "Onur Topaloğlu",
  "phone_number": "5551234567",
  "password": "12345"
}
```

**Response (201 Created):**
```json
{
  "message": "Kayıt başarılı",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "phone_number": "5551234567",
    "username": "ONUR_TOPALOGLU",
    "full_name": "Onur Topaloğlu",
    "is_active": true,
    "date_joined": "2026-01-13T..."
  }
}
```

**Hata Durumları:**
- `400 Bad Request`: Telefon numarası zaten kullanılıyor
- `400 Bad Request`: Geçersiz veri (eksik alan, kısa şifre vb.)

### 📱 Frontend Sayfaları

#### Login Sayfası (`/login`)
- Giriş formu
- **"Kayıt Ol"** linki (yeni!)

#### Register Sayfası (`/register`)
- Kayıt formu
- **"Giriş Yap"** linki

### 🎯 Özellikler

✅ Telefon numarası benzersizlik kontrolü  
✅ Şifre minimum 4 karakter  
✅ Otomatik username oluşturma (AD_SOYAD formatında)  
✅ Kullanıcıya özel klasör yapısı  
✅ Kayıt sonrası otomatik giriş  
✅ JWT token ile kimlik doğrulama  
✅ Hata mesajları (Türkçe)  

### 🔒 Güvenlik

- Şifreler hash'lenerek saklanır
- JWT token ile oturum yönetimi
- Telefon numarası benzersizlik kontrolü
- Minimum şifre uzunluğu zorunluluğu

### 📂 Klasör Yapısı

Kayıt olan her kullanıcı için:
- Ana klasör: `D:\ooCloud\KULLANICI_ADI`
- Alt klasörler otomatik oluşturulur
- Klasör adı kullanıcının adından türetilir (büyük harf, boşluklar `_`)

### 🎨 UI/UX

- Modern, temiz tasarım
- Responsive layout
- Loading states
- Hata mesajları
- Smooth transitions (Framer Motion)
- iOS-style input ve butonlar

---

**Artık kullanıcılar kendi hesaplarını oluşturabilir ve kişisel dosya alanlarına sahip olabilir!** 🎉
