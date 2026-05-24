import { ROUTE_PARITY_CASES, ROUTE_PARITY_ROUTES, expectRouteParityAnswer } from "./routeParityTestHelpers";

describe("route parity PDF action", () => {
  it("keeps make_pdf visible across all estimate routes", () => {
    for (const testCase of ROUTE_PARITY_CASES) {
      for (const route of ROUTE_PARITY_ROUTES) {
        const trace = expectRouteParityAnswer(testCase, route);
        expect(trace.actions).toContain("make_pdf");
      }
    }
  });
});
