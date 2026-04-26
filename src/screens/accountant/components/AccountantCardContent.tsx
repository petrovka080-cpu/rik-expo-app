import React, { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import type { ProposalRoleTag } from "../../../lib/format";
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
  roleBadgeLabel: (role?: ProposalRoleTag) => string;
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
      style={[
        styles.attachmentStateBlock,
        {
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
      ]}
    >
      <Text style={[styles.attachmentStateTitle, { color: palette.color }]}>{props.title}</Text>
      <Text style={[styles.attachmentStateMessage, { color: palette.color }]}>{props.message}</Text>
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
  const webMonospace = Platform.OS === "web" ? styles.webMonospace : null;

  return (
    <View style={S.section}>
      <View style={styles.headerRow}>
        <Text style={S.label}>
          Номер предложения:{" "}
          <Text style={S.value}>
            {formatProposalBaseNo(current?.proposal_no, String(current?.proposal_id ?? ""))}
          </Text>
        </Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleBadgeLabel("A")}</Text>
        </View>
      </View>

      <View style={styles.spacer6} />

      <Text style={S.label}>
        ID заявки:{" "}
        <Text style={[S.value, webMonospace]}>{current?.proposal_id || "—"}</Text>
      </Text>

      <View style={styles.spacer8} />

      <Text style={S.label}>
        Поставщик:{" "}
        <Text testID="accountant-card-supplier" style={S.value}>
          {ruText(current?.supplier || "—")}
        </Text>
      </Text>

      <Text testID="accountant-card-invoice" style={[S.label, styles.marginTop6]}>
        Счёт (инвойс): <Text style={S.value}>{ruText(current?.invoice_number || "—")}</Text> от{" "}
        <Text style={S.value}>{ruText(current?.invoice_date || "—")}</Text>
      </Text>

      <Text testID="accountant-card-amount" style={[S.label, styles.marginTop6]}>
        Сумма счёта:{" "}
        <Text style={S.value}>
          {Number(current?.invoice_amount ?? 0)} {current?.invoice_currency || "KGS"}
        </Text>
      </Text>

      <View style={styles.spacer10} />

      <View style={styles.statusRow}>
        <Text testID="accountant-card-status" style={S.label}>
          Статус оплаты: <Text style={S.value}>{status.label}</Text>
        </Text>
      </View>

      <View style={styles.attachmentsSection}>
        <View>
          <View style={styles.attachmentsHeaderRow}>
            <Text style={styles.attachmentsTitle}>Вложения: {files.length}</Text>

            <Pressable
              disabled={!!busyKey}
              onPress={() => runAction("att_refresh", onRefreshAtt)}
              style={[styles.outlinePill, busyKey ? styles.dimmed : null]}
            >
              <Text style={styles.outlinePillText}>{busyAtt ? "..." : "Обновить"}</Text>
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
            <Text style={styles.emptyText}>{attMessage || "Вложения отсутствуют."}</Text>
          ) : null}

          {files.length > 0 ? (
            <View style={styles.fileList}>
              {files.map((file) => (
                <Pressable
                  key={String(file.attachmentId)}
                  disabled={!!busyKey}
                  onPress={() => void onOpenFile(file)}
                  style={[styles.fileChip, busyKey ? styles.dimmed : null]}
                >
                  <Text style={styles.fileChipText} numberOfLines={1}>
                    {(file.groupKey ? `${file.groupKey}: ` : "") + String(file.fileName ?? "file")}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {showInvoice || showReport ? (
          <View style={styles.actionRow}>
            {showInvoice ? (
              <Pressable
                disabled={!!busyKey}
                onPress={() => runAction("top_invoice", onOpenInvoice)}
                style={[styles.actionButton, busyKey ? styles.dimmed : null]}
              >
                <Text style={styles.actionButtonText}>Счёт</Text>
              </Pressable>
            ) : null}

            {showReport ? (
              <Pressable
                disabled={!!busyKey}
                onPress={() => runAction("top_report", onOpenReport)}
                style={[styles.actionButton, busyKey ? styles.dimmed : null]}
              >
                <Text style={styles.actionButtonText}>Отчёт</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  attachmentStateBlock: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  attachmentStateTitle: {
    fontWeight: "900",
  },
  attachmentStateMessage: {
    marginTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  roleBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  roleBadgeText: {
    fontWeight: "900",
    color: UI.text,
    fontSize: 12,
  },
  spacer6: {
    height: 6,
  },
  spacer8: {
    height: 8,
  },
  spacer10: {
    height: 10,
  },
  webMonospace: {
    fontFamily: "monospace",
  },
  marginTop6: {
    marginTop: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  attachmentsSection: {
    marginTop: 10,
  },
  attachmentsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attachmentsTitle: {
    color: UI.text,
    fontWeight: "900",
  },
  outlinePill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  outlinePillText: {
    color: UI.text,
    fontWeight: "900",
    fontSize: 12,
  },
  dimmed: {
    opacity: 0.6,
  },
  emptyText: {
    color: UI.sub,
    fontWeight: "800",
    marginTop: 8,
  },
  fileList: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  fileChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 8,
    marginBottom: 8,
  },
  fileChipText: {
    color: UI.text,
    fontWeight: "900",
  },
  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: UI.text,
    fontWeight: "900",
  },
});
