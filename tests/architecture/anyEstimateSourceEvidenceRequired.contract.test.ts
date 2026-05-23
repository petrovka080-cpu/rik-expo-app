import { assertSourceBackedGlobalEstimate } from "../../src/lib/ai/globalEstimate";
import { calculateEstimateForPrompt } from "../estimateIntent/anyEstimateTestHelpers";

describe("any estimate source evidence required", () => {
  it("source-backed guard passes only when priced rows carry evidence", () => {
    const { result } = calculateEstimateForPrompt("тротуарная плитка 500 м2");

    expect(assertSourceBackedGlobalEstimate(result)).toEqual({ passed: true, blockers: [] });
    expect(result.sections.flatMap((section) => section.rows).every((row) => row.priceStatus === "priced" && row.sourceEvidence.length > 0)).toBe(true);
  });
});
