import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const CONTRACT = "rik-expo-app-r555.full-cumulative-successor-db-independent-audit.v1";
const DATABASE_URL = process.env.R555_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY_RECEIPT = resolve(".release-runtime/r555/evidence/20G_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_APPLY.json");
const OUTPUT = resolve(".release-runtime/r555/evidence/20H_R555_FULL_CUMULATIVE_SUCCESSOR_DB_INDEPENDENT_AUDIT.json");
const ALLOWED_FORMAL_CODES = new Set(["Ceresit", "CM", "Plus", "PLUS", "CT", "Profi", "Silicate", "Aero", "CN", "Knauf", "Fugenfuller", "Leicht", "CL", "Express", "LS", "DN", "IP", "RJ", "AC", "DC"]);

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Json;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
}
function sha256(value: unknown): string { return createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex"); }
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`R555_DB_AUDIT:${code}`); }
function normalize(value: string): string { return value.toLocaleLowerCase("ru-RU").replace(/ё/gu, "е").replace(/[^0-9a-zа-я]+/giu, " ").trim().replace(/\s+/gu, " "); }
function englishLexicalWords(value: string): string[] { return (value.match(/[A-Za-z]{2,}/gu) ?? []).filter((token) => !ALLOWED_FORMAL_CODES.has(token)); }
function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true }); const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); renameSync(temporary, path);
}

async function main(): Promise<void> {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname) && parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2", "DATABASE_BOUNDARY_RED");
  const apply = JSON.parse(readFileSync(APPLY_RECEIPT, "utf8")) as Json;
  invariant(apply.status === "GREEN_R555_FULL_CUMULATIVE_ASPHALT_RECONCILIATION_PREPARED_NOT_ACTIVE", "APPLY_NOT_GREEN");
  const releaseId = String(apply.candidate_release_id);
  const searchReleaseId = String(apply.candidate_search_release_id);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r555-full-cumulative-independent-read-audit" });
  await client.connect();
  try {
    await client.query("begin read only");
    const state = (await client.query(`select
      (select status from public.estimate_definition_release where id=$1) release_status,
      (select status from public.estimate_search_index_release where id=$2) search_status,
      (select count(*)::int from public.estimate_work_identity where catalog_id like 'canonical-work:%') identity_count,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1) manifest_count,
      (select count(*)::int from public.estimate_definition_version where release_id=$1) definition_count,
      (select count(*)::int from public.estimate_parameter_definition p join public.estimate_cumulative_manifest_entry m on m.definition_version_id=p.definition_version_id where m.release_id=$1) parameter_count,
      (select count(*)::int from public.estimate_formula_graph f join public.estimate_cumulative_manifest_entry m on m.definition_version_id=f.definition_version_id where m.release_id=$1) formula_count,
      (select count(*)::int from public.estimate_resource_spec r join public.estimate_cumulative_manifest_entry m on m.definition_version_id=r.definition_version_id where m.release_id=$1) resource_count,
      (select count(*)::int from public.estimate_resource_spec r join public.estimate_cumulative_manifest_entry m on m.definition_version_id=r.definition_version_id where m.release_id=$1 and r.procurement_eligible) procurement_count,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and approved_template_baseline_id is not null) baseline_count,
      (select count(*)::int from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id join public.estimate_content_passport_r3 p on p.definition_version_id=d.id and p.release_id=d.release_id and p.catalog_id=d.catalog_id where m.release_id=$1 and p.decision->>'allowed'='true' and p.decision->>'status'='GREEN') content_count,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2) search_document_count,
      (select count(*)::int from public.estimate_search_group where search_release_id=$2) group_count,
      (select count(*)::int from public.estimate_search_group_membership where search_release_id=$2) membership_count,
      (select count(*)::int from public.estimate_candidate_capability_r3 where release_id=$1 or search_release_id=$2) capability_count,
      (select count(*)::int from public.estimate_resource_spec r join public.estimate_cumulative_manifest_entry m on m.definition_version_id=r.definition_version_id left join public.estimate_resource_price_route_binding b on b.resource_spec_id=r.id where m.release_id=$1 and b.resource_spec_id is null) missing_price_routes,
      (select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1 and (not baseline_ready or not scenario_ready or approved_template_baseline_id is null or runtime_publication_state<>'CANDIDATE')) unready_manifest,
      (select count(*)::int from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id where m.release_id=$1 and (d.content_status<>'CANDIDATE_READY' or d.content_gate_status<>'GREEN')) nongreen_definitions,
      (select count(*)::int from public.estimate_search_document where search_release_id=$2 and (not selectable or adjudication_class<>'EFFECTIVE_WORK' or definition_release_id<>$1 or definition_version_id is null)) unselectable_documents`, [releaseId, searchReleaseId])).rows[0] as Json;
    const latinTitles = (await client.query(`select distinct title_ru from (
      select i.title_ru from public.estimate_work_identity i join public.estimate_cumulative_manifest_entry m on m.catalog_id=i.catalog_id where m.release_id=$1 and i.title_ru ~ '[A-Za-z]{2,}'
      union all
      select r.title_ru from public.estimate_resource_spec r join public.estimate_cumulative_manifest_entry m on m.definition_version_id=r.definition_version_id where m.release_id=$1 and r.title_ru ~ '[A-Za-z]{2,}'
    ) titles order by title_ru`, [releaseId])).rows as Array<{ title_ru: string }>;
    const lexicalViolations = latinTitles.map((row) => ({ titleRu: row.title_ru, words: englishLexicalWords(row.title_ru) })).filter((row) => row.words.length > 0);
    const publicContent = (await client.query(`select
      (select count(*)::int from public.estimate_resource_spec r join public.estimate_cumulative_manifest_entry m on m.definition_version_id=r.definition_version_id where m.release_id=$1 and (lower(trim(r.title_ru)) in ('выполнение работ','прочее') or lower(r.title_ru) like '%поставка состава%' or lower(r.title_ru) like '%работа механизма%')) generic_resource_titles,
      (select count(*)::int from public.estimate_formula_graph f join public.estimate_cumulative_manifest_entry m on m.definition_version_id=f.definition_version_id where m.release_id=$1 and f.expression_source='0.000001') epsilon_formulas`, [releaseId])).rows[0] as Json;
    publicContent.formal_code_titles = latinTitles.length;
    publicContent.english_lexical_violation_titles = lexicalViolations.length;
    publicContent.english_lexical_violation_samples = lexicalViolations.slice(0, 25);
    const queries = ["асф", "асфа", "асфальт", "асфальтобетон", "дорожное покрытие", "парковка", "демонтаж асфальта", "фрезерование", "ямочный ремонт", "бетон", "водо", "элект", "штукатур"];
    const searchChecks: Json[] = [];
    for (const query of queries) {
      const normalized = normalize(query);
      const result = await client.query(`select count(*)::int count,(array_agg(canonical_name_ru order by canonical_name_ru,catalog_id))[1:3] samples
        from public.estimate_search_document where search_release_id=$1 and selectable and normalized_search_blob like '%'||$2||'%'`, [searchReleaseId, normalized]);
      searchChecks.push({ query, normalized, count: Number(result.rows[0].count), samples: result.rows[0].samples ?? [] });
    }
    const active = {
      definition: (await client.query("select id::text from public.estimate_definition_release where status='active' order by id")).rows.map((row) => row.id),
      search: (await client.query("select id::text from public.estimate_search_index_release where status='active' order by id")).rows.map((row) => row.id),
    };
    await client.query("rollback");
    const failures: string[] = [];
    const expected: Json = { identity_count: 10322, manifest_count: 10329, definition_count: 0, parameter_count: 12841, formula_count: 615879, resource_count: 615879, procurement_count: 261515, baseline_count: 10329, content_count: 10329, search_document_count: 10329, group_count: 2369, membership_count: 10329, capability_count: 0, missing_price_routes: 0, unready_manifest: 0, nongreen_definitions: 0, unselectable_documents: 0 };
    if (state.release_status !== "prepared" || state.search_status !== "draft") failures.push("CANDIDATE_STATUS_RED");
    for (const [key, value] of Object.entries(expected)) if (Number(state[key]) !== value) failures.push(`${key}:${state[key]}:${value}`);
    for (const key of ["generic_resource_titles", "epsilon_formulas", "english_lexical_violation_titles"]) if (Number(publicContent[key]) !== 0) failures.push(`${key}:${publicContent[key]}`);
    for (const row of searchChecks) if (row.count === 0) failures.push(`EMPTY_SEARCH:${row.query}`);
    for (const row of searchChecks.slice(0, 3)) if (row.count !== 44) failures.push(`ASPHALT_DENOMINATOR:${row.query}:${row.count}:44`);
    if (JSON.stringify(active) !== JSON.stringify(apply.active_after)) failures.push("ACTIVE_STATE_DRIFT");
    const receipt = {
      schema_version: CONTRACT, generated_utc: new Date().toISOString(), master_sha256: MASTER_SHA256,
      status: failures.length === 0 ? "GREEN_R555_FULL_CUMULATIVE_SUCCESSOR_DB_INDEPENDENTLY_AUDITED" : "RED_R555_FULL_CUMULATIVE_SUCCESSOR_DB_AUDIT",
      candidate_release_id: releaseId, candidate_search_release_id: searchReleaseId,
      state, public_content: publicContent, search_checks: searchChecks, active_state: active,
      failures, failure_count: failures.length, database_changed: false, production_accessed: false,
    };
    atomicJson(OUTPUT, { ...receipt, payload_sha256: sha256(receipt) });
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    if (failures.length) process.exitCode = 1;
  } finally { await client.end(); }
}

void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
