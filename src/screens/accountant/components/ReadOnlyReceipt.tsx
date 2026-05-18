import React from "react";
import { Pressable, Text, View } from "react-native";

import type { AccountantInboxRow } from "../../../lib/rik_api";
import { normalizeRuText } from "../../../lib/text/encoding";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { AttachmentRow, AttachmentState, Tab } from "../types";
import { S } from "../ui";
import { AttachmentStateBlock } from "./ReadOnlyReceiptAttachmentStateBlock";
import { receiptStyles } from "./ReadOnlyReceipt.styles";

type ReceiptCurrent = AccountantInboxRow & {
  proposal_id?: string;
  has_invoice?: boolean | null;
  total_paid?: number | null;
};

const ru = (value: unknown, fallback = "") => normalizeRuText(String(value ?? fallback));

export function ReadOnlyPaymentSummary({
  current,
  tab,
  currentPaymentId,
  note,
  bankName,
  bik,
  rs,
  inn,
  kpp,
}: {
  current: ReceiptCurrent | null;
  tab: Tab;
  currentPaymentId: number | null;
  note: string;
  bankName: string;
  bik: string;
  rs: string;
  inn: string;
  kpp: string;
}) {
  const [showBank, setShowBank] = React.useState(false);

  const inv = Number(current?.invoice_amount ?? 0);
  const paid = Number(current?.total_paid ?? 0);
  const rest = inv > 0 ? Math.max(0, inv - paid) : 0;
  const cur = String(current?.invoice_currency || "KGS");

  const statusRaw = String(current?.payment_status ?? "").trim();
  const statusText = ru(statusRaw, "Просмотр");
  const noteText = ru(String(note ?? "").trim());
  const isHistoryTab =
    String(tab).toLowerCase().includes("истор") ||
    String(tab).toLowerCase().includes("history");

  const hasAnyBank = !!(bankName || bik || rs || inn || kpp);

  return (
    <View style={S.section}>
      <Text style={receiptStyles.sectionTitle}>Детали оплаты</Text>

      <View
        style={receiptStyles.amountCard}
      >
        <Text style={receiptStyles.subLabel}>Счёт</Text>
        <Text style={receiptStyles.amountTitle}>
          {inv.toFixed(2)} {cur}
        </Text>

        <View style={receiptStyles.spacer10} />

        <View style={receiptStyles.rowGap10}>
          <View style={receiptStyles.flex1}>
            <Text style={receiptStyles.subLabel}>Оплачено</Text>
            <Text style={receiptStyles.valueText}>
              {paid.toFixed(2)} {cur}
            </Text>
          </View>

          <View style={receiptStyles.flex1}>
            <Text style={receiptStyles.subLabel}>Остаток</Text>
            <Text
              style={{
                color: rest <= 0 ? "rgba(134,239,172,0.95)" : "rgba(253,224,138,0.95)",
                fontWeight: "900",
                marginTop: 4,
              }}
            >
              {rest.toFixed(2)} {cur}
            </Text>
          </View>
        </View>
      </View>

      <View style={receiptStyles.spacer10} />

      {isHistoryTab && currentPaymentId ? (
        <View style={receiptStyles.marginBottom10}>
          <Text style={receiptStyles.subLabel}>
            Платёж ID: <Text style={receiptStyles.textStrong}>{String(currentPaymentId)}</Text>
          </Text>
        </View>
      ) : null}

      <Text style={receiptStyles.subLabel}>Статус</Text>
      <StatusBadge label={statusText} tone="neutral" style={{ marginTop: 4 }} />

      {noteText ? (
        <>
          <View style={receiptStyles.spacer10} />
          <Text style={receiptStyles.textEmphasis}>
            Комментарий: <Text style={receiptStyles.subLabel}>{noteText}</Text>
          </Text>
        </>
      ) : null}

      <View style={receiptStyles.spacer12} />

      <Pressable
        onPress={() => setShowBank((value) => !value)}
        style={receiptStyles.bankToggle}
      >
        <Text style={receiptStyles.textStrong}>Реквизиты {hasAnyBank ? "" : "(пусто)"}</Text>
        <Text style={receiptStyles.toggleText}>{showBank ? "▲" : "▼"}</Text>
      </Pressable>

      {showBank ? (
        <View
          style={receiptStyles.bankPanel}
        >
          <Text style={receiptStyles.textStrong}>
            Банк: <Text style={receiptStyles.subLabel}>{bankName || "—"}</Text>
          </Text>

          <View style={receiptStyles.spacer10} />
          <Text style={receiptStyles.textStrong}>
            БИК: <Text style={receiptStyles.subLabel}>{bik || "—"}</Text>
          </Text>

          <View style={receiptStyles.spacer10} />
          <Text style={receiptStyles.textStrong}>
            Р/С: <Text style={receiptStyles.subLabel}>{rs || "—"}</Text>
          </Text>

          <View style={receiptStyles.spacer10} />
          <View style={receiptStyles.rowGap10}>
            <View style={receiptStyles.flex1}>
              <Text style={receiptStyles.textStrong}>
                ИНН: <Text style={receiptStyles.subLabel}>{inn || "—"}</Text>
              </Text>
            </View>
            <View style={receiptStyles.flex1}>
              <Text style={receiptStyles.textStrong}>
                КПП: <Text style={receiptStyles.subLabel}>{kpp || "—"}</Text>
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function ReadOnlyPaymentReceipt({
  current,
  tab,
  currentPaymentId,
  accountantFio,
  note,
  bankName,
  bik,
  rs,
  inn,
  kpp,
  attRows,
  attState,
  attMessage,
  busyKey,
  onRefreshAtt,
  onOpenFile,
  onOpenInvoice,
  onOpenReport,
  invoiceNoDraft,
  invoiceDateDraft,
}: {
  current: ReceiptCurrent | null;
  tab: Tab;
  currentPaymentId: number | null;
  accountantFio: string;
  note: string;
  bankName: string;
  bik: string;
  rs: string;
  inn: string;
  kpp: string;
  attRows: AttachmentRow[];
  attState: AttachmentState;
  attMessage: string;
  busyKey: string | null;
  onRefreshAtt: () => Promise<void>;
  onOpenFile: (file: AttachmentRow) => void;
  onOpenInvoice: () => Promise<void>;
  onOpenReport: () => Promise<void>;
  invoiceNoDraft: string;
  invoiceDateDraft: string;
}) {
  const invNo = ru(String(current?.invoice_number ?? invoiceNoDraft ?? "").trim(), "—");
  const invDt = ru(String(current?.invoice_date ?? invoiceDateDraft ?? "").trim(), "—");

  const supplier = ru(String(current?.supplier ?? "—").trim(), "—");
  const proposalId = String(current?.proposal_id ?? "—").trim() || "—";

  const inv = Number(current?.invoice_amount ?? 0);
  const paid = Number(current?.total_paid ?? 0);
  const rest = inv > 0 ? Math.max(0, inv - paid) : 0;
  const cur = String(current?.invoice_currency || "KGS");

  const statusText = ru(String(current?.payment_status ?? "").trim(), "Просмотр");
  const fio = ru(String(accountantFio || "").trim(), "—");
  const noteText = ru(String(note || "").trim());
  const isHistoryTab =
    String(tab).toLowerCase().includes("истор") ||
    String(tab).toLowerCase().includes("history");

  const files = Array.isArray(attRows) ? attRows : [];
  const showInvoiceBtn = !!current?.has_invoice;
  const showReportBtn =
    isHistoryTab ||
    String(statusText).toLowerCase().startsWith("оплач") ||
    String(statusText).toLowerCase().startsWith("частич");
  const showAttachmentEmpty = attState === "empty" && files.length === 0;

  const [showBank, setShowBank] = React.useState(false);
  const hasAnyBank = !!(bankName || bik || rs || inn || kpp);

  return (
    <>
      <View style={S.section}>
        <View style={receiptStyles.headerRow}>
          <View style={receiptStyles.flex1}>
            <Text style={receiptStyles.supplierTitle} numberOfLines={1}>
              {supplier}
            </Text>
            <Text style={receiptStyles.headerSub} numberOfLines={1}>
              Счёт №{invNo} • {invDt}
            </Text>
          </View>

          <View
            style={receiptStyles.statusPill}
          >
            <Text style={receiptStyles.statusPillText}>
              {String(statusText).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={receiptStyles.spacer10} />

        <Text style={receiptStyles.subLabel}>
          ID:{" "}
          <Text
            style={receiptStyles.monospaceValue}
          >
            {proposalId}
          </Text>
        </Text>

        <View style={receiptStyles.spacer12} />

        <View
          style={receiptStyles.amountCard}
        >
          <Text style={receiptStyles.subLabel}>Сумма счёта</Text>
          <Text style={receiptStyles.amountTitle}>
            {inv.toFixed(2)} {cur}
          </Text>

          <View style={receiptStyles.spacer10} />

          <View style={receiptStyles.rowGap10}>
            <View style={receiptStyles.flex1}>
              <Text style={receiptStyles.subLabel}>Оплачено</Text>
              <Text style={receiptStyles.valueText}>
                {paid.toFixed(2)} {cur}
              </Text>
            </View>
            <View style={receiptStyles.flex1}>
              <Text style={receiptStyles.subLabel}>Остаток</Text>
              <Text
                style={{
                  color: rest <= 0 ? "rgba(134,239,172,0.95)" : "rgba(253,224,138,0.95)",
                  fontWeight: "900",
                  marginTop: 4,
                }}
              >
                {rest.toFixed(2)} {cur}
              </Text>
            </View>
          </View>
        </View>

        <View style={receiptStyles.spacer12} />

        <Text style={receiptStyles.subLabel}>Бухгалтер</Text>
        <Text style={receiptStyles.valueText}>{fio}</Text>

        {isHistoryTab && currentPaymentId ? (
          <View style={receiptStyles.marginTop8}>
            <Text style={receiptStyles.subLabel}>
              Платёж ID: <Text style={receiptStyles.textStrong}>{String(currentPaymentId)}</Text>
            </Text>
          </View>
        ) : null}

        {noteText ? (
          <>
            <View style={receiptStyles.spacer10} />
            <Text style={receiptStyles.textEmphasis}>
              Комментарий: <Text style={receiptStyles.subLabel}>{noteText}</Text>
            </Text>
          </>
        ) : null}
      </View>

      <View style={receiptStyles.spacer12} />

      <View style={S.section}>
        <View style={receiptStyles.attachmentHeaderRow}>
          <Text style={receiptStyles.textStrong}>Вложения: {files.length}</Text>

          <Pressable
            disabled={!!busyKey}
            onPress={() => void onRefreshAtt()}
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
            <Text style={receiptStyles.buttonTextSmall}>{busyKey ? "…" : "Обновить"}</Text>
          </Pressable>
        </View>

        <View style={receiptStyles.spacer10} />

        {attState === "error" ? (
          <AttachmentStateBlock tone="error" title="Не удалось загрузить вложения" message={attMessage} />
        ) : null}

        {attState === "degraded" ? (
          <AttachmentStateBlock tone="warning" title="Вложения загружены в degraded mode" message={attMessage} />
        ) : null}

        {showAttachmentEmpty ? (
          <Text style={receiptStyles.subLabel}>{attMessage || "Вложения отсутствуют."}</Text>
        ) : null}

        {files.length > 0 ? (
          <View style={receiptStyles.gap8}>
            {files.map((file) => (
              <Pressable
                key={String(file.attachmentId)}
                disabled={!!busyKey}
                onPress={() => onOpenFile(file)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.14)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                  opacity: busyKey ? 0.6 : 1,
                }}
              >
                <Text style={receiptStyles.textStrong} numberOfLines={1}>
                  📎 {String(file.fileName ?? "file")}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {showInvoiceBtn || showReportBtn ? (
          <View style={receiptStyles.actionRow}>
            {showInvoiceBtn ? (
              <Pressable
                disabled={!!busyKey}
                onPress={() => void onOpenInvoice()}
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
                <Text style={receiptStyles.textStrong}>Счёт</Text>
              </Pressable>
            ) : null}

            {showReportBtn ? (
              <Pressable
                disabled={!!busyKey}
                onPress={() => void onOpenReport()}
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
                <Text style={receiptStyles.textStrong}>Отчёт</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={receiptStyles.spacer12} />

      <View style={S.section}>
        <Pressable
          onPress={() => setShowBank((value) => !value)}
          style={receiptStyles.bankToggle}
        >
          <Text style={receiptStyles.textStrong}>Реквизиты {hasAnyBank ? "" : "(пусто)"}</Text>
          <Text style={receiptStyles.toggleText}>{showBank ? "▲" : "▼"}</Text>
        </Pressable>

        {showBank ? (
          <View
            style={receiptStyles.bankPanel}
          >
            <Text style={receiptStyles.textStrong}>
              Банк: <Text style={receiptStyles.subLabel}>{bankName || "—"}</Text>
            </Text>

            <View style={receiptStyles.spacer10} />
            <Text style={receiptStyles.textStrong}>
              БИК: <Text style={receiptStyles.subLabel}>{bik || "—"}</Text>
            </Text>

            <View style={receiptStyles.spacer10} />
            <Text style={receiptStyles.textStrong}>
              Р/С: <Text style={receiptStyles.subLabel}>{rs || "—"}</Text>
            </Text>

            <View style={receiptStyles.spacer10} />
            <View style={receiptStyles.rowGap10}>
              <View style={receiptStyles.flex1}>
                <Text style={receiptStyles.textStrong}>
                  ИНН: <Text style={receiptStyles.subLabel}>{inn || "—"}</Text>
                </Text>
              </View>
              <View style={receiptStyles.flex1}>
                <Text style={receiptStyles.textStrong}>
                  КПП: <Text style={receiptStyles.subLabel}>{kpp || "—"}</Text>
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}
