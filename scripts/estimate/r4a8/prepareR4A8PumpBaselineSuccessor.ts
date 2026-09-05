import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A8_DEVELOPER_ACCESS_ESTIMATE_RECOVERY_CANONICAL_MONOLITH_RU.md",
);
const MASTER_SHA256 = "cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1";
const PREDECESSOR_RELEASE_ID = "3788cc88-701d-5cc9-9130-c61262cb9979";
const PREDECESSOR_SEARCH_RELEASE_ID = "3bb74464-9773-5364-a4f0-4e542b45f62a";
const PUMP_CATALOG_ID = "canonical-work:expanded:booster_pumping_station";
const CONTRACT = "rik-expo-app.r568.r4-a8-pump-empty-baseline-successor.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const ACCEPTANCE_FIXTURE_PATH = resolve(
  "data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json",
);
const OUTPUT_ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a8-developer-estimate-recovery-1",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const MANAGED_SOURCE_PATHS = [
  "data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json",
  "scripts/estimate/r4a8/prepareR4A8PumpBaselineSuccessor.contract.test.ts",
  "scripts/estimate/r4a8/prepareR4A8PumpBaselineSuccessor.ts",
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  "src/lib/ai/expandedComplexWorks/index.ts",
  "src/lib/estimate/r4A6PumpStationProfessional.ts",
  "supabase/migrations/20260905140000_r4a8_empty_approved_baseline.sql",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
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

function git(...args: string[]): string {
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

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
}): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::text,'sourceFingerprint',$9::text,
        'activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7::uuid`, [
    input.searchReleaseId,
    `${input.releaseKey}-search`,
    input.head,
    input.tree,
    sha256(`${input.searchReleaseId}:draft`),
    CONTRACT,
    PREDECESSOR_SEARCH_RELEASE_ID,
    input.releaseId,
    input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [input.searchReleaseId, PREDECESSOR_SEARCH_RELEASE_ID]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId,
    PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,source.catalog_id,source.domain_id,source.system_id,source.subsystem_id,source.assembly_id,
      source.work_family_id,source.group_id,source.subgroup_id,source.element_type,source.operation_kind,
      source.technology_variant,source.construction_state,source.primary_uom,source.canonical_name_ru,
      source.aliases,source.normative_classifiers,source.applicability_tags,source.publication_state,
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,
      source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,
        'UTF8'),'sha256'),'hex'),source.adjudication_class,source.selectable,
      source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2::uuid and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4::uuid`, [
    input.searchReleaseId,
    input.releaseId,
    CONTRACT,
    PREDECESSOR_SEARCH_RELEASE_ID,
    input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId,
    PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId,
    PREDECESSOR_SEARCH_RELEASE_ID,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),
        'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set
      snapshot_sha256=$2,metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({ lifecycle: "FROZEN_NOT_ACTIVE", documentCount: snapshot.documents, visibleCount: snapshot.visible }),
  ]);
  return snapshot;
}

async function audit(client: Client, releaseId: string, searchReleaseId: string): Promise<Json> {
  const release = (await client.query("select * from public.estimate_definition_release where id=$1", [releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int definitions,
      count(approved_template_baseline_id)::int baselines,
      count(*) filter(where baseline_ready and scenario_ready)::int ready,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),
        'UTF8'),'sha256'),'hex') manifest_sha256
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0] as Json;
  const pump = (await client.query(`select manifest.definition_version_id::text,
      manifest.approved_template_baseline_id::text,
      jsonb_object_length(baseline.input_values)::int baseline_values,
      jsonb_object_length(baseline.input_classification)::int baseline_classifications,
      (select count(*)::int from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=manifest.definition_version_id) parameters,
      (select count(*)::int from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=manifest.definition_version_id
          and parameter.truth_metadata->>'tier'='P0') p0_parameters,
      (select count(*)::int from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=manifest.definition_version_id
          and parameter.default_value is not null) defaults,
      (select count(*)::int from public.estimate_formula_graph formula
        where formula.definition_version_id=manifest.definition_version_id) formulas,
      (select count(*)::int from public.estimate_resource_spec resource
        where resource.definition_version_id=manifest.definition_version_id) resources
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_approved_template_baseline baseline
      on baseline.id=manifest.approved_template_baseline_id
    where manifest.release_id=$1 and manifest.catalog_id=$2`, [releaseId, PUMP_CATALOG_ID])).rows[0] as Json;
  const search = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      count(*) filter(where definition_release_id<>$2::uuid)::int release_binding_drift,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),
        'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [searchReleaseId, releaseId])).rows[0] as Json;
  invariant(release.status === "prepared" && Number(release.definition_count) === 10_331
    && Number(release.parameter_count) === 12_761 && Number(release.formula_count) === 615_875
    && Number(release.resource_row_count) === 615_879,
  `STOP_R4_A8_PUMP_RELEASE_AUDIT:${stableJson(release)}`);
  invariant(Number(manifest.definitions) === 10_331 && Number(manifest.baselines) === 10_331
    && Number(manifest.ready) === 10_331,
  `STOP_R4_A8_PUMP_MANIFEST_AUDIT:${stableJson(manifest)}`);
  invariant(Number(pump.baseline_values) === 0 && Number(pump.baseline_classifications) === 0
    && Number(pump.parameters) === 24 && Number(pump.p0_parameters) === 19 && Number(pump.defaults) === 0
    && Number(pump.formulas) === 31 && Number(pump.resources) === 31,
  `STOP_R4_A8_PUMP_BASELINE_AUDIT:${stableJson(pump)}`);
  invariant(Number(search.documents) === 10_322 && Number(search.visible) === 10_322
    && Number(search.release_binding_drift) === 0,
  `STOP_R4_A8_PUMP_SEARCH_AUDIT:${stableJson(search)}`);
  return { release, manifest, pump, search };
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_R4_A8_MASTER_SHA256_DRIFT");
  const fixtureBytes = readFileSync(ACCEPTANCE_FIXTURE_PATH);
  const fixture = JSON.parse(fixtureBytes.toString("utf8")) as Json;
  invariant(fixture.sourceClassification === "SYNTHETIC_ACCEPTANCE_FIXTURE_NOT_PROJECT_DATA"
    && fixture.catalogId === PUMP_CATALOG_ID && fixture.expectedParameterCount === 24
    && fixture.expectedP0ParameterCount === 19 && fixture.expectedRowCount === 31,
  "STOP_R4_A8_PUMP_ACCEPTANCE_FIXTURE_DRIFT");
  const branch = git("branch", "--show-current");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  invariant(branch === EXPECTED_BRANCH, `STOP_R4_A8_PUMP_BRANCH:${branch}`);
  const dirty = git("status", "--porcelain=v1", "--untracked-files=all", "--", ...MANAGED_SOURCE_PATHS);
  invariant(!dirty, `STOP_R4_A8_PUMP_SOURCE_DRIFT:${dirty}`);
  const fingerprint = shaObject({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    head,
    tree,
    sources: MANAGED_SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) })),
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
  const baselineId = uuid(`${CONTRACT}:${fingerprint}:baseline:${PUMP_CATALOG_ID}`);
  const releaseKey = `r568-r4-a8-pump-baseline-${fingerprint.slice(0, 16)}`;
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  let receipt: Json | undefined;
  try {
    const predecessor = (await client.query("select * from public.estimate_definition_release where id=$1", [PREDECESSOR_RELEASE_ID])).rows[0] as Json;
    const predecessorSearch = (await client.query("select * from public.estimate_search_index_release where id=$1", [PREDECESSOR_SEARCH_RELEASE_ID])).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "STOP_R4_A8_PUMP_PREDECESSOR_RELEASE");
    invariant(predecessorSearch?.status === "draft" && Number(predecessorSearch.global_count) === 10_322,
      "STOP_R4_A8_PUMP_PREDECESSOR_SEARCH");
    const emptyBaselineAllowed = (await client.query(`select public.estimate_approved_template_baseline_valid_r54(
      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb) allowed`)).rows[0]?.allowed;
    invariant(emptyBaselineAllowed === true, "STOP_R4_A8_EMPTY_BASELINE_MIGRATION_NOT_APPLIED");
    const pump = (await client.query(`select manifest.definition_version_id::text,
        manifest.approved_template_baseline_id::text,definition.source_metadata,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=manifest.definition_version_id) parameters,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=manifest.definition_version_id
            and parameter.truth_metadata->>'tier'='P0') p0_parameters,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=manifest.definition_version_id
            and parameter.default_value is not null) defaults,
        (select count(*)::int from public.estimate_formula_graph formula
          where formula.definition_version_id=manifest.definition_version_id) formulas,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=manifest.definition_version_id) resources
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [PREDECESSOR_RELEASE_ID, PUMP_CATALOG_ID])).rows[0] as Json;
    invariant(pump && pump.approved_template_baseline_id == null && Number(pump.parameters) === 24
      && Number(pump.p0_parameters) === 19 && Number(pump.defaults) === 0
      && Number(pump.formulas) === 31 && Number(pump.resources) === 31,
    `STOP_R4_A8_PUMP_PREDECESSOR_WITNESS:${stableJson(pump)}`);
    const parameterSchema = (await client.query(`select parameter_id,ordinal,value_type,unit_id,title_ru,
        required,default_value,constraints_json,truth_metadata
      from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal`, [
      pump.definition_version_id,
    ])).rows as Json[];
    const parameterSchemaSha256 = shaObject(parameterSchema);
    const acceptanceEvidenceSha256 = shaObject({
      contract: CONTRACT,
      masterSha256: MASTER_SHA256,
      fixtureSha256: sha256(fixtureBytes),
      parameterSchemaSha256,
      emptyBaseline: true,
    });
    const existing = (await client.query("select id::text,status from public.estimate_definition_release where id=$1", [releaseId])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared", "STOP_R4_A8_PUMP_EXISTING_RELEASE_DRIFT");
      const result = await audit(client, releaseId, searchReleaseId);
      receipt = {
        status: "GREEN_R4_A8_PUMP_EMPTY_BASELINE_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        successor: { releaseId, searchReleaseId, baselineId },
        audit: result,
      };
    } else if (!APPLY) {
      receipt = {
        status: "GREEN_R4_A8_PUMP_EMPTY_BASELINE_PRECHECK_NO_MUTATION",
        idempotent: false,
        source: { branch, head, tree, fingerprint },
        predecessor: { definitionReleaseId: PREDECESSOR_RELEASE_ID, searchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID },
        successor: { releaseId, searchReleaseId, baselineId, releaseKey },
        witness: { parameters: pump.parameters, p0Parameters: pump.p0_parameters, defaults: pump.defaults, formulas: pump.formulas, resources: pump.resources },
      };
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
            parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,definition_count,resource_row_count,
            metadata||$6::jsonb,$7::uuid,$8,parameter_count,formula_count
          from public.estimate_definition_release where id=$7::uuid`, [
          releaseId,
          releaseKey,
          head,
          tree,
          sha256(`${CONTRACT}:${fingerprint}:draft`),
          JSON.stringify({
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            lifecycle: "DRAFT_FORWARD_ONLY",
            parentReleaseId: PREDECESSOR_RELEASE_ID,
            sourceFingerprint: fingerprint,
            pumpBaselinePolicy: "EMPTY_NO_HIDDEN_DEFAULTS",
            activationAllowed: false,
            productionEligible: false,
          }),
          PREDECESSOR_RELEASE_ID,
          shaObject({ contract: CONTRACT, fingerprint }),
        ]);
        await client.query(`insert into public.estimate_cumulative_manifest_entry(
            release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,entry_sha256,runtime_publication_state)
          select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
            encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,
              'UTF8'),'sha256'),'hex'),runtime_publication_state
          from public.estimate_cumulative_manifest_entry where release_id=$3`, [
          releaseId,
          CONTRACT,
          PREDECESSOR_RELEASE_ID,
        ]);
        await client.query(`insert into public.estimate_approved_template_baseline(
            id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
            parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
            formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
            proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,
            accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
          values($1,$2,$3,$4,$4,$5,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,
            '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$6::jsonb,$7::jsonb,$8,
            $9,clock_timestamp(),null,'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
          baselineId,
          `${CONTRACT}:${fingerprint.slice(0, 16)}:${PUMP_CATALOG_ID}`,
          PUMP_CATALOG_ID,
          pump.definition_version_id,
          parameterSchemaSha256,
          JSON.stringify([{ contract: CONTRACT, masterSha256: MASTER_SHA256, policy: "NO_HIDDEN_DEFAULTS" }]),
          JSON.stringify([{
            contract: CONTRACT,
            fixture: "data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json",
            fixtureSha256: sha256(fixtureBytes),
            expectedParameters: 24,
            expectedP0Parameters: 19,
            expectedRows: 31,
          }]),
          acceptanceEvidenceSha256,
          releaseId,
        ]);
        await client.query(`update public.estimate_cumulative_manifest_entry set
            approved_template_baseline_id=$3,baseline_ready=true,scenario_ready=true,
            source_batch=$2,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
            entry_sha256=encode(extensions.digest(convert_to(
              $2||':'||$1::uuid::text||':'||catalog_id||':'||definition_hash||':'||$3::uuid::text,
              'UTF8'),'sha256'),'hex'),runtime_publication_state='CANDIDATE'
          where release_id=$1 and catalog_id=$4`, [releaseId, CONTRACT, baselineId, PUMP_CATALOG_ID]);
        const search = await cloneSearch(client, { releaseId, searchReleaseId, releaseKey, head, tree, fingerprint });
        const manifest = (await client.query(`select encode(extensions.digest(convert_to(
            string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') manifest_sha256
          from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId])).rows[0] as Json;
        await client.query(`update public.estimate_definition_release set
            source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId,
          manifest.manifest_sha256,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: search.snapshot_sha256,
            approvedBaselineCount: 10_331,
          }),
        ]);
        const result = await audit(client, releaseId, searchReleaseId);
        await client.query("commit");
        receipt = {
          status: "GREEN_R4_A8_PUMP_EMPTY_BASELINE_SUCCESSOR_PREPARED_NOT_ACTIVE",
          idempotent: false,
          source: { branch, head, tree, fingerprint, managedPaths: MANAGED_SOURCE_PATHS },
          predecessor: { definitionReleaseId: PREDECESSOR_RELEASE_ID, searchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID },
          successor: { releaseId, searchReleaseId, baselineId, releaseKey },
          audit: result,
          productionAccessed: false,
          deployPerformed: false,
          releasePerformed: false,
          activationPerformed: false,
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
  invariant(receipt, "STOP_R4_A8_PUMP_RECEIPT_MISSING");
  const body = {
    schemaVersion: "r568-r4-a8-pump-empty-baseline-successor-receipt.v1",
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    ...receipt,
  };
  const sealed = { ...body, receiptSha256: shaObject(body) };
  if (APPLY && !receipt.idempotent) {
    const output = resolve(OUTPUT_ROOT, `08_W5_PUMP_BASELINE_SUCCESSOR_${head}.json`);
    invariant(!existsSync(output), "STOP_R4_A8_PUMP_EVIDENCE_EXISTS");
    atomicJson(output, sealed);
    process.stdout.write(`${JSON.stringify({ output, ...sealed }, null, 2)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
