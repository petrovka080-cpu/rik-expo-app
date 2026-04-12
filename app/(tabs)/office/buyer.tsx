import React from "react";

import { BuyerScreen } from "../../../src/screens/buyer/BuyerScreen";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeBuyerRoute() {
  useOfficeChildRouteAudit({
    owner: "office_buyer_route",
    route: "/office/buyer",
    wrappedRoute: "/buyer",
  });
  return <BuyerScreen />;
}

export default withScreenErrorBoundary(OfficeBuyerRoute, {
  screen: "buyer",
  route: "/office/buyer",
});
