import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import type { FinKindSupplierRow, FinanceSummary, FinSpendSummary } from "./director.finance";
import { UI, s } from "./director.styles";

type Props = {
  visible?: boolean;
  onClose?: () => void;
  periodShort?: string;
  loading: boolean;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;
  sum: FinanceSummary | null | undefined;
  truth?: DirectorFinanceCanonicalScope["spend"] | null;
  diagnostics?: DirectorFinanceCanonicalScope["diagnostics"] | null;
  spendSummary: FinSpendSummary;
  money: (v: number) => string;
  onOpenKind?: (kindName: string, list: FinKindSupplierRow[]) => void;
};

const OVERPAY_KIND = "Переплаты / авансы";

const modeLabel = (diagnostics: DirectorFinanceCanonicalScope["diagnostics"] | null | undefined) =>
  diagnostics?.displayMode === "canonical_v3" ? "canonical_v3" : "fallback_legacy";

export default function DirectorFinanceSpendModal(props: Props) {
  const [kindsOpen, setKindsOpen] = React.useState(false);

  React.useEffect(() => {
    if (props.visible === false) setKindsOpen(false);
  }, [props.visible]);

  const toggleKindsOpen = React.useCallback(() => {
    setKindsOpen((current) => !current);
  }, []);

  const openOverpayAsKind = React.useCallback(() => {
    props.onOpenKind?.(OVERPAY_KIND, props.spendSummary.overpaySuppliers);
  }, [props]);

  const approved = props.truth?.approved ?? props.spendSummary.header.approved;
  const paid = props.truth?.paid ?? props.spendSummary.header.paid;
  const toPay = props.truth?.toPay ?? props.spendSummary.header.toPay;
  const overpay = props.truth?.overpay ?? props.spendSummary.header.overpay;

  return (
    <ScrollView
      style={{ flex: 1, minHeight: 0 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ flexDirection: "column", alignItems: "stretch" }}>
        <Text style={{ color: UI.text, fontWeight: "900" }}>
          Аллоцировано: <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(approved)}</Text>
        </Text>

        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
          Оплачено по аллокациям: <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(paid)}</Text>
        </Text>

        <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
          К оплате по аллокациям: <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(toPay)}</Text>
        </Text>

        {overpay > 0 ? (
          <Pressable onPress={openOverpayAsKind} hitSlop={12}>
            <Text style={{ color: "#F59E0B", fontWeight: "900", marginTop: 8 }}>
              Переплата: <Text style={{ color: UI.sub }}>{props.loading ? "..." : props.money(overpay)}</Text>
            </Text>
          </Pressable>
        ) : null}

        <Text style={[s.mobMeta, { marginTop: 8 }]} numberOfLines={3}>
          {props.truth?.allocationCoverageHint ??
            "Расходы считаются по аллокациям и показывают отдельный allocation-level контур, а не долг по предложениям."}
        </Text>

        <Text style={[s.mobMeta, { marginTop: 6 }]} numberOfLines={2}>
          {`Режим: ${modeLabel(props.diagnostics)} · Расходы: allocation-level · Источник: ${props.diagnostics?.spendSource ?? "panel_spend_header"}`}
        </Text>

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
            {!props.spendSummary.kindRows.length ? (
              <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>
            ) : (
              props.spendSummary.kindRows.map((row) => (
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
                    {`Аллоцировано: ${props.money(row.approved)} · оплачено: ${props.money(row.paid)} · к оплате: ${props.money(row.toPay)}`}
                  </Text>

                  {row.overpay > 0 ? (
                    <Text style={{ color: "#F59E0B", fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                      {`Переплата: ${props.money(row.overpay)}`}
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
      </View>
    </ScrollView>
  );
}
