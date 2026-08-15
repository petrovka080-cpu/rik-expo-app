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

  it("records the operator-deferred Full Jest state without pretending it ran", () => {
    const verification = read("scripts/estimate/waterBackendR3/runWaterR5VerificationGate.ts");
    expect(verification).toContain("FULL_JEST=DEFERRED_BY_OPERATOR_NOT_RUN");
    expect(verification).toContain('executed: false');
    expect(verification).toContain('status: "DEFERRED_BY_OPERATOR_NOT_RUN"');
  });
});
