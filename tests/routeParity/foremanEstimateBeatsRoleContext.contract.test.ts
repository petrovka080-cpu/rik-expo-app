import { ROUTE_PARITY_CASES, expectRouteParityAnswer } from "./routeParityTestHelpers";

describe("foreman estimate intent route parity", () => {
  it("keeps estimate intent stronger than foreman role context on /ai", () => {
    for (const testCase of ROUTE_PARITY_CASES) {
      const trace = expectRouteParityAnswer(testCase, "/ai");
      expect(trace.route).toBe("/ai");
      expect(trace.selectedTool).toBe("calculate_global_estimate");
    }
  });
});
