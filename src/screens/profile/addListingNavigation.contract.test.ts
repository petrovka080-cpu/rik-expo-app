import {
  MARKET_MY_LISTINGS_ROUTE,
  MARKET_TAB_ROUTE,
  SELLER_ROUTE,
} from "../../lib/navigation/coreRoutes";
import { resolveAddListingReturnNavigation } from "./addListingNavigation";

describe("add listing navigation owner", () => {
  it("resolves all supported deep-link return sources deterministically", () => {
    expect(resolveAddListingReturnNavigation({ entry: "seller" }).returnRoute).toBe(
      SELLER_ROUTE,
    );
    expect(
      resolveAddListingReturnNavigation({
        returnTo: ["market-my-listings"],
      }).returnRoute,
    ).toBe(MARKET_MY_LISTINGS_ROUTE);
    expect(resolveAddListingReturnNavigation({}).returnRoute).toBe(
      MARKET_TAB_ROUTE,
    );
  });
});
