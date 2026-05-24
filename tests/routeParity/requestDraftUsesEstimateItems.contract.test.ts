import { ROUTE_PARITY_CASES, buildRequestDraftForRouteParity } from "./routeParityTestHelpers";

describe("request draft estimate items", () => {
  it("uses source-backed estimate rows as editable request items", () => {
    for (const testCase of ROUTE_PARITY_CASES) {
      const draft = buildRequestDraftForRouteParity(testCase);
      expect(draft.items.every((item) => item.quantity > 0 && item.unit.length > 0)).toBe(true);
      expect(draft.items.some((item) => item.itemType === "material")).toBe(true);
      expect(draft.items.some((item) => item.itemType === "work" || item.itemType === "service")).toBe(true);
    }
  });
});
