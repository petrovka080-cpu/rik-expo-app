import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { BUILT_IN_AI_1000_CONSTRUCTION_CASES } from "../../src/lib/ai/builtInAi1000/builtInAi1000ConstructionCases";

function findCase(id: string) {
  const testCase = BUILT_IN_AI_1000_CONSTRUCTION_CASES.find((item) => item.id === id);
  if (!testCase) throw new Error(`MISSING_BUILT_IN_AI_1000_CASE:${id}`);
  return testCase;
}

describe("built-in AI waterproofing exact route estimates", () => {
  it.each(["0044", "0075", "0610", "0612", "0613", "0645", "0881"])(
    "uses the governed estimate when waterproofing case %s has an exact work key",
    (id) => {
      const testCase = findCase(id);
      const answer = answerBuiltInAi({
        text: testCase.promptRu,
        screenContext: "chat",
        route: "/chat",
        role: "unknown",
        userId: "ai-1000-waterproofing-regression",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      });

      expect(answer.route.intent).toBe("estimate");
      expect(answer.route.workKey).toBe(testCase.workKey);
      expect(answer.toolResult.blockedBy).toBeUndefined();
      expect(answer.toolResult.estimate?.work.workKey).toBe(testCase.workKey);
      expect(answer.toolResult.estimate?.outputContract.format).toBe("professional_boq");
      expect(answer.actions.some((action) => action.id === "make_pdf" && action.visible)).toBe(true);
    },
  );

  it("still asks for object disambiguation on generic waterproofing", () => {
    const answer = answerBuiltInAi({
      text: "гидроизоляция 100 кв м",
      screenContext: "chat",
      route: "/chat",
      role: "unknown",
      userId: "ai-1000-waterproofing-regression",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });

    expect(answer.toolResult.blockedBy).toBe("AMBIGUOUS_NEEDS_DISAMBIGUATION");
    expect(answer.toolResult.estimate).toBeUndefined();
  });
});
