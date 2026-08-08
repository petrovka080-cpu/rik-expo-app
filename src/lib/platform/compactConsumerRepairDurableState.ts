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
import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate";
import {
  createEstimateDraftSession,
  hydrateExactDraft,
  markEstimateLegacyReviewRequired,
} from "../estimate/draftSession/estimateDraftSession";
import {
  appendConsumerRepairDurableSaveDiagnosticEvent,
  isConsumerRepairApprovedHistoryStatus,
} from "./consumerRepairDurableSavePolicy";

const CONSUMER_REPAIR_DURABLE_COMPACT_ITEMS_SCHEMA = "consumer_repair_bundle_compact_items_v1" as const;
const CONSUMER_REPAIR_DURABLE_EDITABLE_ROWS_SCHEMA =
  "consumer_repair_editable_snapshot_rows_compact_v1" as const;
const CONSUMER_REPAIR_DURABLE_HISTORY_SUMMARY_SCHEMA =
  "consumer_repair_durable_history_summary_v1" as const;
const CONSUMER_REPAIR_DURABLE_COMPRESSED_REVISION_STATE_SCHEMA =
  "consumer_repair_estimate_revision_state_zlib_v1" as const;

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
  "rateKey",
  "catalogBindingStatus",
  "catalogCandidates",
  "category",
  "sourceId",
  "sourceLabel",
  "formulaId",
  "quantityFormula",
  "calculationTrace",
  "templateId",
  "templateVersion",
  "normId",
  "normFamilyId",
  "normSourceId",
  "normSourceTitle",
  "normVersion",
  "normReviewStatus",
  "priceStatus",
  "priceSource",
  "priceSourceId",
  "priceSourceLabel",
  "priceTrace",
  "priceCandidates",
  "selectedProductBinding",
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
  "catalogCandidates",
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

type CompressedEstimateRevisionState = {
  schema: typeof CONSUMER_REPAIR_DURABLE_COMPRESSED_REVISION_STATE_SCHEMA;
  codec: "zlib+base64";
  rawByteLength: number;
  compressedByteLength: number;
  payload: string;
  current_revision_id: string;
  revision_count: number;
  history_binding_count: number;
  approval_freeze_count: number;
  revisions: Array<{
    revision_id: string;
    selected_work_key: string;
    rows_hash: string;
    editable_estimate_snapshot: {
      hash: string;
      row_count: number;
      passport_backed_row_count: number;
      first_quantity: number | null;
    };
  }>;
};

function stringLimit(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function recordFromUnknown(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function durableBytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const chunks: string[] = [];
  const inputChunkSize = 12_288;
  for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += inputChunkSize) {
    const chunkEnd = Math.min(bytes.length, chunkStart + inputChunkSize);
    let chunk = "";
    for (let index = chunkStart; index < chunkEnd; index += 3) {
      const first = bytes[index];
      const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
      const third = index + 2 < bytes.length ? bytes[index + 2] : 0;
      const triplet = (first << 16) | (second << 8) | third;
      chunk += alphabet[(triplet >> 18) & 63];
      chunk += alphabet[(triplet >> 12) & 63];
      chunk += index + 1 < bytes.length ? alphabet[(triplet >> 6) & 63] : "=";
      chunk += index + 2 < bytes.length ? alphabet[triplet & 63] : "=";
    }
    chunks.push(chunk);
  }
  return chunks.join("");
}

function durableBase64ToBytes(value: string): Uint8Array {
  const clean = value.replace(/\s+/g, "");
  if (clean.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(clean)) {
    throw new Error("CONSUMER_REPAIR_DURABLE_COMPRESSED_STATE_INVALID_BASE64");
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const first = alphabet.indexOf(clean[index]);
    const second = alphabet.indexOf(clean[index + 1]);
    const third = clean[index + 2] === "=" ? -1 : alphabet.indexOf(clean[index + 2]);
    const fourth = clean[index + 3] === "=" ? -1 : alphabet.indexOf(clean[index + 3]);
    if (first < 0 || second < 0 || (third < 0 && clean[index + 2] !== "=") || (fourth < 0 && clean[index + 3] !== "=")) {
      throw new Error("CONSUMER_REPAIR_DURABLE_COMPRESSED_STATE_INVALID_BASE64");
    }
    const triplet = (first << 18) | (second << 12) | ((third < 0 ? 0 : third) << 6) | (fourth < 0 ? 0 : fourth);
    bytes.push((triplet >> 16) & 255);
    if (third >= 0) bytes.push((triplet >> 8) & 255);
    if (fourth >= 0) bytes.push(triplet & 255);
  }
  return new Uint8Array(bytes);
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
    "includedInEstimate",
    "includedInProcurement",
    "roadworksWaveA",
    "domainResolutionReadiness",
    "executableAsphaltProfile",
    "requestedCatalogWorkId",
    "selectedWorkId",
    "canonicalWorkId",
    "canonicalModelId",
    "canonicalModelVersion",
    "scopePresetId",
    "semanticOwner",
    "professionalEstimatePassportId",
    "professionalEstimatePassportVersion",
    "calculationProfileId",
    "calculationProfileVersion",
    "parameterSchemaId",
    "parameterSchemaVersion",
    "normativeCompositionId",
    "semanticFingerprint",
    "migrationVersion",
    "scopeProfile",
    "asphaltV4ProfessionalCategory",
    "normativeSourceId",
    "roundingRule",
    "wasteRule",
    "procurementEligibility",
    "payable",
    "procurementOwner",
    "formulaGraphId",
    "canonicalPayloadFingerprintSeed",
    "wbsCode",
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
  const parameterSnapshot = compactScalarRecord(sourceParameters.parameterSnapshot);
  if (parameterSnapshot) compact.parameterSnapshot = parameterSnapshot;
  const roadworksParameterMetadata = recordFromUnknown(sourceParameters.roadworksWaveAParameterMetadata);
  if (roadworksParameterMetadata) {
    const metadata = Object.fromEntries(Object.entries(roadworksParameterMetadata).flatMap(([key, raw]) => {
      const record = recordFromUnknown(raw);
      if (!record) return [];
      const scalar = compactScalarRecord(record) ?? {};
      const choices = Array.isArray(record.choices)
        ? record.choices.flatMap((choice) => {
            const option = recordFromUnknown(choice);
            return typeof option?.value === "string" && typeof option?.labelRu === "string"
              ? [{ value: option.value, labelRu: option.labelRu }]
              : [];
          }).slice(0, 8)
        : [];
      return [[key, { ...scalar, ...(choices.length > 0 ? { choices } : {}) }]];
    }));
    if (Object.keys(metadata).length > 0) compact.roadworksWaveAParameterMetadata = metadata;
  }
  for (const key of ["assumptionKeys", "affectedBy"]) {
    const value = sourceParameters[key];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      compact[key] = value.slice(0, 64);
    }
  }
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
    rateKey: item.rateKey,
    catalogBindingStatus: item.catalogBindingStatus,
    catalogCandidates: [],
    category: item.category,
    sourceId: item.sourceId,
    sourceLabel: item.sourceLabel,
    formulaId: item.formulaId,
    quantityFormula: item.quantityFormula,
    calculationTrace: stringLimit(item.calculationTrace, 720),
    templateId: item.templateId,
    templateVersion: item.templateVersion,
    normId: item.normId,
    normFamilyId: item.normFamilyId,
    normSourceId: item.normSourceId,
    normSourceTitle: item.normSourceTitle,
    normVersion: item.normVersion,
    normReviewStatus: item.normReviewStatus,
    priceStatus: item.priceStatus,
    priceSource: item.priceSource,
    priceSourceId: item.priceSourceId,
    priceSourceLabel: item.priceSourceLabel,
    priceTrace: item.priceTrace,
    priceCandidates: item.priceCandidates,
    selectedProductBinding: item.selectedProductBinding,
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

function compactCurrentEstimateRevisionStateForDurableStorage(
  state: EstimateRevisionState | null | undefined,
): EstimateRevisionState | null {
  if (!state) return null;
  const current = state.revisions.find((revision) => revision.revision_id === state.current_revision_id)
    ?? state.revisions.at(-1)
    ?? null;
  return {
    ...state,
    revisions: current ? [compactEstimateRevisionSnapshotForDurableStorage(current)] : [],
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
    // The current bundle remains the canonical cold-replay source. Its hash-basis
    // fields must stay lossless; only the explicitly summary-only/emergency paths
    // below may truncate traces or discard typed BOQ/revision state.
    items: bundle.items,
    editableEstimateSnapshot: bundle.estimateRevisionState
      ? null
      : bundle.editableEstimateSnapshot ?? null,
    estimateRevisionState: bundle.estimateRevisionState ?? null,
    estimateDraftRevisionState: bundle.estimateDraftRevisionState ?? null,
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
        if (field === "removed" && fieldValue == null) return;
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
  const decodedRecord: Record<string, unknown> = {
    ...snapshot,
    rows,
  };
  delete decodedRecord.rowsCompactV1;
  return decodedRecord as unknown as EditableEstimateSnapshot;
}

function encodeEstimateRevisionStateForDurableStorage(state: EstimateRevisionState | null | undefined): unknown {
  if (!state) return state ?? null;
  const encodedState = {
    ...state,
    revisions: state.revisions.map((revision) => ({
      ...revision,
      editable_estimate_snapshot: encodeEditableEstimateSnapshotForDurableStorage(revision.editable_estimate_snapshot),
    })),
  };
  const serializedState = JSON.stringify(encodedState);
  const compressed = zlibSync(strToU8(serializedState), { level: 6 });
  const current = state.revisions.find((revision) => revision.revision_id === state.current_revision_id)
    ?? state.revisions.at(-1)
    ?? null;
  return {
    schema: CONSUMER_REPAIR_DURABLE_COMPRESSED_REVISION_STATE_SCHEMA,
    codec: "zlib+base64",
    rawByteLength: strToU8(serializedState).length,
    compressedByteLength: compressed.length,
    payload: durableBytesToBase64(compressed),
    current_revision_id: state.current_revision_id,
    revision_count: state.revisions.length,
    history_binding_count: state.history_bindings.length,
    approval_freeze_count: state.approval_freezes.length,
    revisions: current ? [{
      revision_id: current.revision_id,
      selected_work_key: current.selected_work_key,
      rows_hash: current.rows_hash,
      editable_estimate_snapshot: {
        hash: current.editable_estimate_snapshot.hash,
        row_count: current.editable_estimate_snapshot.rows.length,
        passport_backed_row_count: current.editable_estimate_snapshot.rows.filter((row) =>
          row.sourceParameters?.passportBackedNaturalLanguageIngress === true
        ).length,
        first_quantity: current.editable_estimate_snapshot.rows[0]?.quantity ?? null,
      },
    }] : [],
  } satisfies CompressedEstimateRevisionState;
}

function decodeEstimateRevisionStateFromDurableStorage(value: unknown): EstimateRevisionState | null {
  const state = recordFromUnknown(value);
  if (!state) return null;
  if (state.schema === CONSUMER_REPAIR_DURABLE_COMPRESSED_REVISION_STATE_SCHEMA) {
    if (state.codec !== "zlib+base64" || typeof state.payload !== "string") return null;
    try {
      const decoded = JSON.parse(strFromU8(unzlibSync(durableBase64ToBytes(state.payload))));
      return decodeEstimateRevisionStateFromDurableStorage(decoded);
    } catch {
      return null;
    }
  }
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
  const approvedHistorySummaryBundle =
    isConsumerRepairApprovedHistoryStatus(bundle.draft.status)
    && bundle.durableHistorySummary?.fullSnapshotAvailable === false;
  return {
    ...bundle,
    items: undefined,
    itemsCompactV1: encodeConsumerRepairDurableItems(
      bundle.items,
      bundle.draft.id,
      approvedHistorySummaryBundle
        ? CONSUMER_REPAIR_DURABLE_APPROVED_ITEM_FIELDS
        : CONSUMER_REPAIR_DURABLE_ITEM_FIELDS,
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
  const decodedRecord: Record<string, unknown> = {
    ...record,
    items,
    editableEstimateSnapshot: decodeEditableEstimateSnapshotFromDurableStorage(record.editableEstimateSnapshot),
    estimateRevisionState: decodeEstimateRevisionStateFromDurableStorage(record.estimateRevisionState),
  };
  if (record.estimateDraftSession != null) {
    const hydratedSession = hydrateExactDraft(record.estimateDraftSession, draftId);
    const estimateDraftSession =
      hydratedSession.status === "ok" || hydratedSession.status === "legacy"
        ? hydratedSession.session
        : markEstimateLegacyReviewRequired(
          createEstimateDraftSession({ draftId }),
          "corrupted_draft_session_snapshot",
        );
    decodedRecord.estimateDraftSession = estimateDraftSession;
    if (estimateDraftSession.status !== "SCOPE_REQUIRED") {
      decodedRecord.pendingRoadScopeSelection = null;
    }
  }
  delete decodedRecord.itemsCompactV1;
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
  return decodedRecord as unknown as ConsumerRepairDraftBundle;
}
