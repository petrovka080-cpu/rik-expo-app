import { scanSafeActionsArchitecture } from "./aiSafeActionsArchitectureTestHelpers";

describe("AI safe actions no final submit", () => {
  it("does not enable final execution from AI", () => {
    expect(scanSafeActionsArchitecture().finalSubmitFound).toBe(0);
  });
});
