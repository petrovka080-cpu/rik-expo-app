import React from "react";
import { Platform, Pressable, Text, View } from "react-native";

import type { AccountantInboxRow } from "../../../lib/rik_api";
import { normalizeRuText } from "../../../lib/text/encoding";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { AttachmentRow, AttachmentState, Tab } from "../types";
import { S, UI } from "../ui";

type ReceiptCurrent = AccountantInboxRow & {
  proposal_id?: string;
  has_invoice?: boolean | null;
  total_paid?: number | null;
};

const ru = (value: unknown, fallback = "") => normalizeRuText(String(value ?? fallback));

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
        marginBottom: 10,
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
      <Text style={{ fontWeight: "900", color: UI.text, marginBottom: 10 }}>Детали оплаты</Text>

      <View
        style={{
          padding: 12,
          borderRadius: 14,
          backgroundColor: "rgba(255,255,255,0.04)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <Text style={{ color: UI.sub, fontWeight: "800" }}>Счёт</Text>
        <Text style={{ color: UI.text, fontWeight: "900", fontSize: 18, marginTop: 4 }}>
          {inv.toFixed(2)} {cur}
        </Text>

        <View style={{ height: 10 }} />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: UI.sub, fontWeight: "800" }}>Оплачено</Text>
            <Text style={{ color: UI.text, fontWeight: "900", marginTop: 4 }}>
              {paid.toFixed(2)} {cur}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: UI.sub, fontWeight: "800" }}>Остаток</Text>
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

      <View style={{ height: 10 }} />

      {isHistoryTab && currentPaymentId ? (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ color: UI.sub, fontWeight: "800" }}>
            Платёж ID: <Text style={{ color: UI.text, fontWeight: "900" }}>{String(currentPaymentId)}</Text>
          </Text>
        </View>
      ) : null}

      <Text style={{ color: UI.sub, fontWeight: "800" }}>Статус</Text>
      <StatusBadge label={statusText} tone="neutral" style={{ marginTop: 4 }} />

      {noteText ? (
        <>
          <View style={{ height: 10 }} />
          <Text style={{ color: UI.text, fontWeight: "800" }}>
            Комментарий: <Text style={{ color: UI.sub, fontWeight: "800" }}>{noteText}</Text>
          </Text>
        </>
      ) : null}

      <View style={{ height: 12 }} />

      <Pressable
        onPress={() => setShowBank((value) => !value)}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 14,
          backgroundColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: UI.text, fontWeight: "900" }}>Реквизиты {hasAnyBank ? "" : "(пусто)"}</Text>
        <Text style={{ color: UI.sub, fontWeight: "900" }}>{showBank ? "▲" : "▼"}</Text>
      </Pressable>

      {showBank ? (
        <View
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        >
          <Text style={{ color: UI.text, fontWeight: "900" }}>
            Банк: <Text style={{ color: UI.sub, fontWeight: "800" }}>{bankName || "—"}</Text>
          </Text>

          <View style={{ height: 10 }} />
          <Text style={{ color: UI.text, fontWeight: "900" }}>
            БИК: <Text style={{ color: UI.sub, fontWeight: "800" }}>{bik || "—"}</Text>
          </Text>

          <View style={{ height: 10 }} />
          <Text style={{ color: UI.text, fontWeight: "900" }}>
            Р/С: <Text style={{ color: UI.sub, fontWeight: "800" }}>{rs || "—"}</Text>
          </Text>

          <View style={{ height: 10 }} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: UI.text, fontWeight: "900" }}>
                ИНН: <Text style={{ color: UI.sub, fontWeight: "800" }}>{inn || "—"}</Text>
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: UI.text, fontWeight: "900" }}>
                КПП: <Text style={{ color: UI.sub, fontWeight: "800" }}>{kpp || "—"}</Text>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>
              {supplier}
            </Text>
            <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={1}>
              Счёт №{invNo} • {invDt}
            </Text>
          </View>

          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: "rgba(34,197,94,0.14)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.30)",
            }}
          >
            <Text style={{ color: "rgba(134,239,172,0.95)", fontWeight: "900", fontSize: 12 }}>
              {String(statusText).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={{ height: 10 }} />

        <Text style={{ color: UI.sub, fontWeight: "800" }}>
          ID:{" "}
          <Text
            style={{
              color: UI.text,
              fontWeight: "900",
              fontFamily: Platform.OS === "web" ? "monospace" : undefined,
            }}
          >
            {proposalId}
          </Text>
        </Text>

        <View style={{ height: 12 }} />

        <View
          style={{
            padding: 12,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ color: UI.sub, fontWeight: "800" }}>Сумма счёта</Text>
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 18, marginTop: 4 }}>
            {inv.toFixed(2)} {cur}
          </Text>

          <View style={{ height: 10 }} />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: UI.sub, fontWeight: "800" }}>Оплачено</Text>
              <Text style={{ color: UI.text, fontWeight: "900", marginTop: 4 }}>
                {paid.toFixed(2)} {cur}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: UI.sub, fontWeight: "800" }}>Остаток</Text>
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

        <View style={{ height: 12 }} />

        <Text style={{ color: UI.sub, fontWeight: "800" }}>Бухгалтер</Text>
        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 4 }}>{fio}</Text>

        {isHistoryTab && currentPaymentId ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: UI.sub, fontWeight: "800" }}>
              Платёж ID: <Text style={{ color: UI.text, fontWeight: "900" }}>{String(currentPaymentId)}</Text>
            </Text>
          </View>
        ) : null}

        {noteText ? (
          <>
            <View style={{ height: 10 }} />
            <Text style={{ color: UI.text, fontWeight: "800" }}>
              Комментарий: <Text style={{ color: UI.sub, fontWeight: "800" }}>{noteText}</Text>
            </Text>
          </>
        ) : null}
      </View>

      <View style={{ height: 12 }} />

      <View style={S.section}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: UI.text, fontWeight: "900" }}>Вложения: {files.length}</Text>

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
            <Text style={{ color: UI.text, fontWeight: "900", fontSize: 12 }}>{busyKey ? "…" : "Обновить"}</Text>
          </Pressable>
        </View>

        <View style={{ height: 10 }} />

        {attState === "error" ? (
          <AttachmentStateBlock tone="error" title="Не удалось загрузить вложения" message={attMessage} />
        ) : null}

        {attState === "degraded" ? (
          <AttachmentStateBlock tone="warning" title="Вложения загружены в degraded mode" message={attMessage} />
        ) : null}

        {showAttachmentEmpty ? (
          <Text style={{ color: UI.sub, fontWeight: "800" }}>{attMessage || "Вложения отсутствуют."}</Text>
        ) : null}

        {files.length > 0 ? (
          <View style={{ gap: 8 }}>
            {files.map((file) => (
              <Pressable
                key={String(file.id)}
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
                <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                  📎 {String(file.file_name ?? "file")}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {showInvoiceBtn || showReportBtn ? (
          <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
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
                <Text style={{ color: UI.text, fontWeight: "900" }}>Счёт</Text>
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
                <Text style={{ color: UI.text, fontWeight: "900" }}>Отчёт</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={{ height: 12 }} />

      <View style={S.section}>
        <Pressable
          onPress={() => setShowBank((value) => !value)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: UI.text, fontWeight: "900" }}>Реквизиты {hasAnyBank ? "" : "(пусто)"}</Text>
          <Text style={{ color: UI.sub, fontWeight: "900" }}>{showBank ? "▲" : "▼"}</Text>
        </Pressable>

        {showBank ? (
          <View
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <Text style={{ color: UI.text, fontWeight: "900" }}>
              Банк: <Text style={{ color: UI.sub, fontWeight: "800" }}>{bankName || "—"}</Text>
            </Text>

            <View style={{ height: 10 }} />
            <Text style={{ color: UI.text, fontWeight: "900" }}>
              БИК: <Text style={{ color: UI.sub, fontWeight: "800" }}>{bik || "—"}</Text>
            </Text>

            <View style={{ height: 10 }} />
            <Text style={{ color: UI.text, fontWeight: "900" }}>
              Р/С: <Text style={{ color: UI.sub, fontWeight: "800" }}>{rs || "—"}</Text>
            </Text>

            <View style={{ height: 10 }} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: UI.text, fontWeight: "900" }}>
                  ИНН: <Text style={{ color: UI.sub, fontWeight: "800" }}>{inn || "—"}</Text>
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: UI.text, fontWeight: "900" }}>
                  КПП: <Text style={{ color: UI.sub, fontWeight: "800" }}>{kpp || "—"}</Text>
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}
