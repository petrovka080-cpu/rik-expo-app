import {
  capitalRenovationComposition,
  capitalRenovationDraft,
  CAPITAL_RENOVATION_54_PROMPT,
  CAPITAL_RENOVATION_ACCESS_ROW_CODES,
  CAPITAL_RENOVATION_CORE_ROW_COUNT,
} from "./capitalRenovationTestHelpers";

describe("apartment repair 54 professional calculator", () => {
  it("uses deterministic capital renovation rows instead of one-off area multiplier rows", () => {
    const draft = capitalRenovationDraft(CAPITAL_RENOVATION_54_PROMPT);
    const composition = capitalRenovationComposition(draft.items);
    const quantities54 = draft.items.filter((item) => item.quantity === 54);

    expect(draft.structuredEstimatePayload).toBeFalsy();
    expect(draft.repairType).toBe("apartment_capital_renovation");
    expect(draft.items.length).toBeGreaterThanOrEqual(60);
    expect(draft.items.every((item) => item.templateId && item.templateVersion && item.formulaId && item.calculationTrace)).toBe(true);
    expect(quantities54.length / draft.items.length).toBeLessThan(0.1);
    expect(composition.coreRows).toHaveLength(CAPITAL_RENOVATION_CORE_ROW_COUNT);
    expect(composition.accessSupplementRows).toHaveLength(CAPITAL_RENOVATION_ACCESS_ROW_CODES.length);
    expect(composition.unknownRows).toEqual([]);
    expect(new Set(draft.items.map((item) => item.unit)).size).toBeGreaterThan(8);
    expect(draft.items.map((item) => item.titleRu).join("\n")).not.toMatch(/Комплект расходных|работы на объекте/i);
  });
});
