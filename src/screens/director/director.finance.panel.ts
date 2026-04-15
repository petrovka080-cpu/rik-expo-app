import { Alert } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createModalAwarePdfOpener } from "../../lib/pdf/pdf.runner";
import { beginPlatformObservability } from "../../lib/observability/platformObservability";
import { reportAndSwallow } from "../../lib/observability/catchDiscipline";
import { getDirectorFinancePdfSource } from "../../lib/api/directorPdfSource.service";
import { exportDirectorManagementReportPdf } from "../../lib/api/pdf_director";
import {
  buildDirectorManagementReportPdfDescriptor,
  buildDirectorSupplierSummaryPdfDescriptor,
} from "./director.finance.pdfService";
import {
  financeText,
  fetchDirectorFinanceSupplierScopeV2ViaRpc,
  normalizeFinSupplierInput,
  type FinKindSupplierRow,
  type FinSupplierInput,
  type FinSupplierPanelState,
} from "./director.finance";
import type { DirectorFinanceCanonicalScope } from "./director.readModels";
import type { DirectorFinanceSupplierSelection } from "./directorUi.store";

type BusyLike = { isBusy: (key: string) => boolean };

const OVERPAY_KIND = "Переплаты / авансы";

type Deps = {
  busy: BusyLike;
  supabase: SupabaseClient;
  finPage: "home" | "debt" | "spend" | "kind" | "supplier";
  finFrom: string | null;
  finTo: string | null;
  finScope: DirectorFinanceCanonicalScope | null;
  finLoading: boolean;
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
  FIN_DUE_DAYS_DEFAULT: number;
  FIN_CRITICAL_DAYS: number;
};

export function useDirectorFinancePanel({
  busy,
  supabase,
  finPage,
  finFrom,
  finTo,
  finScope,
  finLoading,
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
  FIN_DUE_DAYS_DEFAULT,
  FIN_CRITICAL_DAYS,
}: Deps) {
  const router = useRouter();
  // D-MODAL-PDF: Stabilize the opener — avoid recreating on every render.
  const pdfOpener = useMemo(() => createModalAwarePdfOpener(closeFinance), [closeFinance]);
  const [finSupplier, setFinSupplier] = useState<FinSupplierPanelState | null>(null);
  const [finSupplierLoading, setFinSupplierLoading] = useState(false);

  // D-BACKEND-PDF: Speculative pre-fetch of finance PDF source.
  // When the finance screen finishes loading (finScope is ready), fire a background
  // call to getDirectorFinancePdfSource(). The result populates the 2-minute cache.
  // When the director taps the PDF button 3-30s later, the source data is already
  // cached → only the Edge Function render call remains (saves 2-5s on cold-path).
  //
  // D-RENDERER-MIGRATION: Extended to also trigger the full render pipeline.
  // After source data is cached, builds model → HTML → Edge Function render.
  // The rendered signedUrl is cached by renderedPdfCache in directorPdfRender.service.
  // When the user taps PDF, both source + render are cache hits → instant open.
  useEffect(() => {
    if (finLoading || !finScope) return;
    // Fire-and-forget: populate the source cache, then trigger full render.
    void getDirectorFinancePdfSource({
      periodFrom: finFrom,
      periodTo: finTo,
      dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
      criticalDays: FIN_CRITICAL_DAYS,
    })
      .then(() => {
        // D-RENDERER-MIGRATION: Source is now cached. Trigger full render in background.
        // This call will: get source (cache hit) → build model → render HTML → Edge Function.
        // The signedUrl from Edge Function is stored in renderedPdfCache.
        return exportDirectorManagementReportPdf({
          periodFrom: finFrom,
          periodTo: finTo,
          topN: 15,
          dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
          criticalDays: FIN_CRITICAL_DAYS,
        });
      })
      .catch((error) => {
        // Speculative — never break UI, but emit observability marker.
        // If it fails here, it will fail again (and be properly handled) when the user taps PDF.
        reportAndSwallow({
          screen: "director",
          surface: "finance_pdf_prefetch",
          event: "finance_pdf_prerender_failed",
          error,
          kind: "degraded_fallback",
          sourceKind: "rpc:pdf_director_finance_source_v1",
          errorStage: "speculative_prerender",
        });
      });
  }, [finLoading, finScope, finFrom, finTo, FIN_DUE_DAYS_DEFAULT, FIN_CRITICAL_DAYS]);

  const finKindList = useMemo<FinKindSupplierRow[]>(() => {
    const kindName = financeText(finKindName);
    const spendBreakdown = finScope?.spendBreakdown ?? null;
    if (!kindName) return [];
    if (kindName === OVERPAY_KIND) return spendBreakdown?.overpaySuppliers ?? [];
    return spendBreakdown?.kindRows.find((row) => row.kind === kindName)?.suppliers ?? [];
  }, [finKindName, finScope]);

  const loadSupplierScope = useCallback(
    async (selection: DirectorFinanceSupplierSelection, opts?: { suppressErrors?: boolean }) => {
      if (!selection) {
        setFinSupplier(null);
        return;
      }

      const observation = beginPlatformObservability({
        screen: "director",
        surface: "finance_supplier_scope",
        category: "fetch",
        event: "load_supplier_scope",
        sourceKind: "rpc:director_finance_supplier_scope_v2",
      });
      setFinSupplierLoading(true);
      try {
        const payloadV2 = await fetchDirectorFinanceSupplierScopeV2ViaRpc({
          supplier: selection.supplier,
          kindName: selection.kindName,
          periodFromIso: finFrom,
          periodToIso: finTo,
          dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
          criticalDays: FIN_CRITICAL_DAYS,
        });
        if (!payloadV2) {
          throw new Error("director finance supplier scope v2 unavailable");
        }

        setFinSupplier(payloadV2);
        observation.success({
          rowCount: payloadV2.invoices.length,
          sourceKind: "rpc:director_finance_supplier_scope_v2",
          fallbackUsed: false,
          extra: {
            owner: "backend",
            version: "v2",
            supplier: selection.supplier,
            kindName: selection.kindName ?? null,
          },
        });
      } catch (error) {
        if (__DEV__) {
          console.warn("[director.finance] supplier scope rpc failed", error);
        }
        setFinSupplier(null);
        observation.error(error, {
          rowCount: 0,
          sourceKind: "rpc:director_finance_supplier_scope_v2",
          errorStage: "load_supplier_scope",
          extra: {
            supplier: selection.supplier,
            kindName: selection.kindName ?? null,
          },
        });
        if (!opts?.suppressErrors) {
          Alert.alert("Финансы", "Не удалось открыть поставщика");
        }
      } finally {
        setFinSupplierLoading(false);
      }
    },
    [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, finFrom, finTo],
  );

  const openSupplier = useCallback(
    (value: FinSupplierInput | string) => {
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
    },
    [loadSupplierScope, pushFin, setFinSupplierSelection],
  );

  const closeSupplier = useCallback(() => {
    setFinSupplierSelection(null);
    setFinSupplier(null);
    popFin();
  }, [popFin, setFinSupplierSelection]);

  const openFinKind = useCallback(
    (kind: string, _list?: FinKindSupplierRow[]) => {
      setFinKindName(String(kind || ""));
      pushFin("kind");
    },
    [setFinKindName, pushFin],
  );

  const closeFinKind = useCallback(() => {
    setFinKindName("");
    popFin();
  }, [setFinKindName, popFin]);

  const onFinancePdf = useCallback(async () => {
    const template = await buildDirectorManagementReportPdfDescriptor({
      periodFrom: finFrom,
      periodTo: finTo,
      dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
      criticalDays: FIN_CRITICAL_DAYS,
    });
    await pdfOpener.prepareAndPreview({
      busy,
      supabase,
      key: "pdf:director:finance",
      label: "Открываю PDF...",
      descriptor: template,
      router,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [
    FIN_CRITICAL_DAYS,
    FIN_DUE_DAYS_DEFAULT,
    busy,
    finFrom,
    finTo,
    router,
    supabase,
  ]);

  const onSupplierPdf = useCallback(async () => {
    const supName = financeText(finSupplier?.supplier ?? finSupplierSelection?.supplier);
    if (!supName) {
      Alert.alert("PDF", "Поставщик не выбран");
      return;
    }
    const kindName = financeText(finSupplier?._kindName ?? finSupplierSelection?.kindName);
    const template = await buildDirectorSupplierSummaryPdfDescriptor({
      supplier: supName,
      kindName,
      periodFrom: finFrom,
      periodTo: finTo,
      dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
      criticalDays: FIN_CRITICAL_DAYS,
    });
    await pdfOpener.prepareAndPreview({
      busy,
      supabase,
      key: `pdf:director:supplier:${supName}`,
      label: "Открываю PDF...",
      descriptor: template,
      router,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
  }, [
    FIN_CRITICAL_DAYS,
    FIN_DUE_DAYS_DEFAULT,
    busy,
    finFrom,
    finSupplier,
    finSupplierSelection,
    finTo,
    router,
    supabase,
  ]);

  const financePeriodShort = useMemo(() => {
    return finFrom || finTo
      ? `${finFrom ? fmtDateOnly(finFrom) : "—"} - ${finTo ? fmtDateOnly(finTo) : "—"}`
      : "Весь период";
  }, [finFrom, finTo, fmtDateOnly]);

  const financeSupplierName = useMemo(() => {
    return financeText(finSupplier?.supplier ?? finSupplierSelection?.supplier);
  }, [finSupplier, finSupplierSelection]);

  const financeTitle = useMemo(() => {
    if (finPage === "debt") return "Долги и риски";
    if (finPage === "spend") return "Расходы (период)";
    if (finPage === "kind") return finKindName ? `${finKindName}: Поставщики` : "Поставщики";
    if (finPage === "supplier") {
      const supplierName = financeSupplierName;
      if (!supplierName || supplierName === "—") return "Поставщик";
      if (/^\d+$/.test(supplierName) || supplierName.length < 3) return `Поставщик: ${supplierName}`;
      return supplierName;
    }
    return "Финансы";
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

  const applyFinPeriod = useCallback(
    async (from: string, to: string) => {
      setFinFrom(from || null);
      setFinTo(to || null);
      setFinPeriodOpen(false);
      await fetchFinance();
      if (finSupplierSelection) {
        await loadSupplierScope(finSupplierSelection, { suppressErrors: true });
      }
    },
    [fetchFinance, finSupplierSelection, loadSupplierScope, setFinFrom, setFinPeriodOpen, setFinTo],
  );

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
