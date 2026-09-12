import fs from "node:fs";
import path from "node:path";

import { buildAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
import { buildNormativeParameterCompletenessModel } from "../../src/lib/estimate/buildNormativeParameterCompletenessModel";
import { createInMemoryAiEstimateHistoryStore } from "../../src/lib/estimate/storage/AiEstimateHistoryStore";
import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { validateAiEstimatePdfSnapshotParity } from "../../src/lib/estimate/artifacts/validateAiEstimatePdfSnapshotParity";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";
import type {
  DomainResolutionReadiness,
  EstimateDraftRevision,
} from "../../src/lib/estimate/estimateDraftRevisionContract";
import { runAiEstimatePlatformCoreV2Harness } from "../e2e/aiEstimateE2eHarness.shared";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_FAILED" as const;

export const PLATFORM_CORE_V2_TRANSFERRED_BACKEND_ONLY_TEMPLATE_ROUTES = [
  {
    template_id: "drywall_ceiling_interior_bulkhead_clad_large_area_professional_expanded_v1",
    catalog_id: "drywall_ceiling_interior_bulkhead_clad_large_area",
    domain_id: "interior_finishes",
  },
  {
    template_id: "drywall_ceiling_interior_curve_clad_large_area_professional_expanded_v1",
    catalog_id: "drywall_ceiling_interior_curve_clad_large_area",
    domain_id: "interior_finishes",
  },
] as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "matrix");

type PlatformCoreV2StageTiming = {
  stage: string;
  cases: number;
  duration_ms: number;
};

function recordPlatformCoreV2Stage<T>(
  timings: PlatformCoreV2StageTiming[],
  stage: string,
  cases: number,
  run: () => T,
): T {
  const startedAt = Date.now();
  const result = run();
  const timing = { stage, cases, duration_ms: Date.now() - startedAt };
  timings.push(timing);
  const progressPath = process.env.AFFECTED_JEST_PROGRESS_PATH;
  if (progressPath) {
    fs.appendFileSync(progressPath, `${JSON.stringify({
      event: "stage_terminal",
      owner: "ai-estimate-platform-core-v2-matrix",
      ...timing,
      observed_at: new Date().toISOString(),
    })}\n`, "utf8");
  }
  return result;
}

function stableSample<T>(values: readonly T[], count: number, salt: number): T[] {
  const selected: T[] = [];
  const used = new Set<number>();
  for (let index = 0; selected.length < count && index < values.length * 4; index += 1) {
    const sourceIndex = (index * 41 + salt * 97) % values.length;
    if (used.has(sourceIndex)) continue;
    used.add(sourceIndex);
    selected.push(values[sourceIndex]);
  }
  return selected;
}

function promptForTemplate(templateId: string, localizedNameRu: string, index: number): string {
  return [
    localizedNameRu || templateId,
    `${80 + index} m2`,
    "length 20 m",
    "width 5 m",
    "height 3 m",
    "diameter 110 mm",
    "voltage 10 kV",
  ].join(" ");
}

type CreateCaseResult = {
  template_id: string;
  passed: boolean;
  row_count: number;
  registered_backend_only: boolean;
  status: EstimateDraftRevision["status"];
  outcome:
    | "client_compiled_nonempty_boq"
    | "client_needs_input_honestly_blocked"
    | "registered_backend_only_honestly_blocked"
      | "invalid_empty_client_result";
};

function isHonestRequiredInputError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const [reason, ...missingParts] = error.message.split(":");
  if (reason !== "NEEDS_REQUIRED_INPUTS") return false;
  return missingParts.join(":").split("|").some((item) => item.trim().length > 0);
}

function isHonestNeedsInputRevision(revision: EstimateDraftRevision): boolean {
  return revision.status === "failed" &&
    revision.estimateLevel === "NEEDS_INPUT" &&
    revision.boq.rows.length === 0 &&
    revision.missingInputs.length > 0;
}

function runCreateCase(
  runtime: ReturnType<typeof createAiEstimateRuntime>,
  templateId: string,
  localizedNameRu: string,
  index: number,
): CreateCaseResult {
  const registeredBackendOnly = Boolean(resolveRegisteredProfessionalEstimateSelectionV1(templateId));
  let draft: ReturnType<typeof runtime.createDraft>;
  try {
    draft = runtime.createDraft({
      estimateDraftId: `platform-core-v2-create-${index}-${templateId}`,
      rawInput: promptForTemplate(templateId, localizedNameRu, index),
      selectedTemplateId: templateId,
      createdAt: "2026-07-09T00:00:00.000Z",
    });
  } catch (error) {
    if (!isHonestRequiredInputError(error)) throw error;
    return {
      template_id: templateId,
      passed: true,
      row_count: 0,
      registered_backend_only: registeredBackendOnly,
      status: "failed",
      outcome: registeredBackendOnly
        ? "registered_backend_only_honestly_blocked"
        : "client_needs_input_honestly_blocked",
    };
  }
  const clientCompiled = draft.revision.selectedTemplateId.length > 0 && draft.revision.boq.rows.length > 0;
  const backendOnlyHonestlyBlocked = registeredBackendOnly &&
    draft.revision.status === "failed" &&
    draft.revision.boq.rows.length === 0;
  const clientNeedsInputHonestlyBlocked = !registeredBackendOnly &&
    isHonestNeedsInputRevision(draft.revision);
  return {
    template_id: templateId,
    passed: clientCompiled || backendOnlyHonestlyBlocked || clientNeedsInputHonestlyBlocked,
    row_count: draft.revision.boq.rows.length,
    registered_backend_only: registeredBackendOnly,
    status: draft.revision.status,
    outcome: clientCompiled
      ? "client_compiled_nonempty_boq"
      : backendOnlyHonestlyBlocked
        ? "registered_backend_only_honestly_blocked"
        : clientNeedsInputHonestlyBlocked
          ? "client_needs_input_honestly_blocked"
        : "invalid_empty_client_result",
  };
}

type OverrideCaseResult = {
  template_id: string;
  passed: boolean;
  domain_resolution_readiness: DomainResolutionReadiness | null;
  reason: string;
  registered_backend_only: boolean;
};

function revisionReadiness(revision: EstimateDraftRevision): DomainResolutionReadiness | null {
  return revision.boq.rows
    .map((row) => row.sourceParameters?.domainResolutionReadiness)
    .find((value): value is DomainResolutionReadiness => typeof value === "string") ?? null;
}

function runOverrideCase(
  runtime: ReturnType<typeof createAiEstimateRuntime>,
  templateId: string,
  localizedNameRu: string,
  index: number,
): OverrideCaseResult {
  const registeredBackendOnly = Boolean(resolveRegisteredProfessionalEstimateSelectionV1(templateId));
  let draft: ReturnType<typeof runtime.createDraft>;
  try {
    draft = runtime.createDraft({
      estimateDraftId: `platform-core-v2-override-${index}-${templateId}`,
      rawInput: promptForTemplate(templateId, localizedNameRu, index),
      selectedTemplateId: templateId,
      createdAt: "2026-07-09T00:00:00.000Z",
    });
  } catch (error) {
    if (!isHonestRequiredInputError(error)) throw error;
    return {
      template_id: templateId,
      passed: true,
      domain_resolution_readiness: "NEEDS_REQUIRED_INPUTS",
      reason: registeredBackendOnly
        ? "registered_backend_only_honestly_blocked"
        : "non_calculation_ready_case_honestly_blocked",
      registered_backend_only: registeredBackendOnly,
    };
  }
  const readiness = revisionReadiness(draft.revision);
  if (registeredBackendOnly) {
    const honestlyBlocked = draft.revision.status === "failed" && draft.revision.boq.rows.length === 0;
    return {
      template_id: templateId,
      passed: honestlyBlocked,
      domain_resolution_readiness: readiness,
      reason: honestlyBlocked
        ? "registered_backend_only_honestly_blocked"
        : "registered_backend_only_client_rows_present",
      registered_backend_only: true,
    };
  }
  if (readiness && readiness !== "CALCULATION_READY") {
    const honestlyBlocked = draft.revision.boq.rows.length > 0 && draft.revision.boq.rows.every((row) =>
      row.includedInProcurement === false &&
      row.sourceParameters?.domainResolutionReadiness === readiness &&
      Array.isArray(row.sourceParameters?.applicabilityBlockers) &&
      row.sourceParameters.applicabilityBlockers.length > 0
    );
    return {
      template_id: templateId,
      passed: honestlyBlocked,
      domain_resolution_readiness: readiness,
      reason: honestlyBlocked ? "non_calculation_ready_case_honestly_blocked" : "invalid_readiness_blocker",
      registered_backend_only: false,
    };
  }
  const paramKey = draft.revision.trace.params
    .filter((param) => param.affectsRowIds.length > 0 && typeof draft.revision.params[param.key]?.value === "number")
    .sort((a, b) => b.affectsRowIds.length - a.affectsRowIds.length)[0]?.key ?? "q";
  const before = Number(draft.revision.params[paramKey]?.value ?? 1);
  const result = runtime.applyParameterOverride({
    revision: draft.revision,
    operation: draft.revision.params[paramKey] ? "update_param" : "add_param",
    paramKey,
    rawValue: String(before + 5),
    createdAt: "2026-07-09T00:01:00.000Z",
    revisionIndex: 2,
  });
  const passed = result.revision.revisionId !== draft.revision.revisionId && result.diff.changedRowsCount > 0;
  return {
    template_id: templateId,
    passed,
    domain_resolution_readiness: readiness,
    reason: passed ? "parameter_override_recalculated_rows" : "parameter_override_did_not_change_rows",
    registered_backend_only: false,
  };
}

function runMissingCase(
  runtime: ReturnType<typeof createAiEstimateRuntime>,
  templateId: string,
  localizedNameRu: string,
  index: number,
): boolean {
  try {
    const draft = runtime.createDraft({
      estimateDraftId: `platform-core-v2-missing-${index}-${templateId}`,
      rawInput: promptForTemplate(templateId, localizedNameRu, index),
      selectedTemplateId: templateId,
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    return Boolean(buildNormativeParameterCompletenessModel(draft.revision));
  } catch (error) {
    if (isHonestRequiredInputError(error)) return true;
    throw error;
  }
}

function runPdfBuyerCase(
  runtime: ReturnType<typeof createAiEstimateRuntime>,
  templateId: string,
  localizedNameRu: string,
  index: number,
): { template_id: string; pdf: boolean; buyer: boolean; honestlyBlocked: boolean } {
  try {
    const draft = runtime.createDraft({
      estimateDraftId: `platform-core-v2-artifacts-${index}-${templateId}`,
      rawInput: promptForTemplate(templateId, localizedNameRu, index),
      selectedTemplateId: templateId,
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const pdf = runtime.buildPdfSnapshot({ revision: draft.revision });
    const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
    return {
      template_id: templateId,
      pdf: validateAiEstimatePdfSnapshotParity({ snapshot: pdf.snapshot, pdf: pdf.pdf }),
      buyer: validateAiEstimateBuyerPackageParity({ snapshot: buyer.snapshot, buyerPackage: buyer.buyerPackage }),
      honestlyBlocked: false,
    };
  } catch (error) {
    if (!isHonestRequiredInputError(error)) throw error;
    return { template_id: templateId, pdf: false, buyer: false, honestlyBlocked: true };
  }
}

export function runAiEstimatePlatformCoreV2Matrix(input: { writeSummary?: boolean } = {}) {
  const stageTimings: PlatformCoreV2StageTiming[] = [];
  const index = recordPlatformCoreV2Stage(stageTimings, "catalog_index", 11610, () =>
    buildAiEstimateCatalogIndex());
  const templates = index.entries.map((entry) => entry.templateId);
  const localizedNameByTemplateId = new Map(
    index.entries.map((entry) => [entry.templateId, entry.localizedNameRu]),
  );
  const random = stableSample(templates, 1000, 1);
  const critical = stableSample(index.entries.filter((entry) => entry.complexityClass !== "simple").map((entry) => entry.templateId), 200, 2);
  const override = stableSample(templates, 200, 3);
  const missing = stableSample(templates, 100, 4);
  const artifacts = stableSample(templates, 100, 5);
  const historyStore = createInMemoryAiEstimateHistoryStore();
  const runtime = createAiEstimateRuntime();
  const localizedName = (templateId: string) => localizedNameByTemplateId.get(templateId) ?? templateId;

  const randomResults = recordPlatformCoreV2Stage(stageTimings, "random_create_draft", random.length, () =>
    random.map((templateId, caseIndex) =>
      runCreateCase(runtime, templateId, localizedName(templateId), caseIndex)
    ));
  const randomPassed = randomResults.filter((result) => result.passed).length;
  const randomClientResults = randomResults.filter((result) => !result.registered_backend_only);
  const randomBackendOnlyResults = randomResults.filter((result) => result.registered_backend_only);
  const criticalResults = recordPlatformCoreV2Stage(stageTimings, "critical_create_draft", critical.length, () =>
    critical.map((templateId, caseIndex) =>
      runCreateCase(runtime, templateId, localizedName(templateId), caseIndex)
    ));
  const criticalPassed = criticalResults.filter((result) => result.passed).length;
  const criticalClientResults = criticalResults.filter((result) => !result.registered_backend_only);
  const criticalBackendOnlyResults = criticalResults.filter((result) => result.registered_backend_only);
  const transferredBackendOnlyRouteCases = PLATFORM_CORE_V2_TRANSFERRED_BACKEND_ONLY_TEMPLATE_ROUTES.map(
    (expectedRoute) => {
      const route = resolveRegisteredProfessionalEstimateSelectionV1(expectedRoute.template_id);
      const result = criticalResults.find((candidate) => candidate.template_id === expectedRoute.template_id);
      const clientAlternateCompileDetected = Boolean(
        result && (result.row_count > 0 || result.outcome === "client_compiled_nonempty_boq"),
      );
      const passed = Boolean(
        route &&
        result &&
        route.catalog_id === expectedRoute.catalog_id &&
        route.domain_id === expectedRoute.domain_id &&
        result.registered_backend_only &&
        result.status === "failed" &&
        result.row_count === 0 &&
        result.outcome === "registered_backend_only_honestly_blocked" &&
        result.passed &&
        !clientAlternateCompileDetected,
      );
      return {
        source_template_id: expectedRoute.template_id,
        expected_catalog_id: expectedRoute.catalog_id,
        expected_domain_id: expectedRoute.domain_id,
        resolved_catalog_id: route?.catalog_id ?? null,
        resolved_domain_id: route?.domain_id ?? null,
        critical_sampled: Boolean(result),
        registered_backend_only: result?.registered_backend_only ?? false,
        client_status: result?.status ?? null,
        client_row_count: result?.row_count ?? null,
        client_alternate_compile_detected: clientAlternateCompileDetected,
        outcome: result?.outcome ?? null,
        passed,
      };
    },
  );
  const transferredBackendOnlyRoutesPassed = transferredBackendOnlyRouteCases.every((result) => result.passed);
  const overrideResults = recordPlatformCoreV2Stage(stageTimings, "parameter_override", override.length, () =>
    override.map((templateId, caseIndex) =>
      runOverrideCase(runtime, templateId, localizedName(templateId), caseIndex)
    ));
  const overridePassed = overrideResults.filter((result) => result.passed).length;
  const overrideClientResults = overrideResults.filter((result) => !result.registered_backend_only);
  const overrideBackendOnlyResults = overrideResults.filter((result) => result.registered_backend_only);
  const missingPassed = recordPlatformCoreV2Stage(stageTimings, "missing_input", missing.length, () =>
    missing.filter((templateId, caseIndex) =>
      runMissingCase(runtime, templateId, localizedName(templateId), caseIndex)
    ).length);
  const artifactResults = recordPlatformCoreV2Stage(stageTimings, "pdf_buyer_artifacts", artifacts.length, () =>
    artifacts.map((templateId, caseIndex) =>
      runPdfBuyerCase(runtime, templateId, localizedName(templateId), caseIndex)
    ));
  const pdfPassed = artifactResults.filter((result) => result.pdf).length;
  const buyerPassed = artifactResults.filter((result) => result.buyer).length;
  const artifactsHonestlyBlocked = artifactResults.filter((result) => result.honestlyBlocked).length;
  const artifactReadyCases = artifactResults.length - artifactsHonestlyBlocked;
  recordPlatformCoreV2Stage(stageTimings, "history_write", 100, () => {
    for (let index = 0; index < 100; index += 1) {
      const revision = runtime.createDraft({
        estimateDraftId: `platform-core-v2-history-${index}`,
        rawInput: `capital apartment repair ${90 + index} m2`,
        selectedTemplateId: "demolition_interior_tile_remove_standard_professional_expanded_v1",
        createdAt: new Date(Date.UTC(2026, 6, 9, 0, index)).toISOString(),
      }).revision;
      historyStore.approve({
        id: `history-${revision.revisionId}`,
        userId: "platform-core-v2",
        revisionId: revision.revisionId,
        approvedAt: new Date(Date.UTC(2026, 6, 9, 0, index)).toISOString(),
        revision,
      });
    }
  });
  const historyReloadPassed = historyStore.listApproved("platform-core-v2", { limit: 100 }).totalApprovedCount;
  const web = recordPlatformCoreV2Stage(stageTimings, "web_smoke", 100, () =>
    runAiEstimatePlatformCoreV2Harness({ target: "web", cases: 100 }));
  const android = recordPlatformCoreV2Stage(stageTimings, "android_smoke", 100, () =>
    runAiEstimatePlatformCoreV2Harness({ target: "android-chrome", cases: 100 }));
  const blockers = [
    index.entries.length === 11610 ? "" : "catalog_coverage",
    randomPassed === 1000 ? "" : "random_create_draft",
    criticalPassed === 200 ? "" : "critical_create_draft",
    transferredBackendOnlyRoutesPassed ? "" : "transferred_backend_only_routes",
    overridePassed === 200 ? "" : "parameter_override",
    missingPassed === 100 ? "" : "missing_input",
    pdfPassed === artifactReadyCases ? "" : "pdf_snapshot_parity",
    buyerPassed === artifactReadyCases ? "" : "buyer_package_parity",
    artifactReadyCases + artifactsHonestlyBlocked === 100 ? "" : "artifact_case_partition",
    historyReloadPassed === 100 ? "" : "history_reload",
    web.cases_passed === 100 ? "" : "web_smoke",
    android.cases_passed === 100 ? "" : "android_smoke",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX
      : STOP_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    platform_core_v2_matrix_created: true,
    catalog_coverage: `${index.entries.length}/${index.catalogTotalTemplates}`,
    random_create_draft_cases_passed: `${randomPassed}/1000`,
    random_create_draft_failures: randomResults.filter((result) => !result.passed),
    random_registered_backend_only_cases: randomResults.filter((result) => result.registered_backend_only).length,
    random_client_compile_cases_passed: `${randomClientResults.filter((result) => result.passed).length}/${randomClientResults.length}`,
    random_client_needs_input_honestly_blocked_cases: randomClientResults.filter(
      (result) => result.outcome === "client_needs_input_honestly_blocked",
    ).length,
    random_client_needs_input_honestly_blocked_template_ids: randomClientResults.filter(
      (result) => result.outcome === "client_needs_input_honestly_blocked",
    ).map((result) => result.template_id),
    random_backend_only_honestly_blocked_cases_passed: `${randomBackendOnlyResults.filter((result) => result.passed).length}/${randomBackendOnlyResults.length}`,
    critical_create_draft_cases_passed: `${criticalPassed}/200`,
    critical_create_draft_failures: criticalResults.filter((result) => !result.passed),
    critical_registered_backend_only_cases: criticalResults.filter((result) => result.registered_backend_only).length,
    critical_client_compile_cases_passed: `${criticalClientResults.filter((result) => result.passed).length}/${criticalClientResults.length}`,
    critical_client_needs_input_honestly_blocked_cases: criticalClientResults.filter(
      (result) => result.outcome === "client_needs_input_honestly_blocked",
    ).length,
    critical_client_needs_input_honestly_blocked_template_ids: criticalClientResults.filter(
      (result) => result.outcome === "client_needs_input_honestly_blocked",
    ).map((result) => result.template_id),
    critical_backend_only_honestly_blocked_cases_passed: `${criticalBackendOnlyResults.filter((result) => result.passed).length}/${criticalBackendOnlyResults.length}`,
    transferred_backend_only_route_cases: transferredBackendOnlyRouteCases,
    parameter_override_cases_passed: `${overridePassed}/200`,
    parameter_override_failures: overrideResults.filter((result) => !result.passed),
    parameter_override_registered_backend_only_cases: overrideResults.filter((result) => result.registered_backend_only).length,
    parameter_override_executed_cases_passed: `${overrideClientResults.filter((result) => result.passed).length}/${overrideClientResults.length}`,
    parameter_override_backend_only_honestly_blocked_cases_passed: `${overrideBackendOnlyResults.filter((result) => result.passed).length}/${overrideBackendOnlyResults.length}`,
    parameter_override_non_calculation_ready_cases: overrideResults.filter(
      (result) => result.reason === "non_calculation_ready_case_honestly_blocked",
    ).length,
    missing_input_cases_passed: `${missingPassed}/100`,
    artifact_ready_cases: artifactReadyCases,
    pdf_snapshot_parity_cases_passed: `${pdfPassed}/${artifactReadyCases}`,
    buyer_package_parity_cases_passed: `${buyerPassed}/${artifactReadyCases}`,
    artifact_needs_input_honestly_blocked_cases: artifactsHonestlyBlocked,
    artifact_needs_input_honestly_blocked_template_ids: artifactResults.filter(
      (result) => result.honestlyBlocked,
    ).map((result) => result.template_id),
    history_reload_cases_passed: `${historyReloadPassed}/100`,
    web_smoke_cases_passed: `${web.cases_passed}/100`,
    android_smoke_cases_passed: `${android.cases_passed}/100`,
    stage_timings: stageTimings,
    stage_duration_ms: Object.fromEntries(stageTimings.map((timing) => [timing.stage, timing.duration_ms])),
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const harnessTerminal = process.argv.includes("--harness-terminal");
  const result = runAiEstimatePlatformCoreV2Matrix({
    writeSummary: !process.argv.includes("--no-write-summary"),
  });
  const output = { ...result.summary, summary_path: result.summaryPath };
  console.log(harnessTerminal
    ? `[AiEstimatePlatformCoreV2MatrixTerminal]${JSON.stringify(output)}`
    : JSON.stringify(output, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_MATRIX) process.exitCode = 1;
}
