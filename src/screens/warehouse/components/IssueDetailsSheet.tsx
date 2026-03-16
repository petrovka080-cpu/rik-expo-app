import React, { useMemo } from "react";
import { View, Text, FlatList, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import WarehouseSheet from "./WarehouseSheet";
import { UI } from "../warehouse.styles";
import IconSquareButton from "../../../ui/IconSquareButton";

type Props = {
  visible: boolean;
  issueId: number | null;
  loadingId: number | null;
  linesById: Record<string, IssueDetailsLine[]>;
  matNameByCode: Record<string, string>;
  onClose: () => void;
};

type IssueDetailsLine = {
  rik_code?: string | null;
  name_human?: string | null;
  item_name_ru?: string | null;
  uom?: string | null;
  uom_id?: string | null;
  qty_total?: number | string | null;
  qty_in_req?: number | string | null;
  qty_over?: number | string | null;
};

export default function IssueDetailsSheet({
  visible,
  issueId,
  loadingId,
  linesById,
  matNameByCode,
  onClose,
}: Props) {
  const key = issueId != null ? String(issueId) : "";
  const lines = issueId != null ? linesById[key] || [] : [];

  const title = useMemo(() => {
    return issueId != null ? `Детали выдачи ISSUE-${issueId}` : "Детали выдачи";
  }, [issueId]);

  const renderLine = React.useCallback(({ item: ln }: { item: IssueDetailsLine; index: number }) => {
    const code = String(ln.rik_code ?? "").trim();
    const name =
      String(ln.name_human ?? "").trim() ||
      String(ln.item_name_ru ?? "").trim() ||
      (code ? String(matNameByCode[code] ?? "").trim() : "") ||
      "Позиция";

    const uom = String(ln.uom ?? ln.uom_id ?? "—");

    return (
      <View
        style={{
          padding: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(255,255,255,0.04)",
          marginBottom: 10,
        }}
      >
        <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>
          {name}
        </Text>

        <Text style={{ marginTop: 4, color: UI.sub, fontWeight: "800" }} numberOfLines={2}>
          {uom}
        </Text>

        <Text style={{ marginTop: 6, color: UI.sub, fontWeight: "800" }} numberOfLines={2}>
          {`всего ${String(ln.qty_total ?? 0)} · по заявке ${String(
            ln.qty_in_req ?? 0,
          )} · перерасход ${String(ln.qty_over ?? 0)}`}
        </Text>
      </View>
    );
  }, [matNameByCode]);

  const keyExtractor = React.useCallback(
    (item: IssueDetailsLine, index: number) => `${String(item.rik_code ?? "").trim() || "x"}:${index}`,
    [],
  );

  const emptyState = React.useMemo(
    () => <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет строк.</Text>,
    [],
  );

  return (
    <WarehouseSheet visible={visible} onClose={onClose} heightPct={0.86}>
      <View style={{ flex: 1, minHeight: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Text style={{ flex: 1, color: UI.text, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
            {title}
          </Text>

          <IconSquareButton
            onPress={onClose}
            accessibilityLabel="Закрыть"
            width={46}
            height={46}
            radius={16}
            bg="rgba(255,255,255,0.06)"
            bgPressed="rgba(255,255,255,0.10)"
            bgDisabled="rgba(255,255,255,0.04)"
            spinnerColor={UI.text}
          >
            <Ionicons name="close" size={22} color={UI.text} />
          </IconSquareButton>
        </View>

        {issueId != null && loadingId === issueId ? (
          <Text style={{ color: UI.sub, fontWeight: "800" }}>Загрузка…</Text>
        ) : (
          <FlatList
            data={lines}
            renderItem={renderLine}
            keyExtractor={keyExtractor}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 28 }}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={12}
            windowSize={8}
            removeClippedSubviews={Platform.OS === "android"}
            ListEmptyComponent={emptyState}
          />
        )}
      </View>
    </WarehouseSheet>
  );
}
