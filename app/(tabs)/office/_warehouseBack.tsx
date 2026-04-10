import React from "react";
import { HeaderBackButton } from "@react-navigation/elements";
import { router } from "expo-router";

import {
  recordOfficeBackPathFailure,
  recordOfficeWarehouseBackHandlerDone,
  recordOfficeWarehouseBackHandlerStart,
  recordOfficeWarehouseBackMethodSelected,
  recordOfficeWarehouseBackPressDone,
  recordOfficeWarehouseBackPressStart,
  recordOfficeWarehouseBackReplaceDone,
  recordOfficeWarehouseBackReplaceStart,
  recordWarehouseBackSourceCustomHeader,
  recordWarehouseBackSourceGenericChildHeader,
  recordWarehouseBackSourceGesture,
  recordWarehouseBackSourceNativeHeader,
  recordWarehouseReturnToOfficeDone,
  recordWarehouseReturnToOfficeStart,
} from "../../../src/lib/navigation/officeReentryBreadcrumbs";

export const OFFICE_SAFE_BACK_ROUTE = "/office";
export const OFFICE_BACK_LABEL = "Офис";
export const WAREHOUSE_ROUTE = "/office/warehouse";

export type WarehouseBackSource =
  | "custom_header"
  | "native_header"
  | "gesture"
  | "generic_child_header";

type WarehouseBackTrigger = "press" | "intercept";

type WarehouseDeterministicReturnParams = {
  action?: string;
  actionSource?: string;
  actionTarget?: string;
  owner?: string;
  reason?: string;
  source: WarehouseBackSource;
  trigger: WarehouseBackTrigger;
};

function recordWarehouseBackSource(
  source: WarehouseBackSource,
  extra?: Record<string, unknown>,
) {
  if (source === "custom_header") {
    recordWarehouseBackSourceCustomHeader(extra);
    return;
  }
  if (source === "native_header") {
    recordWarehouseBackSourceNativeHeader(extra);
    return;
  }
  if (source === "gesture") {
    recordWarehouseBackSourceGesture(extra);
    return;
  }
  recordWarehouseBackSourceGenericChildHeader(extra);
}

function buildWarehouseBackExtra(
  params: WarehouseDeterministicReturnParams,
): Record<string, unknown> {
  return {
    owner: params.owner ?? "office_stack_layout",
    route: WAREHOUSE_ROUTE,
    target: OFFICE_SAFE_BACK_ROUTE,
    method: "replace",
    selectedMethod: "replace",
    handler: "warehouse_explicit_replace",
    source: params.source,
    trigger: params.trigger,
    ...(params.reason ? { reason: params.reason } : null),
    ...(params.action ? { action: params.action } : null),
    ...(params.actionSource ? { actionSource: params.actionSource } : null),
    ...(params.actionTarget ? { actionTarget: params.actionTarget } : null),
  };
}

export function performWarehouseDeterministicOfficeReturn(
  params: WarehouseDeterministicReturnParams,
) {
  const extra = buildWarehouseBackExtra(params);

  if (params.trigger === "press") {
    recordOfficeWarehouseBackPressStart(extra);
  }

  recordWarehouseBackSource(params.source, extra);
  recordOfficeWarehouseBackHandlerStart(extra);
  recordOfficeWarehouseBackMethodSelected(extra);

  if (params.action === "GO_BACK") {
    recordOfficeBackPathFailure({
      error: "warehouse_go_back_blocked",
      errorStage: "warehouse_go_back_blocked",
      extra,
    });
  }

  recordOfficeWarehouseBackReplaceStart(extra);
  recordWarehouseReturnToOfficeStart({
    ...extra,
    sourceRoute: WAREHOUSE_ROUTE,
  });
  router.replace(OFFICE_SAFE_BACK_ROUTE);
  recordWarehouseReturnToOfficeDone({
    ...extra,
    sourceRoute: WAREHOUSE_ROUTE,
  });
  recordOfficeWarehouseBackReplaceDone(extra);
  recordOfficeWarehouseBackHandlerDone(extra);

  if (params.trigger === "press") {
    recordOfficeWarehouseBackPressDone(extra);
  }
}

export function renderWarehouseExplicitBackButton(props: Record<string, unknown>) {
  return (
    <HeaderBackButton
      {...props}
      label={OFFICE_BACK_LABEL}
      onPress={() =>
        performWarehouseDeterministicOfficeReturn({
          reason: "warehouse_custom_header_replace_only",
          source: "custom_header",
          trigger: "press",
        })
      }
      testID="warehouse-explicit-back"
    />
  );
}
