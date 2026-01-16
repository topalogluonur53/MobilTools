# Paylaşılan Klasör & Yükleme Menüsü Güncellemesi

## ✅ Yapılan Değişiklikler

### 1. 📂 Paylaşılan Klasör Yapısı
Paylaşılan dosyalar artık **alt klasörlere ayrılmıyor**.
- **Eski:** `Paylasilan/Dosyalar` ve `Paylasilan/Fotograflar`
- **Yeni:** `Paylasilan/FILE_NAME` (Tüm dosyalar tek bir yerde)

### 2. ➕ Yükleme Menüsü

"Ortak Klasöre Yükle" bölümü sadeleştirildi:
- **Foto Paylaş:** Kaldırıldı.
- **Ortak Paylaş:** Yeni tek buton. Tüm dosya türlerini (Fotoğraf, Video, PDF vb.) ortak klasöre yüklemek için kullanılır.

### 🆕 Menü Görünümü

```
Kişisel Alanıma Yükle
┌──────────┐  ┌──────────┐
│   📄     │  │   📷     │
│  Dosya   │  │ Fotoğraf │
└──────────┘  └──────────┘

Ortak Klasöre Yükle
┌──────────┐
│   📲     │
│ Ortak    │
│ Paylaş   │
└──────────┘
```

### 🔧 Teknik Not
`UploadSharedFileView` artık `file_type` ne olursa olsun dosyayı direkt `base_dir` (`D:\ooCloud\Paylasilan`) içine kaydediyor.

**Artık paylaşılan her şey tek bir havuzda toplanıyor ve yükleme menüsü daha sade!** 🎉
