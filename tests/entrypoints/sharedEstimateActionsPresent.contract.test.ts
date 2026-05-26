import {
  EMBEDDED_AI_PROMPTS,
  estimateForEmbeddedAi,
  presentationForEstimate,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("shared estimate actions", () => {
  it("exposes PDF, save, create request and update prices actions", () => {
    const viewModel = presentationForEstimate(estimateForEmbeddedAi(EMBEDDED_AI_PROMPTS.asphalt));
    expect(viewModel.actions.filter((action) => action.visible).map((action) => action.id)).toEqual(
      expect.arrayContaining(["make_estimate_pdf", "save_estimate", "create_request", "update_prices"]),
    );
  });
});
