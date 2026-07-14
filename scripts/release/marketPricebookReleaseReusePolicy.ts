import { normalizeProofArtifactPath } from "./proofArtifactAllowlist";

export const MARKET_PRICEBOOK_RELEASE_NEUTRAL_PATHS = [
  "artifacts/S_REAL_MARKET_MATERIAL_PRICEBOOK_COVERAGE_CORE/",
  "scripts/e2e/pricebookFixtures/",
  "scripts/e2e/runMarketMaterialCoverageAudit.ts",
  "scripts/e2e/runMarketPricebookCoverageAudit.ts",
  "scripts/e2e/runMarketPricebookImportValidation.ts",
  "scripts/e2e/runMarketPriceFreshnessAudit.ts",
  "scripts/e2e/runMarketPriceRegionalCurrencyAudit.ts",
  "scripts/e2e/runMarketPriceNoFakePriceAudit.ts",
  "scripts/e2e/runMarketPriceSnapshotAudit.ts",
  "scripts/e2e/runMarketPriceSmartEstimator1500CoverageAudit.ts",
  "scripts/e2e/runMarketPriceDeepGolden300Audit.ts",
  "scripts/e2e/runMarketPricebookCloseout.ts",
  "scripts/release/marketPricebookReleaseReusePolicy.ts",
  "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts",
  "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts",
  "src/lib/ai/marketPricebook/",
  "src/lib/ai/professionalEstimateTemplates/professionalEstimateTypes.ts",
  "src/lib/ai/professionalEstimateTemplates/professionalPricebookBinder.ts",
  "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts",
  "tests/marketPricebook/",
  "tests/release/marketPricebookReleaseReusePolicy.contract.test.ts",
] as const;

export const MARKET_PRICEBOOK_ANDROID_REUSE_REASON =
  "MARKET_PRICEBOOK_BACKEND_PRICE_COVERAGE_ONLY_NO_ANDROID_RUNTIME_CHANGE";

export function isMarketPricebookReleaseNeutralPath(filePath: string): boolean {
  const normalizedFile = normalizeProofArtifactPath(filePath);
  return MARKET_PRICEBOOK_RELEASE_NEUTRAL_PATHS.some((allowedPath) => {
    const normalizedAllowedPath = normalizeProofArtifactPath(allowedPath);
    return normalizedAllowedPath.endsWith("/")
      ? normalizedFile.startsWith(normalizedAllowedPath)
      : normalizedFile === normalizedAllowedPath;
  });
}
