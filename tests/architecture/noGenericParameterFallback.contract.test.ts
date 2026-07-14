import { readFileSync } from "node:fs";

const NORMATIVE_SOURCE_FILES = [
  "src/lib/estimate/aiEstimateNormativeWorkParameterPassport.ts",
  "src/lib/estimate/buildNormativeParameterCompletenessModel.ts",
  "src/lib/estimate/buildAiEstimateMissingInputQuestions.ts",
  "src/lib/estimate/buildAiEstimateQuantityExplanationTrace.ts",
  "src/lib/estimate/buildAiEstimateParameterCards.ts",
];

describe("normative parameter architecture", () => {
  it("does not hardcode a capital-repair-only path or introduce a second estimate engine", () => {
    const source = NORMATIVE_SOURCE_FILES.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).toContain("buildProfessionalWorkPassport");
    expect(source).not.toMatch(/capitalRepair|capital_repair|caprepair|капремонт-only|hardcoded_capital/i);
    expect(source).not.toMatch(/secondEstimateEngine|new EstimateEngine|fallbackEstimateEngine/i);
    expect(source).not.toMatch(/test\.only|describe\.only|it\.only|test\.skip|describe\.skip|it\.skip/);
  });
});
