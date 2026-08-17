import { canonicalWorkSearchQueryFromPrompt } from "../../src/lib/estimate/backendPlatform/canonicalEstimateSearchInput";
import { composeSelectedWorkProblemText } from "../../src/features/consumerRepair/requestEstimateScreenActions";
import { buildCanonicalBaselineInputs } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";

describe("R4.5: основной consumer-поток сметы", () => {
  test.each([
    ["бетонные тумбы 10 штук", "бетонные тумбы"],
    ["смета на бетонные тумбы 10 шт.", "бетонные тумбы"],
    ["ла", "ла"],
    ["кладка", "кладка"],
    ["монтаж ламината на большой площади 1547 кв метров", "монтаж ламината на большой площади"],
  ])("ищет работу, а количество сохраняет для компиляции: %s", (prompt, expected) => {
    expect(canonicalWorkSearchQueryFromPrompt(prompt)).toBe(expected);
  });

  test.each([
    "1547 м²",
    "1547 м2",
    "1547 кв метров",
    "1547 квадратных метров",
  ])("передаёт площадь %s в параметр backend, а не оставляет значение по умолчанию", (quantityText) => {
    const catalog = {
      catalogId: "flooring_interior_laminate_install_large_area",
      releaseId: "00000000-0000-4000-8000-000000000001",
      namespace: "global",
      domain: "flooring",
      workKey: "flooring_interior_laminate_install_large_area",
      titleRu: "Монтаж ламината на большой площади",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [{
        parameterId: "area_m2",
        ordinal: 0,
        valueType: "decimal",
        unitId: "m2",
        titleRu: "Площадь пола",
        required: true,
        defaultValue: "1",
        constraints: { min: 0.01 },
        semanticParameterKey: "floor_area_m2",
      }],
    } satisfies CanonicalEstimateCatalogItem;
    expect(buildCanonicalBaselineInputs({
      catalog,
      prompt: `монтаж ламината ${quantityText}`,
    }).area_m2).toBe("1547");
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
