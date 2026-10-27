import React from "react";

import { OfficeRoleAuthContextGate } from "../../../src/lib/officeRuntime/officeRuntimeContext";
import ReportsScreen from "../../../src/features/reports/ReportsHubScreen";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeReportsRoute() {
  useOfficeChildRouteAudit({
    owner: "office_reports_route",
    route: "/office/reports",
    wrappedRoute: "/reports",
  });
  return (
    <OfficeRoleAuthContextGate requiredRole="director" route="/office/reports">
      <ReportsScreen />
    </OfficeRoleAuthContextGate>
  );
}

export default withScreenErrorBoundary(OfficeReportsRoute, {
  screen: "reports",
  route: "/office/reports",
});
