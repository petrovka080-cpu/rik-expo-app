import {
  buildRequestEstimateCustomItem,
  buildRequestEstimateManualCatalogItem,
  calculateRequestEstimateDraftTotals,
} from "./buildRequestEstimatePayload";
import type {
  RequestEstimateDraft,
  RequestEstimateDraftItem,
  RequestEstimateDraftStatus,
} from "./requestEstimateDraftTypes";
import { assertRequestEstimateStateTransitionAllowed } from "./requestEstimateStateMachine";
import { requestEstimateDraftWithValidation } from "./validateRequestEstimateDraft";

export type RequestEstimateDraftReducerState = {
  status: RequestEstimateDraftStatus;
  draft: RequestEstimateDraft | null;
  removedItems: RequestEstimateDraftItem[];
  lastError: string | null;
};

export type RequestEstimateDraftReducerEvent =
  | { type: "GENERATE_ESTIMATE" }
  | { type: "ESTIMATE_READY"; draft: RequestEstimateDraft }
  | { type: "EDIT_QUANTITY"; rowId: string; quantity: number }
  | { type: "SELECT_CATALOG_ITEM"; rowId: string; catalogItemId: string; sourceId?: string; bindingStatus?: string }
  | { type: "ADD_MANUAL_CATALOG_ITEM"; item?: RequestEstimateDraftItem }
  | { type: "ADD_CUSTOM_ITEM"; item?: RequestEstimateDraftItem }
  | { type: "REMOVE_ITEM"; rowId: string }
  | { type: "RESTORE_ITEM"; rowId: string }
  | { type: "MAKE_PDF" }
  | { type: "SAVE_DRAFT" }
  | { type: "SEND_REQUEST" }
  | { type: "VALIDATION_FAILED"; reason: string }
  | { type: "RESET" };

export const initialRequestEstimateDraftReducerState: RequestEstimateDraftReducerState = {
  status: "idle",
  draft: null,
  removedItems: [],
  lastError: null,
};

function withTotalsAndValidation(draft: RequestEstimateDraft): RequestEstimateDraft {
  return requestEstimateDraftWithValidation({
    ...draft,
    totals: calculateRequestEstimateDraftTotals(draft.items),
  });
}

function updateItemQuantity(item: RequestEstimateDraftItem, quantity: number): RequestEstimateDraftItem {
  const safeQuantity = Math.max(0, quantity);
  return {
    ...item,
    quantity: safeQuantity,
    total: item.unitPrice != null ? Math.round(item.unitPrice * safeQuantity * 100) / 100 : item.total ?? null,
  };
}

function requireDraft(state: RequestEstimateDraftReducerState): RequestEstimateDraft {
  if (!state.draft) throw new Error("Request estimate draft is required for this event.");
  return state.draft;
}

export function requestEstimateDraftReducer(
  state: RequestEstimateDraftReducerState,
  event: RequestEstimateDraftReducerEvent,
): RequestEstimateDraftReducerState {
  if (event.type === "RESET") {
    return initialRequestEstimateDraftReducerState;
  }

  const transition = assertRequestEstimateStateTransitionAllowed({
    currentStatus: state.status,
    event: event.type,
  });

  if (event.type === "GENERATE_ESTIMATE") {
    return { ...state, status: transition.to, lastError: null };
  }

  if (event.type === "ESTIMATE_READY") {
    return {
      status: transition.to,
      draft: withTotalsAndValidation(event.draft),
      removedItems: [],
      lastError: null,
    };
  }

  if (event.type === "VALIDATION_FAILED") {
    return { ...state, status: transition.to, lastError: event.reason };
  }

  const draft = requireDraft(state);

  if (event.type === "EDIT_QUANTITY") {
    return {
      ...state,
      status: transition.to,
      draft: withTotalsAndValidation({
        ...draft,
        items: draft.items.map((item) => (item.rowId === event.rowId ? updateItemQuantity(item, event.quantity) : item)),
      }),
      lastError: null,
    };
  }

  if (event.type === "SELECT_CATALOG_ITEM") {
    return {
      ...state,
      status: transition.to,
      draft: withTotalsAndValidation({
        ...draft,
        items: draft.items.map((item) =>
          item.rowId === event.rowId
            ? {
                ...item,
                catalogItemId: event.catalogItemId,
                sourceId: event.sourceId ?? item.sourceId,
                bindingStatus: event.bindingStatus ?? "selected_catalog_item",
              }
            : item,
        ),
      }),
      lastError: null,
    };
  }

  if (event.type === "ADD_CUSTOM_ITEM") {
    const item = event.item ?? buildRequestEstimateCustomItem();
    return {
      ...state,
      status: transition.to,
      draft: withTotalsAndValidation({
        ...draft,
        items: [...draft.items, { ...item, source: "custom", confidence: "low", catalogItemId: undefined }],
      }),
      lastError: null,
    };
  }

  if (event.type === "ADD_MANUAL_CATALOG_ITEM") {
    const item = event.item ?? buildRequestEstimateManualCatalogItem();
    return {
      ...state,
      status: transition.to,
      draft: withTotalsAndValidation({
        ...draft,
        items: [...draft.items, { ...item, source: "catalog_item", confidence: item.confidence ?? "high" }],
      }),
      lastError: null,
    };
  }

  if (event.type === "REMOVE_ITEM") {
    const removedItem = draft.items.find((item) => item.rowId === event.rowId);
    return {
      ...state,
      status: transition.to,
      draft: withTotalsAndValidation({
        ...draft,
        items: draft.items.filter((item) => item.rowId !== event.rowId),
      }),
      removedItems: removedItem ? [removedItem, ...state.removedItems.filter((item) => item.rowId !== event.rowId)] : state.removedItems,
      lastError: null,
    };
  }

  if (event.type === "RESTORE_ITEM") {
    const restoredItem = state.removedItems.find((item) => item.rowId === event.rowId);
    return {
      ...state,
      status: transition.to,
      draft: restoredItem
        ? withTotalsAndValidation({
            ...draft,
            items: [...draft.items, restoredItem],
          })
        : draft,
      removedItems: state.removedItems.filter((item) => item.rowId !== event.rowId),
      lastError: null,
    };
  }

  if (event.type === "SEND_REQUEST" && !draft.validation.canSend) {
    return {
      ...state,
      status: "blocked_validation",
      lastError: draft.validation.blockers.join(",") || "SEND_REQUEST_BLOCKED",
    };
  }

  return { ...state, status: event.type === "SEND_REQUEST" ? "sent" : transition.to, lastError: null };
}
