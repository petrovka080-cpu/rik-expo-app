import { buildConsumerRepairAiDraft, composeConsumerRepairDraftAnswerRu } from "../../src/features/consumerRepair";

describe("consumer repair AI draft contract", () => {
  it("returns result-first repair request draft for laminate flooring", () => {
    const draft = buildConsumerRepairAiDraft("Хочу уложить ламинат на 100 кв м");
    const answer = composeConsumerRepairDraftAnswerRu(draft);

    expect(draft.repairType).toBe("flooring");
    expect(draft.items.find((item) => item.titleRu === "Ламинат")?.quantity).toBe(110);
    expect(draft.items.find((item) => item.titleRu === "Подложка")?.quantity).toBe(105);
    expect(answer.startsWith("Коротко:")).toBe(true);
    expect(answer).not.toMatch(/не найдено|интернет не использовался|PDF не найден/i);
  });
});
