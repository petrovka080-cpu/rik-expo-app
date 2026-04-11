import React from "react";

import { ContractorScreen } from "../contractor";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeContractorRoute() {
  useOfficeChildRouteAudit({
    owner: "office_contractor_route",
    route: "/office/contractor",
    wrappedRoute: "/contractor",
  });
  return <ContractorScreen />;
}

export default withScreenErrorBoundary(OfficeContractorRoute, {
  screen: "contractor",
  route: "/office/contractor",
});
