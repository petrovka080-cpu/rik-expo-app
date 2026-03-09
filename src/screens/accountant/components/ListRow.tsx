import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AccountantInboxRow } from "../../../lib/rik_api";
import { UI } from "../ui";
import { statusFromRaw } from "../helpers";
import { normalizeRuText } from "../../../lib/text/encoding";
import { StatusBadge } from "../../../ui/StatusBadge";
import ChevronIndicator from "../../../ui/ChevronIndicator";

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
  const isPaidFull = rest === 0 && st.key === "PAID";
  const supplier = normalizeRuText(String(item.supplier || "—"));
  const invoiceNo = normalizeRuText(String(item.invoice_number || "без №"));
  const invoiceDate = normalizeRuText(String(item.invoice_date || "—"));
  const toneByStatus = {
    PAID: "success",
    PART: "warning",
    REWORK: "danger",
    K_PAY: "info",
    HISTORY: "neutral",
  } as const;
  const tone = toneByStatus[st.key] ?? "neutral";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: UI.cardBg,
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        paddingHorizontal: 16,
        paddingVertical: 14,
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
          <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: "600", color: UI.text, marginBottom: 4 }} numberOfLines={1}>
            {supplier}
          </Text>

          <Text style={{ fontSize: 14, lineHeight: 20, color: UI.sub, fontWeight: "500" }} numberOfLines={1}>
            Счёт {invoiceNo} · {invoiceDate}
          </Text>

          {rest > 0 && (
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#FCD34D", marginTop: 8 }}>
              Остаток: {rest} {item.invoice_currency || "KGS"}
            </Text>
          )}
        </View>

        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: "600", color: UI.text }}>
            {sum.toLocaleString()}
          </Text>
          <StatusBadge label={st.label} tone={tone} compact />
          <ChevronIndicator />
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(ListRowInner);
