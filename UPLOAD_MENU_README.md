# Ekle Menüsü - Paylaşılan & Kişisel

## ✅ Yapılan Değişiklikler

Ekle menüsü tamamen yeniden tasarlandı ve paylaşılan klasör uyumlu hale getirildi.

### 🆕 Menü Yapısı

```
Yeni Ekle
├── Kişisel Alanıma Yükle
│   ├── 📄 Dosya (Şahsi Dosyalarına gider)
│   └── 📷 Fotoğraf (Şahsi Fotoğraflarına gider)
│
└── Ortak Klasöre Yükle
    ├── 📄 Dosya Paylaş (Ortak 'Dosyalar' klasörüne gider)
    └── 📷 Foto Paylaş (Ortak 'Paylaşılan/Fotograflar' klasörüne gider)
```

### 🔧 Teknik Detaylar

#### Backend
- **Endpoint**: `POST /api/drive/upload-shared`
- **Hedef**: `D:\ooCloud\Paylasilan\Dosyalar` veya `D:\ooCloud\Paylasilan\Fotograflar`
- **Özellik**: Veritabanına kaydedilmez, direkt fiziksel yükleme yapılır.

#### Frontend
- **Kişisel Yükleme**: `handleFileUpload` → `/api/drive/files`
- **Ortak Yükleme**: `handleSharedUpload` → `/api/drive/upload-shared`
- **Tasarım**: 2 gruplu layout, net ayrılmış başlıklar.

### 🚀 Kullanım

1.  **+ (Ekle)** butonuna bas.
2.  **Kişisel** bir şey yükleyeceksen üstteki mavi/mor butonları kullan.
3.  **Herkesle paylaşmak** istiyorsan alttaki turuncu/pembe butonları kullan.

**Artık hem gizli hem paylaşılan dosyaları tek menüden yönetebilirsiniz!** 🎉
