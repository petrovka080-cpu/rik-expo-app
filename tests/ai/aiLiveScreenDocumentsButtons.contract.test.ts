import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen documents buttons", () => {
  it("explains PDFs and exposes document deep links", () => {
    const buttons = listAiLiveScreenButtonsForScreen("documents");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Что в этом PDF",
      "С чем связан документ",
      "Связать как черновик",
    ]));
    const answer = answerAiLiveScreenButtonFixture("documents.pdf_explain");
    expect(answer.guard.failureReason).toBeUndefined();
    expect(answer.openLinks.some((link) => link.entityType === "pdf_document")).toBe(true);
  });
});
