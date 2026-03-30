// FILE: app/(tabs)/reports.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable,
  ActivityIndicator, Alert, Platform, Share, Dimensions
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../../src/lib/supabaseClient";
import { LineChart, PieChart } from "react-native-chart-kit";
import { router } from "expo-router";
import { BackButton } from "../../src/components/ui/BackButton";
import { ObjectPicker } from "../../src/components/ObjectPicker";
import { translateRikCodeSync } from "../../src/lib/translation_helper";
import { getMyCompanyId } from "../../src/lib/rik_api";
import { useTranslation } from "react-i18next";

const w = Dimensions.get("window").width;
const fmt = (n: any) => Number(n ?? 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); };
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); };
const yearStart = () => new Date().getFullYear() + "-01-01";

// Date presets - keys for i18n
const DATE_PRESET_KEYS = [
  { key: "today", getStart: today, getEnd: today },
  { key: "week", getStart: weekAgo, getEnd: today },
  { key: "month", getStart: monthAgo, getEnd: today },
  { key: "year", getStart: () => new Date().getFullYear() + "-01-01", getEnd: today },
];

export default function Reports() {
  const { t } = useTranslation();
  const [start, setStart] = useState(monthAgo());
  const [end, setEnd] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnover, setTurnover] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  const [pipe, setPipe] = useState<any[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [worksDone, setWorksDone] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);

  // Dashboard stats
  const [dashStats, setDashStats] = useState<{
    positions_count: number;
    objects_count: number;
    purchases_count: number;
  } | null>(null);

  const run = useCallback(async () => {
    try {
      setLoading(true);
      const companyId = await getMyCompanyId();
      if (!companyId) {
        setTurnover([]);
        setCosts([]);
        setAging([]);
        setPipe([]);
        setWorksDone([]);
        setPurchases([]);
        setDashStats(null);
        setLoading(false);
        return;
      }

      // NEW: Dashboard stats (always try first)
      const statsRes = await supabase.rpc("company_dashboard_stats" as any, { p_company_id: companyId } as any);
      if (!statsRes.error && statsRes.data?.[0]) {
        setDashStats(statsRes.data[0]);
      }

      // NEW: Stock turnover (new function)
      const turnoverNew = await supabase.rpc("company_stock_turnover" as any, {
        p_company_id: companyId, p_from: start, p_to: end
      } as any);
      if (!turnoverNew.error && turnoverNew.data) {
        setTurnover(turnoverNew.data.map((x: any) => ({
          rik_code: x.material_code,
          incoming: x.qty_received,
          outgoing: x.qty_issued,
          balance: x.qty_balance
        })));
      }

      // NEW: Object expenses (new function)
      const expensesNew = await supabase.rpc("company_object_expenses" as any, { p_company_id: companyId } as any);
      if (!expensesNew.error && expensesNew.data) {
        setCosts(expensesNew.data.map((x: any) => ({
          object_id: x.object_name,
          article: "materials",
          fact_qty: x.materials_qty,
          fact_amount: x.purchases_count
        })));
      }

      // NEW: Purchase funnel (new function)
      const funnelNew = await supabase.rpc("company_purchase_funnel" as any, { p_company_id: companyId } as any);
      if (!funnelNew.error && funnelNew.data) {
        setPipe(funnelNew.data.map((x: any) => ({
          status: x.status_label,
          cnt: x.count
        })));
      }

      // NEW: Debts (new function)
      const debtsNew = await supabase.rpc("company_debts" as any, { p_company_id: companyId } as any);
      if (!debtsNew.error && debtsNew.data) {
        setAging(debtsNew.data.map((x: any) => ({
          counterparty_id: x.supplier_name,
          total_billed: x.purchases_count,
          total_paid: 0,
          balance: x.purchases_count
        })));
      }

      // Works and purchases (keep as before)
      let worksQuery = supabase.from("v_works_fact" as any).select("*")
        .eq("company_id", companyId)
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59");
      if (selectedObjectId) worksQuery = worksQuery.eq("object_id", selectedObjectId);

      let purQuery = supabase.from("purchase_items" as any).select(`
          id, qty, uom, purchase_id,
          purchases!inner (id, po_no, created_at, object_id, company_id),
          request_items (rik_code, name_human)
        `)
        .eq("purchases.company_id", companyId)
        .gte("purchases.created_at", start)
        .lte("purchases.created_at", end + "T23:59:59");
      if (selectedObjectId) purQuery = purQuery.eq("purchases.object_id", selectedObjectId);

      const [rWorks, rPurchases] = await Promise.all([worksQuery, purQuery]);
      if (!rWorks.error) setWorksDone(rWorks.data || []);
      if (!rPurchases.error) setPurchases(rPurchases.data || []);

    } catch (e: any) {
      console.warn("[reports] run failed:", e);
    } finally {
      setLoading(false);
    }
  }, [start, end, selectedObjectId]);

  useEffect(() => { run(); }, [run]);

  // ===== Экспорт CSV =====
  const exportCSV = async () => {
    try {
      let csv = `Отчёт;${start};${end}\n\n`;
      const add = (title: string, cols: string[], rows: any[][]) => {
        csv += title + "\n" + cols.join(";") + "\n";
        for (const r of rows) csv += r.map((x) => String(x)).join(";") + "\n";
        csv += "\n";
      };
      add(
        "Обороты склада",
        ["Код", "Приход", "Расход", "Баланс"],
        turnover.map((x) => [x.rik_code, fmt(x.incoming), fmt(x.outgoing), fmt(x.balance)])
      );
      add(
        "Затраты по объектам",
        ["Объект", "Статья", "Кол-во", "Сумма"],
        costs.map((x) => [x.object_id || "—", humanArticle(x.article), fmt(x.fact_qty), fmt(x.fact_amount)])
      );
      add(
        "Долги по контрагентам",
        ["Контрагент", "Выставлено", "Оплачено", "Баланс"],
        aging.map((x) => [x.counterparty_id, fmt(x.total_billed), fmt(x.total_paid), fmt(x.balance)])
      );
      add(
        "Воронка закупок",
        ["Статус", "Кол-во"],
        pipe.map((x) => [humanStatus(x.status), x.cnt])
      );
      add(
        "Выполненные работы",
        ["Объект", "Работа", "Кол-во", "Ед."],
        worksDone.map((x) => [x.object_name || "—", translateRikCodeSync(x.work_name) || translateRikCodeSync(x.work_code) || x.work_name || x.work_code || "—", fmt(x.qty_done), x.uom_id || "—"])
      );
      add(
        "Детализация закупок",
        ["Дата", "Объект", "Позиция", "Кол-во", "Ед."],
        purchases.map((x) => [
          new Date(x.purchases?.created_at).toLocaleDateString("ru-RU"),
          "Объект", // Можно добавить в select если нужно
          x.request_items?.name_human || (x.request_items?.rik_code ? translateRikCodeSync(x.request_items.rik_code) : "—"),
          fmt(x.qty),
          x.uom || "—"
        ])
      );
      const path = ((FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || "") + "reports.csv";
      await FileSystem.writeAsStringAsync(path, csv, { encoding: "utf8" as any });
      await Sharing.shareAsync(path);
    } catch (e: any) {
      Alert.alert("Ошибка экспорта", e.message);
    }
  };

  async function shareFile(uri: string, title = "Report") {
    try {
      if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) {
        await Share.share({ url: uri, title, message: uri });
        return;
      }
      await Sharing.shareAsync(uri, { dialogTitle: title });
    } catch (e) {
      console.warn("Share failed:", e);
    }
  }

  // ===== Экспорт PDF (бухгалтерский стиль - только суммы по категориям) =====
  const exportPDF = async () => {
    try {
      // Подсчёт по категориям
      const categoryTotals: Record<string, number> = {
        'Материалы': 0,
        'Работы': 0,
        'Услуги': 0,
        'Прочее': 0,
      };

      // Суммируем из закупок
      for (const p of purchases) {
        const rikCode = p.request_items?.rik_code || '';
        const qty = Number(p.qty || 0);

        // Определяем категорию по коду
        if (rikCode.startsWith('WRK-') || rikCode.startsWith('WORK-')) {
          categoryTotals['Работы'] += qty;
        } else if (rikCode.startsWith('SRV-') || rikCode.startsWith('SERVICE-')) {
          categoryTotals['Услуги'] += qty;
        } else if (rikCode.startsWith('MAT-') || rikCode.startsWith('MATERIAL-')) {
          categoryTotals['Материалы'] += qty;
        } else {
          categoryTotals['Прочее'] += qty;
        }
      }

      // Добавляем из выполненных работ
      for (const w of worksDone) {
        categoryTotals['Работы'] += Number(w.qty_done || 0);
      }

      // Добавляем из оборотов (только материалы)
      for (const item of turnover) {
        const code = item.rik_code || '';
        if (!code.startsWith('WRK-') && !code.startsWith('SRV-')) {
          categoryTotals['Материалы'] += Number(item.balance || 0);
        }
      }

      const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

      const html = `
      <html><head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #1e293b; margin-bottom: 8px; }
        h2 { text-align: center; color: #64748b; font-weight: normal; margin-bottom: 30px; }
        .summary-table { width: 100%; max-width: 400px; margin: 0 auto; border-collapse: collapse; }
        .summary-table td { padding: 16px 20px; font-size: 18px; border-bottom: 1px solid #e2e8f0; }
        .summary-table .label { color: #64748b; }
        .summary-table .value { text-align: right; font-weight: 700; color: #1e293b; }
        .total-row td { border-top: 2px solid #334155; border-bottom: none; font-size: 22px; }
        .total-row .value { color: #0ea5e9; font-weight: 800; }
        .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; }
      </style>
      </head><body>
      <h1>Отчёт</h1>
      <h2>${start} — ${end}</h2>
      
      <table class="summary-table">
        <tr>
          <td class="label">Материалы</td>
          <td class="value">${fmt(categoryTotals['Материалы'])}</td>
        </tr>
        <tr>
          <td class="label">Работы</td>
          <td class="value">${fmt(categoryTotals['Работы'])}</td>
        </tr>
        <tr>
          <td class="label">Услуги</td>
          <td class="value">${fmt(categoryTotals['Услуги'])}</td>
        </tr>
        ${categoryTotals['Прочее'] > 0 ? `
        <tr>
          <td class="label">Прочее</td>
          <td class="value">${fmt(categoryTotals['Прочее'])}</td>
        </tr>` : ''}
        <tr class="total-row">
          <td class="label">ИТОГО</td>
          <td class="value">${fmt(grandTotal)}</td>
        </tr>
      </table>
      
      <p class="footer">SOLTO • Сформировано ${new Date().toLocaleDateString('ru-RU')}</p>
      </body></html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e: any) {
      Alert.alert(t('screens.warehouse.reports.pdfError'), e.message);
    }
  };

  const htmlTable = (title: string, cols: string[], rows: any[][]) => `
    <h3>${title}</h3>
    <table>
      <tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>
      ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
    </table>`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f172a" }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Premium Header with Gradient */}
      <View style={{
        backgroundColor: "#1e293b",
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <BackButton theme="dark" fallbackPath="/" />
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>{t('screens.warehouse.reports.title')}</Text>
        </View>

        {/* Premium Stats Cards */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={[statsCard, { backgroundColor: "rgba(14,165,233,0.15)", borderColor: "rgba(14,165,233,0.3)" }]}>

            <Text style={statsValue}>{dashStats?.positions_count ?? turnover.length}</Text>
            <Text style={statsLabel}>{t('screens.warehouse.reports.stats.positions')}</Text>
          </View>
          <View style={[statsCard, { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.3)" }]}>

            <Text style={statsValue}>{dashStats?.objects_count ?? new Set(costs.map(c => c.object_id)).size}</Text>
            <Text style={statsLabel}>{t('screens.warehouse.reports.stats.objects')}</Text>
          </View>
          <View style={[statsCard, { backgroundColor: "rgba(168,85,247,0.15)", borderColor: "rgba(168,85,247,0.3)" }]}>

            <Text style={statsValue}>{dashStats?.purchases_count ?? pipe.reduce((s, p) => s + Number(p.cnt || 0), 0)}</Text>
            <Text style={statsLabel}>{t('screens.warehouse.reports.stats.purchases')}</Text>
          </View>
        </View>
      </View>

      {/* Content Area */}
      <View style={{ padding: 16, gap: 16 }}>

        {/* Construction Reports Entry Point */}
        <Pressable
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            borderWidth: 2,
            borderColor: '#0ea5e9',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
          }}
          onPress={() => router.push('/reports/construction')}
        >
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(14,165,233,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>

          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
              Строительные отчёты
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
              Паспорт объекта • Работы • Материалы • Журнал
            </Text>
          </View>
          <Text style={{ fontSize: 20, color: '#0ea5e9' }}>→</Text>
        </Pressable>

        {/* Form C-1 Entry Point (Kyrgyz Republic) */}
        <Pressable
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            borderWidth: 2,
            borderColor: '#a855f7',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
          }}
          onPress={() => router.push('/reports/form-c1')}
        >
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(168,85,247,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>

          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
              Форма С-1 (КР)
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
              Отчёт о строительной деятельности • stat.kg
            </Text>
          </View>
          <Text style={{ fontSize: 20, color: '#a855f7' }}>→</Text>
        </Pressable>

        {/* AI Construction Assistant Entry Point */}
        <Pressable
          style={{
            backgroundColor: '#1e293b',
            borderRadius: 16,
            padding: 20,
            borderWidth: 2,
            borderColor: '#f59e0b',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginTop: 12,
          }}
          onPress={() => router.push('/reports/ai-assistant')}
        >
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(245,158,11,0.15)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>

          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>
              ИИ-Ассистент
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
              СНиП • ГОСТ • Нормы расхода • Сроки
            </Text>
          </View>
          <Text style={{ fontSize: 20, color: '#f59e0b' }}>→</Text>
        </Pressable>

        {/* Date Presets - Premium Chips */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {DATE_PRESET_KEYS.map((preset, i) => {
            const isActive = start === preset.getStart() && end === preset.getEnd();
            return (
              <Pressable
                key={i}
                style={[
                  { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: isActive ? "#0ea5e9" : "#1e293b", borderWidth: 1, borderColor: isActive ? "#0ea5e9" : "#334155" },
                ]}
                onPress={() => { setStart(preset.getStart()); setEnd(preset.getEnd()); }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: isActive ? "#fff" : "#94a3b8" }}>
                  {t(`screens.warehouse.reports.presets.${preset.key}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Фильтры и экспорт */}
        <View style={card}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput style={inp} value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" />
            <TextInput style={inp} value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" />
          </View>
          <ObjectPicker
            value={selectedObjectId}
            onChange={(id) => setSelectedObjectId(id)}
            placeholder={t('screens.warehouse.reports.allObjects')}
          />
          <Pressable style={btnBlue} onPress={run} disabled={loading}>
            <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
              {loading ? t('screens.warehouse.reports.loading') : t('screens.warehouse.reports.generate')}
            </Text>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={btnGray} onPress={exportCSV}><Text style={{ color: '#fff' }}>{t('screens.warehouse.reports.exportCsv')}</Text></Pressable>
            <Pressable style={btnGray} onPress={exportPDF}><Text style={{ color: '#fff' }}>{t('screens.warehouse.reports.exportPdf')}</Text></Pressable>
          </View>
        </View>

        {/* Сводка по категориям (бухгалтерский стиль) */}
        <ReportCard title=" Сводка по категориям">
          {(() => {
            // Подсчёт по категориям
            const categoryTotals: Record<string, number> = {
              'Материалы': 0,
              'Работы': 0,
              'Услуги': 0,
            };

            // Из закупок
            for (const p of purchases) {
              const rikCode = p.request_items?.rik_code || '';
              const qty = Number(p.qty || 0);
              if (rikCode.startsWith('WRK-') || rikCode.startsWith('WORK-')) {
                categoryTotals['Работы'] += qty;
              } else if (rikCode.startsWith('SRV-') || rikCode.startsWith('SERVICE-')) {
                categoryTotals['Услуги'] += qty;
              } else {
                categoryTotals['Материалы'] += qty;
              }
            }

            // Из работ
            for (const w of worksDone) {
              categoryTotals['Работы'] += Number(w.qty_done || 0);
            }

            // Из оборотов (материалы)
            for (const item of turnover) {
              const code = item.rik_code || '';
              if (!code.startsWith('WRK-') && !code.startsWith('SRV-')) {
                categoryTotals['Материалы'] += Number(item.balance || 0);
              }
            }

            const grandTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

            return (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 16 }}>Материалы</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{fmt(categoryTotals['Материалы'])}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 16 }}>Работы</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{fmt(categoryTotals['Работы'])}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 16 }}>Услуги</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{fmt(categoryTotals['Услуги'])}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderTopWidth: 2, borderColor: '#475569', marginTop: 8 }}>
                  <Text style={{ color: '#0ea5e9', fontSize: 20, fontWeight: '800' }}>ИТОГО</Text>
                  <Text style={{ color: '#0ea5e9', fontSize: 24, fontWeight: '800' }}>{fmt(grandTotal)}</Text>
                </View>
              </View>
            );
          })()}
        </ReportCard>

        {/* Затраты по объектам */}
        <ReportCard title={t('screens.warehouse.reports.sections.expenses')}>
          <Table
            columns={["Объект", "Статья", "Кол-во", "Сумма"]}
            rows={costs.map((x) => [x.object_id || "—", humanArticle(x.article), fmt(x.fact_qty), fmt(x.fact_amount)])}
          />
        </ReportCard>

        {/* Воронка закупок */}
        <ReportCard title={t('screens.warehouse.reports.sections.funnel')}>
          <Table columns={["Статус", "Кол-во"]} rows={pipe.map((x) => [humanStatus(x.status), x.cnt])} />
        </ReportCard>
      </View>
    </ScrollView>
  );
}

/** ===== Стили и мелкие компоненты ===== */
// Dark theme card styles
const card = { backgroundColor: "#1e293b", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#334155", gap: 12 };
const inp = { borderWidth: 1, borderColor: "#475569", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flex: 1, backgroundColor: "#0f172a", color: "#fff", fontSize: 15 };
const btnBlue = { backgroundColor: "#0ea5e9", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: "#0284c7" };
const btnGray = { backgroundColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row" as const, alignItems: "center" as const, gap: 6 };

// Premium stats cards
const statsCard = { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center" as const };
const statsLabel = { fontSize: 12, color: "#94a3b8", marginTop: 2 };
const statsValue = { fontSize: 28, fontWeight: "800" as const, color: "#fff" };

// Legacy (unused now but kept for compatibility)
const summaryCard = { flex: 1, backgroundColor: "#1e293b", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#334155", alignItems: "center" as const };
const summaryLabel = { fontSize: 12, color: "#94a3b8", marginBottom: 4 };
const summaryValue = { fontSize: 24, fontWeight: "800" as const, color: "#fff" };

// Date preset styles
const presetBtn = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f1f5f9" };
const presetBtnActive = { backgroundColor: "#2563eb" };
const presetText = { fontSize: 13, fontWeight: "600" as const, color: "#A1A1AA" };
const presetTextActive = { color: "#fff" };

function ReportCard({ title, children }: { title: string; children: any }) {
  return (
    <View style={{ backgroundColor: "#1e293b", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#334155", gap: 12 }}>
      <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>{title}</Text>
      {children}
    </View>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <Text style={{ color: "#A1A1AA", fontStyle: "italic" }}>Нет данных</Text>;
  return (
    <View style={{ borderWidth: 1, borderColor: "#475569", borderRadius: 12, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", backgroundColor: "#334155", padding: 10 }}>
        {columns.map((c, i) => <Text key={i} style={{ flex: 1, fontWeight: "700", color: "#94a3b8", fontSize: 13 }}>{c}</Text>)}
      </View>
      {rows.map((r, idx) => (
        <View key={idx} style={{ flexDirection: "row", padding: 10, borderTopWidth: 1, borderTopColor: "#334155", backgroundColor: idx % 2 === 0 ? "#1e293b" : "#0f172a" }}>
          {r.map((c, i) => <Text key={i} style={{ flex: 1, color: "#e2e8f0", fontSize: 13 }}>{String(c)}</Text>)}
        </View>
      ))}
    </View>
  );
}

function humanArticle(a: string) {
  const translations: Record<string, string> = {
    // Основные категории
    materials: "Материалы",
    material: "Материал",
    works: "Работы",
    work: "Работа",
    services: "Услуги",
    service: "Услуга",
    transport: "Транспорт",
    delivery: "Доставка",
    equipment: "Оборудование",
    labor: "Рабочая сила",
    other: "Прочее",
    // Английские варианты
    mat: "Материалы",
    wrk: "Работы",
    srv: "Услуги",
    eqp: "Оборудование",
  };
  if (!a) return "—";
  const lower = a.toLowerCase();
  return translations[lower] || translations[a] || translateRikCodeSync(a) || a;
}
function humanStatus(s: string) {
  const m: Record<string, string> = {
    draft: "Черновик",
    pending: "К приходу",
    partial: "Частично",
    confirmed: "Принято",
    approved: "Утверждено",
    "На утверждении": "На утверждении",
  };
  return m[s] || s || "—";
}

/** ===== Графики ===== */
function ChartTurnover({ data }: { data: any[] }) {
  if (!data.length) return null;
  return (
    <LineChart
      data={{
        labels: data.map((x) => String(x.rik_code ?? "").slice(-4)),
        datasets: [{ data: data.map((x) => Number(x.balance || 0)) }],
      }}
      width={w - 48}
      height={180}
      chartConfig={{
        backgroundColor: "#0F1623",
        backgroundGradientFrom: "#fff",
        backgroundGradientTo: "#fff",
        decimalPlaces: 0,
        color: (o: any) => `rgba(14,165,233,${o.opacity})`,
      }}
      bezier
      style={{ marginVertical: 8, borderRadius: 10 }}
    />
  );
}
function ChartPie({ data }: { data: any[] }) {
  if (!data.length) return null;
  return (
    <PieChart
      data={data.map((x, i) => ({
        name: humanStatus(x.status),
        population: Number(x.cnt),
        color: ["#0ea5e9", "#38bdf8", "#67e8f9", "#94a3b8"][i % 4],
        legendFontColor: "#0f172a",
        legendFontSize: 12,
      }))}
      width={w - 48}
      height={180}
      chartConfig={{ color: () => "#0ea5e9" }}
      accessor={"population"}
      backgroundColor={"transparent"}
      paddingLeft={"10"}
    />
  );
}
