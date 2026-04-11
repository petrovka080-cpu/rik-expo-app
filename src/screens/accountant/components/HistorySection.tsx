import React, { memo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import TopRightActionBar from "../../../ui/TopRightActionBar";
import type { HistoryRow } from "../types";
import { mapAccountantHistoryRowToProps } from "../presentation/accountantRowAdapters";

type UiShape = {
  text: string;
  sub: string;
  cardBg: string;
};

type HistoryHeaderProps = {
  totalCount: number;
  totalAmount: number;
  totalCurrency: string;
  dateFrom: string;
  dateTo: string;
  searchValue: string;
  setSearchValue: (v: string) => void;
  onOpenPeriod: () => void;
  onRefresh: () => void;
  ui: UiShape;
};

export const HistoryHeader = memo(function HistoryHeader({
  totalCount,
  totalAmount,
  totalCurrency,
  dateFrom,
  dateTo,
  searchValue,
  setSearchValue,
  onOpenPeriod,
  onRefresh,
  ui,
}: HistoryHeaderProps) {
  const periodTitle =
    String(dateFrom || "").trim() || String(dateTo || "").trim()
      ? `${String(dateFrom || "—")} -> ${String(dateTo || "—")}`
      : "Весь период";

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}>
      <TopRightActionBar
        titleLeft={periodTitle}
        actions={[
          { key: "period", icon: "calendar-outline", onPress: onOpenPeriod, ariaLabel: "Выбор периода" },
          { key: "refresh", icon: "refresh-outline", onPress: onRefresh, ariaLabel: "Обновить историю" },
        ]}
        ui={{ text: ui.text, sub: ui.sub, border: "rgba(255,255,255,0.14)", btnBg: "rgba(255,255,255,0.06)" }}
      />

      <View style={{ height: 10 }} />
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
          fontWeight: "500",
        }}
      />

      <View style={{ height: 10 }} />
      <View style={{ paddingBottom: 4 }}>
        <Text style={{ color: ui.sub, fontWeight: "500" }}>
          Найдено: <Text style={{ fontWeight: "600", color: ui.text }}>{totalCount}</Text>
          {"  "}• Сумма: <Text style={{ fontWeight: "600", color: ui.text }}>{totalAmount.toFixed(2)} {totalCurrency}</Text>
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
  const row = mapAccountantHistoryRowToProps(item);

  return (
    <Pressable
      onPress={() => void onOpen(item)}
      style={({ pressed }) => ({
        backgroundColor: ui.cardBg,
        marginHorizontal: 12,
        marginVertical: 5,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        paddingHorizontal: 14,
        paddingVertical: 12,
        transform: [{ scale: pressed ? 0.997 : 1 }],
        opacity: pressed ? 0.94 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: "600", color: ui.text, marginBottom: 4 }} numberOfLines={1}>
            {row.supplier}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: ui.sub, fontWeight: "500" }} numberOfLines={1}>
            {row.date} · Счёт {row.invoiceNo}
          </Text>
          {!!row.purpose && (
            <Text style={{ fontSize: 12, lineHeight: 16, color: ui.sub, marginTop: 4 }} numberOfLines={1}>
              {row.purpose}
            </Text>
          )}
          {!!row.fio && (
            <Text style={{ fontSize: 11, lineHeight: 16, color: "rgba(255,255,255,0.48)", marginTop: 6, fontWeight: "500" }}>
              Бухгалтер: {row.fio}
            </Text>
          )}
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: "600", color: "#86EFAC" }}>
            {row.amount.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 10, color: ui.sub, fontWeight: "600", marginTop: 2 }}>
            {row.currency}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});
