import React from "react";
import { View, Text, Pressable } from "react-native";
import { UI, s } from "./director.styles";

type Props = {
  // ⚠️ эти поля могут остаться в типе (чтобы не ломать импорт/вызовы),
  // но внутри компонента они больше не используются:
  visible?: boolean;
  onClose?: () => void;

  periodShort?: string;
  loading: boolean;

  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;

  rep: {
    debtAmount: number;
    debtCount: number;
    overdueAmount: number;
    overdueCount: number;
    criticalAmount: number;
    criticalCount: number;
    suppliers: any[];
    leader: any | null;
  } | null | undefined;

  money: (v: number) => string;
  FIN_CRITICAL_DAYS: number;
  openSupplier: (srow: any) => void;
};

const pct = (num: number, den: number) => {
  const a = Number(num ?? 0);
  const b = Number(den ?? 0);
  if (!b || b <= 0) return 0;
  return Math.round((a / b) * 100);
};

export default function DirectorFinanceDebtModal(p: Props) {
  const rep = p.rep;
  const [suppliersOpen, setSuppliersOpen] = React.useState(false);

  React.useEffect(() => {
    // когда "страница" скрыта (родитель меняет finPage) — сбрасываем раскрытие
    // (родитель не обязан передавать visible, но если передаст — используем)
    if (p.visible === false) setSuppliersOpen(false);
  }, [p.visible]);

  const overdueCount = rep?.overdueCount ?? 0;
  const overdueAmount = rep?.overdueAmount ?? 0;

  const criticalCount = rep?.criticalCount ?? 0;
  const criticalAmount = rep?.criticalAmount ?? 0;

  const debtCount = rep?.debtCount ?? 0;
  const debtAmount = rep?.debtAmount ?? 0;

  const overduePct = pct(overdueAmount, debtAmount);
  const criticalPct = pct(criticalAmount, debtAmount);

  return (
    <View>
      <Text style={{ color: "#F59E0B", fontWeight: "900" }} numberOfLines={2}>
        ⚠️ Требует оплаты:{" "}
        <Text style={{ color: UI.sub }}>
          {p.loading ? "…" : `${overdueCount} сч.`} · {p.loading ? "…" : `${p.money(overdueAmount)} KGS`}
          {!p.loading && debtAmount > 0 ? ` · ${overduePct}%` : ""}
        </Text>
      </Text>

      {(criticalCount ?? 0) > 0 ? (
        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 10 }} numberOfLines={2}>
          🔥 Критично (в периоде):{" "}
          <Text style={{ color: UI.sub }}>
            {p.loading ? "…" : `${criticalCount} сч.`} · {p.loading ? "…" : `${p.money(criticalAmount)} KGS`}
            {!p.loading && debtAmount > 0 ? ` · ${criticalPct}%` : ""}
          </Text>
        </Text>
      ) : null}

      <Text style={{ color: UI.text, fontWeight: "900", marginTop: 10 }} numberOfLines={2}>
        💳 К оплате:{" "}
        <Text style={{ color: UI.sub }}>
          {p.loading ? "…" : `${debtCount} сч.`} · {p.loading ? "…" : `${p.money(debtAmount)} KGS`}
        </Text>
      </Text>

      <Pressable
        onPress={() => setSuppliersOpen((v) => !v)}
        style={[
          s.mobCard,
          {
            marginTop: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 14 }} numberOfLines={1}>
            Поставщики (долг)
          </Text>
          {rep?.leader ? (
            <Text style={{ color: UI.sub, fontWeight: "800", fontSize: 12 }} numberOfLines={1}>
              Лидер: {rep.leader.supplier} · {p.money(rep.leader.amount)} KGS
            </Text>
          ) : null}
        </View>

        <Text style={{ color: UI.sub, fontWeight: "900", fontSize: 16, marginLeft: 10 }}>
          {suppliersOpen ? "▴" : "▾"}
        </Text>
      </Pressable>

      {suppliersOpen ? (
        <View style={{ marginTop: 10 }}>
          {!rep?.suppliers?.length ? (
            <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>
          ) : (
            rep.suppliers.map((srow: any) => (
              <Pressable
                key={String(srow.supplier)}
                onPress={() => p.openSupplier(srow)}
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                      {srow.supplier}
                    </Text>
                  </View>

                  <Text style={{ color: UI.sub, fontWeight: "900" }} numberOfLines={1}>
                    {p.money(srow.amount)} KGS
                  </Text>
                </View>

                <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
                  Счетов {srow.count} · требует оплаты {srow.overdueCount} · критично {srow.criticalCount}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

