import { payloadForPrompt, STRUCTURED_PIPELINE_CASES } from "../estimateStructuredPipeline/structuredPipelineTestHelpers";

describe("structured pipeline request actions", () => {
  it("keeps expected estimate actions visible in the shared presentation model", () => {
    const payload = payloadForPrompt(STRUCTURED_PIPELINE_CASES[0].prompt);
    expect(payload.presentation.actions.some((action) => action.id === "make_estimate_pdf" && action.visible)).toBe(true);
    expect(payload.presentation.actions.some((action) => action.id === "create_request" && action.visible)).toBe(true);
  });
});
