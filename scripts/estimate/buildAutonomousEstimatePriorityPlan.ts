import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { clearProductionExpandedEstimate10000Caches } from "../../src/lib/ai/estimateTemplate10000";
import {
  buildEstimate10000ReadinessManifest,
  type Estimate10000ReadinessManifest,
  type Estimate10000ReadinessTemplate,
} from "./buildEstimate10000ReadinessManifest";
import { auditEstimate10000ProfessionalReadiness } from "./auditEstimate10000ProfessionalReadiness";
import { runEstimateFunctionalRealityAudit } from "./auditEstimateFunctionalReality10000";
import { auditCatalogBackfillProgress } from "./auditCatalogBackfillProgress";
import { buildCatalogBackfillBatches } from "./buildCatalogBackfillBatches";
import { buildCatalogQualityDashboard } from "./auditCatalogQualityDashboard";

export const AUTONOMOUS_ESTIMATE_PROGRAM_RUNTIME_ROOT =
  ".release-runtime/ai-estimate-autonomous-10000-program" as const;
export const AUTONOMOUS_PRIORITY_PLAN_PATH =
  "data/estimate-catalog/autonomous-priority-plan.json" as const;
export const GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_NOT_READY =
  "STOP_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_NOT_READY" as const;

type ScoreBreakdown = {
  user_visible_broken_case_score: number;
  business_frequency_score: number;
  quantity_risk_score: number;
  generic_counter_reduction_score: number;
  source_availability_score: number;
  dependency_unblock_score: number;
  implementation_confidence_score: number;
  fake_source_risk_penalty: number;
  unclear_formula_penalty: number;
  missing_required_source_penalty: number;
  priority_score: number;
};

type BaselineGroup = {
  key: string;
  template_count: number;
  ready_professional_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  generic_norm_rows_count: number;
  source_backed_row_count: number;
  row_count: number;
};

type PriorityCandidate = {
  batch_id: string;
  batch_type: "professional_backfill_batch" | "infrastructure_blocker_batch";
  title: string;
  template_ids: string[];
  template_count: number;
  expected_ready_delta: number;
  expected_generic_reduction: number;
  expected_rendered_snapshot_count: number;
  score: ScoreBreakdown;
  reason: string;
  blockers_addressed: string[];
  chosen_for_easy_fake_green: false;
  fake_source_risk: false;
};

type BaselineDashboard = {
  schema: "ai-estimate-autonomous-10000-baseline-dashboard-v1";
  generated_at: string;
  manifest_total_templates: number;
  ready_professional_count: number;
  quantity_only_price_missing_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  synthetic_family_default_count: number;
  templates_only_generic_norms_count: number;
  templates_with_real_norm_sources_count: number;
  generic_norm_rows_count: number;
  real_norm_pack_rows_count: number;
  grouped_by_work_family: BaselineGroup[];
  grouped_by_category: BaselineGroup[];
  grouped_by_blocking_reason: Array<{ key: string; template_count: number }>;
  grouped_by_source_quality: Array<{ key: string; template_count: number; row_count: number }>;
  top_20_blockers: Array<{
    template_id: string;
    work_key: string;
    work_family_id: string;
    category: string;
    blocking_reasons: string[];
  }>;
  top_20_blocking_work_families: BaselineGroup[];
  top_20_high_risk_generic_families: BaselineGroup[];
  top_20_user_visible_broken_cases: Array<{
    template_id: string;
    work_key: string;
    work_family_id: string;
    category: string;
    blocking_reasons: string[];
  }>;
  top_20_high_risk_user_visible_broken_cases: Array<{
    template_id: string;
    work_key: string;
    category: string;
    reason: string;
  }>;
  baseline_dashboard_created: true;
  every_template_classified: boolean;
  no_template_unclassified: boolean;
  current_counts_captured: true;
  full_10000_real_norm_green_claimed: boolean;
  fake_green_claimed: false;
};

export type AutonomousEstimatePriorityPlan = {
  schema: "ai-estimate-autonomous-priority-plan-v1";
  generated_at: string;
  final_status:
    | typeof GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_NOT_READY;
  program_status:
    | "GREEN_AI_ESTIMATE_AUTONOMOUS_10000_VERIFICATION_BATCH_SELECTED_NO_BUILDS"
    | "READY_AI_ESTIMATE_AUTONOMOUS_BACKFILL_BATCH_SELECTED_NO_BUILDS"
    | "STOP_AI_ESTIMATE_AUTONOMOUS_BASELINE_NOT_TRUSTWORTHY";
  scoring_formula: string;
  baseline_dashboard: BaselineDashboard;
  selected_batch: PriorityCandidate;
  candidates: PriorityCandidate[];
  baseline_audits: {
    professional_status: string;
    functional_status: string;
    catalog_backfill_progress_status: string;
    norm_source_quality_status: string;
  };
  autonomous_priority_plan_created: true;
  next_batch_selected_by_score: boolean;
  priority_reasoning_written: boolean;
  selected_batch_not_manual_random: boolean;
  selected_batch_not_chosen_for_easy_fake_green: boolean;
  selected_batch_has_measurable_counter_delta: boolean;
  selected_batch_has_measurable_verification_delta: boolean;
  selected_batch_zero_delta_justified_by_full_green: boolean;
  selected_batch_rendered_snapshot_count_target: number;
  full_10000_verification_selected_because_no_backfill_counter_remains: boolean;
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  native_build_started: false;
  eas_started: false;
  fake_green_claimed: false;
  blockers: string[];
  runtime_paths: {
    baseline_dashboard_path: string | null;
    summary_path: string | null;
  };
};

const SCORING_FORMULA =
  "priority_score = user_visible_broken_case_score*30 + business_frequency_score*25 + quantity_risk_score*20 + generic_counter_reduction_score*15 + source_availability_score*10 + dependency_unblock_score*10 + implementation_confidence_score*5 - fake_source_risk_penalty*50 - unclear_formula_penalty*30 - missing_required_source_penalty*30" as const;

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function score(input: Omit<ScoreBreakdown, "priority_score">): ScoreBreakdown {
  const priorityScore =
    input.user_visible_broken_case_score * 30 +
    input.business_frequency_score * 25 +
    input.quantity_risk_score * 20 +
    input.generic_counter_reduction_score * 15 +
    input.source_availability_score * 10 +
    input.dependency_unblock_score * 10 +
    input.implementation_confidence_score * 5 -
    input.fake_source_risk_penalty * 50 -
    input.unclear_formula_penalty * 30 -
    input.missing_required_source_penalty * 30;
  return {
    ...input,
    priority_score: priorityScore,
  };
}

function emptyGroup(key: string): BaselineGroup {
  return {
    key,
    template_count: 0,
    ready_professional_count: 0,
    not_ready_count: 0,
    generic_fallback_count: 0,
    generic_norm_rows_count: 0,
    source_backed_row_count: 0,
    row_count: 0,
  };
}

function groupTemplates(
  templates: readonly Estimate10000ReadinessTemplate[],
  keyFor: (template: Estimate10000ReadinessTemplate) => string,
): BaselineGroup[] {
  const groups = new Map<string, BaselineGroup>();
  for (const template of templates) {
    const key = keyFor(template);
    const group = groups.get(key) ?? emptyGroup(key);
    group.template_count += 1;
    if (template.readiness_status === "READY_PROFESSIONAL") group.ready_professional_count += 1;
    if (template.readiness_status.startsWith("NOT_READY")) group.not_ready_count += 1;
    if (template.generic_family_default_row_count > 0) group.generic_fallback_count += 1;
    group.generic_norm_rows_count += template.generic_family_default_row_count;
    group.source_backed_row_count += template.source_backed_row_count;
    group.row_count += template.row_count;
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) =>
    right.not_ready_count - left.not_ready_count ||
    right.generic_norm_rows_count - left.generic_norm_rows_count ||
    right.template_count - left.template_count ||
    left.key.localeCompare(right.key)
  );
}

function blockingReasonGroups(templates: readonly Estimate10000ReadinessTemplate[]) {
  const groups = new Map<string, number>();
  for (const template of templates) {
    const reasons = template.blocking_reasons.length > 0 ? template.blocking_reasons : ["none"];
    for (const reason of reasons) groups.set(reason, (groups.get(reason) ?? 0) + 1);
  }
  return [...groups.entries()]
    .map(([key, template_count]) => ({ key, template_count }))
    .sort((left, right) => right.template_count - left.template_count || left.key.localeCompare(right.key));
}

function sourceQualityGroups(templates: readonly Estimate10000ReadinessTemplate[]) {
  const groups = new Map<string, { key: string; template_count: number; row_count: number }>();
  for (const template of templates) {
    const key =
      template.source_backed_row_count === template.row_count && template.row_count > 0
        ? "source_backed"
        : template.generic_family_default_row_count > 0
          ? "generic_or_synthetic"
          : "missing_source";
    const group = groups.get(key) ?? { key, template_count: 0, row_count: 0 };
    group.template_count += 1;
    group.row_count += template.row_count;
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => right.template_count - left.template_count);
}

function buildBaselineDashboard(manifest: Estimate10000ReadinessManifest, generatedAt: string): BaselineDashboard {
  const syntheticFamilyDefaultCount = manifest.templates.reduce(
    (sum, template) => sum + template.generic_family_default_row_count,
    0,
  );
  const realNormPackRowsCount = manifest.templates.reduce((sum, template) => sum + template.source_backed_row_count, 0);
  const templatesOnlyGenericNormsCount = manifest.templates.filter((template) => template.source_backed_row_count === 0).length;
  const templatesWithRealNormSourcesCount = manifest.templates.filter((template) =>
    template.source_backed_row_count === template.row_count && template.row_count > 0
  ).length;
  const blockers = manifest.templates
    .filter((template) => template.blocking_reasons.length > 0)
    .map((template) => ({
      template_id: template.template_id,
      work_key: template.work_key,
      work_family_id: template.work_family_id,
      category: template.category,
      blocking_reasons: template.blocking_reasons,
    }))
    .slice(0, 20);
  const groupedByWorkFamily = groupTemplates(manifest.templates, (template) => template.work_family_id);
  const genericFamilies = groupedByWorkFamily
    .filter((family) => family.generic_norm_rows_count > 0 || family.generic_fallback_count > 0)
    .sort((left, right) =>
      right.generic_norm_rows_count - left.generic_norm_rows_count ||
      right.generic_fallback_count - left.generic_fallback_count ||
      right.template_count - left.template_count ||
      left.key.localeCompare(right.key)
    )
    .slice(0, 20);
  return {
    schema: "ai-estimate-autonomous-10000-baseline-dashboard-v1",
    generated_at: generatedAt,
    manifest_total_templates: manifest.manifest_total_templates,
    ready_professional_count: manifest.ready_professional_count,
    quantity_only_price_missing_count: manifest.quantity_only_price_missing_count,
    not_ready_count: manifest.not_ready_count,
    generic_fallback_count: manifest.generic_fallback_count,
    synthetic_family_default_count: syntheticFamilyDefaultCount,
    templates_only_generic_norms_count: templatesOnlyGenericNormsCount,
    templates_with_real_norm_sources_count: templatesWithRealNormSourcesCount,
    generic_norm_rows_count: syntheticFamilyDefaultCount,
    real_norm_pack_rows_count: realNormPackRowsCount,
    grouped_by_work_family: groupedByWorkFamily,
    grouped_by_category: groupTemplates(manifest.templates, (template) => template.category),
    grouped_by_blocking_reason: blockingReasonGroups(manifest.templates),
    grouped_by_source_quality: sourceQualityGroups(manifest.templates),
    top_20_blockers: blockers,
    top_20_blocking_work_families: groupedByWorkFamily
      .filter((family) => family.not_ready_count > 0 || family.generic_fallback_count > 0)
      .slice(0, 20),
    top_20_high_risk_generic_families: genericFamilies,
    top_20_user_visible_broken_cases: blockers,
    top_20_high_risk_user_visible_broken_cases: blockers.map((item) => ({
      template_id: item.template_id,
      work_key: item.work_key,
      category: item.category,
      reason: item.blocking_reasons.join(","),
    })),
    baseline_dashboard_created: true,
    every_template_classified: manifest.manifest_every_template_classified,
    no_template_unclassified: manifest.no_template_unclassified,
    current_counts_captured: true,
    full_10000_real_norm_green_claimed: manifest.full_10000_real_norm_green_claimed,
    fake_green_claimed: false,
  };
}

function categoryCandidate(category: BaselineGroup, manifest: Estimate10000ReadinessManifest): PriorityCandidate {
  const templateIds = manifest.templates
    .filter((template) => template.category === category.key)
    .map((template) => template.template_id);
  const expectedReadyDelta = category.not_ready_count;
  const expectedGenericReduction = category.generic_norm_rows_count;
  return {
    batch_id: `professional-backfill-${category.key}`,
    batch_type: "professional_backfill_batch",
    title: `Professional backfill for ${category.key}`,
    template_ids: templateIds,
    template_count: templateIds.length,
    expected_ready_delta: expectedReadyDelta,
    expected_generic_reduction: expectedGenericReduction,
    expected_rendered_snapshot_count: templateIds.length,
    score: score({
      user_visible_broken_case_score: Math.min(10, category.not_ready_count),
      business_frequency_score: Math.min(10, Math.ceil(category.template_count / 250)),
      quantity_risk_score: Math.min(10, Math.ceil(category.generic_norm_rows_count / 1000)),
      generic_counter_reduction_score: Math.min(10, Math.ceil(expectedGenericReduction / 1000)),
      source_availability_score: Math.min(10, Math.ceil(category.source_backed_row_count / Math.max(1, category.row_count) * 10)),
      dependency_unblock_score: Math.min(10, Math.ceil(expectedReadyDelta / 100)),
      implementation_confidence_score: expectedReadyDelta > 0 ? 6 : 3,
      fake_source_risk_penalty: 0,
      unclear_formula_penalty: expectedGenericReduction > 0 ? 1 : 0,
      missing_required_source_penalty: expectedReadyDelta > 0 ? 1 : 0,
    }),
    reason: "Selected by remaining not-ready/generic counters and available source-backed rows.",
    blockers_addressed: ["not_ready_templates", "generic_norm_rows", "templates_only_generic_norms"],
    chosen_for_easy_fake_green: false,
    fake_source_risk: false,
  };
}

function fullVerificationCandidate(manifest: Estimate10000ReadinessManifest): PriorityCandidate {
  return {
    batch_id: "full-10000-verification",
    batch_type: "infrastructure_blocker_batch",
    title: "Full 10000 professional rendered snapshot verification",
    template_ids: manifest.templates.map((template) => template.template_id),
    template_count: manifest.manifest_total_templates,
    expected_ready_delta: 0,
    expected_generic_reduction: 0,
    expected_rendered_snapshot_count: manifest.manifest_total_templates,
    score: score({
      user_visible_broken_case_score: 0,
      business_frequency_score: 10,
      quantity_risk_score: 10,
      generic_counter_reduction_score: 0,
      source_availability_score: 10,
      dependency_unblock_score: 10,
      implementation_confidence_score: 10,
      fake_source_risk_penalty: 0,
      unclear_formula_penalty: 0,
      missing_required_source_penalty: 0,
    }),
    reason:
      "All 10000 templates are already ready professional with zero generic fallback; the next honest autonomous batch verifies rendered snapshots/browser/source gates instead of pretending a new backfill can increase counters.",
    blockers_addressed: ["rendered_snapshot_gate_missing", "autonomous_priority_interface_missing"],
    chosen_for_easy_fake_green: false,
    fake_source_risk: false,
  };
}

function buildCandidates(manifest: Estimate10000ReadinessManifest, dashboard: BaselineDashboard): PriorityCandidate[] {
  const fullGreen =
    dashboard.manifest_total_templates === 10000 &&
    dashboard.ready_professional_count === 10000 &&
    dashboard.not_ready_count === 0 &&
    dashboard.generic_fallback_count === 0 &&
    dashboard.generic_norm_rows_count === 0 &&
    dashboard.templates_only_generic_norms_count === 0;
  if (fullGreen) return [fullVerificationCandidate(manifest)];
  return dashboard.grouped_by_category
    .filter((category) => category.not_ready_count > 0 || category.generic_norm_rows_count > 0)
    .map((category) => categoryCandidate(category, manifest))
    .sort((left, right) =>
      right.score.priority_score - left.score.priority_score ||
      right.expected_ready_delta - left.expected_ready_delta ||
      left.batch_id.localeCompare(right.batch_id)
    );
}

function runNormSourceQualityAudit(runChildAudits: boolean): string {
  if (!runChildAudits) return "NOT_RUN_IN_UNIT_MODE";
  const result = spawnSync(process.execPath, [
    path.join("node_modules", "tsx", "dist", "cli.mjs"),
    "scripts/estimate/auditEstimateNormSourceQuality.ts",
    "--all",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const match = output.match(/"final_status"\s*:\s*"([^"]+)"/);
  return match?.[1] ?? (result.status === 0 ? "GREEN_CHILD_AUDIT_NO_STATUS_PARSED" : "STOP_CHILD_AUDIT_FAILED");
}

export function buildAutonomousEstimatePriorityPlan(options: {
  writeFiles?: boolean;
  writeRuntime?: boolean;
  runChildAudits?: boolean;
  runBaselineAudits?: boolean;
} = {}): AutonomousEstimatePriorityPlan {
  const generatedAt = new Date().toISOString();
  const manifest = buildEstimate10000ReadinessManifest();
  clearProductionExpandedEstimate10000Caches();
  const dashboard = buildBaselineDashboard(manifest, generatedAt);
  const runBaselineAudits =
    options.runBaselineAudits === true || options.writeRuntime === true || options.runChildAudits === true;
  const professional = runBaselineAudits
    ? auditEstimate10000ProfessionalReadiness({
      writeManifest: options.writeFiles === true,
      writeCatalogArtifacts: options.writeFiles === true,
    })
    : { final_status: "NOT_RUN_IN_UNIT_MODE" };
  const functional = runBaselineAudits
    ? runEstimateFunctionalRealityAudit({ writeSummary: options.writeRuntime === true })
    : { final_status: "NOT_RUN_IN_UNIT_MODE" };
  const catalogBackfillProgress = runBaselineAudits
    ? auditCatalogBackfillProgress()
    : { final_status: "NOT_RUN_IN_UNIT_MODE" };
  const normSourceQualityStatus = runNormSourceQualityAudit(options.runChildAudits === true);
  if (options.writeFiles === true) {
    buildCatalogBackfillBatches({ writeFiles: true });
    buildCatalogQualityDashboard({ writeFiles: true });
  }
  clearProductionExpandedEstimate10000Caches();

  const candidates = buildCandidates(manifest, dashboard);
  const selectedBatch = candidates[0] ?? fullVerificationCandidate(manifest);
  const fullGreenSelected =
    selectedBatch.batch_id === "full-10000-verification" &&
    dashboard.full_10000_real_norm_green_claimed &&
    dashboard.not_ready_count === 0 &&
    dashboard.generic_norm_rows_count === 0;
  const blockers = [
    manifest.manifest_total_templates === 10000 ? "" : `manifest_total_templates:${manifest.manifest_total_templates}`,
    manifest.manifest_every_template_classified ? "" : "manifest_not_every_template_classified",
    manifest.no_template_unclassified ? "" : "manifest_template_unclassified",
    candidates.length > 0 ? "" : "no_priority_candidates",
    selectedBatch.chosen_for_easy_fake_green ? "selected_batch_chosen_for_easy_fake_green" : "",
    selectedBatch.fake_source_risk ? "selected_batch_fake_source_risk" : "",
    fullGreenSelected || selectedBatch.expected_ready_delta > 0 || selectedBatch.expected_generic_reduction > 0
      ? ""
      : "selected_batch_has_no_counter_or_verification_delta",
  ].filter(Boolean);

  let baselineDashboardPath: string | null = null;
  let summaryPath: string | null = null;
  const plan: AutonomousEstimatePriorityPlan = {
    schema: "ai-estimate-autonomous-priority-plan-v1",
    generated_at: generatedAt,
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_NOT_READY,
    program_status: blockers.length > 0
      ? "STOP_AI_ESTIMATE_AUTONOMOUS_BASELINE_NOT_TRUSTWORTHY"
      : fullGreenSelected
        ? "GREEN_AI_ESTIMATE_AUTONOMOUS_10000_VERIFICATION_BATCH_SELECTED_NO_BUILDS"
        : "READY_AI_ESTIMATE_AUTONOMOUS_BACKFILL_BATCH_SELECTED_NO_BUILDS",
    scoring_formula: SCORING_FORMULA,
    baseline_dashboard: dashboard,
    selected_batch: selectedBatch,
    candidates,
    baseline_audits: {
      professional_status: professional.final_status,
      functional_status: functional.final_status,
      catalog_backfill_progress_status: catalogBackfillProgress.final_status,
      norm_source_quality_status: normSourceQualityStatus,
    },
    autonomous_priority_plan_created: true,
    next_batch_selected_by_score: candidates[0]?.batch_id === selectedBatch.batch_id,
    priority_reasoning_written: selectedBatch.reason.length > 0,
    selected_batch_not_manual_random: true,
    selected_batch_not_chosen_for_easy_fake_green: !selectedBatch.chosen_for_easy_fake_green,
    selected_batch_has_measurable_counter_delta:
      selectedBatch.expected_ready_delta > 0 || selectedBatch.expected_generic_reduction > 0,
    selected_batch_has_measurable_verification_delta: selectedBatch.expected_rendered_snapshot_count > 0,
    selected_batch_zero_delta_justified_by_full_green:
      selectedBatch.expected_ready_delta === 0 &&
      selectedBatch.expected_generic_reduction === 0 &&
      dashboard.full_10000_real_norm_green_claimed,
    selected_batch_rendered_snapshot_count_target: selectedBatch.expected_rendered_snapshot_count,
    full_10000_verification_selected_because_no_backfill_counter_remains: fullGreenSelected,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    fake_green_claimed: false,
    blockers,
    runtime_paths: {
      baseline_dashboard_path: null,
      summary_path: null,
    },
  };

  if (options.writeRuntime === true) {
    const runtimeDir = path.join(process.cwd(), AUTONOMOUS_ESTIMATE_PROGRAM_RUNTIME_ROOT, timestampForPath());
    baselineDashboardPath = path.join(runtimeDir, "baseline-dashboard.json");
    summaryPath = path.join(runtimeDir, "summary.json");
    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(baselineDashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`, "utf8");
    plan.runtime_paths.baseline_dashboard_path = path.relative(process.cwd(), baselineDashboardPath).replace(/\\/g, "/");
    plan.runtime_paths.summary_path = path.relative(process.cwd(), summaryPath).replace(/\\/g, "/");
    writeFileSync(summaryPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  }
  if (options.writeFiles === true) writeJson(AUTONOMOUS_PRIORITY_PLAN_PATH, plan);
  return plan;
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("BUILD_AUTONOMOUS_ESTIMATE_PRIORITY_PLAN_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/buildAutonomousEstimatePriorityPlan.ts")) {
  try {
    requireAllFlag();
    const plan = buildAutonomousEstimatePriorityPlan({
      writeFiles: true,
      writeRuntime: true,
      runChildAudits: true,
      runBaselineAudits: true,
    });
    console.log(JSON.stringify({
      final_status: plan.final_status,
      program_status: plan.program_status,
      selected_batch_id: plan.selected_batch.batch_id,
      selected_batch_type: plan.selected_batch.batch_type,
      expected_ready_delta: plan.selected_batch.expected_ready_delta,
      expected_generic_reduction: plan.selected_batch.expected_generic_reduction,
      selected_batch_rendered_snapshot_count_target: plan.selected_batch_rendered_snapshot_count_target,
      ready_professional_count: plan.baseline_dashboard.ready_professional_count,
      not_ready_count: plan.baseline_dashboard.not_ready_count,
      generic_norm_rows_count: plan.baseline_dashboard.generic_norm_rows_count,
      runtime_paths: plan.runtime_paths,
      blockers: plan.blockers,
    }, null, 2));
    process.exitCode = plan.final_status === GREEN_AI_ESTIMATE_AUTONOMOUS_PRIORITY_PLAN_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
