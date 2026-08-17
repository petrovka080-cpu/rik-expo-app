import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const CONCRETE_NO_AUTHORITATIVE_TRACE = process.argv.includes("--concrete-no-authoritative-trace");
const DRYWALL_TRACE_NOT_ADMITTED = process.argv.includes("--drywall-trace-not-admitted");
const TRACE_NOT_ADMITTED = process.argv.includes("--trace-not-admitted");
const TARGET_PARTITION = CONCRETE_NO_AUTHORITATIVE_TRACE ? "NO_AUTHORITATIVE_TRACE_1286"
  : DRYWALL_TRACE_NOT_ADMITTED || TRACE_NOT_ADMITTED ? "TRACE_NOT_ADMITTED_1432" : "COMPILE_RED_937";
const TARGET_DOMAIN = CONCRETE_NO_AUTHORITATIVE_TRACE ? "concrete"
  : DRYWALL_TRACE_NOT_ADMITTED ? "drywall" : "asphalt";
const EXPECTED_DEFINITIONS = CONCRETE_NO_AUTHORITATIVE_TRACE ? 1_218
  : DRYWALL_TRACE_NOT_ADMITTED ? 500 : TRACE_NOT_ADMITTED ? 38 : 13;
const EXPECTED_PARAMETERS = CONCRETE_NO_AUTHORITATIVE_TRACE ? 389_314
  : DRYWALL_TRACE_NOT_ADMITTED ? 62_614 : TRACE_NOT_ADMITTED ? 4_090 : 1_032;
const EXPECTED_UNUSED_PARAMETERS = CONCRETE_NO_AUTHORITATIVE_TRACE ? 61_781
  : DRYWALL_TRACE_NOT_ADMITTED ? 33_871 : TRACE_NOT_ADMITTED ? 1_038 : 606;
const EXPECTED_SEMANTIC_REPAIRS = CONCRETE_NO_AUTHORITATIVE_TRACE ? 0
  : DRYWALL_TRACE_NOT_ADMITTED ? 27_984 : TRACE_NOT_ADMITTED ? 478 : 66;
const EXPECTED_COST_CONTROL_REPAIRS = CONCRETE_NO_AUTHORITATIVE_TRACE || DRYWALL_TRACE_NOT_ADMITTED
  ? 0 : TRACE_NOT_ADMITTED ? 74 : 2;
const EXPECTED_SUCCESSOR_ENTRIES = CONCRETE_NO_AUTHORITATIVE_TRACE ? 2_793
  : DRYWALL_TRACE_NOT_ADMITTED ? 613 : TRACE_NOT_ADMITTED ? 113 : 75;
const CONTRACT = CONCRETE_NO_AUTHORITATIVE_TRACE
  ? "p0-one-monolith-r58-concrete-no-authoritative-trace-repair-1218.v1"
  : DRYWALL_TRACE_NOT_ADMITTED
  ? "p0-one-monolith-r58-drywall-trace-not-admitted-repair-500.v1"
  : TRACE_NOT_ADMITTED
    ? "p0-one-monolith-r58-asphalt-trace-not-admitted-repair-38.v1"
    : "p0-one-monolith-r58-asphalt-compile-red-repair-13.v1";
const SUCCESSOR_METADATA_KEY = CONCRETE_NO_AUTHORITATIVE_TRACE
  ? "r58ConcreteNoAuthoritativeTraceSuccessor"
  : DRYWALL_TRACE_NOT_ADMITTED ? "r58DrywallTraceNotAdmittedSuccessor"
  : "r58AsphaltCompileRedSuccessor";
const ROW_REPAIR_METADATA_KEY = CONCRETE_NO_AUTHORITATIVE_TRACE
  ? "r58ConcreteNoAuthoritativeTraceRepair"
  : DRYWALL_TRACE_NOT_ADMITTED ? "r58DrywallTraceNotAdmittedRepair"
  : "r58AsphaltCompileRedRepair";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const MATRIX_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/07-boq");
const COST_CONTROL_ROW_SUFFIX = /(?:_trips|_truck_hours)$/iu;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

async function insertBatches(
  client: Client,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    if (batch.length === 0) continue;
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `R58_ASPHALT_13_INSERT_COLUMN_MISMATCH:${table}`);
      return `(${row.map((value) => { values.push(value); return `$${values.length}`; }).join(",")})`;
    });
    await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
  }
}

function duplicateValues(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function collectDeclaredParameterIds(value: unknown, output = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectDeclaredParameterIds(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const object = value as Json;
  if (object.kind === "parameter" && typeof object.id === "string") output.add(object.id);
  if (typeof object.parameterId === "string") output.add(object.parameterId);
  if (Array.isArray(object.parameterSources)) {
    for (const id of object.parameterSources) if (typeof id === "string" && id.trim()) output.add(id);
  }
  for (const child of Object.values(object)) collectDeclaredParameterIds(child, output);
  return output;
}

function resourceParameterIds(resource: Json): Set<string> {
  const output = collectDeclaredParameterIds(resource.inclusion_ast);
  collectDeclaredParameterIds(resource.resource_graph, output);
  for (const values of [
    resource.source_metadata?.formula?.inputParameterIds,
    resource.source_metadata?.ownerBoundary?.handoff_inputs,
  ]) {
    if (!Array.isArray(values)) continue;
    for (const id of values) if (typeof id === "string" && id.trim()) output.add(id);
  }
  return output;
}

function normativeSources(resources: readonly Json[]): string[] {
  const values = new Set<string>();
  for (const resource of resources) {
    const accepted = resource.source_metadata?.acceptedTrace?.normative_source;
    if (typeof accepted === "string" && accepted.trim()) values.add(accepted.trim());
    for (const trace of resource.source_metadata?.normativeTrace ?? []) {
      const id = String(trace.source_id ?? trace.sourceId ?? "").trim();
      if (id) values.add(id);
    }
  }
  return [...values].sort();
}

function parameterConsumers(
  parameter: Json,
  formulas: readonly Json[],
  resources: readonly Json[],
): { formulaIds: string[]; rows: Json[] } {
  const parameterId = String(parameter.parameter_id);
  const formulaIds = formulas.filter((formula) => (formula.input_parameter_ids ?? []).includes(parameterId))
    .map((formula) => String(formula.formula_id)).sort();
  const formulaIdSet = new Set(formulaIds);
  const rows = resources.filter((resource) => formulaIdSet.has(String(resource.formula_id))
    || resourceParameterIds(resource).has(parameterId));
  const byRowId = new Map(resources.map((resource) => [String(resource.row_id), resource]));
  for (const rowId of parameter.constraints_json?.consumers ?? []) {
    const resource = byRowId.get(String(rowId));
    if (resource && !rows.includes(resource)) rows.push(resource);
  }
  if (parameterId === "estimate_scope_mode" && rows.length === 0) rows.push(...resources);
  return { formulaIds, rows };
}

function parameterTruth(parameter: Json, definition: Json, formulas: readonly Json[], resources: readonly Json[]): Json {
  const parameterId = String(parameter.parameter_id);
  const consumers = parameterConsumers(parameter, formulas, resources);
  invariant(consumers.rows.length > 0,
    `R58_ASPHALT_13_PARAMETER_WITHOUT_CONSUMER:${definition.catalog_id}:${parameterId}`);
  const sourceIds = normativeSources(consumers.rows);
  const guideKind = parameter.value_type === "enum" || parameter.value_type === "boolean"
    ? "ENUM_DECISION_RULE"
    : /productivity|rate|factor|coefficient|density|thickness|distance/iu.test(parameterId)
      ? "PROJECT_DEFINED"
      : "MEASUREMENT_RULE";
  const title = String(parameter.title_ru).trim();
  invariant(title && !title.includes("�"), `R58_ASPHALT_13_PARAMETER_TITLE:${definition.catalog_id}:${parameterId}`);
  const guideShortRu = CONCRETE_NO_AUTHORITATIVE_TRACE
    ? `Укажите «${title}» по проекту, рабочим чертежам, обмеру, паспорту бетонной смеси или применимой норме. Параметр относится только к выбранной работе; уточнение создаёт новую точную revision.`
    : DRYWALL_TRACE_NOT_ADMITTED
    ? `Укажите «${title}» по проекту, обмеру, паспорту материала или применимой норме. Параметр относится только к выбранной работе; уточнение создаёт новую точную revision.`
    : `Укажите «${title}» по проекту, обмеру, лабораторному заданию или утверждённой технологической карте. Параметр показан только потому, что влияет на выбранную работу; уточнение создаёт новую точную revision.`;
  return {
    ...(parameter.truth_metadata ?? {}),
    semantic_parameter_key: parameterId,
    visibility_role: "USER_INPUT",
    value_source_role: "USER_INPUT_REQUIRED",
    guide: {
      guide_short_ru: guideShortRu,
      guide_kind: guideKind,
      source_role: guideKind === "MEASUREMENT_RULE" ? "PROJECT_OR_SITE_MEASUREMENT" : "PROJECT_OR_APPROVED_METHOD_STATEMENT",
      guide_version: CONCRETE_NO_AUTHORITATIVE_TRACE
        ? "P0_ONE_MONOLITH_R58_CONCRETE_INPUT_GUIDE_V1"
        : DRYWALL_TRACE_NOT_ADMITTED
          ? "P0_ONE_MONOLITH_R58_DRYWALL_INPUT_GUIDE_V1"
          : "P0_ONE_MONOLITH_R58_ASPHALT_INPUT_GUIDE_V2",
      source_snapshot_hash: sha256({
        catalogId: definition.catalog_id,
        parameterId,
        formulaIds: consumers.formulaIds,
        resourceRows: consumers.rows.map((row) => row.row_id),
        normativeSourceIds: sourceIds,
      }),
      applicability: `Только для работы ${definition.catalog_id}; неприменимые параметры удалены из successor-схемы.`,
      verified_at: "2026-08-17",
    },
    formula_consumers: consumers.formulaIds,
    resource_branch_consumers: [...new Set(consumers.rows.map((row) => String(row.row_id)))].sort(),
    normative_links: sourceIds,
    validation_rules: ["declared_type", "work_specific_applicability"],
    provenance: {
      sourceCatalogId: definition.catalog_id,
      sourceReleaseId: ACTIVE_RELEASE_ID,
      sourceDefinitionVersionId: definition.id,
      sourceParameterSchemaId: `accepted-${TARGET_DOMAIN}-trace:${definition.catalog_id}`,
      baselineOwner: "r58-user-input-no-hidden-default",
    },
    r58InputGuideRepair: {
      contract: CONTRACT,
      specSha256: SPEC_SHA256,
      predecessorTruthMetadataSha256: sha256(parameter.truth_metadata ?? {}),
      noDefaultIntroduced: parameter.default_value == null,
    },
  };
}

function computationalProjection(row: Json, formula: Json): Json {
  return {
    rowId: row.row_id,
    ordinal: row.ordinal,
    section: row.section,
    category: row.category,
    titleRu: row.title_ru,
    physicalRowType: row.row_type,
    unitId: row.unit_id,
    formulaId: row.formula_id,
    formulaExpression: formula.expression_source,
    formulaAstSha256: formula.ast_sha256,
    formulaInputParameterIds: formula.input_parameter_ids,
    inclusionAst: row.inclusion_ast,
    resourceGraph: row.resource_graph,
    normativeSources: normativeSources([row]),
    procurementEligible: row.procurement_eligible,
  };
}

function hiddenDuplicateFingerprint(row: Json, formula: Json): string {
  return sha256({
    titleRu: row.title_ru,
    physicalRowType: row.row_type,
    unitId: row.unit_id,
    formulaExpression: formula.expression_source,
    formulaAstSha256: formula.ast_sha256,
    inclusionAst: row.inclusion_ast,
    resourceGraph: row.resource_graph,
    normativeSources: normativeSources([row]),
  });
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const allowedArgs = new Set(["--apply", "--trace-not-admitted", "--drywall-trace-not-admitted",
    "--concrete-no-authoritative-trace"]);
  invariant(process.argv.slice(2).every((argument) => allowedArgs.has(argument))
    && new Set(process.argv.slice(2)).size === process.argv.slice(2).length
    && [TRACE_NOT_ADMITTED, DRYWALL_TRACE_NOT_ADMITTED, CONCRETE_NO_AUTHORITATIVE_TRACE]
      .filter(Boolean).length <= 1,
    "R58_ASPHALT_13_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_ASPHALT_13_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_ASPHALT_13_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_ASPHALT_13_REQUIRES_CLEAN_HEAD");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  const targets = readJsonl(MATRIX_PATH).filter((row) => row.partition === TARGET_PARTITION
    && row.domain === TARGET_DOMAIN);
  invariant(targets.length === EXPECTED_DEFINITIONS
    && new Set(targets.map((row) => row.catalog_id)).size === EXPECTED_DEFINITIONS,
  `R58_ASPHALT_13_TARGETS:${targets.length}/${EXPECTED_DEFINITIONS}`);
  const unusedByCatalog = new Map(targets.map((row) => [String(row.catalog_id), new Set<string>(
    (row.current_validation_blockers ?? [])
      .filter((blocker: string) => blocker.startsWith("parameter_without_resource_consumer:"))
      .map((blocker: string) => blocker.slice("parameter_without_resource_consumer:".length)),
  )]));
  const traceVisibleUnusedParameters = [...unusedByCatalog.values()].reduce((sum, values) => sum + values.size, 0);
  invariant(traceVisibleUnusedParameters === (TRACE_NOT_ADMITTED || DRYWALL_TRACE_NOT_ADMITTED
    || CONCRETE_NO_AUTHORITATIVE_TRACE ? 0 : 561),
    "R58_ASPHALT_13_UNUSED_PARAMETER_DENOMINATOR");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: apply
      ? `r58-asphalt-${EXPECTED_DEFINITIONS}-apply`
      : `r58-asphalt-${EXPECTED_DEFINITIONS}-dry-run`,
  });
  await client.connect();
  const records: Json[] = [];
  let candidateReleaseId = "";
  let changedSemanticRows = 0;
  let changedCostControlRows = 0;
  let removedParameters = 0;
  let idempotent = false;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='45s'");
    const candidate = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1 for update",
      [CANDIDATE_RELEASE_KEY],
    )).rows[0] as Json | undefined;
    invariant(candidate?.status === "draft" && candidate.sealed_at == null,
      "R58_ASPHALT_13_DRAFT_CANDIDATE_MISSING");
    candidateReleaseId = candidate.id;
    const targetCatalogIds = targets.map((row) => String(row.catalog_id));
    const manifests = (await client.query(`
      select manifest.*,version.release_id definition_release_id,version.source_metadata definition_source_metadata
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version version on version.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[]) order by manifest.catalog_id
    `, [candidateReleaseId, targetCatalogIds])).rows as Json[];
    invariant(manifests.length === EXPECTED_DEFINITIONS,
      `R58_ASPHALT_13_MANIFESTS:${manifests.length}/${EXPECTED_DEFINITIONS}`);
    const successors = manifests.filter((row) => row.definition_release_id === candidateReleaseId
      && row.definition_source_metadata?.[SUCCESSOR_METADATA_KEY]?.contract === CONTRACT);
    if (successors.length > 0) {
      invariant(successors.length === EXPECTED_DEFINITIONS,
        `R58_ASPHALT_13_PARTIAL_IDEMPOTENCY:${successors.length}/${EXPECTED_DEFINITIONS}`);
      const ids = successors.map((row) => row.definition_version_id);
      const invalid = (await client.query(`
        select
          (select count(*)::int from (
            select definition_version_id,semantic_owner,count(*) from public.estimate_resource_spec
            where definition_version_id=any($1::uuid[]) group by definition_version_id,semantic_owner
            having count(*)>1 or nullif(btrim(coalesce(semantic_owner,'')),'') is null
          ) q) duplicate_owners,
          (select count(*)::int from (
            select definition_version_id,cost_owner_id,count(*) from public.estimate_resource_spec
            where definition_version_id=any($1::uuid[]) and nullif(btrim(coalesce(cost_owner_id,'')),'') is not null
            group by definition_version_id,cost_owner_id having count(*)>1
          ) q) duplicate_cost,
          (select count(*)::int from public.estimate_parameter_definition
            where definition_version_id=any($1::uuid[]) and not public.estimate_parameter_truth_metadata_valid_r3(value_type,truth_metadata)
          ) invalid_parameter_truth
      `, [ids])).rows[0] as Json;
      invariant(invalid.duplicate_owners === 0 && invalid.duplicate_cost === 0
        && invalid.invalid_parameter_truth === 0,
      `R58_ASPHALT_13_IDEMPOTENCY_INVALID:${stable(invalid)}`);
      idempotent = true;
      await client.query("rollback");
    } else {
      invariant(manifests.every((row) => row.definition_release_id === ACTIVE_RELEASE_ID
        && row.publication_state === "ACCEPTED_INHERITED" && !row.baseline_ready),
      "R58_ASPHALT_13_PREDECESSOR_MANIFEST_DRIFT");
      const manifestByCatalog = new Map(manifests.map((row) => [String(row.catalog_id), row]));
      for (const target of targets.sort((a, b) => String(a.catalog_id).localeCompare(String(b.catalog_id)))) {
        const manifest = manifestByCatalog.get(String(target.catalog_id));
        invariant(manifest?.definition_version_id === target.definition_version_id,
          `R58_ASPHALT_13_PREDECESSOR_BINDING:${target.catalog_id}`);
        const definition = (await client.query(
          "select * from public.estimate_definition_version where id=$1", [target.definition_version_id],
        )).rows[0] as Json;
        const parameters = (await client.query(
          "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
          [definition.id],
        )).rows as Json[];
        const formulas = (await client.query(
          "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
          [definition.id],
        )).rows as Json[];
        const resources = (await client.query(
          "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
          [definition.id],
        )).rows as Json[];
        const normativeBindings = (await client.query(
          "select * from public.estimate_work_normative_binding where definition_version_id=$1 order by resource_spec_id,locator_id",
          [definition.id],
        )).rows as Json[];
        const priceBindings = (await client.query(`
          select binding.* from public.estimate_resource_price_route_binding binding
          join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
          where resource.definition_version_id=$1 order by binding.resource_spec_id,binding.priority,binding.route_id
        `, [definition.id])).rows as Json[];
        invariant(parameters.length > 0 && formulas.length === resources.length && resources.length > 0,
          `R58_ASPHALT_13_CHILD_COUNTS:${definition.catalog_id}`);
        const traceVisibleUnused = unusedByCatalog.get(String(definition.catalog_id)) ?? new Set<string>();
        invariant([...traceVisibleUnused].every((id) => parameters.some((parameter) => parameter.parameter_id === id)),
          `R58_ASPHALT_13_UNUSED_PARAMETER_MISSING:${definition.catalog_id}`);
        const unused = new Set(parameters.filter((parameter) => parameterConsumers(parameter, formulas, resources).rows.length === 0)
          .map((parameter) => String(parameter.parameter_id)));
        invariant([...traceVisibleUnused].every((id) => unused.has(id)),
          `R58_ASPHALT_13_TRACE_UNUSED_NOT_GRAPH_UNUSED:${definition.catalog_id}`);
        const retainedParameters = parameters.filter((parameter) => !unused.has(String(parameter.parameter_id)));
        invariant(retainedParameters.length > 0
          && retainedParameters.every((parameter) => parameterConsumers(parameter, formulas, resources).rows.length > 0),
        `R58_ASPHALT_13_RETAINED_PARAMETER_CONSUMER:${definition.catalog_id}`);
        const retainedIds = new Set(retainedParameters.map((parameter) => String(parameter.parameter_id)));
        for (const formula of formulas) {
          invariant((formula.input_parameter_ids ?? []).every((id: string) => retainedIds.has(String(id))),
            `R58_ASPHALT_13_REMOVED_FORMULA_INPUT:${definition.catalog_id}:${formula.formula_id}`);
        }
        const formulaById = new Map(formulas.map((row) => [String(row.formula_id), row]));
        const ownerCounts = new Map<string, number>();
        const costOwnerCounts = new Map<string, number>();
        for (const row of resources) {
          const owner = String(row.semantic_owner ?? "").trim();
          if (!DRYWALL_TRACE_NOT_ADMITTED && !CONCRETE_NO_AUTHORITATIVE_TRACE) {
            invariant(owner, `R58_ASPHALT_13_BLANK_OWNER:${definition.catalog_id}:${row.row_id}`);
          }
          ownerCounts.set(owner, (ownerCounts.get(owner) ?? 0) + 1);
          const costOwner = String(row.cost_owner_id ?? "").trim();
          if (costOwner) costOwnerCounts.set(costOwner, (costOwnerCounts.get(costOwner) ?? 0) + 1);
        }
        const duplicateCostOwners = new Set([...costOwnerCounts]
          .filter(([, count]) => count > 1).map(([owner]) => owner));
        const expectedCostControlRows = resources.filter((row) =>
          duplicateCostOwners.has(String(row.cost_owner_id ?? "").trim())
          && COST_CONTROL_ROW_SUFFIX.test(String(row.row_id)));
        invariant([...duplicateCostOwners].every((owner) => {
          const group = resources.filter((row) => String(row.cost_owner_id ?? "").trim() === owner);
          return group.filter((row) => COST_CONTROL_ROW_SUFFIX.test(String(row.row_id))).length === group.length - 1;
        }), `R58_ASPHALT_13_COST_BOUNDARY_UNCLASSIFIED:${definition.catalog_id}`);
        const hiddenBefore = resources.map((row) => hiddenDuplicateFingerprint(
          row, formulaById.get(String(row.formula_id))!,
        ));
        invariant(duplicateValues(hiddenBefore).length === 0,
          `R58_ASPHALT_13_HIDDEN_DUPLICATE:${definition.catalog_id}`);
        const successorDefinitionId = deterministicUuid(`${CONTRACT}:${candidateReleaseId}:${definition.id}`);
        const resourceIdMap = new Map<string, string>();
        const repairedRows: Json[] = resources.map((row): Json => {
          const oldOwner = String(row.semantic_owner ?? "").trim();
          const duplicateOwner = !oldOwner || (ownerCounts.get(oldOwner) ?? 0) > 1;
          const role = String(row.row_id).split(":").at(-1);
          const semanticOwner = duplicateOwner
            ? DRYWALL_TRACE_NOT_ADMITTED
              ? `r58:drywall:${definition.catalog_id}:row:${row.row_id}`
              : `${oldOwner}:role:${role}`
            : oldOwner;
          const costControl = duplicateCostOwners.has(String(row.cost_owner_id ?? "").trim())
            && COST_CONTROL_ROW_SUFFIX.test(String(row.row_id));
          const successorResourceId = deterministicUuid(`${CONTRACT}:${successorDefinitionId}:${row.row_id}`);
          resourceIdMap.set(String(row.id), successorResourceId);
          if (!duplicateOwner && !costControl) {
            return { ...row, id: successorResourceId, definition_version_id: successorDefinitionId };
          }
          const metadata = structuredClone(row.source_metadata ?? {});
          const defect = {
            contract: CONTRACT,
            rowId: row.row_id,
            predecessorResourceSpecId: row.id,
            oldSemanticOwner: oldOwner,
            newSemanticOwner: semanticOwner,
            oldCostOwnerId: row.cost_owner_id,
            newCostOwnerId: costControl ? null : row.cost_owner_id,
            repairReason: costControl
              ? "DERIVED_TRANSPORT_CONTROL_NOT_PAYABLE"
              : "SHARED_SEMANTIC_OWNER_REPLACED_WITH_EXACT_ROW_ROLE_OWNER",
          };
          metadata[ROW_REPAIR_METADATA_KEY] = { ...defect, specSha256: SPEC_SHA256 };
          if (costControl) {
            metadata.priceStatus = "NON_PAYABLE_DERIVED_CONTROL";
            metadata.priceRoute = "NONE";
          }
          return {
            ...row,
            id: successorResourceId,
            definition_version_id: successorDefinitionId,
            semantic_owner: semanticOwner,
            cost_owner_id: costControl ? null : row.cost_owner_id,
            source_metadata: metadata,
            row_sha256: sha256({
              contract: CONTRACT, predecessorRowSha256: row.row_sha256,
              rowId: row.row_id, semanticOwner, costOwnerId: costControl ? null : row.cost_owner_id,
            }),
            defect,
          };
        });
        const changed = repairedRows.filter((row) => row.defect);
        const duplicateSemanticOwnersAfter = duplicateValues(
          repairedRows.map((row) => String(row.semantic_owner)),
        );
        invariant(duplicateSemanticOwnersAfter.length === 0,
          `R58_ASPHALT_13_OWNER_REPAIR:${definition.catalog_id}:${duplicateSemanticOwnersAfter.slice(0, 3).join("|")}`);
        const nonblankCostOwners = repairedRows.map((row) => String(row.cost_owner_id ?? "").trim()).filter(Boolean);
        invariant(duplicateValues(nonblankCostOwners).length === 0,
          `R58_ASPHALT_13_COST_REPAIR:${definition.catalog_id}`);
        invariant(expectedCostControlRows.every((row) =>
          repairedRows.find((candidate) => candidate.row_id === row.row_id)?.cost_owner_id == null),
        `R58_ASPHALT_13_COST_CONTROL_BOUNDARY:${definition.catalog_id}`);
        const successorParameters: Json[] = retainedParameters.map((parameter) => ({
          ...parameter,
          truth_metadata: parameterTruth(parameter, definition, formulas, resources),
          approved_template_baseline_id: null,
        }));
        invariant(successorParameters.every((parameter) => parameter.default_value == null),
          `R58_ASPHALT_13_HIDDEN_DEFAULT:${definition.catalog_id}`);
        const beforeComputationalSha256 = sha256(resources.map((row) => computationalProjection(
          row, formulaById.get(String(row.formula_id))!,
        )));
        const afterComputationalSha256 = sha256(repairedRows.map((row) => computationalProjection(
          row, formulaById.get(String(row.formula_id))!,
        )));
        invariant(beforeComputationalSha256 === afterComputationalSha256,
          `R58_ASPHALT_13_COMPUTATIONAL_DRIFT:${definition.catalog_id}`);
        const successorVersion = Number((await client.query(
          "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
          [definition.catalog_id],
        )).rows[0].value);
        const definitionSha256 = sha256({
          contract: CONTRACT,
          predecessorDefinitionSha256: definition.definition_sha256,
          removedParameterIds: [...unused].sort(),
          parameters: successorParameters.map((row) => [row.parameter_id, row.default_value, row.constraints_json, row.truth_metadata]),
          formulas: formulas.map((row) => [row.formula_id, row.ast_sha256]),
          resources: repairedRows.map((row) => [row.row_id, row.row_sha256, row.semantic_owner, row.cost_owner_id]),
        });
        await client.query(`insert into public.estimate_definition_version(
          id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
        ) values($1,$2,$3,$4,$5,$6,$7,$8)`, [
          successorDefinitionId, candidateReleaseId, definition.catalog_id, successorVersion,
          definition.passport, definition.applicability, definitionSha256, {
            ...(definition.source_metadata ?? {}),
            [SUCCESSOR_METADATA_KEY]: {
              contract: CONTRACT, specSha256: SPEC_SHA256,
              predecessorDefinitionVersionId: definition.id,
              predecessorDefinitionSha256: definition.definition_sha256,
              removedUnusedParameterIds: [...unused].sort(),
              repairedSemanticOwnerRows: repairedRows.filter((row) => row.defect
                && row.defect.oldSemanticOwner !== row.defect.newSemanticOwner).length,
              costControlRowsMadeNonPayable: repairedRows.filter((row) => row.defect?.repairReason
                === "DERIVED_TRANSPORT_CONTROL_NOT_PAYABLE").length,
              beforeComputationalSha256, afterComputationalSha256,
            },
          },
        ]);
        await insertBatches(client, "estimate_parameter_definition", [
          "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru",
          "required", "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
        ], successorParameters.map((row) => [
          successorDefinitionId, row.parameter_id, row.ordinal, row.value_type, row.unit_id, row.title_ru,
          row.required, row.default_value, row.constraints_json, row.truth_metadata, null,
        ]));
        await insertBatches(client, "estimate_formula_graph", [
          "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
          "input_parameter_ids", "ast_sha256",
        ], formulas.map((row) => [
          successorDefinitionId, row.formula_id, row.output_unit_id, row.expression_source, row.ast,
          row.input_parameter_ids, row.ast_sha256,
        ]));
        await insertBatches(client, "estimate_resource_spec", [
          "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
          "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
          "procurement_eligible", "source_metadata", "row_sha256", "created_at",
        ], repairedRows.map((row) => [
          row.id, successorDefinitionId, row.row_id, row.ordinal, row.section, row.category, row.title_ru, row.row_type,
          row.unit_id, row.formula_id, row.inclusion_ast, row.resource_graph, row.semantic_owner, row.cost_owner_id,
          row.procurement_eligible, row.source_metadata, row.row_sha256, row.created_at,
        ]));
        await insertBatches(client, "estimate_work_normative_binding", [
          "definition_version_id", "resource_spec_id", "locator_id", "applicability",
        ], normativeBindings.map((row) => [
          successorDefinitionId, resourceIdMap.get(String(row.resource_spec_id)), row.locator_id, row.applicability,
        ]));
        const omittedPriceResourceIds = new Set(expectedCostControlRows.map((row) => String(row.id)));
        const successorPriceBindings = priceBindings.filter((row) => !omittedPriceResourceIds.has(String(row.resource_spec_id)));
        await insertBatches(client, "estimate_resource_price_route_binding", [
          "resource_spec_id", "route_id", "price_key", "priority",
        ], successorPriceBindings.map((row) => [
          resourceIdMap.get(String(row.resource_spec_id)), row.route_id, row.price_key, row.priority,
        ]));
        if (changed.length > 0) {
          const semanticDefects = changed.filter((row) => row.defect.oldSemanticOwner !== row.defect.newSemanticOwner);
          const beforeSha256 = sha256(resources.map((row) => [row.row_id, row.semantic_owner, row.row_sha256]));
          const afterSha256 = sha256(repairedRows.map((row) => [row.row_id, row.semantic_owner, row.row_sha256]));
          const evidenceSha256 = sha256({ definition: definition.catalog_id, defects: changed.map((row) => row.defect),
            beforeSha256, afterSha256 });
          await client.query(`insert into public.estimate_definition_defect_record(
            id,defect_key,release_id,predecessor_release_id,catalog_id,predecessor_definition_version_id,
            successor_definition_version_id,defect_class,root_cause_ru,affected_resources,before_sha256,
            after_sha256,evidence_sha256,contract_version
          ) values($1,$2,$3,$4,$5,$6,$7,'R54_RESOURCE_SEMANTIC_OWNER_IDENTITY',$8,$9::jsonb,$10,$11,$12,
            'P0_ONE_MONOLITH_R54_DEFECT_LEDGER_V1')`, [
            deterministicUuid(`${CONTRACT}:defect:${successorDefinitionId}`),
            `r58-${TARGET_DOMAIN}-semantic-owner:${successorDefinitionId}`,
            candidateReleaseId, ACTIVE_RELEASE_ID, definition.catalog_id, definition.id, successorDefinitionId,
            "Разные технологические или контрольные строки ошибочно делили semantic_owner; identity разделена по неизменному row_id без изменения формул и количества.",
            JSON.stringify(changed.map((row) => row.defect)), beforeSha256, afterSha256, evidenceSha256,
          ]);
        }
        await client.query(`update public.estimate_cumulative_manifest_entry set
          definition_version_id=$3,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
          approved_template_baseline_id=null,baseline_ready=false,scenario_ready=false,
          definition_hash=$4,entry_sha256=$5 where release_id=$1 and catalog_id=$2`, [
          candidateReleaseId, definition.catalog_id, successorDefinitionId, definitionSha256,
          sha256({ contract: CONTRACT, candidateReleaseId, catalogId: definition.catalog_id,
            definitionVersionId: successorDefinitionId, definitionSha256 }),
        ]);
        const semanticChanged = repairedRows.filter((row) => row.defect
          && row.defect.oldSemanticOwner !== row.defect.newSemanticOwner).length;
        records.push({
          catalogId: definition.catalog_id,
          predecessorDefinitionVersionId: definition.id,
          successorDefinitionVersionId: successorDefinitionId,
          parametersBefore: parameters.length,
          parametersAfter: successorParameters.length,
          removedUnusedParameterIds: [...unused].sort(),
          formulas: formulas.length,
          resources: resources.length,
          repairedSemanticOwnerRows: semanticChanged,
          localDuplicateCostOwnersAfter: 0,
          costControlRowsMadeNonPayable: expectedCostControlRows.map((row) => row.row_id).sort(),
          priceBindingsBefore: priceBindings.length,
          priceBindingsAfter: successorPriceBindings.length,
          normativeBindings: normativeBindings.length,
          beforeComputationalSha256,
          afterComputationalSha256,
          computationalParity: beforeComputationalSha256 === afterComputationalSha256,
        });
        changedSemanticRows += semanticChanged;
        changedCostControlRows += expectedCostControlRows.length;
        removedParameters += unused.size;
      }
      const retainedApplicableParameters = records.reduce((sum, row) => sum + row.parametersAfter, 0);
      invariant(records.length === EXPECTED_DEFINITIONS
        && removedParameters === EXPECTED_UNUSED_PARAMETERS
        && removedParameters >= traceVisibleUnusedParameters
        && changedSemanticRows === EXPECTED_SEMANTIC_REPAIRS
        && changedCostControlRows === EXPECTED_COST_CONTROL_REPAIRS
        && removedParameters + retainedApplicableParameters === EXPECTED_PARAMETERS,
      `R58_ASPHALT_13_DENOMINATOR:${records.length}/${EXPECTED_DEFINITIONS}:${removedParameters}/${EXPECTED_UNUSED_PARAMETERS}:TRACE_MIN_${traceVisibleUnusedParameters}:${changedSemanticRows}/${EXPECTED_SEMANTIC_REPAIRS}:${changedCostControlRows}/${EXPECTED_COST_CONTROL_REPAIRS}`);
      invariant(records.reduce((sum, row) => sum + row.priceBindingsBefore - row.priceBindingsAfter, 0)
        === EXPECTED_COST_CONTROL_REPAIRS,
        "R58_ASPHALT_13_NONPAYABLE_PRICE_BINDING_DENOMINATOR");
      const counts = (await client.query(`
        select
          (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_rows,
          (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and publication_state='CANONICAL_SUCCESSOR') successor_entries,
          (select count(*)::int from public.estimate_definition_version where release_id=$1) direct_definitions,
          (select count(*)::int from public.estimate_definition_release where status='active') active_releases
      `, [candidateReleaseId])).rows[0] as Json;
      invariant(counts.manifest_rows === 4_272 && counts.successor_entries === EXPECTED_SUCCESSOR_ENTRIES
        && counts.direct_definitions === EXPECTED_SUCCESSOR_ENTRIES && counts.active_releases === 1,
      `R58_ASPHALT_13_CANDIDATE_COUNTS:${stable(counts)}`);
      await client.query(`update public.estimate_definition_release set
        source_commit=$2,source_tree=$3,source_package_sha256=$4,
        metadata=metadata||$5::jsonb where id=$1 and status='draft' and sealed_at is null`, [
        candidateReleaseId, head, tree,
        sha256({ contract: CONTRACT, head, tree, removedParameters, changedSemanticRows,
          records: records.map((row) => row.afterComputationalSha256) }),
        JSON.stringify({ [CONCRETE_NO_AUTHORITATIVE_TRACE
          ? "r58ConcreteNoAuthoritativeTraceRepair1218"
          : DRYWALL_TRACE_NOT_ADMITTED ? "r58DrywallTraceNotAdmittedRepair500"
          : TRACE_NOT_ADMITTED ? "r58AsphaltTraceNotAdmittedRepair38" : "r58AsphaltCompileRedRepair13"]: {
          contract: CONTRACT, specSha256: SPEC_SHA256, definitions: EXPECTED_DEFINITIONS,
          traceVisibleUnusedParameters, removedUnusedParameters: removedParameters, retainedApplicableParameters,
          repairedSemanticOwnerRows: changedSemanticRows,
          costControlRowsMadeNonPayable: changedCostControlRows,
          activeReleaseSwitched: false, searchCutover: false, runtime8081Switched: false,
        } }),
      ]);
      await client.query(apply ? "commit" : "rollback");
    }
  } catch (error) {
    try { await client.query("rollback"); } catch { /* connection may already be aborted */ }
    throw error;
  } finally {
    await client.end();
  }

  const ledgerText = records.map((row) => stable(row)).join("\n") + (records.length > 0 ? "\n" : "");
  const evidenceStem = CONCRETE_NO_AUTHORITATIVE_TRACE
    ? "R58_CONCRETE_NO_AUTHORITATIVE_TRACE_REPAIR_1218"
    : DRYWALL_TRACE_NOT_ADMITTED ? "R58_DRYWALL_TRACE_NOT_ADMITTED_REPAIR_500"
    : TRACE_NOT_ADMITTED
      ? "R58_ASPHALT_TRACE_NOT_ADMITTED_REPAIR_38"
      : "R58_ASPHALT_COMPILE_RED_REPAIR_13";
  const ledgerPath = resolve(OUTPUT_ROOT, `${evidenceStem}_${apply ? "APPLY" : "DRY_RUN"}.jsonl`);
  const summary = {
    schemaVersion: CONTRACT,
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    mode: idempotent ? "IDEMPOTENCY_NO_WRITE" : apply ? "APPLY" : "DRY_RUN_ROLLBACK",
    source: { branch, head, tree },
    candidateReleaseId,
    definitions: EXPECTED_DEFINITIONS,
    changedSemanticOwnerRows: idempotent ? 0 : changedSemanticRows,
    costControlRowsMadeNonPayable: idempotent ? 0 : changedCostControlRows,
    removedUnusedParameters: idempotent ? 0 : removedParameters,
    traceVisibleUnusedParameters,
    retainedApplicableParameters: idempotent ? null : records.reduce((sum, row) => sum + row.parametersAfter, 0),
    localDuplicateCostOwnersAfter: 0,
    ledgerPath: idempotent ? null : ledgerPath,
    ledgerSha256: idempotent ? null : sha256(ledgerText),
    activeReleaseSwitched: false,
    searchCutover: false,
    runtime8081Switched: false,
    batch009Activated: false,
    status: `GREEN_R58_${CONCRETE_NO_AUTHORITATIVE_TRACE ? "CONCRETE_NO_AUTHORITATIVE_TRACE"
      : DRYWALL_TRACE_NOT_ADMITTED ? "DRYWALL_TRACE_NOT_ADMITTED"
        : `ASPHALT_${TRACE_NOT_ADMITTED ? "TRACE_NOT_ADMITTED" : "COMPILE_RED"}`}_REPAIR_${EXPECTED_DEFINITIONS}_${
      idempotent ? "IDEMPOTENT_0" : apply ? "APPLIED" : "DRY_RUN_ROLLED_BACK"}`,
  };
  const summaryPath = resolve(OUTPUT_ROOT,
    `${evidenceStem}_${idempotent ? "IDEMPOTENCY" : apply ? "APPLY" : "DRY_RUN"}.json`);
  mkdirSync(dirname(summaryPath), { recursive: true });
  if (!idempotent) writeFileSync(ledgerPath, ledgerText, "utf8");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    mode: summary.mode,
    definitions: summary.definitions,
    changedSemanticOwnerRows: summary.changedSemanticOwnerRows,
    removedUnusedParameters: summary.removedUnusedParameters,
    retainedApplicableParameters: summary.retainedApplicableParameters,
    candidateReleaseId,
    evidencePath: summaryPath,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
