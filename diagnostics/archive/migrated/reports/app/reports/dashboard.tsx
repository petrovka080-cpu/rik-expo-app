// FILE: app/reports/dashboard.tsx
// Reports Dashboard with KPI metrics, charts, and team activity feed

import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabaseClient';
import { BackButton } from '../../src/components/ui/BackButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH > 600 ? (SCREEN_WIDTH - 64) / 3 : (SCREEN_WIDTH - 48) / 2;

// KPI Card component
interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    onPress?: () => void;
}

const KPICard = ({ title, value, subtitle, icon, color, trend, trendValue, onPress }: KPICardProps) => (
    <Pressable
        onPress={onPress}
        style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 16,
            width: CARD_WIDTH,
            minHeight: 120,
            borderLeftWidth: 4,
            borderLeftColor: color,
        }}
    >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: `${color}20`,
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Ionicons name={icon as any} size={22} color={color} />
            </View>
            {trend && (
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: trend === 'up' ? '#22c55e20' : trend === 'down' ? '#ef444420' : '#64748b20',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                }}>
                    <Ionicons
                        name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                        size={14}
                        color={trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b'}
                    />
                    {trendValue && (
                        <Text style={{
                            color: trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : '#64748b',
                            fontSize: 12,
                            marginLeft: 4,
                            fontWeight: '600',
                        }}>
                            {trendValue}
                        </Text>
                    )}
                </View>
            )}
        </View>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>{value}</Text>
        <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{title}</Text>
        {subtitle && <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 2 }}>{subtitle}</Text>}
    </Pressable>
);

// Activity Item component
interface ActivityItem {
    id: string;
    user_name: string;
    user_role: string;
    action_type: string;
    entity_name?: string;
    description?: string;
    created_at: string;
}

const roleColors: Record<string, string> = {
    director: '#8b5cf6',
    accountant: '#06b6d4',
    warehouse: '#f59e0b',
    worker: '#22c55e',
    foreman: '#3b82f6',
};

const roleNames: Record<string, string> = {
    director: 'Директор',
    accountant: 'Бухгалтер',
    warehouse: 'Складовщик',
    worker: 'Сотрудник',
    foreman: 'Прораб',
};

const actionIcons: Record<string, string> = {
    approve: 'checkmark-circle',
    reject: 'close-circle',
    create: 'add-circle',
    update: 'create',
    complete: 'checkmark-done',
};

export default function ReportsDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);

    // KPI Data
    const [kpiData, setKpiData] = useState({
        totalObjects: 0,
        activeObjects: 0,
        workReportsToday: 0,
        materialsThisWeek: 0,
        problemsOpen: 0,
        qualityChecks: 0,
        completionRate: 0,
        teamActions: 0,
        journalEntriesToday: 0, // NEW
        photosToday: 0,         // NEW
    });

    // Recent Activity
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

    // Objects list for quick access
    const [objects, setObjects] = useState<{ id: string; name: string; workCount: number }[]>([]);

    // Load company ID
    useEffect(() => {
        const loadCompany = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Use profiles table
                const { data, error } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('[Dashboard] Error loading company:', error);
                    setLoading(false);
                    return;
                }

                if (data?.company_id) {
                    setCompanyId(data.company_id);
                } else {
                    console.warn('[Dashboard] No company_id found for user');
                    setLoading(false);
                }
            } catch (e) {
                console.error('[Dashboard] loadCompany error:', e);
                setLoading(false);
            }
        };
        loadCompany();
    }, []);

    // Load dashboard data
    const loadData = useCallback(async () => {
        if (!companyId) return;

        try {
            // 1. Load objects (Unified Source from 'objects' table)
            const { data: objData } = await supabase
                .from('objects')
                .select('id, name')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            const objectsList = objData || [];
            if (objectsList.length === 0) {
                setLoading(false);
                return;
            }

            // --- IMPORTANT: Resolve Passport IDs for filtering ---
            // All reports link to object_passports.id, NOT objects.id
            const { data: pData } = await supabase
                .from('object_passports')
                .select('id, object_id')
                .in('object_id', objectsList.map(o => o.id));

            const passportIds = (pData || []).map(p => p.id);
            if (passportIds.length === 0) {
                setLoading(false);
                return;
            }

            const today = new Date().toISOString().slice(0, 10);

            // 2. Load Journal Entries (Today)
            const { count: journalCount } = await supabase
                .from('work_journal_entries')
                .select('*', { count: 'exact', head: true })
                .in('object_id', passportIds)
                .eq('entry_date', today);

            // 3. Load Work Reports (Today)
            const { count: workCount } = await supabase
                .from('work_reports')
                .select('*', { count: 'exact', head: true })
                .in('object_id', passportIds)
                .eq('report_date', today);

            // 4. Load Photos (Today)
            const { count: photoCount } = await supabase
                .from('report_photos')
                .select('*', { count: 'exact', head: true })
                .in('object_id', passportIds)
                .gte('created_at', `${today}T00:00:00`);

            // 5. Load Materials (Week)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const { count: materialsCount } = await supabase
                .from('material_deliveries')
                .select('*', { count: 'exact', head: true })
                .in('object_id', passportIds)
                .gte('delivery_date', weekAgo.toISOString().slice(0, 10));

            // 6. Load Open Problems
            const { count: problemsCount } = await supabase
                .from('problem_reports')
                .select('*', { count: 'exact', head: true })
                .in('object_id', passportIds)
                .eq('is_resolved', false);

            // 7. Recent Activity
            const { data: activityData } = await supabase
                .from('activity_logs')
                .select('id, user_name, user_role, action_type, entity_name, description, created_at')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .limit(10);

            // 8. Completion Rate (Plan vs Fact)
            const { data: workData } = await supabase
                .from('work_reports')
                .select('plan_qty, fact_qty')
                .in('object_id', passportIds);

            let completionRate = 0;
            if (workData && workData.length > 0) {
                const totalPlan = workData.reduce((sum, w) => sum + (Number(w.plan_qty) || 0), 0);
                const totalFact = workData.reduce((sum, w) => sum + (Number(w.fact_qty) || 0), 0);
                completionRate = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0;
            }

            // Work count per object (for list)
            const workCountByObject: Record<string, number> = {};
            if (objectsList.length > 0) {
                // Group by object
                const { data: workByObj } = await supabase
                    .from('work_reports')
                    .select('object_id')
                    .in('object_id', passportIds);

                const passportToCatalogMap: Record<string, string> = {};
                (pData || []).forEach(p => {
                    passportToCatalogMap[p.id] = p.object_id;
                });

                (workByObj || []).forEach(w => {
                    const catalogId = passportToCatalogMap[w.object_id];
                    if (catalogId) {
                        workCountByObject[catalogId] = (workCountByObject[catalogId] || 0) + 1;
                    }
                });
            }

            setKpiData({
                totalObjects: objectsList.length,
                activeObjects: objectsList.length,
                workReportsToday: workCount || 0,
                journalEntriesToday: journalCount || 0,
                photosToday: photoCount || 0,
                materialsThisWeek: materialsCount || 0,
                problemsOpen: problemsCount || 0,
                qualityChecks: 0,
                completionRate,
                teamActions: (activityData || []).length,
            });

            setObjects(objectsList.map(o => ({
                id: o.id,
                name: o.name,
                workCount: workCountByObject[o.id] || 0,
            })));

            setRecentActivity((activityData || []) as ActivityItem[]);
        } catch (e) {
            console.error('[Dashboard] Error loading data:', e);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        if (companyId) {
            loadData();
        }
    }, [companyId, loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'сейчас';
        if (diffMins < 60) return `${diffMins} мин`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч`;
        return `${Math.floor(diffMins / 1440)} дн`;
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text style={{ color: '#94a3b8', marginTop: 12 }}>Загрузка дашборда...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
                }
            >
                {/* Header */}
                <View style={{
                    backgroundColor: '#1e293b',
                    paddingTop: 20,
                    paddingBottom: 20,
                    paddingHorizontal: 16,
                    borderBottomLeftRadius: 24,
                    borderBottomRightRadius: 24,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <BackButton theme="dark" fallbackPath="/reports" />
                            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff' }}>📊 Дашборд</Text>
                        </View>
                        <Pressable
                            onPress={() => router.push('/reports/activity-log')}
                            style={{
                                backgroundColor: '#334155',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <Ionicons name="time-outline" size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 13 }}>История</Text>
                        </Pressable>
                    </View>
                </View>

                {/* KPI Cards */}
                <View style={{ padding: 16 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
                        📈 Ключевые показатели
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        <KPICard
                            title="Объекты"
                            value={kpiData.totalObjects}
                            subtitle={`${kpiData.activeObjects} активных`}
                            icon="business-outline"
                            color="#3b82f6"
                            onPress={() => router.push('/reports/construction')}
                        />
                        <KPICard
                            title="Журнал"
                            value={kpiData.journalEntriesToday}
                            subtitle="записей сегодня"
                            icon="book-outline"
                            color="#ec4899"
                            trend={kpiData.journalEntriesToday > 0 ? 'up' : 'neutral'}
                        />
                        <KPICard
                            title="Работы"
                            value={kpiData.workReportsToday}
                            subtitle="сегодня"
                            icon="construct-outline"
                            color="#22c55e"
                            trend={kpiData.workReportsToday > 0 ? 'up' : 'neutral'}
                        />
                        <KPICard
                            title="Фото"
                            value={kpiData.photosToday}
                            subtitle="новых фото"
                            icon="camera-outline"
                            color="#0ea5e9"
                            trend={kpiData.photosToday > 0 ? 'up' : 'neutral'}
                        />
                        <KPICard
                            title="Материалы"
                            value={kpiData.materialsThisWeek}
                            subtitle="за неделю"
                            icon="cube-outline"
                            color="#f59e0b"
                        />
                        <KPICard
                            title="Проблемы"
                            value={kpiData.problemsOpen}
                            icon="alert-circle-outline"
                            color={kpiData.problemsOpen > 0 ? '#ef4444' : '#22c55e'}
                            trend={kpiData.problemsOpen > 0 ? 'down' : 'up'}
                        />
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                        ⚡ Быстрые действия
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Pressable
                            onPress={() => router.push('/reports/construction')}
                            style={{
                                flex: 1,
                                backgroundColor: '#22c55e',
                                borderRadius: 16,
                                padding: 16,
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <Ionicons name="add-circle" size={28} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Новый отчёт</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => router.push('/reports/activity-log')}
                            style={{
                                flex: 1,
                                backgroundColor: '#3b82f6',
                                borderRadius: 16,
                                padding: 16,
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <Ionicons name="list" size={28} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Журнал действий</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Objects List */}
                {objects.length > 0 && (
                    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
                            🏗️ Объекты
                        </Text>
                        {objects.slice(0, 5).map(obj => (
                            <Pressable
                                key={obj.id}
                                onPress={() => router.push('/reports/construction')}
                                style={{
                                    backgroundColor: '#1e293b',
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 10,
                                        backgroundColor: '#3b82f620',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <Ionicons name="business" size={20} color="#3b82f6" />
                                    </View>
                                    <View>
                                        <Text style={{ color: '#fff', fontWeight: '600' }}>{obj.name}</Text>
                                        <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
                                            {obj.workCount} записей о работах
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#64748b" />
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Recent Activity */}
                {recentActivity.length > 0 && (
                    <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                                📋 Последние действия
                            </Text>
                            <Pressable onPress={() => router.push('/reports/activity-log')}>
                                <Text style={{ color: '#0ea5e9', fontSize: 14 }}>Все →</Text>
                            </Pressable>
                        </View>
                        {recentActivity.slice(0, 5).map(activity => (
                            <View
                                key={activity.id}
                                style={{
                                    backgroundColor: '#1e293b',
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    borderLeftWidth: 3,
                                    borderLeftColor: roleColors[activity.user_role] || '#64748b',
                                }}
                            >
                                <View style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: `${roleColors[activity.user_role] || '#64748b'}20`,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Ionicons
                                        name={(actionIcons[activity.action_type] || 'ellipse') as any}
                                        size={18}
                                        color={roleColors[activity.user_role] || '#64748b'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#fff', fontSize: 13 }}>
                                        <Text style={{ fontWeight: '600' }}>{activity.user_name || 'Пользователь'}</Text>
                                        {' • '}
                                        <Text style={{ color: roleColors[activity.user_role] || '#64748b' }}>
                                            {roleNames[activity.user_role] || activity.user_role}
                                        </Text>
                                    </Text>
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }} numberOfLines={1}>
                                        {activity.description || activity.entity_name || activity.action_type}
                                    </Text>
                                </View>
                                <Text style={{ color: '#A1A1AA', fontSize: 11 }}>
                                    {formatTime(activity.created_at)}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Empty State */}
                {objects.length === 0 && recentActivity.length === 0 && (
                    <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
                        <Ionicons name="documents-outline" size={80} color="#334155" />
                        <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' }}>
                            Пока нет данных
                        </Text>
                        <Text style={{ color: '#A1A1AA', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                            Создайте первый объект и добавьте отчёты о работах
                        </Text>
                        <Pressable
                            onPress={() => router.push('/reports/construction')}
                            style={{
                                backgroundColor: '#22c55e',
                                paddingHorizontal: 24,
                                paddingVertical: 14,
                                borderRadius: 12,
                                marginTop: 24,
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                                Создать объект
                            </Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
