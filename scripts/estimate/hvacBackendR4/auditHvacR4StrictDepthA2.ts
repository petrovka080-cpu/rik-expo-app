import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { HVAC_DOMAIN_INVENTORY } from "../../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import {
  buildAllHvacPassports,
  HVAC_R4_EXTERNAL_A2_NON_DEMOLITION_INVENTORY,
  HVAC_R4_EXTERNAL_DEMOLITION_INVENTORY,
} from "./hvacR4Model";
import {
  HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS,
  HVAC_A2_STRICT_DEPTH_COMPLEXITY_DISPOSITIONS,
  HVAC_A2_STRICT_DEPTH_REPAIR_COMPONENTS,
} from "./hvacR4NormativeGapA2";
import { semanticSha256 } from "./support";

const ROOT = resolve(__dirname, "../../..");
const OUTPUT = join(ROOT, ".release-runtime", "batch007-hvac-r4", "evidence", "A2");
const FLOOR: Readonly<Record<string, number>> = Object.freeze({ L1: 60, L2: 120, L3: 250, L4: 500, L5: 1_000 });
const MODE = process.argv.includes("--after") ? "after" : "before";

function writeJson(name: string, value: unknown): void {
  mkdirSync(OUTPUT, { recursive: true });
  writeFileSync(join(OUTPUT, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function writeJsonl(name: string, values: readonly unknown[]): void {
  mkdirSync(OUTPUT, { recursive: true });
  writeFileSync(join(OUTPUT, name), `${values.map((value) => JSON.stringify(value)).join("\n")}\n`, "utf8");
}

function main(): void {
  const passports = buildAllHvacPassports();
  const inventory = [...HVAC_DOMAIN_INVENTORY, ...HVAC_R4_EXTERNAL_DEMOLITION_INVENTORY, ...HVAC_R4_EXTERNAL_A2_NON_DEMOLITION_INVENTORY];
  const inventoryById = new Map(inventory.map((row) => [row.catalog_id, row]));
  const specById = new Map(HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS.map((row) => [row.catalogId, row]));
  if (passports.length !== 1012 || inventoryById.size !== 1012) throw new Error(`HVAC_STRICT_DEPTH_DENOMINATOR_RED:${passports.length}:${inventoryById.size}`);
  const rows = passports.map((passport) => {
    const work = inventoryById.get(passport.catalogId)!;
    const spec = specById.get(passport.catalogId);
    const floor = FLOOR[passport.complexity]!;
    return {
      catalog_id: passport.catalogId,
      title_ru: work.display_title_ru,
      namespace: passport.catalogId.startsWith("external-hvac:") ? "external_reference" : "global",
      external_kind: passport.catalogId.startsWith("external-hvac:a2:") ? "A2_NON_DEMOLITION" : passport.catalogId.startsWith("external-hvac:") ? "DEMOLITION" : null,
      operation: work.operation_class,
      system: spec?.systemCluster ?? passport.profile.technology_class,
      technology: passport.profile.technology_class,
      primary_uom: spec?.primaryUom ?? null,
      complexity: passport.complexity,
      strict_floor: floor,
      resource_rows: passport.resources.length,
      deficit: Math.max(0, floor - passport.resources.length),
      components: passport.components.length,
      formulas: passport.formulas.length,
      source_id: spec?.sourceId ?? null,
      normative_table: spec?.sourceTable ?? null,
      normative_item: spec?.sourceItem ?? null,
      component_universe_sha256: semanticSha256(passport.components),
      formula_graph_sha256: semanticSha256(passport.formulas),
      resource_graph_sha256: semanticSha256(passport.resources.map((row) => row.resourceGraph)),
      status: !["L3", "L4", "L5"].includes(passport.complexity) || passport.resources.length >= floor ? "GREEN" : "RED_STRICT_DEPTH",
    };
  });
  const red = rows.filter((row) => row.status !== "GREEN");
  if (MODE === "before") {
    writeJsonl("A2_10_STRICT_DEPTH_BEFORE_ALL_1012.jsonl", rows);
    writeJsonl("A2_11_STRICT_DEPTH_BEFORE_RED.jsonl", red);
    writeJson("A2_12_STRICT_DEPTH_BEFORE_SUMMARY.json", {
      schemaVersion: "batch007-hvac-r4-a2-strict-depth-before.v1",
      floors: FLOOR,
      definitions: rows.length,
      red: red.length,
      redCatalogIdSetSha256: semanticSha256(red.map((row) => row.catalog_id).sort()),
      packageAllowed: false,
      contentGreenA2: false,
      status: red.length === 0 ? "UNEXPECTED_NO_REPAIR_BASELINE" : "RED_REPAIR_REQUIRED",
    });
    process.stdout.write(`${JSON.stringify({ definitions: rows.length, red: red.length, rows: red }, null, 2)}\n`);
    return;
  }
  const before = readFileSync(join(OUTPUT, "A2_11_STRICT_DEPTH_BEFORE_RED.jsonl"), "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const beforeById = new Map(before.map((row) => [row.catalog_id, row]));
  const dispositions = [...beforeById].map(([catalogId, old]) => {
    const current = rows.find((row) => row.catalog_id === catalogId);
    const slug = String(catalogId).replace(/^external-hvac:a2:/, "").replace(/:r4$/, "");
    const complexity = HVAC_A2_STRICT_DEPTH_COMPLEXITY_DISPOSITIONS[slug as keyof typeof HVAC_A2_STRICT_DEPTH_COMPLEXITY_DISPOSITIONS] ?? null;
    const addedComponents = HVAC_A2_STRICT_DEPTH_REPAIR_COMPONENTS[slug] ?? [];
    return {
      catalog_id: catalogId,
      repair_kind: complexity ? "FACTUAL_COMPLEXITY_CORRECTION" : "MISSING_PHYSICAL_SCOPE_REPAIR",
      factual_complexity_disposition: complexity,
      added_physical_components: addedComponents,
      added_physical_component_count: addedComponents.length,
      rows_added: current ? current.resource_rows - Number(old.resource_rows) : null,
      before: old,
      after: current ?? null,
      padding_rows_added: 0,
      duplicated_document_or_service_rows_added: 0,
      status: current?.status === "GREEN" && (complexity !== null || addedComponents.length > 0) ? "GREEN_REPAIRED_OR_RECLASSIFIED" : "RED",
    };
  });
  writeJsonl("A2_13_STRICT_DEPTH_AFTER_ALL_1012.jsonl", rows);
  writeJsonl("A2_14_STRICT_DEPTH_REPAIR_DISPOSITION.jsonl", dispositions);
  writeJson("A2_15_STRICT_DEPTH_AFTER_SUMMARY.json", { schemaVersion: "batch007-hvac-r4-a2-strict-depth-after.v1", floors: FLOOR, definitions: rows.length, beforeRed: before.length, afterRed: red.length, repaired: dispositions.filter((row) => row.status.startsWith("GREEN")).length, packageAllowed: red.length === 0, contentGreenA2: false, status: red.length === 0 ? "GREEN_STRICT_DEPTH_AWAITING_FRESH_CORPUS_AND_ORACLES_2X2" : "RED" });
  process.stdout.write(`${JSON.stringify({ definitions: rows.length, beforeRed: before.length, afterRed: red.length, red }, null, 2)}\n`);
  if (red.length) process.exitCode = 1;
}

main();
