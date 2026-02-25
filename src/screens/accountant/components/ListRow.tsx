import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AccountantInboxRow } from "../../../lib/rik_api";
import { UI } from "../ui";
import { statusFromRaw, statusColors } from "../helpers";
import Chip from "./Chip";

function ListRowInner({
  item,
  onPress,
}: {
  item: AccountantInboxRow;
  onPress: () => void;
}) {
  const total = Number((item as any).total_paid ?? 0);
  const sum = Number((item as any).invoice_amount ?? 0);
  const rest = sum > 0 ? Math.max(0, sum - total) : 0;

  const st = statusFromRaw((item as any).payment_status, false);
  const sc = statusColors(st.key);
  const isPaidFull = rest === 0 && st.key === "PAID";

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: UI.cardBg,
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "900", color: UI.text }} numberOfLines={1}>
            {(item as any).supplier || "—"} • {(item as any).invoice_number || "без №"} (
            {(item as any).invoice_date || "—"})
          </Text>
        </View>

        <Chip label={st.label} bg={sc.bg} fg={sc.fg} />
      </View>

      <View style={{ height: 6 }} />

      <Text style={{ color: UI.sub, fontWeight: "700" }}>
        Счёт:{" "}
        <Text style={{ fontWeight: "900", color: UI.text }}>
          {(sum || 0) + " " + ((item as any).invoice_currency || "KGS")}
        </Text>
        {" • Оплачено: "}
        <Text style={{ fontWeight: "900", color: UI.text }}>{total}</Text>
        {" • "}
        <Text style={{ fontWeight: "900", color: isPaidFull ? "#86EFAC" : "#FDE68A" }}>
          {"Остаток: " + rest}
        </Text>
      </Text>
    </Pressable>
  );
}

export default React.memo(ListRowInner);
