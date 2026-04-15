// src/screens/warehouse/components/StockRowView.tsx
import React from "react";
import { UI, s } from "../warehouse.styles";
import type { StockRow } from "../warehouse.types";
import { RoleCard } from "../../../components/ui/RoleCard";
import ChevronIndicator from "../../../ui/ChevronIndicator";
import { mapWarehouseStockToCardProps } from "../presentation/warehouseRowAdapters";
import WarehouseCardShell from "./WarehouseCardShell";
import { renderWarehouseOnHandBadge } from "./warehouse.card.parts";

type Props = {
  r: StockRow;
  pickedQty?: number;
  onPress: (r: StockRow) => void;
};

function StockRowView({ r, pickedQty, onPress }: Props) {
  const card = mapWarehouseStockToCardProps({ row: r, pickedQty });

  return (
    <WarehouseCardShell
      onPress={() => onPress(r)}
      containerStyle={{ marginBottom: 10, paddingHorizontal: 16 }}
      pressedOpacity={0.94}
    >
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
          status={renderWarehouseOnHandBadge(card.onHandLabel)}
          rightIndicator={<ChevronIndicator />}
        />
    </WarehouseCardShell>
  );
}

export default React.memo(StockRowView);
