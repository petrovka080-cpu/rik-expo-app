import { normalizeProofArtifactPath } from "./proofArtifactAllowlist";

export const OPERATION_OBJECT_MATCHING_RELEASE_NEUTRAL_PATHS = [
  "artifacts/S_P0_OPERATION_OBJECT_MATCHING_AND_CROSS_DOMAIN_ESTIMATE_ISOLATION/",
  "scripts/e2e/runOperationObjectMatchingCrossDomainIsolationCloseout.ts",
  "src/lib/ai/workOntology/constructionWorkOntologyMatcher.ts",
  "src/lib/ai/workOntology/workOntologyCandidateRanker.ts",
  "tests/professionalEstimateTemplates/operationObjectCarpetIsolation.contract.test.ts",
  "tests/workOntology/workOntology.operationObjectDisambiguation.contract.test.ts",
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
