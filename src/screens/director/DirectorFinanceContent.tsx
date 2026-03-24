import React from "react";
import { Pressable, Text, View } from "react-native";
import { UI, s } from "./director.styles";
import type { FinPage } from "./director.types";
import type {
  FinKindSupplierRow,
  FinRep,
  FinSpendSummary,
  FinSupplierInput,
  FinSupplierPanelState,
} from "./director.finance";
import { money } from "./director.finance";
import DirectorFinanceDebtModal from "./DirectorFinanceDebtModal";
import DirectorFinanceSpendModal from "./DirectorFinanceSpendModal";
import DirectorFinanceKindSuppliersModal from "./DirectorFinanceKindSuppliersModal";
import DirectorFinanceSupplierModal from "./DirectorFinanceSupplierModal";

type Props = {
  finPage: FinPage;
  finLoading: boolean;
  finRep: FinRep;
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

export default function DirectorFinanceContent({
  finPage,
  finLoading,
  finRep,
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
        </Pressable>

        <Pressable onPress={() => pushFin("spend")} style={[s.mobCard, { marginBottom: 10 }]}>
          <Text style={{ color: UI.text, fontWeight: "900" }}>Расходы</Text>
        </Pressable>
      </View>
    );
  }

  if (finPage === "debt") {
    return (
      <DirectorFinanceDebtModal
        loading={finLoading}
        rep={finRep}
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
