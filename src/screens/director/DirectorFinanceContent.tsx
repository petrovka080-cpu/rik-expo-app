import React from "react";
import { Pressable, Text, View } from "react-native";

import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import { money, type FinKindSupplierRow, type FinRep, type FinSpendSummary, type FinSupplierInput, type FinSupplierPanelState } from "./director.finance";
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
  if (finPage === "home") {
    return (
      <View>
        <Pressable onPress={() => pushFin("debt")} style={[s.mobCard, { marginBottom: 10 }]}>
          <Text style={{ color: UI.text, fontWeight: "900" }}>Обязательства</Text>
          <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
            По предложениям и счетам. Долг считается по каждому предложению отдельно.
          </Text>
          <Text style={{ color: UI.sub, fontWeight: "700", marginTop: 6 }} numberOfLines={1}>
            {`Утверждено ${money(finScope?.obligations.approved ?? finRep?.summary?.approved ?? 0)} · Долг ${money(finScope?.obligations.debt ?? finRep?.summary?.toPay ?? 0)}`}
          </Text>
        </Pressable>

        <Pressable onPress={() => pushFin("spend")} style={[s.mobCard, { marginBottom: 10 }]}>
          <Text style={{ color: UI.text, fontWeight: "900" }}>Расходы</Text>
          <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={2}>
            По аллокациям расходов. Этот блок не пересчитывает долг по предложениям.
          </Text>
          <Text style={{ color: UI.sub, fontWeight: "700", marginTop: 6 }} numberOfLines={1}>
            {`Аллоцировано ${money(finScope?.spend.approved ?? finSpendSummary.header.approved)} · К оплате ${money(finScope?.spend.toPay ?? finSpendSummary.header.toPay)}`}
          </Text>
        </Pressable>

        <Text style={[s.mobMeta, { marginTop: 2 }]} numberOfLines={2}>
          {`Режим: ${getModeLabel(finScope)} · Обязательства: invoice-level · Расходы: allocation-level`}
        </Text>
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
