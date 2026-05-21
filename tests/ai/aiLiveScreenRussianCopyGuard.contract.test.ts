import {
  listAiLiveScreenButtons,
  validateAiLiveScreenRussianCopy,
} from "../../src/lib/ai/liveScreenCopilot";

describe("AI live screen Russian copy guard", () => {
  it("passes Russian live buttons and catches English UI noise", () => {
    expect(validateAiLiveScreenRussianCopy({ buttons: listAiLiveScreenButtons() }).passed).toBe(true);
    const audit = validateAiLiveScreenRussianCopy({ texts: ["Open details\nRuntime Debug"] });
    expect(audit.passed).toBe(false);
    expect(audit.englishSignals).toEqual(expect.arrayContaining(["Open", "Runtime", "Debug"]));
  });
});
