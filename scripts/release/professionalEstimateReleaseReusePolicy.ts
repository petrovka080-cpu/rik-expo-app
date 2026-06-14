import { normalizeProofArtifactPath } from "./proofArtifactAllowlist";

export const PROFESSIONAL_ESTIMATE_RELEASE_NEUTRAL_PATHS = [
  "artifacts/S_PROFESSIONAL_ESTIMATE_TEMPLATE_ENGINE_1500_WORKS_CORE/",
  "artifacts/S_PROFESSIONAL_EXPANDED_ESTIMATE_ROW_ISOLATION_1500/",
  "artifacts/S_CONFUSION_FIREWALL_1500_REAL_WORK_ESTIMATE_AUDIT/",
  "artifacts/S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_legacy_regression.json",
  "artifacts/pdf/ai-estimate-pdf-safe-integration/legacy_stable_brick_masonry_74sqm.pdf",
  "artifacts/pdf/built-in-ai-50000-phase1/brick_masonry_74sqm_legacy.pdf",
  "artifacts/pdf/built-in-ai-50000-phase2/brick_masonry_74sqm_legacy.pdf",
  "scripts/e2e/professionalEstimate1500WorkCases.ts",
  "scripts/e2e/confusionFirewall1500RealWorkCases.ts",
  "scripts/e2e/runConfusionFirewall1500Audit.ts",
  "scripts/e2e/runConfusionPairHardAudit.ts",
  "scripts/e2e/runCrossDomainEstimateLeakAudit.ts",
  "scripts/e2e/runCarpetNoMasonryAudit.ts",
  "scripts/e2e/runExpandedEstimatePdfSignatureAudit.ts",
  "scripts/e2e/runConfusionFirewallCloseout.ts",
  "scripts/e2e/runProfessionalEstimateTemplateCoverageAudit.ts",
  "scripts/e2e/runProfessionalEstimate1500WorkAudit.ts",
  "scripts/e2e/runProfessionalEstimateDeepGolden300Audit.ts",
  "scripts/e2e/runProfessionalEstimateCrossDomainLeakAudit.ts",
  "scripts/e2e/runProfessionalEstimateCarpetGoldenAudit.ts",
  "scripts/e2e/runProfessionalEstimateExpandedPdfAudit.ts",
  "scripts/e2e/runProfessionalEstimateMaterialFormulaAudit.ts",
  "scripts/e2e/runProfessionalEstimatePricebookAudit.ts",
  "scripts/e2e/runProfessionalEstimateRegionalCurrencyAudit.ts",
  "scripts/e2e/runProfessionalEstimateSnapshotNoDesyncAudit.ts",
  "scripts/e2e/runProfessionalEstimateTemplateCloseout.ts",
  "scripts/e2e/runProfessionalEstimateCloseout.ts",
  "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts",
  "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts",
  "scripts/release/professionalEstimateReleaseReusePolicy.ts",
  "scripts/test/runJestCloseoutShards.ts",
  "src/lib/ai/professionalEstimateTemplates/",
  "src/lib/pdf/estimateExpandedTablePolicy.ts",
  "src/lib/pdf/estimateSignatureBlocks.ts",
  "src/lib/estimatePdf/renderEstimatePdfDocument.ts",
  "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts",
  "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts",
  "src/lib/ai/enterpriseGuardrails/scanners/scanAiDbWrites.ts",
  "tests/ai/aiDbWriteScanner.contract.test.ts",
  "tests/ai/aiEnterpriseArchitecturePolicy.contract.test.ts",
  "tests/perf/performance-budget.test.ts",
  "tests/professionalEstimateTemplates/",
  "tests/release/professionalEstimateReleaseReusePolicy.contract.test.ts",
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
