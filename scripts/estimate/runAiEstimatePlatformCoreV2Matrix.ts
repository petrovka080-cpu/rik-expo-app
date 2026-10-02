import fs from "node:fs";
import path from "node:path";

import {
  buildAiEstimateCatalogIndex,
  clearAiEstimateCatalogIndexCache,
} from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
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

type PlatformCoreV2Case = {
  templateId: string;
  localizedNameRu: string;
};

function buildPlatformCoreV2CasePlan(timings: PlatformCoreV2StageTiming[]) {
  const index = recordPlatformCoreV2Stage(timings, "catalog_index", 11610, () =>
    buildAiEstimateCatalogIndex());
  try {
    const compactCase = (entry: (typeof index.entries)[number]): PlatformCoreV2Case => ({
      templateId: entry.templateId,
      localizedNameRu: entry.localizedNameRu,
    });
    return {
      catalogIndex: index,
      catalogEntryCount: index.entries.length,
      catalogTotalTemplates: index.catalogTotalTemplates,
      random: stableSample(index.entries, 1000, 1).map(compactCase),
      critical: stableSample(
        index.entries.filter((entry) => entry.complexityClass !== "simple"),
        200,
        2,
      ).map(compactCase),
      override: stableSample(index.entries, 200, 3).map(compactCase),
      missing: stableSample(index.entries, 100, 4).map(compactCase),
      artifacts: stableSample(index.entries, 100, 5).map(compactCase),
    };
  } finally {
    clearAiEstimateCatalogIndexCache();
  }
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

function runAndSummarizeCreateCases(
  runtime: ReturnType<typeof createAiEstimateRuntime>,
  cases: readonly PlatformCoreV2Case[],
  captureTemplateIds: ReadonlySet<string> = new Set(),
) {
  const summary = {
    passed: 0,
    failures: [] as CreateCaseResult[],
    registeredBackendOnlyCases: 0,
    clientPassed: 0,
    clientCases: 0,
    clientNeedsInputCases: 0,
    clientNeedsInputTemplateIds: [] as string[],
    backendOnlyPassed: 0,
    backendOnlyCases: 0,
  };
  const capturedResults = new Map<string, CreateCaseResult>();
  cases.forEach((item, caseIndex) => {
    const result = runCreateCase(runtime, item.templateId, item.localizedNameRu, caseIndex);
    if (result.passed) summary.passed += 1;
    else summary.failures.push(result);
    if (result.registered_backend_only) {
      summary.registeredBackendOnlyCases += 1;
      summary.backendOnlyCases += 1;
      if (result.passed) summary.backendOnlyPassed += 1;
    } else {
      summary.clientCases += 1;
      if (result.passed) summary.clientPassed += 1;
      if (result.outcome === "client_needs_input_honestly_blocked") {
        summary.clientNeedsInputCases += 1;
        summary.clientNeedsInputTemplateIds.push(result.template_id);
      }
    }
    if (captureTemplateIds.has(result.template_id)) {
      capturedResults.set(result.template_id, result);
    }
  });
  return { summary, capturedResults };
}

function buildTransferredBackendOnlyRouteCases(results: ReadonlyMap<string, CreateCaseResult>) {
  return PLATFORM_CORE_V2_TRANSFERRED_BACKEND_ONLY_TEMPLATE_ROUTES.map((expectedRoute) => {
    const route = resolveRegisteredProfessionalEstimateSelectionV1(expectedRoute.template_id);
    const result = results.get(expectedRoute.template_id);
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
  });
}

function runAndSummarizeOverrideCases(
  runtime: ReturnType<typeof createAiEstimateRuntime>,
  cases: readonly PlatformCoreV2Case[],
) {
  const summary = {
    passed: 0,
    failures: [] as OverrideCaseResult[],
    registeredBackendOnlyCases: 0,
    clientPassed: 0,
    clientCases: 0,
    backendOnlyPassed: 0,
    backendOnlyCases: 0,
    nonCalculationReadyCases: 0,
  };
  cases.forEach((item, caseIndex) => {
    const result = runOverrideCase(runtime, item.templateId, item.localizedNameRu, caseIndex);
    if (result.passed) summary.passed += 1;
    else summary.failures.push(result);
    if (result.registered_backend_only) {
      summary.registeredBackendOnlyCases += 1;
      summary.backendOnlyCases += 1;
      if (result.passed) summary.backendOnlyPassed += 1;
    } else {
      summary.clientCases += 1;
      if (result.passed) summary.clientPassed += 1;
    }
    if (result.reason === "non_calculation_ready_case_honestly_blocked") {
      summary.nonCalculationReadyCases += 1;
    }
  });
  return summary;
}

function runAndSummarizeArtifactCases(
  runtime: ReturnType<typeof createAiEstimateRuntime>,
  cases: readonly PlatformCoreV2Case[],
) {
  const summary = {
    readyCases: 0,
    honestlyBlockedCases: 0,
    honestlyBlockedTemplateIds: [] as string[],
    pdfPassed: 0,
    buyerPassed: 0,
  };
  cases.forEach((item, caseIndex) => {
    const result = runPdfBuyerCase(runtime, item.templateId, item.localizedNameRu, caseIndex);
    if (result.honestlyBlocked) {
      summary.honestlyBlockedCases += 1;
      summary.honestlyBlockedTemplateIds.push(result.template_id);
    } else {
      summary.readyCases += 1;
    }
    if (result.pdf) summary.pdfPassed += 1;
    if (result.buyer) summary.buyerPassed += 1;
  });
  return summary;
}

function runHistoryWriteCases(runtime: ReturnType<typeof createAiEstimateRuntime>): number {
  const historyStore = createInMemoryAiEstimateHistoryStore();
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
  let cursorApprovedAt: string | null = null;
  let reloadedCount = 0;
  let totalApprovedCount = 0;
  const reloadedIds = new Set<string>();
  do {
    const page = historyStore.listApproved("platform-core-v2", {
      cursorApprovedAt,
      limit: 10,
    });
    totalApprovedCount = page.totalApprovedCount;
    for (const record of page.records) {
      if (record.revisionId !== record.revision.revisionId || reloadedIds.has(record.id)) return 0;
      reloadedIds.add(record.id);
      reloadedCount += 1;
    }
    cursorApprovedAt = page.nextCursorApprovedAt;
  } while (cursorApprovedAt);
  return totalApprovedCount === 100 && reloadedCount === 100 && reloadedIds.size === 100
    ? reloadedCount
    : 0;
}

export function runAiEstimatePlatformCoreV2Matrix(input: { writeSummary?: boolean } = {}) {
  const stageTimings: PlatformCoreV2StageTiming[] = [];
  const {
    catalogIndex,
    catalogEntryCount,
    catalogTotalTemplates,
    random,
    critical,
    override,
    missing,
    artifacts,
  } = buildPlatformCoreV2CasePlan(stageTimings);
  const runtime = createAiEstimateRuntime();

  const randomSummary = recordPlatformCoreV2Stage(
    stageTimings,
    "random_create_draft",
    random.length,
    () => runAndSummarizeCreateCases(runtime, random).summary,
  );
  const criticalStage = recordPlatformCoreV2Stage(
    stageTimings,
    "critical_create_draft",
    critical.length,
    () => {
      const results = runAndSummarizeCreateCases(
        runtime,
        critical,
        new Set(PLATFORM_CORE_V2_TRANSFERRED_BACKEND_ONLY_TEMPLATE_ROUTES.map((route) => route.template_id)),
      );
      return {
        summary: results.summary,
        transferredBackendOnlyRouteCases: buildTransferredBackendOnlyRouteCases(results.capturedResults),
      };
    },
  );
  const criticalSummary = criticalStage.summary;
  const transferredBackendOnlyRouteCases = criticalStage.transferredBackendOnlyRouteCases;
  const transferredBackendOnlyRoutesPassed = transferredBackendOnlyRouteCases.every((result) => result.passed);
  const overrideSummary = recordPlatformCoreV2Stage(
    stageTimings,
    "parameter_override",
    override.length,
    () => runAndSummarizeOverrideCases(runtime, override),
  );
  const missingPassed = recordPlatformCoreV2Stage(stageTimings, "missing_input", missing.length, () => {
    let passed = 0;
    missing.forEach((item, caseIndex) => {
      if (runMissingCase(runtime, item.templateId, item.localizedNameRu, caseIndex)) passed += 1;
    });
    return passed;
  });
  const artifactSummary = recordPlatformCoreV2Stage(
    stageTimings,
    "pdf_buyer_artifacts",
    artifacts.length,
    () => runAndSummarizeArtifactCases(runtime, artifacts),
  );
  const historyReloadPassed = recordPlatformCoreV2Stage(
    stageTimings,
    "history_write",
    100,
    () => runHistoryWriteCases(runtime),
  );
  const web = recordPlatformCoreV2Stage(stageTimings, "web_smoke", 100, () =>
    runAiEstimatePlatformCoreV2Harness({ target: "web", cases: 100, catalogIndex }));
  const android = recordPlatformCoreV2Stage(stageTimings, "android_smoke", 100, () =>
    runAiEstimatePlatformCoreV2Harness({ target: "android-chrome", cases: 100, catalogIndex }));
  const blockers = [
    catalogEntryCount === 11610 ? "" : "catalog_coverage",
    randomSummary.passed === 1000 ? "" : "random_create_draft",
    criticalSummary.passed === 200 ? "" : "critical_create_draft",
    transferredBackendOnlyRoutesPassed ? "" : "transferred_backend_only_routes",
    overrideSummary.passed === 200 ? "" : "parameter_override",
    missingPassed === 100 ? "" : "missing_input",
    artifactSummary.pdfPassed === artifactSummary.readyCases ? "" : "pdf_snapshot_parity",
    artifactSummary.buyerPassed === artifactSummary.readyCases ? "" : "buyer_package_parity",
    artifactSummary.readyCases + artifactSummary.honestlyBlockedCases === 100
      ? ""
      : "artifact_case_partition",
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
    catalog_coverage: `${catalogEntryCount}/${catalogTotalTemplates}`,
    random_create_draft_cases_passed: `${randomSummary.passed}/1000`,
    random_create_draft_failures: randomSummary.failures,
    random_registered_backend_only_cases: randomSummary.registeredBackendOnlyCases,
    random_client_compile_cases_passed: `${randomSummary.clientPassed}/${randomSummary.clientCases}`,
    random_client_needs_input_honestly_blocked_cases: randomSummary.clientNeedsInputCases,
    random_client_needs_input_honestly_blocked_template_ids:
      randomSummary.clientNeedsInputTemplateIds,
    random_backend_only_honestly_blocked_cases_passed:
      `${randomSummary.backendOnlyPassed}/${randomSummary.backendOnlyCases}`,
    critical_create_draft_cases_passed: `${criticalSummary.passed}/200`,
    critical_create_draft_failures: criticalSummary.failures,
    critical_registered_backend_only_cases: criticalSummary.registeredBackendOnlyCases,
    critical_client_compile_cases_passed:
      `${criticalSummary.clientPassed}/${criticalSummary.clientCases}`,
    critical_client_needs_input_honestly_blocked_cases: criticalSummary.clientNeedsInputCases,
    critical_client_needs_input_honestly_blocked_template_ids:
      criticalSummary.clientNeedsInputTemplateIds,
    critical_backend_only_honestly_blocked_cases_passed:
      `${criticalSummary.backendOnlyPassed}/${criticalSummary.backendOnlyCases}`,
    transferred_backend_only_route_cases: transferredBackendOnlyRouteCases,
    parameter_override_cases_passed: `${overrideSummary.passed}/200`,
    parameter_override_failures: overrideSummary.failures,
    parameter_override_registered_backend_only_cases: overrideSummary.registeredBackendOnlyCases,
    parameter_override_executed_cases_passed:
      `${overrideSummary.clientPassed}/${overrideSummary.clientCases}`,
    parameter_override_backend_only_honestly_blocked_cases_passed:
      `${overrideSummary.backendOnlyPassed}/${overrideSummary.backendOnlyCases}`,
    parameter_override_non_calculation_ready_cases: overrideSummary.nonCalculationReadyCases,
    missing_input_cases_passed: `${missingPassed}/100`,
    artifact_ready_cases: artifactSummary.readyCases,
    pdf_snapshot_parity_cases_passed: `${artifactSummary.pdfPassed}/${artifactSummary.readyCases}`,
    buyer_package_parity_cases_passed: `${artifactSummary.buyerPassed}/${artifactSummary.readyCases}`,
    artifact_needs_input_honestly_blocked_cases: artifactSummary.honestlyBlockedCases,
    artifact_needs_input_honestly_blocked_template_ids:
      artifactSummary.honestlyBlockedTemplateIds,
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
