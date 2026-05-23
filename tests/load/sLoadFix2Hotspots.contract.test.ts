import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const repoRoot = path.resolve(__dirname, "../..");

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const readJson = (relativePath: string) =>
  JSON.parse(readSource(relativePath)) as Record<string, unknown>;

const dirtyPaths = () => {
  const output = execFileSync(
    "git",
    ["status", "--short", "--untracked-files=all"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ""));
};

const isLaterApprovedWarehouseIssueSourcePatch = (file: string) =>
  [
    "supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql",
    "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql",
    "supabase/migrations/20260501090000_s_load_11_warehouse_issue_queue_ready_rows_read_model.sql",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedAiActionLedgerMigrationProposal = (file: string) =>
  [
    "supabase/migrations/20260512120000_ai_action_ledger.sql",
    "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql",
    "supabase/migrations/20260513130000_ai_action_ledger_write_rpc_mount.sql",
    "supabase/migrations/20260513230000_ai_action_ledger_apply.sql",
    "supabase/migrations/20260513234500_ai_action_ledger_forward_fix.sql",
    "supabase/migrations/20260513235900_ai_action_ledger_drop_obsolete_stub_overloads.sql",
    "artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_write_rpc_mount.sql",
    "supabase/migrations/20260513130000_ai_action_ledger_write_rpc_mount.sql -> artifacts/S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_write_rpc_mount.sql",
  ].includes(file.replace(/\\/g, "/"));

const isApprovedGreenCloseoutCurrentWavePatch = (file: string) => {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("artifacts/S_GREEN_CLOSEOUT_") ||
    normalized.startsWith("artifacts/S_GLOBAL_ESTIMATE_PRODUCTION_SAFE_") ||
    normalized.startsWith("artifacts/S_AI_ESTIMATE_TO_PDF_") ||
    normalized.startsWith("artifacts/S_ALL_SCREENS_") ||
    normalized.startsWith("artifacts/S_ENTERPRISE_RELEASE_CANDIDATE_") ||
    normalized === "src/features/ai/AIAssistantEstimatePdfActions.tsx" ||
    normalized.startsWith("src/lib/ai/estimatePdf/") ||
    normalized.startsWith("tests/aiEstimatePdf/") ||
    normalized.startsWith("tests/architecture/aiEstimatePdf") ||
    normalized.startsWith("tests/architecture/consumerEstimate") ||
    normalized.startsWith("tests/architecture/allScreens") ||
    normalized.startsWith("tests/architecture/releaseCandidate") ||
    normalized.startsWith("tests/allScreensRuntime/") ||
    normalized.startsWith("tests/releaseCandidate/") ||
    normalized.startsWith("tests/globalEstimate/") ||
    normalized.startsWith("tests/architecture/globalEstimate") ||
    normalized.startsWith("artifacts/S_MARKETPLACE_ADD_PHOTO_AI_FILL_") ||
    normalized.startsWith("artifacts/S_CONTRACTOR_EXPANDED_WORK_MEDIA_") ||
    normalized.startsWith("artifacts/S_CORE_MUTATION_IDEMPOTENCY_") ||
    normalized.startsWith("artifacts/S_CORE_WORKFLOWS_") ||
    normalized.startsWith("artifacts/S_OBSERVABILITY_") ||
    normalized.startsWith("artifacts/S_SECURITY_PRIVACY_") ||
    normalized.startsWith("scripts/audit/auditCoreMutationIdempotencyDiscipline") ||
    normalized.startsWith("scripts/audit/auditCoreAuditTrail") ||
    normalized.startsWith("scripts/audit/auditCoreWorkflowTransactions") ||
    normalized.startsWith("scripts/audit/coreMutationIdempotency.shared") ||
    normalized.startsWith("scripts/audit/coreWorkflows.shared") ||
    normalized.startsWith("scripts/audit/auditObservabilityCoverage") ||
    normalized.startsWith("scripts/audit/auditRateLimitCoverage") ||
    normalized.startsWith("scripts/audit/auditArtifactsNoPii") ||
    normalized.startsWith("scripts/audit/auditSecurityPrivacyHardening") ||
    normalized.startsWith("scripts/audit/auditPiiInArtifacts") ||
    normalized.startsWith("scripts/audit/auditPublicMarketplaceSafeFields") ||
    normalized.startsWith("scripts/audit/auditSignedUrlExpiry") ||
    normalized.startsWith("scripts/audit/auditSecretsInFrontend") ||
    normalized.startsWith("scripts/audit/observabilityOps.shared") ||
    normalized.startsWith("scripts/audit/securityPrivacyHardening.shared") ||
    normalized.startsWith("scripts/e2e/runCoreWorkflowIdempotencyProof") ||
    normalized.startsWith("scripts/e2e/runGlobalEstimate") ||
    normalized.startsWith("scripts/e2e/runAiEstimate") ||
    normalized.startsWith("scripts/e2e/runConsumerEstimateTabPdfProof") ||
    normalized.startsWith("scripts/e2e/runBottomNavEstimateAndMarketplacePlusProof") ||
    normalized.startsWith("scripts/e2e/runAllScreens") ||
    normalized === "scripts/e2e/allScreensEnterpriseRuntimeAcceptance.shared.ts" ||
    normalized.startsWith("scripts/e2e/runEnterpriseReleaseCandidate") ||
    normalized === "scripts/e2e/enterpriseReleaseCandidate.shared.ts" ||
    normalized === "scripts/e2e/enterpriseReleaseCandidatePolicy.ts" ||
    normalized === "maestro/all-screens-enterprise-runtime.yaml" ||
    normalized === "maestro/enterprise-release-candidate.yaml" ||
    normalized.startsWith("tests/architecture/coreMutationIdempotencyDiscipline") ||
    normalized.startsWith("tests/architecture/noScreenRandomClientMutationIds") ||
    normalized === "tests/api/coreMutationId.contract.test.ts" ||
    normalized === "src/lib/api/coreMutationId.ts" ||
    normalized === "src/lib/ops/productionOpsTelemetry.ts" ||
    normalized === "src/lib/security/securityPrivacyHardening.ts" ||
    normalized === "src/lib/database.types.ts" ||
    normalized === "src/lib/documents/attachmentOpener.ts" ||
    normalized === "src/lib/documents/attachmentOpener.test.ts" ||
    normalized === "src/lib/catalog/catalog.proposalCreation.service.ts" ||
    normalized === "src/screens/director/director.approve.boundary.ts" ||
    normalized === "src/screens/director/director.approve.boundary.test.ts" ||
    normalized === "src/screens/director/director.request.boundary.ts" ||
    normalized === "src/screens/director/director.request.ts" ||
    normalized === "src/screens/director/director.proposal.ts" ||
    normalized === "src/screens/profile/profile.services.ts" ||
    normalized === "src/features/market/market.repository.ts" ||
    normalized === "src/features/market/marketHome.data.ts" ||
    normalized === "src/screens/warehouse/warehouse.issue.ts" ||
    normalized === "tests/perf/performance-budget.test.ts" ||
    normalized === "tests/greenCloseoutCurrentWaveAllowlist.ts" ||
    normalized === "tests/load/sLoadFix1Hotspots.contract.test.ts" ||
    normalized === "supabase/migrations/20260521120000_media_storage_upload_processing_core.sql" ||
    normalized === "supabase/migrations/20260521143000_b2c_consumer_repair_requests.sql" ||
    normalized === "supabase/migrations/20260521153000_b2c_consumer_repair_marketplace_validation_pdf_hardening.sql" ||
    normalized === "supabase/migrations/20260522100000_media_storage_100k_orphan_retry_backpressure.sql" ||
    normalized === "supabase/migrations/20260522110000_core_txn_marketplace_publish_idempotency.sql" ||
    normalized === "supabase/migrations/20260522123000_rls_dynamic_cross_tenant_static_coverage.sql" ||
    normalized === "supabase/migrations/20260522190000_whole_app_50k_live_explain_indexes.sql" ||
    normalized === "supabase/migrations/20260522220000_global_estimate_localization_professional_boq_engine.sql" ||
    normalized === "supabase/migrations/20260522233000_global_estimate_data_ops_governance.sql" ||
    normalized.startsWith("tests/core/") ||
    normalized.startsWith("tests/ops/") ||
    normalized.startsWith("tests/security/aiContextSanitizer") ||
    normalized.startsWith("tests/security/noDebugRuntimeProviderUi") ||
    normalized.startsWith("tests/security/noPiiInArtifacts") ||
    normalized.startsWith("tests/security/noSecretsInFrontend") ||
    normalized.startsWith("tests/security/publicMarketplaceSafeFields") ||
    normalized.startsWith("tests/security/signedUrlExpiry") ||
    normalized.startsWith("tests/architecture/noSensitiveDataInArtifacts") ||
    normalized.startsWith("tests/architecture/coreWorkflowNoDuplicateMutation")
  );
};

describe("S-LOAD-FIX-2 targeted hotspot optimization contract", () => {
  it("documents the S-LOAD-4 hotspot baseline and code-ready status", () => {
    const matrix = readJson(
      "artifacts/S_LOAD_FIX_2_targeted_hotspot_optimization_matrix.json",
    );
    const sLoad4 = readJson(
      "artifacts/S_LOAD_4_post_fix_staging_regression_matrix.json",
    );

    expect(matrix.wave).toBe("S-LOAD-FIX-2");
    expect(matrix.status).toBe("GREEN_CODE_READY");
    expect((matrix.execution as Record<string, unknown>).stagingLoadRun).toBe(
      false,
    );
    expect(
      (matrix.execution as Record<string, unknown>).productionTouched,
    ).toBe(false);
    expect(
      (sLoad4.hotspotSummary as Record<string, unknown>)
        .buyer_summary_inbox_page_25,
    ).toBe("still_optimize_next_row_overrun_and_latency_threshold");
  });

  it("caps buyer_summary_inbox_scope_v1 rows after rpc validation and preserves bounded args", () => {
    const source = readSource("src/screens/buyer/buyer.fetchers.ts");

    expect(source).toContain("runContainedRpc(");
    expect(source).toContain('"buyer_summary_inbox_scope_v1"');
    expect(source).toContain("p_limit: normalizedLimitGroups");
    expect(source).toContain("validateRpcResponse(data, isRpcRowsEnvelope");
    expect(source).toContain("clampBuyerInboxRowsToLimit(");
    expect(source).toContain("envelope.rows");
    expect(source).toContain("normalizedLimitGroups");
    expect(source).toContain("rows: boundedRows");
    expect(source).toContain("requestIds: uniqIds(boundedRows.map");
    expect(source).toContain("returnedGroupCount: boundedReturnedGroupCount");
  });

  it("dedupes warehouse issue request IDs after the bounded rpc envelope check", () => {
    const source = readSource(
      "src/screens/warehouse/warehouse.requests.read.canonical.ts",
    );

    expect(source).toContain("fetchWarehouseIssueQueueScope(");
    expect(source).toContain("normalizedPage.pageSize");
    expect(source).toContain("requireBoundedRpcRows(");
    expect(source).toContain("dedupeReqHeadRawRows(rows)");
    expect(source).toContain("seen.has(requestId)");
    expect(source).toContain("rows: adaptedRows");
    expect(source.indexOf("requireBoundedRpcRows(")).toBeLessThan(
      source.indexOf("dedupeReqHeadRawRows(rows)"),
    );
  });

  it("prevents duplicate in-flight page fetches from cancelling and restarting hot list reads", () => {
    const warehouseQuery = readSource(
      "src/screens/warehouse/hooks/useWarehouseReqHeadsQuery.ts",
    );
    const buyerQuery = readSource("src/screens/buyer/useBuyerInboxQuery.ts");

    expect(warehouseQuery).toContain(
      "fetchNextPage: () => query.fetchNextPage({ cancelRefetch: false })",
    );
    expect(warehouseQuery).toContain(
      "refetch: () => query.refetch({ cancelRefetch: false })",
    );
    expect(warehouseQuery).toContain(
      "queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false })",
    );
    expect(buyerQuery).toContain(
      "const fetchNextPage = useCallback(() => fetchNextPageQuery({ cancelRefetch: false })",
    );
    expect(buyerQuery).toContain(
      "const refetch = useCallback(() => refetchQuery({ cancelRefetch: false })",
    );
    expect(buyerQuery).toContain(
      "queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false })",
    );
  });

  it("keeps the wave inside production-safe code, test, and artifact boundaries", () => {
    const changed = dirtyPaths();
    const forbidden = changed.filter(
      (file) =>
        !isLaterApprovedWarehouseIssueSourcePatch(file) &&
        !isApprovedAiActionLedgerMigrationProposal(file) &&
        !isApprovedGreenCloseoutCurrentWavePatch(file) &&
        (/^(?:\.env|app\.json|eas\.json|package(?:-lock)?\.json|ios\/|android\/|supabase\/migrations\/|maestro\/|node_modules\/|android\/app\/build\/)/.test(
          file.replace(/\\/g, "/"),
        ) ||
          /\.(?:apk|aab)$/i.test(file)),
    );

    expect(forbidden).toEqual([]);
  });
});
