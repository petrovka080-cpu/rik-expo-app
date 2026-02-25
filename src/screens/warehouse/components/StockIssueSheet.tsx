import React from "react";
import { View, Text, Pressable, TextInput, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import WarehouseSheet from "./WarehouseSheet";
import { UI, s } from "../warehouse.styles";
import IconSquareButton from "../../../ui/IconSquareButton";

export type StockIssuePick = {
  code: string;
  name: string;
  uom_id: string | null;
  qty_available: number;
} | null;

type Props = {
  visible: boolean;
  item: StockIssuePick;

  qty: string;
  setQty: (v: string) => void;

  busy: boolean;

  onAdd: () => void;
  onClose: () => void;
};

export default function StockIssueSheet({
  visible,
  item,
  qty,
  setQty,
  busy,
  onAdd,
  onClose,
}: Props) {
  return (
    <WarehouseSheet visible={visible} onClose={onClose} heightPct={0.55}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Text style={{ flex: 1, color: UI.text, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
          {item?.name || "Материал"}
        </Text>

        {/* ✅ иконка вместо "Закрыть" */}
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

      <Text style={{ color: UI.sub, fontWeight: "800" }}>
        {`${item?.code ?? ""} · ${item?.uom_id ?? "—"}`}
      </Text>
      <Text style={{ marginTop: 6, color: UI.sub, fontWeight: "800" }}>
        Доступно на складе: {String(item?.qty_available ?? 0)}
      </Text>

      <View style={{ marginTop: 12 }}>
        <TextInput
          value={qty}
          onChangeText={(t) => setQty(String(t ?? "").replace(",", ".").replace(/\s+/g, ""))}
          keyboardType={Platform.OS === "web" ? "default" : "numeric"}
          placeholder="Количество"
          placeholderTextColor={UI.sub}
          style={s.input}
        />
      </View>

      <View style={{ marginTop: 14, flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
        <Pressable
          onPress={onAdd}
          disabled={busy}
          style={[s.openBtn, { borderColor: UI.accent, opacity: busy ? 0.6 : 1 }]}
        >
          <Text style={s.openBtnText}>{busy ? "..." : "Добавить"}</Text>
        </Pressable>
      </View>
    </WarehouseSheet>
  );
}
