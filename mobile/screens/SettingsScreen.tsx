import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Switch,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Platform,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api';
import { registerBackgroundSync, unregisterBackgroundSync, getSyncStatus } from '../services/backgroundSync';

interface SettingsScreenProps {
    onClose?: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
    const [wifiOnly, setWifiOnly] = useState(true);
    const [backupPhotos, setBackupPhotos] = useState(true);
    const [backupVideos, setBackupVideos] = useState(true);
    const [schedulingEnabled, setSchedulingEnabled] = useState(false);
    const [startTime, setStartTime] = useState('22:00');
    const [endTime, setEndTime] = useState('06:00');
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [uploadedCount, setUploadedCount] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        loadSettings();
        loadSyncStatus();
    }, []);

    const loadSettings = async () => {
        try {
            const settingsJson = await AsyncStorage.getItem('syncSettings');
            if (settingsJson) {
                const settings = JSON.parse(settingsJson);
                setAutoSyncEnabled(settings.enabled || false);
                setWifiOnly(settings.wifiOnly !== false);
                setBackupPhotos(settings.backupPhotos !== false);
                setBackupVideos(settings.backupVideos !== false);
                setSchedulingEnabled(!!settings.startTime);
                setStartTime(settings.startTime || '22:00');
                setEndTime(settings.endTime || '06:00');
            }
        } catch (error) {
            console.error('Load settings error:', error);
        }
    };

    const loadSyncStatus = async () => {
        const status = await getSyncStatus();
        setLastSyncTime(status.lastSyncTime);
        setUploadedCount(status.uploadedCount);
    };

    const saveSettings = async (newSettings: any) => {
        try {
            await AsyncStorage.setItem('syncSettings', JSON.stringify(newSettings));
        } catch (error) {
            console.error('Save settings error:', error);
        }
    };

    const handleAutoSyncToggle = async (value: boolean) => {
        setAutoSyncEnabled(value);

        const settings = {
            enabled: value,
            wifiOnly,
            backupPhotos,
            backupVideos,
            startTime: schedulingEnabled ? startTime : undefined,
            endTime: schedulingEnabled ? endTime : undefined,
        };

        await saveSettings(settings);

        if (value) {
            await registerBackgroundSync();
        } else {
            await unregisterBackgroundSync();
        }
    };

    const handleWifiOnlyToggle = async (value: boolean) => {
        setWifiOnly(value);
        await saveSettings({
            enabled: autoSyncEnabled,
            wifiOnly: value,
            backupPhotos,
            backupVideos,
            startTime: schedulingEnabled ? startTime : undefined,
            endTime: schedulingEnabled ? endTime : undefined,
        });
    };

    const handleBackupPhotosToggle = async (value: boolean) => {
        setBackupPhotos(value);
        await saveSettings({
            enabled: autoSyncEnabled,
            wifiOnly,
            backupPhotos: value,
            backupVideos,
            startTime: schedulingEnabled ? startTime : undefined,
            endTime: schedulingEnabled ? endTime : undefined,
        });
    };

    const handleBackupVideosToggle = async (value: boolean) => {
        setBackupVideos(value);
        await saveSettings({
            enabled: autoSyncEnabled,
            wifiOnly,
            backupPhotos,
            backupVideos: value,
            startTime: schedulingEnabled ? startTime : undefined,
            endTime: schedulingEnabled ? endTime : undefined,
        });
    };

    const handleSchedulingToggle = async (value: boolean) => {
        setSchedulingEnabled(value);
        await saveSettings({
            enabled: autoSyncEnabled,
            wifiOnly,
            backupPhotos,
            backupVideos,
            startTime: value ? startTime : undefined,
            endTime: value ? endTime : undefined,
        });
    };

    const handleManualBackup = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Fotoğraflara erişim izni vermeniz gerekiyor.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (!result.canceled && result.assets.length > 0) {
                setIsUploading(true);
                const total = result.assets.length;
                let uploaded = 0;
                let failed = 0;

                setUploadProgress({ current: 0, total });

                const token = await AsyncStorage.getItem('authToken');
                if (!token) {
                    Alert.alert('Hata', 'Oturum açmanız gerekiyor.');
                    setIsUploading(false);
                    return;
                }

                for (const asset of result.assets) {
                    try {
                        const apiFileType = asset.type === 'image' ? 'PHOTO' : 'FILE';

                        const uploadResponse = await FileSystem.uploadAsync(
                            `${API_URL}/drive/files`,
                            asset.uri,
                            {
                                fieldName: 'file',
                                httpMethod: 'POST',
                                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    Accept: 'application/json',
                                },
                                parameters: {
                                    file_type: apiFileType,
                                },
                            }
                        );

                        if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
                            uploaded++;
                        } else {
                            console.error('Upload failed:', uploadResponse.body);
                            failed++;
                        }
                    } catch (e) {
                        console.error('Upload error:', e);
                        failed++;
                    }

                    setUploadProgress({ current: uploaded + failed, total });
                }

                setIsUploading(false);
                setUploadProgress({ current: 0, total: 0 });

                Alert.alert(
                    'Tamamlandı',
                    `${uploaded} dosya başarıyla yedeklendi.${failed > 0 ? `\n${failed} dosya yüklenemedi.` : ''}`
                );
                loadSyncStatus();
            }
        } catch (error) {
            setIsUploading(false);
            setUploadProgress({ current: 0, total: 0 });
            Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
            console.error(error);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Henüz yapılmadı';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Az önce';
        if (minutes < 60) return `${minutes} dakika önce`;
        if (hours < 24) return `${hours} saat önce`;
        if (days < 7) return `${days} gün önce`;
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

            {/* Header with Close Button */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={28} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ayarlar</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Manual Backup Button */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={[styles.backupButton, isUploading && styles.backupButtonDisabled]}
                        onPress={handleManualBackup}
                        disabled={isUploading}
                        activeOpacity={0.7}
                    >
                        {isUploading ? (
                            <View style={styles.uploadingContainer}>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.backupButtonText}>
                                    Yükleniyor ({uploadProgress.current}/{uploadProgress.total})
                                </Text>
                            </View>
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                                <Text style={styles.backupButtonText}>Galeriden Seç ve Yedekle</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Backup Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>YEDEKLEME BİLGİSİ</Text>
                    <View style={styles.settingsGroup}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Son Yedekleme</Text>
                            <Text style={styles.infoValue}>{formatDate(lastSyncTime)}</Text>
                        </View>
                        <View style={styles.rowDivider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Yedeklenen Dosya</Text>
                            <Text style={styles.infoValue}>{uploadedCount} öğe</Text>
                        </View>
                    </View>
                </View>

                {/* Auto Backup Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>OTOMATİK YEDEKLEME</Text>
                    <View style={styles.settingsGroup}>
                        <SettingRow
                            label="Otomatik Yedekleme"
                            description="Fotoğraf ve videoları otomatik yedekle"
                            value={autoSyncEnabled}
                            onValueChange={handleAutoSyncToggle}
                        />
                    </View>
                </View>

                {/* Backup Options */}
                {autoSyncEnabled && (
                    <>
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>YEDEKLEME SEÇENEKLERİ</Text>
                            <View style={styles.settingsGroup}>
                                <SettingRow
                                    label="Fotoğrafları Yedekle"
                                    description="Tüm fotoğraflar otomatik yedeklensin"
                                    value={backupPhotos}
                                    onValueChange={handleBackupPhotosToggle}
                                    showDivider
                                />
                                <SettingRow
                                    label="Videoları Yedekle"
                                    description="Tüm videolar otomatik yedeklensin"
                                    value={backupVideos}
                                    onValueChange={handleBackupVideosToggle}
                                    showDivider
                                />
                                <SettingRow
                                    label="Sadece Wi-Fi"
                                    description="Yalnızca Wi-Fi bağlantısında yedekle"
                                    value={wifiOnly}
                                    onValueChange={handleWifiOnlyToggle}
                                />
                            </View>
                        </View>

                        {/* Schedule Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>ZAMANLAMA</Text>
                            <View style={styles.settingsGroup}>
                                <SettingRow
                                    label="Zamanlanmış Yedekleme"
                                    description="Belirli saatler arasında yedekle"
                                    value={schedulingEnabled}
                                    onValueChange={handleSchedulingToggle}
                                />
                            </View>

                            {schedulingEnabled && (
                                <View style={styles.timeSettingsGroup}>
                                    <View style={styles.timeRow}>
                                        <Text style={styles.timeLabel}>Başlangıç Saati</Text>
                                        <Text style={styles.timeValue}>{startTime}</Text>
                                    </View>
                                    <View style={styles.timeDivider} />
                                    <View style={styles.timeRow}>
                                        <Text style={styles.timeLabel}>Bitiş Saati</Text>
                                        <Text style={styles.timeValue}>{endTime}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </>
                )}

                {/* Info Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Otomatik yedekleme etkinleştirildiğinde, seçtiğiniz ayarlara göre fotoğraf ve
                        videolarınız arka planda güvenli bir şekilde yedeklenir.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// Reusable Setting Row Component
interface SettingRowProps {
    label: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    showDivider?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
    label,
    description,
    value,
    onValueChange,
    showDivider = false,
}) => {
    return (
        <>
            <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>{label}</Text>
                    {description && <Text style={styles.settingDescription}>{description}</Text>}
                </View>
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E5E5EA"
                    style={styles.switch}
                />
            </View>
            {showDivider && <View style={styles.rowDivider} />}
        </>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    container: {
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F2F2F7',
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E5EA',
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000000',
    },
    backupButton: {
        backgroundColor: '#007AFF',
        borderRadius: 10,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    backupButtonDisabled: {
        backgroundColor: '#8E8E93',
    },
    backupButtonIcon: {
        fontSize: 20,
    },
    backupButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    // Section
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '400',
        color: '#8E8E93',
        letterSpacing: -0.08,
        paddingHorizontal: 20,
        paddingBottom: 8,
        textTransform: 'uppercase',
    },
    settingsGroup: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 14,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    settingTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 17,
        color: '#000000',
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
    switch: {
        transform: Platform.OS === 'ios' ? [] : [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },
    rowDivider: {
        height: 0.5,
        backgroundColor: '#E5E5EA',
        marginLeft: 16,
    },

    // Info Rows
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    infoLabel: {
        fontSize: 17,
        color: '#000000',
    },
    infoValue: {
        fontSize: 17,
        color: '#8E8E93',
        fontWeight: '500',
    },

    // Time Settings
    timeSettingsGroup: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 14,
        overflow: 'hidden',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    timeLabel: {
        fontSize: 17,
        color: '#000000',
    },
    timeValue: {
        fontSize: 17,
        color: '#007AFF',
        fontWeight: '500',
    },
    timeDivider: {
        height: 0.5,
        backgroundColor: '#E5E5EA',
        marginLeft: 16,
    },

    // Footer
    footer: {
        paddingHorizontal: 32,
        paddingTop: 12,
    },
    footerText: {
        fontSize: 13,
        color: '#8E8E93',
        lineHeight: 18,
        textAlign: 'center',
    },
});
