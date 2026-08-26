import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

type Json = Record<string, any>;
type Classification = "KEEP" | "REPAIR" | "ALIAS" | "REDIRECT" | "QUARANTINE";

const CONTRACT = "real-professional-estimates-r2.batch001-008-authoritative-audit.v1";
const MASTER_SPEC_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_REAL_PROFESSIONAL_ESTIMATES_R1_RU (1).md");
const MASTER_SPEC_SHA256 = "b9373689e495a8d7e0883818371022eb792800baf10d19340f50c1aace08d986";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const BASE_RELEASE_ID = "a7dca174-3ad5-552b-aa4c-fc28979a56ef";
const TARGET_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID
  ?? "4c5affaf-5f63-5d04-b036-875c684f8c45";
const SEARCH_RELEASE_ID = process.env.CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID
  ?? "367c2439-df83-5f27-bedd-89247b50caae";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const ROOT = resolve(".release-runtime/real-professional-estimates-r2");
const BASELINE_PATH = resolve(ROOT, "evidence/00-baseline/BATCH001_008_BASELINE_LOCK.json");
const STATE_PATH = resolve(ROOT, "state/batch001_008_r2_state.json");
const MANIFEST_PATH = resolve(ROOT, "evidence/01-discovery/batch001_008_authoritative_manifest.json");
const AUDIT_PATH = resolve(ROOT, "evidence/02-static-audit/batch001_008_content_audit.jsonl");
const SUMMARY_PATH = resolve(ROOT, "evidence/02-static-audit/batch001_008_content_audit_summary.json");
const FACTS_PATH = resolve(ROOT, "evidence/02-static-audit/batch001_008_content_audit_facts.jsonl");
const MISSING_PATH = resolve(ROOT, "evidence/02-static-audit/missing-real-resources-report.json");
const SHARD_ROOT = resolve(ROOT, "state/static-audit-shards");
const SHARD_SCHEMA = "real-professional-estimates-r2.static-audit-shard.v2";
const ROUTE_MATRIX_SOURCE = resolve("scripts/estimate/p0TruthRemediationR2/buildR2RouteMatrix.ts");
const R4_CENSUS_SOURCE = resolve("scripts/estimate/p0TruthRemediationR4/buildR4CensusAndBefore.ts");

const NOISE_PATTERN = [
  "выполнени", "обмер", "подтверждени", "рабочая детализац", "контрол", "журнал",
  "акт\\M", "фотофиксац", "мониторинг", "координац", "организац.{0,20}поток",
  "инструктаж", "согласован", "испытан", "приемк", "приёмк", "надзор", "реестр",
  "сертификат", "хранен", "хранён", "планирован", "паспортизац", "исполнительн.{0,20}схем",
].join("|");
const GENERIC_PATTERN = [
  "^материал$", "^материалы$", "^механизм$", "^машина$", "^оборудование$", "^логистика$",
  "поставка состава", "материал для выполнения", "работа механизма", "рабочая детализация",
].join("|");
const RAW_UNITS = ["worker_h", "man_hour", "machine_h", "set", "test", "document", "connection", "service"];
const PHYSICAL_CATEGORIES = [
  "material", "materials", "construction_work", "work", "machine_equipment", "equipment",
  "machinery", "delivery", "transport", "logistics",
];

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256Buffer(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256Buffer(readFileSync(path));
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

function sha256(value: unknown): string {
  return sha256Buffer(Buffer.from(JSON.stringify(stable(value)), "utf8"));
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function writeJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(path: string, values: readonly unknown[]): void {
  atomicWrite(path, `${values.map((value) => JSON.stringify(value)).join("\n")}\n`);
}

function readShard(path: string, kind: string, domainId: string, expectedRows: number): Json[] | null {
  if (!existsSync(path)) return null;
  const shard = JSON.parse(readFileSync(path, "utf8")) as Json;
  invariant(shard.schemaVersion === SHARD_SCHEMA, `R2_SHARD_SCHEMA_DRIFT:${kind}:${domainId}`);
  invariant(shard.masterSpecSha256 === MASTER_SPEC_SHA256, `R2_SHARD_MASTER_DRIFT:${kind}:${domainId}`);
  invariant(shard.targetReleaseId === TARGET_RELEASE_ID, `R2_SHARD_RELEASE_DRIFT:${kind}:${domainId}`);
  invariant(shard.kind === kind && shard.domainId === domainId, `R2_SHARD_IDENTITY_DRIFT:${kind}:${domainId}`);
  invariant(Array.isArray(shard.rows) && shard.rows.length === expectedRows,
    `R2_SHARD_DENOMINATOR_DRIFT:${kind}:${domainId}:${shard.rows?.length}:${expectedRows}`);
  return shard.rows as Json[];
}

function writeShard(path: string, kind: string, domainId: string, rows: readonly Json[]): void {
  const payload = {
    schemaVersion: SHARD_SCHEMA,
    masterSpecSha256: MASTER_SPEC_SHA256,
    targetReleaseId: TARGET_RELEASE_ID,
    kind,
    domainId,
    rowCount: rows.length,
    rows,
  };
  writeJson(path, { ...payload, payloadSha256: sha256(payload) });
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean).sort((a, b) => a.localeCompare(b)) : [];
}

function countBy<T>(rows: readonly T[], key: (row: T) => string): Record<string, number> {
  return Object.fromEntries([...rows.reduce((map, row) => {
    const current = key(row);
    map.set(current, (map.get(current) ?? 0) + 1);
    return map;
  }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)));
}

function parameterDefects(row: Json): string[] {
  const defects: string[] = [];
  if (numberValue(row.parameter_count) === 0) defects.push("PARAMETER_SCHEMA_MISSING");
  if (numberValue(row.visible_parameter_count) === 0) defects.push("NO_USER_VISIBLE_INDIVIDUAL_PARAMETER");
  if (numberValue(row.visible_unused_count) > 0) defects.push(`VISIBLE_PARAMETER_UNUSED:${row.visible_unused_count}`);
  if (numberValue(row.missing_truth_metadata_count) > 0) defects.push(`PARAMETER_TRUTH_METADATA_MISSING:${row.missing_truth_metadata_count}`);
  if (numberValue(row.visible_guide_missing_count) > 0) defects.push(`INLINE_NORM_GUIDE_MISSING:${row.visible_guide_missing_count}`);
  if (numberValue(row.required_default_missing_count) > 0) defects.push(`DEFAULT_ESTIMATE_INPUT_MISSING:${row.required_default_missing_count}`);
  if (numberValue(row.unknown_formula_parameter_count) > 0) defects.push(`FORMULA_REFERENCES_UNKNOWN_PARAMETER:${row.unknown_formula_parameter_count}`);
  return defects;
}

function contentDefects(row: Json): string[] {
  const defects: string[] = [];
  if (numberValue(row.total_rows) === 0) defects.push("RESOURCE_ROWS_MISSING");
  if (numberValue(row.noise_rows) > 0) defects.push(`NON_BILLABLE_NOISE:${row.noise_rows}`);
  if (numberValue(row.raw_uom_rows) > 0) defects.push(`RAW_INTERNAL_UOM:${row.raw_uom_rows}`);
  if (numberValue(row.invalid_category_rows) > 0) defects.push(`CATEGORY_NOT_CANONICAL_OR_MAPPABLE:${row.invalid_category_rows}`);
  if (numberValue(row.generic_title_rows) > 0) defects.push(`GENERIC_PHYSICAL_NAME:${row.generic_title_rows}`);
  if (numberValue(row.english_only_rows) > 0) defects.push(`RAW_ENGLISH_TITLE:${row.english_only_rows}`);
  if (numberValue(row.missing_formula_rows) > 0) defects.push(`MISSING_FORMULA:${row.missing_formula_rows}`);
  if (numberValue(row.constant_untraced_rows) > 0) defects.push(`CONSTANT_QUANTITY_WITHOUT_NORM_OR_PROJECT_INPUT:${row.constant_untraced_rows}`);
  if (numberValue(row.missing_source_rows) > 0) defects.push(`MISSING_NORM_OR_PROJECT_SOURCE:${row.missing_source_rows}`);
  if (numberValue(row.blank_owner_rows) > 0) defects.push(`SEMANTIC_OWNER_MISSING:${row.blank_owner_rows}`);
  if (strings(row.duplicate_owners).length > 0) defects.push(`DUPLICATE_SEMANTIC_OWNER:${strings(row.duplicate_owners).length}`);
  if (strings(row.cross_domain_rows).length > 0) defects.push(`CROSS_DOMAIN_RESOURCE:${strings(row.cross_domain_rows).length}`);
  if (numberValue(row.delivery_without_cargo_rows) > 0) defects.push(`DELIVERY_WITHOUT_CARGO:${row.delivery_without_cargo_rows}`);
  if (numberValue(row.delivery_without_distance_rows) > 0) defects.push(`DELIVERY_WITHOUT_DISTANCE:${row.delivery_without_distance_rows}`);
  if (numberValue(row.delivery_without_vehicle_rows) > 0) defects.push(`DELIVERY_WITHOUT_VEHICLE:${row.delivery_without_vehicle_rows}`);
  return defects;
}

function missingCapabilities(row: Json): string[] {
  const missing: string[] = [];
  if (numberValue(row.valid_physical_rows) === 0) missing.push("physical_result:NO_ADMISSIBLE_PHYSICAL_ROWS");
  if (numberValue(row.valid_work_rows) === 0 && !["ALIAS", "REDIRECT"].includes(String(row.search_classification))) {
    missing.push("required_construction_operations:NOT_PROVEN");
  }
  if (numberValue(row.total_material_rows) > 0 && numberValue(row.valid_material_rows) === 0) {
    missing.push("required_materials:PRESENT_ONLY_AS_INVALID_ROWS");
  }
  if (numberValue(row.total_machine_rows) > 0 && numberValue(row.valid_machine_rows) === 0) {
    missing.push("applicable_machine_equipment:PRESENT_ONLY_AS_INVALID_ROWS");
  }
  if (numberValue(row.total_delivery_rows) > 0 && numberValue(row.valid_delivery_rows) === 0) {
    missing.push("applicable_delivery_flows:PRESENT_ONLY_AS_INVALID_ROWS");
  }
  return missing;
}

function classification(row: Json, defects: readonly string[], parameterIssues: readonly string[]): Classification {
  if (row.domain_id === "concrete") return "QUARANTINE";
  if (row.search_classification === "REDIRECT") return "REDIRECT";
  if (row.search_classification === "ALIAS") return "ALIAS";
  return defects.length > 0 || parameterIssues.length > 0 ? "REPAIR" : "KEEP";
}

async function main(): Promise<void> {
  invariant(existsSync(MASTER_SPEC_PATH), "R2_MASTER_SPEC_MISSING");
  invariant(sha256File(MASTER_SPEC_PATH) === MASTER_SPEC_SHA256, "R2_MASTER_SPEC_SHA256_DRIFT");
  invariant(existsSync(BASELINE_PATH), "R2_BASELINE_LOCK_MISSING");
  invariant(existsSync(STATE_PATH), "R2_RESUMABLE_STATE_MISSING");
  invariant(git(["branch", "--show-current"]) === EXPECTED_BRANCH, "R2_BRANCH_DRIFT");

  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Json;
  invariant(baseline.masterSpec?.sha256 === MASTER_SPEC_SHA256, "R2_BASELINE_MASTER_DRIFT");
  invariant(baseline.releases?.activeDefinitionReleaseId === ACTIVE_RELEASE_ID, "R2_BASELINE_ACTIVE_RELEASE_DRIFT");
  invariant(baseline.releases?.targetDefinitionReleaseId === TARGET_RELEASE_ID, "R2_BASELINE_TARGET_RELEASE_DRIFT");
  invariant(baseline.releases?.targetSearchReleaseId === SEARCH_RELEASE_ID, "R2_BASELINE_SEARCH_RELEASE_DRIFT");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch001-008-r2-authoritative-audit-readonly" });
  await client.connect();
  let releases: Json[];
  let manifestRows: Json[];
  let resourceRows: Json[];
  let parameterRows: Json[];
  let revisionRows: Json[];
  let sourceBatchCounts: Json[];
  let searchSummary: Json;
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout='300s'");

    releases = (await client.query(`with recursive lineage as (
      select r.*,0 depth from public.estimate_definition_release r where r.id=$1
      union all
      select parent.*,lineage.depth+1 from public.estimate_definition_release parent
      join lineage on parent.id=lineage.parent_release_id where lineage.depth<20
    ) select id::text,release_key,status,parent_release_id::text,definition_count,parameter_count,
      formula_count,resource_row_count,source_commit,source_tree,source_manifest_sha256,metadata,depth
      from lineage order by depth desc`, [TARGET_RELEASE_ID])).rows as Json[];

    manifestRows = (await client.query(`with search_docs as (
      select catalog_id,count(*)::int search_document_count,
        bool_or(selectable) selectable,
        max(adjudication_class) adjudication_class,
        max(replacement_catalog_id) replacement_catalog_id,
        max(canonical_target_catalog_id) canonical_target_catalog_id,
        max(definition_version_id::text) search_definition_version_id
      from public.estimate_search_document where search_release_id=$3 group by catalog_id
    )
    select m.catalog_id,m.domain_id,m.source_batch,m.source_release_id::text,
      m.definition_version_id::text,m.publication_state,m.baseline_ready,m.scenario_ready,
      m.approved_template_baseline_id::text,m.definition_hash,m.entry_sha256,
      d.definition_version,d.definition_sha256,d.passport,d.applicability,d.source_metadata,
      w.title_ru,w.namespace,w.source_identity,w.work_key,w.canonical_owner,w.denominator_eligible,
      base.definition_version_id::text base_definition_version_id,
      base.source_release_id::text base_source_release_id,
      coalesce(sd.search_document_count,0)::int search_document_count,coalesce(sd.selectable,false) search_selectable,
      sd.adjudication_class,sd.replacement_catalog_id,sd.canonical_target_catalog_id,
      sd.search_definition_version_id,
      case
        when coalesce(sd.replacement_catalog_id,sd.canonical_target_catalog_id) is not null
          and coalesce(sd.replacement_catalog_id,sd.canonical_target_catalog_id)<>m.catalog_id then 'REDIRECT'
        when upper(coalesce(sd.adjudication_class,d.source_metadata#>>'{inventoryRecord,classification}',''))='ALIAS' then 'ALIAS'
        else 'CANONICAL'
      end search_classification
    from public.estimate_cumulative_manifest_entry m
    join public.estimate_definition_version d on d.id=m.definition_version_id
    join public.estimate_work_identity w on w.catalog_id=m.catalog_id
    left join public.estimate_cumulative_manifest_entry base on base.release_id=$2 and base.catalog_id=m.catalog_id
    left join search_docs sd on sd.catalog_id=m.catalog_id
    where m.release_id=$1 order by m.catalog_id`, [TARGET_RELEASE_ID, BASE_RELEASE_ID, SEARCH_RELEASE_ID])).rows as Json[];

    const domainCounts = countBy(manifestRows, (row) => String(row.domain_id));
    const domainIds = Object.keys(domainCounts);
    resourceRows = [];
    for (const domainId of domainIds) {
      const shardPath = resolve(SHARD_ROOT, `resource-v2-${domainId}.json`);
      let shardRows = readShard(shardPath, "resource-v2", domainId, domainCounts[domainId]);
      if (!shardRows) shardRows = (await client.query(`with target as materialized (
      select m.catalog_id,m.domain_id,m.definition_version_id from public.estimate_cumulative_manifest_entry m where m.release_id=$1 and m.domain_id=$6
    ), binding as materialized (
      select distinct definition_version_id,resource_spec_id from public.estimate_work_normative_binding
      where definition_version_id in (select definition_version_id from target)
    ), resource as materialized (
      select t.catalog_id,t.domain_id,s.id,s.row_id,s.ordinal,s.category,s.title_ru,s.row_type,s.unit_id,
        s.formula_id,s.inclusion_ast,s.resource_graph,s.semantic_owner,s.source_metadata,
        f.formula_id is not null formula_exists,coalesce(cardinality(f.input_parameter_ids),0) formula_input_count,
        b.resource_spec_id is not null has_norm_binding,
        lower(coalesce(s.category,''))=any($4::text[]) category_mappable,
        lower(coalesce(s.unit_id,''))=any($5::text[]) raw_unit,
        lower(coalesce(s.title_ru,'')) ~ $2 noise_title,
        lower(coalesce(s.title_ru,'')) ~ $3 generic_title,
        (lower(coalesce(s.title_ru,'')) ~ $2
          or lower(coalesce(s.unit_id,''))=any($5::text[])
          or lower(coalesce(s.row_type,''))='labor'
          or lower(coalesce(s.title_ru,'')) ~ $3
          or lower(coalesce(s.category,''))=any(array['labor','test','testing','document','documentation','control','temporary_work','special_service','typed_child_interface'])) non_billable,
        (coalesce(s.source_metadata,'{}'::jsonb)::text ~* '(normative|norm_|sourcekey|source_key|locator|project|provenance)') source_trace,
        case
          when t.domain_id<>'asphalt' and lower(s.title_ru) ~ '(асфальт|битум)' then true
          when t.domain_id<>'drywall' and lower(s.title_ru) ~ '(гипсокартон|гкл\\M)' then true
          when t.domain_id<>'electrical' and lower(s.title_ru) ~ '(розетк|светильник|электрощит|кабель силов)' then true
          when t.domain_id<>'hvac_heat_supply' and lower(s.title_ru) ~ '(воздуховод|радиатор отоп)' then true
          when t.domain_id<>'water_supply_sewerage' and lower(s.title_ru) ~ '(канализационн|водопроводн)' then true
          else false
        end cross_domain
      from target t join public.estimate_resource_spec s on s.definition_version_id=t.definition_version_id
      left join public.estimate_formula_graph f on f.definition_version_id=s.definition_version_id and f.formula_id=s.formula_id
      left join binding b on b.definition_version_id=s.definition_version_id and b.resource_spec_id=s.id
    ), duplicate_owner as materialized (
      select catalog_id,semantic_owner from resource where nullif(btrim(semantic_owner),'') is not null
      group by catalog_id,semantic_owner having count(*)>1
    ), marked as materialized (
      select r.*,d.semantic_owner is not null duplicate_owner,
        (r.category_mappable and not r.non_billable
          and r.formula_exists and (r.has_norm_binding or r.source_trace)
          and nullif(btrim(r.semantic_owner),'') is not null and d.semantic_owner is null and not r.cross_domain) admissible
      from resource r left join duplicate_owner d on d.catalog_id=r.catalog_id and d.semantic_owner=r.semantic_owner
    )
    select catalog_id,
      count(*)::int total_rows,
      count(*) filter(where admissible)::int valid_physical_rows,
      count(*) filter(where non_billable)::int noise_rows,
      count(*) filter(where raw_unit or lower(coalesce(row_type,''))='labor')::int raw_uom_rows,
      count(*) filter(where not category_mappable)::int invalid_category_rows,
      count(*) filter(where generic_title)::int generic_title_rows,
      count(*) filter(where title_ru ~ '[A-Za-z]{3,}' and title_ru !~ '[А-Яа-яЁё]')::int english_only_rows,
      count(*) filter(where not formula_exists)::int missing_formula_rows,
      count(*) filter(where formula_exists and formula_input_count=0 and not has_norm_binding and not source_trace)::int constant_untraced_rows,
      count(*) filter(where not has_norm_binding and not source_trace)::int missing_source_rows,
      count(*) filter(where nullif(btrim(semantic_owner),'') is null)::int blank_owner_rows,
      count(*) filter(where lower(category)=any(array['material','materials']))::int total_material_rows,
      count(*) filter(where admissible and lower(category)=any(array['material','materials']))::int valid_material_rows,
      count(*) filter(where lower(category)=any(array['construction_work','work']))::int total_work_rows,
      count(*) filter(where admissible and lower(category)=any(array['construction_work','work']))::int valid_work_rows,
      count(*) filter(where lower(category)=any(array['machine_equipment','equipment','machinery']))::int total_machine_rows,
      count(*) filter(where admissible and lower(category)=any(array['machine_equipment','equipment','machinery']))::int valid_machine_rows,
      count(*) filter(where lower(category)=any(array['delivery','transport','logistics']))::int total_delivery_rows,
      count(*) filter(where admissible and lower(category)=any(array['delivery','transport','logistics']))::int valid_delivery_rows,
      count(*) filter(where lower(category)=any(array['delivery','transport','logistics'])
        and coalesce(source_metadata,'{}'::jsonb)::text !~* '(cargo|груз)')::int delivery_without_cargo_rows,
      count(*) filter(where lower(category)=any(array['delivery','transport','logistics'])
        and (coalesce(source_metadata,'{}'::jsonb)::text||coalesce(resource_graph,'{}'::jsonb)::text||coalesce(inclusion_ast,'{}'::jsonb)::text) !~* '(distance|расстоян)')::int delivery_without_distance_rows,
      count(*) filter(where lower(category)=any(array['delivery','transport','logistics'])
        and coalesce(source_metadata,'{}'::jsonb)::text !~* '(vehicle|transport|автомоб|самосвал|миксер|бортов)')::int delivery_without_vehicle_rows,
      coalesce((array_agg(row_id order by ordinal) filter(where non_billable))[1:20],'{}'::text[]) noise_samples,
      coalesce((array_agg(row_id order by ordinal) filter(where cross_domain))[1:20],'{}'::text[]) cross_domain_rows,
      coalesce((array_agg(distinct semantic_owner) filter(where duplicate_owner))[1:20],'{}'::text[]) duplicate_owners
    from marked group by catalog_id order by catalog_id`, [TARGET_RELEASE_ID, NOISE_PATTERN, GENERIC_PATTERN, PHYSICAL_CATEGORIES, RAW_UNITS, domainId])).rows as Json[];
      invariant(shardRows.length === domainCounts[domainId], `R2_RESOURCE_SHARD_DENOMINATOR:${domainId}:${shardRows.length}`);
      writeShard(shardPath, "resource-v2", domainId, shardRows);
      resourceRows.push(...shardRows);
    }
    resourceRows.sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));

    parameterRows = [];
    for (const domainId of domainIds) {
      const shardPath = resolve(SHARD_ROOT, `parameter-${domainId}.json`);
      let shardRows = readShard(shardPath, "parameter", domainId, domainCounts[domainId]);
      if (!shardRows) shardRows = (await client.query(`with target as materialized (
      select catalog_id,definition_version_id from public.estimate_cumulative_manifest_entry where release_id=$1 and domain_id=$2
    ), used as materialized (
      select distinct f.definition_version_id,unnest(f.input_parameter_ids) parameter_id
      from public.estimate_formula_graph f where f.definition_version_id in (select definition_version_id from target)
    ), unknown as materialized (
      select u.definition_version_id,count(distinct u.parameter_id)::int unknown_count from used u
      left join public.estimate_parameter_definition p on p.definition_version_id=u.definition_version_id and p.parameter_id=u.parameter_id
      where p.parameter_id is null group by u.definition_version_id
    )
    select t.catalog_id,count(p.*)::int parameter_count,
      count(p.*) filter(where upper(coalesce(p.truth_metadata->>'visibilityLevel',p.truth_metadata->>'visibility_level',p.truth_metadata->>'visibility','USER_VISIBLE'))<>'INTERNAL_ONLY')::int visible_parameter_count,
      count(p.*) filter(where coalesce(p.truth_metadata,'{}'::jsonb)='{}'::jsonb)::int missing_truth_metadata_count,
      count(p.*) filter(where upper(coalesce(p.truth_metadata->>'visibilityLevel',p.truth_metadata->>'visibility_level',p.truth_metadata->>'visibility','USER_VISIBLE'))<>'INTERNAL_ONLY'
        and coalesce(p.truth_metadata,'{}'::jsonb)::text !~* '(user.?guide|guide_kind|short.?norm|inline.?norm|normative.?link)')::int visible_guide_missing_count,
      count(p.*) filter(where upper(coalesce(p.truth_metadata->>'visibilityLevel',p.truth_metadata->>'visibility_level',p.truth_metadata->>'visibility','USER_VISIBLE'))<>'INTERNAL_ONLY'
        and used_parameter.parameter_id is null)::int visible_unused_count,
      count(p.*) filter(where p.required and p.default_value is null
        and upper(coalesce(p.truth_metadata->>'visibilityLevel',p.truth_metadata->>'visibility_level',p.truth_metadata->>'visibility','USER_VISIBLE'))<>'INTERNAL_ONLY')::int required_default_missing_count,
      coalesce(u.unknown_count,0)::int unknown_formula_parameter_count
    from target t left join public.estimate_parameter_definition p on p.definition_version_id=t.definition_version_id
    left join used used_parameter on used_parameter.definition_version_id=p.definition_version_id and used_parameter.parameter_id=p.parameter_id
    left join unknown u on u.definition_version_id=t.definition_version_id
    group by t.catalog_id,u.unknown_count order by t.catalog_id`, [TARGET_RELEASE_ID, domainId])).rows as Json[];
      invariant(shardRows.length === domainCounts[domainId], `R2_PARAMETER_SHARD_DENOMINATOR:${domainId}:${shardRows.length}`);
      writeShard(shardPath, "parameter", domainId, shardRows);
      parameterRows.push(...shardRows);
    }
    parameterRows.sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));

    revisionRows = [];
    for (const domainId of domainIds) {
      const shardPath = resolve(SHARD_ROOT, `revision-v2-${domainId}.json`);
      let shardRows = readShard(shardPath, "revision-v2", domainId, domainCounts[domainId]);
      if (!shardRows) shardRows = (await client.query(`with target as materialized (
      select catalog_id from public.estimate_cumulative_manifest_entry where release_id=$1 and domain_id=$2
    ), revision_row_fact as (
      select revision_id,count(*)::int actual_row_count from public.estimate_revision_row
      where revision_id in (select r.id from public.estimate_revision r join target t on t.catalog_id=r.catalog_id)
      group by revision_id
    ), artifact_fact as (
      select revision_id,
        count(*) filter(where artifact_kind in ('pdf','professional_pdf'))::int pdf_artifacts,
        count(*) filter(where artifact_kind in ('pdf','professional_pdf') and (status<>'ready' or sha256 is null or storage_key is null))::int invalid_pdf_artifacts,
        count(*) filter(where artifact_kind='procurement')::int procurement_artifacts,
        count(*) filter(where artifact_kind='procurement' and (status<>'ready' or sha256 is null or storage_key is null))::int invalid_procurement_artifacts
      from public.estimate_revision_artifact
      where revision_id in (select r.id from public.estimate_revision r join target t on t.catalog_id=r.catalog_id)
      group by revision_id
    ), revision_fact as (
      select r.id,r.catalog_id,r.status,r.row_count,r.checksum_sha256,r.output_hash,
        coalesce(rr.actual_row_count,0)::int actual_row_count,
        coalesce(a.pdf_artifacts,0)::int pdf_artifacts,
        coalesce(a.invalid_pdf_artifacts,0)::int invalid_pdf_artifacts,
        coalesce(a.procurement_artifacts,0)::int procurement_artifacts,
        coalesce(a.invalid_procurement_artifacts,0)::int invalid_procurement_artifacts
      from public.estimate_revision r
      join target t on t.catalog_id=r.catalog_id
      left join revision_row_fact rr on rr.revision_id=r.id
      left join artifact_fact a on a.revision_id=r.id
    ) select t.catalog_id,count(rf.id)::int revision_count,
      count(rf.*) filter(where rf.status<>'ready' or rf.row_count<>rf.actual_row_count or rf.checksum_sha256 is null or rf.output_hash is null)::int invalid_history_count,
      coalesce(sum(rf.pdf_artifacts),0)::int pdf_artifact_count,coalesce(sum(rf.invalid_pdf_artifacts),0)::int invalid_pdf_artifact_count,
      coalesce(sum(rf.procurement_artifacts),0)::int procurement_artifact_count,coalesce(sum(rf.invalid_procurement_artifacts),0)::int invalid_procurement_artifact_count
    from target t left join revision_fact rf on rf.catalog_id=t.catalog_id group by t.catalog_id order by t.catalog_id`, [TARGET_RELEASE_ID, domainId])).rows as Json[];
      invariant(shardRows.length === domainCounts[domainId], `R2_REVISION_SHARD_DENOMINATOR:${domainId}:${shardRows.length}`);
      writeShard(shardPath, "revision-v2", domainId, shardRows);
      revisionRows.push(...shardRows);
    }
    revisionRows.sort((left, right) => String(left.catalog_id).localeCompare(String(right.catalog_id)));

    sourceBatchCounts = (await client.query(`select source_batch,domain_id,count(*)::int count
      from public.estimate_cumulative_manifest_entry where release_id=$1 group by source_batch,domain_id
      order by source_batch,domain_id`, [TARGET_RELEASE_ID])).rows as Json[];
    searchSummary = (await client.query(`select r.id::text,r.release_key,r.status,r.global_count,
      count(d.*)::int actual_document_count,count(*) filter(where d.selectable)::int selectable_documents,
      count(distinct d.catalog_id)::int unique_catalogs
      from public.estimate_search_index_release r left join public.estimate_search_document d on d.search_release_id=r.id
      where r.id=$1 group by r.id`, [SEARCH_RELEASE_ID])).rows[0] as Json;

    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }

  invariant(manifestRows.length === 4_282, `R2_MANIFEST_DENOMINATOR_DRIFT:${manifestRows.length}`);
  invariant(new Set(manifestRows.map((row) => row.catalog_id)).size === 4_282, "R2_MANIFEST_DUPLICATE_CATALOG_ID");
  invariant(resourceRows.length === 4_282, `R2_RESOURCE_AUDIT_DENOMINATOR_DRIFT:${resourceRows.length}`);
  invariant(parameterRows.length === 4_282, `R2_PARAMETER_AUDIT_DENOMINATOR_DRIFT:${parameterRows.length}`);
  invariant(revisionRows.length === 4_282, `R2_REVISION_AUDIT_DENOMINATOR_DRIFT:${revisionRows.length}`);

  const resourceByCatalog = new Map(resourceRows.map((row) => [String(row.catalog_id), row]));
  const parameterByCatalog = new Map(parameterRows.map((row) => [String(row.catalog_id), row]));
  const revisionByCatalog = new Map(revisionRows.map((row) => [String(row.catalog_id), row]));
  const facts: Json[] = manifestRows.map((manifest): Json => {
    const resource = resourceByCatalog.get(String(manifest.catalog_id)) ?? {};
    const parameter = parameterByCatalog.get(String(manifest.catalog_id)) ?? {};
    const revision = revisionByCatalog.get(String(manifest.catalog_id)) ?? {};
    const row = { ...manifest, ...resource, ...parameter, ...revision };
    const resourceIssues = contentDefects(row);
    const parameterIssues = parameterDefects(row);
    const missing = missingCapabilities(row);
    const uiIssues = [
      ...(numberValue(row.search_document_count) === 0 ? ["SEARCH_DOCUMENT_MISSING"] : []),
      ...(row.search_definition_version_id && row.search_definition_version_id !== row.definition_version_id
        ? ["SEARCH_DEFINITION_VERSION_DRIFT"] : []),
      "R2_CONSUMER_BUTTON_MATRIX_NOT_YET_VERIFIED",
      "R2_THREE_ROLE_REVIEW_NOT_YET_VERIFIED",
    ];
    const historyPass = numberValue(row.invalid_history_count) === 0;
    const pdfPass = numberValue(row.invalid_pdf_artifact_count) === 0;
    const procurementPass = numberValue(row.invalid_procurement_artifact_count) === 0;
    const disposition = classification(row, [...resourceIssues, ...missing], parameterIssues);
    return {
      ...row,
      resourceDefects: resourceIssues,
      parameterDefectCodes: parameterIssues,
      missingCapabilityCodes: missing,
      uiWorkflowDefectCodes: uiIssues,
      historyPass,
      pdfPass,
      procurementPass,
      classification: disposition,
    } as Json;
  });

  const auditRows = facts.map((row) => ({
    batchId: row.source_batch,
    domainId: row.domain_id,
    catalogId: row.catalog_id,
    canonicalTitleRu: row.title_ru,
    currentVersionId: row.definition_version_id,
    currentReleaseId: TARGET_RELEASE_ID,
    classification: row.classification,
    existingValidRows: numberValue(row.valid_physical_rows),
    noiseRows: numberValue(row.noise_rows),
    missingRequiredResources: row.missingCapabilityCodes,
    crossDomainRows: strings(row.cross_domain_rows),
    duplicateOwners: strings(row.duplicate_owners),
    parameterDefects: row.parameterDefectCodes,
    uiWorkflowDefects: row.uiWorkflowDefectCodes,
    historyParity: row.historyPass ? "PASS" : "FAIL",
    pdfParity: row.pdfPass ? "PASS" : "FAIL",
    procurementParity: row.procurementPass ? "PASS" : "FAIL",
    successorVersionId: null,
    finalStatus: "RED",
  }));

  const baseCount = manifestRows.filter((row) => row.base_definition_version_id).length;
  const additions = manifestRows.filter((row) => !row.base_definition_version_id);
  const concreteRows = manifestRows.filter((row) => row.domain_id === "concrete");
  invariant(baseCount === 4_272, `R2_BASE_RELATION_DRIFT:${baseCount}`);
  invariant(additions.length === 10, `R2_SUCCESSOR_ADDITIONS_DRIFT:${additions.length}`);
  invariant(concreteRows.length === 1_220, `R2_CONCRETE_DENOMINATOR_DRIFT:${concreteRows.length}`);

  const manifest = {
    contract: CONTRACT,
    generatedAt: new Date().toISOString(),
    masterSpec: { path: MASTER_SPEC_PATH.replaceAll("\\", "/"), sha256: MASTER_SPEC_SHA256 },
    baseline: { path: BASELINE_PATH.replaceAll("\\", "/"), sha256: sha256File(BASELINE_PATH) },
    source: { branch: git(["branch", "--show-current"]), head: git(["rev-parse", "HEAD"]), tree: git(["show", "-s", "--format=%T", "HEAD"]) },
    releases: { activeReleaseId: ACTIVE_RELEASE_ID, baseReleaseId: BASE_RELEASE_ID, targetReleaseId: TARGET_RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID, lineage: releases },
    denominatorReconciliation: {
      authoritativeBatch001008Base: 4_272,
      equation4272: { nonAsphalt: 4_209, asphalt: 63, total: 4_272 },
      targetPreparedManifest: 4_282,
      equation4282: { preservedBase: baseCount, addedSuccessors: additions.length, total: manifestRows.length },
      concrete: { acceptedBaseline: 1_218, additions: 2, forensicAndTargetInventory: concreteRows.length },
      historical4440: {
        nonAsphaltTotal: 4_440,
        batch001008NonAsphalt: 4_209,
        excludedBatch009FireCandidate: 231,
        equation: "4209 + 231 = 4440",
        r2Disposition: "BATCH009_EXCLUDED_BY_OPERATOR_CONTRACT",
        sourceFiles: [
          { path: ROUTE_MATRIX_SOURCE.replaceAll("\\", "/"), sha256: sha256File(ROUTE_MATRIX_SOURCE) },
          { path: R4_CENSUS_SOURCE.replaceAll("\\", "/"), sha256: sha256File(R4_CENSUS_SOURCE) },
        ],
      },
    },
    sourceBatchCounts,
    searchSummary,
    additions: additions.map((row) => ({ catalogId: row.catalog_id, domainId: row.domain_id, sourceBatch: row.source_batch, definitionVersionId: row.definition_version_id })),
    entries: manifestRows.map((row) => ({
      batchId: row.source_batch,
      domainId: row.domain_id,
      catalogId: row.catalog_id,
      canonicalTitleRu: row.title_ru,
      definitionVersionId: row.definition_version_id,
      definitionVersion: row.definition_version,
      definitionSha256: row.definition_sha256,
      sourceReleaseId: row.source_release_id,
      baseDefinitionVersionId: row.base_definition_version_id,
      publicationState: row.publication_state,
      searchClassification: row.search_classification,
      searchDocumentCount: numberValue(row.search_document_count),
    })),
    databaseWritesApplied: 0,
    status: "GREEN_AUTHORITATIVE_MANIFEST_DISCOVERY_READ_ONLY",
  };

  const missingReport = {
    contract: "real-professional-estimates-r2.required-capability-matrix.v1",
    generatedAt: new Date().toISOString(),
    denominator: facts.length,
    status: "RED_REQUIRES_ENGINEERING_ADJUDICATION",
    rule: "An empty category is valid; only physically applicable capabilities may be required.",
    entries: facts.map((row) => ({
      batchId: row.source_batch,
      domainId: row.domain_id,
      catalogId: row.catalog_id,
      physicalResult: row.title_ru,
      requiredMaterials: { observedValidRows: numberValue(row.valid_material_rows), status: numberValue(row.total_material_rows) > 0 && numberValue(row.valid_material_rows) === 0 ? "RED" : "REVIEW_REQUIRED" },
      requiredConstructionOperations: { observedValidRows: numberValue(row.valid_work_rows), status: numberValue(row.valid_work_rows) === 0 ? "RED" : "REVIEW_REQUIRED" },
      applicableMachineEquipment: { observedValidRows: numberValue(row.valid_machine_rows), status: numberValue(row.total_machine_rows) > 0 && numberValue(row.valid_machine_rows) === 0 ? "RED" : "REVIEW_REQUIRED" },
      applicableDeliveryFlows: { observedValidRows: numberValue(row.valid_delivery_rows), status: numberValue(row.total_delivery_rows) > 0 && numberValue(row.valid_delivery_rows) === 0 ? "RED" : "REVIEW_REQUIRED" },
      optionalModules: [],
      mutuallyExclusiveModules: [],
      explicitExclusions: [],
      missingRequiredResources: row.missingCapabilityCodes,
      adjudicationStatus: "ENGINEERING_ROLE_REVIEW_REQUIRED",
    })),
  };

  const summaryPayload = {
    contract: CONTRACT,
    generatedAt: new Date().toISOString(),
    denominator: auditRows.length,
    coverage: `${auditRows.length}/${auditRows.length}`,
    classifications: countBy(auditRows, (row) => row.classification),
    domains: countBy(auditRows, (row) => row.domainId),
    batches: countBy(auditRows, (row) => row.batchId),
    finalStatuses: countBy(auditRows, (row) => row.finalStatus),
    totals: {
      resourceRows: facts.reduce((sum, row) => sum + numberValue(row.total_rows), 0),
      existingValidRows: auditRows.reduce((sum, row) => sum + row.existingValidRows, 0),
      noiseRows: auditRows.reduce((sum, row) => sum + row.noiseRows, 0),
      definitionsWithMissingCapabilities: auditRows.filter((row) => row.missingRequiredResources.length > 0).length,
      definitionsWithCrossDomainRows: auditRows.filter((row) => row.crossDomainRows.length > 0).length,
      definitionsWithDuplicateOwners: auditRows.filter((row) => row.duplicateOwners.length > 0).length,
      definitionsWithParameterDefects: auditRows.filter((row) => row.parameterDefects.length > 0).length,
      definitionsWithUiWorkflowDefects: auditRows.filter((row) => row.uiWorkflowDefects.length > 0).length,
      historyParityFailures: auditRows.filter((row) => row.historyParity === "FAIL").length,
      pdfParityFailures: auditRows.filter((row) => row.pdfParity === "FAIL").length,
      procurementParityFailures: auditRows.filter((row) => row.procurementParity === "FAIL").length,
    },
    gates: {
      fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
      activation: "NOT_RUN_PROHIBITED",
      deploy: "NOT_RUN_PROHIBITED",
      ota: "NOT_RUN_PROHIBITED",
      merge: "NOT_RUN_PROHIBITED",
      batch009: "NOT_RUN_PROHIBITED",
    },
    remediationQueue: auditRows.filter((row) => row.finalStatus === "RED").map((row) => row.catalogId),
    databaseWritesApplied: 0,
    status: "RED_STATIC_AUDIT_COMPLETE_REMEDIATION_REQUIRED",
  };
  const summary = { ...summaryPayload, payloadSha256: sha256(summaryPayload) };

  writeJson(MANIFEST_PATH, { ...manifest, payloadSha256: sha256(manifest) });
  writeJsonl(AUDIT_PATH, auditRows);
  writeJsonl(FACTS_PATH, facts);
  writeJson(MISSING_PATH, { ...missingReport, payloadSha256: sha256(missingReport) });
  writeJson(SUMMARY_PATH, summary);

  const state = JSON.parse(readFileSync(STATE_PATH, "utf8")) as Json;
  const updatedAt = new Date().toISOString();
  state.currentStage = "ADJUDICATION";
  state.updatedAt = updatedAt;
  state.stages.DISCOVERY = { status: "GREEN", updatedAt, evidence: [MANIFEST_PATH.replaceAll("\\", "/")] };
  state.stages.STATIC_AUDIT = { status: "RED_REMEDIATION_REQUIRED", updatedAt, evidence: [AUDIT_PATH, SUMMARY_PATH, FACTS_PATH, MISSING_PATH].map((path) => path.replaceAll("\\", "/")) };
  state.stages.ADJUDICATION = { status: "IN_PROGRESS", updatedAt };
  state.lastCheckpoint = { denominator: auditRows.length, audited: auditRows.length, queue: summaryPayload.remediationQueue.length, summarySha256: summary.payloadSha256 };
  atomicWrite(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    manifestPath: MANIFEST_PATH,
    auditPath: AUDIT_PATH,
    summaryPath: SUMMARY_PATH,
    missingReportPath: MISSING_PATH,
    denominator: auditRows.length,
    classifications: summaryPayload.classifications,
    totals: summaryPayload.totals,
    status: summaryPayload.status,
  }, null, 2)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
