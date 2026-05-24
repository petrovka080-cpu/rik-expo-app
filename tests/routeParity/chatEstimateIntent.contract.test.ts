import { ROUTE_PARITY_CASES, expectRouteParityAnswer } from "./routeParityTestHelpers";

describe("chat estimate intent route parity", () => {
  it("routes known estimate prompts to the backend BOQ flow on /chat", () => {
    for (const testCase of ROUTE_PARITY_CASES) {
      const trace = expectRouteParityAnswer(testCase, "/chat");
      expect(trace.route).toBe("/chat");
      expect(trace.workKey).toBe(testCase.expectedWorkKey);
    }
  });
});
