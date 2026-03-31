export type AccountantPaymentAllocRow = {
  proposal_item_id: string;
  amount: number;
};

export type AccountantPaymentMode = "full" | "partial";

export type AccountantPaymentCurrentInvoice = {
  proposal_id?: string | null;
  invoice_currency?: string | null;
  invoice_amount?: number | string | null;
  total_paid?: number | string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  supplier?: string | null;
};

export type AccountantPaymentFormItem = {
  id: string;
  name_human?: string | null;
  uom?: string | null;
  qty?: number | null;
  price?: number | null;
  rik_code?: string | null;
};

type PaidAllocationRow = {
  proposal_item_id?: string | null;
  amount?: number | string | null;
};

type DerivePaymentFormStateParams = {
  current: AccountantPaymentCurrentInvoice | null;
  proposalId: string;
  mode: AccountantPaymentMode;
  items: AccountantPaymentFormItem[];
  paidByLineMap: Map<string, number>;
  paidKnownSum: number;
  allocRows: AccountantPaymentAllocRow[];
  itemsLoading: boolean;
  paymentDataErrorMessage: string | null;
};

type ApplyAllocationRowParams = {
  allocRows: AccountantPaymentAllocRow[];
  itemId: string;
  value: number;
  items: AccountantPaymentFormItem[];
  remainByLine: number[];
};

type BuildFullAllocationRowsParams = {
  items: AccountantPaymentFormItem[];
  remainByLine: number[];
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const nnum = (value: unknown) => {
  const numeric = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
};

export const round2 = (value: number) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function fmt2(value: unknown) {
  const numeric = nnum(value);
  return numeric.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtQty(value: unknown) {
  const numeric = nnum(value);
  return numeric.toLocaleString("ru-RU", {
    maximumFractionDigits: 3,
  });
}

export const normalizePaymentFormItem = (
  value: unknown,
): AccountantPaymentFormItem | null => {
  const row = asRecord(value);
  const id = String(row.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    name_human: row.name_human == null ? null : String(row.name_human),
    uom: row.uom == null ? null : String(row.uom),
    qty: row.qty == null ? null : nnum(row.qty),
    price: row.price == null ? null : nnum(row.price),
    rik_code: row.rik_code == null ? null : String(row.rik_code),
  };
};

export const normalizePaidAllocationRow = (value: unknown): PaidAllocationRow | null => {
  const row = asRecord(value);
  const proposal_item_id = String(row.proposal_item_id ?? "").trim();
  if (!proposal_item_id) return null;
  return {
    proposal_item_id,
    amount: row.amount == null ? null : nnum(row.amount),
  };
};

export const getPaymentFormErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }
  const record = asRecord(error);
  const message = String(record.message ?? record.error ?? record.details ?? "").trim();
  return message || fallback;
};

export function kindOf(item: AccountantPaymentFormItem) {
  const code = String(item?.rik_code ?? "").toUpperCase();
  if (code.startsWith("MAT-")) return "Материалы";
  if (code.startsWith("WRK-")) return "Работы";
  if (code.startsWith("SRV-") || code.startsWith("SVC-")) return "Услуги";
  return "Прочее";
}

export function buildPaidAllocationState(rows: unknown[]) {
  const paidByLineMap = new Map<string, number>();
  let paidKnownSum = 0;

  for (const row of rows.map(normalizePaidAllocationRow).filter((value): value is PaidAllocationRow => !!value)) {
    const proposalItemId = String(row.proposal_item_id ?? "").trim();
    const amount = round2(nnum(row.amount));
    if (!proposalItemId || amount <= 0) continue;

    paidByLineMap.set(
      proposalItemId,
      round2((paidByLineMap.get(proposalItemId) ?? 0) + amount),
    );
    paidKnownSum = round2(paidKnownSum + amount);
  }

  return {
    paidByLineMap,
    paidKnownSum,
  };
}

export function buildAllocMap(allocRows: AccountantPaymentAllocRow[]) {
  const allocMap = new Map<string, number>();
  for (const row of allocRows ?? []) {
    allocMap.set(String(row.proposal_item_id), nnum(row.amount));
  }
  return allocMap;
}

export function buildLineInputMap(allocRows: AccountantPaymentAllocRow[]) {
  const inputs: Record<string, string> = {};
  for (const row of allocRows ?? []) {
    const proposalItemId = String(row.proposal_item_id ?? "").trim();
    if (!proposalItemId) continue;
    const amount = round2(nnum(row.amount));
    if (amount <= 0) continue;
    inputs[proposalItemId] = String(amount);
  }
  return inputs;
}

export function buildAllocRowsSignature(allocRows: AccountantPaymentAllocRow[]) {
  return (allocRows ?? [])
    .map((row) => `${String(row.proposal_item_id ?? "").trim()}:${round2(nnum(row.amount)).toFixed(2)}`)
    .sort()
    .join("|");
}

export function derivePaymentFormState(params: DerivePaymentFormStateParams) {
  const current = params.current;
  const items = params.items ?? [];
  const cur = current?.invoice_currency || "KGS";
  const inv = Number(current?.invoice_amount ?? 0);
  const paid = Number(current?.total_paid ?? 0);
  const restProposal = inv > 0 ? Math.max(0, inv - paid) : 0;

  const lineTotals = items.map((item) => round2(nnum(item.qty) * nnum(item.price)));
  const paidTotalProposal = round2(Math.max(0, nnum(current?.total_paid)));
  const paidBeforeByLine = items.map((item, index) => {
    const proposalItemId = String(item.id ?? "").trim();
    const paidLine = round2(nnum(params.paidByLineMap.get(proposalItemId) ?? 0));
    return Math.min(paidLine, lineTotals[index] || 0);
  });
  const paidUnassigned = round2(Math.max(0, paidTotalProposal - params.paidKnownSum));
  const remainByLine = lineTotals.map((total, index) =>
    round2(Math.max(0, total - nnum(paidBeforeByLine[index]))),
  );
  const remainTotal = round2(remainByLine.reduce((sum, value) => sum + nnum(value), 0));

  const allocMap = buildAllocMap(params.allocRows);
  const allocSum = round2(
    (params.allocRows ?? []).reduce((sum, row) => sum + nnum(row.amount), 0),
  );

  const allocOk = (() => {
    if (!params.proposalId) return true;
    if (params.itemsLoading) return false;
    if (params.paymentDataErrorMessage) return false;

    if (params.mode === "full") {
      if (restProposal <= 0) return false;
      if (!items.length) return true;
      if (params.allocRows?.length) {
        return Math.abs(round2(allocSum - restProposal)) <= 0.01;
      }
      return true;
    }

    if (allocSum <= 0) return false;
    if (allocSum - remainTotal > 0.01) return false;
    return true;
  })();

  return {
    cur,
    restProposal,
    lineTotals,
    paidTotalProposal,
    paidBeforeByLine,
    paidUnassigned,
    remainByLine,
    remainTotal,
    allocMap,
    allocSum,
    allocOk,
  };
}

export function applyAllocationRow(params: ApplyAllocationRowParams) {
  const proposalItemId = String(params.itemId);
  const next = buildAllocMap(params.allocRows);
  const index = params.items.findIndex((item) => String(item.id) === proposalItemId);
  const max = index >= 0 ? Math.max(0, nnum(params.remainByLine[index])) : 0;
  const unclamped = round2(Math.max(0, nnum(params.value)));
  const clamped = Math.min(unclamped, max);

  if (clamped <= 0) next.delete(proposalItemId);
  else next.set(proposalItemId, clamped);

  return Array.from(next.entries()).map(([rowProposalItemId, amount]) => ({
    proposal_item_id: rowProposalItemId,
    amount: round2(amount),
  }));
}

export function buildFullAllocationRows(params: BuildFullAllocationRowsParams) {
  const rows: AccountantPaymentAllocRow[] = [];
  for (let index = 0; index < params.items.length; index += 1) {
    const proposalItemId = String(params.items[index]?.id ?? "");
    const remain = round2(Math.max(0, nnum(params.remainByLine[index])));
    if (proposalItemId && remain > 0) {
      rows.push({
        proposal_item_id: proposalItemId,
        amount: remain,
      });
    }
  }
  return rows;
}
