import { scanSafeActionsArchitecture } from "./aiSafeActionsArchitectureTestHelpers";

describe("AI safe actions no useEffect hacks", () => {
  it("does not add useEffect patches", () => {
    expect(scanSafeActionsArchitecture().useEffectHacksFound).toBe(0);
  });
});
