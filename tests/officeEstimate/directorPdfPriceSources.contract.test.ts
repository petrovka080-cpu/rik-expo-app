import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";

const PROMPT = "Капитальный ремонт квартиры 54 кв метра";

describe("director PDF price sources contract", () => {
  it("shows price source, confidence, conversion, and missing state per BOQ row", () => {
    __resetConsumerRepairRequestStoreForTests();
    const aiDraft = buildConsumerRepairAiDraft(PROMPT);
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "director-pdf-price-source-test",
      problemText: PROMPT,
      repairType: "apartment_capital_renovation",
      city: "Bishkek",
      addressText: "Bishkek test",
      contactPhone: "+996700000000",
      aiDraft,
    });
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-02T00:00:00.000Z",
    });

    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    expect(pdf).toBeTruthy();

    const sourceLabels = pdf!.sections.flatMap((section) => section.rows.flatMap((row) => row.sourceLabels));
    expect(sourceLabels.length).toBeGreaterThan(0);
    expect(sourceLabels.every((label) => /\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b|\u0426\u0435\u043d\u0430 \u043d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d\u0430/.test(label))).toBe(true);
    expect(sourceLabels.some((label) => /\u0442\u043e\u0447\u043d\u043e\u0441\u0442\u044c (\u0432\u044b\u0441\u043e\u043a\u0430\u044f|\u0441\u0440\u0435\u0434\u043d\u044f\u044f|\u043d\u0438\u0437\u043a\u0430\u044f)/.test(label))).toBe(true);
    expect(sourceLabels.some((label) => /\u0440\u0430\u0441\u0447\u0435\u0442/.test(label))).toBe(true);
    expect(sourceLabels.every((label) => !/raw_ai_json|```|\{".*":/.test(label))).toBe(true);
  });
});
