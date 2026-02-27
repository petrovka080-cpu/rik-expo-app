import React from "react";
import { Pressable, Text, View } from "react-native";
import { UI, s } from "./director.styles";

type InvoiceRow = {
  id: string | number;
  title?: string | null;
  amount?: number | null;
  isCritical?: boolean;
  isOverdue?: boolean;
  approvedIso?: string | null;
  invoiceIso?: string | null;
  dueIso?: string | null;
};

type SupplierPayload = {
  amount?: number;
  count?: number;
  overdueCount?: number;
  criticalCount?: number;
  invoices?: InvoiceRow[];
};

type ErrorLike = { message?: unknown };

export default function DirectorFinanceSupplierModal(p: {
  visible?: boolean;
  onClose?: () => void;
  loading: boolean;
  periodShort?: string;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf: () => void | Promise<void>;
  supplier: SupplierPayload | null;
  money: (v: number) => string;
  fmtDateOnly: (iso?: string | null) => string;
}) {
  const sup = p.supplier;

  return !sup ? (
    <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>
  ) : (
    <View>
      <View style={[s.reqNoteBox, { borderLeftColor: "#F59E0B" }]}>
        <Text style={[s.reqNoteLine, { fontWeight: "900" }]} numberOfLines={1}>
          Долг: {p.money(Number(sup.amount ?? 0))} KGS · счетов {Number(sup.count ?? 0)}
        </Text>
        <Text style={[s.reqNoteLine, { fontWeight: "900" }]} numberOfLines={1}>
          Требует оплаты: {Number(sup.overdueCount ?? 0)} · критично (в периоде): {Number(sup.criticalCount ?? 0)}
        </Text>

        <View style={{ marginTop: 10 }}>
          <Pressable
            disabled={p.loading}
            onPress={async () => {
              if (p.loading) return;
              try {
                await Promise.resolve(p.onPdf());
              } catch (e) {
                const message =
                  e && typeof e === "object" && "message" in e
                    ? String((e as ErrorLike).message ?? e)
                    : String(e);
                console.log("PDF ERR", message);
              }
            }}
            style={{
              height: 44,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(34,197,94,0.16)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.55)",
              opacity: p.loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: UI.text, fontWeight: "900" }}>{p.loading ? "..." : "Сводка (PDF)"}</Text>
          </Pressable>
        </View>
      </View>

      {(sup.invoices || []).map((it) => (
        <View
          key={String(it.id)}
          style={[
            s.mobCard,
            {
              marginBottom: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              flexDirection: "column",
              alignItems: "stretch",
            },
          ]}
        >
          <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>
            {it.title}
          </Text>

          <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={3}>
            {p.money(Number(it.amount ?? 0))} KGS
            {it.isCritical ? " · критично" : it.isOverdue ? " · требует оплаты" : ""}
            {it.approvedIso ? ` · утв. ${p.fmtDateOnly(it.approvedIso)}` : ""}
            {it.invoiceIso ? ` · счет ${p.fmtDateOnly(it.invoiceIso)}` : ""}
            {it.dueIso ? ` · срок ${p.fmtDateOnly(it.dueIso)}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}
