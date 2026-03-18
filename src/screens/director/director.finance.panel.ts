import { Alert } from "react-native";
import { useCallback, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "expo-router";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import {
  addDaysIso,
  mid,
  nnum,
  parseMid,
  pickApprovedIso,
  pickFinanceAmount,
  pickFinancePaid,
  pickInvoiceIso,
  type FinSupplierDebt,
  type FinanceRow,
} from "./director.finance";
import { makeIsoInPeriod, pickIso10 } from "./director.helpers";

type BusyLike = { isBusy: (key: string) => boolean };

type FinSpendRowLike = {
  supplier?: string | null;
  kind_name?: string | null;
  proposal_id?: string | null;
  proposal_no?: string | null;
  director_approved_at?: string | null;
  approved_at?: string | null;
  approvedAtIso?: string | null;
};

type FinSupplierInvoice = {
  id: string;
  title: string;
  amount: number;
  paid: number;
  rest: number;
  isOverdue: boolean;
  isCritical: boolean;
  approvedIso: string | null;
  invoiceIso: string | null;
  dueIso: string | null;
};

type FinSupplierPanelState = FinSupplierDebt & {
  _kindName?: string | null;
  kindName?: string | null;
  invoices?: FinSupplierInvoice[];
};

type FinSupplierInput =
  | FinSupplierDebt
  | FinSupplierPanelState
  | {
      supplier?: unknown;
      name?: unknown;
      _kindName?: unknown;
      kindName?: unknown;
      amount?: unknown;
      count?: unknown;
      overdueCount?: unknown;
      criticalCount?: unknown;
      invoices?: unknown;
    };

type FinSupplierViewModel = {
  supplier: string;
  name?: string | null;
  _kindName?: string | null;
  kindName?: string | null;
  amount?: number;
  count?: number;
  overdueCount?: number;
  criticalCount?: number;
  invoices?: FinSupplierInvoice[];
};

const textValue = (value: unknown): string => String(value ?? "").trim();

const numericValue = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const pickSupplierText = (value: unknown): string => {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  if (typeof row.supplier === "string") return row.supplier.trim();
  if (row.supplier && typeof row.supplier === "object") {
    const nested = row.supplier as Record<string, unknown>;
    return textValue(nested.supplier);
  }
  return textValue(row.name);
};

const normalizeSupplierInput = (value: FinSupplierInput | string): FinSupplierViewModel => {
  if (typeof value === "string") {
    return {
      supplier: value.trim() || "—",
      _kindName: "",
    };
  }

  const row = value as Record<string, unknown>;
  return {
    supplier: pickSupplierText(value) || "—",
    name: textValue(row.name) || null,
    _kindName: textValue(row._kindName) || null,
    kindName: textValue(row.kindName) || null,
    amount: numericValue(row.amount),
    count: numericValue(row.count),
    overdueCount: numericValue(row.overdueCount),
    criticalCount: numericValue(row.criticalCount),
    invoices: Array.isArray(row.invoices) ? (row.invoices as FinSupplierInvoice[]) : undefined,
  };
};

type NormalizedSpendRow = FinSpendRowLike & {
  supplierName: string;
  kindName: string;
  proposalId: string;
  proposalNo: string;
  approvedIso: string | null;
};

const normalizeSpendRow = (row: FinSpendRowLike): NormalizedSpendRow => ({
  ...row,
  supplierName: textValue(row?.supplier),
  kindName: textValue(row?.kind_name),
  proposalId: textValue(row?.proposal_id),
  proposalNo: textValue(row?.proposal_no),
  approvedIso: pickIso10(row?.director_approved_at, row?.approved_at, row?.approvedAtIso),
});

type Deps = {
  busy: BusyLike;
  supabase: any;
  finPage: "home" | "debt" | "spend" | "kind" | "supplier";
  finFrom: string | null;
  finTo: string | null;
  finRows: FinanceRow[];
  finSpendRows: FinSpendRowLike[];
  finLoading: boolean;
  finSupplier: FinSupplierPanelState | null;
  finKindName: string;
  fmtDateOnly: (iso?: string | null) => string;
  pushFin: (p: "home" | "debt" | "spend" | "kind" | "supplier") => void;
  popFin: () => void;
  closeFinance: () => void;
  setFinSupplier: Dispatch<SetStateAction<FinSupplierDebt | null>>;
  setFinKindName: (s: string) => void;
  setFinKindList: (v: FinSpendRowLike[]) => void;
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

  const openSupplier = useCallback((value: FinSupplierInput | string) => {
    const supplierInput = normalizeSupplierInput(value);
    const supplierName = supplierInput.supplier;
    const kindName = textValue(supplierInput._kindName ?? supplierInput.kindName);
    const inPeriod = makeIsoInPeriod(finFrom, finTo);

    let allowedProposalIds: Set<string> | null = null;
    const proposalNoById: Record<string, string> = {};

    if (kindName) {
      const spend = (Array.isArray(finSpendRows) ? finSpendRows : [])
        .map(normalizeSpendRow)
        .filter((r) => r.supplierName === supplierName)
        .filter((r) => r.kindName === kindName)
        .filter((r) => inPeriod(r.approvedIso));

      allowedProposalIds = new Set(spend.map((r) => r.proposalId).filter(Boolean));

      for (const row of spend) {
        if (row.proposalId && row.proposalNo) proposalNoById[row.proposalId] = row.proposalNo;
      }
    }

    const fin = (Array.isArray(finRows) ? finRows : [])
      .filter((r) => textValue(r?.supplier) === supplierName)
      .filter((r) => inPeriod(r?.approvedAtIso ?? r?.raw?.approved_at ?? r?.raw?.director_approved_at))
      .filter((r) => {
        if (!allowedProposalIds) return true;
        const pid = textValue(r?.proposalId ?? r?.proposal_id);
        return pid && allowedProposalIds.has(pid);
      });

    const t0 = mid(new Date());
    const dueDays = FIN_DUE_DAYS_DEFAULT;

    const invoices = fin
      .map((r, idx: number) => {
        const amount = pickFinanceAmount(r);
        const paid = pickFinancePaid(r);
        const rest = Math.max(amount - paid, 0);

        const pid = textValue(r?.proposalId ?? r?.proposal_id);
        const invNo = textValue(r?.invoiceNumber ?? r?.raw?.invoice_number);

        const approvedIso =
          pickApprovedIso(r) ??
          pickIso10(r?.raw?.director_approved_at, r?.raw?.approved_at, r?.raw?.approvedAtIso);

        const invoiceIso =
          pickInvoiceIso(r) ??
          pickIso10(r?.raw?.invoice_date, r?.raw?.invoice_at, r?.raw?.created_at);

        const pno = pid ? textValue(proposalNoById[pid] ?? r?.proposal_no) : "";
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
  }, [FIN_CRITICAL_DAYS, FIN_DUE_DAYS_DEFAULT, finFrom, finRows, finSpendRows, finTo, pushFin, setFinSupplier]);

  const closeSupplier = useCallback(() => {
    setFinSupplier(null);
    popFin();
  }, [setFinSupplier, popFin]);

  const openFinKind = useCallback((kind: string, list: FinSpendRowLike[]) => {
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
    const supName = textValue(finSupplier?.supplier);
    if (!supName) {
      Alert.alert("PDF", "Поставщик не выбран");
      return;
    }

    const kindName = textValue(finSupplier?._kindName);
    const inPeriod = makeIsoInPeriod(finFrom, finTo);
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
        const financeFiltered = (Array.isArray(finRows) ? finRows : [])
          .filter((r) => textValue(r?.supplier) === supName)
          .filter((r) => inPeriod(r?.approvedAtIso ?? r?.raw?.approved_at ?? r?.raw?.director_approved_at));

        let spendFiltered = (Array.isArray(finSpendRows) ? finSpendRows : [])
          .map(normalizeSpendRow)
          .filter((r) => r.supplierName === supName)
          .filter((r) => inPeriod(r.approvedIso));

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
  }, [busy, supabase, finSupplier, finFrom, finTo, finRows, finSpendRows, router]);

  const financePeriodShort = useMemo(() => {
    return finFrom || finTo
      ? `${finFrom ? fmtDateOnly(finFrom) : "—"} → ${finTo ? fmtDateOnly(finTo) : "—"}`
      : "Весь период";
  }, [finFrom, finTo, fmtDateOnly]);

  const financeSupplierName = useMemo(() => {
    return textValue(finSupplier?.supplier);
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
