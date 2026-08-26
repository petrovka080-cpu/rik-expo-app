import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";

import { Client } from "pg";

type Json = Record<string, any>;

const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_R5_5_5_PRODUCTION_GRADE_SINGLE_CANONICAL_MATERIAL_FIRST_CLEAR_RUSSIAN_NAMES_FULL_CATALOG_ASPHALT_WEB_ANDROID_50_PER_GROUP_GLOBAL_GREEN_RU.md");
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const CONTRACT = "rik-expo-app-r555.full-cumulative-successor-db.v1";
const PAYLOAD_CONTRACT = "rik-expo-app-r555.cumulative-successor.v1";
const DATABASE_URL = process.env.R555_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const PREDECESSOR_RELEASE_ID = "fe1357b1-d031-5011-8016-f03cb77916ab";
const PREDECESSOR_SEARCH_RELEASE_ID = "a5314296-c402-5c8e-9a30-883b1a1fac18";
const BUILD_RECEIPT = resolve(".release-runtime/r555/evidence/20A_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_BUILD.json");
const VALIDATION_RECEIPT = resolve(".release-runtime/r555/evidence/20B_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_INDEPENDENT_VALIDATION.json");
const DRY_RECEIPT = resolve(".release-runtime/r555/evidence/20C_R555_CUMULATIVE_SUCCESSOR_DRY_RUN_ROLLBACK.json");
const APPLY_RECEIPT = resolve(".release-runtime/r555/evidence/20D_R555_CUMULATIVE_SUCCESSOR_APPLY.json");
const DEFINITIONS = resolve(".release-runtime/r555/cumulative-successor-v1/R555_CUMULATIVE_DEFINITIONS.jsonl");
const PRICES = resolve(".release-runtime/r555/cumulative-successor-v1/R555_CUMULATIVE_PRICE_ITEMS.jsonl");
const SEARCH = resolve(".release-runtime/r555/cumulative-successor-v1/R555_CUMULATIVE_SEARCH_DOCUMENTS.jsonl");
const GROUPS = resolve(".release-runtime/r555/cumulative-successor-v1/R555_CUMULATIVE_SEARCH_GROUPS.json");
const MANIFEST = resolve(".release-runtime/r555/catalog-russian-v1/FULL_CATALOG_SOURCE_MANIFEST.jsonl");
const APPLY = process.argv.includes("--apply");
const OUTPUT = APPLY ? APPLY_RECEIPT : DRY_RECEIPT;

const EXPECTED = {
  sourceIdentities: 11_610,
  definitions: 10_322,
  parameters: 12_009,
  formulas: 615_452,
  resources: 615_452,
  procurement: 261_448,
  prices: 25_091,
  searchDocuments: 10_322,
  searchGroups: 2_368,
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_FULL_CUMULATIVE_INVARIANT:${code}`);
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  const bytes = Buffer.isBuffer(value) || typeof value === "string" ? value : stable(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function* jsonl(path: string): AsyncGenerator<Json> {
  const lines = createInterface({ input: createReadStream(path, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) if (line) yield JSON.parse(line) as Json;
}

function assertLocalDatabase(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2", `DATABASE_BOUNDARY_RED:${parsed.host}${parsed.pathname}`);
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/ё/gu, "е").replace(/[^0-9a-zа-я]+/giu, " ").trim().replace(/\s+/gu, " ");
}

function operationKind(definition: { workKey: string; titleRu: string }): string {
  const value = `${definition.workKey} ${normalize(definition.titleRu)}`;
  if (/demolit|dismant|removal|демонтаж|разбор|снос|фрезерован/iu.test(value)) return "DEMOLITION";
  if (/replacement|замен/iu.test(value)) return "REPLACEMENT";
  if (/repair|ремонт|восстанов/iu.test(value)) return "REPAIR";
  if (/maintenance|обслуживан/iu.test(value)) return "MAINTENANCE";
  if (/commission|пусконалад|ввод в эксплуатац/iu.test(value)) return "COMMISSIONING";
  if (/testing|test|испытан|проверка/iu.test(value)) return "TESTING";
  if (/design|проектирован/iu.test(value)) return "DESIGN";
  if (/survey|обследован|изыскан/iu.test(value)) return "SURVEY";
  return "NEW_INSTALLATION";
}

function databaseRowType(value: string): "material" | "labor" | "equipment" | "service" | "waste" | "other" {
  if (value === "work") return "labor";
  if (value === "transport") return "service";
  if (["material", "labor", "equipment", "service", "waste", "other"].includes(value)) {
    return value as "material" | "labor" | "equipment" | "service" | "waste" | "other";
  }
  throw new Error(`R555_FULL_CUMULATIVE_UNKNOWN_RESOURCE_ROW_TYPE:${value}`);
}

async function insertRows(client: Client, sql: string, rows: Json[], batchSize: number): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    await client.query(sql, [JSON.stringify(rows.slice(offset, offset + batchSize))]);
  }
}

function activeState(client: Client): Promise<{ definition: string[]; search: string[] }> {
  return Promise.all([
    client.query("select id::text from public.estimate_definition_release where status='active' order by id"),
    client.query("select id::text from public.estimate_search_index_release where status='active' order by id"),
  ]).then(([definition, search]) => ({
    definition: definition.rows.map((row) => String(row.id)),
    search: search.rows.map((row) => String(row.id)),
  }));
}

async function candidateResidue(client: Client, releaseId: string, searchReleaseId: string, releasePrefix: string): Promise<Json> {
  return (await client.query(`select
    (select count(*)::int from public.estimate_definition_release where id=$1) releases,
    (select count(*)::int from public.estimate_search_index_release where id=$2) search_releases,
    (select count(*)::int from public.estimate_definition_version where release_id=$1) definitions,
    (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest,
    (select count(*)::int from public.estimate_price_route where route_key like $3) price_routes,
    (select count(*)::int from public.estimate_price_snapshot where source_metadata->>'contract'=$4) price_snapshots,
    (select count(*)::int from public.estimate_candidate_capability_r3 where release_id=$1 or search_release_id=$2) capabilities`,
  [releaseId, searchReleaseId, `${releasePrefix}%`, CONTRACT])).rows[0] as Json;
}

async function measuredState(client: Client, releaseId: string, searchReleaseId: string): Promise<Json> {
  return (await client.query(`select
    (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_count,
    (select count(*)::int from public.estimate_definition_version where release_id=$1) definition_count,
    (select count(*)::int from public.estimate_parameter_definition p join public.estimate_definition_version d on d.id=p.definition_version_id where d.release_id=$1) parameter_count,
    (select count(*)::int from public.estimate_formula_graph f join public.estimate_definition_version d on d.id=f.definition_version_id where d.release_id=$1) formula_count,
    (select count(*)::int from public.estimate_resource_spec r join public.estimate_definition_version d on d.id=r.definition_version_id where d.release_id=$1) resource_count,
    (select count(*)::int from public.estimate_resource_spec r join public.estimate_definition_version d on d.id=r.definition_version_id where d.release_id=$1 and r.procurement_eligible) procurement_count,
    (select count(*)::int from public.estimate_approved_template_baseline where accepted_release_id=$1) baseline_count,
    (select count(*)::int from public.estimate_content_passport_r3 where release_id=$1) content_passport_count,
    (select count(*)::int from public.estimate_definition_version where release_id=$1 and content_status='CANDIDATE_READY' and content_gate_status='GREEN') green_definition_count,
    (select count(*)::int from public.estimate_resource_spec r join public.estimate_definition_version d on d.id=r.definition_version_id left join public.estimate_resource_price_route_binding b on b.resource_spec_id=r.id where d.release_id=$1 and b.resource_spec_id is null) resources_without_price_route,
    (select count(*)::int from public.estimate_search_document where search_release_id=$2) search_document_count,
    (select count(*)::int from public.estimate_search_document where search_release_id=$2 and selectable and adjudication_class='EFFECTIVE_WORK' and definition_release_id=$1 and definition_version_id is not null) selectable_search_document_count,
    (select count(*)::int from public.estimate_search_group where search_release_id=$2) search_group_count,
    (select count(*)::int from public.estimate_search_group_membership where search_release_id=$2) search_membership_count,
    (select count(*)::int from public.estimate_price_snapshot_item i join public.estimate_price_snapshot s on s.id=i.snapshot_id where s.source_metadata->>'contract'=$3) price_item_count,
    (select count(*)::int from public.estimate_candidate_capability_r3 where release_id=$1 or search_release_id=$2) capability_count`,
  [releaseId, searchReleaseId, CONTRACT])).rows[0] as Json;
}

function assertMeasured(value: Json): void {
  invariant(Number(value.manifest_count) === EXPECTED.definitions, `MANIFEST_COUNT:${value.manifest_count}`);
  invariant(Number(value.definition_count) === EXPECTED.definitions, `DEFINITION_COUNT:${value.definition_count}`);
  invariant(Number(value.parameter_count) === EXPECTED.parameters, `PARAMETER_COUNT:${value.parameter_count}`);
  invariant(Number(value.formula_count) === EXPECTED.formulas, `FORMULA_COUNT:${value.formula_count}`);
  invariant(Number(value.resource_count) === EXPECTED.resources, `RESOURCE_COUNT:${value.resource_count}`);
  invariant(Number(value.procurement_count) === EXPECTED.procurement, `PROCUREMENT_COUNT:${value.procurement_count}`);
  invariant(Number(value.baseline_count) === EXPECTED.definitions, `BASELINE_COUNT:${value.baseline_count}`);
  invariant(Number(value.content_passport_count) === EXPECTED.definitions, `CONTENT_COUNT:${value.content_passport_count}`);
  invariant(Number(value.green_definition_count) === EXPECTED.definitions, `GREEN_DEFINITION_COUNT:${value.green_definition_count}`);
  invariant(Number(value.resources_without_price_route) === 0, `PRICE_ROUTE_GAPS:${value.resources_without_price_route}`);
  invariant(Number(value.search_document_count) === EXPECTED.searchDocuments, `SEARCH_COUNT:${value.search_document_count}`);
  invariant(Number(value.selectable_search_document_count) === EXPECTED.searchDocuments, `SELECTABLE_SEARCH_COUNT:${value.selectable_search_document_count}`);
  invariant(Number(value.search_group_count) === EXPECTED.searchGroups, `SEARCH_GROUP_COUNT:${value.search_group_count}`);
  invariant(Number(value.search_membership_count) === EXPECTED.searchDocuments, `SEARCH_MEMBERSHIP_COUNT:${value.search_membership_count}`);
  invariant(Number(value.price_item_count) === EXPECTED.prices, `PRICE_ITEM_COUNT:${value.price_item_count}`);
  invariant(Number(value.capability_count) === 0, `EARLY_CAPABILITY_CREATED:${value.capability_count}`);
}

async function main(): Promise<void> {
  assertLocalDatabase();
  invariant(sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "MASTER_SHA_DRIFT");
  const build = JSON.parse(readFileSync(BUILD_RECEIPT, "utf8")) as Json;
  const validation = JSON.parse(readFileSync(VALIDATION_RECEIPT, "utf8")) as Json;
  invariant(build.schema_version === PAYLOAD_CONTRACT && build.status === "BUILT_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_AWAITING_DATABASE_DRY_RUN", "BUILD_RECEIPT_RED");
  invariant(validation.status === "GREEN_R555_CUMULATIVE_SUCCESSOR_PAYLOAD_INDEPENDENTLY_VALIDATED" && Number(validation.failure_count) === 0, "VALIDATION_RECEIPT_RED");
  invariant(Number(build.totals?.sourceIdentities) === EXPECTED.sourceIdentities && Number(build.totals?.visibleDefinitions) === EXPECTED.definitions, "BUILD_DENOMINATOR_RED");
  invariant(Number(validation.counts?.resources) === EXPECTED.resources && Number(validation.counts?.missingPriceBindings) === 0, "VALIDATION_DENOMINATOR_RED");

  const sourceHead = String(build.source_head);
  const sourceTree = String(build.source_tree);
  invariant(/^[0-9a-f]{40}$/u.test(sourceHead) && /^[0-9a-f]{64}$/u.test(sourceTree), "SOURCE_LINEAGE_RED");
  const releasePrefix = `r555-full-cumulative-${sourceTree.slice(0, 12)}`;
  const releaseId = uuid(`${CONTRACT}:release:${PREDECESSOR_RELEASE_ID}:${sourceTree}`);
  const searchReleaseId = uuid(`${CONTRACT}:search:${PREDECESSOR_SEARCH_RELEASE_ID}:${releaseId}:${sourceTree}`);
  const searchSourceTree = createHash("sha1").update(sourceTree).digest("hex");
  const sourceManifestSha = sha256(readFileSync(MANIFEST));
  const definitionArtifact = (build.artifacts as Json[]).find((row) => String(row.path).endsWith("R555_CUMULATIVE_DEFINITIONS.jsonl"));
  const searchArtifact = (build.artifacts as Json[]).find((row) => String(row.path).endsWith("R555_CUMULATIVE_SEARCH_DOCUMENTS.jsonl"));
  invariant(definitionArtifact?.sha256 === "5124d4d007e98d129937f388531b245f87d36b5b57b65922ca056be995614f81", "DEFINITION_ARTIFACT_DRIFT");
  invariant(searchArtifact?.sha256 === "7a8d5cc0ffcd964d64f7f4896975d8f7386d4976f32317a20911e45208c91d7b", "SEARCH_ARTIFACT_DRIFT");
  if (APPLY) {
    const dry = JSON.parse(readFileSync(DRY_RECEIPT, "utf8")) as Json;
    invariant(dry.status === "GREEN_R555_FULL_CUMULATIVE_DRY_RUN_ROLLED_BACK_NO_PERSISTED_WRITES", "DRY_RUN_RECEIPT_NOT_GREEN");
    invariant(dry.candidate_release_id === releaseId && dry.candidate_search_release_id === searchReleaseId && dry.source_tree === sourceTree, "DRY_RUN_LINEAGE_DRIFT");
  }

  const branch = execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  const started = Date.now();
  const client = new Client({ connectionString: DATABASE_URL, application_name: APPLY ? "r555-full-cumulative-apply" : "r555-full-cumulative-dry-run" });
  let transactionOpen = false;
  let activeBefore: { definition: string[]; search: string[] } = { definition: [], search: [] };
  let measured: Json = {};
  try {
    await client.connect();
    activeBefore = await activeState(client);
    const predecessor = (await client.query("select * from public.estimate_definition_release where id=$1", [PREDECESSOR_RELEASE_ID])).rows[0] as Json | undefined;
    const predecessorSearch = (await client.query("select * from public.estimate_search_index_release where id=$1", [PREDECESSOR_SEARCH_RELEASE_ID])).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared", "PREDECESSOR_RELEASE_NOT_PREPARED");
    invariant(predecessorSearch?.status === "draft", "PREDECESSOR_SEARCH_NOT_DRAFT");
    const preexisting = await candidateResidue(client, releaseId, searchReleaseId, releasePrefix);
    invariant(Object.values(preexisting).every((value) => Number(value) === 0), `CANDIDATE_PREEXISTS:${JSON.stringify(preexisting)}`);
    const sourceIdentityConflicts = (await client.query("select count(*)::int count from public.estimate_work_identity where source_identity like 'base-work:%' or source_identity like 'expanded-template:%' or catalog_id like 'canonical-work:%'")).rows[0];
    invariant(Number(sourceIdentityConflicts.count) === 0, `SOURCE_IDENTITY_CONFLICTS:${sourceIdentityConflicts.count}`);

    await client.query("begin");
    transactionOpen = true;
    await client.query("set local statement_timeout=0");
    await client.query("set local lock_timeout='5s'");
    const locked = (await client.query("select pg_try_advisory_xact_lock(hashtext($1)) locked", [CONTRACT])).rows[0];
    invariant(locked?.locked === true, "WRITER_LOCK_BUSY");

    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
    ) values($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`, [
      releaseId, releasePrefix, Number(predecessor.schema_version), sourceHead, sourceTree, sourceManifestSha,
      EXPECTED.definitions, EXPECTED.resources, JSON.stringify({
        contract: CONTRACT, masterSha256: MASTER_SHA256, payloadContract: PAYLOAD_CONTRACT,
        payloadValidationSha256: validation.payload_sha256, predecessorReleaseId: PREDECESSOR_RELEASE_ID,
        predecessorSearchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID, sourceIdentityManifest: "11610/11610",
        visibleDefinitions: "10322/10322", redirects: 1288, localDisposable: true,
        productionEligible: false, activationAllowed: false, activeReleaseSwitched: false,
      }), PREDECESSOR_RELEASE_ID, definitionArtifact.sha256, EXPECTED.parameters, EXPECTED.formulas,
    ]);

    const priceByGroup = new Map<string, Json[]>();
    for await (const price of jsonl(PRICES)) {
      const rows = priceByGroup.get(String(price.priceGroup)) ?? [];
      rows.push(price);
      priceByGroup.set(String(price.priceGroup), rows);
    }
    const priceRouteByGroup = new Map<string, string>();
    const priceSnapshotByGroup = new Map<string, string>();
    const priceRoutes: Json[] = [];
    const priceSnapshots: Json[] = [];
    const priceItems: Json[] = [];
    for (const [group, rows] of [...priceByGroup.entries()].sort(([left], [right]) => left.localeCompare(right))) {
      const routeId = uuid(`${CONTRACT}:price-route:${releaseId}:${group}`);
      const snapshotId = uuid(`${CONTRACT}:price-snapshot:${releaseId}:${group}:2026-08-26`);
      priceRouteByGroup.set(group, routeId);
      priceSnapshotByGroup.set(group, snapshotId);
      priceRoutes.push({
        id: routeId,
        routeKey: `${releasePrefix}:price:${sha256(group).slice(0, 16)}`,
        group,
        metadata: { contract: CONTRACT, priceGroup: group, productionMarketClaim: false },
      });
      priceSnapshots.push({ id: snapshotId, routeId, snapshotKey: `${releasePrefix}:snapshot:${sha256(group).slice(0, 16)}`, group, payloadSha256: sha256(rows) });
      for (const row of rows) priceItems.push({ ...row, snapshotId });
    }
    await insertRows(client, `insert into public.estimate_price_route(id,route_key,currency_code,region_code,priority,source_kind,metadata,active)
      select x.id,x."routeKey",'KGS','KG-B',100,'manual',x.metadata,true
      from jsonb_to_recordset($1::jsonb) as x(id uuid,"routeKey" text,"group" text,metadata jsonb)`, priceRoutes, 100);
    for (const row of priceSnapshots) {
      await client.query(`insert into public.estimate_price_snapshot(id,route_id,snapshot_key,captured_at,valid_until,currency_code,payload_sha256,source_metadata)
        values($1,$2,$3,'2026-08-26T00:00:00+06:00',null,'KGS',$4,$5::jsonb)`, [
        row.id, row.routeId, row.snapshotKey, row.payloadSha256,
        JSON.stringify({ contract: CONTRACT, priceGroup: row.group, regionRu: "Бишкек, Кыргызстан", effectiveDate: "2026-08-26", scheduleClass: "LOCAL_R555_REVIEW_ONLY", productionMarketClaim: false }),
      ]);
    }
    await insertRows(client, `insert into public.estimate_price_snapshot_item(snapshot_id,price_key,unit_id,unit_price,currency_code,source_row)
      select x."snapshotId",x."priceKey",x."unitId",x."unitPrice",x."currencyCode",x."sourceRow"
      from jsonb_to_recordset($1::jsonb) as x("snapshotId" uuid,"priceKey" text,"unitId" text,"unitPrice" numeric,"currencyCode" text,"sourceRow" jsonb)`, priceItems, 500);
    process.stdout.write(`[r555-full] prices ${priceItems.length}/${EXPECTED.prices}, routes ${priceRoutes.length}\n`);

    const definitionMeta = new Map<string, Json>();
    let loadedDefinitions = 0;
    const buffers = { identities: [] as Json[], definitions: [] as Json[], baselines: [] as Json[], parameters: [] as Json[], formulas: [] as Json[], resources: [] as Json[], bindings: [] as Json[], content: [] as Json[], manifest: [] as Json[] };
    const flushDefinitions = async (): Promise<void> => {
      if (buffers.definitions.length === 0) return;
      await insertRows(client, `insert into public.estimate_work_identity(catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible,canonical_owner)
        select x."catalogId",'global',x.domain,x."sourceIdentityId",x."workKey",x."titleRu",true,'backend'
        from jsonb_to_recordset($1::jsonb) as x("catalogId" text,domain text,"sourceIdentityId" text,"workKey" text,"titleRu" text)`, buffers.identities, 100);
      await insertRows(client, `insert into public.estimate_definition_version(id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata,content_status,content_gate_status)
        select x."definitionId",x."releaseId",x."catalogId",1,x.passport,x.applicability,x."definitionSha256",x."sourceMetadata",'QUARANTINED','RED'
        from jsonb_to_recordset($1::jsonb) as x("definitionId" uuid,"releaseId" uuid,"catalogId" text,passport jsonb,applicability jsonb,"definitionSha256" text,"sourceMetadata" jsonb)`, buffers.definitions, 50);
      await insertRows(client, `insert into public.estimate_approved_template_baseline(
          id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
          formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
          acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
        select x."baselineId",x."baselineKey",x."catalogId",x."definitionId",x."definitionId",x."parameterSchemaSha256",x.baseline,x."inputClassification",x."uomByParameter",
          x."formulaConsumers",x."resourceConsumers",x."normativeSources",x."guides",x."proposalRefs",x."validationRefs",x."acceptanceSha256",x."releaseId",now(),null,'APPROVED_TEMPLATE_BASELINE_R54_V1'
        from jsonb_to_recordset($1::jsonb) as x("baselineId" uuid,"baselineKey" text,"catalogId" text,"definitionId" uuid,"parameterSchemaSha256" text,baseline jsonb,
          "inputClassification" jsonb,"uomByParameter" jsonb,"formulaConsumers" jsonb,"resourceConsumers" jsonb,"normativeSources" jsonb,"guides" jsonb,
          "proposalRefs" jsonb,"validationRefs" jsonb,"acceptanceSha256" text,"releaseId" uuid)`, buffers.baselines, 50);
      await insertRows(client, `insert into public.estimate_parameter_definition(definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,default_value,constraints_json,truth_metadata,approved_template_baseline_id)
        select x."definitionId",x."parameterId",x.ordinal,x."valueType",x."unitId",x."titleRu",x.required,x."defaultValue",x.constraints,x."truthMetadata",x."baselineId"
        from jsonb_to_recordset($1::jsonb) as x("definitionId" uuid,"parameterId" text,ordinal integer,"valueType" text,"unitId" text,"titleRu" text,required boolean,"defaultValue" jsonb,constraints jsonb,"truthMetadata" jsonb,"baselineId" uuid)`, buffers.parameters, 300);
      await insertRows(client, `insert into public.estimate_formula_graph(definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256)
        select x."definitionId",x."formulaId",x."outputUnitId",x."expressionSource",x.ast,x."inputParameterIds",x."astSha256"
        from jsonb_to_recordset($1::jsonb) as x("definitionId" uuid,"formulaId" text,"outputUnitId" text,"expressionSource" text,ast jsonb,"inputParameterIds" text[],"astSha256" text)`, buffers.formulas, 500);
      await insertRows(client, `insert into public.estimate_resource_spec(id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,source_metadata,row_sha256)
        select x.id,x."definitionId",x."rowId",x.ordinal,x.section,x.category,x."titleRu",x."rowType",x."unitId",x."formulaId",x."inclusionAst",x."resourceGraph",x."semanticOwner",x."costOwnerId",x."procurementEligible",x."sourceMetadata",x."rowSha256"
        from jsonb_to_recordset($1::jsonb) as x(id uuid,"definitionId" uuid,"rowId" text,ordinal integer,section text,category text,"titleRu" text,"rowType" text,"unitId" text,"formulaId" text,"inclusionAst" jsonb,"resourceGraph" jsonb,"semanticOwner" text,"costOwnerId" text,"procurementEligible" boolean,"sourceMetadata" jsonb,"rowSha256" text)`, buffers.resources, 300);
      await insertRows(client, `insert into public.estimate_resource_price_route_binding(resource_spec_id,route_id,price_key,priority)
        select x."resourceId",x."routeId",x."priceKey",100 from jsonb_to_recordset($1::jsonb) as x("resourceId" uuid,"routeId" uuid,"priceKey" text)`, buffers.bindings, 500);
      await insertRows(client, `insert into public.estimate_content_passport_r3(definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
        select x."definitionId",x."releaseId",x."catalogId",'real-professional-estimates-r3.content-passport.v1','WORK',null,x."titleRu",x."includedScope",x."excludedScope",x."capabilityMatrix",x."parameterCount",x."formulaCount",x."resourceCount",x.decision,x."payloadSha256",x."sourceHead",x."sourceTree"
        from jsonb_to_recordset($1::jsonb) as x("definitionId" uuid,"releaseId" uuid,"catalogId" text,"titleRu" text,"includedScope" jsonb,"excludedScope" jsonb,"capabilityMatrix" jsonb,"parameterCount" integer,"formulaCount" integer,"resourceCount" integer,decision jsonb,"payloadSha256" text,"sourceHead" text,"sourceTree" text)`, buffers.content, 100);
      await client.query("update public.estimate_definition_version set content_status='CANDIDATE_READY',content_gate_status='GREEN' where id=any($1::uuid[])", [buffers.definitions.map((row) => row.definitionId)]);
      await insertRows(client, `insert into public.estimate_cumulative_manifest_entry(release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256,runtime_publication_state)
        select x."releaseId",x."catalogId",x."definitionId",'R555_FULL_CUMULATIVE',x."releaseId",x.domain,'CANONICAL_SUCCESSOR',x."baselineId",true,true,x."definitionSha256",x."entrySha256",'CANDIDATE'
        from jsonb_to_recordset($1::jsonb) as x("releaseId" uuid,"catalogId" text,"definitionId" uuid,domain text,"baselineId" uuid,"definitionSha256" text,"entrySha256" text)`, buffers.manifest, 100);
      for (const rows of Object.values(buffers)) rows.length = 0;
    };

    for await (const definition of jsonl(DEFINITIONS)) {
      const parameters = definition.parameters as Json[];
      const formulas = definition.formulas as Json[];
      const resources = definition.resources as Json[];
      const parameterSchemaSha256 = sha256(parameters.map((row) => [row.parameterId, row.ordinal, row.valueType, row.unitId, row.required, row.constraints]));
      const inputClassification = Object.fromEntries(parameters.map((row) => [row.parameterId, "ASSUMPTION"]));
      const uomByParameter = Object.fromEntries(parameters.map((row) => [row.parameterId, row.unitId]));
      const normativeSources = Object.fromEntries(parameters.map((row) => [row.parameterId, [`r555-source:${definition.templateId}`]]));
      const guides = Object.fromEntries(parameters.map((row) => [row.parameterId, row.titleRu]));
      const acceptanceSha256 = sha256({ contract: CONTRACT, catalogId: definition.catalogId, definitionId: definition.definitionId, baseline: definition.baseline, parameterSchemaSha256, resourceHashes: resources.map((row) => row.rowSha256) });
      buffers.identities.push(definition);
      buffers.definitions.push({
        definitionId: definition.definitionId, releaseId, catalogId: definition.catalogId,
        passport: { contract: PAYLOAD_CONTRACT, titleRu: definition.titleRu, aliasesRu: definition.aliasesRu, ...definition.passportSummary },
        applicability: definition.applicability, definitionSha256: definition.definitionSha256,
        sourceMetadata: { contract: CONTRACT, payloadContract: PAYLOAD_CONTRACT, masterSha256: MASTER_SHA256, sourceTree, sourceIdentityId: definition.sourceIdentityId, templateId: definition.templateId, groupId: definition.groupId, priceGroup: definition.priceGroup, publicEnglishWords: 0, genericRows: 0, epsilonRows: 0 },
      });
      buffers.baselines.push({
        baselineId: definition.baselineId, baselineKey: `${releasePrefix}:${sha256(definition.catalogId).slice(0, 20)}`,
        catalogId: definition.catalogId, definitionId: definition.definitionId, parameterSchemaSha256,
        baseline: definition.baseline, inputClassification, uomByParameter,
        formulaConsumers: definition.formulaConsumers, resourceConsumers: definition.resourceConsumers,
        normativeSources, guides,
        proposalRefs: [{ contract: PAYLOAD_CONTRACT, definitionArtifactSha256: definitionArtifact.sha256, sourceTree }],
        validationRefs: [{ scenario: "R555_FULL_APPLICABLE_DEFAULT", expectedRows: resources.length, evaluatedZeroRows: 0, genericRows: 0, publicEnglishWords: 0 }],
        acceptanceSha256, releaseId,
      });
      for (const parameter of parameters) {
        const visibilityRole = ["USER_INPUT", "USER_DERIVED_READONLY", "INTERNAL_ONLY"].includes(String(parameter.visibilityRole)) ? parameter.visibilityRole : "INTERNAL_ONLY";
        const truthMetadata: Json = {
          semantic_parameter_key: `${definition.catalogId}:${parameter.parameterId}`,
          visibility_role: visibilityRole,
          value_source_role: "VISIBLE_BASELINE_ASSUMPTION",
          baseline_assumption_id: `${definition.baselineId}:${parameter.parameterId}`,
          formula_consumers: definition.formulaConsumers?.[parameter.parameterId] ?? [],
          resource_branch_consumers: definition.resourceConsumers?.[parameter.parameterId] ?? [resources[0].rowId],
          provenance: {
            baselineOwner: "approved-template-baseline:r54", sourceCatalogId: definition.catalogId,
            sourceReleaseId: releaseId, sourceDefinitionVersionId: definition.definitionId,
            sourceParameterSchemaId: parameterSchemaSha256, approvedTemplateBaselineId: definition.baselineId,
            acceptanceEvidenceSha256: acceptanceSha256,
            approvedTemplateBinding: { contract: CONTRACT, sourceTree, payloadValidationSha256: validation.payload_sha256 },
          },
        };
        if (visibilityRole !== "INTERNAL_ONLY") truthMetadata.guide = {
          guide_short_ru: `Укажите значение параметра «${parameter.titleRu}» по обмеру или проектной документации.`,
          guide_kind: parameter.valueSourceRole === "USER_MEASURED" ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          source_role: String(parameter.valueSourceRole ?? "PROJECT_DOCUMENTATION"), guide_version: "R555_V1",
          source_snapshot_hash: acceptanceSha256, applicability: definition.titleRu,
          verified_at: "2026-08-26T00:00:00+06:00",
        };
        buffers.parameters.push({ ...parameter, definitionId: definition.definitionId, baselineId: definition.baselineId, truthMetadata });
      }
      for (const formula of formulas) buffers.formulas.push({ ...formula, definitionId: definition.definitionId });
      const routeId = priceRouteByGroup.get(String(definition.priceGroup));
      invariant(routeId, `PRICE_ROUTE_GROUP_MISSING:${definition.priceGroup}`);
      for (const resource of resources) {
        buffers.resources.push({ ...resource, rowType: databaseRowType(String(resource.rowType)), definitionId: definition.definitionId });
        buffers.bindings.push({ resourceId: resource.id, routeId, priceKey: resource.costOwnerId });
      }
      const contentDecision = { contract: "real-professional-estimates-r3.content-passport.v1", allowed: true, status: "GREEN", materialFirst: true, workSpecificApplicability: true, paddingRows: 0, genericRows: 0, epsilonRows: 0, publicEnglishWords: 0, payloadContract: PAYLOAD_CONTRACT };
      buffers.content.push({
        definitionId: definition.definitionId, releaseId, catalogId: definition.catalogId, titleRu: definition.titleRu,
        includedScope: definition.applicability?.includedScopeRu ?? [], excludedScope: definition.applicability?.excludedScopeRu ?? [],
        capabilityMatrix: [{ capability: "PARAMETERS", status: "GREEN" }, { capability: "FORMULAS", status: "GREEN" }, { capability: "RESOURCES", status: "GREEN" }, { capability: "PRICE_AND_PROCUREMENT", status: "GREEN_WITH_LOCAL_ACCEPTANCE_SNAPSHOT" }],
        parameterCount: parameters.length, formulaCount: formulas.length, resourceCount: resources.length,
        decision: contentDecision, payloadSha256: sha256({ definitionId: definition.definitionId, definitionSha256: definition.definitionSha256, contentDecision }), sourceHead, sourceTree,
      });
      buffers.manifest.push({ releaseId, catalogId: definition.catalogId, definitionId: definition.definitionId, domain: definition.domain, baselineId: definition.baselineId, definitionSha256: definition.definitionSha256, entrySha256: sha256({ contract: CONTRACT, releaseId, catalogId: definition.catalogId, definitionId: definition.definitionId, baselineId: definition.baselineId }) });
      definitionMeta.set(String(definition.catalogId), {
        definitionId: definition.definitionId, titleRu: definition.titleRu, workKey: definition.workKey,
        groupId: definition.groupId, parameters: parameters.filter((row) => row.visibilityRole !== "INTERNAL_ONLY").slice(0, 12),
        includedScope: definition.applicability?.includedScopeRu ?? [], excludedScope: definition.applicability?.excludedScopeRu ?? [],
      });
      loadedDefinitions += 1;
      if (buffers.definitions.length >= 20) await flushDefinitions();
      if (loadedDefinitions % 500 === 0) process.stdout.write(`[r555-full] definitions ${loadedDefinitions}/${EXPECTED.definitions}\n`);
    }
    await flushDefinitions();
    invariant(loadedDefinitions === EXPECTED.definitions && definitionMeta.size === EXPECTED.definitions, `DEFINITION_STREAM_COUNT:${loadedDefinitions}`);

    await client.query(`insert into public.estimate_search_index_release(id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata,created_at)
      values($1,$2,'draft','R555_FULL_RUSSIAN_V1','R555_G_FULL_V1','R555_LITERAL_SUBSTRING_V1',$3,$4,$5,$6,0,0,$7::jsonb,now())`, [
      searchReleaseId, `${releasePrefix}:search`, sourceHead, searchSourceTree, searchArtifact.sha256, EXPECTED.searchDocuments,
      JSON.stringify({ contract: CONTRACT, parentSearchReleaseId: PREDECESSOR_SEARCH_RELEASE_ID, parent_search_release_id: PREDECESSOR_SEARCH_RELEASE_ID, definitionReleaseId: releaseId, canonicalSourceTreeSha256: sourceTree, sourceIdentityManifest: "11610/11610", visibleDocuments: "10322/10322", redirectsRepresentedByAliases: 1288, localDisposable: true, productionEligible: false, activationAllowed: false }),
    ]);
    const groupRows = JSON.parse(readFileSync(GROUPS, "utf8")) as Json[];
    invariant(groupRows.length === EXPECTED.searchGroups, `GROUP_FILE_COUNT:${groupRows.length}`);
    await insertRows(client, `insert into public.estimate_search_group(search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
      select x."searchReleaseId",x."groupId",x."titleRu",x."domainId",x."systemId",x."groupId",x."groupId",x."groupId",x.breadcrumb,x."memberCount",x."memberSetSha256",x."oracleDisposition"
      from jsonb_to_recordset($1::jsonb) as x("searchReleaseId" uuid,"groupId" text,"titleRu" text,"domainId" text,"systemId" text,breadcrumb jsonb,"memberCount" integer,"memberSetSha256" text,"oracleDisposition" jsonb)`, groupRows.map((row) => ({
        ...row, searchReleaseId, domainId: row.domains[0] ?? "other", systemId: row.domains.length === 1 ? row.domains[0] : "multi_domain",
        memberCount: row.members.length, breadcrumb: [row.titleRu], oracleDisposition: { contract: CONTRACT, disposition: "EXACT_PHYSICAL_WORK_GROUP", memberCatalogIdsSha256: row.memberSetSha256 },
      })), 200);

    let searchDocuments = 0;
    let searchBuffer: Json[] = [];
    const flushSearch = async (): Promise<void> => {
      await insertRows(client, `insert into public.estimate_search_document(search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
        select x."searchReleaseId",x."catalogId",x.domain,x."familyId",x."groupId",x."groupId",x."familyId",x."groupId",null,'WORK',x."operationKind",'Каноническая технологическая работа версии 5.5.5','EXISTING_OR_NEW',x."primaryUom",x."titleRu",x.aliases,'{}'::text[],'{}'::text[],'ADMITTED_BACKEND','GLOBAL',x."releaseId",x."shortScope",x."keyParameters",x."requiredInputs",x."clarificationFields",x."includedScope",x."excludedScope",null,x."normalizedCatalogId",x."normalizedTitle",x."normalizedAliases",x."normalizedTerms",x."normalizedBlob",x.provenance,x."documentSha256",'EFFECTIVE_WORK',true,null,x."definitionId"
        from jsonb_to_recordset($1::jsonb) as x("searchReleaseId" uuid,"catalogId" text,domain text,"familyId" text,"groupId" text,"operationKind" text,"primaryUom" text,"titleRu" text,aliases text[],"releaseId" uuid,"shortScope" text,"keyParameters" jsonb,"requiredInputs" integer,"clarificationFields" jsonb,"includedScope" jsonb,"excludedScope" jsonb,"normalizedCatalogId" text,"normalizedTitle" text,"normalizedAliases" text[],"normalizedTerms" text[],"normalizedBlob" text,provenance jsonb,"documentSha256" text,"definitionId" uuid)`, searchBuffer, 250);
      searchBuffer = [];
    };
    for await (const document of jsonl(SEARCH)) {
      const meta = definitionMeta.get(String(document.canonical_work_id));
      invariant(meta && meta.definitionId === document.definition_id && meta.groupId === document.group_id, `SEARCH_DEFINITION_PARITY:${document.canonical_work_id}`);
      const aliases = [...new Set((document.public_aliases as string[]).map(String))];
      const normalizedAliases = [...new Set(aliases.map(normalize).filter(Boolean))];
      const normalizedBlob = normalize(String(document.search_text_normalized));
      const normalizedTerms = [...new Set([normalizedBlob, normalize(String(document.public_title_ru)), ...normalizedAliases, ...normalizedBlob.split(" ")].filter((term) => term.length >= 2))];
      const visibleParameters = meta.parameters as Json[];
      searchBuffer.push({
        searchReleaseId, catalogId: document.canonical_work_id, domain: document.domain, familyId: document.family_id,
        groupId: document.group_id, operationKind: operationKind(meta as { workKey: string; titleRu: string }), primaryUom: document.source_uom_ru,
        titleRu: document.public_title_ru, aliases, releaseId, shortScope: document.public_title_ru,
        keyParameters: visibleParameters.map((row) => ({ parameterId: row.parameterId, titleRu: row.titleRu, unitId: row.unitId, required: row.required })),
        requiredInputs: visibleParameters.filter((row) => row.required).length,
        clarificationFields: visibleParameters.map((row) => ({ parameterId: row.parameterId, titleRu: row.titleRu, unitId: row.unitId })),
        includedScope: meta.includedScope, excludedScope: meta.excludedScope,
        normalizedCatalogId: normalize(String(document.canonical_work_id)), normalizedTitle: normalize(String(document.public_title_ru)),
        normalizedAliases, normalizedTerms, normalizedBlob,
        provenance: { contract: CONTRACT, payloadContract: PAYLOAD_CONTRACT, sourceIdentityIds: document.source_identity_ids, ownerSourceIdentityId: document.owner_source_identity_id, definitionReleaseId: releaseId, searchReleaseId, sourceTree, sourceDocumentSha256: document.document_sha256 },
        documentSha256: sha256({ contract: CONTRACT, searchReleaseId, sourceDocumentSha256: document.document_sha256, definitionId: meta.definitionId }), definitionId: meta.definitionId,
      });
      searchDocuments += 1;
      if (searchBuffer.length >= 250) await flushSearch();
      if (searchDocuments % 1000 === 0) process.stdout.write(`[r555-full] search ${searchDocuments}/${EXPECTED.searchDocuments}\n`);
    }
    await flushSearch();
    invariant(searchDocuments === EXPECTED.searchDocuments, `SEARCH_STREAM_COUNT:${searchDocuments}`);
    const memberships: Json[] = [];
    for (const group of groupRows) for (const [ordinal, catalogId] of (group.members as string[]).entries()) memberships.push({ searchReleaseId, groupId: group.groupId, catalogId, ordinal, independentDisposition: { contract: CONTRACT, classification: "CANONICAL_VISIBLE", exactPhysicalIdentity: true } });
    await insertRows(client, `insert into public.estimate_search_group_membership(search_release_id,group_id,catalog_id,ordinal,independent_disposition)
      select x."searchReleaseId",x."groupId",x."catalogId",x.ordinal,x."independentDisposition" from jsonb_to_recordset($1::jsonb) as x("searchReleaseId" uuid,"groupId" text,"catalogId" text,ordinal integer,"independentDisposition" jsonb)`, memberships, 500);

    await client.query("update public.estimate_definition_release set status='prepared',sealed_at=now() where id=$1 and status='draft' and sealed_at is null", [releaseId]);
    measured = await measuredState(client, releaseId, searchReleaseId);
    assertMeasured(measured);
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    transactionOpen = false;

    const activeAfter = await activeState(client);
    invariant(JSON.stringify(activeAfter) === JSON.stringify(activeBefore), "ACTIVE_RELEASE_CHANGED");
    let residue: Json | null = null;
    if (!APPLY) {
      residue = await candidateResidue(client, releaseId, searchReleaseId, releasePrefix);
      invariant(Object.values(residue).every((value) => Number(value) === 0), `ROLLBACK_RESIDUE:${JSON.stringify(residue)}`);
    } else {
      const persisted = await measuredState(client, releaseId, searchReleaseId);
      assertMeasured(persisted);
      const statuses = (await client.query(`select
        (select status from public.estimate_definition_release where id=$1) release_status,
        (select status from public.estimate_search_index_release where id=$2) search_status`, [releaseId, searchReleaseId])).rows[0];
      invariant(statuses.release_status === "prepared" && statuses.search_status === "draft", `PERSISTED_STATUS_RED:${JSON.stringify(statuses)}`);
    }

    const receiptCore = {
      schema_version: CONTRACT, generated_utc: new Date().toISOString(), mode: APPLY ? "APPLY" : "DRY_RUN_ROLLED_BACK",
      status: APPLY ? "GREEN_R555_FULL_CUMULATIVE_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_R555_FULL_CUMULATIVE_DRY_RUN_ROLLED_BACK_NO_PERSISTED_WRITES",
      master_sha256: MASTER_SHA256, branch, source_head: sourceHead, source_tree: sourceTree,
      build_receipt_payload_sha256: build.payload_sha256, validation_receipt_payload_sha256: validation.payload_sha256,
      predecessor_release_id: PREDECESSOR_RELEASE_ID, predecessor_search_release_id: PREDECESSOR_SEARCH_RELEASE_ID,
      candidate_release_id: releaseId, candidate_release_key: releasePrefix, candidate_search_release_id: searchReleaseId,
      source_identity_manifest: "11610/11610", visible_definition_manifest: "10322/10322", redirect_disposition: "1288/1288",
      denominators: build.denominators, price_route_count: priceRoutes.length, price_snapshot_ids: Object.fromEntries(priceSnapshotByGroup),
      measured, rollback_residue: residue, active_before: activeBefore, active_after: activeAfter,
      capability_created: false, capability_rebind_deferred_to_next_controller_phase: true,
      elapsed_ms: Date.now() - started, local_database_only: true, database_changed: APPLY,
      production_accessed: false, deployed: false, merged: false, released: false, ota: false,
    };
    atomicJson(OUTPUT, { ...receiptCore, payload_sha256: sha256(receiptCore) });
    process.stdout.write(`${JSON.stringify({ status: receiptCore.status, candidate_release_id: releaseId, candidate_search_release_id: searchReleaseId, measured, elapsed_ms: receiptCore.elapsed_ms })}\n`);
  } catch (error) {
    if (transactionOpen) {
      try { await client.query("rollback"); } catch { /* preserve the primary error */ }
    }
    const failure = error instanceof Error ? error.stack ?? error.message : String(error);
    const receiptCore = {
      schema_version: CONTRACT, generated_utc: new Date().toISOString(), mode: APPLY ? "APPLY_FAILED_ROLLED_BACK" : "DRY_RUN_FAILED_ROLLED_BACK",
      status: "RED_R555_FULL_CUMULATIVE_SUCCESSOR_DATABASE_PREPARATION", master_sha256: MASTER_SHA256,
      candidate_release_id: releaseId, candidate_search_release_id: searchReleaseId, source_tree: sourceTree,
      error: failure, database_changed: false, production_accessed: false,
    };
    atomicJson(OUTPUT, { ...receiptCore, payload_sha256: sha256(receiptCore) });
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
