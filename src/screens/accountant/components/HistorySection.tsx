import React, { memo, useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import TopRightActionBar from "../../../ui/TopRightActionBar";
import type { HistoryRow } from "../types";

type UiShape = {
  text: string;
  sub: string;
  cardBg: string;
};

type HistoryHeaderProps = {
  rows: HistoryRow[];
  dateFrom: string;
  dateTo: string;
  searchValue: string;
  setSearchValue: (v: string) => void;
  onOpenPeriod: () => void;
  onRefresh: () => void;
  ui: UiShape;
};

export const HistoryHeader = memo(function HistoryHeader({
  rows,
  dateFrom,
  dateTo,
  searchValue,
  setSearchValue,
  onOpenPeriod,
  onRefresh,
  ui,
}: HistoryHeaderProps) {
  const total = useMemo(() => (rows || []).reduce((s, r) => s + Number(r?.amount ?? 0), 0), [rows]);
  const cur = rows?.[0]?.invoice_currency ?? "KGS";
  const periodTitle =
    String(dateFrom || "").trim() || String(dateTo || "").trim()
      ? `${String(dateFrom || "—")} → ${String(dateTo || "—")}`
      : "Весь период";

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
      <TopRightActionBar
        titleLeft={periodTitle}
        actions={[
          { key: "period", icon: "calendar-outline", onPress: onOpenPeriod, ariaLabel: "Выбор периода" },
          { key: "refresh", icon: "refresh-outline", onPress: onRefresh, ariaLabel: "Обновить историю" },
        ]}
        ui={{ text: ui.text, sub: ui.sub, border: "rgba(255,255,255,0.14)", btnBg: "rgba(255,255,255,0.06)" }}
      />

      <View style={{ height: 8 }} />
      <TextInput
        placeholder="Поиск: поставщик / № счёта"
        placeholderTextColor={ui.sub}
        value={searchValue}
        onChangeText={setSearchValue}
        style={{
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          backgroundColor: "rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: 10,
          color: ui.text,
          fontWeight: "700",
        }}
      />

      <View style={{ height: 8 }} />
      <View style={{ paddingBottom: 4 }}>
        <Text style={{ color: ui.sub, fontWeight: "700" }}>
          Найдено: <Text style={{ fontWeight: "900", color: ui.text }}>{rows.length}</Text>
          {"  "}• Сумма: <Text style={{ fontWeight: "900", color: ui.text }}>{total.toFixed(2)} {cur}</Text>
        </Text>
      </View>
    </View>
  );
});

type HistoryRowCardProps = {
  item: HistoryRow;
  onOpen: (item: HistoryRow) => void;
  ui: UiShape;
};

export const HistoryRowCard = memo(function HistoryRowCard({ item, onOpen, ui }: HistoryRowCardProps) {
  return (
    <Pressable
      onPress={() => void onOpen(item)}
      style={{
        backgroundColor: ui.cardBg,
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 18,
        borderWidth: 1.25,
        borderColor: "rgba(255,255,255,0.16)",
        padding: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 18,
        elevation: 6,
      }}
    >
      <Text style={{ fontWeight: "900", color: ui.text }} numberOfLines={1}>
        {item.supplier || "—"}
      </Text>

      <Text style={{ color: ui.sub, marginTop: 6, fontWeight: "700" }} numberOfLines={2}>
        Счёт: <Text style={{ color: ui.text, fontWeight: "900" }}>{item.invoice_number || "без №"}</Text>
        {` • ${String(item.purpose || item.note || "—").trim()}`}
      </Text>

      <Text style={{ color: ui.sub, marginTop: 6, fontWeight: "700" }} numberOfLines={1}>
        Бухгалтер: <Text style={{ color: ui.text, fontWeight: "900" }}>{String(item.accountant_fio || "—").trim()}</Text>
      </Text>
    </Pressable>
  );
});
