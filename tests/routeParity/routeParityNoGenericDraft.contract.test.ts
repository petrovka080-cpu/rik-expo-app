import { ROUTE_PARITY_CASES, buildRequestDraftForRouteParity, expectNoGenericRows } from "./routeParityTestHelpers";

describe("route parity generic draft guard", () => {
  it("does not create generic construction rows in request drafts", () => {
    for (const testCase of ROUTE_PARITY_CASES) {
      const draft = buildRequestDraftForRouteParity(testCase);
      expectNoGenericRows(draft.items.map((item) => item.titleRu).join("\n"), testCase);
      expect(draft.items.map((item) => item.source)).not.toContain("ai_suggested");
    }
  });
});
