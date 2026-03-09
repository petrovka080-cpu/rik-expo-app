import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatProposalBaseNo } from "../../../lib/format";
import { StatusBadge } from "../../../ui/StatusBadge";
import { RoleCard } from "../../../components/ui/RoleCard";
import type { IncomingRow } from "../warehouse.types";
import { s } from "../warehouse.styles";

type Props = {
  row: IncomingRow;
  onPress: (row: IncomingRow) => void;
  fmtRuDate: (iso?: string | null) => string;
  getIncomingHeadStats: (row: IncomingRow) => { recSum: number; leftSum: number };
  proposalNoByPurchase: Record<string, string | null | undefined>;
};

export default function IncomingRowItem({
  row,
  onPress,
  fmtRuDate,
  getIncomingHeadStats,
  proposalNoByPurchase,
}: Props) {
  const { recSum, leftSum } = getIncomingHeadStats(row);

  const prNo = formatProposalBaseNo(
    proposalNoByPurchase[row.purchase_id] || row.po_no,
    row.purchase_id,
  );

  const dateStr = fmtRuDate(row.purchase_created_at) || "—";

  return (
    <View style={s.listItemContainer}>
      <Pressable onPress={() => onPress(row)} style={({ pressed }) => [s.incomingItemPressable, pressed && { opacity: 0.8 }]}> 
        <RoleCard
          title={prNo}
          subtitle={dateStr}
          style={[s.groupHeader, { marginBottom: 0 }]}
          titleStyle={{ fontSize: 16 }}
          subtitleStyle={s.incomingItemDate}
          status={<StatusBadge label={`Принято ${recSum}`} tone="neutral" compact />}
          rightIndicator={
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <StatusBadge label={`Осталось ${leftSum}`} tone="info" compact />
              <Ionicons name="chevron-forward" size={18} color="rgba(248,250,252,0.5)" />
            </View>
          }
        />
      </Pressable>
    </View>
  );
}
