import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput, Pressable, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/src/lib/supabaseClient';
import { getMyCompanyId } from '@/src/lib/rik_api';
import { useTranslation } from 'react-i18next';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BackButton } from '@/src/components/ui/BackButton';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface WorkVolume {
    id: number;
    name: string;
    unit: string;
    period_value: string;
    ytd_value: string;
}

interface CommissionedObject {
    id: number;
    name: string;
    location: string;
    type: 'residential' | 'non-residential';
    area_m2: string;
    cost_ths: string;
    status: 'commissioned' | 'in_progress';
}

interface InvestmentSource {
    id: number;
    name: string;
    amount_ths: string;
    percent: string;
}

interface EquipmentUsage {
    id: number;
    type: string;
    count: string;
    hours: string;
}

interface FormC1Data {
    report_period: 'month' | 'quarter' | 'year';
    report_year: number;
    report_month?: number;
    report_quarter?: number;
    org_name: string;
    okpo_code: string;
    inn: string;
    ownership_code: string;
    address: string;
    phone_email: string;
    oked_code: string;
    main_customer: string;
    work_volumes: WorkVolume[];
    commissioned_objects: CommissionedObject[];
    housing_stats: {
        houses_count: string;
        total_area_m2: string;
        apartments_count: string;
        construction_cost_ths: string;
    };
    investment_sources: InvestmentSource[];
    personnel_stats: {
        avg_employees: string;
        workers_count: string;
        payroll_ths: string;
        avg_salary: string;
    };
    equipment_usage: EquipmentUsage[];
    director_name: string;
    accountant_name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: {
        paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: '#1e293b'
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' as const },
    headerSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    content: { padding: 16 },
    section: {
        backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16
    },
    sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' as const, marginBottom: 12 },
    sectionSubtitle: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
    row: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
    field: { flex: 1 },
    label: { color: '#94a3b8', fontSize: 11, marginBottom: 4 },
    input: {
        backgroundColor: '#0f172a', borderRadius: 8, padding: 12,
        color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#334155'
    },
    tableHeader: {
        flexDirection: 'row' as const, backgroundColor: '#0f172a',
        borderRadius: 8, padding: 8, marginBottom: 8
    },
    tableHeaderCell: { flex: 1, color: '#A1A1AA', fontSize: 10, fontWeight: '600' as const },
    tableRow: {
        flexDirection: 'row' as const, borderBottomWidth: 1,
        borderBottomColor: '#334155', paddingVertical: 8
    },
    tableCell: { flex: 1 },
    tableCellInput: {
        backgroundColor: '#0f172a', borderRadius: 6, padding: 8,
        color: '#fff', fontSize: 12, marginHorizontal: 2
    },
    addButton: {
        backgroundColor: '#334155', borderRadius: 8, padding: 12,
        alignItems: 'center' as const, marginTop: 8
    },
    addButtonText: { color: '#38bdf8', fontSize: 12, fontWeight: '600' as const },
    periodSelector: {
        flexDirection: 'row' as const, gap: 8, marginBottom: 16
    },
    periodButton: {
        flex: 1, backgroundColor: '#334155', borderRadius: 8,
        padding: 12, alignItems: 'center' as const
    },
    periodButtonActive: { backgroundColor: '#0ea5e9' },
    periodButtonText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' as const },
    periodButtonTextActive: { color: '#fff' },
    submitButton: {
        backgroundColor: '#22c55e', borderRadius: 12, padding: 16,
        alignItems: 'center' as const, marginTop: 8
    },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
    autoFillButton: {
        backgroundColor: '#0ea5e9', borderRadius: 8, padding: 10,
        alignItems: 'center' as const, marginBottom: 16
    },
    autoFillButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' as const },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────────────────
const defaultWorkVolumes: WorkVolume[] = [
    { id: 1, name: 'Общий объём строительных работ', unit: 'тыс. сом', period_value: '', ytd_value: '' },
    { id: 2, name: 'Новое строительство', unit: 'тыс. сом', period_value: '', ytd_value: '' },
    { id: 3, name: 'Капитальный ремонт', unit: 'тыс. сом', period_value: '', ytd_value: '' },
    { id: 4, name: 'Реконструкция', unit: 'тыс. сом', period_value: '', ytd_value: '' },
    { id: 5, name: 'Прочие работы', unit: 'тыс. сом', period_value: '', ytd_value: '' },
];

const defaultInvestmentSources: InvestmentSource[] = [
    { id: 1, name: 'Собственные средства', amount_ths: '', percent: '' },
    { id: 2, name: 'Бюджетные средства', amount_ths: '', percent: '' },
    { id: 3, name: 'Банковские кредиты', amount_ths: '', percent: '' },
    { id: 4, name: 'Иностранные инвестиции', amount_ths: '', percent: '' },
    { id: 5, name: 'Прочие', amount_ths: '', percent: '' },
];

const defaultEquipmentUsage: EquipmentUsage[] = [
    { id: 1, type: 'Экскаваторы', count: '', hours: '' },
    { id: 2, type: 'Краны', count: '', hours: '' },
    { id: 3, type: 'Бульдозеры', count: '', hours: '' },
    { id: 4, type: 'Прочая техника', count: '', hours: '' },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FormC1Screen() {
    const router = useRouter();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [reportId, setReportId] = useState<string | null>(null);

    const [form, setForm] = useState<FormC1Data>({
        report_period: 'month',
        report_year: new Date().getFullYear(),
        report_month: new Date().getMonth() + 1,
        org_name: '',
        okpo_code: '',
        inn: '',
        ownership_code: '',
        address: '',
        phone_email: '',
        oked_code: '',
        main_customer: '',
        work_volumes: defaultWorkVolumes,
        commissioned_objects: [],
        housing_stats: {
            houses_count: '',
            total_area_m2: '',
            apartments_count: '',
            construction_cost_ths: '',
        },
        investment_sources: defaultInvestmentSources,
        personnel_stats: {
            avg_employees: '',
            workers_count: '',
            payroll_ths: '',
            avg_salary: '',
        },
        equipment_usage: defaultEquipmentUsage,
        director_name: '',
        accountant_name: '',
    });

    // ─────────────────────────────────────────────────────────────────────────
    // LOAD DATA
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const cid = await getMyCompanyId();
            if (!cid) {
                Alert.alert('Ошибка', 'Компания не найдена');
                router.back();
                return;
            }
            setCompanyId(cid);

            // Load company info for auto-fill
            const { data: company } = await supabase
                .from('companies')
                .select('*')
                .eq('id', cid)
                .single();

            if (company) {
                setForm(prev => ({
                    ...prev,
                    org_name: company.name || '',
                    inn: company.inn || '',
                    address: company.address || '',
                    phone_email: `${company.phone_main || ''} / ${company.email || ''}`.trim(),
                }));
            }
        } catch (e) {
            console.error('[FormC1] loadInitialData error:', e);
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // AUTO-FILL FROM EXISTING DATA
    // ─────────────────────────────────────────────────────────────────────────
    const autoFillFromCompanyData = async () => {
        if (!companyId) return;
        setLoading(true);

        try {
            // Get objects for commissioned list
            const { data: objects } = await supabase
                .from('object_passports')
                .select('id, name, address, total_completion')
                .eq('company_id', companyId)
                .eq('is_active', true);

            if (objects && objects.length > 0) {
                const commissionedObjects: CommissionedObject[] = objects.map((obj, idx) => ({
                    id: idx + 1,
                    name: obj.name,
                    location: obj.address || '',
                    type: 'non-residential' as const,
                    area_m2: '',
                    cost_ths: '',
                    status: obj.total_completion >= 100 ? 'commissioned' as const : 'in_progress' as const,
                }));
                setForm(prev => ({ ...prev, commissioned_objects: commissionedObjects }));
            }

            // Get work reports for volume aggregation
            const { data: workReports } = await supabase
                .from('work_reports')
                .select('work_type, fact_qty')
                .eq('company_id', companyId);

            if (workReports && workReports.length > 0) {
                const totalWork = workReports.reduce((sum, w) => sum + (w.fact_qty || 0), 0);
                setForm(prev => ({
                    ...prev,
                    work_volumes: prev.work_volumes.map((wv, idx) =>
                        idx === 0 ? { ...wv, period_value: String(totalWork) } : wv
                    )
                }));
            }

            // Get personnel count
            const { data: profiles } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('company_id', companyId);

            if (profiles) {
                setForm(prev => ({
                    ...prev,
                    personnel_stats: {
                        ...prev.personnel_stats,
                        avg_employees: String(profiles.length),
                    }
                }));
            }

            Alert.alert('✓', 'Данные заполнены из базы');
        } catch (e) {
            console.error('[FormC1] autoFill error:', e);
            Alert.alert('Ошибка', 'Не удалось загрузить данные');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // SAVE REPORT
    // ─────────────────────────────────────────────────────────────────────────
    const saveReport = async (submit = false) => {
        if (!companyId) return;
        setSaving(true);

        try {
            const payload = {
                company_id: companyId,
                report_period: form.report_period,
                report_year: form.report_year,
                report_month: form.report_period === 'month' ? form.report_month : null,
                report_quarter: form.report_period === 'quarter' ? form.report_quarter : null,
                org_name: form.org_name,
                okpo_code: form.okpo_code,
                inn: form.inn,
                ownership_code: form.ownership_code,
                address: form.address,
                phone_email: form.phone_email,
                oked_code: form.oked_code,
                main_customer: form.main_customer,
                work_volumes: form.work_volumes,
                commissioned_objects: form.commissioned_objects,
                housing_stats: form.housing_stats,
                investment_sources: form.investment_sources,
                personnel_stats: form.personnel_stats,
                equipment_usage: form.equipment_usage,
                director_name: form.director_name,
                accountant_name: form.accountant_name,
                status: submit ? 'submitted' : 'draft',
                signed_at: submit ? new Date().toISOString() : null,
            };

            let result;
            if (reportId) {
                result = await supabase
                    .from('report_c1')
                    .update(payload)
                    .eq('id', reportId)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from('report_c1')
                    .insert(payload)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            setReportId(result.data.id);
            Alert.alert('✓', submit ? 'Отчёт отправлен' : 'Черновик сохранён');

            if (submit) {
                router.back();
            }
        } catch (e: any) {
            console.error('[FormC1] save error:', e);
            Alert.alert('Ошибка', e.message || 'Не удалось сохранить');
        } finally {
            setSaving(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────
    const addCommissionedObject = () => {
        const newObj: CommissionedObject = {
            id: Date.now(),
            name: '',
            location: '',
            type: 'non-residential',
            area_m2: '',
            cost_ths: '',
            status: 'in_progress',
        };
        setForm(prev => ({
            ...prev,
            commissioned_objects: [...prev.commissioned_objects, newObj]
        }));
    };

    const updateCommissionedObject = (id: number, field: keyof CommissionedObject, value: string) => {
        setForm(prev => ({
            ...prev,
            commissioned_objects: prev.commissioned_objects.map(obj =>
                obj.id === id ? { ...obj, [field]: value } : obj
            )
        }));
    };

    const updateWorkVolume = (id: number, field: 'period_value' | 'ytd_value', value: string) => {
        setForm(prev => ({
            ...prev,
            work_volumes: prev.work_volumes.map(wv =>
                wv.id === id ? { ...wv, [field]: value } : wv
            )
        }));
    };

    const updateInvestment = (id: number, field: 'amount_ths' | 'percent', value: string) => {
        setForm(prev => ({
            ...prev,
            investment_sources: prev.investment_sources.map(inv =>
                inv.id === id ? { ...inv, [field]: value } : inv
            )
        }));
    };

    const updateEquipment = (id: number, field: 'count' | 'hours', value: string) => {
        setForm(prev => ({
            ...prev,
            equipment_usage: prev.equipment_usage.map(eq =>
                eq.id === id ? { ...eq, [field]: value } : eq
            )
        }));
    };

    // ─────────────────────────────────────────────────────────────────────────
    // PDF EXPORT (stat.kg style)
    // ─────────────────────────────────────────────────────────────────────────
    const exportToPDF = async () => {
        setExporting(true);
        try {
            const periodText = form.report_period === 'month'
                ? `${form.report_month || 1} месяц ${form.report_year} г.`
                : form.report_period === 'quarter'
                    ? `${form.report_quarter || 1} квартал ${form.report_year} г.`
                    : `${form.report_year} год`;

            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 11pt; 
            line-height: 1.4;
            padding: 20mm 15mm;
            color: #000;
        }
        .header { text-align: center; margin-bottom: 20px; }
        .header-top { font-size: 9pt; color: #666; margin-bottom: 10px; }
        .header-title { font-size: 14pt; font-weight: bold; margin-bottom: 5px; }
        .header-subtitle { font-size: 12pt; margin-bottom: 15px; }
        .period-box { 
            border: 1px solid #000; 
            display: inline-block; 
            padding: 5px 20px; 
            margin-bottom: 20px;
        }
        .org-info { margin-bottom: 20px; }
        .org-row { display: flex; margin-bottom: 8px; }
        .org-label { width: 200px; font-weight: bold; }
        .org-value { flex: 1; border-bottom: 1px solid #000; min-height: 18px; }
        .section { margin-top: 20px; }
        .section-title { font-weight: bold; margin-bottom: 10px; font-size: 11pt; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 15px;
            font-size: 10pt;
        }
        th, td { 
            border: 1px solid #000; 
            padding: 5px 8px; 
            text-align: left; 
        }
        th { background-color: #f0f0f0; font-weight: bold; }
        .num-col { width: 30px; text-align: center; }
        .value-col { width: 100px; text-align: right; }
        .signatures { margin-top: 40px; }
        .sig-row { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .sig-block { width: 45%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 5px; min-height: 25px; display: flex; align-items: flex-end; }
        .sig-label { font-size: 9pt; color: #666; }
        .stamp-area { 
            width: 100px; 
            height: 100px; 
            border: 1px dashed #999; 
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9pt;
            color: #999;
        }
        .footer { text-align: center; font-size: 9pt; color: #666; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">КЫРГЫЗСКАЯ РЕСПУБЛИКА</div>
        <div class="header-title">Форма № С-1</div>
        <div class="header-subtitle">ОТЧЁТ О СТРОИТЕЛЬНОЙ ДЕЯТЕЛЬНОСТИ</div>
        <div class="period-box">Отчётный период: ${periodText}</div>
    </div>

    <div class="org-info">
        <div class="org-row"><span class="org-label">Организация:</span><span class="org-value">${form.org_name || ''}</span></div>
        <div class="org-row"><span class="org-label">Код ОКПО:</span><span class="org-value">${form.okpo_code || ''}</span></div>
        <div class="org-row"><span class="org-label">ИНН:</span><span class="org-value">${form.inn || ''}</span></div>
        <div class="org-row"><span class="org-label">Форма собственности:</span><span class="org-value">${form.ownership_code || ''}</span></div>
        <div class="org-row"><span class="org-label">Адрес:</span><span class="org-value">${form.address || ''}</span></div>
        <div class="org-row"><span class="org-label">Телефон / E-mail:</span><span class="org-value">${form.phone_email || ''}</span></div>
        <div class="org-row"><span class="org-label">ОКЭД:</span><span class="org-value">${form.oked_code || ''}</span></div>
        <div class="org-row"><span class="org-label">Основной заказчик:</span><span class="org-value">${form.main_customer || ''}</span></div>
    </div>

    <div class="section">
        <div class="section-title">Таблица 1. Объём выполненных работ</div>
        <table>
            <tr><th class="num-col">№</th><th>Показатель</th><th>Ед. изм.</th><th class="value-col">За период</th><th class="value-col">С начала года</th></tr>
            ${form.work_volumes.map((wv, i) => `
            <tr><td class="num-col">${i + 1}</td><td>${wv.name}</td><td>${wv.unit}</td><td class="value-col">${wv.period_value || '—'}</td><td class="value-col">${wv.ytd_value || '—'}</td></tr>
            `).join('')}
        </table>
    </div>

    ${form.commissioned_objects.length > 0 ? `
    <div class="section">
        <div class="section-title">Таблица 2. Ввод объектов в эксплуатацию</div>
        <table>
            <tr><th class="num-col">№</th><th>Наименование</th><th>Местоположение</th><th>Тип</th><th class="value-col">Площадь м²</th><th class="value-col">Стоимость</th><th>Статус</th></tr>
            ${form.commissioned_objects.map((obj, i) => `
            <tr>
                <td class="num-col">${i + 1}</td>
                <td>${obj.name || '—'}</td>
                <td>${obj.location || '—'}</td>
                <td>${obj.type === 'residential' ? 'жилой' : 'нежилой'}</td>
                <td class="value-col">${obj.area_m2 || '—'}</td>
                <td class="value-col">${obj.cost_ths || '—'}</td>
                <td>${obj.status === 'commissioned' ? 'введён' : 'строится'}</td>
            </tr>
            `).join('')}
        </table>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Таблица 3. Жилищное строительство</div>
        <table>
            <tr><th class="num-col">№</th><th>Показатель</th><th>Ед. изм.</th><th class="value-col">Значение</th></tr>
            <tr><td class="num-col">1</td><td>Количество построенных домов</td><td>ед.</td><td class="value-col">${form.housing_stats.houses_count || '—'}</td></tr>
            <tr><td class="num-col">2</td><td>Общая площадь жилья</td><td>м²</td><td class="value-col">${form.housing_stats.total_area_m2 || '—'}</td></tr>
            <tr><td class="num-col">3</td><td>Введено квартир</td><td>ед.</td><td class="value-col">${form.housing_stats.apartments_count || '—'}</td></tr>
            <tr><td class="num-col">4</td><td>Стоимость строительства</td><td>тыс. сом</td><td class="value-col">${form.housing_stats.construction_cost_ths || '—'}</td></tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Таблица 4. Источники финансирования</div>
        <table>
            <tr><th class="num-col">№</th><th>Источник</th><th class="value-col">тыс. сом</th><th class="value-col">%</th></tr>
            ${form.investment_sources.map((inv, i) => `
            <tr><td class="num-col">${i + 1}</td><td>${inv.name}</td><td class="value-col">${inv.amount_ths || '—'}</td><td class="value-col">${inv.percent || '—'}</td></tr>
            `).join('')}
        </table>
    </div>

    <div class="section">
        <div class="section-title">Таблица 5. Трудовые ресурсы</div>
        <table>
            <tr><th class="num-col">№</th><th>Показатель</th><th>Ед. изм.</th><th class="value-col">Значение</th></tr>
            <tr><td class="num-col">1</td><td>Среднесписочная численность работников</td><td>чел.</td><td class="value-col">${form.personnel_stats.avg_employees || '—'}</td></tr>
            <tr><td class="num-col">2</td><td>В том числе рабочие</td><td>чел.</td><td class="value-col">${form.personnel_stats.workers_count || '—'}</td></tr>
            <tr><td class="num-col">3</td><td>Фонд оплаты труда</td><td>тыс. сом</td><td class="value-col">${form.personnel_stats.payroll_ths || '—'}</td></tr>
            <tr><td class="num-col">4</td><td>Средняя зарплата</td><td>сом</td><td class="value-col">${form.personnel_stats.avg_salary || '—'}</td></tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Таблица 6. Использование техники</div>
        <table>
            <tr><th class="num-col">№</th><th>Вид техники</th><th class="value-col">Количество</th><th class="value-col">Часы работы</th></tr>
            ${form.equipment_usage.map((eq, i) => `
            <tr><td class="num-col">${i + 1}</td><td>${eq.type}</td><td class="value-col">${eq.count || '—'}</td><td class="value-col">${eq.hours || '—'}</td></tr>
            `).join('')}
        </table>
    </div>

    <div class="signatures">
        <div class="sig-row">
            <div class="sig-block">
                <div class="sig-line">${form.director_name || ''}</div>
                <div class="sig-label">Руководитель организации (подпись, ФИО)</div>
            </div>
            <div class="sig-block">
                <div class="sig-line">${form.accountant_name || ''}</div>
                <div class="sig-label">Главный бухгалтер (подпись, ФИО)</div>
            </div>
        </div>
        <div class="stamp-area">М.П.</div>
        <div style="text-align: center; font-size: 10pt;">Дата: «____» _____________ ${form.report_year} г.</div>
    </div>

    <div class="footer">
        Форма С-1 • Сформировано: ${new Date().toLocaleDateString('ru-RU')}
    </div>
</body>
</html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Форма С-1',
                UTI: 'com.adobe.pdf'
            });
        } catch (e: any) {
            console.error('[FormC1] PDF export error:', e);
            Alert.alert('Ошибка', 'Не удалось сформировать PDF');
        } finally {
            setExporting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ marginBottom: 16 }}>
                    <BackButton theme="dark" />
                </View>
                <Text style={styles.headerTitle}>Форма С-1</Text>
                <Text style={styles.headerSubtitle}>Отчёт о строительной деятельности (Кыргызская Республика)</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Auto-fill button */}
                <Pressable style={styles.autoFillButton} onPress={autoFillFromCompanyData}>
                    <Text style={styles.autoFillButtonText}>⚡ Авто-заполнение из данных компании</Text>
                </Pressable>

                {/* Section 1: Титульная часть */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Титульная часть</Text>

                    {/* Period selector */}
                    <Text style={styles.label}>Отчётный период</Text>
                    <View style={styles.periodSelector}>
                        {(['month', 'quarter', 'year'] as const).map(period => (
                            <Pressable
                                key={period}
                                style={[
                                    styles.periodButton,
                                    form.report_period === period && styles.periodButtonActive
                                ]}
                                onPress={() => setForm(prev => ({ ...prev, report_period: period }))}
                            >
                                <Text style={[
                                    styles.periodButtonText,
                                    form.report_period === period && styles.periodButtonTextActive
                                ]}>
                                    {period === 'month' ? 'Месяц' : period === 'quarter' ? 'Квартал' : 'Год'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Год</Text>
                            <TextInput
                                style={styles.input}
                                value={String(form.report_year)}
                                onChangeText={v => setForm(prev => ({ ...prev, report_year: parseInt(v) || 2025 }))}
                                keyboardType="numeric"
                            />
                        </View>
                        {form.report_period === 'month' && (
                            <View style={styles.field}>
                                <Text style={styles.label}>Месяц</Text>
                                <TextInput
                                    style={styles.input}
                                    value={String(form.report_month || '')}
                                    onChangeText={v => setForm(prev => ({ ...prev, report_month: parseInt(v) || 1 }))}
                                    keyboardType="numeric"
                                    placeholder="1-12"
                                    placeholderTextColor="#64748b"
                                />
                            </View>
                        )}
                        {form.report_period === 'quarter' && (
                            <View style={styles.field}>
                                <Text style={styles.label}>Квартал</Text>
                                <TextInput
                                    style={styles.input}
                                    value={String(form.report_quarter || '')}
                                    onChangeText={v => setForm(prev => ({ ...prev, report_quarter: parseInt(v) || 1 }))}
                                    keyboardType="numeric"
                                    placeholder="1-4"
                                    placeholderTextColor="#64748b"
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Наименование организации</Text>
                        <TextInput
                            style={styles.input}
                            value={form.org_name}
                            onChangeText={v => setForm(prev => ({ ...prev, org_name: v }))}
                            placeholder="ООО «СтройКомпания»"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Код ОКПО</Text>
                            <TextInput
                                style={styles.input}
                                value={form.okpo_code}
                                onChangeText={v => setForm(prev => ({ ...prev, okpo_code: v }))}
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>ИНН</Text>
                            <TextInput
                                style={styles.input}
                                value={form.inn}
                                onChangeText={v => setForm(prev => ({ ...prev, inn: v }))}
                            />
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Форма собственности (код)</Text>
                            <TextInput
                                style={styles.input}
                                value={form.ownership_code}
                                onChangeText={v => setForm(prev => ({ ...prev, ownership_code: v }))}
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>ОКЭД</Text>
                            <TextInput
                                style={styles.input}
                                value={form.oked_code}
                                onChangeText={v => setForm(prev => ({ ...prev, oked_code: v }))}
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Адрес</Text>
                        <TextInput
                            style={styles.input}
                            value={form.address}
                            onChangeText={v => setForm(prev => ({ ...prev, address: v }))}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Телефон / E-mail</Text>
                        <TextInput
                            style={styles.input}
                            value={form.phone_email}
                            onChangeText={v => setForm(prev => ({ ...prev, phone_email: v }))}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Основной заказчик</Text>
                        <TextInput
                            style={styles.input}
                            value={form.main_customer}
                            onChangeText={v => setForm(prev => ({ ...prev, main_customer: v }))}
                        />
                    </View>
                </View>

                {/* Section 2: Объём работ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Объём выполненных работ</Text>
                    <Text style={styles.sectionSubtitle}>Таблица 1</Text>

                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>№</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Показатель</Text>
                        <Text style={styles.tableHeaderCell}>За период</Text>
                        <Text style={styles.tableHeaderCell}>С начала года</Text>
                    </View>

                    {form.work_volumes.map((wv, idx) => (
                        <View key={wv.id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 0.5, color: '#94a3b8', paddingTop: 8 }]}>{idx + 1}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: '#fff', paddingTop: 8, fontSize: 11 }]}>{wv.name}</Text>
                            <View style={styles.tableCell}>
                                <TextInput
                                    style={styles.tableCellInput}
                                    value={wv.period_value}
                                    onChangeText={v => updateWorkVolume(wv.id, 'period_value', v)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                            <View style={styles.tableCell}>
                                <TextInput
                                    style={styles.tableCellInput}
                                    value={wv.ytd_value}
                                    onChangeText={v => updateWorkVolume(wv.id, 'ytd_value', v)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {/* Section 3: Объекты */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>3. Ввод объектов в эксплуатацию</Text>
                    <Text style={styles.sectionSubtitle}>Таблица 2</Text>

                    {form.commissioned_objects.map((obj, idx) => (
                        <View key={obj.id} style={{ marginBottom: 12, backgroundColor: '#0f172a', borderRadius: 8, padding: 12 }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 10, marginBottom: 8 }}>Объект #{idx + 1}</Text>
                            <TextInput
                                style={[styles.input, { marginBottom: 8 }]}
                                value={obj.name}
                                onChangeText={v => updateCommissionedObject(obj.id, 'name', v)}
                                placeholder="Наименование объекта"
                                placeholderTextColor="#475569"
                            />
                            <View style={styles.row}>
                                <View style={styles.field}>
                                    <TextInput
                                        style={styles.input}
                                        value={obj.location}
                                        onChangeText={v => updateCommissionedObject(obj.id, 'location', v)}
                                        placeholder="Местоположение"
                                        placeholderTextColor="#475569"
                                    />
                                </View>
                                <View style={styles.field}>
                                    <TextInput
                                        style={styles.input}
                                        value={obj.area_m2}
                                        onChangeText={v => updateCommissionedObject(obj.id, 'area_m2', v)}
                                        placeholder="Площадь м²"
                                        placeholderTextColor="#475569"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                            <View style={styles.row}>
                                <View style={styles.field}>
                                    <TextInput
                                        style={styles.input}
                                        value={obj.cost_ths}
                                        onChangeText={v => updateCommissionedObject(obj.id, 'cost_ths', v)}
                                        placeholder="Стоимость тыс.сом"
                                        placeholderTextColor="#475569"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    ))}

                    <Pressable style={styles.addButton} onPress={addCommissionedObject}>
                        <Text style={styles.addButtonText}>+ Добавить объект</Text>
                    </Pressable>
                </View>

                {/* Section 4: Жилищное строительство */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Жилищное строительство</Text>
                    <Text style={styles.sectionSubtitle}>Таблица 3</Text>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Количество домов</Text>
                            <TextInput
                                style={styles.input}
                                value={form.housing_stats.houses_count}
                                onChangeText={v => setForm(prev => ({
                                    ...prev,
                                    housing_stats: { ...prev.housing_stats, houses_count: v }
                                }))}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Общая площадь м²</Text>
                            <TextInput
                                style={styles.input}
                                value={form.housing_stats.total_area_m2}
                                onChangeText={v => setForm(prev => ({
                                    ...prev,
                                    housing_stats: { ...prev.housing_stats, total_area_m2: v }
                                }))}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Введено квартир</Text>
                            <TextInput
                                style={styles.input}
                                value={form.housing_stats.apartments_count}
                                onChangeText={v => setForm(prev => ({
                                    ...prev,
                                    housing_stats: { ...prev.housing_stats, apartments_count: v }
                                }))}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Стоимость тыс.сом</Text>
                            <TextInput
                                style={styles.input}
                                value={form.housing_stats.construction_cost_ths}
                                onChangeText={v => setForm(prev => ({
                                    ...prev,
                                    housing_stats: { ...prev.housing_stats, construction_cost_ths: v }
                                }))}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                {/* Section 5: Инвестиции */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Источники финансирования</Text>
                    <Text style={styles.sectionSubtitle}>Таблица 4</Text>

                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>№</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Источник</Text>
                        <Text style={styles.tableHeaderCell}>тыс.сом</Text>
                        <Text style={styles.tableHeaderCell}>%</Text>
                    </View>

                    {form.investment_sources.map((inv, idx) => (
                        <View key={inv.id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 0.5, color: '#94a3b8', paddingTop: 8 }]}>{idx + 1}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: '#fff', paddingTop: 8, fontSize: 11 }]}>{inv.name}</Text>
                            <View style={styles.tableCell}>
                                <TextInput
                                    style={styles.tableCellInput}
                                    value={inv.amount_ths}
                                    onChangeText={v => updateInvestment(inv.id, 'amount_ths', v)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                            <View style={styles.tableCell}>
                                <TextInput
                                    style={styles.tableCellInput}
                                    value={inv.percent}
                                    onChangeText={v => updateInvestment(inv.id, 'percent', v)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {/* Section 6: Персонал */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. Трудовые ресурсы</Text>
                    <Text style={styles.sectionSubtitle}>Таблица 5</Text>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Среднесписочная численность</Text>
                            <TextInput
                                style={styles.input}
                                value={form.personnel_stats.avg_employees}
                                onChangeText={v => setForm(prev => ({
                                    ...prev,
                                    personnel_stats: { ...prev.personnel_stats, avg_employees: v }
                                }))}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>В т.ч. рабочие</Text>
                            <TextInput
                                style={styles.input}
                                value={form.personnel_stats.workers_count}
                                onChangeText={v => setForm(prev => ({
                                    ...prev,
                                    personnel_stats: { ...prev.personnel_stats, workers_count: v }
                                }))}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.label}>ФОТ тыс.сом</Text>
                            <TextInput
                                style={styles.input}
                                value={form.personnel_stats.payroll_ths}
                                onChangeText={v => setForm(prev => ({
                                    ...prev,
                                    personnel_stats: { ...prev.personnel_stats, payroll_ths: v }
                                }))}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Средняя зарплата сом</Text>
                            <TextInput
                                style={styles.input}
                                value={form.personnel_stats.avg_salary}
                                onChangeText={v => setForm(prev => ({
                                    ...prev,
                                    personnel_stats: { ...prev.personnel_stats, avg_salary: v }
                                }))}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                {/* Section 7: Техника */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>7. Использование техники</Text>
                    <Text style={styles.sectionSubtitle}>Таблица 6</Text>

                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { flex: 0.5 }]}>№</Text>
                        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Вид техники</Text>
                        <Text style={styles.tableHeaderCell}>Кол-во</Text>
                        <Text style={styles.tableHeaderCell}>Часы работы</Text>
                    </View>

                    {form.equipment_usage.map((eq, idx) => (
                        <View key={eq.id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 0.5, color: '#94a3b8', paddingTop: 8 }]}>{idx + 1}</Text>
                            <Text style={[styles.tableCell, { flex: 2, color: '#fff', paddingTop: 8, fontSize: 11 }]}>{eq.type}</Text>
                            <View style={styles.tableCell}>
                                <TextInput
                                    style={styles.tableCellInput}
                                    value={eq.count}
                                    onChangeText={v => updateEquipment(eq.id, 'count', v)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                            <View style={styles.tableCell}>
                                <TextInput
                                    style={styles.tableCellInput}
                                    value={eq.hours}
                                    onChangeText={v => updateEquipment(eq.id, 'hours', v)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#475569"
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {/* Section 8: Подписи */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>8. Подписи</Text>

                    <View style={styles.field}>
                        <Text style={styles.label}>Руководитель организации (ФИО)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.director_name}
                            onChangeText={v => setForm(prev => ({ ...prev, director_name: v }))}
                            placeholder="Иванов Иван Иванович"
                            placeholderTextColor="#64748b"
                        />
                    </View>

                    <View style={[styles.field, { marginTop: 12 }]}>
                        <Text style={styles.label}>Главный бухгалтер (ФИО)</Text>
                        <TextInput
                            style={styles.input}
                            value={form.accountant_name}
                            onChangeText={v => setForm(prev => ({ ...prev, accountant_name: v }))}
                            placeholder="Петрова Мария Сергеевна"
                            placeholderTextColor="#64748b"
                        />
                    </View>
                </View>

                {/* Actions */}
                <View style={{ gap: 12, marginBottom: 40 }}>
                    {/* PDF Export Button */}
                    <Pressable
                        style={{
                            backgroundColor: '#a855f7',
                            borderRadius: 12,
                            padding: 16,
                            alignItems: 'center' as const,
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 8,
                        }}
                        onPress={exportToPDF}
                        disabled={exporting}
                    >
                        <Text style={{ fontSize: 20 }}>📄</Text>
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                            {exporting ? 'Формирование PDF...' : 'Скачать PDF (stat.kg)'}
                        </Text>
                    </Pressable>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <Pressable
                            style={[styles.addButton, { flex: 1 }]}
                            onPress={() => saveReport(false)}
                            disabled={saving}
                        >
                            <Text style={styles.addButtonText}>
                                {saving ? 'Сохранение...' : '💾 Сохранить черновик'}
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.submitButton, { flex: 1 }]}
                            onPress={() => saveReport(true)}
                            disabled={saving}
                        >
                            <Text style={styles.submitButtonText}>
                                {saving ? '...' : '📤 Отправить'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
