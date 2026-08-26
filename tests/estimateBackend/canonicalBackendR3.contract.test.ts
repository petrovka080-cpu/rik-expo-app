import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("MASTER 11610 canonical backend R3 production contracts", () => {
  it("rejects silent old-release recalculation without relying on SQL NULL truthiness", () => {
    const sql = read(
      "supabase/migrations/20260814190000_estimate_canonical_backend_platform_r2.sql",
    );
    expect(sql).not.toContain("jsonb_object_length(");
    expect(sql).toContain("if v_release_migration is null");
    expect(sql).toContain(
      "explicit revision release migration contract required",
    );
    expect(sql).toContain(
      "v_release_migration ->> 'fromReleaseId' <> v_parent.release_id::text",
    );
    expect(sql).toContain(
      "v_release_migration ->> 'toReleaseId' <> v_target_release_id::text",
    );
  });

  it("keeps the production client on authenticated HTTPS without a local fallback", () => {
    const client = read(
      "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
    );
    expect(client).toContain("CANONICAL_ESTIMATE_FUNCTION_URL_REQUIRES_HTTPS");
    expect(client).toContain("Authorization: `Bearer ${token}`");
    expect(client).not.toMatch(
      /localhost|127\.0\.0\.1|dev[-_ ]?bearer|test[-_ ]?bearer/i,
    );
    expect(read("src/lib/supabaseClient.ts")).not.toContain(
      "EXPO_PUBLIC_PROOF_RUNNER_DISABLE_SUPABASE_AUTH_PERSISTENCE",
    );
  });

  it("uses an explicit browser-origin allowlist on both estimate ingress functions", () => {
    for (const path of [
      "supabase/functions/canonical-estimate/index.ts",
      "supabase/functions/calculate-global-estimate/index.ts",
    ]) {
      const source = read(path);
      expect(source).toContain("ESTIMATE_ALLOWED_ORIGINS");
      expect(source).toContain('"Vary": "Origin"');
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("keeps the request prompt field presentation-only and compiler-free", () => {
    const promptField = read(
      "src/features/requests/components/WorkEstimatePromptField.tsx",
    );
    expect(promptField).not.toContain("require(");
    expect(promptField).not.toContain("deriveWorkPromptState");
    expect(promptField).toContain("buildLightweightPromptState");
  });

  it("builds PDF and procurement only from the exact immutable revision projection", () => {
    const worker = read(
      "supabase/functions/canonical-estimate-worker/index.ts",
    );
    const artifactContract = read(
      "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
    );
    expect(worker).toContain("selectCanonicalArtifactRows(rowData ?? [])");
    expect(worker).toContain("buildCanonicalProcurementProjection");
    expect(artifactContract).toContain("revisionId: String(revision.id)");
    expect(artifactContract).toContain(
      "releaseId: String(revision.release_id)",
    );
    expect(artifactContract).toContain(
      "revisionChecksumSha256: String(revision.checksum_sha256)",
    );
    expect(artifactContract).toContain(
      "parameters: objectValue(revision.input_parameters)",
    );
    expect(artifactContract).toContain(
      "revisionTotals: objectValue(revision.totals)",
    );
    expect(artifactContract).toContain("includedInProcurement: true");
    expect(artifactContract).toContain("includesExcludedDisposition: false");
    expect(worker).toContain("Позиции и нормативные ссылки");
    expect(worker).not.toMatch(/compileJob\([^)]*artifact/i);
  });

  it("keeps exact release identity in the professional composer and data-binds it invisibly in public consumer history", () => {
    const composer = read(
      "src/components/estimate/ProfessionalEstimateComposer.tsx",
    );
    const consumerHistory = read(
      "src/features/consumerRepair/ConsumerRepairHistory.tsx",
    );
    const consumerPdf = read(
      "src/features/consumerRepair/ConsumerRepairPdfRow.tsx",
    );
    expect(composer).toContain("canonical-estimate-release-id");
    expect(composer).toContain("код {revision.releaseId}");
    expect(consumerHistory).toContain(
      "primaryConsumerRepairCanonicalBackendBinding",
    );
    expect(consumerHistory).toContain(
      'testID="consumer-repair-history-selected-release-id"',
    );
    expect(consumerHistory).not.toContain("sourceReleaseId");
    expect(consumerPdf).toContain(
      "primaryConsumerRepairCanonicalBackendBinding",
    );
    expect(consumerPdf).toContain(
      'testID="consumer-repair-history-release-id"',
    );
    expect(consumerPdf).not.toContain("release {canonical.releaseId}");
  });

  it("chains covering recalculation scenarios through the latest immutable child revision", () => {
    const admission = read(
      "scripts/estimate/backendMigration/runConstraintAwareCanonicalEstimateAdmissionR2.ts",
    );
    expect(admission).toContain(
      "for (let variantIndex = 0; variantIndex < maximumVariantCount; variantIndex += 1)",
    );
    expect(admission).toContain(
      "parentRevisionId: parentByCatalog.get(definition.catalog_id)!",
    );
    expect(admission).toContain(
      "for (const scenario of round) parentByCatalog.set(scenario.catalogId, scenario.revisionId)",
    );
    expect(admission).not.toContain(
      "const recalculateRequests = definitions.flatMap",
    );
  });

  it("independently fingerprints the byte-preserved R1 projection instead of R2-only columns", () => {
    const audit = read(
      "scripts/estimate/backendMigration/auditR3IndependentReleaseAdmission.ts",
    );
    expect(audit).toContain("r.source_manifest_sha256");
    expect(audit).toContain(
      "r.checksum_sha256,r.compiler_version,r.migration_source,r.created_at",
    );
    expect(audit).toContain("rr.legacy_row_payload,rr.row_sha256");
    expect(audit).not.toContain(
      '["release", "select id::text k,to_jsonb(r)::text payload',
    );
    expect(audit).not.toContain(
      '["revisions", "select r.id::text k,to_jsonb(r)::text payload',
    );
  });

  it("keeps local worker failure and retry scheduling aligned with the production worker", () => {
    const gateway = read(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    );
    expect(gateway).toContain("estimate_fail_compile_job_v2");
    expect(gateway).not.toContain("estimate_fail_compile_job_v1");
    expect(gateway).toContain('code === "REVISION_COMMIT_RETRYABLE"');
    expect(gateway).toContain("expectedOptimisticLoser");
    expect(gateway).toContain("if (!expectedOptimisticLoser)");
    expect(gateway).toContain("if (rawRetryDelayMs != null)");
    expect(gateway).toContain(
      "scheduleRetryDrain(retryDelayMs + 100, connectionString)",
    );
  });

  it("projects only well-formed authenticated Supabase UUIDs into the local fixture owner", () => {
    const gateway = read(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    );
    expect(gateway).toContain("LOCAL_AUTHENTICATED_USER_ID_RE");
    expect(gateway).toContain(
      'LOCAL_AUTHENTICATED_USER_ID_RE.test(String(claims?.sub ?? ""))',
    );
    expect(gateway).not.toContain("claims?.sub === OWNER_ID");
  });

  it("keeps fixture auth disjoint from strict request-scoped Supabase principals", () => {
    const gateway = read(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    );
    expect(gateway).toContain(
      '"DETERMINISTIC_FIXTURE" | "STRICT_SESSION_INTROSPECTION"',
    );
    expect(gateway).toContain('LOCAL_AUTH_MODE === "DETERMINISTIC_FIXTURE"');
    expect(gateway).toContain(
      "CANONICAL_ESTIMATE_SUPABASE_INTROSPECTION_CONFIG_REQUIRED",
    );
    expect(gateway).toContain(
      "CANONICAL_ESTIMATE_STRICT_ARTIFACT_SECRET_REQUIRED",
    );
    expect(gateway).toContain("authorizationValues.length !== 1");
    expect(gateway).toContain("appMetadata.membership_id");
    expect(gateway).toContain("appMetadata.role");
    expect(gateway).toContain("CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_RPC");
    expect(gateway).toContain("SUPABASE_PRINCIPAL_RPC_RE");
    expect(gateway).toContain(
      "`\${SUPABASE_AUTH_URL}/rest/v1/rpc/\${SUPABASE_PRINCIPAL_RPC}`",
    );
    expect(gateway).toContain("resolvedPrincipal.membership_id");
    expect(gateway).toContain("resolvedPrincipal.tenant_id");
    expect(gateway).toContain("resolvedPrincipal.resolved_role");
    expect(gateway).toContain(
      "Supabase principal is inactive or has stale claims",
    );
    expect(gateway).toContain("sessionReference");
    expect(gateway).toContain("correlationId");
    expect(gateway).toContain("AUTH_PROVIDER_UNAVAILABLE");
    expect(gateway).toContain("introspection.status !== 429");
    expect(gateway).toContain("credentialRejected ? 401 : 503");
    expect(gateway).toContain(
      'R3_CAPABILITY_TENANT_BINDING === "request-principal"',
    );
    expect(gateway).toContain("resolveCandidateCapabilityId(client)");
    expect(gateway).toContain("capabilityId: candidateCapabilityId");
    expect(gateway).toContain("capability.tenant_id=$2");
    expect(gateway).toContain(
      "request principal candidate capability is ambiguous",
    );
    expect(gateway).toContain(
      "resolveRequestOrganizationId(body.organizationId)",
    );
    expect(gateway).not.toContain("body.organizationId ?? null");
  });

  it("shares immutable canonical revisions only inside the verified tenant", () => {
    const gateway = read(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    );
    expect(gateway).toContain(
      "where id=$1 and (owner_user_id=$2 or organization_id=$3)",
    );
    expect(gateway).toContain(
      "where (owner_user_id=$1 or organization_id=$2) and catalog_id=$3",
    );
    expect(gateway).toContain(
      "and (r.owner_user_id=$3 or r.organization_id=$4)",
    );
    expect(gateway).toContain(
      "where attachment_id=$1 and (owner_user_id=$2 or tenant_id=$3)",
    );
    expect(gateway).toContain("parentInPrincipalScope");
    expect(gateway).toContain("currentTenantId()");
    expect(gateway).toContain("request.estimate_tenant_id_r541");
    expect(gateway).toContain('code: "NOT_FOUND"');
    expect(gateway).not.toContain(
      '"select * from public.estimate_revision where id=$1 and owner_user_id=$2"',
    );
    expect(gateway).toContain(
      '"select * from public.estimate_draft where id=$1 and owner_user_id=$2"',
    );
    expect(gateway).toContain(
      '"select * from public.estimate_compile_job where id=$1 and owner_user_id=$2"',
    );
    const tenantAccessMigration = read(
      "supabase/migrations/20260825180000_r541_strict_tenant_revision_access.sql",
    );
    expect(tenantAccessMigration).toContain(
      "current_setting('request.estimate_tenant_id_r541', true)",
    );
    expect(tenantAccessMigration).toContain(
      "revision.organization_id=p_test_organization_id",
    );
    expect(tenantAccessMigration).not.toContain(
      "revision.owner_user_id=p_test_owner_user_id",
    );
    const tenantWriterMigration = read(
      "supabase/migrations/20260825183000_r541_tenant_safe_revision_writer.sql",
    );
    expect(tenantWriterMigration).toContain(
      "v_parent_revision.organization_id is distinct from v_job.organization_id",
    );
    expect(tenantWriterMigration).toContain(
      "v_parent_revision.owner_user_id <> v_job.owner_user_id",
    );
    expect(tenantWriterMigration).toContain(
      "position(v_old_guard in v_after) <> 0",
    );
    expect(tenantWriterMigration).toContain(
      "parent row is never mutated",
    );
  });

  it("persists immutable R6 source identity and permits branch children from historical revisions", () => {
    const gateway = read(
      "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
    );
    const revisionWriter = read(
      "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
    );
    const identityMigration = read(
      "supabase/migrations/20260818130000_one_canonical_estimate_r6_revision_identity.sql",
    );
    const historicalChildMigration = read(
      "supabase/migrations/20260818131000_one_canonical_estimate_r6_historical_child.sql",
    );

    expect(gateway).toContain("buildCanonicalRevisionIdentity");
    expect(revisionWriter).toContain(
      "sourceRequestHash: await input.hashText(sourceRequestText)",
    );
    expect(gateway).toContain(
      "source_request_text,source_request_hash,primary_measure_parameter_id",
    );
    expect(revisionWriter).toContain("input.parent?.revision_contract_version");
    expect(revisionWriter).toContain("legacyParentIdentityRecovery");
    expect(identityMigration).toContain(
      "R6 child revision changed immutable source identity",
    );
    expect(identityMigration).toContain(
      "R6 legacy parent identity recovery is invalid",
    );
    expect(historicalChildMigration).toContain(
      "R6 intentionally permits an immutable historical revision",
    );
    expect(historicalChildMigration).toContain("max+1 allocation");
  });

  it("keeps consumer revision actions in the request screen and out of the foreman composer", () => {
    const requestContainer = read(
      "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx",
    );
    const requestScreen = read(
      "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx",
    );
    expect(requestContainer).not.toContain("ProfessionalEstimateComposer");
    expect(requestContainer).not.toContain("canonicalComposerVisible");
    expect(requestScreen).not.toContain("onOpenCanonicalEstimate");
    expect(requestScreen).toContain(
      "openExactCanonicalRevisionInConsumerEditor",
    );
    expect(requestScreen).toContain("onLoadCanonicalParameterSession");
  });

  it("cleans release jobs before their parent revisions and samples final native requests", () => {
    const functionalGates = read(
      "scripts/estimate/backendMigration/runR3BackendFunctionalGates.ts",
    );
    const jobDelete = functionalGates.indexOf(
      "delete from public.estimate_compile_job where id=any",
    );
    const revisionDelete = functionalGates.indexOf(
      "delete from public.estimate_revision where id=any",
    );
    expect(jobDelete).toBeGreaterThan(-1);
    expect(revisionDelete).toBeGreaterThan(jobDelete);

    const nativeE2e = read(
      "scripts/e2e/runCanonicalEstimateNativeMainActivityR3.ts",
    );
    expect(nativeE2e).toContain('input", "keycombination", "113", "29"');
    expect(nativeE2e).toContain("const finalRequestRows = await waitForAudit");
    expect(nativeE2e).toContain(
      "PREVIOUSLY_ACKNOWLEDGED_IDEMPOTENT_LAUNCH_MANUAL_ACTION_PROVEN",
    );
  });
});
