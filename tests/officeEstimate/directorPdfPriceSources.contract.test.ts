import { approveCanonicalConsumerRepairAuditDraft } from "../../scripts/estimate/canonicalConsumerRepairAuditHarness";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import {
  capitalRenovationBundle,
  capitalRenovationComposition,
  CAPITAL_RENOVATION_ACCESS_ROW_CODES,
  CAPITAL_RENOVATION_CORE_ROW_COUNT,
} from "../estimateCalculator/capitalRenovationTestHelpers";

describe("director PDF price sources contract", () => {
  it("shows missing price state and norm source per capital renovation row without raw debug text", () => {
    const bundle = capitalRenovationBundle();
    const composition = capitalRenovationComposition(bundle.items);
    const approved = approveCanonicalConsumerRepairAuditDraft({
      bundle,
      generatedAt: "2026-07-02T00:00:00.000Z",
    });

    const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
      draft: approved.draft,
      items: approved.items,
      media: approved.media,
      generatedAt: "2026-07-02T00:00:00.000Z",
    });
    expect(pdf).toBeTruthy();
    expect(composition.coreRows).toHaveLength(CAPITAL_RENOVATION_CORE_ROW_COUNT);
    expect(composition.accessSupplementRows).toHaveLength(CAPITAL_RENOVATION_ACCESS_ROW_CODES.length);
    expect(composition.unknownRows).toEqual([]);

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
    expect(sourceLabels.every((label) =>
      label.includes("Источник цены не выбран") || label.includes("Цена аренды/услуги не выбрана")
    )).toBe(true);
    expect(sourceLabels.some((label) => label.includes("Источник цены не выбран"))).toBe(true);
    expect(sourceLabels.some((label) => label.includes("Цена аренды/услуги не выбрана"))).toBe(true);
    expect(sourceLabels.every((label) => label.includes("количество рассчитано по норме"))).toBe(true);
    expect(sourceLabels.some((label) => label.includes("версия норм: 2026.07.03"))).toBe(true);
    expect(sourceLabels.some((label) => label.includes("версия норм: 2026.09.07"))).toBe(true);
    expect(sourceLabels.join("\n")).not.toMatch(/PRICE_MISSING|quantity formula|quantity trace|round_to|normFactor|formula:|trace:|raw_ai_json|```|\{".*":/);
  });
});
