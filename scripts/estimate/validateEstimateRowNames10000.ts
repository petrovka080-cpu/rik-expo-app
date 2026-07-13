import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import { buildProfessionalEstimateCatalogBindings } from "../../src/features/estimates/catalog/workCatalogResolver";
import { hasMojibakeText } from "./auditEstimatePdfReality";

export const GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_ROW_NAMES_OR_CATALOG_IDS_FAILED =
  "STOP_AI_ESTIMATE_10000_ROW_NAMES_OR_CATALOG_IDS_FAILED" as const;

export function validateEstimateRowNames10000() {
  let templateCount = 0;
  let rowCount = 0;
  let rowsWithCatalogIds = 0;
  let rowsWithProfessionalNames = 0;
  let mojibakeRows = 0;
  let unnamedRows = 0;
  const blockers: string[] = [];

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    templateCount += 1;
    const estimate = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: 100,
      countryCode: "KG",
    });
    const bindings = buildProfessionalEstimateCatalogBindings({ definition, estimate });
    if (bindings.rows.length !== estimate.rows.length) {
      blockers.push(`${definition.workKey}:row_binding_count_mismatch`);
    }
    for (const row of bindings.rows) {
      rowCount += 1;
      if (row.catalog_item_id) rowsWithCatalogIds += 1;
      if (row.professional_name_ru.trim()) rowsWithProfessionalNames += 1;
      if (!row.professional_name_ru.trim()) unnamedRows += 1;
      if (hasMojibakeText(row.professional_name_ru)) mojibakeRows += 1;
    }
  }

  if (templateCount !== 10000) blockers.push(`template_count:${templateCount}`);
  if (rowsWithCatalogIds !== rowCount) blockers.push("row_catalog_ids_missing");
  if (rowsWithProfessionalNames !== rowCount) blockers.push("professional_names_missing");
  if (unnamedRows !== 0) blockers.push(`unnamed_rows:${unnamedRows}`);
  if (mojibakeRows !== 0) blockers.push(`mojibake_rows:${mojibakeRows}`);

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_ROW_NAMES_OR_CATALOG_IDS_FAILED,
    template_count: templateCount,
    row_count: rowCount,
    rows_with_catalog_ids: rowsWithCatalogIds,
    rows_with_professional_names: rowsWithProfessionalNames,
    unnamed_rows: unnamedRows,
    mojibake_rows: mojibakeRows,
    blockers,
  };
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("VALIDATE_ESTIMATE_ROW_NAMES_10000_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateEstimateRowNames10000.ts")) {
  try {
    requireAllFlag();
    const result = validateEstimateRowNames10000();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.final_status === GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
