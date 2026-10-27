import { matchesBuyerSearchQuery, selectFilteredBuyerListData } from "./buyer.list.selectors";
import type { BuyerGroup } from "./buyer.types";

describe("buyer list search selectors", () => {
  const group = {
    request_id: "32c3cf0f-e150-4bdb-83eb-fc3a68d07795",
    request_id_old: 23289,
    items: [],
  } as BuyerGroup;

  it("keeps a backend search result when the user searches by the visible legacy request number", () => {
    expect(matchesBuyerSearchQuery(group, "23289")).toBe(true);
    expect(selectFilteredBuyerListData([group], "23289")).toEqual([group]);
  });

  it("does not match a different legacy request number", () => {
    expect(matchesBuyerSearchQuery(group, "23288")).toBe(false);
  });
});
