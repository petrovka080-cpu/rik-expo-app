import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client, type QueryResultRow } from "pg";

import { validateCanonicalEstimateParameters } from "../../../src/lib/estimate/backendPlatform/parameterConstraints";

type Json = Record<string, any>;

const SPEC_SHA256 = "1692ec051abcda1e4b973e1a3c9d053c22e17748ee5838d23f83d631f1b341b2";
const SOURCE_URL = process.env.R53_SOURCE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const CANDIDATE_URL = process.env.R53_CANDIDATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r53_exact15_candidate";
const STAGE = String(process.argv.find((value) => value.startsWith("--stage="))?.split("=")[1] ?? "");
const EVIDENCE_ROOT = resolve(
  ".release-runtime/p0-one-monolith-r5/evidence/02-phase1a/canonical-backend-api/candidate",
);
const FIXED_VERIFIED_AT = "2026-08-17T00:00:00.000Z";
const ACCEPTED_TRACE_BASELINE_VERSION = "accepted-batch-formula-graph-v3-baseline:r53";

const EXACT_15 = Object.freeze([
  ["chimney_stack_tender_boq_expanded_complex_v1", "expanded-template:chimney_stack_tender_boq_expanded_complex_v1"],
  ["drywall_ceiling_interior_bulkhead_clad_small_area_professional_expanded_v1", "drywall_ceiling_interior_bulkhead_clad_small_area"],
  ["drywall_ceiling_interior_curve_clad_small_area_professional_expanded_v1", "drywall_ceiling_interior_curve_clad_small_area"],
  ["drywall_ceiling_interior_drywall_ceiling_clad_large_area_professional_expanded_v1", "drywall_ceiling_interior_drywall_ceiling_clad_large_area"],
  ["drywall_ceiling_interior_drywall_partition_clad_high_load_professional_expanded_v1", "drywall_ceiling_interior_drywall_partition_clad_high_load"],
  ["drywall_ceiling_interior_fire_partition_align_wet_zone_professional_expanded_v1", "drywall_ceiling_interior_fire_partition_align_wet_zone"],
  ["drywall_ceiling_interior_joint_align_technical_room_professional_expanded_v1", "drywall_ceiling_interior_joint_align_technical_room"],
  ["drywall_ceiling_interior_moisture_partition_align_technical_room_professional_expanded_v1", "drywall_ceiling_interior_moisture_partition_align_technical_room"],
  ["drywall_ceiling_interior_niche_align_technical_room_professional_expanded_v1", "drywall_ceiling_interior_niche_align_technical_room"],
  ["drywall_ceiling_interior_revision_hatch_align_standard_professional_expanded_v1", "drywall_ceiling_interior_revision_hatch_align_standard"],
  ["drywall_ceiling_interior_shaft_align_standard_professional_expanded_v1", "drywall_ceiling_interior_shaft_align_standard"],
  ["drywall_ceiling_interior_sound_partition_align_small_area_professional_expanded_v1", "drywall_ceiling_interior_sound_partition_align_small_area"],
  ["drywall_ceiling_interior_wall_cladding_align_large_area_professional_expanded_v1", "drywall_ceiling_interior_wall_cladding_align_large_area"],
  ["drywall_ceiling_interior_wall_cladding_repair_wet_zone_professional_expanded_v1", "drywall_ceiling_interior_wall_cladding_repair_wet_zone"],
  ["electrical_poles_04kv_detailed_boq_from_drawings_expanded_complex_v1", "expanded-template:electrical_poles_04kv_detailed_boq_from_drawings_expanded_complex_v1"],
] as const);

const REQUESTED_BY_CATALOG = new Map(EXACT_15.map(([requested, catalog]) => [catalog, requested]));
const CATALOG_IDS = EXACT_15.map(([, catalog]) => catalog);

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function writeEvidence(name: string, value: unknown): string {
  const path = resolve(EVIDENCE_ROOT, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function json(value: unknown): string {
  return JSON.stringify(value ?? null);
}

async function insertBatches(
  client: Client,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
  batchSize = 150,
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `R53_INSERT_COLUMN_MISMATCH:${table}`);
      const placeholders = row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      });
      return `(${placeholders.join(",")})`;
    });
    await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
  }
}

function releaseValues(row: Json): unknown[] {
  return [
    row.id, row.release_key, row.schema_version, "retired", row.source_commit, row.source_tree,
    row.source_manifest_sha256, row.definition_count, row.resource_row_count, json({
      ...row.metadata,
      r53CandidateHistoricalProjection: true,
      sourceStatus: row.status,
    }), row.created_at, row.activated_at, row.sealed_at, row.parent_release_id,
    row.source_package_sha256, row.parameter_count, row.formula_count,
  ];
}

async function seedHistoricalCandidate(): Promise<void> {
  const source = new Client({ connectionString: SOURCE_URL, application_name: "r53-exact15-source-readonly" });
  const candidate = new Client({ connectionString: CANDIDATE_URL, application_name: "r53-exact15-candidate-seed" });
  await source.connect();
  await candidate.connect();
  try {
    await source.query("begin read only");
    const truthColumn = await candidate.query(`select exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='estimate_parameter_definition' and column_name='truth_metadata'
    ) present`);
    invariant(truthColumn.rows[0]?.present === false, "R53_SEED_REQUIRES_PRE_TRUTH_SCHEMA");
    const existing = await candidate.query("select count(*)::integer count from public.estimate_definition_release");
    invariant(existing.rows[0]?.count === 0, "R53_CANDIDATE_SEED_NOT_EMPTY");

    const releases = (await source.query("select * from public.estimate_definition_release order by created_at,id")).rows;
    const identities = (await source.query(
      "select * from public.estimate_work_identity where catalog_id=any($1::text[]) order by catalog_id",
      [CATALOG_IDS],
    )).rows;
    const definitions = (await source.query(`
      select v.* from public.estimate_definition_version v
      join public.estimate_definition_release r on r.id=v.release_id
      where r.status='active' and v.catalog_id=any($1::text[]) order by v.catalog_id
    `, [CATALOG_IDS])).rows;
    invariant(identities.length === 15 && definitions.length === 15, `R53_SOURCE_EXACT15_MISSING:${identities.length}:${definitions.length}`);
    const definitionIds = definitions.map((row) => row.id);
    const parameters = (await source.query(
      "select * from public.estimate_parameter_definition where definition_version_id=any($1::uuid[]) order by definition_version_id,ordinal",
      [definitionIds],
    )).rows;
    const formulas = (await source.query(
      "select * from public.estimate_formula_graph where definition_version_id=any($1::uuid[]) order by definition_version_id,formula_id",
      [definitionIds],
    )).rows;
    const resources = (await source.query(
      "select * from public.estimate_resource_spec where definition_version_id=any($1::uuid[]) order by definition_version_id,ordinal",
      [definitionIds],
    )).rows;

    await candidate.query("begin");
    try {
      await insertBatches(candidate, "estimate_definition_release", [
        "id", "release_key", "schema_version", "status", "source_commit", "source_tree",
        "source_manifest_sha256", "definition_count", "resource_row_count", "metadata", "created_at",
        "activated_at", "sealed_at", "parent_release_id", "source_package_sha256", "parameter_count", "formula_count",
      ], releases.map(releaseValues), 25);
      await insertBatches(candidate, "estimate_work_identity", [
        "catalog_id", "namespace", "domain", "source_identity", "work_key", "title_ru",
        "denominator_eligible", "canonical_owner", "created_at", "retired_at",
      ], identities.map((row) => [
        row.catalog_id, row.namespace, row.domain, row.source_identity, row.work_key, row.title_ru,
        row.denominator_eligible, row.canonical_owner, row.created_at, row.retired_at,
      ]), 25);
      await insertBatches(candidate, "estimate_definition_version", [
        "id", "release_id", "catalog_id", "definition_version", "passport", "applicability",
        "definition_sha256", "source_metadata", "created_at",
      ], definitions.map((row) => [
        row.id, row.release_id, row.catalog_id, row.definition_version, json(row.passport), json(row.applicability),
        row.definition_sha256, json(row.source_metadata), row.created_at,
      ]), 25);
      await insertBatches(candidate, "estimate_parameter_definition", [
        "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru",
        "required", "default_value", "constraints_json",
      ], parameters.map((row) => [
        row.definition_version_id, row.parameter_id, row.ordinal, row.value_type, row.unit_id, row.title_ru,
        row.required, row.default_value == null ? null : json(row.default_value), json(row.constraints_json),
      ]));
      await insertBatches(candidate, "estimate_formula_graph", [
        "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
        "input_parameter_ids", "ast_sha256",
      ], formulas.map((row) => [
        row.definition_version_id, row.formula_id, row.output_unit_id, row.expression_source,
        json(row.ast), row.input_parameter_ids, row.ast_sha256,
      ]));
      await insertBatches(candidate, "estimate_resource_spec", [
        "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
        "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
        "procurement_eligible", "source_metadata", "row_sha256", "created_at",
      ], resources.map((row) => [
        row.id, row.definition_version_id, row.row_id, row.ordinal, row.section, row.category, row.title_ru,
        row.row_type, row.unit_id, row.formula_id, json(row.inclusion_ast), json(row.resource_graph),
        row.semantic_owner, row.cost_owner_id, row.procurement_eligible, json(row.source_metadata), row.row_sha256,
        row.created_at,
      ]), 75);
      await candidate.query("commit");
    } catch (error) {
      await candidate.query("rollback");
      throw error;
    }
    await source.query("commit");

    const evidence = {
      schemaVersion: "p0-one-monolith-r53-exact15-candidate-seed.v1",
      specSha256: SPEC_SHA256,
      sourceDatabase: "batch009_fire_r5_a",
      candidateDatabase: "p0_r53_exact15_candidate",
      sourceMode: "READ_ONLY",
      sourceWrites: 0,
      cutover: false,
      requestedIds: EXACT_15.map(([requested]) => requested),
      catalogIds: CATALOG_IDS,
      counts: {
        releases: releases.length,
        identities: identities.length,
        definitions: definitions.length,
        parameters: parameters.length,
        formulas: formulas.length,
        resources: resources.length,
      },
      sourceProjectionHash: sha256({
        definitions: definitions.map((row) => [row.catalog_id, row.definition_sha256]),
        parameters: parameters.map((row) => [row.definition_version_id, row.parameter_id, row.constraints_json]),
        formulas: formulas.map((row) => [row.definition_version_id, row.formula_id, row.ast_sha256]),
        resources: resources.map((row) => [row.definition_version_id, row.row_id, row.row_sha256]),
      }),
      status: "GREEN_CANDIDATE_HISTORY_SEEDED",
    };
    const path = writeEvidence("EXACT15_CANDIDATE_SEED.json", evidence);
    process.stdout.write(`${JSON.stringify({ ...evidence, evidencePath: path }, null, 2)}\n`);
  } finally {
    await Promise.allSettled([source.end(), candidate.end()]);
  }
}

function collectNormativeLinks(value: unknown, output: Json[]): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectNormativeLinks(item, output);
    return;
  }
  const object = value as Json;
  for (const [key, child] of Object.entries(object)) {
    if (/^(?:normative|normativeTrace|normativeTraceV3)$/u.test(key) && Array.isArray(child)) {
      for (const item of child) if (item && typeof item === "object" && !Array.isArray(item)) output.push(item as Json);
    }
    collectNormativeLinks(child, output);
  }
}

function collectInclusionParameterIds(value: unknown, output: Set<string>): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectInclusionParameterIds(item, output);
    return;
  }
  const object = value as Json;
  if (object.kind === "parameter" && typeof object.id === "string") output.add(object.id);
  if (typeof object.parameterId === "string") output.add(object.parameterId);
  for (const child of Object.values(object)) collectInclusionParameterIds(child, output);
}

function finite(value: unknown): number | null {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function withinConstraints(value: unknown, row: Json): boolean {
  const constraints = row.constraints_json ?? {};
  if (row.value_type === "boolean") return typeof value === "boolean";
  if (row.value_type === "text") return typeof value === "string" && value.trim().length > 0;
  if (row.value_type === "enum") return Array.isArray(constraints.values) && constraints.values.includes(value);
  const number = finite(value);
  if (number == null || (row.value_type === "integer" && !Number.isInteger(number))) return false;
  return (constraints.min == null || number >= Number(constraints.min))
    && (constraints.max == null || number <= Number(constraints.max));
}

function guideFor(row: Json, normativeLinks: readonly Json[]): Json {
  const constraints = row.constraints_json ?? {};
  const firstNorm = normativeLinks[0] ?? {};
  const range = constraints.min != null || constraints.max != null
    ? `${constraints.min == null ? "" : constraints.min}…${constraints.max == null ? "" : constraints.max}${row.unit_id ? ` ${row.unit_id}` : ""}`
    : null;
  const kind = row.value_type === "enum"
    ? "ENUM_DECISION_RULE"
    : range
      ? "PRACTICE_REFERENCE"
      : row.value_type === "boolean"
        ? "PROJECT_DEFINED"
        : "PROJECT_DEFINED";
  const guideShort = row.value_type === "enum"
    ? `Ориентир выбора: ${(constraints.values ?? []).slice(0, 3).join(" / ")}`
    : range
      ? `Ориентир допустимого диапазона: ${range}`
      : `Уточните по проекту: ${String(row.title_ru).toLocaleLowerCase("ru-RU")}`;
  return {
    guide_short_ru: guideShort,
    guide_kind: kind,
    source_role: String(firstNorm.source_role ?? "ACCEPTED_PARAMETER_SCHEMA_CONSTRAINT"),
    source_document: firstNorm.document_code ?? null,
    source_locator: firstNorm.exact_locator ?? null,
    source_edition_status: firstNorm.edition ?? null,
    guide_version: ACCEPTED_TRACE_BASELINE_VERSION,
    source_snapshot_hash: sha256(normativeLinks.length ? normativeLinks : {
      parameterId: row.parameter_id,
      constraints,
    }),
    applicability: String(firstNorm.applicability ?? "Видимое предварительное допущение; заменить проектным или обмерным значением."),
    verified_at: FIXED_VERIFIED_AT,
    canonical_unit: row.unit_id,
    display_unit: row.unit_id,
    guide_min: constraints.min ?? null,
    guide_max: constraints.max ?? null,
    guide_options: constraints.values ?? null,
    guide_validation_policy: "USER_VALUE_OVERRIDES_VISIBLE_BASELINE",
  };
}

type AcceptedTraceBinding = {
  catalogId: string;
  parameterId: string;
  value: unknown;
  releaseId: string;
  definitionVersionId: string;
  definitionVersion: number;
  parameterSchemaId: string;
  parameterSchemaVersion: string;
  acceptedBatch: string;
  traceId: string;
  formulaId: string;
  resourceRowId: string;
  normativeSourceIds: string[];
};

function acceptedTraceBindings(input: {
  definition: Json;
  resource: Json;
  formulaById: ReadonlyMap<string, Json>;
  parameterSchemaId: string;
  parameterSchemaVersion: string;
}): AcceptedTraceBinding[] {
  const acceptedTrace = input.resource.source_metadata?.acceptedTrace;
  const graph = acceptedTrace?.formulaGraphV3;
  if (acceptedTrace?.verdict !== "GREEN") return [];
  if (acceptedTrace?.catalogId !== input.definition.catalog_id) return [];
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) return [];
  if (!graph.inputValues || typeof graph.inputValues !== "object" || Array.isArray(graph.inputValues)) return [];
  const acceptedBatch = String(input.resource.source_metadata?.acceptedBatch ?? "");
  if (!/^BATCH00[1-8]$/u.test(acceptedBatch)) return [];
  const formulaId = String(graph.formulaId ?? "");
  const formula = input.formulaById.get(formulaId);
  if (!formula || formulaId !== input.resource.formula_id) return [];
  const acceptedParameterIds = new Set((formula.input_parameter_ids ?? []).map(String));
  const traceId = String(acceptedTrace.rowCode ?? acceptedTrace.traceId ?? input.resource.row_id ?? "");
  if (!traceId) return [];
  const normativeLinks: Json[] = [];
  collectNormativeLinks(input.resource.source_metadata, normativeLinks);
  const normativeSourceIds = [...new Set(normativeLinks.map((link) => String(link.source_id ?? "")).filter(Boolean))].sort();
  if (normativeSourceIds.length === 0) return [];
  return Object.entries(graph.inputValues).flatMap(([parameterId, value]) =>
    acceptedParameterIds.has(parameterId) ? [{
      catalogId: String(input.definition.catalog_id),
      parameterId,
      value,
      releaseId: String(input.definition.release_id),
      definitionVersionId: String(input.definition.id),
      definitionVersion: Number(input.definition.definition_version),
      parameterSchemaId: input.parameterSchemaId,
      parameterSchemaVersion: input.parameterSchemaVersion,
      acceptedBatch,
      traceId,
      formulaId,
      resourceRowId: String(input.resource.row_id),
      normativeSourceIds,
    }] : []);
}

function buildAcceptedBaselineProjection(input: {
  definition: Json;
  parameters: readonly Json[];
  formulas: readonly Json[];
  resources: readonly Json[];
}): Json {
  const parameterById = new Map(input.parameters.map((row) => [String(row.parameter_id), row]));
  const formulaById = new Map(input.formulas.map((row) => [String(row.formula_id), row]));
  const formulaParameterIds = new Set(input.formulas.flatMap((formula) => (formula.input_parameter_ids ?? []).map(String)));
  const schemaRequiredParameterIds = new Set(
    input.parameters.filter((parameter) => parameter.required === true).map((parameter) => String(parameter.parameter_id)),
  );
  const parameterSchemaId = sha256(input.parameters.map((parameter) => ({
    parameterId: parameter.parameter_id,
    ordinal: parameter.ordinal,
    valueType: parameter.value_type,
    unitId: parameter.unit_id,
    titleRu: parameter.title_ru,
    required: parameter.required,
    constraints: parameter.constraints_json,
  })));
  const parameterSchemaVersion = `definition:${String(input.definition.definition_version)}`;
  const inclusionParameterIds = new Set<string>();
  for (const resource of input.resources) collectInclusionParameterIds(resource.inclusion_ast, inclusionParameterIds);
  const requiredBaselineParameterIds = [...new Set([...formulaParameterIds, ...inclusionParameterIds])].sort();
  const unusedSchemaParameterIds = [...parameterById.keys()]
    .filter((parameterId) => !formulaParameterIds.has(parameterId) && !inclusionParameterIds.has(parameterId))
    .sort();
  const unusedRequiredParameterIds = unusedSchemaParameterIds
    .filter((parameterId) => schemaRequiredParameterIds.has(parameterId));
  const bindings = input.resources.flatMap((resource) => acceptedTraceBindings({
    definition: input.definition,
    resource,
    formulaById,
    parameterSchemaId,
    parameterSchemaVersion,
  }));
  const byParameter = new Map<string, AcceptedTraceBinding[]>();
  for (const binding of bindings) {
    const bucket = byParameter.get(binding.parameterId) ?? [];
    bucket.push(binding);
    byParameter.set(binding.parameterId, bucket);
  }
  const defaults: Json = {};
  const acceptedProvenance: Json = {};
  const conflicts: Json[] = [];
  const invalid: Json[] = [];
  for (const [parameterId, candidates] of byParameter) {
    const definition = parameterById.get(parameterId);
    if (!definition) {
      invalid.push({ parameterId, reason: "ACCEPTED_TRACE_PARAMETER_NOT_IN_SCHEMA" });
      continue;
    }
    const compatible = candidates.filter((candidate) => withinConstraints(candidate.value, definition));
    if (compatible.length !== candidates.length) {
      invalid.push({
        parameterId,
        reason: "ACCEPTED_TRACE_VALUE_OUTSIDE_SCHEMA",
        rejected: candidates.filter((candidate) => !withinConstraints(candidate.value, definition)),
      });
    }
    const uniqueValues = [...new Map(compatible.map((candidate) => [stable(candidate.value), candidate.value])).values()];
    if (uniqueValues.length > 1) {
      conflicts.push({ parameterId, values: uniqueValues, bindings: compatible });
      continue;
    }
    if (uniqueValues.length === 1) {
      defaults[parameterId] = uniqueValues[0];
      acceptedProvenance[parameterId] = compatible;
    }
  }
  const missingParameterIds = requiredBaselineParameterIds.filter((parameterId) => defaults[parameterId] === undefined);
  const inventedPriceDefaults = Object.keys(defaults).filter((parameterId) => parameterId.startsWith("unit_price_"));
  const ready = missingParameterIds.length === 0
    && conflicts.length === 0
    && invalid.length === 0
    && inventedPriceDefaults.length === 0;
  return {
    catalogId: input.definition.catalog_id,
    releaseId: input.definition.release_id,
    definitionVersionId: input.definition.id,
    definitionVersion: input.definition.definition_version,
    definitionSha256: input.definition.definition_sha256,
    parameterSchemaId,
    parameterSchemaVersion,
    acceptedTraceContract: "acceptedTrace.formulaGraphV3.inputValues",
    baselineVersion: ACCEPTED_TRACE_BASELINE_VERSION,
    formulaParameterIds: [...formulaParameterIds].sort(),
    inclusionParameterIds: [...inclusionParameterIds].sort(),
    schemaRequiredParameterIds: [...schemaRequiredParameterIds].sort(),
    requiredBaselineParameterIds,
    unusedSchemaParameterIds,
    unusedRequiredParameterIds,
    acceptedParameterIds: Object.keys(defaults).sort(),
    acceptedBindings: bindings,
    defaults,
    acceptedProvenance,
    missingParameterIds,
    conflicts,
    invalid,
    inventedFallbackCount: 0,
    inventedPriceDefaults,
    ready,
    status: ready ? "GREEN_ACCEPTED_BASELINE" : "RED_ACCEPTED_BASELINE_INCOMPLETE",
  };
}

async function loadDefinitionContent(client: Client, definition: Json): Promise<{
  parameters: QueryResultRow[];
  formulas: QueryResultRow[];
  resources: QueryResultRow[];
}> {
  const parameters = (await client.query(
    "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
    [definition.id],
  )).rows;
  const formulas = (await client.query(
    "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
    [definition.id],
  )).rows;
  const resources = (await client.query(
    "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
    [definition.id],
  )).rows;
  return { parameters, formulas, resources };
}

async function acceptedBaselinePreflight(): Promise<Json> {
  const client = new Client({ connectionString: SOURCE_URL, application_name: "r53-exact15-accepted-baseline-preflight" });
  await client.connect();
  try {
    await client.query("begin read only");
    const definitions = (await client.query(`
      select v.* from public.estimate_definition_version v
      join public.estimate_definition_release r on r.id=v.release_id
      where r.status='active' and v.catalog_id=any($1::text[])
      order by v.catalog_id
    `, [CATALOG_IDS])).rows;
    const entries: Json[] = [];
    for (const definition of definitions) {
      const content = await loadDefinitionContent(client, definition);
      entries.push({
        requestedCatalogWorkId: REQUESTED_BY_CATALOG.get(definition.catalog_id),
        ...buildAcceptedBaselineProjection({ definition, ...content }),
      });
    }
    await client.query("commit");
    const ready = entries.filter((entry) => entry.ready).length;
    const evidence = {
      schemaVersion: "p0-one-monolith-r53-exact15-accepted-baseline-preflight.v1",
      specSha256: SPEC_SHA256,
      sourceDatabase: "batch009_fire_r5_a",
      sourceMode: "READ_ONLY",
      sourceWrites: 0,
      cutover: false,
      localhost8081Switched: false,
      denominator: 15,
      definitionsFound: definitions.length,
      ready,
      red: 15 - ready,
      acceptedTraceContract: "acceptedTrace.formulaGraphV3.inputValues",
      forbiddenSources: ["validation scenario", "constraints.min", "midpoint", "cross-work parameter", "invented norm", "invented price"],
      inventedFallbackCount: 0,
      entries,
      status: definitions.length === 15 && ready === 15 ? "GREEN" : "RED",
    };
    const path = writeEvidence("EXACT15_ACCEPTED_BASELINE_PREFLIGHT.json", evidence);
    return { ...evidence, evidencePath: path, evidenceSha256: sha256(evidence) };
  } finally {
    await client.end();
  }
}

async function runAcceptedBaselinePreflight(): Promise<void> {
  const evidence = await acceptedBaselinePreflight();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  if (evidence.status !== "GREEN") process.exitCode = 1;
}

function semanticFingerprint(definition: Json, parameters: readonly Json[], formulas: readonly Json[], resources: readonly Json[]): Json {
  return {
    catalogId: definition.catalog_id,
    parameters: sha256(parameters.map((row) => ({
      parameterId: row.parameter_id,
      ordinal: row.ordinal,
      valueType: row.value_type,
      unitId: row.unit_id,
      titleRu: row.title_ru,
      constraints: row.constraints_json,
    }))),
    formulas: sha256(formulas.map((row) => ({
      formulaId: row.formula_id,
      outputUnitId: row.output_unit_id,
      expressionSource: row.expression_source,
      ast: row.ast,
      inputParameterIds: row.input_parameter_ids,
      astSha256: row.ast_sha256,
    }))),
    resources: sha256(resources.map((row) => ({
      rowId: row.row_id,
      ordinal: row.ordinal,
      section: row.section,
      category: row.category,
      titleRu: row.title_ru,
      rowType: row.row_type,
      unitId: row.unit_id,
      formulaId: row.formula_id,
      inclusionAst: row.inclusion_ast,
      resourceGraph: row.resource_graph,
      semanticOwner: row.semantic_owner,
      costOwnerId: row.cost_owner_id,
      procurementEligible: row.procurement_eligible,
      sourceMetadata: row.source_metadata,
      rowSha256: row.row_sha256,
    }))),
  };
}

async function admitSuccessorDefinitions(): Promise<void> {
  const acceptedPreflight = await acceptedBaselinePreflight();
  invariant(
    acceptedPreflight.status === "GREEN",
    `R53_ACCEPTED_BASELINE_PREFLIGHT_RED:${acceptedPreflight.ready}/15:${acceptedPreflight.evidencePath}`,
  );
  const client = new Client({ connectionString: CANDIDATE_URL, application_name: "r53-exact15-candidate-admission" });
  await client.connect();
  try {
    const truthColumn = await client.query(`select exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='estimate_parameter_definition' and column_name='truth_metadata'
    ) present`);
    invariant(truthColumn.rows[0]?.present === true, "R53_ADMIT_REQUIRES_TRUTH_MIGRATION");
    const activeBefore = await client.query("select count(*)::integer count from public.estimate_definition_release where status='active'");
    invariant(activeBefore.rows[0]?.count === 0, "R53_CANDIDATE_ACTIVE_RELEASE_ALREADY_PRESENT");
    const historicalDefinitions = (await client.query(`
      select v.* from public.estimate_definition_version v
      join public.estimate_definition_release r on r.id=v.release_id
      where r.release_key='batch008-concrete-r5-da29dc2b13842487'
        and v.catalog_id=any($1::text[])
      order by v.catalog_id
    `, [CATALOG_IDS])).rows;
    invariant(historicalDefinitions.length === 15, `R53_CANDIDATE_HISTORY_INCOMPLETE:${historicalDefinitions.length}`);
    const parentReleaseId = historicalDefinitions[0]?.release_id;
    invariant(historicalDefinitions.every((row) => row.release_id === parentReleaseId), "R53_EXACT15_PARENT_RELEASE_DRIFT");

    const head = git("rev-parse", "HEAD");
    const tree = git("rev-parse", "HEAD^{tree}");
    const releaseId = randomUUID();
    const releaseKey = `p0-r53-exact15-truth-${head.slice(0, 12)}`;
    const releaseManifest = {
      schemaVersion: "p0-one-monolith-r53-exact15-release-manifest.v1",
      specSha256: SPEC_SHA256,
      head,
      tree,
      parentReleaseId,
      exactCatalogIds: CATALOG_IDS,
      productionScope: "TARGETED_CANDIDATE_NOT_CUTOVER",
    };
    const releaseManifestSha256 = sha256(releaseManifest);
    const admissions: Json[] = [];
    let parameterCount = 0;
    let formulaCount = 0;
    let resourceCount = 0;

    await client.query("begin");
    try {
      await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
        definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
        parameter_count,formula_count
      ) values($1,$2,3,'draft',$3,$4,$5,15,0,$6::jsonb,$7,$5,0,0)`, [
        releaseId, releaseKey, head, tree, releaseManifestSha256, json({
          ...releaseManifest,
          baselineOwner: ACCEPTED_TRACE_BASELINE_VERSION,
          batch009Activated: false,
          cutover: false,
        }), parentReleaseId,
      ]);

      for (const historical of historicalDefinitions) {
        const oldDefinitionId = historical.id;
        const parameters = (await client.query(
          "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
          [oldDefinitionId],
        )).rows;
        const formulas = (await client.query(
          "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
          [oldDefinitionId],
        )).rows;
        const resources = (await client.query(
          "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
          [oldDefinitionId],
        )).rows;
        invariant(parameters.length > 0 && formulas.length > 0 && resources.length > 0, `R53_EMPTY_DEFINITION:${historical.catalog_id}`);
        const beforeFingerprint = semanticFingerprint(historical, parameters, formulas, resources);

        const formulaConsumers = new Map<string, Set<string>>();
        for (const formula of formulas) for (const parameterId of formula.input_parameter_ids ?? []) {
          const consumers = formulaConsumers.get(parameterId) ?? new Set<string>();
          consumers.add(formula.formula_id);
          formulaConsumers.set(parameterId, consumers);
        }
        const inclusionConsumers = new Map<string, Set<string>>();
        const resourceConsumers = new Map<string, Set<string>>();
        const resourcesByFormula = new Map<string, Json[]>();
        for (const resource of resources) {
          const byFormula = resourcesByFormula.get(resource.formula_id) ?? [];
          byFormula.push(resource);
          resourcesByFormula.set(resource.formula_id, byFormula);
          const inclusionIds = new Set<string>();
          collectInclusionParameterIds(resource.inclusion_ast, inclusionIds);
          for (const parameterId of inclusionIds) {
            const consumers = inclusionConsumers.get(parameterId) ?? new Set<string>();
            consumers.add(resource.row_id);
            inclusionConsumers.set(parameterId, consumers);
          }
          const contextIds = Array.isArray(resource.resource_graph?.context_parameter_ids)
            ? resource.resource_graph.context_parameter_ids
            : [];
          for (const parameterId of contextIds) {
            const consumers = resourceConsumers.get(parameterId) ?? new Set<string>();
            consumers.add(resource.row_id);
            resourceConsumers.set(parameterId, consumers);
          }
        }
        for (const [parameterId, formulaIds] of formulaConsumers) {
          const consumers = resourceConsumers.get(parameterId) ?? new Set<string>();
          for (const formulaId of formulaIds) {
            for (const resource of resourcesByFormula.get(formulaId) ?? []) consumers.add(resource.row_id);
          }
          resourceConsumers.set(parameterId, consumers);
        }

        const acceptedProjection = buildAcceptedBaselineProjection({
          definition: historical,
          parameters,
          formulas,
          resources,
        });
        invariant(acceptedProjection.ready === true, `R53_ACCEPTED_BASELINE_INCOMPLETE:${historical.catalog_id}`);
        const defaults = acceptedProjection.defaults as Json;
        const acceptedProvenance = acceptedProjection.acceptedProvenance as Json;
        const sourceParameterSchemaId = String(acceptedProjection.parameterSchemaId);
        const sourceParameterSchemaVersion = String(acceptedProjection.parameterSchemaVersion);
        const consumerParameterIds = new Set((acceptedProjection.requiredBaselineParameterIds as string[]) ?? []);
        const projectedParameters = parameters.filter((row) => consumerParameterIds.has(String(row.parameter_id)));
        invariant(projectedParameters.length === consumerParameterIds.size, `R53_CONSUMER_PARAMETER_SCHEMA_INCOMPLETE:${historical.catalog_id}`);

        const successorParameters = projectedParameters.map((row) => {
          const formulaIds = [...(formulaConsumers.get(row.parameter_id) ?? [])].sort();
          const branchIds = [...(inclusionConsumers.get(row.parameter_id) ?? [])].sort();
          const resourceIds = [...new Set([
            ...(resourceConsumers.get(row.parameter_id) ?? []),
            ...branchIds,
          ])].sort();
          const linkedResources = resources.filter((resource) => resourceIds.includes(resource.row_id));
          const normativeLinks: Json[] = [];
          for (const resource of linkedResources.length ? linkedResources : resources.slice(0, 1)) {
            collectNormativeLinks(resource.source_metadata, normativeLinks);
          }
          const uniqueNormativeLinks = [...new Map(normativeLinks.map((link) => [sha256(link), link])).values()];
          const defaultValue = defaults[row.parameter_id];
          const baselineBindings = acceptedProvenance[row.parameter_id] ?? [];
          const truthMetadata = {
            semantic_parameter_key: row.parameter_id,
            visibility_role: "USER_INPUT",
            description_ru: row.title_ru,
            required_when: row.constraints_json?.requiredWhen ?? null,
            visible_when: null,
            allowed_range_or_options: row.constraints_json,
            default_policy: defaultValue === undefined ? "USER_OR_EXACT_STAGE_INPUT" : "VISIBLE_PRELIMINARY_ASSUMPTION",
            baseline_assumption_id: defaultValue === undefined
              ? null
              : `${ACCEPTED_TRACE_BASELINE_VERSION}:${historical.release_id}:${oldDefinitionId}:${row.parameter_id}`,
            baseline_source_id: defaultValue === undefined ? null : `accepted-trace:${historical.catalog_id}:${row.parameter_id}`,
            baseline_reason_ru: defaultValue === undefined
              ? null
              : "Значение перенесено из принятого exact formulaGraphV3 trace той же работы и той же definition version; пользовательское уточнение имеет приоритет.",
            value_source_role: defaultValue === undefined ? "USER_INPUT" : "VISIBLE_BASELINE_ASSUMPTION",
            guide: guideFor(row, uniqueNormativeLinks),
            shared_input_binding_policy: "EXACT_CATALOG_ID_ONLY",
            derived_from: [],
            normative_links: uniqueNormativeLinks,
            formula_consumers: formulaIds,
            resource_branch_consumers: resourceIds,
            validation_rules: [row.constraints_json],
            conflicts_with: [],
            provenance: {
              contractVersion: "p0-one-monolith-r53-parameter-truth.v1",
              sourceDefinitionVersionId: oldDefinitionId,
              sourceDefinitionVersion: historical.definition_version,
              sourceDefinitionHash: historical.definition_sha256,
              sourceReleaseId: historical.release_id,
              sourceCatalogId: historical.catalog_id,
              sourceParameterSchemaId,
              sourceParameterSchemaVersion,
              baselineOwner: ACCEPTED_TRACE_BASELINE_VERSION,
              acceptedTraceBindings: baselineBindings,
              specSha256: SPEC_SHA256,
            },
          };
          return {
            ...row,
            required: row.required,
            default_value: defaultValue,
            truth_metadata: truthMetadata,
          };
        });
        validateCanonicalEstimateParameters(successorParameters, {}, {
          baselineContext: { catalogId: historical.catalog_id },
        });
        invariant(successorParameters.every((row) => {
          const formulaIds = row.truth_metadata.formula_consumers as string[];
          const resourceIds = row.truth_metadata.resource_branch_consumers as string[];
          return formulaIds.every((formulaId) => formulas.some((formula) => formula.formula_id === formulaId))
            && resourceIds.every((rowId) => resources.some((resource) => resource.row_id === rowId));
        }), `R53_CONSUMER_PROJECTION_INVALID:${historical.catalog_id}`);

        const newDefinitionId = randomUUID();
        const definitionVersion = Number(historical.definition_version) + 1;
        const parameterSchemaId = sha256(successorParameters.map((parameter) => ({
          parameterId: parameter.parameter_id,
          ordinal: parameter.ordinal,
          valueType: parameter.value_type,
          unitId: parameter.unit_id,
          titleRu: parameter.title_ru,
          required: parameter.required,
          defaultValue: parameter.default_value,
          constraints: parameter.constraints_json,
          truth: parameter.truth_metadata,
        })));
        const definitionPassport = {
          ...historical.passport,
          parameterSchemaId,
          parameterSchemaVersion: "r53.1",
          sourceParameterSchemaId,
          sourceParameterSchemaVersion,
          requestedCatalogWorkId: REQUESTED_BY_CATALOG.get(historical.catalog_id),
          canonicalCatalogId: historical.catalog_id,
          baselineOwner: ACCEPTED_TRACE_BASELINE_VERSION,
          baselineWithoutUserInput: true,
          sourceParameterCount: parameters.length,
          parameterCount: successorParameters.length,
          removedUnusedParameterIds: acceptedProjection.unusedSchemaParameterIds,
        };
        const definitionSourceMetadata = {
          ...historical.source_metadata,
          truthRemediation: {
            contractVersion: "p0-one-monolith-r53-exact15-definition.v1",
            sourceDefinitionVersionId: oldDefinitionId,
            sourceDefinitionHash: historical.definition_sha256,
            sourceReleaseId: historical.release_id,
            specSha256: SPEC_SHA256,
            head,
            tree,
            formulasChanged: false,
            resourcesChanged: false,
            batch009Activated: false,
          },
        };
        const definitionHash = sha256({
          catalogId: historical.catalog_id,
          definitionVersion,
          passport: definitionPassport,
          applicability: historical.applicability,
          sourceMetadata: definitionSourceMetadata,
          parameters: successorParameters.map((row) => ({
            parameterId: row.parameter_id,
            ordinal: row.ordinal,
            required: row.required,
            defaultValue: row.default_value,
            constraints: row.constraints_json,
            truth: row.truth_metadata,
          })),
          formulaHash: beforeFingerprint.formulas,
          resourceHash: beforeFingerprint.resources,
        });
        await client.query(`insert into public.estimate_definition_version(
          id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
        ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb)`, [
          newDefinitionId, releaseId, historical.catalog_id, definitionVersion, json(definitionPassport),
          json(historical.applicability), definitionHash, json(definitionSourceMetadata),
        ]);
        await insertBatches(client, "estimate_parameter_definition", [
          "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru",
          "required", "default_value", "constraints_json", "truth_metadata",
        ], successorParameters.map((row) => [
          newDefinitionId, row.parameter_id, row.ordinal, row.value_type, row.unit_id, row.title_ru,
          row.required, row.default_value === undefined ? null : json(row.default_value), json(row.constraints_json),
          json(row.truth_metadata),
        ]));
        await insertBatches(client, "estimate_formula_graph", [
          "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
          "input_parameter_ids", "ast_sha256",
        ], formulas.map((row) => [
          newDefinitionId, row.formula_id, row.output_unit_id, row.expression_source, json(row.ast),
          row.input_parameter_ids, row.ast_sha256,
        ]));
        const successorResources = resources.map((row) => ({ ...row, id: randomUUID(), definition_version_id: newDefinitionId }));
        await insertBatches(client, "estimate_resource_spec", [
          "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
          "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
          "procurement_eligible", "source_metadata", "row_sha256", "created_at",
        ], successorResources.map((row) => [
          row.id, newDefinitionId, row.row_id, row.ordinal, row.section, row.category, row.title_ru, row.row_type,
          row.unit_id, row.formula_id, json(row.inclusion_ast), json(row.resource_graph), row.semantic_owner,
          row.cost_owner_id, row.procurement_eligible, json(row.source_metadata), row.row_sha256, row.created_at,
        ]), 75);
        const afterFingerprint = semanticFingerprint(
          { ...historical, definition_version: definitionVersion },
          successorParameters,
          formulas,
          successorResources,
        );
        const projectedBeforeFingerprint = semanticFingerprint(historical, projectedParameters, formulas, resources);
        invariant(projectedBeforeFingerprint.parameters === afterFingerprint.parameters, `R53_PARAMETER_SCHEMA_DRIFT:${historical.catalog_id}`);
        invariant(beforeFingerprint.formulas === afterFingerprint.formulas, `R53_FORMULA_DRIFT:${historical.catalog_id}`);
        invariant(beforeFingerprint.resources === afterFingerprint.resources, `R53_RESOURCE_DRIFT:${historical.catalog_id}`);
        parameterCount += successorParameters.length;
        formulaCount += formulas.length;
        resourceCount += resources.length;
        admissions.push({
          requestedCatalogWorkId: REQUESTED_BY_CATALOG.get(historical.catalog_id),
          canonicalCatalogId: historical.catalog_id,
          sourceDefinitionVersionId: oldDefinitionId,
          successorDefinitionVersionId: newDefinitionId,
          definitionVersion,
          parameterSchemaId,
          sourceParameterCount: parameters.length,
          parameterCount: successorParameters.length,
          removedUnusedParameterIds: acceptedProjection.unusedSchemaParameterIds,
          baselineDefaultCount: successorParameters.filter((row) => row.default_value !== undefined).length,
          visibleGuideCount: successorParameters.filter((row) => row.truth_metadata.guide?.guide_short_ru).length,
          formulaConsumerParameterCount: successorParameters.filter((row) => row.truth_metadata.formula_consumers.length > 0).length,
          resourceConsumerParameterCount: successorParameters.filter((row) => row.truth_metadata.resource_branch_consumers.length > 0).length,
          formulaCount: formulas.length,
          resourceCount: resources.length,
          beforeFingerprint,
          projectedBeforeFingerprint,
          afterFingerprint,
          parameterCards: successorParameters.map((row) => ({
            parameterId: row.parameter_id,
            titleRu: row.title_ru,
            valueType: row.value_type,
            unitId: row.unit_id,
            required: row.required,
            baselineValue: row.default_value,
            baselineAssumptionId: row.truth_metadata.baseline_assumption_id,
            guide: row.truth_metadata.guide,
            normativeLinks: row.truth_metadata.normative_links,
            formulaConsumers: row.truth_metadata.formula_consumers,
            resourceConsumers: row.truth_metadata.resource_branch_consumers,
          })),
          status: "GREEN_ADMITTED",
        });
      }
      await client.query(`update public.estimate_definition_release set
        status='active', sealed_at=now(), activated_at=now(), parameter_count=$2,
        formula_count=$3, resource_row_count=$4
        where id=$1`, [releaseId, parameterCount, formulaCount, resourceCount]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const evidence = {
      schemaVersion: "p0-one-monolith-r53-exact15-canonical-admission.v1",
      specSha256: SPEC_SHA256,
      head,
      tree,
      candidateDatabase: "p0_r53_exact15_candidate",
      releaseId,
      releaseKey,
      parentReleaseId,
      sourceBatch: "BATCH008",
      batch009Activated: false,
      sourceDatabaseWrites: 0,
      localhost8081Switched: false,
      cutover: false,
      baselineOwner: ACCEPTED_TRACE_BASELINE_VERSION,
      counts: { definitions: admissions.length, parameters: parameterCount, formulas: formulaCount, resources: resourceCount },
      admissions,
      status: admissions.length === 15 ? "GREEN_EXACT15_CANONICAL_CANDIDATE" : "RED",
    };
    const path = writeEvidence("EXACT15_CANONICAL_ADMISSION.json", evidence);
    process.stdout.write(`${JSON.stringify({
      status: evidence.status,
      releaseId,
      releaseKey,
      counts: evidence.counts,
      evidencePath: path,
      evidenceSha256: sha256(evidence),
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

async function verifyCandidate(): Promise<void> {
  const client = new Client({ connectionString: CANDIDATE_URL, application_name: "r53-exact15-candidate-verify" });
  await client.connect();
  try {
    const rows = (await client.query(`
      select v.catalog_id,v.id definition_version_id,v.definition_version,v.passport,
        count(distinct p.parameter_id)::integer parameter_count,
        count(distinct p.parameter_id) filter(where p.default_value is not null)::integer default_count,
        count(distinct p.parameter_id) filter(where nullif(p.truth_metadata->'guide'->>'guide_short_ru','') is not null)::integer guide_count,
        count(distinct f.formula_id)::integer formula_count,
        count(distinct s.row_id)::integer resource_count
      from public.estimate_definition_version v
      join public.estimate_definition_release r on r.id=v.release_id and r.status='active'
      join public.estimate_parameter_definition p on p.definition_version_id=v.id
      join public.estimate_formula_graph f on f.definition_version_id=v.id
      join public.estimate_resource_spec s on s.definition_version_id=v.id
      where v.catalog_id=any($1::text[])
      group by v.catalog_id,v.id,v.definition_version,v.passport
      order by v.catalog_id
    `, [CATALOG_IDS])).rows;
    const failures = rows.flatMap((row) => [
      ...(row.parameter_count <= 0 ? [`parameter:${row.catalog_id}`] : []),
      ...(row.default_count <= 0 ? [`default:${row.catalog_id}`] : []),
      ...(row.guide_count !== row.parameter_count ? [`guide:${row.catalog_id}:${row.guide_count}/${row.parameter_count}`] : []),
      ...(row.formula_count <= 0 ? [`formula:${row.catalog_id}`] : []),
      ...(row.resource_count <= 0 ? [`resource:${row.catalog_id}`] : []),
      ...(row.passport?.baselineWithoutUserInput !== true ? [`passport_baseline:${row.catalog_id}`] : []),
    ]);
    const evidence = {
      schemaVersion: "p0-one-monolith-r53-exact15-candidate-verification.v1",
      count: rows.length,
      rows,
      failures,
      status: rows.length === 15 && failures.length === 0 ? "GREEN" : "RED",
    };
    const path = writeEvidence("EXACT15_CANDIDATE_VERIFICATION.json", evidence);
    process.stdout.write(`${JSON.stringify({ ...evidence, evidencePath: path }, null, 2)}\n`);
    if (evidence.status !== "GREEN") process.exitCode = 1;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  if (STAGE === "baseline-preflight") return runAcceptedBaselinePreflight();
  if (STAGE === "seed") return seedHistoricalCandidate();
  if (STAGE === "admit") return admitSuccessorDefinitions();
  if (STAGE === "verify") return verifyCandidate();
  throw new Error("R53_STAGE_REQUIRED:baseline-preflight|seed|admit|verify");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
