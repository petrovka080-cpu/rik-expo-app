import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";

type BuyerInboxRow = {
  request_id?: string | null;
  request_item_id?: string | null;
  status?: string | null;
  director_reject_note?: string | null;
  director_reject_at?: string | null;
};

type SupplierRow = Database["public"]["Tables"]["suppliers"]["Row"];
type ContractorRow = Database["public"]["Tables"]["contractors"]["Row"];
type SubcontractRow = Database["public"]["Tables"]["subcontracts"]["Row"];
type ProposalItemRow = Database["public"]["Tables"]["proposal_items"]["Row"];
type ProposalRow = Database["public"]["Tables"]["proposals"]["Row"];
type RequestRow = Pick<Database["public"]["Tables"]["requests"]["Row"], "id" | "display_no" | "status">;
type RequestItemRow = Pick<Database["public"]["Tables"]["request_items"]["Row"], "id" | "request_id">;
type ProposalSummaryRow = Database["public"]["Views"]["v_proposals_summary"]["Row"];

type Timed<T> = {
  data: T;
  ms: number;
};

type SourceStat = {
  name: string;
  startedAtMs: number;
  finishedAtMs: number;
  rows: number;
  ms: number;
  mode: "parallel" | "sequential" | "postfetch";
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "buyer-startup-diagnostic" } },
});

const BUYER_STATUS_PENDING = "РќР° СѓС‚РІРµСЂР¶РґРµРЅРёРё";
const BUYER_STATUS_APPROVED = "РЈС‚РІРµСЂР¶РґРµРЅРѕ";
const BUYER_STATUS_REWORK = "РќР° РґРѕСЂР°Р±РѕС‚РєРµ";

const asArray = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);
const uniq = <T,>(items: T[]): T[] => Array.from(new Set(items));
const trim = (value: unknown) => String(value ?? "").trim();

async function timed<T>(fn: () => Promise<T>): Promise<Timed<T>> {
  const started = performance.now();
  const data = await fn();
  return { data, ms: performance.now() - started };
}

function isRejectedInboxRow(row: BuyerInboxRow | null | undefined): boolean {
  const status = trim(row?.status).toLowerCase();
  return !!row && (!!row.director_reject_at || !!row.director_reject_note || status.includes("отклон") || status.includes("reject"));
}

async function loadBuyerInbox(): Promise<{
  rows: BuyerInboxRow[];
  rpcFetchMs: number;
  rejectContextFetchMs: number;
  rejectContextRows: number;
  totalBeforeSetRowsMs: number;
  labelPreloadMs: number;
  requestIds: string[];
}> {
  const totalStarted = performance.now();
  const inboxFetch = await timed(async () => {
    const { data, error } = await supabase.rpc("list_buyer_inbox", { p_company_id: null });
    if (error) throw error;
    return asArray(data as BuyerInboxRow[]);
  });

  const rejectedIds = uniq(
    inboxFetch.data
      .filter((row) => isRejectedInboxRow(row))
      .map((row) => trim(row.request_item_id))
      .filter(Boolean),
  );

  let rejectContextFetchMs = 0;
  let rejectContextRows = 0;
  if (rejectedIds.length) {
    const ctx = await timed(async () => {
      const { data, error } = await supabase
        .from("proposal_items")
        .select("*")
        .in("request_item_id", rejectedIds);
      if (error) throw error;
      return asArray(data as ProposalItemRow[]);
    });
    rejectContextFetchMs = ctx.ms;
    rejectContextRows = ctx.data.length;
  }

  const totalBeforeSetRowsMs = performance.now() - totalStarted;

  const requestIds = uniq(
    inboxFetch.data.map((row) => trim(row.request_id)).filter(Boolean),
  );

  let labelPreloadMs = 0;
  if (requestIds.length) {
    const labels = await timed(async () => {
      const { data, error } = await supabase.from("requests").select("id, display_no").in("id", requestIds);
      if (error) throw error;
      return asArray(data as RequestRow[]);
    });
    labelPreloadMs = labels.ms;
  }

  return {
    rows: inboxFetch.data,
    rpcFetchMs: inboxFetch.ms,
    rejectContextFetchMs,
    rejectContextRows,
    totalBeforeSetRowsMs,
    labelPreloadMs,
    requestIds,
  };
}

async function loadBuyerBuckets(): Promise<{
  pendingRows: number;
  approvedRows: number;
  rejectedRows: number;
  pendingFetchMs: number;
  approvedFetchMs: number;
  rejectedFetchMs: number;
  rejectedProposalItemsFetchMs: number;
  proposalTitlePreloadMs: number;
  serialFetchChainMs: number;
  transformMs: number;
}> {
  const chainStarted = performance.now();

  const pendingFetch = await timed(async () => {
    const { data, error } = await supabase
      .from("v_proposals_summary")
      .select("proposal_id,status,submitted_at,sent_to_accountant_at,total_sum,items_cnt")
      .eq("status", BUYER_STATUS_PENDING)
      .gt("items_cnt", 0)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return asArray(data as ProposalSummaryRow[]);
  });

  const approvedFetch = await timed(async () => {
    const { data, error } = await supabase
      .from("v_proposals_summary")
      .select("proposal_id,status,submitted_at,sent_to_accountant_at,total_sum,items_cnt")
      .eq("status", BUYER_STATUS_APPROVED)
      .gt("items_cnt", 0)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return asArray(data as ProposalSummaryRow[]);
  });

  const rejectedFetch = await timed(async () => {
    const { data, error } = await supabase
      .from("proposals")
      .select("id, payment_status, submitted_at, created_at")
      .ilike("payment_status", `%${BUYER_STATUS_REWORK}%`)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return asArray(data as ProposalRow[]);
  });

  const seen = new Set<string>();
  const rejectedRaw = rejectedFetch.data
    .filter((row) => {
      const id = trim(row.id);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return trim(row.payment_status).toLowerCase().startsWith(BUYER_STATUS_REWORK.toLowerCase());
    })
    .map((row) => ({
      id: trim(row.id),
      submitted_at: row.submitted_at ?? row.created_at ?? null,
    }));

  let rejectedProposalItemsFetchMs = 0;
  let filteredRejected = rejectedRaw;
  if (rejectedRaw.length) {
    const pi = await timed(async () => {
      const ids = rejectedRaw.map((row) => row.id);
      const { data, error } = await supabase.from("proposal_items").select("proposal_id").in("proposal_id", ids);
      if (error) throw error;
      return asArray(data as Pick<ProposalItemRow, "proposal_id">[]);
    });
    rejectedProposalItemsFetchMs = pi.ms;

    const cnt: Record<string, number> = {};
    for (const row of pi.data) {
      const id = trim(row.proposal_id);
      if (!id) continue;
      cnt[id] = (cnt[id] || 0) + 1;
    }
    filteredRejected = rejectedRaw.filter((row) => (cnt[row.id] || 0) > 0);
  }

  const proposalIds = uniq([
    ...pendingFetch.data.map((row) => trim(row.proposal_id)).filter(Boolean),
    ...approvedFetch.data.map((row) => trim(row.proposal_id)).filter(Boolean),
    ...filteredRejected.map((row) => row.id),
  ]);

  let proposalTitlePreloadMs = 0;
  if (proposalIds.length) {
    const titlePreload = await timed(async () => {
      const { data: linksData, error: linksError } = await supabase
        .from("proposal_items")
        .select("proposal_id, request_item_id")
        .in("proposal_id", proposalIds);
      if (linksError) throw linksError;
      const links = asArray(linksData as Array<Pick<ProposalItemRow, "proposal_id" | "request_item_id">>);

      const requestItemIds = uniq(links.map((row) => trim(row.request_item_id)).filter(Boolean));
      if (!requestItemIds.length) return;

      const { data: requestItemsData, error: requestItemsError } = await supabase
        .from("request_items")
        .select("id, request_id")
        .in("id", requestItemIds);
      if (requestItemsError) throw requestItemsError;
      const requestItems = asArray(requestItemsData as RequestItemRow[]);

      const reqIds = uniq(requestItems.map((row) => trim(row.request_id)).filter(Boolean));
      if (!reqIds.length) return;

      const { error: requestsError } = await supabase.from("requests").select("id, display_no").in("id", reqIds);
      if (requestsError) throw requestsError;
    });
    proposalTitlePreloadMs = titlePreload.ms;
  }

  const serialFetchChainMs = performance.now() - chainStarted;
  const transformStarted = performance.now();
  const transformMs = performance.now() - transformStarted;

  return {
    pendingRows: pendingFetch.data.length,
    approvedRows: approvedFetch.data.length,
    rejectedRows: filteredRejected.length,
    pendingFetchMs: pendingFetch.ms,
    approvedFetchMs: approvedFetch.ms,
    rejectedFetchMs: rejectedFetch.ms,
    rejectedProposalItemsFetchMs,
    proposalTitlePreloadMs,
    serialFetchChainMs,
    transformMs,
  };
}

async function loadBuyerSuppliers(): Promise<{
  suppliersRows: number;
  contractorsRows: number;
  subcontractsRows: number;
  proposalSupplierRows: number;
  suppliersFetchMs: number;
  contractorsFetchMs: number;
  subcontractsFetchMs: number;
  proposalSuppliersFetchMs: number;
  parallelFetchWaitMs: number;
  transformMs: number;
  counterpartiesCount: number;
}> {
  const parallelStarted = performance.now();

  const [suppliersQ, contractorsQ, subcontractsQ, proposalSuppliersQ] = await Promise.all([
    timed(async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id,name,inn,bank_account,specialization,phone,email,website,address,contact_name,notes")
        .order("name", { ascending: true });
      if (error) throw error;
      return asArray(data as SupplierRow[]);
    }),
    timed(async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("id,company_name,phone,inn")
        .order("company_name", { ascending: true });
      if (error) throw error;
      return asArray(data as ContractorRow[]);
    }),
    timed(async () => {
      const { data, error } = await supabase.from("subcontracts").select("*").limit(2000);
      if (error) throw error;
      return asArray(data as SubcontractRow[]);
    }),
    timed(async () => {
      const { data, error } = await supabase
        .from("proposal_items")
        .select("supplier")
        .not("supplier", "is", null)
        .limit(3000);
      if (error) throw error;
      return asArray(data as Pick<ProposalItemRow, "supplier">[]);
    }),
  ]);

  const parallelFetchWaitMs = performance.now() - parallelStarted;
  const transformStarted = performance.now();
  const seenCounterparties = new Set<string>();
  const push = (name: string, role: string) => {
    const key = `${role}:${trim(name).toLowerCase()}`;
    if (!trim(name) || seenCounterparties.has(key)) return;
    seenCounterparties.add(key);
  };

  for (const row of suppliersQ.data) push(trim(row.name), "supplier");
  for (const row of contractorsQ.data) push(trim(row.company_name), "contractor");
  for (const row of subcontractsQ.data) {
    const variants = [
      trim((row as Record<string, unknown>).contractor_org),
      trim((row as Record<string, unknown>).subcontractor_org),
      trim((row as Record<string, unknown>).supplier_org),
      trim((row as Record<string, unknown>).company_name),
      trim((row as Record<string, unknown>).organization),
    ].filter(Boolean);
    for (const name of variants) push(name, "subcontract");
  }
  for (const row of proposalSuppliersQ.data) push(trim(row.supplier), "proposal");

  const transformMs = performance.now() - transformStarted;

  return {
    suppliersRows: suppliersQ.data.length,
    contractorsRows: contractorsQ.data.length,
    subcontractsRows: subcontractsQ.data.length,
    proposalSupplierRows: proposalSuppliersQ.data.length,
    suppliersFetchMs: suppliersQ.ms,
    contractorsFetchMs: contractorsQ.ms,
    subcontractsFetchMs: subcontractsQ.ms,
    proposalSuppliersFetchMs: proposalSuppliersQ.ms,
    parallelFetchWaitMs,
    transformMs,
    counterpartiesCount: seenCounterparties.size,
  };
}

async function loadBuyerSubcontractCount(): Promise<{ ms: number; count: number | null }> {
  return await timed(async () => {
    const { count, error } = await supabase.from("subcontracts").select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? null;
  }).then((result) => ({ ms: result.ms, count: result.data }));
}

async function main() {
  const totalStarted = performance.now();
  const sourceStats: SourceStat[] = [];

  const buyersStarted = performance.now();
  const inboxPromise = loadBuyerInbox().then((result) => {
    sourceStats.push({
      name: "inbox_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.rows.length,
      ms: result.totalBeforeSetRowsMs,
      mode: "parallel",
    });
    return result;
  });
  const bucketsPromise = loadBuyerBuckets().then((result) => {
    sourceStats.push({
      name: "pending_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.pendingRows,
      ms: result.pendingFetchMs,
      mode: "parallel",
    });
    sourceStats.push({
      name: "approved_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.approvedRows,
      ms: result.approvedFetchMs,
      mode: "parallel",
    });
    sourceStats.push({
      name: "rejected_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.rejectedRows,
      ms: result.rejectedFetchMs,
      mode: "parallel",
    });
    return result;
  });
  const suppliersPromise = loadBuyerSuppliers().then((result) => {
    sourceStats.push({
      name: "suppliers_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.suppliersRows,
      ms: result.suppliersFetchMs,
      mode: "parallel",
    });
    sourceStats.push({
      name: "contractors_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.contractorsRows,
      ms: result.contractorsFetchMs,
      mode: "parallel",
    });
    sourceStats.push({
      name: "subcontracts_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.subcontractsRows,
      ms: result.subcontractsFetchMs,
      mode: "parallel",
    });
    sourceStats.push({
      name: "proposal_items_supplier_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.proposalSupplierRows,
      ms: result.proposalSuppliersFetchMs,
      mode: "parallel",
    });
    return result;
  });
  const subcontractCountPromise = loadBuyerSubcontractCount().then((result) => {
    sourceStats.push({
      name: "subcontract_count_fetch",
      startedAtMs: 0,
      finishedAtMs: performance.now() - buyersStarted,
      rows: result.count ?? 0,
      ms: result.ms,
      mode: "parallel",
    });
    return result;
  });

  const [inbox, buckets, suppliers, subcontractCount] = await Promise.all([
    inboxPromise,
    bucketsPromise,
    suppliersPromise,
    subcontractCountPromise,
  ]);

  const postFetchStarted = performance.now();
  const groupsStarted = performance.now();
  const groups = (() => {
    const map = new Map<string, BuyerInboxRow[]>();
    for (const row of inbox.rows) {
      const requestId = trim(row.request_id);
      if (!requestId) continue;
      const bucket = map.get(requestId) ?? [];
      bucket.push(row);
      map.set(requestId, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }));
  })();
  const groupingMs = performance.now() - groupsStarted;

  const proposalNosStarted = performance.now();
  const groupRequestIds = uniq(groups.map(([requestId]) => requestId));
  let proposalNosRows = 0;
  if (groupRequestIds.length) {
    const { data, error } = await supabase.rpc("resolve_req_pr_map", { p_request_ids: groupRequestIds });
    if (error) throw error;
    proposalNosRows = asArray(data as Array<Record<string, unknown>>).length;
  }
  const proposalNosMs = performance.now() - proposalNosStarted;
  const postFetchTotalMs = performance.now() - postFetchStarted;

  const firstUsableMs = inbox.totalBeforeSetRowsMs + groupingMs;
  const fullSettleMs = performance.now() - totalStarted;

  console.log("[buyer_startup_diagnostic]");
  console.log(`buyer_screen_total_load_ms=${Math.round(fullSettleMs)}`);
  console.log(`buyer_first_usable_render_ms=${Math.round(firstUsableMs)}`);
  console.log(`buyer_full_settle_ms=${Math.round(fullSettleMs)}`);
  console.log(`inbox_rows=${inbox.rows.length}`);
  console.log(`groups_count=${groups.length}`);
  console.log(`pending_rows=${buckets.pendingRows}`);
  console.log(`approved_rows=${buckets.approvedRows}`);
  console.log(`rejected_rows=${buckets.rejectedRows}`);
  console.log(`subcontract_count=${subcontractCount.count ?? 0}`);
  console.log(`suppliers_rows=${suppliers.suppliersRows}`);
  console.log(`contractors_rows=${suppliers.contractorsRows}`);
  console.log(`subcontracts_rows=${suppliers.subcontractsRows}`);
  console.log(`proposal_supplier_rows=${suppliers.proposalSupplierRows}`);
  console.log(`counterparties_count=${suppliers.counterpartiesCount}`);
  console.log(`inbox_rpc_fetch_ms=${Math.round(inbox.rpcFetchMs)}`);
  console.log(`inbox_reject_context_fetch_ms=${Math.round(inbox.rejectContextFetchMs)}`);
  console.log(`inbox_reject_context_rows=${inbox.rejectContextRows}`);
  console.log(`inbox_total_before_set_rows_ms=${Math.round(inbox.totalBeforeSetRowsMs)}`);
  console.log(`display_no_preload_ms=${Math.round(inbox.labelPreloadMs)}`);
  console.log(`pending_fetch_ms=${Math.round(buckets.pendingFetchMs)}`);
  console.log(`approved_fetch_ms=${Math.round(buckets.approvedFetchMs)}`);
  console.log(`rejected_fetch_ms=${Math.round(buckets.rejectedFetchMs)}`);
  console.log(`rejected_proposal_items_fetch_ms=${Math.round(buckets.rejectedProposalItemsFetchMs)}`);
  console.log(`proposal_titles_preload_ms=${Math.round(buckets.proposalTitlePreloadMs)}`);
  console.log(`buckets_serial_fetch_chain_ms=${Math.round(buckets.serialFetchChainMs)}`);
  console.log(`suppliers_fetch_ms=${Math.round(suppliers.suppliersFetchMs)}`);
  console.log(`contractors_fetch_ms=${Math.round(suppliers.contractorsFetchMs)}`);
  console.log(`subcontracts_fetch_ms=${Math.round(suppliers.subcontractsFetchMs)}`);
  console.log(`proposal_items_fetch_ms=${Math.round(suppliers.proposalSuppliersFetchMs)}`);
  console.log(`buyer_suppliers_parallel_wait_ms=${Math.round(suppliers.parallelFetchWaitMs)}`);
  console.log(`subcontract_count_fetch_ms=${Math.round(subcontractCount.ms)}`);
  console.log(`buyer_suppliers_transform_ms=${Math.round(suppliers.transformMs)}`);
  console.log(`buyer_buckets_transform_ms=${Math.round(buckets.transformMs)}`);
  console.log(`post_fetch_grouping_ms=${Math.round(groupingMs)}`);
  console.log(`post_fetch_proposal_no_preload_ms=${Math.round(proposalNosMs)}`);
  console.log(`post_fetch_total_ms=${Math.round(postFetchTotalMs)}`);
  console.log(`parallel_sources=${sourceStats.filter((row) => row.mode === "parallel").length}`);
}

main().catch((error: unknown) => {
  console.error("[buyer_startup_diagnostic] failed:", error);
  process.exitCode = 1;
});
