import React from "react";

import { AccountantScreen } from "../accountant";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeAccountantRoute() {
  useOfficeChildRouteAudit({
    owner: "office_accountant_route",
    route: "/office/accountant",
    wrappedRoute: "/accountant",
  });
  return <AccountantScreen />;
}

export default withScreenErrorBoundary(OfficeAccountantRoute, {
  screen: "accountant",
  route: "/office/accountant",
});
