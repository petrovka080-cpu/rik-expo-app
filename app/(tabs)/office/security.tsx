import React from "react";

import { SecurityScreen } from "../security";
import { useOfficeChildRouteAudit } from "./_childRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeSecurityRoute() {
  useOfficeChildRouteAudit({
    owner: "office_security_route",
    route: "/office/security",
    wrappedRoute: "/security",
  });
  return <SecurityScreen />;
}

export default withScreenErrorBoundary(OfficeSecurityRoute, {
  screen: "security",
  route: "/office/security",
});
