const normalizePath = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");

export const isApprovedGreenCloseoutCurrentWavePatch = (file: string): boolean => {
  const normalized = normalizePath(file);

  return (
    normalized.startsWith("artifacts/S_GREEN_CLOSEOUT_") ||
    normalized.startsWith("artifacts/S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_") ||
    normalized.startsWith("artifacts/S_MARKETPLACE_ADD_PHOTO_AI_FILL_") ||
    normalized.startsWith("artifacts/S_CONTRACTOR_EXPANDED_WORK_MEDIA_") ||
    normalized.startsWith("artifacts/S_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE_") ||
    normalized.startsWith("artifacts/S_AI_") ||
    normalized.startsWith("scripts/ai/runAi") ||
    normalized.startsWith("scripts/audit/auditConsumerRepairBackendWiring") ||
    normalized.startsWith("scripts/e2e/runAi") ||
    normalized.startsWith("scripts/e2e/runB2C") ||
    normalized.startsWith("scripts/e2e/runBackendMediaMigrationUploadProof") ||
    normalized.startsWith("scripts/e2e/runBottomTabs") ||
    normalized.startsWith("scripts/e2e/runCanonicalMobileLayout") ||
    normalized.startsWith("scripts/e2e/runContractorExpandedWorkMediaProof") ||
    normalized.startsWith("scripts/e2e/runGlobalBottomNavSafeArea") ||
    normalized.startsWith("scripts/e2e/runMarketplaceAddPhotoAiFillProof") ||
    normalized.startsWith("scripts/e2e/runMediaPhotoVideoIntelligence") ||
    normalized.startsWith("scripts/e2e/runUi") ||
    normalized.startsWith("scripts/release/classifyNativeRuntimeImpact") ||
    normalized.startsWith("scripts/release/nativeRuntimeImpact") ||
    normalized.startsWith("scripts/release/releaseGuard.shared") ||
    normalized.startsWith("scripts/release/run-release-guard") ||
    normalized.startsWith("scripts/release/runAiEnterpriseReleaseCloseoutChangeControl") ||
    normalized.startsWith("scripts/release/runIosOtaChannelProof") ||
    normalized.startsWith("scripts/release/runReleaseVerifyWithStepTiming") ||
    normalized.startsWith("scripts/release/writeGreenCloseoutArtifacts") ||
    normalized.startsWith("scripts/test/runJestCloseoutShards") ||
    normalized.startsWith("src/components/layout/") ||
    normalized.startsWith("src/features/ai/") ||
    normalized.startsWith("src/features/consumerRepair/") ||
    normalized.startsWith("src/lib/ai/") ||
    normalized.startsWith("src/lib/consumerRequests/") ||
    normalized.startsWith("src/lib/documents/evidenceIntelligence/") ||
    normalized.startsWith("src/lib/media/") ||
    normalized.startsWith("tests/ai/") ||
    normalized.startsWith("tests/architecture/ai") ||
    normalized.startsWith("tests/architecture/consumerRepair") ||
    normalized.startsWith("tests/architecture/document") ||
    normalized.startsWith("tests/architecture/media") ||
    normalized.startsWith("tests/consumerRepair/") ||
    normalized.startsWith("tests/documents/") ||
    normalized.startsWith("tests/e2e/ai") ||
    normalized.startsWith("tests/media/") ||
    normalized.startsWith("tests/release/aiEnterpriseReleaseCloseout") ||
    normalized.startsWith("tests/release/iosEasUpdate") ||
    normalized.startsWith("tests/ui/") ||
    normalized === "app/(tabs)/_layout.tsx" ||
    normalized === "app/(tabs)/request/index.tsx" ||
    normalized === "app/global.css" ||
    normalized === "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql" ||
    normalized === "supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql" ||
    normalized === "supabase/migrations/20260521153000_b2c_consumer_repair_marketplace_validation_pdf_hardening.sql" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts"
  );
};
