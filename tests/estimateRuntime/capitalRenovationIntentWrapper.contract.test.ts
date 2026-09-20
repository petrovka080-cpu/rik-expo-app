import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { parseCapitalRenovationPrompt } from "../../src/features/estimates/calculator/families/capitalRenovationGeometry";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import {
  approveCanonicalConsumerRepairAuditDraft,
  createCanonicalConsumerRepairAuditDraft,
} from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";

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
    const bundle = createCanonicalConsumerRepairAuditDraft({
      consumerUserId: "capital-renovation-intent-wrapper-buyer",
      problemText: BUYER_PROMPT,
      repairType: aiDraft.repairType,
      city: "Bishkek",
      addressText: "Bishkek, staging-rc-redacted-address",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const approved = approveCanonicalConsumerRepairAuditDraft({
      bundle,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-10T00:00:00.000Z",
    });
    const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
    const revision = approved.estimateDraftRevisionState?.revisions.find(
      (candidate) => candidate.revisionId === approved.estimateDraftRevisionState?.currentRevisionId,
    );

    expect(handoff.revisionId).toBe(revision?.revisionId);
    expect(handoff.snapshotId).toBe(
      revision?.artifacts.snapshotId ?? `canonical_backend_snapshot:${revision?.revisionId}`,
    );
    expect(handoff.items.length).toBeGreaterThan(30);
    expect(handoff.items.every((item) => String(item.itemType) !== "work")).toBe(true);
    expect(handoff.items.every((item) => item.sourcePrompt === BUYER_PROMPT)).toBe(true);
    expect(handoff.items.every((item) => item.priceStatus === "PRICE_MISSING")).toBe(true);
    expect(JSON.stringify(approved).toLowerCase()).not.toMatch(/rfq|warehouse|payment/);
  });
});
