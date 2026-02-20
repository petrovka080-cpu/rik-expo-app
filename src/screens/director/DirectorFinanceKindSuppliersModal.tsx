// src/screens/director/DirectorFinanceKindSuppliersModal.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { UI, s } from "./director.styles";

type SupplierAgg = {
  supplier: string;
  approved: number;
  paid: number;
  overpay: number;
  count: number;
};

export default function DirectorFinanceKindSuppliersModal(p: {
  // ⚠️ оставляем в типе, чтобы не ломать вызовы, но внутри не используем
  visible?: boolean;
  onClose?: () => void;

  loading: boolean;
  periodShort?: string;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;

  kindName: string;
  list: SupplierAgg[];

  money: (v: number) => string;

  onOpenSupplier: (payload: { supplier: string; _kindName?: string }) => void;
}) {
  return !p.kindName ? (
    <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет выбранного вида</Text>
  ) : !p.list?.length ? (
    <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>
  ) : (
    <View style={{ flexDirection: "column", alignItems: "stretch" }}>
      {p.list.map((it, idx) => {
        const supplierName = String(it.supplier || "—");
        return (
          <Pressable
            key={`${p.kindName}:${supplierName}:${idx}`}
            onPress={() => {
              const name = String(it.supplier || "—").trim() || "—";
              p.onOpenSupplier({ supplier: name, _kindName: p.kindName });
            }}
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
            <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
              {supplierName}
            </Text>

            <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={2}>
              Утверждено: {p.money(it.approved)} · оплачено: {p.money(it.paid)}
              {it.overpay > 0 ? ` · переплата ${p.money(it.overpay)}` : ""}
            </Text>

            <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
              Счетов: {it.count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

