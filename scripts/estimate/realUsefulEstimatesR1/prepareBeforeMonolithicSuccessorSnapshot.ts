import { createHash } from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  insertWork,
  WORKS,
} from "../p0TruthRemediationR5/promoteR58MandatoryJourneysSuccessor";

type Json = Record<string, any>;

const CONTRACT = "real-useful-estimates-batch001-008-r1.before-monolithic-isolated-snapshot.v1";
const SOURCE_CONTRACT = "p0-one-monolith-r58-mandatory-journeys.v1";
const CONTENT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_PRODUCTION_GRADE_REAL_USEFUL_ESTIMATES_BATCH001_008_R1_RU.md");
const MASTER_SHA256 = "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510";
const SUPPLEMENT = resolve("C:/Users/User/.codex/attachments/f5053385-c8e2-4664-981d-fcf49325fb8d/pasted-text.txt");
const SUPPLEMENT_SHA256 = "75a562c007e5e2eba1d21c3615ee3673deb16a1bbf8db8a12964006bef2c3258";
const PROMOTION = resolve(".release-runtime/p0-one-monolith-r58/evidence/12-representative/R58_MANDATORY_JOURNEYS_PROMOTION.json");
const HISTORICAL_PROBE = resolve(".release-runtime/p0-one-monolith-r58/evidence/06-backend/BATCH001_008_BACKEND_ADMISSION_4272_PROBE_deaa70d9.jsonl");
const OUTPUT_ROOT = resolve(".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/monolithic-isolated-snapshot");
const OUTPUT = resolve(OUTPUT_ROOT, "BEFORE_MONOLITHIC_ISOLATED_PREPARED_SNAPSHOT.json");
const SERVER_LOG = resolve(OUTPUT_ROOT, "canonical-server.log");
const REQUEST_LOG = resolve(OUTPUT_ROOT, "canonical-request-audit.jsonl");
const DATABASE_URL = process.env.REAL_USEFUL_BEFORE_MONOLITHIC_DATABASE_URL
  ?? "postgresql://postgres:before_local_only@127.0.0.1:55437/before_batch005008_audit";
const DATABASE_NAME = "before_batch005008_audit";
const API_PORT = 8789;
const API_ROOT = `http://127.0.0.1:${API_PORT}/canonical-estimate`;
const CATALOG_ID = "r58-real:monolithic-reinforced-concrete";
const SOURCE_RELEASE_ID = "0a9b5d0d-d57a-520d-b661-c3e564df3286";
const SOURCE_RELEASE_KEY = "p0-r58-cumulative-candidate-mandatory-journeys-4cf42813";
const SOURCE_RELEASE_HEAD = "2f26d45c7854197c549cb986c7c9c9bb7c958b8e";
const SOURCE_RELEASE_TREE = "614bcf9d4c5fa1cbbbdda92aff0499f75744fe12";
const PREDECESSOR_RELEASE_ID = "34a707dc-954c-547d-ba88-27c15dba58d7";
const PREDECESSOR_RELEASE_KEY = "p0-r58-cumulative-candidate-laminate-4cf42813";
const PREDECESSOR_HEAD = "c154fc18dd4a072686367060e3aca074b6b41886";
const PREDECESSOR_TREE = "44201d4f5fdebc36606eaef219ba751b9cbbc56a";
const DEFINITION_ID = "5533b62f-d183-51e7-95e4-cb26da8eeb5e";
const DEFINITION_SHA256 = "377e2ae4289d5b1d0f1477ca5b75dce4d6b2af3189d58dc07ba5d834e076cfec";
const BASELINE_ID = "02a0795f-7535-55a2-869d-4bdf22733e92";
const HISTORICAL_ROOT_REVISION_ID = "0b82c0f2-ca5e-4362-b730-035daa69d2af";
const HISTORICAL_ROOT_CHECKSUM = "52bee5aa8af4a9992d9df7e11c69eb19e28d3b6948cc77330145539fbec4ceb6";
const HISTORICAL_CHILD_REVISION_ID = "5de516f9-c464-4a25-bede-dc9a55fb02c9";
const HISTORICAL_CHILD_CHECKSUM = "01050b4ee53cb8198aa018b6ab5c442ff0f31fc0979ec4c893f06fcd82acb3a2";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const SOURCE_HEAD = "6b8e612cba45884c0dce88f333dfb3d10a054ae6";
const SOURCE_TREE = "f9754a1d7939cfdf12035345de502c8d712e6737";
const RUNTIME_ENVIRONMENT = "real-useful-before-readonly-audit";
const RUNTIME_SOURCE_FILES = [
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts",
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

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function uuid(value: string): string {
  const bytes = Buffer.from(sha256(value).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function historicalProbe(): Json {
  const line = readFileSync(HISTORICAL_PROBE, "utf8").split(/\r?\n/gu)
    .find((candidate) => candidate.includes(`\"catalogId\":\"${CATALOG_ID}\"`));
  invariant(line, "BEFORE_MONOLITHIC_HISTORICAL_PROBE_MISSING");
  const parsed = JSON.parse(line) as Json;
  invariant(parsed.status === "GREEN"
    && parsed.compile?.revisionId === HISTORICAL_ROOT_REVISION_ID
    && parsed.compile?.checksumSha256 === HISTORICAL_ROOT_CHECKSUM
    && parsed.recalculate?.revisionId === HISTORICAL_CHILD_REVISION_ID
    && parsed.recalculate?.parentRevisionId === HISTORICAL_ROOT_REVISION_ID
    && parsed.recalculate?.checksumSha256 === HISTORICAL_CHILD_CHECKSUM,
  "BEFORE_MONOLITHIC_HISTORICAL_PROBE_DRIFT");
  return parsed;
}

async function prepareDatabase(client: Client): Promise<Json> {
  const spec = WORKS.find((candidate) => candidate.catalogId === CATALOG_ID);
  invariant(spec, "BEFORE_MONOLITHIC_SOURCE_SPEC_MISSING");
  const promotion = JSON.parse(readFileSync(PROMOTION, "utf8")) as Json;
  invariant(promotion.candidateReleaseId === SOURCE_RELEASE_ID
    && promotion.predecessorReleaseId === PREDECESSOR_RELEASE_ID,
  "BEFORE_MONOLITHIC_PROMOTION_IDENTITY_DRIFT");
  const promoted = promotion.works.find((candidate: Json) => candidate.catalogId === CATALOG_ID);
  invariant(promoted?.definitionId === DEFINITION_ID && promoted?.baselineId === BASELINE_ID,
    "BEFORE_MONOLITHIC_PROMOTED_DEFINITION_DRIFT");

  const existing = (await client.query(
    "select id::text,status from public.estimate_definition_release where id=$1",
    [SOURCE_RELEASE_ID],
  )).rows[0] as Json | undefined;
  if (existing) {
    const proof = (await client.query(`select release.id::text release_id,release.status,
      definition.id::text definition_id,definition.definition_sha256,
      manifest.runtime_publication_state,passport.decision,
      capability.id::text capability_id,capability.search_release_id::text search_release_id,
      capability.expires_at::text capability_expires_at,
      (select count(*)::int from public.estimate_parameter_definition where definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph where definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec where definition_version_id=definition.id) resources
      from public.estimate_definition_release release
      join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=release.id and manifest.catalog_id=$2
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
      join public.estimate_candidate_capability_r3 capability on capability.release_id=release.id and capability.revoked_at is null
      where release.id=$1`, [SOURCE_RELEASE_ID, CATALOG_ID])).rows[0] as Json | undefined;
    invariant(proof?.status === "prepared" && proof.definition_id === DEFINITION_ID
      && proof.definition_sha256 === DEFINITION_SHA256
      && proof.runtime_publication_state === "CANDIDATE"
      && proof.decision?.contentTruthStatus === "RED"
      && Number(proof.parameters) === 4 && Number(proof.formulas) === 5 && Number(proof.resources) === 7,
    "BEFORE_MONOLITHIC_EXISTING_PREPARED_DRIFT");
    return { ...proof, idempotent: true };
  }

  // The restored PG16 snapshot contains the old R3 title regex in mojibake form.
  // PostgreSQL accepts the constraint DDL but cannot execute the resulting
  // expression ("quantifier operand invalid") for any new resource row. Repair
  // only this isolated audit clone with the readable source pattern before the
  // prepared subset is inserted; historical rows and source dumps stay intact.
  await client.query(`alter table public.estimate_resource_spec
    drop constraint if exists estimate_resource_spec_r3_truth_ck`);
  await client.query(`alter table public.estimate_resource_spec
    add constraint estimate_resource_spec_r3_truth_ck check (
      coalesce(source_metadata->>'truth_contract_version','') <> 'R3'
      or (
        nullif(trim(semantic_owner),'') is not null
        and nullif(trim(title_ru),'') is not null
        and lower(title_ru) !~ '(этап[[:space:]]*[0-9]+|основная операция|выполнение работ по|материалы и комплектующие для|комплект без состава|резерв профессионального добора)'
      )
    ) not valid`);

  const additions = {
    definitions: WORKS.length,
    parameters: WORKS.reduce((sum, work) => sum + work.parameters.length, 0),
    formulas: WORKS.reduce((sum, work) => sum + work.formulas.length, 0),
    resources: WORKS.reduce((sum, work) => sum + work.resources.length, 0),
  };
  invariant(stableJson(additions) === stableJson({ definitions: 8, parameters: 44, formulas: 38, resources: 56 }),
    "BEFORE_MONOLITHIC_SOURCE_ADDITION_COUNTS_DRIFT");
  const sourceManifestSha256 = shaObject({
    contract: SOURCE_CONTRACT,
    predecessor: PREDECESSOR_RELEASE_ID,
    workIds: WORKS.map((work) => work.catalogId),
  });
  const sourcePackageSha256 = shaObject({
    contract: SOURCE_CONTRACT,
    head: SOURCE_RELEASE_HEAD,
    tree: SOURCE_RELEASE_TREE,
    additions,
  });
  const searchReleaseId = uuid(`${CONTRACT}:search-release`);
  const searchGroupId = "concrete:monolithic-reinforced-concrete:before-r1";
  const capabilityId = uuid(`${CONTRACT}:candidate-capability`);
  const capabilityExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await client.query("begin");
  try {
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='120s'");
    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,created_at,activated_at,sealed_at,parent_release_id,
      source_package_sha256,parameter_count,formula_count
    ) values($1,$2,6,'retired',$3,$4,$5,4273,1157024,$6::jsonb,now(),null,now(),null,null,743376,1157022)`, [
      PREDECESSOR_RELEASE_ID,
      PREDECESSOR_RELEASE_KEY,
      PREDECESSOR_HEAD,
      PREDECESSOR_TREE,
      shaObject({ contract: CONTRACT, evidenceReference: "R58_LAMINATE_FORWARD_PROMOTION" }),
      JSON.stringify({
        evidenceReferenceOnly: true,
        isolatedAuditDatabase: DATABASE_NAME,
        historicalSourceReleaseId: PREDECESSOR_RELEASE_ID,
        contentRowsMaterialized: 0,
        activationPerformed: false,
      }),
    ]);
    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
    ) values($1,$2,6,'draft',$3,$4,$5,4281,1157080,$6::jsonb,$7,$8,743420,1157060)`, [
      SOURCE_RELEASE_ID,
      SOURCE_RELEASE_KEY,
      SOURCE_RELEASE_HEAD,
      SOURCE_RELEASE_TREE,
      sourceManifestSha256,
      JSON.stringify({
        authority: "P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5.8",
        contract: SOURCE_CONTRACT,
        exactHistoricalReleaseIdentity: true,
        isolatedSubsetMaterialization: true,
        materializedCatalogIds: [CATALOG_ID],
        logicalDefinitionCount: 4281,
        activationPerformed: false,
        releasePerformed: false,
        contentTruthStatus: "RED",
      }),
      PREDECESSOR_RELEASE_ID,
      sourcePackageSha256,
    ]);

    const inserted = await insertWork(client, spec, SOURCE_RELEASE_ID);
    invariant(inserted.definitionId === DEFINITION_ID && inserted.baselineId === BASELINE_ID,
      "BEFORE_MONOLITHIC_INSERTED_IDENTITY_DRIFT");
    const definition = (await client.query(
      "select id::text,definition_sha256 from public.estimate_definition_version where id=$1",
      [DEFINITION_ID],
    )).rows[0] as Json;
    invariant(definition.definition_sha256 === DEFINITION_SHA256, "BEFORE_MONOLITHIC_DEFINITION_SHA_DRIFT");

    await client.query(`update public.estimate_cumulative_manifest_entry
      set runtime_publication_state='CANDIDATE' where release_id=$1 and catalog_id=$2`,
    [SOURCE_RELEASE_ID, CATALOG_ID]);

    const capabilityMatrix = [
      { capability: "compile", status: "FUNCTIONAL_ONLY" },
      { capability: "recalculate", status: "FUNCTIONAL_ONLY" },
      { capability: "professional_pdf", status: "FUNCTIONAL_ONLY" },
      { capability: "procurement", status: "FUNCTIONAL_ONLY" },
    ];
    const decision = {
      contract: CONTENT_CONTRACT,
      allowed: true,
      status: "GREEN",
      scope: "LEGACY_R3_FUNCTIONAL_COMPILER_ADMISSION_ONLY",
      contentTruthStatus: "RED",
      contentGreenClaimed: false,
      technologyPassportR1Present: false,
      explanationRu: "Технический admission только для изолированной компиляции BEFORE; не является приёмкой состава по новому мастер-ТЗ.",
    };
    const passportPayload = {
      definitionVersionId: DEFINITION_ID,
      releaseId: SOURCE_RELEASE_ID,
      catalogId: CATALOG_ID,
      identityMode: "WORK",
      physicalResultRu: "Монолитная железобетонная конструкция проектного объёма",
      includedScopeRu: spec.included,
      excludedScopeRu: spec.excluded,
      capabilityMatrix,
      parameterCount: 4,
      formulaCount: 5,
      resourceCount: 7,
      decision,
    };
    await client.query(`insert into public.estimate_content_passport_r3(
      definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
      physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,formula_count,
      resource_count,decision,payload_sha256,source_head,source_tree
    ) values($1,$2,$3,$4,'WORK',null,$5,$6::jsonb,$7::jsonb,$8::jsonb,4,5,7,$9::jsonb,$10,$11,$12)`, [
      DEFINITION_ID,
      SOURCE_RELEASE_ID,
      CATALOG_ID,
      CONTENT_CONTRACT,
      passportPayload.physicalResultRu,
      JSON.stringify(spec.included),
      JSON.stringify(spec.excluded),
      JSON.stringify(capabilityMatrix),
      JSON.stringify(decision),
      shaObject(passportPayload),
      SOURCE_HEAD,
      SOURCE_TREE,
    ]);
    await client.query(`update public.estimate_definition_version
      set content_status='CANDIDATE_READY',content_gate_status='GREEN' where id=$1`, [DEFINITION_ID]);

    await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata
    ) values($1,$2,'draft','before-r1','before-r1','before-r1',$3,$4,$5,1,0,1,$6::jsonb)`, [
      searchReleaseId,
      "before-monolithic-isolated-search-r1",
      SOURCE_HEAD,
      SOURCE_TREE,
      shaObject({ contract: CONTRACT, catalogId: CATALOG_ID, definitionId: DEFINITION_ID }),
      JSON.stringify({ isolatedAuditOnly: true, activationPerformed: false, contentTruthStatus: "RED" }),
    ]);
    await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    ) values($1,$2,'Монолитные железобетонные конструкции','concrete','structures','reinforced-concrete',
      'monolithic','monolithic-reinforced-concrete',$3::jsonb,1,$4,$5::jsonb)`, [
      searchReleaseId,
      searchGroupId,
      JSON.stringify(["Конструкции", "Железобетон", "Монолитные конструкции"]),
      shaObject([CATALOG_ID]),
      JSON.stringify({ disposition: "ISOLATED_FUNCTIONAL_CANDIDATE", contentTruthStatus: "RED" }),
    ]);
    const normalizedName = spec.title.normalize("NFKC").toLocaleLowerCase("ru-RU");
    const normalizedAliases = spec.aliases.map((alias) => alias.normalize("NFKC").toLocaleLowerCase("ru-RU"));
    const documentPayload = {
      catalogId: CATALOG_ID,
      definitionVersionId: DEFINITION_ID,
      canonicalNameRu: spec.title,
      aliases: spec.aliases,
      included: spec.included,
      excluded: spec.excluded,
      contentTruthStatus: "RED",
    };
    await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,
      subgroup_id,element_type,operation_kind,technology_variant,construction_state,primary_uom,
      canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,catalog_origin,
      definition_release_id,short_scope_ru,key_distinguishing_parameters,required_inputs_count,
      clarification_fields,included_boundaries,excluded_boundaries,replacement_catalog_id,
      normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,
      normalized_search_blob,source_provenance,document_sha256,adjudication_class,selectable,
      canonical_target_catalog_id,definition_version_id
    ) values($1,$2,'concrete','structures','reinforced-concrete','monolithic','monolithic-reinforced-concrete',$3,
      null,'reinforced_concrete_structure','NEW_INSTALLATION','monolithic','new','m3',$4,$5::text[],$6::text[],$7::text[],
      'ADMITTED_BACKEND','GLOBAL',$8,$9,$10::jsonb,4,$11::jsonb,$12::jsonb,$13::jsonb,null,$14,$15,$16::text[],
      $17::text[],$18,$19::jsonb,$20,'EFFECTIVE_WORK',true,null,$21)`, [
      searchReleaseId,
      CATALOG_ID,
      searchGroupId,
      spec.title,
      spec.aliases,
      [spec.standard],
      ["concrete", "reinforced-concrete", "monolithic"],
      SOURCE_RELEASE_ID,
      "Опалубка, армирование и бетонирование монолитной железобетонной конструкции.",
      JSON.stringify(spec.parameters.map((parameter) => ({ parameterId: parameter.id, titleRu: parameter.title }))),
      JSON.stringify(spec.parameters.map((parameter) => ({ field: parameter.id, required: true }))),
      JSON.stringify(spec.included),
      JSON.stringify(spec.excluded),
      CATALOG_ID,
      normalizedName,
      normalizedAliases,
      [CATALOG_ID, normalizedName, ...normalizedAliases],
      [CATALOG_ID, normalizedName, ...normalizedAliases].join(" "),
      JSON.stringify({ contract: CONTRACT, isolatedAuditOnly: true, sourceReleaseId: SOURCE_RELEASE_ID }),
      shaObject(documentPayload),
      DEFINITION_ID,
    ]);
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by
    ) values($1,$2,$3,$4,$5,$6,'estimate_candidate_admission_r3',$7,$8,$9)`, [
      capabilityId,
      RUNTIME_ENVIRONMENT,
      ORGANIZATION_ID,
      SOURCE_RELEASE_ID,
      searchReleaseId,
      capabilityExpiresAt,
      SOURCE_HEAD,
      SOURCE_TREE,
      "prepareBeforeMonolithicSuccessorSnapshot",
    ]);
    await client.query(`update public.estimate_definition_release
      set status='prepared',sealed_at=clock_timestamp() where id=$1 and status='draft'`, [SOURCE_RELEASE_ID]);
    await client.query("commit");
    return {
      release_id: SOURCE_RELEASE_ID,
      status: "prepared",
      definition_id: DEFINITION_ID,
      definition_sha256: DEFINITION_SHA256,
      runtime_publication_state: "CANDIDATE",
      parameters: 4,
      formulas: 5,
      resources: 7,
      search_release_id: searchReleaseId,
      capability_id: capabilityId,
      capability_expires_at: capabilityExpiresAt,
      source_manifest_sha256: sourceManifestSha256,
      source_package_sha256: sourcePackageSha256,
      isolated_schema_repairs: [
        "REPLACED_MOJIBAKE_ESTIMATE_RESOURCE_SPEC_R3_TITLE_REGEX_WITH_READABLE_SOURCE_EQUIVALENT",
      ],
      idempotent: false,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  }
}

async function api(path: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      authorization: "Bearer local-dev-runtime-token",
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json() as Json;
  if (!response.ok) throw new Error(`BEFORE_MONOLITHIC_API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body;
}

async function waitForJob(jobId: string): Promise<Json> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const job = await api(`/jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(`BEFORE_MONOLITHIC_JOB_${job.status}:${jobId}:${job.errorCode ?? "UNKNOWN"}:${JSON.stringify(job.errorDetail ?? {})}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`BEFORE_MONOLITHIC_JOB_TIMEOUT:${jobId}`);
}

async function startServer(prepared: Json): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const env = {
    ...process.env,
    ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
    CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
    CANONICAL_ESTIMATE_TARGET_RELEASE_ID: SOURCE_RELEASE_ID,
    CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: SOURCE_RELEASE_ID,
    CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
    CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
    CANONICAL_ESTIMATE_ADMISSION_RUN_ID: "real-useful-before-monolithic-r1",
    CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: String(prepared.search_release_id),
    CANONICAL_ESTIMATE_LOCAL_PORT: String(API_PORT),
    CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: RUNTIME_ENVIRONMENT,
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: RUNTIME_ENVIRONMENT,
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: String(prepared.capability_id),
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID: ORGANIZATION_ID,
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: SOURCE_RELEASE_ID,
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: String(prepared.search_release_id),
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: String(prepared.capability_expires_at),
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: SOURCE_HEAD,
    CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: SOURCE_TREE,
    CANONICAL_ESTIMATE_TEST_ORGANIZATION_ID: ORGANIZATION_ID,
    CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: REQUEST_LOG,
    R45_RUNTIME_SOURCE_HEAD: SOURCE_HEAD,
    R45_RUNTIME_SOURCE_TREE: SOURCE_TREE,
  };
  const child = spawn(process.execPath, [
    resolve("node_modules/tsx/dist/cli.mjs"),
    resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
  ], { cwd: resolve("."), env, stdio: ["ignore", "pipe", "pipe"] });
  const ready = new Promise<void>((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error("BEFORE_MONOLITHIC_SERVER_READY_TIMEOUT")), 30_000);
    const onText = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      logs.push(text);
      if (text.includes('"status":"READY"')) {
        clearTimeout(timeout);
        resolveReady();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      rejectReady(new Error(`BEFORE_MONOLITHIC_SERVER_EARLY_EXIT:${code}:${logs.join("").slice(-5000)}`));
    });
  });
  await ready;
  return { child, logs };
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function artifact(revisionId: string, kind: "pdf" | "procurement", suffix: string): Promise<Json> {
  const created = await api(`/revisions/${revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `before-monolithic-${suffix}-${kind}`,
      ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}),
    }),
  });
  if (created.jobId) await waitForJob(String(created.jobId));
  const metadata = await api(`/revisions/${revisionId}/artifacts/${kind}${kind === "pdf" ? "?documentProfile=professional_v1" : ""}`);
  invariant(metadata.status === "ready" && typeof metadata.signedUrl === "string",
    `BEFORE_MONOLITHIC_ARTIFACT_NOT_READY:${revisionId}:${kind}`);
  const response = await fetch(metadata.signedUrl, { headers: { authorization: "Bearer local-dev-runtime-token" } });
  invariant(response.ok, `BEFORE_MONOLITHIC_ARTIFACT_DOWNLOAD:${revisionId}:${kind}:${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(sha256(bytes) === metadata.sha256, `BEFORE_MONOLITHIC_ARTIFACT_SHA:${revisionId}:${kind}`);
  const path = resolve(OUTPUT_ROOT, `${suffix}.${kind === "pdf" ? "pdf" : "procurement.json"}`);
  writeFileSync(path, bytes);
  return { ...metadata, path: path.replaceAll("\\", "/"), file_sha256: hashFile(path) };
}

async function main(): Promise<void> {
  invariant(hashFile(MASTER) === MASTER_SHA256, "BEFORE_MONOLITHIC_MASTER_DRIFT");
  invariant(hashFile(SUPPLEMENT) === SUPPLEMENT_SHA256, "BEFORE_MONOLITHIC_SUPPLEMENT_DRIFT");
  const historical = historicalProbe();
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const client = new Client({ connectionString: DATABASE_URL, application_name: "before-monolithic-prepare" });
  await client.connect();
  let server: { child: ChildProcess; logs: string[] } | null = null;
  try {
    const prepared = await prepareDatabase(client);
    const priorRevisionCount = Number((await client.query(
      "select count(*)::int count from public.estimate_revision where release_id=$1 and catalog_id=$2",
      [SOURCE_RELEASE_ID, CATALOG_ID],
    )).rows[0].count);
    invariant(priorRevisionCount === 0 || priorRevisionCount === 2,
      `BEFORE_MONOLITHIC_REVISION_RESIDUE:${priorRevisionCount}`);
    server = await startServer(prepared);
    const baseline = {
      concrete_volume_m3: 10,
      formwork_area_m2: 60,
      rebar_mass_t: 1.2,
      concrete_waste_percent: 2,
    };
    let rootRevisionId: string;
    let childRevisionId: string;
    if (priorRevisionCount === 0) {
      const compile = await api("/jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: "before-monolithic-parent-r1",
          catalogId: CATALOG_ID,
          currencyCode: "KGS",
          parameters: baseline,
          priceSnapshotIds: [],
          sourceRequestText: "Устройство монолитной железобетонной конструкции. Изолированный BEFORE-снимок.",
          primaryMeasureParameterId: "concrete_volume_m3",
          organizationId: ORGANIZATION_ID,
        }),
      });
      const compileJob = await waitForJob(String(compile.jobId));
      rootRevisionId = String(compileJob.resultRevisionId);
      const recalculate = await api("/jobs/recalculate", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: "before-monolithic-child-r1",
          catalogId: CATALOG_ID,
          currencyCode: "KGS",
          parentRevisionId: rootRevisionId,
          parameters: { concrete_volume_m3: 11 },
          priceSnapshotIds: [],
          rowOverrides: {},
          customRows: [],
          organizationId: ORGANIZATION_ID,
        }),
      });
      const recalculateJob = await waitForJob(String(recalculate.jobId));
      childRevisionId = String(recalculateJob.resultRevisionId);
    } else {
      const persisted = (await client.query(`select id::text,parent_revision_id::text,revision_number
        from public.estimate_revision where release_id=$1 and catalog_id=$2 order by revision_number`,
      [SOURCE_RELEASE_ID, CATALOG_ID])).rows as Json[];
      const persistedRoot = persisted.find((revision) => Number(revision.revision_number) === 1);
      const persistedChild = persisted.find((revision) => Number(revision.revision_number) === 2);
      invariant(persistedRoot, "BEFORE_MONOLITHIC_PERSISTED_ROOT_MISSING");
      invariant(persistedChild, "BEFORE_MONOLITHIC_PERSISTED_CHILD_MISSING");
      invariant(persistedRoot.parent_revision_id == null && persistedChild.parent_revision_id === persistedRoot.id,
        "BEFORE_MONOLITHIC_PERSISTED_CHAIN_DRIFT");
      rootRevisionId = String(persistedRoot.id);
      childRevisionId = String(persistedChild.id);
    }

    const rootArtifacts = {
      professional_pdf: await artifact(rootRevisionId, "pdf", "root-parent"),
      procurement: await artifact(rootRevisionId, "procurement", "root-parent"),
    };
    const childArtifacts = {
      professional_pdf: await artifact(childRevisionId, "pdf", "child-recalculation"),
      procurement: await artifact(childRevisionId, "procurement", "child-recalculation"),
    };
    const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,catalog_id,
      revision_number,row_count,checksum_sha256,definition_version_id::text,input_parameters
      from public.estimate_revision where id=any($1::uuid[]) order by revision_number`,
    [[rootRevisionId, childRevisionId]])).rows as Json[];
    const root = revisions.find((revision) => revision.id === rootRevisionId);
    const child = revisions.find((revision) => revision.id === childRevisionId);
    invariant(root, "BEFORE_MONOLITHIC_ROOT_REVISION_MISSING");
    invariant(child, "BEFORE_MONOLITHIC_CHILD_REVISION_MISSING");
    invariant(root.parent_revision_id == null && Number(root.revision_number) === 1
      && root.release_id === SOURCE_RELEASE_ID && root.definition_version_id === DEFINITION_ID
      && Number(root.row_count) === 7,
    "BEFORE_MONOLITHIC_ROOT_IDENTITY_RED");
    invariant(child.parent_revision_id === rootRevisionId && Number(child.revision_number) === 2
      && child.release_id === SOURCE_RELEASE_ID && child.definition_version_id === DEFINITION_ID
      && Number(child.row_count) === 7,
    "BEFORE_MONOLITHIC_CHILD_IDENTITY_RED");
    invariant(/^[0-9a-f]{64}$/u.test(String(root.checksum_sha256))
      && /^[0-9a-f]{64}$/u.test(String(child.checksum_sha256))
      && root.checksum_sha256 !== child.checksum_sha256,
    "BEFORE_MONOLITHIC_CURRENT_CHECKSUM_IDENTITY_RED");
    const rows = (await client.query(`select revision_id::text,row_id,ordinal,title_ru,unit_id,quantity::text,
      procurement_eligible,included_in_estimate,included_in_procurement,row_sha256
      from public.estimate_revision_row where revision_id=any($1::uuid[]) order by revision_id,ordinal`,
    [[rootRevisionId, childRevisionId]])).rows as Json[];
    const rootRows = rows.filter((row) => row.revision_id === rootRevisionId);
    const childRows = rows.filter((row) => row.revision_id === childRevisionId);
    invariant(stableJson(rootRows.map((row) => Number(row.quantity))) === stableJson([60, 1.2, 14.4, 10.2, 60, 1.2, 10]),
      `BEFORE_MONOLITHIC_ROOT_QUANTITIES_RED:${stableJson(rootRows)}`);
    invariant(stableJson(childRows.map((row) => Number(row.quantity))) === stableJson([60, 1.2, 14.4, 11.22, 60, 1.2, 11]),
      `BEFORE_MONOLITHIC_CHILD_QUANTITIES_RED:${stableJson(childRows)}`);
    const failedJobs = Number((await client.query(
      "select count(*)::int count from public.estimate_compile_job where target_release_id=$1 and status='failed'",
      [SOURCE_RELEASE_ID],
    )).rows[0].count);
    const resultPayload = {
      schema_version: CONTRACT,
      generated_at: new Date().toISOString(),
      master: { path: MASTER.replaceAll("\\", "/"), sha256: MASTER_SHA256 },
      supplement: { path: SUPPLEMENT.replaceAll("\\", "/"), sha256: SUPPLEMENT_SHA256 },
      source_identity: {
        head: SOURCE_HEAD,
        tree: SOURCE_TREE,
        worktree_runtime_files: RUNTIME_SOURCE_FILES.map((path) => ({
          path,
          sha256: hashFile(resolve(path)),
          historical_probe_git_blob: (() => {
            try {
              return execFileSync("git", ["rev-parse", `deaa70d9:${path}`], {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
              }).trim();
            } catch {
              return null;
            }
          })(),
        })),
      },
      database: {
        name: DATABASE_NAME,
        isolated: true,
        source_clone: "before_batch004",
        production_writes: 0,
        active_release_switched: false,
      },
      exact_source: {
        source_release_id: SOURCE_RELEASE_ID,
        predecessor_release_id: PREDECESSOR_RELEASE_ID,
        definition_version_id: DEFINITION_ID,
        definition_sha256: DEFINITION_SHA256,
        approved_template_baseline_id: BASELINE_ID,
        promotion_path: PROMOTION.replaceAll("\\", "/"),
        promotion_sha256: hashFile(PROMOTION),
      },
      historical_probe_reference: {
        path: HISTORICAL_PROBE.replaceAll("\\", "/"),
        sha256: hashFile(HISTORICAL_PROBE),
        root_parent_revision_id: historical.compile.revisionId,
        root_parent_checksum_sha256: historical.compile.checksumSha256,
        child_revision_id: historical.recalculate.revisionId,
        child_parent_revision_id: historical.recalculate.parentRevisionId,
        child_checksum_sha256: historical.recalculate.checksumSha256,
        cleanup_residue: historical.cleanup?.residue,
        payload_files_preserved: false,
      },
      isolated_prepared_runtime: {
        prepared,
        root_parent: { ...root, rows: rootRows, artifacts: rootArtifacts },
        child_recalculation: { ...child, rows: childRows, artifacts: childArtifacts },
        historical_checksum_parity: {
          root: root.checksum_sha256 === historical.compile.checksumSha256,
          child: child.checksum_sha256 === historical.recalculate.checksumSha256,
          required: false,
          reason: "FRESH_ISOLATED_REVISIONS_USE_CURRENT_EXACTLY_HASHED_RUNTIME_SOURCE_AND_ARE_NOT_THE_HISTORICAL_REVISION_IDENTITIES",
        },
        failed_jobs: failedJobs,
      },
      revision_policy: {
        before_material_composition: "ROOT_PARENT_ONLY",
        latest_revision_selection_prohibited: true,
        child_recalculation_preserved_separately: true,
      },
      legacy_r3_functional_admission: "GREEN_COMPILE_RECALCULATE_PDF_PROCUREMENT_ONLY",
      content_truth_status: "RED",
      technology_passport_r1_present: false,
      content_green_claimed: false,
      release_performed: false,
      deploy_performed: false,
      ota_performed: false,
      merge_performed: false,
      push_performed: false,
      batch009_performed: false,
      status: "GREEN_ISOLATED_PREPARED_FUNCTIONAL_SNAPSHOT_CONTENT_RED_NO_RELEASE",
    };
    atomicJson(OUTPUT, { ...resultPayload, payload_sha256: shaObject(resultPayload) });
    process.stdout.write(`${JSON.stringify({
      status: resultPayload.status,
      content_truth_status: resultPayload.content_truth_status,
      historical_checksum_parity: resultPayload.isolated_prepared_runtime.historical_checksum_parity,
      root_revision_id: rootRevisionId,
      child_revision_id: childRevisionId,
      root_rows: rootRows.length,
      child_rows: childRows.length,
      output: OUTPUT.replaceAll("\\", "/"),
      output_sha256: hashFile(OUTPUT),
    }, null, 2)}\n`);
  } finally {
    if (server) {
      await stopServer(server.child).catch(() => undefined);
      writeFileSync(SERVER_LOG, server.logs.join(""), "utf8");
    }
    await client.end().catch(() => undefined);
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
