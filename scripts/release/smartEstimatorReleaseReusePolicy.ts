import { normalizeProofArtifactPath } from "./proofArtifactAllowlist";

export const SMART_ESTIMATOR_RELEASE_NEUTRAL_PATHS = [
  "artifacts/S_SMART_ESTIMATOR_ORCHESTRATOR_REAL_PRICE_EXPANDED_ESTIMATE_CORE/",
  "scripts/e2e/smartEstimator1500ProductionCases.ts",
  "scripts/e2e/runSmartEstimatorProtocolAudit.ts",
  "scripts/e2e/runSmartEstimator1500ProductionAudit.ts",
  "scripts/e2e/runSmartEstimatorDeepGolden300Audit.ts",
  "scripts/e2e/runSmartEstimatorClarificationAudit.ts",
  "scripts/e2e/runSmartEstimatorRealPriceAudit.ts",
  "scripts/e2e/runSmartEstimatorRegionalCurrencyAudit.ts",
  "scripts/e2e/runSmartEstimatorSnapshotNoDesyncAudit.ts",
  "scripts/e2e/runSmartEstimatorPdfParityAudit.ts",
  "scripts/e2e/runSmartEstimatorCloseout.ts",
  "scripts/release/smartEstimatorReleaseReusePolicy.ts",
  "src/lib/ai/smartEstimator/",
  "tests/smartEstimator/",
  "tests/release/smartEstimatorReleaseReusePolicy.contract.test.ts",
] as const;

export const SMART_ESTIMATOR_ANDROID_REUSE_REASON =
  "SMART_ESTIMATOR_PROTOCOL_BACKEND_ONLY_NO_ANDROID_RUNTIME_CHANGE";

export function isSmartEstimatorReleaseNeutralPath(filePath: string): boolean {
  const normalizedFile = normalizeProofArtifactPath(filePath);
  return SMART_ESTIMATOR_RELEASE_NEUTRAL_PATHS.some((allowedPath) => {
    const normalizedAllowedPath = normalizeProofArtifactPath(allowedPath);
    return normalizedAllowedPath.endsWith("/")
      ? normalizedFile.startsWith(normalizedAllowedPath)
      : normalizedFile === normalizedAllowedPath;
  });
}
