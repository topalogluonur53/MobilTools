# 📱 Mobil Tarayıcıda Otomatik Yedekleme

Mobil tarayıcılarda (Safari, Chrome Mobile) native app olmadan yedekleme yapmanın yolları.

## 🎯 Çözümler:

### 1. ✅ Manuel Batch Upload (En Basit)
Kullanıcı galeriden dosyaları seçer, toplu yükleme yapılır.

**Avantajlar:**
- ✅ Tüm mobil tarayıcılarda çalışır
- ✅ Kolay implementasyon
- ✅ Kullanıcı kontrolünde

**Nasıl Çalışır:**
```typescript
// Kullanıcı butona tıklar
// Galeri açılır (input file accept="image/*,video/*")
// Çoklu seçim yapılır
// Batch upload başlar
// Progress gösterilir
```

### 2. ⚡ PWA + Background Sync (Gelişmiş)
Progressive Web App olarak yüklenirse background sync kullanılabilir.

**Avantajlar:**
- ✅ Arka planda çalışır
- ✅ Offline desteği
- ✅ Ana ekrana eklenebilir

**Gereksinimler:**
- Service Worker
- HTTPS
- Manifest.json
- Background Sync API

### 3. 🔄 Periyodik Manuel Hatırlatma
Kullanıcıya belirli aralıklarla yedekleme hatırlatması.

**Nasıl:**
- LocalStorage'da son yedekleme zamanı
- Her açılışta kontrol
- "Yeni fotoğraflarınızı yedekleyin" bildirimi

## 📋 Önerilen Çözüm: Manuel Batch Upload

### UI Tasarımı:

```
┌─────────────────────────────────┐
│  Fotoğraf & Video Yedekleme     │
├─────────────────────────────────┤
│                                 │
│  📸 Galeriden Seç ve Yükle      │
│                                 │
│  Son Yedekleme: 2 saat önce     │
│  Yüklenen: 145 dosya            │
│                                 │
│  [Yedeklemeyi Başlat] 🚀        │
│                                 │
└─────────────────────────────────┘
```

### Kullanım Akışı:

1. **Kullanıcı "Yedeklemeyi Başlat" butonuna tıklar**
2. **Mobil galeri açılır**
   - iOS Safari: Fotoğraflar uygulaması
   - Android Chrome: Galeri/Dosyalar
3. **Çoklu seçim yapılır**
   - Kullanıcı istediği fotoğrafları seçer
4. **Upload başlar**
   - Progress bar gösterilir
   - "12/45 yüklendi" gibi
5. **Tamamlandı**
   - "45 fotoğraf başarıyla yedeklendi!"

## 🔧 Implementasyon:

### Adım 1: Helper Fonksiyonlar
`frontend/utils/mobileUpload.ts` oluşturuldu ✅

### Adım 2: UI Komponenti
Settings modal'a eklenecek:

```tsx
{/* Mobil Yedekleme */}
{isMobileDevice() && (
  <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 mb-4">
    <h3 className="text-base font-semibold dark:text-white mb-2">
      Fotoğraf & Video Yedekleme
    </h3>
    <p className="text-xs text-gray-500 mb-4">
      Galerinizden fotoğraf ve videoları yükleyin
    </p>
    
    {uploadProgress > 0 && (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Yükleniyor...</span>
          <span>{uploadProgress}/{uploadTotal}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${(uploadProgress/uploadTotal)*100}%` }}
          />
        </div>
      </div>
    )}
    
    <button
      onClick={handleMobileUpload}
      disabled={isUploading}
      className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
    >
      <Camera className="w-5 h-5" />
      {isUploading ? 'Yükleniyor...' : 'Galeriden Seç ve Yükle'}
    </button>
    
    {lastUploadTime && (
      <p className="text-xs text-gray-500 mt-2 text-center">
        Son yedekleme: {formatRelativeTime(lastUploadTime)}
      </p>
    )}
  </div>
)}
```

### Adım 3: Handler Fonksiyonu

```typescript
const handleMobileUpload = async () => {
  setIsUploading(true);
  
  // Dosyaları seç
  const files = await selectMediaFiles();
  if (files.length === 0) {
    setIsUploading(false);
    return;
  }
  
  setUploadTotal(files.length);
  
  // Batch upload
  const result = await batchUploadMedia(
    files,
    (current, total) => {
      setUploadProgress(current);
    },
    (filename) => {
      trackUploadedFile(filename, 0);
    }
  );
  
  setIsUploading(false);
  setUploadProgress(0);
  setLastUploadTime(new Date());
  
  alert(`✅ ${result.success} dosya yüklendi!`);
  await fetchFiles();
};
```

## 🎯 Sonuç:

**Mobil tarayıcıda:**
1. ✅ Manuel batch upload çalışır
2. ✅ Galeri erişimi var
3. ✅ Progress tracking var
4. ❌ Tam otomatik yok (kullanıcı manuel seçmeli)

**Tam otomatik için:**
- Native app gerekir (React Native)
- VEYA PWA + Background Sync
- VEYA Periyodik hatırlatma

**En pratik:** Manuel batch upload! 🚀
