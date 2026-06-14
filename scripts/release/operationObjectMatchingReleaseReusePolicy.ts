import { normalizeProofArtifactPath } from "./proofArtifactAllowlist";

export const OPERATION_OBJECT_MATCHING_RELEASE_NEUTRAL_PATHS = [
  "artifacts/S_P0_OPERATION_OBJECT_MATCHING_AND_CROSS_DOMAIN_ESTIMATE_ISOLATION/",
  "artifacts/S_CONFUSION_FIREWALL_1500_REAL_WORK_ESTIMATE_AUDIT/",
  "scripts/e2e/runOperationObjectMatchingCrossDomainIsolationCloseout.ts",
  "scripts/e2e/confusionFirewall1500RealWorkCases.ts",
  "scripts/e2e/runConfusionFirewall1500Audit.ts",
  "scripts/e2e/runConfusionPairHardAudit.ts",
  "scripts/e2e/runCrossDomainEstimateLeakAudit.ts",
  "scripts/e2e/runCarpetNoMasonryAudit.ts",
  "scripts/e2e/runExpandedEstimatePdfSignatureAudit.ts",
  "scripts/e2e/runConfusionFirewallCloseout.ts",
  "src/lib/ai/workOntology/constructionWorkOntologyMatcher.ts",
  "src/lib/ai/workOntology/workOntologyCandidateRanker.ts",
  "src/lib/ai/workOntology/confusionFirewall.ts",
  "src/lib/ai/workOntology/operationObjectMatcher.ts",
  "src/lib/ai/workOntology/operationObjectDisambiguation.ts",
  "src/lib/ai/workOntology/workObjectDominancePolicy.ts",
  "src/lib/ai/workOntology/forbiddenSubstringGuards.ts",
  "tests/professionalEstimateTemplates/operationObjectCarpetIsolation.contract.test.ts",
  "tests/workOntology/workOntology.operationObjectDisambiguation.contract.test.ts",
  "tests/workOntology/ukladkaDoesNotTriggerKladka.contract.test.ts",
  "tests/workOntology/objectDominatesOperation.contract.test.ts",
  "tests/workOntology/masonryRequiresMasonryObject.contract.test.ts",
] as const;

export const OPERATION_OBJECT_MATCHING_ANDROID_REUSE_REASON =
  "OPERATION_OBJECT_MATCHING_BACKEND_SEMANTIC_PROOF_NO_ANDROID_ROUTE_SHELL_CHANGE";

export function isOperationObjectMatchingReleaseNeutralPath(filePath: string): boolean {
  const normalizedFile = normalizeProofArtifactPath(filePath);
  return OPERATION_OBJECT_MATCHING_RELEASE_NEUTRAL_PATHS.some((allowedPath) => {
    const normalizedAllowedPath = normalizeProofArtifactPath(allowedPath);
    return normalizedAllowedPath.endsWith("/")
      ? normalizedFile.startsWith(normalizedAllowedPath)
      : normalizedFile === normalizedAllowedPath;
  });
}
