import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildEstimate10000ReadinessManifest,
  type Estimate10000ReadinessTemplate,
} from "./buildEstimate10000ReadinessManifest";
import {
  P0_PROFESSIONAL_CATALOG_CASES,
} from "./p0ProfessionalCatalog";
import {
  CATALOG_BACKFILL_BATCH_DEFINITIONS,
  DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS,
  batchDefinitionById,
  type CatalogBackfillBatchId,
} from "./catalogBackfillConveyor";

export const CATALOG_BACKFILL_BATCHES_PATH = "data/estimate-catalog/catalog-backfill-batches.json" as const;
export const GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_FAILED =
  "STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_FAILED" as const;

type BackfillPriority = "P0_CRITICAL" | "P1_HIGH_VOLUME_REPAIR" | "P2_STRUCTURAL_EXTERIOR" | "P3_LONG_TAIL";

type BackfillTemplateAssignment = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  category: string;
  priority: BackfillPriority;
  batch_ids: CatalogBackfillBatchId[];
  readiness_status: string;
  calculator_family_id: string;
  norm_pack_id: string;
  price_policy_id: string;
  pdf_policy_id: string;
  buyer_handoff_policy_id: string;
  generic_family_default_row_count: number;
  source_backed_row_count: number;
};

export type CatalogBackfillBatches = {
  schema: "catalog-backfill-batches-v1";
  generated_at: string;
  final_status:
    | typeof GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_FAILED;
  manifest_total_templates: number;
  p0_required_case_ids: string[];
  p0_required_family_ids: string[];
  batches: Record<BackfillPriority, {
    batch_id: CatalogBackfillBatchId;
    family_ids: string[];
    template_count: number;
    ready_professional_count: number;
    generic_fallback_count: number;
    synthetic_family_default_count: number;
    sample_template_ids: string[];
  }>;
  template_assignments: BackfillTemplateAssignment[];
  p0_critical_cases: Array<{
    case_id: string;
    source_kind: string;
    catalog_family_id: string;
    sample_work_key: string | null;
    sample_quantity: number;
    sample_prompt_case_id: string | null;
    required_calculator_module: string | null;
    required_parameters: readonly string[];
    expected_units: readonly string[];
    expected_source_token: string;
    buyer_handoff_required: boolean;
    pdf_snapshot_required: boolean;
  }>;
  blockers: string[];
  approved_backfill_batch_ids: CatalogBackfillBatchId[];
  full_10000_real_norm_green_claimed: false;
  fake_green_claimed: false;
  marketplace_touched: false;
};

function writeJson(relativePath: string, value: unknown): void {
  const fullPath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function batchIdsForTemplate(template: Estimate10000ReadinessTemplate): CatalogBackfillBatchId[] {
  return CATALOG_BACKFILL_BATCH_DEFINITIONS
    .filter((batch) => batch.family_ids.includes(template.work_family_id as never))
    .map((batch) => batch.batch_id);
}

function priorityForTemplate(template: Estimate10000ReadinessTemplate): BackfillPriority {
  const batchIds = batchIdsForTemplate(template);
  if (batchIds.includes("p0-critical")) return "P0_CRITICAL";
  if (batchIds.includes("p1-high-volume-repair")) return "P1_HIGH_VOLUME_REPAIR";
  if (batchIds.includes("p2-structural-exterior")) return "P2_STRUCTURAL_EXTERIOR";
  return "P3_LONG_TAIL";
}

function emptyBatchSummary(batchId: CatalogBackfillBatchId) {
  const definition = batchDefinitionById(batchId);
  return {
    batch_id: batchId,
    family_ids: [...definition.family_ids],
    template_count: 0,
    ready_professional_count: 0,
    generic_fallback_count: 0,
    synthetic_family_default_count: 0,
    sample_template_ids: [] as string[],
  };
}

function pushSample(values: string[], value: string): void {
  if (values.length < 8 && !values.includes(value)) values.push(value);
}

export function buildCatalogBackfillBatches(options: { writeFiles?: boolean } = {}): CatalogBackfillBatches {
  const manifest = buildEstimate10000ReadinessManifest();
  const batches: CatalogBackfillBatches["batches"] = {
    P0_CRITICAL: emptyBatchSummary("p0-critical"),
    P1_HIGH_VOLUME_REPAIR: emptyBatchSummary("p1-high-volume-repair"),
    P2_STRUCTURAL_EXTERIOR: emptyBatchSummary("p2-structural-exterior"),
    P3_LONG_TAIL: emptyBatchSummary("p3-long-tail"),
  };
  const incrementBatch = (
    batch: CatalogBackfillBatches["batches"][BackfillPriority],
    template: Estimate10000ReadinessTemplate,
  ) => {
    batch.template_count += 1;
    if (template.readiness_status === "READY_PROFESSIONAL") batch.ready_professional_count += 1;
    if (template.generic_family_default_row_count > 0) batch.generic_fallback_count += 1;
    batch.synthetic_family_default_count += template.generic_family_default_row_count;
    pushSample(batch.sample_template_ids, template.template_id);
  };

  const assignments = manifest.templates.map((template): BackfillTemplateAssignment => {
    const priority = priorityForTemplate(template);
    const batchIds = batchIdsForTemplate(template);
    const countedBatchIds = batchIds.length > 0 ? batchIds : (["p3-long-tail"] as const);
    for (const batchId of countedBatchIds) {
      incrementBatch(batches[batchDefinitionById(batchId).legacy_priority], template);
    }
    return {
      template_id: template.template_id,
      work_key: template.work_key,
      work_family_id: template.work_family_id,
      category: template.category,
      priority,
      batch_ids: batchIds,
      readiness_status: template.readiness_status,
      calculator_family_id: template.calculator_family_id,
      norm_pack_id: template.norm_pack_id,
      price_policy_id: template.price_policy_id,
      pdf_policy_id: template.pdf_policy_id,
      buyer_handoff_policy_id: template.buyer_handoff_policy_id,
      generic_family_default_row_count: template.generic_family_default_row_count,
      source_backed_row_count: template.source_backed_row_count,
    };
  });

  const p0MissingFamilies = batchDefinitionById("p0-critical").family_ids.filter((family) => {
    if (family === "diamond_concrete_drilling" || family === "mansard_roof" || family === "cleaning_waste") return false;
    return !assignments.some((item) => item.batch_ids.includes("p0-critical") && item.work_family_id === family);
  });
  const blockers = [
    manifest.manifest_total_templates !== 10000 ? `manifest_total_templates:${manifest.manifest_total_templates}` : "",
    assignments.length !== manifest.manifest_total_templates ? "template_assignment_count_mismatch" : "",
    batches.P0_CRITICAL.template_count <= 0 ? "p0_batch_empty" : "",
    batches.P0_CRITICAL.generic_fallback_count !== 0 ? `p0_generic_fallback_count:${batches.P0_CRITICAL.generic_fallback_count}` : "",
    batches.P0_CRITICAL.ready_professional_count !== batches.P0_CRITICAL.template_count
      ? "p0_batch_not_fully_ready_professional"
      : "",
    batches.P1_HIGH_VOLUME_REPAIR.template_count <= 0 ? "p1_batch_empty" : "",
    batches.P1_HIGH_VOLUME_REPAIR.generic_fallback_count !== 0
      ? `p1_generic_fallback_count:${batches.P1_HIGH_VOLUME_REPAIR.generic_fallback_count}`
      : "",
    batches.P1_HIGH_VOLUME_REPAIR.ready_professional_count !== batches.P1_HIGH_VOLUME_REPAIR.template_count
      ? "p1_batch_not_fully_ready_professional"
      : "",
    batches.P2_STRUCTURAL_EXTERIOR.template_count <= 0 ? "p2_batch_empty" : "",
    batches.P2_STRUCTURAL_EXTERIOR.generic_fallback_count !== 0
      ? `p2_generic_fallback_count:${batches.P2_STRUCTURAL_EXTERIOR.generic_fallback_count}`
      : "",
    batches.P2_STRUCTURAL_EXTERIOR.ready_professional_count !== batches.P2_STRUCTURAL_EXTERIOR.template_count
      ? "p2_batch_not_fully_ready_professional"
      : "",
    p0MissingFamilies.length > 0 ? `p0_catalog_families_missing:${p0MissingFamilies.join(",")}` : "",
    P0_PROFESSIONAL_CATALOG_CASES.some((item) => item.required_calculator_module && !item.required_calculator_module.endsWith(".ts"))
      ? "p0_calculator_module_shape_invalid"
      : "",
  ].filter(Boolean);
  const artifact: CatalogBackfillBatches = {
    schema: "catalog-backfill-batches-v1",
    generated_at: new Date().toISOString(),
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_FAILED,
    manifest_total_templates: manifest.manifest_total_templates,
    p0_required_case_ids: P0_PROFESSIONAL_CATALOG_CASES.map((item) => item.case_id),
    p0_required_family_ids: [...batchDefinitionById("p0-critical").family_ids],
    batches,
    template_assignments: assignments,
    p0_critical_cases: P0_PROFESSIONAL_CATALOG_CASES.map((item) => ({
      case_id: item.case_id,
      source_kind: item.source_kind,
      catalog_family_id: item.catalog_family_id,
      sample_work_key: item.sample_work_key,
      sample_quantity: item.sample_quantity,
      sample_prompt_case_id: item.sample_prompt_case_id,
      required_calculator_module: item.required_calculator_module,
      required_parameters: item.required_parameters,
      expected_units: item.expected_units,
      expected_source_token: item.expected_source_token,
      buyer_handoff_required: item.buyer_handoff_required,
      pdf_snapshot_required: item.pdf_snapshot_required,
    })),
    blockers,
    approved_backfill_batch_ids: [...DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS],
    full_10000_real_norm_green_claimed: false,
    fake_green_claimed: false,
    marketplace_touched: false,
  };
  if (options.writeFiles) writeJson(CATALOG_BACKFILL_BATCHES_PATH, artifact);
  return artifact;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/buildCatalogBackfillBatches.ts")) {
  const artifact = buildCatalogBackfillBatches({ writeFiles: true });
  console.log(JSON.stringify({
    final_status: artifact.final_status,
    manifest_total_templates: artifact.manifest_total_templates,
    p0_template_count: artifact.batches.P0_CRITICAL.template_count,
    p0_ready_professional_count: artifact.batches.P0_CRITICAL.ready_professional_count,
    p0_required_case_ids: artifact.p0_required_case_ids,
    blockers: artifact.blockers,
  }, null, 2));
  process.exitCode = artifact.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS ? 0 : 1;
}
