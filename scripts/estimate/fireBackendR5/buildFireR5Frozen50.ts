import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";

import { assertExact, evidenceRoot, semanticSha256, writeJson } from "./support";

type Json = Record<string, any>;

const identityPath = join(evidenceRoot, "01-discovery", "FIRE_IDENTITY_SET.jsonl");
const corpusRoot = join(evidenceRoot, "05-content", "corpus");
const identities = readFileSync(identityPath, "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line) as Json);
const byId = new Map(identities.map((row) => [String(row.catalog_id), row]));

function sorted(rows: Json[]): Json[] { return rows.sort((a, b) => String(a.catalog_id).localeCompare(String(b.catalog_id))); }

const demolition = sorted(identities.filter((row) => row.classification === "FIRE_EXTERNAL_DEMOLITION"));
const externalUniverse = sorted(identities.filter((row) => row.classification === "FIRE_EXTERNAL_NON_DEMOLITION"));
const globalUniverse = sorted(identities.filter((row) => row.classification === "FIRE_OWNER"));
const chosen = new Map<string, Json>();
const add = (row: Json | undefined, label: string): void => { assertExact(Boolean(row), `FIRE_FROZEN_50_STRATUM_MISSING:${label}`); chosen.set(String(row!.catalog_id), row!); };
demolition.forEach((row) => add(row, "demolition"));
const requiredSections = [1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 14];
requiredSections.forEach((section) => add(externalUniverse.find((row) => row.source_domain_id === `spec:section-8.${section}`), `section-8.${section}`));
for (const row of [...externalUniverse].sort((a, b) => String(b.complexity_class).localeCompare(String(a.complexity_class)) || String(a.catalog_id).localeCompare(String(b.catalog_id)))) {
  if ([...chosen.values()].filter((item) => item.classification === "FIRE_EXTERNAL_NON_DEMOLITION").length >= 16) break;
  add(row, "external-non-demolition");
}
const expandedFamilies = [...new Set(globalUniverse.filter((row) => String(row.family).startsWith("expanded:")).map((row) => String(row.family)))].sort();
for (const family of expandedFamilies) for (const operation of ["AS_BUILT_ESTIMATE", "DETAILED_BOQ_FROM_DRAWINGS", "TENDER_BOQ"]) add(globalUniverse.find((row) => row.family === family && row.operation === operation), `${family}:${operation}`);
for (const operation of ["INJECT", "REPAIR", "STRENGTHEN", "TEST", "CLEAN"]) add(globalUniverse.find((row) => row.family === "special_repair" && row.operation === operation), `special:${operation}`);
for (const operation of ["COMMISSION", "INSTALL", "REPLACE", "TEST", "CONNECT"]) add(globalUniverse.find((row) => row.family === "electrical" && row.operation === operation), `electrical:${operation}`);
for (const row of [...globalUniverse].sort((a, b) => String(b.complexity_class).localeCompare(String(a.complexity_class)) || String(a.catalog_id).localeCompare(String(b.catalog_id)))) {
  if (chosen.size >= 50) break;
  add(row, "global-fill");
}
const selected = [...chosen.values()];
assertExact(selected.length === 50 && new Set(selected.map((row) => row.catalog_id)).size === 50, `FIRE_FROZEN_50_CARDINALITY_RED:${selected.length}`);

const works = new Map<string, Json>();
for (const line of readFileSync(join(corpusRoot, "FIRE_WORK_DEFINITIONS.jsonl"), "utf8").trim().split(/\r?\n/u)) {
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
  const input = createInterface({ input: createReadStream(join(corpusRoot, "FIRE_PARAMETER_DEFINITIONS.jsonl"), "utf8"), crlfDelay: Infinity });
  for await (const raw of input) {
    if (!raw.trim()) continue;
    const row = JSON.parse(raw) as Json;
    if (!byId.has(row.catalogId) || !selected.some((item) => item.catalog_id === row.catalogId)) continue;
    const bucket = parameters.get(row.catalogId) ?? [];
    bucket.push(row);
    parameters.set(row.catalogId, bucket);
  }
  const cases = selected.map((identity, index) => {
    const definitions = parameters.get(identity.catalog_id) ?? [];
    assertExact(definitions.length > 0 && works.has(identity.catalog_id), `FIRE_FROZEN_50_CONTENT_RED:${identity.catalog_id}`);
    const v1Inputs = Object.fromEntries(definitions.map((row) => [row.parameterId, valueFor(row)]));
    const editable = definitions.find((row) => ["decimal", "integer"].includes(row.valueType))!;
    const v2Inputs = { ...v1Inputs, [editable.parameterId]: Number(v1Inputs[editable.parameterId]) + 1 };
    const withoutHash = {
      caseId: `WOW-${String(index + 1).padStart(2, "0")}`,
      obligation: `fire_r5_${String(identity.source_domain_id).replace(/[^a-z0-9]+/giu, "_")}_${String(identity.operation).toLocaleLowerCase("en-US")}`,
      catalogId: identity.catalog_id,
      titleRu: identity.canonical_title,
      classification: identity.classification,
      namespace: identity.namespace,
      denominatorEligible: identity.denominator_eligible,
      family: identity.family,
      sourceDomainId: identity.source_domain_id,
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
    global: cases.filter((row) => row.classification === "FIRE_OWNER").length,
    externalDemolition: cases.filter((row) => row.classification === "FIRE_EXTERNAL_DEMOLITION").length,
    externalNonDemolition: cases.filter((row) => row.classification === "FIRE_EXTERNAL_NON_DEMOLITION").length,
    L4L5: cases.filter((row) => ["L4", "L5"].includes(row.complexity)).length,
    repairDemolitionQa: cases.filter((row) => row.operation === "DEMOLITION" || /repair|test|qa|inject|strengthen/i.test(`${row.family}:${row.operation}:${row.titleRu}`)).length,
  };
  const sectionCoverage = requiredSections.filter((section) => cases.some((row) => row.sourceDomainId === `spec:section-8.${section}`));
  const systemFamilies = ["fire_alarm_system", "sprinkler_system", "fire_fighting_pump_station", "fire_hydrants", "smoke_exhaust_system"].filter((family) => cases.some((row) => String(row.family).includes(family)));
  const lifecycleOperations = ["REPAIR", "REPLACE", "TEST", "DECOMMISSIONING_DEMOLITION_RECOVERY"].filter((operation) => cases.some((row) => row.operation === operation));
  assertExact(counts.global === 30 && counts.externalDemolition === 4 && counts.externalNonDemolition === 16 && counts.L4L5 >= 10 && counts.repairDemolitionQa >= 7 && sectionCoverage.length === requiredSections.length && systemFamilies.length === 5 && lifecycleOperations.length === 4, `FIRE_FROZEN_50_STRATA_RED:${JSON.stringify({ counts, sectionCoverage, systemFamilies, lifecycleOperations })}`);
  writeJson("10-wow/FROZEN_50_SELECTION.json", { schemaVersion: "batch009-fire-r5-frozen-50.v1", count: 50, distinctCatalogIds: 50, counts, selectionSha256, immutableAfterFirstBackendRun: true, cases: selection, status: "GREEN_FROZEN" });
  writeJson("10-wow/FROZEN_50_INPUT_MANIFEST.json", { schemaVersion: "batch009-fire-r5-frozen-50-inputs.v1", selectionSha256, inputSha256, cases, status: "GREEN_FROZEN" });
  process.stdout.write(`${JSON.stringify({ count: 50, counts, selectionSha256, inputSha256, status: "GREEN_FROZEN" }, null, 2)}\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
