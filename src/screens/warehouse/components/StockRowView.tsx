// src/screens/warehouse/components/StockRowView.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { UI, s } from "../warehouse.styles";
import { nz } from "../warehouse.utils";
import { uomLabelRu } from "../warehouse.uom";
import type { StockRow } from "../warehouse.types";

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
        <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
            <Pressable onPress={() => onPress(r)}>
                <View
                    style={[
                        s.mobCard,
                        isPicked && { borderColor: UI.accent, borderWidth: 2 },
                    ]}
                >
                    <View style={s.mobMain}>
                        <Text style={s.mobTitle} numberOfLines={2}>
                            {String(r.name ?? "").trim() || "—"}
                        </Text>

                        <Text style={s.mobMeta} numberOfLines={2}>
                            {`Доступно ${fmtQty(available)} ${uomLabel} · Резерв ${fmtQty(reserved)} `}
                        </Text>

                        {isPicked ? (
                            <Text style={{ marginTop: 6, color: UI.text, fontWeight: "900" }}>
                                {`Выбрано: ${fmtQty(Number(pickedQty))} ${uomLabel} `}
                            </Text>
                        ) : null}
                    </View>

                    <View style={s.metaPill}>
                        <Text style={s.metaPillText}>{fmtQty(onHand)}</Text>
                    </View>
                </View>
            </Pressable>
        </View>
    );
}

export default React.memo(StockRowView);
