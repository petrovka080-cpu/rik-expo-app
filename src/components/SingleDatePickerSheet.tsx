import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function ymd(d: Date) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}
function parseYmd(s: string): Date | null {
    const v = String(s || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const d = new Date(v + "T00:00:00");
    if (Number.isNaN(d.getTime())) return null;
    return startOfDay(d);
}

type Props = {
    visible: boolean;
    onClose: () => void;
    onApply: (date: string) => void;
    value?: string;
    label?: string;
    ui?: {
        cardBg?: string;
        text?: string;
        sub?: string;
        border?: string;
        accentBlue?: string;
        approve?: string;
    };
};

export default function SingleDatePickerSheet({
    visible,
    onClose,
    onApply,
    value = "",
    label = "Выбрать дату",
    ui,
}: Props) {
    const UI = useMemo(
        () => ({
            cardBg: ui?.cardBg ?? "#101826",
            text: ui?.text ?? "#F8FAFC",
            sub: ui?.sub ?? "#9CA3AF",
            border: ui?.border ?? "rgba(255,255,255,0.14)",
            accentBlue: ui?.accentBlue ?? "#3B82F6",
            approve: ui?.approve ?? "#22C55E",
        }),
        [ui]
    );

    const [tmpDate, setTmpDate] = useState<Date>(() => parseYmd(value) || startOfDay(new Date()));
    const [webDate, setWebDate] = useState(value);
    const [androidPick, setAndroidPick] = useState(false);

    const webDateOk = !webDate.trim() || !!parseYmd(webDate);

    const closeAll = () => {
        onClose();
    };

    if (!visible) return null;

    return (
        <View
            pointerEvents="auto"
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                justifyContent: "flex-end",
                zIndex: 99999999,
                // @ts-ignore
                elevation: 99999999,
            }}
        >
            <Pressable
                onPress={closeAll}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0,0,0,0.45)",
                }}
            />

            <View
                style={{
                    backgroundColor: UI.cardBg,
                    borderTopLeftRadius: 18,
                    borderTopRightRadius: 18,
                    borderWidth: 1,
                    borderColor: UI.border,
                    overflow: "hidden",
                    paddingBottom: 20,
                    paddingTop: 10,
                    width: "100%",
                }}
            >
                <View style={{ alignItems: "center", paddingVertical: 10 }}>
                    <View style={{ width: 48, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" }} />
                </View>

                <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
                    <Text style={{ color: UI.text, fontWeight: "900", fontSize: 18 }}>{label}</Text>
                </View>

                {Platform.OS === "web" ? (
                    <View style={{ paddingHorizontal: 16 }}>
                        <TextInput
                            value={webDate}
                            onChangeText={setWebDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={UI.sub}
                            autoFocus
                            style={{
                                borderWidth: 1,
                                borderColor: webDateOk ? UI.border : "#EF4444",
                                borderRadius: 12,
                                padding: 14,
                                backgroundColor: "rgba(255,255,255,0.06)",
                                color: UI.text,
                                fontWeight: "700",
                                fontSize: 16,
                            }}
                        />
                        <Pressable
                            disabled={!webDateOk || !webDate.trim()}
                            onPress={() => {
                                const d = parseYmd(webDate);
                                if (d) {
                                    onApply(ymd(d));
                                    closeAll();
                                }
                            }}
                            style={{
                                marginTop: 14,
                                paddingVertical: 14,
                                borderRadius: 14,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: UI.approve,
                                opacity: webDateOk && webDate.trim() ? 1 : 0.45,
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Готово</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View>
                        {Platform.OS === "ios" ? (
                            <DateTimePicker
                                value={tmpDate}
                                mode="date"
                                display="spinner"
                                onChange={(_, d) => {
                                    if (d) setTmpDate(startOfDay(d));
                                }}
                                style={{ backgroundColor: UI.cardBg }}
                            />
                        ) : (
                            <Pressable onPress={() => setAndroidPick(true)} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                                <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>{ymd(tmpDate)}</Text>
                            </Pressable>
                        )}

                        {Platform.OS === "android" && androidPick ? (
                            <DateTimePicker
                                value={tmpDate}
                                mode="date"
                                display="default"
                                onChange={(_, d) => {
                                    setAndroidPick(false);
                                    if (d) setTmpDate(startOfDay(d));
                                }}
                            />
                        ) : null}

                        <Pressable
                            onPress={() => {
                                onApply(ymd(tmpDate));
                                closeAll();
                            }}
                            style={{
                                marginTop: 14,
                                marginHorizontal: 16,
                                paddingVertical: 14,
                                borderRadius: 14,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: UI.approve,
                            }}
                        >
                            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Готово</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        </View>
    );
}
