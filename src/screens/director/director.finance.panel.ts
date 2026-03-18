import { Alert } from "react-native";
import { useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import {
  addDaysIso,
  financeText,
  mid,
  nnum,
  normalizeFinSpendRow,
  normalizeFinSupplierInput,
  parseMid,
  pickApprovedIso,
  pickFinanceAmount,
  pickFinancePaid,
  pickInvoiceIso,
  type FinKindSupplierRow,
  type FinanceRow,
  type FinSpendRow,
  type FinSupplierInput,
  type FinSupplierPanelState,
} from "./director.finance";
import { makeIsoInPeriod, pickIso10 } from "./director.helpers";

type BusyLike = { isBusy: (key: string) => boolean };

type NormalizedSpendRow = FinSpendRow & {
  supplierName: string;
  kindName: string;
  proposalId: string;
  proposalNo: string;
  approvedIso: string | null;
};

type SupplierSpendIndexEntry = {
  rows: NormalizedSpendRow[];
};

const normalizeSpendRow = (row: FinSpendRow): NormalizedSpendRow => {
  const normalized = normalizeFinSpendRow(row);
  return {
    ...normalized,
    supplierName: financeText(normalized.supplier),
    kindName: financeText(normalized.kind_name),
    proposalId: financeText(normalized.proposal_id),
    proposalNo: financeText(normalized.proposal_no),
    approvedIso: pickIso10(normalized.director_approved_at, normalized.approved_at, normalized.approvedAtIso),
  };
};

type Deps = {
  busy: BusyLike;
  supabase: SupabaseClient;
  finPage: "home" | "debt" | "spend" | "kind" | "supplier";
  finFrom: string | null;
  finTo: string | null;
  finRows: FinanceRow[];
  finSpendRows: FinSpendRow[];
  finLoading: boolean;
  finSupplier: FinSupplierPanelState | null;
  finKindName: string;
  fmtDateOnly: (iso?: string | null) => string;
  pushFin: (p: "home" | "debt" | "spend" | "kind" | "supplier") => void;
  popFin: () => void;
  closeFinance: () => void;
  setFinSupplier: Dispatch<SetStateAction<FinSupplierPanelState | null>>;
  setFinKindName: (s: string) => void;
  setFinKindList: (v: FinKindSupplierRow[]) => void;
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
  finRows,
  finSpendRows,
  finLoading,
  finSupplier,
  finKindName,
  fmtDateOnly,
  pushFin,
  popFin,
  closeFinance,
  setFinSupplier,
  setFinKindName,
  setFinKindList,
  setFinFrom,
  setFinTo,
  setFinPeriodOpen,
  fetchFinance,
  FIN_DUE_DAYS_DEFAULT,
  FIN_CRITICAL_DAYS,
}: Deps) {
  const router = useRouter();
  const inFinancePeriod = useMemo(() => makeIsoInPeriod(finFrom, finTo), [finFrom, finTo]);

  const normalizedSpendRows = useMemo<NormalizedSpendRow[]>(
    () => (Array.isArray(finSpendRows) ? finSpendRows : []).map(normalizeSpendRow),
    [finSpendRows],
  );

  const spendRowsBySupplier = useMemo(() => {
    const index = new Map<string, SupplierSpendIndexEntry>();
    for (const row of normalizedSpendRows) {
      const supplierName = row.supplierName;
      const current = index.get(supplierName);
      if (current) current.rows.push(row);
      else index.set(supplierName, { rows: [row] });
    }
    return index;
  }, [normalizedSpendRows]);

  const financeRowsBySupplier = useMemo(() => {
    const index = new Map<string, FinanceRow[]>();
    for (const row of Array.isArray(finRows) ? finRows : []) {
      const supplierName = financeText(row?.supplier);
      const current = index.get(supplierName);
      if (current) current.push(row);
      else index.set(supplierName, [row]);
    }
    return index;
  }, [finRows]);

  const openSupplier = useCallback((value: FinSupplierInput | string) => {
    const supplierInput = normalizeFinSupplierInput(value);
    const supplierName = supplierInput.supplier;
    const kindName = financeText(supplierInput._kindName ?? supplierInput.kindName);
    const supplierSpendRows = spendRowsBySupplier.get(supplierName)?.rows ?? [];
    const supplierFinanceRows = financeRowsBySupplier.get(supplierName) ?? [];

    let allowedProposalIds: Set<string> | null = null;
    const proposalNoById: Record<string, string> = {};

    if (kindName) {
      const spend = supplierSpendRows
        .filter((r) => r.kindName === kindName)
        .filter((r) => inFinancePeriod(r.approvedIso));

      allowedProposalIds = new Set(spend.map((r) => r.proposalId).filter(Boolean));

      for (const row of spend) {
        if (row.proposalId && row.proposalNo) proposalNoById[row.proposalId] = row.proposalNo;
      }
    }

    const fin = supplierFinanceRows
      .filter((r) => inFinancePeriod(r?.approvedAtIso ?? r?.raw?.approved_at ?? r?.raw?.director_approved_at))
      .filter((r) => {
        if (!allowedProposalIds) return true;
        const pid = financeText(r?.proposalId ?? r?.proposal_id);
        return pid && allowedProposalIds.has(pid);
      });

    const t0 = mid(new Date());
    const dueDays = FIN_DUE_DAYS_DEFAULT;

    const invoices = fin
      .map((r, idx: number) => {
        const amount = pickFinanceAmount(r);
        const paid = pickFinancePaid(r);
        const rest = Math.max(amount - paid, 0);

        const pid = financeText(r?.proposalId ?? r?.proposal_id);
        const invNo = financeText(r?.invoiceNumber ?? r?.raw?.invoice_number);

        const approvedIso =
          pickApprovedIso(r) ??
          pickIso10(r?.raw?.director_approved_at, r?.raw?.approved_at, r?.raw?.approvedAtIso);

        const invoiceIso =
          pickInvoiceIso(r) ??
          pickIso10(r?.raw?.invoice_date, r?.raw?.invoice_at, r?.raw?.created_at);

        const pno = pid ? financeText(proposalNoById[pid] ?? r?.proposal_no) : "";
        const title =
          invNo ? `Счёт №${invNo}` :
            pno ? `Предложение ${pno}` :
              pid ? `Предложение #${pid.slice(0, 8)}` :
                "Счёт";

        const dueIso =
          r?.dueDate ??
          r?.raw?.due_date ??
          (invoiceIso ? addDaysIso(String(invoiceIso).slice(0, 10), dueDays) : null) ??
          (approvedIso ? addDaysIso(String(approvedIso).slice(0, 10), dueDays) : null);

        const dueMid = parseMid(dueIso) ?? 0;
        const isOverdue = rest > 0 && !!dueMid && dueMid < t0;

        let isCritical = false;
        if (isOverdue && dueMid) {
          const days = Math.floor((t0 - dueMid) / (24 * 3600 * 1000));
          isCritical = days >= FIN_CRITICAL_DAYS;
        }

        const key = [
          pid || "",
          invNo || "",
          String(invoiceIso ?? ""),
          String(approvedIso ?? ""),
          String(idx),
        ].join("|");

        return {
          id: key,
          title,
          amount,
          paid,
          rest,
          isOverdue,
          isCritical,
          approvedIso: approvedIso ? String(approvedIso) : null,
          invoiceIso: invoiceIso ? String(invoiceIso) : null,
          dueIso: dueIso ? String(dueIso) : null,
        };
      })
      .filter((x) => x.amount > 0 || x.rest > 0);

    const debtAmount = invoices.reduce((sum, row) => sum + Math.max(nnum(row.rest), 0), 0);
    const debtCount = invoices.filter((row) => Math.max(nnum(row.rest), 0) > 0).length;
    const overdueCount = invoices.filter((row) => row.isOverdue && Math.max(nnum(row.rest), 0) > 0).length;
    const criticalCount = invoices.filter((row) => row.isCritical && Math.max(nnum(row.rest), 0) > 0).length;

    const payload: FinSupplierPanelState = {
      supplier: supplierName,
      amount: debtAmount,
      count: debtCount,
      approved: debtAmount,
      paid: 0,
      toPay: debtAmount,
      overdueCount,
      criticalCount,
      _kindName: kindName || "",
      kindName: kindName || "",
      invoices,
    };

    setFinSupplier(payload);
    pushFin("supplier");
  }, [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, financeRowsBySupplier, inFinancePeriod, pushFin, setFinSupplier, spendRowsBySupplier]);

  const closeSupplier = useCallback(() => {
    setFinSupplier(null);
    popFin();
  }, [setFinSupplier, popFin]);

  const openFinKind = useCallback((kind: string, list: FinKindSupplierRow[]) => {
    setFinKindName(String(kind || ""));
    setFinKindList(Array.isArray(list) ? list : []);
    pushFin("kind");
  }, [setFinKindName, setFinKindList, pushFin]);

  const closeFinKind = useCallback(() => {
    setFinKindName("");
    setFinKindList([]);
    popFin();
  }, [setFinKindName, setFinKindList, popFin]);

  const onFinancePdf = useCallback(async () => {
    const title = "Финансовый управленческий отчёт";
    const template = await generateDirectorPdfDocument({
      title,
      fileName: buildPdfFileName({
        documentType: "director_report",
        title,
        dateIso: finTo ?? finFrom ?? undefined,
      }),
      documentType: "director_report",
      getUri: async () => {
        const { exportDirectorManagementReportPdf } = await import("../../lib/api/pdf_director");
        return await exportDirectorManagementReportPdf({
          periodFrom: finFrom,
          periodTo: finTo,
          financeRows: finRows,
          spendRows: finSpendRows,
          topN: 15,
          dueDaysDefault: FIN_DUE_DAYS_DEFAULT,
          criticalDays: FIN_CRITICAL_DAYS,
        });
      },
    });
    const doc = await preparePdfDocument({
      busy,
      supabase,
      key: "pdf:director:finance",
      label: "Открываю PDF…",
      descriptor: template,
      getRemoteUrl: () => template.uri,
    });
    await previewPdfDocument(doc, { router });
  }, [busy, supabase, finFrom, finTo, finRows, finSpendRows, FIN_DUE_DAYS_DEFAULT, FIN_CRITICAL_DAYS, router]);

  const onSupplierPdf = useCallback(async () => {
    const supName = financeText(finSupplier?.supplier);
    if (!supName) {
      Alert.alert("PDF", "Поставщик не выбран");
      return;
    }

    const kindName = financeText(finSupplier?._kindName);
    const title = kindName
      ? `Сводка по поставщику: ${supName} (${kindName})`
      : `Сводка по поставщику: ${supName}`;

    const template = await generateDirectorPdfDocument({
      title,
      fileName: buildPdfFileName({
        documentType: "supplier_summary",
        title: supName,
        entityId: supName,
        dateIso: finTo ?? finFrom ?? undefined,
      }),
      documentType: "supplier_summary",
      entityId: supName,
      getUri: async () => {
        const financeFiltered = (financeRowsBySupplier.get(supName) ?? [])
          .filter((r) => inFinancePeriod(r?.approvedAtIso ?? r?.raw?.approved_at ?? r?.raw?.director_approved_at));

        let spendFiltered = (spendRowsBySupplier.get(supName)?.rows ?? [])
          .filter((r) => inFinancePeriod(r.approvedIso));

        if (kindName) {
          spendFiltered = spendFiltered.filter((r) => r.kindName === kindName);
        }

        spendFiltered = spendFiltered.filter((r) => r.proposalId);

        const { exportDirectorSupplierSummaryPdf } = await import("../../lib/api/pdf_director");
        return await exportDirectorSupplierSummaryPdf({
          supplier: supName,
          periodFrom: finFrom,
          periodTo: finTo,
          financeRows: financeFiltered,
          spendRows: spendFiltered,
        });
      },
    });
    const doc = await preparePdfDocument({
      busy,
      supabase,
      key: `pdf:director:supplier:${supName}`,
      label: "Открываю PDF…",
      descriptor: template,
      getRemoteUrl: () => template.uri,
    });
    await previewPdfDocument(doc, { router });
  }, [busy, finFrom, finTo, finSupplier, financeRowsBySupplier, inFinancePeriod, router, spendRowsBySupplier, supabase]);

  const financePeriodShort = useMemo(() => {
    return finFrom || finTo
      ? `${finFrom ? fmtDateOnly(finFrom) : "—"} → ${finTo ? fmtDateOnly(finTo) : "—"}`
      : "Весь период";
  }, [finFrom, finTo, fmtDateOnly]);

  const financeSupplierName = useMemo(() => {
    return financeText(finSupplier?.supplier);
  }, [finSupplier]);

  const financeTitle = useMemo(() => {
    if (finPage === "debt") return "Долги и риски";
    if (finPage === "spend") return "Расходы (период)";
    if (finPage === "kind") return finKindName ? `${finKindName}: поставщики` : "Поставщики";
    if (finPage === "supplier") {
      const s = financeSupplierName;
      if (!s || s === "—") return "Поставщик";
      if (/^\d+$/.test(s) || s.length < 3) return `Поставщик: ${s}`;
      return s;
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
    return finLoading || busy.isBusy(financeTopPdfKey);
  }, [finLoading, busy, financeTopPdfKey]);

  const onCloseFinanceTop = useCallback(() => {
    if (finPage !== "home") {
      popFin();
      return;
    }
    closeFinance();
  }, [finPage, popFin, closeFinance]);

  const applyFinPeriod = useCallback((from: string, to: string) => {
    setFinFrom(from || null);
    setFinTo(to || null);
    setFinPeriodOpen(false);
    void fetchFinance();
  }, [setFinFrom, setFinTo, setFinPeriodOpen, fetchFinance]);

  const clearFinPeriod = useCallback(() => {
    setFinFrom(null);
    setFinTo(null);
    setFinPeriodOpen(false);
    void fetchFinance();
  }, [setFinFrom, setFinTo, setFinPeriodOpen, fetchFinance]);

  return {
    openSupplier,
    closeSupplier,
    openFinKind,
    closeFinKind,
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
