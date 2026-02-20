import React from "react";
import { View, Text, Pressable } from "react-native";
import { UI, s } from "./director.styles";

export default function DirectorFinanceSupplierModal(p: {
  // ⚠️ оставляем, чтобы не ломать вызовы/пропсы, но внутри это уже не модалка
  visible?: boolean;
  onClose?: () => void;

  loading: boolean;
  periodShort?: string;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf: () => void;

  supplier: any | null;
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
          Долг: {p.money(sup.amount)} KGS · счетов {sup.count}
        </Text>
        <Text style={[s.reqNoteLine, { fontWeight: "900" }]} numberOfLines={1}>
          Требует оплаты: {sup.overdueCount} · критично (в периоде): {sup.criticalCount}
        </Text>

        <View style={{ marginTop: 10 }}>
          <Pressable
            disabled={p.loading}
            onPress={async () => {
              if (p.loading) return;
              try {
                await (p.onPdf as any)();
              } catch (e) {
                console.log("PDF ERR", e);
                try {
                  alert("PDF ERR: " + String((e as any)?.message ?? e));
                } catch {}
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
            <Text style={{ color: UI.text, fontWeight: "900" }}>
              {p.loading ? "…" : "Сводка (PDF)"}
            </Text>
          </Pressable>
        </View>
      </View>

      {(sup.invoices || []).map((it: any) => (
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
            {p.money(it.amount)} KGS
            {it.isCritical ? " · 🔥 критично" : it.isOverdue ? " · ⚠️ требует оплаты" : ""}
            {it.approvedIso ? ` · утв. ${p.fmtDateOnly(it.approvedIso)}` : ""}
            {it.invoiceIso ? ` · счёт ${p.fmtDateOnly(it.invoiceIso)}` : ""}
            {it.dueIso ? ` · срок ${p.fmtDateOnly(it.dueIso)}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

