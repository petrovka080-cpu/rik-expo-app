import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReqHeadRow } from "../warehouse.types";
import { s } from "../warehouse.styles";
import { RoleCard } from "../../../components/ui/RoleCard";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import { mapWarehouseReqHeadToCardProps } from "../presentation/warehouseRowAdapters";

type Props = {
  row: ReqHeadRow;
  onPress: (row: ReqHeadRow) => void;
  fmtRuDate: (iso?: string | null) => string;
};

function HeaderMetric({
  issued,
  total,
  color,
}: {
  issued: string;
  total: string;
  color: string;
}) {
  return (
    <Text style={localStyles.metricValue}>
      <Text style={{ color }}>{issued}</Text>
      <Text style={localStyles.metricTotal}>{` / ${total}`}</Text>
    </Text>
  );
}

function ReqHeadRowItem({ row, onPress, fmtRuDate }: Props) {
  const card = mapWarehouseReqHeadToCardProps({ row, fmtRuDate });

  return (
    <View style={s.listItemContainer}>
      <Pressable
        testID={`warehouse-req-row-${String(row.request_id ?? "")}`}
        accessibilityLabel={`warehouse-req-row-${String(row.request_id ?? "")}`}
        onPress={() => onPress(row)}
        style={({ pressed }) => [s.reqItemPressable, pressed && localStyles.pressed]}
      >
        <RoleCard
          title={card.title}
          subtitle={card.companyLine}
          meta={card.routeLine}
          status={<HeaderMetric issued={card.issuedCountLabel} total={card.totalCountLabel} color={card.metricColor} />}
          rightIndicator={<ChevronIndicator />}
          style={[
            s.groupHeader,
            localStyles.card,
            { borderLeftColor: card.stripeColor },
          ]}
          titleStyle={[
            s.groupTitle,
            localStyles.cardTitle,
          ]}
          subtitleStyle={[
            s.reqItemDate,
            localStyles.cardSubtitle,
          ]}
          metaStyle={[
            s.reqItemRow3,
            localStyles.cardMeta,
          ]}
        />
      </Pressable>
    </View>
  );
}

export default React.memo(ReqHeadRowItem);

const localStyles = StyleSheet.create({
  metricValue: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  metricTotal: {
    color: "#94A3B8",
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 92,
    borderLeftWidth: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  cardSubtitle: {
    marginTop: 4,
    color: "#E5E7EB",
    fontWeight: "700",
  },
  cardMeta: {
    marginTop: 4,
    fontWeight: "500",
    color: "#94A3B8",
  },
});
