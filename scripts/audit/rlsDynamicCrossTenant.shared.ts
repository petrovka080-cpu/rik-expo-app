import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const RLS_DYNAMIC_WAVE = "S_RLS_DYNAMIC_CROSS_TENANT_PROOF_CLOSEOUT";
export const RLS_DYNAMIC_GREEN_STATUS = "GREEN_RLS_DYNAMIC_CROSS_TENANT_READY";
export const RLS_DYNAMIC_EXTERNAL_BLOCKER =
  "BLOCKED_EXTERNAL_ONLY_SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED";
export const RLS_DYNAMIC_CONNECTIVITY_BLOCKER = "RLS_DYNAMIC_LIVE_PROOF_CONNECTIVITY_FAILED";
export const RLS_DYNAMIC_AUTH_BLOCKER = "RLS_DYNAMIC_LIVE_PROOF_AUTH_FAILED";

const ARTIFACT_PREFIX = "S_RLS_DYNAMIC_CROSS_TENANT";
const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const DB_TYPES_PATH = path.join(ROOT, "src", "lib", "database.types.ts");
const LIVE_ATTEMPTS_ARTIFACT = "cross_tenant_attempts_live.json";

type JsonRecord = Record<string, unknown>;

export type RlsTargetGroup = {
  logicalName: string;
  actualTables: string[];
  isolation: "owner" | "company" | "public_safe" | "backend_only" | "storage_owner";
  requiredAssertions: string[];
};

export type RlsPolicyCoverageRow = {
  logicalName: string;
  actualTable: string;
  presentInTypes: boolean;
  presentInMigrations: boolean;
  rlsEnabledInRepo: boolean;
  forceRlsInRepo: boolean;
  policyCountInRepo: number;
  broadPolicyFinding: boolean;
  repoEvidenceComplete: boolean;
};

export type RlsDynamicReport = {
  inventory: JsonRecord;
  rlsMatrix: JsonRecord;
  policyCoverage: JsonRecord;
  crossTenantAttempts: JsonRecord;
  storagePolicies: JsonRecord;
  matrix: JsonRecord;
  proof: string;
};

export const RLS_ACTORS = [
  "consumer_a",
  "consumer_b",
  "company_a_director",
  "company_b_director",
  "company_a_foreman",
  "company_a_accountant",
  "anonymous_public",
] as const;

export const RLS_TARGET_GROUPS: RlsTargetGroup[] = [
  {
    logicalName: "consumer_repair_requests",
    actualTables: ["consumer_repair_request_drafts"],
    isolation: "owner",
    requiredAssertions: ["consumer_a_cannot_read_consumer_b", "consumer_b_cannot_update_consumer_a"],
  },
  {
    logicalName: "consumer_repair_request_items",
    actualTables: ["consumer_repair_request_items"],
    isolation: "owner",
    requiredAssertions: ["child_rows_follow_parent_consumer_owner"],
  },
  {
    logicalName: "consumer_repair_request_media",
    actualTables: ["consumer_repair_request_media"],
    isolation: "owner",
    requiredAssertions: ["child_rows_follow_parent_consumer_owner"],
  },
  {
    logicalName: "consumer_repair_request_pdfs",
    actualTables: ["consumer_repair_request_pdfs"],
    isolation: "storage_owner",
    requiredAssertions: ["private_pdf_owner_only", "wrong_user_pdf_blocked"],
  },
  {
    logicalName: "consumer_marketplace_links",
    actualTables: ["consumer_marketplace_links"],
    isolation: "owner",
    requiredAssertions: ["child_rows_follow_parent_consumer_owner"],
  },
  {
    logicalName: "marketplace_listings",
    actualTables: ["market_listings"],
    isolation: "public_safe",
    requiredAssertions: ["draft_owner_only", "public_marketplace_only_published_safe_fields"],
  },
  {
    logicalName: "marketplace_listing_media",
    actualTables: ["media_assets", "media_links"],
    isolation: "public_safe",
    requiredAssertions: ["draft_marketplace_media_owner_only", "public_media_only_marketplace_visible"],
  },
  {
    logicalName: "marketplace_listing_events",
    actualTables: ["media_ai_analysis"],
    isolation: "backend_only",
    requiredAssertions: ["events_not_publicly_readable"],
  },
  {
    logicalName: "office_requests",
    actualTables: ["requests"],
    isolation: "company",
    requiredAssertions: ["consumer_cannot_read_office", "company_b_cannot_read_company_a"],
  },
  {
    logicalName: "material_requests",
    actualTables: ["request_items"],
    isolation: "company",
    requiredAssertions: ["request_items_follow_request_company_scope"],
  },
  {
    logicalName: "procurement_requests",
    actualTables: ["proposals"],
    isolation: "company",
    requiredAssertions: ["approved_request_visible_to_buyer_same_company_only"],
  },
  {
    logicalName: "warehouse_movements",
    actualTables: ["warehouse_issues", "warehouse_issue_items", "purchases"],
    isolation: "company",
    requiredAssertions: ["warehouse_rows_company_scoped", "consumer_cannot_read_warehouse"],
  },
  {
    logicalName: "payments",
    actualTables: ["proposal_payments", "payments", "accounting_payments"],
    isolation: "company",
    requiredAssertions: ["accountant_same_company_only", "consumer_cannot_read_payments"],
  },
  {
    logicalName: "documents",
    actualTables: ["proposal_attachments", "media_assets", "consumer_repair_request_pdfs"],
    isolation: "storage_owner",
    requiredAssertions: ["private_pdf_owner_only", "company_document_scope"],
  },
  {
    logicalName: "audit_events",
    actualTables: ["ai_action_ledger_audit", "consumer_repair_request_events", "app_errors"],
    isolation: "backend_only",
    requiredAssertions: ["audit_events_not_public", "redacted_audit_company_scope"],
  },
  {
    logicalName: "ai_context_events",
    actualTables: ["ai_action_ledger", "ai_action_ledger_audit"],
    isolation: "company",
    requiredAssertions: ["ai_context_company_scope", "consumer_cannot_read_office_ai_context"],
  },
];

const STORAGE_BUCKETS = [
  { id: "private-media", expectedPublic: false, assertion: "private_media_owner_or_service_only" },
  { id: "client-visible-media", expectedPublic: false, assertion: "client_visible_media_company_or_owner_only" },
  { id: "public-marketplace-media", expectedPublic: true, assertion: "public_marketplace_media_only_for_published_safe_assets" },
] as const;

function artifactPath(name: string): string {
  return path.join(ROOT, "artifacts", `${ARTIFACT_PREFIX}_${name}`);
}

export function writeRlsJson(name: string, value: unknown): void {
  fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
  fs.writeFileSync(artifactPath(`${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeRlsProof(markdown: string): void {
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

function liveConnectivityBlocker(error: unknown, fallback: string): string {
  const message = String(error ?? "");
  if (/password authentication failed|authentication failed|28P01/i.test(message)) {
    return RLS_DYNAMIC_AUTH_BLOCKER;
  }
  return /timeout|timedout|terminated|ECONN|EHOST|ENOTFOUND|EAI_AGAIN/i.test(message)
    ? RLS_DYNAMIC_CONNECTIVITY_BLOCKER
    : fallback;
}

function externalBlockerStatus(blocker: unknown): string {
  const reason = String(blocker || "SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED")
    .replace(/[^A-Z0-9_=]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `BLOCKED_EXTERNAL_ONLY_${reason || "SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED"}`;
}

function listFiles(dirPath: string, pattern: RegExp): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const out: string[] = [];
  const pending = [dirPath];
  while (pending.length) {
    const current = pending.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(next);
      } else if (pattern.test(entry.name)) {
        out.push(next);
      }
    }
  }
  return out.sort();
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDatabaseTables(): Set<string> {
  const source = read(DB_TYPES_PATH).split(/\r?\n/);
  const tables = new Set<string>();
  let inPublic = false;
  let inTables = false;
  for (const line of source) {
    const trimmed = line.trim();
    if (!inPublic && trimmed === "public: {") {
      inPublic = true;
      continue;
    }
    if (!inPublic) continue;
    if (trimmed === "Tables: {") {
      inTables = true;
      continue;
    }
    if (/^(Views|Functions|Enums|CompositeTypes): \{$/.test(trimmed)) {
      inTables = false;
      continue;
    }
    const match = line.match(/^ {6}([A-Za-z0-9_]+): \{$/);
    if (inTables && match) tables.add(match[1]);
  }
  return tables;
}

function combinedMigrationSql(): string {
  return listFiles(MIGRATIONS_DIR, /\.sql$/).map((file) => read(file)).join("\n");
}

function countPolicyMatches(sql: string, table: string): number {
  const escaped = escapeRegExp(table);
  return (
    sql.match(new RegExp(`create\\s+policy[\\s\\S]{0,240}?on\\s+public\\.${escaped}\\b`, "gi"))?.length ?? 0
  );
}

function tablePresentInMigrations(sql: string, table: string): boolean {
  const escaped = escapeRegExp(table);
  return new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?public\\.${escaped}\\b`, "i").test(sql);
}

function rlsEnabledInMigrations(sql: string, table: string): boolean {
  const escaped = escapeRegExp(table);
  return new RegExp(`alter\\s+table\\s+public\\.${escaped}\\s+enable\\s+row\\s+level\\s+security`, "i").test(sql);
}

function forceRlsInMigrations(sql: string, table: string): boolean {
  const escaped = escapeRegExp(table);
  return new RegExp(`alter\\s+table\\s+public\\.${escaped}\\s+force\\s+row\\s+level\\s+security`, "i").test(sql);
}

function broadPolicyFinding(sql: string, table: string): boolean {
  const escaped = escapeRegExp(table);
  const snippets = sql.match(new RegExp(`create\\s+policy[\\s\\S]{0,800}?on\\s+public\\.${escaped}[\\s\\S]{0,800}?;`, "gi")) ?? [];
  return snippets.some((snippet) => /using\s*\(\s*true\s*\)|with\s+check\s*\(\s*true\s*\)/i.test(snippet));
}

export function buildPrivateTableRlsCoverage(): JsonRecord {
  const tables = parseDatabaseTables();
  const sql = combinedMigrationSql();
  const rows: RlsPolicyCoverageRow[] = RLS_TARGET_GROUPS.flatMap((group) =>
    group.actualTables.map((table) => {
      const presentInTypes = tables.has(table);
      const presentInMigrations = tablePresentInMigrations(sql, table);
      const rlsEnabledInRepo = rlsEnabledInMigrations(sql, table);
      const forceRlsInRepo = forceRlsInMigrations(sql, table);
      const policyCountInRepo = countPolicyMatches(sql, table);
      const broadPolicy = broadPolicyFinding(sql, table);
      const presentInRepo = presentInTypes || presentInMigrations;
      return {
        logicalName: group.logicalName,
        actualTable: table,
        presentInTypes,
        presentInMigrations,
        rlsEnabledInRepo,
        forceRlsInRepo,
        policyCountInRepo,
        broadPolicyFinding: broadPolicy,
        repoEvidenceComplete: presentInRepo && rlsEnabledInRepo && policyCountInRepo > 0 && !broadPolicy,
      };
    }),
  );
  const missingEvidence = rows.filter((row) => !row.repoEvidenceComplete);
  return {
    wave: RLS_DYNAMIC_WAVE,
    checked_tables: rows.length,
    logical_groups: RLS_TARGET_GROUPS.length,
    rows,
    missing_repo_evidence: missingEvidence,
    private_tables_checked: rows.every((row) => row.presentInTypes || row.presentInMigrations),
    rls_enabled_all_private_tables: rows.every((row) => row.rlsEnabledInRepo),
    policy_coverage_complete: missingEvidence.length === 0,
    broad_policy_findings: rows.filter((row) => row.broadPolicyFinding),
  };
}

export function buildStorageBucketPolicies(): JsonRecord {
  const sql = combinedMigrationSql();
  const bucketRows = STORAGE_BUCKETS.map((bucket) => {
    const bucketInsert = new RegExp(`['"]${escapeRegExp(bucket.id)}['"]`, "i").test(sql);
    const publicFlag = bucket.id === "public-marketplace-media" ? /public-marketplace-media[\s\S]{0,120}true/i.test(sql) : !new RegExp(`${escapeRegExp(bucket.id)}[\\s\\S]{0,120}true`, "i").test(sql);
    const storagePolicyCount =
      sql.match(new RegExp(`create\\s+policy[\\s\\S]{0,400}?storage\\.objects[\\s\\S]{0,400}?${escapeRegExp(bucket.id)}`, "gi"))?.length ?? 0;
    return {
      bucket_id: bucket.id,
      declared: bucketInsert,
      expected_public: bucket.expectedPublic,
      public_flag_matches: publicFlag,
      storage_object_policy_count: storagePolicyCount,
      assertion: bucket.assertion,
      repo_policy_evidence_complete: bucketInsert && publicFlag && storagePolicyCount > 0,
    };
  });
  return {
    wave: RLS_DYNAMIC_WAVE,
    buckets: bucketRows,
    private_buckets_not_public: bucketRows
      .filter((row) => row.expected_public === false)
      .every((row) => row.declared && row.public_flag_matches),
    storage_policy_coverage_complete: bucketRows.every((row) => row.repo_policy_evidence_complete),
  };
}

function listClientFiles(): string[] {
  return ["app", "src"].flatMap((dir) => listFiles(path.join(ROOT, dir), /\.(ts|tsx|js|jsx)$/));
}

export function scanServiceRoleFrontendLeaks(): JsonRecord {
  const findings = listClientFiles()
    .map((filePath) => normalizePath(path.relative(ROOT, filePath)))
    .filter((file) => !file.startsWith("src/lib/server/"))
    .filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .flatMap((file) => {
      const source = read(path.join(ROOT, file));
      return /SUPABASE_SERVICE_ROLE_KEY/.test(source) ? [{ file, finding: "SUPABASE_SERVICE_ROLE_KEY_IN_CLIENT_SURFACE" }] : [];
    });
  return {
    wave: RLS_DYNAMIC_WAVE,
    service_role_frontend_leak_found: findings.length > 0,
    findings,
  };
}

function buildAttemptPlan(): JsonRecord[] {
  return [
    ["consumer_a", "consumer_b", "consumer_repair_request_drafts", "select", "blocked"],
    ["consumer_a", "consumer_b", "consumer_repair_request_drafts", "update", "blocked"],
    ["consumer_a", "office", "requests", "select", "blocked"],
    ["company_a_director", "company_b_director", "requests", "select", "blocked"],
    ["company_a_director", "company_b_director", "requests", "update", "blocked"],
    ["company_a_accountant", "company_b_director", "proposal_payments", "select", "blocked"],
    ["consumer_a", "consumer_b", "consumer_repair_request_pdfs", "select", "blocked"],
    ["consumer_a", "consumer_b", "consumer_repair_request_pdfs", "delete", "blocked"],
    ["anonymous_public", "marketplace_owner", "market_listings:draft", "select", "blocked"],
    ["anonymous_public", "marketplace", "market_listings:published_safe", "select", "allowed_safe_fields_only"],
  ].map(([actor, target, relation, operation, expected]) => ({
    actor,
    target,
    relation,
    operation,
    expected,
  }));
}

export function buildCrossTenantAttempts(): JsonRecord {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const liveArtifact = readJsonArtifact(LIVE_ATTEMPTS_ARTIFACT);
  if (
    liveArtifact?.proof_kind === "live_rls_dynamic_cross_tenant"
    && liveArtifact.baseline_commit === currentGitHead()
  ) {
    if (liveArtifact.executed !== true) {
      return {
        ...liveArtifact,
        wave: RLS_DYNAMIC_WAVE,
        mode: "live_dynamic_failed",
        actors: RLS_ACTORS,
        attempts: buildAttemptPlan(),
        write_capable_database_url_present: true,
        mutation_opt_in_present: true,
        live_runner_ready: true,
        live_runner: "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts",
        cross_tenant_read_blocked: false,
        cross_tenant_write_blocked: false,
        cross_tenant_delete_blocked: false,
        consumer_office_leak_found: null,
        private_pdf_leak_found: null,
        marketplace_draft_leak_found: null,
        external_blocker: liveConnectivityBlocker(liveArtifact.error, "RUN_RLS_DYNAMIC_LIVE_PROOF_FAILED"),
      };
    }
    return liveArtifact;
  }
  const writeCapableDbUrlPresent = Boolean(String(process.env.SUPABASE_RLS_PROOF_DATABASE_URL ?? "").trim());
  const mutationOptIn = process.env.ALLOW_RLS_DYNAMIC_MUTATION_PROOF === "1";
  const readonlyDbUrlPresent = Boolean(String(process.env.PROD_DATABASE_READONLY_URL ?? "").trim());
  const attempts = buildAttemptPlan();
  return {
    wave: RLS_DYNAMIC_WAVE,
    mode: writeCapableDbUrlPresent && mutationOptIn ? "live_dynamic_available" : "planned_external_blocked",
    actors: RLS_ACTORS,
    attempts,
    readonly_catalog_available: readonlyDbUrlPresent,
    write_capable_database_url_present: writeCapableDbUrlPresent,
    mutation_opt_in_present: mutationOptIn,
    live_runner_ready: true,
    live_runner: "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts",
    executed: false,
    external_blocker: !writeCapableDbUrlPresent
      ? "SUPABASE_RLS_PROOF_DATABASE_URL_REQUIRED"
      : !mutationOptIn
        ? "ALLOW_RLS_DYNAMIC_MUTATION_PROOF=1_REQUIRED"
        : "RUN_RLS_DYNAMIC_LIVE_PROOF_REQUIRED",
    cross_tenant_read_blocked: false,
    cross_tenant_write_blocked: false,
    cross_tenant_delete_blocked: false,
    consumer_office_leak_found: null,
    private_pdf_leak_found: null,
    marketplace_draft_leak_found: null,
  };
}

function currentGitHead(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export function buildRlsDynamicCrossTenantReport(): RlsDynamicReport {
  const policyCoverage = buildPrivateTableRlsCoverage();
  const storagePolicies = buildStorageBucketPolicies();
  const serviceRole = scanServiceRoleFrontendLeaks();
  const crossTenantAttempts = buildCrossTenantAttempts();
  const liveExecuted = crossTenantAttempts.executed === true;
  const green =
    policyCoverage.rls_enabled_all_private_tables === true &&
    policyCoverage.policy_coverage_complete === true &&
    storagePolicies.storage_policy_coverage_complete === true &&
    serviceRole.service_role_frontend_leak_found === false &&
    liveExecuted &&
    crossTenantAttempts.cross_tenant_read_blocked === true &&
    crossTenantAttempts.cross_tenant_write_blocked === true &&
    crossTenantAttempts.cross_tenant_delete_blocked === true;

  const inventory = {
    wave: RLS_DYNAMIC_WAVE,
    baseline_commit: currentGitHead(),
    target_groups: RLS_TARGET_GROUPS,
    actors: RLS_ACTORS,
    dynamic_runtime_requires: ["SUPABASE_RLS_PROOF_DATABASE_URL", "ALLOW_RLS_DYNAMIC_MUTATION_PROOF=1"],
  };
  const rlsMatrix = {
    wave: RLS_DYNAMIC_WAVE,
    policy_coverage_complete: policyCoverage.policy_coverage_complete,
    dynamic_attempts_executed: liveExecuted,
    service_role_frontend_leak_found: serviceRole.service_role_frontend_leak_found,
  };
  const fullJestPassed = process.env.RLS_DYNAMIC_FULL_JEST_PASSED === "1";
  const releaseVerifyPassed = process.env.RLS_DYNAMIC_RELEASE_VERIFY_PASSED === "1";
  const externalBlocker = liveExecuted ? null : crossTenantAttempts.external_blocker;
  const matrix = {
    final_status: green ? RLS_DYNAMIC_GREEN_STATUS : externalBlockerStatus(externalBlocker),
    private_tables_checked: policyCoverage.private_tables_checked,
    rls_enabled_all_private_tables: policyCoverage.rls_enabled_all_private_tables,
    policy_coverage_complete: policyCoverage.policy_coverage_complete,
    cross_tenant_read_blocked: liveExecuted && crossTenantAttempts.cross_tenant_read_blocked === true,
    cross_tenant_write_blocked: liveExecuted && crossTenantAttempts.cross_tenant_write_blocked === true,
    cross_tenant_delete_blocked: liveExecuted && crossTenantAttempts.cross_tenant_delete_blocked === true,
    consumer_office_leak_found: liveExecuted ? crossTenantAttempts.consumer_office_leak_found === true : null,
    private_pdf_leak_found: liveExecuted ? crossTenantAttempts.private_pdf_leak_found === true : null,
    marketplace_draft_leak_found: liveExecuted ? crossTenantAttempts.marketplace_draft_leak_found === true : null,
    service_role_frontend_leak_found: serviceRole.service_role_frontend_leak_found,
    storage_policy_coverage_complete: storagePolicies.storage_policy_coverage_complete,
    dynamic_runtime_executed: liveExecuted,
    external_blocker: externalBlocker,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
  const proof = [
    `# ${RLS_DYNAMIC_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    "## Static Coverage",
    `- Private tables checked: ${matrix.private_tables_checked}`,
    `- RLS enabled in repo evidence: ${matrix.rls_enabled_all_private_tables}`,
    `- Policy coverage complete in repo evidence: ${matrix.policy_coverage_complete}`,
    `- Storage policy coverage complete: ${matrix.storage_policy_coverage_complete}`,
    `- Service role frontend leak found: ${matrix.service_role_frontend_leak_found}`,
    "",
    "## Dynamic Runtime",
    `- Executed: ${matrix.dynamic_runtime_executed}`,
    `- External blocker: ${matrix.external_blocker ?? "none"}`,
    "",
    "Dynamic seed/select/update/delete proof is not marked green unless the live runner executes successfully. Env presence alone is not treated as proof.",
    "",
  ].join("\n");
  return {
    inventory,
    rlsMatrix,
    policyCoverage,
    crossTenantAttempts,
    storagePolicies,
    matrix,
    proof,
  };
}

export function writeRlsDynamicArtifacts(report = buildRlsDynamicCrossTenantReport()): void {
  writeRlsJson("inventory", report.inventory);
  writeRlsJson("rls_matrix", report.rlsMatrix);
  writeRlsJson("policy_coverage", report.policyCoverage);
  writeRlsJson("cross_tenant_attempts", report.crossTenantAttempts);
  writeRlsJson("storage_policies", report.storagePolicies);
  writeRlsJson("matrix", report.matrix);
  writeRlsProof(report.proof);
}

export function runRlsCli(kind: "full" | "coverage" | "storage"): void {
  const report = buildRlsDynamicCrossTenantReport();
  if (kind === "coverage") {
    writeRlsJson("policy_coverage", report.policyCoverage);
    console.log(JSON.stringify(report.policyCoverage, null, 2));
    return;
  }
  if (kind === "storage") {
    writeRlsJson("storage_policies", report.storagePolicies);
    console.log(JSON.stringify(report.storagePolicies, null, 2));
    return;
  }
  writeRlsDynamicArtifacts(report);
  console.log(JSON.stringify(report.matrix, null, 2));
  if (report.matrix.final_status !== RLS_DYNAMIC_GREEN_STATUS) {
    process.exitCode = 1;
  }
}
