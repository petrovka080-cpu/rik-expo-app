import { createBuiltInAiAssistantMessage } from "../../src/features/ai/assistantAnswerPipeline";
import { EMBEDDED_AI_PROMPTS } from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("embedded AI GlobalEstimateResult binding", () => {
  it("attaches structured estimate and shared presentation to assistant messages", () => {
    const message = createBuiltInAiAssistantMessage({
      text: EMBEDDED_AI_PROMPTS.brick,
      assistantContext: "foreman",
      assistantPresentationRole: "foreman",
      routeContext: "/ai?context=foreman",
      userId: null,
    });
    expect(message?.estimatePdfSource?.structuredEstimate?.work.workKey).toBe("brick_masonry");
    expect(message?.estimatePresentation?.workKey).toBe("brick_masonry");
  });
});
