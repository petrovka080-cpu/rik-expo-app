import React from "react";

import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import WarehouseScreenContent from "../../../src/screens/warehouse/WarehouseScreenContent";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeWarehouseRoute() {
  useOfficeChildRouteAudit({
    owner: "office_warehouse_route",
    route: "/office/warehouse",
    wrappedRoute: "/warehouse",
  });

  return <WarehouseScreenContent />;
}

export default withScreenErrorBoundary(OfficeWarehouseRoute, {
  screen: "warehouse",
  route: "/office/warehouse",
});
