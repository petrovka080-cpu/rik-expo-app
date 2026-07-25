import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import {
  __resetConsumerRepairRequestStoreForTests,
  buildConsumerRepairAiDraftFromGlobalEstimate,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";

describe("director PDF norm sources", () => {
  it("renders public norm provenance without leaking internal identifiers", () => {
    __resetConsumerRepairRequestStoreForTests();
    const estimate = buildProfessionalExpandedGlobalEstimate({
      workKey: "laminate_laying",
      estimateInput: {
        text: "laminate laying 54 m2",
        estimateDetailLevel: "professional_expanded",
        countryCode: "KG",
        city: "Bishkek",
        currency: "KGS",
      },
    });
    const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate);
    const bundle = createConsumerRepairRequestDraft({
      consumerUserId: "director-pdf-norm-sources",
      problemText: "laminate laying 54 m2",
      repairType: "flooring",
      aiDraft,
    });
    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: bundle.draft,
      items: bundle.items,
      media: [],
      generatedAt: "2026-07-03T00:00:00.000Z",
    });
    const labels = pdf!.sections.flatMap((section) => section.rows.flatMap((row) => row.sourceLabels));

    expect(labels.some((label) => label.includes("certified norm"))).toBe(true);
    expect(labels.some((label) => label.includes("certified source"))).toBe(true);
    expect(labels.some((label) => label.includes("norm version"))).toBe(true);
    expect(labels.join("\n")).not.toMatch(/norm(?:Id|Source|Version)=/);
    expect(labels.join("\n")).not.toMatch(/professional_expanded_real_boq/);
    expect(labels.join("\n")).not.toMatch(/\b[a-z][a-z0-9]+(?:_[a-z0-9]+)+\b/);
  });
});
