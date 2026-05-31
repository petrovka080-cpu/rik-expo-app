import {
  REQUEST_PROMPTS,
  estimateForRequest,
  expectRowsContain,
  presentationForEstimate,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("/request roof waterproofing disambiguation", () => {
  it("does not map roof waterproofing to bathroom waterproofing", () => {
    const estimate = estimateForRequest(REQUEST_PROMPTS.roofWaterproofing);
    const viewModel = presentationForEstimate(estimate);
    expect(estimate.work.workKey).toBe("roof_waterproofing");
    expectRowsContain(viewModel, ["кровли", "праймер", "примыканий", "герметизация"]);
    expect(viewModel.rows.map((row) => row.name).join("\n").toLocaleLowerCase("ru-RU")).not.toContain("ванн");
    const clarifyingQuestions = estimate.clarifyingQuestions.join("\n").toLocaleLowerCase("ru-RU");
    expect(clarifyingQuestions).toMatch(/кровл|кры/);
    expect(clarifyingQuestions).not.toMatch(/ванн|сануз|душ/);
  });
});
