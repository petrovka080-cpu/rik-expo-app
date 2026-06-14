import { normalizeProofArtifactPath } from "./proofArtifactAllowlist";

export const PROFESSIONAL_ESTIMATE_RELEASE_NEUTRAL_PATHS = [
  "artifacts/S_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE_1500_WORKS_CORE/",
  "scripts/e2e/professionalEstimate1500WorkCases.ts",
  "scripts/e2e/runProfessionalEstimateTemplateCoverageAudit.ts",
  "scripts/e2e/runProfessionalEstimate1500WorkAudit.ts",
  "scripts/e2e/runProfessionalEstimateDeepGolden300Audit.ts",
  "scripts/e2e/runProfessionalEstimateMaterialFormulaAudit.ts",
  "scripts/e2e/runProfessionalEstimatePricebookAudit.ts",
  "scripts/e2e/runProfessionalEstimateRegionalCurrencyAudit.ts",
  "scripts/e2e/runProfessionalEstimateSnapshotNoDesyncAudit.ts",
  "scripts/e2e/runProfessionalEstimateTemplateCloseout.ts",
  "src/lib/ai/professionalEstimateTemplates/",
  "tests/professionalEstimateTemplates/",
] as const;

export const PROFESSIONAL_ESTIMATE_ANDROID_REUSE_REASON =
  "PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE_BACKEND_ONLY_NO_ANDROID_RUNTIME_CHANGE";

export function isProfessionalEstimateReleaseNeutralPath(filePath: string): boolean {
  const normalizedFile = normalizeProofArtifactPath(filePath);
  return PROFESSIONAL_ESTIMATE_RELEASE_NEUTRAL_PATHS.some((allowedPath) => {
    const normalizedAllowedPath = normalizeProofArtifactPath(allowedPath);
    return normalizedAllowedPath.endsWith("/")
      ? normalizedFile.startsWith(normalizedAllowedPath)
      : normalizedFile === normalizedAllowedPath;
  });
}
