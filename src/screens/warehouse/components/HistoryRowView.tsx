// src/screens/warehouse/components/HistoryRowView.tsx
import React from "react";
import { View, Text } from "react-native";
import { s } from "../warehouse.styles";
import { uomLabelRu } from "../warehouse.uom";

type Props = {
    h: {
        event_dt?: string | null;
        qty?: number | string | null;
        event_type?: string | null;
        code?: string | null;
        uom_id?: string | null;
    };
};

export function formatHistoryRowEventDate(value?: string | null) {
    return value
        ? new Date(value).toLocaleString("ru-RU")
        : "—";
}

function HistoryRowView({ h }: Props) {
    const dt = formatHistoryRowEventDate(h.event_dt);
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
