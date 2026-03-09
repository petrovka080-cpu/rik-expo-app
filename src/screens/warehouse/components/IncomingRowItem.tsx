import React from "react";
import { Pressable, View } from "react-native";
import { StatusBadge } from "../../../ui/StatusBadge";
import { RoleCard } from "../../../components/ui/RoleCard";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import type { IncomingRow } from "../warehouse.types";
import { s } from "../warehouse.styles";
import { mapWarehouseIncomingToCardProps } from "../presentation/warehouseRowAdapters";

type Props = {
  row: IncomingRow;
  onPress: (row: IncomingRow) => void;
  fmtRuDate: (iso?: string | null) => string;
  proposalNoByPurchase: Record<string, string | null | undefined>;
};

export default function IncomingRowItem({
  row,
  onPress,
  fmtRuDate,
  proposalNoByPurchase,
}: Props) {
  const card = mapWarehouseIncomingToCardProps({
    row,
    fmtRuDate,
    proposalNoByPurchase,
  });

  return (
    <View style={s.listItemContainer}>
      <Pressable onPress={() => onPress(row)} style={({ pressed }) => [s.incomingItemPressable, pressed && { opacity: 0.8 }]}> 
        <RoleCard
          title={card.title}
          subtitle={card.subtitle}
          style={[s.groupHeader, { marginBottom: 0 }]}
          titleStyle={{ fontSize: 16 }}
          subtitleStyle={s.incomingItemDate}
          status={<StatusBadge label={card.receivedLabel} tone="neutral" compact />}
          rightIndicator={
            <View style={{ alignItems: "flex-end", gap: 6 }}>
              <StatusBadge label={card.leftLabel} tone="info" compact />
              <ChevronIndicator />
            </View>
          }
        />
      </Pressable>
    </View>
  );
}
