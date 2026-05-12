import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import path from "node:path";

import type { ProcurementSafeRequestSnapshot } from "../../src/features/ai/procurement/procurementContextTypes";
import {
  hashOpaqueId,
  normalizeProcurementOptionalText,
  normalizeProcurementPositiveNumber,
  normalizeProcurementText,
} from "../../src/features/ai/procurement/procurementRedaction";

type BuyerSummaryInboxRow = {
  request_id?: unknown;
  name_human?: unknown;
  rik_code?: unknown;
  qty?: unknown;
  uom?: unknown;
  app_code?: unknown;
  object_name?: unknown;
};

export type AiProcurementRuntimeRequestSource =
  | "explicit_env"
  | "bounded_buyer_summary_rpc"
  | "missing";

export type AiProcurementRuntimeRequestResolution = {
  status: "loaded" | "empty" | "blocked";
  source: AiProcurementRuntimeRequestSource;
  requestId: string | null;
  requestIdHash: string | null;
  safeSnapshot: ProcurementSafeRequestSnapshot | null;
  itemCount: number;
  boundedRead: true;
  readLimit: number;
  rpcName: "buyer_summary_inbox_scope_v1" | null;
  dbSeedUsed: false;
  fakeRequestCreated: false;
  fakeSuppliersCreated: false;
  fakeMarketplaceDataCreated: false;
  fakeExternalResultsCreated: false;
  authAdminUsed: false;
  listUsersUsed: false;
  serviceRoleUsed: false;
  dbWritesPerformed: false;
  selectStarUsed: false;
  exactReason: string | null;
};

const BUYER_SUMMARY_INBOX_LIMIT = 10;

function loadLocalEnv(): void {
  loadDotenv({ path: path.join(process.cwd(), ".env.local") });
  loadDotenv({ path: path.join(process.cwd(), ".env") });
}

function baseResolution(
  params: Pick<
    AiProcurementRuntimeRequestResolution,
    | "status"
    | "source"
    | "requestId"
    | "requestIdHash"
    | "safeSnapshot"
    | "itemCount"
    | "rpcName"
    | "exactReason"
  >,
): AiProcurementRuntimeRequestResolution {
  return {
    ...params,
    boundedRead: true,
    readLimit: BUYER_SUMMARY_INBOX_LIMIT,
    dbSeedUsed: false,
    fakeRequestCreated: false,
    fakeSuppliersCreated: false,
    fakeMarketplaceDataCreated: false,
    fakeExternalResultsCreated: false,
    authAdminUsed: false,
    listUsersUsed: false,
    serviceRoleUsed: false,
    dbWritesPerformed: false,
    selectStarUsed: false,
  };
}

function normalizeQuantity(value: unknown): number | undefined {
  if (typeof value === "number") return normalizeProcurementPositiveNumber(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return normalizeProcurementPositiveNumber(parsed);
  }
  return undefined;
}

function rowMaterialLabel(row: BuyerSummaryInboxRow): string | undefined {
  return normalizeProcurementOptionalText(row.name_human) ?? normalizeProcurementOptionalText(row.rik_code);
}

function rowsFromRpcData(data: unknown): BuyerSummaryInboxRow[] {
  if (!data || typeof data !== "object") return [];
  const rows = (data as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is BuyerSummaryInboxRow => Boolean(row && typeof row === "object"));
}

function snapshotFromRows(rows: readonly BuyerSummaryInboxRow[]): ProcurementSafeRequestSnapshot | null {
  const firstUsableRow = rows.find((row) => {
    const requestId = normalizeProcurementText(String(row.request_id ?? ""));
    return requestId.length > 0 && Boolean(rowMaterialLabel(row));
  });
  const requestId = normalizeProcurementText(String(firstUsableRow?.request_id ?? ""));
  if (!requestId) return null;

  const requestRows = rows.filter(
    (row) =>
      normalizeProcurementText(String(row.request_id ?? "")) === requestId &&
      Boolean(rowMaterialLabel(row)),
  );
  if (requestRows.length === 0) return null;

  return {
    requestId,
    title: normalizeProcurementOptionalText(firstUsableRow?.object_name),
    projectTitle: normalizeProcurementOptionalText(firstUsableRow?.object_name),
    items: requestRows.slice(0, BUYER_SUMMARY_INBOX_LIMIT).map((row) => ({
      materialLabel: rowMaterialLabel(row),
      quantity: normalizeQuantity(row.qty),
      unit: normalizeProcurementOptionalText(row.uom),
      category: normalizeProcurementOptionalText(row.app_code),
    })),
    evidenceRefs: [
      `internal_app:buyer_summary_inbox_scope_v1:${hashOpaqueId("request", requestId)}`,
    ],
  };
}

export async function resolveAiProcurementRuntimeRequest(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiProcurementRuntimeRequestResolution> {
  loadLocalEnv();

  const explicitRequestId = normalizeProcurementText(env.E2E_PROCUREMENT_TEST_REQUEST_ID);
  if (explicitRequestId) {
    return baseResolution({
      status: "loaded",
      source: "explicit_env",
      requestId: explicitRequestId,
      requestIdHash: hashOpaqueId("request", explicitRequestId),
      safeSnapshot: null,
      itemCount: 0,
      rpcName: null,
      exactReason: null,
    });
  }

  const supabaseUrl = normalizeProcurementText(env.EXPO_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeProcurementText(env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  if (!supabaseUrl || !anonKey) {
    return baseResolution({
      status: "blocked",
      source: "missing",
      requestId: null,
      requestIdHash: null,
      safeSnapshot: null,
      itemCount: 0,
      rpcName: null,
      exactReason: "Missing Supabase anon environment for bounded procurement request discovery.",
    });
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { data, error } = await client.rpc("buyer_summary_inbox_scope_v1", {
    p_offset: 0,
    p_limit: BUYER_SUMMARY_INBOX_LIMIT,
    p_search: null,
    p_company_id: null,
  });
  if (error) {
    return baseResolution({
      status: "blocked",
      source: "missing",
      requestId: null,
      requestIdHash: null,
      safeSnapshot: null,
      itemCount: 0,
      rpcName: "buyer_summary_inbox_scope_v1",
      exactReason: "Bounded buyer summary request discovery failed.",
    });
  }

  const snapshot = snapshotFromRows(rowsFromRpcData(data));
  if (!snapshot) {
    return baseResolution({
      status: "empty",
      source: "missing",
      requestId: null,
      requestIdHash: null,
      safeSnapshot: null,
      itemCount: 0,
      rpcName: "buyer_summary_inbox_scope_v1",
      exactReason: "No real procurement request was returned by bounded buyer summary RPC.",
    });
  }

  return baseResolution({
    status: "loaded",
    source: "bounded_buyer_summary_rpc",
    requestId: snapshot.requestId,
    requestIdHash: hashOpaqueId("request", snapshot.requestId),
    safeSnapshot: snapshot,
    itemCount: snapshot.items?.length ?? 0,
    rpcName: "buyer_summary_inbox_scope_v1",
    exactReason: null,
  });
}
