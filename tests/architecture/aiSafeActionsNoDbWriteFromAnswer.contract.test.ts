import { scanSafeActionsArchitecture } from "./aiSafeActionsArchitectureTestHelpers";

describe("AI safe actions no DB write from answer", () => {
  it("does not write from the AI answer or draft path", () => {
    expect(scanSafeActionsArchitecture().dbWriteFromAnswerFound).toBe(0);
  });
});
