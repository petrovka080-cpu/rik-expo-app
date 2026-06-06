import { buildAiEstimatePdfViewModel } from "../../src/lib/aiEstimatePdf";
import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { buildSafeIntegrationEstimate } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF view model", () => {
  it("maps GlobalEstimateResult rows without recalculating them", () => {
    const estimate = buildSafeIntegrationEstimate();
    const viewModel = buildAiEstimatePdfViewModel({
      estimate,
      runtimeTraceId: "view-model-contract",
      route: "/chat",
      generatedAt: "2026-05-24T00:00:00.000Z",
      documentMode: "estimate",
    });
    expect(viewModel.rows).toHaveLength(estimate.sections.flatMap((section) => section.rows).length);
    expect(viewModel.estimateId).toBe(estimate.estimateId);
    expect(viewModel.runtimeTraceId).toBe("view-model-contract");
  });

  it("preserves local country, region, city, and currency in the PDF metadata", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "смета на асфальтирование 10000 кв м в Алматы",
      countryCode: "KZ",
      city: "Almaty",
      language: "ru",
      locale: "ru-KZ",
      currency: "KZT",
    });
    const viewModel = buildAiEstimatePdfViewModel({
      estimate,
      runtimeTraceId: "view-model-local-context",
      route: "/request",
      generatedAt: "2026-05-28T00:00:00.000Z",
      documentMode: "estimate",
    });
    const metadataText = viewModel.metadata.map((item) => `${item.label}: ${item.value}`).join("\n");
    expect(metadataText).toContain("Регион расчёта");
    expect(metadataText).toContain("Казахстан");
    expect(metadataText).toContain("Алматы");
    expect(viewModel.work.currency).toBe("KZT");
  });

  it("keeps internationally recognizable US region names in local PDF metadata", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "estimate for drywall installation on 1200 sq ft in Austin Texas",
      countryCode: "US",
      city: "Austin",
      language: "ru",
      locale: "ru-US",
      currency: "USD",
    });
    const viewModel = buildAiEstimatePdfViewModel({
      estimate,
      runtimeTraceId: "view-model-us-local-context",
      route: "/ai",
      generatedAt: "2026-05-28T00:00:00.000Z",
      documentMode: "estimate",
    });
    const metadataText = viewModel.metadata.map((item) => `${item.label}: ${item.value}`).join("\n");
    expect(metadataText).toContain("Austin");
    expect(metadataText).toContain("Texas");
    expect(viewModel.work.currency).toBe("USD");
  });

  it("keeps raw warning tokens out of visible row names", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442\u0430 80 \u043c\u00b2",
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
      currency: "KGS",
    });
    const viewModel = buildAiEstimatePdfViewModel({
      estimate,
      runtimeTraceId: "view-model-visible-label-policy",
      route: "/request",
      generatedAt: "2026-05-28T00:00:00.000Z",
      documentMode: "estimate",
    });
    const rowText = viewModel.rows.map((row) => row.name).join("\n");

    expect(estimate.work.workKey).toBe("foundation_waterproofing");
    expect(rowText).not.toMatch(/\bwarning\b/i);
    expect(rowText).toContain("\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0443\u0442\u043e\u0447\u043d\u0435\u043d\u0438\u0435");
  });
});
