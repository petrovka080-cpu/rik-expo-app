import { evaluateProfessionalEstimatorQuality } from "../../src/lib/ai/professionalQuality";
import { weakCanopyEstimate } from "./professionalEstimatorQualityTestHelpers";

describe("professional estimator quality rubric weak rows", () => {
  it("fails standalone generic BOQ rows", () => {
    const report = evaluateProfessionalEstimatorQuality(weakCanopyEstimate());
    expect(report.passed).toBe(false);
    expect(report.weakGenericRows).toEqual(expect.arrayContaining([
      "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b",
      "\u043c\u043e\u043d\u0442\u0430\u0436",
      "\u0440\u0430\u0431\u043e\u0442\u044b",
      "\u043a\u0440\u0435\u043f\u0451\u0436",
    ]));
    expect(report.blockers.some((blocker) => blocker.startsWith("WEAK_GENERIC_ROWS"))).toBe(true);
  });
});
