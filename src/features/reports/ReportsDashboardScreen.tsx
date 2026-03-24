import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { LineChart, PieChart } from "react-native-chart-kit";
import { parseErr } from "../../lib/api/_core";
import { getFileSystemPaths } from "../../lib/fileSystemPaths";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { buildReportsExportPdfModel } from "../../lib/pdf/pdf.builder";
import {
  buildGeneratedPdfDescriptor,
  prepareAndPreviewGeneratedPdf,
  renderPdfHtmlToUri,
} from "../../lib/pdf/pdf.runner";
import { renderReportsExportPdfHtml } from "../../lib/pdf/pdf.template";
import { supabase } from "../../lib/supabaseClient";

const FileSystemCompat = FileSystem as any;
const w = Dimensions.get("window").width;
const fmt = (n: any) => Number(n ?? 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
};
const asRows = (value: unknown): any[] => (Array.isArray(value) ? value : []);
const runReportRpc = async <T = unknown>(fn: string, args?: Record<string, unknown>) =>
  (await supabase.rpc(fn as never, (args ?? {}) as never)) as { data: T | null; error: unknown };

type ReportRow = (string | number)[];
type ReportSection = {
  key: string;
  title: string;
  columns: string[];
  data: ReportRow[];
  chart?: "turnover" | "pipe" | null;
};

export default function ReportsDashboardScreen() {
  const router = useRouter();
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
      const [tRes, cRes, aRes, pRes] = await Promise.all([
        runReportRpc<any[]>("list_report_stock_turnover", { p_start: start, p_end: end }),
        runReportRpc<any[]>("list_report_costs_by_object", { p_start: start, p_end: end }),
        runReportRpc<any[]>("list_report_ap_aging"),
        runReportRpc<any[]>("list_report_purchase_pipeline", { p_start: start, p_end: end }),
      ]);
      if (tRes.error) throw tRes.error;
      if (cRes.error) throw cRes.error;
      if (aRes.error) throw aRes.error;
      if (pRes.error) throw pRes.error;

      setTurnover(asRows(tRes.data));
      setCosts(asRows(cRes.data));
      setAging(asRows(aRes.data));
      setPipe(asRows(pRes.data));
    } catch (e: unknown) {
      Alert.alert("Не удалось сформировать отчёты", parseErr(e) || "Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }, [end, start]);

  useEffect(() => {
    run();
  }, [run]);

  const exportCSV = async () => {
    try {
      let csv = `Отчёт;${start};${end}\n\n`;
      const add = (title: string, cols: string[], rows: any[][]) => {
        csv += `${title}\n${cols.join(";")}\n`;
        for (const row of rows) csv += `${row.map((cell) => String(cell)).join(";")}\n`;
        csv += "\n";
      };

      add(
        "Обороты склада",
        ["Код", "Приход", "Расход", "Баланс"],
        turnover.map((x) => [x.rik_code, fmt(x.incoming), fmt(x.outgoing), fmt(x.balance)]),
      );
      add(
        "Затраты по объектам",
        ["Объект", "Статья", "Кол-во", "Сумма"],
        costs.map((x) => [x.object_id || "—", humanArticle(x.article), fmt(x.fact_qty), fmt(x.fact_amount)]),
      );
      add(
        "Долги по контрагентам",
        ["Контрагент", "Выставлено", "Оплачено", "Баланс"],
        aging.map((x) => [x.counterparty_id, fmt(x.total_billed), fmt(x.total_paid), fmt(x.balance)]),
      );
      add(
        "Воронка закупок",
        ["Статус", "Кол-во"],
        pipe.map((x) => [humanStatus(x.status), x.cnt]),
      );

      const { cacheDir } = getFileSystemPaths();
      const path = `${cacheDir}reports.csv`;
      await FileSystemCompat.writeAsStringAsync(path, csv, { encoding: "utf8" });
      await Sharing.shareAsync(path);
    } catch (e: any) {
      Alert.alert("Не удалось экспортировать CSV", e.message);
    }
  };

  const exportPDF = async () => {
    try {
      const title = `Отчёт ${start} - ${end}`;
      const model = buildReportsExportPdfModel({
        title,
        sections: [
          {
            title: "Обороты склада",
            columns: ["Код", "Приход", "Расход", "Баланс"],
            rows: turnover.map((x) => [x.rik_code, fmt(x.incoming), fmt(x.outgoing), fmt(x.balance)]),
          },
          {
            title: "Затраты по объектам",
            columns: ["Объект", "Статья", "Кол-во", "Сумма"],
            rows: costs.map((x) => [x.object_id || "—", humanArticle(x.article), fmt(x.fact_qty), fmt(x.fact_amount)]),
          },
          {
            title: "Долги по контрагентам",
            columns: ["Контрагент", "Выставлено", "Оплачено", "Баланс"],
            rows: aging.map((x) => [x.counterparty_id, fmt(x.total_billed), fmt(x.total_paid), fmt(x.balance)]),
          },
          {
            title: "Воронка закупок",
            columns: ["Статус", "Кол-во"],
            rows: pipe.map((x) => [humanStatus(x.status), x.cnt]),
          },
        ],
      });
      const descriptor = await buildGeneratedPdfDescriptor({
        getUri: () =>
          renderPdfHtmlToUri({
            html: renderReportsExportPdfHtml(model),
            documentType: "report_export",
            source: "reports_export",
          }),
        title,
        fileName: buildPdfFileName({
          documentType: "report_export",
          title: "reports_export",
          dateIso: end || start || undefined,
        }),
        documentType: "report_export",
        originModule: "reports",
      });
      await prepareAndPreviewGeneratedPdf({
        supabase,
        key: `pdf:reports:${start}:${end}`,
        label: "Открываю PDF…",
        descriptor,
        router,
      });
    } catch (e: any) {
      Alert.alert("Не удалось подготовить PDF", e.message);
    }
  };

  const sections = React.useMemo<ReportSection[]>(
    () => [
      {
        key: "turnover",
        title: "Обороты склада",
        columns: ["Код", "Приход", "Расход", "Баланс"],
        data: turnover.map((x) => [x.rik_code, fmt(x.incoming), fmt(x.outgoing), fmt(x.balance)]),
        chart: "turnover",
      },
      {
        key: "costs",
        title: "Затраты по объектам",
        columns: ["Объект", "Статья", "Кол-во", "Сумма"],
        data: costs.map((x) => [x.object_id || "—", humanArticle(x.article), fmt(x.fact_qty), fmt(x.fact_amount)]),
        chart: null,
      },
      {
        key: "aging",
        title: "Долги по контрагентам",
        columns: ["Контрагент", "Выставлено", "Оплачено", "Баланс"],
        data: aging.map((x) => [x.counterparty_id, fmt(x.total_billed), fmt(x.total_paid), fmt(x.balance)]),
        chart: null,
      },
      {
        key: "pipe",
        title: "Воронка закупок",
        columns: ["Статус", "Кол-во"],
        data: pipe.map((x) => [humanStatus(x.status), x.cnt]),
        chart: "pipe",
      },
    ],
    [aging, costs, pipe, turnover],
  );

  const renderSectionHeader = React.useCallback(
    ({ section }: { section: ReportSection }) => (
      <View style={{ marginBottom: 0 }}>
        <View style={reportCardShell}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>{section.title}</Text>
          {section.chart === "turnover" ? <ChartTurnover data={turnover} /> : null}
          {section.chart === "pipe" ? <ChartPie data={pipe} /> : null}
        </View>
        <View style={tableHeaderWrap}>
          {section.columns.map((column, index) => (
            <Text key={`${section.key}:col:${index}`} style={{ flex: 1, fontWeight: "700" }}>
              {column}
            </Text>
          ))}
        </View>
      </View>
    ),
    [pipe, turnover],
  );

  const renderSectionItem = React.useCallback(
    ({ item, section }: { item: ReportRow; section: ReportSection }) => (
      <View style={tableRow}>
        {item.map((cell, index) => (
          <Text key={`${section.key}:cell:${index}`} style={{ flex: 1 }}>
            {String(cell)}
          </Text>
        ))}
      </View>
    ),
    [],
  );

  const renderSectionFooter = React.useCallback(({ section }: { section: ReportSection }) => {
    if (!section.data.length) {
      return (
        <View style={tableFooterEmpty}>
          <Text style={{ color: "#64748b" }}>Нет данных</Text>
        </View>
      );
    }
    return <View style={tableFooterCap} />;
  }, []);

  const filtersBlock = (
    <View style={card}>
      <Text style={{ fontWeight: "600", fontSize: 16 }}>Период</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput style={inp} value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" />
        <TextInput style={inp} value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" />
        <Pressable style={btnBlue} onPress={run}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Сформировать</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable style={btnGray} onPress={exportCSV}>
          <Text>Экспорт CSV</Text>
        </Pressable>
        <Pressable style={btnGray} onPress={exportPDF}>
          <Text>Экспорт PDF</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item, index) => `${index}:${String(item[0] ?? "")}`}
      renderSectionHeader={renderSectionHeader}
      renderItem={renderSectionItem}
      renderSectionFooter={renderSectionFooter}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews
      style={{ flex: 1, backgroundColor: "#f8fafc" }}
      contentContainerStyle={{ padding: 12, gap: 16, paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={{ gap: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#0f172a" }}>Отчёты</Text>
          {filtersBlock}
          {loading ? <ActivityIndicator size="large" /> : null}
        </View>
      }
    />
  );
}

const card = {
  backgroundColor: "#fff",
  padding: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  gap: 10,
};
const inp = {
  borderWidth: 1,
  borderColor: "#e2e8f0",
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
  flex: 1,
  backgroundColor: "#fff",
};
const btnBlue = { backgroundColor: "#0ea5e9", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 };
const btnGray = { backgroundColor: "#f1f5f9", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 };
const reportCardShell = {
  backgroundColor: "#fff",
  padding: 12,
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
  borderWidth: 1,
  borderBottomWidth: 0,
  borderColor: "#e2e8f0",
  gap: 8,
};
const tableHeaderWrap = {
  flexDirection: "row" as const,
  backgroundColor: "#f1f5f9",
  padding: 8,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderTopWidth: 1,
  borderColor: "#e2e8f0",
};
const tableRow = {
  flexDirection: "row" as const,
  padding: 8,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderTopWidth: 1,
  borderColor: "#e2e8f0",
  backgroundColor: "#fff",
};
const tableFooterCap = {
  height: 0,
  marginBottom: 16,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderBottomWidth: 1,
  borderBottomLeftRadius: 10,
  borderBottomRightRadius: 10,
  borderColor: "#e2e8f0",
  backgroundColor: "#fff",
};
const tableFooterEmpty = {
  padding: 12,
  marginBottom: 16,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderBottomWidth: 1,
  borderTopWidth: 1,
  borderBottomLeftRadius: 10,
  borderBottomRightRadius: 10,
  borderColor: "#e2e8f0",
  backgroundColor: "#fff",
};

function humanArticle(article: string) {
  switch (article) {
    case "materials":
      return "Материалы";
    case "works":
      return "Работы";
    case "transport":
      return "Транспорт";
    default:
      return article || "—";
  }
}

function humanStatus(status: string) {
  const map: Record<string, string> = {
    draft: "Черновик",
    pending: "В обработке",
    partial: "Частично",
    confirmed: "Принято",
    approved: "Утверждено",
    "На утверждении": "На утверждении",
  };
  return map[status] || status || "—";
}

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
        backgroundColor: "#fff",
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
