// src/screens/warehouse/components/StockRowView.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { UI, s } from "../warehouse.styles";
import { nz } from "../warehouse.utils";
import { uomLabelRu } from "../warehouse.uom";
import type { StockRow } from "../warehouse.types";
import { RoleCard } from "../../../components/ui/RoleCard";
import ChevronIndicator from "../../../ui/ChevronIndicator";

const fmtQty = (n: number) =>
  Number(n).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

type Props = {
  r: StockRow;
  pickedQty?: number;
  onPress: (r: StockRow) => void;
};

function StockRowView({ r, pickedQty, onPress }: Props) {
  const uomLabel = uomLabelRu(r.uom_id);

  const onHand = nz(r.qty_on_hand, 0);
  const reserved = nz(r.qty_reserved, 0);
  const available = nz(r.qty_available, 0);

  const isPicked = Number(pickedQty ?? 0) > 0;

  return (
    <View style={{ marginBottom: 10, paddingHorizontal: 16 }}>
      <Pressable onPress={() => onPress(r)} style={({ pressed }) => pressed && { opacity: 0.94 }}>
        <RoleCard
          title={String(r.name ?? "").trim() || "—"}
          subtitle={`Доступно ${fmtQty(available)} ${uomLabel} · Резерв ${fmtQty(reserved)}`}
          meta={isPicked ? `Выбрано: ${fmtQty(Number(pickedQty))} ${uomLabel}` : undefined}
          style={[
            s.mobCard,
            { marginBottom: 0 },
            isPicked && { borderColor: UI.accent, borderWidth: 2 },
          ]}
          titleStyle={s.mobTitle}
          subtitleStyle={s.mobMeta}
          metaStyle={{ marginTop: 6, color: UI.text, fontWeight: "900" }}
          status={
            <View style={s.metaPill}>
              <Text style={s.metaPillText}>{fmtQty(onHand)}</Text>
            </View>
          }
          rightIndicator={<ChevronIndicator />}
        />
      </Pressable>
    </View>
  );
}

export default React.memo(StockRowView);
