import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const source = readFileSync(
  resolve(root, "scripts/estimate/r4/prepareR41OfficialAndroidSurfaceCandidate.ts"),
  "utf8",
);

describe("R4.1 official Android four-case surface successor candidate", () => {
  it("is locked to the disposable database and the prepared aggregate parent", () => {
    expect(source).toContain("R41_ANDROID_SURFACE_NON_DISPOSABLE_DATABASE_DENIED");
    expect(source).toContain("rik_r4_runtime_b5_v2");
    expect(source).toContain("17_OFFICIAL_SURFACE_AGGREGATE_CANDIDATE_R41.json");
    expect(source).toContain("18_OFFICIAL_ANDROID_SURFACE_CANDIDATE_R41.json");
    expect(source).toContain("19_OFFICIAL_ANDROID_SURFACE_BASELINE_SUCCESSOR_R41.json");
    expect(source).toContain("GREEN_R41_OFFICIAL_SURFACE_AGGREGATE_CANDIDATE_PREPARED_NOT_ACTIVE");
    expect(source).toContain("R41_ANDROID_SURFACE_PARENT_BINDING_RED");
  });

  it("ports exactly four direct canonical definitions through the existing compiler", () => {
    expect(source).toContain("R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS");
    expect(source).toContain("compileR41SurfaceDefinitionRows");
    expect(source).toContain("r41OfficialAndroidSurfaceDefinitions");
    expect(source).toContain("direct_parameters: directParameterCount");
    expect(source).toContain("direct_formulas: directRowCount");
    expect(source).toContain("direct_resources: directRowCount");
    expect(source).toContain("direct_baselines: R41_OFFICIAL_ANDROID_SURFACE_DEFINITIONS.length");
    expect(source).toContain("estimate_approved_template_baseline");
    expect(source).toContain("approved_template_baseline_id is not null");
    expect(source).toContain("CUMULATIVE_MANIFEST_APPROVED_BASELINE_REQUIRED");
    expect(source).toContain("const DEFINITION_VERSION = 2");
    expect(source).toContain('value_source_role: "USER_MEASURED"');
    expect(source).not.toContain('value_source_role: "USER_DECLARED"');
    expect(source).toContain('secondCompilerCreated: false');
    expect(source).toContain('runtimeOwner: "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"');
  });

  it("requires explicit apply and never activates or accesses production", () => {
    expect(source).toContain('const APPLY = process.argv.includes("--apply")');
    expect(source).toContain("R41_ANDROID_SURFACE_USAGE_ONLY_OPTIONAL_APPLY");
    expect(source).toContain('status: "prepared"');
    expect(source).toContain("activationPerformed: false");
    expect(source).toContain("R41_ANDROID_SURFACE_ACTIVE_RELEASE_MUTATED");
    expect(source).not.toMatch(/update\s+public\.estimate_definition_release\s+set\s+status='active'/iu);
    expect(source).toContain("productionAccessed: false");
    expect(source).toContain("productionDeployed: false");
    expect(source).toContain("productionReleased: false");
  });
});
