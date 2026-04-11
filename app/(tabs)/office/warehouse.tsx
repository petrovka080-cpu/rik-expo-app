import React, { useCallback, useRef } from "react";

import { WarehouseScreen } from "../warehouse";
import { useOfficeChildRouteAudit } from "./_childRouteAudit";
import {
  recordOfficeWarehouseCleanupDone,
  recordOfficeWarehouseCleanupStart,
  recordOfficeWarehouseBeforeRemove,
  recordOfficeWarehouseUnmount,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";
import { useWarehouseUiStore } from "../../../src/screens/warehouse/warehouseUi.store";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

function OfficeWarehouseRoute() {
  const cleanupDoneRef = useRef(false);
  const cleanupRouteUiState = useCallback((reason: "unmount") => {
    if (cleanupDoneRef.current) return;

    const state = useWarehouseUiStore.getState();
    const hadOpenUi =
      state.isFioConfirmVisible ||
      state.isRecipientModalVisible ||
      Boolean(state.pickModal.what) ||
      state.itemsModal != null ||
      state.issueDetailsId != null ||
      state.incomingDetailsId != null ||
      state.repPeriodOpen;

    recordOfficeWarehouseCleanupStart({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      reason,
      hadOpenUi,
    });

    cleanupDoneRef.current = true;
    state.setIsFioConfirmVisible(false);
    state.setIsRecipientModalVisible(false);
    state.setPickModal({ what: null });
    state.setItemsModal(null);
    state.setIssueDetailsId(null);
    state.setIncomingDetailsId(null);
    state.setRepPeriodOpen(false);

    recordOfficeWarehouseCleanupDone({
      owner: "office_warehouse_route",
      route: "/office/warehouse",
      reason,
      hadOpenUi,
    });

    if (hadOpenUi) {
      console.info("[warehouse:officeRoute] suppressed post-unmount", {
        reason,
        owner: "office_warehouse_route",
      });
    }
  }, []);

  const entryExtra = useOfficeChildRouteAudit({
    owner: "office_warehouse_route",
    route: "/office/warehouse",
    wrappedRoute: "/warehouse",
    diagnostics: {
      onBeforeRemove: (extra) => {
        recordOfficeWarehouseBeforeRemove(extra);
      },
      onUnmount: (extra) => {
        recordOfficeWarehouseUnmount(extra);
        cleanupRouteUiState("unmount");
      },
    },
  });

  return (
    <WarehouseScreen
      entryKind="office"
      entryExtra={{
        ...entryExtra,
        contentOwner: "office_warehouse_route",
      }}
    />
  );
}

export default withScreenErrorBoundary(OfficeWarehouseRoute, {
  screen: "warehouse",
  route: "/office/warehouse",
});
