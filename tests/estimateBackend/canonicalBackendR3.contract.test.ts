import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("MASTER 11610 canonical backend R3 production contracts", () => {
  it("rejects silent old-release recalculation without relying on SQL NULL truthiness", () => {
    const sql = read("supabase/migrations/20260814190000_estimate_canonical_backend_platform_r2.sql");
    expect(sql).not.toContain("jsonb_object_length(");
    expect(sql).toContain("if v_release_migration is null");
    expect(sql).toContain("explicit revision release migration contract required");
    expect(sql).toContain("v_release_migration ->> 'fromReleaseId' <> v_parent.release_id::text");
    expect(sql).toContain("v_release_migration ->> 'toReleaseId' <> v_target_release_id::text");
  });

  it("keeps the production client on authenticated HTTPS without a local fallback", () => {
    const client = read("src/lib/estimate/backendPlatform/canonicalEstimateClient.ts");
    expect(client).toContain("CANONICAL_ESTIMATE_FUNCTION_URL_REQUIRES_HTTPS");
    expect(client).toContain("Authorization: `Bearer ${token}`");
    expect(client).not.toMatch(/localhost|127\.0\.0\.1|dev[-_ ]?bearer|test[-_ ]?bearer/i);
    expect(read("src/lib/supabaseClient.ts")).not.toContain("EXPO_PUBLIC_PROOF_RUNNER_DISABLE_SUPABASE_AUTH_PERSISTENCE");
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
    const promptField = read("src/features/requests/components/WorkEstimatePromptField.tsx");
    expect(promptField).not.toContain("require(");
    expect(promptField).not.toContain("deriveWorkPromptState");
    expect(promptField).toContain("buildLightweightPromptState");
  });

  it("builds PDF and procurement only from the exact immutable revision projection", () => {
    const worker = read("supabase/functions/canonical-estimate-worker/index.ts");
    expect(worker).toContain("revisionId: revision.id");
    expect(worker).toContain("releaseId: revision.release_id");
    expect(worker).toContain("revisionChecksumSha256: revision.checksum_sha256");
    expect(worker).toContain("parameters: revision.input_parameters");
    expect(worker).toContain("revisionTotals: revision.totals");
    expect(worker).toContain("includedInProcurement: row.included_in_procurement");
    expect(worker).toContain("includesExcludedDisposition: true");
    expect(worker).toContain("Позиции и нормативные ссылки");
    expect(worker).not.toMatch(/compileJob\([^)]*artifact/i);
  });

  it("shows exact release identity in composer history and artifact-bound consumer history", () => {
    const composer = read("src/components/estimate/ProfessionalEstimateComposer.tsx");
    const consumerHistory = read("src/features/consumerRepair/ConsumerRepairHistory.tsx");
    const consumerPdf = read("src/features/consumerRepair/ConsumerRepairPdfRow.tsx");
    expect(composer).toContain("canonical-estimate-release-id");
    expect(composer).toContain("release {revision.releaseId}");
    expect(consumerHistory).toContain("sourceReleaseId");
    expect(consumerPdf).toContain("release {canonical.releaseId}");
  });

  it("chains covering recalculation scenarios through the latest immutable child revision", () => {
    const admission = read("scripts/estimate/backendMigration/runConstraintAwareCanonicalEstimateAdmissionR2.ts");
    expect(admission).toContain("for (let variantIndex = 0; variantIndex < maximumVariantCount; variantIndex += 1)");
    expect(admission).toContain("parentRevisionId: parentByCatalog.get(definition.catalog_id)!");
    expect(admission).toContain("for (const scenario of round) parentByCatalog.set(scenario.catalogId, scenario.revisionId)");
    expect(admission).not.toContain("const recalculateRequests = definitions.flatMap");
  });

  it("independently fingerprints the byte-preserved R1 projection instead of R2-only columns", () => {
    const audit = read("scripts/estimate/backendMigration/auditR3IndependentReleaseAdmission.ts");
    expect(audit).toContain("r.source_manifest_sha256");
    expect(audit).toContain("r.checksum_sha256,r.compiler_version,r.migration_source,r.created_at");
    expect(audit).toContain("rr.legacy_row_payload,rr.row_sha256");
    expect(audit).not.toContain('["release", "select id::text k,to_jsonb(r)::text payload');
    expect(audit).not.toContain('["revisions", "select r.id::text k,to_jsonb(r)::text payload');
  });

  it("keeps local worker failure and retry scheduling aligned with the production worker", () => {
    const gateway = read("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
    expect(gateway).toContain("estimate_fail_compile_job_v2");
    expect(gateway).not.toContain("estimate_fail_compile_job_v1");
    expect(gateway).toContain('code === "REVISION_COMMIT_RETRYABLE"');
    expect(gateway).toContain("if (rawRetryDelayMs != null)");
    expect(gateway).toContain("scheduleRetryDrain(retryDelayMs + 100, connectionString)");
  });

  it("persists immutable R6 source identity and permits branch children from historical revisions", () => {
    const gateway = read("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
    const identityMigration = read("supabase/migrations/20260818130000_one_canonical_estimate_r6_revision_identity.sql");
    const historicalChildMigration = read("supabase/migrations/20260818131000_one_canonical_estimate_r6_historical_child.sql");

    expect(gateway).toContain('sourceRequestHash: createHash("sha256").update(sourceRequestText, "utf8").digest("hex")');
    expect(gateway).toContain("source_request_text,source_request_hash,primary_measure_parameter_id");
    expect(gateway).toContain('input.parent?.revision_contract_version');
    expect(gateway).toContain("legacyParentIdentityRecovery");
    expect(identityMigration).toContain("R6 child revision changed immutable source identity");
    expect(identityMigration).toContain("R6 legacy parent identity recovery is invalid");
    expect(historicalChildMigration).toContain("R6 intentionally permits an immutable historical revision");
    expect(historicalChildMigration).toContain("max+1 allocation");
  });

  it("keeps consumer revision actions in the request screen and out of the foreman composer", () => {
    const requestContainer = read("src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx");
    const requestScreen = read("src/features/consumerRepair/ConsumerRepairRequestScreen.tsx");
    expect(requestContainer).not.toContain("ProfessionalEstimateComposer");
    expect(requestContainer).not.toContain("canonicalComposerVisible");
    expect(requestScreen).not.toContain("onOpenCanonicalEstimate");
    expect(requestScreen).toContain("openExactCanonicalRevisionInConsumerEditor");
    expect(requestScreen).toContain("onLoadCanonicalParameterSession");
  });

  it("cleans release jobs before their parent revisions and samples final native requests", () => {
    const functionalGates = read("scripts/estimate/backendMigration/runR3BackendFunctionalGates.ts");
    const jobDelete = functionalGates.indexOf('delete from public.estimate_compile_job where id=any');
    const revisionDelete = functionalGates.indexOf('delete from public.estimate_revision where id=any');
    expect(jobDelete).toBeGreaterThan(-1);
    expect(revisionDelete).toBeGreaterThan(jobDelete);

    const nativeE2e = read("scripts/e2e/runCanonicalEstimateNativeMainActivityR3.ts");
    expect(nativeE2e).toContain('input", "keycombination", "113", "29"');
    expect(nativeE2e).toContain('const finalRequestRows = await waitForAudit');
    expect(nativeE2e).toContain('PREVIOUSLY_ACKNOWLEDGED_IDEMPOTENT_LAUNCH_MANUAL_ACTION_PROVEN');
  });
});
