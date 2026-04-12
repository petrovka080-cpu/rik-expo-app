import React from "react";

import { DirectorScreen } from "../../../src/screens/director/DirectorScreen";
import { useOfficeChildRouteAudit } from "../../../src/lib/navigation/useOfficeChildRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeDirectorRoute() {
  useOfficeChildRouteAudit({
    owner: "office_director_route",
    route: "/office/director",
    wrappedRoute: "/director",
  });
  return <DirectorScreen />;
}

export default withScreenErrorBoundary(OfficeDirectorRoute, {
  screen: "director",
  route: "/office/director",
});
