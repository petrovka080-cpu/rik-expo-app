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
});
