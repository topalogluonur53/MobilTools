// ooCloud/page.tsx içine eklenecek kod parçaları

// 1. Import ekle (dosyanın en üstüne)
import { folderSyncService } from '@/services/folderSync';

// 2. State ekle (diğer useState'lerin yanına)
const [folderSyncEnabled, setFolderSyncEnabled] = useState(false);
const [folderSyncStatus, setFolderSyncStatus] = useState({
    isRunning: false,
    folderSelected: false,
    folderName: null as string | null,
    totalFiles: 0,
    uploadedFiles: 0,
});

// 3. Upload callback fonksiyonu ekle
const handleFolderUpload = async (file: File, path: string): Promise<boolean> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // Dosya tipini belirle
        const ext = file.name.split('.').pop()?.toLowerCase();
        const isPhoto = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext || '');
        formData.append('file_type', isPhoto ? 'PHOTO' : 'FILE');

        const response = await api.post('/drive/files', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response.status === 201) {
            console.log(`✓ Yüklendi: ${file.name}`);
            // Dosya listesini güncelle
            await fetchFiles();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Upload error:', error);
        return false;
    }
};

// 4. Klasör seç fonksiyonu
const handleSelectFolder = async () => {
    const success = await folderSyncService.selectFolder();
    if (success) {
        setFolderSyncStatus(folderSyncService.getStatus());

        // Otomatik sync başlat
        if (folderSyncEnabled) {
            await folderSyncService.startAutoSync(handleFolderUpload, 5);
            setFolderSyncStatus(folderSyncService.getStatus());
        }
    }
};

// 5. Auto sync toggle
const handleAutoSyncToggle = async (enabled: boolean) => {
    setFolderSyncEnabled(enabled);

    if (enabled) {
        if (folderSyncStatus.folderSelected) {
            await folderSyncService.startAutoSync(handleFolderUpload, 5);
        } else {
            // Klasör seçilmemişse, önce klasör seç
            await handleSelectFolder();
        }
    } else {
        folderSyncService.stopAutoSync();
    }

    setFolderSyncStatus(folderSyncService.getStatus());
};

// 6. useEffect - Durum güncelleme
useEffect(() => {
    if (folderSyncEnabled) {
        const interval = setInterval(() => {
            setFolderSyncStatus(folderSyncService.getStatus());
        }, 5000); // Her 5 saniyede durum güncelle

        return () => clearInterval(interval);
    }
}, [folderSyncEnabled]);

// 7. Settings Modal içine eklenecek JSX (Backup tab'ına)
{/* Klasör Senkronizasyonu */ }
<div className="ios-card mb-4">
    <div className="flex justify-between items-center mb-4">
        <div>
            <h3 className="text-base font-semibold dark:text-white">Klasör Senkronizasyonu</h3>
            <p className="text-xs text-gray-500 mt-1">
                Bilgisayarınızdaki bir klasörü otomatik yedekleyin
            </p>
        </div>
        <div className="relative inline-block w-12 h-6">
            <input
                type="checkbox"
                checked={folderSyncEnabled}
                onChange={(e) => handleAutoSyncToggle(e.target.checked)}
                className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
        </div>
    </div>

    {!folderSyncStatus.folderSelected && (
        <button
            onClick={handleSelectFolder}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Klasör Seç
        </button>
    )}

    {folderSyncStatus.folderSelected && (
        <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Klasör:</span>
                    <span className="text-sm font-medium dark:text-white">{folderSyncStatus.folderName}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Toplam Dosya:</span>
                    <span className="text-sm font-medium dark:text-white">{folderSyncStatus.totalFiles}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Yüklenen:</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {folderSyncStatus.uploadedFiles}
                    </span>
                </div>
            </div>

            {folderSyncStatus.isRunning && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Otomatik senkronizasyon çalışıyor...</span>
                </div>
            )}

            <button
                onClick={handleSelectFolder}
                className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors"
            >
                Farklı Klasör Seç
            </button>
        </div>
    )}
</div>
