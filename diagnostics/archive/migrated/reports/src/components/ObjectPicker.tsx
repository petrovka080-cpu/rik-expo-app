// src/components/ObjectPicker.tsx
// Компонент выбора строительного объекта
import React, { useEffect, useState } from 'react';
import {
    Alert,
    View,
    Text,
    Pressable,
    Modal,
    FlatList,
    StyleSheet,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { fetchObjects, createObject, deleteObject, ConstructionObject } from '../lib/objects_api';
import { useTranslation } from 'react-i18next';

interface ObjectPickerProps {
    value?: string | null;
    onChange: (objectId: string | null, object: ConstructionObject | null) => void;
    placeholder?: string;
    hideCreate?: boolean;
}

export function ObjectPicker({
    value,
    onChange,
    placeholder = 'Выберите объект',
    hideCreate = false,
}: ObjectPickerProps) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [objects, setObjects] = useState<ConstructionObject[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [newPhone, setNewPhone] = useState('');

    const selectedObject = objects.find(o => o.id === value);

    const load = async () => {
        setLoading(true);
        const data = await fetchObjects();
        setObjects(data);
        setLoading(false);
    };

    useEffect(() => {
        if (visible) {
            load();
        }
    }, [visible]);

    const filtered = objects.filter(o =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        (o.address && o.address.toLowerCase().includes(search.toLowerCase()))
    );

    const handleSelect = (obj: ConstructionObject) => {
        onChange(obj.id, obj);
        setVisible(false);
    };

    const handleClear = () => {
        onChange(null, null);
    };

    const handleCreate = async () => {
        if (!newAddress.trim()) {
            Alert.alert(t('screens.objectPicker.errorTitle', 'Ошибка'), t('screens.objectPicker.enterAddress'));
            return;
        }
        if (!newPhone.trim()) {
            Alert.alert(t('screens.objectPicker.errorTitle', 'Ошибка'), t('screens.objectPicker.enterPhone'));
            return;
        }
        const objectAddress = newAddress.trim();
        const objectPhone = newPhone.trim();
        const objectName = objectAddress;

        setCreating(true);
        const { data: created, error } = await createObject(objectName, objectAddress, objectPhone);
        if (created) {
            setObjects(prev => [...prev, created]);
            onChange(created.id, created);
            setVisible(false);
            setNewAddress('');
            setNewPhone('');
        } else {
            Alert.alert(t('screens.objectPicker.errorTitle', 'Ошибка'), `${t('screens.objectPicker.createError')}: ${error || t('screens.objectPicker.unknownError')}`);
        }
        setCreating(false);
    };

    const handleDelete = (obj: ConstructionObject) => {
        Alert.alert(
            t('screens.objectPicker.deleteTitle'),
            t('screens.objectPicker.deleteConfirm', { name: obj.name }),
            [
                { text: t('screens.objectPicker.cancel'), style: 'cancel' },
                {
                    text: t('screens.objectPicker.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const { success, error } = await deleteObject(obj.id);
                        if (success) {
                            setObjects(prev => prev.filter(o => o.id !== obj.id));
                            if (value === obj.id) {
                                onChange(null, null);
                            }
                        } else {
                            Alert.alert(t('screens.objectPicker.errorTitle', 'Ошибка'), `${t('screens.objectPicker.deleteError')}: ${error || t('screens.objectPicker.unknownError')}`);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View>
            <Pressable style={s.trigger} onPress={() => setVisible(true)}>
                <Text style={s.icon}>🏗️</Text>
                <Text style={[s.value, !selectedObject && s.placeholder]} numberOfLines={1}>
                    {selectedObject?.name || placeholder}
                </Text>
                {selectedObject && (
                    <Pressable onPress={handleClear} hitSlop={10}>
                        <Text style={s.clear}>✕</Text>
                    </Pressable>
                )}
            </Pressable>

            <Modal visible={visible} animationType="slide" transparent>
                <Pressable style={s.backdrop} onPress={() => setVisible(false)} />
                <View style={s.modal}>
                    <View style={s.header}>
                        <Text style={s.title}>{t('screens.objectPicker.selectObject')}</Text>
                        <Pressable onPress={() => setVisible(false)}>
                            <Text style={s.closeBtn}>✕</Text>
                        </Pressable>
                    </View>

                    <TextInput
                        style={s.search}
                        placeholder={t('screens.objectPicker.searchObject')}
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor="#94a3b8"
                    />

                    {loading ? (
                        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View style={[s.item, item.id === value && s.itemSelected, { flexDirection: 'row', alignItems: 'center' }]}>
                                    <Pressable
                                        style={{ flex: 1 }}
                                        onPress={() => handleSelect(item)}
                                    >
                                        <Text style={s.itemName}>{item.name}</Text>
                                        {item.address && (
                                            <Text style={s.itemAddress}>{item.address}</Text>
                                        )}
                                    </Pressable>
                                    {!hideCreate && (
                                        <Pressable
                                            style={s.deleteBtn}
                                            onPress={() => handleDelete(item)}
                                            hitSlop={10}
                                        >
                                            <Text style={s.deleteBtnText}>🗑️</Text>
                                        </Pressable>
                                    )}
                                </View>
                            )}
                            ListEmptyComponent={
                                <Text style={s.empty}>{t('screens.objectPicker.objectsNotFound')}</Text>
                            }
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}

                    {!hideCreate && (
                        <View style={s.createSection}>
                            <Text style={s.createLabel}>{t('screens.objectPicker.createNew')}</Text>
                            <View style={s.createRow}>
                                <TextInput
                                    style={s.createInput}
                                    placeholder={t('screens.objectPicker.addressPlaceholder')}
                                    value={newAddress}
                                    onChangeText={setNewAddress}
                                    placeholderTextColor="#94a3b8"
                                />
                                <TextInput
                                    style={s.createInput}
                                    placeholder={t('screens.objectPicker.phonePlaceholder')}
                                    value={newPhone}
                                    onChangeText={setNewPhone}
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="phone-pad"
                                />
                                <Pressable
                                    style={[s.createBtn, creating && { opacity: 0.6 }]}
                                    onPress={handleCreate}
                                    disabled={creating}
                                >
                                    <Text style={s.createBtnText}>
                                        {creating ? '...' : t('screens.objectPicker.createBtn')}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F1623',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1F2A37',
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 8,
    },
    icon: {
        fontSize: 18,
    },
    value: {
        flex: 1,
        fontSize: 15,
        color: '#1e293b',
    },
    placeholder: {
        color: '#94a3b8',
    },
    clear: {
        fontSize: 16,
        color: '#94a3b8',
        paddingHorizontal: 4,
    },
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modal: {
        backgroundColor: '#0F1623',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
    },
    closeBtn: {
        fontSize: 20,
        color: '#A1A1AA',
    },
    search: {
        margin: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#1e293b',
    },
    item: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1F2A37',
    },
    itemSelected: {
        backgroundColor: '#eef2ff',
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    itemAddress: {
        fontSize: 13,
        color: '#A1A1AA',
        marginTop: 2,
    },
    empty: {
        textAlign: 'center',
        color: '#94a3b8',
        paddingVertical: 40,
    },
    createSection: {
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        padding: 16,
    },
    createLabel: {
        fontSize: 13,
        color: '#A1A1AA',
        marginBottom: 8,
    },
    createRow: {
        flexDirection: 'column',
        gap: 8,
    },
    createInput: {
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#1e293b',
    },
    createBtn: {
        backgroundColor: '#6366f1',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    createBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    deleteBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    deleteBtnText: {
        fontSize: 18,
    },
});
