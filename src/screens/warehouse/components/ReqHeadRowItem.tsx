import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ReqHeadRow } from "../warehouse.types";
import { UI, s } from "../warehouse.styles";
import { RoleCard } from "../../../components/ui/RoleCard";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import { mapWarehouseReqHeadToCardProps } from "../presentation/warehouseRowAdapters";

type Props = {
  row: ReqHeadRow;
  onPress: (row: ReqHeadRow) => void;
  fmtRuDate: (iso?: string | null) => string;
};

export default function ReqHeadRowItem({ row, onPress, fmtRuDate }: Props) {
  const card = mapWarehouseReqHeadToCardProps({ row, fmtRuDate });

  const statusNode = card.isFullyIssued ? (
    <Text style={s.reqItemStatusFullyIssued}>Выдано полностью</Text>
  ) : (
    <Text style={s.reqItemStatusNotFullyIssued}>
      К выдаче:{" "}
      <Text style={{ color: card.hasToIssue ? "#22c55e" : UI.text, fontWeight: "900" }}>
        {card.hasToIssue
          ? `${card.openPos} ${card.openPos === 1 ? "позиция" : card.openPos > 1 && card.openPos < 5 ? "позиции" : "позиций"}`
          : "0"}
      </Text>
      {" • "}
      Выдано:{" "}
      <Text style={{ color: card.issuedPos > 0 ? "#22c55e" : UI.text, fontWeight: "800" }}>
        {card.issuedPos}
      </Text>
    </Text>
  );

  return (
    <View style={s.listItemContainer}>
      <Pressable
        onPress={() => onPress(row)}
        style={({ pressed }) => [s.reqItemPressable, pressed && { opacity: 0.9 }]}
      >
        <RoleCard
          title={card.title}
          subtitle={card.subtitle}
          meta={card.meta}
          status={statusNode}
          rightIndicator={<ChevronIndicator />}
          style={[
            s.groupHeader,
            {
              marginBottom: 0,
              borderLeftWidth: card.hasToIssue ? 5 : 0,
              borderLeftColor: "#22c55e",
            },
          ]}
          titleStyle={[s.groupTitle, { fontSize: 16 }]}
          subtitleStyle={s.reqItemDate}
          metaStyle={s.reqItemRow3}
        />
      </Pressable>
    </View>
  );
}
