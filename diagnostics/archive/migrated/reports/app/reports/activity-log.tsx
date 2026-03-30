// FILE: app/reports/activity-log.tsx
// Activity Log Screen - shows all team actions (director approvals, accountant, warehouse, etc.)

import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BackButton } from '../../src/components/ui/BackButton';
import { supabase } from '../../src/lib/supabaseClient';
import { getActivityLogs, ActivityLogEntry } from '../../lib/activityLogger';

// Role colors
const roleColors: Record<string, string> = {
    director: '#8b5cf6',
    accountant: '#06b6d4',
    warehouse: '#f59e0b',
    worker: '#22c55e',
    foreman: '#3b82f6',
    engineer: '#ec4899',
    manager: '#6366f1',
    supplier: '#14b8a6',
};

// Action type icons
const actionIcons: Record<string, string> = {
    approve: 'checkmark-circle',
    reject: 'close-circle',
    create: 'add-circle',
    update: 'create',
    delete: 'trash',
    receive: 'download',
    ship: 'paper-plane',
    process: 'cog',
    complete: 'checkmark-done',
    cancel: 'ban',
    view: 'eye',
};

// Role names in Russian
const roleNames: Record<string, string> = {
    director: 'Директор',
    accountant: 'Бухгалтер',
    warehouse: 'Складовщик',
    worker: 'Сотрудник',
    foreman: 'Прораб',
    engineer: 'Инженер',
    manager: 'Менеджер',
    supplier: 'Поставщик',
};

export default function ActivityLogScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Categories for filter
    const categories = [
        { id: null, label: 'Все', icon: 'apps' },
        { id: 'request', label: 'Заявки', icon: 'document-text' },
        { id: 'invoice', label: 'Счета', icon: 'receipt' },
        { id: 'delivery', label: 'Поставки', icon: 'cube' },
        { id: 'inventory', label: 'Склад', icon: 'grid' },
        { id: 'report', label: 'Отчёты', icon: 'bar-chart' },
    ];

    // Get company ID
    useEffect(() => {
        const loadCompany = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!error && data?.company_id) {
                    setCompanyId(data.company_id);
                }
            } catch (e) {
                console.error('[ActivityLog] loadCompany error:', e);
            }
        };
        loadCompany();
    }, []);

    // Load activity logs
    const loadLogs = useCallback(async () => {
        if (!companyId) return;

        try {
            const data = await getActivityLogs({
                companyId,
                userRole: selectedRole || undefined,
                actionCategory: selectedCategory as any || undefined,
                limit: 100,
            });
            setLogs(data);
        } catch (e) {
            console.error('[ActivityLog] Error loading logs:', e);
        } finally {
            setLoading(false);
        }
    }, [companyId, selectedRole, selectedCategory]);

    useEffect(() => {
        if (companyId) {
            loadLogs();
        }
    }, [companyId, loadLogs]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadLogs();
        setRefreshing(false);
    };

    // Format date
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'сейчас';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours} ч назад`;
        if (diffDays < 7) return `${diffDays} дн назад`;

        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Unique roles from logs for filter
    const availableRoles = [...new Set(logs.map(l => l.user_role))];

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text style={{ color: '#94a3b8', marginTop: 12 }}>Загрузка журнала...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
            {/* Header */}
            <View style={{
                backgroundColor: '#1e293b',
                paddingTop: 20,
                paddingBottom: 16,
                paddingHorizontal: 16,
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <BackButton theme="dark" fallbackPath="/reports" />
                    <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>📋 Журнал действий</Text>
                </View>

                {/* Role Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <Pressable
                        onPress={() => setSelectedRole(null)}
                        style={{
                            backgroundColor: !selectedRole ? '#0ea5e9' : '#334155',
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 20,
                            marginRight: 8,
                        }}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Все роли</Text>
                    </Pressable>
                    {availableRoles.map(role => (
                        <Pressable
                            key={role}
                            onPress={() => setSelectedRole(role === selectedRole ? null : role)}
                            style={{
                                backgroundColor: role === selectedRole ? (roleColors[role] || '#0ea5e9') : '#334155',
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 20,
                                marginRight: 8,
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '600' }}>
                                {roleNames[role] || role}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Category Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categories.map(cat => (
                        <Pressable
                            key={cat.id || 'all'}
                            onPress={() => setSelectedCategory(cat.id)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: cat.id === selectedCategory ? '#0ea5e9' : '#1e293b',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 16,
                                marginRight: 8,
                                borderWidth: 1,
                                borderColor: cat.id === selectedCategory ? '#0ea5e9' : '#334155',
                            }}
                        >
                            <Ionicons name={cat.icon as any} size={16} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 13 }}>{cat.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {/* Activity List */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
                }
            >
                {logs.length === 0 ? (
                    <View style={{ alignItems: 'center', marginTop: 60 }}>
                        <Ionicons name="document-text-outline" size={64} color="#334155" />
                        <Text style={{ color: '#A1A1AA', fontSize: 16, marginTop: 16 }}>
                            Нет записей в журнале
                        </Text>
                        <Text style={{ color: '#A1A1AA', fontSize: 14, marginTop: 4 }}>
                            Действия команды будут отображаться здесь
                        </Text>
                    </View>
                ) : (
                    logs.map((log, index) => (
                        <View
                            key={log.id}
                            style={{
                                backgroundColor: '#1e293b',
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                borderLeftWidth: 4,
                                borderLeftColor: roleColors[log.user_role] || '#0ea5e9',
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                {/* Action Icon */}
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: `${roleColors[log.user_role] || '#0ea5e9'}20`,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Ionicons
                                        name={(actionIcons[log.action_type] || 'ellipse') as any}
                                        size={20}
                                        color={roleColors[log.user_role] || '#0ea5e9'}
                                    />
                                </View>

                                {/* Content */}
                                <View style={{ flex: 1 }}>
                                    {/* User & Role */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
                                            {log.user_name || 'Пользователь'}
                                        </Text>
                                        <View style={{
                                            backgroundColor: `${roleColors[log.user_role] || '#0ea5e9'}30`,
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderRadius: 10,
                                        }}>
                                            <Text style={{
                                                color: roleColors[log.user_role] || '#0ea5e9',
                                                fontSize: 12,
                                                fontWeight: '600',
                                            }}>
                                                {roleNames[log.user_role] || log.user_role}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Description */}
                                    <Text style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 20 }}>
                                        {log.description || `${log.action_type} ${log.entity_name || log.entity_type}`}
                                    </Text>

                                    {/* Entity Name if different from description */}
                                    {log.entity_name && !log.description?.includes(log.entity_name) && (
                                        <Text style={{ color: '#A1A1AA', fontSize: 13, marginTop: 4 }}>
                                            📄 {log.entity_name}
                                        </Text>
                                    )}

                                    {/* Time */}
                                    <Text style={{ color: '#A1A1AA', fontSize: 12, marginTop: 6 }}>
                                        {formatDate(log.created_at)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}

                {/* Bottom padding */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}
