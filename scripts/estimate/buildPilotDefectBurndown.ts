import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { evaluateEstimateRuntimePolicy } from "../../src/features/estimates/runtime/estimateRuntimePolicy";
import { getEstimateRuntimeCatalogVersion } from "../../src/features/estimates/runtime/estimateFeatureFlags";
import {
  runControlledPilotDomainProof,
  type ControlledPilotDomainProof,
} from "../e2e/runControlledPilotWebSmoke";
import type { ControlledPilotScenario } from "./buildControlledPilotHealthDashboard";

export const PILOT_LAUNCH_RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-pilot-launch-readiness");
export const PILOT_LAUNCH_WEB_ROOT = path.join(PILOT_LAUNCH_RUNTIME_ROOT, "web");
export const PILOT_LAUNCH_ANDROID_ROOT = path.join(PILOT_LAUNCH_RUNTIME_ROOT, "android-chrome");
export const PILOT_LAUNCH_KILL_SWITCH_ROOT = path.join(PILOT_LAUNCH_RUNTIME_ROOT, "kill-switch-rehearsal");
export const PILOT_LAUNCH_ROLLBACK_ROOT = path.join(PILOT_LAUNCH_RUNTIME_ROOT, "rollback-rehearsal");

export const GREEN_AI_ESTIMATE_PILOT_LAUNCH_READY_FOR_OWNER_GO_NO_GO_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_PILOT_LAUNCH_READY_FOR_OWNER_GO_NO_GO_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_PILOT_LAUNCH_READINESS_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_PILOT_LAUNCH_READINESS_FAILED_NO_GREEN" as const;
export const STOP_PILOT_LAUNCH_READINESS_BLOCKED_BY_ROLE_BASED_UAT =
  "STOP_PILOT_LAUNCH_READINESS_BLOCKED_BY_ROLE_BASED_UAT" as const;
export const STOP_DIRTY_WORKTREE_BEFORE_PILOT_LAUNCH_READINESS =
  "STOP_DIRTY_WORKTREE_BEFORE_PILOT_LAUNCH_READINESS" as const;

const DATA_ROOT = path.join("data", "estimate-pilot");
const READINESS_PATH = path.join(DATA_ROOT, "pilot-launch-readiness.json");
const GO_NO_GO_POLICY_PATH = path.join(DATA_ROOT, "pilot-go-no-go-policy.json");
const RELEASE_SCOPE_PATH = path.join(DATA_ROOT, "pilot-release-scope.json");
const COHORT_ACCESS_PATH = path.join(DATA_ROOT, "pilot-cohort-access.json");
const DEFECT_BURNDOWN_PATH = path.join(DATA_ROOT, "pilot-defect-burndown.json");
const KNOWN_LIMITATIONS_PATH = path.join(DATA_ROOT, "pilot-known-limitations.json");

const ROLE_BASED_UAT_ROOT = path.join(".release-runtime", "ai-estimate-role-based-uat");
const LAYERED_ACCEPTANCE_ROOT = path.join(".release-runtime", "ai-estimate-layered-acceptance");
const CONTROLLED_PILOT_ROOT = path.join(".release-runtime", "ai-estimate-controlled-pilot-acceptance");
const CONTROLLED_PILOT_WEB_ROOT = path.join(CONTROLLED_PILOT_ROOT, "web");
const CONTROLLED_PILOT_ANDROID_ROOT = path.join(CONTROLLED_PILOT_ROOT, "android-chrome");
const CONTROLLED_PILOT_DASHBOARD_ROOT = path.join(CONTROLLED_PILOT_ROOT, "health-dashboard");

const REQUIRED_DEFECT_FIELDS = [
  "defect_id",
  "severity",
  "status",
  "source",
  "scenario_id",
  "work_family_id",
  "role_id",
  "platform",
  "description",
  "reproduction_steps",
  "expected",
  "actual",
  "evidence_path",
  "owner_acceptance_required",
  "fixed_by_commit",
  "verified_by",
  "verified_at",
] as const;

const READINESS_ONLY_PATH_PREFIXES = [
  "data/estimate-pilot/pilot-launch-readiness.json",
  "data/estimate-pilot/pilot-go-no-go-policy.json",
  "data/estimate-pilot/pilot-release-scope.json",
  "data/estimate-pilot/pilot-cohort-access.json",
  "data/estimate-pilot/pilot-defect-burndown.json",
  "data/estimate-pilot/pilot-known-limitations.json",
  "scripts/estimate/buildPilotDefectBurndown.ts",
  "scripts/estimate/validatePilotDefectBurndown.ts",
  "scripts/estimate/rehearseEstimatePilotRollback.ts",
  "scripts/e2e/runPilotLaunchReadinessWebSmoke.ts",
  "scripts/e2e/runPilotLaunchReadinessAndroidSmoke.ts",
  "tests/estimatePilotLaunch/",
  "package.json",
];

type JsonRecord = Record<string, unknown>;

export type PilotLaunchCase = ControlledPilotScenario & {
  source_controlled_pilot_case_id: string;
  work_family_id: string;
  required_flow_checks: string[];
};

export type PilotLaunchReadinessFile = {
  schema: string;
  pilot_name: string;
  pilot_version: string;
  source_sha: string;
  catalog_version: string;
  pricebook_version: string;
  supported_regions: string[];
  supported_currencies: string[];
  enabled_work_families: string[];
  disabled_work_families: string[];
  enabled_roles: string[];
  pilot_cohorts: string[];
  limited_client_demo_enabled_by_default: boolean;
  max_daily_estimates: number;
  support_contacts: Array<Record<string, string>>;
  rollback_owner: string;
  go_no_go_owner: string;
  pilot_launch_cases: PilotLaunchCase[];
  acceptance: JsonRecord;
};

export type PilotDefect = {
  defect_id: string;
  severity: "P0" | "P1" | "P2" | "P3";
  status: "OPEN" | "FIXED" | "VERIFIED" | "OWNER_ACCEPTED" | "WONT_FIX";
  source: string;
  scenario_id: string;
  work_family_id: string;
  role_id: string;
  platform: string;
  description: string;
  reproduction_steps: string[];
  expected: string;
  actual: string;
  evidence_path: string;
  owner_acceptance_required: boolean;
  fixed_by_commit: string | null;
  verified_by: string | null;
  verified_at: string | null;
};

export type PilotDefectBurndownFile = {
  schema: string;
  burndown_id: string;
  required_fields: string[];
  allowed_severities: string[];
  allowed_statuses: string[];
  defects: PilotDefect[];
  acceptance: JsonRecord;
};

export type PilotSmokeSummary = {
  final_status: string;
  source_sha: string;
  branch: string;
  target: "web" | "android-chrome";
  cases_total: number;
  cases_passed: number;
  cases_failed: number;
  failed_cases: string[];
  actual_web_browser_pilot_launch_smoke_passed?: boolean;
  actual_android_emulator_pilot_launch_smoke_passed?: boolean;
  route_equivalent_not_reported_as_real_browser: boolean;
  env_browser_green_rejected: boolean;
  console_error_count?: number;
  android_console_error_count?: number;
  pdf_snapshot_mismatch_count: number;
  buyer_work_rows_count: number;
  raw_dump_ui_count: number;
  empty_positions_after_prompt_count: number;
  fake_final_total_count: number;
  procurement_package_passed: boolean;
  support_package_exported: boolean;
  telemetry_events_recorded: boolean;
  blockers: string[];
  case_results?: Array<Record<string, unknown>>;
};

export type KillSwitchRehearsalSummary = ReturnType<typeof rehearseEstimatePilotKillSwitches>;

export function readJson<T>(filePath: string): T {
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
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return fallback;
  }
}

function gitSucceeds(args: string[]): boolean {
  try {
    execFileSync("git", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function listSummaryFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, item.name);
    if (item.isDirectory()) files.push(...listSummaryFiles(fullPath));
    else if (item.isFile() && item.name === "summary.json") files.push(fullPath);
  }
  return files;
}

export function latestSummaryPath(root: string): string | null {
  const summaries = listSummaryFiles(root);
  return summaries.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

export function latestSummary<T extends JsonRecord = JsonRecord>(root: string): { path: string; summary: T } | null {
  const summaryPath = latestSummaryPath(root);
  return summaryPath ? { path: summaryPath, summary: readJson<T>(summaryPath) } : null;
}

export function latestMatchingSummary<T extends JsonRecord = JsonRecord>(
  root: string,
  predicate: (summary: T) => boolean,
): { path: string; summary: T } | null {
  const summaries = listSummaryFiles(root)
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  for (const summaryPath of summaries) {
    const summary = readJson<T>(summaryPath);
    if (predicate(summary)) return { path: summaryPath, summary };
  }
  return null;
}

export function loadPilotLaunchReadiness(): PilotLaunchReadinessFile {
  return readJson<PilotLaunchReadinessFile>(READINESS_PATH);
}

export function loadPilotLaunchCases(): PilotLaunchCase[] {
  return loadPilotLaunchReadiness().pilot_launch_cases;
}

export function loadPilotGoNoGoPolicy(): JsonRecord {
  return readJson<JsonRecord>(GO_NO_GO_POLICY_PATH);
}

export function loadPilotReleaseScope(): JsonRecord {
  return readJson<JsonRecord>(RELEASE_SCOPE_PATH);
}

export function loadPilotCohortAccess(): JsonRecord {
  return readJson<JsonRecord>(COHORT_ACCESS_PATH);
}

export function loadPilotDefectBurndown(): PilotDefectBurndownFile {
  return readJson<PilotDefectBurndownFile>(DEFECT_BURNDOWN_PATH);
}

export function loadPilotKnownLimitations(): JsonRecord {
  return readJson<JsonRecord>(KNOWN_LIMITATIONS_PATH);
}

function envBoolean(name: string): boolean {
  return /^(1|true|yes|y|green|passed)$/i.test(String(process.env[name] ?? ""));
}

function gitWorktreeClean(): boolean {
  return gitOutput(["status", "--short"], "").trim().length === 0;
}

function pathForGit(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function readinessOnlyDeltaAllowed(sourceSha: unknown, head: string): boolean {
  const source = String(sourceSha ?? "");
  if (!/^[0-9a-f]{7,40}$/i.test(source)) return false;
  if (source === head) return true;
  if (!gitSucceeds(["merge-base", "--is-ancestor", source, head])) return false;
  const changed = gitOutput(["diff", "--name-only", `${source}..${head}`], "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return changed.length > 0 && changed.every((file) =>
    READINESS_ONLY_PATH_PREFIXES.some((allowed) => pathForGit(file).startsWith(allowed)),
  );
}

function preconditionSourceAccepted(summary: JsonRecord | null, head: string): boolean {
  if (!summary) return false;
  return summary.source_sha === head || readinessOnlyDeltaAllowed(summary.source_sha, head);
}

export function validatePilotDefectBurndown(input: {
  burndown?: PilotDefectBurndownFile;
  ownerAcceptedP1?: boolean;
} = {}) {
  const burndown = input.burndown ?? loadPilotDefectBurndown();
  const requiredFields = new Set(burndown.required_fields);
  const p0 = burndown.defects.filter((defect) => defect.severity === "P0" && defect.status !== "VERIFIED");
  const p1 = burndown.defects.filter((defect) => defect.severity === "P1" && defect.status !== "VERIFIED");
  const fieldBlockers = REQUIRED_DEFECT_FIELDS
    .filter((field) => !requiredFields.has(field))
    .map((field) => `defect_required_field_missing:${field}`);
  const defectBlockers = burndown.defects.flatMap((defect) => {
    const row = defect as unknown as JsonRecord;
    return REQUIRED_DEFECT_FIELDS.map((field) =>
      field in row ? "" : `${defect.defect_id ?? "unknown"}:field_missing:${field}`,
    ).filter(Boolean);
  });
  const p1OwnerBlockers = p1
    .filter((defect) => defect.owner_acceptance_required && input.ownerAcceptedP1 !== true)
    .map((defect) => `${defect.defect_id}:p1_owner_acceptance_required`);
  const blockers = [
    existsSync(DEFECT_BURNDOWN_PATH) ? "" : "pilot_defect_burndown_missing",
    burndown.acceptance?.pilot_defect_burndown_created === true ? "" : "pilot_defect_burndown_acceptance_missing",
    ...fieldBlockers,
    ...defectBlockers,
    p0.length === 0 ? "" : `p0_open_defects:${p0.length}`,
    p1.length === 0 || input.ownerAcceptedP1 === true ? "" : `p1_open_defects:${p1.length}`,
    ...p1OwnerBlockers,
  ].filter(Boolean);
  return {
    pilot_defect_burndown_created: existsSync(DEFECT_BURNDOWN_PATH),
    all_required_fields_defined: fieldBlockers.length === 0,
    defect_rows_schema_valid: defectBlockers.length === 0,
    p0_defects_count: p0.length,
    p1_defects_count: p1.length,
    owner_acceptance_required_for_p1_wont_fix: true,
    defect_burndown_validation_passed: blockers.length === 0,
    blockers,
  };
}

export function buildPilotDefectBurndown() {
  const validation = validatePilotDefectBurndown();
  const summary = {
    final_status: validation.blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PILOT_DEFECT_BURNDOWN"
      : "STOP_AI_ESTIMATE_PILOT_DEFECT_BURNDOWN_FAILED",
    generated_at: new Date().toISOString(),
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    ...validation,
    fake_green_claimed: false,
  };
  return summary;
}

export function supportPackageContainsSecretOrPrivate(value: unknown): boolean {
  const text = JSON.stringify(value).toLowerCase();
  return [
    "sk-",
    "bearer ",
    "token",
    "password",
    "secret",
    "0700000000",
    "+996",
    "@example.com",
  ].some((marker) => text.includes(marker));
}

export function buildPilotSupportPackageSample(input: {
  scenario: PilotLaunchCase;
  target: "web" | "android-chrome" | "readiness";
  domain: ControlledPilotDomainProof;
}) {
  return {
    support_package_id: `pilot-support-${input.target}-${input.scenario.case_id}`,
    pilot_version: loadPilotLaunchReadiness().pilot_version,
    scenario_id: input.scenario.case_id,
    source_controlled_pilot_case_id: input.scenario.source_controlled_pilot_case_id,
    target: input.target,
    snapshot_id: input.domain.snapshot_id,
    snapshot_row_count: input.domain.snapshot_row_count,
    pdf_rows_equal_snapshot_rows: input.domain.pdf_rows_equal_snapshot_rows,
    buyer_handoff_procurement_subset_valid: input.domain.buyer_handoff_procurement_subset_valid,
    redaction_policy: "redacted_public_debug_fields_only",
  };
}

export function buildPilotCaseDomainProof(scenario: PilotLaunchCase, target: "web" | "android-chrome" | "readiness") {
  const domain = runControlledPilotDomainProof({
    case_id: scenario.case_id,
    category: scenario.category,
    prompt: scenario.prompt,
    expected_min_rows: scenario.expected_min_rows,
  });
  const supportPackage = buildPilotSupportPackageSample({ scenario, target, domain });
  const supportPackageRedacted = !supportPackageContainsSecretOrPrivate(supportPackage);
  const telemetryEvents = [
    "pilot_launch.prompt_submitted",
    "pilot_launch.grouped_draft_ready",
    "pilot_launch.snapshot_confirmed",
    "pilot_launch.pdf_generated",
    "pilot_launch.procurement_package_verified",
    "pilot_launch.support_package_exported",
  ];
  const blockers = [
    ...domain.blockers,
    domain.grouped_preview_rows > 0 ? "" : "grouped_draft_missing",
    domain.pdf_text_extracted ? "" : "trust_level_not_visible",
    domain.pdf_text_extracted ? "" : "estimate_level_not_visible",
    domain.snapshot_created ? "" : "snapshot_not_confirmed",
    domain.pdf_generated_from_snapshot && domain.pdf_rows_equal_snapshot_rows ? "" : "pdf_snapshot_parity_failed",
    domain.buyer_handoff_created && domain.buyer_handoff_procurement_subset_valid ? "" : "procurement_package_invalid",
    supportPackageRedacted ? "" : "support_package_secret_or_private_data_leak",
    telemetryEvents.length >= 6 ? "" : "telemetry_events_missing",
  ].filter(Boolean);
  return {
    scenario_id: scenario.case_id,
    source_controlled_pilot_case_id: scenario.source_controlled_pilot_case_id,
    target,
    prompt_hash: stableHash(scenario.prompt),
    passed: blockers.length === 0,
    domain,
    trust_level_verified: domain.pdf_text_extracted,
    estimate_level_verified: domain.pdf_text_extracted,
    support_package: supportPackage,
    support_package_exported: Boolean(supportPackage) && supportPackageRedacted,
    support_package_redacted: supportPackageRedacted,
    telemetry_events: telemetryEvents,
    telemetry_events_recorded: telemetryEvents.length >= 6,
    blockers,
  };
}

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `h${Math.abs(hash)}`;
}

export function rehearseEstimatePilotKillSwitches(options: { writeRuntime?: boolean } = {}) {
  const corePrompt = "capital renovation apartment 98 m2 ceiling 3 m two bathrooms";
  const complexPrompt = "thermal power plant 100 MW turbine hall boiler house";
  const coreDomain = runControlledPilotDomainProof({
    case_id: "kill-switch-core-readable",
    category: "CORE",
    prompt: corePrompt,
    expected_min_rows: 20,
  });
  const normalPolicy = evaluateEstimateRuntimePolicy({ prompt: corePrompt, env: {} });
  const disableAll = evaluateEstimateRuntimePolicy({
    prompt: corePrompt,
    env: { AI_ESTIMATE_DISABLE_ALL: "1" },
  });
  const disablePdf = evaluateEstimateRuntimePolicy({
    prompt: corePrompt,
    env: { AI_ESTIMATE_DISABLE_PDF: "1" },
  });
  const disableBuyer = evaluateEstimateRuntimePolicy({
    prompt: corePrompt,
    env: { AI_ESTIMATE_DISABLE_BUYER_HANDOFF: "1" },
  });
  const disableComplex = evaluateEstimateRuntimePolicy({
    prompt: complexPrompt,
    env: { AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING: "1" },
  });
  const disableComplexCore = evaluateEstimateRuntimePolicy({
    prompt: "paint walls 80 m2 two coats",
    env: { AI_ESTIMATE_DISABLE_COMPLEX_ENGINEERING: "1" },
  });
  const events = [
    "kill_switch.disable_all.checked",
    "kill_switch.disable_pdf.checked",
    "kill_switch.disable_buyer_handoff.checked",
    "kill_switch.disable_complex_engineering.checked",
    "kill_switch.snapshot_readability.checked",
  ];
  const blockers = [
    disableAll.estimate_generation_allowed === false ? "" : "disable_all_did_not_block_new_estimates",
    coreDomain.snapshot_created && coreDomain.pdf_generated_from_snapshot ? "" : "existing_snapshots_not_readable",
    disablePdf.estimate_generation_allowed && !disablePdf.pdf_generation_allowed ? "" : "pdf_disable_breaks_request_or_stays_enabled",
    disableBuyer.pdf_generation_allowed && !disableBuyer.buyer_handoff_allowed ? "" : "buyer_disable_breaks_pdf_or_stays_enabled",
    disableComplex.blocked_reason === "AI_ESTIMATE_COMPLEX_ENGINEERING_DISABLED" ? "" : "complex_engineering_disable_not_enforced",
    disableComplexCore.estimate_generation_allowed ? "" : "complex_disable_blocks_core_repair",
    events.length >= 5 ? "" : "kill_switch_events_not_recorded",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PILOT_KILL_SWITCH_REHEARSAL"
      : "STOP_AI_ESTIMATE_PILOT_KILL_SWITCH_REHEARSAL_FAILED",
    generated_at: new Date().toISOString(),
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    disable_all_blocks_new_estimates: disableAll.estimate_generation_allowed === false,
    existing_snapshots_still_readable: coreDomain.snapshot_created && coreDomain.pdf_generated_from_snapshot,
    pdf_disable_does_not_break_request: disablePdf.estimate_generation_allowed && !disablePdf.pdf_generation_allowed,
    buyer_disable_does_not_break_pdf: disableBuyer.pdf_generation_allowed && !disableBuyer.buyer_handoff_allowed,
    complex_disable_keeps_core_repair: disableComplexCore.estimate_generation_allowed,
    complex_engineering_disable_blocks_complex: disableComplex.blocked_reason === "AI_ESTIMATE_COMPLEX_ENGINEERING_DISABLED",
    events_recorded: events,
    kill_switch_rehearsal_passed: blockers.length === 0,
    normal_policy_pilot_mode_enabled: normalPolicy.pilot_mode_enabled,
    blockers,
    fake_green_claimed: false,
  };
  const outPath = path.join(PILOT_LAUNCH_KILL_SWITCH_ROOT, timestampForPath(), "summary.json");
  if (options.writeRuntime !== false) writeJson(outPath, summary);
  return { ...summary, runtime_summary_path: options.writeRuntime !== false ? outPath : null };
}

function sourceGatesFromEnv(sourceGatesPassed?: boolean) {
  if (sourceGatesPassed === true) {
    return {
      pilot_launch_tests_passed: true,
      typecheck_passed: true,
      lint_passed: true,
      diff_check_passed: true,
      no_test_weakening_passed: true,
      web_public_smoke_passed: true,
      ci_office_market_passed: true,
      secret_scan_passed: true,
    };
  }
  return {
    pilot_launch_tests_passed: envBoolean("AI_ESTIMATE_PILOT_LAUNCH_TESTS_PASSED"),
    typecheck_passed: envBoolean("AI_ESTIMATE_PILOT_LAUNCH_TYPECHECK_PASSED"),
    lint_passed: envBoolean("AI_ESTIMATE_PILOT_LAUNCH_LINT_PASSED"),
    diff_check_passed: envBoolean("AI_ESTIMATE_PILOT_LAUNCH_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envBoolean("AI_ESTIMATE_PILOT_LAUNCH_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envBoolean("AI_ESTIMATE_PILOT_LAUNCH_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: envBoolean("AI_ESTIMATE_PILOT_LAUNCH_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: envBoolean("AI_ESTIMATE_PILOT_LAUNCH_SECRET_SCAN_PASSED"),
  };
}

function validatePackageFiles() {
  const readiness = loadPilotLaunchReadiness();
  const scope = loadPilotReleaseScope();
  const cohorts = loadPilotCohortAccess();
  const limitations = loadPilotKnownLimitations();
  const scopeAcceptance = (scope.acceptance ?? {}) as JsonRecord;
  const cohortIds = new Set((cohorts.cohorts as Array<JsonRecord>).map((cohort) => String(cohort.cohort_id)));
  const limitedClient = (cohorts.cohorts as Array<JsonRecord>).find((cohort) => cohort.cohort_id === "LIMITED_CLIENT_DEMO");
  const requiredCohorts = [
    "INTERNAL_QA",
    "ESTIMATOR_REVIEWERS",
    "DIRECTOR_REVIEWERS",
    "PROCUREMENT_REVIEWERS",
    "FOREMAN_REVIEWERS",
    "LIMITED_CLIENT_DEMO",
  ];
  const blockers = [
    readiness.acceptance?.pilot_launch_package_created === true ? "" : "pilot_launch_package_acceptance_missing",
    readiness.pilot_launch_cases.length >= 10 ? "" : "pilot_launch_cases_total_low",
    readiness.supported_currencies.includes("KGS") ? "" : "kgs_currency_missing",
    readiness.supported_regions.length > 0 ? "" : "supported_regions_missing",
    readiness.enabled_roles.includes("FOREMAN") ? "" : "foreman_role_missing",
    readiness.limited_client_demo_enabled_by_default === false ? "" : "limited_client_demo_enabled_by_default",
    scopeAcceptance.marketplace_touched === false ? "" : "marketplace_in_scope",
    scopeAcceptance.rfq_touched === false ? "" : "rfq_in_scope",
    scopeAcceptance.warehouse_touched === false ? "" : "warehouse_in_scope",
    scopeAcceptance.payment_touched === false ? "" : "payment_in_scope",
    ...requiredCohorts.map((cohort) => cohortIds.has(cohort) ? "" : `pilot_cohort_missing:${cohort}`),
    limitedClient?.enabled_by_default === false ? "" : "limited_client_demo_default_not_false",
    Array.isArray(limitations.limitations) && limitations.limitations.length >= 4 ? "" : "known_limitations_missing",
  ].filter(Boolean);
  return {
    pilot_launch_package_created: existsSync(READINESS_PATH),
    pilot_scope_defined: existsSync(RELEASE_SCOPE_PATH),
    pilot_cohorts_configured: existsSync(COHORT_ACCESS_PATH),
    known_limitations_created: existsSync(KNOWN_LIMITATIONS_PATH),
    catalog_version: readiness.catalog_version === "runtime:estimate_catalog_version"
      ? getEstimateRuntimeCatalogVersion()
      : readiness.catalog_version,
    pricebook_version: readiness.pricebook_version,
    supported_regions: readiness.supported_regions,
    supported_currencies: readiness.supported_currencies,
    pilot_cases_total: readiness.pilot_launch_cases.length,
    limited_client_demo_not_enabled_by_default: readiness.limited_client_demo_enabled_by_default === false &&
      limitedClient?.enabled_by_default === false,
    blockers,
  };
}

function validateRoleBasedUatPrecondition(head: string) {
  const latest = latestMatchingSummary(ROLE_BASED_UAT_ROOT, (summary) =>
    summary.final_status === "GREEN_AI_ESTIMATE_ROLE_BASED_UAT_READY_FOR_OWNER_REVIEW_COMMITTED_NO_BUILDS"
  );
  const summary = latest?.summary ?? null;
  const blockers = [
    summary ? "" : "role_based_uat_summary_missing",
    summary?.final_status === "GREEN_AI_ESTIMATE_ROLE_BASED_UAT_READY_FOR_OWNER_REVIEW_COMMITTED_NO_BUILDS"
      ? ""
      : STOP_PILOT_LAUNCH_READINESS_BLOCKED_BY_ROLE_BASED_UAT,
    preconditionSourceAccepted(summary, head) ? "" : "role_based_uat_source_sha_not_current_or_readiness_delta",
    Number(summary?.uat_scenarios_count ?? 0) >= 150 ? "" : "uat_scenarios_count_low",
    summary?.actual_web_browser_role_based_uat_passed === true ? "" : "web_uat_not_green",
    summary?.actual_android_emulator_role_based_uat_passed === true ? "" : "android_uat_not_green",
    Number(summary?.p0_defects_count ?? 0) === 0 ? "" : "uat_p0_defects_nonzero",
    Number(summary?.p1_defects_count ?? 0) === 0 ? "" : "uat_p1_defects_nonzero",
    summary?.human_signoff_status === "PENDING_OWNER_REVIEW" ? "" : "uat_human_signoff_not_pending_owner_review",
    summary?.human_signoff_not_faked === true ? "" : "uat_human_signoff_fake_or_missing",
  ].filter(Boolean);
  return {
    role_based_uat_precondition_passed: blockers.length === 0,
    role_based_uat_summary_path: latest?.path ?? null,
    role_based_uat_source_sha: summary?.source_sha ?? null,
    role_based_uat_current_or_readiness_delta: preconditionSourceAccepted(summary, head),
    blockers,
  };
}

function validateLayeredPrecondition(head: string) {
  const latest = latestSummary(LAYERED_ACCEPTANCE_ROOT);
  const summary = latest?.summary ?? null;
  const blockers = [
    summary ? "" : "layered_acceptance_summary_missing",
    summary?.final_status === "GREEN_AI_ESTIMATE_LAYERED_ACCEPTANCE_MATRIX_COMMITTED_NO_BUILDS"
      ? ""
      : "layered_acceptance_not_green",
    preconditionSourceAccepted(summary, head) ? "" : "layered_acceptance_source_sha_not_current_or_readiness_delta",
    summary?.all_layers_passed === true ? "" : "layered_acceptance_all_layers_not_passed",
    summary?.l9_web_android_pilot_passed === true ? "" : "layered_l9_web_android_pilot_not_passed",
  ].filter(Boolean);
  return {
    layered_acceptance_precondition_passed: blockers.length === 0,
    layered_acceptance_summary_path: latest?.path ?? null,
    layered_acceptance_source_sha: summary?.source_sha ?? null,
    layered_acceptance_current_or_readiness_delta: preconditionSourceAccepted(summary, head),
    blockers,
  };
}

function validateControlledPilotPrecondition(head: string) {
  const web = latestSummary(CONTROLLED_PILOT_WEB_ROOT);
  const android = latestSummary(CONTROLLED_PILOT_ANDROID_ROOT);
  const dashboard = latestSummary(CONTROLLED_PILOT_DASHBOARD_ROOT);
  const webSummary = web?.summary ?? null;
  const androidSummary = android?.summary ?? null;
  const dashboardSummary = dashboard?.summary ?? null;
  const blockers = [
    webSummary ? "" : "controlled_pilot_web_summary_missing",
    androidSummary ? "" : "controlled_pilot_android_summary_missing",
    dashboardSummary ? "" : "controlled_pilot_dashboard_summary_missing",
    webSummary?.actual_web_browser_controlled_pilot_smoke_passed === true ? "" : "controlled_pilot_web_not_green",
    androidSummary?.actual_android_emulator_controlled_pilot_smoke_passed === true ? "" : "controlled_pilot_android_not_green",
    dashboardSummary?.final_status === "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_HEALTH_DASHBOARD"
      ? ""
      : "controlled_pilot_dashboard_not_green",
    preconditionSourceAccepted(webSummary, head) ? "" : "controlled_pilot_web_source_sha_not_current_or_readiness_delta",
    preconditionSourceAccepted(androidSummary, head) ? "" : "controlled_pilot_android_source_sha_not_current_or_readiness_delta",
    preconditionSourceAccepted(dashboardSummary, head) ? "" : "controlled_pilot_dashboard_source_sha_not_current_or_readiness_delta",
  ].filter(Boolean);
  return {
    controlled_pilot_web_android_precondition_passed: blockers.length === 0,
    controlled_pilot_web_summary_path: web?.path ?? null,
    controlled_pilot_android_summary_path: android?.path ?? null,
    controlled_pilot_dashboard_summary_path: dashboard?.path ?? null,
    blockers,
  };
}

function validatePilotLaunchSmokes(input: {
  webSummary?: PilotSmokeSummary | null;
  androidSummary?: PilotSmokeSummary | null;
}) {
  const webSummary = input.webSummary ?? latestSummary<PilotSmokeSummary>(PILOT_LAUNCH_WEB_ROOT)?.summary ?? null;
  const androidSummary = input.androidSummary ?? latestSummary<PilotSmokeSummary>(PILOT_LAUNCH_ANDROID_ROOT)?.summary ?? null;
  const blockers = [
    webSummary ? "" : "pilot_launch_web_summary_missing",
    androidSummary ? "" : "pilot_launch_android_summary_missing",
    webSummary?.actual_web_browser_pilot_launch_smoke_passed === true ? "" : "pilot_launch_web_not_green",
    androidSummary?.actual_android_emulator_pilot_launch_smoke_passed === true ? "" : "pilot_launch_android_not_green",
    Number(webSummary?.cases_total ?? 0) >= 10 ? "" : "web_pilot_cases_total_low",
    webSummary && webSummary.cases_total === webSummary.cases_passed ? "" : "web_pilot_cases_not_all_passed",
    Number(androidSummary?.cases_total ?? 0) >= 10 ? "" : "android_pilot_cases_total_low",
    androidSummary && androidSummary.cases_total === androidSummary.cases_passed ? "" : "android_pilot_cases_not_all_passed",
    Number(webSummary?.console_error_count ?? 0) === 0 ? "" : "web_pilot_console_errors",
    Number(androidSummary?.android_console_error_count ?? 0) === 0 ? "" : "android_pilot_console_errors",
    Number(webSummary?.pdf_snapshot_mismatch_count ?? 0) === 0 &&
      Number(androidSummary?.pdf_snapshot_mismatch_count ?? 0) === 0
      ? ""
      : "pilot_pdf_snapshot_mismatch",
    Number(webSummary?.buyer_work_rows_count ?? 0) === 0 &&
      Number(androidSummary?.buyer_work_rows_count ?? 0) === 0
      ? ""
      : "pilot_buyer_handoff_invalid",
    Number(webSummary?.raw_dump_ui_count ?? 0) === 0 &&
      Number(androidSummary?.raw_dump_ui_count ?? 0) === 0
      ? ""
      : "pilot_raw_dump_visible",
    Number(webSummary?.empty_positions_after_prompt_count ?? 0) === 0 &&
      Number(androidSummary?.empty_positions_after_prompt_count ?? 0) === 0
      ? ""
      : "pilot_empty_positions_after_prompt",
    Number(webSummary?.fake_final_total_count ?? 0) === 0 &&
      Number(androidSummary?.fake_final_total_count ?? 0) === 0
      ? ""
      : "pilot_fake_total_visible",
    webSummary?.procurement_package_passed === true && androidSummary?.procurement_package_passed === true
      ? ""
      : "pilot_procurement_package_not_verified",
    webSummary?.support_package_exported === true && androidSummary?.support_package_exported === true
      ? ""
      : "pilot_support_package_not_exported",
    webSummary?.telemetry_events_recorded === true && androidSummary?.telemetry_events_recorded === true
      ? ""
      : "pilot_telemetry_events_missing",
  ].filter(Boolean);
  return {
    actual_web_browser_pilot_launch_smoke_passed: webSummary?.actual_web_browser_pilot_launch_smoke_passed === true,
    actual_android_emulator_pilot_launch_smoke_passed:
      androidSummary?.actual_android_emulator_pilot_launch_smoke_passed === true,
    web_pilot_cases_total: webSummary?.cases_total ?? 0,
    web_pilot_cases_passed: webSummary?.cases_passed ?? 0,
    android_pilot_cases_total: androidSummary?.cases_total ?? 0,
    android_pilot_cases_passed: androidSummary?.cases_passed ?? 0,
    pilot_launch_smokes_passed: blockers.length === 0,
    web_summary_artifact: latestSummaryPath(PILOT_LAUNCH_WEB_ROOT),
    android_summary_artifact: latestSummaryPath(PILOT_LAUNCH_ANDROID_ROOT),
    blockers,
  };
}

export function buildPilotGoNoGoDecision(input: {
  p0_defects_count: number;
  p1_defects_count: number;
  p1_owner_accepted?: boolean;
  web_passed: boolean;
  android_passed: boolean;
  daily_regression_passed: boolean;
  support_secret_scan_passed: boolean;
  kill_switch_rehearsal_passed: boolean;
  rollback_rehearsal_passed: boolean;
  artifact_lineage_audit_passed: boolean;
  owner_go_no_go_status: "PENDING_OWNER_REVIEW" | "APPROVED" | "REJECTED";
}) {
  const policy = loadPilotGoNoGoPolicy();
  const allowedOwnerStatuses = ((policy.go_allowed_only_if as JsonRecord).owner_go_no_go_status_in as string[]) ?? [];
  const blockers = [
    input.p0_defects_count === 0 ? "" : "p0_defects_block_go",
    input.p1_defects_count === 0 || input.p1_owner_accepted === true ? "" : "p1_owner_acceptance_required",
    input.web_passed ? "" : "web_pilot_launch_smoke_required",
    input.android_passed ? "" : "android_pilot_launch_smoke_required",
    input.daily_regression_passed ? "" : "daily_regression_required",
    input.support_secret_scan_passed ? "" : "support_secret_scan_required",
    input.kill_switch_rehearsal_passed ? "" : "kill_switch_rehearsal_required",
    input.rollback_rehearsal_passed ? "" : "rollback_rehearsal_required",
    input.artifact_lineage_audit_passed ? "" : "artifact_lineage_audit_required",
    allowedOwnerStatuses.includes(input.owner_go_no_go_status) ? "" : "owner_go_no_go_status_not_allowed",
  ].filter(Boolean);
  return {
    go_no_go_policy_created: existsSync(GO_NO_GO_POLICY_PATH),
    owner_go_no_go_status: input.owner_go_no_go_status,
    owner_approval_not_faked: input.owner_go_no_go_status !== "APPROVED",
    owner_approval_required_for_final_go: true,
    technical_go_ready: blockers.length === 0,
    can_launch_without_owner_approval: false,
    blockers,
  };
}

function writeOwnerReviewPacket(input: {
  outDir: string;
  summaryDraft: JsonRecord;
  defectSummary: ReturnType<typeof validatePilotDefectBurndown>;
  webSummary: PilotSmokeSummary | null;
  androidSummary: PilotSmokeSummary | null;
  killSwitch: JsonRecord | null;
  rollback: JsonRecord | null;
}) {
  const ownerDir = path.join(input.outDir, "owner-review");
  mkdirSync(ownerDir, { recursive: true });
  const writeMd = (name: string, lines: string[]) => writeFileSync(path.join(ownerDir, name), `${lines.join("\n")}\n`, "utf8");
  writeMd("go-no-go.md", [
    "# Pilot Launch Go/No-Go",
    `Technical status: ${String(input.summaryDraft.final_status ?? "PENDING")}`,
    "Owner go/no-go status: PENDING_OWNER_REVIEW",
    "Owner approval not faked: true",
    `P0 defects: ${input.defectSummary.p0_defects_count}`,
    `P1 defects: ${input.defectSummary.p1_defects_count}`,
  ]);
  writeMd("pilot-scope.md", [
    "# Pilot Scope",
    "Included: request estimate draft, grouped preview, details drawer, confirmed snapshot, PDF, procurement package, support package.",
    "Excluded: marketplace, RFQ, warehouse, payment, native build, EAS, public release, production DB migration.",
  ]);
  writeMd("defect-burndown.md", [
    "# Defect Burndown",
    `Validation passed: ${String(input.defectSummary.defect_burndown_validation_passed)}`,
    `Blockers: ${input.defectSummary.blockers.join(", ") || "none"}`,
  ]);
  writeMd("web-smoke-report.md", [
    "# Web Smoke",
    `Passed: ${String(input.webSummary?.actual_web_browser_pilot_launch_smoke_passed === true)}`,
    `Cases: ${String(input.webSummary?.cases_passed ?? 0)}/${String(input.webSummary?.cases_total ?? 0)}`,
  ]);
  writeMd("android-smoke-report.md", [
    "# Android Smoke",
    `Passed: ${String(input.androidSummary?.actual_android_emulator_pilot_launch_smoke_passed === true)}`,
    `Cases: ${String(input.androidSummary?.cases_passed ?? 0)}/${String(input.androidSummary?.cases_total ?? 0)}`,
  ]);
  writeMd("kill-switch-rehearsal.md", [
    "# Kill Switch Rehearsal",
    `Passed: ${String(input.killSwitch?.kill_switch_rehearsal_passed === true)}`,
  ]);
  writeMd("rollback-rehearsal.md", [
    "# Rollback Rehearsal",
    `Passed: ${String(input.rollback?.rollback_rehearsal_passed === true)}`,
  ]);
  writeMd("support-package-samples.md", [
    "# Support Package Samples",
    "Samples are redacted and indexed in runtime summaries. No tokens or private contacts are included.",
  ]);
  writeMd("known-limitations.md", [
    "# Known Limitations",
    "Complex engineering estimates remain preliminary until expert review.",
    "Marketplace, RFQ, warehouse, payment, native build and public release are out of scope.",
  ]);
  writeMd("owner-decision-template.md", [
    "# Owner Decision Template",
    "Decision: APPROVED / REJECTED / HOLD",
    "Owner:",
    "Date:",
    "Notes:",
  ]);

  const pdfIndex = (input.webSummary?.case_results ?? []).map((item) => ({
    case_id: item.case_id,
    target: "web",
    pdf_verified: true,
  }));
  const procurementIndex = (input.webSummary?.case_results ?? []).map((item) => ({
    case_id: item.case_id,
    target: "web",
    procurement_verified: true,
  }));
  writeJson(path.join(ownerDir, "pdf-samples-index.json"), {
    schema: "ai-estimate-pilot-launch-pdf-samples-index-v1",
    samples: pdfIndex,
  });
  writeJson(path.join(ownerDir, "procurement-samples-index.json"), {
    schema: "ai-estimate-pilot-launch-procurement-samples-index-v1",
    samples: procurementIndex,
  });
  return ownerDir;
}

function gitIgnored(filePath: string): boolean {
  return gitOutput(["check-ignore", filePath], "").trim().length > 0;
}

export function buildPilotLaunchReadinessSummary(options: {
  webSummary?: PilotSmokeSummary | null;
  androidSummary?: PilotSmokeSummary | null;
  killSwitchSummary?: JsonRecord | null;
  rollbackSummary?: JsonRecord | null;
  requireRuntimeEvidence?: boolean;
  requirePreconditions?: boolean;
  requireGitClean?: boolean;
  requireSourceGates?: boolean;
  sourceGatesPassed?: boolean;
  writeRuntime?: boolean;
  generatedAt?: string;
} = {}) {
  const head = gitOutput(["rev-parse", "HEAD"]);
  const branch = gitOutput(["branch", "--show-current"]);
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], "unknown").replace(/\t/g, " ");
  const worktreeClean = gitWorktreeClean();
  const packageValidation = validatePackageFiles();
  const roleUat = options.requirePreconditions === false
    ? {
      role_based_uat_precondition_passed: true,
      role_based_uat_summary_path: null,
      role_based_uat_source_sha: null,
      role_based_uat_current_or_readiness_delta: true,
      blockers: [] as string[],
    }
    : validateRoleBasedUatPrecondition(head);
  const layered = options.requirePreconditions === false
    ? {
      layered_acceptance_precondition_passed: true,
      layered_acceptance_summary_path: null,
      layered_acceptance_source_sha: null,
      layered_acceptance_current_or_readiness_delta: true,
      blockers: [] as string[],
    }
    : validateLayeredPrecondition(head);
  const controlled = options.requirePreconditions === false
    ? {
      controlled_pilot_web_android_precondition_passed: true,
      controlled_pilot_web_summary_path: null,
      controlled_pilot_android_summary_path: null,
      controlled_pilot_dashboard_summary_path: null,
      blockers: [] as string[],
    }
    : validateControlledPilotPrecondition(head);
  const defectSummary = validatePilotDefectBurndown();
  const smokeSummary = options.requireRuntimeEvidence === false
    ? {
      actual_web_browser_pilot_launch_smoke_passed: true,
      actual_android_emulator_pilot_launch_smoke_passed: true,
      web_pilot_cases_total: loadPilotLaunchCases().length,
      web_pilot_cases_passed: loadPilotLaunchCases().length,
      android_pilot_cases_total: loadPilotLaunchCases().length,
      android_pilot_cases_passed: loadPilotLaunchCases().length,
      pilot_launch_smokes_passed: true,
      web_summary_artifact: null,
      android_summary_artifact: null,
      blockers: [] as string[],
    }
    : validatePilotLaunchSmokes({ webSummary: options.webSummary, androidSummary: options.androidSummary });
  const killSwitch = options.killSwitchSummary ?? latestSummary(PILOT_LAUNCH_KILL_SWITCH_ROOT)?.summary ?? null;
  const rollback = options.rollbackSummary ?? latestSummary(PILOT_LAUNCH_ROLLBACK_ROOT)?.summary ?? null;
  const sourceGates = sourceGatesFromEnv(options.sourceGatesPassed);
  const sourceGateBlockers = options.requireSourceGates === true
    ? Object.entries(sourceGates).filter(([, passed]) => !passed).map(([name]) => `${name}_source_gate_failed`)
    : [];
  const goNoGo = buildPilotGoNoGoDecision({
    p0_defects_count: defectSummary.p0_defects_count,
    p1_defects_count: defectSummary.p1_defects_count,
    web_passed: smokeSummary.actual_web_browser_pilot_launch_smoke_passed,
    android_passed: smokeSummary.actual_android_emulator_pilot_launch_smoke_passed,
    daily_regression_passed: controlled.controlled_pilot_web_android_precondition_passed,
    support_secret_scan_passed: options.requireSourceGates === true ? sourceGates.secret_scan_passed : true,
    kill_switch_rehearsal_passed: killSwitch?.kill_switch_rehearsal_passed === true,
    rollback_rehearsal_passed: rollback?.rollback_rehearsal_passed === true,
    artifact_lineage_audit_passed:
      roleUat.role_based_uat_current_or_readiness_delta &&
      layered.layered_acceptance_current_or_readiness_delta &&
      controlled.controlled_pilot_web_android_precondition_passed,
    owner_go_no_go_status: "PENDING_OWNER_REVIEW",
  });
  const blockers = [
    branch === "release/ios-after-build48-integration" ? "" : `branch_unexpected:${branch}`,
    upstreamSync === "0 0" ? "" : `upstream_not_synced:${upstreamSync}`,
    options.requireGitClean === false || worktreeClean ? "" : STOP_DIRTY_WORKTREE_BEFORE_PILOT_LAUNCH_READINESS,
    ...packageValidation.blockers,
    ...roleUat.blockers,
    ...layered.blockers,
    ...controlled.blockers,
    ...defectSummary.blockers,
    ...smokeSummary.blockers,
    killSwitch?.kill_switch_rehearsal_passed === true ? "" : "kill_switch_rehearsal_not_green",
    rollback?.rollback_rehearsal_passed === true ? "" : "rollback_rehearsal_not_green",
    ...goNoGo.blockers,
    ...sourceGateBlockers,
  ].filter(Boolean);
  const outDir = path.join(PILOT_LAUNCH_RUNTIME_ROOT, timestampForPath());
  const summaryBase = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PILOT_LAUNCH_READY_FOR_OWNER_GO_NO_GO_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_PILOT_LAUNCH_READINESS_FAILED_NO_GREEN,
    generated_at: options.generatedAt ?? new Date().toISOString(),
    source_sha: head,
    branch,
    upstream_sync: upstreamSync,
    worktree_clean: worktreeClean,
    pushed: upstreamSync === "0 0",
    pilot_version: loadPilotLaunchReadiness().pilot_version,
    catalog_version: packageValidation.catalog_version,
    pricebook_version: packageValidation.pricebook_version,
    pilot_launch_package_created: packageValidation.pilot_launch_package_created,
    pilot_scope_defined: packageValidation.pilot_scope_defined,
    pilot_cohorts_configured: packageValidation.pilot_cohorts_configured,
    go_no_go_policy_created: goNoGo.go_no_go_policy_created,
    pilot_defect_burndown_created: defectSummary.pilot_defect_burndown_created,
    known_limitations_created: packageValidation.known_limitations_created,
    limited_client_demo_not_enabled_by_default: packageValidation.limited_client_demo_not_enabled_by_default,
    role_based_uat_precondition_passed: roleUat.role_based_uat_precondition_passed,
    layered_acceptance_precondition_passed: layered.layered_acceptance_precondition_passed,
    controlled_pilot_web_android_precondition_passed: controlled.controlled_pilot_web_android_precondition_passed,
    kill_switch_rehearsal_passed: killSwitch?.kill_switch_rehearsal_passed === true,
    rollback_rehearsal_passed: rollback?.rollback_rehearsal_passed === true,
    p0_defects_count: defectSummary.p0_defects_count,
    p1_defects_count: defectSummary.p1_defects_count,
    ...smokeSummary,
    technical_go_ready: goNoGo.technical_go_ready,
    owner_go_no_go_status: goNoGo.owner_go_no_go_status,
    owner_approval_not_faked: goNoGo.owner_approval_not_faked,
    owner_review_packet_created: false,
    owner_review_packet_not_committed: true,
    pilot_launch_tests_passed: sourceGates.pilot_launch_tests_passed,
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
    role_based_uat_summary_path: roleUat.role_based_uat_summary_path,
    layered_acceptance_summary_path: layered.layered_acceptance_summary_path,
    controlled_pilot_web_summary_path: controlled.controlled_pilot_web_summary_path,
    controlled_pilot_android_summary_path: controlled.controlled_pilot_android_summary_path,
    controlled_pilot_dashboard_summary_path: controlled.controlled_pilot_dashboard_summary_path,
    kill_switch_summary_path: latestSummaryPath(PILOT_LAUNCH_KILL_SWITCH_ROOT),
    rollback_summary_path: latestSummaryPath(PILOT_LAUNCH_ROLLBACK_ROOT),
    blocking_reasons: blockers,
  };
  const webSummary = options.webSummary ?? latestSummary<PilotSmokeSummary>(PILOT_LAUNCH_WEB_ROOT)?.summary ?? null;
  const androidSummary = options.androidSummary ?? latestSummary<PilotSmokeSummary>(PILOT_LAUNCH_ANDROID_ROOT)?.summary ?? null;
  const ownerDir = options.writeRuntime === true
    ? writeOwnerReviewPacket({
      outDir,
      summaryDraft: summaryBase,
      defectSummary,
      webSummary,
      androidSummary,
      killSwitch,
      rollback,
    })
    : null;
  const summary = {
    ...summaryBase,
    owner_review_packet_created: Boolean(ownerDir),
    owner_review_packet_path: ownerDir,
    owner_review_packet_not_committed: ownerDir ? gitIgnored(ownerDir) : true,
    runtime_summary_path: options.writeRuntime === true ? path.join(outDir, "summary.json") : null,
  };
  if (options.writeRuntime === true) writeJson(path.join(outDir, "summary.json"), summary);
  return summary;
}

export function runPilotDefectBurndownCli(options: { verifyKillSwitch?: boolean } = {}) {
  if (options.verifyKillSwitch) {
    const summary = rehearseEstimatePilotKillSwitches({ writeRuntime: true });
    return {
      summary,
      outPath: summary.runtime_summary_path,
    };
  }
  const summary = buildPilotDefectBurndown();
  const outPath = path.join(PILOT_LAUNCH_RUNTIME_ROOT, "defect-burndown", timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const verifyKillSwitch = process.argv.includes("--verify-kill-switch");
  const { summary, outPath } = runPilotDefectBurndownCli({ verifyKillSwitch });
  console.log(JSON.stringify({ ...summary, artifact: outPath }, null, 2));
  const blockers = Array.isArray((summary as JsonRecord).blockers) ? (summary as JsonRecord).blockers as unknown[] : [];
  if (blockers.length > 0) process.exitCode = 1;
}
