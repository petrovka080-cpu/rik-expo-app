import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { normalizeRuText } from "../../../lib/text/encoding";

type MaterialItem = {
  id: string;
  name: string;
  uom: string;
  issuedQty: number;
  alreadyUsed: number;
  qtyMax: number;
  qty: number;
  price: number | null;
  include: boolean;
};

type Props = {
  item: MaterialItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleInclude: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onPriceChange: (txt: string) => void;
};

export default function ActBuilderMaterialRow(props: Props) {
  const it = props.item;
  const sum = it.price == null ? null : Number(it.qty || 0) * Number(it.price || 0);
  const remaining = Math.max(0, Number(it.qtyMax || 0) - Number(it.qty || 0));
  const itemName = normalizeRuText(it.name || "");
  const uom = normalizeRuText(it.uom || "");

  return (
    <View
      style={{
        backgroundColor: it.include ? "#f0fdf4" : "#fff",
        borderWidth: 1,
        borderColor: it.include ? "#22c55e" : "#e2e8f0",
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <Pressable onPress={props.onToggleExpanded} style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontWeight: "700", color: "#0f172a", fontSize: 13 }} numberOfLines={2}>
            {itemName}
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b" }}>
            Выдано: {Number(it.issuedQty || 0).toLocaleString("ru-RU")} {uom || ""}  |  Списано:{" "}
            {Number(it.alreadyUsed || 0).toLocaleString("ru-RU")} {uom || ""}  |  Доступно:{" "}
            {Number(it.qtyMax || 0).toLocaleString("ru-RU")} {uom || ""}
          </Text>
          <Text style={{ fontSize: 12, color: "#334155" }}>
            Кол-во {Number(it.qty || 0).toLocaleString("ru-RU")} · Ед: {uom || "—"} · Цена {" "}
            {it.price == null ? "—" : Number(it.price).toLocaleString("ru-RU")} · Сумма{" "}
            {sum == null || sum === 0 ? "—" : Number(sum).toLocaleString("ru-RU")}
          </Text>
        </Pressable>
        <Pressable
          onPress={props.onToggleInclude}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: it.include ? "#16a34a" : "#e2e8f0",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
          <Text style={{ color: it.include ? "#fff" : "#334155", fontWeight: "800", fontSize: 12 }}>Вкл</Text>
        </Pressable>
      </View>

      {(props.expanded || it.include) && (
        <View style={{ marginTop: 4, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#64748b", fontSize: 11 }}>Кол-во</Text>
            <Pressable
              onPress={props.onDecrement}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0" }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>−</Text>
            </Pressable>
            <Text style={{ minWidth: 50, textAlign: "center", fontWeight: "800", color: "#0f172a", fontSize: 13 }}>
              {Number(it.qty || 0).toLocaleString("ru-RU")}
            </Text>
            <Pressable
              onPress={props.onIncrement}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e2e8f0" }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#0f172a" }}>+</Text>
            </Pressable>
            <Text style={{ color: "#64748b", fontSize: 11, marginLeft: 4 }}>Цена</Text>
            <TextInput
              value={it.price == null ? "" : String(it.price)}
              onChangeText={props.onPriceChange}
              keyboardType="numeric"
              placeholder="—"
              style={{ width: 84, height: 32, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 8, fontSize: 12, backgroundColor: "#fff" }}
            />
            <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "700", minWidth: 72, textAlign: "right" }}>
              {sum == null || sum === 0 ? "—" : Number(sum).toLocaleString("ru-RU")}
            </Text>
          </View>
          <Text style={{ color: "#64748b", fontSize: 11 }}>
            Остаток после акта: {remaining.toLocaleString("ru-RU")} {uom || ""}
          </Text>
        </View>
      )}
    </View>
  );
}
