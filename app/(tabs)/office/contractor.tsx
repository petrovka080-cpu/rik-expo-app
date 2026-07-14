import React from "react";

import { OfficeRoleAuthContextGate } from "../../../src/lib/officeRuntime/officeRuntimeContext";
import { ContractorScreen } from "../../../src/screens/contractor/ContractorScreen";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeContractorRoute() {
  useOfficeChildRouteAudit({
    owner: "office_contractor_route",
    route: "/office/contractor",
    wrappedRoute: "/contractor",
  });
  return (
    <OfficeRoleAuthContextGate requiredRole="contractor" route="/office/contractor">
      <ContractorScreen />
    </OfficeRoleAuthContextGate>
  );
}

export default withScreenErrorBoundary(OfficeContractorRoute, {
  screen: "contractor",
  route: "/office/contractor",
});
