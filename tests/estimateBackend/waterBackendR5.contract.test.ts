import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("BATCH-006 Water backend R5 exact closeout contracts", () => {
  it("owns the professional corpus only in the backend release package", () => {
    for (const file of ["canonicalParameterSchemas.ts", "domainPackage.ts", "index.ts", "inventory.ts", "productionBinding.ts", "technologyProfiles.ts"]) {
      expect(existsSync(resolve(root, "src/lib/estimate/v4/domains/waterSupplySewerageComplete", file))).toBe(false);
    }
    expect(existsSync(resolve(root, "src/lib/ai/expandedComplexWorks/s2b/domains/waterSewerStorm.ts"))).toBe(false);
    expect(read("src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1.ts")).not.toContain("waterSupplySewerageComplete");
    expect(read("src/lib/ai/expandedComplexWorks/s2b/registry.ts")).not.toContain("waterSewerStorm");
  });

  it("builds dynamic R_final content without the stale 50,303/7,479 admission constants", () => {
    const builder = read("scripts/estimate/waterBackendR3/buildWaterBackendRelease.ts");
    const admission = read("scripts/estimate/waterBackendR3/runWaterServerMassAdmission.ts");
    const model = read("scripts/estimate/waterBackendR3/waterR5ProfessionalModel.ts");
    expect(builder).toContain('schemaVersion: "batch006-water-backend-release.r5"');
    expect(builder).toContain("definitionSchemaVersion: 5");
    expect(admission).toContain("EXPECTED_WATER_ROWS");
    expect(admission).toContain("target_release_id=$1");
    expect(`${builder}\n${admission}`).not.toMatch(/50_?303|7_?479|ba8dcd9c/i);
    expect(model).not.toMatch(/(?:прочее|miscellaneous).*(?:percent|процент)/i);
    expect(read("scripts/estimate/waterBackendR3/buildConstraintAwareWaterScenarios.ts"))
      .toContain("VALIDATED_IDEMPOTENT_RECALCULATION_REPLAY");
  });

  it("requires exact prepared R5 lineage and one atomic R5 queue transition", () => {
    const migration = read("supabase/migrations/20260815100000_batch006_water_backend_r3.sql");
    expect(migration).toContain("r.status = 'prepared' and r.schema_version = 5");
    expect(migration).toContain("'batch006-water-r5:' || v_target.id::text");
    expect(migration).toContain("estimate_cleanup_release_admission_runtime_v3");
    expect(migration).toContain("release contains runtime outside the exact admission owner");
    expect(migration).toContain("batch007_execution_started = false");
  });

  it("fails closed on Web and true Android bundle ownership reachability", () => {
    const web = read("scripts/e2e/runCanonicalEstimateWebR3.ts");
    const native = read("scripts/e2e/runCanonicalEstimateNativeMainActivityR3.ts");
    for (const source of [web, native]) {
      expect(source).toContain("FRONTEND_WATER_OWNER");
      expect(source).toContain("CLIENT_WATER_COMPILER_REACHABILITY");
    }
    expect(web).toContain("WATER_CORPUS_IN_WEB_BUNDLE");
    expect(native).toContain("WATER_CORPUS_IN_NATIVE_BUNDLE");
    expect(native).toContain("/.MainActivity");
    expect(native).toContain('const EXPECTED_API = "34"');
  });

  it("seals only after independent audit, dual full-Jest replay and runtime residue zero", () => {
    const finalizer = read("scripts/estimate/waterBackendR3/runWaterR5FinalSealActivation.ts");
    expect(finalizer).toContain("WATER_INDEPENDENT_AUDIT_REPORT.json");
    expect(finalizer).toContain("WATER_R5_VERIFICATION_FULL_JEST_1.json");
    expect(finalizer).toContain("WATER_R5_VERIFICATION_FULL_JEST_2.json");
    expect(finalizer).toContain("estimate_cleanup_release_admission_runtime_v3");
    expect(finalizer).toContain("estimate_seal_domain_release_admission_v3");
    expect(finalizer).toContain("estimate_activate_water_release_and_rebase_v3");
  });
});
