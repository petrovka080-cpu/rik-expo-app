// src/screens/warehouse/components/HistoryRowView.tsx
import React from "react";
import { View, Text } from "react-native";
import { UI, s } from "../warehouse.styles";
import { uomLabelRu } from "../warehouse.uom";

type Props = {
    h: any;
};

function HistoryRowView({ h }: Props) {
    const dt = new Date(h.event_dt).toLocaleString("ru-RU");
    const qty = h.qty ?? 0;

    const typeLabel =
        h.event_type === "RECEIPT"
            ? "Приход"
            : h.event_type === "ISSUE"
                ? "Расход"
                : h.event_type;

    return (
        <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
            <View style={s.mobCard}>
                <View style={s.mobMain}>
                    <Text style={s.mobTitle} numberOfLines={1}>{typeLabel}</Text>
                    <Text style={s.mobMeta} numberOfLines={2}>
                        {`${dt} · ${h.code || "—"} · ${uomLabelRu(h.uom_id) || "—"} · ${qty} `}
                    </Text>
                </View>
            </View>
        </View>
    );
}

export default React.memo(HistoryRowView);
