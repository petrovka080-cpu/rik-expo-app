import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
} from "../../src/lib/ai/estimateTemplate10000";

const RUNTIME_ROOT = ".release-runtime/ai-estimate-template-norm-bindings-wave1";

const WAVE1_TEMPLATE_BINDING_TARGETS = Object.freeze([
  { group: "tile", workKey: "tile_stone_interior_ceramic_tile_lay_standard", quantity: 45 },
  { group: "plaster", workKey: "plaster_paint_interior_wall_plaster_apply_standard", quantity: 300 },
  { group: "putty", workKey: "plaster_paint_interior_wall_putty_apply_standard", quantity: 200 },
  { group: "paint", workKey: "paint_wall_ceiling_2_coats", quantity: 200 },
  { group: "flooring", workKey: "self_leveling_floor_5mm", quantity: 100 },
  { group: "drywall", workKey: "drywall_ceiling_interior_drywall_partition_install_standard", quantity: 80 },
  { group: "waterproofing", workKey: "waterproofing_interior_wet_zone_apply_standard", quantity: 50 },
]);

const GROUP_BY_SOURCE_ID = new Map(PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => [item.sourceId, item.workGroup]));

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

export function runBindTemplatesToNorms(options: { writeSummary?: boolean } = {}) {
  const bindings = WAVE1_TEMPLATE_BINDING_TARGETS.map((target) => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: target.workKey,
      quantity: target.quantity,
      countryCode: "KG",
    });
    const realRows = compiled.rows.filter((row) => isProfessionalNormPackSourceId(row.normSourceId));
    const groups = uniqueSorted(realRows.map((row) => GROUP_BY_SOURCE_ID.get(row.normSourceId)));
    return {
      ...target,
      templateKey: compiled.templateKey,
      rowCount: compiled.rows.length,
      realNormPackRowsCount: realRows.length,
      realNormPackGroups: groups,
      realNormPackSourceIds: uniqueSorted(realRows.map((row) => row.normSourceId)),
      bound: groups.includes(target.group),
    };
  });
  const summary = {
    status: bindings.every((binding) => binding.bound)
      ? "GREEN_WAVE1_TEMPLATE_NORM_BINDINGS_READY"
      : "STOP_WAVE1_TEMPLATE_NORM_BINDINGS_MISSING",
    bindings,
    templates_bound_count: bindings.filter((binding) => binding.bound).length,
    templates_checked_count: bindings.length,
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

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/bindTemplatesToNorms.ts")) {
  console.log(JSON.stringify(runBindTemplatesToNorms(), null, 2));
}
