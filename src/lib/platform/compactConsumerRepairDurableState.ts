import type {
  EditableEstimateRow,
  EditableEstimateSnapshot,
} from "../ai/editableEstimate";
import type {
  EstimateRevisionSnapshot,
  EstimateRevisionState,
} from "../ai/estimateRevisions";
import type {
  ConsumerRepairDurableHistorySummary,
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

const CONSUMER_REPAIR_DURABLE_COMPACT_ITEMS_SCHEMA = "consumer_repair_bundle_compact_items_v1" as const;
const CONSUMER_REPAIR_DURABLE_EDITABLE_ROWS_SCHEMA =
  "consumer_repair_editable_snapshot_rows_compact_v1" as const;
const CONSUMER_REPAIR_DURABLE_HISTORY_SUMMARY_SCHEMA =
  "consumer_repair_durable_history_summary_v1" as const;

const CONSUMER_REPAIR_DURABLE_ITEM_FIELDS = [
  "id",
  "itemType",
  "titleRu",
  "quantity",
  "unit",
  "unitLabel",
  "unitPrice",
  "totalPrice",
  "currency",
  "source",
  "catalogItemId",
  "selectedCatalogItemId",
  "materialKey",
  "category",
  "priceStatus",
  "priceSource",
  "priceSourceId",
  "priceSourceLabel",
  "quantityEditedByConsumer",
  "priceEditedByConsumer",
  "sourceParameters",
  "costConfidence",
  "confidence",
  "addedBy",
  "editableByConsumer",
  "createdAt",
] satisfies (keyof ConsumerRepairRequestItem)[];

const CONSUMER_REPAIR_DURABLE_APPROVED_ITEM_FIELDS = [
  "id",
  "itemType",
  "titleRu",
  "quantity",
  "unit",
  "unitLabel",
  "unitPrice",
  "totalPrice",
  "currency",
  "source",
  "editableByConsumer",
  "createdAt",
] satisfies (keyof ConsumerRepairRequestItem)[];

const CONSUMER_REPAIR_DURABLE_EDITABLE_ROW_FIELDS = [
  "rowId",
  "requestItemId",
  "rowType",
  "titleRu",
  "quantity",
  "unit",
  "unitLabel",
  "unitPrice",
  "totalPrice",
  "currency",
  "rowSource",
  "catalogItemId",
  "selectedCatalogItemId",
  "materialKey",
  "rateKey",
  "catalogBindingStatus",
  "category",
  "sourceId",
  "sourceLabel",
  "formulaId",
  "quantityFormula",
  "calculationTrace",
  "sourceParameters",
  "templateId",
  "templateVersion",
  "normId",
  "normFamilyId",
  "normSourceId",
  "normSourceTitle",
  "normVersion",
  "normReviewStatus",
  "confidence",
  "addedBy",
  "editableByConsumer",
  "quantitySource",
  "priceStatus",
  "priceSource",
  "priceSourceId",
  "priceSourceLabel",
  "manualPrice",
  "selectedProductBinding",
  "removed",
] satisfies (keyof EditableEstimateRow)[];

type CompactConsumerRepairDurableItems = {
  schema: typeof CONSUMER_REPAIR_DURABLE_COMPACT_ITEMS_SCHEMA;
  requestDraftId: string;
  fields: readonly (keyof ConsumerRepairRequestItem)[];
  rows: unknown[][];
};

type CompactConsumerRepairDurableEditableRows = {
  schema: typeof CONSUMER_REPAIR_DURABLE_EDITABLE_ROWS_SCHEMA;
  fields: typeof CONSUMER_REPAIR_DURABLE_EDITABLE_ROW_FIELDS;
  rows: unknown[][];
};

function stringLimit(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function recordFromUnknown(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
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
    "passportBackedNaturalLanguageIngress",
    "sourceApplicabilityStatus",
    "templateId",
    "workKey",
    "familyId",
    "professionalBoqRuntimeContract",
    "professionalBoqRuntimeRowIndex",
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
    quantityEditedByConsumer: item.quantityEditedByConsumer,
    priceEditedByConsumer: item.priceEditedByConsumer,
    sourceParameters: compactConsumerRepairSourceParameters(item.sourceParameters),
    costConfidence: item.costConfidence,
    confidence: item.confidence,
    addedBy: item.addedBy,
    editableByConsumer: item.editableByConsumer,
    createdAt: item.createdAt,
  };
}

function compactConsumerRepairApprovedHistoryItemForDurableStorage(
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
    editableByConsumer: item.editableByConsumer,
    createdAt: item.createdAt,
  };
}

function latestGeneratedPdf(bundle: ConsumerRepairDraftBundle) {
  const currentRevisionId = bundle.estimateRevisionState?.current_revision_id
    ?? bundle.estimateDraftRevisionState?.currentRevisionId
    ?? bundle.durableHistorySummary?.sourceRevisionId
    ?? null;
  return bundle.pdfs.find((pdf) =>
    pdf.pdfStatus === "generated" && (!currentRevisionId || pdf.revisionId === currentRevisionId)
  ) ?? bundle.pdfs.find((pdf) => pdf.pdfStatus === "generated") ?? null;
}

function currentRevisionSnapshot(bundle: ConsumerRepairDraftBundle) {
  const currentRevisionId = bundle.estimateRevisionState?.current_revision_id;
  if (!currentRevisionId) return null;
  return bundle.estimateRevisionState?.revisions.find((revision) => revision.revision_id === currentRevisionId) ?? null;
}

function bundleRowMetrics(bundle: ConsumerRepairDraftBundle) {
  if (bundle.items.length > 0) {
    return {
      rowCount: bundle.items.length,
      materialRowsCount: bundle.items.filter((item) => item.itemType === "material").length,
      workRowsCount: bundle.items.filter((item) => item.itemType === "work").length,
      totalPrice: bundle.items.reduce((sum, item) => sum + (typeof item.totalPrice === "number" ? item.totalPrice : 0), 0),
      currency: bundle.items.find((item) => item.currency)?.currency ?? null,
    };
  }
  return {
    rowCount: bundle.durableHistorySummary?.rowCount ?? 0,
    materialRowsCount: bundle.durableHistorySummary?.materialRowsCount ?? 0,
    workRowsCount: bundle.durableHistorySummary?.workRowsCount ?? 0,
    totalPrice: bundle.durableHistorySummary?.totalPrice ?? null,
    currency: bundle.durableHistorySummary?.currency ?? null,
  };
}

export function buildConsumerRepairDurableHistorySummary(
  bundle: ConsumerRepairDraftBundle,
  input: { compactedAt?: string; fullSnapshotAvailable?: boolean } = {},
): ConsumerRepairDurableHistorySummary {
  const latestPdf = latestGeneratedPdf(bundle);
  const revision = currentRevisionSnapshot(bundle);
  const metrics = bundleRowMetrics(bundle);
  return {
    schemaVersion: CONSUMER_REPAIR_DURABLE_HISTORY_SUMMARY_SCHEMA,
    rowCount: metrics.rowCount,
    materialRowsCount: metrics.materialRowsCount,
    workRowsCount: metrics.workRowsCount,
    totalPrice: metrics.totalPrice,
    currency: metrics.currency,
    sourceRevisionId: bundle.estimateRevisionState?.current_revision_id
      ?? bundle.estimateDraftRevisionState?.currentRevisionId
      ?? latestPdf?.revisionId
      ?? bundle.durableHistorySummary?.sourceRevisionId
      ?? bundle.draft.id,
    sourceSnapshotId: latestPdf?.snapshotId
      ?? revision?.snapshot_id
      ?? bundle.editableEstimateSnapshot?.snapshotId
      ?? bundle.durableHistorySummary?.sourceSnapshotId
      ?? `editable_estimate:${bundle.draft.id}`,
    rowsHash: latestPdf?.revisionRowsHash
      ?? revision?.rows_hash
      ?? bundle.durableHistorySummary?.rowsHash
      ?? null,
    totalsHash: latestPdf?.revisionTotalsHash
      ?? revision?.totals_hash
      ?? bundle.durableHistorySummary?.totalsHash
      ?? null,
    fullSnapshotHash: latestPdf?.revisionFullSnapshotHash
      ?? revision?.full_snapshot_hash
      ?? bundle.editableEstimateSnapshot?.hash
      ?? bundle.durableHistorySummary?.fullSnapshotHash
      ?? null,
    pdfArtifactId: latestPdf?.id ?? bundle.durableHistorySummary?.pdfArtifactId ?? null,
    buyerHandoffId: bundle.marketplaceLink.marketplaceDemandId
      ?? bundle.durableHistorySummary?.buyerHandoffId
      ?? null,
    compactedAt: input.compactedAt ?? bundle.durableHistorySummary?.compactedAt ?? new Date().toISOString(),
    fullSnapshotAvailable: input.fullSnapshotAvailable ?? bundle.items.length > 0,
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

function compactEditableEstimateRowForEmergencyStorage(row: EditableEstimateRow): EditableEstimateRow {
  return {
    ...row,
    calculationTrace: stringLimit(row.calculationTrace, 240),
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

function compactEstimateRevisionSnapshotForEmergencyStorage(
  revision: EstimateRevisionSnapshot,
): EstimateRevisionSnapshot {
  return {
    ...revision,
    editable_estimate_snapshot: {
      ...revision.editable_estimate_snapshot,
      rows: revision.editable_estimate_snapshot.rows.map(compactEditableEstimateRowForEmergencyStorage),
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
    diffs: state.diffs.slice(-32),
  };
}

function compactEstimateRevisionStateForEmergencyStorage(
  state: EstimateRevisionState | null | undefined,
): EstimateRevisionState | null {
  if (!state) return null;
  const current = state.revisions.find((revision) => revision.revision_id === state.current_revision_id)
    ?? state.revisions.at(-1)
    ?? null;
  return {
    ...state,
    revisions: current ? [compactEstimateRevisionSnapshotForEmergencyStorage(current)] : [],
    events: state.events.slice(-16),
    diffs: [],
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
      rows: [],
    },
  };
}

function compactEstimateDraftRevisionStateForEmergencyStorage(
  state: EstimateDraftRevisionState | null | undefined,
): EstimateDraftRevisionState | null {
  if (!state) return null;
  const current = state.revisions.find((revision) => revision.revisionId === state.currentRevisionId)
    ?? state.revisions.at(-1)
    ?? null;
  return {
    ...state,
    revisions: current ? [compactEstimateDraftRevisionForEmergencyStorage(current)] : [],
    diffs: [],
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
    durableHistorySummary: approvedHistoryBundle
      ? buildConsumerRepairDurableHistorySummary(bundle, { fullSnapshotAvailable: bundle.items.length > 0 })
      : bundle.durableHistorySummary ?? null,
    items: bundle.items.map(approvedHistoryBundle
      ? compactConsumerRepairApprovedHistoryItemForDurableStorage
      : compactConsumerRepairItemForDurableStorage),
    editableEstimateSnapshot: approvedHistoryBundle || bundle.estimateRevisionState
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

export function compactConsumerRepairApprovedHistorySummaryBundleForDurableStorage(
  bundle: ConsumerRepairDraftBundle,
  input: { compactedAt?: string } = {},
): ConsumerRepairDraftBundle {
  const summary = buildConsumerRepairDurableHistorySummary(bundle, {
    compactedAt: input.compactedAt,
    fullSnapshotAvailable: false,
  });
  const compacted = compactConsumerRepairBundleForDurableStorage(bundle);
  return {
    ...compacted,
    durableHistorySummary: summary,
    items: [],
    editableEstimateSnapshot: null,
    estimateRevisionState: null,
    estimateDraftRevisionState: null,
    structuredEstimatePayload: null,
    projectExecutionDrafts: [],
    events: compacted.events.slice(-6),
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
  const approvedHistoryBundle = isConsumerRepairApprovedHistoryStatus(withDiagnostic.draft.status);
  return {
    ...compactConsumerRepairBundleForDurableStorage(withDiagnostic),
    items: withDiagnostic.items.map(approvedHistoryBundle
      ? compactConsumerRepairApprovedHistoryItemForDurableStorage
      : compactConsumerRepairItemForDurableStorage),
    editableEstimateSnapshot: null,
    estimateRevisionState: approvedHistoryBundle
      ? null
      : compactEstimateRevisionStateForEmergencyStorage(withDiagnostic.estimateRevisionState),
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

function encodeConsumerRepairDurableItems(
  items: ConsumerRepairRequestItem[],
  requestDraftId: string,
  fields: readonly (keyof ConsumerRepairRequestItem)[] = CONSUMER_REPAIR_DURABLE_ITEM_FIELDS,
): CompactConsumerRepairDurableItems {
  return {
    schema: CONSUMER_REPAIR_DURABLE_COMPACT_ITEMS_SCHEMA,
    requestDraftId,
    fields,
    rows: items.map((item) => fields.map((field) => item[field] ?? null)),
  };
}

function decodeConsumerRepairDurableItems(value: unknown, fallbackRequestDraftId: string): ConsumerRepairRequestItem[] | null {
  const compact = recordFromUnknown(value);
  if (!compact || compact.schema !== CONSUMER_REPAIR_DURABLE_COMPACT_ITEMS_SCHEMA) return null;
  if (!Array.isArray(compact.fields) || !Array.isArray(compact.rows)) return null;
  const fields = compact.fields.filter((field): field is keyof ConsumerRepairRequestItem =>
    typeof field === "string" &&
    CONSUMER_REPAIR_DURABLE_ITEM_FIELDS.includes(field as (typeof CONSUMER_REPAIR_DURABLE_ITEM_FIELDS)[number])
  );
  if (fields.length !== compact.fields.length) return null;
  const requestDraftId =
    typeof compact.requestDraftId === "string" && compact.requestDraftId.length > 0
      ? compact.requestDraftId
      : fallbackRequestDraftId;
  return compact.rows
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => {
      const item: Partial<ConsumerRepairRequestItem> = { requestDraftId };
      fields.forEach((field, index) => {
        const fieldValue = row[index];
        if (fieldValue !== undefined) {
          (item as Record<string, unknown>)[field] = fieldValue;
        }
      });
      item.requestDraftId = requestDraftId;
      return item as ConsumerRepairRequestItem;
    })
    .filter((item) => typeof item.id === "string" && item.id.length > 0);
}

function encodeEditableEstimateRows(rows: EditableEstimateRow[]): CompactConsumerRepairDurableEditableRows {
  return {
    schema: CONSUMER_REPAIR_DURABLE_EDITABLE_ROWS_SCHEMA,
    fields: CONSUMER_REPAIR_DURABLE_EDITABLE_ROW_FIELDS,
    rows: rows.map((row) => CONSUMER_REPAIR_DURABLE_EDITABLE_ROW_FIELDS.map((field) => row[field] ?? null)),
  };
}

function decodeEditableEstimateRows(value: unknown): EditableEstimateRow[] | null {
  const compact = recordFromUnknown(value);
  if (!compact || compact.schema !== CONSUMER_REPAIR_DURABLE_EDITABLE_ROWS_SCHEMA) return null;
  if (!Array.isArray(compact.fields) || !Array.isArray(compact.rows)) return null;
  const fields = compact.fields.filter((field): field is keyof EditableEstimateRow =>
    typeof field === "string" &&
    CONSUMER_REPAIR_DURABLE_EDITABLE_ROW_FIELDS.includes(
      field as (typeof CONSUMER_REPAIR_DURABLE_EDITABLE_ROW_FIELDS)[number],
    )
  );
  if (fields.length !== compact.fields.length) return null;
  return compact.rows
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => {
      const item: Partial<EditableEstimateRow> = {};
      fields.forEach((field, index) => {
        const fieldValue = row[index];
        if (fieldValue !== undefined) {
          (item as Record<string, unknown>)[field] = fieldValue;
        }
      });
      return item as EditableEstimateRow;
    })
    .filter((row) => typeof row.rowId === "string" && row.rowId.length > 0);
}

function encodeEditableEstimateSnapshotForDurableStorage(snapshot: EditableEstimateSnapshot | null | undefined): unknown {
  if (!snapshot) return snapshot ?? null;
  return {
    ...snapshot,
    rows: undefined,
    rowsCompactV1: encodeEditableEstimateRows(snapshot.rows),
  };
}

function decodeEditableEstimateSnapshotFromDurableStorage(value: unknown): EditableEstimateSnapshot | null {
  const snapshot = recordFromUnknown(value);
  if (!snapshot) return null;
  if (Array.isArray(snapshot.rows)) return snapshot as unknown as EditableEstimateSnapshot;
  const rows = decodeEditableEstimateRows(snapshot.rowsCompactV1);
  if (!rows) return null;
  const decoded = {
    ...snapshot,
    rows,
  };
  delete (decoded as Record<string, unknown>).rowsCompactV1;
  return decoded as unknown as EditableEstimateSnapshot;
}

function encodeEstimateRevisionStateForDurableStorage(state: EstimateRevisionState | null | undefined): unknown {
  if (!state) return state ?? null;
  return {
    ...state,
    revisions: state.revisions.map((revision) => ({
      ...revision,
      editable_estimate_snapshot: encodeEditableEstimateSnapshotForDurableStorage(revision.editable_estimate_snapshot),
    })),
  };
}

function decodeEstimateRevisionStateFromDurableStorage(value: unknown): EstimateRevisionState | null {
  const state = recordFromUnknown(value);
  if (!state) return null;
  const revisions = Array.isArray(state.revisions)
    ? state.revisions.map((revision) => {
        const revisionRecord = recordFromUnknown(revision);
        if (!revisionRecord) return null;
        const snapshot = decodeEditableEstimateSnapshotFromDurableStorage(revisionRecord.editable_estimate_snapshot);
        if (!snapshot) return null;
        return {
          ...revisionRecord,
          editable_estimate_snapshot: snapshot,
        } as EstimateRevisionSnapshot;
      })
    : [];
  if (revisions.some((revision) => revision == null)) return null;
  return {
    ...state,
    revisions: revisions as EstimateRevisionSnapshot[],
  } as unknown as EstimateRevisionState;
}

export function encodeConsumerRepairBundleForDurableStorage(bundle: ConsumerRepairDraftBundle): unknown {
  const approvedHistoryBundle = isConsumerRepairApprovedHistoryStatus(bundle.draft.status);
  return {
    ...bundle,
    items: undefined,
    itemsCompactV1: encodeConsumerRepairDurableItems(
      bundle.items,
      bundle.draft.id,
      approvedHistoryBundle ? CONSUMER_REPAIR_DURABLE_APPROVED_ITEM_FIELDS : CONSUMER_REPAIR_DURABLE_ITEM_FIELDS,
    ),
    editableEstimateSnapshot: encodeEditableEstimateSnapshotForDurableStorage(bundle.editableEstimateSnapshot),
    estimateRevisionState: encodeEstimateRevisionStateForDurableStorage(bundle.estimateRevisionState),
  };
}

export function decodeConsumerRepairBundleFromDurableStorage(value: unknown): ConsumerRepairDraftBundle | null {
  const record = recordFromUnknown(value);
  const draft = recordFromUnknown(record?.draft);
  const draftId = typeof draft?.id === "string" ? draft.id : null;
  if (!record || !draftId) return null;
  if (Array.isArray(record.items)) return record as unknown as ConsumerRepairDraftBundle;
  const items = decodeConsumerRepairDurableItems(record.itemsCompactV1, draftId);
  if (!items) return null;
  const decoded = {
    ...record,
    items,
    editableEstimateSnapshot: decodeEditableEstimateSnapshotFromDurableStorage(record.editableEstimateSnapshot),
    estimateRevisionState: decodeEstimateRevisionStateFromDurableStorage(record.estimateRevisionState),
  };
  delete (decoded as Record<string, unknown>).itemsCompactV1;
  const decodedRecord = decoded as Record<string, unknown>;
  if (!decodedRecord.editableEstimateSnapshot) {
    const revisionState = recordFromUnknown(decodedRecord.estimateRevisionState);
    const currentRevisionId = typeof revisionState?.current_revision_id === "string"
      ? revisionState.current_revision_id
      : null;
    const revisions = Array.isArray(revisionState?.revisions) ? revisionState.revisions : [];
    const currentRevision = revisions
      .map(recordFromUnknown)
      .find((revision) => revision?.revision_id === currentRevisionId);
    const snapshot = currentRevision?.editable_estimate_snapshot;
    if (snapshot && typeof snapshot === "object") {
      decodedRecord.editableEstimateSnapshot = snapshot;
    }
  }
  return decoded as unknown as ConsumerRepairDraftBundle;
}
