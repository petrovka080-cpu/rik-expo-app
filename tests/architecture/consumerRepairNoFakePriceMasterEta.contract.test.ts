import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";

describe("consumer repair no fake price master ETA architecture contract", () => {
  it("does not invent fixed prices, masters, suppliers, or ETAs in the AI draft", () => {
    const draft = buildConsumerRepairAiDraft("ламинат 100 кв м");
    const payload = JSON.stringify(draft).toLowerCase();

    expect(draft.items.every((item) => item.unitPrice == null)).toBe(true);
    expect(payload).not.toMatch(/мастер\s*№|поставщик|eta|точная цена|наличие подтверждено/);
  });
});
