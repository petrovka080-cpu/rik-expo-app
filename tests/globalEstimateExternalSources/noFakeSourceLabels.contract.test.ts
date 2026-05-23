import { isFakeGlobalEstimateSourceLabel } from "../../src/lib/ai/globalEstimate";
import { calculateEstimateForPrompt } from "../estimateIntent/anyEstimateTestHelpers";

describe("no fake source labels", () => {
  it("rejects fake source copy and normal estimates avoid it", () => {
    expect(isFakeGlobalEstimateSourceLabel("данные приложения")).toBe(true);
    expect(isFakeGlobalEstimateSourceLabel("internet")).toBe(true);

    const { result } = calculateEstimateForPrompt("покрасить стены 80 м2");
    const labels = result.sections.flatMap((section) => section.rows).flatMap((row) => row.sourceEvidence).map((source) => source.label);
    expect(labels.every((label) => !isFakeGlobalEstimateSourceLabel(label))).toBe(true);
  });
});
