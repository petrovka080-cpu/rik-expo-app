import {
  buildRequestEstimatePayloadSet,
  compareRequestEstimatePayloadParity,
} from "../../src/features/consumerRepair/buildRequestEstimatePayload";
import {
  initialRequestEstimateDraftReducerState,
  requestEstimateDraftReducer,
} from "../../src/features/consumerRepair/requestEstimateDraftReducer";
import type {
  RequestEstimateDraft,
  RequestEstimateDraftItem,
} from "../../src/features/consumerRepair/requestEstimateDraftTypes";
import { requestEstimateDraftWithValidation } from "../../src/features/consumerRepair/validateRequestEstimateDraft";

export const concreteRow: RequestEstimateDraftItem = {
  rowId: "row_concrete",
  source: "estimate",
  name: "Concrete M300",
  quantity: 32.64,
  unit: "m3",
  unitLabel: "m3",
  materialKey: "concrete_m300",
  rateKey: "strip_foundation_concrete_m300",
  unitPrice: 8455,
  total: 275971.2,
  sourceId: "rate_strip_foundation_concrete_m300",
  confidence: "high",
  bindingStatus: "multiple_candidates",
};

export const rebarRow: RequestEstimateDraftItem = {
  rowId: "row_rebar",
  source: "estimate",
  name: "Rebar",
  quantity: 170.5,
  unit: "kg",
  unitLabel: "kg",
  materialKey: "longitudinal_rebar",
  rateKey: "strip_foundation_longitudinal_rebar",
  unitPrice: 106.8,
  total: 18209.4,
  sourceId: "rate_strip_foundation_longitudinal_rebar",
  confidence: "high",
  bindingStatus: "multiple_candidates",
};

export const laborRow: RequestEstimateDraftItem = {
  rowId: "row_labor",
  source: "estimate",
  name: "Concrete pouring labor",
  quantity: 32.64,
  unit: "m3",
  unitLabel: "m3",
  rateKey: "strip_foundation_concrete_pour",
  unitPrice: 1068,
  total: 34859.52,
  sourceId: "rate_strip_foundation_concrete_pour",
  confidence: "high",
  bindingStatus: "not_material_row",
};

export function makeRequestEstimateDraft(overrides: Partial<RequestEstimateDraft> = {}): RequestEstimateDraft {
  return requestEstimateDraftWithValidation({
    draftId: "draft_state_001",
    estimateId: "estimate_state_001",
    workKey: "strip_foundation",
    title: "Strip foundation",
    description: "Foundation estimate 48 x 0.4 x 1.7",
    language: "ru",
    currency: "KGS",
    items: [concreteRow, rebarRow, laborRow],
    totals: {
      materialsTotal: 294180.6,
      laborTotal: 34859.52,
      equipmentTotal: 0,
      deliveryTotal: 0,
      taxTotal: 0,
      grandTotal: 329040.12,
    },
    validation: { canSave: true, canSend: true, blockers: [], warnings: [] },
    ...overrides,
  });
}

export function makeEditedParityScenario() {
  let state = requestEstimateDraftReducer(initialRequestEstimateDraftReducerState, { type: "GENERATE_ESTIMATE" });
  state = requestEstimateDraftReducer(state, { type: "ESTIMATE_READY", draft: makeRequestEstimateDraft() });
  state = requestEstimateDraftReducer(state, { type: "EDIT_QUANTITY", rowId: "row_concrete", quantity: 35 });
  state = requestEstimateDraftReducer(state, {
    type: "SELECT_CATALOG_ITEM",
    rowId: "row_concrete",
    catalogItemId: "catalog_concrete_m300",
    sourceId: "catalog_items",
  });
  state = requestEstimateDraftReducer(state, { type: "ADD_MANUAL_CATALOG_ITEM" });
  state = requestEstimateDraftReducer(state, { type: "ADD_CUSTOM_ITEM" });
  state = requestEstimateDraftReducer(state, { type: "REMOVE_ITEM", rowId: "row_rebar" });
  const payloads = buildRequestEstimatePayloadSet(state.draft!);
  const parity = compareRequestEstimatePayloadParity({
    visibleUi: payloads.visible_ui,
    pdfPayload: payloads.pdf_payload,
    saveDraftPayload: payloads.save_draft_payload,
    sendRequestPayload: payloads.send_request_payload,
    runtimeTracePayload: payloads.runtime_trace,
    removedRowIds: state.removedItems.map((item) => item.rowId),
  });
  return { state, payloads, parity };
}
