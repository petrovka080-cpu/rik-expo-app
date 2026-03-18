// app/photo-reports/index.tsx
// Экран фотоотчётов с изоляцией по компании

import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    Image,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { BackButton } from '../../src/components/ui/BackButton';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
    fetchPhotoReports,
    createPhotoReport,
    deletePhotoReport,
    uploadPhoto,
    PhotoReport,
    PHOTO_CATEGORIES,
} from '../../src/lib/photo_reports_api';
import { fetchObjects, ConstructionObject } from '../../src/lib/objects_api';
import Skeleton from '../../src/components/Skeleton';
import { useAuth } from '../../src/context/AuthContext';

export default function PhotoReportsScreen() {
    const { user, loading: authLoading } = useAuth();
    const [reports, setReports] = useState<PhotoReport[]>([]);
    const [objects, setObjects] = useState<ConstructionObject[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const LIMIT = 20;

    // Create modal state
    const [showCreate, setShowCreate] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedObject, setSelectedObject] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('progress');
    const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);

    const loadReports = useCallback(async (isRefresh = false) => {
        if (loadingMore) return;

        const currentOffset = isRefresh ? 0 : offset;
        if (!isRefresh) setLoadingMore(true);

        try {
            const data = await fetchPhotoReports(undefined, LIMIT, currentOffset);

            if (isRefresh) {
                setReports(data);
                setOffset(LIMIT);
                // Also fetch objects on refresh
                const objectsData = await fetchObjects(100, 0);
                setObjects(objectsData);
            } else {
                setReports(prev => [...prev, ...data]);
                setOffset(prev => prev + LIMIT);
            }

            setHasMore(data.length === LIMIT);
        } catch (e) {
            console.error('[PhotoReports] loadReports error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [offset, loadingMore]);

    // Wait for auth session to be ready, then fetch
    useEffect(() => {
        if (authLoading) return; // Auth still loading, wait
        if (!user) {
            setLoading(false); // Not logged in
            return;
        }
        loadReports(true);
    }, [authLoading, user]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadReports(true);
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore && !loading) {
            loadReports(false);
        }
    };

    // Request permissions
    const requestPermissions = async () => {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();

        return cameraStatus === 'granted' && mediaStatus === 'granted';
    };

    // Get current location
    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return null;

            const loc = await Location.getCurrentPositionAsync({});

            // Reverse geocode
            const [address] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });

            const addressString = address
                ? `${address.street || ''} ${address.name || ''}, ${address.city || ''}`
                : '';

            return {
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                address: addressString.trim(),
            };
        } catch (e) {
            console.warn('[getCurrentLocation]', e);
            return null;
        }
    };

    // Pick from camera
    const pickFromCamera = async () => {
        const hasPerms = await requestPermissions();
        if (!hasPerms) {
            Alert.alert('Ошибка', 'Нужен доступ к камере');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            const loc = await getCurrentLocation();
            if (loc) setLocation(loc);
            setShowCreate(true);
        }
    };

    // Pick from gallery
    const pickFromGallery = async () => {
        const hasPerms = await requestPermissions();
        if (!hasPerms) {
            Alert.alert('Ошибка', 'Нужен доступ к галерее');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            const loc = await getCurrentLocation();
            if (loc) setLocation(loc);
            setShowCreate(true);
        }
    };

    // Submit photo report
    const handleSubmit = async () => {
        if (!selectedImage) {
            Alert.alert('Ошибка', 'Выберите фото');
            return;
        }

        setUploading(true);

        try {
            // Upload photo first
            const { url, error: uploadError } = await uploadPhoto(
                selectedImage,
                `report_${Date.now()}.jpg`
            );

            if (!url) {
                Alert.alert('Ошибка загрузки', uploadError || 'Не удалось загрузить фото');
                setUploading(false);
                return;
            }

            // Create report
            const { data, error } = await createPhotoReport({
                photo_url: url,
                title: title || undefined,
                description: description || undefined,
                object_id: selectedObject || undefined,
                category: selectedCategory as any,
                latitude: location?.lat,
                longitude: location?.lng,
                address: location?.address,
            });

            if (data) {
                setReports(prev => [data, ...prev]);
                resetForm();
                Alert.alert('Успех', 'Фотоотчёт добавлен');
            } else {
                Alert.alert('Ошибка', error || 'Не удалось создать отчёт');
            }
        } catch (e: any) {
            Alert.alert('Ошибка', e?.message || 'Неизвестная ошибка');
        }

        setUploading(false);
    };

    const resetForm = () => {
        setShowCreate(false);
        setSelectedImage(null);
        setTitle('');
        setDescription('');
        setSelectedObject(null);
        setSelectedCategory('progress');
        setLocation(null);
    };

    // Delete report
    const handleDelete = (report: PhotoReport) => {
        Alert.alert(
            'Удалить фотоотчёт?',
            'Это действие нельзя отменить',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        const { success } = await deletePhotoReport(report.id);
                        if (success) {
                            setReports(prev => prev.filter(r => r.id !== report.id));
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: PhotoReport }) => {
        const category = PHOTO_CATEGORIES.find(c => c.value === item.category);

        return (
            <Pressable style={s.card} onLongPress={() => handleDelete(item)}>
                <Image source={{ uri: item.photo_url }} style={s.cardImage} />
                <View style={s.cardContent}>
                    <View style={s.cardHeader}>
                        <Text style={[s.categoryBadge, { backgroundColor: category?.color || '#64748b' }]}>
                            {category?.label || item.category}
                        </Text>
                        <Text style={s.cardDate}>
                            {new Date(item.taken_at).toLocaleDateString('ru-RU')}
                        </Text>
                    </View>
                    {item.title && <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>}
                    {item.object_name && (
                        <Text style={s.cardObject}>🏗️ {item.object_name}</Text>
                    )}
                    {item.address && (
                        <Text style={s.cardAddress} numberOfLines={1}>📍 {item.address}</Text>
                    )}
                    <Text style={s.cardUser}>👤 {item.user_name || 'Неизвестно'}</Text>
                </View>
            </Pressable>
        );
    };

    const renderSkeleton = () => (
        <View style={s.card}>
            <Skeleton width="100%" height={200} style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
            <View style={{ padding: 12, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Skeleton width={80} height={20} />
                    <Skeleton width={60} height={14} />
                </View>
                <Skeleton width="70%" height={16} />
                <Skeleton width="50%" height={14} />
                <Skeleton width="90%" height={14} />
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={s.container}>
                <View style={s.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <BackButton theme="dark" fallbackPath="/" />
                        <Text style={s.headerTitle}>📸 Фотоотчёты</Text>
                    </View>
                </View>
                <View style={{ padding: 16 }}>
                    {[1, 2].map(i => <View key={i}>{renderSkeleton()}</View>)}
                </View>
            </View>
        );
    }

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <BackButton theme="dark" fallbackPath="/" />
                    <Text style={s.headerTitle}>📸 Фотоотчёты</Text>
                </View>
                <Text style={s.headerCount}>{reports.length}</Text>
            </View>

            {/* Action Buttons */}
            <View style={s.actionRow}>
                <Pressable style={s.actionBtn} onPress={pickFromCamera}>
                    <Text style={s.actionBtnText}>📷 Камера</Text>
                </Pressable>
                <Pressable style={[s.actionBtn, s.actionBtnSecondary]} onPress={pickFromGallery}>
                    <Text style={[s.actionBtnText, { color: '#6366f1' }]}>🖼️ Галерея</Text>
                </Pressable>
            </View>

            {/* List */}
            <FlatList
                data={reports}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={{ paddingVertical: 20 }}>
                            <ActivityIndicator size="small" color="#6366f1" />
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyIcon}>📷</Text>
                        <Text style={s.emptyText}>Нет фотоотчётов</Text>
                        <Text style={s.emptyHint}>Сделайте фото с камеры или галереи</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            />

            {/* Create Modal */}
            <Modal visible={showCreate} animationType="slide" transparent>
                <View style={s.modalOverlay}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Новый фотоотчёт</Text>

                        {selectedImage && (
                            <Image source={{ uri: selectedImage }} style={s.previewImage} />
                        )}

                        <TextInput
                            style={s.input}
                            placeholder="Заголовок (опционально)"
                            value={title}
                            onChangeText={setTitle}
                            placeholderTextColor="#94a3b8"
                        />

                        <TextInput
                            style={[s.input, { height: 80 }]}
                            placeholder="Описание (опционально)"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            placeholderTextColor="#94a3b8"
                        />

                        {/* Category selector */}
                        <View style={s.categoryRow}>
                            {PHOTO_CATEGORIES.map(cat => (
                                <Pressable
                                    key={cat.value}
                                    style={[
                                        s.categoryChip,
                                        selectedCategory === cat.value && { backgroundColor: cat.color },
                                    ]}
                                    onPress={() => setSelectedCategory(cat.value)}
                                >
                                    <Text style={[
                                        s.categoryChipText,
                                        selectedCategory === cat.value && { color: '#fff' },
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Object selector */}
                        {objects.length > 0 && (
                            <View style={s.objectRow}>
                                <Text style={s.label}>Объект:</Text>
                                <Pressable
                                    style={s.objectBtn}
                                    onPress={() => {
                                        // Simple picker - cycle through objects
                                        const idx = objects.findIndex(o => o.id === selectedObject);
                                        const next = objects[(idx + 1) % objects.length];
                                        setSelectedObject(next?.id || null);
                                    }}
                                >
                                    <Text style={s.objectBtnText}>
                                        {objects.find(o => o.id === selectedObject)?.name || 'Не выбран'}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        {location && (
                            <Text style={s.locationText}>📍 {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}</Text>
                        )}

                        <View style={s.modalActions}>
                            <Pressable style={s.cancelBtn} onPress={resetForm}>
                                <Text style={s.cancelBtnText}>Отмена</Text>
                            </Pressable>
                            <Pressable
                                style={[s.submitBtn, uploading && { opacity: 0.6 }]}
                                onPress={handleSubmit}
                                disabled={uploading}
                            >
                                <Text style={s.submitBtnText}>
                                    {uploading ? 'Загрузка...' : 'Сохранить'}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0F14' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F14' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 24,
        backgroundColor: '#0F1623',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    headerCount: { fontSize: 16, fontWeight: '600', color: '#A1A1AA' },
    actionRow: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 0 },
    actionBtn: {
        flex: 1,
        backgroundColor: '#6366f1',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderBottomWidth: 4,
        borderBottomColor: '#4338ca',
    },
    actionBtnSecondary: {
        backgroundColor: '#f1f5f9',
        borderBottomColor: '#e2e8f0',
    },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    card: {
        backgroundColor: '#0F1623',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#1F2A37',
    },
    cardImage: { width: '100%', height: 200 },
    cardContent: { padding: 12 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: '600' },
    cardDate: { fontSize: 12, color: '#94a3b8' },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
    cardObject: { fontSize: 13, color: '#6366f1', marginBottom: 2 },
    cardAddress: { fontSize: 12, color: '#A1A1AA', marginBottom: 2 },
    cardUser: { fontSize: 12, color: '#94a3b8' },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, color: '#A1A1AA' },
    emptyHint: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#0F1623', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 16 },
    previewImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 16 },
    input: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b', marginBottom: 12 },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
    categoryChipText: { fontSize: 12, fontWeight: '600', color: '#A1A1AA' },
    objectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    label: { fontSize: 14, color: '#A1A1AA' },
    objectBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
    objectBtnText: { fontSize: 14, color: '#1e293b' },
    locationText: { fontSize: 12, color: '#A1A1AA', marginBottom: 12 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
    cancelBtnText: { color: '#A1A1AA', fontWeight: '700', fontSize: 16 },
    submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', borderBottomWidth: 4, borderBottomColor: '#059669' },
    submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
