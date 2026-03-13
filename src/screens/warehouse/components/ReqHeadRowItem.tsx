import React from "react";
import { Pressable, Text, View } from "react-native";
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
}: {
  issued: string;
  total: string;
}) {
  return (
    <Text
      style={{
        fontSize: 15,
        fontWeight: "700",
        lineHeight: 18,
        letterSpacing: 0.1,
      }}
    >
      <Text style={{ color: "#22c55e" }}>{issued}</Text>
      <Text style={{ color: "#94A3B8" }}>{` / ${total}`}</Text>
    </Text>
  );
}

export default function ReqHeadRowItem({ row, onPress, fmtRuDate }: Props) {
  const card = mapWarehouseReqHeadToCardProps({ row, fmtRuDate });

  return (
    <View style={s.listItemContainer}>
      <Pressable
        onPress={() => onPress(row)}
        style={({ pressed }) => [s.reqItemPressable, pressed && { opacity: 0.92 }]}
      >
        <RoleCard
          title={card.title}
          subtitle={card.companyLine}
          meta={card.routeLine}
          status={<HeaderMetric issued={card.issuedCountLabel} total={card.totalCountLabel} />}
          rightIndicator={<ChevronIndicator />}
          style={[
            s.groupHeader,
            {
              marginBottom: 0,
              paddingVertical: 10,
              paddingHorizontal: 12,
              minHeight: 92,
              borderLeftWidth: 4,
              borderLeftColor: card.stripeColor,
            },
          ]}
          titleStyle={[
            s.groupTitle,
            {
              fontSize: 16,
              fontWeight: "700",
              lineHeight: 20,
            },
          ]}
          subtitleStyle={[
            s.reqItemDate,
            {
              marginTop: 4,
              color: "#E5E7EB",
              fontWeight: "700",
            },
          ]}
          metaStyle={[
            s.reqItemRow3,
            {
              marginTop: 4,
              fontWeight: "500",
              color: "#94A3B8",
            },
          ]}
        />
      </Pressable>
    </View>
  );
}
