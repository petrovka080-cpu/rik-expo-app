import React from "react";

import { OfficeRoleAuthContextGate } from "../../../src/lib/officeRuntime/officeRuntimeContext";
import { DirectorScreen } from "../../../src/screens/director/DirectorScreen";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeDirectorRoute() {
  useOfficeChildRouteAudit({
    owner: "office_director_route",
    route: "/office/director",
    wrappedRoute: "/director",
  });
  return (
    <OfficeRoleAuthContextGate requiredRole="director" route="/office/director">
      <DirectorScreen />
    </OfficeRoleAuthContextGate>
  );
}

export default withScreenErrorBoundary(OfficeDirectorRoute, {
  screen: "director",
  route: "/office/director",
});
