const normalizePath = (file: string) => file.replace(/\\/g, "/").replace(/^\.\//, "");

export const isApprovedGreenCloseoutCurrentWavePatch = (file: string): boolean => {
  const normalized = normalizePath(file);

  return (
    normalized.startsWith("artifacts/S_GREEN_CLOSEOUT_") ||
    normalized.startsWith("artifacts/S_B2C_REQUEST_MARKETPLACE_VALIDATION_PDF_BACKEND_50K_") ||
    normalized.startsWith("artifacts/S_CORE_PRODUCT_GOLDEN_PATHS_") ||
    normalized.startsWith("artifacts/S_RLS_DYNAMIC_CROSS_TENANT_") ||
    normalized.startsWith("artifacts/S_WHOLE_APP_50K_") ||
    normalized.startsWith("artifacts/S_50K_FIXTURE_RETENTION_") ||
    normalized.startsWith("artifacts/S_GLOBAL_ESTIMATE_LOCALIZATION_PROFESSIONAL_BOQ_") ||
    normalized.startsWith("artifacts/S_GLOBAL_ESTIMATE_PRODUCTION_SAFE_") ||
    normalized.startsWith("artifacts/S_GLOBAL_ESTIMATE_DATA_OPS_") ||
    normalized.startsWith("artifacts/S_ANY_ESTIMATE_SOURCE_BACKED_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_BLOCKER_AUDIT_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_REAL_ARCHITECTURE_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_LIVE_ACCEPTANCE_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_150_WORK_TYPES_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_1000_WORK_TYPES_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_1000_POST_BOQ_CATALOG_") ||
    normalized.startsWith("artifacts/S_BUILT_IN_AI_10000_WORK_TYPES_") ||
    normalized.startsWith("artifacts/S_GREEN_CLAIM_ARTIFACT_RECONCILIATION_") ||
    normalized.startsWith("artifacts/S_ENTERPRISE_RELEASE_CANDIDATE_") ||
    normalized === "app/admin" ||
    normalized === "app/admin/global-estimate" ||
    normalized.startsWith("app/admin/global-estimate/") ||
    normalized.startsWith("artifacts/S_50K_SYNTHETIC_FIXTURE_") ||
    normalized.startsWith("artifacts/S_50K_SYNTHETIC_FIXTURE_TZ_LOCK_") ||
    normalized.startsWith("artifacts/S_QUERY_BOUNDARY_") ||
    normalized.startsWith("artifacts/S_MEDIA_STORAGE_100K_") ||
    normalized.startsWith("artifacts/S_OBSERVABILITY_") ||
    normalized.startsWith("artifacts/S_AI_DOMAIN_GATEWAY_") ||
    normalized.startsWith("artifacts/S_BACKEND_SERVICE_BOUNDARY_") ||
    normalized.startsWith("artifacts/S_CORE_MUTATION_IDEMPOTENCY_") ||
    normalized.startsWith("artifacts/S_CORE_WORKFLOWS_") ||
    normalized.startsWith("artifacts/S_SECURITY_PRIVACY_") ||
    normalized.startsWith("artifacts/S_RESTORE_MARKETPLACE_ADD_PLUS_AFTER_MARKET_NO_NAV_DELETION_") ||
    normalized.startsWith("artifacts/S_MARKETPLACE_ADD_PHOTO_AI_FILL_") ||
    normalized.startsWith("artifacts/S_CONTRACTOR_EXPANDED_WORK_MEDIA_") ||
    normalized.startsWith("artifacts/S_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE_") ||
    normalized.startsWith("artifacts/S_AI_") ||
    normalized.startsWith("artifacts/S_ESTIMATE_PDF_REAL_BINARY_") ||
    normalized.startsWith("artifacts/pdf/estimate-pdf-reality/") ||
    normalized.startsWith("artifacts/screenshots/estimate-pdf-reality/") ||
    normalized.startsWith("artifacts/S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_") ||
    normalized.startsWith("artifacts/screenshots/live-web-android-ai-estimate-reality/") ||
    normalized.startsWith("scripts/audit/auditAiGenericAnswerRate") ||
    normalized.startsWith("scripts/audit/auditAiContextBudget") ||
    normalized.startsWith("scripts/audit/auditAiDomainDataGateway") ||
    normalized.startsWith("scripts/audit/auditAiRoleDataAccess") ||
    normalized.startsWith("scripts/audit/auditCoreMutationAuditTrail") ||
    normalized.startsWith("scripts/audit/auditCoreMutationIdempotencyDiscipline") ||
    normalized.startsWith("scripts/audit/auditCoreAuditTrail") ||
    normalized.startsWith("scripts/audit/auditCoreWorkflowTransactions") ||
    normalized.startsWith("scripts/audit/auditCoreServiceBoundaries") ||
    normalized.startsWith("scripts/audit/auditDirectSupabaseWritesFromScreens") ||
    normalized.startsWith("scripts/audit/auditObservabilityCoverage") ||
    normalized.startsWith("scripts/audit/auditRateLimitCoverage") ||
    normalized.startsWith("scripts/audit/auditArtifactsNoPii") ||
    normalized.startsWith("scripts/audit/auditSecurityPrivacyHardening") ||
    normalized.startsWith("scripts/audit/auditPiiInArtifacts") ||
    normalized.startsWith("scripts/audit/auditPublicMarketplaceSafeFields") ||
    normalized.startsWith("scripts/audit/auditSignedUrlExpiry") ||
    normalized.startsWith("scripts/audit/auditSecretsInFrontend") ||
    normalized.startsWith("scripts/audit/backendServiceBoundary.shared") ||
    normalized.startsWith("scripts/audit/coreMutationIdempotency.shared") ||
    normalized.startsWith("scripts/audit/coreWorkflows.shared") ||
    normalized.startsWith("scripts/audit/observabilityOps.shared") ||
    normalized.startsWith("scripts/audit/securityPrivacyHardening.shared") ||
    normalized.startsWith("scripts/ai/runAi") ||
    normalized.startsWith("scripts/audit/auditConsumerRepairBackendWiring") ||
    normalized.startsWith("scripts/audit/auditCoreProductBackendBoundary") ||
    normalized.startsWith("scripts/audit/auditStorageBucketPolicies") ||
    normalized.startsWith("scripts/audit/auditSupabasePrivateTableRlsCoverage") ||
    normalized.startsWith("scripts/audit/auditWholeAppIndexes") ||
    normalized.startsWith("scripts/audit/auditWholeAppNPlusOne") ||
    normalized.startsWith("scripts/audit/auditWholeAppUnboundedQueries") ||
    normalized.startsWith("scripts/audit/auditCursorPaginationCoverage") ||
    normalized.startsWith("scripts/audit/auditIndexCoverageForListQueries") ||
    normalized.startsWith("scripts/audit/auditLargeTableSelectStar") ||
    normalized.startsWith("scripts/audit/externalLiveProofCloseout.shared") ||
    normalized === "supabase/migrations/20260522123000_rls_dynamic_cross_tenant_static_coverage.sql" ||
    normalized.startsWith("scripts/audit/auditMediaStorage100k") ||
    normalized.startsWith("scripts/audit/auditQueryBoundaryCandidates") ||
    normalized.startsWith("scripts/audit/mediaStorage100k.shared") ||
    normalized.startsWith("scripts/audit/queryBoundaryCleanup.shared") ||
    normalized.startsWith("scripts/audit/runMediaStorage100kOrphanRetryBackpressureProof") ||
    normalized.startsWith("scripts/audit/runQueryBoundaryCleanupProof") ||
    normalized.startsWith("scripts/audit/rlsDynamicCrossTenant.shared") ||
    normalized.startsWith("scripts/audit/runExternalLiveProofCloseout") ||
    normalized.startsWith("scripts/audit/greenClaimArtifactReconciliation") ||
    normalized.startsWith("scripts/audit/runGreenClaimArtifactReconciliation") ||
    normalized.startsWith("scripts/audit/runRlsDynamicCrossTenantProof") ||
    normalized.startsWith("scripts/audit/wholeApp50kExplainP95.shared") ||
    normalized.startsWith("scripts/audit/run50kFixtureRetentionCleanupPolicyProof") ||
    normalized.startsWith("scripts/audit/run50kSyntheticFixtureTzLockProof") ||
    normalized.startsWith("scripts/e2e/seedWholeApp50kSyntheticFixture") ||
    normalized.startsWith("scripts/e2e/runWholeApp50kExplainP95LiveProof") ||
    normalized.startsWith("scripts/e2e/runAi") ||
    normalized.startsWith("scripts/e2e/runConsumerEstimateTabPdfProof") ||
    normalized.startsWith("scripts/e2e/runBottomNavEstimateAndMarketplacePlusProof") ||
    normalized.startsWith("scripts/e2e/aiDomainGatewayContextBudget.shared") ||
    normalized.startsWith("scripts/e2e/aiRoleLiveTranscriptValue.shared") ||
    normalized.startsWith("scripts/e2e/runB2C") ||
    normalized.startsWith("scripts/e2e/runBackendMediaMigrationUploadProof") ||
    normalized.startsWith("scripts/e2e/runBottomTabs") ||
    normalized.startsWith("scripts/e2e/runCanonicalMobileLayout") ||
    normalized.startsWith("scripts/e2e/runContractorExpandedWorkMediaProof") ||
    normalized.startsWith("scripts/e2e/coreProductGoldenPaths.shared") ||
    normalized.startsWith("scripts/e2e/runB2CRequestGoldenPathProof") ||
    normalized.startsWith("scripts/e2e/runContractorEvidenceGoldenPathProof") ||
    normalized.startsWith("scripts/e2e/runCoreProductGoldenPathsProof") ||
    normalized.startsWith("scripts/e2e/runCoreWorkflowIdempotencyProof") ||
    normalized.startsWith("scripts/e2e/runGlobalLayoutNoOverlapGoldenPathProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimateLocalizationProfessionalBoqProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimateProductionSafeProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimateB2CRequestProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimatePdfMarketplaceProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimateLocalizationRuntimeProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimateDataOpsAdminGovernanceProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimateDataOpsProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimateDataOpsImportProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimateDataOpsCoverageProof") ||
    normalized.startsWith("scripts/e2e/runLiveAiEstimatePdfRealityProof") ||
    normalized.startsWith("scripts/e2e/runAndroidEstimatePdfSmoke") ||
    normalized.startsWith("scripts/e2e/runAndroidEstimatePdfViewerSmoke") ||
    normalized.startsWith("scripts/e2e/runAndroidLiveEstimateRealitySmoke") ||
    normalized.startsWith("scripts/e2e/runAndroidRouteParitySmoke") ||
    normalized.startsWith("scripts/e2e/runLiveWebAndroidAiEstimateRealityProof") ||
    normalized.startsWith("scripts/e2e/anyEstimateSourceBackedProofShared") ||
    normalized.startsWith("scripts/e2e/runAnyConstructionEstimate") ||
    normalized.startsWith("scripts/e2e/runAnyEstimate") ||
    normalized.startsWith("scripts/e2e/runEstimatePdfRealBinaryProof") ||
    normalized.startsWith("scripts/e2e/runAsphalt10000SqMEstimateProof") ||
    normalized.startsWith("scripts/e2e/builtInAiProofShared") ||
    normalized.startsWith("scripts/e2e/runBuiltInAi") ||
    normalized.startsWith("scripts/e2e/runAndroidBuiltInAi1000PostBoqCatalogSmoke") ||
    normalized.startsWith("scripts/e2e/allScreensEnterpriseRuntimeAcceptance.shared") ||
    normalized.startsWith("scripts/e2e/runAllScreens") ||
    normalized.startsWith("scripts/e2e/enterpriseReleaseCandidate.shared") ||
    normalized.startsWith("scripts/e2e/enterpriseReleaseCandidatePolicy") ||
    normalized.startsWith("scripts/e2e/runEnterpriseReleaseCandidate") ||
    normalized.startsWith("scripts/e2e/runMarketplaceAddProductGoldenPathProof") ||
    normalized.startsWith("scripts/e2e/runOfficeApprovalProcurementGoldenPathProof") ||
    normalized.startsWith("scripts/e2e/runRestoreMarketplaceAddPlusAfterMarketProof") ||
    normalized.startsWith("scripts/e2e/runRoleAiHelpfulnessGoldenPathProof") ||
    normalized.startsWith("scripts/e2e/runWholeApp50kExplainP95Proof") ||
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
    normalized.startsWith("src/features/market/") ||
    normalized === "src/lib/database.types.ts" ||
    normalized.startsWith("src/lib/ai/") ||
    normalized.startsWith("src/lib/estimatePdf/") ||
    normalized.startsWith("supabase/functions/calculate-global-estimate/") ||
    normalized.startsWith("supabase/functions/refresh-global-estimate-sources/") ||
    (normalized === "src/lib/proofFixtures" || normalized.startsWith("src/lib/proofFixtures/")) ||
    normalized.startsWith("src/lib/consumerRequests/") ||
    normalized === "src/lib/api/coreMutationId.ts" ||
    normalized === "src/lib/api/requestDraftSync.service.ts" ||
    normalized === "src/lib/catalog/catalog.proposalCreation.service.ts" ||
    normalized === "src/lib/ops" ||
    normalized === "src/lib/ops/productionOpsTelemetry.ts" ||
    normalized === "src/lib/security/securityPrivacyHardening.ts" ||
    normalized === "src/lib/documents/attachmentOpener.ts" ||
    normalized === "src/lib/documents/attachmentOpener.test.ts" ||
    normalized.startsWith("src/lib/documents/evidenceIntelligence/") ||
    normalized.startsWith("src/lib/media/") ||
    normalized === "src/screens/director/director.approve.boundary.ts" ||
    normalized === "src/screens/director/director.approve.boundary.test.ts" ||
    normalized === "src/screens/director/director.proposal.ts" ||
    normalized === "src/screens/director/director.proposal.detail.ts" ||
    normalized === "src/screens/director/director.proposalDecision.boundary.ts" ||
    normalized === "src/screens/director/director.proposalDecision.transport.contract.test.ts" ||
    normalized === "src/screens/director/director.request.ts" ||
    normalized === "src/screens/director/director.request.boundary.ts" ||
    normalized.startsWith("src/screens/profile/") ||
    normalized === "src/screens/warehouse/warehouse.issue.repo.ts" ||
    normalized === "src/screens/warehouse/warehouse.issue.ts" ||
    normalized.startsWith("tests/ai/") ||
    normalized.startsWith("tests/aiEstimatePdf/") ||
    normalized.startsWith("tests/pdf/estimatePdf") ||
    normalized.startsWith("tests/liveAcceptance/") ||
    normalized.startsWith("tests/e2e/liveEstimatePdf") ||
    normalized.startsWith("tests/e2e/liveEstimateReality") ||
    normalized.startsWith("tests/e2e/liveRequestReality") ||
    normalized.startsWith("tests/e2e/liveForemanReality") ||
    normalized.startsWith("tests/e2e/livePdfButtonReality") ||
    normalized === "tests/e2e/routeParity.web.spec.ts" ||
    normalized === "tests/e2e/estimatePdf.web.spec.ts" ||
    normalized.startsWith("tests/allScreensRuntime/") ||
    normalized.startsWith("tests/audit/externalLiveProofCloseoutHarness") ||
    normalized.startsWith("tests/audit/final") ||
    normalized.startsWith("tests/audit/greenClaim") ||
    normalized === "tests/audit/replayVerifiedMatrices.contract.test.ts" ||
    normalized === "tests/audit/releaseGuardUsesReplayLedger.contract.test.ts" ||
    normalized === "tests/audit/dataOpsUiTruthSplit.contract.test.ts" ||
    normalized.startsWith("tests/architecture/ai") ||
    normalized.startsWith("tests/architecture/pdfNo") ||
    normalized === "tests/architecture/liveAcceptanceRequiredForGreen.contract.test.ts" ||
    normalized === "tests/architecture/knownWorkNoGenericRows.contract.test.ts" ||
    normalized === "tests/architecture/noRouteLocalEstimateLogic.contract.test.ts" ||
    normalized === "tests/architecture/noUseEffectRewriteAfterRender.contract.test.ts" ||
    normalized.startsWith("tests/architecture/anyEstimate") ||
    normalized.startsWith("tests/architecture/builtInAi") ||
    normalized === "tests/builtInAi1000" ||
    normalized.startsWith("tests/builtInAi1000/") ||
    normalized === "tests/builtInAi1000PostBoq" ||
    normalized.startsWith("tests/builtInAi1000PostBoq/") ||
    normalized === "tests/builtInAi10000" ||
    normalized.startsWith("tests/builtInAi10000/") ||
    normalized === "tests/architecture/noSilentHistoricalMatrixMutation.contract.test.ts" ||
    normalized === "tests/architecture/noGreenClaimWithoutReplayEvidence.contract.test.ts" ||
    normalized === "tests/architecture/dataOpsOperatorUiCannotBeClaimedByShell.contract.test.ts" ||
    normalized.startsWith("tests/architecture/releaseCandidate") ||
    normalized.startsWith("tests/architecture/globalEstimate") ||
    normalized.startsWith("tests/architecture/consumerRepair") ||
    normalized.startsWith("tests/architecture/allScreens") ||
    normalized.startsWith("tests/architecture/document") ||
    normalized.startsWith("tests/architecture/media") ||
    normalized.startsWith("tests/architecture/coreProduct") ||
    normalized.startsWith("tests/architecture/marketplaceAdd") ||
    normalized.startsWith("tests/architecture/noBottomNavTabDeletion") ||
    normalized.startsWith("tests/architecture/noDirectMarketplacePublishFromUi") ||
    normalized.startsWith("tests/architecture/noDirectStatusWriteFromScreens") ||
    normalized.startsWith("tests/architecture/noDuplicateGlobalPlus") ||
    normalized.startsWith("tests/architecture/noFakePdfStatus") ||
    normalized.startsWith("tests/architecture/noFrontendOnlyCoreSubmit") ||
    normalized.startsWith("tests/architecture/noRawAddRouteInBottomTabs") ||
    normalized.startsWith("tests/architecture/noRawDbDumpInAiContext") ||
    normalized.startsWith("tests/architecture/noRawRouteLabelsInBottomNav") ||
    normalized.startsWith("tests/architecture/noProviderPayloadInAiUi") ||
    normalized.startsWith("tests/architecture/noServiceRoleInFrontend") ||
    normalized.startsWith("tests/architecture/noFrontendSliceAfterUnboundedFetch") ||
    normalized.startsWith("tests/architecture/noLargeTableSelectStar") ||
    normalized.startsWith("tests/architecture/mediaStorage100k") ||
    normalized.startsWith("tests/architecture/noOffsetPaginationOnLargeTables") ||
    normalized.startsWith("tests/architecture/queryBoundaryAllCandidatesResolved") ||
    normalized.startsWith("tests/architecture/coreActionsUseServiceLayer") ||
    normalized.startsWith("tests/architecture/coreMutationIdempotencyDiscipline") ||
    normalized.startsWith("tests/architecture/coreMutationsWriteAuditEvents") ||
    normalized.startsWith("tests/architecture/coreWorkflowNoDuplicateMutation") ||
    normalized.startsWith("tests/architecture/noScreenRandomClientMutationIds") ||
    normalized === "tests/api/coreMutationId.contract.test.ts" ||
    normalized === "tests/api/directorRequestTransport.contract.test.ts" ||
    normalized === "tests/api/rpcRuntimeValidationBatch2.contract.test.ts" ||
    normalized.startsWith("tests/architecture/noUnboundedLargeTableQueries") ||
    (normalized === "tests/architecture/wholeApp50k" || normalized.startsWith("tests/architecture/wholeApp50k")) ||
    (normalized === "tests/proofFixtures" || normalized.startsWith("tests/proofFixtures/")) ||
    normalized.startsWith("tests/architecture/noSensitiveDataInArtifacts") ||
    normalized.startsWith("tests/consumerRepair/") ||
    normalized.startsWith("tests/core/") ||
    normalized.startsWith("tests/documents/") ||
    normalized.startsWith("tests/e2e/ai") ||
    normalized === "tests/e2e/builtInAi1000PostBoqCatalog.web.spec.ts" ||
    normalized.startsWith("tests/e2e/coreProductGoldenPaths") ||
    normalized.startsWith("tests/globalEstimate/") ||
    normalized === "tests/routeParity" ||
    normalized.startsWith("tests/routeParity/") ||
    normalized === "tests/estimateIntent" ||
    normalized.startsWith("tests/estimateIntent/") ||
    normalized === "tests/builtInAi" ||
    normalized.startsWith("tests/builtInAi/") ||
    normalized === "tests/builtInAi150" ||
    normalized.startsWith("tests/builtInAi150/") ||
    normalized === "tests/globalEstimateAnyWork" ||
    normalized.startsWith("tests/globalEstimateAnyWork/") ||
    normalized === "tests/globalEstimateExternalSources" ||
    normalized.startsWith("tests/globalEstimateExternalSources/") ||
    normalized.startsWith("tests/globalEstimateDataOps/") ||
    normalized.startsWith("tests/media/") ||
    normalized === "tests/ops" ||
    normalized.startsWith("tests/ops/") ||
    normalized.startsWith("tests/performance/wholeApp") ||
    normalized.startsWith("tests/performance/queryBoundaryCursorIndex") ||
    normalized.startsWith("tests/performance/mediaStorage100k") ||
    normalized.startsWith("tests/release/aiEnterpriseReleaseCloseout") ||
    normalized.startsWith("tests/releaseCandidate/") ||
    normalized.startsWith("tests/release/iosEasUpdate") ||
    normalized.startsWith("tests/security/companyUserCannotReadOtherCompany") ||
    normalized.startsWith("tests/security/consumerCannotReadOfficeData") ||
    normalized.startsWith("tests/security/aiContextSanitizer") ||
    normalized.startsWith("tests/security/marketplaceDraftOwnerOnly") ||
    normalized.startsWith("tests/security/noDebugRuntimeProviderUi") ||
    normalized.startsWith("tests/security/noPiiInArtifacts") ||
    normalized.startsWith("tests/security/noSecretsInFrontend") ||
    normalized.startsWith("tests/security/privatePdfOwnerOnly") ||
    normalized.startsWith("tests/security/publicMarketplaceSafeFields") ||
    normalized.startsWith("tests/security/rlsDynamicCrossTenant") ||
    normalized.startsWith("tests/security/signedUrlExpiry") ||
    normalized.startsWith("tests/ui/") ||
    normalized === "app/(tabs)/_layout.tsx" ||
    normalized === "app/(tabs)/request/index.tsx" ||
    normalized === "app/global.css" ||
    normalized === "docs/architecture/transport_ownership_map.md" ||
    normalized === "tests/greenCloseoutCurrentWaveAllowlist.ts" ||
    normalized === "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql" ||
    normalized === "supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql" ||
    normalized === "supabase/migrations/20260521153000_b2c_consumer_repair_marketplace_validation_pdf_hardening.sql" ||
    normalized === "supabase/migrations/20260522100000_media_storage_100k_orphan_retry_backpressure.sql" ||
    normalized === "supabase/migrations/20260522110000_core_txn_marketplace_publish_idempotency.sql" ||
    normalized === "supabase/migrations/20260522190000_whole_app_50k_live_explain_indexes.sql" ||
    normalized === "supabase/migrations/20260522220000_global_estimate_localization_professional_boq_engine.sql" ||
    normalized === "supabase/migrations/20260522233000_global_estimate_data_ops_governance.sql" ||
    normalized === "supabase/migrations/20260523130000_any_estimate_external_source_backed_professional_boq.sql" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/release/releaseGuard.shared.test.ts" ||
    normalized === "maestro/all-screens-enterprise-runtime.yaml" ||
    normalized === "maestro/enterprise-release-candidate.yaml"
  );
};
