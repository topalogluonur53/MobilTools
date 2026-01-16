import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';


const BACKGROUND_SYNC_TASK = 'background-media-sync';
const API_URL = 'https://mobil.onurtopaloglu.uk/api';

interface SyncSettings {
    enabled: boolean;
    wifiOnly: boolean;
    startTime: string;
    endTime: string;
}

interface UploadedFile {
    id: string;
    modificationTime: number;
}

// Background task tanımı
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
        console.log('[Background Sync] Task started');

        // Ayarları kontrol et
        const settingsJson = await AsyncStorage.getItem('syncSettings');
        const settings: SyncSettings = settingsJson ? JSON.parse(settingsJson) : { enabled: false };

        if (!settings.enabled) {
            console.log('[Background Sync] Sync disabled');
            return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Zaman aralığı kontrolü
        if (settings.startTime && settings.endTime) {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            if (currentTime < settings.startTime || currentTime > settings.endTime) {
                console.log('[Background Sync] Outside time range');
                return BackgroundFetch.BackgroundFetchResult.NoData;
            }
        }

        // Wi-Fi kontrolü
        if (settings.wifiOnly) {
            const networkState = await Network.getNetworkStateAsync();
            if (networkState.type !== Network.NetworkStateType.WIFI) {
                console.log('[Background Sync] Not on WiFi');
                return BackgroundFetch.BackgroundFetchResult.NoData;
            }
        }

        // Token kontrolü
        const token = await AsyncStorage.getItem('authToken');
        if (!token) {
            console.log('[Background Sync] No auth token');
            return BackgroundFetch.BackgroundFetchResult.Failed;
        }

        // Medya kütüphanesi izni kontrolü
        const { status } = await MediaLibrary.getPermissionsAsync();
        if (status !== 'granted') {
            console.log('[Background Sync] No media permission');
            return BackgroundFetch.BackgroundFetchResult.Failed;
        }

        // Yüklenmiş dosyaları al
        const uploadedJson = await AsyncStorage.getItem('uploadedFiles');
        const uploadedFiles: UploadedFile[] = uploadedJson ? JSON.parse(uploadedJson) : [];
        const uploadedIds = new Set(uploadedFiles.map(f => f.id));

        // Son 30 gün içindeki medya dosyalarını al
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const assets = await MediaLibrary.getAssetsAsync({
            first: 100,
            mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
            createdAfter: thirtyDaysAgo,
            sortBy: MediaLibrary.SortBy.creationTime,
        });

        let uploadedCount = 0;
        const newUploadedFiles: UploadedFile[] = [...uploadedFiles];

        // Yeni dosyaları yükle
        for (const asset of assets.assets) {
            // Zaten yüklenmişse atla
            if (uploadedIds.has(asset.id)) continue;

            try {
                // Dosya bilgisini al
                const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                if (!assetInfo.localUri) continue;

                // Dosyayı oku
                const fileInfo = await FileSystem.getInfoAsync(assetInfo.localUri);
                if (!fileInfo.exists) continue;

                // Dosya türünü belirle
                if (!token) {
                    console.error('[Background Sync] No auth token available. Skipping upload.');
                    return BackgroundFetch.BackgroundFetchResult.Failed;
                }

                // Dosya türünü belirle
                const fileType = asset.mediaType === MediaLibrary.MediaType.photo ? 'PHOTO' : 'FILE';

                console.log(`[Background Sync] Uploading ${assetInfo.filename} to ${API_URL}/drive/files`);

                // Yükle (FileSystem.uploadAsync kullanarak)
                const uploadResponse = await FileSystem.uploadAsync(`${API_URL}/drive/files`, assetInfo.localUri, {
                    fieldName: 'file',
                    httpMethod: 'POST',
                    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                    parameters: {
                        'file_type': fileType,
                    },
                });

                if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
                    // Başarılı yüklemeyi kaydet
                    newUploadedFiles.push({
                        id: asset.id,
                        modificationTime: asset.modificationTime,
                    });
                    uploadedCount++;

                    console.log(`[Background Sync] Uploaded: ${assetInfo.filename}`);

                    // Her 10 dosyada bir kaydet
                    if (uploadedCount % 10 === 0) {
                        await AsyncStorage.setItem('uploadedFiles', JSON.stringify(newUploadedFiles));
                    }
                } else {
                    console.error(`[Background Sync] Upload failed for ${assetInfo.filename}. Status: ${uploadResponse.status}, Body: ${uploadResponse.body}`);
                }

            } catch (error: any) {
                console.error(`[Background Sync] Error processing asset ${asset.id}:`, error.message);
            }
        }

        // Son durumu kaydet
        await AsyncStorage.setItem('uploadedFiles', JSON.stringify(newUploadedFiles));
        await AsyncStorage.setItem('lastSyncTime', new Date().toISOString());

        console.log(`[Background Sync] Completed. Uploaded ${uploadedCount} files`);

        return uploadedCount > 0
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData;

    } catch (error) {
        console.error('[Background Sync] Task error:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

// Background fetch'i kaydet
export async function registerBackgroundSync() {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);

        if (!isRegistered) {
            await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
                minimumInterval: 15 * 60, // 15 dakika
                stopOnTerminate: false,
                startOnBoot: true,
            });
            console.log('[Background Sync] Registered successfully');
        }
    } catch (error) {
        console.error('[Background Sync] Registration error:', error);
    }
}

// Background fetch'i kaldır
export async function unregisterBackgroundSync() {
    try {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
        console.log('[Background Sync] Unregistered');
    } catch (error) {
        console.error('[Background Sync] Unregister error:', error);
    }
}

// Manuel sync tetikle
export async function triggerManualSync() {
    try {
        await BackgroundFetch.setMinimumIntervalAsync(1); // 1 saniye
        console.log('[Background Sync] Manual sync triggered');
    } catch (error) {
        console.error('[Background Sync] Manual sync error:', error);
    }
}

// Sync durumunu al
export async function getSyncStatus() {
    try {
        const lastSyncTime = await AsyncStorage.getItem('lastSyncTime');
        const uploadedJson = await AsyncStorage.getItem('uploadedFiles');
        const uploadedFiles: UploadedFile[] = uploadedJson ? JSON.parse(uploadedJson) : [];

        return {
            lastSyncTime: lastSyncTime ? new Date(lastSyncTime) : null,
            uploadedCount: uploadedFiles.length,
        };
    } catch (error) {
        console.error('[Background Sync] Status error:', error);
        return {
            lastSyncTime: null,
            uploadedCount: 0,
        };
    }
}
