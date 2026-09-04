import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  bindCanonicalFormulaSource,
  canonicalFixedQuantityStatedBySource,
} from "../../../src/lib/estimate/backendPlatform/canonicalFormulaSourceBinding";
import {
  compileFormulaGraph,
  evaluateFormulaGraph,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";

type Json = Record<string, any>;

type ParameterContract = {
  id: string;
  valueType: "decimal" | "integer";
  unitId: string;
  titleRu: string;
  required: boolean;
  defaultValue: number;
  constraints: Json;
  guideKind: string;
  sourceRole: string;
  guideRu: string;
};

type RepairContract = {
  schemaVersion: string;
  masterSha256: string;
  predecessorDefinitionReleaseId: string;
  predecessorSearchReleaseId: string;
  repairedCatalogId: string;
  sourceDefinitionVersionId: string;
  primaryMeasureParameterId: string;
  referenceInputs: Record<string, number>;
  sensitivityInputs: Array<Record<string, number>>;
  parameters: ParameterContract[];
  policy: Json;
};

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A5_EXACT_VERTICAL_CATEGORY_ROWS_CONFIRM_RUNTIME_DURABILITY_CANONICAL_MONOLITH_GLOBAL_CLOSEOUT_RU.md",
);
const CONTRACT_PATH = resolve("data/estimate-benchmarks/r568-r4-a5-formula-successor-contract.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const EVIDENCE_ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1",
);
const OUTPUT = resolve(EVIDENCE_ROOT, "12_FORMULA_DEPENDENCY_SUCCESSOR.json");
const CONTRACT_ID = "r568-r4-a5-immutable-formula-dependency-successor.v1";
const APPLY = process.argv.includes("--apply");
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const MANAGED_SOURCE_PATHS = [
  "data/estimate-benchmarks/r568-r4-a5-checkpoint-include-manifest.json",
  "data/estimate-benchmarks/r568-r4-a5-formula-successor-contract.json",
  "scripts/estimate/p0TruthRemediationR5/prepareR4A5FormulaDependencySuccessor.ts",
  "scripts/estimate/p0TruthRemediationR5/auditFrozenFormulaDependenciesR4A5.ts",
  "scripts/estimate/r555/buildR555CumulativeSuccessorPayload.ts",
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "scripts/dev/ensureLocalDeveloperCanonicalBackend.ts",
  "supabase/functions/canonical-estimate-worker/index.ts",
  "src/features/consumerRepair/ConsumerRepairItemRow.tsx",
  "src/features/consumerRepair/ConsumerRepairRequestScreen.styles.ts",
  "src/features/consumerRepair/RequestEstimateItemsEditor.tsx",
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  "src/features/consumerRepair/requestEstimateViewModel.ts",
  "src/features/requests/components/ProfessionalBoqFullDetailDrawer.tsx",
  "src/features/requests/components/ProfessionalBoqGroupedMainView.tsx",
  "src/features/requests/components/ProfessionalBoqSectionSummary.tsx",
  "src/lib/estimate/backendPlatform/canonicalEstimateClient.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts",
  "src/lib/estimate/backendPlatform/canonicalFormulaSourceBinding.ts",
  "src/lib/estimate/backendPlatform/contracts.ts",
  "src/lib/estimate/publicBoqNaming.ts",
  "src/lib/estimate/semanticBoqGate.ts",
] as const;

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

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function sourceFingerprint(contractBytes: Buffer): string {
  const source = MANAGED_SOURCE_PATHS.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(path))),
  }));
  return shaObject({ contractBytesSha256: sha256(contractBytes), source });
}

function numericFormulaParameters(values: Record<string, number>): Record<string, string | number | bigint> {
  return values;
}

function exactNumber(value: string): number {
  const numeric = Number(value);
  invariant(Number.isFinite(numeric), `R4_A5_NON_FINITE_FORMULA_RESULT:${value}`);
  return numeric;
}

async function loadFrozenDefinitions(client: Client, releaseId: string): Promise<Json[]> {
  return (await client.query(`
    with definitions as (
      select manifest.catalog_id,manifest.definition_version_id
      from public.estimate_cumulative_manifest_entry manifest
      where manifest.release_id=$1 and manifest.baseline_ready and manifest.scenario_ready
    ), formula_stats as (
      select definition.catalog_id,definition.definition_version_id,
        count(formula.formula_id)::int formula_count,
        count(formula.formula_id) filter(where cardinality(formula.input_parameter_ids)>0)::int dynamic_formula_count
      from definitions definition
      join public.estimate_formula_graph formula on formula.definition_version_id=definition.definition_version_id
      group by definition.catalog_id,definition.definition_version_id
    ), parameter_stats as (
      select definition_version_id,
        count(*) filter(where truth_metadata->>'visibility_role'='USER_INPUT'
          and value_type in ('decimal','integer','number'))::int numeric_user_input_count
      from public.estimate_parameter_definition
      where definition_version_id=any(select definition_version_id from definitions)
      group by definition_version_id
    ), frozen as (
      select formula_stats.*
      from formula_stats left join parameter_stats using(definition_version_id)
      where formula_stats.formula_count>0 and formula_stats.dynamic_formula_count=0
        and coalesce(parameter_stats.numeric_user_input_count,0)>0
    )
    select frozen.*,
      count(*) filter(where coalesce(resource.source_metadata->>'originalQuantityFormula','')<>''
        and cardinality(formula.input_parameter_ids)=0)::int source_formula_count
    from frozen
    join public.estimate_resource_spec resource on resource.definition_version_id=frozen.definition_version_id
    join public.estimate_formula_graph formula on formula.definition_version_id=resource.definition_version_id
      and formula.formula_id=resource.formula_id
    group by frozen.catalog_id,frozen.definition_version_id,frozen.formula_count,frozen.dynamic_formula_count
    order by frozen.catalog_id
  `, [releaseId])).rows as Json[];
}

async function cloneSearchIndex(input: {
  client: Client;
  contract: RepairContract;
  releaseId: string;
  searchReleaseId: string;
  definitionId: string;
  frozenCatalogIds: string[];
  head: string;
  tree: string;
  sourceFingerprint: string;
}): Promise<Json> {
  const { client, contract } = input;
  const predecessor = (await client.query(
    "select * from public.estimate_search_index_release where id=$1",
    [contract.predecessorSearchReleaseId],
  )).rows[0] as Json | undefined;
  invariant(predecessor?.status === "draft", "R4_A5_PREDECESSOR_SEARCH_RELEASE_DRIFT");
  const releaseKey = `r568-r4-a5-formula-successor-${input.sourceFingerprint.slice(0, 12)}:search`;
  await client.query(`insert into public.estimate_search_index_release(
    id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
    source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata
  ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`, [
    input.searchReleaseId,
    releaseKey,
    predecessor.taxonomy_version,
    predecessor.group_relation_version,
    predecessor.ranking_contract_version,
    input.head,
    input.tree,
    input.sourceFingerprint,
    predecessor.global_count,
    predecessor.external_count,
    predecessor.discovered_count,
    JSON.stringify({
      ...predecessor.metadata,
      contract: CONTRACT_ID,
      masterSha256: contract.masterSha256,
      definitionReleaseId: input.releaseId,
      parentSearchReleaseId: contract.predecessorSearchReleaseId,
      frozenDefinitionDisposition: "QUARANTINED_NOT_SELECTABLE",
      quarantinedDefinitionCount: input.frozenCatalogIds.length - 1,
      repairedCatalogId: contract.repairedCatalogId,
      sourceFingerprint: input.sourceFingerprint,
      activationAllowed: false,
      productionEligible: false,
    }),
  ]);
  await client.query(`insert into public.estimate_search_group(
    search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
    work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
  ) select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
    work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId,
    contract.predecessorSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_document(
    search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
    group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
    primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,
    publication_state,catalog_origin,definition_release_id,short_scope_ru,
    key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,
    excluded_boundaries,replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,
    normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance,
    document_sha256,adjudication_class,selectable,canonical_target_catalog_id,definition_version_id
  ) select $1,document.catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
    group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
    primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,
    case when document.catalog_id=any($2::text[]) and document.catalog_id<>$3
      then 'PRELIMINARY_NOT_CANONICAL' else publication_state end,
    catalog_origin,$4::uuid,short_scope_ru,key_distinguishing_parameters,
    case when document.catalog_id=$3 then $5 else required_inputs_count end,
    clarification_fields,included_boundaries,excluded_boundaries,replacement_catalog_id,
    normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,
    normalized_search_blob,
    source_provenance||jsonb_build_object(
      'contract',$6::text,'definitionReleaseId',($4::uuid)::text,'parentSearchReleaseId',($7::uuid)::text,
      'sourceFingerprint',$8::text,
      'formulaDependencyDisposition',case when document.catalog_id=$3 then 'IMMUTABLE_SUCCESSOR'
        when document.catalog_id=any($2::text[]) then 'QUARANTINED' else 'INHERITED' end),
    encode(extensions.digest(convert_to(document.document_sha256||':'||$6::text||':'||($4::uuid)::text||':'||
      case when document.catalog_id=$3 then ($9::uuid)::text else coalesce(document.definition_version_id::text,'') end||':'||
      case when document.catalog_id=any($2::text[]) and document.catalog_id<>$3 then 'QUARANTINED' else 'ADMITTED' end,
      'UTF8'),'sha256'),'hex'),
    case when document.catalog_id=any($2::text[]) and document.catalog_id<>$3
      then 'QUARANTINED' else adjudication_class end,
    case when document.catalog_id=any($2::text[]) and document.catalog_id<>$3
      then false else selectable end,
    canonical_target_catalog_id,
    case when document.catalog_id=$3 then $9::uuid else definition_version_id end
    from public.estimate_search_document document where search_release_id=$7::uuid`, [
    input.searchReleaseId,
    input.frozenCatalogIds,
    contract.repairedCatalogId,
    input.releaseId,
    contract.parameters.filter((parameter) => parameter.required).length,
    CONTRACT_ID,
    contract.predecessorSearchReleaseId,
    input.sourceFingerprint,
    input.definitionId,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
    search_release_id,group_id,catalog_id,ordinal,independent_disposition
  ) select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId,
    contract.predecessorSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
    search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,
    source_locator,applicability_predicate,required_when,mutually_exclusive_with,
    explanation_ru,relation_sha256
  ) select $1,source_catalog_id,target_catalog_id,relationship_type,direction,
    source_locator,applicability_predicate,required_when,mutually_exclusive_with,
    explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId,
    contract.predecessorSearchReleaseId,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
    search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,
    prompt_ru,answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,
    source_locator,required,sequence
  ) select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,
    prompt_ru,answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,
    source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId,
    contract.predecessorSearchReleaseId,
  ]);
  const snapshot = (await client.query(`select
    encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256,
    count(*)::int document_count,
    count(*) filter(where selectable)::int selectable_count,
    count(*) filter(where adjudication_class='QUARANTINED')::int quarantined_count
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(
    "update public.estimate_search_index_release set snapshot_sha256=$2 where id=$1 and status='draft'",
    [input.searchReleaseId, snapshot.snapshot_sha256],
  );
  return snapshot;
}

async function main(): Promise<void> {
  const contractBytes = readFileSync(CONTRACT_PATH);
  const contract = JSON.parse(contractBytes.toString("utf8")) as RepairContract;
  invariant(sha256(readFileSync(MASTER_PATH)) === contract.masterSha256, "R4_A5_MASTER_SHA256_DRIFT");
  invariant(contract.schemaVersion === "r568-r4-a5-formula-successor-contract.v1", "R4_A5_CONTRACT_VERSION_DRIFT");
  invariant(contract.policy.baselineNumberSubstitution === "FORBIDDEN"
    && contract.policy.calibratedFormulaSubstitution === "FORBIDDEN"
    && contract.policy.unresolvedFormulaParameter === "REJECT", "R4_A5_FALLBACK_POLICY_RED");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R4_A5_BRANCH_DRIFT:${branch}`);
  const fingerprint = sourceFingerprint(contractBytes);
  if (APPLY) {
    for (const path of MANAGED_SOURCE_PATHS) {
      invariant(git(["ls-files", "--error-unmatch", "--", path]) === path, `R4_A5_UNTRACKED_APPLY_SOURCE:${path}`);
      invariant(git(["diff", "--", path]) === "", `R4_A5_DIRTY_APPLY_SOURCE:${path}`);
    }
  }
  const releaseKey = `r568-r4-a5-formula-successor-${fingerprint.slice(0, 12)}`;
  const releaseId = uuid(`${CONTRACT_ID}:release:${fingerprint}`);
  const searchReleaseId = uuid(`${CONTRACT_ID}:search:${fingerprint}`);
  const definitionId = uuid(`${CONTRACT_ID}:definition:${contract.repairedCatalogId}:${fingerprint}`);
  const baselineId = uuid(`${CONTRACT_ID}:baseline:${contract.repairedCatalogId}:${fingerprint}`);
  const parameterIds = new Set(contract.parameters.map((parameter) => parameter.id));
  invariant(parameterIds.has(contract.primaryMeasureParameterId), "R4_A5_PRIMARY_MEASURE_PARAMETER_MISSING");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "r4-a5-formula-successor-apply" : "r4-a5-formula-successor-dry-run",
  });
  await client.connect();
  let proof: Json;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='300s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT_ID]);
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [contract.predecessorDefinitionReleaseId],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "R4_A5_PREDECESSOR_RELEASE_DRIFT");
    const existing = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1",
      [releaseKey],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared", "R4_A5_EXISTING_SUCCESSOR_DRIFT");
      const search = (await client.query(
        "select * from public.estimate_search_index_release where id=$1",
        [searchReleaseId],
      )).rows[0] as Json | undefined;
      invariant(search?.status === "draft", "R4_A5_EXISTING_SEARCH_SUCCESSOR_DRIFT");
      proof = {
        schemaVersion: "r568-r4-a5-formula-dependency-successor-receipt.v1",
        capturedAt: new Date().toISOString(),
        mode: APPLY ? "APPLY" : "DRY_RUN",
        idempotent: true,
        source: { branch, head, tree, fingerprint },
        releaseId,
        searchReleaseId,
        definitionId,
        status: "GREEN_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE",
        productionReady: false,
      };
    } else {
      const source = (await client.query(
        "select * from public.estimate_definition_version where id=$1 and catalog_id=$2",
        [contract.sourceDefinitionVersionId, contract.repairedCatalogId],
      )).rows[0] as Json | undefined;
      invariant(source?.content_gate_status === "GREEN", "R4_A5_SOURCE_DEFINITION_DRIFT");
      const sourceParameters = (await client.query(`select * from public.estimate_parameter_definition
        where definition_version_id=$1 order by ordinal`, [source.id])).rows as Json[];
      const sourceFormulas = (await client.query(`select * from public.estimate_formula_graph
        where definition_version_id=$1 order by formula_id`, [source.id])).rows as Json[];
      const sourceResources = (await client.query(`select * from public.estimate_resource_spec
        where definition_version_id=$1 order by ordinal,row_id`, [source.id])).rows as Json[];
      const sourceBaseline = (await client.query(`select * from public.estimate_approved_template_baseline
        where id=(select approved_template_baseline_id from public.estimate_cumulative_manifest_entry
          where release_id=$1 and catalog_id=$2)`, [
        contract.predecessorDefinitionReleaseId,
        contract.repairedCatalogId,
      ])).rows[0] as Json | undefined;
      const priceBindings = (await client.query(`select binding.*,resource.row_id
        from public.estimate_resource_price_route_binding binding
        join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
        where resource.definition_version_id=$1 order by resource.ordinal,binding.priority,binding.price_key`, [source.id])).rows as Json[];
      invariant(sourceParameters.length === 5 && sourceFormulas.length === 45
        && sourceResources.length === 45 && priceBindings.length === 45 && sourceBaseline,
      `R4_A5_SOURCE_COUNTS:${sourceParameters.length}/${sourceFormulas.length}/${sourceResources.length}/${priceBindings.length}`);
      const categoryCounts = Object.fromEntries([...new Set(sourceResources.map((row) => row.category))]
        .sort().map((category) => [category, sourceResources.filter((row) => row.category === category).length]));
      invariant(stableJson(categoryCounts) === stableJson({ equipment: 7, material: 22, service: 9, transport: 3, work: 4 }),
        `R4_A5_CATEGORY_COUNT_DRIFT:${stableJson(categoryCounts)}`);

      const sourceFormulaById = new Map(sourceFormulas.map((formula) => [String(formula.formula_id), formula]));
      const compiledFormulas = sourceResources.map((resource) => {
        const originalSource = String(resource.source_metadata?.originalQuantityFormula ?? "").trim();
        invariant(originalSource, `R4_A5_ORIGINAL_FORMULA_MISSING:${resource.row_id}`);
        const expression = bindCanonicalFormulaSource({ source: originalSource, parameterIds });
        const compiled = compileFormulaGraph(expression);
        const oldFormula = sourceFormulaById.get(String(resource.formula_id));
        invariant(oldFormula, `R4_A5_SOURCE_FORMULA_MISSING:${resource.formula_id}`);
        const referenceValue = evaluateFormulaGraph(compiled.ast, numericFormulaParameters(contract.referenceInputs));
        const frozenValue = evaluateFormulaGraph(oldFormula.ast, {});
        invariant(referenceValue === frozenValue,
          `R4_A5_REFERENCE_PARITY_RED:${resource.row_id}:${frozenValue}:${referenceValue}`);
        if (canonicalFixedQuantityStatedBySource(originalSource) == null) {
          invariant(compiled.inputParameterIds.length > 0, `R4_A5_DEPENDENCY_MISSING:${resource.row_id}`);
        }
        return {
          formula_id: resource.formula_id,
          output_unit_id: oldFormula.output_unit_id,
          expression_source: expression,
          ast: compiled.ast,
          input_parameter_ids: compiled.inputParameterIds,
          ast_sha256: shaObject(compiled.ast),
          reference_value: referenceValue,
        };
      });
      const formulaById = new Map(compiledFormulas.map((formula) => [String(formula.formula_id), formula]));
      const formulaConsumers = Object.fromEntries(contract.parameters.map((parameter) => [
        parameter.id,
        compiledFormulas.filter((formula) => formula.input_parameter_ids.includes(parameter.id))
          .map((formula) => formula.formula_id).sort(),
      ]));
      const resourceConsumers = Object.fromEntries(contract.parameters.map((parameter) => [
        parameter.id,
        sourceResources.filter((resource) => formulaById.get(String(resource.formula_id))!
          .input_parameter_ids.includes(parameter.id)).map((resource) => resource.row_id).sort(),
      ]));
      invariant(Object.values(formulaConsumers).every((ids) => ids.length > 0)
        && Object.values(resourceConsumers).every((ids) => ids.length > 0), "R4_A5_PARAMETER_CONSUMER_RED");
      const parameterSchemaSha256 = shaObject(contract.parameters);
      const sensitivity = contract.sensitivityInputs.map((parameters) => ({
        parameters,
        rows: sourceResources.map((resource) => ({
          rowId: resource.row_id,
          quantity: exactNumber(evaluateFormulaGraph(
            formulaById.get(String(resource.formula_id))!.ast,
            numericFormulaParameters(parameters),
          )),
        })),
      }));
      const covering = sensitivity.map((scenario) => scenario.rows.find((row) => row.rowId === "covering_area_m2")?.quantity);
      invariant(stableJson(covering) === stableJson([108, 216, 324]), `R4_A5_SENSITIVITY_RED:${stableJson(covering)}`);
      const acceptanceEvidenceSha256 = shaObject({
        contract: CONTRACT_ID,
        sourceDefinitionVersionId: source.id,
        definitionId,
        parameterSchemaSha256,
        formulaConsumers,
        resourceConsumers,
        sensitivity,
        sourceFingerprint: fingerprint,
      });
      const parameterRows = contract.parameters.map((parameter, ordinal) => ({
        ...parameter,
        ordinal,
        truth_metadata: {
          guide: {
            guide_kind: parameter.guideKind,
            source_role: parameter.sourceRole,
            verified_at: "2026-09-04T00:00:00+06:00",
            applicability: source.passport?.titleRu ?? contract.repairedCatalogId,
            guide_version: "R568_R4_A5_V1",
            guide_short_ru: parameter.guideRu,
            source_snapshot_hash: fingerprint,
          },
          provenance: {
            baselineOwner: "approved-template-baseline:r54",
            sourceCatalogId: contract.repairedCatalogId,
            sourceReleaseId: releaseId,
            sourceDefinitionVersionId: source.id,
            sourceParameterSchemaId: parameterSchemaSha256,
            approvedTemplateBaselineId: baselineId,
            acceptanceEvidenceSha256,
            approvedTemplateBinding: {
              contract: CONTRACT_ID,
              sourceTree: fingerprint,
              payloadValidationSha256: acceptanceEvidenceSha256,
            },
          },
          visibility_role: "USER_INPUT",
          formula_consumers: formulaConsumers[parameter.id],
          resource_branch_consumers: resourceConsumers[parameter.id],
          value_source_role: "VISIBLE_BASELINE_ASSUMPTION",
          baseline_assumption_id: `${baselineId}:${parameter.id}`,
          semantic_parameter_key: `${contract.repairedCatalogId}:${parameter.id}`,
        },
      }));
      const newResources = sourceResources.map((resource) => {
        const formula = formulaById.get(String(resource.formula_id))!;
        const id = uuid(`${CONTRACT_ID}:resource:${contract.repairedCatalogId}:${resource.row_id}:${fingerprint}`);
        const sourceMetadata = {
          ...resource.source_metadata,
          formulaDependencyRepair: {
            contract: CONTRACT_ID,
            sourceDefinitionVersionId: source.id,
            originalQuantityFormula: resource.source_metadata.originalQuantityFormula,
            compiledExpression: formula.expression_source,
            inputParameterIds: formula.input_parameter_ids,
            baselineNumberSubstitution: "FORBIDDEN",
            sourceFingerprint: fingerprint,
          },
        };
        const comparable = {
          row_id: resource.row_id,
          ordinal: resource.ordinal,
          section: resource.section,
          category: resource.category,
          title_ru: resource.title_ru,
          row_type: resource.row_type,
          unit_id: resource.unit_id,
          formula_id: resource.formula_id,
          inclusion_ast: resource.inclusion_ast,
          resource_graph: resource.resource_graph,
          semantic_owner: resource.semantic_owner,
          cost_owner_id: resource.cost_owner_id,
          procurement_eligible: resource.procurement_eligible,
          source_metadata: sourceMetadata,
        };
        return { id, ...comparable, row_sha256: shaObject(comparable) };
      });
      const definitionVersion = Number(source.definition_version) + 1;
      const definitionHash = shaObject({
        catalogId: contract.repairedCatalogId,
        definitionVersion,
        parameters: parameterRows.map((row) => ({ ...row, truth_metadata: row.truth_metadata })),
        formulas: compiledFormulas.map(({ reference_value: _reference, ...formula }) => formula),
        resources: newResources,
      });
      const manifestSha256 = shaObject({
        contract: CONTRACT_ID,
        predecessorManifest: predecessor.source_manifest_sha256,
        repairedCatalogId: contract.repairedCatalogId,
        definitionHash,
        quarantinedDefinitionCount: 85,
        sourceFingerprint: fingerprint,
      });
      const releaseMetadata = {
        ...predecessor.metadata,
        contract: CONTRACT_ID,
        masterSha256: contract.masterSha256,
        parentReleaseId: contract.predecessorDefinitionReleaseId,
        repairedCatalogId: contract.repairedCatalogId,
        sourceDefinitionVersionId: source.id,
        formulaDependencyPolicy: contract.policy,
        sourceFingerprint: fingerprint,
        quarantinedFrozenDefinitions: 85,
        activationAllowed: false,
        productionEligible: false,
        localDisposable: true,
      };
      await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
        definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
        parameter_count,formula_count
      ) values($1,$2,6,'draft',$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12)`, [
        releaseId,
        releaseKey,
        head,
        fingerprint,
        manifestSha256,
        predecessor.definition_count,
        predecessor.resource_row_count,
        JSON.stringify(releaseMetadata),
        contract.predecessorDefinitionReleaseId,
        shaObject({ manifestSha256, definitionHash, sensitivity }),
        Number(predecessor.parameter_count) - sourceParameters.length + parameterRows.length,
        predecessor.formula_count,
      ]);
      await client.query(`insert into public.estimate_definition_version(
        id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
        source_metadata,content_status,content_gate_status
      ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
        definitionId,
        releaseId,
        contract.repairedCatalogId,
        definitionVersion,
        JSON.stringify({
          ...source.passport,
          contract: CONTRACT_ID,
          parameterCount: parameterRows.length,
          rowCount: newResources.length,
          formulaDependencyPolicy: "STRICT_PARAMETER_GRAPH_NO_NUMERIC_SUBSTITUTION",
        }),
        JSON.stringify(source.applicability),
        definitionHash,
        JSON.stringify({
          ...source.source_metadata,
          contract: CONTRACT_ID,
          sourceDefinitionVersionId: source.id,
          sourceFingerprint: fingerprint,
          immutableFormulaSuccessor: true,
          baselineNumberSubstitution: "FORBIDDEN",
        }),
      ]);
      const normativeSourceIds = Object.fromEntries(contract.parameters.map((parameter) => [
        parameter.id,
        [...new Set(Object.values(sourceBaseline.normative_source_ids ?? {}).flat())],
      ]));
      const baseline = {
        id: baselineId,
        baselineKey: `${CONTRACT_ID}:${fingerprint.slice(0, 16)}:${sha256(contract.repairedCatalogId).slice(0, 16)}`,
        inputValues: contract.referenceInputs,
        inputClassification: Object.fromEntries(contract.parameters.map((parameter) => [parameter.id, "ASSUMPTION"])),
        uomByParameter: Object.fromEntries(contract.parameters.map((parameter) => [parameter.id, parameter.unitId])),
        formulaConsumers,
        resourceConsumers,
        normativeSourceIds,
        guideProvenanceRu: Object.fromEntries(contract.parameters.map((parameter) => [parameter.id, parameter.guideRu])),
        validationScenarioRefs: [{
          contract: CONTRACT_ID,
          scenario: "AREA_100_200_300_EXACT_FORMULA_SENSITIVITY",
          rowCount: 45,
          categoryCounts,
          coveringAreaQuantities: covering,
          sensitivitySha256: shaObject(sensitivity),
        }],
      };
      await client.query(`insert into public.estimate_approved_template_baseline(
        id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
        parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
        formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
        proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,
        accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
      ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
        $12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,
        'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
        baseline.id,
        baseline.baselineKey,
        contract.repairedCatalogId,
        definitionId,
        source.id,
        parameterSchemaSha256,
        JSON.stringify(baseline.inputValues),
        JSON.stringify(baseline.inputClassification),
        JSON.stringify(baseline.uomByParameter),
        JSON.stringify(baseline.formulaConsumers),
        JSON.stringify(baseline.resourceConsumers),
        JSON.stringify(baseline.normativeSourceIds),
        JSON.stringify(baseline.guideProvenanceRu),
        JSON.stringify([{
          contract: CONTRACT_ID,
          sourceDefinitionVersionId: source.id,
          sourceDefinitionSha256: source.definition_sha256,
          sourceFingerprint: fingerprint,
        }]),
        JSON.stringify(baseline.validationScenarioRefs),
        acceptanceEvidenceSha256,
        releaseId,
        sourceBaseline.id,
      ]);
      for (const row of parameterRows) {
        await client.query(`insert into public.estimate_parameter_definition(
          definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
          default_value,constraints_json,truth_metadata,approved_template_baseline_id
        ) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11)`, [
          definitionId,
          row.id,
          row.ordinal,
          row.valueType,
          row.unitId,
          row.titleRu,
          row.required,
          JSON.stringify(row.defaultValue),
          JSON.stringify(row.constraints),
          JSON.stringify(row.truth_metadata),
          baselineId,
        ]);
      }
      for (const formula of compiledFormulas) {
        await client.query(`insert into public.estimate_formula_graph(
          definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
        ) values($1,$2,$3,$4,$5::jsonb,$6::text[],$7)`, [
          definitionId,
          formula.formula_id,
          formula.output_unit_id,
          formula.expression_source,
          JSON.stringify(formula.ast),
          formula.input_parameter_ids,
          formula.ast_sha256,
        ]);
      }
      for (const resource of newResources) {
        await client.query(`insert into public.estimate_resource_spec(
          id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,
          formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
          procurement_eligible,source_metadata,row_sha256
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16::jsonb,$17)`, [
          resource.id,
          definitionId,
          resource.row_id,
          resource.ordinal,
          resource.section,
          resource.category,
          resource.title_ru,
          resource.row_type,
          resource.unit_id,
          resource.formula_id,
          JSON.stringify(resource.inclusion_ast),
          JSON.stringify(resource.resource_graph),
          resource.semantic_owner,
          resource.cost_owner_id,
          resource.procurement_eligible,
          JSON.stringify(resource.source_metadata),
          resource.row_sha256,
        ]);
      }
      const newResourceByRowId = new Map(newResources.map((resource) => [String(resource.row_id), resource]));
      for (const binding of priceBindings) {
        await client.query(`insert into public.estimate_resource_price_route_binding(
          resource_spec_id,route_id,price_key,priority
        ) values($1,$2,$3,$4)`, [
          newResourceByRowId.get(String(binding.row_id))!.id,
          binding.route_id,
          binding.price_key,
          binding.priority,
        ]);
      }
      const contentPassportPayload = {
        contract: "real-professional-estimates-r3.content-passport.v1",
        identityMode: "WORK",
        catalogId: contract.repairedCatalogId,
        physicalResultRu: source.passport?.workDescription?.titleRu ?? source.passport?.titleRu,
        includedScopeRu: source.applicability?.includedScopeRu ?? [],
        excludedScopeRu: source.applicability?.excludedScopeRu ?? [],
        parameterCount: parameterRows.length,
        formulaCount: compiledFormulas.length,
        resourceCount: newResources.length,
        formulaDependencyPolicy: "STRICT_PARAMETER_GRAPH_NO_NUMERIC_SUBSTITUTION",
        sourceFingerprint: fingerprint,
      };
      await client.query(`insert into public.estimate_content_passport_r3(
        definition_version_id,release_id,catalog_id,contract_version,identity_mode,
        redirect_catalog_id,physical_result_ru,included_scope_ru,excluded_scope_ru,
        capability_matrix,parameter_count,formula_count,resource_count,decision,
        payload_sha256,source_head,source_tree
      ) values($1,$2,$3,'real-professional-estimates-r3.content-passport.v1','WORK',null,$4,
        $5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11::jsonb,$12,$13,$14)`, [
        definitionId,
        releaseId,
        contract.repairedCatalogId,
        contentPassportPayload.physicalResultRu,
        JSON.stringify(contentPassportPayload.includedScopeRu),
        JSON.stringify(contentPassportPayload.excludedScopeRu),
        JSON.stringify([
          { capability: "PARAMETERS", status: "GREEN" },
          { capability: "FORMULAS", status: "GREEN" },
          { capability: "RESOURCES", status: "GREEN" },
          { capability: "PRICE_AND_PROCUREMENT", status: "GREEN_WITH_LOCAL_ACCEPTANCE_SNAPSHOT" },
        ]),
        contentPassportPayload.parameterCount,
        contentPassportPayload.formulaCount,
        contentPassportPayload.resourceCount,
        JSON.stringify({
          contract: "real-professional-estimates-r3.content-passport.v1",
          status: "GREEN",
          allowed: true,
          formulaDependencyContract: CONTRACT_ID,
          baselineNumberSubstitution: "FORBIDDEN",
          exactReferenceParity: "45/45",
        }),
        shaObject(contentPassportPayload),
        head,
        fingerprint,
      ]);
      await client.query(`update public.estimate_definition_version
        set content_status='CANDIDATE_READY',content_gate_status='GREEN'
        where id=$1 and release_id=$2 and content_status='QUARANTINED' and content_gate_status='RED'`, [
        definitionId,
        releaseId,
      ]);
      const frozen = await loadFrozenDefinitions(client, contract.predecessorDefinitionReleaseId);
      const frozenCatalogIds = frozen.map((entry) => String(entry.catalog_id));
      invariant(frozenCatalogIds.length === 86 && frozenCatalogIds.includes(contract.repairedCatalogId),
        `R4_A5_FROZEN_DENOMINATOR_DRIFT:${frozenCatalogIds.length}`);
      await client.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
        definition_hash,entry_sha256,runtime_publication_state
      ) select $1,manifest.catalog_id,
        case when manifest.catalog_id=$2 then $3 else manifest.definition_version_id end,
        manifest.source_batch,manifest.source_release_id,manifest.domain_id,
        case when manifest.catalog_id=$2 then 'CANONICAL_SUCCESSOR' else manifest.publication_state end,
        case when manifest.catalog_id=$2 then $4 else manifest.approved_template_baseline_id end,
        case when manifest.catalog_id=any($5::text[]) and manifest.catalog_id<>$2 then false else manifest.baseline_ready end,
        case when manifest.catalog_id=any($5::text[]) and manifest.catalog_id<>$2 then false else manifest.scenario_ready end,
        case when manifest.catalog_id=$2 then $6 else manifest.definition_hash end,
        encode(extensions.digest(convert_to($7||':'||manifest.catalog_id||':'||
          case when manifest.catalog_id=$2 then $6 else manifest.entry_sha256 end||':'||
          case when manifest.catalog_id=any($5::text[]) and manifest.catalog_id<>$2 then 'QUARANTINED' else 'ADMITTED' end,
          'UTF8'),'sha256'),'hex'),
        case when manifest.catalog_id=any($5::text[]) and manifest.catalog_id<>$2 then 'QUARANTINED'
          when manifest.catalog_id=$2 then 'CANDIDATE' else manifest.runtime_publication_state end
        from public.estimate_cumulative_manifest_entry manifest where manifest.release_id=$8`, [
        releaseId,
        contract.repairedCatalogId,
        definitionId,
        baselineId,
        frozenCatalogIds,
        definitionHash,
        CONTRACT_ID,
        contract.predecessorDefinitionReleaseId,
      ]);
      const manifestCounts = (await client.query(`select count(*)::int definitions,
        count(*) filter(where baseline_ready and scenario_ready)::int ready,
        count(*) filter(where runtime_publication_state='QUARANTINED')::int quarantined,
        count(*) filter(where catalog_id=$2 and definition_version_id=$3
          and baseline_ready and scenario_ready)::int repaired
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [
        releaseId,
        contract.repairedCatalogId,
        definitionId,
      ])).rows[0] as Json;
      invariant(Number(manifestCounts.definitions) === 10_331 && Number(manifestCounts.quarantined) === 85
        && Number(manifestCounts.repaired) === 1, `R4_A5_MANIFEST_COUNTS_RED:${stableJson(manifestCounts)}`);
      const searchSnapshot = await cloneSearchIndex({
        client,
        contract,
        releaseId,
        searchReleaseId,
        definitionId,
        frozenCatalogIds,
        head,
        tree,
        sourceFingerprint: fingerprint,
      });
      invariant(Number(searchSnapshot.quarantined_count) >= 85, `R4_A5_SEARCH_QUARANTINE_RED:${stableJson(searchSnapshot)}`);
      await client.query(`update public.estimate_definition_release set status='prepared',sealed_at=clock_timestamp(),
        metadata=metadata||$2::jsonb where id=$1 and status='draft'`, [
        releaseId,
        JSON.stringify({
          lifecycle: "PREPARED_NOT_ACTIVE",
          manifestCounts,
          searchReleaseId,
          searchSnapshot,
          exactRowCount: 45,
          exactCategoryCounts: categoryCounts,
          sensitivityCoveringArea: covering,
        }),
      ]);
      proof = {
        schemaVersion: "r568-r4-a5-formula-dependency-successor-receipt.v1",
        capturedAt: new Date().toISOString(),
        mode: APPLY ? "APPLY" : "DRY_RUN",
        idempotent: false,
        master: { path: MASTER_PATH, sha256: contract.masterSha256 },
        source: { branch, head, tree, fingerprint, managedPaths: MANAGED_SOURCE_PATHS },
        predecessor: {
          definitionReleaseId: contract.predecessorDefinitionReleaseId,
          searchReleaseId: contract.predecessorSearchReleaseId,
        },
        successor: { releaseId, searchReleaseId, definitionId, baselineId },
        repaired: {
          catalogId: contract.repairedCatalogId,
          primaryMeasureParameterId: contract.primaryMeasureParameterId,
          parameterIds: [...parameterIds],
          rowCount: newResources.length,
          formulaCount: compiledFormulas.length,
          priceRouteCount: priceBindings.length,
          categoryCounts,
          referenceParity: "45/45",
          coveringAreaSensitivity100_200_300: covering,
          formulaDependencyRows: compiledFormulas.filter((formula) => formula.input_parameter_ids.length > 0).length,
          explicitFixedQuantityRows: compiledFormulas.filter((formula) => formula.input_parameter_ids.length === 0).length,
        },
        systemicDisposition: {
          frozenDefinitionCount: frozenCatalogIds.length,
          repairedDefinitionCount: 1,
          quarantinedDefinitionCount: frozenCatalogIds.length - 1,
          silentFallbackAllowed: false,
        },
        manifestCounts,
        searchSnapshot,
        status: APPLY ? "GREEN_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_DRY_RUN_ROLLED_BACK",
        productionReady: false,
      };
    }
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    atomicJson(OUTPUT, proof);
    process.stdout.write(`${JSON.stringify({
      output: OUTPUT,
      status: proof.status,
      successor: proof.successor ?? { releaseId, searchReleaseId, definitionId, baselineId },
      repaired: proof.repaired,
      systemicDisposition: proof.systemicDisposition,
    }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
