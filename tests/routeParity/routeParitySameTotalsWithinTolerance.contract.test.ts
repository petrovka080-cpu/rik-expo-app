import { ROUTE_PARITY_CASES, ROUTE_PARITY_ROUTES, totalFor } from "./routeParityTestHelpers";

describe("route parity totals", () => {
  it("keeps estimate totals within tolerance across routes", () => {
    for (const testCase of ROUTE_PARITY_CASES) {
      const totals = ROUTE_PARITY_ROUTES.map((route) => totalFor(testCase, route));
      const min = Math.min(...totals);
      const max = Math.max(...totals);
      expect(max - min).toBeLessThanOrEqual(1);
    }
  });
});
