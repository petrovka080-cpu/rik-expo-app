import { approveConsumerRepairRequestDraft } from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { capitalRenovationBundle, CAPITAL_RENOVATION_98_PROMPT } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("capital renovation 98 grouped PDF", () => {
  it("builds the PDF view model from the saved snapshot rows with grouped sections and quantities", () => {
    const bundle = capitalRenovationBundle(CAPITAL_RENOVATION_98_PROMPT);
    const approved = approveConsumerRepairRequestDraft({
      requestDraftId: bundle.draft.id,
      userId: bundle.draft.consumerUserId,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });

    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    if (!pdf) throw new Error("PDF view model missing");

    const rows = pdf.sections.flatMap((section) => section.rows);
    const publicText = rows.flatMap((row) => [
      row.sectionTitle,
      row.name,
      row.quantity,
      row.unitPrice,
      row.total,
      ...row.sourceLabels,
    ]).join("\n");

    expect(pdf.sections.map((section) => section.title)).toEqual(expect.arrayContaining([
      "\u0427\u0435\u0440\u043d\u043e\u0432\u044b\u0435 \u043f\u043e\u043b\u044b",
      "\u0421\u0442\u0435\u043d\u044b",
      "\u0421\u0430\u043d\u0443\u0437\u043b\u044b",
      "\u042d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430",
      "\u0421\u0430\u043d\u0442\u0435\u0445\u043d\u0438\u043a\u0430",
    ]));
    expect(rows).toHaveLength(approved.items.length);
    expect(publicText).toContain("98 \u043c\u00b2");
    expect(publicText).toContain("9\u00a0702 \u043a\u0433");
    expect(publicText).toContain("357 \u043a\u0433");
    expect(publicText).toContain("\u041d\u0435 \u0440\u0430\u0441\u0441\u0447\u0438\u0442\u0430\u043d");
    expect(publicText).not.toMatch(/PRICE_MISSING|round_to|normFactor|formula=|template=|source_parameters/i);
  });
});
