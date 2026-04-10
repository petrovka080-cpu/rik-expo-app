import React from "react";

import WarehouseScreenContent from "../../../src/screens/warehouse/WarehouseScreenContent";
import { useOfficeChildRouteAudit } from "./_childRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeWarehouseRoute() {
  const entryExtra = useOfficeChildRouteAudit({
    owner: "office_warehouse_route",
    route: "/office/warehouse",
    wrappedRoute: "/warehouse",
  });

  return (
    <WarehouseScreenContent
      entryKind="office"
      entryExtra={entryExtra}
    />
  );
}

export default withScreenErrorBoundary(OfficeWarehouseRoute, {
  screen: "warehouse",
  route: "/office/warehouse",
});
