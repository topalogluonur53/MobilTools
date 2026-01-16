import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Modal, Alert, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import api, { API_URL } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import SettingsScreen from './SettingsScreen';

interface FileItem {
    id: string;
    filename: string;
    file_type: 'FILE' | 'PHOTO';
    file: string;
    file_url?: string;
    created_at: string;
    is_favorite?: boolean;
    file_size: number;
}

type TabType = 'photos' | 'files' | 'favorites' | 'trash';

export default function CloudScreen() {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<TabType>('photos');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (activeTab === 'trash') {
                params.trash = 'true';
            }
            // If API supports filtering by Favorite server-side:
            // if (activeTab === 'favorites') params.favorite = 'true';

            // DÜZELTME: /drive/files/ yerine /drive/files
            // Not: Django trailing slash isteyebilir, router configuration'a göre değişir.
            // Backend router SimpleRouter(trailing_slash=False) kullanıyor ise /drive/files doğru.
            // Eğer DefaultRouter ise /drive/files/ olabilir.
            // `backend/drive/urls.py` dosyasında `SimpleRouter(trailing_slash=False)` kullanılıyor.
            // Yani /drive/files DOĞRU, /drive/files/ YANLIŞ.
            const response = await api.get('/drive/files', { params });
            setFiles(response.data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFiles();
    };

    const handleUpload = () => {
        if (activeTab === 'trash') return;
        Alert.alert(
            'Yükleme Türü Seçin',
            'Neyi yüklemek istersiniz?',
            [
                { text: 'Fotoğraf/Video', onPress: pickImage },
                { text: 'Belge/Dosya', onPress: pickDocument },
                { text: 'İptal', style: 'cancel' },
            ]
        );
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (!result.canceled) {
                await uploadFiles(result.assets, 'PHOTO');
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Hata', 'Galeriye erişirken bir sorun oluştu.');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: true
            });

            if (!result.canceled) {
                // Document picker "assets" is standardized in newer versions, check result structure
                const assets = result.assets ? result.assets : [result];
                await uploadFiles(assets, 'FILE');
            }
        } catch (error) {
            console.error('Document picker error:', error);
            Alert.alert('Hata', 'Dosya seçilirken bir sorun oluştu.');
        }
    };

    const uploadFiles = async (assets: any[], type: 'PHOTO' | 'FILE') => {
        setUploading(true);
        let successCount = 0;
        let failCount = 0;

        for (const asset of assets) {
            try {
                const formData = new FormData();
                const uri = asset.uri;
                const name = asset.fileName || asset.name || uri.split('/').pop() || `upload_${Date.now()}`;

                // Determine mime type if possible, fallback to generic
                const mimeType = asset.mimeType || (type === 'PHOTO' ? 'image/jpeg' : 'application/octet-stream');

                formData.append('file', {
                    uri: uri,
                    type: mimeType,
                    name: name,
                } as any);
                formData.append('file_type', type);

                // DÜZELTME: /drive/files/ yerine /drive/files
                await api.post('/drive/files', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    }
                });
                successCount++;
            } catch (error) {
                console.error(`Upload failed for ${asset.name}:`, error);
                failCount++;
            }
        }

        setUploading(false);

        if (successCount > 0) {
            Alert.alert('Başarılı', `${successCount} dosya başarıyla yüklendi.${failCount > 0 ? ` (${failCount} hata)` : ''}`);
            fetchFiles();
        } else if (failCount > 0) {
            Alert.alert('Hata', 'Yükleme başarısız oldu.');
        }
    };

    const handleDelete = (item: FileItem) => {
        Alert.alert(
            activeTab === 'trash' ? 'Kalıcı Olarak Sil' : 'Sil',
            activeTab === 'trash' ? 'Bu dosya kalıcı olarak silinecek. Emin misiniz?' : 'Bu dosyayı çöp kutusuna taşımak istiyor musunuz?',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // DÜZELTME: trailing slash
                            await api.delete(`/drive/files/${item.id}`);
                            setFiles(prev => prev.filter(f => f.id !== item.id));
                        } catch (e) {
                            Alert.alert('Hata', 'Silme işlemi başarısız.');
                        }
                    }
                }
            ]
        );
    };

    const handleRestore = async (item: FileItem) => {
        try {
            // DÜZELTME: trailing slash
            await api.post(`/drive/files/${item.id}/restore`);
            setFiles(prev => prev.filter(f => f.id !== item.id));
            Alert.alert('Başarılı', 'Dosya geri yüklendi.');
        } catch (e) {
            Alert.alert('Hata', 'Geri yükleme başarısız.');
        }
    };

    const filteredFiles = files.filter(f => {
        if (activeTab === 'trash') return true; // Server already filters, but be safe
        if (activeTab === 'favorites') return f.is_favorite;
        if (activeTab === 'photos') return f.file_type === 'PHOTO';
        if (activeTab === 'files') return f.file_type === 'FILE';
        return true;
    });

    const getFileUrl = (item: FileItem) => {
        if (item.file_url) return item.file_url;
        const rootUrl = API_URL.replace('/api', '');
        return `${rootUrl}${item.file}`;
    };

    const renderItem = ({ item }: { item: FileItem }) => {
        const isPhoto = item.file_type === 'PHOTO';
        const uri = getFileUrl(item);

        return (
            <TouchableOpacity
                style={styles.itemContainer}
                onPress={() => isPhoto ? setPreviewItem(item) : Alert.alert('Bilgi', item.filename)}
                onLongPress={() => {
                    if (activeTab === 'trash') {
                        Alert.alert('Seçenekler', item.filename, [
                            { text: 'Geri Yükle', onPress: () => handleRestore(item) },
                            { text: 'Kalıcı Sil', onPress: () => handleDelete(item), style: 'destructive' },
                            { text: 'İptal', style: 'cancel' }
                        ]);
                    } else {
                        Alert.alert('Seçenekler', item.filename, [
                            { text: 'Sil', onPress: () => handleDelete(item), style: 'destructive' },
                            { text: 'İptal', style: 'cancel' }
                        ]);
                    }
                }}
            >
                <View style={styles.thumbnail}>
                    {isPhoto ? (
                        <Image
                            source={{ uri: uri }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.image, styles.filePlaceholder]}>
                            <Ionicons name="document-text-outline" size={32} color="#007AFF" />
                        </View>
                    )}
                    {item.is_favorite && activeTab !== 'trash' && (
                        <View style={styles.favIcon}>
                            <Ionicons name="heart" size={12} color="red" />
                        </View>
                    )}
                </View>
                <Text style={styles.fileName} numberOfLines={1}>{item.filename}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#007AFF" />
                    <Text style={styles.backText}>Geri</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ooCloud</Text>
                {activeTab !== 'trash' ? (
                    <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
                        {uploading ? <ActivityIndicator size="small" color="#007AFF" /> : <Ionicons name="add" size={28} color="#007AFF" />}
                    </TouchableOpacity>
                ) : <View style={{ width: 32 }} />}
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'photos' && styles.activeTab]} onPress={() => setActiveTab('photos')}>
                    <Ionicons name="images-outline" size={18} color={activeTab === 'photos' ? '#007AFF' : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'files' && styles.activeTab]} onPress={() => setActiveTab('files')}>
                    <Ionicons name="folder-open-outline" size={18} color={activeTab === 'files' ? '#007AFF' : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'favorites' && styles.activeTab]} onPress={() => setActiveTab('favorites')}>
                    <Ionicons name="heart-outline" size={18} color={activeTab === 'favorites' ? '#007AFF' : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'trash' && styles.activeTab]} onPress={() => setActiveTab('trash')}>
                    <Ionicons name="trash-outline" size={18} color={activeTab === 'trash' ? '#007AFF' : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} onPress={() => setShowSettings(true)}>
                    <Ionicons name="settings-outline" size={18} color="#666" />
                </TouchableOpacity>
            </View>


            {/* Content */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={filteredFiles}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    numColumns={3}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name={activeTab === 'photos' ? "images-outline" : "folder-open-outline"} size={48} color="#ccc" />
                            <Text style={styles.emptyText}>Dosya bulunamadı</Text>
                            <TouchableOpacity style={styles.emptyUploadBtn} onPress={handleUpload}>
                                <Text style={styles.emptyUploadText}>Dosya Yükle</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Basic Image Preview Modal */}
            <Modal visible={!!previewItem} transparent={true} onRequestClose={() => setPreviewItem(null)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setPreviewItem(null)}>
                        <Ionicons name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    {previewItem && (
                        <Image
                            source={{ uri: getFileUrl(previewItem) }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Settings Modal */}
            <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
                <SettingsScreen onClose={() => setShowSettings(false)} />
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 17,
        color: '#007AFF',
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    uploadButton: {
        padding: 4,
    },
    tabsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeTab: {
        backgroundColor: '#F2F2F7',
        borderColor: '#007AFF', // or a subtle border
    },
    tabText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#666',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 8,
    },
    itemContainer: {
        flex: 1 / 3,
        aspectRatio: 1,
        margin: 4,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thumbnail: {
        flex: 1,
        width: '100%',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        marginBottom: 4,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    filePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileName: {
        fontSize: 11,
        color: '#333',
        textAlign: 'center',
        width: '100%',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        color: '#999',
        fontSize: 16,
        marginBottom: 20,
    },
    emptyUploadBtn: {
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    emptyUploadText: {
        color: 'white',
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    favIcon: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 10,
        padding: 2,
    }
});
