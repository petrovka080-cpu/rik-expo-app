import { buildAiEstimatePdfActions } from "../../src/lib/ai/estimatePdf";
import { buildAiEstimatePdfSourceFixture } from "./aiEstimatePdfTestHarness";

describe("AI estimate PDF button visibility contract", () => {
  it("shows Сделать PDF when a structured estimate payload exists", () => {
    const actions = buildAiEstimatePdfActions(buildAiEstimatePdfSourceFixture());

    expect(actions.map((action) => action.label)).toContain("Сделать PDF");
    expect(actions.find((action) => action.id === "make_estimate_pdf")?.payloadRef.sourceType).toBe("ai_chat_estimate");
  });
});
