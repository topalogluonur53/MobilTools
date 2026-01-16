'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
    File as FileIcon,
    Image as ImageIcon,
    Archive,
    Plus,
    LogOut,
    LayoutGrid,
    List,
    Search,
    MoreVertical,
    Folder,
    Settings,
    Download,
    Share2,
    ExternalLink,
    Camera,
    Trash2,
    Copy,
    X,
    Heart,
    Check,
    RotateCcw,
    CheckSquare,
    Video,
    Cloud,
    RefreshCw,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { folderSyncService } from '@/services/folderSync';
import { selectMediaFiles, batchUploadMedia, isMobileDevice } from '@/utils/mobileUpload';

interface FileItem {
    id: string;
    filename: string;
    file_type: 'FILE' | 'PHOTO' | 'VIDEO' | 'AUDIO';
    file: string;
    file_url?: string;
    created_at: string;
    is_favorite?: boolean;
    file_size: number;
}

interface BrowseItem {
    name: string;
    is_dir: boolean;
    path: string;
    size?: number;
    modified?: number;
    type?: 'image' | 'video' | 'pdf' | 'document' | 'archive' | 'file';
}

interface BrowseResponse {
    current_path: string;
    parent_path: string | null;
    items: BrowseItem[];
}

type TabType = 'files' | 'photos' | 'archive' | 'shared' | 'trash' | 'favorites';

const SmartThumbnail = ({ item, viewMode, iconSize, onToggleFavorite, isSelectionMode, isSelected }: { item: BrowseItem | FileItem, viewMode: 'list' | 'grid', iconSize?: number, onToggleFavorite?: (item: FileItem) => void, isSelectionMode?: boolean, isSelected?: boolean }) => {
    const [objUrl, setObjUrl] = useState<string | null>(null);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const isShared = 'path' in item;
    const isDir = isShared ? (item as BrowseItem).is_dir : false;

    let isImage = false;
    let isVideo = false;
    let isPdf = false;
    let isArchive = false;
    let isText = false;

    // Helper to construct URL for personal files locally
    const getPersonalUrl = (file: FileItem) => {
        if (file.file_url) return file.file_url;
        const baseURL = api.defaults.baseURL || 'http://localhost:8001/api';
        const rootUrl = baseURL.replace('/api', '');
        return `${rootUrl}${file.file}`;
    };

    const getMimeType = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
        if (ext === 'png') return 'image/png';
        if (ext === 'webp') return 'image/webp';
        if (ext === 'gif') return 'image/gif';
        if (ext === 'heic') return 'image/heic';
        if (ext === 'mp4') return 'video/mp4';
        if (ext === 'webm') return 'video/webm';
        if (ext === 'mov') return 'video/quicktime';
        if (ext === 'pdf') return 'application/pdf';
        if (['txt', 'md', 'json', 'py', 'js', 'css', 'html', 'xml', 'log', 'ini'].includes(ext || '')) return 'text/plain';
        return 'application/octet-stream';
    };

    if (isShared) {
        const bItem = item as BrowseItem;
        isImage = bItem.type === 'image';
        isVideo = bItem.type === 'video';
        isPdf = bItem.type === 'pdf';
        isArchive = bItem.type === 'archive';

        // Fallback: Backend type göndermezse uzantıdan bul
        if (!isImage && !isVideo && !isPdf && !isArchive) {
            const ext = bItem.name.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) isImage = true;
            if (['mp4', 'webm', 'mov'].includes(ext || '')) isVideo = true;
            if (ext === 'pdf') isPdf = true;
            if (['zip', 'rar', '7z'].includes(ext || '')) isArchive = true;
            if (['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'py', 'log', 'xml', 'yaml', 'yml', 'ini'].includes(ext || '')) isText = true;
        }
    } else {
        const fItem = item as FileItem;
        isImage = fItem.file_type === 'PHOTO';
        const ext = fItem.filename.split('.').pop()?.toLowerCase();
        // Sadece web uyumlu formatlar önizlensin. HEIC ve DNG tarayıcıyı yorar veya desteklenmez.
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext || '')) isImage = true;
        if (['mp4', 'webm', 'mov'].includes(ext || '')) isVideo = true;
        if (ext === 'pdf') isPdf = true;
        if (['zip', 'rar', '7z'].includes(ext || '')) isArchive = true;
        if (['txt', 'md', 'json', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'py', 'log', 'xml', 'yaml', 'yml', 'ini'].includes(ext || '')) isText = true;
    }

    useEffect(() => {
        const shouldFetch = isImage || isVideo || ((isPdf || isText) && (viewMode === 'grid' || !!iconSize));
        if (!shouldFetch) return;

        if (objUrl) {
            window.URL.revokeObjectURL(objUrl);
            setObjUrl(null);
        }
        setTextContent(null);

        let active = true;
        setLoading(true);

        const fetchContent = async () => {
            try {
                let response;

                if (isShared) {
                    const itemPath = (item as BrowseItem).path;
                    const cleanPath = itemPath.startsWith('/') ? itemPath.slice(1) : itemPath;
                    response = await api.get('/drive/serve-shared', {
                        params: { path: cleanPath },
                        responseType: 'blob'
                    });
                } else if (!isShared && isImage) {
                    // Personal Image -> Fetch Thumbnail
                    try {
                        response = await api.get(`/drive/thumbnail/${(item as FileItem).id}`, {
                            responseType: 'blob'
                        });
                    } catch (e) {
                        // Thumbnail fallback to original if failed
                        console.warn("Thumbnail failed, falling back for:", (item as FileItem).filename);
                        setLoading(false);
                        return;
                    }
                } else {
                    setLoading(false);
                    return;
                }

                if (active && response) {
                    if (isText && isShared) {
                        const blob = new Blob([response.data]);
                        const text = await blob.text();
                        setTextContent(text.slice(0, 2000));
                    } else {
                        // Image Thumbnail or Shared Preview
                        let contentType = response.headers['content-type'];
                        if (!contentType || contentType === 'application/octet-stream') {
                            if (isShared) contentType = getMimeType((item as BrowseItem).name);
                            else contentType = 'image/jpeg';
                        }
                        const blob = new Blob([response.data], { type: contentType });
                        const url = window.URL.createObjectURL(blob);
                        setObjUrl(url);
                    }
                }
            } catch (err) {
                console.error("Content fetch err:", err);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchContent();
        return () => { active = false; };
    }, [item, isShared, isImage, isVideo, isPdf, isText, viewMode, iconSize]);

    useEffect(() => {
        return () => { if (objUrl) window.URL.revokeObjectURL(objUrl); };
    }, [objUrl]);

    const size = iconSize || (viewMode === 'list' ? 24 : 40);
    const containerClass = viewMode === 'list' ? 'w-12 h-12 flex-shrink-0' : 'flex-1';
    // Context Menu'da iconSize gönderiliyor, bu durumda container full olmalı
    const finalContainerClass = iconSize ? 'w-full h-full' : containerClass;

    return (
        <div className={`${finalContainerClass} bg-gray-50 dark:bg-[#2C2C2E] flex items-center justify-center overflow-hidden pointer-events-none relative`}>
            {isDir ? (
                <Folder className="text-blue-500" size={size} />
            ) : isImage ? (
                loading ? <div className="animate-pulse bg-gray-200 dark:bg-gray-700 w-full h-full" /> :
                    objUrl ? <img src={objUrl} alt="thumb" loading="lazy" className="w-full h-full object-cover" /> :
                        !isShared ? <img src={getPersonalUrl(item as FileItem)} alt="thumb" loading="lazy" className="w-full h-full object-cover" /> :
                            <ImageIcon className="text-purple-500" size={size} />
            ) : isVideo ? (
                // Video Preview
                (isShared ? objUrl : getPersonalUrl(item as FileItem)) ? (
                    <>
                        <video
                            src={isShared ? objUrl! : getPersonalUrl(item as FileItem)}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                            // Sadece Grid veya Context Menu modunda otomatik oynat
                            autoPlay={viewMode === 'grid' || !!iconSize}
                        />
                        {/* Video ikonu overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <div className="p-2 bg-black/30 rounded-full backdrop-blur-sm">
                                <FileIcon className="text-white" size={size / 1.5} />
                            </div>
                        </div>
                    </>
                ) : (
                    <FileIcon className="text-red-500" size={size} />
                )
            ) : isPdf ? (
                (objUrl && (viewMode === 'grid' || !!iconSize)) ? (
                    <iframe src={`${objUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full bg-white pointer-events-none" title="pdf" />
                ) : (
                    <FileIcon className="text-red-600" size={size} />
                )
            ) : isText ? (
                (textContent && (viewMode === 'grid' || !!iconSize)) ? (
                    <div className="w-full h-full bg-white p-1.5 overflow-hidden">
                        <pre className="text-[6px] leading-[8px] font-mono text-gray-800 whitespace-pre-wrap break-all h-full w-full">{textContent}</pre>
                    </div>
                ) : (
                    <FileIcon className="text-gray-500" size={size} />
                )
            ) : isArchive ? (
                <Archive className="text-orange-500" size={size} />
            ) : (
                <FileIcon className="text-gray-500" size={size} />
            )}
            {/* Selection Checkbox */}
            {isSelectionMode && !iconSize && (
                <div className={`absolute z-30 pointer-events-none ${viewMode === 'grid' ? 'top-2 left-2' : 'top-3 left-3'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white bg-black/20'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                    </div>
                </div>
            )}

        </div>
    );
};

export default function OOCloudDashboard() {
    const { isAuthenticated, logout, user } = useAuthStore();
    const router = useRouter();

    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('photos');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [gridColumns, setGridColumns] = useState(3); // 2-6 arası sütun sayısı
    const [showSizeMenu, setShowSizeMenu] = useState(false);
    const [showUploadMenu, setShowUploadMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Folder Sync States
    const [folderSyncEnabled, setFolderSyncEnabled] = useState(false);
    const [folderSyncStatus, setFolderSyncStatus] = useState({
        isRunning: false,
        folderSelected: false,
        folderName: null as string | null,
        totalFiles: 0,
        uploadedFiles: 0,
        failedFiles: 0,
    });

    // Mobile Upload States
    const [isMobileUploading, setIsMobileUploading] = useState(false);
    const [mobileUploadProgress, setMobileUploadProgress] = useState(0);
    const [mobileUploadTotal, setMobileUploadTotal] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [isManualSyncing, setIsManualSyncing] = useState(false);

    useEffect(() => {
        setIsMobile(isMobileDevice());
    }, []);

    const handleMobileUpload = async () => {
        setIsMobileUploading(true);
        const files = await selectMediaFiles();

        if (files.length > 0) {
            setMobileUploadTotal(files.length);
            await batchUploadMedia(
                files,
                (current, total) => setMobileUploadProgress(current),
                () => { }
            );
            await fetchFiles();
            alert('Yedekleme tamamlandı!');
        }

        setIsMobileUploading(false);
        setMobileUploadProgress(0);
        setMobileUploadTotal(0);
    };


    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredFiles.length && filteredFiles.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredFiles.map(f => f.id)));
        }
    };

    const handleBulkFavorite = async () => {
        if (selectedIds.size === 0) return;

        const selectedFiles = files.filter(f => selectedIds.has(f.id));
        const allFavorited = selectedFiles.every(f => f.is_favorite);
        const targetStatus = !allFavorited;

        try {
            const promises = selectedFiles.map(f => {
                if (f.is_favorite === targetStatus) return Promise.resolve();
                return api.post(`/drive/files/${f.id}/toggle_favorite/`);
            });

            await Promise.all(promises);

            setFiles(prev => prev.map(f => {
                if (selectedIds.has(f.id)) {
                    return { ...f, is_favorite: targetStatus };
                }
                return f;
            }));

            setIsSelectionMode(false);
            setSelectedIds(new Set());
        } catch (err) {
            console.error(err);
            alert('İşlem başarısız');
        }
    };

    const handleBulkRestore = async () => {
        if (selectedIds.size === 0) return;
        try {
            const promises = Array.from(selectedIds).map(id => api.post(`/drive/files/${id}/restore/`));
            await Promise.all(promises);
            setFiles(prev => prev.filter(f => !selectedIds.has(f.id)));
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        } catch { alert('Onarma hatası'); }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`${selectedIds.size} dosyayı silmek istediğinize emin misiniz?`)) return;

        try {
            const promises = Array.from(selectedIds).map(id => api.delete(`/drive/files/${id}`));
            await Promise.all(promises);

            setFiles(prev => prev.filter(f => !selectedIds.has(f.id)));
            setIsSelectionMode(false);
            setSelectedIds(new Set());
        } catch (err) {
            console.error(err);
            alert('Silme işlemi başarısız');
        }
    };

    // Folder Sync Functions
    const handleFolderUpload = async (file: File, path: string): Promise<boolean> => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const ext = file.name.split('.').pop()?.toLowerCase();
            const isPhoto = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'dng', 'arw', 'cr2', 'nef', 'orf', 'rw2', 'raf', 'tiff', 'bmp', 'svg'].includes(ext || '');
            formData.append('file_type', isPhoto ? 'PHOTO' : 'FILE');

            const response = await api.post('/drive/files', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.status === 201) {
                console.log(`✓ Yüklendi: ${file.name}`);
                await fetchFiles();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Upload error:', error);
            return false;
        }
    };

    const handleSelectFolder = async (): Promise<boolean> => {
        const success = await folderSyncService.selectFolder();
        if (success) {
            setFolderSyncStatus(folderSyncService.getStatus());
            if (folderSyncEnabled) {
                await folderSyncService.startAutoSync(handleFolderUpload, 5);
                setFolderSyncStatus(folderSyncService.getStatus());
            }
        }
        return success;
    };

    const handleAutoSyncToggle = async (enabled: boolean) => {
        if (enabled) {
            // Önce klasör seçilmişse sync başlat
            if (folderSyncStatus.folderSelected) {
                setFolderSyncEnabled(true);
                await folderSyncService.startAutoSync(handleFolderUpload, 5);
                setFolderSyncStatus(folderSyncService.getStatus());
            } else {
                // Klasör seçilmemişse, klasör seç
                const success = await handleSelectFolder();
                if (success) {
                    setFolderSyncEnabled(true);
                    await folderSyncService.startAutoSync(handleFolderUpload, 5);
                    setFolderSyncStatus(folderSyncService.getStatus());
                } else {
                    // Kullanıcı iptal etti, toggle'ı kapat
                    setFolderSyncEnabled(false);
                }
            }
        } else {
            setFolderSyncEnabled(false);
            folderSyncService.stopAutoSync();
            setFolderSyncStatus(folderSyncService.getStatus());
        }
    };

    const handleManualBackup = async () => {
        if (folderSyncStatus.isRunning || isManualSyncing) {
            return;
        }

        if (!folderSyncStatus.folderSelected) {
            const success = await handleSelectFolder();
            if (!success) return;
        }

        setIsManualSyncing(true);
        try {
            await folderSyncService.syncNewFiles(handleFolderUpload);
            setFolderSyncStatus(folderSyncService.getStatus());
        } catch (e) {
            console.error(e);
        } finally {
            setIsManualSyncing(false);
            setFolderSyncStatus(folderSyncService.getStatus());
        }
    };


    // Arşiv için state'ler
    const [browseItems, setBrowseItems] = useState<BrowseItem[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [parentPath, setParentPath] = useState<string | null>(null);
    const [browseLoading, setBrowseLoading] = useState(false);

    // Ortak klasör için state'ler
    const [sharedItems, setSharedItems] = useState<BrowseItem[]>([]);
    const [sharedCurrentPath, setSharedCurrentPath] = useState('');
    const [sharedParentPath, setSharedParentPath] = useState<string | null>(null);
    const [sharedLoading, setSharedLoading] = useState(false);
    const [previewItem, setPreviewItem] = useState<BrowseItem | FileItem | null>(null);
    const [selectedBrowseItem, setSelectedBrowseItem] = useState<BrowseItem | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Senkronizasyon Ayarları

    const [syncWifiOnly, setSyncWifiOnly] = useState(true);
    const [backupPhotos, setBackupPhotos] = useState(true);
    const [backupVideos, setBackupVideos] = useState(true);
    const [autoSync, setAutoSync] = useState(false);
    const [syncStartTime, setSyncStartTime] = useState('22:00');
    const [syncEndTime, setSyncEndTime] = useState('06:00');
    const [schedulingEnabled, setSchedulingEnabled] = useState(false);

    // Config Update
    useEffect(() => {
        folderSyncService.updateConfig({ photos: backupPhotos, videos: backupVideos });
    }, [backupPhotos, backupVideos]);

    // Zamanlama ve Otomatik Kontrol (Scheduler)
    useEffect(() => {
        const checkSchedule = async () => {
            // Ana anahtar kapalıysa, çalışıyorsa durdur
            if (!autoSync) {
                if (folderSyncStatus.isRunning) {
                    console.log('Otomatik senkronizasyon kapatıldı');
                    folderSyncService.stopAutoSync();
                    setFolderSyncStatus(folderSyncService.getStatus());
                }
                return;
            }

            // Ana anahtar AÇIK. Planlama durumuna bak.
            let shouldRun = true;

            if (schedulingEnabled) {
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

                if (syncStartTime <= syncEndTime) {
                    shouldRun = currentTime >= syncStartTime && currentTime <= syncEndTime;
                } else {
                    shouldRun = currentTime >= syncStartTime || currentTime <= syncEndTime;
                }

                if (!shouldRun && folderSyncStatus.isRunning) {
                    console.log(`⏰ Zamanlama Dışı (Duruyor): ${currentTime}`);
                    folderSyncService.stopAutoSync();
                    setFolderSyncStatus(folderSyncService.getStatus());
                }
            }

            // Çalışması gerekiyorsa ve çalışmıyorsa başlat
            if (shouldRun && !folderSyncStatus.isRunning && folderSyncStatus.folderSelected) {
                console.log('🔄 Otomatik Senkronizasyon Başlatılıyor...');
                await folderSyncService.startAutoSync(handleFolderUpload, 5);
                setFolderSyncStatus(folderSyncService.getStatus());
            }
        };

        const interval = setInterval(checkSchedule, 60000);
        checkSchedule(); // İlk kontrol
        return () => clearInterval(interval);
    }, [autoSync, schedulingEnabled, syncStartTime, syncEndTime, folderSyncStatus.isRunning, folderSyncStatus.folderSelected]);

    // Context Menu için
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (!isAuthenticated) {
            router.push('/login');
            return;
        }

        // Sadece ilgili tab için fetch yap
        if (activeTab === 'archive') {
            fetchBrowseItems('');
        } else if (activeTab === 'shared') {
            fetchSharedItems('');
        } else {
            // photos, files, trash için fetchFiles
            fetchFiles();
        }
    }, [isAuthenticated, router, mounted, activeTab]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (activeTab === 'trash') params.trash = 'true';
            const res = await api.get('/drive/files', { params });
            setFiles(res.data);
        } catch (err: any) {
            console.error(err);
            if (err.response?.data?.error) {
                alert(`Hata: ${err.response.data.error}`);
            } else {
                alert('Dosyalar yüklenirken bir sorun oluştu.');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchBrowseItems = async (path: string) => {
        setBrowseLoading(true);
        try {
            const res = await api.get<BrowseResponse>('/drive/browse', {
                params: { path }
            });
            setBrowseItems(res.data.items);
            setCurrentPath(res.data.current_path);
            setParentPath(res.data.parent_path);
        } catch (err) {
            console.error('Arşiv yüklenemedi:', err);
        } finally {
            setBrowseLoading(false);
        }
    };

    const fetchSharedItems = async (path: string) => {
        setSharedLoading(true);
        try {
            const res = await api.get<BrowseResponse>('/drive/browse-shared', {
                params: { path }
            });
            setSharedItems(res.data.items);
            setSharedCurrentPath(res.data.current_path);
            setSharedParentPath(res.data.parent_path);
        } catch (err) {
            console.error('Ortak klasör yüklenemedi:', err);
        } finally {
            setSharedLoading(false);
        }
    };

    const handleBrowseItemClick = (item: BrowseItem) => {
        if (item.is_dir) {
            // Klasöre gir
            fetchBrowseItems(item.path);
        } else {
            // Dosyayı aç
            const fileUrl = `file:///D:/ooCloud/${item.path}`;
            window.open(fileUrl, '_blank');
        }
    };

    useEffect(() => {
        if (!previewItem) return;

        const isBrowseItem = (item: any): item is BrowseItem => 'path' in item;
        const isFileItem = (item: any): item is FileItem => 'file' in item;

        let itemType = '';
        if (isBrowseItem(previewItem)) {
            itemType = previewItem.type || '';
        } else if (isFileItem(previewItem)) {
            const ext = previewItem.filename.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) itemType = 'image';
            else if (['mp4', 'webm', 'mov'].includes(ext || '')) itemType = 'video';
            else if (ext === 'pdf') itemType = 'pdf';
        }

        if (!['image', 'video', 'pdf'].includes(itemType)) return;

        const fetchPreview = async () => {
            setPreviewLoading(true);
            try {
                if (isBrowseItem(previewItem)) {
                    const response = await api.get('/drive/serve-shared', {
                        params: { path: previewItem.path },
                        responseType: 'blob'
                    });
                    const contentType = response.headers['content-type'] || response.headers['Content-Type'];
                    const blob = new Blob([response.data], { type: contentType });
                    const url = window.URL.createObjectURL(blob);
                    setPreviewUrl(url);
                } else if (isFileItem(previewItem)) {
                    const response = await api.get(previewItem.file, { responseType: 'blob' });
                    const contentType = response.headers['content-type'] || response.headers['Content-Type'];
                    const blob = new Blob([response.data], { type: contentType });
                    const url = window.URL.createObjectURL(blob);
                    setPreviewUrl(url);
                }
            } catch (error) {
                console.error("Önizleme yüklenemedi:", error);
                if (isFileItem(previewItem)) {
                    setPreviewUrl(getFileUrl(previewItem));
                } else {
                    setPreviewUrl(null);
                }
            } finally {
                setPreviewLoading(false);
            }
        };
        fetchPreview();

        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                window.URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewItem]);

    const handleSharedItemClick = (item: BrowseItem) => {
        if (item.is_dir) {
            fetchSharedItems(item.path);
        } else if (['image', 'video', 'pdf'].includes(item.type || '')) {
            setPreviewItem(item);
        } else {
            handleSharedDownload(item);
        }
    };

    const handleBackClick = () => {
        if (parentPath !== null) {
            fetchBrowseItems(parentPath);
        }
    };

    const handleSharedBackClick = () => {
        if (sharedParentPath !== null) {
            fetchSharedItems(sharedParentPath);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'FILE' | 'PHOTO' = 'FILE') => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        setShowUploadMenu(false);
        setUploading(true);

        try {
            const promises = Array.from(fileList).map(file => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('file_type', type);
                return api.post('/drive/files', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            });
            await Promise.all(promises);
            fetchFiles();
        } catch (err: any) {
            console.error(err);
            alert(`Yükleme başarısız: ${err.response?.data?.message || err.message || 'Bilinmeyen hata'}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSharedUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'FILE' | 'PHOTO' = 'FILE') => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        setShowUploadMenu(false);
        setUploading(true);

        try {
            const promises = Array.from(fileList).map(file => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('file_type', type);
                return api.post('/drive/upload-shared', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            });
            await Promise.all(promises);

            if (activeTab === 'shared') {
                fetchSharedItems(sharedCurrentPath);
            } else {
                alert('Dosyalar paylaşılan klasöre yüklendi');
            }
        } catch (err) {
            console.error(err);
            alert('Yükleme başarısız');
        } finally {
            setUploading(false);
        }
    };

    const handleSharedDownload = async (item: BrowseItem) => {
        try {
            const response = await api.get('/drive/serve-shared', {
                params: { path: item.path },
                responseType: 'blob'
            });

            // Dosya indirme işlemi
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', item.name);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error: any) {
            console.error('İndirme hatası:', error);
            alert(`Dosya indirilemedi: ${error.response?.status === 404 ? 'Dosya bulunamadı' : error.message}`);
        }
    };

    const handleDelete = async () => {
        if (!selectedFile) return;
        if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;

        try {
            await api.delete(`/drive/files/${selectedFile.id}`);
            setFiles(files.filter(f => f.id !== selectedFile.id));
            setShowContextMenu(false);
            alert('Dosya silindi');
        } catch (error) {
            console.error('Silme hatası:', error);
            alert('Silme başarısız');
        }
    };

    // Shared Delete Handler (Mevcut)
    const handleSharedDelete = async (e: React.MouseEvent, item: BrowseItem) => {
        e.stopPropagation(); // Parent click engelle
        if (!confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;

        try {
            await api.delete('/drive/delete-shared', {
                params: { path: item.path }
            });
            // Listeyi yenile
            fetchSharedItems(sharedCurrentPath);
        } catch (error) {
            console.error('Silme hatası:', error);
            alert('Dosya silinemedi');
        }
    };

    const handleSharedCopyToPersonal = async (item: BrowseItem) => {
        try {
            await api.post('/drive/copy-shared', { path: item.path });
            alert('Dosya başarıyla kopyalandı');
        } catch (error: any) {
            console.error('Kopyalama hatası:', error);
            alert(`Kopyalama başarısız: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleContextOpen = () => {
        setShowContextMenu(false);
        if (selectedFile) {
            handleOpen(selectedFile);
        } else if (selectedBrowseItem) {
            if (activeTab === 'shared') {
                handleSharedItemClick(selectedBrowseItem);
            } else {
                if (selectedBrowseItem.is_dir) fetchBrowseItems(selectedBrowseItem.path);
                else {
                    alert('Arşiv dosyaları için önizleme şu an sadece Paylaşılan klasöründe aktiftir.');
                }
            }
        }
    };

    const handleContextDownload = () => {
        setShowContextMenu(false);
        if (selectedFile) {
            handleDownload();
        } else if (selectedBrowseItem) {
            if (activeTab === 'shared') handleSharedDownload(selectedBrowseItem);
            else alert("Bu dosya türü için indirme henüz desteklenmiyor.");
        }
    };

    const handleContextDelete = async () => {
        setShowContextMenu(false);
        if (selectedFile) {
            handleDelete();
        } else if (selectedBrowseItem) {
            if (activeTab === 'shared') {
                const dummyEvent = { stopPropagation: () => { } } as React.MouseEvent;
                await handleSharedDelete(dummyEvent, selectedBrowseItem);
            } else {
                alert("Arşiv dosyaları silinemez.");
            }
        }
    };

    const handleBrowseContextMenu = (e: React.MouseEvent, item: BrowseItem) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedBrowseItem(item);
        setSelectedFile(null);
        setShowContextMenu(true);
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    // Long press handlers
    const handleLongPressStart = (file: FileItem, e: React.TouchEvent | React.MouseEvent) => {
        // e.preventDefault(); // Click'i engelleme
        const timer = setTimeout(() => {
            setIsSelectionMode(true);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
        setLongPressTimer(timer);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    // Preview Helpers
    const getPreviewDetails = (item: BrowseItem | FileItem | null) => {
        if (!item) return { name: '', type: '', isShared: false };
        const isShared = 'path' in item;
        let type = '';
        if (isShared) {
            type = (item as BrowseItem).type || '';
        } else {
            const ext = (item as FileItem).filename.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) type = 'image';
            else if (['mp4', 'webm', 'mov'].includes(ext || '')) type = 'video';
            else if (ext === 'pdf') type = 'pdf';
        }
        return {
            name: isShared ? (item as BrowseItem).name : (item as FileItem).filename,
            type,
            isShared
        };
    };
    const { name: previewName, type: previewType, isShared: previewIsShared } = getPreviewDetails(previewItem);

    const handlePreviewDownloadAction = () => {
        if (!previewItem) return;
        if (previewIsShared) handleSharedDownload(previewItem as BrowseItem);
        else handleDownload(previewItem as FileItem);
    };

    const handleOpen = (fileItem?: FileItem) => {
        const item = fileItem || selectedFile;
        if (!item) return;

        if (isSelectionMode) {
            toggleSelection(item.id);
            return;
        }
        if (item) setPreviewItem(item);
    };

    const handleDownload = async (targetItem?: FileItem) => {
        const item = targetItem || selectedFile;
        if (item) {
            try {
                const fileUrl = getFileUrl(item);
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = item.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // window.URL.revokeObjectURL(url); // Hata veriyor olabilir, comment out kalsın veya düzeltsin
                setShowContextMenu(false);
            } catch (err) {
                console.error('Download failed:', err);
                alert('İndirme başarısız oldu');
            }
        }
    };

    const handleShare = async () => {
        let fileUrl = '';
        if (selectedFile) {
            fileUrl = getFileUrl(selectedFile);
        } else if (selectedBrowseItem) {
            // Paylaşılan için serve linki
            if (activeTab === 'shared') {
                // API URL'ini al
                const baseURL = api.defaults.baseURL || 'http://localhost:8001/api';
                fileUrl = `${baseURL}/drive/serve-shared?path=${encodeURIComponent(selectedBrowseItem.path)}`;
            } else {
                // Arşiv için (yerel)
                fileUrl = `file:///D:/ooCloud/${selectedBrowseItem.path}`;
            }
        }

        if (fileUrl) {
            // Clipboard'a kopyala
            try {
                await navigator.clipboard.writeText(fileUrl);
                alert('Dosya bağlantısı kopyalandı!');
            } catch (err) {
                // Fallback: Manuel kopyalama için input oluştur
                const input = document.createElement('input');
                input.value = fileUrl;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                alert('Dosya bağlantısı kopyalandı!');
            }
        }
        setShowContextMenu(false);
    };

    const handleToggleFavorite = async (item: FileItem) => {
        try {
            const response = await api.post(`/drive/files/${item.id}/toggle_favorite/`);
            if (response.data.status === 'success') {
                const newStatus = response.data.is_favorite;
                setFiles(prev => prev.map(f => f.id === item.id ? { ...f, is_favorite: newStatus } : f));
            }
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };



    // Filter files based on active tab
    const filteredFiles = files.filter(f => {
        // Search Filter
        if (searchQuery && !f.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;

        // Media Filter Logic
        if (filterType === 'photo' && f.file_type !== 'PHOTO') return false;
        if (filterType === 'video' && f.file_type !== 'VIDEO') return false;

        if (activeTab === 'trash') return true;
        if (activeTab === 'favorites') return f.is_favorite;
        if (activeTab === 'photos') return f.file_type === 'PHOTO';
        if (activeTab === 'files') return f.file_type === 'FILE'; // Sadece Dosyalar
        return true;
    });

    // URL düzeltme fonksiyonu
    const getFileUrl = (file: FileItem) => {
        // Backend'den gelen file_url kullan (zaten düzeltilmiş)
        if (file.file_url) return file.file_url;

        // Fallback: file alanını kullan
        const url = file.file;
        if (!url) return '';

        // Eğer zaten doğru domain ise dokunma
        if (url.includes('mobil.onurtopaloglu.uk')) return url;

        // Localhost/127.0.0.1 varsa domain'e çevir
        if (url.includes('localhost:8001') || url.includes('127.0.0.1:8001')) {
            return url.replace('http://localhost:8001', 'https://mobil.onurtopaloglu.uk')
                .replace('http://127.0.0.1:8001', 'https://mobil.onurtopaloglu.uk');
        }

        // Eğer sadece /media/... şeklinde geliyorsa domain ekle
        if (url.startsWith('/media')) {
            return `https://mobil.onurtopaloglu.uk${url}`;
        }

        return url;
    };

    if (!isAuthenticated) return null;

    return (
        <div className="min-h-screen bg-[#F2F2F7] dark:bg-black pb-32" style={{
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            touchAction: 'manipulation'
        }}>
            {/* Top Navigation Bar */}
            <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                {isSelectionMode ? (
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }} className="p-2 -ml-2 text-gray-600 dark:text-gray-300">
                                <X size={24} />
                            </button>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-black dark:text-white leading-none">{selectedIds.size} Seçildi</span>
                                <button onClick={handleSelectAll} className="text-xs text-blue-500 font-medium text-left mt-1 flex items-center gap-1">
                                    {selectedIds.size === filteredFiles.length && filteredFiles.length > 0 ? (
                                        <>Tümünü Kaldır</>
                                    ) : (
                                        <>Tümünü Seç</>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {activeTab === 'trash' ? (
                                <button onClick={handleBulkRestore} className="flex flex-col items-center justify-center p-1.5 min-w-[50px] text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                    <RotateCcw size={20} />
                                    <span className="text-[9px] font-bold leading-none mt-0.5">Geri Yükle</span>
                                </button>
                            ) : (
                                <button onClick={handleBulkFavorite} className="flex flex-col items-center justify-center p-1.5 min-w-[50px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                    <Heart size={20} className={files.filter(f => selectedIds.has(f.id)).every(f => f.is_favorite) && selectedIds.size > 0 ? "fill-current" : ""} />
                                    <span className="text-[9px] font-bold leading-none mt-0.5">Favorile</span>
                                </button>
                            )}
                            <button onClick={handleBulkDelete} className="flex flex-col items-center justify-center p-1.5 min-w-[50px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 size={20} />
                                <span className="text-[9px] font-bold leading-none mt-0.5">Sil</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-black dark:text-white">
                                {activeTab === 'files' && 'Dosyalarım'}
                                {activeTab === 'photos' && 'Fotoğraflar'}
                                {activeTab === 'archive' && 'Arşiv'}
                                {activeTab === 'shared' && 'Paylaşılan'}
                                {activeTab === 'trash' && 'Çöp Kutusu'}
                                {activeTab === 'favorites' && 'Favoriler'}
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowUploadMenu(true)}
                                className="flex flex-col items-center justify-center p-2 rounded-full bg-blue-500 text-white transition-transform active:scale-95 shadow-md shadow-blue-500/30"
                            >
                                <Plus size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Search Bar (Optional Visual) */}
            <div className="px-4 py-3 flex items-center gap-2">
                <div className="bg-gray-200 dark:bg-[#2C2C2E] rounded-xl flex items-center px-3 py-2 gap-2 flex-1 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 relative">
                    <Search size={18} className="text-gray-500" />
                    <input
                        type="text"
                        placeholder="Ara..."
                        className="bg-transparent border-0 outline-none w-full text-sm text-black dark:text-white placeholder:text-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {/* Media Filter Menu Toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 ${filterType !== 'all' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            {filterType === 'video' ? <Video size={18} strokeWidth={2.5} /> : <ImageIcon size={18} strokeWidth={filterType === 'photo' ? 2.5 : 2} />}
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {showFilterMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-full right-0 mt-2 w-36 bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200 dark:border-white/10 overflow-hidden z-50 py-1"
                                    >
                                        <button
                                            onClick={() => { setFilterType('all'); setShowFilterMenu(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${filterType === 'all' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                        >
                                            <LayoutGrid size={14} />
                                            Hepsi
                                        </button>
                                        <button
                                            onClick={() => { setFilterType('photo'); setShowFilterMenu(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${filterType === 'photo' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                        >
                                            <ImageIcon size={14} />
                                            Fotoğraflar
                                        </button>
                                        <button
                                            onClick={() => { setFilterType('video'); setShowFilterMenu(false); }}
                                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 ${filterType === 'video' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                        >
                                            <Video size={14} />
                                            Videolar
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>


                <div className="relative">
                    <button
                        onClick={() => {
                            if (viewMode === 'grid') {
                                setShowSizeMenu(!showSizeMenu);
                            } else {
                                setViewMode('grid');
                            }
                        }}
                        className="p-2.5 bg-white dark:bg-[#1C1C1E] rounded-xl text-gray-600 dark:text-gray-400 relative"
                    >
                        {viewMode === 'grid' ? <LayoutGrid size={20} /> : <List size={20} />}
                        {viewMode === 'grid' && (
                            <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                {gridColumns}
                            </span>
                        )}
                    </button>

                    {/* Size Dropdown Menu */}
                    {showSizeMenu && viewMode === 'grid' && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowSizeMenu(false)}
                            />
                            <div className="absolute top-full mt-2 right-0 bg-white dark:bg-[#1C1C1E] rounded-xl shadow-lg border border-gray-200 dark:border-white/10 p-4 z-50 w-64">
                                <div className="mb-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sütun Sayısı</span>
                                        <span className="text-sm font-bold text-blue-500">{gridColumns}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="2"
                                        max="6"
                                        value={gridColumns}
                                        onChange={(e) => setGridColumns(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        style={{
                                            background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((gridColumns - 2) / 4) * 100}%, rgb(229, 231, 235) ${((gridColumns - 2) / 4) * 100}%, rgb(229, 231, 235) 100%)`
                                        }}
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>Büyük</span>
                                        <span>Küçük</span>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 dark:border-white/10 pt-3">
                                    <button
                                        onClick={() => {
                                            setViewMode('list');
                                            setShowSizeMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                                    >
                                        <List size={16} />
                                        <span>Liste Görünümü</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {(activeTab === 'files' || activeTab === 'photos') && (
                    <button
                        onClick={() => setShowFavorites(!showFavorites)}
                        className={`p-2.5 rounded-xl transition-colors ${showFavorites ? 'bg-red-100 text-red-500 dark:bg-red-900/30' : 'bg-white dark:bg-[#1C1C1E] text-gray-400'}`}
                    >
                        <Heart size={20} className={showFavorites ? "fill-current" : ""} />
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="px-4">
                {activeTab === 'archive' ? (
                    // Arşiv Görünümü
                    <>
                        {/* Breadcrumb / Path */}
                        <div className="mb-4 flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Arşivim</span>
                            {currentPath && (
                                <>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-gray-900 dark:text-white font-medium">{currentPath}</span>
                                </>
                            )}
                        </div>

                        {/* Geri Butonu */}
                        {parentPath !== null && (
                            <button
                                onClick={handleBackClick}
                                className="mb-4 flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1C1C1E] rounded-lg text-blue-500 active:scale-95 transition-transform"
                            >
                                <span>← Geri</span>
                            </button>
                        )}

                        {browseLoading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : browseItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <div className="bg-gray-100 dark:bg-[#1C1C1E] p-6 rounded-full mb-4">
                                    <Folder size={40} />
                                </div>
                                <p>Bu klasör boş</p>
                            </div>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 gap-1" : "flex flex-col gap-2"}>
                                {browseItems.map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleBrowseItemClick(item)}
                                        onContextMenu={(e) => e.preventDefault()}
                                        className={`group relative bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 active:scale-95 transition-transform cursor-pointer ${viewMode === 'list' ? 'flex items-center p-3 gap-3' : 'flex flex-col aspect-square'}`}
                                    >
                                        {/* Icon / Preview */}
                                        <div className={`${viewMode === 'list' ? 'w-12 h-12 flex-shrink-0' : 'flex-1'} bg-gray-50 dark:bg-[#2C2C2E] flex items-center justify-center overflow-hidden`}>
                                            {item.is_dir ? (
                                                <Folder className="text-blue-500" size={viewMode === 'list' ? 24 : 40} />
                                            ) : item.type === 'image' ? (
                                                <ImageIcon className="text-purple-500" size={viewMode === 'list' ? 24 : 40} />
                                            ) : item.type === 'video' ? (
                                                <FileIcon className="text-red-500" size={viewMode === 'list' ? 24 : 40} />
                                            ) : item.type === 'pdf' ? (
                                                <FileIcon className="text-red-600" size={viewMode === 'list' ? 24 : 40} />
                                            ) : item.type === 'archive' ? (
                                                <Archive className="text-orange-500" size={viewMode === 'list' ? 24 : 40} />
                                            ) : (
                                                <FileIcon className="text-gray-500" size={viewMode === 'list' ? 24 : 40} />
                                            )}
                                        </div>

                                        {/* Item Info */}
                                        <div className={viewMode === 'list' ? "flex-1 min-w-0" : "p-3 bg-white dark:bg-[#1C1C1E]"}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {item.name}
                                            </p>
                                            {!item.is_dir && item.size !== undefined && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {(item.size / 1024).toFixed(1)} KB
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : activeTab === 'shared' ? (
                    // Ortak Klasör Görünümü
                    <>
                        {/* Breadcrumb / Path */}
                        <div className="mb-4 flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Paylaşılan</span>
                            {sharedCurrentPath && (
                                <>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-gray-900 dark:text-white font-medium">{sharedCurrentPath}</span>
                                </>
                            )}
                        </div>

                        {/* Geri Butonu */}
                        {sharedParentPath !== null && (
                            <button
                                onClick={handleSharedBackClick}
                                className="mb-4 flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1C1C1E] rounded-lg text-blue-500 active:scale-95 transition-transform"
                            >
                                <span>← Geri</span>
                            </button>
                        )}

                        {sharedLoading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : sharedItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <div className="bg-gray-100 dark:bg-[#1C1C1E] p-6 rounded-full mb-4">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <p>Henüz paylaşılan dosya yok</p>
                            </div>
                        ) : (
                            <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-4 gap-1" : "flex flex-col gap-2"}>
                                {sharedItems.map((item, index) => (
                                    <div
                                        key={index}
                                        onClick={() => handleSharedItemClick(item)}
                                        onContextMenu={(e) => handleBrowseContextMenu(e, item)}
                                        className={`group relative bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 active:scale-95 transition-transform cursor-pointer ${viewMode === 'list' ? 'flex items-center p-3 gap-3' : 'flex flex-col aspect-square'}`}
                                    >
                                        {/* Context Menu Butonu (Sadece dosyalar için) */}
                                        {!item.is_dir && (
                                            <button
                                                onClick={(e) => handleBrowseContextMenu(e, item)}
                                                className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-black/50 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors z-10 shadow-sm backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                        )}
                                        {/* Icon / Preview */}
                                        {/* Icon / Preview */}
                                        <SmartThumbnail item={item} viewMode={viewMode} />

                                        {/* Item Info */}
                                        <div className={viewMode === 'list' ? "flex-1 min-w-0" : "p-3 bg-white dark:bg-[#1C1C1E]"}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {item.name}
                                            </p>
                                            {!item.is_dir && item.size !== undefined && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {(item.size / 1024).toFixed(1)} KB
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    // Dosyalar ve Fotoğraflar Görünümü
                    <>
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <div className="bg-gray-100 dark:bg-[#1C1C1E] p-6 rounded-full mb-4">
                                    {activeTab === 'photos' ? <ImageIcon size={40} /> : <FileIcon size={40} />}
                                </div>
                                <p>Ooo, burası çok boş görünüyor!</p>
                            </div>
                        ) : (
                            <div
                                className={viewMode === 'grid' ? "grid gap-1" : "flex flex-col gap-2"}
                                style={viewMode === 'grid' ? { gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` } : {}}
                            >
                                {filteredFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        onClick={() => handleOpen(file)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedFile(file);
                                            setShowContextMenu(true);
                                        }}
                                        className={`group relative bg-white dark:bg-[#1C1C1E] rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 active:scale-95 transition-transform ${viewMode === 'list' ? 'flex items-center p-3 gap-3' : 'flex flex-col aspect-square'}`}
                                        onTouchStart={(e) => handleLongPressStart(file, e)}
                                        onTouchEnd={handleLongPressEnd}
                                        onTouchMove={handleLongPressEnd}
                                        onMouseDown={(e) => handleLongPressStart(file, e)}
                                        onMouseUp={handleLongPressEnd}
                                        onMouseLeave={handleLongPressEnd}
                                    >
                                        {/* Context Menu Butonu (Top Right - Overlay) */}
                                        {viewMode === 'grid' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFile(file);
                                                    setShowContextMenu(true);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-full text-gray-600 dark:text-gray-300 transition-colors z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-white dark:hover:bg-black/60"
                                            >
                                                <MoreVertical size={14} />
                                            </button>
                                        )}



                                        {/* Preview / Icon */}
                                        {/* Preview / Icon */}
                                        <SmartThumbnail item={file} viewMode={viewMode} onToggleFavorite={handleToggleFavorite} isSelectionMode={isSelectionMode} isSelected={selectedIds.has(file.id)} />

                                        {/* File Info - iOS Style (Heart Left + Name Center) */}
                                        {viewMode === 'grid' && gridColumns >= 6 ? null : (
                                            <div className={viewMode === 'list' ? "flex-1 min-w-0" : "px-2 py-2 bg-white dark:bg-[#1C1C1E] flex items-center gap-1 border-t border-gray-50 dark:border-white/5"}>

                                                {/* Heart Button (Left) */}
                                                {!isSelectionMode && viewMode === 'grid' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleFavorite(file);
                                                        }}
                                                        className={`flex-shrink-0 transition-colors p-0.5 ${file.is_favorite ? 'text-red-500' : 'text-gray-300 hover:text-red-500'
                                                            }`}
                                                    >
                                                        <Heart
                                                            size={12}
                                                            className={file.is_favorite ? "fill-current" : ""}
                                                        />
                                                    </button>
                                                )}

                                                <div className="flex-1 min-w-0 text-center">
                                                    <p className={`truncate font-medium text-gray-500 dark:text-gray-400 ${viewMode === 'list' ? 'text-sm text-left text-gray-900 dark:text-white' : 'text-[10px]'}`}>
                                                        {file.filename}
                                                    </p>
                                                    {viewMode === 'list' && (
                                                        <p className="text-xs text-gray-500 mt-0.5 text-left">
                                                            {new Date(file.created_at).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons for List View - Bottom Right */}
                                        {viewMode === 'list' && (
                                            <div className="absolute bottom-2 right-2 flex items-center gap-2 z-10">
                                                {!isSelectionMode && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleFavorite(file);
                                                        }}
                                                        className={`transition-colors p-1 ${file.is_favorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                                                            }`}
                                                    >
                                                        <Heart
                                                            size={18}
                                                            className={file.is_favorite ? "fill-current" : ""}
                                                        />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFile(file);
                                                        setShowContextMenu(true);
                                                    }}
                                                    className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Upload Menu (Overlay) */}
            <AnimatePresence>
                {showUploadMenu && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowUploadMenu(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] rounded-t-3xl z-50 p-6 shadow-2xl safe-area-bottom"
                        >
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />
                            <h3 className="text-lg font-semibold mb-6 px-2 dark:text-white">Yeni Ekle</h3>

                            <div className="space-y-6">
                                {/* Kişisel Alan */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-1">Kişisel Alanıma Yükle</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform group">
                                            <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e, 'FILE')} />
                                            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                                <FileIcon size={32} />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Dosya</span>
                                        </label>

                                        <label className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform group">
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'PHOTO')} />
                                            <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                                                <ImageIcon size={32} />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Fotoğraf</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Paylaşılan Alan */}
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-1">Ortak Klasöre Yükle</h4>
                                    <div className="flex justify-start">
                                        <label className="flex flex-col items-center gap-2 cursor-pointer active:scale-95 transition-transform group">
                                            <input type="file" multiple className="hidden" onChange={(e) => handleSharedUpload(e, 'FILE')} />
                                            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                                                <Share2 size={32} />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Ortak Paylaş</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowUploadMenu(false)}
                                className="w-full mt-8 py-3.5 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl font-semibold text-gray-900 dark:text-white"
                            >
                                Vazgeç
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Context Menu Modal */}
            <AnimatePresence>

                {showContextMenu && (selectedFile || selectedBrowseItem) && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowContextMenu(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1C1C1E] rounded-t-3xl z-50 p-6 shadow-2xl"
                        >
                            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6" />

                            {/* Dosya Bilgisi ve Önizleme */}
                            <div className="flex flex-col items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
                                <div className="w-56 h-56 bg-gray-100 dark:bg-[#2C2C2E] rounded-3xl flex items-center justify-center overflow-hidden shadow-sm relative border border-gray-100 dark:border-white/10">
                                    <SmartThumbnail
                                        item={selectedFile || selectedBrowseItem!}
                                        viewMode="grid"
                                        iconSize={64}
                                    />
                                </div>
                                <div className="text-center w-full px-4">
                                    <p className="font-semibold text-lg text-gray-900 dark:text-white truncate">
                                        {selectedFile ? selectedFile.filename : selectedBrowseItem!.name}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {selectedFile
                                            ? (selectedFile.file_size / 1024).toFixed(1) + ' KB'
                                            : selectedBrowseItem!.size ? (selectedBrowseItem!.size / 1024).toFixed(1) + ' KB' : ''
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Aksiyonlar */}
                            <div className="space-y-2">
                                <button onClick={handleContextOpen} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors active:scale-95">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><ExternalLink size={20} className="text-blue-600 dark:text-blue-400" /></div>
                                    <span className="font-medium text-gray-900 dark:text-white">Aç</span>
                                </button>

                                <button onClick={handleContextDownload} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors active:scale-95">
                                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"><Download size={20} className="text-green-600 dark:text-green-400" /></div>
                                    <span className="font-medium text-gray-900 dark:text-white">İndir</span>
                                </button>

                                {activeTab === 'shared' && selectedBrowseItem && !selectedBrowseItem.is_dir && (
                                    <button onClick={() => { setShowContextMenu(false); handleSharedCopyToPersonal(selectedBrowseItem!); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors active:scale-95">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><Copy size={20} className="text-indigo-600 dark:text-indigo-400" /></div>
                                        <span className="font-medium text-gray-900 dark:text-white">Kopyala</span>
                                    </button>
                                )}

                                <button onClick={handleShare} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors active:scale-95">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"><Share2 size={20} className="text-purple-600 dark:text-purple-400" /></div>
                                    <span className="font-medium text-gray-900 dark:text-white">Paylaş</span>
                                </button>

                                <button onClick={handleContextDelete} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors active:scale-95">
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><Trash2 size={20} className="text-red-600 dark:text-red-400" /></div>
                                    <span className="font-medium text-gray-900 dark:text-white">Sil</span>
                                </button>
                            </div>


                            <button
                                onClick={() => setShowContextMenu(false)}
                                className="w-full mt-6 py-3.5 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl font-semibold text-gray-900 dark:text-white"
                            >
                                İptal
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSettings(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="fixed inset-0 m-auto w-[90%] max-w-lg h-[80vh] bg-white dark:bg-[#1C1C1E] rounded-3xl z-50 flex flex-col shadow-2xl overflow-hidden"
                        >
                            <div className="flex-none px-6 py-5 flex justify-between items-center border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1C1E]">
                                <h3 className="text-xl font-bold dark:text-white">Ayarlar</h3>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                                >
                                    <X size={20} className="text-gray-600 dark:text-gray-300" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">

                                {/* Profil Header */}
                                <div className="flex flex-col items-center pt-2 pb-2">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-2 shadow-lg ring-2 ring-white dark:ring-white/10">
                                        {user?.username?.[0]?.toUpperCase() || 'K'}
                                    </div>
                                    <h3 className="text-lg font-bold text-black dark:text-white">{user?.username || 'Kullanıcı'}</h3>
                                    <p className="text-xs text-gray-500 font-medium">Standart Plan</p>
                                </div>

                                {/* Depolama */}
                                <div className="bg-gray-50/50 dark:bg-[#2C2C2E]/50 p-5 rounded-2xl border border-gray-100 dark:border-white/5">
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="font-semibold dark:text-white">Depolama Alanı</span>
                                        <span className="text-gray-500">
                                            {(() => {
                                                const totalBytes = files.reduce((sum, f) => sum + (f.file_size || 0), 0);
                                                const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
                                                return `${totalGB} GB / 5 GB`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-blue-500 h-full rounded-full shadow-lg shadow-blue-500/30 transition-all duration-500"
                                            style={{
                                                width: `${Math.min((files.reduce((sum, f) => sum + (f.file_size || 0), 0) / (5 * 1024 * 1024 * 1024)) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 flex justify-between text-xs">
                                        <span className="text-gray-500">Toplam Dosya</span>
                                        <span className="font-semibold dark:text-white">{files.length} öğe</span>
                                    </div>
                                </div>

                                {/* Yedekleme (iOS Style Minimalist) */}
                                <div>
                                    <h4 className="text-xs font-medium text-gray-500 uppercase px-4 mb-2 ml-1">Senkronizasyon</h4>

                                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 border border-gray-200/50 dark:border-white/5 shadow-sm mx-1">

                                        {/* Otomatik Yedekleme */}
                                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <span className="text-sm font-medium dark:text-white">Otomatik Yedekleme</span>
                                            <div
                                                onClick={() => setAutoSync(!autoSync)}
                                                className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${autoSync ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${autoSync ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>

                                        {/* Otomatik Yedekleme AÇIKKEN göster */}
                                        {autoSync && (
                                            <>
                                                {/* Source Folder */}
                                                {!isMobile && (
                                                    <div onClick={handleSelectFolder} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors">
                                                        <span className="text-sm dark:text-white">Kaynak Klasör</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 truncate max-w-[150px]">{folderSyncStatus.folderSelected ? folderSyncStatus.folderName : 'Seçilmedi'}</span>
                                                            <ChevronRight size={16} className="text-gray-400" />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Wifi */}
                                                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <span className="text-sm dark:text-white">Sadece Wi-Fi</span>
                                                    <div
                                                        onClick={() => setSyncWifiOnly(!syncWifiOnly)}
                                                        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${syncWifiOnly ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${syncWifiOnly ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>

                                                {/* Photos */}
                                                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <span className="text-sm dark:text-white">Fotoğraflar</span>
                                                    <div
                                                        onClick={() => setBackupPhotos(!backupPhotos)}
                                                        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${backupPhotos ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${backupPhotos ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>

                                                {/* Videos */}
                                                <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <span className="text-sm dark:text-white">Videolar</span>
                                                    <div
                                                        onClick={() => setBackupVideos(!backupVideos)}
                                                        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${backupVideos ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                                                    >
                                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${backupVideos ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Yedekle Butonu - HER ZAMAN GÖSTER */}
                                    <div className="mt-4 bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/5 shadow-sm mx-1">
                                        <div
                                            onClick={(!isManualSyncing && !folderSyncStatus.isRunning) ? handleManualBackup : undefined}
                                            className={`p-3.5 flex items-center justify-center transition-colors min-h-[50px] ${(!isManualSyncing && !folderSyncStatus.isRunning) ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100' : ''}`}
                                        >
                                            {(isManualSyncing || folderSyncStatus.isRunning) ? (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <Loader2 size={14} className="animate-spin text-gray-500" />
                                                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium tracking-tight">Yedekleniyor...</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {folderSyncStatus.uploadedFiles} / {folderSyncStatus.totalFiles}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[15px] font-medium text-blue-600 dark:text-blue-500">Yedekle</span>
                                            )}
                                        </div>
                                    </div>
                                </div>


                                {/* Bilgi Barı */}
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-500/20 text-white flex items-center gap-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-full">
                                        <Cloud size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight">Bulut Durumu</h4>
                                        <p className="text-xs text-blue-100 mt-1 font-medium">
                                            {files.filter(f => f.file_type === 'PHOTO').length} Fotoğraf • {files.filter(f => f.file_type === 'VIDEO').length} Video
                                        </p>
                                        <p className="text-[10px] text-blue-200 mt-0.5 opacity-80">
                                            Tüm verileriniz şifrelenerek saklanmaktadır.
                                        </p>
                                    </div>
                                </div>

                                {/* Çıkış Yap */}
                                <button
                                    onClick={() => { setShowSettings(false); handleLogout(); }}
                                    className="w-full py-3.5 flex items-center justify-center gap-2 text-red-500 hover:text-red-600 font-semibold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl transition-all active:scale-95"
                                >
                                    <LogOut size={20} />
                                    <span>Oturumu Kapat</span>
                                </button>

                                <div className="pt-2 text-center text-xs text-gray-400">
                                    Versiyon 1.0.2 • MobilTools
                                </div>
                            </div>
                        </motion.div >
                    </>
                )
                }
            </AnimatePresence >


            {/* Bottom Navigation Bar */}
            < div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 pb-6 pt-2 px-2 z-30 shadow-lg" >
                <div className="flex justify-between items-end max-w-md mx-auto">

                    {/* Fotoğraflar */}
                    <button
                        onClick={() => setActiveTab('photos')}
                        className={`flex-1 flex flex-col items-center gap-1 transition-all active:scale-90 ${activeTab === 'photos' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <ImageIcon size={26} strokeWidth={activeTab === 'photos' ? 2.5 : 2} className={activeTab === 'photos' ? "fill-current/10" : ""} />
                        <span className={`text-[10px] font-medium ${activeTab === 'photos' ? 'font-bold' : ''}`}>Fotoğraflar</span>
                    </button>

                    {/* Dosyalar */}
                    <button
                        onClick={() => setActiveTab('files')}
                        className={`flex-1 flex flex-col items-center gap-1 transition-all active:scale-90 ${activeTab === 'files' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <Folder size={26} strokeWidth={activeTab === 'files' ? 2.5 : 2} className={activeTab === 'files' ? "fill-current/10" : ""} />
                        <span className={`text-[10px] font-medium ${activeTab === 'files' ? 'font-bold' : ''}`}>Dosyalar</span>
                    </button>

                    {/* Favoriler */}
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`flex-1 flex flex-col items-center gap-1 transition-all active:scale-90 ${activeTab === 'favorites' ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <Heart size={26} strokeWidth={activeTab === 'favorites' ? 2.5 : 2} className={activeTab === 'favorites' ? "fill-current" : ""} />
                        <span className={`text-[10px] font-medium ${activeTab === 'favorites' ? 'font-bold' : ''}`}>Favoriler</span>
                    </button>

                    {/* Çöp Kutusu */}
                    <button
                        onClick={() => setActiveTab('trash')}
                        className={`flex-1 flex flex-col items-center gap-1 transition-all active:scale-90 ${activeTab === 'trash' ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`}
                    >
                        <Trash2 size={26} strokeWidth={activeTab === 'trash' ? 2.5 : 2} className={activeTab === 'trash' ? "fill-current/10" : ""} />
                        <span className={`text-[10px] font-medium ${activeTab === 'trash' ? 'font-bold' : ''}`}>Çöp Kutusu</span>
                    </button>

                    {/* Ayarlar */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className={`flex-1 flex flex-col items-center gap-1 transition-all active:scale-90 text-gray-400 dark:text-gray-500 hover:text-blue-500`}
                    >
                        <Settings size={26} strokeWidth={2} />
                        <span className="text-[10px] font-medium">Ayarlar</span>
                    </button>
                </div>
            </div >

            {/* Preview Modal */}
            <AnimatePresence>
                {
                    previewItem && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black z-[60]"
                            onClick={() => setPreviewItem(null)}
                        >
                            {/* Üst Bar & Kapat Butonu (Overlay) */}
                            <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" onClick={(e) => e.stopPropagation()}>
                                <h3 className="font-medium truncate flex-1 mr-4 text-white/90 drop-shadow-md pointer-events-auto">{previewName}</h3>
                                <button
                                    onClick={() => setPreviewItem(null)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-sm font-medium text-white backdrop-blur-md pointer-events-auto"
                                >
                                    <X size={18} />
                                    Kapat
                                </button>
                            </div>

                            {/* İçerik Alanı (Tam Ekran) */}
                            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                {previewLoading ? (
                                    <div className="text-white animate-pulse">Yükleniyor...</div>
                                ) : previewUrl ? (
                                    <>
                                        {previewType === 'image' && (
                                            <TransformWrapper
                                                initialScale={1}
                                                minScale={0.5}
                                                maxScale={5}
                                                centerOnInit={true}
                                            >
                                                <TransformComponent
                                                    wrapperStyle={{ width: "100%", height: "100%" }}
                                                    contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                                                >
                                                    <img
                                                        src={previewUrl}
                                                        alt={previewName}
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                </TransformComponent>
                                            </TransformWrapper>
                                        )}

                                        {previewType === 'video' && (
                                            <video
                                                controls
                                                autoPlay
                                                playsInline
                                                className="w-full h-full max-h-screen object-contain"
                                            >
                                                <source src={previewUrl} type="video/mp4" />
                                                Tarayıcınız video oynatmayı desteklemiyor.
                                            </video>
                                        )}

                                        {previewType === 'pdf' && (
                                            <iframe
                                                src={previewUrl}
                                                className="w-full h-full bg-white"
                                                title="PDF Preview"
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center text-white/70">
                                        <p className="mb-4">Bu dosya türü için önizleme yok veya yüklenemedi.</p>
                                        <button
                                            onClick={handlePreviewDownloadAction}
                                            className="px-6 py-3 bg-blue-600 rounded-full text-white font-medium"
                                        >
                                            Dosyayı İndir
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Alt Bar: Aksiyonlar (Overlay) */}
                            <div className="absolute bottom-0 left-0 right-0 z-50 p-8 flex justify-center gap-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" onClick={(e) => e.stopPropagation()}>
                                {previewIsShared && (
                                    <button
                                        onClick={() => handleSharedCopyToPersonal(previewItem as BrowseItem)}
                                        className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors pointer-events-auto drop-shadow-md"
                                    >
                                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-full"><Copy size={24} /></div>
                                        <span className="text-xs font-medium shadow-black">Kopyala</span>
                                    </button>
                                )}

                                <button
                                    onClick={handlePreviewDownloadAction}
                                    className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors pointer-events-auto drop-shadow-md"
                                >
                                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-full"><Download size={24} /></div>
                                    <span className="text-xs font-medium shadow-black">İndir</span>
                                </button>
                            </div>
                        </motion.div>
                    )
                }

            </AnimatePresence >

            {
                uploading && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl animate-pulse">
                            <p className="font-semibold text-black dark:text-white">Yükleniyor...</p>
                        </div>
                    </div>
                )
            }

        </div >
    );
}
