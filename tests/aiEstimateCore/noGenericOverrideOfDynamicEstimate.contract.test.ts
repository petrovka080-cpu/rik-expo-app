import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";

const CASES = [
  ["смета на ПНР ИТП 1 комплект", "dynamic_boiler_itp_estimate"],
  ["смета на мониторинг температуры ЦОД 24 датчика", "dynamic_bms_estimate"],
  ["смета на дозирующая станция 1 комплект", "dynamic_water_treatment_estimate"],
  ["смета на тепловизионное обследование фасада 1200 м²", "thermal_imaging_survey"],
  ["смета на бетонная плита 200 м²", "concrete_slab"],
  ["смета на бетонная стяжка пола 80 м²", "floor_screed"],
] as const;

describe("dynamic estimator result is not overwritten by generic route", () => {
  it.each(CASES)("%s -> %s", (prompt, expectedWorkKey) => {
    const answer = answerBuiltInAi({
      text: prompt,
      route: "/request",
      screenContext: "request",
      role: "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });

    expect(answer.toolResult.blockedBy).toBeUndefined();
    expect(answer.toolResult.estimate?.work.workKey).toBe(expectedWorkKey);
    expect(answer.toolResult.estimate?.work.workKey).not.toBe("other_construction_work");
    expect(answer.toolResult.estimate?.work.workKey).not.toBe("electrical_basic");
  });
});
