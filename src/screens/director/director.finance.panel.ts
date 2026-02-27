import { Alert, Platform } from "react-native";
import { useCallback, useMemo } from "react";
import { runPdfTop } from "../../lib/pdfRunner";
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

type Deps = {
  busy: BusyLike;
  supabase: any;
  finPage: "home" | "debt" | "spend" | "kind" | "supplier";
  finFrom: string | null;
  finTo: string | null;
  finRows: FinanceRow[];
  finSpendRows: any[];
  finLoading: boolean;
  finSupplier: FinSupplierDebt | null;
  finKindName: string;
  fmtDateOnly: (iso?: string | null) => string;
  pushFin: (p: "home" | "debt" | "spend" | "kind" | "supplier") => void;
  popFin: () => void;
  closeFinance: () => void;
  setFinSupplier: (s: any) => void;
  setFinKindName: (s: string) => void;
  setFinKindList: (v: any[]) => void;
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
  const openSupplier = useCallback((s: any) => {
    const supplierName = (() => {
      if (typeof s === "string") return s.trim() || "—";
      const v =
        s?.supplier?.supplier ??
        s?.supplier ??
        s?.name ??
        "";
      return String(v).trim() || "—";
    })();

    const kindName = (() => {
      if (typeof s === "string") return "";
      const v = s?._kindName ?? s?.kindName ?? "";
      return String(v).trim();
    })();

    const inPeriod = makeIsoInPeriod(finFrom, finTo);

    let allowedProposalIds: Set<string> | null = null;
    const proposalNoById: Record<string, string> = {};

    if (kindName) {
      const spend = (Array.isArray(finSpendRows) ? finSpendRows : [])
        .filter((r: any) => String(r?.supplier ?? "").trim() === supplierName)
        .filter((r: any) => String(r?.kind_name ?? "").trim() === kindName)
        .filter((r: any) => inPeriod(r?.director_approved_at ?? r?.approved_at ?? r?.approvedAtIso));

      allowedProposalIds = new Set(
        spend.map((r: any) => String(r?.proposal_id ?? "").trim()).filter(Boolean),
      );

      for (const r of spend) {
        const pid = String(r?.proposal_id ?? "").trim();
        const pno = String(r?.proposal_no ?? "").trim();
        if (pid && pno) proposalNoById[pid] = pno;
      }
    }

    const fin = (Array.isArray(finRows) ? finRows : [])
      .filter((r: any) => String(r?.supplier ?? "").trim() === supplierName)
      .filter((r: any) => inPeriod(r?.approvedAtIso ?? r?.approved_at ?? r?.director_approved_at))
      .filter((r: any) => {
        if (!allowedProposalIds) return true;
        const pid = String(r?.proposalId ?? r?.proposal_id ?? "").trim();
        return pid && allowedProposalIds.has(pid);
      });

    const t0 = mid(new Date());
    const dueDays = FIN_DUE_DAYS_DEFAULT;

    const invoices = fin
      .map((r: any, idx: number) => {
        const amount = pickFinanceAmount(r);
        const paid = pickFinancePaid(r);
        const rest = Math.max(amount - paid, 0);

        const pid = String(r?.proposalId ?? r?.proposal_id ?? "").trim();
        const invNo = String(r?.invoiceNumber ?? r?.invoice_number ?? "").trim();

        const approvedIso =
          pickApprovedIso(r) ??
          pickIso10(r?.raw?.director_approved_at, r?.raw?.approved_at, r?.raw?.approvedAtIso);

        const invoiceIso =
          pickInvoiceIso(r) ??
          pickIso10(r?.raw?.invoice_date, r?.raw?.invoice_at, r?.raw?.created_at);

        const pno = pid ? String(proposalNoById[pid] ?? r?.proposal_no ?? "").trim() : "";
        const title =
          invNo ? `Счёт №${invNo}` :
            pno ? `Предложение ${pno}` :
              pid ? `Предложение #${pid.slice(0, 8)}` :
                "Счёт";

        const dueIso =
          r?.dueDate ??
          r?.due_date ??
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
      .filter((x: any) => x.amount > 0 || x.rest > 0);

    const debtAmount = invoices.reduce((s2: number, x: any) => s2 + Math.max(nnum(x.rest), 0), 0);
    const debtCount = invoices.filter((x: any) => Math.max(nnum(x.rest), 0) > 0).length;
    const overdueCount = invoices.filter((x: any) => x.isOverdue && Math.max(nnum(x.rest), 0) > 0).length;
    const criticalCount = invoices.filter((x: any) => x.isCritical && Math.max(nnum(x.rest), 0) > 0).length;

    const payload: any = {
      supplier: supplierName,
      _kindName: kindName || "",
      amount: debtAmount,
      count: debtCount,
      overdueCount,
      criticalCount,
      invoices,
    };

    setFinSupplier(payload);
    pushFin("supplier");
  }, [finFrom, finTo, finRows, finSpendRows, FIN_DUE_DAYS_DEFAULT, FIN_CRITICAL_DAYS, setFinSupplier, pushFin]);

  const closeSupplier = useCallback(() => {
    setFinSupplier(null);
    popFin();
  }, [setFinSupplier, popFin]);

  const openFinKind = useCallback((kind: string, list: any[]) => {
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
    await runPdfTop({
      busy,
      supabase,
      key: "pdf:director:finance",
      label: "Готовлю управленческий отчёт...",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: "Director_Management_Report",
      getRemoteUrl: async () => {
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
  }, [busy, supabase, finFrom, finTo, finRows, finSpendRows, FIN_DUE_DAYS_DEFAULT, FIN_CRITICAL_DAYS]);

  const onSupplierPdf = useCallback(async () => {
    const supName = String((finSupplier as any)?.supplier ?? "").trim();
    if (!supName) {
      Alert.alert("PDF", "Поставщик не выбран");
      return;
    }

    await runPdfTop({
      busy,
      supabase,
      key: `pdf:director:supplier:${supName}`,
      label: "Готовлю сводку...",
      mode: Platform.OS === "web" ? "preview" : "share",
      fileName: `Supplier_${supName}`,
      getRemoteUrl: async () => {
        const kindName = String((finSupplier as any)?._kindName ?? "").trim();
        const inPeriod = makeIsoInPeriod(finFrom, finTo);

        const financeFiltered = (Array.isArray(finRows) ? finRows : [])
          .filter((r: any) => String(r?.supplier ?? "").trim() === supName)
          .filter((r: any) => inPeriod(r?.approvedAtIso ?? r?.approved_at ?? r?.director_approved_at));

        let spendFiltered = (Array.isArray(finSpendRows) ? finSpendRows : [])
          .filter((r: any) => String(r?.supplier ?? "").trim() === supName)
          .filter((r: any) => inPeriod(r?.director_approved_at ?? r?.approved_at ?? r?.approvedAtIso));

        if (kindName) {
          spendFiltered = spendFiltered.filter((r: any) => String(r?.kind_name ?? "").trim() === kindName);
        }

        spendFiltered = (spendFiltered as any[]).filter((r) => String(r?.proposal_id ?? "").trim());

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
  }, [busy, supabase, finSupplier, finFrom, finTo, finRows, finSpendRows]);

  const financePeriodShort = useMemo(() => {
    return finFrom || finTo
      ? `${finFrom ? fmtDateOnly(finFrom) : "—"} → ${finTo ? fmtDateOnly(finTo) : "—"}`
      : "Весь период";
  }, [finFrom, finTo, fmtDateOnly]);

  const financeSupplierName = useMemo(() => {
    return String((finSupplier as any)?.supplier ?? "").trim();
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
  };
}
