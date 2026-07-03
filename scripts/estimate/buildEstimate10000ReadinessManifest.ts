import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import { buildProfessionalTemplateCatalogBinding } from "../../src/features/estimates/catalog/workCatalogResolver";
import { classifyEstimateRowsReality } from "./classifyEstimateRowReality";
import {
  DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS,
  isDefinitionCoveredByBackfillBatches,
  isSourceAllowedForBackfilledTemplate,
  type CatalogBackfillBatchId,
} from "./catalogBackfillConveyor";

export const ESTIMATE_10000_READINESS_MANIFEST_PATH =
  "data/estimate-templates/estimate-10000-readiness-manifest.json" as const;

export type Estimate10000ReadinessStatus =
  | "READY_PROFESSIONAL"
  | "READY_QUANTITY_ONLY_PRICE_MISSING"
  | "NOT_READY_MISSING_NORM"
  | "NOT_READY_MISSING_FORMULA"
  | "NOT_READY_MISSING_MATERIAL_RECIPE"
  | "NOT_READY_MISSING_REQUIRED_PARAMS"
  | "NOT_READY_GENERIC_FALLBACK"
  | "NOT_READY_PDF_MISMATCH";

export type Estimate10000ReadinessTemplate = {
  template_id: string;
  work_key: string;
  work_family_id: string;
  calculator_family_id: string;
  work_catalog_item_id: string;
  parameter_schema_id: string;
  norm_pack_id: string;
  norm_version: string;
  material_recipe_id: string;
  labor_recipe_id: string;
  service_recipe_id: string | null;
  equipment_recipe_id: string | null;
  unit_policy_id: string;
  price_policy_id: string;
  pdf_policy_id: string;
  buyer_handoff_policy_id: string;
  work_type: string;
  category: string;
  localized_name_ru: string;
  aliases: string[];
  parameter_schema_status: "GENERIC_Q_ONLY" | "WORK_SPECIFIC";
  formula_status: "PRESENT" | "MISSING";
  material_recipe_status: "PRESENT" | "MISSING";
  labor_recipe_status: "PRESENT" | "MISSING";
  unit_policy_status: "PRESENT" | "MISSING";
  norm_source_status:
    | "READY_SOURCE_BACKED"
    | "PARTIAL_SOURCE_BACKED"
    | "GENERIC_FAMILY_DEFAULT"
    | "UNKNOWN_SOURCE";
  price_source_status: "MISSING_PRICE_STATE" | "PRICE_SOURCE_PRESENT" | "PRICE_SOURCE_MISSING";
  calculator_status: "GENERIC_QUANTITY_ONLY" | "WORK_SPECIFIC";
  pdf_status: "NOT_PROVEN" | "SNAPSHOT_TRACE_PRESENT";
  buyer_handoff_status: "MATERIAL_ROWS_PRESENT" | "NO_MATERIAL_ROWS";
  readiness_status: Estimate10000ReadinessStatus;
  blocking_reasons: string[];
  row_count: number;
  source_backed_row_count: number;
  generic_family_default_row_count: number;
};

export type Estimate10000ReadinessManifest = {
  schema: "estimate-10000-readiness-manifest-v1";
  generated_at: string;
  manifest_total_templates: number;
  approved_backfill_batch_ids: CatalogBackfillBatchId[];
  manifest_every_template_classified: boolean;
  ready_professional_count: number;
  quantity_only_price_missing_count: number;
  not_ready_count: number;
  generic_fallback_count: number;
  no_template_unclassified: boolean;
  full_10000_real_norm_green_claimed: boolean;
  fake_green_claimed: false;
  templates: Estimate10000ReadinessTemplate[];
};

type NormInventoryItem = {
  norm_id: string;
  norm_version: string;
  work_type: string;
  source_type: string;
  source_name: string;
  source_url_or_document_ref: string;
  source_date_or_version: string;
  provenance: string;
  quality_status: string;
  is_source_backed: boolean;
  is_generated: boolean;
  is_family_default: boolean;
  is_historical_price_only: boolean;
  formula_count: number;
  material_recipe_count: number;
  labor_recipe_count: number;
  unit_policy: string;
  required_parameters: string[];
  price_source_policy: string;
  readiness_classification:
    | "READY_SOURCE_BACKED"
    | "READY_QUANTITY_ONLY_PRICE_MISSING"
    | "NEEDS_REAL_NORM_SOURCE"
    | "NEEDS_FORMULA"
    | "NEEDS_MATERIAL_RECIPE"
    | "NEEDS_LABOR_RECIPE"
    | "NEEDS_PRICE_RATEBOOK"
    | "GENERIC_FAMILY_DEFAULT"
    | "INVALID_FAKE_SOURCE";
};

export function buildNormSourceInventory(): NormInventoryItem[] {
  const root = path.join(process.cwd(), "data", "estimate-norms", "professional");
  return readdirSync(root)
    .filter((name) => name.endsWith(".json") && name !== "work-group-remediation-plan.json")
    .sort()
    .flatMap((name) => {
      const payload = JSON.parse(readFileSync(path.join(root, name), "utf8")) as {
        work_group?: string;
        source_pack_version?: string;
        source_type?: string;
        review_status?: string;
        norm_items?: Array<{
          norm_id?: string;
          unit?: string;
          parameters?: string[];
          applicability?: Record<string, unknown>;
          source?: {
            title?: string;
            url?: string;
            page?: string;
            provenance?: string;
          };
        }>;
      };
      return (payload.norm_items ?? []).map((item): NormInventoryItem => {
        const formulaCount = item.applicability
          ? Object.keys(item.applicability).filter((key) => key.toLowerCase().includes("formula")).length
          : 0;
        return {
          norm_id: item.norm_id ?? "missing_norm_id",
          norm_version: payload.source_pack_version ?? "missing_version",
          work_type: payload.work_group ?? "unknown",
          source_type: payload.source_type ?? "unknown",
          source_name: item.source?.title ?? "unknown",
          source_url_or_document_ref: item.source?.url ?? item.source?.page ?? "unknown",
          source_date_or_version: payload.source_pack_version ?? "unknown",
          provenance: item.source?.provenance ?? "unknown",
          quality_status: payload.review_status ?? "unknown",
          is_source_backed: Boolean(item.source?.title && item.source?.url),
          is_generated: false,
          is_family_default: false,
          is_historical_price_only: false,
          formula_count: formulaCount,
          material_recipe_count: item.unit ? 1 : 0,
          labor_recipe_count: 0,
          unit_policy: item.unit ?? "missing",
          required_parameters: item.parameters ?? [],
          price_source_policy: "MISSING_PRICE_STATE_UNTIL_RATEBOOK_BOUND",
          readiness_classification: formulaCount > 0 ? "READY_QUANTITY_ONLY_PRICE_MISSING" : "NEEDS_FORMULA",
        };
      });
    });
}

function templateReadiness(definition: (typeof PRODUCTION_WORK_DEFINITIONS_10000)[number]): Estimate10000ReadinessTemplate {
  const compiled = compileProductionExpandedEstimate10000({
    workKey: definition.workKey,
    quantity: 100,
    countryCode: "KG",
  });
  const catalogBinding = buildProfessionalTemplateCatalogBinding(definition);
  const rowReality = classifyEstimateRowsReality(compiled.rows);
  const materialRows = compiled.rows.filter((row) => row.section === "materials" || row.lineType === "material");
  const laborRows = compiled.rows.filter((row) => row.section === "labor" || row.lineType === "work");
  const formulaPresent = compiled.rows.every((row) => Boolean(row.formulaId && row.calculationTrace?.includes("formula=")));
  const coveredByActiveBackfill = isDefinitionCoveredByBackfillBatches(definition);
  const sourceAllowedRowCount = coveredByActiveBackfill
    ? compiled.rows.filter((row) =>
      isSourceAllowedForBackfilledTemplate({
        sourceId: row.normSourceId,
        definition,
      })
    ).length
    : 0;
  const strictGenericFamilyDefaultRowCount = coveredByActiveBackfill
    ? rowReality.row_count - sourceAllowedRowCount
    : rowReality.row_count;
  const allRowsSourceBacked =
    rowReality.row_count > 0 &&
    rowReality.source_backed_count === rowReality.row_count &&
    sourceAllowedRowCount === rowReality.row_count;
  const hasAnySourceBacked = sourceAllowedRowCount > 0;
  const hasGenericRows = strictGenericFamilyDefaultRowCount > 0;
  const missingPriceState = compiled.rows.every((row) => row.priceStatus === "PRICE_MISSING" && row.unitPrice == null && row.total == null);
  const readinessStatus: Estimate10000ReadinessStatus = hasGenericRows
    ? "NOT_READY_GENERIC_FALLBACK"
    : !formulaPresent
      ? "NOT_READY_MISSING_FORMULA"
      : materialRows.length === 0
        ? "NOT_READY_MISSING_MATERIAL_RECIPE"
        : laborRows.length === 0
          ? "NOT_READY_MISSING_FORMULA"
          : !allRowsSourceBacked
            ? "NOT_READY_MISSING_NORM"
            : "READY_PROFESSIONAL";
  const blockingReasons = [
    hasGenericRows ? "generic_family_default_rows_present" : "",
    !coveredByActiveBackfill ? "work_family_not_closed_by_p0_p1_p2_backfill_conveyor" : "",
    !formulaPresent ? "formula_missing" : "",
    materialRows.length === 0 ? "material_recipe_missing" : "",
    laborRows.length === 0 ? "labor_recipe_missing" : "",
    !allRowsSourceBacked ? "not_every_row_has_source_backed_norm" : "",
    missingPriceState ? "" : "priced_rows_require_ratebook_or_missing_price_state",
    definition.supportStatus !== "SUPPORTED" ? `support_status:${definition.supportStatus}` : "",
  ].filter(Boolean);
  return {
    template_id: compiled.templateKey,
    work_key: definition.workKey,
    work_family_id: catalogBinding.work_family_id,
    calculator_family_id: catalogBinding.calculator_family_id,
    work_catalog_item_id: catalogBinding.work_catalog_item_id,
    parameter_schema_id: catalogBinding.parameter_schema_id,
    norm_pack_id: catalogBinding.norm_pack_id,
    norm_version: compiled.rows[0]?.normVersion ?? "missing",
    material_recipe_id: catalogBinding.material_recipe_id,
    labor_recipe_id: catalogBinding.labor_recipe_id,
    service_recipe_id: catalogBinding.service_recipe_id,
    equipment_recipe_id: catalogBinding.equipment_recipe_id,
    unit_policy_id: catalogBinding.unit_policy_id,
    price_policy_id: catalogBinding.price_policy_id,
    pdf_policy_id: catalogBinding.pdf_policy_id,
    buyer_handoff_policy_id: catalogBinding.buyer_handoff_policy_id,
    work_type: definition.operationKey,
    category: definition.category,
    localized_name_ru: definition.visibleNameRu,
    aliases: [definition.visibleNameRu, definition.workKey],
    parameter_schema_status: catalogBinding.parameter_schema_id ? "WORK_SPECIFIC" : "GENERIC_Q_ONLY",
    formula_status: formulaPresent ? "PRESENT" : "MISSING",
    material_recipe_status: materialRows.length > 0 ? "PRESENT" : "MISSING",
    labor_recipe_status: laborRows.length > 0 ? "PRESENT" : "MISSING",
    unit_policy_status: compiled.rows.every((row) => Boolean(row.unit && row.displayUnit)) ? "PRESENT" : "MISSING",
    norm_source_status: allRowsSourceBacked
      ? "READY_SOURCE_BACKED"
      : hasAnySourceBacked
        ? "PARTIAL_SOURCE_BACKED"
        : hasGenericRows
          ? "GENERIC_FAMILY_DEFAULT"
          : "UNKNOWN_SOURCE",
    price_source_status: missingPriceState ? "MISSING_PRICE_STATE" : "PRICE_SOURCE_PRESENT",
    calculator_status: "WORK_SPECIFIC",
    pdf_status: compiled.rows.every((row) => row.calculationTrace?.includes("template="))
      ? "SNAPSHOT_TRACE_PRESENT"
      : "NOT_PROVEN",
    buyer_handoff_status: materialRows.length > 0 ? "MATERIAL_ROWS_PRESENT" : "NO_MATERIAL_ROWS",
    readiness_status: readinessStatus,
    blocking_reasons: blockingReasons,
    row_count: rowReality.row_count,
    source_backed_row_count: sourceAllowedRowCount,
    generic_family_default_row_count: strictGenericFamilyDefaultRowCount,
  };
}

export function buildEstimate10000ReadinessManifest(): Estimate10000ReadinessManifest {
  const templates = PRODUCTION_WORK_DEFINITIONS_10000.map(templateReadiness);
  const readyProfessionalCount = templates.filter((item) => item.readiness_status === "READY_PROFESSIONAL").length;
  const quantityOnlyPriceMissingCount = templates.filter((item) =>
    item.readiness_status === "READY_QUANTITY_ONLY_PRICE_MISSING"
  ).length;
  const genericFallbackCount = templates.filter((item) => item.generic_family_default_row_count > 0).length;
  const notReadyCount = templates.filter((item) => item.readiness_status.startsWith("NOT_READY")).length;
  const fullGreen = templates.length === 10000 && readyProfessionalCount === 10000 && notReadyCount === 0 && genericFallbackCount === 0;
  return {
    schema: "estimate-10000-readiness-manifest-v1",
    generated_at: new Date().toISOString(),
    manifest_total_templates: templates.length,
    approved_backfill_batch_ids: [...DEFAULT_PROFESSIONAL_BACKFILL_BATCH_IDS],
    manifest_every_template_classified: templates.every((item) => Boolean(item.readiness_status)),
    ready_professional_count: readyProfessionalCount,
    quantity_only_price_missing_count: quantityOnlyPriceMissingCount,
    not_ready_count: notReadyCount,
    generic_fallback_count: genericFallbackCount,
    no_template_unclassified: templates.every((item) => Boolean(item.template_id && item.readiness_status)),
    full_10000_real_norm_green_claimed: fullGreen,
    fake_green_claimed: false,
    templates,
  };
}

export function writeEstimate10000ReadinessManifest(filePath = ESTIMATE_10000_READINESS_MANIFEST_PATH): Estimate10000ReadinessManifest {
  const manifest = buildEstimate10000ReadinessManifest();
  const fullPath = path.join(process.cwd(), filePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/buildEstimate10000ReadinessManifest.ts")) {
  const manifest = writeEstimate10000ReadinessManifest();
  const inventory = buildNormSourceInventory();
  console.log(JSON.stringify({
    manifest_path: ESTIMATE_10000_READINESS_MANIFEST_PATH,
    manifest_total_templates: manifest.manifest_total_templates,
    ready_professional_count: manifest.ready_professional_count,
    quantity_only_price_missing_count: manifest.quantity_only_price_missing_count,
    not_ready_count: manifest.not_ready_count,
    generic_fallback_count: manifest.generic_fallback_count,
    norm_inventory_count: inventory.length,
    full_10000_real_norm_green_claimed: manifest.full_10000_real_norm_green_claimed,
    fake_green_claimed: manifest.fake_green_claimed,
  }, null, 2));
}
