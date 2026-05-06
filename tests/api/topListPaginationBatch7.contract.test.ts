import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const changedFiles = () =>
  execSync("git diff --name-only HEAD", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const sLoadFix6WarehouseIssueExplainPatch =
  "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql";

const isApprovedSLoadFix6WarehouseIssuePatch = (file: string) =>
  file.replace(/\\/g, "/") === sLoadFix6WarehouseIssueExplainPatch;

describe("S-PAG-7 high-risk remaining query pressure reduction", () => {
  it("keeps previous pagination waves closed", () => {
    const proposals = read("src/lib/api/proposals.ts");
    expect(proposals).toContain(".range(page.from, page.to)");

    const buyerCounterparty = read(
      "src/screens/buyer/hooks/useBuyerCounterpartyRepo.ts",
    );
    expect(
      buyerCounterparty.match(/\.range\(page\.from, page\.to\)/g),
    ).toHaveLength(5);

    const directorRepository = read(
      "src/screens/director/director.repository.ts",
    );
    expect(directorRepository).toContain(
      "queryFactory().range(page.from, page.to)",
    );

    const profileServices = read("src/screens/profile/profile.services.ts");
    expect(profileServices).toContain("const PROFILE_MEMBERSHIP_PAGE_DEFAULTS = {");
    expect(profileServices).toContain("maxRows: 5000");

    const warehouseDicts = read(
      "src/screens/warehouse/warehouse.dicts.repo.ts",
    );
    expect(warehouseDicts).toContain("async function loadPagedWarehouseRows");
  });

  it("page-through-all bounds seven safe catalog list and reference reads", () => {
    const catalogTransport = read("src/lib/catalog/catalog.transport.ts");

    expect(catalogTransport).toContain(
      "CATALOG_SAFE_LIST_PAGE_DEFAULTS = { pageSize: 100, maxPageSize: 100, maxRows: 5000 }",
    );
    expect(catalogTransport).toContain(
      "const loadPagedCatalogRows = async <T,>",
    );
    expect(catalogTransport).toContain("loadPagedRowsWithCeiling<T>");
    expect(catalogTransport).toContain("CATALOG_SAFE_LIST_PAGE_DEFAULTS");
    expect(catalogTransport).toContain("toCatalogQueryError(result.error)");
    expect(catalogTransport).not.toContain(
      "for (let pageIndex = 0; ; pageIndex += 1)",
    );

    expect(catalogTransport).toContain(
      "return await loadPagedCatalogRows<SupplierCounterpartyRow>(buildQuery)",
    );
    expect(catalogTransport).toContain(
      "await loadPagedCatalogRows<SubcontractCounterpartyRow>(() =>",
    );
    expect(catalogTransport).toContain(
      "await loadPagedCatalogRows<ContractorCounterpartyRow>(() =>",
    );
    expect(catalogTransport).toContain(
      "return await loadPagedCatalogRows<ProfileContractorCompatRow>(buildQuery)",
    );
    expect(catalogTransport).toContain(
      "const result = await loadPagedCatalogRows<CatalogGroupTransportRow>(() =>",
    );
    expect(catalogTransport).toContain(
      "const result = await loadPagedCatalogRows<UomTransportRow>(() =>",
    );
    expect(catalogTransport).toContain(
      "return await loadPagedCatalogRows<SupplierTableRow>(buildQuery)",
    );

    expect(catalogTransport).toContain('.order("name", { ascending: true })');
    expect(catalogTransport).toContain('.order("id", { ascending: true })');
    expect(catalogTransport).toContain(
      '.order("contractor_org", { ascending: true })',
    );
    expect(catalogTransport).toContain(
      '.order("company_name", { ascending: true })',
    );
    expect(catalogTransport).toContain(
      '.order("user_id", { ascending: true })',
    );
    expect(catalogTransport).toContain('.order("code", { ascending: true })');
    expect(catalogTransport).not.toContain(".limit(5000)");
  });

  it("does not cap forbidden PDF, report, detail, integrity, queue, BFF, package, or native surfaces", () => {
    const forbiddenSourcePaths = [
      "src/lib/api/pdf_proposal.ts",
      "src/lib/pdf/pdf.builder.ts",
      "src/screens/warehouse/warehouse.api.repo.ts",
      "src/lib/api/integrity.guards.ts",
      "src/lib/infra/jobQueue.ts",
      "scripts/server/stagingBffServerBoundary.ts",
    ];

    for (const relativePath of forbiddenSourcePaths) {
      const source = read(relativePath);
      if (relativePath.includes("scripts/server")) {
        expect(source).toContain("BFF_STAGING_SERVER_BOUNDARY_CONTRACT");
      } else if (relativePath.includes("warehouse.api.repo")) {
        expect(source).not.toContain("normalizePage(");
      } else {
        expect(source).not.toContain("loadPagedCatalogRows");
      }
    }

    const s50kCacheIntegrationAllowedDirtyFiles = new Set([
      "scripts/server/stagingBffServerBoundary.ts",
      "src/shared/scale/bffReadHandlers.ts",
      "src/shared/scale/cacheAdapters.ts",
      "src/shared/scale/cacheInvalidation.ts",
      "src/shared/scale/cacheKeySafety.ts",
      "src/shared/scale/cachePolicies.ts",
    ]);
    const s50kJobsIntegrationAllowedDirtyFiles = new Set([
      "artifacts/S_50K_JOBS_INTEGRATION_1_matrix.json",
      "artifacts/S_50K_JOBS_INTEGRATION_1_proof.md",
      "docs/architecture/50k_jobs_integration.md",
      "docs/operations/background_jobs_runbook.md",
      "scripts/server/stagingBffServerBoundary.ts",
      "src/shared/scale/jobAdapters.ts",
      "src/shared/scale/jobDeadLetterBoundary.ts",
      "src/shared/scale/jobIdempotency.ts",
      "src/shared/scale/jobPayloadSafety.ts",
      "src/shared/scale/jobPolicies.ts",
      "tests/perf/performance-budget.test.ts",
      "tests/scale/jobsIntegrationBoundary.test.ts",
    ]);
    const s50kIdempotencyIntegrationAllowedDirtyFiles = new Set([
      "artifacts/S_50K_IDEMPOTENCY_INTEGRATION_1_matrix.json",
      "artifacts/S_50K_IDEMPOTENCY_INTEGRATION_1_proof.md",
      "docs/architecture/50k_idempotency_integration.md",
      "docs/operations/idempotency_runbook.md",
      "scripts/server/stagingBffServerBoundary.ts",
      "src/shared/scale/idempotencyAdapters.ts",
      "src/shared/scale/idempotencyExecutionGuard.ts",
      "src/shared/scale/idempotencyKeySafety.ts",
      "src/shared/scale/idempotencyPolicies.ts",
      "src/shared/scale/jobPolicies.ts",
      "src/shared/scale/offlineReplayIdempotency.ts",
      "src/shared/scale/bffMutationHandlers.ts",
      "tests/perf/performance-budget.test.ts",
      "tests/scale/idempotencyIntegrationBoundary.test.ts",
    ]);
    const s50kRateEnforcementAllowedDirtyFiles = new Set([
      "artifacts/S_50K_RATE_ENFORCEMENT_1_matrix.json",
      "artifacts/S_50K_RATE_ENFORCEMENT_1_proof.md",
      "docs/architecture/50k_rate_enforcement.md",
      "docs/operations/rate_limit_runbook.md",
      "scripts/server/stagingBffServerBoundary.ts",
      "src/shared/scale/abuseEnforcementBoundary.ts",
      "src/shared/scale/bffMutationHandlers.ts",
      "src/shared/scale/bffReadHandlers.ts",
      "src/shared/scale/jobPolicies.ts",
      "src/shared/scale/rateLimitAdapters.ts",
      "src/shared/scale/rateLimitKeySafety.ts",
      "src/shared/scale/rateLimitPolicies.ts",
      "tests/perf/performance-budget.test.ts",
      "tests/scale/rateEnforcementBoundary.test.ts",
    ]);
    const s50kObsIntegrationAllowedDirtyFiles = new Set([
      "artifacts/S_50K_OBS_INTEGRATION_1_matrix.json",
      "artifacts/S_50K_OBS_INTEGRATION_1_proof.md",
      "docs/architecture/50k_scale_observability.md",
      "docs/operations/scale_observability_runbook.md",
      "scripts/server/stagingBffServerBoundary.ts",
      "src/shared/scale/abuseEnforcementBoundary.ts",
      "src/shared/scale/bffMutationHandlers.ts",
      "src/shared/scale/bffReadHandlers.ts",
      "src/shared/scale/cachePolicies.ts",
      "src/shared/scale/idempotencyPolicies.ts",
      "src/shared/scale/jobPolicies.ts",
      "src/shared/scale/rateLimitPolicies.ts",
      "src/shared/scale/scaleMetricsPolicies.ts",
      "src/shared/scale/scaleObservabilityAdapters.ts",
      "src/shared/scale/scaleObservabilityEvents.ts",
      "src/shared/scale/scaleObservabilitySafety.ts",
      "tests/perf/performance-budget.test.ts",
      "tests/scale/rateEnforcementBoundary.test.ts",
      "tests/scale/scaleObservabilityBoundary.test.ts",
    ]);
    const sBffReadonlyRuntimeFlagWiringAllowedDirtyFiles = new Set([
      "src/shared/scale/bffClient.ts",
      "src/shared/scale/bffContracts.ts",
      "tests/scale/bffBoundary.test.ts",
      "tests/scale/bffReadonlyRuntimeConfig.test.ts",
    ]);
    const sBffReadonlyMobileAuthStrategyAllowedDirtyFiles = new Set([
      "scripts/server/stagingBffHttpServer.ts",
      "tests/scale/bffStagingHttpServer.test.ts",
    ]);
    const sBffMobileSupabaseJwtAuthWiringAllowedDirtyFiles = new Set([
      "src/shared/scale/bffClient.ts",
      "src/shared/scale/bffSafety.ts",
      "tests/api/topListPaginationBatch7.contract.test.ts",
      "tests/scale/bffReadonlyRuntimeConfig.test.ts",
    ]);
    const s50kProviderEnvConventionsAllowedDirtyFiles = new Set([
      "src/shared/scale/providerRuntimeConfig.ts",
      "tests/perf/performance-budget.test.ts",
      "tests/scale/providerRuntimeConfig.test.ts",
    ]);
    const sCatalogRequestBffMutationPortingAllowedDirtyFiles = new Set([
      "scripts/server/stagingBffCatalogRequestMutationPorts.ts",
      "scripts/server/stagingBffHttpServer.ts",
      "scripts/server/stagingBffServerBoundary.ts",
      "src/shared/scale/bffMutationHandlers.ts",
      "src/shared/scale/bffMutationPorts.ts",
      "src/shared/scale/bffShadowFixtures.ts",
      "src/shared/scale/bffShadowHarness.ts",
      "src/shared/scale/bffShadowPorts.ts",
      "src/shared/scale/cacheInvalidation.ts",
      "src/shared/scale/idempotency.ts",
      "src/shared/scale/idempotencyPolicies.ts",
      "src/shared/scale/jobPolicies.ts",
      "src/shared/scale/rateLimitPolicies.ts",
      "src/shared/scale/rateLimits.ts",
      "src/shared/scale/scaleObservabilityEvents.ts",
      "tests/scale/bffMutationHandlers.test.ts",
      "tests/scale/bffShadowParity.test.ts",
      "tests/scale/bffStagingServerBoundary.test.ts",
      "tests/scale/cacheIntegrationBoundary.test.ts",
      "tests/scale/catalogRequestBffMutationPorting.test.ts",
      "tests/scale/idempotencyIntegrationBoundary.test.ts",
      "tests/scale/jobsIntegrationBoundary.test.ts",
      "tests/scale/rateEnforcementBoundary.test.ts",
      "tests/scale/scaleObservabilityBoundary.test.ts",
    ]);
    const changed = changedFiles().filter(
      (file) =>
        !s50kCacheIntegrationAllowedDirtyFiles.has(file) &&
        !s50kJobsIntegrationAllowedDirtyFiles.has(file) &&
        !s50kIdempotencyIntegrationAllowedDirtyFiles.has(file) &&
        !s50kRateEnforcementAllowedDirtyFiles.has(file) &&
        !s50kObsIntegrationAllowedDirtyFiles.has(file) &&
        !sBffReadonlyRuntimeFlagWiringAllowedDirtyFiles.has(file) &&
        !sBffReadonlyMobileAuthStrategyAllowedDirtyFiles.has(file) &&
        !sBffMobileSupabaseJwtAuthWiringAllowedDirtyFiles.has(file) &&
        !s50kProviderEnvConventionsAllowedDirtyFiles.has(file) &&
        !sCatalogRequestBffMutationPortingAllowedDirtyFiles.has(file) &&
        !isApprovedSLoadFix6WarehouseIssuePatch(file),
    );
    expect(changed.some((file) => file.startsWith("scripts/server/"))).toBe(
      false,
    );
    expect(changed.some((file) => file.startsWith("scripts/scale/"))).toBe(
      false,
    );
    expect(changed.some((file) => file.startsWith("src/shared/scale/"))).toBe(
      false,
    );
    expect(
      changed.some((file) => file.startsWith("supabase/migrations/")),
    ).toBe(false);
    expect(changed).not.toEqual(
      expect.arrayContaining([
        "package.json",
        "package-lock.json",
        "app.json",
        "eas.json",
      ]),
    );
    expect(existsSync(join(root, "ios"))).toBe(false);
  });

  it("requires no production or staging env and keeps artifacts valid JSON", () => {
    const changedSources = ["src/lib/catalog/catalog.transport.ts"]
      .map(read)
      .join("\n");

    expect(changedSources).not.toMatch(
      /PROD_|STAGING_|SENTRY_|SUPABASE_REALTIME_/,
    );

    const matrix = JSON.parse(
      read("artifacts/S_PAG_7_query_pressure_reduction_matrix.json"),
    );
    expect(matrix.wave).toBe("S-PAG-7");
    expect(matrix.result.fixedCallSites).toBe(7);
    expect(matrix.intentionallyNotTouched.bffDeploy).toBe(true);
    expect(matrix.safety.productionTouched).toBe(false);
    expect(matrix.safety.stagingTouched).toBe(false);
    expect(matrix.safety.bffFilesTouched).toBe(false);
    expect(matrix.safety.otaPublished).toBe(false);
    expect(matrix.safety.easBuildTriggered).toBe(false);
    expect(matrix.safety.playMarketTouched).toBe(false);
  });
});
