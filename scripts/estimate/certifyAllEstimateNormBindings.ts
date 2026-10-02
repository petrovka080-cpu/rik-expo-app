import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getProductionExpandedTemplate10000,
  isRegisteredProfessionalNormPackSourceId,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import { isDefinitionCoveredByBackfillBatches } from "./catalogBackfillConveyor";
import type { Estimate10000AuditProjection } from "./estimate10000AuditProjection";

export const GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS =
  "GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS" as const;
export const STOP_ALL_ESTIMATE_NORM_BINDINGS_NOT_CERTIFIED =
  "STOP_ALL_ESTIMATE_NORM_BINDINGS_NOT_CERTIFIED" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-all-norm-bindings-certification";

export type EstimateNormBindingCertificationSummary = {
  final_status:
    | typeof GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS
    | typeof STOP_ALL_ESTIMATE_NORM_BINDINGS_NOT_CERTIFIED;
  template_count: number;
  row_count: number;
  real_norm_pack_rows_count: number;
  generic_norm_rows_count: number;
  templates_with_real_norm_pack_rows_count: number;
  templates_only_generic_norms_count: number;
  fake_green_claimed: false;
  production_db_touched: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
};

export type EstimateNormBindingCertificationAccumulator = {
  templateCount: number;
  realRows: number;
  genericRows: number;
  rowCount: number;
  templatesWithRealRows: number;
  templatesOnlyGeneric: number;
};

export function createEstimateNormBindingCertificationAccumulator(): EstimateNormBindingCertificationAccumulator {
  return {
    templateCount: 0,
    realRows: 0,
    genericRows: 0,
    rowCount: 0,
    templatesWithRealRows: 0,
    templatesOnlyGeneric: 0,
  };
}

export function consumeEstimateNormBindingCertification(input: {
  accumulator: EstimateNormBindingCertificationAccumulator;
  definition: (typeof PRODUCTION_WORK_DEFINITIONS_10000)[number];
  rows: ReturnType<typeof getProductionExpandedTemplate10000>["rows"];
}): void {
  const coveredByBackfill = isDefinitionCoveredByBackfillBatches(input.definition);
  const templateRealRows = coveredByBackfill
    ? input.rows.filter((row) => isRegisteredProfessionalNormPackSourceId(row.normSourceId)).length
    : 0;
  const templateGenericRows = input.rows.length - templateRealRows;
  input.accumulator.templateCount += 1;
  input.accumulator.rowCount += input.rows.length;
  input.accumulator.realRows += templateRealRows;
  input.accumulator.genericRows += templateGenericRows;
  if (templateRealRows > 0) input.accumulator.templatesWithRealRows += 1;
  if (templateRealRows === 0) input.accumulator.templatesOnlyGeneric += 1;
}

export function buildEstimateNormBindingCertificationSummary(
  accumulator: EstimateNormBindingCertificationAccumulator,
): EstimateNormBindingCertificationSummary {
  const green = accumulator.templatesOnlyGeneric === 0 && accumulator.genericRows === 0;
  return {
    final_status: green
      ? GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS
      : STOP_ALL_ESTIMATE_NORM_BINDINGS_NOT_CERTIFIED,
    template_count: accumulator.templateCount,
    row_count: accumulator.rowCount,
    real_norm_pack_rows_count: accumulator.realRows,
    generic_norm_rows_count: accumulator.genericRows,
    templates_with_real_norm_pack_rows_count: accumulator.templatesWithRealRows,
    templates_only_generic_norms_count: accumulator.templatesOnlyGeneric,
    fake_green_claimed: false,
    production_db_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
  };
}

export function runCertifyAllEstimateNormBindings(options: {
  writeSummary?: boolean;
  projection?: Estimate10000AuditProjection;
} = {}): EstimateNormBindingCertificationSummary {
  const accumulator = createEstimateNormBindingCertificationAccumulator();

  if (!options.projection) {
    for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
      const template = getProductionExpandedTemplate10000(definition.workKey);
      consumeEstimateNormBindingCertification({ accumulator, definition, rows: template.rows });
    }
  }
  const summary = options.projection?.certification
    ?? buildEstimateNormBindingCertificationSummary(accumulator);

  if (options.writeSummary !== false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  }

  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/certifyAllEstimateNormBindings.ts")) {
  const summary = runCertifyAllEstimateNormBindings();
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.final_status === GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS ? 0 : 1;
}
