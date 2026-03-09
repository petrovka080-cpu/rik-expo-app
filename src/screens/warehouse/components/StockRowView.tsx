// src/screens/warehouse/components/StockRowView.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { UI, s } from "../warehouse.styles";
import type { StockRow } from "../warehouse.types";
import { RoleCard } from "../../../components/ui/RoleCard";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import { mapWarehouseStockToCardProps } from "../presentation/warehouseRowAdapters";

type Props = {
  r: StockRow;
  pickedQty?: number;
  onPress: (r: StockRow) => void;
};

function StockRowView({ r, pickedQty, onPress }: Props) {
  const card = mapWarehouseStockToCardProps({ row: r, pickedQty });

  return (
    <View style={{ marginBottom: 10, paddingHorizontal: 16 }}>
      <Pressable onPress={() => onPress(r)} style={({ pressed }) => pressed && { opacity: 0.94 }}>
        <RoleCard
          title={card.title}
          subtitle={card.subtitle}
          meta={card.meta}
          style={[
            s.mobCard,
            { marginBottom: 0 },
            card.isPicked && { borderColor: UI.accent, borderWidth: 2 },
          ]}
          titleStyle={s.mobTitle}
          subtitleStyle={s.mobMeta}
          metaStyle={{ marginTop: 6, color: UI.text, fontWeight: "900" }}
          status={
            <View style={s.metaPill}>
              <Text style={s.metaPillText}>{card.onHandLabel}</Text>
            </View>
          }
          rightIndicator={<ChevronIndicator />}
        />
      </Pressable>
    </View>
  );
}

export default React.memo(StockRowView);
