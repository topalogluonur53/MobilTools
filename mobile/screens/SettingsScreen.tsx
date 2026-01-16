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
    Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../services/api';
import { registerBackgroundSync, unregisterBackgroundSync, getSyncStatus } from '../services/backgroundSync';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

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
        console.log('Settings Screen Loaded');
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
                            `${API_URL}/drive/files/`,
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
        if (!date) return 'Henüz yok';
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Az önce';
        if (minutes < 60) return `${minutes} dk önce`;
        if (hours < 24) return `${hours} sa önce`;
        if (days < 7) return `${days} gün önce`;
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    };

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Ayarlar</Text>
                    {onClose && (
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <View style={styles.closeButtonCircle}>
                                <Ionicons name="close" size={28} color="#1C1C1E" />
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Status Card */}
                    <View style={styles.card}>
                        <View style={styles.statusRow}>
                            <View style={styles.statusItem}>
                                <View style={[styles.iconContainer, { backgroundColor: '#E1F5FE' }]}>
                                    <Ionicons name="cloud-done" size={24} color="#039BE5" />
                                </View>
                                <View style={styles.statusTextContainer}>
                                    <Text style={styles.statusLabel}>Son Yedekleme</Text>
                                    <Text style={styles.statusValue}>{formatDate(lastSyncTime)}</Text>
                                </View>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.statusItem}>
                                <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                                    <Ionicons name="images" size={24} color="#43A047" />
                                </View>
                                <View style={styles.statusTextContainer}>
                                    <Text style={styles.statusLabel}>Toplam</Text>
                                    <Text style={styles.statusValue}>{uploadedCount} Dosya</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Main Action */}
                    <TouchableOpacity
                        style={[styles.primaryActionCard, isUploading && styles.disabledCard]}
                        onPress={handleManualBackup}
                        disabled={isUploading}
                        activeOpacity={0.8}
                    >
                        {isUploading ? (
                            <View style={styles.uploadingContent}>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                                <Text style={styles.primaryActionText}>
                                    Yedekleniyor... {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.actionContent}>
                                <View style={styles.actionIconCircle}>
                                    <Ionicons name="cloud-upload" size={24} color="#007AFF" />
                                </View>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.primaryActionTitle}>Hemen Yedekle</Text>
                                    <Text style={styles.primaryActionSubtitle}>Galeriden fotoğraf ve video seç</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                            </View>
                        )}
                        {/* Decorative background gradient approximation using Views */}
                        <View style={styles.actionBackgroundOverlay} />
                    </TouchableOpacity>

                    {/* Auto Sync Section */}
                    <Text style={styles.sectionTitle}>OTOMATİK YEDEKLEME</Text>
                    <View style={styles.card}>
                        <SettingItem
                            icon="sync"
                            iconColor="#007AFF"
                            iconBg="#E3F2FD"
                            label="Otomatik Senkronizasyon"
                            value={autoSyncEnabled}
                            onValueChange={handleAutoSyncToggle}
                            isLast={!autoSyncEnabled}
                        />

                        {autoSyncEnabled && (
                            <>
                                <View style={styles.separator} />
                                <SettingItem
                                    icon="wifi"
                                    iconColor="#5E35B1"
                                    iconBg="#EDE7F6"
                                    label="Sadece Wi-Fi ile"
                                    value={wifiOnly}
                                    onValueChange={handleWifiOnlyToggle}
                                />
                                <View style={styles.separator} />
                                <SettingItem
                                    icon="image"
                                    iconColor="#FB8C00"
                                    iconBg="#FFF3E0"
                                    label="Fotoğrafları Yedekle"
                                    value={backupPhotos}
                                    onValueChange={handleBackupPhotosToggle}
                                />
                                <View style={styles.separator} />
                                <SettingItem
                                    icon="videocam"
                                    iconColor="#E53935"
                                    iconBg="#FFEBEE"
                                    label="Videoları Yedekle"
                                    value={backupVideos}
                                    onValueChange={handleBackupVideosToggle}
                                    isLast
                                />
                            </>
                        )}
                    </View>

                    {/* Schedule Section */}
                    {autoSyncEnabled && (
                        <>
                            <Text style={styles.sectionTitle}>ZAMANLAMA</Text>
                            <View style={styles.card}>
                                <SettingItem
                                    icon="time"
                                    iconColor="#8E24AA"
                                    iconBg="#F3E5F5"
                                    label="Zamanlanmış Görev"
                                    value={schedulingEnabled}
                                    onValueChange={handleSchedulingToggle}
                                    isLast={!schedulingEnabled}
                                />

                                {schedulingEnabled && (
                                    <>
                                        <View style={styles.separator} />
                                        <View style={styles.timeContainer}>
                                            <View style={styles.timeBox}>
                                                <Text style={styles.timeLabel}>Başlangıç</Text>
                                                <View style={styles.timeValueBox}>
                                                    <Text style={styles.timeValueText}>{startTime}</Text>
                                                </View>
                                            </View>
                                            <Ionicons name="arrow-forward" size={16} color="#BDBDBD" />
                                            <View style={styles.timeBox}>
                                                <Text style={styles.timeLabel}>Bitiş</Text>
                                                <View style={styles.timeValueBox}>
                                                    <Text style={styles.timeValueText}>{endTime}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>
                        </>
                    )}

                    <Text style={styles.footerNote}>
                        Arka plan izinleri ve pil optimizasyonları yedekleme sıklığını etkileyebilir.
                    </Text>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// Reusable Setting Component
interface SettingItemProps {
    icon: any;
    iconColor: string;
    iconBg: string;
    label: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    iconColor,
    iconBg,
    label,
    value,
    onValueChange,
    isLast
}) => (
    <View style={[styles.settingItem, isLast && styles.settingItemLast]}>
        <View style={styles.settingLeft}>
            <View style={[styles.settingIconBox, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <Text style={styles.settingLabel}>{label}</Text>
        </View>
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#E0E0E0', true: '#34C759' }}
            thumbColor="#FFFFFF"
        />
    </View>
);

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    safeArea: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 30 : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: '#F2F2F7',
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '700',
        color: '#1C1C1E',
        letterSpacing: -0.5,
    },
    closeButton: {
        padding: 4,
    },
    closeButtonCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8A8A8E',
        textTransform: 'uppercase',
        marginLeft: 16,
        marginBottom: 8,
        marginTop: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        // iOS Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        // Android Shadow
        elevation: 2,
    },
    statusRow: {
        flexDirection: 'row',
        paddingVertical: 16,
    },
    statusItem: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusTextContainer: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 12,
        color: '#8A8A8E',
        fontWeight: '500',
    },
    statusValue: {
        fontSize: 15,
        color: '#1C1C1E',
        fontWeight: '600',
        marginTop: 2,
    },
    verticalDivider: {
        width: 1,
        backgroundColor: '#E5E5EA',
        marginVertical: 4,
    },
    primaryActionCard: {
        marginTop: 20,
        backgroundColor: '#007AFF',
        borderRadius: 16,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
        // iOS Shadow
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        // Android Shadow
        elevation: 4,
    },
    disabledCard: {
        backgroundColor: '#8E8E93',
        shadowOpacity: 0.1,
    },
    actionBackgroundOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.05)',
        transform: [{ skewX: '-20deg' }, { translateX: -50 }],
    },
    actionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    uploadingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        gap: 10,
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTextContainer: {
        flex: 1,
        marginLeft: 14,
    },
    primaryActionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    primaryActionSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    primaryActionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },

    // Settings Items
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    settingItemLast: {
        paddingBottom: 12,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingLabel: {
        fontSize: 16,
        color: '#1C1C1E',
        fontWeight: '500',
    },
    separator: {
        height: 0.5,
        backgroundColor: '#C6C6C8',
        marginLeft: 60,
    },

    // Time Selector
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FAF9FA',
    },
    timeBox: {
        flex: 1,
        alignItems: 'center',
    },
    timeLabel: {
        fontSize: 12,
        color: '#8A8A8E',
        marginBottom: 4,
    },
    timeValueBox: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    timeValueText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E',
    },

    footerNote: {
        fontSize: 12,
        color: '#8A8A8E',
        textAlign: 'center',
        marginTop: 24,
        marginHorizontal: 20,
        lineHeight: 16,
    },
});
