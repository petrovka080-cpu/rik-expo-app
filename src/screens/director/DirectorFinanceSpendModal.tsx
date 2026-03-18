import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { UI, s } from "./director.styles";
import { nnum, type FinKindSupplierRow, type FinanceSummary, type FinSpendRow } from "./director.finance";

type Props = {
  visible?: boolean;
  onClose?: () => void;
  periodShort?: string;
  loading: boolean;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;
  sum: FinanceSummary | null | undefined;
  spendRows: FinSpendRow[];
  money: (v: number) => string;
  onOpenKind?: (kindName: string, list: FinKindSupplierRow[]) => void;
};

const FALLBACK_KIND = "Другое";
const KIND_ORDER = ["Материалы", "Работы", "Услуги", FALLBACK_KIND];
const OVERPAY_KIND = "Переплаты / авансы";

type SpendKindRow = {
  kind: string;
  approved: number;
  paid: number;
  overpay: number;
  toPay: number;
  suppliers: FinKindSupplierRow[];
};

type SpendDerivedState = {
  rows: FinSpendRow[];
  header: {
    approved: number;
    paid: number;
    toPay: number;
    overpay: number;
  };
  kindRows: SpendKindRow[];
  overpayTotal: number;
  overpaySuppliers: FinKindSupplierRow[];
};

export default function DirectorFinanceSpendModal(props: Props) {
  const [kindsOpen, setKindsOpen] = React.useState(false);

  React.useEffect(() => {
    if (props.visible === false) setKindsOpen(false);
  }, [props.visible]);

  const derived = React.useMemo<SpendDerivedState>(() => {
    const rows = Array.isArray(props.spendRows) ? props.spendRows : [];
    let approved = 0;
    let paid = 0;
    let overpay = 0;
    const byProposal = new Map<string, { approved: number; paid: number }>();
    const totalsByKind = new Map<string, { approved: number; paid: number; overpay: number }>();
    const suppliersByKind = new Map<string, Map<string, FinKindSupplierRow>>();
    const overpayBySupplier = new Map<string, FinKindSupplierRow>();

    for (const row of rows) {
      const proposalId = String(row.proposal_id ?? "").trim();
      const kindName = String(row.kind_name ?? FALLBACK_KIND).trim() || FALLBACK_KIND;
      const supplierName = String(row.supplier ?? "-").trim() || "-";
      const approvedValue = nnum(row.approved_alloc);
      const paidValue = nnum(row.paid_alloc_cap);
      const overpayValue = nnum(row.overpay_alloc);

      approved += approvedValue;
      paid += paidValue;
      overpay += overpayValue;

      if (proposalId) {
        const proposalTotals = byProposal.get(proposalId) ?? { approved: 0, paid: 0 };
        proposalTotals.approved += approvedValue;
        proposalTotals.paid += paidValue;
        byProposal.set(proposalId, proposalTotals);
      }

      const kindTotals = totalsByKind.get(kindName) ?? { approved: 0, paid: 0, overpay: 0 };
      kindTotals.approved += approvedValue;
      kindTotals.paid += paidValue;
      kindTotals.overpay += overpayValue;
      totalsByKind.set(kindName, kindTotals);

      const kindSuppliers = suppliersByKind.get(kindName) ?? new Map<string, FinKindSupplierRow>();
      const supplierTotals = kindSuppliers.get(supplierName) ?? {
        supplier: supplierName,
        approved: 0,
        paid: 0,
        overpay: 0,
        count: 0,
      };
      supplierTotals.approved += approvedValue;
      supplierTotals.paid += paidValue;
      supplierTotals.overpay += overpayValue;
      supplierTotals.count += 1;
      kindSuppliers.set(supplierName, supplierTotals);
      suppliersByKind.set(kindName, kindSuppliers);

      if (overpayValue > 0) {
        const overpayTotals = overpayBySupplier.get(supplierName) ?? {
          supplier: supplierName,
          approved: 0,
          paid: 0,
          overpay: 0,
          count: 0,
        };
        overpayTotals.overpay += overpayValue;
        overpayTotals.count += 1;
        overpayBySupplier.set(supplierName, overpayTotals);
      }
    }

    let toPay = 0;
    for (const proposalTotals of byProposal.values()) {
      toPay += Math.max(proposalTotals.approved - proposalTotals.paid, 0);
    }

    const orderedKinds = [
      ...KIND_ORDER.filter((kind) => totalsByKind.has(kind)),
      ...Array.from(totalsByKind.keys()).filter((kind) => !KIND_ORDER.includes(kind)),
    ];

    const kindRows = orderedKinds
      .map<SpendKindRow | null>((kind) => {
        const totals = totalsByKind.get(kind);
        if (!totals) return null;
        if (totals.approved === 0 && totals.paid === 0 && totals.overpay === 0) return null;

        const suppliers = Array.from((suppliersByKind.get(kind) ?? new Map()).values()).sort(
          (left, right) => right.approved - left.approved,
        );

        return {
          kind,
          approved: totals.approved,
          paid: totals.paid,
          overpay: totals.overpay,
          toPay: Math.max(totals.approved - totals.paid, 0),
          suppliers,
        };
      })
      .filter((row): row is SpendKindRow => row != null);

    return {
      rows,
      header: { approved, paid, toPay, overpay },
      kindRows,
      overpayTotal: overpay,
      overpaySuppliers: Array.from(overpayBySupplier.values()).sort((left, right) => right.overpay - left.overpay),
    };
  }, [props.spendRows]);

  const toggleKindsOpen = React.useCallback(() => {
    setKindsOpen((current) => !current);
  }, []);

  const openOverpayAsKind = React.useCallback(() => {
    props.onOpenKind?.(OVERPAY_KIND, derived.overpaySuppliers);
  }, [derived.overpaySuppliers, props]);

  return (
    <ScrollView
      style={{ flex: 1, minHeight: 0 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ flexDirection: "column", alignItems: "stretch" }}>
        <Text style={{ color: UI.text, fontWeight: "900" }}>
          Утверждено: <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(derived.header.approved)}</Text>
        </Text>

        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
          Оплачено: <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(derived.header.paid)}</Text>
        </Text>

        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
          К оплате: <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(derived.header.toPay)}</Text>
        </Text>

        {derived.header.overpay > 0 ? (
          <Pressable onPress={openOverpayAsKind} hitSlop={12}>
            <Text style={{ color: "#F59E0B", fontWeight: "900", marginTop: 8 }}>
              Переплата/аванс: <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(derived.header.overpay)}</Text>
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={toggleKindsOpen}
          hitSlop={10}
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
              Расходы по видам
            </Text>
            <Text style={{ color: UI.sub, fontWeight: "800", fontSize: 12 }} numberOfLines={1}>
              Материалы · Работы · Услуги · Другое
            </Text>
          </View>

          <Text style={{ color: UI.sub, fontWeight: "900", fontSize: 16, marginLeft: 10 }}>{kindsOpen ? "▴" : "▾"}</Text>
        </Pressable>

        {kindsOpen ? (
          <View style={{ marginTop: 10 }}>
            {!derived.kindRows.length ? (
              <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>
            ) : (
              derived.kindRows.map((row) => (
                <Pressable
                  key={row.kind}
                  onPress={() => props.onOpenKind?.(row.kind, row.suppliers)}
                  hitSlop={12}
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
                    {row.kind}
                  </Text>

                  <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={2}>
                    {`Утверждено: ${props.money(row.approved)} · оплачено: ${props.money(row.paid)} · к оплате: ${props.money(row.toPay)}`}
                  </Text>

                  {row.overpay > 0 ? (
                    <Text style={{ color: "#F59E0B", fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                      {`Переплата/аванс: ${props.money(row.overpay)}`}
                    </Text>
                  ) : null}

                  <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                    {`Поставщиков: ${row.suppliers.length}`}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        {!kindsOpen && derived.overpayTotal > 0 ? (
          <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 12 }}>
            {`Переплата/аванс по периоду: ${props.money(derived.overpayTotal)}`}
          </Text>
        ) : null}

        {props.sum && !derived.rows.length ? (
          <View style={[s.mobCard, { marginTop: 14 }]}>
            <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет строк расходов за выбранный период</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
