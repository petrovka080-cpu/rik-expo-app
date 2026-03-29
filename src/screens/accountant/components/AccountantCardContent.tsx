import React, { memo } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { normalizeRuText } from "../../../lib/text/encoding";
import type { AccountantInboxUiRow, AttachmentRow, AttachmentState, Tab } from "../types";
import { S, UI } from "../ui";

const ruText = (value: unknown) => normalizeRuText(String(value ?? ""));

type AccountantCardContentProps = {
  current: AccountantInboxUiRow | null;
  tab: Tab;
  isHist: boolean;
  busyKey: string | null;
  attRows: AttachmentRow[];
  attState: AttachmentState;
  attMessage: string;
  currentDisplayStatus: string;
  onRefreshAtt: () => Promise<void>;
  onOpenFile: (file: AttachmentRow) => void;
  onOpenInvoice: () => Promise<void>;
  onOpenReport: () => Promise<void>;
  formatProposalBaseNo: (no: unknown, id: string) => string;
  roleBadgeLabel: (role: string) => string;
  statusFromRaw: (status: unknown, isHist: boolean) => { key: string; label: string };
  runAction: (key: string, fn: () => Promise<void>) => Promise<void>;
};

function AttachmentStateBlock(props: {
  tone: "error" | "warning";
  title: string;
  message: string;
}) {
  const palette =
    props.tone === "error"
      ? {
          borderColor: "rgba(255,120,120,0.35)",
          backgroundColor: "rgba(120,0,0,0.18)",
          color: "#FFD2D2",
        }
      : {
          borderColor: "rgba(253,224,71,0.35)",
          backgroundColor: "rgba(120,90,0,0.16)",
          color: "#FDE68A",
        };

  return (
    <View
      style={{
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.borderColor,
        backgroundColor: palette.backgroundColor,
      }}
    >
      <Text style={{ color: palette.color, fontWeight: "900" }}>{props.title}</Text>
      <Text style={{ color: palette.color, marginTop: 4 }}>{props.message}</Text>
    </View>
  );
}

export const AccountantCardContent = memo(function AccountantCardContent({
  current,
  isHist,
  busyKey,
  attRows,
  attState,
  attMessage,
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

  const status = statusFromRaw(current?.payment_status ?? currentDisplayStatus, isHist);
  const showInvoice = !!current?.has_invoice;
  const showReport = isHist || status.key === "PART" || status.key === "PAID";
  const files = Array.isArray(attRows) ? attRows : [];
  const busyAtt = busyKey === "att_refresh";
  const showEmpty = attState === "empty" && files.length === 0;

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
          Статус оплаты: <Text style={S.value}>{status.label}</Text>
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

          {attState === "error" ? (
            <AttachmentStateBlock
              tone="error"
              title="Не удалось загрузить вложения"
              message={attMessage}
            />
          ) : null}

          {attState === "degraded" ? (
            <AttachmentStateBlock
              tone="warning"
              title="Вложения загружены в degraded mode"
              message={attMessage}
            />
          ) : null}

          {showEmpty ? (
            <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
              {attMessage || "Вложения отсутствуют."}
            </Text>
          ) : null}

          {files.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
              {files.map((file) => (
                <Pressable
                  key={String(file.attachmentId)}
                  disabled={!!busyKey}
                  onPress={() => void onOpenFile(file)}
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
                    {(file.groupKey ? `${file.groupKey}: ` : "") + String(file.fileName ?? "file")}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
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
