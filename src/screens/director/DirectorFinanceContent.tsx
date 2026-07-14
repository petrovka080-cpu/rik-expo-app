import React from "react";
import { Pressable, Text, View } from "react-native";

import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import {
  money,
  type FinKindSupplierRow,
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
  finScope: DirectorFinanceCanonicalScope | null;
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
const HOME_DEBT_METRIC_PREFIX = "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e";
const HOME_DEBT_TOTAL_PREFIX = "\u0414\u043e\u043b\u0433";
const HOME_SPEND_TITLE = "\u0420\u0430\u0441\u0445\u043e\u0434\u044b";
const HOME_SPEND_METRIC_PREFIX = "\u0410\u043b\u043b\u043e\u0446\u0438\u0440\u043e\u0432\u0430\u043d\u043e";
const HOME_SPEND_TOTAL_PREFIX = "\u041a \u043e\u043f\u043b\u0430\u0442\u0435";

export default function DirectorFinanceContent({
  finPage,
  finLoading,
  finScope,
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
  const spendBreakdown = finScope?.spendBreakdown ?? null;

  if (finPage === "home") {
    return (
      <View>
        <Pressable testID="director-finance-home-debt-card" onPress={() => pushFin("debt")} style={[s.mobCard, { marginBottom: 10 }]}>
          <View style={s.mobMain}>
            <Text style={{ color: UI.text, fontWeight: "900" }}>{HOME_DEBT_TITLE}</Text>
            <Text style={{ color: UI.sub, fontWeight: "700", marginTop: 6 }} numberOfLines={1}>
              {`${HOME_DEBT_METRIC_PREFIX} ${money(finScope?.obligations.approved ?? 0)} \u00b7 ${HOME_DEBT_TOTAL_PREFIX} ${money(finScope?.obligations.debt ?? 0)}`}
            </Text>
          </View>
        </Pressable>

        <Pressable onPress={() => pushFin("spend")} style={[s.mobCard, { marginBottom: 10 }]}>
          <View style={s.mobMain}>
            <Text style={{ color: UI.text, fontWeight: "900" }}>{HOME_SPEND_TITLE}</Text>
            <Text style={{ color: UI.sub, fontWeight: "700", marginTop: 6 }} numberOfLines={1}>
              {`${HOME_SPEND_METRIC_PREFIX} ${money(spendBreakdown?.header.approved ?? 0)} \u00b7 ${HOME_SPEND_TOTAL_PREFIX} ${money(spendBreakdown?.header.toPay ?? 0)}`}
            </Text>
          </View>
        </Pressable>

      </View>
    );
  }

  if (finPage === "debt") {
    return (
        <DirectorFinanceDebtModal
          loading={finLoading}
          canonicalScope={finScope}
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
          truth={finScope?.spend ?? null}
          diagnostics={finScope?.diagnostics ?? null}
        workInclusion={finScope?.workInclusion ?? null}
        spendBreakdown={spendBreakdown}
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
