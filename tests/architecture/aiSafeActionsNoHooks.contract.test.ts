import { scanSafeActionsArchitecture } from "./aiSafeActionsArchitectureTestHelpers";

describe("AI safe actions no hooks", () => {
  it("does not add React hooks", () => {
    expect(scanSafeActionsArchitecture().hooksFound).toBe(0);
  });
});
