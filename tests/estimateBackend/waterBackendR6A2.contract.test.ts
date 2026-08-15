import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("BATCH-006 Water backend R6 A2 contracts", () => {
  it("keeps Water compilation backend-native and the frontend corpus-free", () => {
    for (const file of ["canonicalParameterSchemas.ts", "domainPackage.ts", "index.ts", "inventory.ts", "productionBinding.ts", "technologyProfiles.ts"]) {
      expect(existsSync(resolve(root, "src/lib/estimate/v4/domains/waterSupplySewerageComplete", file))).toBe(false);
    }
    expect(read("src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1.ts")).not.toContain("waterSupplySewerageComplete");
    expect(read("src/lib/ai/expandedComplexWorks/s2b/registry.ts")).not.toContain("waterSewerStorm");
  });

  it("binds the immutable R6 package to 845 global and 29 external Water definitions", () => {
    const model = read("scripts/estimate/waterBackendR3/waterDomainModel.ts");
    const builder = read("scripts/estimate/waterBackendR3/buildWaterBackendRelease.ts");
    const importer = read("scripts/estimate/waterBackendR3/importWaterBackendRelease.ts");
    expect(model).toContain("WATER_BACKEND_GLOBAL_CATALOG_IDS = 845");
    expect(model).toContain("WATER_BACKEND_EXPECTED_CATALOG_IDS = WATER_BACKEND_GLOBAL_CATALOG_IDS + WATER_BACKEND_A2_EXTERNAL_IDS");
    expect(builder).toContain('schemaVersion: "batch006-water-backend-release.r6-a2"');
    expect(builder).toContain("newlyAddedExternalWater");
    expect(importer).toContain("manifest.waterDelta.globalDefinitions !== 845");
    expect(importer).toContain("manifest.waterDelta.externalDefinitions !== 29");
  });

  it("enforces individual depth, atomic row traceability and explicit unknown inputs", () => {
    const model = read("scripts/estimate/waterBackendR3/waterDomainModel.ts");
    const professional = read("scripts/estimate/waterBackendR3/waterR5ProfessionalModel.ts");
    const mutations = read("scripts/estimate/waterBackendR3/runWaterR5ControlledMutations.ts");
    expect(professional).toContain("ENGINEERING_INPUT_REQUIRED");
    expect(model).toContain("dimensionSignature");
    expect(model).toContain("applicabilityConditionId");
    expect(model).toContain("normValueOrInputRule");
    expect(model).toContain("wasteRule");
    expect(mutations).toContain("L3: 200, L4: 400, L5: 700");
    expect(professional).not.toMatch(/miscellaneous.*percent|padding.*row count/i);
  });

  it("uses two independent clean oracles and resumable all-ID admission", () => {
    const first = read("scripts/estimate/waterBackendR3/runWaterR6A2FirstRepairedOracle.mjs");
    const second = read("scripts/estimate/waterBackendR3/runWaterR6A2SecondCleanOracle.mjs");
    const admission = read("scripts/estimate/waterBackendR3/runWaterServerMassAdmission.ts");
    expect(first).not.toContain('from "./waterDomainModel"');
    expect(second).not.toContain('from "./waterDomainModel"');
    expect(first).not.toEqual(second);
    expect(admission).toContain("water-admission-resume-checkpoint.r6-a2");
    expect(admission).toContain("EXPECTED_DEFINITIONS");
    expect(admission).toContain("EXPECTED_WATER_ROWS");
  });

  it("keeps the explicit rollback safe on a pristine predecessor clone", () => {
    const rollback = read("supabase/rollback/20260815100000_batch006_water_backend_r3.down.sql");
    expect(rollback).toContain("to_regclass('public.estimate_professional_passport') is not null");
    expect(rollback).toContain("to_regclass('public.estimate_domain_release_admission_seal') is not null");
    expect(rollback).toContain("drop column if exists water_domain_complete");
    expect(rollback).not.toContain("or exists (select 1 from public.estimate_professional_passport)");
  });

  it("records the operator-deferred Full Jest state without pretending it ran", () => {
    const verification = read("scripts/estimate/waterBackendR3/runWaterR5VerificationGate.ts");
    expect(verification).toContain("FULL_JEST=DEFERRED_BY_OPERATOR_NOT_RUN");
    expect(verification).toContain('executed: false');
    expect(verification).toContain('status: "DEFERRED_BY_OPERATOR_NOT_RUN"');
  });

  it("requires exact-ID real Web and native MainActivity API34 lifecycle matrices", () => {
    const web = read("scripts/e2e/runWaterR6A2WebMatrix50.ts");
    const android = read("scripts/e2e/runWaterR6A2NativeMainActivityMatrix50.ts");
    const composer = read("src/components/estimate/ProfessionalEstimateComposer.tsx");
    const localGateway = read("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts");
    const edgeGateway = read("supabase/functions/canonical-estimate/index.ts");
    expect(web).toContain("REAL_PLAYWRIGHT_CHROMIUM_RENDERED_WEB_UI");
    expect(web).toContain("helperBypass: false");
    expect(web).toContain("expected: 50");
    expect(android).toContain('const EXPECTED_API = "34"');
    expect(android).toContain('const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`');
    expect(android).toContain("chromeOrWebViewSubstitution: false");
    expect(android).toContain("expected: 50");
    expect(android).toContain("observed === value");
    expect(android).toContain('value.match(/[\\s\\S]{1,32}/g)');
    expect(android).toContain("partialNode?.text !== expectedPrefix");
    expect(android).toContain('row.method === "POST"');
    expect(android).toContain("EXACT_CHILD_RETRY_REENTRY_FAILED");
    expect(composer).toContain('testID="canonical-estimate-artifact-pdf"');
    expect(composer).toContain('testID="canonical-estimate-artifact-procurement"');
    expect(composer).toContain('testID="canonical-estimate-open-artifact-pdf-top"');
    expect(composer).toContain('testID="canonical-estimate-open-artifact-procurement-top"');
    expect(composer).not.toContain("if (artifact.signedUrl) await Linking.openURL(artifact.signedUrl)");
    expect(composer).toContain('testID={`canonical-estimate-open-latest-revision-${history[0].revisionId}`}');
    expect(composer).toContain('testID="canonical-estimate-recalculate-top"');
    expect(composer).toContain('testID="canonical-estimate-expand-parameters"');
    expect(localGateway).toContain("catalog_id ilike");
    expect(localGateway).toContain("let drainRequested = false");
    expect(localGateway).toContain("drainRequested = true");
    expect(localGateway).toContain("while (drainRequested)");
    expect(edgeGateway).toContain("catalog_id.ilike");
  });

  it("keeps local Android cleartext proof isolated from the production release manifest", () => {
    const gradle = read("android/app/build.gradle");
    const productionManifest = read("android/app/src/main/AndroidManifest.xml");
    const proofManifest = read("android/app/src/waterProof/AndroidManifest.xml");
    expect(gradle).toContain("waterProof");
    expect(gradle).toContain("initWith release");
    expect(productionManifest).not.toContain("usesCleartextTraffic");
    expect(proofManifest).toContain('android:usesCleartextTraffic="true"');
  });

  it("measures compile execution separately from queue wait while preserving 50-parallel truth", () => {
    const performance = read("scripts/estimate/waterBackendR3/runWaterR5A1PerformanceGate.ts");
    expect(performance).toContain("SERVER_EXECUTION_STARTED_TO_COMPLETED");
    expect(performance).toContain("ENQUEUED_TO_COMPLETED_REPORTED_SEPARATELY");
    expect(performance).toContain("concurrentCompileJobs: { expected: 50");
    expect(performance).toContain("compileRecalculateP95MaxMs: 1_500");
  });

  it("compares replay WOW lifecycle semantics without runtime-generated artifact bytes", () => {
    const seal = read("scripts/estimate/waterBackendR3/sealWaterR5A1Replay.ts");
    const compare = read("scripts/estimate/waterBackendR3/compareWaterR5A1Replays.ts");
    expect(seal).not.toContain("pdfBytes: row.pdf.bytes");
    expect(seal).toContain("immutableParentRejected: row.immutable_parent_rejected");
    expect(seal).toContain("parentChecksumPreserved: row.parent_checksum_before === row.parent_checksum_after");
    expect(seal).toContain("childParentExact: row.child_parent_exact");
    expect(seal).toContain("pdfReleaseId: row.pdf.releaseId");
    expect(seal).toContain("procurementReleaseId: row.procurement.releaseId");
    expect(compare).toContain('"wowSemanticSha256"');
  });
});
