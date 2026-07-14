import { readFileSync } from "node:fs";

const FILES = [
  "src/lib/estimate/buildAiEstimateParameterCards.ts",
  "src/lib/estimate/applyAiEstimateParameterOverrides.ts",
  "src/lib/estimate/recalculateAiEstimateFromParameters.ts",
  "src/lib/estimate/aiEstimateParameterSchema.ts",
];

describe("parameter cards architecture", () => {
  it("uses the existing estimate revision pipeline and does not introduce a second estimate engine", () => {
    const sources = FILES.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources).toContain("recalculateEstimateDraftRevision");
    expect(sources).toContain("buildProfessionalWorkPassport");
    expect(sources).not.toMatch(/CalcModal|old picker|OldEstimatePicker|SecondEstimateEngine|new EstimateEngine/i);
    expect(sources).not.toMatch(/from [\"'].*estimateEngine.*[\"']/i);
  });
});
