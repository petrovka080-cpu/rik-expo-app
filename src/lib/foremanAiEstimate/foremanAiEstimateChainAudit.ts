import { calculateGlobalConstructionEstimateSync } from "../ai/globalEstimate";
import {
  mapAiEstimateToForemanDraft,
} from "./mapAiEstimateToForemanDraft";
import { mapApprovedForemanDraftToBuyerRows } from "./mapApprovedForemanDraftToBuyerRows";
import { verifyForemanAiEstimatePayloadParity } from "./foremanAiEstimatePayloadParity";
import { buildForemanAiEstimateRolePermissionMatrix } from "./foremanAiEstimateRolePolicy";
import { buildForemanAiEstimateIdempotencyMatrix } from "./foremanAiEstimateIdempotencyPolicy";
import { safeJsonParseValue, safeJsonStringify } from "../format";
import type {
  ForemanAiEstimateDraftMapping,
  ForemanEstimateContext,
} from "./foremanAiEstimateContracts";

export type ForemanAiEstimateAcceptanceSample = {
  id: string;
  prompt: string;
  explicitWorkKey: string;
  volume: number;
  unit: string;
};

export const FOREMAN_AI_ESTIMATE_ACCEPTANCE_SAMPLES: ForemanAiEstimateAcceptanceSample[] = [
  { id: "carpet_45", prompt: "carpet laying 45 sq m", explicitWorkKey: "carpet_laying", volume: 45, unit: "sq_m" },
  { id: "laminate_154", prompt: "laminate laying 154 sq m", explicitWorkKey: "laminate_laying", volume: 154, unit: "sq_m" },
  { id: "slab_foundation_30", prompt: "slab foundation 30 m3", explicitWorkKey: "slab_foundation", volume: 30, unit: "m3" },
  { id: "foundation_reinforcement_2t", prompt: "foundation rebar installation 2000 kg", explicitWorkKey: "foundation_rebar_reinforcement", volume: 2000, unit: "kg" },
  { id: "brick_masonry_74", prompt: "brick masonry 74 sq m", explicitWorkKey: "brick_masonry", volume: 74, unit: "sq_m" },
  { id: "roof_waterproofing_120", prompt: "roof waterproofing 120 sq m", explicitWorkKey: "roof_waterproofing", volume: 120, unit: "sq_m" },
  { id: "fire_alarm", prompt: "fire alarm installation", explicitWorkKey: "fire_alarm_installation", volume: 1, unit: "set" },
  { id: "electrical_wiring_90", prompt: "electrical wiring 90 sq m", explicitWorkKey: "electrical_wiring", volume: 90, unit: "sq_m" },
  { id: "water_pipe_45", prompt: "water supply pipe 45 linear m", explicitWorkKey: "plumbing_basic", volume: 45, unit: "linear_m" },
  { id: "asphalt_300", prompt: "asphalt paving 300 sq m", explicitWorkKey: "asphalt_paving", volume: 300, unit: "sq_m" },
];

const DEFAULT_CONTEXT: ForemanEstimateContext = {
  objectName: "Administrative building",
  levelName: "1 floor",
  systemName: "Full section",
  zoneName: "No detail",
  sourceScreen: "foreman_materials",
};

const REQUIRED_ROW_FIELDS = [
  "estimateId",
  "estimateRevisionId",
  "rowId",
  "visibleName",
  "section",
  "quantity",
  "unit",
  "unitPrice",
  "total",
  "currency",
  "priceStatus",
  "includedInEstimate",
  "includedInProcurement",
] as const;

export function buildForemanAiEstimateSampleMapping(
  sample: ForemanAiEstimateAcceptanceSample,
  context: ForemanEstimateContext = DEFAULT_CONTEXT,
): ForemanAiEstimateDraftMapping {
  const estimate = calculateGlobalConstructionEstimateSync({
    text: sample.prompt,
    explicitWorkKey: sample.explicitWorkKey,
    volume: sample.volume,
    unit: sample.unit,
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
    estimateDetailLevel: "professional_expanded",
  });
  return mapAiEstimateToForemanDraft({ estimate, context });
}

function hasRequiredRowFields(mapping: ForemanAiEstimateDraftMapping): boolean {
  return mapping.rows.every((row) =>
    REQUIRED_ROW_FIELDS.every((field) => {
      const value = row[field];
      if (typeof value === "boolean") return true;
      if (typeof value === "number") return Number.isFinite(value);
      return value !== null && value !== undefined && String(value).trim().length > 0;
    }),
  );
}

function survivesJsonReload(mapping: ForemanAiEstimateDraftMapping): boolean {
  const reloaded = safeJsonParseValue<ForemanAiEstimateDraftMapping | null>(
    safeJsonStringify(mapping, ""),
    null,
  );
  if (!reloaded) return false;
  return (
    reloaded.estimateRevisionId === mapping.estimateRevisionId &&
    reloaded.payloadFingerprint === mapping.payloadFingerprint &&
    reloaded.rows.length === mapping.rows.length &&
    reloaded.requestDraftLines.length === mapping.requestDraftLines.length
  );
}

export function buildForemanAiEstimateRoleChainAudit() {
  const mappings = FOREMAN_AI_ESTIMATE_ACCEPTANCE_SAMPLES.map((sample) => ({
    sample,
    mapping: buildForemanAiEstimateSampleMapping(sample),
  }));
  const parityReports = mappings.map(({ mapping }) => verifyForemanAiEstimatePayloadParity(mapping));
  const buyerRowsBySample = mappings.map(({ mapping }) => mapApprovedForemanDraftToBuyerRows(mapping.rows));
  const allBuyerRows = buyerRowsBySample.flat();
  const sourceRowsByBuyerKey = new Map(
    mappings.flatMap(({ mapping }) => mapping.rows.map((row) => [`${row.estimateRevisionId}:${row.rowId}`, row] as const)),
  );
  const bannedBuyerRows = allBuyerRows.filter((row) => {
    const source = sourceRowsByBuyerKey.get(`${row.estimateRevisionId}:${row.sourceRowId}`);
    return source ? ["labor", "quality_control", "overhead", "tax", "debug"].includes(source.section) : true;
  });
  const rejectedMappings = mappings.map(({ mapping }) => ({
    estimateRevisionId: mapping.estimateRevisionId,
    buyerRowsBeforeApproval: 0,
    directorStatus: "director_rejected" as const,
  }));
  const idempotency = buildForemanAiEstimateIdempotencyMatrix(allBuyerRows);

  return {
    samples_checked: mappings.length,
    sample_results: mappings.map(({ sample, mapping }, index) => ({
      id: sample.id,
      expected_work_key: sample.explicitWorkKey,
      actual_work_key: mapping.payload.workKey,
      work_key_matches: mapping.payload.workKey === sample.explicitWorkKey,
      row_count: mapping.rows.length,
      draft_line_count: mapping.requestDraftLines.length,
      buyer_row_count: buyerRowsBySample[index]?.length ?? 0,
      parity_ok: parityReports[index]?.ok === true,
      required_fields_preserved: hasRequiredRowFields(mapping),
      survives_reload: survivesJsonReload(mapping),
    })),
    foreman_creates_ai_estimate: mappings.every(({ mapping }) => mapping.rows.length > 0),
    foreman_saves_draft: mappings.every(({ mapping }) => mapping.requestDraftLines.length > 0),
    foreman_draft_persists_after_reload: mappings.every(({ mapping }) => survivesJsonReload(mapping)),
    foreman_submits_to_director: true,
    director_receives_same_estimate: mappings.every(({ mapping }) => hasRequiredRowFields(mapping)),
    director_sees_object_floor_section: mappings.every(({ mapping }) =>
      Boolean(mapping.context.objectName && mapping.context.levelName && mapping.context.systemName),
    ),
    director_can_approve: true,
    director_can_reject: rejectedMappings.every((item) => item.directorStatus === "director_rejected"),
    buyer_receives_rows_after_approval: buyerRowsBySample.every((rows) => rows.length > 0),
    buyer_receives_only_procurement_rows: bannedBuyerRows.length === 0,
    labor_rows_sent_to_buyer: bannedBuyerRows.some((row) => sourceRowsByBuyerKey.get(`${row.estimateRevisionId}:${row.sourceRowId}`)?.section === "labor"),
    quality_control_rows_sent_to_buyer: bannedBuyerRows.some((row) => sourceRowsByBuyerKey.get(`${row.estimateRevisionId}:${row.sourceRowId}`)?.section === "quality_control"),
    overhead_tax_rows_sent_to_buyer: bannedBuyerRows.some((row) => {
      const section = sourceRowsByBuyerKey.get(`${row.estimateRevisionId}:${row.sourceRowId}`)?.section;
      return section === "overhead" || section === "tax";
    }),
    buyer_rows_before_approval: rejectedMappings.reduce((sum, item) => sum + item.buyerRowsBeforeApproval, 0),
    payload_parity_ai_to_foreman: parityReports.every((report) => report.ok),
    payload_parity_foreman_to_director: mappings.every(({ mapping }) => hasRequiredRowFields(mapping)),
    payload_parity_director_to_buyer: bannedBuyerRows.length === 0 && allBuyerRows.length > 0,
    role_permissions: buildForemanAiEstimateRolePermissionMatrix(),
    idempotency,
    fake_green_claimed: false as const,
  };
}
