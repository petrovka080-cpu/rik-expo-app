import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { classifyManifestTraceSourceRole } from "./auditRealProfessionalNormPacks";

type Json = Record<string, any>;

type SourceRegistry = {
  sources?: Array<{
    source_id?: string;
    is_source_backed_professional_norm_pack?: boolean;
    review_status?: string;
    evidence_kind?: string | null;
  }>;
};

type CandidateSourceRow = {
  source_id: string;
  trace_resource_claim_rows: number;
  trace_definition_count: number;
  trace_catalog_count: number;
  normalized_binding_rows: number;
  normalized_definition_count: number;
  normalized_catalog_count: number;
  source_release_ids: string[];
  source_release_keys: string[];
  source_batches: string[];
  domains: string[];
  formula_ids: string[];
  formula_expressions: string[];
  norm_ids: string[];
  norm_versions: string[];
  norm_titles: string[];
  semantic_owners: string[];
  sample_catalog_ids: string[];
  accepted_registry_source: boolean;
  accepted_normalized_predecessor_binding: boolean;
  trace_source_role: ReturnType<typeof classifyManifestTraceSourceRole>;
  disposition: "ACCEPTED_NORMATIVE_SOURCE" | "NON_NORMATIVE_PROVENANCE" | "UNRESOLVED_NORMATIVE_SOURCE";
};

export const LEGACY_PACK_SOURCE_IDS = Object.freeze([
  "src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1",
  "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1",
  "src_professional_norm_pack_masonry_aac_block_600_200_200_piece_m2_wall_v1",
  "src_professional_norm_pack_masonry_brick_250_120_65_piece_m2_half_brick_v1",
  "src_professional_norm_pack_masonry_cement_lime_mortar_m3_m2_brick_v1",
  "src_professional_norm_pack_masonry_reinforcement_mesh_m2_m2_wall_v1",
  "src_professional_norm_pack_masonry_thin_bed_block_adhesive_kg_m2_200mm_v1",
  "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1",
] as const);

export const VERIFIED_SOURCE_IDS = Object.freeze([
  "verified_equipment_productivity",
  "verified_fleet_productivity",
  "verified_ratebook:road_marking",
  "verified_ratebook:traffic_signs",
] as const);

export type LegacyClaimCatalogPromiseDisposition =
  | "STANDALONE_FORMWORK_PROMISE"
  | "FULL_WORK_COMPONENT_APPLICABILITY_REVIEW_REQUIRED"
  | "OTHER_LEGACY_SOURCE";

export function classifyLegacyClaimCatalogPromise(input: {
  sourceId: string;
  catalogId: string;
  canonicalNameRu: string;
  primaryUom: string;
}): LegacyClaimCatalogPromiseDisposition {
  if (input.sourceId !== "src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1") {
    return "OTHER_LEGACY_SOURCE";
  }
  const promise = `${input.canonicalNameRu} ${input.primaryUom}`.toLocaleLowerCase("ru-RU");
  return /опалуб/iu.test(promise) && /(?:^|\s)(?:м²|m2)(?:\s|$)/iu.test(promise)
    ? "STANDALONE_FORMWORK_PROMISE"
    : "FULL_WORK_COMPONENT_APPLICABILITY_REVIEW_REQUIRED";
}

const RELATED_REVIEWED_SOURCE_BY_LEGACY_ID: Readonly<Record<string, string>> = Object.freeze({
  src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1:
    "src_professional_norm_pack_concrete_nrmca_cip31_selected_contingency_m3_m3_v1",
  src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1:
    "src_professional_norm_pack_formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1",
  src_professional_norm_pack_masonry_aac_block_600_200_200_piece_m2_wall_v1:
    "src_professional_norm_pack_masonry_bia_tn10_selected_brick_mortar_table_routing_v1",
  src_professional_norm_pack_masonry_brick_250_120_65_piece_m2_half_brick_v1:
    "src_professional_norm_pack_masonry_bia_tn10_selected_brick_mortar_table_routing_v1",
  src_professional_norm_pack_masonry_cement_lime_mortar_m3_m2_brick_v1:
    "src_professional_norm_pack_masonry_bia_tn10_selected_brick_mortar_table_routing_v1",
  src_professional_norm_pack_masonry_reinforcement_mesh_m2_m2_wall_v1:
    "src_professional_norm_pack_masonry_bia_tn10_selected_brick_mortar_table_routing_v1",
  src_professional_norm_pack_masonry_thin_bed_block_adhesive_kg_m2_200mm_v1:
    "src_professional_norm_pack_masonry_bia_tn10_selected_brick_mortar_table_routing_v1",
  src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1:
    "src_professional_norm_pack_reinforcement_project_bar_schedule_weight_same_unit_routing_v1",
});

const DEFAULT_DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const DEFAULT_MASTER_PATH =
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (5).md";
const SOURCE_REGISTRY_PATH = resolve("data/estimate-catalog/source-registry.json");
const RUNTIME_ROOT = resolve(".release-runtime/ai-estimate-real-professional-norm-packs");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function atomicText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function argument(name: string): string | null {
  const exactPrefix = `--${name}=`;
  const exact = process.argv.find((value) => value.startsWith(exactPrefix));
  if (exact) return exact.slice(exactPrefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function git(args: string[], allowFailure = false): string {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    }).trim();
  } catch (error) {
    if (allowFailure) return "";
    throw error;
  }
}

function trackedLocations(sourceId: string): string[] {
  return git(["grep", "-l", "-F", "-e", sourceId, "--"], true)
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean)
    .sort();
}

function locationRole(path: string): "BENCHMARK" | "TEST" | "EXECUTABLE_OR_DATA" {
  if (path.replace(/\\/gu, "/").startsWith("data/estimate-benchmarks/")) return "BENCHMARK";
  if (path.replace(/\\/gu, "/").startsWith("tests/")) return "TEST";
  return "EXECUTABLE_OR_DATA";
}

function acceptedRegistrySourceIds(): Set<string> {
  const registry = JSON.parse(readFileSync(SOURCE_REGISTRY_PATH, "utf8")) as SourceRegistry;
  return new Set((registry.sources ?? [])
    .filter((source) => source.is_source_backed_professional_norm_pack === true
      && source.review_status === "reviewed"
      && Boolean(source.evidence_kind))
    .map((source) => String(source.source_id ?? "").trim())
    .filter(Boolean));
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

async function loadTraceSources(client: Client, releaseId: string): Promise<Json[]> {
  return (await client.query(`select
      trace->>'normSourceId' source_id,
      count(*)::int trace_resource_claim_rows,
      count(distinct manifest.definition_version_id)::int trace_definition_count,
      count(distinct manifest.catalog_id)::int trace_catalog_count,
      (array_agg(distinct manifest.source_release_id::text order by manifest.source_release_id::text))[1:8] source_release_ids,
      (array_agg(distinct source_release.release_key order by source_release.release_key))[1:8] source_release_keys,
      (array_agg(distinct manifest.source_batch order by manifest.source_batch))[1:8] source_batches,
      (array_agg(distinct manifest.domain_id order by manifest.domain_id))[1:8] domains,
      (array_agg(distinct resource.formula_id order by resource.formula_id))[1:8] formula_ids,
      (array_agg(distinct formula.expression_source order by formula.expression_source)
        filter(where formula.expression_source is not null))[1:8] formula_expressions,
      (array_agg(distinct trace->>'normId' order by trace->>'normId')
        filter(where nullif(trace->>'normId','') is not null))[1:8] norm_ids,
      (array_agg(distinct trace->>'normVersion' order by trace->>'normVersion')
        filter(where nullif(trace->>'normVersion','') is not null))[1:8] norm_versions,
      (array_agg(distinct trace->>'normSourceTitle' order by trace->>'normSourceTitle')
        filter(where nullif(trace->>'normSourceTitle','') is not null))[1:8] norm_titles,
      (array_agg(distinct coalesce(resource.semantic_owner,resource.cost_owner_id,manifest.source_batch)
        order by coalesce(resource.semantic_owner,resource.cost_owner_id,manifest.source_batch)))[1:8] semantic_owners,
      (array_agg(distinct manifest.catalog_id order by manifest.catalog_id))[1:8] sample_catalog_ids
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_resource_spec resource
      on resource.definition_version_id=manifest.definition_version_id
    left join public.estimate_formula_graph formula
      on formula.definition_version_id=resource.definition_version_id
      and formula.formula_id=resource.formula_id
    left join public.estimate_definition_release source_release
      on source_release.id=manifest.source_release_id
    cross join lateral jsonb_array_elements(case
      when jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
        then resource.source_metadata->'normativeTrace'
      else '[]'::jsonb end) trace
    where manifest.release_id=$1 and nullif(trace->>'normSourceId','') is not null
    group by trace->>'normSourceId'
    order by trace->>'normSourceId'`, [releaseId])).rows as Json[];
}

async function loadNormalizedSources(client: Client, releaseId: string): Promise<Json[]> {
  return (await client.query(`select source.source_key source_id,
      count(*)::int normalized_binding_rows,
      count(distinct manifest.definition_version_id)::int normalized_definition_count,
      count(distinct manifest.catalog_id)::int normalized_catalog_count,
      bool_or(source.metadata @> '{"acceptedPredecessorBinding":true}'::jsonb)
        accepted_normalized_predecessor_binding,
      (array_agg(distinct manifest.source_release_id::text order by manifest.source_release_id::text))[1:8] source_release_ids,
      (array_agg(distinct source_release.release_key order by source_release.release_key))[1:8] source_release_keys,
      (array_agg(distinct manifest.source_batch order by manifest.source_batch))[1:8] source_batches,
      (array_agg(distinct manifest.domain_id order by manifest.domain_id))[1:8] domains,
      (array_agg(distinct resource.formula_id order by resource.formula_id))[1:8] formula_ids,
      (array_agg(distinct formula.expression_source order by formula.expression_source)
        filter(where formula.expression_source is not null))[1:8] formula_expressions,
      (array_agg(distinct coalesce(resource.semantic_owner,resource.cost_owner_id,manifest.source_batch)
        order by coalesce(resource.semantic_owner,resource.cost_owner_id,manifest.source_batch)))[1:8] semantic_owners,
      (array_agg(distinct manifest.catalog_id order by manifest.catalog_id))[1:8] sample_catalog_ids
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_work_normative_binding binding
      on binding.definition_version_id=manifest.definition_version_id
    join public.estimate_resource_spec resource
      on resource.id=binding.resource_spec_id
      and resource.definition_version_id=manifest.definition_version_id
    join public.estimate_normative_locator locator on locator.id=binding.locator_id
    join public.estimate_normative_source source on source.id=locator.source_id
    left join public.estimate_formula_graph formula
      on formula.definition_version_id=resource.definition_version_id
      and formula.formula_id=resource.formula_id
    left join public.estimate_definition_release source_release
      on source_release.id=manifest.source_release_id
    where manifest.release_id=$1
    group by source.source_key
    order by source.source_key`, [releaseId])).rows as Json[];
}

async function loadLegacyClaimCatalogPromises(
  client: Client,
  releaseId: string,
  searchReleaseId: string,
): Promise<Json[]> {
  return (await client.query(`select distinct
      trace->>'normSourceId' source_id,
      manifest.catalog_id,
      coalesce(search.canonical_name_ru,definition.passport->>'titleRu',passport.physical_result_ru,'') canonical_name_ru,
      coalesce(search.primary_uom,'') primary_uom,
      coalesce(definition.passport->>'familyId','') family_id,
      coalesce(definition.passport->'workDescription'->>'workType','') work_type
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    left join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    left join public.estimate_search_document search
      on search.search_release_id=$2 and search.catalog_id=manifest.catalog_id
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    cross join lateral jsonb_array_elements(case
      when jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
        then resource.source_metadata->'normativeTrace'
      else '[]'::jsonb end) trace
    where manifest.release_id=$1 and trace->>'normSourceId'=any($3::text[])
    order by trace->>'normSourceId',manifest.catalog_id`, [
    releaseId,
    searchReleaseId,
    [...LEGACY_PACK_SOURCE_IDS],
  ])).rows as Json[];
}

function mergeSourceRows(traceRows: Json[], normalizedRows: Json[], acceptedIds: Set<string>): CandidateSourceRow[] {
  const byId = new Map<string, CandidateSourceRow>();
  const ensure = (sourceId: string): CandidateSourceRow => {
    const existing = byId.get(sourceId);
    if (existing) return existing;
    const traceSourceRole = classifyManifestTraceSourceRole(sourceId);
    const accepted = acceptedIds.has(sourceId);
    const row: CandidateSourceRow = {
      source_id: sourceId,
      trace_resource_claim_rows: 0,
      trace_definition_count: 0,
      trace_catalog_count: 0,
      normalized_binding_rows: 0,
      normalized_definition_count: 0,
      normalized_catalog_count: 0,
      source_release_ids: [],
      source_release_keys: [],
      source_batches: [],
      domains: [],
      formula_ids: [],
      formula_expressions: [],
      norm_ids: [],
      norm_versions: [],
      norm_titles: [],
      semantic_owners: [],
      sample_catalog_ids: [],
      accepted_registry_source: accepted,
      accepted_normalized_predecessor_binding: false,
      trace_source_role: traceSourceRole,
      disposition: accepted
        ? "ACCEPTED_NORMATIVE_SOURCE"
        : traceSourceRole === "NORMATIVE_SOURCE"
          ? "UNRESOLVED_NORMATIVE_SOURCE"
          : "NON_NORMATIVE_PROVENANCE",
    };
    byId.set(sourceId, row);
    return row;
  };
  const mergeArrays = (target: CandidateSourceRow, source: Json): void => {
    for (const key of [
      "source_release_ids", "source_release_keys", "source_batches", "domains", "formula_ids",
      "formula_expressions", "norm_ids", "norm_versions", "norm_titles", "semantic_owners", "sample_catalog_ids",
    ] as const) {
      target[key] = [...new Set([...target[key], ...strings(source[key])])].sort().slice(0, 8);
    }
  };
  for (const source of traceRows) {
    const target = ensure(String(source.source_id));
    target.trace_resource_claim_rows = Number(source.trace_resource_claim_rows);
    target.trace_definition_count = Number(source.trace_definition_count);
    target.trace_catalog_count = Number(source.trace_catalog_count);
    mergeArrays(target, source);
  }
  for (const source of normalizedRows) {
    const target = ensure(String(source.source_id));
    target.normalized_binding_rows = Number(source.normalized_binding_rows);
    target.normalized_definition_count = Number(source.normalized_definition_count);
    target.normalized_catalog_count = Number(source.normalized_catalog_count);
    target.accepted_normalized_predecessor_binding =
      source.accepted_normalized_predecessor_binding === true;
    if (target.accepted_normalized_predecessor_binding) {
      target.disposition = "ACCEPTED_NORMATIVE_SOURCE";
    }
    mergeArrays(target, source);
  }
  return [...byId.values()].sort((left, right) => left.source_id.localeCompare(right.source_id));
}

async function historicalExactCounts(client: Client, sourceIds: readonly string[]): Promise<Map<string, Json>> {
  const rows = (await client.query(`select trace->>'normSourceId' source_id,
      count(*)::int historical_resource_claim_rows,
      count(distinct resource.definition_version_id)::int historical_definition_count,
      min(resource.created_at) first_seen_at,max(resource.created_at) last_seen_at
    from public.estimate_resource_spec resource
    cross join lateral jsonb_array_elements(case
      when jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
        then resource.source_metadata->'normativeTrace'
      else '[]'::jsonb end) trace
    where trace->>'normSourceId'=any($1::text[])
    group by trace->>'normSourceId' order by trace->>'normSourceId'`, [sourceIds])).rows as Json[];
  return new Map(rows.map((row) => [String(row.source_id), row]));
}

async function affectedDefinitionCount(
  client: Client,
  releaseId: string,
  unresolvedSourceIds: string[],
): Promise<number> {
  if (unresolvedSourceIds.length === 0) return 0;
  const row = (await client.query(`select count(distinct definition_version_id)::int count from(
      select manifest.definition_version_id
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_resource_spec resource
        on resource.definition_version_id=manifest.definition_version_id
      cross join lateral jsonb_array_elements(case
        when jsonb_typeof(resource.source_metadata->'normativeTrace')='array'
          then resource.source_metadata->'normativeTrace'
        else '[]'::jsonb end) trace
      where manifest.release_id=$1 and trace->>'normSourceId'=any($2::text[])
      union all
      select manifest.definition_version_id
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_work_normative_binding binding
        on binding.definition_version_id=manifest.definition_version_id
      join public.estimate_normative_locator locator on locator.id=binding.locator_id
      join public.estimate_normative_source source on source.id=locator.source_id
      where manifest.release_id=$1 and source.source_key=any($2::text[])
    ) affected`, [releaseId, unresolvedSourceIds])).rows[0] as Json;
  return Number(row.count);
}

export async function runCandidateNormSourceResidualAudit(): Promise<void> {
  const releaseId = argument("candidate-release-id");
  invariant(releaseId, "CANDIDATE_NORM_AUDIT_RELEASE_ID_REQUIRED");
  const expectedSearchReleaseId = argument("candidate-search-release-id");
  const masterPath = resolve(argument("master-path") ?? DEFAULT_MASTER_PATH);
  const databaseUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? DEFAULT_DATABASE_URL;
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const dirtyLines = git(["status", "--porcelain=v1", "--untracked-files=all"])
    .split(/\r?\n/u).filter(Boolean);
  const acceptedIds = acceptedRegistrySourceIds();
  const client = new Client({
    connectionString: databaseUrl,
    application_name: "candidate-norm-source-residual-audit",
  });
  await client.connect();
  try {
    await client.query("set statement_timeout='240s'");
    const release = (await client.query(`select release.*,
        (select count(*)::int from public.estimate_cumulative_manifest_entry
          where release_id=release.id) actual_manifest_count,
        (select count(*)::int from public.estimate_cumulative_manifest_entry manifest
          join public.estimate_resource_spec resource
            on resource.definition_version_id=manifest.definition_version_id
          where manifest.release_id=release.id) actual_resource_count
      from public.estimate_definition_release release where release.id=$1`, [releaseId])).rows[0] as Json | undefined;
    invariant(release, `CANDIDATE_NORM_AUDIT_RELEASE_NOT_FOUND:${releaseId}`);
    const searchReleaseId = String(expectedSearchReleaseId ?? release.metadata?.searchReleaseId ?? "");
    invariant(searchReleaseId, "CANDIDATE_NORM_AUDIT_SEARCH_RELEASE_ID_MISSING");
    const search = (await client.query(`select search.*,
        (select count(*)::int from public.estimate_search_document document
          where document.search_release_id=search.id) actual_document_count
      from public.estimate_search_index_release search where search.id=$1`, [searchReleaseId])).rows[0] as Json | undefined;
    invariant(search, `CANDIDATE_NORM_AUDIT_SEARCH_RELEASE_NOT_FOUND:${searchReleaseId}`);
    invariant(String(search.metadata?.definitionReleaseId ?? "") === releaseId,
      `CANDIDATE_NORM_AUDIT_SEARCH_DEFINITION_MISMATCH:${search.metadata?.definitionReleaseId ?? "missing"}`);

    const traceRows = await loadTraceSources(client, releaseId);
    const normalizedRows = await loadNormalizedSources(client, releaseId);
    const legacyClaimPromises = await loadLegacyClaimCatalogPromises(client, releaseId, searchReleaseId);
    const sources = mergeSourceRows(traceRows, normalizedRows, acceptedIds);
    const unresolved = sources.filter((source) => source.disposition === "UNRESOLVED_NORMATIVE_SOURCE");
    const unresolvedSourceIds = unresolved.map((source) => source.source_id);
    const unresolvedDefinitions = await affectedDefinitionCount(client, releaseId, unresolvedSourceIds);
    const exactIds = [...LEGACY_PACK_SOURCE_IDS, ...VERIFIED_SOURCE_IDS];
    const historical = await historicalExactCounts(client, exactIds);
    const sourceById = new Map(sources.map((source) => [source.source_id, source]));
    const exactDisposition = exactIds.map((sourceId) => {
      const current = sourceById.get(sourceId);
      const tracked = trackedLocations(sourceId);
      const history = historical.get(sourceId);
      const legacy = (LEGACY_PACK_SOURCE_IDS as readonly string[]).includes(sourceId);
      const currentReachable = Boolean(current
        && (current.trace_resource_claim_rows > 0 || current.normalized_binding_rows > 0));
      return {
        source_id: sourceId,
        group: legacy ? "LEGACY_PACK_ID" : "VERIFIED_ALIAS",
        current_candidate_reachable: currentReachable,
        current_trace_resource_claim_rows: current?.trace_resource_claim_rows ?? 0,
        current_trace_definition_count: current?.trace_definition_count ?? 0,
        current_normalized_binding_rows: current?.normalized_binding_rows ?? 0,
        current_normalized_definition_count: current?.normalized_definition_count ?? 0,
        historical_resource_claim_rows: Number(history?.historical_resource_claim_rows ?? 0),
        historical_definition_count: Number(history?.historical_definition_count ?? 0),
        historical_first_seen_at: history?.first_seen_at ?? null,
        historical_last_seen_at: history?.last_seen_at ?? null,
        source_release_ids: current?.source_release_ids ?? [],
        source_release_keys: current?.source_release_keys ?? [],
        source_batches: current?.source_batches ?? [],
        related_reviewed_source_id: RELATED_REVIEWED_SOURCE_BY_LEGACY_ID[sourceId] ?? null,
        related_source_is_not_a_universal_replacement: legacy,
        tracked_locations: tracked.map((path) => ({ path, role: locationRole(path) })),
        disposition: currentReachable ? "REAL_CURRENT_CANDIDATE_GAP" : "ABSENT_FROM_CURRENT_CANDIDATE",
      };
    });
    const generatedDefaults = unresolved.filter((source) =>
      source.source_id.startsWith("src_professional_norm_pack_catalog_"));
    const legacyReachable = exactDisposition.filter((row) =>
      row.group === "LEGACY_PACK_ID" && row.current_candidate_reachable);
    const verifiedReachable = exactDisposition.filter((row) =>
      row.group === "VERIFIED_ALIAS" && row.current_candidate_reachable);
    const legacyDistinctDefinitions = await affectedDefinitionCount(
      client,
      releaseId,
      legacyReachable.map((row) => row.source_id),
    );
    const relatedReviewedReachability = [...new Set(Object.values(RELATED_REVIEWED_SOURCE_BY_LEGACY_ID))]
      .sort().map((sourceId) => {
        const current = sourceById.get(sourceId);
        return {
          source_id: sourceId,
          accepted_registry_source: acceptedIds.has(sourceId),
          current_trace_resource_claim_rows: current?.trace_resource_claim_rows ?? 0,
          current_normalized_binding_rows: current?.normalized_binding_rows ?? 0,
        };
      });
    const legacyClaimPromiseAudit = legacyClaimPromises.map((row) => {
      const disposition = classifyLegacyClaimCatalogPromise({
        sourceId: String(row.source_id),
        catalogId: String(row.catalog_id),
        canonicalNameRu: String(row.canonical_name_ru),
        primaryUom: String(row.primary_uom),
      });
      return {
        ...row,
        catalog_key_form_token_not_evidence:
          String(row.catalog_id).includes("_form_") && !/опалуб/iu.test(String(row.canonical_name_ru)),
        disposition,
      };
    });
    const componentApplicabilityReview = legacyClaimPromiseAudit.filter((row) =>
      row.disposition === "FULL_WORK_COMPONENT_APPLICABILITY_REVIEW_REQUIRED");
    const capturedAt = new Date().toISOString();
    const directory = resolve(RUNTIME_ROOT, capturedAt.replace(/[:.]/gu, "-"));
    const ledgerPath = resolve(directory, "candidate-source-claim-formula-definition-ledger.jsonl");
    const summaryPath = resolve(directory, "candidate-summary.json");
    const ledgerText = sources.map((source) => JSON.stringify(source)).join("\n");
    atomicText(ledgerPath, `${ledgerText}${ledgerText ? "\n" : ""}`);
    const body = {
      schema_version: "rik-expo-app.candidate-norm-source-residual-audit.v1",
      captured_at: capturedAt,
      status: unresolved.length === 0
        ? "GREEN_CANDIDATE_NORM_SOURCE_RESIDUAL_EMPTY"
        : "STOP_CANDIDATE_NORM_SOURCE_RESIDUAL_PRESENT",
      scope: {
        read_only: true,
        exact_json_field_equality: true,
        sql_like_used: false,
        inherited_cumulative_manifest_included: true,
        normalized_bindings_included: true,
        database_definition_history_included_for_exact_8_plus_4: true,
        tracked_benchmark_and_test_locations_included_for_exact_8_plus_4: true,
      },
      source: {
        branch,
        head,
        tree,
        dirty_path_count: dirtyLines.length,
        dirty_manifest_sha256: shaObject(dirtyLines),
        master_path: masterPath,
        master_sha256: sha256(readFileSync(masterPath)),
        source_registry_path: SOURCE_REGISTRY_PATH,
        source_registry_sha256: sha256(readFileSync(SOURCE_REGISTRY_PATH)),
      },
      candidate: {
        definition_release_id: releaseId,
        definition_release_key: release.release_key,
        definition_status: release.status,
        definition_activated_at: release.activated_at,
        definition_source_commit: release.source_commit,
        definition_source_tree: release.source_tree,
        definition_parent_release_id: release.parent_release_id,
        declared_definition_count: Number(release.definition_count),
        actual_manifest_count: Number(release.actual_manifest_count),
        declared_resource_count: Number(release.resource_row_count),
        actual_resource_count: Number(release.actual_resource_count),
        search_release_id: searchReleaseId,
        search_release_key: search.release_key,
        search_status: search.status,
        search_actual_document_count: Number(search.actual_document_count),
      },
      current_residual: {
        declared_trace_source_id_count: traceRows.length,
        normalized_source_id_count: normalizedRows.length,
        union_source_id_count: sources.length,
        accepted_registry_source_id_count: sources.filter((source) => source.accepted_registry_source).length,
        accepted_normalized_predecessor_source_id_count: sources.filter(
          (source) => source.accepted_normalized_predecessor_binding,
        ).length,
        accepted_union_source_id_count: sources.filter(
          (source) => source.disposition === "ACCEPTED_NORMATIVE_SOURCE",
        ).length,
        unresolved_normative_source_id_count: unresolved.length,
        unresolved_distinct_definition_count: unresolvedDefinitions,
        generated_catalog_default_source_id_count: generatedDefaults.length,
        legacy_pack_source_id_count: legacyReachable.length,
        verified_alias_source_id_count: verifiedReachable.length,
        legacy_pack_trace_resource_claim_rows: legacyReachable.reduce(
          (sum, row) => sum + row.current_trace_resource_claim_rows, 0),
        legacy_pack_distinct_definition_count: legacyDistinctDefinitions,
        note: "Per-source DISTINCT definition counts overlap. unresolved_distinct_definition_count is the deduplicated candidate denominator.",
      },
      exact_8_plus_4_disposition: exactDisposition,
      related_reviewed_source_reachability: relatedReviewedReachability,
      legacy_claim_catalog_promise_audit: {
        row_count: legacyClaimPromiseAudit.length,
        component_applicability_review_required_count: componentApplicabilityReview.length,
        catalog_key_form_token_not_evidence_count: legacyClaimPromiseAudit.filter(
          (row) => row.catalog_key_form_token_not_evidence,
        ).length,
        rows: legacyClaimPromiseAudit,
      },
      next_family_candidates: unresolved
        .filter((source) => !source.source_id.startsWith("src_professional_norm_pack_catalog_"))
        .map((source) => ({
          source_id: source.source_id,
          definitions: source.trace_definition_count + source.normalized_definition_count,
          domains: source.domains,
          owners: source.semantic_owners,
          formulas: source.formula_expressions,
        }))
        .sort((left, right) => right.definitions - left.definitions),
      ledger: {
        path: ledgerPath,
        row_count: sources.length,
        sha256: sha256(`${ledgerText}${ledgerText ? "\n" : ""}`),
      },
      deploy_performed: false,
      activation_performed: false,
      ota_performed: false,
      release_performed: false,
    };
    const summary = { ...body, receipt_sha256: shaObject(body) };
    atomicJson(summaryPath, summary);
    process.stdout.write(`${JSON.stringify({
      status: summary.status,
      output: summaryPath,
      ledger: ledgerPath,
      candidate: summary.candidate,
      current_residual: summary.current_residual,
      exact_8_plus_4_disposition: exactDisposition.map((row) => ({
        source_id: row.source_id,
        disposition: row.disposition,
        trace_rows: row.current_trace_resource_claim_rows,
        definitions: row.current_trace_definition_count,
        normalized_bindings: row.current_normalized_binding_rows,
      })),
      legacy_claim_catalog_promise_audit: {
        row_count: legacyClaimPromiseAudit.length,
        component_applicability_review_required_count: componentApplicabilityReview.length,
        catalog_key_form_token_not_evidence_count: legacyClaimPromiseAudit.filter(
          (row) => row.catalog_key_form_token_not_evidence,
        ).length,
      },
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}
