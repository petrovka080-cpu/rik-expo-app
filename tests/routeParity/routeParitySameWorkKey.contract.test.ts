import { ROUTE_PARITY_CASES, ROUTE_PARITY_ROUTES, expectRouteParityAnswer } from "./routeParityTestHelpers";

describe("route parity work key", () => {
  it("keeps the same work key across chat, foreman and request", () => {
    for (const testCase of ROUTE_PARITY_CASES) {
      const keys = ROUTE_PARITY_ROUTES.map((route) => expectRouteParityAnswer(testCase, route).workKey);
      expect(new Set(keys)).toEqual(new Set([testCase.expectedWorkKey]));
    }
  });
});
