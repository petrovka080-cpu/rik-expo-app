import {
  approveConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { capitalRenovationBundle } from "../estimateCalculator/capitalRenovationTestHelpers";

describe("director PDF price sources contract", () => {
  it("shows missing price state and norm source per capital renovation row without raw debug text", () => {
    const bundle = capitalRenovationBundle();
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
    expect(pdf!.sections.map((section) => section.title)).toEqual(expect.arrayContaining([
      "Демонтаж и подготовка",
      "Черновые полы",
      "Стены",
      "Санузлы",
      "Электрика",
      "Сантехника",
    ]));
    expect(sourceLabels.length).toBeGreaterThan(0);
    expect(sourceLabels.every((label) => label.includes("Источник цены не выбран"))).toBe(true);
    expect(sourceLabels.every((label) => label.includes("количество рассчитано по норме"))).toBe(true);
    expect(sourceLabels.some((label) => label.includes("версия норм: 2026.07.03"))).toBe(true);
    expect(sourceLabels.join("\n")).not.toMatch(/PRICE_MISSING|round_to|normFactor|formula:|trace:|raw_ai_json|```|\{".*":/);
  });
});
