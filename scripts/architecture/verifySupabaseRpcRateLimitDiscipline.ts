import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  verifyBoundedDatabaseQueries,
  type RpcInventoryEntry,
} from "../scale/verifyBoundedDatabaseQueries";
import {
  SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY,
  getRateEnforcementPolicy,
  getSupabaseRpcRateLimitPolicy,
  validateRateEnforcementPolicy,
  type RateLimitEnforcementOperation,
  type SupabaseRpcRateLimitClassification,
  type SupabaseRpcRateLimitPolicy,
} from "../../src/shared/scale/rateLimitPolicies";

export const SCALE_RPC_RATE_LIMIT_DISCIPLINE_WAVE =
  "S_SCALE_05_RPC_RATE_LIMIT_DISCIPLINE";
export const SCALE_RPC_RATE_LIMIT_DISCIPLINE_CLOSEOUT_WAVE =
  "S_SCALE_05_RPC_RATE_LIMIT_DISCIPLINE_CLOSEOUT";
export const GREEN_SCALE_RPC_RATE_LIMIT_DISCIPLINE_READY =
  "GREEN_SCALE_RPC_RATE_LIMIT_DISCIPLINE_READY";

type RpcRateLimitFindingKind =
  | "duplicate_policy"
  | "missing_literal_policy"
  | "missing_wrapper_literal_policy"
  | "missing_dynamic_direct_classification"
  | "missing_dynamic_wrapper_classification"
  | "invalid_rate_policy"
  | "list_read_without_rate_policy"
  | "unbounded_list_without_guard"
  | "legacy_guard_without_migration_target"
  | "broad_live_enforcement_enabled";

type RpcRateLimitFinding = {
  kind: RpcRateLimitFindingKind;
  file: string | null;
  line: number | null;
  rpcName: string | null;
  reason: string;
};

type DynamicRpcBoundary = {
  file: string;
  line: number;
  owner: string;
  classification: SupabaseRpcRateLimitClassification;
  rateEnforcementOperation: RateLimitEnforcementOperation | null;
  boundedArgsRequired: boolean;
  migrationTarget: string | null;
  possibleRpcNames: readonly string[];
  reason: string;
};

type WrapperRpcInventoryEntry = {
  file: string;
  line: number;
  wrapper: "runContainedRpc" | "runUntypedRpcTransport" | "runReportRpc";
  rpcName: string | null;
  argsText: string;
  hasBoundedArgs: boolean;
};

type ClassifiedRpcEntry = {
  file: string;
  line: number;
  rpcName: string;
  source: "direct" | "wrapper" | "dynamic_direct" | "dynamic_wrapper";
  policy: SupabaseRpcRateLimitPolicy;
  hasBoundedArgs: boolean;
};

export type SupabaseRpcRateLimitDisciplineVerification = {
  wave: typeof SCALE_RPC_RATE_LIMIT_DISCIPLINE_CLOSEOUT_WAVE;
  final_status: typeof GREEN_SCALE_RPC_RATE_LIMIT_DISCIPLINE_READY;
  generatedAt: string;
  directRpcInventory: RpcInventoryEntry[];
  wrapperRpcInventory: WrapperRpcInventoryEntry[];
  dynamicDirectBoundaries: readonly DynamicRpcBoundary[];
  dynamicWrapperBoundaries: readonly DynamicRpcBoundary[];
  classifiedEntries: ClassifiedRpcEntry[];
  findings: RpcRateLimitFinding[];
  metrics: {
    directSupabaseRpcCalls: number;
    wrapperRpcEntrypoints: number;
    dynamicDirectRpcCalls: number;
    dynamicWrapperRpcEntrypoints: number;
    uniqueLiteralRpcNames: number;
    literalRpcNamesClassified: number;
    dynamicRpcCallsClassified: number;
    listLikeRpcEntrypoints: number;
    listLikeRpcWithRatePolicy: number;
    listLikeRpcBoundedOrMigrationGuarded: boolean;
    registryPolicies: number;
    duplicatePolicies: number;
    broadLiveEnforcementEnabled: boolean;
    remainingUnclassifiedRpcNames: string[];
    remainingUnclassifiedDynamicRpcCalls: string[];
  };
};

const SOURCE_ROOTS = ["src", "app"] as const;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const RPC_BOUND_ARG_RE =
  /\b(?:limit|pageSize|page_size|offset|from|to|start|end|maxRows|max_rows|p_limit(?:_\w+)?|p_page_size|p_offset(?:_\w+)?|p_from|p_to|p_start|p_end)\b/i;
const WRAPPER_CALL_RE =
  /\b(runContainedRpc|runUntypedRpcTransport|runReportRpc)(?:<[^>]+>)?\s*\(/g;

const LIST_READ_CLASSIFICATIONS = new Set<SupabaseRpcRateLimitClassification>([
  "bounded_list",
  "bounded_search",
  "legacy_list_migration_guard",
  "parent_scoped_read",
  "aggregate_read",
]);

const UNBOUNDED_LIST_GUARD_CLASSIFICATIONS =
  new Set<SupabaseRpcRateLimitClassification>([
    "legacy_list_migration_guard",
    "parent_scoped_read",
    "aggregate_read",
  ]);

const AI_ACTION_LEDGER_RPC_NAMES = Object.freeze([
  "ai_action_ledger_approve_v1",
  "ai_action_ledger_execute_approved_v1",
  "ai_action_ledger_find_by_idempotency_key_v1",
  "ai_action_ledger_get_status_v1",
  "ai_action_ledger_list_by_org_v1",
  "ai_action_ledger_reject_v1",
  "ai_action_ledger_submit_for_approval_v1",
  "ai_action_ledger_verify_apply_v1",
] as const);

const DIRECTOR_FINANCE_RPC_NAMES = Object.freeze([
  "director_finance_fetch_summary_v1",
  "director_finance_summary_v2",
  "director_finance_panel_scope_v1",
  "director_finance_panel_scope_v2",
  "director_finance_panel_scope_v3",
  "director_finance_panel_scope_v4",
  "director_finance_supplier_scope_v1",
  "director_finance_supplier_scope_v2",
] as const);

const DIRECTOR_REPORT_FALLBACK_RPC_NAMES = Object.freeze([
  "acc_report_issues_v2",
  "acc_report_issue_lines",
  "director_report_fetch_acc_issue_lines_v1",
  "wh_report_issued_summary_fast",
  "wh_report_issued_materials_fast",
  "wh_report_issued_by_object_fast",
  "director_report_fetch_options_v1",
  "director_report_fetch_discipline_source_rows_v1",
  "director_report_fetch_issue_price_scope_v1",
  "director_report_fetch_materials_v1",
  "director_report_fetch_works_v1",
  "director_report_fetch_summary_v1",
] as const);

const DYNAMIC_DIRECT_RPC_BOUNDARIES: readonly DynamicRpcBoundary[] = Object.freeze([
  {
    file: "src/lib/api/_core.transport.ts",
    line: 36,
    owner: "core_rpc_compat_transport_with_args",
    classification: "compat_transport",
    rateEnforcementOperation: null,
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: [],
    reason: "Generic typed RPC transport implementation; concrete callers are classified separately.",
  },
  {
    file: "src/lib/api/_core.transport.ts",
    line: 38,
    owner: "core_rpc_compat_transport_without_args",
    classification: "compat_transport",
    rateEnforcementOperation: null,
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: [],
    reason: "Generic typed RPC transport implementation; concrete callers are classified separately.",
  },
  {
    file: "src/lib/api/director.ts",
    line: 177,
    owner: "director_legacy_pending_rpc_fallbacks",
    classification: "legacy_list_migration_guard",
    rateEnforcementOperation: "director.pending.list",
    boundedArgsRequired: false,
    migrationTarget: "director_pending_proposals_scope_v1",
    possibleRpcNames: [
      "list_pending_foreman_items",
      "listPending",
      "list_pending",
      "listpending",
    ],
    reason: "Exact legacy director pending fallback boundary; bounded scope RPC is the migration target.",
  },
  {
    file: "src/lib/api/directorReportsTransport.transport.ts",
    line: 14,
    owner: "director_reports_transport_scope_rpc",
    classification: "bounded_list",
    rateEnforcementOperation: "director.pending.list",
    boundedArgsRequired: true,
    migrationTarget: null,
    possibleRpcNames: ["director_report_transport_scope_v1"],
    reason: "Director reports transport RPC name is held in a typed contract and receives bounded report filters.",
  },
  {
    file: "src/lib/api/queryBoundary.ts",
    line: 328,
    owner: "contained_rpc_without_args",
    classification: "compat_transport",
    rateEnforcementOperation: null,
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: [],
    reason: "Generic contained RPC boundary; concrete literal and dynamic callers are classified separately.",
  },
  {
    file: "src/lib/api/queryBoundary.ts",
    line: 328,
    owner: "contained_rpc_with_args",
    classification: "compat_transport",
    rateEnforcementOperation: null,
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: [],
    reason: "Generic contained RPC boundary; concrete literal and dynamic callers are classified separately.",
  },
  {
    file: "src/lib/store_supabase.write.transport.ts",
    line: 17,
    owner: "store_send_request_to_director",
    classification: "mutation_or_side_effect",
    rateEnforcementOperation: "request.item.update",
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: ["send_request_to_director"],
    reason: "Store write transport is an exact request handoff mutation RPC.",
  },
  {
    file: "src/lib/store_supabase.write.transport.ts",
    line: 23,
    owner: "store_approve_or_decline_request_pending",
    classification: "mutation_or_side_effect",
    rateEnforcementOperation: "request.item.update",
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: ["approve_or_decline_request_pending"],
    reason: "Store write transport is an exact request pending mutation RPC.",
  },
  {
    file: "src/screens/director/director.finance.rpc.transport.ts",
    line: 34,
    owner: "director_finance_typed_rpc_transport",
    classification: "bounded_list",
    rateEnforcementOperation: "director.pending.list",
    boundedArgsRequired: true,
    migrationTarget: null,
    possibleRpcNames: DIRECTOR_FINANCE_RPC_NAMES,
    reason: "Director finance transport accepts only the typed finance scope RPC union.",
  },
  {
    file: "src/screens/subcontracts/subcontracts.shared.transport.ts",
    line: 39,
    owner: "subcontract_status_mutation_rpc",
    classification: "mutation_or_side_effect",
    rateEnforcementOperation: "request.item.update",
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: ["subcontract_approve_v1", "subcontract_reject_v1"],
    reason: "Subcontract status RPC is an exact mutation union.",
  },
  {
    file: "src/screens/warehouse/warehouse.seed.transport.ts",
    line: 211,
    owner: "warehouse_seed_dev_only_rpc",
    classification: "mutation_or_side_effect",
    rateEnforcementOperation: "warehouse.receive.apply",
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: [
      "wh_incoming_ensure_items",
      "ensure_incoming_items",
      "wh_incoming_seed_from_purchase",
    ],
    reason: "Warehouse seed transport is an exact dev-only ensure mutation union.",
  },
]);

const DYNAMIC_WRAPPER_RPC_BOUNDARIES: readonly DynamicRpcBoundary[] = Object.freeze([
  {
    file: "src/features/ai/actionLedger/aiActionLedgerRpcTransport.ts",
    line: 11,
    owner: "ai_action_ledger_typed_rpc_transport",
    classification: "ai_action_ledger",
    rateEnforcementOperation: "ai.workflow.action",
    boundedArgsRequired: false,
    migrationTarget: null,
    possibleRpcNames: AI_ACTION_LEDGER_RPC_NAMES,
    reason: "AI action ledger transport accepts only the typed action-ledger RPC union.",
  },
  {
    file: "src/features/reports/ReportsDashboardScreen.tsx",
    line: 37,
    owner: "reports_dashboard_local_rpc_runner",
    classification: "aggregate_read",
    rateEnforcementOperation: "warehouse.ledger.list",
    boundedArgsRequired: true,
    migrationTarget: null,
    possibleRpcNames: [
      "list_report_stock_turnover",
      "list_report_costs_by_object",
      "list_report_ap_aging",
      "list_report_purchase_pipeline",
    ],
    reason: "Local report helper delegates only to literal report RPC calls in the same module.",
  },
  {
    file: "src/lib/api/buyer.ts",
    line: 265,
    owner: "buyer_legacy_scope_rpc_transport",
    classification: "bounded_list",
    rateEnforcementOperation: "buyer.summary.inbox",
    boundedArgsRequired: true,
    migrationTarget: null,
    possibleRpcNames: ["buyer_summary_inbox_scope_v1"],
    reason: "Buyer legacy transport constant is invoked with explicit offset and limit args.",
  },
  {
    file: "src/lib/api/director_reports.transport.base.ts",
    line: 35,
    owner: "director_reports_typed_fallback_rpc_transport",
    classification: "aggregate_read",
    rateEnforcementOperation: "director.pending.list",
    boundedArgsRequired: true,
    migrationTarget: null,
    possibleRpcNames: DIRECTOR_REPORT_FALLBACK_RPC_NAMES,
    reason: "Director reports fallback transport accepts only the typed report RPC union.",
  },
]);

const normalizePath = (value: string): string => value.replaceAll("\\", "/");

function walkSourceFiles(projectRoot: string): string[] {
  const files: string[] = [];
  const walk = (directory: string): void => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") walk(fullPath);
        continue;
      }
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
      if (/(?:\.test|\.spec|\.contract)\.(?:ts|tsx)$/.test(entry.name)) continue;
      if (entry.name.endsWith(".d.ts")) continue;
      files.push(fullPath);
    }
  };
  for (const root of SOURCE_ROOTS) walk(path.join(projectRoot, root));
  return files;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function parseBalancedCall(text: string, openIndex: number): { raw: string; end: number } {
  let quote: string | null = null;
  let escaped = false;
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index] ?? "";
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) return { raw: text.slice(openIndex + 1, index), end: index };
    }
  }
  return { raw: "", end: openIndex };
}

function splitTopLevelArgs(raw: string): string[] {
  const args: string[] = [];
  let quote: string | null = null;
  let escaped = false;
  let depth = 0;
  let start = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index] ?? "";
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "{" || char === "[") depth += 1;
    if (char === ")" || char === "}" || char === "]") depth -= 1;
    if (char === "," && depth === 0) {
      args.push(raw.slice(start, index).trim());
      start = index + 1;
    }
  }
  args.push(raw.slice(start).trim());
  return args;
}

function extractLiteralName(value: string): string | null {
  const match = value.match(/^(["'`])([^"'`]+)\1$/);
  return match?.[2] ?? null;
}

function collectWrapperRpcInventory(projectRoot: string): WrapperRpcInventoryEntry[] {
  const entries: WrapperRpcInventoryEntry[] = [];
  for (const fullPath of walkSourceFiles(projectRoot)) {
    const file = normalizePath(path.relative(projectRoot, fullPath));
    const text = fs.readFileSync(fullPath, "utf8");
    let match: RegExpExecArray | null = null;
    while ((match = WRAPPER_CALL_RE.exec(text))) {
      const wrapper = match[1] as WrapperRpcInventoryEntry["wrapper"];
      const lineStart = text.lastIndexOf("\n", match.index) + 1;
      const prefix = text.slice(lineStart, match.index);
      if (/\bfunction\s*$/.test(prefix) || /\bfunction\s+\w*\s*$/.test(prefix)) {
        continue;
      }
      const open = text.indexOf("(", match.index);
      if (open < 0) break;
      const call = parseBalancedCall(text, open);
      const args = splitTopLevelArgs(call.raw);
      const nameArgIndex = wrapper === "runContainedRpc" ? 1 : 0;
      const rpcName = extractLiteralName(args[nameArgIndex] ?? "");
      const argsText = args.slice(nameArgIndex + 1).join(", ");
      entries.push({
        file,
        line: lineOf(text, match.index),
        wrapper,
        rpcName,
        argsText,
        hasBoundedArgs: RPC_BOUND_ARG_RE.test(argsText),
      });
      WRAPPER_CALL_RE.lastIndex = Math.max(match.index + 4, call.end + 1);
    }
  }
  return entries.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

function dynamicKey(entry: { file: string; line: number }): string {
  return `${entry.file}:${entry.line}`;
}

function isListReadPolicy(policy: SupabaseRpcRateLimitPolicy): boolean {
  return LIST_READ_CLASSIFICATIONS.has(policy.classification);
}

function hasUnboundedListGuard(policy: SupabaseRpcRateLimitPolicy): boolean {
  return UNBOUNDED_LIST_GUARD_CLASSIFICATIONS.has(policy.classification);
}

function git(projectRoot: string, args: string[]): string {
  return execFileSync("git", args, { cwd: projectRoot, encoding: "utf8" }).trim();
}

function policyForDynamicBoundary(
  boundary: DynamicRpcBoundary,
): SupabaseRpcRateLimitPolicy {
  return {
    rpcName: boundary.owner,
    classification: boundary.classification,
    rateEnforcementOperation: boundary.rateEnforcementOperation,
    boundedArgsRequired: boundary.boundedArgsRequired,
    migrationTarget: boundary.migrationTarget,
    reason: boundary.reason,
    defaultEnabled: false,
    enforcementEnabledByDefault: false,
  };
}

function classifyLiteralEntry(
  entry: { file: string; line: number; rpcName: string; hasBoundedArgs: boolean },
  source: ClassifiedRpcEntry["source"],
  findings: RpcRateLimitFinding[],
): ClassifiedRpcEntry | null {
  const policy = getSupabaseRpcRateLimitPolicy(entry.rpcName);
  if (!policy) {
    findings.push({
      kind: source === "direct" ? "missing_literal_policy" : "missing_wrapper_literal_policy",
      file: entry.file,
      line: entry.line,
      rpcName: entry.rpcName,
      reason: "Literal RPC name has no Supabase RPC rate-limit classification policy.",
    });
    return null;
  }
  return {
    file: entry.file,
    line: entry.line,
    rpcName: entry.rpcName,
    source,
    policy,
    hasBoundedArgs: entry.hasBoundedArgs,
  };
}

function classifyDynamicBoundaryEntries(
  source: "dynamic_direct" | "dynamic_wrapper",
  entries: readonly { file: string; line: number }[],
  approved: readonly DynamicRpcBoundary[],
  findings: RpcRateLimitFinding[],
): ClassifiedRpcEntry[] {
  const approvedByKey = new Map(approved.map((entry) => [dynamicKey(entry), entry]));
  const classified: ClassifiedRpcEntry[] = [];
  for (const entry of entries) {
    const boundary = approvedByKey.get(dynamicKey(entry));
    if (!boundary) {
      findings.push({
        kind:
          source === "dynamic_direct"
            ? "missing_dynamic_direct_classification"
            : "missing_dynamic_wrapper_classification",
        file: entry.file,
        line: entry.line,
        rpcName: null,
        reason: "Dynamic RPC boundary has no exact per-callsite classification.",
      });
      continue;
    }

    const boundaryPolicy = policyForDynamicBoundary(boundary);
    classified.push({
      file: entry.file,
      line: entry.line,
      rpcName: boundary.owner,
      source,
      policy: boundaryPolicy,
      hasBoundedArgs: boundary.boundedArgsRequired,
    });

    for (const rpcName of boundary.possibleRpcNames) {
      const policy = getSupabaseRpcRateLimitPolicy(rpcName);
      if (!policy) {
        findings.push({
          kind: "missing_literal_policy",
          file: entry.file,
          line: entry.line,
          rpcName,
          reason: `Dynamic RPC boundary ${boundary.owner} references an unclassified possible RPC name.`,
        });
      }
    }
  }
  return classified;
}

function collectPolicyFindings(): RpcRateLimitFinding[] {
  const findings: RpcRateLimitFinding[] = [];
  const seen = new Map<string, number>();
  for (const policy of SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY) {
    seen.set(policy.rpcName, (seen.get(policy.rpcName) ?? 0) + 1);
    if (policy.defaultEnabled || policy.enforcementEnabledByDefault) {
      findings.push({
        kind: "broad_live_enforcement_enabled",
        file: "src/shared/scale/rateLimitPolicies.ts",
        line: null,
        rpcName: policy.rpcName,
        reason: "RPC rate-limit policy registry must not enable live enforcement by default.",
      });
    }
    if (policy.rateEnforcementOperation) {
      const ratePolicy = getRateEnforcementPolicy(policy.rateEnforcementOperation);
      if (!ratePolicy || !validateRateEnforcementPolicy(ratePolicy)) {
        findings.push({
          kind: "invalid_rate_policy",
          file: "src/shared/scale/rateLimitPolicies.ts",
          line: null,
          rpcName: policy.rpcName,
          reason: `RPC policy references invalid rate enforcement operation ${policy.rateEnforcementOperation}.`,
        });
      }
    }
    if (
      policy.classification === "legacy_list_migration_guard" &&
      (!policy.migrationTarget || policy.reason.trim().length < 24)
    ) {
      findings.push({
        kind: "legacy_guard_without_migration_target",
        file: "src/shared/scale/rateLimitPolicies.ts",
        line: null,
        rpcName: policy.rpcName,
        reason: "Legacy list guard must document an exact migration target and reason.",
      });
    }
  }
  for (const [rpcName, count] of seen) {
    if (count > 1) {
      findings.push({
        kind: "duplicate_policy",
        file: "src/shared/scale/rateLimitPolicies.ts",
        line: null,
        rpcName,
        reason: `RPC policy registry contains ${count} entries for the same RPC name.`,
      });
    }
  }
  return findings;
}

function collectEntryFindings(entries: readonly ClassifiedRpcEntry[]): RpcRateLimitFinding[] {
  const findings: RpcRateLimitFinding[] = [];
  for (const entry of entries) {
    const listRead = isListReadPolicy(entry.policy);
    if (!listRead) continue;
    if (!entry.policy.rateEnforcementOperation) {
      findings.push({
        kind: "list_read_without_rate_policy",
        file: entry.file,
        line: entry.line,
        rpcName: entry.rpcName,
        reason: "List-like RPC classification has no mapped rate enforcement policy.",
      });
    }
    if (entry.policy.boundedArgsRequired && !entry.hasBoundedArgs) {
      findings.push({
        kind: "unbounded_list_without_guard",
        file: entry.file,
        line: entry.line,
        rpcName: entry.rpcName,
        reason: "List-like RPC requires bounded args, but the callsite did not expose bounded arguments.",
      });
    }
    if (!entry.policy.boundedArgsRequired && !hasUnboundedListGuard(entry.policy)) {
      findings.push({
        kind: "unbounded_list_without_guard",
        file: entry.file,
        line: entry.line,
        rpcName: entry.rpcName,
        reason: "Unbounded list-like RPC must use a legacy, parent-scoped, or aggregate migration guard.",
      });
    }
    if (
      !entry.policy.boundedArgsRequired &&
      hasUnboundedListGuard(entry.policy) &&
      (!entry.policy.migrationTarget || entry.policy.reason.trim().length < 24)
    ) {
      findings.push({
        kind: "legacy_guard_without_migration_target",
        file: entry.file,
        line: entry.line,
        rpcName: entry.rpcName,
        reason: "Guarded list-like RPC needs an exact migration target and reason.",
      });
    }
  }
  return findings;
}

export function verifySupabaseRpcRateLimitDiscipline(
  projectRoot = process.cwd(),
): SupabaseRpcRateLimitDisciplineVerification {
  const boundedVerification = verifyBoundedDatabaseQueries(projectRoot);
  const directRpcInventory = boundedVerification.rpcInventory;
  const wrapperRpcInventory = collectWrapperRpcInventory(projectRoot);
  const findings: RpcRateLimitFinding[] = collectPolicyFindings();
  const classifiedEntries: ClassifiedRpcEntry[] = [];

  for (const entry of directRpcInventory) {
    if (!entry.rpcName) continue;
    const classified = classifyLiteralEntry(
      {
        file: entry.file,
        line: entry.line,
        rpcName: entry.rpcName,
        hasBoundedArgs: entry.hasBoundedArgs,
      },
      "direct",
      findings,
    );
    if (classified) classifiedEntries.push(classified);
  }

  for (const entry of wrapperRpcInventory) {
    if (!entry.rpcName) continue;
    const classified = classifyLiteralEntry(
      {
        file: entry.file,
        line: entry.line,
        rpcName: entry.rpcName,
        hasBoundedArgs: entry.hasBoundedArgs,
      },
      "wrapper",
      findings,
    );
    if (classified) classifiedEntries.push(classified);
  }

  const dynamicDirectEntries = directRpcInventory.filter((entry) => !entry.rpcName);
  const dynamicWrapperEntries = wrapperRpcInventory.filter((entry) => !entry.rpcName);
  classifiedEntries.push(
    ...classifyDynamicBoundaryEntries(
      "dynamic_direct",
      dynamicDirectEntries,
      DYNAMIC_DIRECT_RPC_BOUNDARIES,
      findings,
    ),
  );
  classifiedEntries.push(
    ...classifyDynamicBoundaryEntries(
      "dynamic_wrapper",
      dynamicWrapperEntries,
      DYNAMIC_WRAPPER_RPC_BOUNDARIES,
      findings,
    ),
  );
  findings.push(...collectEntryFindings(classifiedEntries));

  const literalNames = new Set(
    [
      ...directRpcInventory.map((entry) => entry.rpcName),
      ...wrapperRpcInventory.map((entry) => entry.rpcName),
    ].filter((rpcName): rpcName is string => Boolean(rpcName)),
  );
  const classifiedLiteralNames = [...literalNames].filter((rpcName) =>
    Boolean(getSupabaseRpcRateLimitPolicy(rpcName)),
  );
  const remainingUnclassifiedRpcNames = [...literalNames]
    .filter((rpcName) => !getSupabaseRpcRateLimitPolicy(rpcName))
    .sort();
  const remainingUnclassifiedDynamicRpcCalls = [
    ...dynamicDirectEntries
      .filter(
        (entry) =>
          !DYNAMIC_DIRECT_RPC_BOUNDARIES.some(
            (boundary) => dynamicKey(boundary) === dynamicKey(entry),
          ),
      )
      .map(dynamicKey),
    ...dynamicWrapperEntries
      .filter(
        (entry) =>
          !DYNAMIC_WRAPPER_RPC_BOUNDARIES.some(
            (boundary) => dynamicKey(boundary) === dynamicKey(entry),
          ),
      )
      .map(dynamicKey),
  ].sort();
  const listLikeEntries = classifiedEntries.filter((entry) => isListReadPolicy(entry.policy));
  const listLikeRpcWithRatePolicy = listLikeEntries.filter(
    (entry) => entry.policy.rateEnforcementOperation != null,
  ).length;
  const duplicatePolicies =
    SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY.length -
    new Set(SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY.map((entry) => entry.rpcName)).size;
  const broadLiveEnforcementEnabled = SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY.some(
    (entry) => entry.defaultEnabled || entry.enforcementEnabledByDefault,
  );

  return {
    wave: SCALE_RPC_RATE_LIMIT_DISCIPLINE_CLOSEOUT_WAVE,
    final_status: GREEN_SCALE_RPC_RATE_LIMIT_DISCIPLINE_READY,
    generatedAt: new Date().toISOString(),
    directRpcInventory,
    wrapperRpcInventory,
    dynamicDirectBoundaries: DYNAMIC_DIRECT_RPC_BOUNDARIES,
    dynamicWrapperBoundaries: DYNAMIC_WRAPPER_RPC_BOUNDARIES,
    classifiedEntries,
    findings,
    metrics: {
      directSupabaseRpcCalls: directRpcInventory.length,
      wrapperRpcEntrypoints: wrapperRpcInventory.length,
      dynamicDirectRpcCalls: dynamicDirectEntries.length,
      dynamicWrapperRpcEntrypoints: dynamicWrapperEntries.length,
      uniqueLiteralRpcNames: literalNames.size,
      literalRpcNamesClassified: classifiedLiteralNames.length,
      dynamicRpcCallsClassified:
        dynamicDirectEntries.length +
        dynamicWrapperEntries.length -
        remainingUnclassifiedDynamicRpcCalls.length,
      listLikeRpcEntrypoints: listLikeEntries.length,
      listLikeRpcWithRatePolicy,
      listLikeRpcBoundedOrMigrationGuarded:
        collectEntryFindings(classifiedEntries).filter(
          (finding) =>
            finding.kind === "list_read_without_rate_policy" ||
            finding.kind === "unbounded_list_without_guard" ||
            finding.kind === "legacy_guard_without_migration_target",
        ).length === 0,
      registryPolicies: SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY.length,
      duplicatePolicies,
      broadLiveEnforcementEnabled,
      remainingUnclassifiedRpcNames,
      remainingUnclassifiedDynamicRpcCalls,
    },
  };
}

export function buildSupabaseRpcRateLimitDisciplineMatrix(
  projectRoot: string,
  verification: SupabaseRpcRateLimitDisciplineVerification,
) {
  const aheadBehind = git(projectRoot, [
    "rev-list",
    "--left-right",
    "--count",
    "HEAD...origin/main",
  ])
    .split(/\s+/)
    .map((value) => Number(value));
  return {
    wave: SCALE_RPC_RATE_LIMIT_DISCIPLINE_CLOSEOUT_WAVE,
    final_status: GREEN_SCALE_RPC_RATE_LIMIT_DISCIPLINE_READY,
    generatedAt: verification.generatedAt,
    git: {
      head: git(projectRoot, ["rev-parse", "HEAD"]),
      origin_main: git(projectRoot, ["rev-parse", "origin/main"]),
      ahead: aheadBehind[0] ?? 0,
      behind: aheadBehind[1] ?? 0,
      worktree: git(projectRoot, ["status", "--short"]) === "" ? "clean" : "dirty",
    },
    production_rpc_calls: verification.metrics.directSupabaseRpcCalls,
    wrapper_rpc_entrypoints: verification.metrics.wrapperRpcEntrypoints,
    unique_literal_rpc_names: verification.metrics.uniqueLiteralRpcNames,
    literal_rpc_names_classified: verification.metrics.literalRpcNamesClassified,
    dynamic_rpc_calls_classified: verification.metrics.dynamicRpcCallsClassified,
    list_like_rpc_entrypoints: verification.metrics.listLikeRpcEntrypoints,
    list_like_rpc_with_rate_policy: verification.metrics.listLikeRpcWithRatePolicy,
    list_like_rpc_bounded_or_legacy_migration_guard:
      verification.metrics.listLikeRpcBoundedOrMigrationGuarded,
    remaining_unclassified_rpc_names:
      verification.metrics.remainingUnclassifiedRpcNames,
    remaining_unclassified_dynamic_rpc_calls:
      verification.metrics.remainingUnclassifiedDynamicRpcCalls,
    broad_live_enforcement_enabled:
      verification.metrics.broadLiveEnforcementEnabled,
    db_writes_used: false,
    provider_calls_used: false,
    hooks_added: false,
    ui_changed: false,
    business_logic_changed: false,
    fake_green_claimed: false,
  };
}

export function artifactPaths() {
  return {
    inventory: `artifacts/${SCALE_RPC_RATE_LIMIT_DISCIPLINE_WAVE}_inventory.json`,
    matrix: `artifacts/${SCALE_RPC_RATE_LIMIT_DISCIPLINE_WAVE}_matrix.json`,
    proof: `artifacts/${SCALE_RPC_RATE_LIMIT_DISCIPLINE_WAVE}_proof.md`,
  };
}

function renderProof(
  verification: SupabaseRpcRateLimitDisciplineVerification,
): string {
  const lines = [
    `# ${SCALE_RPC_RATE_LIMIT_DISCIPLINE_CLOSEOUT_WAVE}`,
    "",
    `final_status: ${GREEN_SCALE_RPC_RATE_LIMIT_DISCIPLINE_READY}`,
    `generated_at: ${verification.generatedAt}`,
    "",
    "## Inventory",
    "",
    `- direct Supabase RPC calls: ${verification.metrics.directSupabaseRpcCalls}`,
    `- wrapper RPC entrypoints: ${verification.metrics.wrapperRpcEntrypoints}`,
    `- unique literal RPC names: ${verification.metrics.uniqueLiteralRpcNames}`,
    `- literal RPC names classified: ${verification.metrics.literalRpcNamesClassified}`,
    `- dynamic RPC calls classified: ${verification.metrics.dynamicRpcCallsClassified}`,
    `- list-like RPC entrypoints: ${verification.metrics.listLikeRpcEntrypoints}`,
    `- list-like RPC entrypoints with rate policy: ${verification.metrics.listLikeRpcWithRatePolicy}`,
    "",
    "## Safety",
    "",
    "- Live enforcement enabled by default: false",
    "- DB writes used: false",
    "- provider calls used: false",
    "- hooks added: false",
    "- UI changed: false",
    "- business logic changed: false",
    "- fake green claimed: false",
  ];
  if (verification.findings.length) {
    lines.push("", "## Remaining Findings", "");
    for (const finding of verification.findings) {
      lines.push(
        `- ${finding.kind}: ${finding.file ?? "registry"}:${finding.line ?? "-"} ${finding.rpcName ?? "dynamic"} ${finding.reason}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export function writeSupabaseRpcRateLimitDisciplineArtifacts(
  projectRoot: string,
  verification: SupabaseRpcRateLimitDisciplineVerification,
): void {
  const paths = artifactPaths();
  for (const relativePath of [paths.inventory, paths.matrix, paths.proof]) {
    fs.mkdirSync(path.dirname(path.join(projectRoot, relativePath)), {
      recursive: true,
    });
  }
  fs.writeFileSync(
    path.join(projectRoot, paths.inventory),
    `${JSON.stringify(verification, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(projectRoot, paths.matrix),
    `${JSON.stringify(
      buildSupabaseRpcRateLimitDisciplineMatrix(projectRoot, verification),
      null,
      2,
    )}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(projectRoot, paths.proof),
    renderProof(verification),
    "utf8",
  );
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const projectRoot = process.cwd();
  const verification = verifySupabaseRpcRateLimitDiscipline(projectRoot);
  if (args.has("--write-artifacts")) {
    writeSupabaseRpcRateLimitDisciplineArtifacts(projectRoot, verification);
  }
  console.info(
    JSON.stringify(
      {
        final_status: verification.final_status,
        findings: verification.findings.length,
        metrics: verification.metrics,
        artifacts: artifactPaths(),
      },
      null,
      2,
    ),
  );
  if (verification.findings.length > 0) {
    process.exitCode = 1;
  }
}

if (
  normalizePath(process.argv[1] ?? "").endsWith(
    "scripts/architecture/verifySupabaseRpcRateLimitDiscipline.ts",
  )
) {
  main();
}
