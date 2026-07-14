import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair";

const KNOWN_REQUEST_PROMPTS = [
  "смета на укладку ламината 100 м2 в Бишкеке",
  "смета на укладку кафельной плитки 174 м2 в Бишкеке",
  "смета на установку ГКЛ 352 м2 в Бишкеке",
];

const GENERIC_SHORT_ROW = /^(?:Осмотр|Строительные работы|Ремонтные работы|Ремонтные работы после согласования)$/i;

describe("AI estimate persistence short generic guard", () => {
  it("does not collapse known request estimates into generic two-row drafts", () => {
    for (const prompt of KNOWN_REQUEST_PROMPTS) {
      const aiDraft = buildConsumerRepairAiDraft(prompt, { city: "Bishkek" });
      const names = aiDraft.items.map((item) => item.titleRu.replace(/^\d+(?:\.\d+)*\s+/, "").trim());

      expect(aiDraft.structuredEstimatePayload?.version).toBe("structured-estimate-v1");
      expect(aiDraft.structuredEstimatePayload?.rows.length).toBeGreaterThanOrEqual(10);
      expect(aiDraft.items).toHaveLength(aiDraft.structuredEstimatePayload?.rows.length ?? 0);
      expect(names.some((name) => GENERIC_SHORT_ROW.test(name))).toBe(false);
    }
  });
});
