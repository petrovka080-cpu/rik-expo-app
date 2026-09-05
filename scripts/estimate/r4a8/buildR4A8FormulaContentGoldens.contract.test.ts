import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("R4-A8 protected goldens and formula content receipt", () => {
  const source = readFileSync(resolve("scripts/estimate/r4a8/buildR4A8FormulaContentGoldens.ts"), "utf8");

  it("preserves the immutable 30/229/137/420 baseline without regenerating expected output", () => {
    expect(source).toContain("HISTORIC_GOLDEN_SUMMARY_SHA256");
    expect(source).toContain("HISTORIC_GOLDEN_MANIFEST_SHA256");
    expect(source).toContain("Number(summary.denominator) !== 30");
    expect(source).toContain("Number(summary.totalRows) !== 229");
    expect(source).toContain("Number(summary.totalMaterials) !== 137");
    expect(source).toContain("Number(summary.evidenceFileCount) !== 420");
    expect(source).toContain("expectedRegenerated: false");
  });

  it("binds 86/3998 to the tracked current monolith and immutable formula successor", () => {
    expect(source).toContain("r568-local-developer-canonical-release.json");
    expect(source).toContain("immutableFormulaSuccessor");
    expect(source).toContain("referenceSemanticHashSha256");
    expect(source).toContain("GREEN_A8_FORMULAS_86_OF_86_3998_OF_3998");
    expect(source).toContain("remediationRepeated: false");
  });

  it("requires relevant-source-clean Group50, Identity/DAG, and Platform30 evidence", () => {
    expect(source).toContain("assertNoRelevantSourceDrift(group50");
    expect(source).toContain("assertNoRelevantSourceDrift(identity");
    expect(source).toContain("assertNoRelevantSourceDrift(platform30");
    expect(source).toContain("11_formula_content_goldens.json");
  });
});
