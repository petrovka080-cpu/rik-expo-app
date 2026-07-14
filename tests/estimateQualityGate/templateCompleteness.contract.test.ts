import { goodQualityGate } from "./estimateQualityGateTestHelpers";

describe("template completeness quality", () => {
  it("requires professional template rows", () => {
    expect(goodQualityGate().checks.template_completeness_passed).toBe(true);
  });
});
