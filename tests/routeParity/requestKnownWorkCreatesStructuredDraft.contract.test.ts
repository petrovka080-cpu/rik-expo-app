import { ROUTE_PARITY_CASES, buildRequestDraftForRouteParity, expectRouteParityAnswer } from "./routeParityTestHelpers";

describe("request route structured draft", () => {
  it("creates a structured estimate-backed draft for known works", () => {
    for (const testCase of ROUTE_PARITY_CASES) {
      const trace = expectRouteParityAnswer(testCase, "/request");
      const draft = buildRequestDraftForRouteParity(testCase);
      expect(trace.structuredResultUsed).toBe(true);
      expect(draft.titleRu).toBeTruthy();
      expect(draft.summaryRu).toContain("Черновик сметы");
      expect(draft.summaryRu).toContain("Итого");
      expect(draft.summaryRu).not.toContain("Backend global estimate");
    }
  });
});
