import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable,
  ActivityIndicator, Alert
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { supabase } from "../../src/lib/supabaseClient";
import { LineChart, PieChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
// ВЕРХ ФАЙЛА (замени существующие импорты expo-sharing)
import { Platform, Share } from "react-native";
import * as ExpoSharing from "expo-sharing";  // <= алиас, чтобы точно не конфликтовало


const w = Dimensions.get("window").width;
const fmt = (n: any) => Number(n ?? 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); };

export default function Reports() {
  const [start, setStart] = useState(monthAgo());
  const [end, setEnd] = useState(today());
  const [loading, setLoading] = useState(false);
  const [turnover, setTurnover] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  const [pipe, setPipe] = useState<any[]>([]);

  const run = useCallback(async () => {
    try {
      setLoading(true);
      const { data: t, error: e1 } = await supabase.rpc("list_report_stock_turnover", { p_start: start, p_end: end });
      if (e1) throw e1;
      const { data: c, error: e2 } = await supabase.rpc("list_report_costs_by_object", { p_start: start, p_end: end });
      if (e2) throw e2;
      const { data: a, error: e3 } = await supabase.rpc("list_report_ap_aging");
      if (e3) throw e3;
      const { data: p, error: e4 } = await supabase.rpc("list_report_purchase_pipeline", { p_start: start, p_end: end });
      if (e4) throw e4;

      setTurnover(t || []);
      setCosts(c || []);
      setAging(a || []);
      setPipe(p || []);
    } catch (e: any) {
      Alert.alert("Ошибка", e.message || "Не удалось сформировать отчёты");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => { run(); }, []);

  // ===== Экспорт CSV =====
  const exportCSV = async () => {
    try {
      let csv = `Отчёт;${start};${end}\n\n`;
      const add = (title: string, cols: string[], rows: any[][]) => {
        csv += title + "\n" + cols.join(";") + "\n";
        for (const r of rows) csv += r.map((x) => String(x)).join(";") + "\n";
        csv += "\n";
      };
      add("Обороты склада", ["Код", "Приход", "Расход", "Баланс"],
        turnover.map((x) => [x.rik_code, fmt(x.incoming), fmt(x.outgoing), fmt(x.balance)]));
      add("Затраты по объектам", ["Объект", "Статья", "Кол-во", "Сумма"],
        costs.map((x) => [x.object_id || "—", humanArticle(x.article), fmt(x.fact_qty), fmt(x.fact_amount)]));
      add("Долги по контрагентам", ["Контрагент", "Выставлено", "Оплачено", "Баланс"],
        aging.map((x) => [x.counterparty_id, fmt(x.total_billed), fmt(x.total_paid), fmt(x.balance)]));
      add("Воронка закупок", ["Статус", "Кол-во"], pipe.map((x) => [humanStatus(x.status), x.cnt]));

      const path = FileSystem.cacheDirectory + "reports.csv";
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
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

  // ===== Экспорт PDF =====
  const exportPDF = async () => {
    try {
      const html = `
      <html><head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; }
        h2 { margin: 0 0 12px; }
        h3 { margin: 18px 0 8px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f2f5f9; }
      </style>
      </head><body>
      <h2>Отчёт ${start} — ${end}</h2>
      ${htmlTable("Обороты склада", ["Код", "Приход", "Расход", "Баланс"],
        turnover.map((x) => [x.rik_code, fmt(x.incoming), fmt(x.outgoing), fmt(x.balance)]))}
      ${htmlTable("Затраты по объектам", ["Объект", "Статья", "Кол-во", "Сумма"],
        costs.map((x) => [x.object_id || "—", humanArticle(x.article), fmt(x.fact_qty), fmt(x.fact_amount)]))}
      ${htmlTable("Долги по контрагентам", ["Контрагент", "Выставлено", "Оплачено", "Баланс"],
        aging.map((x) => [x.counterparty_id, fmt(x.total_billed), fmt(x.total_paid), fmt(x.balance)]))}
      ${htmlTable("Воронка закупок", ["Статус", "Кол-во"],
        pipe.map((x) => [humanStatus(x.status), x.cnt]))}
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e: any) {
      Alert.alert("Ошибка PDF", e.message);
    }
  };

  const htmlTable = (title: string, cols: string[], rows: any[][]) => `
    <h3>${title}</h3>
    <table>
      <tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>
      ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
    </table>`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f8fafc" }} contentContainerStyle={{ padding: 12, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a" }}>Отчёты</Text>

      {/* Фильтры и экспорт */}
      <View style={card}>
        <Text style={{ fontWeight: "600", fontSize: 16 }}>Период</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput style={inp} value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" />
          <TextInput style={inp} value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" />
          <Pressable style={btnBlue} onPress={run}><Text style={{ color: "#fff", fontWeight: "700" }}>Сформировать</Text></Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={btnGray} onPress={exportCSV}><Text>📊 Экспорт CSV</Text></Pressable>
          <Pressable style={btnGray} onPress={exportPDF}><Text>📄 Экспорт PDF</Text></Pressable>
        </View>
      </View>

      {loading && <ActivityIndicator size="large" />}

      {/* 1. Обороты склада */}
      <ReportCard title="Обороты склада">
        <ChartTurnover data={turnover} />
        <Table
          columns={["Код", "Приход", "Расход", "Баланс"]}
          rows={turnover.map((x) => [x.rik_code, fmt(x.incoming), fmt(x.outgoing), fmt(x.balance)])}
        />
      </ReportCard>

      {/* 2. Затраты по объектам */}
      <ReportCard title="Затраты по объектам">
        <Table
          columns={["Объект", "Статья", "Кол-во", "Сумма"]}
          rows={costs.map((x) => [x.object_id || "—", humanArticle(x.article), fmt(x.fact_qty), fmt(x.fact_amount)])}
        />
      </ReportCard>

      {/* 3. Долги по контрагентам */}
      <ReportCard title="Долги по контрагентам">
        <Table
          columns={["Контрагент", "Выставлено", "Оплачено", "Баланс"]}
          rows={aging.map((x) => [x.counterparty_id, fmt(x.total_billed), fmt(x.total_paid), fmt(x.balance)])}
        />
      </ReportCard>

      {/* 4. Воронка закупок */}
      <ReportCard title="Воронка закупок">
        <ChartPie data={pipe} />
        <Table columns={["Статус", "Кол-во"]} rows={pipe.map((x) => [humanStatus(x.status), x.cnt])} />
      </ReportCard>
    </ScrollView>
  );
}

/** ===== Стили и мелкие компоненты ===== */
const card = { backgroundColor: "#fff", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", gap: 10 };
const inp = { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flex: 1, backgroundColor: "#fff" };
const btnBlue = { backgroundColor: "#0ea5e9", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 };
const btnGray = { backgroundColor: "#f1f5f9", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 };

function ReportCard({ title, children }: { title: string; children: any }) {
  return (
    <View style={{ backgroundColor: "#fff", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0", gap: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>{title}</Text>
      {children}
    </View>
  );
}

function Table({ columns, rows }: { columns: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <Text style={{ color: "#64748b" }}>Нет данных</Text>;
  return (
    <View style={{ borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8 }}>
      <View style={{ flexDirection: "row", backgroundColor: "#f1f5f9", padding: 8 }}>
        {columns.map((c, i) => <Text key={i} style={{ flex: 1, fontWeight: "700" }}>{c}</Text>)}
      </View>
      {rows.map((r, idx) => (
        <View key={idx} style={{ flexDirection: "row", padding: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" }}>
          {r.map((c, i) => <Text key={i} style={{ flex: 1 }}>{String(c)}</Text>)}
        </View>
      ))}
    </View>
  );
}

function humanArticle(a: string) {
  switch (a) {
    case "materials": return "Материалы";
    case "works":     return "Работы";
    case "transport": return "Транспорт";
    default:          return a || "—";
  }
}
function humanStatus(s: string) {
  const m: Record<string,string> = {
    draft: "Черновик", pending: "К приходу", partial: "Частично", confirmed: "Принято",
    approved: "Утверждено", "На утверждении": "На утверждении"
  };
  return m[s] || s || "—";
}

/** ===== Графики ===== */
function ChartTurnover({ data }: { data: any[] }) {
  if (!data.length) return null;
  return (
    <LineChart
      data={{ labels: data.map((x) => x.rik_code.slice(-4)), datasets: [{ data: data.map((x) => Number(x.balance || 0)) }] }}
      width={w - 48} height={180}
      chartConfig={{ backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff", decimalPlaces: 0,
        color: (o) => `rgba(14,165,233,${o.opacity})` }}
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
        legendFontSize: 12
      }))}
      width={w - 48} height={180}
      chartConfig={{ color: () => "#0ea5e9" }}
      accessor={"population"}
      backgroundColor={"transparent"}
      paddingLeft={"10"}
    />
  );
}
