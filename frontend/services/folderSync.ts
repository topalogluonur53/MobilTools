// File System Access API için otomatik senkronizasyon servisi
// Modern tarayıcılarda (Chrome, Edge) klasör erişimi sağlar

interface SyncedFile {
    name: string;
    path: string;
    lastModified: number;
    uploaded: boolean;
}

class FolderSyncService {
    private directoryHandle: FileSystemDirectoryHandle | null = null;
    private syncedFiles: Map<string, SyncedFile> = new Map();
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;

    private failedCount: number = 0;
    private config = { photos: true, videos: true };

    updateConfig(config: { photos?: boolean, videos?: boolean }) {
        this.config = { ...this.config, ...config };
        console.log('Sync Config Updated:', this.config);
    }

    // Klasör seç ve izin al
    async selectFolder(): Promise<boolean> {
        try {
            // File System Access API desteği kontrol et
            if ('showDirectoryPicker' in window) {
                // Modern Chrome/Edge için
                this.directoryHandle = await (window as any).showDirectoryPicker({
                    mode: 'read',
                    startIn: 'pictures', // Resimler klasöründen başla
                });

                console.log('Klasör seçildi:', this.directoryHandle?.name || 'Unknown');

                // İlk taramayı yap
                await this.scanFolder();

                return true;
            } else {
                // Safari ve diğer tarayıcılar için fallback
                return await this.selectFolderFallback();
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Kullanıcı klasör seçimini iptal etti');
            } else {
                console.error('Klasör seçim hatası:', error);
                alert('Klasör seçilirken hata oluştu: ' + error.message);
            }
            return false;
        }
    }

    // Safari için fallback: input file ile klasör seçimi
    private async selectFolderFallback(): Promise<boolean> {
        return new Promise((resolve) => {
            // Input element oluştur
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;

            // webkitdirectory özelliği ile klasör seçimi (Safari destekler)
            (input as any).webkitdirectory = true;
            (input as any).directory = true;

            input.onchange = async (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (!files || files.length === 0) {
                    resolve(false);
                    return;
                }

                console.log(`Safari fallback: ${files.length} dosya seçildi`);

                // Dosyaları işle
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const ext = file.name.split('.').pop()?.toLowerCase();

                    // Sadece medya dosyaları
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) {
                        const path = (file as any).webkitRelativePath || file.name;
                        this.syncedFiles.set(path, {
                            name: file.name,
                            path: path,
                            lastModified: file.lastModified,
                            uploaded: false,
                        });
                    }
                }

                console.log(`${this.syncedFiles.size} medya dosyası bulundu`);
                resolve(true);
            };

            input.oncancel = () => {
                resolve(false);
            };

            // Tıklamayı tetikle
            input.click();
        });
    }

    // Klasörü tara ve dosyaları bul
    private async scanFolder() {
        if (!this.directoryHandle) return;

        try {
            const files: SyncedFile[] = [];
            await this.scanDirectory(this.directoryHandle, '', files);

            // Yeni dosyaları Map'e ekle
            for (const file of files) {
                const key = file.path;
                if (!this.syncedFiles.has(key)) {
                    this.syncedFiles.set(key, file);
                }
            }

            console.log(`Toplam ${files.length} medya dosyası bulundu`);
        } catch (error: any) {
            console.error('Klasör tarama hatası:', error);
            alert('Klasör taranırken hata oluştu: ' + error.message);
        }
    }

    // Recursive olarak alt klasörleri tara
    private async scanDirectory(
        dirHandle: FileSystemDirectoryHandle,
        path: string,
        files: SyncedFile[]
    ) {
        try {
            for await (const entry of (dirHandle as any).values()) {
                const fullPath = path ? `${path}/${entry.name}` : entry.name;

                if (entry.kind === 'file') {
                    // Sadece resim ve video dosyalarını al
                    const ext = entry.name.split('.').pop()?.toLowerCase();
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'dng', 'arw', 'cr2', 'nef', 'orf', 'rw2', 'raf', 'tiff', 'bmp', 'svg', 'mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext || '')) {
                        const file = await entry.getFile();
                        files.push({
                            name: entry.name,
                            path: fullPath,
                            lastModified: file.lastModified,
                            uploaded: false,
                        });
                    }
                } else if (entry.kind === 'directory') {
                    // Alt klasörü tara (max 3 seviye derinlik)
                    if (path.split('/').length < 3) {
                        await this.scanDirectory(entry, fullPath, files);
                    }
                }
            }
        } catch (error) {
            console.error('Dizin tarama hatası:', error);
        }
    }

    // Otomatik senkronizasyonu başlat
    async startAutoSync(
        uploadCallback: (file: File, path: string) => Promise<boolean>,
        intervalMinutes: number = 5
    ) {
        if (this.isRunning) {
            console.log('Senkronizasyon zaten çalışıyor');
            return;
        }

        if (!this.directoryHandle) {
            console.error('Önce bir klasör seçmelisiniz');
            return;
        }

        this.isRunning = true;
        console.log(`Otomatik senkronizasyon başlatıldı (${intervalMinutes} dakika aralıkla)`);

        // İlk yüklemeyi hemen yap
        await this.syncNewFiles(uploadCallback);

        // Periyodik kontrol başlat
        this.intervalId = setInterval(async () => {
            await this.syncNewFiles(uploadCallback);
        }, intervalMinutes * 60 * 1000);
    }

    // Yeni dosyaları senkronize et
    public async syncNewFiles(uploadCallback: (file: File, path: string) => Promise<boolean>) {
        if (!this.directoryHandle) return;

        try {
            console.log('Yeni dosyalar kontrol ediliyor...');

            // Klasörü tekrar tara
            const currentFiles: SyncedFile[] = [];
            await this.scanDirectory(this.directoryHandle, '', currentFiles);

            let uploadedCount = 0;
            let failedCount = 0;

            // Yeni veya değişmiş dosyaları yükle
            for (const fileInfo of currentFiles) {
                const existing = this.syncedFiles.get(fileInfo.path);

                // Yeni dosya veya değişmiş dosya
                if (!existing || existing.lastModified !== fileInfo.lastModified) {
                    try {
                        // Dosyayı al
                        const file = await this.getFile(fileInfo.path);
                        if (!file) continue;

                        const ext = file.name.split('.').pop()?.toLowerCase();
                        const isPhoto = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'dng', 'arw', 'cr2', 'nef', 'orf', 'rw2', 'raf', 'tiff', 'svg'].includes(ext || '');
                        const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext || '');

                        if (isPhoto && !this.config.photos) {
                            console.log(`Skipped photo: ${file.name}`);
                            continue;
                        }
                        if (isVideo && !this.config.videos) {
                            console.log(`Skipped video: ${file.name}`);
                            continue;
                        }

                        // Yükle
                        const success = await uploadCallback(file, fileInfo.path);

                        if (success) {
                            fileInfo.uploaded = true;
                            this.syncedFiles.set(fileInfo.path, fileInfo);
                            uploadedCount++;
                            console.log(`✓ Yüklendi: ${fileInfo.name}`);
                        } else {
                            failedCount++;
                            this.failedCount++;
                            console.error(`✗ Yüklenemedi: ${fileInfo.name}`);
                        }
                    } catch (error) {
                        failedCount++;
                        this.failedCount++;
                        console.error(`Dosya yükleme hatası (${fileInfo.name}):`, error);
                    }
                }
            }

            if (uploadedCount > 0 || failedCount > 0) {
                console.log(`Senkronizasyon tamamlandı: ${uploadedCount} başarılı, ${failedCount} başarısız`);
            } else {
                console.log('Yeni dosya bulunamadı');
            }
        } catch (error) {
            console.error('Senkronizasyon hatası:', error);
        }
    }

    // Belirli bir dosyayı al
    private async getFile(path: string): Promise<File | null> {
        if (!this.directoryHandle) return null;

        try {
            const parts = path.split('/');
            let currentHandle: FileSystemDirectoryHandle | FileSystemFileHandle = this.directoryHandle;

            // Path'i takip et
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];

                if (i === parts.length - 1) {
                    // Son eleman - dosya
                    currentHandle = await (currentHandle as FileSystemDirectoryHandle).getFileHandle(part);
                    return await (currentHandle as FileSystemFileHandle).getFile();
                } else {
                    // Ara eleman - klasör
                    currentHandle = await (currentHandle as FileSystemDirectoryHandle).getDirectoryHandle(part);
                }
            }
        } catch (error) {
            console.error(`Dosya erişim hatası (${path}):`, error);
        }

        return null;
    }

    // Senkronizasyonu durdur
    stopAutoSync() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('Otomatik senkronizasyon durduruldu');
    }

    // Durum bilgisi
    getStatus() {
        return {
            isRunning: this.isRunning,
            folderSelected: !!this.directoryHandle,
            folderName: this.directoryHandle?.name || null,
            totalFiles: this.syncedFiles.size,
            uploadedFiles: Array.from(this.syncedFiles.values()).filter(f => f.uploaded).length,
            failedFiles: this.failedCount,
        };
    }

    // Senkronize edilmiş dosyaları temizle
    clearSyncedFiles() {
        this.syncedFiles.clear();
        console.log('Senkronize edilmiş dosya listesi temizlendi');
    }
}

// Singleton instance
export const folderSyncService = new FolderSyncService();
