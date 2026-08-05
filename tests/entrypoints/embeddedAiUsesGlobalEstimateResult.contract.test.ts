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

  it("builds the canonical paving launch message synchronously with estimate UI data", () => {
    const startedAt = performance.now();
    const message = createBuiltInAiAssistantMessage({
      text: "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0443\u043a\u043b\u0430\u0434\u043a\u0443 \u0431\u0440\u0443\u0441\u0447\u0430\u0442\u043a\u0438 \u043d\u0430 587 \u043a\u0432 \u043c",
      assistantContext: "foreman",
      assistantPresentationRole: "foreman",
      routeContext: "foreman",
      userId: null,
    });

    expect(performance.now() - startedAt).toBeLessThan(2_000);
    expect(message?.estimatePdfSource?.structuredEstimate?.work.workKey).toBe(
      "paving_stone_laying",
    );
    expect(message?.estimatePdfSource?.estimate.sections.flatMap(
      (section) => section.rows,
    ).length).toBeGreaterThanOrEqual(14);
    expect(message?.actions?.some((action) => action.id === "make_estimate_pdf")).toBe(
      true,
    );
  });
});
