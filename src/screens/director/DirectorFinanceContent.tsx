import React from "react";
import { Pressable, Text, View } from "react-native";

import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import {
  money,
  type FinKindSupplierRow,
  type FinRep,
  type FinSpendSummary,
  type FinSupplierInput,
  type FinSupplierPanelState,
} from "./director.finance";
import { UI, s } from "./director.styles";
import DirectorFinanceDebtModal from "./DirectorFinanceDebtModal";
import DirectorFinanceKindSuppliersModal from "./DirectorFinanceKindSuppliersModal";
import DirectorFinanceSpendModal from "./DirectorFinanceSpendModal";
import DirectorFinanceSupplierModal from "./DirectorFinanceSupplierModal";
import type { FinPage } from "./director.types";

type Props = {
  finPage: FinPage;
  finLoading: boolean;
  finRep: FinRep;
  finScope: DirectorFinanceCanonicalScope | null;
  finSpendSummary: FinSpendSummary;
  finKindName: string;
  finKindList: FinKindSupplierRow[];
  finSupplier: FinSupplierPanelState | null;
  finSupplierLoading: boolean;
  supplierPdfBusy: boolean;
  FIN_CRITICAL_DAYS: number;
  pushFin: (page: FinPage) => void;
  openSupplier: (row: FinSupplierInput | string) => void;
  openFinKind: (kindName: string, list: FinKindSupplierRow[]) => void;
  onSupplierPdf: () => Promise<void>;
  fmtDateOnly: (iso?: string | null) => string;
};

const HOME_DEBT_TITLE = "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430";
const HOME_DEBT_BODY =
  "\u041f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c \u0438 \u0441\u0447\u0435\u0442\u0430\u043c. \u0414\u043e\u043b\u0433 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044f \u043f\u043e \u043a\u0430\u0436\u0434\u043e\u043c\u0443 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044e \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e.";
const HOME_DEBT_METRIC_PREFIX = "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e";
const HOME_DEBT_TOTAL_PREFIX = "\u0414\u043e\u043b\u0433";
const HOME_SPEND_TITLE = "\u0420\u0430\u0441\u0445\u043e\u0434\u044b";
const HOME_SPEND_BODY =
  "\u041f\u043e \u0430\u043b\u043b\u043e\u043a\u0430\u0446\u0438\u044f\u043c \u0440\u0430\u0441\u0445\u043e\u0434\u043e\u0432. \u042d\u0442\u043e\u0442 \u0431\u043b\u043e\u043a \u043d\u0435 \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u044b\u0432\u0430\u0435\u0442 \u0434\u043e\u043b\u0433 \u043f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c.";
const HOME_SPEND_METRIC_PREFIX = "\u0410\u043b\u043b\u043e\u0446\u0438\u0440\u043e\u0432\u0430\u043d\u043e";
const HOME_SPEND_TOTAL_PREFIX = "\u041a \u043e\u043f\u043b\u0430\u0442\u0435";
const FINANCE_MODE_LABEL = "\u0420\u0435\u0436\u0438\u043c";
const FINANCE_OBLIGATIONS_MODE_LABEL = "\u041e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430";
const FINANCE_SPEND_MODE_LABEL = "\u0420\u0430\u0441\u0445\u043e\u0434\u044b";
const FINANCE_FALLBACK_KIND_LABELS =
  "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u00b7 \u0420\u0430\u0431\u043e\u0442\u044b \u00b7 \u0423\u0441\u043b\u0443\u0433\u0438 \u00b7 \u0414\u0440\u0443\u0433\u043e\u0435";
const FINANCE_SOURCE_LABEL = "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0438";
const FINANCE_KIND_LABEL = "\u0412\u0438\u0434\u044b \u0432 \u0440\u0430\u0441\u0445\u043e\u0434\u0430\u0445";

const getModeLabel = (scope: DirectorFinanceCanonicalScope | null): string =>
  scope?.mode === "canonical" ? "canonical_v3" : "fallback_legacy";

export default function DirectorFinanceContent({
  finPage,
  finLoading,
  finRep,
  finScope,
  finSpendSummary,
  finKindName,
  finKindList,
  finSupplier,
  finSupplierLoading,
  supplierPdfBusy,
  FIN_CRITICAL_DAYS,
  pushFin,
  openSupplier,
  openFinKind,
  onSupplierPdf,
  fmtDateOnly,
}: Props) {
  const observedKindsLabel = React.useMemo(() => {
    const kinds = Array.isArray(finScope?.workInclusion?.observedKinds)
      ? finScope.workInclusion.observedKinds.filter((value) => String(value ?? "").trim().length > 0)
      : [];
    return kinds.length ? kinds.join(" \u00b7 ") : FINANCE_FALLBACK_KIND_LABELS;
  }, [finScope]);

  if (finPage === "home") {
    return (
      <View>
        <Pressable onPress={() => pushFin("debt")} style={[s.mobCard, { marginBottom: 10 }]}>
          <View style={s.mobMain}>
            <Text style={{ color: UI.text, fontWeight: "900" }}>{HOME_DEBT_TITLE}</Text>
            <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
              {HOME_DEBT_BODY}
            </Text>
            <Text style={{ color: UI.sub, fontWeight: "700", marginTop: 6 }} numberOfLines={1}>
              {`${HOME_DEBT_METRIC_PREFIX} ${money(finScope?.obligations.approved ?? finRep?.summary?.approved ?? 0)} \u00b7 ${HOME_DEBT_TOTAL_PREFIX} ${money(finScope?.obligations.debt ?? finRep?.summary?.toPay ?? 0)}`}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={() => pushFin("spend")} style={[s.mobCard, { marginBottom: 10 }]}>
          <View style={s.mobMain}>
            <Text style={{ color: UI.text, fontWeight: "900" }}>{HOME_SPEND_TITLE}</Text>
            <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
              {HOME_SPEND_BODY}
            </Text>
            <Text style={{ color: UI.sub, fontWeight: "700", marginTop: 6 }} numberOfLines={1}>
              {`${HOME_SPEND_METRIC_PREFIX} ${money(finScope?.spend.approved ?? finSpendSummary.header.approved)} \u00b7 ${HOME_SPEND_TOTAL_PREFIX} ${money(finScope?.spend.toPay ?? finSpendSummary.header.toPay)}`}
            </Text>
          </View>
        </Pressable>

        <Text style={[s.mobMeta, { marginTop: 2 }]} numberOfLines={2}>
          {`${FINANCE_MODE_LABEL}: ${getModeLabel(finScope)} \u00b7 ${FINANCE_OBLIGATIONS_MODE_LABEL}: invoice-level \u00b7 ${FINANCE_SPEND_MODE_LABEL}: allocation-level`}
        </Text>

        {finScope ? (
          <View style={[s.mobCard, { marginTop: 10 }]}>
            <View style={s.mobMain}>
              <Text style={{ color: UI.text, fontWeight: "900" }}>{finScope.uiExplainer.title}</Text>
              <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
                {finScope.uiExplainer.obligationsSummary}
              </Text>
              <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
                {finScope.uiExplainer.spendSummary}
              </Text>
              <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
                {finScope.uiExplainer.differenceSummary}
              </Text>
              <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 6 }}>
                {finScope.uiExplainer.workSummary}
              </Text>
              <Text style={{ color: UI.sub, fontWeight: "700", marginTop: 8 }}>
                {`${FINANCE_SOURCE_LABEL}: \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u0430 ${finScope.diagnostics.financeSummarySource} \u00b7 \u0440\u0430\u0441\u0445\u043e\u0434\u044b ${finScope.diagnostics.spendSource}`}
              </Text>
              <Text style={{ color: UI.sub, fontWeight: "700", marginTop: 4 }}>
                {`${FINANCE_KIND_LABEL}: ${observedKindsLabel}`}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  if (finPage === "debt") {
    return (
      <DirectorFinanceDebtModal
        loading={finLoading}
        rep={finRep}
        truth={finScope?.obligations ?? null}
        diagnostics={finScope?.diagnostics ?? null}
        workInclusion={finScope?.workInclusion ?? null}
        money={money}
        FIN_CRITICAL_DAYS={FIN_CRITICAL_DAYS}
        openSupplier={openSupplier}
      />
    );
  }

  if (finPage === "spend") {
    return (
      <DirectorFinanceSpendModal
        visible={true}
        loading={finLoading}
        sum={finRep?.summary}
        truth={finScope?.spend ?? null}
        diagnostics={finScope?.diagnostics ?? null}
        workInclusion={finScope?.workInclusion ?? null}
        spendSummary={finSpendSummary}
        money={money}
        onOpenKind={openFinKind}
      />
    );
  }

  if (finPage === "kind") {
    return (
      <DirectorFinanceKindSuppliersModal
        loading={finLoading}
        kindName={finKindName}
        list={finKindList}
        money={money}
        onOpenSupplier={openSupplier}
      />
    );
  }

  if (finPage === "supplier") {
    return (
      <DirectorFinanceSupplierModal
        loading={finLoading || finSupplierLoading || supplierPdfBusy}
        onPdf={onSupplierPdf}
        supplier={finSupplier}
        money={money}
        fmtDateOnly={fmtDateOnly}
      />
    );
  }

  return null;
}
