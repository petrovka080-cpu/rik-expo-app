import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import {
  validateProfessionalExpandedEstimate,
} from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";

function rowCount(result: ReturnType<typeof calculateGlobalConstructionEstimateSync>): number {
  return result.sections.reduce((sum, section) => sum + section.rows.length, 0);
}

const CASES = [
  {
    label: "laminate",
    input: {
      text: "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043b\u0430\u043c\u0438\u043d\u0430\u0442\u0430 154 \u043c2",
      explicitWorkKey: "laminate_laying",
      volume: 154,
      unit: "sq_m",
    },
    workKey: "laminate_laying",
    minimumRows: 25,
  },
  {
    label: "foundation rebar",
    input: {
      text: "\u0430\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442\u0430 2 \u0442",
      explicitWorkKey: "foundation_rebar_reinforcement",
      volume: 2,
      unit: "ton",
    },
    workKey: "foundation_rebar_reinforcement",
    minimumRows: 25,
  },
  {
    label: "fire alarm",
    input: {
      text: "\u043f\u043e\u0436\u0430\u0440\u043d\u0430\u044f \u0441\u0438\u0433\u043d\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u044f 18 \u0442\u043e\u0447\u0435\u043a",
      volume: 18,
      unit: "pcs",
    },
    workKey: "fire_alarm_installation",
    minimumRows: 30,
  },
  {
    label: "brick masonry",
    input: {
      text: "\u043a\u043b\u0430\u0434\u043a\u0430 \u043a\u0438\u0440\u043f\u0438\u0447\u0430 74 \u043c2",
      explicitWorkKey: "brick_masonry",
      volume: 74,
      unit: "sq_m",
    },
    workKey: "brick_masonry",
    minimumRows: 25,
  },
  {
    label: "asphalt",
    input: {
      text: "\u0430\u0441\u0444\u0430\u043b\u044c\u0442\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435 10000 \u043c2",
      explicitWorkKey: "asphalt_paving",
      volume: 10000,
      unit: "sq_m",
    },
    workKey: "asphalt_paving",
    minimumRows: 25,
  },
] as const;

describe("minimum expanded rows by work type", () => {
  it.each(CASES)("$label returns a professional expanded estimate", ({ input, workKey, minimumRows }) => {
    const result = calculateGlobalConstructionEstimateSync({
      ...input,
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
      currency: "KGS",
    });
    const validation = validateProfessionalExpandedEstimate(result);

    expect(result.outputContract.detailLevel).toBe("professional_expanded");
    expect(result.work.workKey).toBe(workKey);
    expect(rowCount(result)).toBeGreaterThanOrEqual(minimumRows);
    expect(validation.passed).toBe(true);
  });
});
