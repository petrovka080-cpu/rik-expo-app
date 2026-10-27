import React from "react";
import { Pressable, Text, View } from "react-native";

import { FlashList } from "@/src/ui/FlashList";

import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import type { FinSupplierDebt } from "./director.finance";
import { UI, s } from "./director.styles";

type Props = {
  visible?: boolean;
  onClose?: () => void;
  periodShort?: string;
  loading: boolean;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;
  canonicalScope: DirectorFinanceCanonicalScope | null;
  truth?: DirectorFinanceCanonicalScope["obligations"] | null;
  diagnostics?: DirectorFinanceCanonicalScope["diagnostics"] | null;
  workInclusion?: DirectorFinanceCanonicalScope["workInclusion"] | null;
  money: (v: number) => string;
  FIN_CRITICAL_DAYS: number;
  openSupplier: (supplierRow: FinSupplierDebt) => void;
};

type FlashListLayout = { size?: number };

const pct = (num: number, den: number) => {
  const a = Number(num ?? 0);
  const b = Number(den ?? 0);
  if (!b || b <= 0) return 0;
  return Math.round((a / b) * 100);
};

export default function DirectorFinanceDebtModal(props: Props) {
  const [suppliersOpen, setSuppliersOpen] = React.useState(false);

  React.useEffect(() => {
    if (props.visible === false) setSuppliersOpen(false);
  }, [props.visible]);

  const suppliers = React.useMemo<FinSupplierDebt[]>(
    () =>
      Array.isArray(props.canonicalScope?.suppliers)
        ? props.canonicalScope.suppliers.map((row) => ({
            supplier: row.supplierName,
            count: row.invoiceCount,
            approved: row.approvedTotal,
            paid: row.paidTotal,
            toPay: row.debtTotal,
            overdueCount: row.overdueCount,
            criticalCount: row.criticalCount,
          }))
        : [],
    [props.canonicalScope?.suppliers],
  );

  const overdueCount = props.canonicalScope?.summary.overdueCount ?? 0;
  const overdueAmount = props.canonicalScope?.summary.overdueAmount ?? 0;
  const criticalCount = props.canonicalScope?.summary.criticalCount ?? 0;
  const criticalAmount = props.canonicalScope?.summary.criticalAmount ?? 0;
  const debtCount = props.canonicalScope?.summary.debtCount ?? 0;
  const approvedAmount = props.truth?.approved ?? 0;
  const paidAmount = props.truth?.paid ?? 0;
  const debtAmount = props.truth?.debt ?? 0;
  const overduePct = pct(overdueAmount, debtAmount);
  const criticalPct = pct(criticalAmount, debtAmount);

  const keyExtractor = React.useCallback(
    (item: FinSupplierDebt, index: number) => `${String(item.supplier ?? "supplier")}:${index}`,
    [],
  );

  const renderSupplierRow = React.useCallback(
    ({ item }: { item: FinSupplierDebt }) => (
      <Pressable
        testID="director-finance-debt-supplier-row"
        onPress={() => props.openSupplier(item)}
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
              {item.supplier}
            </Text>
          </View>
          <Text style={{ color: UI.sub, fontWeight: "900" }} numberOfLines={1}>
            {props.money(item.toPay)} KGS
          </Text>
        </View>

        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
          {`Счетов ${item.count} · требует оплаты ${item.overdueCount} · критично ${item.criticalCount}`}
        </Text>
      </Pressable>
    ),
    [props],
  );

  const listHeader = React.useMemo(
    () => (
      <View>
        <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>
          Утверждено по предложениям:{" "}
          <Text style={{ color: UI.sub }}>{props.loading ? "..." : `${props.money(approvedAmount)} KGS`}</Text>
        </Text>

        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }} numberOfLines={2}>
          Оплачено:{" "}
          <Text style={{ color: UI.sub }}>{props.loading ? "..." : `${props.money(paidAmount)} KGS`}</Text>
        </Text>

        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }} numberOfLines={2}>
          Долг по предложениям:{" "}
          <Text style={{ color: UI.sub }}>
            {props.loading ? "..." : `${debtCount} сч.`} · {props.loading ? "..." : `${props.money(debtAmount)} KGS`}
          </Text>
        </Text>

        <Text style={{ color: "#F59E0B", fontWeight: "900", marginTop: 14 }} numberOfLines={2}>
          Требует оплаты:{" "}
          <Text style={{ color: UI.sub }}>
            {props.loading ? "..." : `${overdueCount} сч.`} · {props.loading ? "..." : `${props.money(overdueAmount)} KGS`}
            {!props.loading && debtAmount > 0 ? ` · ${overduePct}%` : ""}
          </Text>
        </Text>

        {criticalCount > 0 ? (
          <Text style={{ color: UI.text, fontWeight: "900", marginTop: 10 }} numberOfLines={2}>
            Критично (в периоде):{" "}
            <Text style={{ color: UI.sub }}>
              {props.loading ? "..." : `${criticalCount} сч.`} · {props.loading ? "..." : `${props.money(criticalAmount)} KGS`}
              {!props.loading && debtAmount > 0 ? ` · ${criticalPct}%` : ""}
            </Text>
          </Text>
        ) : null}

        <Pressable
          testID="director-finance-debt-suppliers-toggle"
          onPress={() => setSuppliersOpen((current) => !current)}
          style={[
            s.mobCard,
            {
              marginTop: 14,
              marginBottom: suppliersOpen ? 10 : 0,
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
            {suppliers[0] ? (
              <Text style={{ color: UI.sub, fontWeight: "800", fontSize: 12 }} numberOfLines={1}>
                {`Лидер: ${suppliers[0].supplier} · ${props.money(suppliers[0].toPay)} KGS`}
              </Text>
            ) : null}
          </View>

          <Text style={{ color: UI.sub, fontWeight: "900", fontSize: 16, marginLeft: 10 }}>
            {suppliersOpen ? "▴" : "▾"}
          </Text>
        </Pressable>
      </View>
    ),
    [approvedAmount, criticalAmount, criticalCount, criticalPct, debtAmount, debtCount, overdueAmount, overdueCount, overduePct, paidAmount, props, suppliers, suppliersOpen],
  );

  return (
    <FlashList
      style={{ flex: 1, minHeight: 0 }}
      data={suppliersOpen ? suppliers : []}
      renderItem={renderSupplierRow}
      keyExtractor={keyExtractor}
      overrideItemLayout={(layout: FlashListLayout) => {
        layout.size = 88;
      }}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={suppliersOpen ? <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text> : null}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}
