import React from "react";

import { ForemanScreen } from "../../../src/screens/foreman/ForemanScreen";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeForemanRoute() {
  useOfficeChildRouteAudit({
    owner: "office_foreman_route",
    route: "/office/foreman",
    wrappedRoute: "/foreman",
  });
  return <ForemanScreen />;
}

export default withScreenErrorBoundary(OfficeForemanRoute, {
  screen: "foreman",
  route: "/office/foreman",
});
