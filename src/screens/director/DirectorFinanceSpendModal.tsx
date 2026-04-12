import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import type { FinKindSupplierRow, FinSpendSummary } from "./director.finance";
import { UI, s } from "./director.styles";

type Props = {
  visible?: boolean;
  onClose?: () => void;
  periodShort?: string;
  loading: boolean;
  onOpenPeriod?: () => void;
  onRefresh?: () => void;
  onPdf?: () => void;
  truth?: DirectorFinanceCanonicalScope["spend"] | null;
  diagnostics?: DirectorFinanceCanonicalScope["diagnostics"] | null;
  workInclusion?: DirectorFinanceCanonicalScope["workInclusion"] | null;
  spendBreakdown: FinSpendSummary | null;
  money: (v: number) => string;
  onOpenKind?: (kindName: string, list: FinKindSupplierRow[]) => void;
};

const OVERPAY_KIND = "Переплаты / авансы";

const modeLabel = (diagnostics: DirectorFinanceCanonicalScope["diagnostics"] | null | undefined) =>
  diagnostics?.displayMode === "canonical_v3" ? "canonical_v3" : "fallback_legacy";

const SPEND_WORK_NOTE_PREFIX = "\u0421\u043e\u0441\u0442\u0430\u0432 \u0440\u0430\u0441\u0445\u043e\u0434\u043e\u0432";
const SPEND_KINDS_LABEL = "\u0412\u0438\u0434\u044b \u0432 \u0440\u0430\u0441\u0445\u043e\u0434\u0430\u0445";

export default function DirectorFinanceSpendModal(props: Props) {
  const [kindsOpen, setKindsOpen] = React.useState(false);

  React.useEffect(() => {
    if (props.visible === false) setKindsOpen(false);
  }, [props.visible]);

  const toggleKindsOpen = React.useCallback(() => {
    setKindsOpen((current) => !current);
  }, []);

  const openOverpayAsKind = React.useCallback(() => {
    props.onOpenKind?.(OVERPAY_KIND, props.spendBreakdown?.overpaySuppliers ?? []);
  }, [props]);

  const approved = props.spendBreakdown?.header.approved ?? 0;
  const paid = props.spendBreakdown?.header.paid ?? 0;
  const toPay = props.spendBreakdown?.header.toPay ?? 0;
  const overpay = props.spendBreakdown?.header.overpay ?? 0;
  const kindRows = props.spendBreakdown?.kindRows ?? [];
  const observedKindsLabel = React.useMemo(() => {
    const kinds = Array.isArray(props.workInclusion?.observedKinds)
      ? props.workInclusion.observedKinds.filter((value) => String(value ?? "").trim().length > 0)
      : [];
    return kinds.join(" \u00b7 ");
  }, [props.workInclusion]);

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

        {props.workInclusion ? (
          <Text style={[s.mobMeta, { marginTop: 6 }]} numberOfLines={4}>
            {`${SPEND_WORK_NOTE_PREFIX}: ${props.workInclusion.explanation}`}
          </Text>
        ) : null}

        {observedKindsLabel ? (
          <Text style={[s.mobMeta, { marginTop: 6 }]} numberOfLines={2}>
            {`${SPEND_KINDS_LABEL}: ${observedKindsLabel}`}
          </Text>
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
            {!kindRows.length ? (
              <Text style={{ color: UI.sub, fontWeight: "800" }}>Нет данных</Text>
            ) : (
              kindRows.map((row) => (
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
