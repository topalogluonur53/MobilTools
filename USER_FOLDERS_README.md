# MobilTools - Kullanıcıya Özel Klasör Sistemi

## ✅ Tamamlandı!

Her kullanıcı artık **kendi klasöründe** işlem yapabiliyor! 🎉

### 🎯 Nasıl Çalışıyor?

#### 1. **Kayıt Olma**
Kullanıcı kayıt olduğunda:
```
Merve Topaloğlu kayıt olur
  ↓
D:\ooCloud\MERVE_TOPALOGLU\
  ├── Dosyalar\
  └── Fotograflar\
```

```
Onur Topaloğlu kayıt olur
  ↓
D:\ooCloud\ONUR_TOPALOGLU\
  ├── Dosyalar\
  └── Fotograflar\
```

#### 2. **Giriş Yapma**
Her kullanıcı giriş yaptığında **sadece kendi klasörünü** görür:

- **Merve** giriş yapar → `D:\ooCloud\MERVE_TOPALOGLU` görür
- **Onur** giriş yapar → `D:\ooCloud\ONUR_TOPALOGLU` görür

#### 3. **Dosya İşlemleri**
Tüm dosya işlemleri kullanıcıya özel:

- **Dosya Yükleme**: Kendi klasörüne yüklenir
- **Fotoğraf Yükleme**: Kendi Fotograflar klasörüne
- **Arşiv Görüntüleme**: Sadece kendi dosyalarını görür
- **Dosya Listesi**: Sadece kendi yüklediği dosyalar

### 🔧 Backend Değişiklikleri

#### 1. **User Model** (`core/models.py`)
```python
class User:
    user_folder = models.CharField(max_length=255)  # Yeni alan!
    
    def get_user_folder(self):
        """Kullanıcının klasör adını döndürür"""
        return self.user_folder or self.username
```

#### 2. **Kayıt İşlemi** (`core/views.py`)
```python
# Kayıt olunca:
user.user_folder = "MERVE_TOPALOGLU"
user.save()

# Klasörler oluşturulur:
D:\ooCloud\MERVE_TOPALOGLU\Dosyalar\
D:\ooCloud\MERVE_TOPALOGLU\Fotograflar\
```

#### 3. **Dosya Yükleme** (`drive/models.py`)
```python
def user_directory_path(instance, filename):
    user_folder = instance.user.get_user_folder()
    # D:\ooCloud\MERVE_TOPALOGLU\Dosyalar\dosya.pdf
    return f"{user_folder}/Dosyalar/{filename}"
```

#### 4. **Arşiv Görüntüleme** (`drive/views.py`)
```python
# Her kullanıcı sadece kendi klasörünü görür
base_dir = f'D:/ooCloud/{user.get_user_folder()}'
```

#### 5. **Dosya Senkronizasyonu**
```python
# Kullanıcıya özel klasör taranır
folder_path = f'{media_root}/{user_folder_name}/Dosyalar'
```

### 📱 Frontend

Değişiklik yok! Backend otomatik olarak kullanıcıya özel verileri döndürüyor.

### 🗂️ Klasör Yapısı

```
D:\ooCloud\
  ├── MERVE_TOPALOGLU\
  │   ├── Dosyalar\
  │   │   ├── rapor.pdf
  │   │   └── sunum.pptx
  │   └── Fotograflar\
  │       ├── tatil.jpg
  │       └── aile.png
  │
  ├── ONUR_TOPALOGLU\
  │   ├── Dosyalar\
  │   │   ├── proje.docx
  │   │   └── tablo.xlsx
  │   └── Fotograflar\
  │       ├── profil.jpg
  │       └── araba.png
  │
  └── IBRAHIM\
      ├── Dosyalar\
      └── Fotograflar\
```

### 🎯 Özellikler

✅ Her kullanıcı kendi klasöründe çalışır  
✅ Kullanıcılar birbirinin dosyalarını göremez  
✅ Otomatik klasör oluşturma  
✅ Kullanıcıya özel dosya yükleme  
✅ Kullanıcıya özel arşiv görüntüleme  
✅ Kullanıcıya özel dosya senkronizasyonu  

### 🔒 Güvenlik

- ✅ Path traversal koruması
- ✅ Kullanıcı izolasyonu
- ✅ JWT token ile kimlik doğrulama
- ✅ Her kullanıcı sadece kendi verilerine erişebilir

### 🚀 Kullanım

#### Yeni Kullanıcı Oluştur

1. **Kayıt Ol**: http://localhost:3001/register
   ```
   Ad Soyad: Merve Topaloğlu
   Telefon: 5551234567
   Şifre: 12345
   ```

2. **Otomatik Oluşur**:
   - Kullanıcı: `MERVE_TOPALOGLU`
   - Klasör: `D:\ooCloud\MERVE_TOPALOGLU\`
   - Alt klasörler: `Dosyalar\`, `Fotograflar\`

3. **Giriş Yap ve Kullan**:
   - Dosya yükle → Kendi klasörüne gider
   - Arşiv görüntüle → Kendi dosyalarını görür

### 🛠️ Management Commands

#### Tüm Kullanıcıları Sil
```bash
# Superuser hariç tümünü sil
python manage.py delete_all_users

# Superuser dahil TÜM kullanıcıları sil
python manage.py delete_all_users --all
```

#### Mevcut Kullanıcıları Güncelle
```bash
# Eski kullanıcılar için user_folder oluştur
python manage.py update_user_folders
```

### 📊 Database

**Migration Uygulandı:**
```bash
python manage.py makemigrations
python manage.py migrate
```

**Yeni Alan:**
- `User.user_folder` - Kullanıcının klasör adı

---

## ✨ Sonuç

**Her kullanıcı artık kendi özel alanında çalışıyor!**

- Merve → `D:\ooCloud\MERVE_TOPALOGLU`
- Onur → `D:\ooCloud\ONUR_TOPALOGLU`
- İbrahim → `D:\ooCloud\IBRAHIM`

**Tamamen izole, güvenli ve kullanıcıya özel!** 🎉
