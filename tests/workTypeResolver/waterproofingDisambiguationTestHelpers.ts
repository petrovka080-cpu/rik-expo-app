import { calculateGlobalConstructionEstimateSync, type GlobalEstimateResult } from "../../src/lib/ai/globalEstimate";

export type WaterproofingDisambiguationCase = {
  id: string;
  prompt: string;
  expectedWorkKeys: string[];
  forbiddenWorkKeys: string[];
  expectedCategory?: string;
  expectedRowSignals?: string[];
};

export const WATERPROOFING_DISAMBIGUATION_CASES: WaterproofingDisambiguationCase[] = [
  {
    id: "roof_plain",
    prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    expectedWorkKeys: ["roof_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedCategory: "roofing",
    expectedRowSignals: ["основания кровли", "праймер", "мембрана", "примыкан", "парапет", "нанесение", "протеч"],
  },
  {
    id: "roof_krovlya",
    prompt: "смета на гидроизоляцию кровли 100 м²",
    expectedWorkKeys: ["roof_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedCategory: "roofing",
    expectedRowSignals: ["основания кровли", "праймер", "мембрана", "примыкан", "парапет", "нанесение", "протеч"],
  },
  {
    id: "flat_roof_membrane",
    prompt: "гидроизоляция плоской кровли мембраной 150 м²",
    expectedWorkKeys: ["roof_membrane_waterproofing", "flat_roof_membrane"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedRowSignals: ["основания кровли", "мембрана", "примыкан", "парапет", "монтаж", "протеч"],
  },
  {
    id: "roof_leak",
    prompt: "ремонт протечки крыши и гидроизоляция 70 м²",
    expectedWorkKeys: ["roof_waterproofing", "roof_leak_repair"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedRowSignals: ["основания кровли", "примыкан", "протеч", "контроль"],
  },
  {
    id: "bathroom",
    prompt: "смета на гидроизоляцию ванной 30 м²",
    expectedWorkKeys: ["bathroom_waterproofing"],
    forbiddenWorkKeys: ["roof_waterproofing", "roof_membrane_waterproofing", "flat_roof_membrane"],
    expectedCategory: "waterproofing",
    expectedRowSignals: ["грунтовка", "мастика", "лента", "углов", "нанесение", "под плитку"],
  },
  {
    id: "shower",
    prompt: "гидроизоляция душевой зоны 12 м²",
    expectedWorkKeys: ["shower_tile_waterproofing", "bathroom_waterproofing"],
    forbiddenWorkKeys: ["roof_waterproofing", "roof_membrane_waterproofing", "flat_roof_membrane"],
    expectedRowSignals: ["гидроизоляц", "герметизац"],
  },
  {
    id: "foundation",
    prompt: "гидроизоляция фундамента 80 м²",
    expectedWorkKeys: ["foundation_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "waterproofing_bathroom"],
    expectedCategory: "waterproofing",
    expectedRowSignals: ["поверхности фундамента", "праймер", "мастика", "мембрана", "утеплитель", "обратная засыпка"],
  },
  {
    id: "basement",
    prompt: "гидроизоляция подвала 100 м²",
    expectedWorkKeys: ["basement_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "roof_waterproofing"],
    expectedCategory: "waterproofing",
    expectedRowSignals: ["подвала", "мембрана", "протеч"],
  },
  {
    id: "pool",
    prompt: "гидроизоляция бассейна 60 м²",
    expectedWorkKeys: ["pool_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "roof_waterproofing"],
    expectedCategory: "waterproofing",
    expectedRowSignals: ["бассейна", "мастика", "лента"],
  },
  {
    id: "floor_under_tile",
    prompt: "гидроизоляция пола перед плиткой 40 м²",
    expectedWorkKeys: ["waterproofing_under_tile", "floor_waterproofing"],
    forbiddenWorkKeys: ["bathroom_waterproofing", "roof_waterproofing"],
    expectedRowSignals: ["пола", "мастика", "под плитку"],
  },
];

export function estimateForCase(testCase: WaterproofingDisambiguationCase): GlobalEstimateResult {
  return calculateGlobalConstructionEstimateSync({
    text: testCase.prompt,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
}

export function allRowText(estimate: GlobalEstimateResult): string {
  return estimate.sections
    .flatMap((section) => section.rows.map((row) => row.name))
    .join("\n")
    .toLowerCase();
}

export function expectCaseResolves(testCase: WaterproofingDisambiguationCase): GlobalEstimateResult {
  const estimate = estimateForCase(testCase);
  expect(testCase.expectedWorkKeys).toContain(estimate.work.workKey);
  for (const forbidden of testCase.forbiddenWorkKeys) {
    expect(estimate.work.workKey).not.toBe(forbidden);
  }
  if (testCase.expectedCategory) {
    expect(estimate.work.category).toBe(testCase.expectedCategory);
  }
  return estimate;
}
