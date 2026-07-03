import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  getProductionExpandedTemplate10000,
  isProfessionalNormPackSourceId,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";

export const GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS =
  "GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS" as const;
export const STOP_ALL_ESTIMATE_NORM_BINDINGS_NOT_CERTIFIED =
  "STOP_ALL_ESTIMATE_NORM_BINDINGS_NOT_CERTIFIED" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-all-norm-bindings-certification";

export function runCertifyAllEstimateNormBindings(options: { writeSummary?: boolean } = {}) {
  let realRows = 0;
  let genericRows = 0;
  let rowCount = 0;
  let templatesWithRealRows = 0;
  let templatesOnlyGeneric = 0;

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const template = getProductionExpandedTemplate10000(definition.workKey);
    const templateRealRows = template.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId)).length;
    const templateGenericRows = template.rows.length - templateRealRows;
    rowCount += template.rows.length;
    realRows += templateRealRows;
    genericRows += templateGenericRows;
    if (templateRealRows > 0) templatesWithRealRows += 1;
    if (templateRealRows === 0) templatesOnlyGeneric += 1;
  }

  const green = templatesOnlyGeneric === 0 && genericRows === 0;
  const summary = {
    final_status: green
      ? GREEN_ALL_ESTIMATE_NORM_BINDINGS_CERTIFIED_NO_BUILDS
      : STOP_ALL_ESTIMATE_NORM_BINDINGS_NOT_CERTIFIED,
    template_count: PRODUCTION_WORK_DEFINITIONS_10000.length,
    row_count: rowCount,
    real_norm_pack_rows_count: realRows,
    generic_norm_rows_count: genericRows,
    templates_with_real_norm_pack_rows_count: templatesWithRealRows,
    templates_only_generic_norms_count: templatesOnlyGeneric,
    fake_green_claimed: false,
    production_db_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
  };

  if (options.writeSummary !== false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  }

  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/certifyAllEstimateNormBindings.ts")) {
  console.log(JSON.stringify(runCertifyAllEstimateNormBindings(), null, 2));
}
