import { canonicalWorkSearchQueryFromPrompt } from "../../src/lib/estimate/backendPlatform/canonicalEstimateSearchInput";
import { composeSelectedWorkProblemText } from "../../src/features/consumerRepair/requestEstimateScreenActions";

describe("R4.5: основной consumer-поток сметы", () => {
  test.each([
    ["бетонные тумбы 10 штук", "бетонные тумбы"],
    ["смета на бетонные тумбы 10 шт.", "бетонные тумбы"],
    ["ла", "ла"],
    ["кладка", "кладка"],
  ])("ищет работу, а количество сохраняет для компиляции: %s", (prompt, expected) => {
    expect(canonicalWorkSearchQueryFromPrompt(prompt)).toBe(expected);
  });

  test("выбор точного результата не стирает количество из исходного запроса", () => {
    const suggestion = {
      workKey: "external:concrete:r5:n:s01-019-betonnye-tumby",
      titleRu: "бетонные тумбы",
      categoryKey: "concrete" as const,
      categoryTitleRu: "Бетонные работы",
      defaultMeasureUnit: "pcs" as const,
      score: 1,
      matchKind: "exact_title" as const,
      matchedTokens: ["бетонные тумбы"],
      visibleText: "бетонные тумбы · Бетонные работы",
    };
    expect(composeSelectedWorkProblemText(suggestion, "бетонные тумбы 10 штук"))
      .toBe("бетонные тумбы 10 штук");
    expect(composeSelectedWorkProblemText(suggestion, "ла"))
      .toBe("бетонные тумбы ");
  });
});
