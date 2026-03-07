import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatProposalBaseNo } from "../../../lib/format";
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
      <Pressable
        onPress={() => onPress(row)}
        style={({ pressed }) => [
          s.groupHeader,
          s.incomingItemPressable,
          pressed && { opacity: 0.8, backgroundColor: "rgba(255,255,255,0.08)" },
        ]}
      >
        <View style={s.listItemFlex}>
          <View style={s.incomingItemRow1}>
            <Text style={[s.groupTitle, { fontSize: 16 }]} numberOfLines={1}>
              {prNo}
            </Text>
            <Text style={s.incomingItemDate}>{dateStr}</Text>
          </View>

          <View style={s.incomingItemRow2}>
            <Text style={s.incomingItemRecText}>Принято {recSum}</Text>
            <Text style={s.incomingItemLeftText}>Осталось {leftSum}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

