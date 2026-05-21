import { scanSafeActionsArchitecture } from "./aiSafeActionsArchitectureTestHelpers";

describe("AI safe actions no screen-local action logic", () => {
  it("does not add local screen action handlers", () => {
    expect(scanSafeActionsArchitecture().screenLocalActionLogicFound).toBe(0);
  });
});
