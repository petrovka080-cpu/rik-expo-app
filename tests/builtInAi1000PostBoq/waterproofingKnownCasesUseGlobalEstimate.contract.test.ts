import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES } from "../../src/lib/ai/builtInAi1000/builtInAi1000PostBoqCatalogCases";
import { WORLD_PROMPTS } from "../worldConstruction/worldConstructionTestHelpers";

const WATERPROOFING_REGRESSION_IDS = [
  "0044",
  "0075",
  "0603",
  "0610",
  "0612",
  "0613",
  "0614",
  "0636",
  "0638",
  "0639",
  "0645",
  "0646",
  "0647",
  "0649",
  "0881",
] as const;

function caseById(id: string) {
  const testCase = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.find((item) => item.id === id);
  if (!testCase) throw new Error(`BUILT_IN_AI_1000_POST_BOQ_CASE_NOT_FOUND:${id}`);
  return testCase;
}

describe("built-in AI 1000 post-BOQ waterproofing routing", () => {
  it.each(WATERPROOFING_REGRESSION_IDS)("returns a real GlobalEstimateResult for known waterproofing case %s", (id) => {
    const testCase = caseById(id);
    const answer = answerBuiltInAi({
      text: testCase.promptRu,
      route: testCase.postBoqRoute,
      screenContext: testCase.postBoqScreenContext,
      role: testCase.postBoqRole,
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      userId: `ai1000-waterproofing-${id}`,
    });

    expect(answer.toolResult.toolName).toBe("calculate_global_estimate");
    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe(testCase.workKey);
    expect(answer.toolResult.estimate?.sections.some((section) => section.type === "materials" && section.rows.length > 0)).toBe(true);
    expect(answer.toolResult.estimate?.sections.some((section) => section.type === "labor" && section.rows.length > 0)).toBe(true);
  });

  it("keeps bare waterproofing prompts ambiguous instead of guessing the surface", () => {
    const answer = answerBuiltInAi({
      text: WORLD_PROMPTS.ambiguousWaterproofing,
      route: "/ai?context=foreman",
      screenContext: "foreman",
      role: "foreman",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
      userId: "ai1000-waterproofing-ambiguous",
    });

    expect(answer.toolResult.blockedBy).toBe("AMBIGUOUS_NEEDS_DISAMBIGUATION");
    expect(answer.toolResult.estimate).toBeUndefined();
  });
});
