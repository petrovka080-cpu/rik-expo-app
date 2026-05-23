import {
  BUILT_IN_AI_10000_CATEGORY_SUMMARY,
  BUILT_IN_AI_10000_GLOBAL_CATEGORY_SUMMARY,
} from "../../src/lib/ai/builtInAi10000";
import { getAi10000Artifacts } from "./ai10000TestHelpers";

describe("built-in AI 10000 category coverage", () => {
  it("covers the full 100-domain manifest and keeps category artifacts", () => {
    const { categorySummary, matrix } = getAi10000Artifacts();

    expect(Object.keys(BUILT_IN_AI_10000_CATEGORY_SUMMARY)).toHaveLength(100);
    expect(Object.values(BUILT_IN_AI_10000_CATEGORY_SUMMARY).reduce((sum, value) => sum + value, 0)).toBe(10000);
    expect(Object.values(BUILT_IN_AI_10000_GLOBAL_CATEGORY_SUMMARY).reduce((sum, value) => sum + value, 0)).toBe(10000);
    expect(categorySummary).toEqual({
      domains: BUILT_IN_AI_10000_CATEGORY_SUMMARY,
      globalCategories: BUILT_IN_AI_10000_GLOBAL_CATEGORY_SUMMARY,
    });
    expect(matrix.chat_all_cases_passed).toBe(true);
  });
});
