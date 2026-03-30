import {
  selectBuyerMainListData,
  selectBuyerShouldShowEmptyState,
} from "./buyer.list.ui";

describe("buyer.list.ui", () => {
  it("publishes honest empty state only for ready non-loading lists", () => {
    expect(selectBuyerShouldShowEmptyState(false, "ready")).toBe(true);
    expect(selectBuyerShouldShowEmptyState(true, "ready")).toBe(false);
  });

  it("blocks false-empty publish for error and degraded loader states", () => {
    expect(selectBuyerShouldShowEmptyState(false, "error")).toBe(false);
    expect(selectBuyerShouldShowEmptyState(false, "degraded")).toBe(false);
    expect(selectBuyerShouldShowEmptyState(false, "idle")).toBe(false);
  });

  it("keeps skeleton ownership for initial loading without mutating ready data", () => {
    const initial = selectBuyerMainListData([], true, false);
    const ready = selectBuyerMainListData([{ id: "proposal-1" }], false, false);

    expect(initial).toHaveLength(4);
    expect(initial.every((row) => row.__skeleton === true)).toBe(true);
    expect(ready).toEqual([{ id: "proposal-1" }]);
  });
});
