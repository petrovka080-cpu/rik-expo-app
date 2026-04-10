import React, { useCallback } from "react";

import { WarehouseScreen } from "../warehouse";
import { useOfficeChildRouteAudit } from "./_childRouteAudit";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";
import {
  performWarehouseDeterministicOfficeReturn,
  type WarehouseBackSource,
} from "./_warehouseBack";
import {
  recordOfficeWarehouseBeforeRemove,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";

function inferUnexpectedWarehouseBackSource(params: {
  actionSource?: string;
  actionTarget?: string;
}): WarehouseBackSource {
  const haystack = `${params.actionSource ?? ""} ${params.actionTarget ?? ""}`.toLowerCase();
  if (haystack.includes("gesture")) {
    return "gesture";
  }
  if (haystack.includes("header")) {
    return "native_header";
  }
  return "generic_child_header";
}

function OfficeWarehouseRoute() {
  const handleBeforeRemove = useCallback(
    (extra: {
      action: string;
      actionSource?: string;
      actionTarget?: string;
      preventDefault: () => void;
    } & Record<string, unknown>) => {
      const { preventDefault, ...beforeRemoveExtra } = extra;
      recordOfficeWarehouseBeforeRemove(beforeRemoveExtra);

      if (extra.action !== "GO_BACK") {
        return;
      }

      preventDefault();
      performWarehouseDeterministicOfficeReturn({
        action: extra.action,
        actionSource:
          typeof extra.actionSource === "string" ? extra.actionSource : undefined,
        actionTarget:
          typeof extra.actionTarget === "string" ? extra.actionTarget : undefined,
        reason: "warehouse_go_back_intercepted_to_replace",
        source: inferUnexpectedWarehouseBackSource({
          actionSource:
            typeof extra.actionSource === "string" ? extra.actionSource : undefined,
          actionTarget:
            typeof extra.actionTarget === "string" ? extra.actionTarget : undefined,
        }),
        trigger: "intercept",
      });
    },
    [],
  );

  useOfficeChildRouteAudit({
    diagnostics: {
      onBeforeRemove: handleBeforeRemove,
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
