# ooCloud Mobile - Otomatik Yedekleme

Native mobil uygulama ile tam otomatik medya yedekleme sistemi.

## 🚀 Özellikler

### ✅ Tam Otomatik Yedekleme
- **Arka Plan Senkronizasyonu**: Uygulama kapalıyken bile çalışır
- **Akıllı Deduplikasyon**: Aynı dosya tekrar yüklenmez
- **Periyodik Kontrol**: Her 15 dakikada bir yeni medya kontrol edilir
- **Son 30 Gün**: Yalnızca son 30 gün içindeki medyalar yedeklenir

### 📱 Platform Desteği
- **iOS**: Background Fetch API
- **Android**: Background Service
- **Çapraz Platform**: React Native Expo

### ⚙️ Ayarlar
1. **Otomatik Senkronizasyon**: Açma/Kapama
2. **Sadece Wi-Fi**: Mobil veri kullanımını engelle
3. **Zaman Planlama**: Belirli saatler arası (örn: 22:00-06:00)
4. **Manuel Tetikleme**: İstediğiniz zaman başlatın

### 📊 Durum Takibi
- Son senkronizasyon zamanı
- Yedeklenen dosya sayısı
- Gerçek zamanlı progress

## 📦 Kurulum

```bash
cd mobile
npm install
```

### iOS
```bash
npx expo run:ios
```

### Android
```bash
npx expo run:android
```

## 🔧 Teknik Detaylar

### Kullanılan Kütüphaneler
- `expo-media-library`: Medya kütüphanesine erişim
- `expo-background-fetch`: Arka plan görevleri
- `expo-task-manager`: Task yönetimi
- `expo-network`: Ağ durumu kontrolü
- `expo-file-system`: Dosya işlemleri
- `axios`: HTTP istekleri
- `@react-native-async-storage/async-storage`: Yerel depolama

### İzinler

**iOS (Info.plist):**
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`
- `UIBackgroundModes: ["fetch", "processing"]`

**Android (AndroidManifest.xml):**
- `READ_EXTERNAL_STORAGE`
- `READ_MEDIA_IMAGES`
- `READ_MEDIA_VIDEO`
- `ACCESS_MEDIA_LOCATION`
- `INTERNET`
- `ACCESS_NETWORK_STATE`

## 🔄 Çalışma Mantığı

1. **Başlangıç**: Kullanıcı "Otomatik Senkronizasyon" açar
2. **Kayıt**: Background task sisteme kaydedilir
3. **Periyodik Çalışma**: Her 15 dakikada bir:
   - Ayarlar kontrol edilir (aktif mi, Wi-Fi mi, zaman aralığında mı)
   - Medya kütüphanesi taranır
   - Yeni dosyalar tespit edilir
   - Yüklenmemiş dosyalar API'ye gönderilir
   - Durum kaydedilir
4. **Deduplikasyon**: Yüklenen dosyaların ID'leri AsyncStorage'da saklanır

## 📝 Dosya Yapısı

```
mobile/
├── app.json              # Expo konfigürasyonu
├── package.json          # Bağımlılıklar
├── services/
│   └── backgroundSync.ts # Arka plan sync servisi
└── screens/
    └── SettingsScreen.tsx # Ayarlar ekranı
```

## 🎯 Sonraki Adımlar

1. **App.tsx oluştur**: Ana uygulama dosyası
2. **Navigation ekle**: React Navigation ile sayfa geçişleri
3. **Login ekranı**: Kullanıcı girişi
4. **Dosya listesi**: Yedeklenen dosyaları göster
5. **Build & Deploy**: App Store ve Play Store'a yükle

## 🔐 Güvenlik

- Token tabanlı kimlik doğrulama
- HTTPS zorunlu
- Medya izinleri kullanıcı onayı gerektirir
- Yerel depolama şifreli (AsyncStorage)

## 📱 Kullanım

1. Uygulamayı aç
2. Giriş yap
3. Ayarlar > Otomatik Senkronizasyon'u aç
4. İsteğe bağlı: Wi-Fi ve zaman ayarlarını yapılandır
5. Uygulama arka planda otomatik yedeklemeye başlar!

---

**Not**: Bu tam native bir çözümdür. Web uygulamasından farklı olarak gerçek arka plan işleme yapabilir.
