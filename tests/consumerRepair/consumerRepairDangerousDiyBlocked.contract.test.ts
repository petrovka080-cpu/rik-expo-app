import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";

describe("consumer repair dangerous DIY blocked contract", () => {
  it("turns dangerous DIY requests into specialist requests", () => {
    const draft = buildConsumerRepairAiDraft("Хочу чинить газ и проводку под напряжением сам");

    expect(draft.dangerousDiyBlocked).toBe(true);
    expect(draft.summaryRu).toContain("Не выполняйте ремонт самостоятельно");
    expect(draft.summaryRu).toContain("специалист");
  });
});
