import React from "react";
import { StatusBadge } from "../../../ui/StatusBadge";
import { RoleCard } from "../../../components/ui/RoleCard";
import type { IncomingRow } from "../warehouse.types";
import { s } from "../warehouse.styles";
import { mapWarehouseIncomingToCardProps } from "../presentation/warehouseRowAdapters";
import WarehouseCardShell from "./WarehouseCardShell";
import { renderWarehouseIncomingRightIndicator } from "./warehouse.card.parts";

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
    <WarehouseCardShell
      onPress={() => onPress(row)}
      containerStyle={s.listItemContainer}
      pressableStyle={s.incomingItemPressable}
      pressedOpacity={0.8}
    >
      <RoleCard
        title={card.title}
        subtitle={card.subtitle}
        style={[s.groupHeader, { marginBottom: 0 }]}
        titleStyle={{ fontSize: 16 }}
        subtitleStyle={s.incomingItemDate}
        status={<StatusBadge label={card.receivedLabel} tone="neutral" compact />}
        rightIndicator={renderWarehouseIncomingRightIndicator(card.leftLabel)}
      />
    </WarehouseCardShell>
  );
}
