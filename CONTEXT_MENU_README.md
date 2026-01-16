# 📱 Dosya Önizleme ve Menü Sistemi

## 🎯 Amaç
Tüm uygulama genelinde (Dosyalar, Fotoğraflar, Arşiv, Paylaşılan) tutarlı ve güçlü bir dosya görüntüleme deneyimi sunmak.

## ✨ Özellikler

### 1. Gelişmiş Önizleme Modalı (Her Yerde)
Hangi sekmede olursanız olun, bir resim, video veya PDF dosyasına tıkladığınızda:

-   **Uygulama İçi Önizleme:** Dosyalar tarayıcı sekmesi yerine uygulama içinde açılır.
-   **Tam Ekran & Zoom:** Resimler tam ekran açılır ve **parmakla yakınlaştırma (pinch-to-zoom)** yapılabilir.
-   **Güvenli Yükleme:** Dosyalar yetkilendirme (Token) ile güvenli bir şekilde indirilir.
-   **Desteklenen Türler:**
    -   🖼️ Resimler (Jpg, Png, WebP...)
    -   🎥 Videolar (Mp4, WebM...)
    -   📄 PDF Dosyaları

### 2. 3 Nokta Menüsü (Context Menu)
Tüm dosya tipleri için özelleştirilmiş menü seçenekleri sunulur.

-   **📤 Aç:** Önizleme penceresini açar.
-   **⬇️ İndir:** Dosyayı indirir.
-   **💾 Kopyala:** (Sadece Paylaşılan dosyalarda) Dosyayı kendi alanınıza kopyalar.
-   **🗑️ Sil:** Dosyayı siler.

## 🛠️ Teknik Altyapı
- **Unified Preview Logic:** `FileItem` (DB) ve `BrowseItem` (FS) tipleri için ortak önizleme mantığı.
- **Secure Blob Fetching:** Tüm medya türleri için Authorization header korumalı indirme.
- **React Zoom Pan Pinch:** Yüksek performanslı görüntü manipülasyonu.
