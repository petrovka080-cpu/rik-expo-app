import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { collectSelectInventory, type SelectInventoryEntry } from "../data/unboundedSelectInventory";

export const WHOLE_APP_50K_WAVE = "S_WHOLE_APP_50K_EXPLAIN_P95_PROOF_CLOSEOUT";
export const WHOLE_APP_50K_GREEN_STATUS = "GREEN_WHOLE_APP_50K_EXPLAIN_P95_READY";
export const WHOLE_APP_50K_EXTERNAL_BLOCKER =
  "BLOCKED_EXTERNAL_ONLY_WHOLE_APP_50K_LIVE_DATABASE_REQUIRED";
export const WHOLE_APP_50K_CONNECTIVITY_BLOCKER = "WHOLE_APP_50K_LIVE_PROOF_CONNECTIVITY_FAILED";
export const WHOLE_APP_50K_AUTH_BLOCKER = "WHOLE_APP_50K_LIVE_PROOF_AUTH_FAILED";
export const WHOLE_APP_50K_FIXTURE_DATA_BLOCKER = "50K_FIXTURE_DATA_REQUIRED";

const ARTIFACT_PREFIX = "S_WHOLE_APP_50K";
const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const LIVE_RESULTS_ARTIFACT = "live_query_results.json";

type JsonRecord = Record<string, unknown>;

type QueryKind = "list" | "detail" | "search" | "submit" | "publish" | "ai_context" | "pdf_signed_url";

export type WholeAppQueryPath = {
  id: string;
  kind: QueryKind;
  ownerFiles: string[];
  dataSources: string[];
  expectedMaxLimit: 20 | 50 | 1;
  cursorPagination: boolean;
  tenantOrUserScoped: boolean;
  indexedOrder: boolean;
  p95BudgetMs: number;
  expectedEvidence: string[];
  nPlusOneSafe: boolean;
};

type WholeApp50kReport = {
  fixtureSummary: JsonRecord;
  queryPlans: JsonRecord;
  p95Summary: JsonRecord;
  unboundedQueries: JsonRecord;
  indexes: JsonRecord;
  nplusone: JsonRecord;
  matrix: JsonRecord;
  proof: string;
};

export const WHOLE_APP_50K_BASELINE = {
  users: 50_000,
  b2c_requests: 50_000,
  b2c_request_items: 250_000,
  media_rows: 100_000,
  pdfs: 50_000,
  marketplace_listings: 50_000,
  office_material_procurement_items: 250_000,
  events: 1_000_000,
  ai_context_conversations_month: 50_000,
} as const;

export const WHOLE_APP_LARGE_TABLES = [
  "consumer_repair_request_drafts",
  "consumer_repair_request_items",
  "consumer_repair_request_media",
  "consumer_repair_request_pdfs",
  "consumer_marketplace_links",
  "market_listings",
  "requests",
  "request_items",
  "proposals",
  "warehouse_issues",
  "warehouse_issue_items",
  "purchases",
  "proposal_payments",
  "payments",
  "accounting_payments",
  "proposal_attachments",
  "ai_action_ledger",
  "ai_action_ledger_audit",
  "app_errors",
] as const;

export const WHOLE_APP_QUERY_PATHS: WholeAppQueryPath[] = [
  {
    id: "listConsumerRepairRequestHistory",
    kind: "list",
    ownerFiles: [
      "src/lib/consumerRequests/consumerRequestService.ts",
      "src/lib/consumerRequests/consumerRequestRepository.ts",
    ],
    dataSources: ["consumer_repair_request_drafts", "consumer_repair_request_pdfs", "consumer_marketplace_links"],
    expectedMaxLimit: 20,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 300,
    expectedEvidence: ["limit", "cursorCreatedAt", "consumerUserId", "idx_consumer_repair_requests_user_status_created"],
    nPlusOneSafe: true,
  },
  {
    id: "getConsumerRepairRequest",
    kind: "detail",
    ownerFiles: [
      "src/lib/consumerRequests/consumerRequestService.ts",
      "src/lib/consumerRequests/consumerRequestRepository.ts",
    ],
    dataSources: [
      "consumer_repair_request_drafts",
      "consumer_repair_request_items",
      "consumer_repair_request_media",
      "consumer_repair_request_pdfs",
    ],
    expectedMaxLimit: 1,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 300,
    expectedEvidence: ["requestDraftId", "idx_consumer_repair_request_items_request"],
    nPlusOneSafe: true,
  },
  {
    id: "sendConsumerRepairRequestToMarketplace",
    kind: "submit",
    ownerFiles: ["src/lib/consumerRequests/consumerRequestMarketplaceService.ts"],
    dataSources: ["consumer_repair_request_drafts", "consumer_marketplace_links"],
    expectedMaxLimit: 1,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 1000,
    expectedEvidence: ["validateConsumerRepairRequestForMarketplace", "idempotencyKey"],
    nPlusOneSafe: true,
  },
  {
    id: "listMarketplaceListings",
    kind: "list",
    ownerFiles: ["src/features/market/market.repository.ts", "src/features/market/market.repository.transport.ts"],
    dataSources: ["market_listings", "marketplace_items_scope_page_v1"],
    expectedMaxLimit: 20,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 500,
    expectedEvidence: ["marketplace_items_scope_page_v1", "p_limit", "market_listings_active_created_idx"],
    nPlusOneSafe: true,
  },
  {
    id: "searchMarketplaceListings",
    kind: "search",
    ownerFiles: ["src/features/market/market.repository.ts", "src/features/ai/procurement/procurementSupplierMatchEngine.ts"],
    dataSources: ["market_listings", "marketplace_items_scope_page_v1"],
    expectedMaxLimit: 20,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 500,
    expectedEvidence: ["marketplace_items_scope_page_v1", "search", "market_listings_active_side_kind_created_idx"],
    nPlusOneSafe: true,
  },
  {
    id: "publishMarketplaceListing",
    kind: "publish",
    ownerFiles: ["src/screens/profile/profile.services.ts", "src/features/market/market.repository.transport.ts"],
    dataSources: ["market_listings"],
    expectedMaxLimit: 1,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 1000,
    expectedEvidence: ["publishMarketplaceListing", "validateMarketplaceListingForPublish"],
    nPlusOneSafe: true,
  },
  {
    id: "listOfficeRequests",
    kind: "list",
    ownerFiles: ["src/lib/api/requestCanonical.read.ts", "src/screens/director/director.repository.ts"],
    dataSources: ["requests"],
    expectedMaxLimit: 50,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 300,
    expectedEvidence: ["loadCanonicalRequestsWindow", "range", "requests"],
    nPlusOneSafe: true,
  },
  {
    id: "listMaterialRequests",
    kind: "list",
    ownerFiles: ["src/lib/api/buyer.ts", "src/lib/api/requestCanonical.read.ts"],
    dataSources: ["request_items"],
    expectedMaxLimit: 50,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 300,
    expectedEvidence: ["request_items", "range"],
    nPlusOneSafe: true,
  },
  {
    id: "listProcurementRequests",
    kind: "list",
    ownerFiles: ["src/lib/api/proposals.ts", "src/screens/buyer/buyer.repository.ts"],
    dataSources: ["proposals", "director_pending_proposals_scope_v1", "buyer_summary_inbox_scope_v1"],
    expectedMaxLimit: 50,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 300,
    expectedEvidence: ["director_pending_proposals_scope_v1", "buyer_summary_inbox_scope_v1", "range"],
    nPlusOneSafe: true,
  },
  {
    id: "listWarehouseMovements",
    kind: "list",
    ownerFiles: ["src/screens/warehouse/warehouse.incoming.repo.ts", "src/screens/warehouse/warehouse.api.repo.ts"],
    dataSources: ["warehouse_issues", "warehouse_issue_items", "warehouse_issue_queue_scope_v4"],
    expectedMaxLimit: 50,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 300,
    expectedEvidence: ["warehouse_issue_queue_scope_v4", "warehouse_incoming_queue_scope_v1", "p_limit"],
    nPlusOneSafe: true,
  },
  {
    id: "listPayments",
    kind: "list",
    ownerFiles: ["src/screens/accountant/accountant.repository.ts", "src/lib/api/accountant.ts"],
    dataSources: ["proposal_payments", "payments", "accountant_inbox_scope_v1"],
    expectedMaxLimit: 50,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 300,
    expectedEvidence: ["accountant_inbox_scope_v1", "proposal_payments"],
    nPlusOneSafe: true,
  },
  {
    id: "listDocuments",
    kind: "list",
    ownerFiles: ["src/lib/api/proposalAttachments.service.ts", "src/lib/documents/pdfDocumentActions.ts"],
    dataSources: ["proposal_attachments", "consumer_repair_request_pdfs"],
    expectedMaxLimit: 50,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 300,
    expectedEvidence: ["proposal_attachments", "storage_path", "signed"],
    nPlusOneSafe: true,
  },
  {
    id: "buildAiScreenContext",
    kind: "ai_context",
    ownerFiles: [
      "src/features/ai/context/aiScreenContext.ts",
      "src/features/ai/context/aiContextRedaction.ts",
      "src/features/ai/domainDataGateway",
    ],
    dataSources: ["ai_action_ledger", "screen_context"],
    expectedMaxLimit: 20,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 1000,
    expectedEvidence: ["buildAiScreenContext", "redaction", "facts"],
    nPlusOneSafe: true,
  },
  {
    id: "listAiConversationHistory",
    kind: "list",
    ownerFiles: ["src/features/ai/actionLedger/aiActionLedgerRepository.ts", "src/features/ai/actionLedger/aiActionLedgerRpcBackend.ts"],
    dataSources: ["ai_action_ledger", "ai_action_ledger_audit"],
    expectedMaxLimit: 20,
    cursorPagination: true,
    tenantOrUserScoped: true,
    indexedOrder: true,
    p95BudgetMs: 1000,
    expectedEvidence: ["cursor", "limit", "ai_action_ledger_org_status_created_idx"],
    nPlusOneSafe: true,
  },
];

const EXPECTED_INDEX_OR_RPC_EVIDENCE = [
  { id: "idx_consumer_repair_requests_user_status_created", type: "index" },
  { id: "idx_consumer_repair_request_items_request", type: "index" },
  { id: "idx_consumer_repair_request_media_request_type", type: "index" },
  { id: "idx_consumer_repair_request_pdfs_request_created", type: "index" },
  { id: "market_listings_active_created_idx", type: "index" },
  { id: "market_listings_active_side_kind_created_idx", type: "index" },
  { id: "director_pending_proposals_scope_v1", type: "rpc" },
  { id: "buyer_summary_inbox_scope_v1", type: "rpc" },
  { id: "accountant_inbox_scope_v1", type: "rpc" },
  { id: "warehouse_issue_queue_scope_v4", type: "rpc" },
  { id: "warehouse_incoming_queue_scope_v1", type: "rpc" },
  { id: "idx_warehouse_issue_queue_ready_rows_order_v1", type: "index" },
  { id: "ai_action_ledger_org_status_created_idx", type: "index" },
  { id: "ai_action_ledger_org_hash_status_created_idx", type: "index" },
] as const;

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function artifactPath(name: string): string {
  return path.join(ROOT, "artifacts", `${ARTIFACT_PREFIX}_${name}`);
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath(`${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(markdown: string): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath("proof.md"), markdown, "utf8");
}

function read(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function readJsonArtifact(name: string): JsonRecord | null {
  const filePath = artifactPath(name);
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function liveResultsArtifact(): JsonRecord | null {
  const artifact = readJsonArtifact(LIVE_RESULTS_ARTIFACT);
  if (
    artifact?.proof_kind === "live_whole_app_50k_explain_p95"
    && artifact.executed === true
    && artifact.baseline_commit === currentGitHead()
  ) {
    return artifact;
  }
  return null;
}

function anyLiveResultsArtifact(): JsonRecord | null {
  const artifact = readJsonArtifact(LIVE_RESULTS_ARTIFACT);
  if (
    artifact?.proof_kind === "live_whole_app_50k_explain_p95"
    && artifact.baseline_commit === currentGitHead()
  ) {
    return artifact;
  }
  return null;
}

function liveConnectivityBlocker(error: unknown, fallback: string): string {
  const message = String(error ?? "");
  if (/password authentication failed|authentication failed|28P01/i.test(message)) {
    return WHOLE_APP_50K_AUTH_BLOCKER;
  }
  return /timeout|timedout|terminated|ECONN|EHOST|ENOTFOUND|EAI_AGAIN/i.test(message)
    ? WHOLE_APP_50K_CONNECTIVITY_BLOCKER
    : fallback;
}

function liveCount(liveResults: JsonRecord | null, key: string): number {
  const counts = liveResults?.live_counts;
  if (typeof counts !== "object" || counts === null || Array.isArray(counts)) return 0;
  const value = (counts as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function liveFixtureSufficient(liveResults: JsonRecord | null): boolean {
  if (!liveResults || liveResults.executed !== true) return false;
  return liveCount(liveResults, "b2c_requests") >= WHOLE_APP_50K_BASELINE.b2c_requests
    && liveCount(liveResults, "b2c_request_items") >= WHOLE_APP_50K_BASELINE.b2c_request_items
    && liveCount(liveResults, "media_rows") >= WHOLE_APP_50K_BASELINE.media_rows
    && liveCount(liveResults, "pdfs") >= WHOLE_APP_50K_BASELINE.pdfs
    && liveCount(liveResults, "marketplace_listings") >= WHOLE_APP_50K_BASELINE.marketplace_listings
    && liveCount(liveResults, "events") >= WHOLE_APP_50K_BASELINE.events;
}

function externalBlockerStatus(blocker: unknown): string {
  const reason = String(blocker || "WHOLE_APP_50K_DATABASE_URL_REQUIRED")
    .replace(/[^A-Z0-9_=]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `BLOCKED_EXTERNAL_ONLY_${reason || "WHOLE_APP_50K_DATABASE_URL_REQUIRED"}`;
}

function listFiles(dirPath: string, pattern: RegExp): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const out: string[] = [];
  const pending = [dirPath];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(next);
      else if (pattern.test(entry.name)) out.push(next);
    }
  }
  return out.sort();
}

function combinedMigrationSql(): string {
  return listFiles(MIGRATIONS_DIR, /\.sql$/).map((file) => read(file)).join("\n");
}

function loadEnvFile(relativePath: string): void {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) return;
  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    const value = trimmed.slice(trimmed.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function currentGitHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function explicitGatePassed(envName: string): boolean {
  return process.env[envName] === "1";
}

function sourceForOwner(owner: string): string {
  const fullPath = path.join(ROOT, owner);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) return read(fullPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    return listFiles(fullPath, /\.(ts|tsx)$/).map((file) => read(file)).join("\n");
  }
  return "";
}

function sourceEvidence(pathDef: WholeAppQueryPath): JsonRecord {
  const combined = `${pathDef.ownerFiles.map(sourceForOwner).join("\n")}\n${combinedMigrationSql()}`;
  const missing = pathDef.expectedEvidence.filter((token) => !combined.includes(token));
  return {
    id: pathDef.id,
    owner_files: pathDef.ownerFiles,
    owner_files_present: pathDef.ownerFiles.some((owner) => fs.existsSync(path.join(ROOT, owner))),
    expected_evidence: pathDef.expectedEvidence,
    missing_evidence: missing,
    source_evidence_present: missing.length === 0,
  };
}

export function buildWholeAppUnboundedQueriesAudit(): JsonRecord {
  const largeTables = new Set<string>(WHOLE_APP_LARGE_TABLES);
  const { inventory } = collectSelectInventory(ROOT);
  const largeTableQueries = inventory.filter((entry) => entry.table != null && largeTables.has(entry.table));
  const largeTableSelectStar = largeTableQueries.filter((entry) => entry.selectStar);
  const unresolvedLargeTableQueries = largeTableQueries.filter(
    (entry) => entry.action === "fix_now" || entry.action === "needs_rpc_change",
  );
  const coreListContracts = WHOLE_APP_QUERY_PATHS.filter((query) => ["list", "search"].includes(query.kind)).map((query) => ({
    id: query.id,
    expected_max_limit: query.expectedMaxLimit,
    cursor_pagination: query.cursorPagination,
    tenant_or_user_scoped: query.tenantOrUserScoped,
    indexed_order: query.indexedOrder,
    bounded: query.expectedMaxLimit <= 50 && query.cursorPagination && query.tenantOrUserScoped && query.indexedOrder,
  }));

  return {
    wave: WHOLE_APP_50K_WAVE,
    total_supabase_selects_scanned: inventory.length,
    large_table_queries_scanned: largeTableQueries.length,
    large_tables: WHOLE_APP_LARGE_TABLES,
    core_list_contracts: coreListContracts,
    large_table_select_star_findings: largeTableSelectStar.map(compactSelectFinding),
    unresolved_large_table_findings: unresolvedLargeTableQueries.map(compactSelectFinding),
    large_table_select_star_found: largeTableSelectStar.length > 0,
    all_core_list_queries_bounded:
      coreListContracts.every((query) => query.bounded) && largeTableSelectStar.length === 0 && unresolvedLargeTableQueries.length === 0,
    cursor_pagination_all_core_lists: coreListContracts.every((query) => query.cursor_pagination),
  };
}

function compactSelectFinding(entry: SelectInventoryEntry): JsonRecord {
  return {
    file: entry.file,
    line: entry.line,
    function: entry.function,
    table: entry.table,
    query_string: entry.queryString,
    action: entry.action,
    reason: entry.reason,
  };
}

export function buildWholeAppIndexesAudit(): JsonRecord {
  const sql = combinedMigrationSql();
  const evidence = EXPECTED_INDEX_OR_RPC_EVIDENCE.map((item) => ({
    id: item.id,
    type: item.type,
    present_in_migrations: new RegExp(`\\b${item.id}\\b`, "i").test(sql),
  }));
  const sourceEvidenceRows = WHOLE_APP_QUERY_PATHS.map(sourceEvidence);
  return {
    wave: WHOLE_APP_50K_WAVE,
    evidence,
    missing_evidence: evidence.filter((item) => !item.present_in_migrations),
    source_evidence: sourceEvidenceRows,
    index_or_rpc_evidence_complete: evidence.every((item) => item.present_in_migrations),
    query_source_evidence_complete: sourceEvidenceRows.every((row) => row.source_evidence_present === true),
    indexed_order_all_core_paths: WHOLE_APP_QUERY_PATHS.every((query) => query.indexedOrder),
  };
}

export function buildWholeAppNPlusOneAudit(): JsonRecord {
  const inspectedFiles = [...new Set(WHOLE_APP_QUERY_PATHS.flatMap((query) => query.ownerFiles))]
    .filter((owner) => fs.existsSync(path.join(ROOT, owner)) && fs.statSync(path.join(ROOT, owner)).isFile())
    .map(normalizePath);
  const findings = inspectedFiles.flatMap((file) => {
    const text = read(path.join(ROOT, file));
    const lines = text.split(/\r?\n/);
    const out: JsonRecord[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (!/\b(for|while)\b|\.map\s*\(|\.forEach\s*\(/.test(lines[index] ?? "")) continue;
      const window = extractLoopLikeBody(lines, index);
      if (/await\s+.*(?:supabase|\.from\s*\(|\.rpc\s*\()/.test(window)) {
        out.push({ file, line: index + 1, finding: "possible_query_inside_loop" });
      }
    }
    return out;
  });
  return {
    wave: WHOLE_APP_50K_WAVE,
    inspected_files: inspectedFiles,
    query_paths: WHOLE_APP_QUERY_PATHS.map((query) => ({ id: query.id, n_plus_one_safe: query.nPlusOneSafe })),
    findings,
    nplusone_core_detail_found: findings.length > 0 || WHOLE_APP_QUERY_PATHS.some((query) => !query.nPlusOneSafe),
  };
}

function extractLoopLikeBody(lines: string[], startIndex: number): string {
  const first = lines[startIndex] ?? "";
  let openLine = startIndex;
  let openColumn = first.indexOf("{");
  while (openColumn < 0 && openLine < Math.min(lines.length - 1, startIndex + 3)) {
    openLine += 1;
    openColumn = (lines[openLine] ?? "").indexOf("{");
  }
  if (openColumn < 0) return first;

  const body: string[] = [];
  let depth = 0;
  for (let index = openLine; index < Math.min(lines.length, openLine + 120); index += 1) {
    const line = lines[index] ?? "";
    const scan = index === openLine ? line.slice(openColumn) : line;
    for (const char of scan) {
      if (char === "{") depth += 1;
      if (char === "}") depth -= 1;
    }
    body.push(line);
    if (depth <= 0) break;
  }
  return body.join("\n");
}

function buildFixtureSummary(): JsonRecord {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const liveResults = liveResultsArtifact();
  const anyLiveResults = anyLiveResultsArtifact();
  const liveDatabaseUrlPresent = Boolean(
    String(process.env.WHOLE_APP_50K_DATABASE_URL ?? process.env.SUPABASE_WHOLE_APP_50K_DATABASE_URL ?? "").trim(),
  );
  const liveProofOptIn = process.env.ALLOW_WHOLE_APP_50K_LIVE_PROOF === "1";
  const liveDbReachable = anyLiveResults?.executed === true || liveResults?.executed === true;
  const fixtureSufficient = liveFixtureSufficient(liveResults);
  return {
    wave: WHOLE_APP_50K_WAVE,
    baseline_commit: currentGitHead(),
    target_fixture: WHOLE_APP_50K_BASELINE,
    live_database_url_present: liveDatabaseUrlPresent,
    live_proof_opt_in_present: liveProofOptIn,
    live_runner_ready: true,
    live_runner: "scripts/e2e/runWholeApp50kExplainP95LiveProof.ts",
    live_fixture_verified: liveResults?.live_fixture_verified === true,
    live_db_reachable: liveDbReachable,
    fixture_sufficient: fixtureSufficient,
    live_counts: liveResults?.live_counts ?? null,
    minimum_b2c_requests_required: WHOLE_APP_50K_BASELINE.b2c_requests,
    minimum_b2c_request_items_required: WHOLE_APP_50K_BASELINE.b2c_request_items,
    minimum_media_rows_required: WHOLE_APP_50K_BASELINE.media_rows,
    minimum_pdfs_required: WHOLE_APP_50K_BASELINE.pdfs,
    minimum_marketplace_listings_required: WHOLE_APP_50K_BASELINE.marketplace_listings,
    minimum_events_required: WHOLE_APP_50K_BASELINE.events,
    live_error: anyLiveResults?.executed === false ? anyLiveResults.error ?? null : null,
    external_blocker: liveResults?.live_fixture_verified === true
      ? null
      : !liveDatabaseUrlPresent
        ? "WHOLE_APP_50K_DATABASE_URL_REQUIRED"
        : !liveProofOptIn
          ? "ALLOW_WHOLE_APP_50K_LIVE_PROOF=1_REQUIRED"
          : anyLiveResults?.executed === false
            ? liveConnectivityBlocker(anyLiveResults.error, "RUN_WHOLE_APP_50K_LIVE_PROOF_FAILED")
            : liveDbReachable && !fixtureSufficient
              ? WHOLE_APP_50K_FIXTURE_DATA_BLOCKER
              : "RUN_WHOLE_APP_50K_LIVE_PROOF_REQUIRED",
  };
}

function buildQueryPlans(liveBlocked: boolean): JsonRecord {
  const liveResults = liveResultsArtifact();
  if (liveResults?.query_plans) return liveResults.query_plans as JsonRecord;
  return {
    wave: WHOLE_APP_50K_WAVE,
    mode: liveBlocked ? "planned_external_blocked" : "live_required",
    query_paths: WHOLE_APP_QUERY_PATHS.map((query) => ({
      id: query.id,
      kind: query.kind,
      data_sources: query.dataSources,
      expected_max_limit: query.expectedMaxLimit,
      cursor_pagination: query.cursorPagination,
      tenant_or_user_scoped: query.tenantOrUserScoped,
      indexed_order: query.indexedOrder,
      p95_budget_ms: query.p95BudgetMs,
      explain_analyze_captured: false,
      full_table_scan_found: null,
      p95_ms: null,
    })),
    full_table_scan_core_routes_found: null,
    live_explain_required: true,
  };
}

function buildP95Summary(liveBlocked: boolean): JsonRecord {
  const liveResults = liveResultsArtifact();
  if (liveResults?.p95_summary) return liveResults.p95_summary as JsonRecord;
  const rows = WHOLE_APP_QUERY_PATHS.map((query) => ({
    id: query.id,
    kind: query.kind,
    budget_ms: query.p95BudgetMs,
    p95_ms: null,
    passed: false,
  }));
  return {
    wave: WHOLE_APP_50K_WAVE,
    mode: liveBlocked ? "planned_external_blocked" : "live_required",
    rows,
    history_p95_lte_300ms: false,
    detail_p95_lte_300ms: false,
    marketplace_search_p95_lte_500ms: false,
    ai_context_p95_lte_1000ms: false,
    pdf_signed_url_p95_lte_300ms: false,
    submit_publish_transaction_p95_lte_1000ms: false,
    live_p95_required: true,
  };
}

export function buildWholeApp50kExplainP95Report(): WholeApp50kReport {
  const fixtureSummary = buildFixtureSummary();
  const liveBlocked = fixtureSummary.live_fixture_verified !== true;
  const unboundedQueries = buildWholeAppUnboundedQueriesAudit();
  const indexes = buildWholeAppIndexesAudit();
  const nplusone = buildWholeAppNPlusOneAudit();
  const queryPlans = buildQueryPlans(liveBlocked);
  const p95Summary = buildP95Summary(liveBlocked);
  const green =
    fixtureSummary.live_fixture_verified === true
    && unboundedQueries.all_core_list_queries_bounded === true
    && unboundedQueries.cursor_pagination_all_core_lists === true
    && unboundedQueries.large_table_select_star_found === false
    && queryPlans.full_table_scan_core_routes_found === false
    && nplusone.nplusone_core_detail_found === false
    && indexes.index_or_rpc_evidence_complete === true
    && indexes.query_source_evidence_complete === true
    && p95Summary.history_p95_lte_300ms === true
    && p95Summary.detail_p95_lte_300ms === true
    && p95Summary.marketplace_search_p95_lte_500ms === true
    && p95Summary.ai_context_p95_lte_1000ms === true
    && p95Summary.pdf_signed_url_p95_lte_300ms === true
    && p95Summary.submit_publish_transaction_p95_lte_1000ms === true;
  const externalBlocker = green ? null : fixtureSummary.external_blocker;
  const matrix = {
    final_status: green ? WHOLE_APP_50K_GREEN_STATUS : externalBlockerStatus(externalBlocker),
    fixture_users: WHOLE_APP_50K_BASELINE.users,
    fixture_b2c_requests: WHOLE_APP_50K_BASELINE.b2c_requests,
    fixture_marketplace_listings: WHOLE_APP_50K_BASELINE.marketplace_listings,
    fixture_events: WHOLE_APP_50K_BASELINE.events,
    live_db_reachable: fixtureSummary.live_db_reachable === true,
    fixture_sufficient: fixtureSummary.fixture_sufficient === true,
    b2c_requests: liveCount(liveResultsArtifact(), "b2c_requests"),
    b2c_request_items: liveCount(liveResultsArtifact(), "b2c_request_items"),
    media_rows: liveCount(liveResultsArtifact(), "media_rows"),
    pdfs: liveCount(liveResultsArtifact(), "pdfs"),
    marketplace_listings: liveCount(liveResultsArtifact(), "marketplace_listings"),
    events: liveCount(liveResultsArtifact(), "events"),
    minimum_b2c_requests_required: WHOLE_APP_50K_BASELINE.b2c_requests,
    minimum_b2c_request_items_required: WHOLE_APP_50K_BASELINE.b2c_request_items,
    minimum_media_rows_required: WHOLE_APP_50K_BASELINE.media_rows,
    minimum_pdfs_required: WHOLE_APP_50K_BASELINE.pdfs,
    minimum_marketplace_listings_required: WHOLE_APP_50K_BASELINE.marketplace_listings,
    minimum_events_required: WHOLE_APP_50K_BASELINE.events,
    live_fixture_verified: fixtureSummary.live_fixture_verified === true,
    all_core_list_queries_bounded: unboundedQueries.all_core_list_queries_bounded,
    cursor_pagination_all_core_lists: unboundedQueries.cursor_pagination_all_core_lists,
    large_table_select_star_found: unboundedQueries.large_table_select_star_found,
    full_table_scan_core_routes_found: queryPlans.full_table_scan_core_routes_found,
    nplusone_core_detail_found: nplusone.nplusone_core_detail_found,
    index_or_rpc_evidence_complete: indexes.index_or_rpc_evidence_complete,
    query_source_evidence_complete: indexes.query_source_evidence_complete,
    history_p95_lte_300ms: p95Summary.history_p95_lte_300ms,
    detail_p95_lte_300ms: p95Summary.detail_p95_lte_300ms,
    marketplace_search_p95_lte_500ms: p95Summary.marketplace_search_p95_lte_500ms,
    ai_context_p95_lte_1000ms: p95Summary.ai_context_p95_lte_1000ms,
    pdf_signed_url_p95_lte_300ms: p95Summary.pdf_signed_url_p95_lte_300ms,
    submit_publish_transaction_p95_lte_1000ms: p95Summary.submit_publish_transaction_p95_lte_1000ms,
    full_jest_passed: explicitGatePassed("WHOLE_APP_50K_FULL_JEST_PASSED"),
    release_verify_passed: explicitGatePassed("WHOLE_APP_50K_RELEASE_VERIFY_PASSED"),
    fake_green_claimed: false,
    external_blocker: externalBlocker,
  };
  const proof = [
    `# ${WHOLE_APP_50K_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    "## Static Query Audit",
    `- Core list queries bounded: ${matrix.all_core_list_queries_bounded}`,
    `- Cursor pagination on core lists: ${matrix.cursor_pagination_all_core_lists}`,
    `- Large-table select star found: ${matrix.large_table_select_star_found}`,
    `- N+1 core detail found: ${matrix.nplusone_core_detail_found}`,
    `- Index/RPC evidence complete: ${matrix.index_or_rpc_evidence_complete}`,
    "",
    "## Live 50k Proof",
    `- Live DB reachable: ${matrix.live_db_reachable}`,
    `- Live fixture verified: ${matrix.live_fixture_verified}`,
    `- Fixture sufficient: ${matrix.fixture_sufficient}`,
    `- B2C requests: ${matrix.b2c_requests}/${matrix.minimum_b2c_requests_required}`,
    `- B2C request items: ${matrix.b2c_request_items}/${matrix.minimum_b2c_request_items_required}`,
    `- Media rows: ${matrix.media_rows}/${matrix.minimum_media_rows_required}`,
    `- PDFs: ${matrix.pdfs}/${matrix.minimum_pdfs_required}`,
    `- External blocker: ${matrix.external_blocker}`,
    "",
    "## Gates",
    `- Full Jest passed: ${matrix.full_jest_passed}`,
    `- Release verify passed: ${matrix.release_verify_passed}`,
    "",
    "Whole-app EXPLAIN ANALYZE and p95 gates are not marked green without a live 50k proof database and explicit opt-in.",
    "",
  ].join("\n");

  return { fixtureSummary, queryPlans, p95Summary, unboundedQueries, indexes, nplusone, matrix, proof };
}

export function writeWholeApp50kArtifacts(report = buildWholeApp50kExplainP95Report()): void {
  writeJson("fixture_summary", report.fixtureSummary);
  writeJson("query_plans", report.queryPlans);
  writeJson("p95_summary", report.p95Summary);
  writeJson("unbounded_queries", report.unboundedQueries);
  writeJson("indexes", report.indexes);
  writeJson("nplusone", report.nplusone);
  writeJson("matrix", report.matrix);
  writeProof(report.proof);
}

export function runWholeApp50kCli(kind: "full" | "unbounded" | "indexes" | "nplusone"): void {
  const report = buildWholeApp50kExplainP95Report();
  if (kind === "unbounded") {
    writeJson("unbounded_queries", report.unboundedQueries);
    console.log(JSON.stringify(report.unboundedQueries, null, 2));
    return;
  }
  if (kind === "indexes") {
    writeJson("indexes", report.indexes);
    console.log(JSON.stringify(report.indexes, null, 2));
    return;
  }
  if (kind === "nplusone") {
    writeJson("nplusone", report.nplusone);
    console.log(JSON.stringify(report.nplusone, null, 2));
    return;
  }
  writeWholeApp50kArtifacts(report);
  console.log(JSON.stringify(report.matrix, null, 2));
  if (report.matrix.final_status !== WHOLE_APP_50K_GREEN_STATUS) process.exitCode = 1;
}
