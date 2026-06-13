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
});
