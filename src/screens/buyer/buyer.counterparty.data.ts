import { listSuppliers, type Supplier } from "../../lib/catalog_api";
import {
  fetchBuyerContractorsBasic,
  fetchBuyerContractorsFallback,
  fetchBuyerProposalSuppliersBasic,
  fetchBuyerProposalSuppliersFallback,
  fetchBuyerSubcontracts,
} from "./hooks/useBuyerCounterpartyRepo";
import type {
  BuyerCounterpartyRepoContractorFallbackRow,
  BuyerCounterpartyRepoProposalSupplierFallbackRow,
  BuyerCounterpartyRepoSubcontractRow,
} from "./hooks/useBuyerCounterpartyRepo.data";

export type BuyerCounterpartySuggestion = {
  name: string;
  role: "supplier" | "contractor" | "both" | "other";
};

export type BuyerCounterpartySourceDiag = {
  source: "suppliers" | "contractors" | "subcontracts" | "proposal_items";
  ok: boolean;
  rows: number;
  query: string;
  error: string | null;
};

type BuyerContractorRow = BuyerCounterpartyRepoContractorFallbackRow;

type BuyerSubcontractRow = BuyerCounterpartyRepoSubcontractRow;

type BuyerProposalSupplierRow = BuyerCounterpartyRepoProposalSupplierFallbackRow;

type QueryLikeError = { message?: unknown } | null | undefined;
type QueryLikeResult<TRow> = { data: TRow[] | null; error: QueryLikeError };

type CounterpartyLoadPlan<TRow> = {
  query: string;
  run: () => Promise<QueryLikeResult<TRow>>;
};

type CounterpartySourceLoad<TRow> = {
  rows: TRow[];
  diag: BuyerCounterpartySourceDiag;
};

type BuyerCounterpartyLoadResult = {
  suppliers: Supplier[];
  counterparties: BuyerCounterpartySuggestion[];
  sourceDiag: BuyerCounterpartySourceDiag[];
};

type BuyerCounterpartyCacheEntry = {
  value: BuyerCounterpartyLoadResult | null;
  expiresAt: number;
  promise: Promise<BuyerCounterpartyLoadResult> | null;
};

const BUYER_COUNTERPARTY_CACHE_TTL_MS = 5 * 60 * 1000;
const buyerCounterpartyCache: BuyerCounterpartyCacheEntry = {
  value: null,
  expiresAt: 0,
  promise: null,
};

const now = () => Date.now();

const asErrorMessage = (value: unknown): string => {
  if (value instanceof Error && value.message.trim()) return value.message.trim();
  if (value && typeof value === "object" && "message" in value) {
    const msg = String((value as { message?: unknown }).message ?? "").trim();
    if (msg) return msg;
  }
  return String(value ?? "unknown error");
};

const failedSourceResult = <TRow,>(
  source: BuyerCounterpartySourceDiag["source"],
  query: string,
  error: unknown,
): CounterpartySourceLoad<TRow> => ({
  rows: [],
  diag: {
    source,
    ok: false,
    rows: 0,
    query,
    error: asErrorMessage(error),
  },
});

const loadWithPlans = async <TRow,>(
  source: BuyerCounterpartySourceDiag["source"],
  plans: CounterpartyLoadPlan<TRow>[],
): Promise<CounterpartySourceLoad<TRow>> => {
  let lastError: unknown = null;
  for (const plan of plans) {
    try {
      const result = await plan.run();
      if (!result.error) {
        const rows = Array.isArray(result.data) ? result.data : [];
        return {
          rows,
          diag: { source, ok: true, rows: rows.length, query: plan.query, error: null },
        };
      }
      lastError = result.error;
    } catch (error) {
      lastError = error;
    }
  }

  return failedSourceResult(source, plans[plans.length - 1]?.query ?? "unknown", lastError);
};

const pushCounterparty = (
  list: BuyerCounterpartySuggestion[],
  seen: Set<string>,
  name: string,
  role: BuyerCounterpartySuggestion["role"],
) => {
  const normalized = String(name || "").trim();
  const key = `${role}:${normalized.toLowerCase()}`;
  if (!normalized || seen.has(key)) return;
  seen.add(key);
  list.push({ name: normalized, role });
};

const cloneBuyerCounterpartyDiag = (
  diag: BuyerCounterpartySourceDiag,
): BuyerCounterpartySourceDiag => ({
  source: diag.source,
  ok: diag.ok,
  rows: diag.rows,
  query: diag.query,
  error: diag.error,
});

const cloneSupplier = (row: Supplier): Supplier => ({ ...row });

const cloneBuyerCounterpartySuggestion = (
  row: BuyerCounterpartySuggestion,
): BuyerCounterpartySuggestion => ({ ...row });

const cloneBuyerCounterpartyLoadResult = (
  result: BuyerCounterpartyLoadResult,
): BuyerCounterpartyLoadResult => ({
  suppliers: result.suppliers.map(cloneSupplier),
  counterparties: result.counterparties.map(cloneBuyerCounterpartySuggestion),
  sourceDiag: result.sourceDiag.map(cloneBuyerCounterpartyDiag),
});

const isBuyerCounterpartyCacheable = (result: BuyerCounterpartyLoadResult): boolean =>
  result.sourceDiag.length > 0 && result.sourceDiag.every((diag) => diag.ok);

const mapBuyerCounterpartyData = (params: {
  supplierRows: Supplier[];
  contractors: BuyerContractorRow[];
  subcontractRows: BuyerSubcontractRow[];
  proposalSuppliers: BuyerProposalSupplierRow[];
}): Pick<BuyerCounterpartyLoadResult, "suppliers" | "counterparties"> => {
  const { supplierRows, contractors, subcontractRows, proposalSuppliers } = params;
  const suppliers: Supplier[] = [];
  const counterparties: BuyerCounterpartySuggestion[] = [];
  const seenCounterparties = new Set<string>();

  for (const row of supplierRows) {
    const name = String(row?.name ?? "").trim();
    if (!name) continue;
    suppliers.push(row);
    pushCounterparty(counterparties, seenCounterparties, name, "supplier");
  }

  for (const row of contractors) {
    const name = String(
      row.company_name ?? row.name ?? row.organization ?? row.org_name ?? "",
    ).trim();
    if (!name) continue;

    suppliers.push({
      id: `contractor:${String(row.id ?? name)}`,
      name,
      inn: row.inn ?? null,
      phone: row.phone ?? null,
      bank_account: null,
      specialization: null,
      email: null,
      website: null,
      address: null,
      contact_name: null,
      notes: "Source: contractors",
    });
    pushCounterparty(counterparties, seenCounterparties, name, "contractor");
  }

  for (const row of subcontractRows) {
    const sourceRole = String(row.counterparty_type ?? row.party_role ?? row.role ?? "")
      .trim()
      .toLowerCase();
    const roleHint: BuyerCounterpartySuggestion["role"] =
      sourceRole.includes("supplier")
        ? "supplier"
        : sourceRole.includes("contractor") || sourceRole.includes("work") || sourceRole.includes("service")
          ? "contractor"
          : "both";

    const variants = [
      String(row.contractor_org ?? "").trim(),
      String(row.subcontractor_org ?? "").trim(),
      String(row.supplier_org ?? "").trim(),
      String(row.company_name ?? "").trim(),
      String(row.organization ?? "").trim(),
    ].filter(Boolean);

    for (const name of variants) {
      suppliers.push({
        id: `subcontractor:${String(row.id ?? name)}:${name}`,
        name,
        inn: row.contractor_inn ?? row.supplier_inn ?? row.inn ?? null,
        phone: row.contractor_phone ?? row.supplier_phone ?? row.phone ?? null,
        bank_account: null,
        specialization: null,
        email: null,
        website: null,
        address: null,
        contact_name: null,
        notes: "Source: subcontracts contractor org",
      });
      pushCounterparty(counterparties, seenCounterparties, name, roleHint);
    }
  }

  for (const row of proposalSuppliers) {
    const name = String(row.supplier ?? row.supplier_name ?? row.company_name ?? "").trim();
    if (!name) continue;
    pushCounterparty(counterparties, seenCounterparties, name, "supplier");
  }

  return {
    suppliers: suppliers.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru")),
    counterparties: counterparties.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ru")),
  };
};

async function loadBuyerCounterpartyDataFresh(): Promise<BuyerCounterpartyLoadResult> {
  const [supplierRowsSettled, contractorsSettled, subcontractsSettled, proposalSuppliersSettled] =
    await Promise.allSettled([
      listSuppliers(),
      loadWithPlans<BuyerContractorRow>("contractors", [
        {
          query: 'contractors.select("id,company_name,phone,inn").order("company_name")',
          run: fetchBuyerContractorsBasic,
        },
        {
          query: 'contractors.select("*").limit(3000)',
          run: fetchBuyerContractorsFallback,
        },
      ]),
      loadWithPlans<BuyerSubcontractRow>("subcontracts", [
        {
          query: 'subcontracts.select("id,contractor_org,contractor_inn,contractor_phone").limit(2000)',
          run: fetchBuyerSubcontracts,
        },
      ]),
      loadWithPlans<BuyerProposalSupplierRow>("proposal_items", [
        {
          query: 'proposal_items.select("supplier").not("supplier","is",null).limit(3000)',
          run: fetchBuyerProposalSuppliersBasic,
        },
        {
          query: 'proposal_items.select("*").limit(3000)',
          run: fetchBuyerProposalSuppliersFallback,
        },
      ]),
    ]);

  const supplierRows =
    supplierRowsSettled.status === "fulfilled" && Array.isArray(supplierRowsSettled.value)
      ? supplierRowsSettled.value
      : [];

  const supplierDiag: BuyerCounterpartySourceDiag = {
    source: "suppliers",
    ok: supplierRowsSettled.status === "fulfilled",
    rows: supplierRows.length,
    query: "catalog_api.listSuppliers()",
    error: supplierRowsSettled.status === "rejected" ? asErrorMessage(supplierRowsSettled.reason) : null,
  };

  const contractors =
    contractorsSettled.status === "fulfilled"
      ? contractorsSettled.value
      : failedSourceResult<BuyerContractorRow>("contractors", "contractors:unknown", contractorsSettled.reason);
  const subcontracts =
    subcontractsSettled.status === "fulfilled"
      ? subcontractsSettled.value
      : failedSourceResult<BuyerSubcontractRow>("subcontracts", "subcontracts:unknown", subcontractsSettled.reason);
  const proposalSuppliers =
    proposalSuppliersSettled.status === "fulfilled"
      ? proposalSuppliersSettled.value
      : failedSourceResult<BuyerProposalSupplierRow>(
          "proposal_items",
          "proposal_items:unknown",
          proposalSuppliersSettled.reason,
        );

  const mapped = mapBuyerCounterpartyData({
    supplierRows,
    contractors: contractors.rows,
    subcontractRows: subcontracts.rows,
    proposalSuppliers: proposalSuppliers.rows,
  });

  return {
    ...mapped,
    sourceDiag: [supplierDiag, contractors.diag, subcontracts.diag, proposalSuppliers.diag],
  };
}

export async function loadBuyerCounterpartyData(
  opts?: { force?: boolean },
): Promise<BuyerCounterpartyLoadResult> {
  const force = opts?.force === true;
  if (!force && buyerCounterpartyCache.value && buyerCounterpartyCache.expiresAt > now()) {
    return cloneBuyerCounterpartyLoadResult(buyerCounterpartyCache.value);
  }

  if (!force && buyerCounterpartyCache.promise) {
    return cloneBuyerCounterpartyLoadResult(await buyerCounterpartyCache.promise);
  }

  buyerCounterpartyCache.promise = (async () => {
    const result = await loadBuyerCounterpartyDataFresh();
    if (isBuyerCounterpartyCacheable(result)) {
      buyerCounterpartyCache.value = cloneBuyerCounterpartyLoadResult(result);
      buyerCounterpartyCache.expiresAt = now() + BUYER_COUNTERPARTY_CACHE_TTL_MS;
    } else {
      buyerCounterpartyCache.value = null;
      buyerCounterpartyCache.expiresAt = 0;
    }
    return result;
  })();

  try {
    return cloneBuyerCounterpartyLoadResult(await buyerCounterpartyCache.promise);
  } finally {
    buyerCounterpartyCache.promise = null;
  }
}
