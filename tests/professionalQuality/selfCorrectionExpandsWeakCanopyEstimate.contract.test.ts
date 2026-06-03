import {
  evaluateProfessionalEstimatorQuality,
  selfCorrectProfessionalEstimate,
} from "../../src/lib/ai/professionalQuality";
import { allRowNames, weakCanopyEstimate } from "./professionalEstimatorQualityTestHelpers";

describe("professional estimator self-correction", () => {
  it("expands weak metal canopy rows into a professional BOQ", () => {
    const corrected = selfCorrectProfessionalEstimate(weakCanopyEstimate());
    const names = allRowNames(corrected).join("\n");
    const report = evaluateProfessionalEstimatorQuality(corrected);

    expect(report.passed).toBe(true);
    expect(report.weakGenericRows).toEqual([]);
    expect(names).toContain("\u043c\u043e\u043d\u0442\u0430\u0436 \u0441\u0442\u0440\u043e\u043f\u0438\u043b\u044c\u043d\u043e\u0439 \u0441\u0438\u0441\u0442\u0435\u043c\u044b \u043d\u0430\u0432\u0435\u0441\u0430");
    expect(names).toContain("\u043a\u0440\u0435\u043f\u0451\u0436 \u0434\u043b\u044f \u043f\u0440\u043e\u0444\u043d\u0430\u0441\u0442\u0438\u043b\u0430");
    expect(names).toContain("\u0441\u0432\u0430\u0440\u043e\u0447\u043d\u044b\u0435 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0434\u043b\u044f \u0444\u0435\u0440\u043c");
  });
});
