import React from "react";
import { StyleSheet } from "react-native";
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
  syncStatusText?: string | null;
};

function IncomingRowItem({
  row,
  onPress,
  fmtRuDate,
  syncStatusText,
}: Props) {
  const card = mapWarehouseIncomingToCardProps({
    row,
    fmtRuDate,
  });
  const subtitle = syncStatusText ? `${card.subtitle} • ${syncStatusText}` : card.subtitle;

  return (
    <WarehouseCardShell
      onPress={() => onPress(row)}
      containerStyle={s.listItemContainer}
      pressableStyle={s.incomingItemPressable}
      pressedOpacity={0.8}
      testID={`warehouse-incoming-row-${String(row.incoming_id ?? "")}`}
      accessibilityLabel={`warehouse-incoming-row-${String(row.incoming_id ?? "")}`}
    >
      <RoleCard
        title={card.title}
        subtitle={subtitle}
        style={[s.groupHeader, localStyles.card]}
        titleStyle={localStyles.cardTitle}
        subtitleStyle={s.incomingItemDate}
        status={<StatusBadge label={card.receivedLabel} tone="neutral" compact />}
        rightIndicator={renderWarehouseIncomingRightIndicator(card.leftLabel)}
      />
    </WarehouseCardShell>
  );
}

export default React.memo(IncomingRowItem);

const localStyles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 16,
  },
});
