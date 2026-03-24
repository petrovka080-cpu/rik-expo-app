import { Alert } from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareAndPreviewGeneratedPdf } from "../../lib/pdf/pdf.runner";
import type { DirectorFinanceSupportRowsResult } from "../../lib/api/directorFinanceScope.service";
import {
  buildDirectorManagementReportPdfDescriptor,
  buildDirectorSupplierSummaryPdfDescriptor,
} from "./director.finance.pdfService";
import {
  computeFinanceSupplierPanel,
  financeText,
  fetchDirectorFinanceSupplierScopeViaRpc,
  normalizeFinSupplierInput,
  type FinKindSupplierRow,
  type FinanceRow,
  type FinSpendRow,
  type FinSpendSummary,
  type FinSupplierInput,
  type FinSupplierPanelState,
} from "./director.finance";
import type { DirectorFinanceSupplierSelection } from "./directorUi.store";

type BusyLike = { isBusy: (key: string) => boolean };

const OVERPAY_KIND = "\u041f\u0435\u0440\u0435\u043f\u043b\u0430\u0442\u044b / \u0430\u0432\u0430\u043d\u0441\u044b";

type Deps = {
  busy: BusyLike;
  supabase: SupabaseClient;
  finPage: "home" | "debt" | "spend" | "kind" | "supplier";
  finFrom: string | null;
  finTo: string | null;
  finRows: FinanceRow[];
  finSpendRows: FinSpendRow[];
  finSpendSummary: FinSpendSummary;
  finLoading: boolean;
  finSupportRowsLoaded: boolean;
  finKindName: string;
  finSupplierSelection: DirectorFinanceSupplierSelection;
  fmtDateOnly: (iso?: string | null) => string;
  pushFin: (p: "home" | "debt" | "spend" | "kind" | "supplier") => void;
  popFin: () => void;
  closeFinance: () => void;
  setFinSupplierSelection: (value: DirectorFinanceSupplierSelection) => void;
  setFinKindName: (s: string) => void;
  setFinFrom: (v: string | null) => void;
  setFinTo: (v: string | null) => void;
  setFinPeriodOpen: (v: boolean) => void;
  fetchFinance: () => Promise<void>;
  loadFinanceSupportRows: () => Promise<DirectorFinanceSupportRowsResult>;
  FIN_DUE_DAYS_DEFAULT: number;
  FIN_CRITICAL_DAYS: number;
};

export function useDirectorFinancePanel({
  busy,
  supabase,
  finPage,
  finFrom,
  finTo,
  finRows,
  finSpendRows,
  finSpendSummary,
  finLoading,
  finSupportRowsLoaded,
  finKindName,
  finSupplierSelection,
  fmtDateOnly,
  pushFin,
  popFin,
  closeFinance,
  setFinSupplierSelection,
  setFinKindName,
  setFinFrom,
  setFinTo,
  setFinPeriodOpen,
  fetchFinance,
  loadFinanceSupportRows,
  FIN_DUE_DAYS_DEFAULT,
  FIN_CRITICAL_DAYS,
}: Deps) {
  const router = useRouter();
  const [finSupplier, setFinSupplier] = useState<FinSupplierPanelState | null>(null);
  const [finSupplierLoading, setFinSupplierLoading] = useState(false);

  const finKindList = useMemo<FinKindSupplierRow[]>(() => {
    const kindName = financeText(finKindName);
    if (!kindName) return [];
    if (kindName === OVERPAY_KIND) return finSpendSummary.overpaySuppliers;
    return finSpendSummary.kindRows.find((row) => row.kind === kindName)?.suppliers ?? [];
  }, [finKindName, finSpendSummary]);

  const ensureSupportRows = useCallback(async (): Promise<DirectorFinanceSupportRowsResult> => {
    if (finSupportRowsLoaded) {
      return {
        financeRows: finRows,
        spendRows: finSpendRows,
        issues: [],
      };
    }
    return await loadFinanceSupportRows();
  }, [finRows, finSpendRows, finSupportRowsLoaded, loadFinanceSupportRows]);

  const computeSupplierFallback = useCallback(async (selection: DirectorFinanceSupplierSelection) => {
    const supportRows = await ensureSupportRows();
    return computeFinanceSupplierPanel({
      selection,
      rows: supportRows.financeRows,
      spendRows: supportRows.spendRows,
      periodFromIso: finFrom,
      periodToIso: finTo,
      dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
      criticalDays: FIN_CRITICAL_DAYS,
    });
  }, [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, ensureSupportRows, finFrom, finTo]);

  const loadSupplierScope = useCallback(async (
    selection: DirectorFinanceSupplierSelection,
    opts?: { suppressErrors?: boolean },
  ) => {
    if (!selection) {
      setFinSupplier(null);
      return;
    }

    setFinSupplierLoading(true);
    try {
      const payload = await fetchDirectorFinanceSupplierScopeViaRpc({
        supplier: selection.supplier,
        kindName: selection.kindName,
        periodFromIso: finFrom,
        periodToIso: finTo,
        dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
        criticalDays: FIN_CRITICAL_DAYS,
      });
      setFinSupplier(payload ?? await computeSupplierFallback(selection));
    } catch (error) {
      if (__DEV__) {
        console.warn("[director.finance] supplier scope rpc failed", error);
      }
      const fallback = await computeSupplierFallback(selection).catch(() => null);
      setFinSupplier(fallback);
      if (!opts?.suppressErrors && !fallback) {
        Alert.alert("Р¤РёРЅР°РЅСЃС‹", "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РїРѕСЃС‚Р°РІС‰РёРєР°");
      }
    } finally {
      setFinSupplierLoading(false);
    }
  }, [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, computeSupplierFallback, finFrom, finTo]);

  const openSupplier = useCallback((value: FinSupplierInput | string) => {
    const supplierInput = normalizeFinSupplierInput(value);
    const supplierName = financeText(supplierInput.supplier);
    const kindName = financeText(supplierInput._kindName ?? supplierInput.kindName);
    const selection = supplierName
      ? {
          supplier: supplierName,
          kindName,
        }
      : null;

    setFinSupplierSelection(selection);
    setFinSupplier(null);
    if (!selection) return;
    pushFin("supplier");
    void loadSupplierScope(selection);
  }, [loadSupplierScope, pushFin, setFinSupplierSelection]);

  const closeSupplier = useCallback(() => {
    setFinSupplierSelection(null);
    setFinSupplier(null);
    popFin();
  }, [popFin, setFinSupplierSelection]);

  const openFinKind = useCallback((kind: string, _list?: FinKindSupplierRow[]) => {
    setFinKindName(String(kind || ""));
    pushFin("kind");
  }, [setFinKindName, pushFin]);

  const closeFinKind = useCallback(() => {
    setFinKindName("");
    popFin();
  }, [setFinKindName, popFin]);

  const onFinancePdf = useCallback(async () => {
    const supportRows = await ensureSupportRows();
    const template = await buildDirectorManagementReportPdfDescriptor({
      periodFrom: finFrom,
      periodTo: finTo,
      financeRows: supportRows.financeRows,
      spendRows: supportRows.spendRows,
      dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
      criticalDays: FIN_CRITICAL_DAYS,
    });
    await prepareAndPreviewGeneratedPdf({
      busy,
      supabase,
      key: "pdf:director:finance",
      label: "Р С›РЎвЂљР С”РЎР‚РЎвЂ№Р Р†Р В°РЎР‹ PDFРІР‚В¦",
      descriptor: template,
      router,
    });
  }, [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, busy, ensureSupportRows, finFrom, finTo, router, supabase]);

  const onSupplierPdf = useCallback(async () => {
    const supName = financeText(finSupplier?.supplier ?? finSupplierSelection?.supplier);
    if (!supName) {
      Alert.alert("PDF", "Р СџР С•РЎРѓРЎвЂљР В°Р Р†РЎвЂ°Р С‘Р С” Р Р…Р Вµ Р Р†РЎвЂ№Р В±РЎР‚Р В°Р Р…");
      return;
    }

    const supportRows = await ensureSupportRows();
    const kindName = financeText(finSupplier?._kindName ?? finSupplierSelection?.kindName);
    const template = await buildDirectorSupplierSummaryPdfDescriptor({
      supplier: supName,
      kindName,
      periodFrom: finFrom,
      periodTo: finTo,
      dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
      criticalDays: FIN_CRITICAL_DAYS,
      financeRows: supportRows.financeRows,
      spendRows: supportRows.spendRows,
    });
    await prepareAndPreviewGeneratedPdf({
      busy,
      supabase,
      key: `pdf:director:supplier:${supName}`,
      label: "Р С›РЎвЂљР С”РЎР‚РЎвЂ№Р Р†Р В°РЎР‹ PDFРІР‚В¦",
      descriptor: template,
      router,
    });
  }, [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, busy, ensureSupportRows, finFrom, finSupplier, finSupplierSelection, finTo, router, supabase]);

  const financePeriodShort = useMemo(() => {
    return finFrom || finTo
      ? `${finFrom ? fmtDateOnly(finFrom) : "РІР‚вЂќ"} РІвЂ вЂ™ ${finTo ? fmtDateOnly(finTo) : "РІР‚вЂќ"}`
      : "Р вЂ™Р ВµРЎРѓРЎРЉ Р С—Р ВµРЎР‚Р С‘Р С•Р Т‘";
  }, [finFrom, finTo, fmtDateOnly]);

  const financeSupplierName = useMemo(() => {
    return financeText(finSupplier?.supplier ?? finSupplierSelection?.supplier);
  }, [finSupplier, finSupplierSelection]);

  const financeTitle = useMemo(() => {
    if (finPage === "debt") return "Р вЂќР С•Р В»Р С–Р С‘ Р С‘ РЎР‚Р С‘РЎРѓР С”Р С‘";
    if (finPage === "spend") return "Р В Р В°РЎРѓРЎвЂ¦Р С•Р Т‘РЎвЂ№ (Р С—Р ВµРЎР‚Р С‘Р С•Р Т‘)";
    if (finPage === "kind") return finKindName ? `${finKindName}: Р С—Р С•РЎРѓРЎвЂљР В°Р Р†РЎвЂ°Р С‘Р С”Р С‘` : "Р СџР С•РЎРѓРЎвЂљР В°Р Р†РЎвЂ°Р С‘Р С”Р С‘";
    if (finPage === "supplier") {
      const supplierName = financeSupplierName;
      if (!supplierName || supplierName === "РІР‚вЂќ") return "Р СџР С•РЎРѓРЎвЂљР В°Р Р†РЎвЂ°Р С‘Р С”";
      if (/^\d+$/.test(supplierName) || supplierName.length < 3) return `Р СџР С•РЎРѓРЎвЂљР В°Р Р†РЎвЂ°Р С‘Р С”: ${supplierName}`;
      return supplierName;
    }
    return "Р В¤Р С‘Р Р…Р В°Р Р…РЎРѓРЎвЂ№";
  }, [finPage, finKindName, financeSupplierName]);

  const financeTopPdfKey = useMemo(() => {
    return finPage === "supplier" ? `pdf:director:supplier:${financeSupplierName}` : "pdf:director:finance";
  }, [finPage, financeSupplierName]);

  const supplierPdfBusy = useMemo(() => {
    return !!financeSupplierName && busy.isBusy(`pdf:director:supplier:${financeSupplierName}`);
  }, [financeSupplierName, busy]);

  const financeTopLoading = useMemo(() => {
    return finLoading || finSupplierLoading || busy.isBusy(financeTopPdfKey);
  }, [finLoading, finSupplierLoading, busy, financeTopPdfKey]);

  const onCloseFinanceTop = useCallback(() => {
    if (finPage === "supplier") {
      closeSupplier();
      return;
    }
    if (finPage === "kind") {
      closeFinKind();
      return;
    }
    if (finPage !== "home") {
      popFin();
      return;
    }
    closeFinance();
  }, [closeFinance, closeFinKind, closeSupplier, finPage, popFin]);

  const applyFinPeriod = useCallback(async (from: string, to: string) => {
    setFinFrom(from || null);
    setFinTo(to || null);
    setFinPeriodOpen(false);
    await fetchFinance();
    if (finSupplierSelection) {
      await loadSupplierScope(finSupplierSelection, { suppressErrors: true });
    }
  }, [fetchFinance, finSupplierSelection, loadSupplierScope, setFinFrom, setFinPeriodOpen, setFinTo]);

  const clearFinPeriod = useCallback(async () => {
    setFinFrom(null);
    setFinTo(null);
    setFinPeriodOpen(false);
    await fetchFinance();
    if (finSupplierSelection) {
      await loadSupplierScope(finSupplierSelection, { suppressErrors: true });
    }
  }, [fetchFinance, finSupplierSelection, loadSupplierScope, setFinFrom, setFinPeriodOpen, setFinTo]);

  return {
    openSupplier,
    closeSupplier,
    openFinKind,
    closeFinKind,
    finSupplier,
    finSupplierLoading,
    finKindList,
    onFinancePdf,
    onSupplierPdf,
    financePeriodShort,
    financeTitle,
    supplierPdfBusy,
    financeTopLoading,
    onCloseFinanceTop,
    applyFinPeriod,
    clearFinPeriod,
    fetchFinance,
    setFinPeriodOpen,
  };
}
