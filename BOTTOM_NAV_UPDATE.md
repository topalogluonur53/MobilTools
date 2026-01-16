# Bottom Navigation Güncelleme

## ✅ Yapılacak Değişiklik

Bottom navigation 5 butonlu yapılacak:

```
┌──────────────────────────────────────────┐
│  📷      📁      ➕      📦      👥       │
│ Foto   Dosya   Ekle   Arşiv  Paylaş     │
└──────────────────────────────────────────┘
```

## 🔧 Değişiklikler

### Eski Tasarım (4 buton + büyük + butonu):
- Fotoğraflar
- Dosyalar  
- **[BÜYÜK + BUTONU]** (ortada, yukarıda)
- Arşiv
- Paylaşılan

### Yeni Tasarım (5 eşit buton):
- Fotoğraflar (24px ikon)
- Dosyalar (24px ikon)
- **Ekle** (12px mavi yuvarlak + butonu)
- Arşiv (24px ikon)
- Paylaşılan (24px ikon)

## 📝 Kod

`frontend/app/ooCloud/page.tsx` dosyasında bottom navigation bölümünü bul ve değiştir:

```tsx
{/* Bottom Navigation Bar */}
<div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] border-t border-gray-200 dark:border-white/10 pb-6 pt-3 px-4 z-30">
    <div className="flex justify-between items-center max-w-2xl mx-auto">

        {/* Fotoğraflar */}
        <button
            onClick={() => setActiveTab('photos')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${activeTab === 'photos' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
        >
            <ImageIcon size={24} strokeWidth={activeTab === 'photos' ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${activeTab === 'photos' ? 'font-semibold' : ''}`}>Fotoğraflar</span>
        </button>

        {/* Dosyalar */}
        <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${activeTab === 'files' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
        >
            <Folder size={24} strokeWidth={activeTab === 'files' ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${activeTab === 'files' ? 'font-semibold' : ''}`}>Dosyalar</span>
        </button>

        {/* Ekle Butonu (Orta) */}
        <button
            onClick={() => setShowUploadMenu(true)}
            className="flex-1 flex flex-col items-center gap-1.5 transition-all active:scale-95 text-blue-500"
        >
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Plus size={28} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-semibold">Ekle</span>
        </button>

        {/* Arşiv */}
        <button
            onClick={() => setActiveTab('archive')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${activeTab === 'archive' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
        >
            <Archive size={24} strokeWidth={activeTab === 'archive' ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${activeTab === 'archive' ? 'font-semibold' : ''}`}>Arşiv</span>
        </button>

        {/* Paylaşılan */}
        <button
            onClick={() => setActiveTab('shared')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${activeTab === 'shared' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
        >
            <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth={activeTab === 'shared' ? 2.5 : 2}
                strokeLinecap="round" 
                strokeLinejoin="round"
            >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span className={`text-[10px] font-medium ${activeTab === 'shared' ? 'font-semibold' : ''}`}>Paylaşılan</span>
        </button>
    </div>
</div>
```

## 🎨 Özellikler

✅ 5 eşit buton  
✅ Ekle butonu ortada, mavi yuvarlak  
✅ Tüm butonlar aynı hizada  
✅ Responsive tasarım  
✅ Active state renkleri  
✅ Smooth transitions  

## 📱 Görünüm

```
┌─────────────────────────────────────────────┐
│                                             │
│              [İçerik Alanı]                 │
│                                             │
├─────────────────────────────────────────────┤
│  📷      📁      (➕)     📦      👥        │
│  Foto   Dosya   Ekle   Arşiv  Paylaş       │
│                                             │
│  24px   24px    12px   24px   24px          │
│                 mavi                         │
│                yuvarlak                      │
└─────────────────────────────────────────────┘
```

**Manuel olarak `frontend/app/ooCloud/page.tsx` dosyasını düzenleyip bottom navigation bölümünü değiştirin!**
