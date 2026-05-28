import { buildConsumerRepairAiDraft, composeConsumerRepairDraftAnswerRu } from "../../src/features/consumerRepair";

describe("consumer repair AI draft contract", () => {
  it("returns result-first repair request draft for laminate flooring", () => {
    const draft = buildConsumerRepairAiDraft("Хочу уложить ламинат на 100 кв м");
    const answer = composeConsumerRepairDraftAnswerRu(draft);

    expect(draft.repairType).toBe("flooring");
    expect(draft.items.find((item) => item.titleRu.includes("Ламинат"))?.quantity).toBe(110);
    expect(draft.items.find((item) => item.titleRu.includes("Подложка"))?.quantity).toBe(105);
    expect(answer.startsWith("Коротко:")).toBe(true);
    expect(answer).not.toMatch(/не найдено|интернет не использовался|PDF не найден/i);
  });

  it("keeps missing-location warning visible when request form has no city", () => {
    const draft = buildConsumerRepairAiDraft("смета на кладку кирпича 74 кв метров", { city: "" });
    const visibleText = [draft.summaryRu, ...draft.missingData].join("\n").toLocaleLowerCase("ru-RU");

    expect(visibleText).toContain("регион не указан");
    expect(visibleText).toContain("уточните страну/город");
    expect(visibleText).not.toContain("точная локальная цена");
  });
});
