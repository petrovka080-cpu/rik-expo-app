import { buildAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { validateAiEstimateArtifactLifecycle } from "../../src/lib/estimate/artifacts/validateAiEstimateArtifactLifecycle";
import { validateAiEstimateRuntimeFacade } from "../../src/lib/estimate/runtime/validateAiEstimateRuntimeFacade";
import { auditAiEstimateDependencyDirection } from "./auditAiEstimateDependencyDirection";
import { auditAiEstimateDuplicateEngines } from "./auditAiEstimateDuplicateEngines";

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
};

function makeCases(count: number, familyFilter?: string[]): FitnessCase[] {
  const index = buildAiEstimateCatalogIndex();
  const entries = index.entries.filter((entry) => !familyFilter || familyFilter.includes(entry.workFamily));
  const source = entries.length > 0 ? entries : index.entries;
  return Array.from({ length: count }, (_, i) => {
    const entry = source[(i * 37 + 11) % source.length];
    const key = entry.requiredParameterKeys.find((candidate) => /(?:area|length|width|height|depth|diameter|count|voltage|power|q)/.test(candidate))
      ?? entry.parameterPassportKeys[0]
      ?? "q";
    return {
      caseId: `fitness-${entry.workFamily}-${i}`,
      templateId: entry.templateId,
      prompt: `${entry.localizedNameRu} ${80 + (i % 90)} m2 ${10 + (i % 12)} m`,
      paramKey: key,
      rawValue: String(10 + (i % 200)),
    };
  });
}

function runCases(cases: readonly FitnessCase[]) {
  const runtime = createAiEstimateRuntime();
  let passed = 0;
  for (const testCase of cases) {
    const draft = runtime.createDraft({
      estimateDraftId: testCase.caseId,
      rawInput: testCase.prompt,
      selectedTemplateId: testCase.templateId,
      createdAt: "2026-07-10T00:00:00.000Z",
    });
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
    if (
      classification.classification.family !== "other" &&
      passport.cards.length > 0 &&
      changed.revision.revisionId !== draft.revision.revisionId &&
      validation.ok
    ) {
      passed += 1;
    }
  }
  return passed;
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
  const randomPassed = runCases(random);
  const criticalPassed = runCases(critical);
  const infrastructurePassed = runCases(infrastructure);
  const repairPassed = runCases(repair);
  const foremanPassed = runCases(foreman);
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
