import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("work ontology closeout release verify lineage", () => {
  it("returns the written release verify artifact with lineage fields", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/workOntology10000.shared.ts"),
      "utf8",
    );

    expect(source).toContain('writeWaveJson("release_verify_results.json", release)');
    expect(source).toContain('return readWaveJson("release_verify_results.json") ?? release');
  });

  it("does not treat proof-only artifact commits as source code head", () => {
    const source = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/workOntology10000.shared.ts"),
      "utf8",
    );

    expect(source).toContain("commitTouchesOnlyGeneratedProofArtifacts");
    expect(source).toContain('startsWith("artifacts/")');
    expect(source).not.toContain("commitTouchesOnlyWaveArtifacts");
  });
});
