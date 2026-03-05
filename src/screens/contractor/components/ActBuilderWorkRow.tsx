import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { normalizeRuText } from "../../../lib/text/encoding";

type WorkItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number | null;
  approvedQty?: number | null;
  approvedUnit?: string | null;
  approvedPrice?: number | null;
  include: boolean;
};

type Props = {
  item: WorkItem;
  expanded: boolean;
  resolvedObjectName: string;
  onToggleExpanded: () => void;
  onToggleInclude: () => void;
  onQtyChange: (txt: string) => void;
  onUnitChange: (txt: string) => void;
  onPriceChange: (txt: string) => void;
};

export default function ActBuilderWorkRow(props: Props) {
  const w = props.item;
  const sum = Number(w.qty || 0) * Number(w.price || 0);
  const workName = normalizeRuText(w.name || "");
  const unit = normalizeRuText(w.unit || "");
  const objectName = normalizeRuText(props.resolvedObjectName || "");
  const approvedUnit = normalizeRuText(w.approvedUnit || "");

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: w.include ? "#22c55e" : "#e2e8f0",
        borderRadius: 12,
        backgroundColor: w.include ? "#f0fdf4" : "#fff",
        padding: 10,
        marginBottom: 8,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <Pressable onPress={props.onToggleExpanded} style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 13, color: "#0f172a", fontWeight: "700" }} numberOfLines={2}>
            {workName}
          </Text>
          <Text style={{ fontSize: 11, color: "#64748b" }} numberOfLines={1}>
            {objectName || "Объект не указан"}
          </Text>
          <Text style={{ fontSize: 12, color: "#334155" }}>
            Кол-во: {Number(w.qty || 0).toLocaleString("ru-RU")} • Ед: {unit || "—"} • Цена: {w.price == null ? "—" : Number(w.price).toLocaleString("ru-RU")} • Сумма: {sum > 0 ? sum.toLocaleString("ru-RU") : "0"}
          </Text>
          {(w.approvedQty != null || w.approvedPrice != null || w.approvedUnit) && (
            <Text style={{ fontSize: 11, color: "#64748b" }}>
              Утверждено: {w.approvedQty == null ? "—" : Number(w.approvedQty).toLocaleString("ru-RU")} {approvedUnit || unit || "—"} • Цена: {w.approvedPrice == null ? "—" : Number(w.approvedPrice).toLocaleString("ru-RU")}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={props.onToggleInclude}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: w.include ? "#16a34a" : "#e2e8f0",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}
        >
          <Text style={{ color: w.include ? "#fff" : "#334155", fontWeight: "800", fontSize: 12 }}>Вкл</Text>
        </Pressable>
      </View>

      {(props.expanded || w.include) && (
        <View style={{ gap: 8, paddingTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#64748b", fontSize: 11 }}>Кол-во</Text>
            <TextInput
              value={String(w.qty ?? 0)}
              keyboardType="numeric"
              onChangeText={props.onQtyChange}
              style={{ flex: 1, height: 32, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 8, fontSize: 12, color: "#334155", backgroundColor: "#fff" }}
            />
            <Text style={{ color: "#64748b", fontSize: 11 }}>Ед</Text>
            <TextInput
              value={unit || ""}
              onChangeText={props.onUnitChange}
              style={{ width: 76, height: 32, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 8, fontSize: 12, color: "#334155", backgroundColor: "#fff" }}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: "#64748b", fontSize: 11 }}>Цена</Text>
            <TextInput
              value={w.price == null ? "" : String(w.price)}
              keyboardType="numeric"
              onChangeText={props.onPriceChange}
              style={{ flex: 1, height: 32, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, paddingHorizontal: 8, fontSize: 12, color: "#334155", backgroundColor: "#fff" }}
            />
            <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "700", minWidth: 88, textAlign: "right" }}>
              {sum > 0 ? sum.toLocaleString("ru-RU") : "0"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
