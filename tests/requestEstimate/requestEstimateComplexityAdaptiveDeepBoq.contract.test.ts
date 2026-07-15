import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateBoqDepth,
} from "../../src/lib/ai/globalEstimate";
import { parseUniversalConstructionQuantities } from "../../src/lib/ai/constructionFormulas";

function estimateFromText(text: string) {
  return calculateGlobalConstructionEstimateSync({
    text,
    language: "ru",
    countryCode: "KG",
    city: "Bishkek",
  });
}

function expectCleanDepth(result: ReturnType<typeof calculateGlobalConstructionEstimateSync>) {
  const depth = validateEstimateBoqDepth(result);

  expect(depth.passed).toBe(true);
  expect(depth.blockers).toEqual([]);
  expect(depth.genericRows).toEqual([]);
  expect(depth.artificialPaddingRows).toEqual([]);
  expect(depth.duplicateSemanticSignatures).toEqual([]);
  expect(depth.actualRows).toBeGreaterThanOrEqual(depth.minimumRows);

  return depth;
}

const W159_SCREEN_FOUNDATION_PROMPT =
  "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u044d\u043a\u0440\u0430\u043d\u0430 3 \u043e\u0431\u044a\u0435\u043a\u0442; \u0442\u0438\u043f \u0440\u0430\u0431\u043e\u0442: \u0448\u0443\u043c\u043e\u0437\u0430\u0449\u0438\u0442\u043d\u044b\u0435 \u044d\u043a\u0440\u0430\u043d\u044b";

const STRIP_FOUNDATION_PROMPT =
  "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0435\u043d\u0442\u043e\u0447\u043d\u044b\u0439 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u0434\u043b\u0438\u043d 48 \u043c\u0435\u0442\u0440\u043e\u0432 \u0448\u0438\u0440\u0438\u043d\u0430 0,4 \u043c, \u0438 \u0432\u044b\u0441\u043e\u0442\u0430 1.7 \u043c";

const SOLAR_PLANT_100_MW_PROMPT =
  "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0441\u043e\u043b\u043d\u0435\u0447\u043d\u0443\u044e \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u0441\u0442\u0430\u043d\u0446\u0438\u044e 100 \u041c\u0412\u0442";

describe("request estimate complexity-adaptive deep BOQ", () => {
  it("keeps a W159-style screen foundation at full professional depth", () => {
    const result = estimateFromText(W159_SCREEN_FOUNDATION_PROMPT);
    const depth = expectCleanDepth(result);

    expect(result.work.workKey).toBe("dynamic_foundation_estimate");
    expect(depth.complexityProfile.level).toBe("full_professional");
    expect(depth.minimumRows).toBe(46);
  });

  it("keeps strip foundation formula output and full BOQ depth together", () => {
    const result = estimateFromText(STRIP_FOUNDATION_PROMPT);
    const depth = expectCleanDepth(result);
    const concreteRow = result.sections
      .flatMap((section) => section.rows)
      .find((row) => row.code === "strip_foundation_concrete_m300");

    expect(result.work.workKey).toBe("strip_foundation");
    expect(depth.complexityProfile.level).toBe("full_professional");
    expect(depth.minimumRows).toBe(46);
    expect(concreteRow?.quantity).toBeCloseTo(32.64, 2);
  });

  it("treats a 100 MW solar plant as industrial infrastructure with deep WBS rows", () => {
    const result = estimateFromText(SOLAR_PLANT_100_MW_PROMPT);
    const depth = expectCleanDepth(result);

    expect(parseUniversalConstructionQuantities(SOLAR_PLANT_100_MW_PROMPT).powerKw).toBe(100000);
    expect(result.work.workKey).toBe("solar_panel_installation");
    expect(depth.complexityProfile.level).toBe("industrial_infrastructure");
    expect(depth.minimumRows).toBe(200);
    expect(depth.actualRows).toBeGreaterThanOrEqual(200);
  });

  it("applies the same deep BOQ gate to expanded-complex 100 MW solar estimates", () => {
    const result = estimateFromText("solar power plant 100 MW");
    const depth = expectCleanDepth(result);

    expect(parseUniversalConstructionQuantities("solar power plant 100 MW").powerKw).toBe(100000);
    expect(result.work.workKey).toBe("solar_power_plant");
    expect(depth.complexityProfile.level).toBe("mega_project");
    expect(depth.minimumRows).toBe(500);
    expect(depth.actualRows).toBeGreaterThanOrEqual(500);
  });
});
