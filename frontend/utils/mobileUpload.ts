// Mobil tarayıcıda otomatik yedekleme için helper fonksiyonlar
import api from '@/lib/api';

// 1. Medya dosyalarını seç (mobil tarayıcıda)
export const selectMediaFiles = async (): Promise<File[]> => {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,video/*,.dng,.arw,.cr2,.nef,.orf,.rw2,.raf,.tiff,.bmp'; // Genişletilmiş format desteği

        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
                resolve(Array.from(files));
            } else {
                resolve([]);
            }
        };

        input.oncancel = () => {
            resolve([]);
        };

        // Mobil cihazlarda kamera veya galeri seçeneği çıkar
        input.click();
    });
};

// 2. Batch upload fonksiyonu
export const batchUploadMedia = async (
    files: File[],
    onProgress?: (current: number, total: number) => void,
    onFileUploaded?: (filename: string) => void
): Promise<{ success: number; failed: number }> => {
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
            // Progress callback
            if (onProgress) {
                onProgress(i + 1, files.length);
            }

            // Upload
            const formData = new FormData();
            formData.append('file', file);

            // Dosya tipini belirle
            const isPhoto = file.type.startsWith('image/');
            formData.append('file_type', isPhoto ? 'PHOTO' : 'FILE');

            const response = await api.post('/drive/files', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.status === 201) {
                successCount++;
                if (onFileUploaded) {
                    onFileUploaded(file.name);
                }
            } else {
                failedCount++;
            }
        } catch (error) {
            console.error(`Upload error for ${file.name}:`, error);
            failedCount++;
        }
    }

    return { success: successCount, failed: failedCount };
};

// 3. LocalStorage'da yüklenen dosyaları takip et
export const trackUploadedFile = (filename: string, size: number) => {
    const uploaded = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    uploaded.push({
        filename,
        size,
        uploadedAt: new Date().toISOString(),
    });
    localStorage.setItem('uploadedFiles', JSON.stringify(uploaded));
};

export const isFileUploaded = (filename: string, size: number): boolean => {
    const uploaded = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    return uploaded.some((f: any) => f.filename === filename && f.size === size);
};

// 4. PWA için Service Worker ile background sync (opsiyonel)
export const registerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'sync' in (self as any).registration) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await (registration as any).sync.register('upload-media');
            console.log('Background sync registered');
            return true;
        } catch (error) {
            console.error('Background sync registration failed:', error);
            return false;
        }
    }
    return false;
};

// 5. Mobil cihaz kontrolü
export const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
};

// 6. Kamera erişimi kontrolü
export const hasCameraAccess = async (): Promise<boolean> => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch {
        return false;
    }
};
