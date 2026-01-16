# Tarayıcı Tabanlı Otomatik Senkronizasyon

File System Access API kullanarak tarayıcıda otomatik klasör senkronizasyonu.

## 🌐 Tarayıcı Desteği

✅ **Tam Destek (File System Access API):**
- Chrome 86+
- Edge 86+
- Opera 72+

✅ **Kısmi Destek (Fallback ile):**
- Safari (webkitdirectory ile)
- Firefox (webkitdirectory ile)

### Çalışma Şekli:

**Modern Tarayıcılar (Chrome/Edge):**
- File System Access API kullanılır
- Klasör seçilir, izin verilir
- Otomatik periyodik tarama yapılır

**Safari ve Diğerleri:**
- Input file + webkitdirectory kullanılır
- Klasör seçilir, tüm dosyalar yüklenir
- İlk yükleme sonrası manuel tekrar gerekir

## 🚀 Özellikler

### 1. Klasör Seçimi
- Kullanıcı bir klasör seçer (örn: DCIM, Pictures)
- Tarayıcı izin ister
- İzin verildikten sonra klasör erişimi sağlanır

### 2. Otomatik Tarama
- Seçilen klasör ve alt klasörler taranır
- Sadece resim ve video dosyaları tespit edilir
- Desteklenen formatlar: JPG, PNG, GIF, WEBP, HEIC, MP4, MOV, AVI, MKV

### 3. Periyodik Senkronizasyon
- Her 5 dakikada bir yeni dosyalar kontrol edilir
- Yeni veya değişmiş dosyalar otomatik yüklenir
- Aynı dosya tekrar yüklenmez (deduplikasyon)

### 4. Durum Takibi
- Kaç dosya bulundu
- Kaç dosya yüklendi
- Son senkronizasyon zamanı

## 📋 Kullanım

### Ayarlar Ekranında:

```typescript
import { folderSyncService } from '@/services/folderSync';

// Klasör seç
const handleSelectFolder = async () => {
  const success = await folderSyncService.selectFolder();
  if (success) {
    // Otomatik sync başlat
    await folderSyncService.startAutoSync(uploadFile, 5);
  }
};

// Upload callback
const uploadFile = async (file: File, path: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', 'PHOTO');
  
  const response = await api.post('/drive/upload/', formData);
  return response.status === 201;
};

// Durdur
const handleStopSync = () => {
  folderSyncService.stopAutoSync();
};

// Durum
const status = folderSyncService.getStatus();
```

## 🔒 Güvenlik ve İzinler

### İzin İsteme
Tarayıcı otomatik olarak kullanıcıdan izin ister:
- "Bu siteye [Klasör Adı] klasörünü görüntüleme izni ver"
- Kullanıcı kabul ederse erişim sağlanır
- Kullanıcı reddederse işlem iptal edilir

### İzin Kalıcılığı
- İzinler tarayıcı oturumu boyunca geçerlidir
- Sayfa yenilendiğinde tekrar izin gerekebilir
- Kullanıcı istediği zaman izni iptal edebilir

### Veri Güvenliği
- Dosyalar sadece okunur (read-only)
- Klasör içeriği değiştirilemez
- Tüm işlemler kullanıcı kontrolünde

## ⚙️ Ayarlar Entegrasyonu

Settings modal'a eklenecek yeni bölüm:

```tsx
{/* Klasör Senkronizasyonu */}
<div className="ios-card">
  <h3>Klasör Senkronizasyonu</h3>
  
  <button onClick={handleSelectFolder}>
    📁 Klasör Seç
  </button>
  
  {status.folderSelected && (
    <>
      <p>Seçili Klasör: {status.folderName}</p>
      <p>Toplam Dosya: {status.totalFiles}</p>
      <p>Yüklenen: {status.uploadedFiles}</p>
      
      {status.isRunning ? (
        <button onClick={handleStopSync}>
          ⏸️ Durdur
        </button>
      ) : (
        <button onClick={handleStartSync}>
          ▶️ Başlat
        </button>
      )}
    </>
  )}
</div>
```

## 🎯 Avantajlar

✅ **Native Deneyim**: Gerçek klasör erişimi
✅ **Otomatik**: Kullanıcı müdahalesi gerektirmez
✅ **Verimli**: Sadece yeni dosyalar yüklenir
✅ **Güvenli**: Kullanıcı kontrolünde
✅ **Hızlı**: Arka planda çalışır

## ⚠️ Sınırlamalar

- Sadece modern Chrome/Edge tarayıcılarında çalışır
- Sayfa kapatıldığında duraklar
- Mobil tarayıcılarda sınırlı destek
- Tam arka plan sync yok (PWA gerekir)

## 🔄 Alternatifler

1. **PWA (Progressive Web App)**: Background Sync API
2. **Native App**: React Native (mobile klasöründe)
3. **Manuel Upload**: Kullanıcı dosyaları seçer

---

**Sonuç**: Modern tarayıcılarda otomatik klasör senkronizasyonu mümkün! 🎉
