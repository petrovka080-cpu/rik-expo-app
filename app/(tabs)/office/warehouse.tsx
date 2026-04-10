import React from "react";

import WarehouseScreenContent from "../../../src/screens/warehouse/WarehouseScreenContent";
import { useOfficeWarehouseChildRouteAudit } from "./_childRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeWarehouseRoute() {
  const entryExtra = useOfficeWarehouseChildRouteAudit();

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
