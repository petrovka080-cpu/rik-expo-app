import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const SPEC_PATH = resolve(
  "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md",
);
const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const PREDECESSOR_RELEASE_ID = "a7dca174-3ad5-552b-aa4c-fc28979a56ef";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const RELEASE_KEY = "p0-r58-cumulative-candidate-laminate-4cf42813";
const CATALOG_ID = "flooring_interior_laminate_install_large_area";
const CONTRACT = "p0-one-monolith-r58-laminate-forward-promotion.v1";
const SOURCE_DATABASE_URL = process.env.R58_LAMINATE_SOURCE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/p0_r45_acceptance_full_20260817";
const TARGET_DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT = resolve(
  ".release-runtime/p0-one-monolith-r58/evidence/08-adjudication/R58_LAMINATE_FORWARD_PROMOTION.json",
);
const APPLY = process.argv.includes("--apply");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function deterministicUuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000,
  }).trim();
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

function comparableParameter(row: Json): Json {
  return {
    parameter_id: row.parameter_id, ordinal: row.ordinal, value_type: row.value_type,
    unit_id: row.unit_id, title_ru: row.title_ru, required: row.required,
    default_value: row.default_value, constraints_json: row.constraints_json,
    truth_metadata: row.truth_metadata,
  };
}

function businessParameter(row: Json): Json {
  return {
    parameter_id: row.parameter_id, ordinal: row.ordinal, value_type: row.value_type,
    unit_id: row.unit_id, title_ru: row.title_ru, required: row.required,
    default_value: row.default_value, constraints_json: row.constraints_json,
    truth: {
      semantic_parameter_key: row.truth_metadata?.semantic_parameter_key,
      description_ru: row.truth_metadata?.description_ru,
      default_policy: row.truth_metadata?.default_policy,
      guide: row.truth_metadata?.guide,
      formula_consumers: row.truth_metadata?.formula_consumers,
      validation_rules: row.truth_metadata?.validation_rules,
      conflicts_with: row.truth_metadata?.conflicts_with,
    },
  };
}

function comparableFormula(row: Json): Json {
  return {
    formula_id: row.formula_id, output_unit_id: row.output_unit_id,
    expression_source: row.expression_source, ast: row.ast,
    input_parameter_ids: row.input_parameter_ids, ast_sha256: row.ast_sha256,
  };
}

function comparableResource(row: Json): Json {
  return {
    row_id: row.row_id, ordinal: row.ordinal, section: row.section, category: row.category,
    title_ru: row.title_ru, row_type: row.row_type, unit_id: row.unit_id,
    formula_id: row.formula_id, inclusion_ast: row.inclusion_ast,
    resource_graph: row.resource_graph, semantic_owner: row.semantic_owner,
    cost_owner_id: row.cost_owner_id, procurement_eligible: row.procurement_eligible,
    source_metadata: row.source_metadata, row_sha256: row.row_sha256,
  };
}

async function loadSource(client: Client): Promise<Json> {
  const definition = (await client.query(
    "select * from public.estimate_definition_version where catalog_id=$1",
    [CATALOG_ID],
  )).rows[0] as Json | undefined;
  invariant(definition, "R58_LAMINATE_SOURCE_DEFINITION_MISSING");
  const identity = (await client.query(
    "select * from public.estimate_work_identity where catalog_id=$1",
    [CATALOG_ID],
  )).rows[0] as Json | undefined;
  invariant(identity, "R58_LAMINATE_SOURCE_IDENTITY_MISSING");
  const parameters = (await client.query(`
    select * from public.estimate_parameter_definition
    where definition_version_id=$1 order by ordinal,parameter_id
  `, [definition.id])).rows as Json[];
  const formulas = (await client.query(`
    select * from public.estimate_formula_graph
    where definition_version_id=$1 order by formula_id
  `, [definition.id])).rows as Json[];
  const resources = (await client.query(`
    select * from public.estimate_resource_spec
    where definition_version_id=$1 order by ordinal,row_id
  `, [definition.id])).rows as Json[];
  const normativeBindings = (await client.query(`
    select resource.row_id,source.source_key,source.title_ru source_title_ru,
      source.authority,source.official_url,source.artifact_sha256,source.effective_from,
      source.effective_to,source.metadata source_metadata,locator.locator_key,
      locator.locator,locator.excerpt_sha256,binding.applicability
    from public.estimate_work_normative_binding binding
    join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
    join public.estimate_normative_locator locator on locator.id=binding.locator_id
    join public.estimate_normative_source source on source.id=locator.source_id
    where binding.definition_version_id=$1
    order by resource.row_id,source.source_key,locator.locator_key
  `, [definition.id])).rows as Json[];
  const priceBindings = (await client.query(`
    select resource.row_id,binding.price_key,binding.priority binding_priority,
      route.currency_code,route.region_code,route.priority route_priority,
      route.source_kind,route.metadata route_metadata,route.active
    from public.estimate_resource_price_route_binding binding
    join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
    join public.estimate_price_route route on route.id=binding.route_id
    where resource.definition_version_id=$1
    order by resource.row_id,binding.priority,binding.price_key
  `, [definition.id])).rows as Json[];
  invariant(parameters.length === 5 && formulas.length === 4 && resources.length === 6
    && normativeBindings.length === 11 && priceBindings.length === 6,
  `R58_LAMINATE_SOURCE_COUNTS:${parameters.length}/${formulas.length}/${resources.length}/${normativeBindings.length}/${priceBindings.length}`);
  return { definition, identity, parameters, formulas, resources, normativeBindings, priceBindings };
}

function buildBaseline(source: Json, definitionId: string, releaseId: string): Json {
  const inputValues = Object.fromEntries(source.parameters.map((row: Json) => [row.parameter_id, row.default_value]));
  const inputClassification = Object.fromEntries(source.parameters.map((row: Json) => [
    row.parameter_id,
    row.parameter_id === "laminate_waste_percent" ? "NORMATIVE" : "ASSUMPTION",
  ]));
  const uomByParameter = Object.fromEntries(source.parameters.map((row: Json) => [
    row.parameter_id, row.unit_id ?? "dimensionless",
  ]));
  const formulaConsumers = Object.fromEntries(source.parameters.map((row: Json) => [
    row.parameter_id, row.truth_metadata?.formula_consumers ?? [],
  ]));
  const resourceConsumers = Object.fromEntries(source.parameters.map((row: Json) => {
    const formulaIds = new Set<string>(row.truth_metadata?.formula_consumers ?? []);
    const branchRows = new Set<string>(row.truth_metadata?.resource_branch_consumers ?? []);
    for (const resource of source.resources as Json[]) {
      if (formulaIds.has(String(resource.formula_id))) branchRows.add(String(resource.row_id));
    }
    return [row.parameter_id, [...branchRows].sort()];
  }));
  const normativeSourceIds = Object.fromEntries(source.parameters.map((row: Json) => [
    row.parameter_id,
    [...new Set((source.normativeBindings as Json[]).map((binding) => String(binding.source_key)))].sort(),
  ]));
  const guideProvenanceRu = Object.fromEntries(source.parameters.map((row: Json) => [
    row.parameter_id,
    String(row.truth_metadata?.guide?.guide_short_ru ?? row.truth_metadata?.description_ru ?? row.title_ru),
  ]));
  invariant(Object.values(resourceConsumers).every((rows) => Array.isArray(rows) && rows.length > 0),
    "R58_LAMINATE_BASELINE_RESOURCE_CONSUMER_EMPTY");
  const parameterSchemaSha256 = shaObject(source.parameters.map(comparableParameter));
  const validationScenarioRefs = [{
    contract: CONTRACT,
    scenario: "PRELIMINARY_DEFAULTS_THEN_EXACT_AREA_RECALCULATION",
    rowCount: source.resources.length,
    baselineInputValues: inputValues,
    sensitivityScenario: {
      parameterId: "area_m2", baselineValue: Number(inputValues.area_m2), changedValue: 1547,
      changedValueAffectsCompilation: true, missingRequiredValueRejected: true,
    },
    expectedPriceState: "PRICE_REQUIRED",
  }];
  const acceptanceEvidenceSha256 = shaObject({
    contract: CONTRACT, sourceDefinitionId: source.definition.id,
    definitionId, releaseId, parameterSchemaSha256, inputValues,
    formulaConsumers, resourceConsumers, normativeSourceIds, validationScenarioRefs,
  });
  return {
    id: deterministicUuid(`${CONTRACT}:baseline:${CATALOG_ID}`),
    baselineKey: `r58-laminate-approved-baseline:${sha256(CATALOG_ID).slice(0, 16)}`,
    parameterSchemaSha256, inputValues, inputClassification, uomByParameter,
    formulaConsumers, resourceConsumers, normativeSourceIds, guideProvenanceRu,
    proposalSourceRefs: [{
      contract: "r4.5-laminate.v1", sourceDatabase: "p0_r45_acceptance_full_20260817",
      sourceDefinitionVersionId: source.definition.id, definitionSha256: source.definition.definition_sha256,
    }],
    validationScenarioRefs, acceptanceEvidenceSha256,
  };
}

async function insertSourceData(client: Client, source: Json, definitionId: string,
  releaseId: string, baseline: Json): Promise<void> {
  for (const row of source.parameters as Json[]) {
    const truthMetadata = {
      ...row.truth_metadata,
      value_source_role: "VISIBLE_BASELINE_ASSUMPTION",
      baseline_assumption_id: `r58-laminate:${row.parameter_id}`,
      resource_branch_consumers: baseline.resourceConsumers[row.parameter_id],
      provenance: {
        ...(row.truth_metadata?.provenance ?? {}),
        baselineOwner: "approved-template-baseline:r54",
        sourceCatalogId: CATALOG_ID,
        sourceReleaseId: releaseId,
        sourceDefinitionVersionId: definitionId,
        sourceParameterSchemaId: baseline.parameterSchemaSha256,
        approvedTemplateBaselineId: baseline.id,
        acceptanceEvidenceSha256: baseline.acceptanceEvidenceSha256,
        approvedTemplateBinding: {
          contract: CONTRACT,
          historicalSourceDefinitionVersionId: source.definition.id,
          businessSemanticsChanged: false,
        },
      },
    };
    await client.query(`insert into public.estimate_parameter_definition(
      definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
      default_value,constraints_json,truth_metadata,approved_template_baseline_id
    ) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11)`, [
      definitionId,row.parameter_id,row.ordinal,row.value_type,row.unit_id,row.title_ru,row.required,
      JSON.stringify(row.default_value),JSON.stringify(row.constraints_json),JSON.stringify(truthMetadata),
      baseline.id,
    ]);
  }
  for (const row of source.formulas as Json[]) {
    await client.query(`insert into public.estimate_formula_graph(
      definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
    ) values($1,$2,$3,$4,$5::jsonb,$6::text[],$7)`, [
      definitionId,row.formula_id,row.output_unit_id,row.expression_source,
      JSON.stringify(row.ast),row.input_parameter_ids,row.ast_sha256,
    ]);
  }
  const resourceIds = new Map<string,string>();
  for (const row of source.resources as Json[]) {
    const resourceId = deterministicUuid(`${CONTRACT}:resource:${row.row_id}`);
    await client.query(`insert into public.estimate_resource_spec(
      id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,
      inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16::jsonb,$17)`, [
      resourceId,definitionId,row.row_id,row.ordinal,row.section,row.category,row.title_ru,row.row_type,
      row.unit_id,row.formula_id,JSON.stringify(row.inclusion_ast),JSON.stringify(row.resource_graph),
      row.semantic_owner,row.cost_owner_id,row.procurement_eligible,JSON.stringify(row.source_metadata),row.row_sha256,
    ]);
    resourceIds.set(String(row.row_id),resourceId);
  }
  const locatorIds = new Map<string,string>();
  for (const binding of source.normativeBindings as Json[]) {
    const sourceId = deterministicUuid(`${CONTRACT}:normative-source:${binding.source_key}`);
    await client.query(`insert into public.estimate_normative_source(
      id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,effective_to,metadata
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
    on conflict(source_key) do nothing`, [sourceId,binding.source_key,binding.source_title_ru,
      binding.authority,binding.official_url,binding.artifact_sha256,binding.effective_from,
      binding.effective_to,JSON.stringify(binding.source_metadata)]);
    const targetSource = (await client.query(
      "select * from public.estimate_normative_source where source_key=$1",
      [binding.source_key],
    )).rows[0] as Json;
    invariant(targetSource.title_ru === binding.source_title_ru
      && targetSource.authority === binding.authority
      && targetSource.official_url === binding.official_url,
    `R58_LAMINATE_NORMATIVE_SOURCE_CONFLICT:${binding.source_key}`);
    const locatorKey = `${binding.source_key}:${binding.locator_key}`;
    const locatorId = deterministicUuid(`${CONTRACT}:normative-locator:${locatorKey}`);
    await client.query(`insert into public.estimate_normative_locator(
      id,source_id,locator_key,locator,excerpt_sha256
    ) values($1,$2,$3,$4::jsonb,$5) on conflict(source_id,locator_key) do nothing`, [
      locatorId,targetSource.id,binding.locator_key,JSON.stringify(binding.locator),binding.excerpt_sha256,
    ]);
    const targetLocator = (await client.query(`select * from public.estimate_normative_locator
      where source_id=$1 and locator_key=$2`, [targetSource.id,binding.locator_key])).rows[0] as Json;
    invariant(stableJson(targetLocator.locator) === stableJson(binding.locator)
      && targetLocator.excerpt_sha256 === binding.excerpt_sha256,
    `R58_LAMINATE_NORMATIVE_LOCATOR_CONFLICT:${locatorKey}`);
    locatorIds.set(locatorKey,String(targetLocator.id));
  }
  for (const binding of source.normativeBindings as Json[]) {
    await client.query(`insert into public.estimate_work_normative_binding(
      definition_version_id,resource_spec_id,locator_id,applicability
    ) values($1,$2,$3,$4::jsonb)`, [definitionId,resourceIds.get(String(binding.row_id)),
      locatorIds.get(`${binding.source_key}:${binding.locator_key}`),JSON.stringify(binding.applicability)]);
  }
  for (const binding of source.priceBindings as Json[]) {
    const resourceId = resourceIds.get(String(binding.row_id));
    invariant(resourceId, `R58_LAMINATE_RESOURCE_ID_MISSING:${binding.row_id}`);
    const routeId = deterministicUuid(`${CONTRACT}:price-route:${binding.row_id}`);
    const routeKey = `r58-laminate:${CATALOG_ID}:${binding.row_id}`;
    await client.query(`insert into public.estimate_price_route(
      id,route_key,currency_code,region_code,priority,source_kind,metadata,active
    ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`, [routeId,routeKey,binding.currency_code,
      binding.region_code,binding.route_priority,binding.source_kind,JSON.stringify(binding.route_metadata),binding.active]);
    await client.query(`insert into public.estimate_resource_price_route_binding(
      resource_spec_id,route_id,price_key,priority
    ) values($1,$2,$3,$4)`, [resourceId,routeId,binding.price_key,binding.binding_priority]);
  }
}

async function loadTargetProjection(client: Client, definitionId: string): Promise<Json> {
  const definition = (await client.query(
    "select * from public.estimate_definition_version where id=$1", [definitionId],
  )).rows[0] as Json;
  const parameters = (await client.query(`select * from public.estimate_parameter_definition
    where definition_version_id=$1 order by ordinal,parameter_id`, [definitionId])).rows as Json[];
  const formulas = (await client.query(`select * from public.estimate_formula_graph
    where definition_version_id=$1 order by formula_id`, [definitionId])).rows as Json[];
  const resources = (await client.query(`select * from public.estimate_resource_spec
    where definition_version_id=$1 order by ordinal,row_id`, [definitionId])).rows as Json[];
  const normativeBindings = (await client.query(`
    select resource.row_id,source.source_key,source.title_ru source_title_ru,
      source.authority,source.official_url,source.artifact_sha256,source.effective_from,
      source.effective_to,source.metadata source_metadata,locator.locator_key,
      locator.locator,locator.excerpt_sha256,binding.applicability
    from public.estimate_work_normative_binding binding
    join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
    join public.estimate_normative_locator locator on locator.id=binding.locator_id
    join public.estimate_normative_source source on source.id=locator.source_id
    where binding.definition_version_id=$1
    order by resource.row_id,source.source_key,locator.locator_key
  `, [definitionId])).rows as Json[];
  const priceBindings = (await client.query(`
    select resource.row_id,binding.price_key,binding.priority binding_priority,
      route.currency_code,route.region_code,route.priority route_priority,
      route.source_kind,route.metadata route_metadata,route.active
    from public.estimate_resource_price_route_binding binding
    join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
    join public.estimate_price_route route on route.id=binding.route_id
    where resource.definition_version_id=$1
    order by resource.row_id,binding.priority,binding.price_key
  `, [definitionId])).rows as Json[];
  return { definition,parameters,formulas,resources,normativeBindings,priceBindings };
}

async function main(): Promise<void> {
  invariant(process.argv.length === 2 || (process.argv.length === 3 && APPLY),
    "R58_LAMINATE_USAGE_ONLY_OPTIONAL_APPLY");
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_LAMINATE_SPEC_DRIFT");
  const branch = git(["branch","--show-current"]);
  const head = git(["rev-parse","HEAD"]);
  const tree = git(["rev-parse","HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_LAMINATE_BRANCH_DRIFT:${branch}`);
  invariant(git(["status","--porcelain=v1"]) === "", "R58_LAMINATE_DIRTY_WORKTREE");
  git(["merge-base","--is-ancestor",BASE_COMMIT,head]);
  const sourceClient = new Client({connectionString:SOURCE_DATABASE_URL,application_name:"r58-laminate-source-read"});
  const targetClient = new Client({connectionString:TARGET_DATABASE_URL,
    application_name:APPLY ? "r58-laminate-promotion-apply" : "r58-laminate-promotion-dry-run"});
  await sourceClient.connect();
  await targetClient.connect();
  const source = await loadSource(sourceClient);
  const releaseId = deterministicUuid(`${CONTRACT}:release:${RELEASE_KEY}`);
  const definitionId = deterministicUuid(`${CONTRACT}:definition:${CATALOG_ID}`);
  const baseline = buildBaseline(source,definitionId,releaseId);
  let writesApplied = 0;
  let idempotent = false;
  try {
    await targetClient.query("begin");
    await targetClient.query("set local lock_timeout='5s'");
    await targetClient.query("set local statement_timeout='120s'");
    const predecessor = (await targetClient.query(
      "select * from public.estimate_definition_release where id=$1", [PREDECESSOR_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared" && predecessor.definition_count === 4272,
      "R58_LAMINATE_PREDECESSOR_DRIFT");
    const active = (await targetClient.query(
      "select * from public.estimate_definition_release where id=$1", [ACTIVE_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(active?.status === "active", "R58_LAMINATE_ACTIVE_RELEASE_DRIFT");
    const existing = (await targetClient.query(
      "select * from public.estimate_definition_release where release_key=$1", [RELEASE_KEY],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared"
        && existing.parent_release_id === PREDECESSOR_RELEASE_ID,
      "R58_LAMINATE_EXISTING_SUCCESSOR_DRIFT");
      idempotent = true;
    } else {
      invariant(Number((await targetClient.query(
        "select count(*)::int value from public.estimate_definition_version where catalog_id=$1",
        [CATALOG_ID],
      )).rows[0]?.value ?? -1) === 0, "R58_LAMINATE_TARGET_ALREADY_HAS_DEFINITION");
      await targetClient.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
        definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
        parameter_count,formula_count
      ) values($1,$2,6,'draft',$3,$4,$5,4273,1157024,$6::jsonb,$7,$8,743376,1157022)`, [
        releaseId,RELEASE_KEY,head,tree,shaObject({contract:CONTRACT,predecessor:PREDECESSOR_RELEASE_ID,catalogId:CATALOG_ID}),
        JSON.stringify({authority:"P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8",specSha256:SPEC_SHA256,
          contract:CONTRACT,batch009Included:false,predecessorReleaseId:PREDECESSOR_RELEASE_ID,
          preservedCumulativeDefinitions:4272,laminatePromoted:1,activeReleaseSwitched:false,
          searchCutover:false,runtime8081Switched:false,terminalGreenClaimed:false,
          sourceR45ProductionAuthorizationRetainedAsHistoricalProvenance:true}),
        PREDECESSOR_RELEASE_ID,shaObject({contract:CONTRACT,head,tree,sourceDefinitionSha256:source.definition.definition_sha256}),
      ]);
      await targetClient.query(`insert into public.estimate_work_identity(
        catalog_id,namespace,domain,source_identity,work_key,title_ru,
        denominator_eligible,canonical_owner,retired_at
      ) values($1,$2,$3,$4,$5,$6,$7,$8,null)`, [CATALOG_ID,source.identity.namespace,
        source.identity.domain,`r58-forward:${source.identity.source_identity}`,source.identity.work_key,
        source.identity.title_ru,true,"backend"]);
      await targetClient.query(`insert into public.estimate_definition_version(
        id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
      ) values($1,$2,$3,1,$4::jsonb,$5::jsonb,$6,$7::jsonb)`, [definitionId,releaseId,CATALOG_ID,
        JSON.stringify(source.definition.passport),JSON.stringify(source.definition.applicability),
        source.definition.definition_sha256,JSON.stringify(source.definition.source_metadata)]);
      await targetClient.query(`insert into public.estimate_approved_template_baseline(
        id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
        parameter_schema_sha256,input_values,input_classification,uom_by_parameter,formula_consumer_ids,
        resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,proposal_source_refs,
        validation_scenario_refs,acceptance_evidence_sha256,accepted_release_id,accepted_at,
        supersedes_baseline_id,contract_version
      ) values($1,$2,$3,$4,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
        $12::jsonb,$13::jsonb,$14::jsonb,$15,$16,now(),null,'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
        baseline.id,baseline.baselineKey,CATALOG_ID,definitionId,baseline.parameterSchemaSha256,
        JSON.stringify(baseline.inputValues),JSON.stringify(baseline.inputClassification),
        JSON.stringify(baseline.uomByParameter),JSON.stringify(baseline.formulaConsumers),
        JSON.stringify(baseline.resourceConsumers),JSON.stringify(baseline.normativeSourceIds),
        JSON.stringify(baseline.guideProvenanceRu),JSON.stringify(baseline.proposalSourceRefs),
        JSON.stringify(baseline.validationScenarioRefs),baseline.acceptanceEvidenceSha256,releaseId,
      ]);
      await insertSourceData(targetClient,source,definitionId,releaseId,baseline);
      await targetClient.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256
      ) select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
        encode(extensions.digest(convert_to($2||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex')
      from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId,CONTRACT,PREDECESSOR_RELEASE_ID]);
      await targetClient.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256
      ) values($1,$2,$3,'R45_LAMINATE_R58_PROMOTION',$1,'flooring','CANONICAL_SUCCESSOR',$4,true,true,$5,$6)`, [
        releaseId,CATALOG_ID,definitionId,baseline.id,source.definition.definition_sha256,
        shaObject({contract:CONTRACT,catalogId:CATALOG_ID,definitionId,baselineId:baseline.id}),
      ]);
      const counts = (await targetClient.query(`select count(*)::int definitions,
        count(*) filter(where baseline_ready and scenario_ready and approved_template_baseline_id is not null)::int ready,
        count(*) filter(where upper(source_batch) like 'BATCH009%')::int batch009,
        count(distinct catalog_id)::int unique_catalogs
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0] as Json;
      invariant(counts.definitions === 4273 && counts.ready === 4273 && counts.unique_catalogs === 4273
        && counts.batch009 === 0, `R58_LAMINATE_MANIFEST_COUNTS:${stableJson(counts)}`);
      await targetClient.query(`update public.estimate_definition_release set
        status='prepared',sealed_at=now(),metadata=metadata||$2::jsonb where id=$1 and status='draft'`, [
        releaseId,JSON.stringify({preparedAt:new Date().toISOString(),manifestCounts:counts,
          lifecycle:"PREPARED_FOR_LAMINATE_BACKEND_GATE_NOT_ACTIVE"}),
      ]);
      writesApplied = 1;
    }
    const target = await loadTargetProjection(targetClient,definitionId);
    const parity = {
      passport: shaObject(source.definition.passport) === shaObject(target.definition.passport),
      applicability: shaObject(source.definition.applicability) === shaObject(target.definition.applicability),
      sourceMetadata: shaObject(source.definition.source_metadata) === shaObject(target.definition.source_metadata),
      parameters: shaObject(source.parameters.map(businessParameter)) === shaObject(target.parameters.map(businessParameter)),
      formulas: shaObject(source.formulas.map(comparableFormula)) === shaObject(target.formulas.map(comparableFormula)),
      resources: shaObject(source.resources.map(comparableResource)) === shaObject(target.resources.map(comparableResource)),
      normativeBindings: shaObject(source.normativeBindings) === shaObject(target.normativeBindings),
      priceBindings: shaObject(source.priceBindings) === shaObject(target.priceBindings),
    };
    invariant(Object.values(parity).every(Boolean), `R58_LAMINATE_PARITY_RED:${stableJson(parity)}`);
    const proof = {
      schemaVersion:CONTRACT,capturedAt:new Date().toISOString(),specSha256:SPEC_SHA256,
      source:{branch,head,tree,descendantOf691acb78:true},sourceDatabase:"p0_r45_acceptance_full_20260817",
      sourceDefinitionVersionId:source.definition.id,sourceDefinitionSha256:source.definition.definition_sha256,
      targetDatabase:"batch009_fire_r5_a",predecessorReleaseId:PREDECESSOR_RELEASE_ID,
      candidateReleaseId:releaseId,catalogId:CATALOG_ID,definitionVersionId:definitionId,
      approvedTemplateBaselineId:baseline.id,counts:{parameters:5,formulas:4,resources:6,
        normativeBindings:11,priceRoutes:6},parity,
      businessSemanticsUnchanged:true,formulasUnchanged:true,quantitiesAndUnitsUnchanged:true,
      inclusionLogicUnchanged:true,normativeSourcesUnchanged:true,costOwnersUnchanged:true,
      parameterAdmissionMetadataOnlyChanges:5,
      historicalR45LocalAcceptanceFlagRetained:true,r58PromotionAuthority:SPEC_SHA256,
      activeReleaseSwitched:false,searchCutover:false,runtime8081Switched:false,
      writesApplied:APPLY ? writesApplied : 0,idempotent,
      status:APPLY ? "GREEN_R58_LAMINATE_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_R58_LAMINATE_PROMOTION_DRY_RUN_ROLLED_BACK",
    };
    if (APPLY) await targetClient.query("commit"); else await targetClient.query("rollback");
    writeJson(OUTPUT,proof);
    process.stdout.write(`${JSON.stringify(proof,null,2)}\n`);
  } catch (error) {
    await targetClient.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

void main().catch((error:unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode=1;
});
