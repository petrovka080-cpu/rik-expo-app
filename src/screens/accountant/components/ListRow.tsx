import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AccountantInboxRow } from "../../../lib/rik_api";
import { UI } from "../ui";
import { StatusBadge } from "../../../ui/StatusBadge";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import { mapAccountantListRowToProps } from "../presentation/accountantRowAdapters";

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
  const row = mapAccountantListRowToProps(item);
  const proposalId = String(item.proposal_id ?? "").trim();

  return (
    <Pressable
      onPress={onPress}
      testID={proposalId ? `accountant-proposal-row-${proposalId}` : undefined}
      style={({ pressed }) => ({
        backgroundColor: UI.cardBg,
        marginHorizontal: 12,
        marginVertical: 5,
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
            {row.supplier}
          </Text>

          <Text style={{ fontSize: 14, lineHeight: 20, color: UI.sub, fontWeight: "500" }} numberOfLines={1}>
            Счёт {row.invoiceNo} · {row.invoiceDate}
          </Text>

          {row.rest > 0 && (
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#FBBF24", marginTop: 8 }}>
              Остаток: {row.rest} {row.currency}
            </Text>
          )}
        </View>

        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: "600", color: UI.text }}>
            {row.sum.toLocaleString()}
          </Text>
          <StatusBadge label={row.statusLabel} tone={row.statusTone} compact />
          <ChevronIndicator />
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(ListRowInner);
