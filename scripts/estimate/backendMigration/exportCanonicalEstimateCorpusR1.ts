import { createHash } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { finished } from "node:stream/promises";
import { execFileSync } from "node:child_process";

import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/inventory";
import {
  INTERIOR_FINISHES_DOMAIN_PACKAGE,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage";
import {
  ELECTRICAL_DOMAIN_INVENTORY,
} from "../../../src/lib/estimate/v4/domains/electricalComplete/inventory";
import {
  electricalCompleteDomainPackage,
} from "../../../src/lib/estimate/v4/domains/electricalComplete/domainPackage";

const EXPORT_VERSION = "master11610-backend-canonical-export.r2";
const EXPECTED = Object.freeze({
  asphalt: { global: 55, external: 8, works: 63, resources: 3_709 },
  drywall: { works: 500, resources: 27_984 },
  electrical: { works: 605, resources: 69_723 },
  total: { global: 1_160, migratedWorks: 1_160, external: 8, resources: 101_416 },
});

type JsonRecord = Record<string, any>;

type CanonicalWork = {
  catalogId: string;
  namespace: "global" | "external_reference";
  domain: "asphalt" | "drywall" | "electrical";
  sourceIdentity: string;
  workKey: string;
  titleRu: string;
  denominatorEligible: boolean;
  definitionVersion: 2;
  passport: JsonRecord;
  applicability: JsonRecord;
  sourceMetadata: JsonRecord;
};

type CanonicalParameter = {
  catalogId: string;
  parameterId: string;
  ordinal: number;
  valueType: "decimal" | "integer" | "boolean" | "enum" | "text";
  unitId: string | null;
  titleRu: string;
  required: boolean;
  defaultValue: unknown;
  constraints: JsonRecord;
};

type CanonicalFormula = {
  catalogId: string;
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  ast: JsonRecord;
  inputParameterIds: string[];
};

type CanonicalResource = {
  catalogId: string;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  rowType: "material" | "labor" | "equipment" | "service" | "waste" | "other";
  unitId: string;
  formulaId: string;
  inclusionAst: JsonRecord;
  resourceGraph: JsonRecord;
  semanticOwner: string | null;
  costOwnerId: string | null;
  procurementEligible: boolean;
  sourceMetadata: JsonRecord;
};

type DomainExport = {
  works: CanonicalWork[];
  parameters: CanonicalParameter[];
  formulas: CanonicalFormula[];
  resources: CanonicalResource[];
  sourceArtifacts: Array<{ path: string; sha256: string; bytes: number }>;
};

const defaultPaths = {
  asphaltRoot: "C:/dev/rik-expo-app-post-r6-01-asphalt-v3-cf16-final/.release-runtime/completed-domains-depth-r1/asphalt-benchmark/r63-m1-exact-353ad3ac",
  asphaltSetsRoot: "C:/dev/rik-expo-app-post-m1-readmission-r2/.release-runtime/master-11610-group-batches-r1/04-post-m1-autonomous-readmission-r2/07-program-rebase",
  drywallB001: "C:/dev/rik-expo-app-batch001-post-audit-f7c9c328/.release-runtime/master-11610-group-batches-r2/07-batch001-post-audit-r1/04-row-audit/INDEPENDENT_ROW_TRACE_RECOUNT.jsonl",
  drywallB002: "C:/dev/rik-expo-app-batch002-technology-wave-r1/.release-runtime/master-11610-group-batches-r2/08-batch002-technology-wave-r1/05-execution/ROW_FORMULA_RESOURCE_PRICE_TRACE.jsonl",
  drywallB003: "C:/dev/rik-expo-app-batch003-technology-wave-r2/.release-runtime/master-11610-group-batches-r2/09-batch003-technology-wave-r2-final/05-execution/ROW_FORMULA_RESOURCE_PRICE_NORMATIVE_TRACE.jsonl",
  drywallB004: "C:/dev/rik-expo-app-batch004-domain-completion-r1/.release-runtime/master-11610-group-batches-r2/10-batch004-domain-completion-r1-final/05-domain-closeout/FULL_DOMAIN_TRACE_LEDGER.jsonl",
  electricalProof: "C:/dev/rik-expo-app-batch005-electrical-domain-r1/.release-runtime/master-11610-group-batches-r2/13-batch005-r7-maximum-depth-final/addendum/07-proof/ROW_FORMULA_RESOURCE_PRICE_NORM_TRACE.jsonl",
};

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return resolve(process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback);
}

function scalarArgument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return String(process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback).trim();
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value)).digest("hex");
}

function fileProof(path: string) {
  const bytes = readFileSync(path);
  return { path: resolve(path), sha256: hash(bytes), bytes: bytes.byteLength };
}

function requireFile(path: string): string {
  if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`SOURCE_ARTIFACT_NOT_FOUND:${path}`);
  return path;
}

function parseJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(requireFile(path), "utf8"));
}

async function parseJsonLines(path: string): Promise<JsonRecord[]> {
  requireFile(path);
  const rows: JsonRecord[] = [];
  const lines = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const rawLine of lines) {
    lineNumber += 1;
    const line = rawLine.trim();
    if (!line) continue;
    try { rows.push(JSON.parse(line)); }
    catch { throw new Error(`INVALID_JSONL:${path}:${lineNumber}`); }
  }
  return rows;
}

function rowType(category: unknown): CanonicalResource["rowType"] {
  const value = String(category ?? "").toLowerCase();
  if (value.includes("material")) return "material";
  if (value.includes("labor") || value === "work") return "labor";
  if (value.includes("equipment") || value.includes("machinery") || value.includes("machine")) return "equipment";
  if (value.includes("service") || value.includes("subcontract")) return "service";
  if (value.includes("waste")) return "waste";
  return "other";
}

function allowedValues(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (typeof input !== "string") return [];
  return input.split("|").map((value) => value.trim()).filter(Boolean);
}

function parameterType(
  inputType: unknown,
  declaredValues: readonly unknown[] = [],
): CanonicalParameter["valueType"] {
  const value = String(inputType ?? "").toLowerCase();
  if (declaredValues.length > 0) {
    const normalized = new Set(declaredValues.map((entry) => String(entry).trim().toLocaleLowerCase("ru-RU")));
    const booleanTokens = new Set(["true", "false", "да", "нет"]);
    if ([...normalized].every((entry) => booleanTokens.has(entry))) return "boolean";
    return "enum";
  }
  if (value === "boolean") return "boolean";
  if (value === "choice" || value === "enum") return "enum";
  if (value === "text" || value === "string") return "text";
  if (value === "integer") return "integer";
  return "decimal";
}

function formula(catalogId: string, formulaId: string, expressionSource: string, outputUnitId: string): CanonicalFormula {
  const compiled = compileFormulaGraph(expressionSource);
  return {
    catalogId,
    formulaId,
    outputUnitId,
    expressionSource: compiled.source,
    ast: compiled.ast,
    inputParameterIds: compiled.inputParameterIds,
  };
}

function dedupeFormulas(formulas: CanonicalFormula[]): CanonicalFormula[] {
  const map = new Map<string, CanonicalFormula>();
  for (const value of formulas) {
    const key = `${value.catalogId}\u0000${value.formulaId}`;
    const previous = map.get(key);
    if (previous && stableJson(previous) !== stableJson(value)) throw new Error(`FORMULA_ID_COLLISION:${value.catalogId}:${value.formulaId}`);
    map.set(key, value);
  }
  return [...map.values()];
}

function ensureFormulaParameters(
  catalogId: string,
  parameters: CanonicalParameter[],
  formulas: CanonicalFormula[],
): CanonicalParameter[] {
  const scoped = parameters.filter((entry) => entry.catalogId === catalogId);
  const accepted = new Map(scoped.map((entry) => [entry.parameterId, entry]));
  let ordinal = scoped.reduce((maximum, entry) => Math.max(maximum, entry.ordinal), -1) + 1;
  const referenced = formulas.filter((entry) => entry.catalogId === catalogId).flatMap((entry) => entry.inputParameterIds);
  for (const parameterId of [...new Set(referenced)].sort()) {
    if (!accepted.has(parameterId)) {
      const inferred: CanonicalParameter = {
        catalogId, parameterId, ordinal: ordinal++, valueType: "decimal", unitId: null,
        titleRu: parameterId, required: true, defaultValue: null,
        constraints: { inferredFromAcceptedFormulaGraph: true },
      };
      parameters.push(inferred);
      accepted.set(parameterId, inferred);
    }
  }
  return parameters;
}

function memberMatch(record: JsonRecord, member: string): boolean {
  const separator = member.indexOf(":");
  const memberNamespace = separator >= 0 ? member.slice(0, separator) : "";
  const memberValue = separator >= 0 ? member.slice(separator + 1) : member;
  if (memberNamespace === "expanded-template") {
    return record.catalog_id === memberValue || String(record.candidate_id).endsWith(`:${memberValue}`);
  }
  const identities = new Set([
    record.candidate_id,
    record.catalog_id,
    record.work_key,
    `expanded-template:${record.work_key}`,
    `base-10000:${record.work_key}`,
  ]);
  return identities.has(member);
}

function exportAsphalt(paths: typeof defaultPaths): DomainExport {
  const inventoryPath = join(paths.asphaltRoot, "ASPHALT_R63_INVENTORY.json");
  const rowsPath = join(paths.asphaltRoot, "ASPHALT_R63_RESOURCE_COMPOSITION_ROWS.json");
  const parametersPath = join(paths.asphaltRoot, "ASPHALT_R63_PARAMETER_SCHEMAS.json");
  const globalSetPath = join(paths.asphaltSetsRoot, "M1_GLOBAL55_MEMBER_SET.json");
  const externalSetPath = join(paths.asphaltSetsRoot, "R63_EXTERNAL8_ENTRYPOINT_SET.json");
  const inventory = parseJson(inventoryPath).records as JsonRecord[];
  const rawResources = parseJson(rowsPath).rows as JsonRecord[];
  const rawParameters = parseJson(parametersPath).rows as JsonRecord[];
  const globalMembers = parseJson(globalSetPath).members as string[];
  const externalMembers = parseJson(externalSetPath).members as string[];
  if (inventory.length !== EXPECTED.asphalt.works || globalMembers.length !== 55 || externalMembers.length !== 8) {
    throw new Error("ASPHALT_SOURCE_COUNT_MISMATCH");
  }
  const ownership = new Map<string, { namespace: CanonicalWork["namespace"]; sourceIdentity: string }>();
  for (const [namespace, members] of [["global", globalMembers], ["external_reference", externalMembers]] as const) {
    for (const member of members) {
      const matches = inventory.filter((record) => memberMatch(record, member));
      if (matches.length !== 1) throw new Error(`ASPHALT_MEMBER_NOT_UNIQUE:${member}:${matches.length}`);
      const catalogId = String(matches[0].catalog_id);
      if (ownership.has(catalogId)) throw new Error(`ASPHALT_MEMBER_DUPLICATE:${catalogId}`);
      ownership.set(catalogId, { namespace, sourceIdentity: member });
    }
  }
  const works: CanonicalWork[] = inventory.map((record) => {
    const owner = ownership.get(String(record.catalog_id));
    if (!owner) throw new Error(`ASPHALT_MEMBER_UNOWNED:${record.catalog_id}`);
    return {
      catalogId: String(record.catalog_id), namespace: owner.namespace, domain: "asphalt",
      sourceIdentity: owner.sourceIdentity, workKey: String(record.work_key), titleRu: String(record.name_ru),
      denominatorEligible: owner.namespace === "global", definitionVersion: 2,
      passport: { passportId: record.passport_id, calculationStrategyId: record.calculation_strategy_id },
      applicability: { scope: "FULL_APPLICABLE_SCOPE", operationClass: record.operation_class },
      sourceMetadata: { inventoryRecord: record, acceptedMemberSet: owner.namespace === "global" ? "M1_GLOBAL55" : "R63_EXTERNAL8" },
    };
  });
  const workIds = new Set(works.map((work) => work.catalogId));
  const parameters: CanonicalParameter[] = rawParameters.filter((entry) => workIds.has(String(entry.catalog_id))).map((entry, index) => {
    const values = allowedValues(entry.allowed_values_ru);
    return {
      catalogId: String(entry.catalog_id), parameterId: String(entry.parameter_key), ordinal: index,
      valueType: parameterType(entry.field_type, values), unitId: entry.unit_ru ? String(entry.unit_ru) : null,
      titleRu: String(entry.label_ru || entry.parameter_key), required: entry.required === true,
      defaultValue: entry.default_value === "" ? null : entry.default_value,
      constraints: { min: entry.minimum ?? null, max: entry.maximum ?? null, values: values.length ? values : null, source: entry.constraint_source },
    };
  });
  const parameterOrdinal = new Map<string, number>();
  parameters.forEach((entry) => {
    const next = parameterOrdinal.get(entry.catalogId) ?? 0;
    entry.ordinal = next;
    parameterOrdinal.set(entry.catalogId, next + 1);
  });
  const resources: CanonicalResource[] = [];
  const formulas: CanonicalFormula[] = [];
  const resourceOrdinal = new Map<string, number>();
  for (const entry of rawResources) {
    const catalogId = String(entry.catalog_id);
    if (!workIds.has(catalogId)) throw new Error(`ASPHALT_RESOURCE_ORPHAN:${catalogId}`);
    const next = resourceOrdinal.get(catalogId) ?? 0;
    resourceOrdinal.set(catalogId, next + 1);
    const formulaId = `${String(entry.row_id)}:formula:r1`;
    formulas.push(formula(catalogId, formulaId, String(entry.quantity_formula), String(entry.unit)));
    resources.push({
      catalogId, rowId: String(entry.row_id), ordinal: next, section: String(entry.section),
      category: String(entry.category), titleRu: String(entry.title_ru), rowType: rowType(entry.row_type || entry.category),
      unitId: String(entry.unit), formulaId, inclusionAst: { kind: "literal", value: true },
      resourceGraph: { version: "ResourceGraph.r1", parameterSources: entry.parameter_sources ?? [], quantityBasis: entry.quantity_basis ?? null },
      semanticOwner: entry.semantic_owner ? String(entry.semantic_owner) : null,
      costOwnerId: entry.source_parameters?.costOwnerId ?? String(entry.row_id),
      procurementEligible: entry.included_in_procurement === true,
      sourceMetadata: { normativeTrace: entry.normative_source ? [{ sourceId: entry.normative_source }] : [], sourceFormulaId: entry.formula_id ?? null, acceptedTrace: entry },
    });
  }
  const uniqueFormulas = dedupeFormulas(formulas);
  for (const work of works) ensureFormulaParameters(work.catalogId, parameters, uniqueFormulas);
  return { works, parameters, formulas: uniqueFormulas, resources, sourceArtifacts: [inventoryPath, rowsPath, parametersPath, globalSetPath, externalSetPath].map(fileProof) };
}

function drywallRow(entry: JsonRecord, batch: string): Omit<CanonicalResource, "ordinal"> & { expression: string; outputUnit: string } {
  const formulaSource = entry.formulaGraphV3 ?? entry.formula ?? null;
  const formulaId = String(entry.formulaId ?? formulaSource?.formulaId ?? formulaSource?.id ?? entry.rowId ?? entry.rowCode);
  const expression = String(entry.formulaExpression ?? formulaSource?.expression ?? "");
  const outputUnit = String(entry.outputUnitId ?? formulaSource?.outputUnit ?? formulaSource?.unit ?? entry.unit ?? "item");
  const resourceGraph = entry.resourceGraphV3 ?? entry.resourceGraph ?? entry.resource ?? {
    graph_version: "ProfessionalResourceGraphV3", resource_class: entry.resourceClass ?? "other",
    typed_child_boundary: entry.typedChildBoundary ?? "DRYWALL",
  };
  const priceRoute = entry.priceRouteV3 ?? entry.priceRoute ?? entry.price ?? null;
  const normativeTrace = entry.normativeTraceV3 ?? entry.normativeTrace ?? entry.normative ?? entry.sourceLocators ?? [];
  const rowId = String(entry.rowId ?? entry.rowCode);
  return {
    catalogId: String(entry.catalogId), rowId, section: String(entry.section ?? "Drywall"),
    category: String(entry.category ?? resourceGraph?.resource_class ?? "other"),
    titleRu: String(entry.titleRu ?? entry.rowKey ?? rowId), rowType: rowType(entry.category ?? resourceGraph?.resource_class),
    unitId: outputUnit, formulaId, inclusionAst: { kind: "literal", value: true },
    resourceGraph,
    semanticOwner: entry.semanticOwner ?? `${String(entry.catalogId)}:row:${rowId}`,
    costOwnerId: entry.costOwnerId ?? priceRoute?.unit_price_parameter_id ?? rowId,
    procurementEligible: entry.procurementEligible === true || Boolean(priceRoute?.unit_price_parameter_id),
    sourceMetadata: { normativeTrace, priceRoute, acceptedBatch: batch, acceptedTrace: entry },
    expression, outputUnit,
  };
}

async function exportDrywall(paths: typeof defaultPaths): Promise<DomainExport> {
  const sources = [paths.drywallB001, paths.drywallB002, paths.drywallB003, paths.drywallB004];
  const batches = ["BATCH001", "BATCH002", "BATCH003", "BATCH004"];
  const accepted: Array<ReturnType<typeof drywallRow>> = [];
  for (let index = 0; index < sources.length; index += 1) {
    const rows = await parseJsonLines(sources[index]);
    rows.forEach((entry) => accepted.push(drywallRow(entry, batches[index])));
  }
  const workIds = [...new Set(accepted.map((entry) => entry.catalogId))].sort();
  const inventory = new Map(INTERIOR_FINISHES_DOMAIN_INVENTORY.map((entry) => [entry.catalog_id, entry]));
  const bindings = new Map(INTERIOR_FINISHES_DOMAIN_PACKAGE.catalog_bindings.map((entry) => [entry.catalog_id, entry]));
  const schemaByTechnology = new Map(INTERIOR_FINISHES_DOMAIN_PACKAGE.parameter_schemas.map((entry) => [entry.technology_id, entry]));
  const works: CanonicalWork[] = workIds.map((catalogId) => {
    const record = inventory.get(catalogId);
    const binding = bindings.get(catalogId);
    if (!record || !binding) throw new Error(`DRYWALL_INVENTORY_BINDING_MISSING:${catalogId}`);
    return {
      catalogId, namespace: "global", domain: "drywall", sourceIdentity: catalogId,
      workKey: record.work_key, titleRu: record.localized_name_ru, denominatorEligible: true, definitionVersion: 2,
      passport: { technologyId: binding.canonical_technology_id, sourceDomain: record.source_domain_id, scopeCapability: record.scope_capability },
      applicability: { scope: "FULL_APPLICABLE_SCOPE", jurisdiction: "KG" },
      sourceMetadata: { acceptedBatches: ["BATCH001", "BATCH002", "BATCH003", "BATCH004"], inventoryRecord: record },
    };
  });
  const formulas = dedupeFormulas(accepted.map((entry) => formula(entry.catalogId, entry.formulaId, entry.expression, entry.outputUnit)));
  const parameters: CanonicalParameter[] = [];
  for (const work of works) {
    const technologyId = bindings.get(work.catalogId)!.canonical_technology_id;
    const schema = schemaByTechnology.get(technologyId);
    if (!schema) throw new Error(`DRYWALL_SCHEMA_MISSING:${work.catalogId}`);
    schema.parameters.forEach((entry, ordinal) => parameters.push({
      catalogId: work.catalogId, parameterId: entry.parameter_id, ordinal,
      valueType: parameterType(entry.input_type, entry.choices?.map((choice) => choice.value) ?? []), unitId: entry.unit_id ?? null, titleRu: entry.label_ru,
      required: entry.priority === "P0", defaultValue: null,
      constraints: { min: entry.minimum ?? null, max: entry.maximum ?? null, values: entry.choices?.map((choice) => choice.value) ?? null },
    }));
    ensureFormulaParameters(work.catalogId, parameters, formulas);
  }
  const ordinalByWork = new Map<string, number>();
  const resources: CanonicalResource[] = accepted.map(({ expression: _expression, outputUnit: _outputUnit, ...entry }) => {
    const ordinal = ordinalByWork.get(entry.catalogId) ?? 0;
    ordinalByWork.set(entry.catalogId, ordinal + 1);
    return { ...entry, ordinal };
  });
  return { works, parameters, formulas, resources, sourceArtifacts: sources.map(fileProof) };
}

function electricalInclusion(source: string): JsonRecord {
  if (source.includes("scope_mode=FULL_APPLICABLE_SCOPE")) {
    return { kind: "and", operands: [{ kind: "parameter", id: "work_included" }, { kind: "equals", parameterId: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" }] };
  }
  return { kind: "parameter", id: "work_included" };
}

function exportElectrical(paths: typeof defaultPaths): DomainExport {
  requireFile(paths.electricalProof);
  const electricalProof = fileProof(paths.electricalProof);
  const bindingByTechnology = new Map(electricalCompleteDomainPackage.catalog_bindings.map((entry) => [entry.canonical_technology_id, entry]));
  const schemaByTechnology = new Map(electricalCompleteDomainPackage.parameter_schemas.map((entry) => [entry.technology_id, entry]));
  const assemblyByTechnology = new Map(electricalCompleteDomainPackage.assembly_profiles.map((entry) => [entry.technology_id, entry]));
  const works: CanonicalWork[] = [];
  const parameters: CanonicalParameter[] = [];
  const formulas: CanonicalFormula[] = [];
  const resources: CanonicalResource[] = [];
  for (const record of ELECTRICAL_DOMAIN_INVENTORY) {
    const binding = bindingByTechnology.get(record.canonical_technology_id);
    const schema = schemaByTechnology.get(record.canonical_technology_id);
    const assembly = assemblyByTechnology.get(record.canonical_technology_id);
    if (!binding || !schema || !assembly) throw new Error(`ELECTRICAL_BINDING_MISSING:${record.catalog_id}`);
    const full = assembly.child_assemblies.find((entry) => entry.supported_scope_modes.includes("FULL_APPLICABLE_SCOPE"));
    if (!full) throw new Error(`ELECTRICAL_FULL_SCOPE_MISSING:${record.catalog_id}`);
    works.push({
      catalogId: record.catalog_id, namespace: "global", domain: "electrical", sourceIdentity: record.catalog_id,
      workKey: record.work_key, titleRu: record.localized_name_ru, denominatorEligible: true, definitionVersion: 2,
      passport: { technologyId: record.canonical_technology_id, family: record.electrical_family, operationClass: record.operation_class },
      applicability: { scope: "FULL_APPLICABLE_SCOPE", jurisdiction: "KG" },
      sourceMetadata: { inventoryRecord: record, batch005ProofSha256: electricalProof.sha256 },
    });
    const formulaInputIds = new Set(full.rows.flatMap((row) => [...row.formula.input_parameter_ids]));
    const requiredIds = new Set(["work_included", "estimate_scope_mode", ...formulaInputIds]);
    schema.parameters.filter((entry) => requiredIds.has(entry.parameter_id)).forEach((entry, ordinal) => parameters.push({
      catalogId: record.catalog_id, parameterId: entry.parameter_id, ordinal,
      valueType: parameterType(entry.input_type, entry.choices?.map((choice) => choice.value) ?? []), unitId: entry.unit_id ?? null, titleRu: entry.label_ru,
      required: true,
      defaultValue: entry.parameter_id === "work_included" ? true : entry.parameter_id === "estimate_scope_mode" ? "FULL_APPLICABLE_SCOPE" : null,
      constraints: { min: entry.minimum ?? null, max: entry.maximum ?? null, values: entry.choices?.map((choice) => choice.value) ?? null },
    }));
    full.rows.forEach((row, ordinal) => {
      formulas.push(formula(record.catalog_id, row.formula.formula_id, row.formula.expression, row.formula.output_unit_id));
      resources.push({
        catalogId: record.catalog_id, rowId: row.row_id, ordinal, section: row.section, category: row.category,
        titleRu: row.title_ru, rowType: rowType(row.category), unitId: row.formula.output_unit_id,
        formulaId: row.formula.formula_id, inclusionAst: electricalInclusion(row.inclusion_condition),
        resourceGraph: row.resource_graph_node_v3 ?? {}, semanticOwner: row.semantic_owner,
        costOwnerId: row.cost_owner_id, procurementEligible: row.procurement_eligible,
        sourceMetadata: { normativeTrace: row.normative_trace_v3, priceRoute: row.price_route_v3, batch005ProofArtifact: resolve(paths.electricalProof) },
      });
    });
  }
  return { works, parameters, formulas: dedupeFormulas(formulas), resources, sourceArtifacts: [electricalProof] };
}

function assertDomain(domain: DomainExport, expectedWorks: number, expectedResources: number, name: string) {
  if (domain.works.length !== expectedWorks) throw new Error(`${name}_WORK_COUNT:${domain.works.length}:${expectedWorks}`);
  if (domain.resources.length !== expectedResources) throw new Error(`${name}_RESOURCE_COUNT:${domain.resources.length}:${expectedResources}`);
  const catalogs = new Set(domain.works.map((entry) => entry.catalogId));
  if (catalogs.size !== expectedWorks) throw new Error(`${name}_DUPLICATE_CATALOG_ID`);
  const resourceIds = new Set(domain.resources.map((entry) => `${entry.catalogId}\u0000${entry.rowId}`));
  if (resourceIds.size !== domain.resources.length) throw new Error(`${name}_DUPLICATE_RESOURCE_ROW`);
  const formulas = new Set(domain.formulas.map((entry) => `${entry.catalogId}\u0000${entry.formulaId}`));
  for (const resource of domain.resources) if (!formulas.has(`${resource.catalogId}\u0000${resource.formulaId}`)) throw new Error(`${name}_RESOURCE_FORMULA_ORPHAN`);
}

async function writeJsonLines(path: string, rows: unknown[]): Promise<{ file: string; rows: number; bytes: number; sha256: string }> {
  const stream = createWriteStream(path, { encoding: "utf8" });
  const digest = createHash("sha256");
  let bytes = 0;
  for (const row of rows) {
    const line = `${stableJson(row)}\n`;
    bytes += Buffer.byteLength(line);
    digest.update(line);
    if (!stream.write(line)) await new Promise<void>((accept) => stream.once("drain", accept));
  }
  stream.end();
  await finished(stream);
  return { file: path.split(/[\\/]/).pop()!, rows: rows.length, bytes, sha256: digest.digest("hex") };
}

async function main() {
  const output = argument("output", ".release-runtime/master11610-backend-canonical-r2/02-canonical-export");
  const releaseId = scalarArgument("release-id", "c90141a2-fdd6-4e78-b01c-bad792c8df18");
  const releaseKey = scalarArgument("release-key", "master11610-backend-canonical-r2-parameter-semantics");
  const predecessorReleaseId = scalarArgument("predecessor-release-id", "");
  const predecessorReleaseKey = scalarArgument("predecessor-release-key", "master11610-backend-canonical-r1");
  const predecessorManifestSha256 = scalarArgument("predecessor-manifest-sha256", "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(releaseId)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(predecessorReleaseId)
    || releaseId === predecessorReleaseId) {
    throw new Error("R2_PREDECESSOR_RELEASE_ID_REQUIRED");
  }
  if (!/^[0-9a-f]{64}$/.test(predecessorManifestSha256)) {
    throw new Error("R2_PREDECESSOR_MANIFEST_SHA256_REQUIRED");
  }
  const paths = {
    asphaltRoot: argument("asphalt-root", defaultPaths.asphaltRoot),
    asphaltSetsRoot: argument("asphalt-sets-root", defaultPaths.asphaltSetsRoot),
    drywallB001: argument("drywall-b001", defaultPaths.drywallB001),
    drywallB002: argument("drywall-b002", defaultPaths.drywallB002),
    drywallB003: argument("drywall-b003", defaultPaths.drywallB003),
    drywallB004: argument("drywall-b004", defaultPaths.drywallB004),
    electricalProof: argument("electrical-proof", defaultPaths.electricalProof),
  };
  await mkdir(output, { recursive: true });
  const asphalt = exportAsphalt(paths);
  const drywall = await exportDrywall(paths);
  const electrical = exportElectrical(paths);
  assertDomain(asphalt, EXPECTED.asphalt.works, EXPECTED.asphalt.resources, "ASPHALT");
  assertDomain(drywall, EXPECTED.drywall.works, EXPECTED.drywall.resources, "DRYWALL");
  assertDomain(electrical, EXPECTED.electrical.works, EXPECTED.electrical.resources, "ELECTRICAL");
  const globalCount = [...asphalt.works, ...drywall.works, ...electrical.works].filter((entry) => entry.denominatorEligible).length;
  if (globalCount !== EXPECTED.total.migratedWorks) throw new Error(`GLOBAL_MIGRATION_COUNT:${globalCount}`);
  if (asphalt.works.filter((entry) => !entry.denominatorEligible).length !== EXPECTED.total.external) throw new Error("EXTERNAL_COUNT_MISMATCH");

  const all = {
    works: [...asphalt.works, ...drywall.works, ...electrical.works].sort((a, b) => a.catalogId.localeCompare(b.catalogId)),
    parameters: [...asphalt.parameters, ...drywall.parameters, ...electrical.parameters].sort((a, b) => a.catalogId.localeCompare(b.catalogId) || a.ordinal - b.ordinal),
    formulas: [...asphalt.formulas, ...drywall.formulas, ...electrical.formulas].sort((a, b) => a.catalogId.localeCompare(b.catalogId) || a.formulaId.localeCompare(b.formulaId)),
    resources: [...asphalt.resources, ...drywall.resources, ...electrical.resources].sort((a, b) => a.catalogId.localeCompare(b.catalogId) || a.ordinal - b.ordinal),
  };
  const files = [];
  files.push(await writeJsonLines(join(output, "works.jsonl"), all.works));
  files.push(await writeJsonLines(join(output, "parameters.jsonl"), all.parameters));
  files.push(await writeJsonLines(join(output, "formulas.jsonl"), all.formulas));
  files.push(await writeJsonLines(join(output, "resources.jsonl"), all.resources));
  const sourceArtifacts = [...asphalt.sourceArtifacts, ...drywall.sourceArtifacts, ...electrical.sourceArtifacts];
  const sourcePackageSha256 = hash({
    schemaVersion: EXPORT_VERSION,
    releaseId,
    releaseKey,
    predecessorReleaseId,
    files: files.map((file) => ({ file: file.file, rows: file.rows, bytes: file.bytes, sha256: file.sha256 })),
    sourceArtifacts: sourceArtifacts.map((artifact) => ({ path: artifact.path, bytes: artifact.bytes, sha256: artifact.sha256 })),
    correctionContract: "BOOLEAN_ENUM_PARAMETER_SEMANTICS_AND_CONSTRAINT_AWARE_ADMISSION_R2",
  });
  const manifestWithoutHash = {
    schemaVersion: EXPORT_VERSION,
    releaseId,
    releaseKey,
    sourcePackageSha256,
    predecessorRelease: {
      releaseId: predecessorReleaseId,
      releaseKey: predecessorReleaseKey,
      manifestSha256: predecessorManifestSha256,
    },
    expected: EXPECTED,
    actual: {
      works: all.works.length,
      globalWorks: globalCount,
      externalReferences: all.works.length - globalCount,
      parameters: all.parameters.length,
      formulas: all.formulas.length,
      resources: all.resources.length,
      byDomain: {
        asphalt: { works: asphalt.works.length, resources: asphalt.resources.length },
        drywall: { works: drywall.works.length, resources: drywall.resources.length },
        electrical: { works: electrical.works.length, resources: electrical.resources.length },
      },
    },
    programControl: { denominator: 11_610, admittedGlobalBeforeMigration: 1_160, queueRemainingBeforeMigration: 10_450, migrationAdmissionDelta: 0, batch006Started: false },
    sourceGit: {
      commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      tree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim(),
      predecessor: "BATCH005_ELECTRICAL_DOMAIN_R1",
    },
    correctionContract: {
      id: "BOOLEAN_ENUM_PARAMETER_SEMANTICS_AND_CONSTRAINT_AWARE_ADMISSION_R2",
      allBooleanTrueForbidden: true,
      requiredScenarioCount: 3_684,
      requiredBranchCoverage: 101_416,
    },
    sourceArtifacts,
    files,
  };
  const manifest = { ...manifestWithoutHash, manifestSha256: hash(manifestWithoutHash) };
  writeFileSync(join(output, "manifest.json"), `${stableJson(manifest)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ output, manifestSha256: manifest.manifestSha256, actual: manifest.actual }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
