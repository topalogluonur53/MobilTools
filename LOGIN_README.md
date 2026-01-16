# MobilTools - Giriş Sistemi

## 🔐 Giriş Bilgileri

Artık **SMS doğrulama olmadan** sadece **telefon numarası ve şifre** ile giriş yapabilirsiniz.

### Test Kullanıcıları

| Kullanıcı Adı | Şifre |
|---------------|-------|
| ibrahim | 12345 |
| ercan | 12345 |
| onur | 12345 |

## 🚀 Uygulamayı Başlatma

1. **Otomatik Başlatma:**
   ```bash
   mobilBaslat.bat
   ```

2. **Manuel Başlatma:**
   
   **Backend:**
   ```bash
   cd backend
   .\venv\Scripts\python manage.py runserver 0.0.0.0:8001
   ```
   
   **Frontend:**
   ```bash
   cd frontend
   npm run dev -- -p 3001
   ```

## 📝 Yeni Kullanıcı Ekleme

### Yöntem 1: Management Command (Önerilen)
```bash
cd backend
.\venv\Scripts\python manage.py create_test_users
```

### Yöntem 2: Django Shell
```bash
cd backend
.\venv\Scripts\python manage.py shell
```

Ardından:
```python
from core.models import User

# Yeni kullanıcı oluştur
user = User.objects.create_user(
    phone_number='yenikullanici',
    password='12345',
    full_name='Yeni Kullanıcı'
)

# Username ekle (opsiyonel)
user.username = 'yenikullanici'
user.save()
```

### Yöntem 3: Django Admin Panel
1. Superuser oluştur:
   ```bash
   cd backend
   .\venv\Scripts\python manage.py createsuperuser
   ```

2. Admin paneline giriş yap:
   ```
   http://localhost:8001/admin
   ```

## 🔧 Yapılan Değişiklikler

### Backend
- ✅ SMS OTP sistemi kaldırıldı
- ✅ Şifre ile giriş zorunlu hale getirildi
- ✅ Login endpoint sadece telefon + şifre kontrolü yapıyor
- ✅ Test kullanıcıları için management command eklendi

### Frontend
- ✅ OTP doğrulama adımı kaldırıldı
- ✅ Tek adımlı giriş formu (telefon + şifre)
- ✅ Hata mesajları iyileştirildi
- ✅ Kullanıcı bilgileri localStorage'a kaydediliyor

## 📱 Erişim Linkleri

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:8001
- **Cloudflare Tunnel:** https://mobil.onurtopaloglu.uk

## 🛠️ API Endpoints

### Login
```
POST /api/core/auth/login/
```

**Request Body:**
```json
{
  "phone_number": "ibrahim",
  "password": "12345"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "phone_number": "ibrahim",
    "username": "ibrahim",
    "full_name": "İbrahim",
    "is_active": true,
    "date_joined": "2026-01-13T..."
  }
}
```

## ⚠️ Önemli Notlar

- Tüm kullanıcılar **şifre ile giriş yapmak zorundadır**
- SMS doğrulama sistemi tamamen kaldırılmıştır
- Giriş yaparken hem telefon numarası hem de şifre gereklidir
- Yanlış şifre veya kullanıcı bulunamadığında uygun hata mesajları gösterilir
