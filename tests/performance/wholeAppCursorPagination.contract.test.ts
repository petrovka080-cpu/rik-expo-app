import { WHOLE_APP_QUERY_PATHS } from "../../scripts/audit/wholeApp50kExplainP95.shared";

describe("whole-app cursor pagination contract", () => {
  it("requires bounded cursor/keyset-style contracts on every core list/search query", () => {
    const listLike = WHOLE_APP_QUERY_PATHS.filter((query) => ["list", "search"].includes(query.kind));

    expect(listLike.length).toBeGreaterThanOrEqual(10);
    for (const query of listLike) {
      expect(query.expectedMaxLimit).toBeLessThanOrEqual(50);
      expect(query.cursorPagination).toBe(true);
      expect(query.tenantOrUserScoped).toBe(true);
      expect(query.indexedOrder).toBe(true);
    }
  });
});
