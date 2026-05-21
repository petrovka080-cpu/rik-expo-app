import { answerLiveAiForContext } from "../../src/lib/ai/liveUi";

describe("contractor buttons and free text same pipeline", () => {
  it("uses contractorAcceptance for both free text and action buttons", () => {
    const freeText = answerLiveAiForContext({
      context: "contractor",
      userText: "что мешает приёмке",
    });
    const button = answerLiveAiForContext({
      context: "contractor",
      forceActionId: "acceptance_blockers",
    });

    expect(freeText.pipelineKey).toBe("contractorAcceptance");
    expect(button.pipelineKey).toBe("contractorAcceptance");
    expect(freeText.providerTrace).toContain("contractorAcceptancePipeline");
    expect(button.providerTrace).toContain("contractorAcceptancePipeline");
    expect(freeText.dangerousMutationsFound).toBe(0);
    expect(button.dangerousMutationsFound).toBe(0);
  });
});
