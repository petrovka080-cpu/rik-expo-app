import type {
  FinKindSummary,
  FinRep,
  FinSpendRow,
  FinSpendSummary,
  FinSpendSummaryRow,
  FinSupplierInput,
  FinSupplierInvoice,
  FinSupplierPanelState,
  FinSupplierViewModel,
  FinanceRow,
} from "./director.finance.types";
import {
  DASH,
  FINANCE_KIND_FALLBACK,
  FINANCE_KIND_ORDER_VALUES,
  addDaysIso,
  asFinanceRecord,
  financeText,
  financeTextOrFallback,
  mid,
  normalizeFinSpendRows,
  nnum,
  optionalNumber,
  parseMid,
  pickApprovedIso,
  pickFinanceAmount,
  pickFinancePaid,
  pickInvoiceIso,
  pickIso10,
} from "./director.finance.shared";

const pickSupplierText = (value: unknown): string => {
  const row = asFinanceRecord(value);
  if (typeof row.supplier === "string") return row.supplier.trim();
  if (row.supplier && typeof row.supplier === "object") {
    return financeText(asFinanceRecord(row.supplier).supplier);
  }
  return financeText(row.name);
};

export const normalizeFinSupplierInput = (
  value: FinSupplierInput | string,
): FinSupplierViewModel => {
  if (typeof value === "string") {
    return { supplier: value.trim() || DASH, _kindName: "" };
  }

  const row = asFinanceRecord(value);
  return {
    supplier: pickSupplierText(value) || DASH,
    name: financeText(row.name) || null,
    _kindName: financeText(row._kindName) || null,
    kindName: financeText(row.kindName) || null,
    amount: optionalNumber(row.amount),
    count: optionalNumber(row.count),
    overdueCount: optionalNumber(row.overdueCount),
    criticalCount: optionalNumber(row.criticalCount),
    invoices: Array.isArray(row.invoices) ? (row.invoices as FinSupplierInvoice[]) : undefined,
  };
};

export const computeFinanceRep = (
  rows: FinanceRow[],
  opts?: {
    dueDaysDefault?: number;
    criticalDays?: number;
    periodFromIso?: string | null;
    periodToIso?: string | null;
  },
): FinRep => {
  const list = Array.isArray(rows) ? rows : [];
  const dueDaysDefault = Number(opts?.dueDaysDefault ?? 7) || 7;
  const criticalDays = Number(opts?.criticalDays ?? 14) || 14;
  const from = String(opts?.periodFromIso ?? "").slice(0, 10);
  const to = String(opts?.periodToIso ?? "").slice(0, 10);

  const inPeriod = (iso?: string | null) => {
    const date = String(iso ?? "").slice(0, 10);
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };

  const now = mid(new Date());
  let sumApproved = 0;
  let sumPaid = 0;
  let sumToPay = 0;
  let sumOverdue = 0;
  let sumOverdueAmount = 0;
  let sumCritical = 0;
  let sumCriticalAmount = 0;
  let sumPartial = 0;
  let sumPartialPaid = 0;
  let debtCount = 0;

  const bySupplier = new Map<
    string,
    {
      approved: number;
      paid: number;
      toPay: number;
      count: number;
      overdueCount: number;
      criticalCount: number;
    }
  >();

  for (const row of list) {
    const approvedIso = row.approvedAtIso ?? row.invoiceDate ?? null;
    if (!inPeriod(approvedIso)) continue;

    const amount = nnum(row.amount);
    const paid = nnum(row.paidAmount);
    const rest = Math.max(amount - paid, 0);

    sumApproved += amount;
    sumPaid += paid;
    sumToPay += rest;

    const isPartial = paid > 0 && rest > 0;
    if (isPartial) {
      sumPartial += 1;
      sumPartialPaid += paid;
    }
    if (rest > 0) debtCount += 1;

    const dueIso =
      row.dueDate ??
      (row.invoiceDate ? addDaysIso(String(row.invoiceDate), dueDaysDefault) : null) ??
      (row.approvedAtIso ? addDaysIso(String(row.approvedAtIso), dueDaysDefault) : null);

    const dueMid = parseMid(dueIso);
    const isOverdue = rest > 0 && dueMid > 0 && dueMid < now;

    let isCritical = false;
    if (isOverdue) {
      const daysOverdue = Math.floor((now - dueMid) / (24 * 3600 * 1000));
      isCritical = daysOverdue >= criticalDays;
    }

    if (isOverdue) {
      sumOverdue += 1;
      sumOverdueAmount += rest;
      if (isCritical) {
        sumCritical += 1;
        sumCriticalAmount += rest;
      }
    }

    const supplier = financeTextOrFallback(row.supplier, DASH);
    const current = bySupplier.get(supplier) ?? {
      approved: 0,
      paid: 0,
      toPay: 0,
      count: 0,
      overdueCount: 0,
      criticalCount: 0,
    };

    current.approved += amount;
    current.paid += paid;
    current.toPay += rest;
    current.count += 1;
    if (isOverdue) current.overdueCount += 1;
    if (isCritical) current.criticalCount += 1;

    bySupplier.set(supplier, current);
  }

  const suppliers = Array.from(bySupplier.entries())
    .map(([supplier, totals]) => ({
      supplier,
      count: totals.count,
      approved: totals.approved,
      paid: totals.paid,
      toPay: totals.toPay,
      overdueCount: totals.overdueCount,
      criticalCount: totals.criticalCount,
    }))
    .sort((left, right) => right.toPay - left.toPay);

  return {
    summary: {
      approved: sumApproved,
      paid: sumPaid,
      partialPaid: sumPartialPaid,
      toPay: sumToPay,
      overdueCount: sumOverdue,
      overdueAmount: sumOverdueAmount,
      criticalCount: sumCritical,
      criticalAmount: sumCriticalAmount,
      partialCount: sumPartial,
      debtCount,
    },
    report: { suppliers },
  };
};

export const computeFinanceByKind = (spendRows: FinSpendRow[]): FinKindSummary[] => {
  const list = Array.isArray(spendRows) ? spendRows : [];
  const byKind = new Map<string, { count: number; approved: number; paid: number }>();

  for (const row of list) {
    const kind = financeText(row.kind_name) || "\u041f\u0440\u043e\u0447\u0435\u0435";
    const approved = nnum(row.approved_alloc);
    const paid = nnum(row.paid_alloc ?? row.paid_alloc_cap);
    const current = byKind.get(kind) ?? { count: 0, approved: 0, paid: 0 };
    current.count += 1;
    current.approved += approved;
    current.paid += paid;
    byKind.set(kind, current);
  }

  return Array.from(byKind.entries())
    .map(([kind_name, totals]) => ({
      kind_name,
      count: totals.count,
      approved: totals.approved,
      paid: totals.paid,
      toPay: Math.max(totals.approved - totals.paid, 0),
    }))
    .sort((left, right) => right.approved - left.approved);
};

export const computeFinanceSpendSummary = (spendRows: FinSpendRow[]): FinSpendSummary => {
  const rows = Array.isArray(spendRows) ? spendRows : [];
  let approved = 0;
  let paid = 0;
  let overpay = 0;
  const byProposal = new Map<string, { approved: number; paid: number }>();
  const totalsByKind = new Map<string, { approved: number; paid: number; overpay: number }>();
  const suppliersByKind = new Map<string, Map<string, FinSpendSummaryRow["suppliers"][number]>>();
  const overpayBySupplier = new Map<string, FinSpendSummaryRow["suppliers"][number]>();

  for (const row of rows) {
    const proposalId = financeText(row.proposal_id);
    const kindName = financeText(row.kind_name) || FINANCE_KIND_FALLBACK;
    const supplierName = financeText(row.supplier) || DASH;
    const approvedValue = nnum(row.approved_alloc);
    const paidValue = nnum(row.paid_alloc_cap ?? row.paid_alloc);
    const overpayValue = nnum(row.overpay_alloc);

    approved += approvedValue;
    paid += paidValue;
    overpay += overpayValue;

    if (proposalId) {
      const proposalTotals = byProposal.get(proposalId) ?? { approved: 0, paid: 0 };
      proposalTotals.approved += approvedValue;
      proposalTotals.paid += paidValue;
      byProposal.set(proposalId, proposalTotals);
    }

    const kindTotals = totalsByKind.get(kindName) ?? { approved: 0, paid: 0, overpay: 0 };
    kindTotals.approved += approvedValue;
    kindTotals.paid += paidValue;
    kindTotals.overpay += overpayValue;
    totalsByKind.set(kindName, kindTotals);

    const kindSuppliers =
      suppliersByKind.get(kindName) ??
      new Map<string, FinSpendSummaryRow["suppliers"][number]>();
    const supplierTotals = kindSuppliers.get(supplierName) ?? {
      supplier: supplierName,
      approved: 0,
      paid: 0,
      overpay: 0,
      count: 0,
    };
    supplierTotals.approved += approvedValue;
    supplierTotals.paid += paidValue;
    supplierTotals.overpay += overpayValue;
    supplierTotals.count += 1;
    kindSuppliers.set(supplierName, supplierTotals);
    suppliersByKind.set(kindName, kindSuppliers);

    if (overpayValue > 0) {
      const overpayTotals = overpayBySupplier.get(supplierName) ?? {
        supplier: supplierName,
        approved: 0,
        paid: 0,
        overpay: 0,
        count: 0,
      };
      overpayTotals.overpay += overpayValue;
      overpayTotals.count += 1;
      overpayBySupplier.set(supplierName, overpayTotals);
    }
  }

  let toPay = 0;
  for (const proposalTotals of byProposal.values()) {
    toPay += Math.max(proposalTotals.approved - proposalTotals.paid, 0);
  }

  const orderedKinds = [
    ...FINANCE_KIND_ORDER_VALUES.filter((kind) => totalsByKind.has(kind)),
    ...Array.from(totalsByKind.keys()).filter((kind) => !FINANCE_KIND_ORDER_VALUES.includes(kind)),
  ];

  const kindRows = orderedKinds
    .map<FinSpendSummaryRow | null>((kind) => {
      const totals = totalsByKind.get(kind);
      if (!totals) return null;
      if (totals.approved === 0 && totals.paid === 0 && totals.overpay === 0) return null;

      const suppliers = Array.from((suppliersByKind.get(kind) ?? new Map()).values()).sort(
        (left, right) => right.approved - left.approved,
      );

      return {
        kind,
        approved: totals.approved,
        paid: totals.paid,
        overpay: totals.overpay,
        toPay: Math.max(totals.approved - totals.paid, 0),
        suppliers,
      };
    })
    .filter((row): row is FinSpendSummaryRow => row != null);

  return {
    header: {
      approved,
      paid,
      toPay,
      overpay,
    },
    kindRows,
    overpaySuppliers: Array.from(overpayBySupplier.values()).sort(
      (left, right) => right.overpay - left.overpay,
    ),
  };
};

const makeFinancePeriodFilter = (periodFromIso?: string | null, periodToIso?: string | null) => {
  const from = pickIso10(periodFromIso);
  const to = pickIso10(periodToIso);
  return (iso?: string | null) => {
    const date = pickIso10(iso);
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };
};

export const computeFinanceSupplierPanel = (args: {
  selection:
    | {
        supplier: string;
        kindName?: string | null;
      }
    | null
    | undefined;
  rows: FinanceRow[];
  spendRows: FinSpendRow[];
  periodFromIso?: string | null;
  periodToIso?: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
}): FinSupplierPanelState | null => {
  const supplierName = financeText(args.selection?.supplier);
  const kindName = financeText(args.selection?.kindName);
  if (!supplierName) return null;

  const inPeriod = makeFinancePeriodFilter(args.periodFromIso, args.periodToIso);
  const normalizedSpendRows = normalizeFinSpendRows(args.spendRows).map((row) => ({
    ...row,
    supplierName: financeText(row.supplier),
    kindName: financeText(row.kind_name),
    proposalId: financeText(row.proposal_id),
    proposalNo: financeText(row.proposal_no),
    approvedIso: pickIso10(row.director_approved_at, row.approved_at, row.approvedAtIso),
  }));

  const supplierSpendRows = normalizedSpendRows.filter((row) => row.supplierName === supplierName);
  const supplierFinanceRows = (Array.isArray(args.rows) ? args.rows : []).filter(
    (row) => financeText(row?.supplier) === supplierName,
  );

  let allowedProposalIds: Set<string> | null = null;
  const proposalNoById: Record<string, string> = {};

  if (kindName) {
    const spend = supplierSpendRows
      .filter((row) => row.kindName === kindName)
      .filter((row) => inPeriod(row.approvedIso));

    allowedProposalIds = new Set(spend.map((row) => row.proposalId).filter(Boolean));

    for (const row of spend) {
      if (row.proposalId && row.proposalNo) proposalNoById[row.proposalId] = row.proposalNo;
    }
  }

  const financeRows = supplierFinanceRows
    .filter((row) =>
      inPeriod(pickIso10(row?.approvedAtIso, row?.raw?.approved_at, row?.raw?.director_approved_at)),
    )
    .filter((row) => {
      if (!allowedProposalIds) return true;
      const proposalId = financeText(row?.proposalId ?? row?.proposal_id);
      return proposalId && allowedProposalIds.has(proposalId);
    });

  const dueDays = Number(args.dueDaysDefault ?? 7) || 7;
  const criticalDays = Number(args.criticalDays ?? 14) || 14;
  const now = mid(new Date());

  const invoices = financeRows
    .map((row, index) => {
      const amount = pickFinanceAmount(row);
      const paid = pickFinancePaid(row);
      const rest = Math.max(amount - paid, 0);
      const proposalId = financeText(row?.proposalId ?? row?.proposal_id);
      const invoiceNumber = financeText(row?.invoiceNumber ?? row?.raw?.invoice_number);
      const approvedIso =
        pickApprovedIso(row) ??
        pickIso10(row?.raw?.director_approved_at, row?.raw?.approved_at, row?.raw?.approvedAtIso);
      const invoiceIso =
        pickInvoiceIso(row) ??
        pickIso10(row?.raw?.invoice_date, row?.raw?.invoice_at, row?.raw?.created_at);
      const proposalNo = proposalId ? financeText(proposalNoById[proposalId] ?? row?.proposal_no) : "";
      const title =
        invoiceNumber
          ? `\u0421\u0447\u0451\u0442 \u2116${invoiceNumber}`
          : proposalNo
            ? `\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 ${proposalNo}`
            : proposalId
              ? `\u041f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 #${proposalId.slice(0, 8)}`
              : "\u0421\u0447\u0451\u0442";
      const dueIso =
        row?.dueDate ??
        row?.raw?.due_date ??
        (invoiceIso ? addDaysIso(String(invoiceIso).slice(0, 10), dueDays) : null) ??
        (approvedIso ? addDaysIso(String(approvedIso).slice(0, 10), dueDays) : null);
      const dueMid = parseMid(dueIso) ?? 0;
      const isOverdue = rest > 0 && !!dueMid && dueMid < now;

      let isCritical = false;
      if (isOverdue && dueMid) {
        const days = Math.floor((now - dueMid) / (24 * 3600 * 1000));
        isCritical = days >= criticalDays;
      }

      return {
        id: [
          proposalId || "",
          invoiceNumber || "",
          String(invoiceIso ?? ""),
          String(approvedIso ?? ""),
          String(index),
        ].join("|"),
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
    .filter((row) => row.amount > 0 || row.rest > 0);

  const debtAmount = invoices.reduce((sum, row) => sum + Math.max(nnum(row.rest), 0), 0);
  const debtCount = invoices.filter((row) => Math.max(nnum(row.rest), 0) > 0).length;
  const overdueCount = invoices.filter(
    (row) => row.isOverdue && Math.max(nnum(row.rest), 0) > 0,
  ).length;
  const criticalCount = invoices.filter(
    (row) => row.isCritical && Math.max(nnum(row.rest), 0) > 0,
  ).length;

  return {
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
};
