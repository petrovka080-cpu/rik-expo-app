import React from "react";
import { Pressable, Text, View } from "react-native";

import { FlashList } from "@/src/ui/FlashList";
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
type FinSpendKindRow = FinSpendSummary["kindRows"][number];
const EMPTY_SPEND_KIND_ROWS: FinSpendKindRow[] = [];
const EMPTY_FIN_KIND_SUPPLIER_ROWS: FinKindSupplierRow[] = [];

export default function DirectorFinanceSpendModal(props: Props) {
  const {
    diagnostics,
    loading,
    money,
    onOpenKind,
    spendBreakdown,
    truth,
    visible,
    workInclusion,
  } = props;
  const [kindsOpen, setKindsOpen] = React.useState(false);

  React.useEffect(() => {
    if (visible === false) setKindsOpen(false);
  }, [visible]);

  const toggleKindsOpen = React.useCallback(() => {
    setKindsOpen((current) => !current);
  }, []);

  const overpaySuppliers = spendBreakdown?.overpaySuppliers ?? EMPTY_FIN_KIND_SUPPLIER_ROWS;
  const openOverpayAsKind = React.useCallback(() => {
    onOpenKind?.(OVERPAY_KIND, overpaySuppliers);
  }, [onOpenKind, overpaySuppliers]);

  const approved = spendBreakdown?.header.approved ?? 0;
  const paid = spendBreakdown?.header.paid ?? 0;
  const toPay = spendBreakdown?.header.toPay ?? 0;
  const overpay = spendBreakdown?.header.overpay ?? 0;
  const kindRows = spendBreakdown?.kindRows ?? EMPTY_SPEND_KIND_ROWS;
  const visibleKindRows = React.useMemo(
    () => (kindsOpen ? kindRows : EMPTY_SPEND_KIND_ROWS),
    [kindRows, kindsOpen],
  );
  const observedKindsLabel = React.useMemo(() => {
    const kinds = Array.isArray(workInclusion?.observedKinds)
      ? workInclusion.observedKinds.filter((value) => String(value ?? "").trim().length > 0)
      : [];
    return kinds.join(" \u00b7 ");
  }, [workInclusion]);

  const keyExtractor = React.useCallback((row: FinSpendKindRow, index: number) => row.kind || `kind:${index}`, []);

  const renderKindRow = React.useCallback(
    ({ item: row }: { item: FinSpendKindRow }) => (
      <Pressable
        onPress={() => onOpenKind?.(row.kind, row.suppliers)}
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
          {`Аллоцировано: ${money(row.approved)} · оплачено: ${money(row.paid)} · к оплате: ${money(row.toPay)}`}
        </Text>

        {row.overpay > 0 ? (
          <Text style={{ color: "#F59E0B", fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
            {`Переплата: ${money(row.overpay)}`}
          </Text>
        ) : null}

        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
          {`Поставщиков: ${row.suppliers.length}`}
        </Text>
      </Pressable>
    ),
    [money, onOpenKind],
  );

  const header = (
    <View style={{ flexDirection: "column", alignItems: "stretch" }}>
      <Text style={{ color: UI.text, fontWeight: "900" }}>
        Аллоцировано: <Text style={{ color: UI.sub }}>{loading ? "..." : money(approved)}</Text>
      </Text>

      <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
        Оплачено по аллокациям: <Text style={{ color: UI.sub }}>{loading ? "..." : money(paid)}</Text>
      </Text>

      <Text style={{ color: UI.text, fontWeight: "900", marginTop: 8 }}>
        К оплате по аллокациям: <Text style={{ color: UI.sub }}>{loading ? "..." : money(toPay)}</Text>
      </Text>

      {overpay > 0 ? (
        <Pressable onPress={openOverpayAsKind} hitSlop={12}>
          <Text style={{ color: "#F59E0B", fontWeight: "900", marginTop: 8 }}>
            Переплата: <Text style={{ color: UI.sub }}>{loading ? "..." : money(overpay)}</Text>
          </Text>
        </Pressable>
      ) : null}

      <Text style={[s.mobMeta, { marginTop: 8 }]} numberOfLines={3}>
        {truth?.allocationCoverageHint ??
          "Расходы считаются по аллокациям и показывают отдельный allocation-level контур, а не долг по предложениям."}
      </Text>

      <Text style={[s.mobMeta, { marginTop: 6 }]} numberOfLines={2}>
        {`Режим: ${modeLabel(diagnostics)} · Расходы: allocation-level · Источник: ${diagnostics?.spendSource ?? "panel_spend_header"}`}
      </Text>

      {workInclusion ? (
        <Text style={[s.mobMeta, { marginTop: 6 }]} numberOfLines={4}>
          {`${SPEND_WORK_NOTE_PREFIX}: ${workInclusion.explanation}`}
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
            marginBottom: kindsOpen ? 10 : 0,
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

        <Text style={{ color: UI.sub, fontWeight: "900", fontSize: 16, marginLeft: 10 }}>
          {kindsOpen ? "▴" : "▾"}
        </Text>
      </Pressable>
    </View>
  );

  return (
    <FlashList<FinSpendKindRow>
      style={{ flex: 1, minHeight: 0 }}
      data={visibleKindRows}
      keyExtractor={keyExtractor}
      renderItem={renderKindRow}
      estimatedItemSize={112}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={header}
      ListEmptyComponent={
        kindsOpen && !kindRows.length ? (
          <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 10 }}>Нет данных</Text>
        ) : null
      }
    />
  );
}
