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
const CONTRACT = "p0-one-monolith-r58-frozen-green-baselines-617.v1";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const R57_ROOT = resolve(".release-runtime/p0-one-monolith-r57/evidence/05-baseline");
const MATRIX_PATH = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/05-baseline/R58_4272_REPAIR_MATRIX.jsonl",
);
const ASSETS_PATH = resolve(R57_ROOT, "ACCEPTED_RUNTIME_TRACE_BASELINE_CANDIDATE_ASSETS.jsonl");
const TRACE_PATH = resolve(R57_ROOT, "BATCH001_008_ACCEPTED_RUNTIME_TRACE_INPUT_VALUES.jsonl");
const VALIDATION_SUMMARY_PATH = resolve(R57_ROOT, "ACCEPTED_RUNTIME_TRACE_BASELINE_VALIDATION_SUMMARY.json");
const OUTPUT_ROOT = resolve(".release-runtime/p0-one-monolith-r58/evidence/05-baseline");

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

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
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

function guide(titleRu: unknown, catalogId: string): string {
  const title = String(titleRu ?? "").trim();
  invariant(title.length > 0 && !title.includes("�"), `R58_BASELINE_PARAMETER_TITLE_INVALID:${catalogId}`);
  return `Предварительное значение «${title}» принято из проверенного сценария работы. Уточните его по проекту, обмеру или утверждённой технологической документации; уточнение создаст новую точную revision.`;
}

function duplicateValues(values: readonly string[]): string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function buildAsphaltAsset(input: {
  definition: Json;
  parameters: Json[];
  formulas: Json[];
  resources: Json[];
  trace: Json;
  parameterSchemaSha256: string;
  sourceDefinitionVersionId: string;
  candidateReleaseId: string;
  head: string;
}): { asset: Json; ledger: Json } {
  const { definition, parameters, formulas, resources, trace } = input;
  const parameterIds = new Set(parameters.map((row) => String(row.parameter_id)));
  const traceValues = Object.fromEntries(Object.entries(trace.input_values ?? {}).filter(([id]) => parameterIds.has(id)));
  invariant(Object.keys(traceValues).length === parameters.length,
    `R58_BASELINE_ASPHALT_INPUT_DENOMINATOR:${definition.catalog_id}:${Object.keys(traceValues).length}/${parameters.length}`);
  const resolved = validateCanonicalEstimateParameters(parameters, traceValues, {
    baselineContext: { catalogId: String(definition.catalog_id) },
  });
  const numeric = Object.fromEntries(Object.entries(resolved)
    .filter(([, value]) => typeof value === "number" || typeof value === "string")) as Record<string, string | number>;
  const formulaById = new Map(formulas.map((row) => [String(row.formula_id), row]));
  const included = resources.filter((row) => evaluateInclusionGraph(row.inclusion_ast as Json, resolved));
  invariant(included.length > 0, `R58_BASELINE_ASPHALT_EMPTY:${definition.catalog_id}`);
  const owners = included.map((row) => String(row.semantic_owner ?? "").trim());
  const costOwners = included.map((row) => String(row.cost_owner_id ?? "").trim()).filter(Boolean);
  invariant(owners.every(Boolean) && duplicateValues(owners).length === 0,
    `R58_BASELINE_ASPHALT_SEMANTIC_OWNER:${definition.catalog_id}`);
  invariant(costOwners.length === included.length && duplicateValues(costOwners).length === 0,
    `R58_BASELINE_ASPHALT_COST_OWNER:${definition.catalog_id}`);
  const compiledRows = included.map((row) => {
    const formula = formulaById.get(String(row.formula_id));
    invariant(formula, `R58_BASELINE_ASPHALT_FORMULA_MISSING:${definition.catalog_id}:${row.row_id}`);
    const quantity = Number(evaluateFormulaGraph(formula.ast as FormulaAst, numeric));
    invariant(Number.isFinite(quantity) && quantity >= 0,
      `R58_BASELINE_ASPHALT_QUANTITY:${definition.catalog_id}:${row.row_id}:${quantity}`);
    return {
      rowId: row.row_id,
      formulaId: row.formula_id,
      quantity,
      unitId: row.unit_id,
      semanticOwner: row.semantic_owner,
      costOwnerId: row.cost_owner_id,
    };
  });
  const formulaConsumers: Json = {};
  const resourceConsumers: Json = {};
  const uom: Json = {};
  const classifications: Json = {};
  const sources: Json = {};
  const guides: Json = {};
  for (const parameter of parameters) {
    const parameterId = String(parameter.parameter_id);
    const consumerFormulas = formulas.filter((formula) => (formula.input_parameter_ids ?? []).includes(parameterId));
    const consumerFormulaIds = consumerFormulas.map((formula) => String(formula.formula_id)).sort();
    const formulaIdSet = new Set(consumerFormulaIds);
    const consumerRows = resources.filter((resource) => formulaIdSet.has(String(resource.formula_id))
      || (resource.resource_graph?.parameterSources ?? []).includes(parameterId));
    invariant(consumerRows.length > 0, `R58_BASELINE_ASPHALT_CONSUMER:${definition.catalog_id}:${parameterId}`);
    formulaConsumers[parameterId] = consumerFormulaIds;
    resourceConsumers[parameterId] = [...new Set(consumerRows.map((row) => String(row.row_id)))].sort();
    uom[parameterId] = parameter.unit_id == null ? null : String(parameter.unit_id);
    classifications[parameterId] = "ASSUMPTION";
    sources[parameterId] = normativeSources(consumerRows);
    guides[parameterId] = guide(parameter.title_ru, definition.catalog_id);
  }
  const compileFingerprint = sha256(compiledRows);
  const acceptanceEvidenceSha256 = sha256({
    contract: CONTRACT,
    catalogId: definition.catalog_id,
    definitionVersionId: definition.id,
    sourceDefinitionVersionId: input.sourceDefinitionVersionId,
    parameterSchemaSha256: input.parameterSchemaSha256,
    traceInputValuesSha256: sha256(traceValues),
    compileFingerprint,
    rowCount: compiledRows.length,
    head: input.head,
  });
  const id = deterministicUuid(`${CONTRACT}:${input.candidateReleaseId}:${definition.id}:${acceptanceEvidenceSha256}`);
  return {
    asset: {
      id,
      baseline_key: `r58-frozen-green:${definition.catalog_id}:${id}`,
      catalog_id: definition.catalog_id,
      definition_version_id: definition.id,
      source_definition_version_id: input.sourceDefinitionVersionId,
      parameter_schema_sha256: input.parameterSchemaSha256,
      input_values: traceValues,
      input_classification: classifications,
      uom_by_parameter: uom,
      formula_consumer_ids: formulaConsumers,
      resource_consumer_row_ids: resourceConsumers,
      normative_source_ids: sources,
      guide_provenance_ru: guides,
      proposal_source_refs: [{
        kind: trace.provenance_kind,
        path: trace.proposal_source_ref,
        sha256: trace.proposal_source_sha256,
        inputValuesSha256: trace.input_values_sha256,
      }],
      validation_scenario_refs: [{
        kind: "R58_CURRENT_HEAD_CANONICAL_IN_MEMORY_VALIDATION",
        head: input.head,
        compileFingerprint,
        rowCount: compiledRows.length,
        formulaGraphCount: formulas.length,
        resourceGraphCount: resources.length,
      }],
      acceptance_evidence_sha256: acceptanceEvidenceSha256,
      accepted_release_id: input.candidateReleaseId,
      supersedes_baseline_id: null,
      contract_version: "APPROVED_TEMPLATE_BASELINE_R54_V1",
    },
    ledger: {
      catalogId: definition.catalog_id,
      domain: "asphalt",
      definitionVersionId: definition.id,
      sourceDefinitionVersionId: input.sourceDefinitionVersionId,
      baselineId: id,
      parameters: parameters.length,
      formulas: formulas.length,
      resources: resources.length,
      compiledRows: compiledRows.length,
      compileFingerprint,
      acceptanceEvidenceSha256,
      duplicateSemanticOwners: 0,
      duplicateCostOwners: 0,
      status: "GREEN_R58_CURRENT_HEAD_VALIDATED",
    },
  };
}

function rewriteElectricalAsset(input: {
  source: Json;
  manifest: Json;
  titles: Map<string, string>;
  candidateReleaseId: string;
  head: string;
  freshValidation: Json;
}): { asset: Json; ledger: Json } {
  const { source, manifest } = input;
  invariant(source.definition_version_id === manifest.definition_version_id,
    `R58_BASELINE_ELECTRICAL_DEFINITION_DRIFT:${source.catalog_id}`);
  const parameterIds = Object.keys(source.input_values).sort();
  const guideProvenance: Json = {};
  for (const parameterId of parameterIds) {
    const title = input.titles.get(`${source.definition_version_id}:${parameterId}`);
    invariant(title, `R58_BASELINE_ELECTRICAL_TITLE_MISSING:${source.catalog_id}:${parameterId}`);
    guideProvenance[parameterId] = guide(title, source.catalog_id);
  }
  const acceptanceEvidenceSha256 = sha256({
    contract: CONTRACT,
    priorAcceptanceEvidenceSha256: source.acceptance_evidence_sha256,
    freshAssetsSha256: input.freshValidation.assets_sha256,
    freshLedgerSha256: input.freshValidation.ledger_sha256,
    catalogId: source.catalog_id,
    definitionVersionId: source.definition_version_id,
    parameterSchemaSha256: source.parameter_schema_sha256,
    guideProvenanceSha256: sha256(guideProvenance),
    head: input.head,
  });
  const id = deterministicUuid(`${CONTRACT}:${input.candidateReleaseId}:${source.definition_version_id}:${acceptanceEvidenceSha256}`);
  const asset = {
    ...source,
    id,
    baseline_key: `r58-frozen-green:${source.catalog_id}:${id}`,
    guide_provenance_ru: guideProvenance,
    proposal_source_refs: [...source.proposal_source_refs, {
      kind: "R58_CURRENT_HEAD_REVALIDATION",
      head: input.head,
      assetsSha256: input.freshValidation.assets_sha256,
      ledgerSha256: input.freshValidation.ledger_sha256,
    }],
    validation_scenario_refs: [...source.validation_scenario_refs, {
      kind: "R58_CURRENT_HEAD_FROZEN_GREEN_REVALIDATION",
      head: input.head,
      sourceStatus: input.freshValidation.status,
      guideMojibakeRows: 0,
    }],
    acceptance_evidence_sha256: acceptanceEvidenceSha256,
    accepted_release_id: input.candidateReleaseId,
    accepted_at: null,
  };
  return {
    asset,
    ledger: {
      catalogId: source.catalog_id,
      domain: "electrical",
      definitionVersionId: source.definition_version_id,
      sourceDefinitionVersionId: source.source_definition_version_id,
      baselineId: id,
      parameters: parameterIds.length,
      compiledRows: source.validation_scenario_refs[0]?.rowCount,
      priorAcceptanceEvidenceSha256: source.acceptance_evidence_sha256,
      acceptanceEvidenceSha256,
      guideProvenanceSha256: sha256(guideProvenance),
      guideMojibakeRows: 0,
      freshValidationHead: input.freshValidation.head,
      status: "GREEN_R58_CURRENT_HEAD_REVALIDATED_AND_GUIDES_REWRITTEN",
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
    "R58_BASELINE_617_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256File(SPEC_PATH) === SPEC_SHA256, "R58_BASELINE_617_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === "codex/p0-one-monolith-r5", `R58_BASELINE_617_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_BASELINE_617_REQUIRES_CLEAN_HEAD");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);

  const targets = readJsonl(MATRIX_PATH).filter((row) => row.partition === "FROZEN_GREEN_617");
  invariant(targets.length === 617, `R58_BASELINE_617_TARGETS:${targets.length}/617`);
  const targetByCatalog = new Map(targets.map((row) => [String(row.catalog_id), row]));
  const freshValidation = readJson(VALIDATION_SUMMARY_PATH);
  invariant(freshValidation.head === head && freshValidation.green_candidate_assets === 1_479
    && freshValidation.domains?.find((row: Json) => row.domain === "electrical")?.green_assets === 605,
  "R58_BASELINE_617_FRESH_VALIDATION_DRIFT");
  const sourceAssets = readJsonl(ASSETS_PATH).filter((row) => targetByCatalog.get(String(row.catalog_id))?.domain === "electrical");
  invariant(sourceAssets.length === 605, `R58_BASELINE_617_ELECTRICAL_ASSETS:${sourceAssets.length}/605`);
  const traceByCatalog = new Map(readJsonl(TRACE_PATH).map((row) => [String(row.catalog_id), row]));

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: apply ? "r58-frozen-green-617-apply" : "r58-frozen-green-617-dry-run",
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
      "R58_BASELINE_617_DRAFT_CANDIDATE_MISSING");
    candidateReleaseId = candidate.id;
    const manifests = (await client.query(`
      select manifest.*,version.release_id definition_release_id,
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
        manifest.definition_hash,manifest.entry_sha256,manifest.created_at,version.release_id
      order by manifest.catalog_id
    `, [candidateReleaseId, [...targetByCatalog.keys()]])).rows as Json[];
    invariant(manifests.length === 617, `R58_BASELINE_617_MANIFESTS:${manifests.length}/617`);
    const alreadyReady = manifests.filter((row) => row.baseline_ready && row.scenario_ready
      && row.approved_template_baseline_id != null);
    if (alreadyReady.length > 0) {
      invariant(alreadyReady.length === 617, `R58_BASELINE_617_PARTIAL_IDEMPOTENCY:${alreadyReady.length}/617`);
      const count = Number((await client.query(
        "select count(*)::int value from public.estimate_approved_template_baseline where accepted_release_id=$1 and catalog_id=any($2::text[])",
        [candidateReleaseId, [...targetByCatalog.keys()]],
      )).rows[0]?.value ?? -1);
      invariant(count === 617, `R58_BASELINE_617_IDEMPOTENCY_BASELINES:${count}/617`);
      idempotent = true;
      await client.query("rollback");
    } else {
      const manifestByCatalog = new Map(manifests.map((row) => [String(row.catalog_id), row]));
      const electricalDefinitionIds = sourceAssets.map((asset) => String(asset.definition_version_id));
      const titleRows = (await client.query(`
        select definition_version_id,parameter_id,title_ru
        from public.estimate_parameter_definition where definition_version_id=any($1::uuid[])
      `, [electricalDefinitionIds])).rows as Json[];
      const titles = new Map(titleRows.map((row) => [
        `${row.definition_version_id}:${row.parameter_id}`, String(row.title_ru),
      ]));
      for (const source of sourceAssets.sort((a, b) => String(a.catalog_id).localeCompare(String(b.catalog_id)))) {
        const manifest = manifestByCatalog.get(String(source.catalog_id));
        invariant(manifest && manifest.domain_id === "electrical" && manifest.publication_state === "ACCEPTED_INHERITED",
          `R58_BASELINE_617_ELECTRICAL_MANIFEST:${source.catalog_id}`);
        invariant(manifest.parameter_schema_sha256 === source.parameter_schema_sha256,
          `R58_BASELINE_617_ELECTRICAL_SCHEMA:${source.catalog_id}`);
        const built = rewriteElectricalAsset({
          source, manifest, titles, candidateReleaseId, head, freshValidation,
        });
        await insertBaseline(client, built.asset);
        await client.query(`update public.estimate_cumulative_manifest_entry set
          approved_template_baseline_id=$3,baseline_ready=true,scenario_ready=true,
          entry_sha256=$4 where release_id=$1 and catalog_id=$2`, [
          candidateReleaseId, source.catalog_id, built.asset.id,
          sha256({ contract: CONTRACT, catalogId: source.catalog_id,
            definitionVersionId: source.definition_version_id, baselineId: built.asset.id }),
        ]);
        ledger.push(built.ledger);
      }

      const asphaltManifests = manifests.filter((row) => row.domain_id === "asphalt");
      invariant(asphaltManifests.length === 12, `R58_BASELINE_617_ASPHALT_MANIFESTS:${asphaltManifests.length}/12`);
      for (const manifest of asphaltManifests) {
        invariant(manifest.publication_state === "CANONICAL_SUCCESSOR"
          && manifest.definition_release_id === candidateReleaseId,
        `R58_BASELINE_617_ASPHALT_SUCCESSOR:${manifest.catalog_id}`);
        const definition = (await client.query(
          "select * from public.estimate_definition_version where id=$1",
          [manifest.definition_version_id],
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
        const trace = traceByCatalog.get(String(definition.catalog_id));
        invariant(trace, `R58_BASELINE_617_ASPHALT_TRACE:${definition.catalog_id}`);
        const target = targetByCatalog.get(String(definition.catalog_id));
        invariant(target?.domain === "asphalt", `R58_BASELINE_617_ASPHALT_TARGET:${definition.catalog_id}`);
        const built = buildAsphaltAsset({
          definition, parameters, formulas, resources, trace,
          parameterSchemaSha256: manifest.parameter_schema_sha256,
          sourceDefinitionVersionId: String(target.definition_version_id),
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
      invariant(ledger.length === 617
        && ledger.filter((row) => row.domain === "electrical").length === 605
        && ledger.filter((row) => row.domain === "asphalt").length === 12,
      `R58_BASELINE_617_LEDGER_DENOMINATOR:${ledger.length}/617`);
      const counts = (await client.query(`
        select
          count(*) filter(where baseline_ready and scenario_ready and approved_template_baseline_id is not null)::int ready,
          count(*) filter(where domain_id='electrical' and baseline_ready and scenario_ready)::int electrical_ready,
          count(*) filter(where domain_id='asphalt' and baseline_ready and scenario_ready)::int asphalt_ready,
          count(*) filter(where upper(source_batch) like 'BATCH009%')::int batch009_rows
        from public.estimate_cumulative_manifest_entry where release_id=$1
      `, [candidateReleaseId])).rows[0] as Json;
      invariant(counts.ready === 617 && counts.electrical_ready === 605
        && counts.asphalt_ready === 12 && counts.batch009_rows === 0,
      `R58_BASELINE_617_COUNTS:${stable(counts)}`);
      invariant(Number((await client.query(
        "select count(*)::int value from public.estimate_definition_release where status='active' and id=$1",
        [ACTIVE_RELEASE_ID],
      )).rows[0]?.value ?? 0) === 1, "R58_BASELINE_617_ACTIVE_RELEASE_CHANGED");
      await client.query(`update public.estimate_definition_release set
        source_commit=$2,source_tree=$3,source_package_sha256=$4,
        metadata=metadata||$5::jsonb where id=$1 and status='draft' and sealed_at is null`, [
        candidateReleaseId, head, tree,
        sha256({ contract: CONTRACT, head, tree, ledgerSha256: sha256(ledger) }),
        JSON.stringify({ r58FrozenGreenBaselines617: {
          contract: CONTRACT, specSha256: SPEC_SHA256, ready: 617,
          electrical: 605, asphalt: 12, searchCutover: false, runtime8081Switched: false,
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
    ? "R58_FROZEN_GREEN_BASELINE_617_APPLY.jsonl"
    : "R58_FROZEN_GREEN_BASELINE_617_DRY_RUN.jsonl");
  const summary = {
    schemaVersion: CONTRACT,
    capturedAt: new Date().toISOString(),
    specSha256: SPEC_SHA256,
    mode: idempotent ? "IDEMPOTENCY_NO_WRITE" : apply ? "APPLY" : "DRY_RUN_ROLLBACK",
    source: { branch, head, tree },
    candidateReleaseId,
    targets: 617,
    electrical: 605,
    asphalt: 12,
    baselinesChanged: idempotent ? 0 : ledger.length,
    freshValidation: {
      head: freshValidation.head,
      assetsSha256: freshValidation.assets_sha256,
      ledgerSha256: freshValidation.ledger_sha256,
      electricalGreen: 605,
    },
    ledgerPath: idempotent ? null : ledgerPath,
    ledgerSha256: idempotent ? null : sha256(ledgerText),
    activeReleaseSwitched: false,
    searchCutover: false,
    runtime8081Switched: false,
    batch009Activated: false,
    status: idempotent
      ? "GREEN_R58_FROZEN_GREEN_BASELINES_617_IDEMPOTENT_0"
      : apply
        ? "GREEN_R58_FROZEN_GREEN_BASELINES_617_617_APPLIED"
        : "GREEN_R58_FROZEN_GREEN_BASELINES_617_617_DRY_RUN_ROLLED_BACK",
  };
  const summaryPath = resolve(OUTPUT_ROOT, idempotent
    ? "R58_FROZEN_GREEN_BASELINE_617_IDEMPOTENCY.json"
    : apply
      ? "R58_FROZEN_GREEN_BASELINE_617_APPLY.json"
      : "R58_FROZEN_GREEN_BASELINE_617_DRY_RUN.json");
  mkdirSync(dirname(summaryPath), { recursive: true });
  if (!idempotent) writeFileSync(ledgerPath, ledgerText, "utf8");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    mode: summary.mode,
    targets: summary.targets,
    baselinesChanged: summary.baselinesChanged,
    candidateReleaseId,
    evidencePath: summaryPath,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
