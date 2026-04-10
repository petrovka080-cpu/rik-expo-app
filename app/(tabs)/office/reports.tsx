import React from "react";

import { ReportsScreen } from "../reports";
import { useOfficeChildRouteAudit } from "./_childRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeReportsRoute() {
  useOfficeChildRouteAudit({
    owner: "office_reports_route",
    route: "/office/reports",
    wrappedRoute: "/reports",
  });
  return <ReportsScreen />;
}

export default withScreenErrorBoundary(OfficeReportsRoute, {
  screen: "reports",
  route: "/office/reports",
});
