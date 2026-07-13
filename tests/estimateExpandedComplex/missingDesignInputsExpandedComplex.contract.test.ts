import { requireExpandedEstimate } from "./expandedComplexTestHelpers";

describe("expanded complex missing design inputs", () => {
  it("blocks detailed BOQ semantics when design inputs are absent", () => {
    const prompts = [
      "ТЭЦ 100 МВт",
      "ГЭС 5 МВт",
      "мост 30 м",
      "дамба земляная 200 м высота 5 м",
    ];

    for (const prompt of prompts) {
      const estimate = requireExpandedEstimate(prompt);
      expect(estimate.estimate_level).toBe("PRELIMINARY_BOQ");
      expect(estimate.missing_design_inputs.length).toBeGreaterThan(0);
      expect(estimate.limitations.join(" ")).toMatch(/предварительная BOQ|не рабочий проект/i);
      expect(estimate.price_state.finalTotalAllowed).toBe(false);
      expect(estimate.calculation_trace.join("\n")).not.toMatch(/final total|grand total|проектный расчет конструкций/i);
    }
  });
});
