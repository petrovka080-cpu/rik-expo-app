import { scanSafeActionsArchitecture } from "./aiSafeActionsArchitectureTestHelpers";

describe("AI safe actions no dangerous mutation", () => {
  it("does not call final business mutation functions", () => {
    expect(scanSafeActionsArchitecture().dangerousMutationFound).toBe(0);
  });
});
