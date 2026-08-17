import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { evaluateInclusionGraph } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";
import { validateCanonicalEstimateParameters } from "../../../src/lib/estimate/backendPlatform/parameterConstraints";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (10).md",
);
const SPEC_SHA256 = "4cf42813e8a94816867ec62e63909fe0624a12d6955f598599deb0a92338e318";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CANDIDATE_RELEASE_KEY = "p0-r58-cumulative-candidate-4cf42813";
const CONTRACT = "p0-one-monolith-r58-repaired-compile-red-candidates-63.v1";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const R57_ROOT = resolve(".release-runtime/p0-one-monolith-r57/evidence/05-baseline");
const MATRIX_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const TRACE_PATH = resolve(R57_ROOT, "BATCH001_008_ACCEPTED_RUNTIME_TRACE_INPUT_VALUES.jsonl");
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/05-baseline");

const ACCEPTED_ENUM_ALIASES: Record<string, Record<string, string>> = {
  waterproofing_type: { ROLLED: "Рулонная гидроизоляция" },
  waterproofing_condition: { ACCEPTED: "Принято и готово" },
  wearing_mix_type: { DENSE_FINE_GRAINED: "Плотная мелкозернистая смесь" },
  binder_mix_type: { DENSE_COARSE_GRAINED: "Плотная крупнозернистая смесь" },
  repair_method: { SAW_CUT_AND_REPLACE: "Резка карты, удаление и восстановление" },
  material_destination: { RECYCLING: "Переработка" },
  work_scope: { PURE_DEMOLITION: "Только демонтаж" },
  traffic_class: { HEAVY: "Тяжёлая нагрузка" },
  underlying_layer_condition: { ACCEPTED: "Принято и готово" },
  floor_mechanical_impact_class: { LOW: "Низкая" },
  floor_liquid_exposure_class: { NONE: "Нет" },
  approved_floor_mix_type: { CAST_ASPHALT: "Литой асфальт" },
  exterior_surface_kind: { PARKING: "Парковка" },
};

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

function normalizeTraceValues(parameters: readonly Json[], raw: Json): { values: Json; normalizations: Json[] } {
  const schemaIds = new Set(parameters.map((row) => String(row.parameter_id)));
  const values = Object.fromEntries(Object.entries(raw).filter(([id]) => schemaIds.has(id)
    && !id.startsWith("unit_price_") && !["price_basis_reference", "price_basis_date"].includes(id)));
  const normalizations: Json[] = [];
  for (const parameter of parameters) {
    const parameterId = String(parameter.parameter_id);
    if (parameter.value_type !== "enum" || !(parameterId in values)) continue;
    const allowed = Array.isArray(parameter.constraints_json?.values)
      ? parameter.constraints_json.values.map(String) : [];
    const rawValue = String(values[parameterId]);
    if (allowed.includes(rawValue)) continue;
    const normalized = ACCEPTED_ENUM_ALIASES[parameterId]?.[rawValue];
    invariant(normalized && allowed.includes(normalized),
      `R58_REPAIRED_63_ENUM_ALIAS:${parameterId}:${rawValue}`);
    values[parameterId] = normalized;
    normalizations.push({ parameterId, acceptedTraceValue: rawValue, canonicalValue: normalized });
  }
  return { values, normalizations };
}

function isChildOwner(row: Json): boolean {
  return row.source_metadata?.priceStatus === "CHILD_OWNER"
    || row.source_metadata?.priceRoute === "CHILD_OWNER_ESTIMATE";
}

function duplicateValues(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function buildAsset(input: {
  target: Json;
  definition: Json;
  parameters: Json[];
  formulas: Json[];
  resources: Json[];
  trace: Json;
  parameterSchemaSha256: string;
  candidateReleaseId: string;
  head: string;
}): { asset: Json; ledger: Json } {
  const normalized = normalizeTraceValues(input.parameters, input.trace.input_values ?? {});
  const resolved = validateCanonicalEstimateParameters(input.parameters, normalized.values, {
    baselineContext: { catalogId: String(input.definition.catalog_id) },
  });
  const numeric = Object.fromEntries(Object.entries(resolved)
    .filter(([, value]) => typeof value === "number" || typeof value === "string")) as Record<string, string | number>;
  const formulaById = new Map(input.formulas.map((row) => [String(row.formula_id), row]));
  const included = input.resources.filter((row) => evaluateInclusionGraph(row.inclusion_ast as Json, resolved));
  invariant(included.length > 0, `R58_REPAIRED_63_EMPTY:${input.definition.catalog_id}`);
  const owners = included.map((row) => String(row.semantic_owner ?? "").trim());
  invariant(owners.every(Boolean) && duplicateValues(owners).length === 0,
    `R58_REPAIRED_63_SEMANTIC_OWNER:${input.definition.catalog_id}`);
  const localCostOwners = included.filter((row) => !isChildOwner(row))
    .map((row) => String(row.cost_owner_id ?? "").trim()).filter(Boolean);
  invariant(duplicateValues(localCostOwners).length === 0,
    `R58_REPAIRED_63_LOCAL_COST_OWNER:${input.definition.catalog_id}`);
  const nullCostRows = included.filter((row) => !String(row.cost_owner_id ?? "").trim());
  invariant(nullCostRows.every((row) => row.source_metadata?.priceStatus === "NON_PAYABLE_DERIVED_CONTROL"),
    `R58_REPAIRED_63_UNEXPLAINED_NULL_COST_OWNER:${input.definition.catalog_id}`);
  const childRows = included.filter(isChildOwner);
  invariant(childRows.every((row) => !row.procurement_eligible),
    `R58_REPAIRED_63_CHILD_OWNER_PAYABLE:${input.definition.catalog_id}`);
  const compiledRows = included.map((row) => {
    const formula = formulaById.get(String(row.formula_id));
    invariant(formula, `R58_REPAIRED_63_FORMULA:${input.definition.catalog_id}:${row.row_id}`);
    const quantity = Number(evaluateFormulaGraph(formula.ast as FormulaAst, numeric));
    invariant(Number.isFinite(quantity) && quantity >= 0,
      `R58_REPAIRED_63_QUANTITY:${input.definition.catalog_id}:${row.row_id}:${quantity}`);
    return {
      rowId: row.row_id,
      formulaId: row.formula_id,
      quantity,
      unitId: row.unit_id,
      semanticOwner: row.semantic_owner,
      costOwnerId: row.cost_owner_id,
      costBoundary: isChildOwner(row) ? "CHILD_OWNER_NON_PAYABLE"
        : row.source_metadata?.priceStatus === "NON_PAYABLE_DERIVED_CONTROL" ? "DERIVED_CONTROL_NON_PAYABLE"
          : "LOCAL_UNIQUE_OWNER",
    };
  });
  const inputIds = Object.keys(normalized.values).sort();
  const parameterById = new Map(input.parameters.map((row) => [String(row.parameter_id), row]));
  const classifications: Json = {};
  const uom: Json = {};
  const formulaConsumers: Json = {};
  const resourceConsumers: Json = {};
  const normativeSources: Json = {};
  const guides: Json = {};
  for (const parameterId of inputIds) {
    const parameter = parameterById.get(parameterId);
    invariant(parameter, `R58_REPAIRED_63_PARAMETER:${input.definition.catalog_id}:${parameterId}`);
    const formulaIds = parameter.truth_metadata?.formula_consumers;
    const rowIds = parameter.truth_metadata?.resource_branch_consumers;
    const sources = parameter.truth_metadata?.normative_links;
    const text = String(parameter.truth_metadata?.guide?.guide_short_ru ?? "").trim();
    invariant(Array.isArray(formulaIds) && Array.isArray(rowIds) && rowIds.length > 0
      && Array.isArray(sources) && text.length > 0 && !text.includes("�"),
    `R58_REPAIRED_63_PARAMETER_PROVENANCE:${input.definition.catalog_id}:${parameterId}`);
    classifications[parameterId] = "ASSUMPTION";
    uom[parameterId] = parameter.unit_id == null ? null : String(parameter.unit_id);
    formulaConsumers[parameterId] = formulaIds;
    resourceConsumers[parameterId] = rowIds;
    normativeSources[parameterId] = sources;
    guides[parameterId] = text;
  }
  const compileFingerprint = sha256(compiledRows);
  const acceptanceEvidenceSha256 = sha256({
    contract: CONTRACT,
    catalogId: input.definition.catalog_id,
    definitionVersionId: input.definition.id,
    sourceDefinitionVersionId: input.target.definition_version_id,
    parameterSchemaSha256: input.parameterSchemaSha256,
    inputValuesSha256: sha256(normalized.values),
    compileFingerprint,
    rowCount: compiledRows.length,
    head: input.head,
  });
  const id = deterministicUuid(`${CONTRACT}:${input.candidateReleaseId}:${input.definition.id}:${acceptanceEvidenceSha256}`);
  return {
    asset: {
      id,
      baseline_key: `r58-repaired-compile-red:${input.definition.catalog_id}:${id}`,
      catalog_id: input.definition.catalog_id,
      definition_version_id: input.definition.id,
      source_definition_version_id: input.target.definition_version_id,
      parameter_schema_sha256: input.parameterSchemaSha256,
      input_values: normalized.values,
      input_classification: classifications,
      uom_by_parameter: uom,
      formula_consumer_ids: formulaConsumers,
      resource_consumer_row_ids: resourceConsumers,
      normative_source_ids: normativeSources,
      guide_provenance_ru: guides,
      proposal_source_refs: [{
        kind: input.trace.provenance_kind,
        path: input.trace.proposal_source_ref,
        sha256: input.trace.proposal_source_sha256,
        inputValuesSha256: input.trace.input_values_sha256,
        enumAliasNormalizations: normalized.normalizations,
      }],
      validation_scenario_refs: [{
        kind: "R58_CURRENT_HEAD_REPAIRED_CANONICAL_VALIDATION",
        head: input.head,
        compileFingerprint,
        rowCount: compiledRows.length,
        formulaGraphCount: input.formulas.length,
        resourceGraphCount: input.resources.length,
        localDuplicateCostOwners: 0,
        childOwnerRowsNonPayable: childRows.length,
        derivedControlRowsNonPayable: nullCostRows.length,
      }],
      acceptance_evidence_sha256: acceptanceEvidenceSha256,
      accepted_release_id: input.candidateReleaseId,
      supersedes_baseline_id: null,
      contract_version: "APPROVED_TEMPLATE_BASELINE_R54_V1",
    },
    ledger: {
      catalogId: input.definition.catalog_id,
      domain: input.target.domain,
      definitionVersionId: input.definition.id,
      sourceDefinitionVersionId: input.target.definition_version_id,
      baselineId: id,
      parameters: input.parameters.length,
      inputValues: inputIds.length,
      formulas: input.formulas.length,
      resources: input.resources.length,
      compiledRows: compiledRows.length,
      compileFingerprint,
      acceptanceEvidenceSha256,
      duplicateSemanticOwners: 0,
      localDuplicateCostOwners: 0,
      childOwnerRowsNonPayable: childRows.length,
      derivedControlRowsNonPayable: nullCostRows.length,
      status: "READY_FOR_FRESH_BACKEND_COMPILE_RECALCULATE",
      terminalGreenClaimed: false,
    },
  };
}

async function insertBaseline(client: Client, asset: Json): Promise<void> {
  await client.query(`insert into public.estimate_approved_template_baseline(
    id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
    parameter_schema_sha256,input_values,input_classification,uom_by_parameter,formula_consumer_ids,
    resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,proposal_source_refs,
    validation_scenario_refs,acceptance_evidence_sha256,accepted_release_id,accepted_at,
    supersedes_baseline_id,contract_version
  ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
    $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,now(),$18,$19)`, [
    asset.id, asset.baseline_key, asset.catalog_id, asset.definition_version_id,
    asset.source_definition_version_id, asset.parameter_schema_sha256,
    JSON.stringify(asset.input_values), JSON.stringify(asset.input_classification),
    JSON.stringify(asset.uom_by_parameter), JSON.stringify(asset.formula_consumer_ids),
    JSON.stringify(asset.resource_consumer_row_ids), JSON.stringify(asset.normative_source_ids),
    JSON.stringify(asset.guide_provenance_ru), JSON.stringify(asset.proposal_source_refs),
    JSON.stringify(asset.validation_scenario_refs), asset.acceptance_evidence_sha256,
    asset.accepted_release_id, asset.supersedes_baseline_id, asset.contract_version,
  ]);
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  invariant(process.argv.length === 2 || (process.argv.length === 3 && apply),
    "R58_REPAIRED_63_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_REPAIRED_63_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_REPAIRED_63_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_REPAIRED_63_REQUIRES_CLEAN_HEAD");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  const targets = readJsonl(MATRIX_PATH).filter((row) => row.partition === "COMPILE_RED_937"
    && row.domain !== "water_supply_sewerage");
  invariant(targets.length === 63
    && targets.filter((row) => row.domain === "asphalt").length === 13
    && targets.filter((row) => row.domain === "hvac_heat_supply").length === 50,
  `R58_REPAIRED_63_TARGETS:${targets.length}/63`);
  const targetByCatalog = new Map(targets.map((row) => [String(row.catalog_id), row]));
  const traceByCatalog = new Map(readJsonl(TRACE_PATH).map((row) => [String(row.catalog_id), row]));

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: apply ? "r58-repaired-63-apply" : "r58-repaired-63-dry-run",
  });
  await client.connect();
  const ledger: Json[] = [];
  let candidateReleaseId = "";
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
      "R58_REPAIRED_63_DRAFT_CANDIDATE_MISSING");
    candidateReleaseId = candidate.id;
    const manifests = (await client.query(`
      select manifest.*,version.release_id definition_release_id,version.source_metadata definition_source_metadata,
        encode(extensions.digest(convert_to(coalesce(string_agg(
          jsonb_build_array(parameter.parameter_id,parameter.ordinal,parameter.value_type,parameter.unit_id,
            parameter.title_ru,parameter.required,parameter.default_value,parameter.constraints_json,
            parameter.truth_metadata)::text,E'\n' order by parameter.ordinal,parameter.parameter_id
        ),''),'UTF8'),'sha256'),'hex') parameter_schema_sha256
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version version on version.id=manifest.definition_version_id
      join public.estimate_parameter_definition parameter on parameter.definition_version_id=version.id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      group by manifest.release_id,manifest.catalog_id,manifest.definition_version_id,manifest.source_batch,
        manifest.source_release_id,manifest.domain_id,manifest.publication_state,
        manifest.approved_template_baseline_id,manifest.baseline_ready,manifest.scenario_ready,
        manifest.definition_hash,manifest.entry_sha256,manifest.created_at,
        version.release_id,version.source_metadata
      order by manifest.catalog_id
    `, [candidateReleaseId, [...targetByCatalog.keys()]])).rows as Json[];
    invariant(manifests.length === 63, `R58_REPAIRED_63_MANIFESTS:${manifests.length}/63`);
    const alreadyReady = manifests.filter((row) => row.baseline_ready && row.scenario_ready
      && row.approved_template_baseline_id != null);
    if (alreadyReady.length > 0) {
      invariant(alreadyReady.length === 63, `R58_REPAIRED_63_PARTIAL_IDEMPOTENCY:${alreadyReady.length}/63`);
      const count = Number((await client.query(
        "select count(*)::int value from public.estimate_approved_template_baseline where accepted_release_id=$1 and catalog_id=any($2::text[])",
        [candidateReleaseId, [...targetByCatalog.keys()]],
      )).rows[0]?.value ?? -1);
      invariant(count === 63, `R58_REPAIRED_63_IDEMPOTENCY_BASELINES:${count}/63`);
      idempotent = true;
      await client.query("rollback");
    } else {
      invariant(manifests.every((row) => row.definition_release_id === candidateReleaseId
        && row.publication_state === "CANONICAL_SUCCESSOR" && !row.baseline_ready),
      "R58_REPAIRED_63_SUCCESSOR_PRECONDITION");
      for (const manifest of manifests) {
        const target = targetByCatalog.get(String(manifest.catalog_id));
        invariant(target, `R58_REPAIRED_63_TARGET_MISSING:${manifest.catalog_id}`);
        const trace = traceByCatalog.get(String(manifest.catalog_id));
        invariant(trace, `R58_REPAIRED_63_TRACE_MISSING:${manifest.catalog_id}`);
        const definition = (await client.query(
          "select * from public.estimate_definition_version where id=$1", [manifest.definition_version_id],
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
        const built = buildAsset({
          target, definition, parameters, formulas, resources, trace,
          parameterSchemaSha256: manifest.parameter_schema_sha256,
          candidateReleaseId, head,
        });
        await insertBaseline(client, built.asset);
        await client.query(`update public.estimate_cumulative_manifest_entry set
          approved_template_baseline_id=$3,baseline_ready=true,scenario_ready=true,
          entry_sha256=$4 where release_id=$1 and catalog_id=$2`, [
          candidateReleaseId, definition.catalog_id, built.asset.id,
          sha256({ contract: CONTRACT, catalogId: definition.catalog_id,
            definitionVersionId: definition.id, baselineId: built.asset.id }),
        ]);
        ledger.push(built.ledger);
      }
      invariant(ledger.length === 63
        && ledger.filter((row) => row.domain === "asphalt").length === 13
        && ledger.filter((row) => row.domain === "hvac_heat_supply").length === 50,
      `R58_REPAIRED_63_LEDGER:${ledger.length}/63`);
      invariant(ledger.filter((row) => row.domain === "asphalt")
        .reduce((sum, row) => sum + row.compiledRows, 0) === 401,
      "R58_REPAIRED_63_ASPHALT_COMPILED_ROWS");
      invariant(ledger.filter((row) => row.domain === "hvac_heat_supply")
        .reduce((sum, row) => sum + row.compiledRows, 0) === 27_696,
      "R58_REPAIRED_63_HVAC_COMPILED_ROWS");
      const counts = (await client.query(`
        select
          count(*) filter(where baseline_ready and scenario_ready and approved_template_baseline_id is not null)::int ready,
          count(*) filter(where domain_id='asphalt' and baseline_ready and scenario_ready)::int asphalt_ready,
          count(*) filter(where domain_id='hvac_heat_supply' and baseline_ready and scenario_ready)::int hvac_ready,
          count(*) filter(where upper(source_batch) like 'BATCH009%')::int batch009_rows
        from public.estimate_cumulative_manifest_entry where release_id=$1
      `, [candidateReleaseId])).rows[0] as Json;
      invariant(counts.ready === 1_554 && counts.asphalt_ready === 25
        && counts.hvac_ready === 50 && counts.batch009_rows === 0,
      `R58_REPAIRED_63_COUNTS:${stable(counts)}`);
      invariant(Number((await client.query(
        "select count(*)::int value from public.estimate_definition_release where status='active' and id=$1",
        [ACTIVE_RELEASE_ID],
      )).rows[0]?.value ?? 0) === 1, "R58_REPAIRED_63_ACTIVE_RELEASE_CHANGED");
      await client.query(`update public.estimate_definition_release set
        source_commit=$2,source_tree=$3,source_package_sha256=$4,
        metadata=metadata||$5::jsonb where id=$1 and status='draft' and sealed_at is null`, [
        candidateReleaseId, head, tree,
        sha256({ contract: CONTRACT, head, tree, ledgerSha256: sha256(ledger) }),
        JSON.stringify({ r58RepairedCompileRedCandidates63: {
          contract: CONTRACT, specSha256: SPEC_SHA256, readyForBackend: 63,
          asphalt: 13, hvac: 50, compiledRows: 28_097,
          terminalGreenClaimed: false, searchCutover: false, runtime8081Switched: false,
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

  const ledgerText = ledger.map((row) => stable(row)).join("\n") + (ledger.length > 0 ? "\n" : "");
  const ledgerPath = resolve(OUTPUT_ROOT, apply
    ? "R58_REPAIRED_COMPILE_RED_CANDIDATES_63_APPLY.jsonl"
    : "R58_REPAIRED_COMPILE_RED_CANDIDATES_63_DRY_RUN.jsonl");
  const summary = {
    schemaVersion: CONTRACT,
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    mode: idempotent ? "IDEMPOTENCY_NO_WRITE" : apply ? "APPLY" : "DRY_RUN_ROLLBACK",
    source: { branch, head, tree },
    candidateReleaseId,
    targets: 63,
    asphalt: 13,
    hvac: 50,
    baselinesChanged: idempotent ? 0 : ledger.length,
    compiledRowsValidated: idempotent ? 28_097 : ledger.reduce((sum, row) => sum + row.compiledRows, 0),
    ledgerPath: idempotent ? null : ledgerPath,
    ledgerSha256: idempotent ? null : sha256(ledgerText),
    readyForBackendGate: true,
    terminalGreenClaimed: false,
    activeReleaseSwitched: false,
    searchCutover: false,
    runtime8081Switched: false,
    batch009Activated: false,
    status: idempotent
      ? "GREEN_R58_REPAIRED_COMPILE_RED_CANDIDATES_63_IDEMPOTENT_0"
      : apply
        ? "GREEN_R58_REPAIRED_COMPILE_RED_CANDIDATES_63_63_APPLIED_NOT_TERMINAL"
        : "GREEN_R58_REPAIRED_COMPILE_RED_CANDIDATES_63_63_DRY_RUN_ROLLED_BACK",
  };
  const summaryPath = resolve(OUTPUT_ROOT, idempotent
    ? "R58_REPAIRED_COMPILE_RED_CANDIDATES_63_IDEMPOTENCY.json"
    : apply
      ? "R58_REPAIRED_COMPILE_RED_CANDIDATES_63_APPLY.json"
      : "R58_REPAIRED_COMPILE_RED_CANDIDATES_63_DRY_RUN.json");
  mkdirSync(dirname(summaryPath), { recursive: true });
  if (!idempotent) writeFileSync(ledgerPath, ledgerText, "utf8");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    mode: summary.mode,
    targets: summary.targets,
    baselinesChanged: summary.baselinesChanged,
    compiledRowsValidated: summary.compiledRowsValidated,
    candidateReleaseId,
    evidencePath: summaryPath,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
