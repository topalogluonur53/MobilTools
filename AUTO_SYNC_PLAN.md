# Otomatik Yedekleme Özelliği

## Gereksinimler
- Otomatik senkronizasyon toggle'ı açıldığında telefondaki fotoğraf ve videoları sürekli yedekle
- Kapatılana kadar devam et
- Wi-Fi kontrolü (opsiyonel)
- Zaman aralığı kontrolü (opsiyonel)

## İmplementasyon Planı

### 1. State Eklemeleri
```typescript
const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
const [isSyncing, setIsSyncing] = useState(false);
const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
```

### 2. Auto-Sync useEffect
```typescript
useEffect(() => {
  if (!autoSyncEnabled) return;
  
  const syncInterval = setInterval(async () => {
    await performAutoSync();
  }, 30000); // Her 30 saniyede bir kontrol
  
  // İlk sync'i hemen başlat
  performAutoSync();
  
  return () => clearInterval(syncInterval);
}, [autoSyncEnabled]);
```

### 3. performAutoSync Fonksiyonu
```typescript
const performAutoSync = async () => {
  if (isSyncing) return; // Zaten sync yapılıyorsa atla
  
  setIsSyncing(true);
  
  try {
    // 1. Telefondaki medya dosyalarını al (File API)
    // 2. Sunucudaki dosyalarla karşılaştır
    // 3. Yeni dosyaları yükle
    // 4. Progress güncelle
  } catch (error) {
    console.error('Auto-sync error:', error);
  } finally {
    setIsSyncing(false);
  }
};
```

### 4. UI Göstergeleri
- Sync durumu badge'i
- Progress bar
- Son sync zamanı

## Notlar
- Browser'da File System Access API kullanılabilir
- Alternatif: Kullanıcı manuel olarak klasör seçer, uygulama izler
- Mobile: Input file multiple ile batch upload
