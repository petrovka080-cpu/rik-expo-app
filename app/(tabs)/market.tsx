import React from "react";

import MarketHomeScreen from "../../src/features/market/MarketHomeScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function MarketTabScreen() {
  return <MarketHomeScreen />;
}

export default withScreenErrorBoundary(MarketTabScreen, {
  screen: "market",
  route: "/market",
});
