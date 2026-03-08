import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AccountantInboxRow } from "../../../lib/rik_api";
import { UI } from "../ui";
import { statusFromRaw, statusColors } from "../helpers";
import Chip from "./Chip";
import { normalizeRuText } from "../../../lib/text/encoding";

type ListRowItem = AccountantInboxRow & {
  total_paid?: number | null;
  invoice_amount?: number | null;
  payment_status?: string | null;
  supplier?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  invoice_currency?: string | null;
};

function ListRowInner({
  item,
  onPress,
}: {
  item: ListRowItem;
  onPress: () => void;
}) {
  const total = Number(item.total_paid ?? 0);
  const sum = Number(item.invoice_amount ?? 0);
  const rest = sum > 0 ? Math.max(0, sum - total) : 0;

  const st = statusFromRaw(item.payment_status, false);
  const sc = statusColors(st.key);
  const isPaidFull = rest === 0 && st.key === "PAID";
  const supplier = normalizeRuText(String(item.supplier || "—"));
  const invoiceNo = normalizeRuText(String(item.invoice_number || "без №"));
  const invoiceDate = normalizeRuText(String(item.invoice_date || "—"));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: UI.cardBg,
        marginHorizontal: 12,
        marginVertical: 4,
        borderRadius: 18,
        borderWidth: 1.25,
        borderColor: "rgba(255,255,255,0.14)",
        padding: 14,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        opacity: pressed ? 0.9 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: "900", color: UI.text, marginBottom: 4 }} numberOfLines={1}>
            {supplier}
          </Text>

          <Text style={{ fontSize: 12, color: UI.sub, fontWeight: "700" }} numberOfLines={1}>
            Счёт {invoiceNo} · {invoiceDate}
          </Text>

          {rest > 0 && (
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#FDE68A", marginTop: 6 }}>
              Остаток: {rest} {item.invoice_currency || "KGS"}
            </Text>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: "900", color: UI.text }}>
            {sum.toLocaleString()}
          </Text>
          <Chip label={st.label} bg={sc.bg} fg={sc.fg} />
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(ListRowInner);
