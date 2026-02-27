// src/screens/director/director.finance.ts
// ✅ ONLY LOGIC. NO JSX. NO REACT COMPONENTS.

// ============================== TYPES ==============================
export type FinanceRow = {
  id: string;

  supplier: string;

  // amounts
  amount: number;      // сумма счета (invoice_amount)
  paidAmount: number;  // оплачено (total_paid)

  currency?: string | null;

  // invoice fields
  invoiceNumber?: string | null;
  invoiceDate?: string | null;

  // dates (director approved / accountant)
  approvedAtIso?: string | null;

  // due (если есть в данных)
  dueDate?: string | null;

  // ✅ payments fact dates (proposal_payments.paid_at MIN/MAX)
  paid_first_at?: string | null;
  paid_last_at?: string | null;

  // proposal
  proposalId?: string | null;
  proposal_id?: string | null;
  proposal_no?: string | null;
  pretty?: string | null;

  // passthrough
  raw?: any;
};

export type FinSupplierDebt = {
  supplier: string;
  count: number;

  approved: number;
  paid: number;
  toPay: number;

  overdueCount: number;
  criticalCount: number;
};

export type FinRep = {
  summary: {
    approved: number;
    paid: number;
    partialPaid: number;
    toPay: number;
    overdueCount: number;
    overdueAmount: number;
    criticalCount: number;
    criticalAmount: number;
    partialCount: number;
    debtCount: number;
  };
  report: {
    suppliers: FinSupplierDebt[];
  };
};

export const nnum = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const s0 = String(v).trim();
  if (!s0) return 0;

  // "8 000 594,05" -> "8000594.05"
  const s = s0
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.\-]/g, "");

  // если точек несколько — оставляем первую, остальные убираем
  const parts = s.split(".");
  const normalized = parts.length <= 2 ? s : `${parts[0]}.${parts.slice(1).join("")}`;

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

export const money = (v: any): string => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ru-RU");
};

// ✅ у тебя в director.tsx mid/parseMid сравниваются как числа (timestamps)
export const mid = (v: any): number => {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  const d = new Date(String(v));
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
};

export const parseMid = (v: any): number => {
  // совместимость: parseMid("2026-02-01") -> timestamp
  return mid(v);
};

export const addDaysIso = (iso: string, days: number) => {
  const s = String(iso ?? "").slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
};

const pickIso10 = (...vals: any[]) => {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (!s || s === "—") continue;
    return s.slice(0, 10);
  }
  return null;
};

export const pickApprovedIso = (r: any) =>
  pickIso10(
    r?.approvedAtIso,
    r?.director_approved_at,
    r?.approved_at,
    r?.approvedAt,
    r?.approved_at_iso
  );

export const pickInvoiceIso = (r: any) =>
  pickIso10(r?.invoiceDate, r?.invoice_date, r?.invoiceIso, r?.invoice_at, r?.created_at, r?.raw?.created_at);

export const pickFinanceAmount = (r: any) =>
  nnum(r?.amount ?? r?.invoice_amount ?? r?.invoiceAmount ?? r?.approved_amount ?? 0);

export const pickFinancePaid = (r: any) =>
  nnum(r?.paidAmount ?? r?.total_paid ?? r?.totalPaid ?? r?.paid_amount ?? 0);

export const mapToFinanceRow = (r: any): FinanceRow => {
  // ============================== MAYAK: NORMALIZE RPC/SQL WRAPPERS ==============================
  const src =
    (r && typeof r === "object" && r !== null
      ? (r.row ?? r.list_accountant_inbox_fact ?? r.data ?? r)
      : r) as any;
  // ============================ END MAYAK: NORMALIZE RPC/SQL WRAPPERS ============================

  const supplier = String(src?.supplier ?? "—").trim() || "—";

  const proposalId = String(src?.proposal_id ?? src?.proposalId ?? src?.id ?? "").trim() || null;
  const invoiceNumber = String(src?.invoice_number ?? src?.invoiceNumber ?? "").trim() || null;

  const id = proposalId || `${supplier}:${invoiceNumber || "no-inv"}`;

  const amount = nnum(src?.invoice_amount ?? src?.amount ?? 0);
  const paidAmount = nnum(src?.total_paid ?? src?.totalPaid ?? src?.paid_amount ?? 0);

  const currency = String(src?.invoice_currency ?? src?.currency ?? "KGS").trim() || "KGS";

  const invoiceDate = pickIso10(
    src?.invoice_date,
    src?.invoiceDate,
    src?.invoice_at,
    src?.invoice_created_at,
    src?.created_at
  );

  const approvedAtIso = pickIso10(
    // факт утверждения (если есть)
    src?.director_approved_at,
    src?.approved_at,
    src?.approvedAtIso,
    src?.approvedAt,

    // ✅ железный fallback: отправлено в бухгалтерию = уже утверждено
    src?.sent_to_accountant_at,
    src?.sentToAccountantAt,
    src?.raw?.sent_to_accountant_at,
    src?.raw?.sentToAccountantAt
  );

  const dueDate = pickIso10(
    src?.due_date,
    src?.dueDate,
    src?.due_at
  );

  // ✅ факт оплат
  const paidFirstAt = pickIso10(
    src?.paid_first_at,
    src?.paidFirstAt,
    src?.raw?.paid_first_at,
    src?.raw?.paidFirstAt
  );

  const paidLastAt = pickIso10(
    src?.paid_last_at,
    src?.paidLastAt,
    src?.raw?.paid_last_at,
    src?.raw?.paidLastAt
  );

  const proposalNo =
    String(src?.proposal_no ?? src?.proposalNo ?? src?.pretty ?? "").trim() || null;

  return {
    id,
    supplier,

    amount,
    paidAmount,
    currency,

    invoiceNumber,
    invoiceDate,

    approvedAtIso,
    dueDate,

    // ✅ ВОТ ЭТОГО НЕ ХВАТАЛО (чтобы дошло до PDF)
    paid_first_at: paidFirstAt,
    paid_last_at: paidLastAt,

    proposalId,
    proposal_id: proposalId,
    proposal_no: proposalNo,
    pretty: proposalNo,

    // raw оставляем как было, но кладём исходный src
    raw: src,
  };
};

// ============================== REPORT ==============================
export const computeFinanceRep = (
  rows: FinanceRow[],
  opts?: {
    dueDaysDefault?: number;
    criticalDays?: number;
    periodFromIso?: string | null;
    periodToIso?: string | null;
  }
): FinRep => {
  const list = Array.isArray(rows) ? rows : [];

  const dueDaysDefault = Number(opts?.dueDaysDefault ?? 7) || 7;
  const criticalDays = Number(opts?.criticalDays ?? 14) || 14;

  const from = String(opts?.periodFromIso ?? "").slice(0, 10);
  const to = String(opts?.periodToIso ?? "").slice(0, 10);

  const inPeriod = (iso?: string | null) => {
    const d = String(iso ?? "").slice(0, 10);
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
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
    { approved: number; paid: number; toPay: number; count: number; overdueCount: number; criticalCount: number }
  >();

  for (const r of list) {
    const approvedIso = r?.approvedAtIso ?? r?.invoiceDate ?? null;
    if (!inPeriod(approvedIso)) continue;

    const a = nnum(r?.amount);
    const p = nnum(r?.paidAmount);
    const rest = Math.max(a - p, 0);

    sumApproved += a;
    sumPaid += p;
    sumToPay += rest;

    const isPartial = p > 0 && rest > 0;
    if (isPartial) {
      sumPartial += 1;
      sumPartialPaid += p;
    }

    if (rest > 0) debtCount += 1;

    // due
    const dueIso =
      r?.dueDate ??
      (r?.invoiceDate ? addDaysIso(String(r.invoiceDate), dueDaysDefault) : null) ??
      (r?.approvedAtIso ? addDaysIso(String(r.approvedAtIso), dueDaysDefault) : null);

    const dueMid = parseMid(dueIso);
    const isOverdue = rest > 0 && dueMid > 0 && dueMid < now;

    let isCritical = false;
    if (isOverdue) {
      const days = Math.floor((now - dueMid) / (24 * 3600 * 1000));
      isCritical = days >= criticalDays;
    }

    if (isOverdue) {
      sumOverdue += 1;
      sumOverdueAmount += rest;
      if (isCritical) {
        sumCritical += 1;
        sumCriticalAmount += rest;
      }
    }

    const s = String(r?.supplier ?? "—").trim() || "—";
    const cur = bySupplier.get(s) ?? {
      approved: 0,
      paid: 0,
      toPay: 0,
      count: 0,
      overdueCount: 0,
      criticalCount: 0,
    };

    cur.approved += a;
    cur.paid += p;
    cur.toPay += rest;
    cur.count += 1;
    if (isOverdue) cur.overdueCount += 1;
    if (isCritical) cur.criticalCount += 1;

    bySupplier.set(s, cur);
  }

  const suppliers: FinSupplierDebt[] = Array.from(bySupplier.entries()).map(([supplier, v]) => ({
    supplier,
    count: v.count,
    approved: v.approved,
    paid: v.paid,
    toPay: v.toPay,
    overdueCount: v.overdueCount,
    criticalCount: v.criticalCount,
  }));

  suppliers.sort((a, b) => b.toPay - a.toPay);

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
