import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    Image,
    ActivityIndicator,
    ScrollView,
    Platform,
    Alert,
    RefreshControl,
    Modal,
    KeyboardAvoidingView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../src/lib/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme, ThemeColors } from '../../src/context/ThemeContext';
import { UI } from '../../src/styles/theme';
import { ProductAutocomplete } from '../../src/components/ProductAutocomplete';
import { fetchUniqueUnits } from '../../src/lib/api/units_api';
import { uploadSupplierFile } from '../../src/lib/files';
import { StatCard, QuickAction } from '../../src/components/ui';
import { BackButton } from '../../src/components/ui/BackButton';

// Extracted to feature module
import {
    Product,
    ProductType,
    ActiveTab,
    UNITS,
    KYRGYZSTAN_CITIES,
    PLACEHOLDER_IMAGE,
    supplierTheme as theme,
    CITY_COORDS,
} from '../../src/features/supplier';

import { MAIN_CATEGORIES, SUB_CATEGORIES } from '../../src/constants/categories';
import { CATALOG_ITEMS, CatalogItem } from '../../src/constants/works_catalog';

// AI Auto-categorization: keyword-based category detection (Lalafo-style)
const KEYWORD_CATEGORY_MAP: Array<{ keywords: string[]; category: string; subcategory: string }> = [
    // Транспорт / Спецтехника
    { keywords: ['кран', 'автокран', 'экскаватор', 'бульдозер', 'погрузчик', 'трактор', 'спецтехника', 'спец техника', 'техника'], category: 'transport', subcategory: 'SPEC-MECH' },
    { keywords: ['грузовик', 'камаз', 'самосвал', 'фура', 'газель', 'манипулятор'], category: 'transport', subcategory: 'TRUCKS' },

    // Материалы / Бетон
    { keywords: ['бетон', 'цемент', 'раствор', 'жби', 'жб ', 'железобетон', 'плита перекрытия', 'фундамент'], category: 'materials', subcategory: 'MAT-CONCR' },

    // Материалы / Кирпич, блоки
    { keywords: ['кирпич', 'блок', 'газоблок', 'пеноблок', 'шлакоблок', 'керамзитоблок'], category: 'materials', subcategory: 'MAT-BRICK' },

    // Материалы / Отделочные
    { keywords: ['плитка', 'кафель', 'ламинат', 'паркет', 'обои', 'краска', 'шпаклевка', 'штукатурка', 'гипсокартон', 'гкл'], category: 'materials', subcategory: 'MAT-FINISH' },

    // Материалы / Кровля
    { keywords: ['кровля', 'черепица', 'профнастил', 'шифер', 'ондулин', 'металлочерепица'], category: 'materials', subcategory: 'MAT-ROOFMAT' },

    // Материалы / Пиломатериалы
    { keywords: ['доска', 'брус', 'фанера', 'осб', 'двп', 'дсп', 'дерево', 'пиломатериал', 'древесина'], category: 'materials', subcategory: 'MAT-TIMBER' },

    // Материалы / Металл
    { keywords: ['арматура', 'металл', 'труба', 'профиль', 'швеллер', 'уголок', 'балка', 'прокат'], category: 'materials', subcategory: 'MAT-METAL' },

    // Материалы / Сыпучие
    { keywords: ['песок', 'щебень', 'гравий', 'отсев', 'глина', 'земля', 'грунт'], category: 'materials', subcategory: 'MAT-BULK' },

    // Материалы / Электрика
    { keywords: ['провод', 'кабель', 'розетка', 'выключатель', 'автомат', 'щит', 'электрик'], category: 'materials', subcategory: 'MAT-ELECT' },

    // Материалы / Сантехника
    { keywords: ['труба пвх', 'унитаз', 'раковина', 'смеситель', 'ванна', 'сантехник', 'канализация'], category: 'materials', subcategory: 'MAT-SAN' },

    // Работы
    { keywords: ['отделка', 'ремонт квартир', 'отделочные работы', 'косметический ремонт'], category: 'works', subcategory: 'FIN' },
    { keywords: ['строительство', 'монтаж', 'возведение', 'кладка'], category: 'works', subcategory: 'GEN' },
    { keywords: ['земляные работы', 'котлован', 'разработка грунта', 'выемка'], category: 'works', subcategory: 'PREP' },
    { keywords: ['бетонирование', 'заливка', 'стяжка', 'армирование'], category: 'works', subcategory: 'STRUC' },
    { keywords: ['кровельные работы', 'монтаж кровли'], category: 'works', subcategory: 'ROOF' },
    { keywords: ['фасад', 'утепление фасада', 'облицовка'], category: 'works', subcategory: 'FAC' },

    // Услуги
    { keywords: ['аренда', 'прокат'], category: 'services', subcategory: 'RENT' },
    { keywords: ['доставка', 'грузоперевозки', 'перевозка'], category: 'delivery', subcategory: 'DEL-CITY' },
    { keywords: ['проект', 'проектирование', 'чертеж', 'архитектор'], category: 'services', subcategory: 'PROJ' },

    // Инструменты
    { keywords: ['дрель', 'перфоратор', 'болгарка', 'шуруповерт', 'электроинструмент'], category: 'tools', subcategory: 'MAT-TOOL' },
    { keywords: ['лопата', 'молоток', 'отвертка', 'ключ', 'ручной инструмент'], category: 'tools', subcategory: 'SUP-TOOLS' },
];

// Function to auto-detect category from product name
const detectCategoryFromName = (productName: string): { category: string; subcategory: string } | null => {
    const lowerName = productName.toLowerCase();

    for (const mapping of KEYWORD_CATEGORY_MAP) {
        for (const keyword of mapping.keywords) {
            if (lowerName.includes(keyword.toLowerCase())) {
                return { category: mapping.category, subcategory: mapping.subcategory };
            }
        }
    }

    return null;
};

export default function SupplierScreen() {
    const { t } = useTranslation();
    const { user, profile, refreshProfile } = useAuth(); // Use useAuth hook
    const { colors } = useTheme();
    const s = useMemo(() => createStyles(colors), [colors]);
    const [editing, setEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // No tabs needed — catalog only
    const activeTab = 'catalog' as const;

    // === DATA STATES ===
    const [myProducts, setMyProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [totalViews, setTotalViews] = useState(0);
    const [proposalsSent, setProposalsSent] = useState(0);
    const [pendingOrders, setPendingOrders] = useState(0);

    // === FORM STATES (Catalog) ===
    const [productType, setProductType] = useState<ProductType>('product');
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [unit, setUnit] = useState('шт');
    const [category, setCategory] = useState<string>('materials');
    const [subcategory, setSubcategory] = useState<string>('');
    const [phone, setPhone] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [availableUnits, setAvailableUnits] = useState<string[]>([]);
    const [showUnitPicker, setShowUnitPicker] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [city, setCity] = useState('Бишкек');
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [addressResults, setAddressResults] = useState<Array<{ lat: number; lng: number; displayName: string }>>([]);
    const [showAddressResults, setShowAddressResults] = useState(false);
    const [searchingAddress, setSearchingAddress] = useState(false);

    // === WIZARD STATE ===
    const [wizardVisible, setWizardVisible] = useState(true);
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
    const [wizardSearch, setWizardSearch] = useState('');
    const [showPhotoSourcePicker, setShowPhotoSourcePicker] = useState(false);

    // Helper: check if user has role and company set up
    const hasRoleAndCompany = profile?.role && profile.role !== 'guest';

    // Auto-open wizard when supplier tab receives focus (only if no listings)
    useFocusEffect(
        useCallback(() => {
            if (!hasRoleAndCompany) {
                Alert.alert(
                    'Внимание',
                    'Для работы с товарами необходимо сначала настроить профиль и выбрать роль. Перейдите в Профиль.',
                    [
                        { text: 'Отмена', style: 'cancel' },
                        { text: 'Перейти в Профиль', onPress: () => router.push('/profile' as any) }
                    ]
                );
                return;
            }
            if (myProducts.length === 0 && !loading) {
                setWizardVisible(true);
                setWizardStep(1);
                setWizardSearch('');
            }
        }, [myProducts.length, loading, hasRoleAndCompany])
    );

    // --- LOAD UNITS FROM DB ---
    useEffect(() => {
        (async () => {
            const units = await fetchUniqueUnits();
            setAvailableUnits(units);
        })();
    }, []);


    // --- AI Auto-categorization (Lalafo-style) ---
    useEffect(() => {
        if (!name.trim() || editingId) return; // Skip if editing existing product

        const detected = detectCategoryFromName(name);
        if (detected) {
            setCategory(detected.category);
            setSubcategory(detected.subcategory);
        }
    }, [name, editingId]);

    // --- DEBUG: Track imageUrls changes ---
    useEffect(() => {

    }, [imageUrls]);

    // --- UPLOAD IMAGE HELPER ---
    const handleUploadAsset = async (asset: ImagePicker.ImagePickerAsset) => {
        setUploadingImage(true);
        try {
            const fileName = `product_${Date.now()}.jpg`;
            let fileData: Blob | { uri: string; type: string; name: string };
            if (Platform.OS === 'web') {
                fileData = await new Promise<Blob>((resolve, reject) => {
                    const img = new window.Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxSize = 1024;
                        let { width, height } = img;
                        if (width > maxSize || height > maxSize) {
                            if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
                            else { width = Math.round((width * maxSize) / height); height = maxSize; }
                        }
                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) { reject(new Error('Canvas ctx error')); return; }
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob fail')), 'image/jpeg', 0.85);
                    };
                    img.onerror = () => reject(new Error('Failed to load'));
                    img.src = asset.uri;
                });
            } else {
                // Native: compress & resize using expo-image-manipulator (lazy import)
                try {
                    const ImageManipulator = await import('expo-image-manipulator');
                    const maxSize = 1024;
                    const resizeAction: any[] = [];
                    const assetWidth = asset.width || 0;
                    const assetHeight = asset.height || 0;
                    if (assetWidth > maxSize || assetHeight > maxSize) {
                        if (assetWidth > assetHeight) {
                            resizeAction.push({ resize: { width: maxSize } });
                        } else {
                            resizeAction.push({ resize: { height: maxSize } });
                        }
                    }
                    const manipulated = await ImageManipulator.manipulateAsync(
                        asset.uri,
                        resizeAction,
                        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    console.log('[handleUploadAsset] Compressed:', { original: `${assetWidth}x${assetHeight}`, result: `${manipulated.width}x${manipulated.height}` });
                    fileData = { uri: manipulated.uri, type: 'image/jpeg', name: fileName };
                } catch (manipErr) {
                    console.warn('[handleUploadAsset] ImageManipulator not available, uploading original:', manipErr);
                    fileData = { uri: asset.uri, type: 'image/jpeg', name: fileName };
                }
            }
            const { url } = await uploadSupplierFile(user?.id || 'unknown', fileData, fileName, 'photo');
            setImageUrls(prev => [...prev, url]);
        } catch (err: any) {
            console.error('[upload] error:', err);
            Alert.alert(t('common.error'), err?.message || t('screens.supplier.uploadError'));
        }
        setUploadingImage(false);
    };

    // --- PICK FROM GALLERY ---
    const handlePickImage = async () => {
        setShowPhotoSourcePicker(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
            if (!result.canceled && result.assets[0]) await handleUploadAsset(result.assets[0]);
        } catch (e) { console.error('Gallery error:', e); setUploadingImage(false); }
    };

    // --- TAKE PHOTO WITH CAMERA ---
    const handleTakePhoto = async () => {
        setShowPhotoSourcePicker(false);
        try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) { Alert.alert(t('screens.supplier.noAccess'), t('screens.supplier.cameraPermission')); return; }
            const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
            if (!result.canceled && result.assets[0]) await handleUploadAsset(result.assets[0]);
        } catch (e) { console.error('Camera error:', e); setUploadingImage(false); }
    };

    // --- ADDRESS SEARCH VIA EDGE FUNCTION (bypasses CORS) ---
    const addressSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const searchAddress = useCallback(async (query: string) => {
        if (query.length < 3) {
            setAddressResults([]);
            setShowAddressResults(false);
            return;
        }

        if (addressSearchTimeout.current) {
            clearTimeout(addressSearchTimeout.current);
        }

        addressSearchTimeout.current = setTimeout(async () => {
            setSearchingAddress(true);
            try {
                const response = await fetch(
                    `${SUPABASE_URL}/functions/v1/geocode-address`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query, city, countrycode: 'kg' }),
                    }
                );
                const data = await response.json();

                const results = (data.results || []).map((item: any) => ({
                    lat: item.lat,
                    lng: item.lng,
                    displayName: item.displayName?.replace(/, Kyrgyzstan$|, Кыргызстан$/i, '') || '',
                    shortName: [item.road, item.house].filter(Boolean).join(' ') || item.displayName?.split(',')[0] || '',
                }));

                setAddressResults(results);
                setShowAddressResults(results.length > 0);
            } catch (e) {
                console.error('Address search error:', e);
            } finally {
                setSearchingAddress(false);
            }
        }, 500);
    }, [city]);

    const handleSelectAddress = (result: { lat: number; lng: number; displayName: string }) => {
        // Extract street name from display name
        const parts = result.displayName.split(',');
        setAddress(parts.slice(0, 2).join(',').trim());
        setLat(result.lat);
        setLng(result.lng);
        setShowAddressResults(false);
    };

    // --- LOAD USER & PROFILE ---
    useEffect(() => {
        if (!user) {
            const timeout = setTimeout(() => {

                router.replace('/auth/login');
            }, 100);
            return () => clearTimeout(timeout);
        }
        if (profile?.phone) {
            setPhone(profile.phone);
        }
    }, [user, profile]);

    // --- FETCH PRODUCTS FROM SUPABASE ---
    const fetchProducts = useCallback(async () => {
        if (!supabase || !user?.id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('market_listings' as any)
                .select('id, user_id, title, kind, price, uom, image_url, description, contacts_phone, status, created_at, category_key, subcategory_key')
                .eq('user_id', user.id)
                .eq('side', 'offer')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching listings:', error);
            } else {
                // Map to Product interface
                const products = (data || []).map((item: any) => ({
                    id: item.id,
                    supplier_id: user.id,
                    name: item.title,
                    category: item.kind,
                    subcategory: null,
                    price: item.price,
                    unit: item.uom,
                    image_url: item.image_url,
                    description: item.description,
                    phone: item.contacts_phone,
                    in_stock: item.status === 'active',
                }));
                setMyProducts(products as Product[]);
            }

            // Get unread messages count
            const { count } = await supabase
                .from('chat_messages' as any)
                .select('*', { count: 'exact', head: true })
                .eq('supplier_id', user.id)
                .is('read_by', null);
            setUnreadMessages(count || 0);

            // Get proposals sent count
            const { count: proposalsCount } = await supabase
                .from('proposals' as any)
                .select('*', { count: 'exact', head: true })
                .eq('supplier_id', user.id);
            setProposalsSent(proposalsCount || 0);

            // Calculate total views (mock: products * 10 for now)
            setTotalViews((data?.length || 0) * 12);

            // Get pending orders
            const { count: ordersCount } = await supabase
                .from('proposals' as any)
                .select('*', { count: 'exact', head: true })
                .eq('supplier_id', user.id)
                .eq('status', 'accepted');
            setPendingOrders(ordersCount || 0);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    // Reload when tab becomes active (fixes navigation reload bug)
    useFocusEffect(
        useCallback(() => {
            if (user?.id) fetchProducts();
        }, [user?.id, fetchProducts])
    );





    // ==================== Realtime Subscription ====================
    // ==================== Realtime Subscription ====================
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase.channel('supplier-listings-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'market_listings' }, () => {
                fetchProducts();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `supplier_id=eq.${user.id}` }, () => {
                fetchProducts(); // Refresh unread count
            })
            .subscribe();

        return () => {
            try { supabase.removeChannel(channel); } catch { /* ignore */ }
        };
    }, [user?.id, fetchProducts]);

    // --- FORM HANDLERS ---
    const handleSubmit = async () => {
        // Prevent double submission
        if (submitting) return;

        if (!name.trim() || !price.trim()) {
            Alert.alert(t('common.error'), t('screens.supplier.fillRequired'));
            return;
        }

        // Mandatory category validation (Lalafo-style)
        if (!category || category === '') {
            Alert.alert(t('common.error'), t('screens.supplier.selectCategory'));
            return;
        }

        if (!user?.id || !supabase) {
            Alert.alert(t('common.error'), t('screens.supplier.pleaseLogin'));
            return;
        }

        if (!hasRoleAndCompany) {
            Alert.alert(
                'Внимание',
                'Для добавления товаров необходимо сначала настроить профиль и добавить объект. Перейдите в Профиль для настройки.',
                [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Перейти в Профиль', onPress: () => router.push('/profile' as any) }
                ]
            );
            return;
        }

        setSubmitting(true);

        // Debug: log imageUrls before save


        // Use imported city coordinates
        const coords = CITY_COORDS[city] || CITY_COORDS['Бишкек'];

        try {
            if (editingId) {
                // Update existing listing
                const updateData: Record<string, any> = {
                    kind: category === 'services' ? 'service' : 'material',
                    title: name.trim(),
                    description: description.trim() || null,
                    city,
                    address: address.trim() || null,
                    price: parseFloat(price),
                    uom: unit,
                    contacts_phone: phone.trim() || null,
                    lat: lat || coords.lat,
                    lng: lng || coords.lng,
                    image_url: imageUrls.length > 0 ? imageUrls.join(',') : null, // Save all images as comma-separated
                    category_key: category || null,
                    subcategory_key: subcategory || null,
                };
                const { error } = await supabase
                    .from('market_listings' as any)
                    .update(updateData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Use Edge Function to bypass PostgREST schema cache
                const insertPayload = {
                    user_id: user.id,
                    kind: category === 'services' ? 'service' : 'material',
                    title: name.trim(),
                    description: description.trim() || null,
                    city,
                    address: address.trim() || null,
                    price: parseFloat(price),
                    currency: 'KGS',
                    status: 'active',
                    uom: unit,
                    contacts_phone: phone.trim() || null,
                    lat: lat || coords.lat,
                    lng: lng || coords.lng,
                    side: 'offer',
                    image_url: imageUrls.length > 0 ? imageUrls.join(',') : null, // Save all images
                    category_key: category || null,
                    subcategory_key: subcategory || null,
                };


                const response = await fetch(
                    `${SUPABASE_URL}/functions/v1/insert-market-listing`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify(insertPayload),
                    }
                );

                const result = await response.json();
                if (!response.ok || result.error) {
                    console.error('Edge Function error:', result.error);
                    throw new Error(result.error || 'Failed to create listing');
                }

            }

            Alert.alert(
                t('common.success'),
                editingId ? t('screens.supplier.updated') : t('screens.supplier.added')
            );
            resetForm();
            fetchProducts();
        } catch (e: any) {
            console.error('Save error:', e?.message || e);
            Alert.alert(t('common.error'), e?.message || t('screens.supplier.saveError'));
        } finally {
            setSubmitting(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchProducts();
    };

    const resetForm = () => {
        setName(''); setPrice(''); setDescription(''); setImageUrls([]); setEditingId(null);
        setCity('Бишкек');
        setAddress(''); setLat(null); setLng(null);
        setAddressResults([]); setShowAddressResults(false);
    };

    const startEdit = (p: Product) => {
        setEditingId(p.id);
        setName(p.name);
        setPrice(p.price.toString());
        setUnit(p.unit);
        setDescription(p.description || '');
        setImageUrls(p.image_url ? p.image_url.split(',').map(url => url.trim()).filter(Boolean) : []);
        setCategory(p.category || 'materials');
        setCity((p as any).city || 'Бишкек');
        setAddress((p as any).address || '');
        setLat((p as any).lat || null);
        setLng((p as any).lng || null);
        setSubcategory(p.subcategory || '');
        setProductType(p.subcategory === 'service' ? 'service' : 'product');
        setWizardStep(3);
        setWizardVisible(true);
    };

    const handleDelete = async (id: string) => {
        const doDelete = async () => {
            if (!supabase) return;
            try {
                const { error } = await supabase.from('market_listings' as any).delete().eq('id', id);
                if (error) throw error;
                Alert.alert(t('common.deleted'), t('screens.supplier.productDeleted'));
                fetchProducts();
            } catch (e: any) {
                Alert.alert(t('common.error'), e.message);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(t('screens.supplier.deleteProductConfirm'))) doDelete();
        } else {
            Alert.alert(t('screens.supplier.deleteProductConfirm'), '', [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.delete'), style: 'destructive', onPress: doDelete }
            ]);
        }
    };

    // --- WIZARD HELPERS ---
    const handleOpenWizard = () => {
        if (!hasRoleAndCompany) {
            Alert.alert(
                'Внимание',
                'Для добавления товаров необходимо сначала настроить профиль и выбрать роль. Перейдите в Профиль.',
                [
                    { text: 'Отмена', style: 'cancel' },
                    { text: 'Перейти в Профиль', onPress: () => router.push('/profile' as any) }
                ]
            );
            return;
        }
        resetForm();
        setWizardStep(1);
        setWizardSearch('');
        setWizardVisible(true);
    };

    const handleCloseWizard = () => {
        setWizardVisible(false);
        setWizardStep(1);
        setWizardSearch('');
    };

    const handleSelectCategory = (catKey: string) => {
        setCategory(catKey);
        setSubcategory('');
        setWizardSearch('');
        setWizardStep(2);
    };

    const handleSelectSubcategory = (subKey: string) => {
        setSubcategory(subKey);
        setWizardSearch('');
        setWizardStep(3);
    };

    const filteredCategories = useMemo(() => {
        const cats = MAIN_CATEGORIES(t);
        if (!wizardSearch.trim()) return cats;
        const q = wizardSearch.toLowerCase();
        return cats.filter(c => c.label.toLowerCase().includes(q));
    }, [wizardSearch, t]);

    const filteredSubcategories = useMemo(() => {
        const subs = SUB_CATEGORIES(t)[category] || [];
        if (!wizardSearch.trim()) return subs;
        const q = wizardSearch.toLowerCase();
        return subs.filter(s => s.label.toLowerCase().includes(q));
    }, [wizardSearch, category]);

    // --- RENDER HELPERS ---

    const renderWizardProgress = () => (
        <View style={s.wizardProgress}>
            {[1, 2, 3].map(step => (
                <View key={step} style={[s.wizardDot, wizardStep >= step && s.wizardDotActive]} />
            ))}
        </View>
    );

    const renderWizardStep1 = () => (
        <View style={{ flex: 1 }}>
            <View style={s.wizardSearchBox}>

                <TextInput
                    style={s.wizardSearchInput}
                    placeholder={t('screens.supplier.searchCategory')}
                    placeholderTextColor={colors.textSecondary}
                    value={wizardSearch}
                    onChangeText={setWizardSearch}
                    autoFocus
                />
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {filteredCategories.map(cat => (
                    <Pressable
                        key={cat.key}
                        style={({ pressed }) => [s.wizardListItem, pressed && { opacity: 0.7 }]}
                        onPress={() => handleSelectCategory(cat.key)}
                        accessibilityLabel={cat.label}
                        accessibilityRole="button"
                    >
                        <View style={[s.wizardListIcon, { backgroundColor: cat.color }]} />
                        <Text style={s.wizardListText}>{cat.label}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );

    const renderWizardStep2 = () => {
        const subs = filteredSubcategories;
        const catLabel = MAIN_CATEGORIES(t).find(c => c.key === category)?.label || '';
        return (
            <View style={{ flex: 1 }}>
                <Pressable onPress={() => { setWizardStep(1); setWizardSearch(''); }} style={s.wizardBreadcrumb}>
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>← {catLabel}</Text>
                </Pressable>
                <View style={s.wizardSearchBox}>

                    <TextInput
                        style={s.wizardSearchInput}
                        placeholder={t('screens.supplier.searchSubcategory')}
                        placeholderTextColor={colors.textSecondary}
                        value={wizardSearch}
                        onChangeText={setWizardSearch}
                        autoFocus
                    />
                </View>
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    {subs.map(sub => (
                        <Pressable
                            key={sub.key}
                            style={({ pressed }) => [s.wizardListItem, pressed && { opacity: 0.7 }]}
                            onPress={() => handleSelectSubcategory(sub.key)}
                            accessibilityLabel={sub.label}
                            accessibilityRole="button"
                        >
                            <Text style={s.wizardListText}>{sub.label}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>›</Text>
                        </Pressable>
                    ))}
                    {subs.length === 0 && (
                        <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 32 }}>{t('screens.supplier.nothingFound')}</Text>
                    )}
                </ScrollView>
            </View>
        );
    };

    const renderWizardStep3 = () => (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior='padding'
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <Pressable onPress={() => { setWizardStep(2); setWizardSearch(''); }} style={s.wizardBreadcrumb}>
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>← {t('screens.supplier.back')}</Text>
                </Pressable>

                {/* Photo Gallery */}
                <View style={s.photoSection}>
                    <Text style={[s.label, { marginBottom: 8 }]}>{t('screens.supplier.photoLabel')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        {imageUrls.map((url, idx) => (
                            <View key={idx} style={s.photoThumbContainer}>
                                <Image source={{ uri: url }} style={s.photoThumb} />
                                <Pressable onPress={() => setImageUrls(prev => prev.filter((_, i) => i !== idx))} style={s.removePhotoIcon}>

                                </Pressable>
                            </View>
                        ))}
                        {imageUrls.length < 7 && (
                            <Pressable onPress={() => setShowPhotoSourcePicker(true)} style={s.addPhotoBtn}>
                                {uploadingImage ? <ActivityIndicator color="#16A34A" /> : (
                                    <View style={s.photoPlaceholder}>

                                        <Text style={s.photoPlaceholderText}>+</Text>
                                    </View>
                                )}
                            </Pressable>
                        )}
                    </ScrollView>
                </View>

                {/* СНИП-каталог */}
                {subcategory && CATALOG_ITEMS[subcategory] && (
                    <View style={s.catalogPickerSection}>
                        <Text style={s.catalogPickerTitle}>{t('screens.supplier.pickFromCatalog')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catalogPickerScroll}>
                            {CATALOG_ITEMS[subcategory].map((item: CatalogItem, idx: number) => (
                                <Pressable key={idx} style={[s.catalogPickerItem, name === item.name && s.catalogPickerItemActive]} onPress={() => { setName(item.name); setUnit(item.uom); }}>
                                    <Text style={[s.catalogPickerItemText, name === item.name && s.catalogPickerItemTextActive]} numberOfLines={2}>{item.name}</Text>
                                    <Text style={s.catalogPickerItemUom}>{item.uom}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <Text style={s.catalogPickerHint}>{t('screens.supplier.orEnterName')}</Text>
                    </View>
                )}

                {/* Product Name */}
                <Text style={s.label}>{t('screens.supplier.productName')}</Text>
                <ProductAutocomplete value={name} onChangeText={setName} onSelectItem={(item) => { setName(item.name); if (item.uom) setUnit(item.uom); }} placeholder={t('screens.supplier.namePlaceholder')} style={{ marginBottom: 12 }} />

                {/* Price + Unit */}
                <View style={s.row}>
                    <TextInput style={[s.input, { flex: 1 }]} placeholder={t('screens.supplier.price')} keyboardType="numeric" placeholderTextColor={colors.textSecondary} value={price} onChangeText={setPrice} />
                    <Pressable onPress={() => setShowUnitPicker(true)} style={[s.input, s.unitPickerBtn]}>
                        <Text style={{ color: unit ? colors.text : colors.textSecondary }}>{unit || 'шт'}</Text>
                        <Text style={{ color: colors.textSecondary }}>▼</Text>
                    </Pressable>
                </View>

                {/* Phone */}
                <TextInput style={s.input} placeholder={t('screens.supplier.whatsappPhone')} placeholderTextColor={colors.textSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

                {/* City */}
                <Text style={s.label}>{t('screens.supplier.city')}</Text>
                <Pressable onPress={() => setShowCityPicker(true)} style={[s.input, s.unitPickerBtn, { width: '100%' }]}>
                    <Text style={{ color: city ? colors.text : colors.textSecondary }}>{city || 'Бишкек'}</Text>
                    <Text style={{ color: colors.textSecondary }}>▼</Text>
                </Pressable>

                {/* Address */}
                <Text style={s.label}>{t('screens.supplier.address')}</Text>
                <View style={{ position: 'relative', zIndex: 100 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                            style={[s.input, { flex: 1 }]}
                            placeholder={t('screens.supplier.addressPlaceholder')}
                            placeholderTextColor={colors.textSecondary}
                            value={address}
                            onChangeText={(text) => { setAddress(text); searchAddress(text); }}
                            onFocus={() => addressResults.length > 0 && setShowAddressResults(true)}
                        />
                        {searchingAddress && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />}
                        {lat !== 0 && lng !== 0 && <Text style={{ marginLeft: 8, color: '#22C55E', fontSize: 18 }}>✓</Text>}
                    </View>
                    {showAddressResults && (
                        <View style={{
                            position: 'absolute', top: 52, left: 0, right: 0,
                            backgroundColor: colors.card, borderRadius: 12,
                            borderWidth: 1, borderColor: colors.border,
                            maxHeight: 220, zIndex: 999, elevation: 10,
                            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
                        }}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                                {addressResults.map((result: any, idx: number) => (
                                    <Pressable
                                        key={idx}
                                        style={{ padding: 14, borderBottomWidth: idx < addressResults.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                                        onPress={() => {
                                            const shortAddr = result.shortName || result.displayName.split(',')[0]?.trim() || '';
                                            setAddress(shortAddr);
                                            setLat(result.lat);
                                            setLng(result.lng);
                                            setShowAddressResults(false);
                                        }}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{result.shortName || result.displayName.split(',')[0]}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{result.displayName}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* Description */}
                <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} placeholder="Примечание (описание товара)" placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} multiline numberOfLines={3} />

                {/* Submit */}
                <Pressable onPress={() => { handleSubmit(); handleCloseWizard(); }} disabled={submitting} style={[s.saveBtn, submitting && s.saveBtnDisabled]}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{editingId ? t('screens.supplier.saveChanges') : t('screens.supplier.addToCatalog')}</Text>}
                </Pressable>
                {editingId && (
                    <Pressable onPress={() => { resetForm(); handleCloseWizard(); }} style={{ marginTop: 10, alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
                    </Pressable>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );

    const renderCatalog = () => (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={s.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16 }}>
                    <Text style={s.sectionTitle}>{t('screens.supplier.catalog')} ({myProducts.length})</Text>
                    {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
                        <View style={s.grid}>
                            {myProducts.map(p => (
                                <View key={p.id} style={s.productCard}>
                                    <Image source={{ uri: p.image_url || PLACEHOLDER_IMAGE }} style={s.prodImg} />
                                    <View style={s.prodContent}>
                                        <Text numberOfLines={2} style={s.prodName}>{p.name}</Text>
                                        <Text style={s.prodPrice}>{p.price} {t('screens.home.currency')}/{p.unit}</Text>
                                        {p.description ? <Text numberOfLines={2} style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>{p.description}</Text> : null}
                                        <View style={s.prodActions}>
                                            <Pressable onPress={() => startEdit(p)} accessibilityRole="button" accessibilityLabel={t('common.edit')}><Text style={{ color: colors.primary, fontSize: 12 }}>{t('common.edit')}</Text></Pressable>
                                            <Pressable onPress={() => handleDelete(p.id)} accessibilityRole="button" accessibilityLabel={t('common.delete')}><Text style={{ color: '#EF4444', fontSize: 12 }}>{t('common.delete')}</Text></Pressable>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                    {!loading && myProducts.length === 0 && <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 20 }}>{t('screens.supplier.catalogEmpty')}</Text>}
                </View>
            </ScrollView>

            {/* FAB to add new listing */}
            <Pressable
                onPress={() => { resetForm(); handleOpenWizard(); }}
                style={({ pressed }) => [{
                    position: 'absolute', bottom: 24, right: 16,
                    backgroundColor: '#0EA5E9',
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderRadius: 16,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
                }, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
                accessibilityRole="button"
                accessibilityLabel="Добавить объявление"
            >
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 }}>+</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Новое</Text>
            </Pressable>

            {/* ============ WIZARD MODAL ============ */}
            <Modal visible={wizardVisible} animationType="slide" onRequestClose={handleCloseWizard}>
                <SafeAreaView style={[s.wizardContainer, { backgroundColor: colors.background }]}>
                    {/* Wizard Header */}
                    <View style={s.wizardHeader}>
                        <BackButton
                            theme="dark"
                            fallbackPath="/(tabs)/market"
                            onPress={() => {
                                if (wizardStep === 1) {
                                    handleCloseWizard();
                                    if (router.canGoBack()) {
                                        router.back();
                                    } else {
                                        router.replace('/(tabs)/market' as any);
                                    }
                                } else if (wizardStep === 2) {
                                    setWizardStep(1);
                                    setWizardSearch('');
                                } else {
                                    setWizardStep(2);
                                    setWizardSearch('');
                                }
                            }}
                        />
                        <Text style={s.wizardTitle}>
                            {wizardStep === 1 ? 'Категория' : wizardStep === 2 ? 'Подкатегория' : editingId ? t('screens.supplier.editPosition') : t('screens.supplier.newPosition')}
                        </Text>
                        {wizardStep === 1 && myProducts.length > 0 ? (
                            <Pressable
                                onPress={() => setWizardVisible(false)}
                                style={{ backgroundColor: 'rgba(14,165,233,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)' }}
                                accessibilityRole="button"
                                accessibilityLabel="Мои объявления"
                            >
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0EA5E9' }}>Мои ({myProducts.length})</Text>
                            </Pressable>
                        ) : (
                            <View style={{ width: 40 }} />
                        )}
                    </View>
                    {renderWizardProgress()}

                    <View style={{ flex: 1, paddingHorizontal: 16 }}>
                        {wizardStep === 1 && renderWizardStep1()}
                        {wizardStep === 2 && renderWizardStep2()}
                        {wizardStep === 3 && renderWizardStep3()}
                    </View>
                </SafeAreaView>
            </Modal>

            {/* Photo Source Picker */}
            <Modal visible={showPhotoSourcePicker} transparent animationType="fade" onRequestClose={() => setShowPhotoSourcePicker(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setShowPhotoSourcePicker(false)}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Добавить фото</Text>
                        <Pressable style={s.modalItem} onPress={handleTakePhoto} accessibilityRole="button" accessibilityLabel="Сфотографировать">
                            <Text style={s.modalItemText}>Сфотографировать</Text>
                        </Pressable>
                        <Pressable style={s.modalItem} onPress={handlePickImage} accessibilityRole="button" accessibilityLabel="Выбрать из галереи">
                            <Text style={s.modalItemText}>Выбрать из галереи</Text>
                        </Pressable>
                        <Pressable onPress={() => setShowPhotoSourcePicker(false)} style={s.modalClose}>
                            <Text style={{ color: colors.textSecondary }}>Отмена</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* Unit Picker Modal */}
            <Modal visible={showUnitPicker} transparent animationType="fade" onRequestClose={() => setShowUnitPicker(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setShowUnitPicker(false)}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Единица измерения</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {availableUnits.map((u) => (
                                <Pressable key={u} style={[s.modalItem, unit === u && s.modalItemActive]} onPress={() => { setUnit(u); setShowUnitPicker(false); }}>
                                    <Text style={[s.modalItemText, unit === u && s.modalItemTextActive]}>{u}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <Pressable onPress={() => setShowUnitPicker(false)} style={s.modalClose}>
                            <Text style={{ color: colors.textSecondary }}>{t('common.close', 'Закрыть')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

            {/* City Picker Modal */}
            <Modal visible={showCityPicker} transparent animationType="fade" onRequestClose={() => setShowCityPicker(false)}>
                <Pressable style={s.modalOverlay} onPress={() => setShowCityPicker(false)}>
                    <View style={s.modalContent}>
                        <Text style={s.modalTitle}>Выберите город</Text>
                        <ScrollView style={{ maxHeight: 350 }}>
                            {KYRGYZSTAN_CITIES.map((c) => (
                                <Pressable key={c} style={[s.modalItem, city === c && s.modalItemActive]} onPress={() => { setCity(c); setShowCityPicker(false); }}>
                                    <Text style={[s.modalItemText, city === c && s.modalItemTextActive]}>{c}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <Pressable onPress={() => setShowCityPicker(false)} style={s.modalClose}>
                            <Text style={{ color: colors.textSecondary }}>{t('common.close', 'Закрыть')}</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );



    if (!user?.id) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, marginTop: 16 }}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={s.header}>
                <View style={s.searchRow}>
                    <View style={s.searchBar}>

                        <TextInput
                            style={s.searchInput}
                            placeholder="Поиск..."
                            placeholderTextColor={colors.textSecondary}
                            value={wizardSearch}
                            onChangeText={setWizardSearch}
                        />
                    </View>
                    <Pressable
                        style={s.cabinetBtn}
                        onPress={() => setWizardVisible(false)}
                        accessibilityRole="button"
                        accessibilityLabel="Мои товары"
                    >
                        <Text style={{ fontSize: 18 }}>�</Text>
                        <Text style={s.cabinetBtnText}>Каталог</Text>
                    </Pressable>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                {renderCatalog()}
            </View>
        </View>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    header: {
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: c.text },
    headerSubtitle: { fontSize: 14, color: c.textSecondary, marginTop: 2 },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.inputBg,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: c.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: c.text,
        height: 44,
    },
    cabinetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.primary,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        gap: 6,
    },
    cabinetBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    scrollContainer: { flex: 1 },
    welcomeText: { fontSize: 22, fontWeight: '800', marginBottom: 16, color: c.text },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statCard: { flex: 1, padding: 16, borderRadius: 16, borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    statIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    statValue: { fontSize: 24, fontWeight: '800', color: c.text },
    statTitle: { fontSize: 12, fontWeight: '600', color: c.textSecondary },

    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: c.text },
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    actionCard: { width: '47%', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', gap: 8 },
    actionIconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    actionTitle: { fontWeight: '600', fontSize: 13, color: c.text },

    activityCard: { borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 16 },
    activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    activityText: { fontSize: 14, color: c.textSecondary },

    inStockBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: UI.greenBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    inStockText: { color: UI.green, fontWeight: '600', fontSize: 12 },

    tabContainer: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 8, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
    tabItemActive: { backgroundColor: c.primary },
    tabText: { fontWeight: '700', fontSize: 13, color: c.textSecondary },
    tabTextActive: { color: '#fff' },

    formCard: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: 24 },
    formHeader: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: c.text },
    input: { height: 48, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, backgroundColor: c.surface, color: c.text },
    saveBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, backgroundColor: c.primary },
    saveBtnDisabled: { backgroundColor: c.textSecondary },
    saveBtnText: { color: c.background, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 12 },
    typeToggle: { flexDirection: 'row', padding: 4, borderRadius: 8, marginBottom: 16, backgroundColor: c.surface },
    typeOption: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
    typeOptionActive: { backgroundColor: c.primary },
    typeOptionActiveGreen: { backgroundColor: '#10b981' },
    typeText: { fontWeight: '700', color: c.textSecondary, fontSize: 12 },
    typeTextActive: { color: c.background },

    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
    productCard: { width: '46%', margin: '2%', borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, overflow: 'hidden' },
    prodImg: { width: '100%', height: 100, backgroundColor: c.border },
    prodContent: { padding: 10 },
    prodName: { fontSize: 13, fontWeight: '600', marginBottom: 4, height: 36, color: c.text },
    prodPrice: { fontWeight: '800', marginBottom: 8, color: '#F97316' },
    prodActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },

    label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 8, marginTop: 4 },
    chipScroll: { flexDirection: 'row', marginBottom: 16 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: c.surface,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    chipActive: {
        backgroundColor: c.primary,
        borderColor: c.primary
    },
    chipText: {
        fontSize: 13,
        color: c.textSecondary,
        fontWeight: '600',
    },
    chipTextActive: {
        color: c.background,
    },

    // Photo section styles
    photoSection: { alignItems: 'flex-start', marginBottom: 16, marginTop: 8 },
    photoPickerBtn: { width: 120, height: 120, borderRadius: 12, borderWidth: 2, borderColor: c.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },
    photoPreview: { width: 116, height: 116, borderRadius: 10 },
    photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    photoPlaceholderText: { fontSize: 12, color: c.textSecondary, marginTop: 4 },
    removePhotoBtn: { marginTop: 8 },
    // Multi-photo gallery styles
    photoThumbContainer: { width: 80, height: 80, marginRight: 10, position: 'relative' as const },
    photoThumb: { width: 80, height: 80, borderRadius: 10 },
    removePhotoIcon: { position: 'absolute' as const, top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
    addPhotoBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: c.border, borderStyle: 'dashed' as const, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface },

    // Unit picker styles
    unitPickerBtn: { width: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', maxWidth: 340, backgroundColor: c.surface, borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 16, textAlign: 'center' },
    modalItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4 },
    modalItemActive: { backgroundColor: c.border },
    modalItemText: { fontSize: 15, color: c.text },
    modalItemTextActive: { color: c.primary, fontWeight: '600' },
    modalClose: { marginTop: 12, alignItems: 'center', paddingVertical: 10 },

    // ═══ СНИП-каталог ═══
    catalogPickerSection: {
        marginTop: 12,
        marginBottom: 4,
    },
    catalogPickerTitle: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: c.textSecondary,
        marginBottom: 8,
    },
    catalogPickerScroll: {
        marginBottom: 6,
    },
    catalogPickerItem: {
        backgroundColor: c.inputBg,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginRight: 8,
        minWidth: 120,
        maxWidth: 200,
        borderWidth: 1.5,
        borderColor: c.border,
    },
    catalogPickerItemActive: {
        backgroundColor: c.border,
        borderColor: c.primary,
    },
    catalogPickerItemText: {
        fontSize: 13,
        color: c.text,
        lineHeight: 17,
    },
    catalogPickerItemTextActive: {
        color: c.primary,
        fontWeight: '600' as const,
    },
    catalogPickerItemUom: {
        fontSize: 11,
        color: c.textSecondary,
        marginTop: 4,
        backgroundColor: c.borderLight,
        alignSelf: 'flex-start' as const,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    catalogPickerHint: {
        fontSize: 12,
        color: c.textSecondary,
        textAlign: 'center' as const,
        marginTop: 2,
    },

    // === WIZARD STYLES ===
    fab: {
        position: 'absolute' as const,
        bottom: 24,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: c.primary,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    fabText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '700' as const,
        marginTop: -2,
    },
    wizardContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    wizardHeader: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    wizardTitle: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: c.text,
    },
    wizardProgress: {
        flexDirection: 'row' as const,
        justifyContent: 'center' as const,
        gap: 8,
        paddingVertical: 12,
    },
    wizardDot: {
        width: 32,
        height: 4,
        borderRadius: 2,
        backgroundColor: c.border,
    },
    wizardDotActive: {
        backgroundColor: c.primary,
    },
    wizardSearchBox: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        backgroundColor: c.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 12,
        marginBottom: 12,
        marginTop: 4,
    },
    wizardSearchInput: {
        flex: 1,
        height: 44,
        color: c.text,
        fontSize: 15,
    },
    wizardListItem: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
    },
    wizardListIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginRight: 14,
    },
    wizardListText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500' as const,
        color: c.text,
    },
    wizardBreadcrumb: {
        paddingVertical: 10,
    },
});
