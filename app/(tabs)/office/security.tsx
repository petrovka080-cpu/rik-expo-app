import React from "react";

import { OfficeRoleAuthContextGate } from "../../../src/lib/officeRuntime/officeRuntimeContext";
import { SecurityScreen } from "../../../src/screens/security/SecurityScreen";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeSecurityRoute() {
  useOfficeChildRouteAudit({
    owner: "office_security_route",
    route: "/office/security",
    wrappedRoute: "/security",
  });
  return (
    <OfficeRoleAuthContextGate requiredRole="security" route="/office/security">
      <SecurityScreen />
    </OfficeRoleAuthContextGate>
  );
}

export default withScreenErrorBoundary(OfficeSecurityRoute, {
  screen: "security",
  route: "/office/security",
});
