import React, { useMemo } from "react";
import { View, Text, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import WarehouseSheet from "./WarehouseSheet";
import { UI } from "../warehouse.styles";
import IconSquareButton from "../../../ui/IconSquareButton";

type Props = {
    visible: boolean;
    incomingId: string | null;
    loadingId: string | null;
    linesById: Record<string, any[]>;
    matNameByCode: Record<string, string>;
    onClose: () => void;
};

export default function IncomingDetailsSheet({
    visible,
    incomingId,
    loadingId,
    linesById,
    matNameByCode,
    onClose,
}: Props) {
    const key = incomingId || "";
    const lines = incomingId ? linesById[key] || [] : [];

    const title = useMemo(() => {
        return incomingId ? `Детали прихода ${incomingId}` : "Детали прихода";
    }, [incomingId]);

    const ListBody = (
        <View style={{ paddingBottom: 28 }}>
            {lines.length ? (
                lines.map((ln: any, idx: number) => {
                    const code = String(ln.rik_code || "").trim();
                    const name =
                        String(ln.name_ru || "").trim() ||
                        String(ln.name || "").trim() ||
                        String(ln.item_name_ru || "").trim() ||
                        String(ln.material_name || "").trim() ||
                        (code ? String(matNameByCode[code] || "").trim() : "") ||
                        "Позиция";

                    const uom = String(ln.uom || ln.uom_id || "—");
                    const qty = Number(ln.qty_received || ln.qty || 0);

                    return (
                        <View
                            key={`${code || "x"}:${idx}`}
                            style={{
                                padding: 12,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.10)",
                                backgroundColor: "rgba(255,255,255,0.04)",
                                marginBottom: 10,
                            }}
                        >
                            <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>
                                {name}
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <Text style={{ color: UI.sub, fontWeight: "800" }}>{uom}</Text>
                                <Text style={{ color: UI.accent, fontWeight: "900", fontSize: 16 }}>{String(qty)}</Text>
                            </View>
                        </View>
                    );
                })
            ) : (
                <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет строк.</Text>
            )}
        </View>
    );

    return (
        <WarehouseSheet visible={visible} onClose={onClose} heightPct={0.86}>
            <View style={{ flex: 1, minHeight: 0 }}>
                {/* HEADER */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <Text style={{ flex: 1, color: UI.text, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
                        {title}
                    </Text>

                    <IconSquareButton
                        onPress={onClose}
                        accessibilityLabel="Закрыть"
                        width={46}
                        height={46}
                        radius={16}
                        bg="rgba(255,255,255,0.06)"
                        bgPressed="rgba(255,255,255,0.10)"
                        bgDisabled="rgba(255,255,255,0.04)"
                        spinnerColor={UI.text}
                    >
                        <Ionicons name="close" size={22} color={UI.text} />
                    </IconSquareButton>
                </View>

                {incomingId != null && loadingId === incomingId ? (
                    <Text style={{ color: UI.sub, fontWeight: "800" }}>Загрузка…</Text>
                ) : Platform.OS === "web" ? (
                    <View style={{ flex: 1, minHeight: 0 }}>{ListBody}</View>
                ) : (
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: 28 }}
                        showsVerticalScrollIndicator
                        keyboardShouldPersistTaps="handled"
                    >
                        {ListBody}
                    </ScrollView>
                )}
            </View>
        </WarehouseSheet>
    );
}
