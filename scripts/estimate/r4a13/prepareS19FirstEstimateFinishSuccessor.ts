import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { canonicalApprovedBaselineRuntimeParameters } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {
  DRYWALL_CEILING_PREPARE_KNAUF_SOURCE_ID,
  DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
  DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID,
  DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1,
  DRYWALL_CEILING_PREPARE_PRELIMINARY_PROVENANCE_RU_R1,
  DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingPreparePreliminaryScenarioR1";
import {
  buildBatch003R56CanonicalSuccessorDefinition,
  compileBatch003R56ThroughSharedCore,
} from "../r5/batch003R56SharedCoreProjection";
import {
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  resolveCanonicalApprovedBaselineLeaf,
} from "./canonicalDefinitionPublisherR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.s19-first-estimate-finish.v3";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (22).md",
);
const MASTER_SHA256 = "2b0dd5ca61659d1f73a6546b646757d65791a0a3ac8eae17fca0aa591a697db6";
const PARENT_RELEASE_ID = "c2f409ee-815f-5f3e-9814-651491255e67";
const PARENT_SEARCH_RELEASE_ID = "fa119c2e-ac61-59c7-ba9d-e466348006cd";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(
  ".release-runtime/r4a13-6/s19-first-estimate/finish-preliminary-scenario-repair-unknown-v3",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const KNAUF_OFFICIAL_URL =
  "https://www.knauf.ru/upload/iblock/ab4/nh124j9e1rc8oe5tn6d1z1yey4pwcgpb/36_IL_KNAUF_Rotband_Pasta_Profi_25_03_2025_v01_Preview.pdf";
const SOURCE_PATHS = [
  "src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingPreparePreliminaryScenarioR1.ts",
  "scripts/estimate/r5/batch003R56SharedCoreProjection.ts",
  "scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts",
  "scripts/estimate/r4a13/prepareS19FirstEstimateFinishSuccessor.ts",
  "tests/aiEstimateV4/batch003R56Reconciliation.contract.test.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function withoutParameter(value: unknown, parameterId: string): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Json)
    .filter(([key]) => key !== parameterId));
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
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

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_S19_FINISH_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_S19_FINISH_DATABASE_NOT_DISPOSABLE:${parsed.port}:${parsed.pathname}`);
}

async function verifyFirstEstimateScenario(): Promise<Json> {
  const definition = buildBatch003R56CanonicalSuccessorDefinition(
    DRYWALL_CEILING_PREPARE_LARGE_AREA_SOURCE_CATALOG_ID,
  );
  const baseline = {
    input_values: DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
    input_classification: DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1,
  };
  const runtimeParameters = canonicalApprovedBaselineRuntimeParameters(baseline);
  invariant(!Object.prototype.hasOwnProperty.call(runtimeParameters, "area_m2"),
    "STOP_S19_FINISH_GEOMETRY_INVENTED");
  invariant(!Object.prototype.hasOwnProperty.call(runtimeParameters, "repair_requirement_state"),
    "STOP_S19_FINISH_UNKNOWN_REPAIR_BECAME_ASSUMED");
  const preliminary = await compileBatch003R56ThroughSharedCore({
    definition,
    values: { ...runtimeParameters, area_m2: 500 },
  });
  const paste = preliminary.rows.find((row) => row.row_id.endsWith(":finish_paste"));
  invariant(paste?.quantity === "240" && paste.unit_id === "kg"
    && paste.unit_price == null && paste.amount == null,
  `STOP_S19_FINISH_PRELIMINARY_PASTE:${JSON.stringify(paste)}`);
  invariant(preliminary.rows.some((row) => row.row_id.endsWith(":finish_paste_application")
      && row.quantity === "500")
    && preliminary.rows.some((row) => row.row_id.endsWith(":finish_sanding")
      && row.quantity === "500"),
  "STOP_S19_FINISH_PRELIMINARY_WORK_ROWS");
  invariant(!preliminary.rows.some((row) =>
    /:(?:primer|primer_application|joint_compound|joint_tape)$/u.test(row.row_id)),
  "STOP_S19_FINISH_UNSELECTED_BRANCH_PRESENT");
  invariant(preliminary.preliminaryNeeds.some((need) =>
    need.missing_parameter_ids.includes("repair_requirement_state")
      && need.row_id.endsWith(":joint_compound"))
    && preliminary.preliminaryNeeds.some((need) =>
      need.missing_parameter_ids.includes("repair_requirement_state")
        && need.row_id.endsWith(":joint_repair")),
  "STOP_S19_FINISH_UNKNOWN_REPAIR_NOT_VISIBLE");
  const refined = await compileBatch003R56ThroughSharedCore({
    definition,
    operation: "recalculate",
    values: { ...runtimeParameters, area_m2: 500, finish_paste_order_reserve_percent: 5 },
  });
  const refinedPaste = refined.rows.find((row) => row.row_id.endsWith(":finish_paste"));
  invariant(refinedPaste?.row_id === paste.row_id && refinedPaste.quantity === "252",
    `STOP_S19_FINISH_REFINEMENT:${JSON.stringify(refinedPaste)}`);
  return {
    catalogId: DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
    geometryInput: { area_m2: 500 },
    runtimeScenarioParameters: runtimeParameters,
    preliminary: {
      rowCount: preliminary.rows.length,
      preliminaryNeedCount: preliminary.preliminaryNeeds.length,
      pasteKg: Number(paste.quantity),
      applicationM2: 500,
      sandingM2: 500,
      priceState: "UNKNOWN_NULL",
    },
    refined: { reservePercent: 5, pasteKg: Number(refinedPaste.quantity) },
    deterministicSha256: sha256({ preliminary, refined }),
  };
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
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false,
        's19FirstEstimateFinishTargetCount',1)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, PARENT_SEARCH_RELEASE_ID,
    input.releaseId, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
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
      source.normalized_search_blob,source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,
        'sourceFingerprint',$5::text,'firstEstimateThenRefine',true),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,
        'UTF8'),'sha256'),'hex'),source.adjudication_class,source.selectable,
      source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, CONTRACT, PARENT_SEARCH_RELEASE_ID, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),
        'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({
      documentCount: snapshot.documents,
      visibleCount: snapshot.visible,
      masterSha256: MASTER_SHA256,
      parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
      sourceFingerprint: input.fingerprint,
      targetCatalogIds: [DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID],
      firstEstimateThenRefine: true,
    }),
  ]);
  return snapshot;
}

async function auditState(
  client: Client,
  releaseId: string,
  searchReleaseId: string,
  definitionId: string,
  baselineId: string,
): Promise<Json> {
  const release = (await client.query(`select id,status,activated_at,definition_count,parameter_count,
      formula_count,resource_row_count,source_manifest_sha256,parent_release_id
    from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),
        'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    releaseId, DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID, definitionId,
  ])).rows[0] as Json;
  const target = (await client.query(`select definition.id definition_id,definition.catalog_id,
      definition.content_status,definition.content_gate_status,passport.decision,
      (select count(*)::int from public.estimate_parameter_definition p
        where p.definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph f
        where f.definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec r
        where r.definition_version_id=definition.id) resources,
      (select count(*)::int from public.estimate_work_normative_binding b
        where b.definition_version_id=definition.id) bindings,
      baseline.input_values,baseline.input_classification,baseline.guide_provenance_ru
    from public.estimate_definition_version definition
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    join public.estimate_approved_template_baseline baseline on baseline.id=$2
    where definition.id=$1`, [definitionId, baselineId])).rows[0] as Json;
  const search = (await client.query(`select status,snapshot_sha256,
      (select count(*)::int from public.estimate_search_document where search_release_id=$1) documents,
      (select count(*)::int from public.estimate_search_document
        where search_release_id=$1 and selectable and adjudication_class='EFFECTIVE_WORK') visible,
      (select definition_version_id from public.estimate_search_document
        where search_release_id=$1 and catalog_id=$2) target_definition_id
    from public.estimate_search_index_release where id=$1`, [
    searchReleaseId, DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
  ])).rows[0] as Json;
  return { release, manifest, target, search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_S19_FINISH_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_S19_FINISH_MASTER_SHA256_DRIFT");
  for (const path of SOURCE_PATHS) invariant(existsSync(resolve(path)), `STOP_S19_FINISH_SOURCE_MISSING:${path}`);

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const coreAcceptance = await verifyFirstEstimateScenario();
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    parentReleaseId: PARENT_RELEASE_ID,
    parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
    head,
    tree,
    sourceHashes,
    coreAcceptance,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const definitionId = uuid(`${CONTRACT}:${fingerprint}:${DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID}:definition`);
  const baselineId = uuid(`${CONTRACT}:${fingerprint}:${DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID}:baseline`);
  const releaseKey = `r4-a13-6-s19-first-estimate-finish-${fingerprint.slice(0, 16)}`;
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_S19_FINISH_CURRENT_PRODUCTION_FLAG");
  invariant(
    (current.definitionReleaseId === PARENT_RELEASE_ID
      && current.searchReleaseId === PARENT_SEARCH_RELEASE_ID)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `STOP_S19_FINISH_CURRENT_RELEASE_DRIFT:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r4-a13-6-s19-first-estimate-finish-successor",
  });
  await client.connect();
  let receipt: Json;
  try {
    const parent = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [PARENT_RELEASE_ID],
    )).rows[0] as Json;
    const parentSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [PARENT_SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    invariant(parent?.status === "prepared" && Number(parent.definition_count) === 10_331,
      "STOP_S19_FINISH_PARENT_RELEASE_DRIFT");
    invariant(parentSearch?.status === "draft", "STOP_S19_FINISH_PARENT_SEARCH_DRIFT");
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_S19_FINISH_EXISTING_SUCCESSOR_DRIFT");
      receipt = {
        status: "GREEN_S19_FIRST_ESTIMATE_FINISH_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        mutationPerformed: false,
        successor: { releaseId, searchReleaseId, releaseKey, definitionId, baselineId },
        coreAcceptance,
        audit: await auditState(client, releaseId, searchReleaseId, definitionId, baselineId),
      };
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        const sourceId = uuid(`${CONTRACT}:source:${DRYWALL_CEILING_PREPARE_KNAUF_SOURCE_ID}`);
        const locator = {
          locatorType: "OFFICIAL_PRODUCT_INFORMATION_SHEET",
          edition: "02/2025",
          page: 2,
          exactLocator: "стр. 2: расход 0,48 кг/м² при слое 0,3 мм; грунтование не требуется; шлифование P240 или мельче",
          applicability: "Только КНАУФ-Ротбанд Паста Профи по подготовленному основанию",
        };
        const locatorKey = sha256(locator);
        let locatorId = uuid(`${CONTRACT}:locator:${locatorKey}`);
        await client.query(`insert into public.estimate_normative_source(
            id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
          values($1,$2,$3,$4,$5,null,$6,$7::jsonb)
          on conflict(source_key) do update set title_ru=excluded.title_ru,authority=excluded.authority,
            official_url=excluded.official_url,effective_from=excluded.effective_from,metadata=excluded.metadata`, [
          sourceId,
          DRYWALL_CEILING_PREPARE_KNAUF_SOURCE_ID,
          "Информационный лист КНАУФ-Ротбанд Паста Профи",
          "КНАУФ",
          KNAUF_OFFICIAL_URL,
          "2025-02-01",
          JSON.stringify({
            contract: CONTRACT,
            candidateOnly: true,
            verifiedAt: "2026-09-19",
            quantityNormKgM2: 0.48,
            layerThicknessMm: 0.3,
            primerRequiredForSelectedSystem: false,
            universalProductivityClaimed: false,
          }),
        ]);
        const persistedSource = (await client.query(
          "select id::text from public.estimate_normative_source where source_key=$1",
          [DRYWALL_CEILING_PREPARE_KNAUF_SOURCE_ID],
        )).rows[0] as Json;
        invariant(persistedSource?.id, "STOP_S19_FINISH_KNAUF_SOURCE_INSERT");
        await client.query(`insert into public.estimate_normative_locator(
            id,source_id,locator_key,locator,excerpt_sha256)
          values($1,$2,$3,$4::jsonb,$5)
          on conflict(source_id,locator_key) do nothing`, [
          locatorId, persistedSource.id, locatorKey, JSON.stringify(locator), sha256(locator),
        ]);
        const persistedLocator = (await client.query(
          `select id::text from public.estimate_normative_locator
            where source_id=$1 and locator_key=$2`,
          [persistedSource.id, locatorKey],
        )).rows[0] as Json;
        invariant(persistedLocator?.id, "STOP_S19_FINISH_KNAUF_LOCATOR_INSERT");
        locatorId = String(persistedLocator.id);

        const representative = (await client.query(`select definition.*,
            manifest.approved_template_baseline_id
          from public.estimate_cumulative_manifest_entry manifest
          join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
          where manifest.release_id=$1 and manifest.catalog_id=$2`, [
          PARENT_RELEASE_ID, DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
        ])).rows[0] as Json;
        invariant(representative, "STOP_S19_FINISH_REPRESENTATIVE_MISSING");
        const parameters = (await client.query(
          "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
          [representative.id],
        )).rows as Json[];
        const formulas = (await client.query(
          "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
          [representative.id],
        )).rows as Json[];
        const resources = (await client.query(
          "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
          [representative.id],
        )).rows as Json[];
        const bindings = (await client.query(`select binding.*,resource.row_id
          from public.estimate_work_normative_binding binding
          join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
          where binding.definition_version_id=$1 order by resource.ordinal`, [
          representative.id,
        ])).rows as Json[];
        const baseline = (await client.query(
          "select * from public.estimate_approved_template_baseline where id=$1",
          [representative.approved_template_baseline_id],
        )).rows[0] as Json;
        const passport = (await client.query(
          "select * from public.estimate_content_passport_r3 where definition_version_id=$1",
          [representative.id],
        )).rows[0] as Json;
        invariant(parameters.length === 46 && formulas.length === 29 && resources.length === 29
          && bindings.length === 29 && baseline && passport,
        `STOP_S19_FINISH_REPRESENTATIVE_SHAPE:${parameters.length}/${formulas.length}/${resources.length}/${bindings.length}`);
        const lineage = await resolveCanonicalApprovedBaselineLeaf(
          client,
          String(representative.approved_template_baseline_id),
          DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
        );
        invariant(lineage.definitionVersionId === representative.id,
          `STOP_S19_FINISH_BASELINE_LINEAGE_DEFINITION:${lineage.definitionVersionId}`);
        const repairRequirementState = "repair_requirement_state";
        const inputValues = {
          ...withoutParameter(baseline.input_values, repairRequirementState),
          ...DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
        };
        const inputClassification = {
          ...withoutParameter(baseline.input_classification, repairRequirementState),
          ...DRYWALL_CEILING_PREPARE_PRELIMINARY_CLASSIFICATION_R1,
        };
        const guideProvenance = {
          ...withoutParameter(baseline.guide_provenance_ru, repairRequirementState),
          ...DRYWALL_CEILING_PREPARE_PRELIMINARY_PROVENANCE_RU_R1,
        };
        const normativeSourceIds = withoutParameter(
          baseline.normative_source_ids,
          repairRequirementState,
        );
        for (const parameterId of Object.keys(DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1)) {
          normativeSourceIds[parameterId] = [
            parameterId === "work_included" || parameterId === "estimate_scope_mode"
              ? "KG_SP_KR_65_101_2025"
              : DRYWALL_CEILING_PREPARE_KNAUF_SOURCE_ID,
          ];
        }
        const targetEvidenceSha256 = sha256({
          contract: CONTRACT,
          coreAcceptance,
          inputValues,
          inputClassification,
          guideProvenance,
          normativeSourceIds,
        });
        const targetDefinitionSha256 = sha256({
          predecessorDefinitionSha256: representative.definition_sha256,
          contract: CONTRACT,
          targetEvidenceSha256,
        });
        const nextDefinitionVersion = Number(representative.definition_version) + 1;
        const finishPasteBinding = bindings.find((binding) =>
          String(binding.row_id).endsWith(":finish_paste"));
        invariant(finishPasteBinding, "STOP_S19_FINISH_PASTE_BINDING_MISSING");
        const representativeBindings = bindings.map((binding) =>
          binding === finishPasteBinding
            ? {
              ...binding,
              locator_id: locatorId,
              applicability: {
                ...binding.applicability,
                productProfile: "KNAUF_ROTBAND_PASTA_PROFI",
                layerThicknessMm: 0.3,
                selectedSystemOnly: true,
              },
            }
            : binding
        );
        const representativeBaseline = {
          ...baseline,
          input_values: inputValues,
          input_classification: inputClassification,
          uom_by_parameter: withoutParameter(baseline.uom_by_parameter, repairRequirementState),
          formula_consumer_ids: withoutParameter(
            baseline.formula_consumer_ids,
            repairRequirementState,
          ),
          resource_consumer_row_ids: withoutParameter(
            baseline.resource_consumer_row_ids,
            repairRequirementState,
          ),
          normative_source_ids: normativeSourceIds,
          guide_provenance_ru: guideProvenance,
          proposal_source_refs: [
            ...(Array.isArray(baseline.proposal_source_refs) ? baseline.proposal_source_refs : []),
            {
              contract: CONTRACT,
              masterSha256: MASTER_SHA256,
              officialUrl: KNAUF_OFFICIAL_URL,
              sourceId: DRYWALL_CEILING_PREPARE_KNAUF_SOURCE_ID,
            },
          ],
        };
        const validationScenarioRefs = [
          ...(Array.isArray(baseline.validation_scenario_refs) ? baseline.validation_scenario_refs : []),
          {
            contract: CONTRACT,
            scenario: "WORK_PLUS_KNOWN_GEOMETRY_THEN_VOLUNTARY_REFINEMENT",
            geometry: { area_m2: 500 },
            preliminaryPasteKg: 240,
            refinedReservePercent: 5,
            refinedPasteKg: 252,
            targetEvidenceSha256,
          },
        ];
        const plan = createCanonicalDefinitionClonePlan({
          contract: CONTRACT,
          definition: {
            id: definitionId,
            releaseId,
            catalogId: DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
            definitionVersion: nextDefinitionVersion,
            passport: {
              ...representative.passport,
              firstEstimateThenRefine: true,
              preliminaryScenarioVersion: "S19_R1",
            },
            applicability: {
              ...representative.applicability,
              firstEstimateThenRefine: true,
              geometryRequiredBeforeCompile: true,
              longQuestionnaireRequiredBeforeFirstResult: false,
            },
            definitionSha256: targetDefinitionSha256,
            sourceMetadata: {
              ...representative.source_metadata,
              contract: CONTRACT,
              predecessorDefinitionId: representative.id,
              predecessorBaselineLeafId: lineage.baselineId,
              acceptanceEvidenceSha256: targetEvidenceSha256,
              firstEstimateThenRefine: true,
              activationAllowed: false,
              productionEligible: false,
            },
          },
          representative: {
            parameters,
            formulas,
            resources,
            bindings: representativeBindings,
            baseline: representativeBaseline,
            passport,
          },
          parameterTruthMetadata: (parameter) => ({
            ...parameter.truth_metadata,
            contract: CONTRACT,
            semantic_parameter_key:
              `${DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID}:${parameter.parameter_id}`,
            ...(Object.prototype.hasOwnProperty.call(
              DRYWALL_CEILING_PREPARE_PRELIMINARY_SCENARIO_R1,
              parameter.parameter_id,
            ) ? { first_estimate_scenario_value: true } : {}),
          }),
          resourceId: (resource) => uuid(
            `${CONTRACT}:${fingerprint}:${DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID}:resource:${resource.row_id}`,
          ),
          resourceSemanticOwner: (resource) => String(resource.semantic_owner),
          resourceSha256: (resource) => sha256({ contract: CONTRACT, resource }),
          baseline: {
            id: baselineId,
            key: `${CONTRACT}:${fingerprint.slice(0, 16)}:${DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID}`,
            sourceDefinitionVersionId: lineage.definitionVersionId,
            validationScenarioRefs,
            acceptanceEvidenceSha256: targetEvidenceSha256,
            acceptedReleaseId: releaseId,
            supersedesBaselineId: lineage.baselineId,
          },
          passport: {
            physicalResultRu: passport.physical_result_ru,
            excludedScopeRu: passport.excluded_scope_ru,
            decision: {
              ...passport.decision,
              contract: CONTENT_PASSPORT_CONTRACT,
              status: "GREEN",
              allowed: true,
              waveContract: CONTRACT,
              quantityScope: "FULL",
              priceState: "PARTIAL_NEEDS_PRICE",
              activationAllowed: false,
              productionEligible: false,
            },
            payloadSha256: sha256({ targetDefinitionSha256, targetEvidenceSha256 }),
            sourceHead: head,
            sourceTree: tree,
          },
          bindingApplicability: (binding) => ({
            ...binding.applicability,
            firstEstimateThenRefine: true,
          }),
          expectedNormativeBindingCount: 29,
        });
        const publisherPreflight = await preflightCanonicalDefinitionPublishPlans(client, [plan]);
        if (!APPLY) {
          receipt = {
            status: "DRY_RUN_S19_FIRST_ESTIMATE_FINISH_VALIDATED",
            idempotent: false,
            mutationPerformed: false,
            predecessor: {
              releaseId: PARENT_RELEASE_ID,
              searchReleaseId: PARENT_SEARCH_RELEASE_ID,
              definitionId: representative.id,
              baselineId: representative.approved_template_baseline_id,
              shape: [parameters.length, formulas.length, resources.length, bindings.length],
            },
            successor: { releaseId, searchReleaseId, releaseKey, definitionId, baselineId },
            coreAcceptance,
            publisherPreflight,
          };
          await client.query("rollback");
        } else {
          await client.query(`insert into public.estimate_definition_release(
              id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
              definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
              parameter_count,formula_count)
            select $1,$2,schema_version,'draft',$3,$4,$5,definition_count,resource_row_count,
              metadata||$6::jsonb,$7,$8,parameter_count,formula_count
            from public.estimate_definition_release where id=$7`, [
            releaseId,
            releaseKey,
            head,
            tree,
            sha256(`${CONTRACT}:${fingerprint}:draft`),
            JSON.stringify({
              contract: CONTRACT,
              masterSha256: MASTER_SHA256,
              sourceHashes,
              sourceFingerprint: fingerprint,
              parentReleaseId: PARENT_RELEASE_ID,
              lifecycle: "DRAFT_FORWARD_ONLY",
              replacedDefinitionCount: 1,
              firstEstimateThenRefine: true,
              activationAllowed: false,
              productionEligible: false,
            }),
            PARENT_RELEASE_ID,
            sha256({ contract: CONTRACT, fingerprint, targetDefinitionSha256 }),
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
            releaseId, CONTRACT, PARENT_RELEASE_ID,
          ]);
          const persisted = await publishCanonicalDefinitionDraft(client, plan);
          const updated = await client.query(`update public.estimate_cumulative_manifest_entry set
              definition_version_id=$3,source_batch=$4,source_release_id=$1,
              publication_state='CANONICAL_SUCCESSOR',approved_template_baseline_id=$5,
              baseline_ready=true,scenario_ready=true,definition_hash=$6,entry_sha256=$7,
              runtime_publication_state='CANDIDATE'
            where release_id=$1 and catalog_id=$2`, [
            releaseId,
            DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
            definitionId,
            CONTRACT,
            baselineId,
            targetDefinitionSha256,
            sha256({
              contract: CONTRACT,
              releaseId,
              catalogId: DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
              definitionId,
              baselineId,
              targetDefinitionSha256,
            }),
          ]);
          invariant(updated.rowCount === 1, "STOP_S19_FINISH_MANIFEST_TARGET_UPDATE");
          const searchSnapshot = await cloneSearch(client, {
            releaseId, searchReleaseId, releaseKey, head, tree, fingerprint,
          });
          const audit = await auditState(client, releaseId, searchReleaseId, definitionId, baselineId);
          invariant(Number(audit.manifest.identities) === 10_331
            && Number(audit.manifest.replaced) === 1,
          `STOP_S19_FINISH_MANIFEST_AUDIT:${JSON.stringify(audit.manifest)}`);
          invariant(audit.target?.content_status === "CANDIDATE_READY"
            && audit.target?.content_gate_status === "GREEN"
            && Number(audit.target?.parameters) === 46
            && Number(audit.target?.formulas) === 29
            && Number(audit.target?.resources) === 29
            && Number(audit.target?.bindings) === 29,
          `STOP_S19_FINISH_TARGET_AUDIT:${JSON.stringify(audit.target)}`);
          invariant(audit.target?.input_values?.finish_paste_consumption_kg_m2 === 0.48
            && audit.target?.input_classification?.finish_paste_consumption_kg_m2 === "NORMATIVE"
            && audit.target?.input_classification?.preparation_operation === "ASSUMPTION"
            && !Object.prototype.hasOwnProperty.call(
              audit.target?.input_values ?? {},
              "repair_requirement_state",
            )
            && !Object.prototype.hasOwnProperty.call(
              audit.target?.input_classification ?? {},
              "repair_requirement_state",
            ),
          "STOP_S19_FINISH_BASELINE_AUDIT");
          invariant(audit.search?.status === "draft"
            && audit.search?.target_definition_id === definitionId
            && Number(audit.search?.documents) === 10_322
            && Number(audit.search?.visible) === 10_322,
          `STOP_S19_FINISH_SEARCH_AUDIT:${JSON.stringify(audit.search)}`);
          const unrelated = (await client.query(`select count(*)::int changed
            from public.estimate_cumulative_manifest_entry parent
            join public.estimate_cumulative_manifest_entry successor using(catalog_id)
            where parent.release_id=$1 and successor.release_id=$2 and parent.catalog_id<>$3
              and (parent.definition_version_id<>successor.definition_version_id
                or parent.source_batch<>successor.source_batch
                or parent.source_release_id<>successor.source_release_id
                or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
                or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
            PARENT_RELEASE_ID, releaseId, DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
          ])).rows[0] as Json;
          invariant(Number(unrelated.changed) === 0,
            `STOP_S19_FINISH_UNRELATED_MANIFEST_DRIFT:${unrelated.changed}`);
          await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId,
            audit.manifest.snapshot,
            JSON.stringify({
              lifecycle: "PREPARED_NOT_ACTIVE",
              searchReleaseId,
              searchSnapshotSha256: searchSnapshot.snapshot_sha256,
              firstEstimateThenRefine: true,
              targetCatalogId: DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID,
              sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256,
              priceState: "PARTIAL_NEEDS_PRICE",
            }),
          ]);
          const prepared = (await client.query(
            "select status,activated_at from public.estimate_definition_release where id=$1",
            [releaseId],
          )).rows[0] as Json;
          invariant(prepared?.status === "prepared" && prepared.activated_at == null,
            `STOP_S19_FINISH_FINAL_LIFECYCLE:${JSON.stringify(prepared)}`);
          await client.query("commit");
          receipt = {
            status: "GREEN_S19_FIRST_ESTIMATE_FINISH_PREPARED_NOT_ACTIVE",
            idempotent: false,
            mutationPerformed: true,
            predecessor: {
              releaseId: PARENT_RELEASE_ID,
              searchReleaseId: PARENT_SEARCH_RELEASE_ID,
              definitionId: representative.id,
              baselineId: lineage.baselineId,
            },
            successor: {
              releaseId, searchReleaseId, releaseKey, definitionId, baselineId,
              definitionVersion: nextDefinitionVersion,
              acceptanceEvidenceSha256: targetEvidenceSha256,
              publisherPersistedSelfAudit: persisted,
            },
            coreAcceptance,
            publisherPreflight,
            audit: { ...audit, unrelatedManifestChanges: Number(unrelated.changed), finalLifecycle: prepared },
          };
        }
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: { branch: EXPECTED_BRANCH, head, tree, fingerprint, sourceHashes },
    masterSha256: MASTER_SHA256,
    targetCatalogIds: [DRYWALL_CEILING_PREPARE_LARGE_AREA_CATALOG_ID],
    canonicalCompilerOwner: "compileCanonicalEstimateCore",
    canonicalPublisherOwner: "canonicalDefinitionPublisherR1",
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && receipt!.mutationPerformed === true) {
    atomicJson(resolve(OUTPUT_ROOT, `01_S19_FIRST_ESTIMATE_FINISH_${head}.json`), sealed);
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: receipt!.successor.releaseId,
      searchReleaseId: receipt!.successor.searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: 10_331,
      owner: "S19_FIRST_ESTIMATE_FINISH_SUCCESSOR",
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
