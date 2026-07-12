import type {
  EditableEstimateRow,
  EditableEstimateSnapshot,
} from "../ai/editableEstimate";
import type {
  EstimateRevisionSnapshot,
  EstimateRevisionState,
} from "../ai/estimateRevisions";
import type {
  ConsumerRepairDraftBundle,
  ConsumerRepairRequestItem,
} from "../consumerRequests/consumerRequestTypes";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionState,
  ProfessionalBoqRow,
} from "../estimate/estimateDraftRevisionContract";
import {
  appendConsumerRepairDurableSaveDiagnosticEvent,
  isConsumerRepairApprovedHistoryStatus,
} from "./consumerRepairDurableSavePolicy";

function stringLimit(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function compactScalarRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const compact: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (isScalar(raw)) compact[key] = raw;
  }
  return Object.keys(compact).length > 0 ? compact : null;
}

export function compactConsumerRepairSourceParameters(
  sourceParameters: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!sourceParameters) return null;
  const extractedParams = compactScalarRecord(sourceParameters.extractedParams);
  const keepKeys = [
    "inlineWorkPrompt",
    "inlineWorkPromptTemplateId",
    "inlineWorkPromptFamilyId",
    "inlineWorkPromptRowIndex",
    "expandedComplexCalculator",
    "expandedComplexWorkFamilyId",
    "expandedComplexLineType",
    "includedInProcurement",
    "estimateDraftRevisionId",
    "estimateDraftPreviousRevisionId",
    "estimateDraftSource",
    "estimateDraftSelectedTemplateId",
    "rowCode",
    "area_m2",
    "length_m",
    "line_length_m",
    "width_m",
    "height_m",
    "ceiling_height_m",
    "depth_mm",
    "trench_width_m",
    "trench_depth_m",
    "insulation_thickness_mm",
    "diameter_mm",
    "volume_m3",
    "count",
    "bathrooms_count",
    "electrical_points",
    "water_points",
    "sewer_points",
    "roof_windows_count",
    "poles_count",
    "pole_step_m",
    "voltage_kv",
  ];
  const compact: Record<string, unknown> = {};
  for (const key of keepKeys) {
    const value = sourceParameters[key];
    if (isScalar(value)) compact[key] = value;
  }
  if (extractedParams) compact.extractedParams = extractedParams;
  return Object.keys(compact).length > 0 ? compact : null;
}

function compactConsumerRepairItemForDurableStorage(
  item: ConsumerRepairRequestItem,
): ConsumerRepairRequestItem {
  return {
    id: item.id,
    requestDraftId: item.requestDraftId,
    itemType: item.itemType,
    titleRu: item.titleRu,
    quantity: item.quantity,
    unit: item.unit,
    unitLabel: item.unitLabel,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    currency: item.currency,
    source: item.source,
    catalogItemId: item.catalogItemId,
    selectedCatalogItemId: item.selectedCatalogItemId,
    materialKey: item.materialKey,
    category: item.category,
    priceStatus: item.priceStatus,
    priceSource: item.priceSource,
    priceSourceId: item.priceSourceId,
    priceSourceLabel: item.priceSourceLabel,
    costConfidence: item.costConfidence,
    confidence: item.confidence,
    addedBy: item.addedBy,
    editableByConsumer: item.editableByConsumer,
    createdAt: item.createdAt,
  };
}

function compactEditableEstimateRowForDurableStorage(row: EditableEstimateRow): EditableEstimateRow {
  return {
    ...row,
    calculationTrace: stringLimit(row.calculationTrace, 720),
    sourceParameters: compactConsumerRepairSourceParameters(row.sourceParameters),
    catalogCandidates: [],
  };
}

function compactEditableEstimateSnapshotForDurableStorage(
  snapshot: EditableEstimateSnapshot | null | undefined,
): EditableEstimateSnapshot | null {
  if (!snapshot) return null;
  return {
    ...snapshot,
    rows: snapshot.rows.map(compactEditableEstimateRowForDurableStorage),
  };
}

function compactEstimateRevisionSnapshotForDurableStorage(
  revision: EstimateRevisionSnapshot,
): EstimateRevisionSnapshot {
  return {
    ...revision,
    editable_estimate_snapshot: {
      ...revision.editable_estimate_snapshot,
      rows: revision.editable_estimate_snapshot.rows.map(compactEditableEstimateRowForDurableStorage),
    },
  };
}

function compactEstimateRevisionStateForDurableStorage(
  state: EstimateRevisionState | null | undefined,
): EstimateRevisionState | null {
  if (!state) return null;
  return {
    ...state,
    revisions: state.revisions.map(compactEstimateRevisionSnapshotForDurableStorage),
    events: state.events.slice(-32),
  };
}

function compactBoqRowForEmergencyStorage(row: ProfessionalBoqRow): ProfessionalBoqRow {
  return {
    ...row,
    calculationTrace: stringLimit(row.calculationTrace, 360),
    sourceParameters: compactConsumerRepairSourceParameters(row.sourceParameters),
    materialQuantity: null,
  };
}

function compactBoqRowForDurableStorage(row: ProfessionalBoqRow): ProfessionalBoqRow {
  return {
    ...row,
    calculationTrace: stringLimit(row.calculationTrace, 720),
    sourceParameters: compactConsumerRepairSourceParameters(row.sourceParameters),
    materialQuantity: null,
  };
}

function compactEstimateDraftRevisionForEmergencyStorage(
  revision: EstimateDraftRevision,
): EstimateDraftRevision {
  return {
    ...revision,
    boq: {
      sections: revision.boq.sections,
      rows: revision.boq.rows.map(compactBoqRowForEmergencyStorage),
    },
    trace: {
      ...revision.trace,
      rows: [],
    },
  };
}

function compactEstimateDraftRevisionForDurableStorage(
  revision: EstimateDraftRevision,
): EstimateDraftRevision {
  return {
    ...revision,
    boq: {
      sections: revision.boq.sections,
      rows: revision.boq.rows.map(compactBoqRowForDurableStorage),
    },
    trace: {
      ...revision.trace,
      rows: revision.trace.rows.map((row) => ({
        ...row,
        calculationTrace: stringLimit(row.calculationTrace, 360),
      })),
    },
  };
}

function compactEstimateDraftRevisionStateForEmergencyStorage(
  state: EstimateDraftRevisionState | null | undefined,
): EstimateDraftRevisionState | null {
  if (!state) return null;
  return {
    ...state,
    revisions: state.revisions.map(compactEstimateDraftRevisionForEmergencyStorage),
    diffs: state.diffs,
  };
}

function compactEstimateDraftRevisionStateForDurableStorage(
  state: EstimateDraftRevisionState | null | undefined,
): EstimateDraftRevisionState | null {
  if (!state) return null;
  return {
    ...state,
    revisions: state.revisions.map(compactEstimateDraftRevisionForDurableStorage),
    diffs: state.diffs,
  };
}

function compactEventPayload(payload: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return compactScalarRecord(payload) ?? {};
}

export function compactConsumerRepairBundleForDurableStorage(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  const approvedHistoryBundle = isConsumerRepairApprovedHistoryStatus(bundle.draft.status);
  return {
    ...bundle,
    items: bundle.items.map(compactConsumerRepairItemForDurableStorage),
    editableEstimateSnapshot: approvedHistoryBundle
      ? null
      : compactEditableEstimateSnapshotForDurableStorage(bundle.editableEstimateSnapshot),
    estimateRevisionState: approvedHistoryBundle
      ? null
      : compactEstimateRevisionStateForDurableStorage(bundle.estimateRevisionState),
    estimateDraftRevisionState: approvedHistoryBundle
      ? null
      : compactEstimateDraftRevisionStateForDurableStorage(bundle.estimateDraftRevisionState),
    structuredEstimatePayload: null,
    projectExecutionDrafts: [],
    events: bundle.events.slice(-24).map((event) => ({
      ...event,
      payload: compactEventPayload(event.payload),
    })),
  };
}

export function compactConsumerRepairBundleForEmergencyDurableStorage(
  bundle: ConsumerRepairDraftBundle,
  input: { reason?: string; createdAt?: string } = {},
): ConsumerRepairDraftBundle {
  const withDiagnostic = appendConsumerRepairDurableSaveDiagnosticEvent({
    bundle,
    reason: input.reason ?? "localStorage_quota_or_fragmentation",
    createdAt: input.createdAt,
  });
  return {
    ...compactConsumerRepairBundleForDurableStorage(withDiagnostic),
    items: withDiagnostic.items.map(compactConsumerRepairItemForDurableStorage),
    editableEstimateSnapshot: null,
    estimateRevisionState: null,
    estimateDraftRevisionState: compactEstimateDraftRevisionStateForEmergencyStorage(
      withDiagnostic.estimateDraftRevisionState,
    ),
    structuredEstimatePayload: null,
    projectExecutionDrafts: [],
    events: withDiagnostic.events.slice(-12).map((event) => ({
      ...event,
      payload: event.eventType === "consumer_repair_durable_save_emergency_compacted" ? event.payload : {},
    })),
  };
}
