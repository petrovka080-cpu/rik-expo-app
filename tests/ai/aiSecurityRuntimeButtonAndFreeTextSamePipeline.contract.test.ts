import { answerLiveAiForContext } from "../../src/lib/ai/liveUi/liveAiActionRouter";

describe("security runtime button and free text same pipeline", () => {
  it("uses the same securityRuntime provider trace for button and equivalent free text", () => {
    const button = answerLiveAiForContext({ context: "security", forceActionId: "approval_bypass_review" });
    const freeText = answerLiveAiForContext({ context: "security", userText: "есть ли approval bypass" });
    expect(button.providerTrace).toContain("securityRuntime");
    expect(freeText.providerTrace).toContain("securityRuntime");
    expect(button.answerTextRu).toMatch(/Approval bypass/);
    expect(freeText.answerTextRu).toMatch(/Approval bypass/);
  });
});
