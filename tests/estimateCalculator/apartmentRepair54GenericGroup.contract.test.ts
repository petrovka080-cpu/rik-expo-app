import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

const PROMPT = "\u041a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b 54 \u043a\u0432 \u043c\u0435\u0442\u0440\u0430";

describe("apartment repair 54 generic group", () => {
  it("uses a template group with row formulas and does not emit one-off area multiplier rows", () => {
    const draft = buildConsumerRepairAiDraft(PROMPT);
    const rows = draft.structuredEstimatePayload?.rows ?? [];
    const quantities54 = rows.filter((row) => row.quantity === 54);

    expect(draft.structuredEstimatePayload?.workKey).toBe("apartment_capital_renovation");
    expect(rows.length).toBeGreaterThanOrEqual(100);
    expect(rows.every((row) => row.templateId && row.templateVersion && row.formulaId && row.calculationTrace)).toBe(true);
    expect(quantities54.length / rows.length).toBeLessThan(0.1);
    expect(rows.every((row) => row.sourceParameters?.projectTemplateGroupKey === "apartment_capital_renovation")).toBe(true);
    expect(new Set(rows.map((row) => row.unit)).size).toBeGreaterThan(5);
  });
});
