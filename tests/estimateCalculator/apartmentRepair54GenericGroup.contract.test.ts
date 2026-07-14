import { capitalRenovationDraft, CAPITAL_RENOVATION_54_PROMPT } from "./capitalRenovationTestHelpers";

describe("apartment repair 54 professional calculator", () => {
  it("uses deterministic capital renovation rows instead of one-off area multiplier rows", () => {
    const draft = capitalRenovationDraft(CAPITAL_RENOVATION_54_PROMPT);
    const quantities54 = draft.items.filter((item) => item.quantity === 54);

    expect(draft.structuredEstimatePayload).toBeFalsy();
    expect(draft.repairType).toBe("apartment_capital_renovation");
    expect(draft.items.length).toBeGreaterThanOrEqual(60);
    expect(draft.items.every((item) => item.templateId && item.templateVersion && item.formulaId && item.calculationTrace)).toBe(true);
    expect(quantities54.length / draft.items.length).toBeLessThan(0.1);
    expect(draft.items.every((item) => item.sourceParameters?.capitalRenovationCalculator === true)).toBe(true);
    expect(new Set(draft.items.map((item) => item.unit)).size).toBeGreaterThan(8);
    expect(draft.items.map((item) => item.titleRu).join("\n")).not.toMatch(/Комплект расходных|работы на объекте/i);
  });
});
