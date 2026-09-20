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
    [
      "электрика под ключ 100 кв метров площадь длина трассы 500 метров 10 розеток 10 выключателей 10 точек освещения",
      "электрика под ключ площадь длина трассы розеток выключателей точек освещения",
    ],
    ["гидроизоляция крыши 100 кв м", "гидроизоляция крыши"],
    ["смета на укладку брусчатки на 587 кв м", "укладку брусчатки"],
    ["смета на электромонтаж дома 180 кв м", "электромонтаж дома"],
    ["Построить асфальтовую дорогу длиной 15 000 м", "асфальтовую дорогу"],
    ["Построить асфальтовую дорогу длиной 15\u00a0000 м", "асфальтовую дорогу"],
    ["Построить асфальтовую дорогу длиной 15\u202f000 м", "асфальтовую дорогу"],
    ["Построить асфальтовую дорогу длиной 15 км", "асфальтовую дорогу"],
    ["асфальтирование моста 200 × 32 м", "асфальтирование моста"],
    ["асфальтирование моста 200 x 32 м", "асфальтирование моста"],
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

  test("извлекает все явно названные электрические количества для backend-компиляции", () => {
    const schema = [
      ["area_m2", "m2", "Площадь"],
      ["route_length_m", "m", "Длина трассы"],
      ["outlet_count", "pcs", "Количество розеток"],
      ["switch_count", "pcs", "Количество выключателей"],
      ["lighting_point_count", "pcs", "Количество точек освещения"],
    ].map(([parameterId, unitId, titleRu], ordinal) => ({
      parameterId,
      ordinal,
      valueType: "decimal" as const,
      unitId,
      titleRu,
      required: true,
      defaultValue: null,
      constraints: { min: 0 },
      visibilityRole: "USER_INPUT" as const,
      valueSourceRole: "USER_MEASURED" as const,
      semanticParameterKey: parameterId,
    }));
    const catalog = {
      catalogId: "electrical_turnkey_explicit_scope",
      releaseId: "00000000-0000-4000-8000-000000000001",
      namespace: "global",
      domain: "electrical",
      workKey: "electrical_turnkey_explicit_scope",
      titleRu: "Электрика под ключ по явным количествам",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: schema,
    } satisfies CanonicalEstimateCatalogItem;
    expect(buildCanonicalBaselineInputs({
      catalog,
      prompt: "электрика под ключ 100 кв метров площадь длина трассы 500 метров 10 розеток 10 выключателей 10 точек освещения",
    })).toEqual({
      area_m2: "100",
      route_length_m: "500",
      outlet_count: "10",
      switch_count: "10",
      lighting_point_count: "10",
    });
  });
});
