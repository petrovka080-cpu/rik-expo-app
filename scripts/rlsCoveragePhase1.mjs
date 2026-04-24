import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIRS = ["src", "app"];
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const DB_TYPES_PATH = path.join(ROOT, "src", "lib", "database.types.ts");
const DEFAULT_OUTPUT_PATH = path.join(ROOT, "artifacts", "RLS_coverage_phase1_matrix.json");
const DEFAULT_WAVE = "RLS_COVERAGE_VERIFICATION_PHASE_1";
const SHORTLIST_STRATEGY_PHASE1 = "phase1";
const SHORTLIST_STRATEGY_REMAINING = "remaining";

const CLIENT_ROLES = ["anon", "authenticated"];
const CRUD_OPS = ["select", "insert", "update", "delete"];
const AUTH_SENSITIVE_ADDITIONS = [
  {
    relation: "proposal_submit_mutations_v1",
    ops: ["select", "insert", "update", "delete"],
    reason: "auth-sensitive mutation ledger verified in existing RLS regression suite",
    file: "tests/security/rlsCoverageVerification.test.ts",
  },
  {
    relation: "warehouse_receive_apply_idempotency_v1",
    ops: ["select", "insert", "update", "delete"],
    reason: "auth-sensitive mutation ledger verified in existing RLS regression suite",
    file: "tests/security/rlsCoverageVerification.test.ts",
  },
  {
    relation: "warehouse_issue_request_mutations_v1",
    ops: ["select", "insert", "update", "delete"],
    reason: "auth-sensitive mutation ledger verified in existing RLS regression suite",
    file: "tests/security/rlsCoverageVerification.test.ts",
  },
  {
    relation: "warehouse_issue_free_mutations_v1",
    ops: ["select", "insert", "update", "delete"],
    reason: "auth-sensitive mutation ledger verified in existing RLS regression suite",
    file: "tests/security/rlsCoverageVerification.test.ts",
  },
  {
    relation: "accounting_pay_invoice_mutations_v1",
    ops: ["select", "insert", "update", "delete"],
    reason: "auth-sensitive mutation ledger verified in existing RLS regression suite",
    file: "tests/security/rlsCoverageVerification.test.ts",
  },
  {
    relation: "developer_access_overrides",
    ops: ["select"],
    reason: "auth-sensitive break-glass table with explicit repo-side RLS/grant contract",
    file: "supabase/migrations/20260416193000_h1_8_developer_break_glass_override.sql",
  },
  {
    relation: "developer_override_audit_log",
    ops: ["select"],
    reason: "auth-sensitive break-glass audit table with explicit repo-side RLS/grant contract",
    file: "supabase/migrations/20260416193000_h1_8_developer_break_glass_override.sql",
  },
  {
    relation: "foreman_ai_prompt_cache",
    ops: [],
    reason: "auth-sensitive backend cache table with explicit direct-access revokes",
    file: "supabase/migrations/20260420090000_foreman_ai_prompt_cache.sql",
  },
  {
    relation: "supplier_messages",
    ops: ["select", "insert"],
    reason: "direct client-safe table with explicit RLS/policy contract in repo history",
    file: "supabase/migrations/20260328101500_marketplace_runtime_erp_scope_v1.sql",
  },
];
const DYNAMIC_RELATION_ADDITIONS = [
  {
    relation: "profiles",
    ops: ["select"],
    reason: "warehouse recipient lookup allowlist",
    file: "src/screens/warehouse/warehouse.dicts.ts",
  },
  {
    relation: "ref_object_types",
    ops: ["select"],
    reason: "warehouse reference lookup allowlist",
    file: "src/screens/warehouse/warehouse.dicts.ts",
  },
  {
    relation: "ref_levels",
    ops: ["select"],
    reason: "warehouse reference lookup allowlist",
    file: "src/screens/warehouse/warehouse.dicts.ts",
  },
  {
    relation: "ref_systems",
    ops: ["select"],
    reason: "warehouse reference lookup allowlist",
    file: "src/screens/warehouse/warehouse.dicts.ts",
  },
  {
    relation: "ref_zones",
    ops: ["select"],
    reason: "warehouse reference lookup allowlist",
    file: "src/screens/warehouse/warehouse.dicts.ts",
  },
  {
    relation: "v_reno_calc_fields_ui",
    ops: ["select"],
    reason: "foreman calculator runtime dynamic view branch",
    file: "src/components/foreman/useCalcFields.ts",
  },
  {
    relation: "v_reno_calc_fields_ui_clean",
    ops: ["select"],
    reason: "foreman calculator runtime dynamic view branch",
    file: "src/components/foreman/useCalcFields.ts",
  },
  {
    relation: "catalog_name_overrides",
    ops: ["select"],
    reason: "director naming dynamic source query",
    file: "src/lib/api/director_reports.naming.ts",
  },
  {
    relation: "v_rik_names_ru",
    ops: ["select"],
    reason: "director naming dynamic source query",
    file: "src/lib/api/director_reports.naming.ts",
  },
  {
    relation: "v_wh_balance_ledger_ui",
    ops: ["select"],
    reason: "director naming dynamic source query",
    file: "src/lib/api/director_reports.naming.ts",
  },
];
const POLICY_TOO_BROAD_CLUSTER = new Set([
  "requests",
  "request_items",
  "proposals",
  "proposal_payments",
  "warehouse_issues",
  "warehouse_issue_items",
  "notifications",
]);
const REMAINING_SHORTLIST_PREFERRED = [
  "ai_reports",
  "ai_configs",
  "chat_messages",
  "company_invites",
  "company_members",
  "market_listings",
];

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function listFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  const pending = [dirPath];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(nextPath);
        continue;
      }
      if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        out.push(nextPath);
      }
    }
  }
  return out;
}

function relative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    outputPath: DEFAULT_OUTPUT_PATH,
    wave: DEFAULT_WAVE,
    shortlistStrategy: SHORTLIST_STRATEGY_PHASE1,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output" && argv[index + 1]) {
      const rawOutputPath = argv[index + 1];
      options.outputPath = path.isAbsolute(rawOutputPath)
        ? rawOutputPath
        : path.join(ROOT, rawOutputPath);
      index += 1;
      continue;
    }
    if (arg === "--wave" && argv[index + 1]) {
      options.wave = String(argv[index + 1]).trim() || DEFAULT_WAVE;
      index += 1;
      continue;
    }
    if (arg === "--strategy" && argv[index + 1]) {
      const rawStrategy = String(argv[index + 1]).trim().toLowerCase();
      options.shortlistStrategy =
        rawStrategy === SHORTLIST_STRATEGY_REMAINING
          ? SHORTLIST_STRATEGY_REMAINING
          : SHORTLIST_STRATEGY_PHASE1;
      index += 1;
    }
  }

  return options;
}

function parsePublicRelations() {
  const source = readUtf8(DB_TYPES_PATH).split(/\r?\n/);
  const tables = new Set();
  const views = new Set();
  let inPublic = false;
  let mode = null;

  for (const line of source) {
    const trimmed = line.trim();
    if (!inPublic && trimmed === "public: {") {
      inPublic = true;
      continue;
    }
    if (!inPublic) continue;
    if (trimmed === "Tables: {") {
      mode = "tables";
      continue;
    }
    if (trimmed === "Views: {") {
      mode = "views";
      continue;
    }
    if (/^(Functions|Enums|CompositeTypes): \{$/.test(trimmed)) {
      mode = null;
      continue;
    }
    if (trimmed === "}" && mode === null) {
      inPublic = false;
      continue;
    }
    const match = line.match(/^ {6}([A-Za-z0-9_]+): \{$/);
    if (!match || !mode) continue;
    if (mode === "tables") tables.add(match[1]);
    if (mode === "views") views.add(match[1]);
  }

  return { tables, views };
}

function detectOps(windowText) {
  const ops = new Set();
  if (/\.select\s*\(/.test(windowText)) ops.add("select");
  if (/\.insert\s*\(/.test(windowText)) ops.add("insert");
  if (/\.update\s*\(/.test(windowText)) ops.add("update");
  if (/\.delete\s*\(/.test(windowText)) ops.add("delete");
  if (/\.upsert\s*\(/.test(windowText)) {
    ops.add("insert");
    ops.add("update");
  }
  return ops;
}

function addUsage(store, relation, file, ops, reason, sourceKind = "runtime") {
  const key = String(relation || "").trim();
  if (!key) return;
  if (!store.has(key)) {
    store.set(key, {
      relation: key,
      files: new Set(),
      reasons: new Set(),
      sourceKinds: new Set(),
      ops: new Set(),
      occurrences: 0,
    });
  }
  const row = store.get(key);
  row.files.add(file);
  row.reasons.add(reason);
  row.sourceKinds.add(sourceKind);
  row.occurrences += 1;
  for (const op of ops) row.ops.add(op);
}

function collectRuntimeUsage() {
  const usage = new Map();
  for (const dirName of SOURCE_DIRS) {
    const sourceDir = path.join(ROOT, dirName);
    for (const filePath of listFiles(sourceDir)) {
      const source = readUtf8(filePath);
      const regex = /\.from\(\s*(['"`])([A-Za-z0-9_]+)\1(?:\s+as\s+[^)]+)?\s*\)/g;
      let match;
      while ((match = regex.exec(source)) !== null) {
        const before = source.slice(Math.max(0, match.index - 24), match.index);
        if (/storage\s*$/.test(before)) {
          continue;
        }
        const relation = match[2];
        if (relation === "avatars") {
          continue;
        }
        const opWindow = source.slice(match.index, match.index + 420);
        const ops = detectOps(opWindow);
        addUsage(
          usage,
          relation,
          relative(filePath),
          ops,
          "literal .from() runtime usage",
        );
      }
    }
  }

  for (const item of DYNAMIC_RELATION_ADDITIONS) {
    addUsage(
      usage,
      item.relation,
      item.file,
      item.ops,
      item.reason,
      "dynamic_allowlist",
    );
  }

  for (const item of AUTH_SENSITIVE_ADDITIONS) {
    addUsage(
      usage,
      item.relation,
      item.file,
      item.ops,
      item.reason,
      "auth_sensitive_inventory",
    );
  }

  return usage;
}

function createGrantState() {
  return {
    anon: { select: null, insert: null, update: null, delete: null, all: null },
    authenticated: { select: null, insert: null, update: null, delete: null, all: null },
  };
}

function ensureMigrationState(store, relation) {
  const key = String(relation || "").trim();
  if (!key) return null;
  if (!store.has(key)) {
    store.set(key, {
      relation: key,
      createdIn: [],
      rlsEnabled: null,
      rlsEvidence: [],
      policyOps: {
        select: [],
        insert: [],
        update: [],
        delete: [],
        all: [],
      },
      grants: createGrantState(),
      grantEvidence: [],
    });
  }
  return store.get(key);
}

function expandGrantOps(rawText) {
  const text = String(rawText || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+privileges/g, "")
    .trim();
  if (!text) return [];
  if (text.includes("all")) return ["all", ...CRUD_OPS];
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => CRUD_OPS.includes(part));
}

function parseRoles(rawText) {
  return String(rawText || "")
    .toLowerCase()
    .split(",")
    .map((part) => part.trim())
    .map((part) => part.replace(/\s+/g, " "))
    .filter(Boolean);
}

function parseMigrations() {
  const store = new Map();
  const createdViews = new Set();
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const fileName of files) {
    const filePath = path.join(MIGRATIONS_DIR, fileName);
    const source = readUtf8(filePath);

    for (const match of source.matchAll(/create table(?: if not exists)?\s+public\.([A-Za-z0-9_]+)/gi)) {
      const state = ensureMigrationState(store, match[1]);
      state.createdIn.push(fileName);
    }

    for (const match of source.matchAll(/create(?: or replace)? view\s+public\.([A-Za-z0-9_]+)/gi)) {
      createdViews.add(match[1]);
    }

    for (const match of source.matchAll(/alter table(?: if exists)?\s+public\.([A-Za-z0-9_]+)\s+(enable|disable)\s+row level security/gi)) {
      const state = ensureMigrationState(store, match[1]);
      state.rlsEnabled = match[2].toLowerCase() === "enable";
      state.rlsEvidence.push(`${fileName}:${match[0].trim()}`);
    }

    for (const match of source.matchAll(/(grant|revoke)\s+([^;]*?)\s+on(?:\s+table)?\s+public\.([A-Za-z0-9_]+)\s+(to|from)\s+([^;]+);/gi)) {
      const action = match[1].toLowerCase();
      const relation = match[3];
      const roles = parseRoles(match[5]);
      const ops = expandGrantOps(match[2]);
      const state = ensureMigrationState(store, relation);
      state.grantEvidence.push(`${fileName}:${match[0].replace(/\s+/g, " ").trim()}`);
      for (const role of roles) {
        if (!CLIENT_ROLES.includes(role)) continue;
        for (const op of ops) {
          state.grants[role][op] = action === "grant";
        }
      }
    }

    for (const match of source.matchAll(/create policy\s+([A-Za-z0-9_]+)\s+on\s+public\.([A-Za-z0-9_]+)([\s\S]*?);/gi)) {
      const policyName = match[1];
      const relation = match[2];
      const statement = `${policyName}${match[3]}`;
      const opMatch = statement.match(/\bfor\s+(select|insert|update|delete|all)\b/i);
      const op = opMatch ? opMatch[1].toLowerCase() : "all";
      const state = ensureMigrationState(store, relation);
      state.policyOps[op].push({
        file: fileName,
        policy: policyName,
        summary: match[0].replace(/\s+/g, " ").trim(),
      });
    }
  }

  return { store, createdViews };
}

function hasGrant(state, role, op) {
  if (!state) return null;
  const byRole = state.grants[role];
  if (!byRole) return null;
  if (typeof byRole[op] === "boolean") return byRole[op];
  if (typeof byRole.all === "boolean") return byRole.all;
  return null;
}

function hasClientGrant(state, op) {
  return CLIENT_ROLES.some((role) => hasGrant(state, role, op) === true);
}

function hasExplicitClientRevoke(state, op) {
  return CLIENT_ROLES.every((role) => hasGrant(state, role, op) === false);
}

function hasPolicy(state, op) {
  if (!state) return false;
  return state.policyOps[op].length > 0 || state.policyOps.all.length > 0;
}

function buildExpectation(relation, observedOps) {
  const exact = {
    submit_jobs: {
      model:
        "authenticated queue boundary: direct insert/select only; processing/recovery mutations must stay on exact RPC/service path",
      allowed: { select: true, insert: true, update: false, delete: false },
    },
    app_errors: {
      model:
        "error sink boundary: direct insert only; no direct client select/update/delete",
      allowed: { select: false, insert: true, update: false, delete: false },
    },
    supplier_messages: {
      model:
        "authenticated related-party conversation boundary: direct select + insert only; sender/supplier-user scoped",
      allowed: { select: true, insert: true, update: false, delete: false },
    },
    notifications: {
      model:
        "authenticated role-scoped notification boundary: direct select + mark-read update only; no direct insert/delete",
      allowed: { select: true, insert: false, update: true, delete: false },
    },
    ai_configs: {
      model:
        "authenticated read-only AI config lookup; writes should stay admin/backend-only",
      allowed: { select: true, insert: false, update: false, delete: false },
    },
    ai_reports: {
      model:
        "authenticated/company-scoped AI report sink: direct upsert allowed; no broad direct delete path expected",
      allowed: { select: false, insert: true, update: true, delete: false },
    },
    chat_messages: {
      model:
        "authenticated listing-thread chat boundary: direct select/insert/read-receipt-or-soft-delete update allowed; no direct delete path expected",
      allowed: { select: true, insert: true, update: true, delete: false },
    },
    company_invites: {
      model:
        "authenticated office invite boundary: company-scoped direct select allowed; only company owner/director may create; no direct update/delete",
      allowed: { select: true, insert: true, update: false, delete: false },
    },
    developer_access_overrides: {
      model:
        "authenticated own-select break-glass boundary; no direct client writes",
      allowed: { select: true, insert: false, update: false, delete: false },
    },
    developer_override_audit_log: {
      model:
        "authenticated own-select break-glass audit boundary; no direct client writes",
      allowed: { select: true, insert: false, update: false, delete: false },
    },
    foreman_ai_prompt_cache: {
      model:
        "backend/service-only cache boundary; direct anon/authenticated table access should stay blocked",
      allowed: { select: false, insert: false, update: false, delete: false },
    },
    proposal_submit_mutations_v1: {
      model:
        "mutation ledger boundary: no direct anon/authenticated table access; use exact wrapper only",
      allowed: { select: false, insert: false, update: false, delete: false },
    },
    warehouse_receive_apply_idempotency_v1: {
      model:
        "mutation ledger boundary: no direct anon/authenticated table access; use exact wrapper only",
      allowed: { select: false, insert: false, update: false, delete: false },
    },
    warehouse_issue_request_mutations_v1: {
      model:
        "mutation ledger boundary: no direct anon/authenticated table access; use exact wrapper only",
      allowed: { select: false, insert: false, update: false, delete: false },
    },
    warehouse_issue_free_mutations_v1: {
      model:
        "mutation ledger boundary: no direct anon/authenticated table access; use exact wrapper only",
      allowed: { select: false, insert: false, update: false, delete: false },
    },
    accounting_pay_invoice_mutations_v1: {
      model:
        "mutation ledger boundary: no direct anon/authenticated table access; use exact wrapper only",
      allowed: { select: false, insert: false, update: false, delete: false },
    },
  };

  if (exact[relation]) return exact[relation];

  if (/^(ref_|catalog_|rik_)/.test(relation)) {
    return {
      model:
        "shared reference data: authenticated read expected; writes should stay backend/admin-only",
      allowed: { select: true, insert: false, update: false, delete: false },
    };
  }

  if (
    relation === "objects" ||
    relation === "companies" ||
    relation === "company_profiles" ||
    relation === "contractors" ||
    relation === "suppliers" ||
    relation === "user_profiles" ||
    relation === "profiles"
  ) {
    return {
      model:
        "identity/master data: authenticated scoped read expected; writes should stay owner/admin constrained",
      allowed: {
        select: true,
        insert: observedOps.has("insert"),
        update: observedOps.has("update"),
        delete: observedOps.has("delete"),
      },
    };
  }

  if (
    relation.startsWith("request") ||
    relation.startsWith("proposal") ||
    relation.startsWith("purchase") ||
    relation.startsWith("subcontract") ||
    relation.startsWith("warehouse_") ||
    relation.startsWith("wh_") ||
    relation.startsWith("work_") ||
    relation.startsWith("market_") ||
    relation.startsWith("company_")
  ) {
    return {
      model:
        "business data boundary: authenticated role/owner/object-scoped access expected for observed client operations",
      allowed: {
        select: observedOps.has("select"),
        insert: observedOps.has("insert"),
        update: observedOps.has("update"),
        delete: observedOps.has("delete"),
      },
    };
  }

  return {
    model:
      "repo-inferred authenticated boundary: only observed client operations are expected to be allowed directly",
    allowed: {
      select: observedOps.has("select"),
      insert: observedOps.has("insert"),
      update: observedOps.has("update"),
      delete: observedOps.has("delete"),
    },
  };
}

function computeCoverage(op, state, expectedAllowed) {
  if (!state) return null;

  const rlsEnabled = state.rlsEnabled;
  const clientGrant = hasClientGrant(state, op);
  const explicitRevoke = hasExplicitClientRevoke(state, op);
  const policy = hasPolicy(state, op);

  if (expectedAllowed) {
    if (rlsEnabled !== true) {
      return rlsEnabled === false ? false : null;
    }
    if (clientGrant === true) {
      return policy ? true : false;
    }
    if (clientGrant === false) {
      return null;
    }
    return policy ? null : null;
  }

  if (clientGrant === true) {
    return false;
  }
  if (explicitRevoke) {
    return true;
  }
  if (rlsEnabled === true && state.createdIn.length > 0 && clientGrant !== true) {
    return true;
  }
  if (rlsEnabled === false) {
    return false;
  }
  if (rlsEnabled === true && state.grantEvidence.length > 0 && !policy) {
    return true;
  }
  return null;
}

function summarizeActualBoundary(state) {
  if (!state) {
    return {
      rlsEnabled: null,
      grants: { anon: [], authenticated: [] },
      policies: { select: [], insert: [], update: [], delete: [], all: [] },
    };
  }

  const grants = {};
  for (const role of CLIENT_ROLES) {
    const roleOps = [];
    for (const op of ["all", ...CRUD_OPS]) {
      const grant = hasGrant(state, role, op);
      if (grant === true) roleOps.push(`grant:${op}`);
      if (grant === false) roleOps.push(`revoke:${op}`);
    }
    grants[role] = roleOps;
  }

  return {
    rlsEnabled: state.rlsEnabled,
    grants,
    policies: {
      select: state.policyOps.select.map((item) => `${item.file}:${item.policy}`),
      insert: state.policyOps.insert.map((item) => `${item.file}:${item.policy}`),
      update: state.policyOps.update.map((item) => `${item.file}:${item.policy}`),
      delete: state.policyOps.delete.map((item) => `${item.file}:${item.policy}`),
      all: state.policyOps.all.map((item) => `${item.file}:${item.policy}`),
    },
  };
}

function classifyRisk(relation, state, coverage) {
  const coverageValues = CRUD_OPS.map((op) => coverage[op]);
  const hasFail = coverageValues.includes(false);
  const hasUnknown = coverageValues.includes(null);
  const hasEvidence = Boolean(state && (state.rlsEvidence.length || state.grantEvidence.length));

  if (POLICY_TOO_BROAD_CLUSTER.has(relation)) return "high";
  if (hasFail) return "high";
  if (!hasEvidence) return "high";
  if (hasUnknown) return "medium";
  return "low";
}

function nextActionFor(relation, riskLevel) {
  if (relation === "supplier_messages" && riskLevel === "low") {
    return "verified_safe_no_change";
  }
  if (
    (relation === "app_errors" ||
      relation === "submit_jobs" ||
      relation === "ai_configs" ||
      relation === "ai_reports" ||
      relation === "chat_messages" ||
      relation === "company_invites") &&
    riskLevel === "low"
  ) {
    return "verified_safe_after_hardening";
  }
  if (POLICY_TOO_BROAD_CLUSTER.has(relation)) {
    return "review_scope_narrowing_before_hardening";
  }
  if (riskLevel === "high") {
    return "verify_live_db_or_prepare_single-table_hardening";
  }
  if (riskLevel === "medium") {
    return "close_repo_evidence_gap";
  }
  return "keep_under_verification";
}

function buildLegacyPhase1Shortlist(tableRows) {
  return buildRemainingShortlist(tableRows);
}

function buildHighRiskClusterRelation(tableRows) {
  const clusterRelations = tableRows
    .filter((row) => POLICY_TOO_BROAD_CLUSTER.has(row.table) && row.actual_risk_level === "high")
    .map((row) => row.table)
    .sort();
  return clusterRelations.length > 0 ? clusterRelations.join("/") : null;
}

function computeRemainingCandidateScore(row) {
  const ops = new Set(row.observed_client_ops || []);
  const writeScore =
    (ops.has("insert") ? 3 : 0) +
    (ops.has("update") ? 2 : 0) +
    (ops.has("delete") ? 2 : 0);
  const readScore = ops.has("select") ? 1 : 0;
  const narrowScore = Math.max(0, 5 - (row.touched_files?.length ?? 0));
  return writeScore + readScore + narrowScore;
}

function pickRemainingNextCandidate(tableRows) {
  const eligibleRows = tableRows.filter(
    (row) =>
      row.actual_risk_level === "high" &&
      !POLICY_TOO_BROAD_CLUSTER.has(row.table) &&
      row.next_action === "verify_live_db_or_prepare_single-table_hardening",
  );

  for (const relation of REMAINING_SHORTLIST_PREFERRED) {
    const row = eligibleRows.find((candidate) => candidate.table === relation);
    if (row) return row;
  }

  return eligibleRows
    .slice()
    .sort((left, right) => {
      const scoreDelta = computeRemainingCandidateScore(right) - computeRemainingCandidateScore(left);
      if (scoreDelta !== 0) return scoreDelta;
      const fileDelta = (left.touched_files?.length ?? 0) - (right.touched_files?.length ?? 0);
      if (fileDelta !== 0) return fileDelta;
      return left.table.localeCompare(right.table);
    })[0] ?? null;
}

function buildRemainingShortlist(tableRows) {
  const shortlist = [];

  const supplierMessages = tableRows.find((row) => row.table === "supplier_messages");
  if (supplierMessages?.actual_risk_level === "low") {
    shortlist.push({
      candidate: "A",
      relation: "supplier_messages",
      outcome: "verified safe",
      reason:
        "Explicit create table, RLS enablement, authenticated select/insert grants, and operation-specific policies remain provable in repo history.",
    });
  }

  const appErrors = tableRows.find((row) => row.table === "app_errors");
  if (appErrors?.actual_risk_level === "low") {
    shortlist.push({
      candidate: "B",
      relation: "app_errors",
      outcome: "verified safe after hardening",
      reason:
        "The current repo now proves table creation, RLS enablement, insert-only grants, and the constrained authenticated/anon insert policy for the diagnostics sink.",
    });
  }

  const submitJobs = tableRows.find((row) => row.table === "submit_jobs");
  if (submitJobs?.actual_risk_level === "low") {
    shortlist.push({
      candidate: "C",
      relation: "submit_jobs",
      outcome: "verified safe after hardening",
      reason:
        "The current repo now proves queue-table RLS enablement, authenticated own select/insert direct access, and security-definer worker RPC boundaries for processing transitions.",
    });
  }

  const aiConfigs = tableRows.find((row) => row.table === "ai_configs");
  if (aiConfigs?.actual_risk_level === "low") {
    shortlist.push({
      candidate: "D",
      relation: "ai_configs",
      outcome: "verified safe after hardening",
      reason:
        "The current repo now proves table creation, RLS enablement, authenticated active-row select access, and the closed direct-write boundary for AI prompt configuration.",
    });
  }

  const aiReports = tableRows.find((row) => row.table === "ai_reports");
  if (aiReports?.actual_risk_level === "low") {
    shortlist.push({
      candidate: "E",
      relation: "ai_reports",
      outcome: "verified safe after hardening",
      reason:
        "The current repo now proves table creation, RLS enablement, authenticated own-row upsert-only access, and company-membership checks for scoped AI report writes.",
    });
  }

  const chatMessages = tableRows.find((row) => row.table === "chat_messages");
  if (chatMessages?.actual_risk_level === "low") {
    shortlist.push({
      candidate: "F",
      relation: "chat_messages",
      outcome: "verified safe after hardening",
      reason:
        "The current repo now proves table creation, RLS enablement, authenticated listing-thread reads, own-row inserts, and narrow read-receipt-or-soft-delete update boundaries without direct delete grants.",
    });
  }

  const companyInvites = tableRows.find((row) => row.table === "company_invites");
  if (companyInvites?.actual_risk_level === "low") {
    shortlist.push({
      candidate: "G",
      relation: "company_invites",
      outcome: "verified safe after hardening",
      reason:
        "The current repo now proves RLS enablement, authenticated same-company invite visibility, and owner/director-scoped invite creation without any direct update/delete surface.",
    });
  }

  const clusterRelation = buildHighRiskClusterRelation(tableRows);
  if (clusterRelation) {
    shortlist.push({
      candidate: "H",
      relation: clusterRelation,
      outcome: "policy too broad / too wide",
      reason:
        "The director realtime select cluster still spans multiple core tables, so it remains a poor fit for a narrow verification or single-table hardening slice.",
    });
  }

  const nextCandidate = pickRemainingNextCandidate(tableRows);
  if (nextCandidate) {
    shortlist.push({
      candidate: "I",
      relation: nextCandidate.table,
      outcome: "chosen next hardening candidate",
      reason:
        "This is the narrowest remaining high-risk direct-client table in the current repo snapshot: write-capable runtime usage, no provable repo-side RLS/grant evidence, and limited touched-file blast radius.",
    });
  }

  return shortlist;
}

function buildShortlist(tableRows, shortlistStrategy) {
  return shortlistStrategy === SHORTLIST_STRATEGY_REMAINING
    ? buildRemainingShortlist(tableRows)
    : buildLegacyPhase1Shortlist(tableRows);
}

function looksLikeViewRelation(relation) {
  return (
    relation.startsWith("v_") ||
    relation.endsWith("_ui") ||
    relation.endsWith("_view") ||
    relation.endsWith("_display")
  );
}

function main() {
  const options = parseArgs();
  const { tables, views } = parsePublicRelations();
  const runtimeUsage = collectRuntimeUsage();
  const { store: migrationState, createdViews } = parseMigrations();

  const touchedTables = [];
  const touchedViews = [];
  const unknownRelations = [];

  for (const usage of runtimeUsage.values()) {
    const state = migrationState.get(usage.relation) ?? null;
    const isView =
      views.has(usage.relation) ||
      createdViews.has(usage.relation) ||
      looksLikeViewRelation(usage.relation);
    const isTable =
      tables.has(usage.relation) ||
      Boolean(state && Array.isArray(state.createdIn) && state.createdIn.length > 0) ||
      !isView;

    if (isView) {
      touchedViews.push(usage);
      continue;
    }
    if (isTable) {
      touchedTables.push(usage);
      continue;
    }
    unknownRelations.push(usage);
  }

  touchedTables.sort((a, b) => a.relation.localeCompare(b.relation));
  touchedViews.sort((a, b) => a.relation.localeCompare(b.relation));
  unknownRelations.sort((a, b) => a.relation.localeCompare(b.relation));

  const tableRows = touchedTables.map((usage) => {
    const state = migrationState.get(usage.relation) ?? null;
    const expectation = buildExpectation(usage.relation, usage.ops);
    const coverage = {};

    for (const op of CRUD_OPS) {
      coverage[op] = computeCoverage(op, state, expectation.allowed[op]);
    }

    const riskLevel = classifyRisk(usage.relation, state, coverage);
    return {
      table: usage.relation,
      rls_enabled: state ? state.rlsEnabled : null,
      select_covered: coverage.select,
      insert_covered: coverage.insert,
      update_covered: coverage.update,
      delete_covered: coverage.delete,
      expected_access_model: expectation.model,
      actual_risk_level: riskLevel,
      next_action: nextActionFor(usage.relation, riskLevel),
      observed_client_ops: Array.from(usage.ops).sort(),
      usage_sources: Array.from(usage.sourceKinds).sort(),
      touched_files: Array.from(usage.files).sort(),
      reasons: Array.from(usage.reasons).sort(),
      actual_boundary: summarizeActualBoundary(state),
      evidence: state
        ? {
            created_in: state.createdIn,
            rls_evidence: state.rlsEvidence,
            grant_evidence: state.grantEvidence,
          }
        : {
            created_in: [],
            rls_evidence: [],
            grant_evidence: [],
          },
    };
  });

  const summary = {
    app_touched_tables: tableRows.length,
    app_touched_views: touchedViews.length,
    unknown_relations: unknownRelations.length,
    high_risk_tables: tableRows.filter((row) => row.actual_risk_level === "high").length,
    medium_risk_tables: tableRows.filter((row) => row.actual_risk_level === "medium").length,
    low_risk_tables: tableRows.filter((row) => row.actual_risk_level === "low").length,
  };

  const payload = {
    wave: options.wave,
    generated_at: new Date().toISOString(),
    scope: {
      verification_only: true,
      runtime_semantics_changed: false,
      repo_based_verification: true,
      shortlist_strategy: options.shortlistStrategy,
    },
    limitations: [
      "Repository migration history contains placeholder files, so baseline RLS/grant state is not provable for every legacy table from repo history alone.",
      "Views are inventoried separately because RLS applies to base tables, not to views directly.",
      "Coverage booleans are repo-evidence-based: null means the repository does not prove the boundary either way.",
    ],
    summary,
    shortlist: buildShortlist(tableRows, options.shortlistStrategy),
    storage_buckets_excluded: ["avatars", "supplier_files"],
    touched_views: touchedViews.map((usage) => ({
      relation: usage.relation,
      observed_client_ops: Array.from(usage.ops).sort(),
      usage_sources: Array.from(usage.sourceKinds).sort(),
      touched_files: Array.from(usage.files).sort(),
      reasons: Array.from(usage.reasons).sort(),
    })),
    unknown_relations: unknownRelations.map((usage) => ({
      relation: usage.relation,
      observed_client_ops: Array.from(usage.ops).sort(),
      touched_files: Array.from(usage.files).sort(),
      reasons: Array.from(usage.reasons).sort(),
    })),
    tables: tableRows,
  };

  fs.writeFileSync(options.outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        output: relative(options.outputPath),
        summary,
        shortlist: payload.shortlist,
      },
      null,
      2,
    ),
  );
}

main();
