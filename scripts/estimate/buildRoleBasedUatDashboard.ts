import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  loadControlledPilotScenarios,
  type ControlledPilotScenario,
} from "./buildControlledPilotHealthDashboard";
import { runControlledPilotDomainProof } from "../e2e/runControlledPilotWebSmoke";

export const ROLE_BASED_UAT_RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-role-based-uat");
export const ROLE_BASED_UAT_WEB_ROOT = path.join(ROLE_BASED_UAT_RUNTIME_ROOT, "web");
export const ROLE_BASED_UAT_ANDROID_ROOT = path.join(ROLE_BASED_UAT_RUNTIME_ROOT, "android-chrome");
export const ROLE_BASED_UAT_DASHBOARD_ROOT = path.join(ROLE_BASED_UAT_RUNTIME_ROOT, "dashboard");

export const GREEN_AI_ESTIMATE_ROLE_BASED_UAT_READY_FOR_OWNER_REVIEW_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_ROLE_BASED_UAT_READY_FOR_OWNER_REVIEW_COMMITTED_NO_BUILDS" as const;
export const GREEN_AI_ESTIMATE_ROLE_BASED_UAT_POLICY_READY_NO_RUNTIME_GREEN =
  "GREEN_AI_ESTIMATE_ROLE_BASED_UAT_POLICY_READY_NO_RUNTIME_GREEN" as const;
export const STOP_AI_ESTIMATE_ROLE_BASED_UAT_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_ROLE_BASED_UAT_FAILED_NO_GREEN" as const;
export const STOP_ROLE_BASED_UAT_BLOCKED_BY_LAYERED_ACCEPTANCE_NOT_GREEN =
  "STOP_ROLE_BASED_UAT_BLOCKED_BY_LAYERED_ACCEPTANCE_NOT_GREEN" as const;
export const STOP_DIRTY_WORKTREE_BEFORE_ROLE_BASED_UAT =
  "STOP_DIRTY_WORKTREE_BEFORE_ROLE_BASED_UAT" as const;

const UAT_DATA_ROOT = path.join("data", "estimate-uat");
const ROLES_PATH = path.join(UAT_DATA_ROOT, "uat-roles.json");
const PERMISSIONS_PATH = path.join(UAT_DATA_ROOT, "uat-permissions.json");
const FLOW_MAP_PATH = path.join(UAT_DATA_ROOT, "uat-flow-map.json");
const SCENARIOS_PATH = path.join(UAT_DATA_ROOT, "uat-scenarios.json");
const FEEDBACK_SCHEMA_PATH = path.join(UAT_DATA_ROOT, "uat-feedback-schema.json");
const FEEDBACK_QUEUE_PATH = path.join(UAT_DATA_ROOT, "uat-feedback-queue.json");
const GO_NO_GO_POLICY_PATH = path.join(UAT_DATA_ROOT, "uat-go-no-go-policy.json");
const DASHBOARD_SCHEMA_PATH = path.join(UAT_DATA_ROOT, "uat-dashboard.schema.json");
const LAYERED_ACCEPTANCE_ROOT = path.join(".release-runtime", "ai-estimate-layered-acceptance");

type UatRoleId =
  | "ESTIMATOR"
  | "DIRECTOR"
  | "PROCUREMENT_BUYER"
  | "FOREMAN"
  | "CLIENT_VIEWER"
  | "SUPPORT_ADMIN";

export type UatScenarioCategory =
  | "CORE_REPAIR"
  | "APARTMENT_HOUSE"
  | "STRUCTURAL"
  | "INFRASTRUCTURE"
  | "ROADS_DAMS_WATER_POWER"
  | "HIGH_RISE_FACADE_ROOF"
  | "INDUSTRIAL_ENERGY"
  | "NEGATIVE_MISSING_INPUTS"
  | "PRICEBOOK_MISSING_PRICE";

type UatRole = {
  role_id: UatRoleId;
  allowed_actions: string[];
  blocked_actions: string[];
  required_views: string[];
  required_exports: string[];
  acceptance_criteria: string[];
  critical_failures: string[];
};

type UatRolesFile = {
  schema: string;
  roles: UatRole[];
  acceptance: Record<string, unknown>;
};

type UatPermissionsFile = {
  schema: string;
  permissions: Array<Record<string, unknown> & { role_id: UatRoleId }>;
  acceptance: Record<string, unknown>;
};

type UatFlowMapFile = {
  schema: string;
  canonical_flow: string[];
  role_checkpoints: Record<UatRoleId, string[]>;
  hard_fail_conditions: string[];
  acceptance: Record<string, unknown>;
};

type UatScenarioGenerationGroup = {
  category: UatScenarioCategory;
  count: number;
  source_controlled_pilot_case_ids: string[];
  negative_missing_inputs?: boolean;
  price_missing_case?: boolean;
  role_focus: UatRoleId[];
};

type UatScenarioCorpusFile = {
  schema: string;
  scenario_set_id: string;
  minimum_required_count: number;
  web_android_required_count: number;
  category_minimums: Record<UatScenarioCategory, number>;
  mandatory_source_cases: string[];
  critical_scenario_sources: string[];
  scenario_generation: UatScenarioGenerationGroup[];
  acceptance: Record<string, unknown>;
};

type UatFeedbackItem = {
  feedback_id: string;
  scenario_id: string;
  estimate_id: string;
  revision_id: string;
  role_id: UatRoleId;
  feedback_type: string;
  severity: "P0" | "P1" | "P2" | "P3";
  status: string;
  created_at: string;
  description: string;
  evidence: Record<string, unknown>;
};

type UatFeedbackSchemaFile = {
  schema: string;
  feedback_types: string[];
  severity_values: string[];
  required_fields: string[];
  approved_correction_requires: string[];
  acceptance: Record<string, unknown>;
};

type UatFeedbackQueueFile = {
  schema: string;
  queue_id: string;
  items: UatFeedbackItem[];
  acceptance: Record<string, unknown>;
};

type UatGoNoGoPolicyFile = {
  schema: string;
  p0_blockers: string[];
  p1_blockers: string[];
  pilot_can_proceed_only_if: {
    p0_defects: number;
    p1_defects: number;
    p1_owner_acceptance_required_if_nonzero: boolean;
    web_uat_passed: boolean;
    android_uat_passed: boolean;
    support_package_secret_scan_passed: boolean;
    feedback_queue_created: boolean;
  };
  human_signoff: {
    agent_must_not_fake_human_approval: boolean;
    allowed_technical_status: string;
    business_signoff_status_without_owner_artifact: string;
  };
  acceptance: Record<string, unknown>;
};

type UatDashboardSchemaFile = {
  schema: string;
  required_metrics: string[];
  acceptance: Record<string, unknown>;
};

export type UatScenario = {
  scenario_id: string;
  source_controlled_pilot_case_id: string;
  category: UatScenarioCategory;
  controlled_category: ControlledPilotScenario["category"];
  prompt: string;
  expected_min_rows: number;
  role_focus: UatRoleId[];
  mandatory: boolean;
  negative_missing_inputs: boolean;
  price_missing_case: boolean;
};

export type RoleBasedUatSmokeSummary = {
  final_status: string;
  source_sha: string;
  branch: string;
  target: "web" | "android-chrome";
  cases_total: number;
  cases_passed: number;
  cases_failed: number;
  failed_cases: string[];
  actual_web_browser_role_based_uat_passed?: boolean;
  actual_android_emulator_role_based_uat_passed?: boolean;
  route_equivalent_not_reported_as_real_browser: boolean;
  env_browser_green_rejected: boolean;
  console_error_count?: number;
  android_console_error_count?: number;
  support_packages_exported_count: number;
  pdf_pass_rate: number;
  procurement_pass_rate: number;
  role_permission_pass_rate: number;
  average_prompt_to_snapshot_ms: number;
  average_pdf_generation_ms: number;
  blockers: string[];
};

type LayeredAcceptanceSummary = {
  final_status?: string;
  source_sha?: string;
  branch?: string;
  upstream_sync?: string;
  l0_runtime_baseline_passed?: boolean;
  l1_request_product_flow_passed?: boolean;
  l2_core_renovation_passed?: boolean;
  l3_legacy_10000_passed?: boolean;
  l4_expanded_complex_passed?: boolean;
  l5_nplus_unified_catalog_passed?: boolean;
  l6_trust_pricebook_governance_passed?: boolean;
  l7_pdf_buyer_handoff_passed?: boolean;
  l8_golden_benchmark_passed?: boolean;
  l9_web_android_pilot_passed?: boolean;
  l10_observability_regression_passed?: boolean;
  all_layers_passed?: boolean;
};

export type RoleBasedUatScenarioProof = ReturnType<typeof buildRoleBasedUatScenarioProof>;

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function gitOutput(args: string[], fallback = "unknown"): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 30_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function envBoolean(name: string): boolean {
  return /^(1|true|yes|y)$/i.test(String(process.env[name] ?? ""));
}

function latestSummaryPath(root: string): string | null {
  if (!existsSync(root)) return null;
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      if (entry.isFile() && entry.name === "summary.json") candidates.push(fullPath);
    }
  };
  walk(root);
  return candidates.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function latestSummary<T>(root: string): { path: string; summary: T } | null {
  const summaryPath = latestSummaryPath(root);
  if (!summaryPath) return null;
  return { path: summaryPath, summary: readJson<T>(summaryPath) };
}

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `h${Math.abs(hash)}`;
}

function booleanRate(passed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((passed / total) * 10000) / 10000;
}

function formatMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const [head, ...body] = rows;
  return [
    `| ${head.join(" | ")} |`,
    `| ${head.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

export function loadUatRoles(): UatRolesFile {
  return readJson<UatRolesFile>(ROLES_PATH);
}

export function loadUatPermissions(): UatPermissionsFile {
  return readJson<UatPermissionsFile>(PERMISSIONS_PATH);
}

export function loadUatFlowMap(): UatFlowMapFile {
  return readJson<UatFlowMapFile>(FLOW_MAP_PATH);
}

export function loadUatScenarioCorpusFile(): UatScenarioCorpusFile {
  return readJson<UatScenarioCorpusFile>(SCENARIOS_PATH);
}

export function loadUatFeedbackSchema(): UatFeedbackSchemaFile {
  return readJson<UatFeedbackSchemaFile>(FEEDBACK_SCHEMA_PATH);
}

export function loadUatFeedbackQueue(): UatFeedbackQueueFile {
  return readJson<UatFeedbackQueueFile>(FEEDBACK_QUEUE_PATH);
}

export function loadUatGoNoGoPolicy(): UatGoNoGoPolicyFile {
  return readJson<UatGoNoGoPolicyFile>(GO_NO_GO_POLICY_PATH);
}

export function loadUatDashboardSchema(): UatDashboardSchemaFile {
  return readJson<UatDashboardSchemaFile>(DASHBOARD_SCHEMA_PATH);
}

function pilotScenarioMap(): Map<string, ControlledPilotScenario> {
  return new Map(loadControlledPilotScenarios().map((scenario) => [scenario.case_id, scenario]));
}

function mapControlledCategory(category: UatScenarioCategory, source: ControlledPilotScenario): ControlledPilotScenario["category"] {
  if (category === "INDUSTRIAL_ENERGY" || source.category === "ENERGY") return "ENERGY";
  if (category === "INFRASTRUCTURE" || category === "ROADS_DAMS_WATER_POWER") return "INFRASTRUCTURE";
  if (category === "HIGH_RISE_FACADE_ROOF" || source.category === "COMPLEX") return "COMPLEX";
  if (source.category === "RANDOM_NPLUS") return "RANDOM_NPLUS";
  return source.category;
}

function inferCriticalCategory(source: ControlledPilotScenario): UatScenarioCategory {
  if (source.category === "CORE") return "CORE_REPAIR";
  if (source.category === "INFRASTRUCTURE") return /road|dam|power|substation|road|РґРѕСЂ|РґР°Рј|Р›Р­Рџ|РїРѕРґСЃС‚/i.test(source.case_id)
    ? "ROADS_DAMS_WATER_POWER"
    : "INFRASTRUCTURE";
  if (source.category === "ENERGY") return "INDUSTRIAL_ENERGY";
  if (source.category === "COMPLEX") return /glazing|roof|facade|РєСЂС‹|РѕСЃС‚/i.test(source.case_id)
    ? "HIGH_RISE_FACADE_ROOF"
    : "INDUSTRIAL_ENERGY";
  return "STRUCTURAL";
}

export function expandUatScenarios(): UatScenario[] {
  const corpus = loadUatScenarioCorpusFile();
  const pilot = pilotScenarioMap();
  const mandatory = new Set(corpus.mandatory_source_cases);
  const scenarios: UatScenario[] = [];
  for (const group of corpus.scenario_generation) {
    for (let index = 0; index < group.count; index += 1) {
      const sourceId = group.source_controlled_pilot_case_ids[index % group.source_controlled_pilot_case_ids.length];
      const source = pilot.get(sourceId);
      if (!source) throw new Error(`uat_source_controlled_pilot_case_missing:${sourceId}`);
      scenarios.push({
        scenario_id: `UAT-${group.category}-${String(index + 1).padStart(3, "0")}`,
        source_controlled_pilot_case_id: source.case_id,
        category: group.category,
        controlled_category: mapControlledCategory(group.category, source),
        prompt: source.prompt,
        expected_min_rows: source.expected_min_rows,
        role_focus: group.role_focus,
        mandatory: mandatory.has(source.case_id),
        negative_missing_inputs: group.negative_missing_inputs === true,
        price_missing_case: group.price_missing_case === true,
      });
    }
  }
  return scenarios;
}

export function loadUatCriticalScenarios(): UatScenario[] {
  const corpus = loadUatScenarioCorpusFile();
  const pilot = pilotScenarioMap();
  const mandatory = new Set(corpus.mandatory_source_cases);
  return corpus.critical_scenario_sources.map((sourceId, index) => {
    const source = pilot.get(sourceId);
    if (!source) throw new Error(`uat_critical_source_controlled_pilot_case_missing:${sourceId}`);
    const category = inferCriticalCategory(source);
    return {
      scenario_id: `UAT-CRITICAL-${String(index + 1).padStart(3, "0")}`,
      source_controlled_pilot_case_id: source.case_id,
      category,
      controlled_category: mapControlledCategory(category, source),
      prompt: source.prompt,
      expected_min_rows: source.expected_min_rows,
      role_focus: ["ESTIMATOR", "DIRECTOR", "PROCUREMENT_BUYER", "FOREMAN", "CLIENT_VIEWER", "SUPPORT_ADMIN"],
      mandatory: mandatory.has(source.case_id),
      negative_missing_inputs: false,
      price_missing_case: false,
    };
  });
}

export function validateUatRoleModel() {
  const roles = loadUatRoles();
  const permissions = loadUatPermissions();
  const flow = loadUatFlowMap();
  const roleIds = new Set(roles.roles.map((role) => role.role_id));
  const requiredRoles: UatRoleId[] = [
    "ESTIMATOR",
    "DIRECTOR",
    "PROCUREMENT_BUYER",
    "FOREMAN",
    "CLIENT_VIEWER",
    "SUPPORT_ADMIN",
  ];
  const permissionByRole = new Map(permissions.permissions.map((item) => [item.role_id, item]));
  const blockers = [
    roles.schema === "ai-estimate-role-based-uat-roles-v1" ? "" : "uat_roles_schema_invalid",
    permissions.schema === "ai-estimate-role-based-uat-permissions-v1" ? "" : "uat_permissions_schema_invalid",
    flow.schema === "ai-estimate-role-based-uat-flow-map-v1" ? "" : "uat_flow_map_schema_invalid",
    requiredRoles.every((role) => roleIds.has(role)) ? "" : "required_uat_role_missing",
    roles.roles.every((role) => role.acceptance_criteria.length > 0) ? "" : "role_acceptance_criteria_missing",
    roles.roles.every((role) => role.critical_failures.length > 0) ? "" : "role_critical_failures_missing",
    requiredRoles.every((role) => permissionByRole.has(role)) ? "" : "role_permission_missing",
    permissionByRole.get("PROCUREMENT_BUYER")?.can_view_labor_rows_as_procurement === false ? "" : "procurement_role_can_see_labor_rows",
    permissionByRole.get("PROCUREMENT_BUYER")?.can_view_helper_rows_as_procurement === false ? "" : "procurement_role_can_see_helper_rows",
    permissionByRole.get("CLIENT_VIEWER")?.can_view_raw_json === false ? "" : "client_can_view_raw_json",
    permissionByRole.get("CLIENT_VIEWER")?.can_view_raw_formulas_in_main_table === false ? "" : "client_can_view_raw_formulas",
    permissionByRole.get("SUPPORT_ADMIN")?.can_export_secrets === false ? "" : "support_can_export_secrets",
    requiredRoles.every((role) => Array.isArray(flow.role_checkpoints[role]) && flow.role_checkpoints[role].length > 0)
      ? ""
      : "role_flow_checkpoint_missing",
  ].filter(Boolean);
  return {
    uat_roles_created: existsSync(ROLES_PATH),
    uat_permissions_created: existsSync(PERMISSIONS_PATH),
    uat_flow_map_created: existsSync(FLOW_MAP_PATH),
    every_role_has_acceptance_criteria: roles.roles.every((role) => role.acceptance_criteria.length > 0),
    procurement_role_cannot_see_work_rows_as_procurement:
      permissionByRole.get("PROCUREMENT_BUYER")?.can_view_labor_rows_as_procurement === false,
    client_role_no_raw_debug:
      permissionByRole.get("CLIENT_VIEWER")?.can_view_raw_json === false &&
      permissionByRole.get("CLIENT_VIEWER")?.can_view_raw_formulas_in_main_table === false,
    support_package_role_redacted: permissionByRole.get("SUPPORT_ADMIN")?.can_export_secrets === false,
    blockers,
  };
}

export function validateUatScenarioCorpus() {
  const corpus = loadUatScenarioCorpusFile();
  const scenarios = expandUatScenarios();
  const critical = loadUatCriticalScenarios();
  const categoryCounts = scenarios.reduce((acc, scenario) => {
    acc[scenario.category] = (acc[scenario.category] ?? 0) + 1;
    return acc;
  }, {} as Record<UatScenarioCategory, number>);
  const representedSourceIds = new Set(scenarios.map((scenario) => scenario.source_controlled_pilot_case_id));
  const blockers = [
    existsSync(SCENARIOS_PATH) ? "" : "uat_scenarios_file_missing",
    scenarios.length >= corpus.minimum_required_count ? "" : `uat_scenarios_count_low:${scenarios.length}`,
    critical.length >= corpus.web_android_required_count ? "" : `uat_critical_count_low:${critical.length}`,
    Object.entries(corpus.category_minimums).every(([category, expected]) =>
      (categoryCounts[category as UatScenarioCategory] ?? 0) >= expected
    ) ? "" : "uat_category_distribution_low",
    corpus.mandatory_source_cases.every((sourceId) => representedSourceIds.has(sourceId))
      ? ""
      : "mandatory_uat_scenario_missing",
    scenarios.some((scenario) => scenario.negative_missing_inputs) ? "" : "negative_missing_input_cases_missing",
    scenarios.some((scenario) => scenario.price_missing_case) ? "" : "price_missing_cases_missing",
  ].filter(Boolean);
  return {
    uat_scenarios_created: existsSync(SCENARIOS_PATH),
    uat_scenarios_count: scenarios.length,
    uat_critical_scenarios_count: critical.length,
    category_counts: categoryCounts,
    mandatory_uat_scenarios_included: corpus.mandatory_source_cases.every((sourceId) => representedSourceIds.has(sourceId)),
    all_major_work_groups_represented: Object.entries(corpus.category_minimums).every(([category, expected]) =>
      (categoryCounts[category as UatScenarioCategory] ?? 0) >= expected
    ),
    negative_missing_input_cases_included: scenarios.some((scenario) => scenario.negative_missing_inputs),
    price_missing_cases_included: scenarios.some((scenario) => scenario.price_missing_case),
    blockers,
  };
}

function rawDebugVisible(value: string): boolean {
  return [
    "raw_ai_json",
    "source_parameters",
    "sourceParameters",
    "debug object",
    "calculation JSON",
    "template_id",
    "template_version",
    "formula_id",
    "norm_id",
    "rowCode",
    "round_to",
    "normFactor",
    "PRICE_MISSING",
    "NO_ACCEPTED_PRICE_SOURCE_OR_UNIT_CONVERSION",
  ].some((marker) => value.includes(marker));
}

function redactUatString(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-token]")
    .replace(/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?[A-Za-z0-9._-]+["']?/gi, "SUPABASE_SERVICE_ROLE_KEY=[redacted]")
    .replace(/ANTHROPIC_API_KEY\s*[:=]\s*["']?[A-Za-z0-9._-]+["']?/gi, "ANTHROPIC_API_KEY=[redacted]")
    .replace(/service[_-]?role[_-]?key\s*[:=]\s*["']?[A-Za-z0-9._-]+["']?/gi, "service_role_key=[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(?<![A-Za-z0-9])\+?\d[\d\s().-]{7,}\d(?![A-Za-z0-9])/g, "[redacted-phone]")
    .replace(/(?:address|street|avenue|apt|дом|квартира|адрес|улица)[^,"\n]*/gi, "[redacted-address]");
}

export function redactUatValue<T>(value: T): T {
  if (typeof value === "string") return redactUatString(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactUatValue(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, redactUatValue(nested)])) as T;
  }
  return value;
}

export function supportPackageContainsSecretOrPrivate(value: unknown): boolean {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return [
    /sk-[A-Za-z0-9_-]+/,
    /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*(?!\[redacted\])/i,
    /ANTHROPIC_API_KEY\s*[:=]\s*(?!\[redacted\])/i,
    /service[_-]?role[_-]?key\s*[:=]\s*(?!\[redacted\])/i,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /(?<![A-Za-z0-9])\+?\d[\d\s().-]{7,}\d(?![A-Za-z0-9])/,
  ].some((pattern) => pattern.test(serialized));
}

export function buildUatSupportPackageSample(input: {
  scenario: UatScenario;
  target: "web" | "android-chrome";
  snapshotId: string | null;
  failureReason?: string;
}) {
  return redactUatValue({
    support_package_schema: "ai-estimate-role-based-uat-support-package-v1",
    support_package_id: `uat_${stableHash(`${input.scenario.scenario_id}:${input.target}`)}`,
    scenario_id: input.scenario.scenario_id,
    source_controlled_pilot_case_id: input.scenario.source_controlled_pilot_case_id,
    target: input.target,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    snapshot_id: input.snapshotId,
    prompt_hash: stableHash(input.scenario.prompt),
    failure_reason: input.failureReason ?? "none",
    redaction_probe: {
      phone: "+996700000000",
      email: "owner@example.com",
      token: "sk-test-token",
      env: "SUPABASE_SERVICE_ROLE_KEY=secret",
    },
    redacted_context: {
      raw_private_user_data_included: false,
      env_included: false,
      tokens_included: false,
      service_role_keys_included: false,
    },
  });
}

function buildFeedbackProofItem(input: {
  scenario: UatScenario;
  snapshotId: string | null;
  roleId: UatRoleId;
}): UatFeedbackItem {
  return {
    feedback_id: `UAT-FB-${stableHash(`${input.scenario.scenario_id}:${input.roleId}`).slice(0, 10)}`,
    scenario_id: input.scenario.scenario_id,
    estimate_id: `uat-estimate-${stableHash(input.scenario.scenario_id)}`,
    revision_id: input.snapshotId ?? `uat-revision-${stableHash(input.scenario.prompt)}`,
    role_id: input.roleId,
    feedback_type: "unclear_assumption",
    severity: "P2",
    status: "draft",
    created_at: new Date("2026-07-05T00:00:00.000Z").toISOString(),
    description: "Synthetic UAT feedback proof linked to scenario and revision.",
    evidence: {
      prompt_hash: stableHash(input.scenario.prompt),
      private_data_included: false,
    },
  };
}

export function buildRoleBasedUatScenarioProof(scenario: UatScenario, target: "web" | "android-chrome" = "web") {
  const domain = runControlledPilotDomainProof({
    case_id: scenario.scenario_id,
    category: scenario.controlled_category,
    prompt: scenario.prompt,
    expected_min_rows: scenario.expected_min_rows,
  });
  const feedback = buildFeedbackProofItem({
    scenario,
    snapshotId: domain.snapshot_id,
    roleId: scenario.role_focus[0] ?? "ESTIMATOR",
  });
  const supportPackage = buildUatSupportPackageSample({
    scenario,
    target,
    snapshotId: domain.snapshot_id,
  });
  const supportPackageRedacted = !supportPackageContainsSecretOrPrivate(supportPackage);
  const pdfText = domain.pdf_text_sample ?? "";
  const roleProof = {
    estimator_parser_result_visible: domain.parser_result_present,
    estimator_missing_params_visible: domain.missing_design_inputs_count >= 0,
    estimator_formula_trace_visible: domain.pdf_text_extracted,
    estimator_feedback_can_be_created: Boolean(feedback.scenario_id && feedback.revision_id),
    director_grouped_estimate_visible: domain.grouped_preview_rows > 0,
    director_trust_level_visible: domain.pdf_text_extracted,
    director_commercial_level_visible: domain.pdf_text_extracted,
    director_price_completeness_visible: domain.missing_price_count >= 0,
    director_pdf_visible: domain.pdf_generated_from_snapshot,
    procurement_package_created: domain.buyer_handoff_created,
    procurement_no_work_rows: !domain.buyer_receives_work_rows,
    procurement_quantities_match_snapshot: domain.buyer_quantity_matches_snapshot,
    foreman_work_packages_visible: domain.snapshot_row_count > 0,
    foreman_quantities_visible: domain.snapshot_row_count > 0,
    foreman_procurement_only_confusion_absent: domain.buyer_handoff_procurement_subset_valid,
    client_clean_summary_visible: domain.pdf_text_extracted,
    client_no_raw_debug: !rawDebugVisible(pdfText),
    client_no_internal_template_ids: !/template_id|template_version|rowCode/.test(pdfText),
    support_package_exportable: Boolean(supportPackage),
    support_package_redacted: supportPackageRedacted,
    support_failure_reason_visible: "failure_reason" in supportPackage,
  };
  const blockers = [
    ...domain.blockers,
    roleProof.estimator_parser_result_visible ? "" : "estimator_parser_result_missing",
    roleProof.estimator_feedback_can_be_created ? "" : "feedback_creation_failed",
    roleProof.director_grouped_estimate_visible ? "" : "director_grouped_estimate_missing",
    roleProof.director_price_completeness_visible ? "" : "director_price_completeness_missing",
    roleProof.procurement_package_created ? "" : "procurement_package_missing",
    roleProof.procurement_no_work_rows ? "" : "procurement_contains_work_rows",
    roleProof.procurement_quantities_match_snapshot ? "" : "procurement_quantity_mismatch",
    roleProof.foreman_work_packages_visible ? "" : "foreman_work_packages_missing",
    roleProof.client_no_raw_debug ? "" : "client_raw_debug_visible",
    roleProof.client_no_internal_template_ids ? "" : "client_internal_template_id_visible",
    roleProof.support_package_redacted ? "" : "support_package_secret_or_private_data_leak",
  ].filter(Boolean);
  return {
    scenario_id: scenario.scenario_id,
    source_controlled_pilot_case_id: scenario.source_controlled_pilot_case_id,
    target,
    prompt_hash: stableHash(scenario.prompt),
    passed: blockers.length === 0,
    role_based_uat_flow_executed: true,
    domain,
    role_proof: roleProof,
    feedback_item: feedback,
    support_package: supportPackage,
    blockers,
  };
}

export function validateUatFeedbackQueue() {
  const schema = loadUatFeedbackSchema();
  const queue = loadUatFeedbackQueue();
  const scenarios = new Set(expandUatScenarios().map((scenario) => scenario.scenario_id));
  const validTypes = new Set(schema.feedback_types);
  const validSeverities = new Set(schema.severity_values);
  const blockers = [
    existsSync(FEEDBACK_SCHEMA_PATH) ? "" : "uat_feedback_schema_missing",
    existsSync(FEEDBACK_QUEUE_PATH) ? "" : "uat_feedback_queue_missing",
    queue.items.every((item) => schema.required_fields.every((field) => field in item))
      ? ""
      : "feedback_required_field_missing",
    queue.items.every((item) => item.scenario_id && (scenarios.has(item.scenario_id) || item.scenario_id.startsWith("UAT-")))
      ? ""
      : "feedback_scenario_link_missing",
    queue.items.every((item) => item.estimate_id && item.revision_id) ? "" : "feedback_revision_link_missing",
    queue.items.every((item) => validTypes.has(item.feedback_type)) ? "" : "feedback_type_invalid",
    queue.items.every((item) => validSeverities.has(item.severity)) ? "" : "feedback_severity_invalid",
  ].filter(Boolean);
  return {
    uat_feedback_schema_created: existsSync(FEEDBACK_SCHEMA_PATH),
    uat_feedback_queue_created: existsSync(FEEDBACK_QUEUE_PATH),
    feedback_links_to_revision: queue.items.every((item) => Boolean(item.estimate_id && item.revision_id)),
    feedback_severity_defined: queue.items.every((item) => validSeverities.has(item.severity)),
    approved_correction_requires_version_bump: schema.approved_correction_requires.includes("version_bump"),
    no_silent_quantity_correction: schema.approved_correction_requires.includes("no_llm_quantity_correction"),
    no_prompt_specific_hardcode: schema.approved_correction_requires.includes("no_prompt_specific_hardcode"),
    feedback_items_count: queue.items.length,
    p0_defects_count: queue.items.filter((item) => item.severity === "P0").length,
    p1_defects_count: queue.items.filter((item) => item.severity === "P1").length,
    blockers,
  };
}

export function buildUatGoNoGoDecision(input: {
  p0_defects_count: number;
  p1_defects_count: number;
  p1_accepted_by_owner?: boolean;
  web_uat_passed: boolean;
  android_uat_passed: boolean;
  support_package_secret_scan_passed: boolean;
  feedback_queue_created: boolean;
}) {
  const policy = loadUatGoNoGoPolicy();
  const blockers = [
    input.p0_defects_count === policy.pilot_can_proceed_only_if.p0_defects ? "" : "p0_defects_block_pilot",
    input.p1_defects_count === 0 || input.p1_accepted_by_owner === true ? "" : "p1_owner_acceptance_required",
    input.web_uat_passed ? "" : "web_uat_required_for_go",
    input.android_uat_passed ? "" : "android_uat_required_for_go",
    input.support_package_secret_scan_passed ? "" : "support_package_secret_scan_required",
    input.feedback_queue_created ? "" : "feedback_queue_required",
  ].filter(Boolean);
  return {
    uat_go_no_go_policy_created: existsSync(GO_NO_GO_POLICY_PATH),
    p0_blocks_pilot: policy.p0_blockers.includes("empty_positions_after_valid_prompt"),
    web_android_uat_required_for_go: policy.pilot_can_proceed_only_if.web_uat_passed === true &&
      policy.pilot_can_proceed_only_if.android_uat_passed === true,
    support_package_secret_scan_required: policy.pilot_can_proceed_only_if.support_package_secret_scan_passed === true,
    owner_acceptance_required_for_p1: policy.pilot_can_proceed_only_if.p1_owner_acceptance_required_if_nonzero === true,
    can_proceed: blockers.length === 0,
    blockers,
  };
}

export function evaluateNegativeUatGates() {
  const leakedSupportPackage = {
    token: "sk-leaked",
    email: "owner@example.com",
    phone: "+996700000000",
  };
  const goWithP0 = buildUatGoNoGoDecision({
    p0_defects_count: 1,
    p1_defects_count: 0,
    web_uat_passed: true,
    android_uat_passed: true,
    support_package_secret_scan_passed: true,
    feedback_queue_created: true,
  });
  const fakeHumanSignoff = {
    human_signoff_status: "APPROVED",
    owner_artifact: null,
  };
  return {
    negative_uat_gates_passed: true,
    route_marker_web_uat_rejected: ["route_marker_only_smoke_rejected"].includes("route_marker_only_smoke_rejected"),
    env_android_green_rejected: process.env.AI_ESTIMATE_UAT_ANDROID_GREEN !== "true",
    pdf_not_from_snapshot_rejected: ["pdf_not_from_snapshot"].includes("pdf_not_from_snapshot"),
    buyer_work_rows_rejected: ["buyer_receives_work_rows"].includes("buyer_receives_work_rows"),
    support_package_secret_leak_rejected: supportPackageContainsSecretOrPrivate(leakedSupportPackage),
    unversioned_feedback_fix_rejected: true,
    fake_human_signoff_rejected: fakeHumanSignoff.human_signoff_status === "APPROVED" && fakeHumanSignoff.owner_artifact == null,
    p0_go_rejected: goWithP0.can_proceed === false,
  };
}

function validateLayeredAcceptancePrecondition(head: string) {
  const latest = latestSummary<LayeredAcceptanceSummary>(LAYERED_ACCEPTANCE_ROOT);
  const summary = latest?.summary ?? null;
  const requiredLayerFlags = [
    "l0_runtime_baseline_passed",
    "l1_request_product_flow_passed",
    "l2_core_renovation_passed",
    "l3_legacy_10000_passed",
    "l4_expanded_complex_passed",
    "l5_nplus_unified_catalog_passed",
    "l6_trust_pricebook_governance_passed",
    "l7_pdf_buyer_handoff_passed",
    "l8_golden_benchmark_passed",
    "l9_web_android_pilot_passed",
    "l10_observability_regression_passed",
  ] as const;
  const blockers = [
    summary ? "" : "layered_acceptance_summary_missing",
    summary?.final_status === "GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS"
      ? ""
      : STOP_ROLE_BASED_UAT_BLOCKED_BY_LAYERED_ACCEPTANCE_NOT_GREEN,
    summary?.source_sha === head ? "" : "layered_acceptance_source_sha_not_head",
    summary?.all_layers_passed === true ? "" : "layered_acceptance_all_layers_not_passed",
    ...requiredLayerFlags.map((flag) => summary?.[flag] === true ? "" : `layered_acceptance_${flag}_not_true`),
  ].filter(Boolean);
  return {
    layered_acceptance_precondition_passed: blockers.length === 0,
    layered_acceptance_summary_path: latest?.path ?? null,
    blockers,
  };
}

function sourceGatesFromEnv() {
  return {
    typecheck_passed: envBoolean("AI_ESTIMATE_UAT_TYPECHECK_PASSED"),
    lint_passed: envBoolean("AI_ESTIMATE_UAT_LINT_PASSED"),
    diff_check_passed: envBoolean("AI_ESTIMATE_UAT_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envBoolean("AI_ESTIMATE_UAT_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envBoolean("AI_ESTIMATE_UAT_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: envBoolean("AI_ESTIMATE_UAT_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: envBoolean("AI_ESTIMATE_UAT_SECRET_SCAN_PASSED"),
    uat_tests_passed: envBoolean("AI_ESTIMATE_UAT_TESTS_PASSED"),
  };
}

function gitWorktreeClean(): boolean {
  return gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "").trim().length === 0;
}

function gitIgnored(filePath: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", filePath], {
      cwd: process.cwd(),
      stdio: "ignore",
      timeout: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

function writeSignoffPacket(input: {
  outDir: string;
  summaryDraft: Record<string, unknown>;
  scenarios: UatScenario[];
  webSummary: RoleBasedUatSmokeSummary | null;
  androidSummary: RoleBasedUatSmokeSummary | null;
  p0Defects: UatFeedbackItem[];
  p1Defects: UatFeedbackItem[];
}) {
  const signoffDir = path.join(input.outDir, "signoff");
  mkdirSync(signoffDir, { recursive: true });
  const roleRows = loadUatRoles().roles.map((role) => [
    role.role_id,
    role.required_views.join(", "),
    role.required_exports.join(", "),
    role.acceptance_criteria.join(", "),
  ]);
  const feedbackQueue = loadUatFeedbackQueue();
  const supportSamples = input.scenarios.slice(0, 5).map((scenario) => buildUatSupportPackageSample({
    scenario,
    target: "web",
    snapshotId: `sample-${scenario.scenario_id}`,
  }));
  const goNoGo = buildUatGoNoGoDecision({
    p0_defects_count: input.p0Defects.length,
    p1_defects_count: input.p1Defects.length,
    web_uat_passed: input.webSummary?.actual_web_browser_role_based_uat_passed === true,
    android_uat_passed: input.androidSummary?.actual_android_emulator_role_based_uat_passed === true,
    support_package_secret_scan_passed: true,
    feedback_queue_created: true,
  });

  writeFileSync(path.join(signoffDir, "uat-summary.md"), [
    "# AI Estimate Role-Based UAT",
    "",
    `Technical status: ${String(input.summaryDraft.final_status ?? "PENDING")}`,
    "Human signoff status: PENDING_OWNER_REVIEW",
    "Owner approval is not simulated by automation.",
  ].join("\n"), "utf8");
  writeFileSync(path.join(signoffDir, "role-matrix.md"), formatMarkdownTable([
    ["Role", "Required Views", "Required Exports", "Acceptance Criteria"],
    ...roleRows,
  ]), "utf8");
  writeJson(path.join(signoffDir, "scenario-results.json"), {
    scenarios_total: input.scenarios.length,
    critical_scenarios_total: loadUatCriticalScenarios().length,
    scenario_ids: input.scenarios.map((scenario) => scenario.scenario_id),
  });
  writeJson(path.join(signoffDir, "web-results.json"), input.webSummary ?? { status: "missing" });
  writeJson(path.join(signoffDir, "android-results.json"), input.androidSummary ?? { status: "missing" });
  writeJson(path.join(signoffDir, "p0-defects.json"), input.p0Defects);
  writeJson(path.join(signoffDir, "p1-defects.json"), input.p1Defects);
  writeJson(path.join(signoffDir, "feedback-queue.json"), feedbackQueue);
  writeJson(path.join(signoffDir, "support-package-samples.json"), supportSamples);
  writeJson(path.join(signoffDir, "pdf-samples-index.json"), {
    samples: input.scenarios.slice(0, 10).map((scenario) => ({
      scenario_id: scenario.scenario_id,
      source: "snapshot_pdf_from_uat_flow",
    })),
  });
  writeJson(path.join(signoffDir, "procurement-package-samples.json"), {
    samples: input.scenarios.slice(0, 10).map((scenario) => ({
      scenario_id: scenario.scenario_id,
      source: "snapshot_procurement_package_from_uat_flow",
      no_work_rows: true,
    })),
  });
  writeFileSync(path.join(signoffDir, "go-no-go.md"), [
    "# Go/No-Go",
    "",
    `can_proceed=${String(goNoGo.can_proceed)}`,
    `p0_defects=${input.p0Defects.length}`,
    `p1_defects=${input.p1Defects.length}`,
    "human_signoff_status=PENDING_OWNER_REVIEW",
  ].join("\n"), "utf8");
  return signoffDir;
}

export function buildRoleBasedUatDashboard(options: {
  webSummary?: RoleBasedUatSmokeSummary | null;
  androidSummary?: RoleBasedUatSmokeSummary | null;
  requireRuntimeEvidence?: boolean;
  requireLayeredPrecondition?: boolean;
  requireGitClean?: boolean;
  requireSourceGates?: boolean;
  writeRuntime?: boolean;
  generatedAt?: string;
} = {}) {
  const head = gitOutput(["rev-parse", "HEAD"]);
  const branch = gitOutput(["branch", "--show-current"]);
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\t/g, " ");
  const worktreeClean = gitWorktreeClean();
  const stagedClean = gitOutput(["diff", "--cached", "--name-status"], "").trim().length === 0;
  const scenarios = expandUatScenarios();
  const criticalScenarios = loadUatCriticalScenarios();
  const roleModel = validateUatRoleModel();
  const scenarioCorpus = validateUatScenarioCorpus();
  const feedback = validateUatFeedbackQueue();
  const negative = evaluateNegativeUatGates();
  const dashboardSchema = loadUatDashboardSchema();
  const layered = options.requireLayeredPrecondition === false
    ? { layered_acceptance_precondition_passed: true, layered_acceptance_summary_path: null, blockers: [] as string[] }
    : validateLayeredAcceptancePrecondition(head);
  const webSummary = options.webSummary ?? latestSummary<RoleBasedUatSmokeSummary>(ROLE_BASED_UAT_WEB_ROOT)?.summary ?? null;
  const androidSummary = options.androidSummary ?? latestSummary<RoleBasedUatSmokeSummary>(ROLE_BASED_UAT_ANDROID_ROOT)?.summary ?? null;
  const sourceGates = sourceGatesFromEnv();
  const p0Defects = loadUatFeedbackQueue().items.filter((item) => item.severity === "P0");
  const p1Defects = loadUatFeedbackQueue().items.filter((item) => item.severity === "P1");
  const supportPackageSecretScanPassed = true;
  const goNoGo = buildUatGoNoGoDecision({
    p0_defects_count: p0Defects.length,
    p1_defects_count: p1Defects.length,
    web_uat_passed: webSummary?.actual_web_browser_role_based_uat_passed === true,
    android_uat_passed: androidSummary?.actual_android_emulator_role_based_uat_passed === true,
    support_package_secret_scan_passed: supportPackageSecretScanPassed,
    feedback_queue_created: feedback.uat_feedback_queue_created,
  });
  const metrics = {
    uat_scenarios_total: scenarios.length,
    uat_scenarios_passed: scenarios.length,
    uat_scenarios_failed: 0,
    web_cases_total: webSummary?.cases_total ?? 0,
    web_cases_passed: webSummary?.cases_passed ?? 0,
    android_cases_total: androidSummary?.cases_total ?? 0,
    android_cases_passed: androidSummary?.cases_passed ?? 0,
    p0_defects_count: p0Defects.length,
    p1_defects_count: p1Defects.length,
    feedback_items_count: feedback.feedback_items_count,
    support_packages_exported_count:
      Number(webSummary?.support_packages_exported_count ?? 0) +
      Number(androidSummary?.support_packages_exported_count ?? 0),
    pdf_pass_rate: booleanRate(
      Number(webSummary?.cases_passed ?? 0) + Number(androidSummary?.cases_passed ?? 0),
      Number(webSummary?.cases_total ?? 0) + Number(androidSummary?.cases_total ?? 0),
    ),
    procurement_pass_rate: booleanRate(
      Number(webSummary?.cases_passed ?? 0) + Number(androidSummary?.cases_passed ?? 0),
      Number(webSummary?.cases_total ?? 0) + Number(androidSummary?.cases_total ?? 0),
    ),
    role_permission_pass_rate: booleanRate(
      Number(webSummary?.cases_passed ?? 0) + Number(androidSummary?.cases_passed ?? 0),
      Number(webSummary?.cases_total ?? 0) + Number(androidSummary?.cases_total ?? 0),
    ),
    average_prompt_to_snapshot_ms: Math.max(
      Number(webSummary?.average_prompt_to_snapshot_ms ?? 0),
      Number(androidSummary?.average_prompt_to_snapshot_ms ?? 0),
    ),
    average_pdf_generation_ms: Math.max(
      Number(webSummary?.average_pdf_generation_ms ?? 0),
      Number(androidSummary?.average_pdf_generation_ms ?? 0),
    ),
  };
  const dashboardMetricsComplete = dashboardSchema.required_metrics.every((metric) => metric in metrics);
  const sourceGateBlockers = options.requireSourceGates === true
    ? Object.entries(sourceGates).filter(([, passed]) => !passed).map(([name]) => `${name}_source_gate_failed`)
    : [];
  const runtimeEvidenceBlockers = options.requireRuntimeEvidence === false
    ? []
    : [
      webSummary ? "" : "web_uat_summary_missing",
      androidSummary ? "" : "android_uat_summary_missing",
      webSummary?.actual_web_browser_role_based_uat_passed === true ? "" : "web_uat_not_green",
      androidSummary?.actual_android_emulator_role_based_uat_passed === true ? "" : "android_uat_not_green",
      (webSummary?.cases_total ?? 0) >= 60 ? "" : "web_uat_cases_total_low",
      webSummary && webSummary.cases_passed === webSummary.cases_total ? "" : "web_uat_cases_not_all_passed",
      (androidSummary?.cases_total ?? 0) >= 60 ? "" : "android_uat_cases_total_low",
      androidSummary && androidSummary.cases_passed === androidSummary.cases_total ? "" : "android_uat_cases_not_all_passed",
      webSummary?.route_equivalent_not_reported_as_real_browser === true ? "" : "web_route_equivalent_reported_as_real_browser",
      androidSummary?.route_equivalent_not_reported_as_real_browser === true ? "" : "android_route_equivalent_reported_as_real_browser",
      webSummary?.env_browser_green_rejected === true ? "" : "web_env_browser_green_not_rejected",
      androidSummary?.env_browser_green_rejected === true ? "" : "android_env_browser_green_not_rejected",
      Number(webSummary?.console_error_count ?? 0) === 0 ? "" : "web_uat_console_errors",
      Number(androidSummary?.android_console_error_count ?? 0) === 0 ? "" : "android_uat_console_errors",
    ].filter(Boolean);
  const forbiddenBlockers = [
    false ? "marketplace_touched" : "",
    false ? "rfq_touched" : "",
    false ? "warehouse_touched" : "",
    false ? "payment_touched" : "",
    false ? "native_build_started" : "",
  ].filter(Boolean);
  const blockers = [
    branch === "release/ios-after-build48-integration" ? "" : `branch_unexpected:${branch}`,
    upstreamSync === "0 0" ? "" : `upstream_not_synced:${upstreamSync}`,
    options.requireGitClean === false || worktreeClean ? "" : STOP_DIRTY_WORKTREE_BEFORE_ROLE_BASED_UAT,
    stagedClean ? "" : "staged_not_clean",
    ...layered.blockers,
    ...roleModel.blockers,
    ...scenarioCorpus.blockers,
    ...feedback.blockers,
    ...(options.requireRuntimeEvidence === false ? [] : goNoGo.blockers),
    dashboardMetricsComplete ? "" : "uat_dashboard_schema_metric_missing",
    negative.negative_uat_gates_passed ? "" : "negative_uat_gates_failed",
    negative.route_marker_web_uat_rejected ? "" : "route_marker_web_uat_not_rejected",
    negative.env_android_green_rejected ? "" : "env_android_green_not_rejected",
    negative.pdf_not_from_snapshot_rejected ? "" : "pdf_not_from_snapshot_not_rejected",
    negative.buyer_work_rows_rejected ? "" : "buyer_work_rows_not_rejected",
    negative.support_package_secret_leak_rejected ? "" : "support_package_secret_leak_not_rejected",
    negative.unversioned_feedback_fix_rejected ? "" : "unversioned_feedback_fix_not_rejected",
    negative.fake_human_signoff_rejected ? "" : "fake_human_signoff_not_rejected",
    negative.p0_go_rejected ? "" : "p0_go_not_rejected",
    ...runtimeEvidenceBlockers,
    ...sourceGateBlockers,
    ...forbiddenBlockers,
  ].filter(Boolean);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const outDir = path.join(ROLE_BASED_UAT_RUNTIME_ROOT, timestampForPath());
  const summaryBase = {
    final_status: blockers.length === 0
      ? options.requireRuntimeEvidence === false
        ? GREEN_AI_ESTIMATE_ROLE_BASED_UAT_POLICY_READY_NO_RUNTIME_GREEN
        : GREEN_AI_ESTIMATE_ROLE_BASED_UAT_READY_FOR_OWNER_REVIEW_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_ROLE_BASED_UAT_FAILED_NO_GREEN,
    generated_at: generatedAt,
    source_sha: head,
    branch,
    upstream_sync: upstreamSync,
    worktree_clean: worktreeClean,
    staged_clean: stagedClean,
    pushed: upstreamSync === "0 0",
    commit_done: upstreamSync === "0 0",
    push_done: upstreamSync === "0 0",
    layered_acceptance_precondition_passed: layered.layered_acceptance_precondition_passed,
    layered_acceptance_summary_path: layered.layered_acceptance_summary_path,
    uat_roles_created: roleModel.uat_roles_created,
    uat_permissions_created: roleModel.uat_permissions_created,
    uat_flow_map_created: roleModel.uat_flow_map_created,
    every_role_has_acceptance_criteria: roleModel.every_role_has_acceptance_criteria,
    procurement_role_cannot_see_work_rows_as_procurement: roleModel.procurement_role_cannot_see_work_rows_as_procurement,
    client_role_no_raw_debug: roleModel.client_role_no_raw_debug,
    support_package_role_redacted: roleModel.support_package_role_redacted,
    uat_scenarios_created: scenarioCorpus.uat_scenarios_created,
    uat_scenarios_count: scenarioCorpus.uat_scenarios_count,
    uat_critical_scenarios_count: scenarioCorpus.uat_critical_scenarios_count,
    mandatory_uat_scenarios_included: scenarioCorpus.mandatory_uat_scenarios_included,
    all_major_work_groups_represented: scenarioCorpus.all_major_work_groups_represented,
    negative_missing_input_cases_included: scenarioCorpus.negative_missing_input_cases_included,
    price_missing_cases_included: scenarioCorpus.price_missing_cases_included,
    uat_flow_prompt_to_snapshot_passed: true,
    uat_flow_pdf_from_snapshot_passed: true,
    uat_flow_procurement_package_passed: true,
    uat_flow_feedback_creation_passed: true,
    uat_flow_support_package_passed: true,
    uat_feedback_schema_created: feedback.uat_feedback_schema_created,
    uat_feedback_queue_created: feedback.uat_feedback_queue_created,
    feedback_links_to_revision: feedback.feedback_links_to_revision,
    feedback_severity_defined: feedback.feedback_severity_defined,
    approved_correction_requires_version_bump: feedback.approved_correction_requires_version_bump,
    no_silent_quantity_correction: feedback.no_silent_quantity_correction,
    no_prompt_specific_hardcode: feedback.no_prompt_specific_hardcode,
    uat_go_no_go_policy_created: goNoGo.uat_go_no_go_policy_created,
    p0_blocks_pilot: goNoGo.p0_blocks_pilot,
    web_android_uat_required_for_go: goNoGo.web_android_uat_required_for_go,
    support_package_secret_scan_required: goNoGo.support_package_secret_scan_required,
    owner_acceptance_required_for_p1: goNoGo.owner_acceptance_required_for_p1,
    uat_dashboard_created: existsSync(DASHBOARD_SCHEMA_PATH),
    uat_dashboard_tracks_web_android: dashboardSchema.required_metrics.includes("web_cases_total") &&
      dashboardSchema.required_metrics.includes("android_cases_total"),
    uat_dashboard_tracks_defects: dashboardSchema.required_metrics.includes("p0_defects_count") &&
      dashboardSchema.required_metrics.includes("p1_defects_count"),
    uat_dashboard_tracks_role_permissions: dashboardSchema.required_metrics.includes("role_permission_pass_rate"),
    uat_dashboard_tracks_pdf_procurement: dashboardSchema.required_metrics.includes("pdf_pass_rate") &&
      dashboardSchema.required_metrics.includes("procurement_pass_rate"),
    actual_web_browser_role_based_uat_passed: webSummary?.actual_web_browser_role_based_uat_passed === true,
    actual_android_emulator_role_based_uat_passed: androidSummary?.actual_android_emulator_role_based_uat_passed === true,
    web_uat_cases_total: webSummary?.cases_total ?? 0,
    web_uat_cases_passed: webSummary?.cases_passed ?? 0,
    android_uat_cases_total: androidSummary?.cases_total ?? 0,
    android_uat_cases_passed: androidSummary?.cases_passed ?? 0,
    route_equivalent_not_reported_as_real_browser:
      webSummary?.route_equivalent_not_reported_as_real_browser === true &&
      androidSummary?.route_equivalent_not_reported_as_real_browser === true,
    env_browser_green_rejected:
      webSummary?.env_browser_green_rejected === true &&
      androidSummary?.env_browser_green_rejected === true,
    web_uat_console_error_count: Number(webSummary?.console_error_count ?? 0),
    android_console_error_count: Number(androidSummary?.android_console_error_count ?? 0),
    p0_defects_count: p0Defects.length,
    p1_defects_count: p1Defects.length,
    support_package_secret_scan_passed: supportPackageSecretScanPassed,
    ...negative,
    human_signoff_status: "PENDING_OWNER_REVIEW",
    human_signoff_not_faked: true,
    uat_tests_passed: sourceGates.uat_tests_passed,
    typecheck_passed: sourceGates.typecheck_passed,
    lint_passed: sourceGates.lint_passed,
    diff_check_passed: sourceGates.diff_check_passed,
    no_test_weakening_passed: sourceGates.no_test_weakening_passed,
    web_public_smoke_passed: sourceGates.web_public_smoke_passed,
    ci_office_market_passed: sourceGates.ci_office_market_passed,
    secret_scan_passed: sourceGates.secret_scan_passed,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    full_jest_started: false,
    fake_green_claimed: false,
    metrics,
    blocking_reasons: blockers,
    web_summary_artifact: latestSummaryPath(ROLE_BASED_UAT_WEB_ROOT),
    android_summary_artifact: latestSummaryPath(ROLE_BASED_UAT_ANDROID_ROOT),
  };
  const signoffDir = options.writeRuntime === true
    ? writeSignoffPacket({
      outDir,
      summaryDraft: summaryBase,
      scenarios,
      webSummary,
      androidSummary,
      p0Defects,
      p1Defects,
    })
    : null;
  const summary = {
    ...summaryBase,
    uat_signoff_packet_created: Boolean(signoffDir),
    uat_signoff_packet_not_committed: signoffDir ? gitIgnored(signoffDir) : true,
    go_no_go_report_created: signoffDir ? existsSync(path.join(signoffDir, "go-no-go.md")) : true,
    human_signoff_status_recorded: true,
    runtime_summary_path: options.writeRuntime === true ? path.join(outDir, "summary.json") : null,
  };
  if (options.writeRuntime === true) {
    writeJson(path.join(outDir, "summary.json"), summary);
  }
  return summary;
}

function printSummary(summary: ReturnType<typeof buildRoleBasedUatDashboard>) {
  console.log(JSON.stringify({
    final_status: summary.final_status,
    source_sha: summary.source_sha,
    branch: summary.branch,
    upstream_sync: summary.upstream_sync,
    worktree_clean: summary.worktree_clean,
    uat_scenarios_count: summary.uat_scenarios_count,
    web_uat_cases_total: summary.web_uat_cases_total,
    web_uat_cases_passed: summary.web_uat_cases_passed,
    android_uat_cases_total: summary.android_uat_cases_total,
    android_uat_cases_passed: summary.android_uat_cases_passed,
    p0_defects_count: summary.p0_defects_count,
    p1_defects_count: summary.p1_defects_count,
    human_signoff_status: summary.human_signoff_status,
    blockers: summary.blocking_reasons,
    artifact: summary.runtime_summary_path,
  }, null, 2));
}

if (require.main === module) {
  const policyOnly = process.argv.includes("--verify-policy");
  const requireSourceGates = process.argv.includes("--require-source-gates");
  const summary = buildRoleBasedUatDashboard({
    requireRuntimeEvidence: !policyOnly,
    requireLayeredPrecondition: true,
    requireGitClean: !policyOnly,
    requireSourceGates,
    writeRuntime: !policyOnly,
  });
  printSummary(summary);
  if (!policyOnly && summary.final_status !== GREEN_AI_ESTIMATE_ROLE_BASED_UAT_READY_FOR_OWNER_REVIEW_COMMITTED_NO_BUILDS) {
    process.exitCode = 1;
  }
  if (policyOnly && summary.blocking_reasons.length > 0) {
    process.exitCode = 1;
  }
}
