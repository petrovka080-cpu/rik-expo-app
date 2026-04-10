import React from "react";

import { WarehouseScreen } from "../warehouse";
import { useOfficeChildRouteAudit } from "./_childRouteAudit";
import { performWarehouseDeterministicOfficeReturn } from "./_warehouseBack";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";
import { recordOfficeWarehouseBeforeRemove } from "../../../src/lib/navigation/officeReentryBreadcrumbs";

function OfficeWarehouseRoute() {
  useOfficeChildRouteAudit({
    diagnostics: {
      onBeforeRemove(event, extra) {
        const actionSource =
          typeof event?.data?.action?.source === "string"
            ? event.data.action.source
            : undefined;
        const actionTarget =
          typeof event?.data?.action?.target === "string"
            ? event.data.action.target
            : undefined;

        if (extra.action === "GO_BACK") {
          event.preventDefault?.();
          performWarehouseDeterministicOfficeReturn({
            actionSource,
            actionTarget,
            trigger: "go_back_guard",
          });
          recordOfficeWarehouseBeforeRemove({
            ...extra,
            action: "REPLACE",
            actionSource,
            actionTarget,
            reason: "go_back_intercepted",
            trigger: "go_back_guard",
          });
          return {
            action: "REPLACE",
            extra: {
              actionSource,
              actionTarget,
              reason: "go_back_intercepted",
              trigger: "go_back_guard",
            },
          };
        }

        recordOfficeWarehouseBeforeRemove({
          ...extra,
          actionSource,
          actionTarget,
        });
        return {
          extra: {
            actionSource,
            actionTarget,
          },
        };
      },
    },
    owner: "office_warehouse_route",
    route: "/office/warehouse",
    wrappedRoute: "/warehouse",
  });

  return <WarehouseScreen />;
}

export default withScreenErrorBoundary(OfficeWarehouseRoute, {
  screen: "warehouse",
  route: "/office/warehouse",
});
