import {
  REQUEST_PROMPTS,
  estimateForRequest,
  expectRowsContain,
  presentationForEstimate,
  requestDraft,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("/request hydro turbine estimate", () => {
  it("uses infrastructure-specific rows instead of generic construction rows", () => {
    const estimate = estimateForRequest(REQUEST_PROMPTS.hydroTurbine);
    const viewModel = presentationForEstimate(estimate);
    expect(estimate.work.workKey).toBe("micro_hydro_preparation");
    expectRowsContain(viewModel, ["турбина", "генератор", "шкаф управления", "ПНР", "обучение"]);
    expect(requestDraft(REQUEST_PROMPTS.hydroTurbine).items.map((item) => item.titleRu).join("\n")).not.toContain("Строительные работы");
  });
});
