import { BUILT_IN_AI_1000_CATEGORY_SUMMARY } from "../../src/lib/ai/builtInAi1000/builtInAi1000ConstructionCases";
import { getAi1000Artifacts } from "./ai1000TestHelpers";

describe("built-in AI 1000 category coverage", () => {
  it("covers the full 20-block manifest and keeps category artifacts", () => {
    const { categorySummary, matrix } = getAi1000Artifacts();

    expect(Object.keys(BUILT_IN_AI_1000_CATEGORY_SUMMARY)).toHaveLength(20);
    expect(Object.values(BUILT_IN_AI_1000_CATEGORY_SUMMARY).reduce((sum, value) => sum + value, 0)).toBe(1000);
    expect(categorySummary).toEqual(BUILT_IN_AI_1000_CATEGORY_SUMMARY);
    expect(matrix.chat_all_cases_passed).toBe(true);
  });
});
