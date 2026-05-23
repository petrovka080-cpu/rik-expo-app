import { assertSourceBackedGlobalEstimate } from "../../src/lib/ai/globalEstimate";
import { calculateEstimateForPrompt } from "../estimateIntent/anyEstimateTestHelpers";

describe("every priced row has source evidence", () => {
  it("fails no rows in the normal source-backed estimate path", () => {
    const { result } = calculateEstimateForPrompt("заасфальтировать парковку 3500 м2");
    const guard = assertSourceBackedGlobalEstimate(result);

    expect(guard).toEqual({ passed: true, blockers: [] });
    expect(result.sections.flatMap((section) => section.rows).every((row) => row.sourceEvidence.length > 0)).toBe(true);
  });
});
