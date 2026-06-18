import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";

const KNOWN_WORK_CASES = [
  { text: "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043b\u0430\u043c\u0438\u043d\u0430\u0442\u0430 50 \u043c2", explicitWorkKey: "laminate_laying", volume: 50, unit: "sq_m" },
  { text: "\u043a\u043b\u0430\u0434\u043a\u0430 \u043a\u0438\u0440\u043f\u0438\u0447\u0430 30 \u043c2", explicitWorkKey: "brick_masonry", volume: 30, unit: "sq_m" },
  { text: "\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 800 \u043c2", explicitWorkKey: "asphalt_paving", volume: 800, unit: "sq_m" },
  { text: "\u043c\u043e\u043d\u0442\u0430\u0436 \u043e\u043a\u043e\u043d 4 \u0448\u0442", explicitWorkKey: "window_installation", volume: 4, unit: "pcs" },
  { text: "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u043a\u0440\u043e\u0432\u043b\u0438 120 \u043c2", explicitWorkKey: "roof_waterproofing", volume: 120, unit: "sq_m" },
] as const;

describe("known work expanded templates", () => {
  it.each(KNOWN_WORK_CASES)("never falls back to generic draft rows for $explicitWorkKey", (input) => {
    const result = calculateGlobalConstructionEstimateSync({
      ...input,
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
      currency: "KGS",
    });
    const rowText = result.sections.flatMap((section) => section.rows).map((row) => `${row.code}\n${row.name}`).join("\n");

    expect(result.outputContract.detailLevel).toBe("professional_expanded");
    expect(rowText).not.toMatch(/generic|fallback|other_construction_work/i);
    expect(rowText).not.toContain("\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b:");
    expect(rowText).not.toContain("\u0414\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u0440\u0430\u0431\u043e\u0442\u044b:");
  });
});
