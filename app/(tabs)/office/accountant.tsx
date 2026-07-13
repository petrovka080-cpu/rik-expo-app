import React from "react";

import { OfficeRoleAuthContextGate } from "../../../src/lib/officeRuntime/officeRuntimeContext";
import { AccountantScreen } from "../../../src/screens/accountant/AccountantScreen";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeAccountantRoute() {
  useOfficeChildRouteAudit({
    owner: "office_accountant_route",
    route: "/office/accountant",
    wrappedRoute: "/accountant",
  });
  return (
    <OfficeRoleAuthContextGate requiredRole="accountant" route="/office/accountant">
      <AccountantScreen />
    </OfficeRoleAuthContextGate>
  );
}

export default withScreenErrorBoundary(OfficeAccountantRoute, {
  screen: "accountant",
  route: "/office/accountant",
});
