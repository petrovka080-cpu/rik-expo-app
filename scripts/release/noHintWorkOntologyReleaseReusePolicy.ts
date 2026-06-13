import { normalizeProofArtifactPath } from "./proofArtifactAllowlist";

export const NO_HINT_WORK_ONTOLOGY_RELEASE_NEUTRAL_PATHS = [
  "artifacts/S_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT/",
  "scripts/e2e/noHintRealUserWorkCorpus.ts",
  "scripts/e2e/runNoHintRealUserSemanticAudit.ts",
  "scripts/e2e/runNoHintWorkOntologyCandidateRankingAudit.ts",
  "scripts/e2e/runNoHintWorkOntologyConfusionHardSet.ts",
  "scripts/e2e/runNoHintWorkOntologyPlatformCloseout.ts",
  "src/lib/ai/workOntology/noHintRealUserCorpus.ts",
  "src/lib/ai/workOntology/noHintSemanticAuditTypes.ts",
  "src/lib/ai/workOntology/noHintSemanticEvaluator.ts",
  "src/lib/ai/workOntology/workOntologyAmbiguityPolicy.ts",
  "src/lib/ai/workOntology/workOntologyCandidateRanker.ts",
  "src/lib/ai/workOntology/workOntologyResolverContracts.ts",
  "tests/perf/performance-budget.test.ts",
  "tests/workOntologyNoHint/",
] as const;

export const NO_HINT_WORK_ONTOLOGY_ANDROID_REUSE_REASON =
  "NO_HINT_WORK_ONTOLOGY_SEMANTIC_CORE_AUDIT_NO_ANDROID_RUNTIME_CHANGE";

export function isNoHintWorkOntologyReleaseNeutralPath(filePath: string): boolean {
  const normalizedFile = normalizeProofArtifactPath(filePath);
  return NO_HINT_WORK_ONTOLOGY_RELEASE_NEUTRAL_PATHS.some((allowedPath) => {
    const normalizedAllowedPath = normalizeProofArtifactPath(allowedPath);
    return normalizedAllowedPath.endsWith("/")
      ? normalizedFile.startsWith(normalizedAllowedPath)
      : normalizedFile === normalizedAllowedPath;
  });
}
