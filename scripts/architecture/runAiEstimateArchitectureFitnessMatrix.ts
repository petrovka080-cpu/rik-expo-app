import { buildAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { validateAiEstimateArtifactLifecycle } from "../../src/lib/estimate/artifacts/validateAiEstimateArtifactLifecycle";
import { validateAiEstimateRuntimeFacade } from "../../src/lib/estimate/runtime/validateAiEstimateRuntimeFacade";
import { auditAiEstimateDependencyDirection } from "./auditAiEstimateDependencyDirection";
import { auditAiEstimateDuplicateEngines } from "./auditAiEstimateDuplicateEngines";
import {
  isRoadCatalogWorkIdV4,
  type RoadScopeIdV4,
} from "../../src/lib/estimate/v4/asphalt";

export const GREEN_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX =
  "GREEN_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX" as const;
export const STOP_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX_FAILED =
  "STOP_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX_FAILED" as const;

type FitnessCase = {
  caseId: string;
  templateId: string;
  prompt: string;
  paramKey: string;
  rawValue: string;
  selectedRoadScope?: RoadScopeIdV4;
};

function makeCases(count: number, familyFilter?: string[]): FitnessCase[] {
  const index = buildAiEstimateCatalogIndex();
  const entries = index.entries.filter((entry) => !familyFilter || familyFilter.includes(entry.workFamily));
  const source = entries.length > 0 ? entries : index.entries;
  return Array.from({ length: count }, (_, i) => {
    const entry = source[(i * 37 + 11) % source.length];
    const requiresRoadScope = entry.workFamily === "road" ||
      isRoadCatalogWorkIdV4(entry.templateId) ||
      /(?:дорож|асфальт|\broad\b|\bpavement\b)/iu.test(entry.localizedNameRu);
    const key = entry.requiredParameterKeys.find((candidate) => /(?:area|length|width|height|depth|diameter|count|voltage|power|q)/.test(candidate))
      ?? entry.parameterPassportKeys[0]
      ?? "q";
    return {
      caseId: `fitness-${entry.workFamily}-${i}`,
      templateId: entry.templateId,
      prompt: [
        entry.localizedNameRu,
        `${80 + (i % 90)} m2`,
        `${10 + (i % 12)} m`,
        requiresRoadScope ? "полное строительство дороги с водоотводом и инфраструктурой" : "",
      ].filter(Boolean).join(" "),
      paramKey: key,
      rawValue: String(10 + (i % 200)),
      selectedRoadScope: requiresRoadScope ? "FULL_ROAD_INFRASTRUCTURE" : undefined,
    };
  });
}

function runCases(cases: readonly FitnessCase[]) {
  const runtime = createAiEstimateRuntime();
  let passed = 0;
  const failures: {
    caseId: string;
    templateId: string;
    classificationFamily: string;
    passportCardCount: number;
    revisionChanged: boolean;
    validationOk: boolean;
    validationErrors: string[];
  }[] = [];
  for (const testCase of cases) {
    let draft: ReturnType<typeof runtime.createDraft>;
    try {
      draft = runtime.createDraft({
        estimateDraftId: testCase.caseId,
        rawInput: testCase.prompt,
        selectedTemplateId: testCase.templateId,
        selectedRoadScope: testCase.selectedRoadScope,
        createdAt: "2026-07-10T00:00:00.000Z",
      });
    } catch (error) {
      throw new Error(
        `fitness_case_failed:${testCase.caseId}:${testCase.templateId}:${String(error)}`,
        { cause: error },
      );
    }
    const classification = runtime.classifyWork({
      rawInput: testCase.prompt,
      selectedTemplateId: testCase.templateId,
    });
    const passport = runtime.buildParameterPassport({ revision: draft.revision });
    const changed = runtime.applyParameterOverride({
      revision: draft.revision,
      operation: draft.revision.params[testCase.paramKey] ? "update_param" : "add_param",
      paramKey: testCase.paramKey,
      rawValue: testCase.rawValue,
      createdAt: "2026-07-10T00:01:00.000Z",
      revisionIndex: 2,
    });
    const validation = runtime.validate({ revision: changed.revision });
    const classificationKnown = classification.classification.family !== "other";
    const passportPresent = passport.cards.length > 0;
    const revisionChanged = changed.revision.revisionId !== draft.revision.revisionId;
    if (classificationKnown && passportPresent && revisionChanged && validation.ok) {
      passed += 1;
    } else if (failures.length < 25) {
      failures.push({
        caseId: testCase.caseId,
        templateId: testCase.templateId,
        classificationFamily: classification.classification.family,
        passportCardCount: passport.cards.length,
        revisionChanged,
        validationOk: validation.ok,
        validationErrors: validation.blockingReasons,
      });
    }
  }
  return { passed, failures };
}

export function diagnoseAiEstimateArchitectureFitnessCases(count: number, familyFilter?: string[]) {
  return runCases(makeCases(count, familyFilter));
}

function artifactHistoryCases(count: number) {
  const runtime = createAiEstimateRuntime();
  let passed = 0;
  const cases = makeCases(count);
  for (const testCase of cases) {
    const draft = runtime.createDraft({
      estimateDraftId: `artifact-${testCase.caseId}`,
      rawInput: testCase.prompt,
      selectedTemplateId: testCase.templateId,
      selectedRoadScope: testCase.selectedRoadScope,
      createdAt: "2026-07-10T00:00:00.000Z",
    });
    const pdf = runtime.buildPdfSnapshot({ revision: draft.revision });
    const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
    const approved = runtime.approveRevision({
      revision: buyer.revision,
      ownerUserId: "fitness-owner",
      approvedAt: "2026-07-10T00:02:00.000Z",
      snapshotId: pdf.snapshot.snapshotId,
      pdfArtifactId: pdf.pdf.pdfArtifactId,
      buyerHandoffId: buyer.buyerPackage.buyerHandoffId,
    });
    const history = runtime.loadApprovedHistory({ ownerUserId: "fitness-owner", limit: count + 1 });
    if (
      pdf.pdf.revisionId === draft.revision.revisionId &&
      buyer.buyerPackage.revisionId === draft.revision.revisionId &&
      approved.approved &&
      history.totalCount >= 1
    ) {
      passed += 1;
    }
  }
  return passed;
}

export function runAiEstimateArchitectureFitnessMatrix() {
  const random = makeCases(1000);
  const critical = makeCases(200, ["apartment_repair", "bathroom_repair", "water_supply", "road", "power_line", "substation"]);
  const infrastructure = makeCases(100, ["water_supply", "sewerage", "road", "power_line", "substation"]);
  const repair = makeCases(100, ["apartment_repair", "bathroom_repair"]);
  const foreman = makeCases(100, ["concrete", "demolition", "facade", "roof"]);
  const randomResult = runCases(random);
  const criticalResult = runCases(critical);
  const infrastructureResult = runCases(infrastructure);
  const repairResult = runCases(repair);
  const foremanResult = runCases(foreman);
  const randomPassed = randomResult.passed;
  const criticalPassed = criticalResult.passed;
  const infrastructurePassed = infrastructureResult.passed;
  const repairPassed = repairResult.passed;
  const foremanPassed = foremanResult.passed;
  const artifactHistoryPassed = artifactHistoryCases(100);
  const facade = validateAiEstimateRuntimeFacade();
  const artifacts = validateAiEstimateArtifactLifecycle();
  const dependencies = auditAiEstimateDependencyDirection();
  const duplicates = auditAiEstimateDuplicateEngines();
  const checks = {
    random_1000_passed: randomPassed === 1000,
    critical_200_passed: criticalPassed === 200,
    infrastructure_100_passed: infrastructurePassed === 100,
    repair_100_passed: repairPassed === 100,
    foreman_100_passed: foremanPassed === 100,
    history_revision_pdf_buyer_100_passed: artifactHistoryPassed === 100,
    runtime_boundary_ok: facade.ok,
    domain_runtime_passport_revision_artifacts_history_ok: artifacts.ok,
    no_bypass_no_forbidden_no_raw_ids: dependencies.ok && duplicates.ok,
    failure_samples: {
      random: randomResult.failures,
      critical: criticalResult.failures,
      infrastructure: infrastructureResult.failures,
      repair: repairResult.failures,
      foreman: foremanResult.failures,
    },
  };
  const blockingReasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  return {
    final_status: blockingReasons.length === 0
      ? GREEN_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX
      : STOP_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX_FAILED,
    random_cases_passed: `${randomPassed}/1000`,
    critical_cases_passed: `${criticalPassed}/200`,
    infrastructure_cases_passed: `${infrastructurePassed}/100`,
    repair_cases_passed: `${repairPassed}/100`,
    foreman_cases_passed: `${foremanPassed}/100`,
    history_revision_pdf_buyer_migration_extension_cases_passed: `${artifactHistoryPassed}/100`,
    ...checks,
    blockingReasons,
  };
}

if (require.main === module) {
  const result = runAiEstimateArchitectureFitnessMatrix();
  console.log(JSON.stringify(result, null, 2));
  if (result.final_status !== GREEN_AI_ESTIMATE_ARCHITECTURE_FITNESS_MATRIX) process.exitCode = 1;
}
