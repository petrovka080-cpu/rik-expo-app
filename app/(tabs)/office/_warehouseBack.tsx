import React from "react";
import { HeaderBackButton } from "@react-navigation/elements";
import { router } from "expo-router";

import {
  markPendingOfficeRouteReturnReceipt,
  recordOfficeBackPathFailure,
  recordOfficeWarehouseBackHandlerDone,
  recordOfficeWarehouseBackHandlerStart,
  recordOfficeWarehouseBackMethodSelected,
  recordOfficeWarehouseBackPressDone,
  recordOfficeWarehouseBackPressStart,
  recordOfficeWarehouseBackReplaceDone,
  recordOfficeWarehouseBackReplaceStart,
  recordOfficeWarehouseBackUseReplaceFallback,
  recordWarehouseBackSourceCustomHeader,
  recordWarehouseBackSourceGoBackGuard,
  recordWarehouseReturnToOfficeDone,
  recordWarehouseReturnToOfficeStart,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";

const OFFICE_ROUTE = "/office";
const WAREHOUSE_ROUTE = "/office/warehouse";
const OWNER = "office_stack_layout";
const CUSTOM_HANDLER = "warehouse_header_explicit_replace";
const DETERMINISTIC_REASON = "warehouse_go_back_hard_block";

type WarehouseBackTrigger = "custom_header" | "go_back_guard";

type WarehouseDeterministicBackParams = {
  actionSource?: string;
  actionTarget?: string;
  trigger: WarehouseBackTrigger;
};

function buildWarehouseBackExtra(
  params: WarehouseDeterministicBackParams,
  extra?: Record<string, unknown>,
) {
  return {
    owner: OWNER,
    route: WAREHOUSE_ROUTE,
    target: OFFICE_ROUTE,
    method: "replace",
    selectedMethod: "replace",
    reason: DETERMINISTIC_REASON,
    trigger: params.trigger,
    actionSource: params.actionSource,
    actionTarget: params.actionTarget,
    ...(extra ?? {}),
  };
}

export function performWarehouseDeterministicOfficeReturn(
  params: WarehouseDeterministicBackParams,
) {
  const baseExtra = buildWarehouseBackExtra(params);

  if (params.trigger === "go_back_guard") {
    recordWarehouseBackSourceGoBackGuard(baseExtra);
  }

  recordOfficeWarehouseBackHandlerStart({
    ...baseExtra,
    handler: CUSTOM_HANDLER,
  });
  recordOfficeWarehouseBackMethodSelected(baseExtra);
  recordOfficeWarehouseBackUseReplaceFallback(baseExtra);
  recordWarehouseReturnToOfficeStart({
    ...baseExtra,
    sourceRoute: WAREHOUSE_ROUTE,
  });
  recordOfficeWarehouseBackReplaceStart({
    ...baseExtra,
    handler: CUSTOM_HANDLER,
  });

  markPendingOfficeRouteReturnReceipt({
    sourceRoute: WAREHOUSE_ROUTE,
    target: OFFICE_ROUTE,
    method: "replace",
    selectedMethod: "replace",
    reason: DETERMINISTIC_REASON,
    trigger: params.trigger,
  });

  try {
    router.replace(OFFICE_ROUTE);
    recordOfficeWarehouseBackReplaceDone({
      ...baseExtra,
      handler: CUSTOM_HANDLER,
    });
    recordWarehouseReturnToOfficeDone({
      ...baseExtra,
      sourceRoute: WAREHOUSE_ROUTE,
    });
    recordOfficeWarehouseBackHandlerDone({
      ...baseExtra,
      handler: CUSTOM_HANDLER,
    });
    return "replace";
  } catch (error) {
    recordOfficeBackPathFailure({
      error,
      errorStage: "warehouse_deterministic_replace",
      extra: {
        ...baseExtra,
        handler: CUSTOM_HANDLER,
      },
    });
    throw error;
  }
}

export function renderWarehouseExplicitBackButton(
  props: Record<string, unknown>,
) {
  return (
    <HeaderBackButton
      {...props}
      label="Офис"
      onPress={() => {
        const sourceExtra = buildWarehouseBackExtra({
          trigger: "custom_header",
        });
        recordWarehouseBackSourceCustomHeader(sourceExtra);
        recordOfficeWarehouseBackPressStart({
          ...sourceExtra,
          handler: CUSTOM_HANDLER,
        });
        performWarehouseDeterministicOfficeReturn({
          trigger: "custom_header",
        });
        recordOfficeWarehouseBackPressDone({
          ...sourceExtra,
          handler: CUSTOM_HANDLER,
        });
      }}
      testID="office-warehouse-back"
    />
  );
}
