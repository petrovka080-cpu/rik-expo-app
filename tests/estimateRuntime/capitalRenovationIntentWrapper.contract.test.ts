import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { parseCapitalRenovationPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationGeometry";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";

const BUYER_PROMPT = "Пакет закупок для ремонта квартиры 154 м2";
const HISTORY_PROMPT = "История ревизий и PDF для ремонта квартиры 154 м2";

function draftFor(prompt: string) {
  return buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Bishkek" });
}

describe("capital renovation intent wrappers", () => {
  it("unwraps buyer and history intent prompts into apartment renovation BOQ rows", () => {
    for (const prompt of [BUYER_PROMPT, HISTORY_PROMPT]) {
      const parsed = parseCapitalRenovationPrompt(prompt);
      const draft = draftFor(prompt);

      expect(parsed.matched).toBe(true);
      expect(parsed.areaM2).toBe(154);
      expect(draft.repairType).toBe("apartment_capital_renovation");
      expect(draft.items.length).toBeGreaterThan(30);
      expect(draft.items.some((item) => item.itemType !== "work")).toBe(true);
      expect(draft.items.every((item) => item.unitPrice == null)).toBe(true);
      expect(draft.summaryRu).toMatch(/цены не заполнены|итог не рассчитан/i);
    }
  });

  it("keeps buyer package bound to the approved snapshot without RFQ or warehouse mutation", () => {
    __resetConsumerRepairRequestStoreForTests();
    const aiDraft = draftFor(BUYER_PROMPT);
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "capital-renovation-intent-wrapper-buyer",
      problemText: BUYER_PROMPT,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "Bishkek, staging-rc-redacted-address",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-10T00:00:00.000Z",
    });
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    const revision = approved.estimateRevisionState?.revisions.find(
      (candidate) => candidate.revision_id === approved.estimateRevisionState?.current_revision_id,
    );

    expect(handoff.revisionId).toBe(revision?.revision_id);
    expect(handoff.snapshotId).toBe(revision?.snapshot_id);
    expect(handoff.items.length).toBeGreaterThan(30);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
    expect(handoff.items.every((item) => item.sourcePrompt === BUYER_PROMPT)).toBe(true);
    expect(handoff.items.every((item) => item.priceStatus === "PRICE_MISSING")).toBe(true);
    expect(JSON.stringify(approved).toLowerCase()).not.toMatch(/rfq|warehouse|payment/);
  });
});
