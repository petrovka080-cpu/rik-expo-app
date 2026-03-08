import React, { memo } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { S, UI } from "../ui";
import type { AccountantInboxUiRow, AttachmentRow, Tab } from "../types";
import { normalizeRuText } from "../../../lib/text/encoding";

// We assume these helpers are either imported or defined here for convenience if they are simple
const ruText = (v: unknown) => normalizeRuText(String(v ?? ""));

type AccountantCardContentProps = {
    current: AccountantInboxUiRow | null;
    tab: Tab;
    isHist: boolean;
    busyKey: string | null;
    attRows: AttachmentRow[];
    currentDisplayStatus: string;
    onRefreshAtt: () => Promise<void>;
    onOpenFile: (f: AttachmentRow) => void;
    onOpenInvoice: () => Promise<void>;
    onOpenReport: () => Promise<void>;
    formatProposalBaseNo: (no: any, id: string) => string;
    roleBadgeLabel: (r: string) => string;
    statusFromRaw: (s: any, isHist: boolean) => { key: string; label: string };
    runAction: (key: string, fn: () => Promise<void>) => Promise<void>;
};

export const AccountantCardContent = memo(function AccountantCardContent({
    current,
    tab,
    isHist,
    busyKey,
    attRows,
    currentDisplayStatus,
    onRefreshAtt,
    onOpenFile,
    onOpenInvoice,
    onOpenReport,
    formatProposalBaseNo,
    roleBadgeLabel,
    statusFromRaw,
    runAction,
}: AccountantCardContentProps) {
    if (!current?.proposal_id) return null;

    const st = statusFromRaw(current?.payment_status ?? currentDisplayStatus, isHist);
    const showInvoice = !!current?.has_invoice;
    const showReport = isHist || st.key === "PART" || st.key === "PAID";
    const files = Array.isArray(attRows) ? attRows : [];
    const busyAtt = busyKey === "att_refresh";

    return (
        <View style={S.section}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={S.label}>
                    Номер предложения:{" "}
                    <Text style={S.value}>
                        {formatProposalBaseNo(current?.proposal_no, String(current?.proposal_id ?? ""))}
                    </Text>
                </Text>

                <View
                    style={{
                        paddingVertical: 3,
                        paddingHorizontal: 10,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.18)",
                        backgroundColor: "rgba(255,255,255,0.06)",
                    }}
                >
                    <Text style={{ fontWeight: "900", color: UI.text, fontSize: 12 }}>
                        {roleBadgeLabel("A")}
                    </Text>
                </View>
            </View>

            <View style={{ height: 6 }} />

            <Text style={S.label}>
                ID заявки:{" "}
                <Text style={[S.value, { fontFamily: Platform.OS === "web" ? "monospace" : undefined }]}>
                    {current?.proposal_id || "—"}
                </Text>
            </Text>
            <View style={{ height: 8 }} />

            <Text style={S.label}>
                Поставщик: <Text style={S.value}>{ruText(current?.supplier || "—")}</Text>
            </Text>

            <Text style={[S.label, { marginTop: 6 }]}>
                Счёт (инвойс): <Text style={S.value}>{ruText(current?.invoice_number || "—")}</Text> от{" "}
                <Text style={S.value}>{ruText(current?.invoice_date || "—")}</Text>
            </Text>

            <Text style={[S.label, { marginTop: 6 }]}>
                Сумма счёта:{" "}
                <Text style={S.value}>
                    {Number(current?.invoice_amount ?? 0)} {current?.invoice_currency || "KGS"}
                </Text>
            </Text>

            <View style={{ height: 10 }} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <Text style={S.label}>
                    Статус оплаты: <Text style={S.value}>{st.label}</Text>
                </Text>
            </View>

            <View style={{ marginTop: 10 }}>
                <View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ color: UI.text, fontWeight: "900" }}>Вложения: {files.length}</Text>

                        <Pressable
                            disabled={!!busyKey}
                            onPress={() => runAction("att_refresh", onRefreshAtt)}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 10,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.18)",
                                backgroundColor: "rgba(255,255,255,0.06)",
                                opacity: busyKey ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: UI.text, fontWeight: "900", fontSize: 12 }}>
                                {busyAtt ? "..." : "Обновить"}
                            </Text>
                        </Pressable>
                    </View>

                    {files.length === 0 ? (
                        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
                            Вложения не найдены. Добавьте файл (счёт/акт), затем нажмите «Обновить».
                        </Text>
                    ) : (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                            {files.map((f: AttachmentRow) => (
                                <Pressable
                                    key={String(f.id)}
                                    disabled={!!busyKey}
                                    onPress={() => void onOpenFile(f)}
                                    style={{
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor: "rgba(255,255,255,0.18)",
                                        backgroundColor: "rgba(255,255,255,0.06)",
                                        marginRight: 8,
                                        marginBottom: 8,
                                        opacity: busyKey ? 0.6 : 1,
                                    }}
                                >
                                    <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                                        {(f.group_key ? `${f.group_key}: ` : "") + String(f.file_name ?? "file")}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                {showInvoice || showReport ? (
                    <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
                        {showInvoice ? (
                            <Pressable
                                disabled={!!busyKey}
                                onPress={() => runAction("top_invoice", onOpenInvoice)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 14,
                                    backgroundColor: "rgba(255,255,255,0.06)",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.14)",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: busyKey ? 0.6 : 1,
                                }}
                            >
                                <Text style={{ color: UI.text, fontWeight: "900" }}>Счёт</Text>
                            </Pressable>
                        ) : null}

                        {showReport ? (
                            <Pressable
                                disabled={!!busyKey}
                                onPress={() => runAction("top_report", onOpenReport)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    borderRadius: 14,
                                    backgroundColor: "rgba(255,255,255,0.06)",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.14)",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: busyKey ? 0.6 : 1,
                                }}
                            >
                                <Text style={{ color: UI.text, fontWeight: "900" }}>Отчёт</Text>
                            </Pressable>
                        ) : null}
                    </View>
                ) : null}
            </View>
        </View>
    );
});
