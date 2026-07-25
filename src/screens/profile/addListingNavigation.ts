import {
  MARKET_MY_LISTINGS_ROUTE,
  MARKET_TAB_ROUTE,
  SELLER_ROUTE,
} from "../../lib/navigation/coreRoutes";

const firstParamValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

export function resolveAddListingReturnNavigation(params: {
  entry?: string | string[];
  returnTo?: string | string[];
}): {
  returnRoute:
    | typeof SELLER_ROUTE
    | typeof MARKET_MY_LISTINGS_ROUTE
    | typeof MARKET_TAB_ROUTE;
  backAfterPublishLabel: "К моим объявлениям" | "Вернуться в маркет";
} {
  const returnRoute =
    firstParamValue(params.entry) === "seller"
      ? SELLER_ROUTE
      : firstParamValue(params.returnTo) === "market-my-listings"
        ? MARKET_MY_LISTINGS_ROUTE
        : MARKET_TAB_ROUTE;

  return {
    returnRoute,
    backAfterPublishLabel:
      returnRoute === MARKET_MY_LISTINGS_ROUTE
        ? "К моим объявлениям"
        : "Вернуться в маркет",
  };
}
