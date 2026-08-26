import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "../..");
const source = readFileSync(
  resolve(root, "scripts/estimate/r4/prepareR4OfficialSurfaceAggregateCandidate.ts"),
  "utf8",
);

describe("R4.1 official four-case surface aggregate candidate", () => {
  it("is locked to the protected disposable database and all eight backend-green releases", () => {
    expect(source).toContain("R41_OFFICIAL_SURFACE_NON_DISPOSABLE_DATABASE_DENIED");
    expect(source).toContain("rik_r4_runtime_b5_v2");
    expect(source).toContain("batches: 8");
    expect(source).toContain("workGroups: 770");
    expect(source).toContain("GREEN_BACKEND_ALL_BATCHES_SURFACES_PENDING");
  });

  it("reuses exact canonical definitions without creating a compiler or copied definition versions", () => {
    expect(source).toContain("manifestEntries: 3_318");
    expect(source).toContain("searchDocuments: 3_426");
    expect(source).toContain("selectableDocuments: 3_318");
    expect(source).toContain("externalDocuments: 108");
    expect(source).toContain("direct_definitions === 0");
    expect(source).not.toContain("insert into public.estimate_definition_version");
    expect(source).toContain('secondCompilerCreated: false');
    expect(source).toContain('runtimeOwner: "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"');
  });

  it("prepares candidate data without activation, deploy, release, or production access", () => {
    expect(source).toContain("status: \"prepared\"");
    expect(source).toContain("activationPerformed: false");
    expect(source).toContain("R41_OFFICIAL_SURFACE_ACTIVE_RELEASE_MUTATED");
    expect(source).not.toMatch(/update\s+public\.estimate_definition_release\s+set\s+status='active'/iu);
    expect(source).toContain("productionAccessed: false");
    expect(source).toContain("productionDeployed: false");
    expect(source).toContain("productionReleased: false");
  });
});
