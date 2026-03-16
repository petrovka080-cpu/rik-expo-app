import React, { useMemo } from "react";
import { View, Text, FlatList, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import WarehouseSheet from "./WarehouseSheet";
import { UI } from "../warehouse.styles";
import IconSquareButton from "../../../ui/IconSquareButton";
import SectionBlock from "../../../ui/SectionBlock";

type Props = {
  visible: boolean;
  incomingId: string | null;
  loadingId: string | null;
  linesById: Record<string, IncomingDetailsLine[]>;
  matNameByCode: Record<string, string>;
  onClose: () => void;
};

type IncomingDetailsLine = {
  rik_code?: string | null;
  name_ru?: string | null;
  name?: string | null;
  item_name_ru?: string | null;
  material_name?: string | null;
  uom?: string | null;
  uom_id?: string | null;
  qty_received?: number | string | null;
  qty?: number | string | null;
};

export default function IncomingDetailsSheet({
  visible,
  incomingId,
  loadingId,
  linesById,
  matNameByCode,
  onClose,
}: Props) {
  const key = incomingId || "";
  const lines = incomingId ? linesById[key] || [] : [];

  const title = useMemo(() => {
    return incomingId ? `Детали прихода ${incomingId}` : "Детали прихода";
  }, [incomingId]);

  const renderLine = React.useCallback(({ item: ln }: { item: IncomingDetailsLine; index: number }) => {
    const code = String(ln.rik_code || "").trim();
    const name =
      String(ln.name_ru || "").trim() ||
      String(ln.name || "").trim() ||
      String(ln.item_name_ru || "").trim() ||
      String(ln.material_name || "").trim() ||
      (code ? String(matNameByCode[code] || "").trim() : "") ||
      "Позиция";

    const uom = String(ln.uom || ln.uom_id || "—");
    const qty = Number(ln.qty_received || ln.qty || 0);

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

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <Text style={{ color: UI.sub, fontWeight: "800" }}>{uom}</Text>
          <Text style={{ color: UI.accent, fontWeight: "900", fontSize: 16 }}>{String(qty)}</Text>
        </View>
      </View>
    );
  }, [matNameByCode]);

  const keyExtractor = React.useCallback(
    (item: IncomingDetailsLine, index: number) => `${String(item.rik_code || "").trim() || "x"}:${index}`,
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

        {incomingId != null && loadingId === incomingId ? (
          <SectionBlock style={{ marginBottom: 0 }} contentStyle={{ gap: 0 }}>
            <Text style={{ color: UI.sub, fontWeight: "800" }}>Загрузка…</Text>
          </SectionBlock>
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
