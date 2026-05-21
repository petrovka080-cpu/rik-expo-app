import {
  getAiLiveScreenButton,
  validateAiLiveButtonResult,
} from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen result guard", () => {
  it("rejects blank or incomplete button results", () => {
    const button = getAiLiveScreenButton("buyer.find_suppliers");
    const guard = validateAiLiveButtonResult({
      button,
      answerTextRu: "Коротко:",
      sourceRefs: [],
      openLinks: [],
      safetyStatus: {
        changedData: false,
        draftOnly: false,
        approvalRequired: false,
        finalSubmit: false,
        autoApproval: false,
        dangerousMutation: false,
      },
      clicked: true,
      resultVisible: true,
    });
    expect(guard.failureReason).toBe("blank_modal");
  });
});
