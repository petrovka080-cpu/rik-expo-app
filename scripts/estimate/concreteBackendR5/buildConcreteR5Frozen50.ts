import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

import { assertExact, evidenceRoot, semanticSha256, writeJson } from "./support";

type Json = Record<string, any>;

const identityPath = join(evidenceRoot, "01-discovery", "CONCRETE_IDENTITY_SET.jsonl");
const corpusRoot = join(evidenceRoot, "05-content", "corpus");
const identities = readFileSync(identityPath, "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line) as Json);
const byId = new Map(identities.map((row) => [String(row.catalog_id), row]));

function sorted(rows: Json[]): Json[] { return rows.sort((a, b) => String(a.catalog_id).localeCompare(String(b.catalog_id))); }

const demolition = sorted(identities.filter((row) => row.classification === "CONCRETE_EXTERNAL_DEMOLITION")).slice(0, 10);
const externalUniverse = sorted(identities.filter((row) => row.classification === "CONCRETE_EXTERNAL_NON_DEMOLITION"));
const nonDemolition = Array.from({ length: 15 }, (_, index) => externalUniverse[Math.floor(index * (externalUniverse.length - 1) / 14)]!);
const globalUniverse = sorted(identities.filter((row) => row.classification === "CONCRETE_OWNER"));
const expandedFamilies = [...new Set(globalUniverse.filter((row) => String(row.family).startsWith("expanded:")).map((row) => String(row.family)))].sort();
const expanded = expandedFamilies.map((family) => globalUniverse.find((row) => row.family === family && row.operation === "AS_BUILT_ESTIMATE") ?? globalUniverse.find((row) => row.family === family)!).slice(0, 16);
const special = ["INJECT", "REPAIR", "STRENGTHEN", "TEST", "CLEAN"].map((operation) => globalUniverse.find((row) => row.family === "special_repair" && row.operation === operation)!).filter(Boolean);
const baseOperations = [...new Set(globalUniverse.filter((row) => row.family === "concrete_foundation").map((row) => String(row.operation)))].sort().slice(0, 4);
const base = baseOperations.map((operation) => globalUniverse.find((row) => row.family === "concrete_foundation" && row.operation === operation)!).filter(Boolean);
const selected = [...nonDemolition, ...expanded, ...special, ...base, ...demolition];
assertExact(selected.length === 50 && new Set(selected.map((row) => row.catalog_id)).size === 50, `CONCRETE_FROZEN_50_CARDINALITY_RED:${selected.length}`);

const works = new Map<string, Json>();
for (const line of readFileSync(join(corpusRoot, "CONCRETE_WORK_DEFINITIONS.jsonl"), "utf8").trim().split(/\r?\n/u)) {
  const row = JSON.parse(line) as Json;
  if (selected.some((item) => item.catalog_id === row.catalogId)) works.set(row.catalogId, row);
}

function valueFor(row: Json): unknown {
  if (row.valueType === "boolean") return true;
  if (row.valueType === "enum") return row.constraints?.values?.[0] ?? "PROJECT_SPECIFIED";
  if (row.valueType === "integer") return Math.max(1, Number(row.constraints?.minExclusive ?? 0) + 1);
  if (row.valueType === "decimal") return Number((Math.max(1, Number(row.constraints?.minExclusive ?? 0) + 1) + Number(row.ordinal % 17) / 100).toFixed(2));
  return `PROJECT_SPECIFIED_${String(row.parameterId).slice(0, 40)}`;
}

async function main(): Promise<void> {
  const parameters = new Map<string, Json[]>();
  const input = createInterface({ input: createReadStream(join(corpusRoot, "CONCRETE_PARAMETER_DEFINITIONS.jsonl"), "utf8"), crlfDelay: Infinity });
  for await (const raw of input) {
    if (!raw.trim()) continue;
    const row = JSON.parse(raw) as Json;
    if (!byId.has(row.catalogId) || !selected.some((item) => item.catalog_id === row.catalogId)) continue;
    const bucket = parameters.get(row.catalogId) ?? [];
    bucket.push(row);
    parameters.set(row.catalogId, bucket);
  }
  const wowNames = [
    "concrete_blinding", "isolated_footing", "strip_foundation", "foundation_slab", "basement_wall", "column_pylon", "beam_slab_system", "stairs_ramp", "retaining_wall", "watertight_reservoir",
    "mass_concrete", "winter_concreting", "hot_weather_concreting", "standard_precast_erection", "precast_manufacture", "post_tensioned_element", "special_concrete", "shotcrete", "patch_repair", "crack_injection",
    "controlled_demolition", "underwater_tremie", "structural_floor_boundary", "hydraulic_structure", "pile_cap_grillage", "dynamic_equipment_foundation", "seismic_wall_core", "flat_slab", "ribbed_waffle_slab", "cantilever_balcony",
    "transfer_structure", "slipformed_structure", "climbing_formwork", "tunnel_formwork", "one_sided_formwork", "precast_frame_erection", "precast_slab_erection", "precast_wall_panel", "precast_stairs_balcony", "precast_connections",
    "mechanical_couplers", "welded_cage_mesh", "post_installed_anchors", "concrete_jacketing", "externally_bonded_strengthening", "hydrodemolition", "damaged_concrete_repair", "core_extraction", "structural_proof_test", "crushing_sorting_recycling",
  ];
  const cases = selected.map((identity, index) => {
    const definitions = parameters.get(identity.catalog_id) ?? [];
    assertExact(definitions.length > 0 && works.has(identity.catalog_id), `CONCRETE_FROZEN_50_CONTENT_RED:${identity.catalog_id}`);
    const v1Inputs = Object.fromEntries(definitions.map((row) => [row.parameterId, valueFor(row)]));
    const editable = definitions.find((row) => ["decimal", "integer"].includes(row.valueType))!;
    const v2Inputs = { ...v1Inputs, [editable.parameterId]: Number(v1Inputs[editable.parameterId]) + 1 };
    const withoutHash = {
      caseId: `WOW-${String(index + 1).padStart(2, "0")}`,
      obligation: wowNames[index],
      catalogId: identity.catalog_id,
      titleRu: identity.canonical_title,
      classification: identity.classification,
      namespace: identity.namespace,
      denominatorEligible: identity.denominator_eligible,
      family: identity.family,
      operation: identity.operation,
      complexity: identity.complexity_class,
      workDefinitionSha256: works.get(identity.catalog_id)!.workDefinitionSha256,
      v1Inputs,
      edit: { parameterId: editable.parameterId, before: v1Inputs[editable.parameterId], after: v2Inputs[editable.parameterId] },
      v2Inputs,
    };
    return { ...withoutHash, expectedSemanticSha256: semanticSha256(withoutHash) };
  });
  const selection = cases.map(({ v1Inputs: _v1, v2Inputs: _v2, ...row }) => row);
  const selectionSha256 = semanticSha256(selection);
  const inputSha256 = semanticSha256(cases);
  const counts = {
    global: cases.filter((row) => row.classification === "CONCRETE_OWNER").length,
    externalDemolition: cases.filter((row) => row.classification === "CONCRETE_EXTERNAL_DEMOLITION").length,
    externalNonDemolition: cases.filter((row) => row.classification === "CONCRETE_EXTERNAL_NON_DEMOLITION").length,
    L4L5: cases.filter((row) => ["L4", "L5"].includes(row.complexity)).length,
    repairDemolitionQa: cases.filter((row) => row.operation === "DEMOLITION" || /repair|test|qa|inject|strengthen/i.test(`${row.family}:${row.operation}:${row.titleRu}`)).length,
  };
  assertExact(counts.global === 25 && counts.externalDemolition === 10 && counts.externalNonDemolition === 15 && counts.L4L5 >= 10 && counts.repairDemolitionQa >= 10, `CONCRETE_FROZEN_50_STRATA_RED:${JSON.stringify(counts)}`);
  writeJson("10-wow/FROZEN_50_SELECTION.json", { schemaVersion: "batch008-concrete-r5-frozen-50.v1", count: 50, distinctCatalogIds: 50, counts, selectionSha256, immutableAfterFirstBackendRun: true, cases: selection, status: "GREEN_FROZEN" });
  writeJson("10-wow/FROZEN_50_INPUT_MANIFEST.json", { schemaVersion: "batch008-concrete-r5-frozen-50-inputs.v1", selectionSha256, inputSha256, cases, status: "GREEN_FROZEN" });
  process.stdout.write(`${JSON.stringify({ count: 50, counts, selectionSha256, inputSha256, status: "GREEN_FROZEN" }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
