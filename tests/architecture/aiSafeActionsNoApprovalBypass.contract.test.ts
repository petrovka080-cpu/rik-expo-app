import { scanSafeActionsArchitecture } from "./aiSafeActionsArchitectureTestHelpers";

describe("AI safe actions no approval bypass", () => {
  it("does not auto approve or bypass approval", () => {
    expect(scanSafeActionsArchitecture().approvalBypassFound).toBe(0);
  });
});
