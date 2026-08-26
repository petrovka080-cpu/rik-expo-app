import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Pool } from "pg";

type Json = Record<string, unknown>;
type ManifestRow = Json & {
  source_identity_id: string;
  source_corpus: string;
  source_family_id: string;
  source_domain: string;
  classification: string;
  canonical_work_id: string;
  public_title_ru: string;
  row_sha256: string;
};

const MASTER_SHA256 = "a875aa334eba28d4b7c654a05b3d19d21cb508a87015bbffcfd4f3d81805aa0b";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const BASE_PATH = "data/estimate-templates/estimate-10000-readiness-manifest.json";
const EXPANDED_PATH = "data/estimate-catalog/expanded-complex/templates.json";
const R58_LEDGER_PATH = ".release-runtime/p0-one-monolith-r58/evidence/08-adjudication/CATALOG_ADJUDICATION_LEDGER.jsonl";
const MANIFEST_PATH = ".release-runtime/r554/catalog/FULL_CATALOG_SOURCE_MANIFEST.jsonl";
const GROUP_PATH = ".release-runtime/r554/catalog/FULL_CATALOG_GROUP_MANIFEST.json";
const RECONCILIATION_PATH = ".release-runtime/r554/catalog/CATALOG_SEARCH_PROJECTION_RECONCILIATION.json";
const RECEIPT_PATH = ".release-runtime/r554/evidence/09_R554_CATALOG_SEARCH_RECONCILIATION_AND_GROUP_MANIFEST_BUILD.json";
const MODIFIERS = [
  "technical_room", "access_limited", "finish_ready", "small_area", "large_area",
  "high_load", "commercial", "wet_zone", "standard", "repair",
] as const;

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stable(value));
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as T;
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(resolve(path), "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function atomicJson(path: string, value: unknown): void {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, absolute);
}

function stripModifier(workKey: string): string {
  const modifier = MODIFIERS.find((candidate) => workKey.endsWith(`_${candidate}`));
  return modifier ? workKey.slice(0, -(modifier.length + 1)) : workKey;
}

function groupForExpanded(familyId: string): string {
  return ["asphalt_concrete_pavement", "road_construction", "village_road_construction"].includes(familyId)
    ? "wg:expanded:asphalt_concrete_pavement_route_family"
    : `wg:expanded:${familyId}`;
}

async function main(): Promise<void> {
  const manifest = readJsonl<ManifestRow>(MANIFEST_PATH);
  const base = readJson<{ templates: Json[] }>(BASE_PATH).templates;
  const expanded = readJson<Json[]>(EXPANDED_PATH);
  const r58 = readJsonl<Json>(R58_LEDGER_PATH);
  const baseById = new Map(base.map((row) => [`base-work:${String(row.work_key)}`, row]));
  const expandedById = new Map(expanded.map((row) => [`expanded-template:${String(row.template_id)}`, row]));
  const groupMembers = new Map<string, ManifestRow[]>();
  const membership: Json[] = [];

  for (const row of manifest) {
    const raw = row.source_corpus === "BASE_WORK_CATALOG_10000"
      ? baseById.get(row.source_identity_id)
      : expandedById.get(row.source_identity_id);
    if (!raw) throw new Error(`R554_GROUP_RAW_SOURCE_MISSING:${row.source_identity_id}`);
    const groupId = row.source_corpus === "BASE_WORK_CATALOG_10000"
      ? `wg:base:${stripModifier(String(raw.work_key))}`
      : groupForExpanded(String(raw.work_family_id));
    groupMembers.set(groupId, [...(groupMembers.get(groupId) ?? []), row]);
    membership.push({ source_identity_id: row.source_identity_id, canonical_work_id: row.canonical_work_id, classification: row.classification, group_id: groupId });
  }
  const groups = [...groupMembers.entries()].map(([groupId, members]) => {
    const sorted = members.slice().sort((left, right) => left.source_identity_id.localeCompare(right.source_identity_id));
    const visible = sorted.filter((row) => row.classification === "CANONICAL_VISIBLE");
    const redirects = sorted.filter((row) => row.classification === "REDIRECT_TO_CANONICAL");
    if (visible.length === 0) throw new Error(`R554_GROUP_WITHOUT_VISIBLE:${groupId}`);
    const withoutHash = {
      group_id: groupId,
      title_ru: visible[0].public_title_ru,
      domains: [...new Set(sorted.map((row) => row.source_domain))].sort(),
      family_ids: [...new Set(sorted.map((row) => row.source_family_id))].sort(),
      source_identity_ids: sorted.map((row) => row.source_identity_id),
      visible_source_identity_ids: visible.map((row) => row.source_identity_id),
      redirect_source_identity_ids: redirects.map((row) => row.source_identity_id),
      canonical_work_ids: [...new Set(visible.map((row) => row.canonical_work_id))].sort(),
      classification_basis: groupId.startsWith("wg:base:")
        ? "same physical work core; explicit scope modifiers remain distinct visible scenarios"
        : "same expanded technology family; estimate maturity redirects do not create duplicate work",
      numeric_slice_used: false,
    };
    return { ...withoutHash, group_sha256: shaObject(withoutHash) };
  }).sort((left, right) => left.group_id.localeCompare(right.group_id));
  const groupBase = {
    schema_version: "rik-expo-app-r554.full-catalog-group-manifest.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    group_count: groups.length,
    source_membership_count: membership.length,
    unique_source_membership_count: new Set(membership.map((row) => row.source_identity_id)).size,
    visible_membership_count: membership.filter((row) => row.classification === "CANONICAL_VISIBLE").length,
    redirect_membership_count: membership.filter((row) => row.classification === "REDIRECT_TO_CANONICAL").length,
    groups,
    membership_sha256: shaObject(membership),
  };
  const groupManifest = { ...groupBase, payload_sha256: shaObject(groupBase) };

  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const releaseResult = await pool.query(`
      select id::text,status,release_key,created_at,activated_at,snapshot_sha256
      from public.estimate_search_index_release
      order by created_at desc limit 1
    `);
    const release = releaseResult.rows[0] as Json | undefined;
    if (!release) throw new Error("R554_CURRENT_SEARCH_RELEASE_MISSING");
    const documentsResult = await pool.query(`
      select catalog_id,canonical_name_ru,catalog_origin,adjudication_class,selectable,
        definition_version_id::text,definition_release_id::text,group_id,document_sha256
      from public.estimate_search_document where search_release_id=$1 order by catalog_id
    `, [release.id]);
    const documents = documentsResult.rows as Json[];
    const currentIds = new Set(documents.map((row) => String(row.catalog_id)));
    const effectiveRows = r58.filter((row) => row.classification === "EFFECTIVE_WORK");
    const predecessorRuntimeIds = new Set(effectiveRows.flatMap((row) => [
      String(row.source_catalog_id ?? ""),
      String(row.legacy_runtime_catalog_id ?? ""),
      String(row.canonical_target_catalog_id ?? ""),
    ]).filter(Boolean));
    const matchedEffective = documents.filter((row) => predecessorRuntimeIds.has(String(row.catalog_id)));
    const nonGlobal = documents.filter((row) => String(row.catalog_origin) !== "GLOBAL");
    const unmatched = documents.filter((row) => !predecessorRuntimeIds.has(String(row.catalog_id)));
    const unexplained = unmatched.filter((row) => String(row.catalog_origin) === "GLOBAL");
    const distributions = Object.values(documents.reduce<Record<string, Json>>((accumulator, row) => {
      const key = [row.catalog_origin, row.adjudication_class, row.selectable, Boolean(row.definition_version_id)].join("|");
      const current = accumulator[key] ?? {
        catalog_origin: row.catalog_origin,
        adjudication_class: row.adjudication_class,
        selectable: row.selectable,
        has_definition: Boolean(row.definition_version_id),
        documents: 0,
      };
      current.documents = Number(current.documents) + 1;
      accumulator[key] = current;
      return accumulator;
    }, {})).sort((left, right) => stable(left).localeCompare(stable(right)));
    const reconciliationBase = {
      schema_version: "rik-expo-app-r554.catalog-search-projection-reconciliation.v1",
      generated_utc: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      predecessor_r58: {
        ledger_path: R58_LEDGER_PATH,
        ledger_sha256: sha256(readFileSync(resolve(R58_LEDGER_PATH))),
        source_total: r58.length,
        effective_work: effectiveRows.length,
      },
      current_search_release: release,
      equation: {
        current_documents: documents.length,
        current_unique_catalog_ids: currentIds.size,
        predecessor_effective_work: effectiveRows.length,
        matched_predecessor_effective_documents: matchedEffective.length,
        non_global_documents: nonGlobal.length,
        unmatched_documents: unmatched.length,
        unexplained_global_documents: unexplained.length,
        arithmetic_difference_3430_minus_3355: documents.length - effectiveRows.length,
      },
      explanation: "3 355 is the R5.8 source-inventory EFFECTIVE_WORK count; 3 430 is the later search-document projection count. The delta is accepted only when every added document is independently classified and no GLOBAL document is unexplained.",
      distributions,
      non_global_projection: nonGlobal.map((row) => ({ catalog_id: row.catalog_id, catalog_origin: row.catalog_origin, adjudication_class: row.adjudication_class, selectable: row.selectable, group_id: row.group_id })),
      unexplained_global_projection: unexplained.map((row) => ({ catalog_id: row.catalog_id, catalog_origin: row.catalog_origin, adjudication_class: row.adjudication_class, selectable: row.selectable, group_id: row.group_id })),
      current_projection_sha256: shaObject(documents.map((row) => [row.catalog_id, row.catalog_origin, row.adjudication_class, row.selectable, row.definition_version_id, row.group_id, row.document_sha256])),
      successor_target: { source_identities: 11_610, visible_search_documents: 10_322, groups: groups.length },
      active_release_changed: false,
      production_accessed: false,
    };
    const reconciliation = { ...reconciliationBase, payload_sha256: shaObject(reconciliationBase) };
    const failures: string[] = [];
    if (r58.length !== 11_610 || effectiveRows.length !== 3_355) failures.push("R58_PREDECESSOR_EQUATION_RED");
    if (documents.length !== 3_430 || currentIds.size !== 3_430) failures.push("CURRENT_3430_PROJECTION_RED");
    if (documents.length - effectiveRows.length !== 75) failures.push("ARITHMETIC_DELTA_NOT_75");
    if (unmatched.length !== 75 || nonGlobal.length !== 75 || unexplained.length !== 0) failures.push(`UNEXPLAINED_3355_3430_DELTA:unmatched=${unmatched.length}:non_global=${nonGlobal.length}:unexplained=${unexplained.length}`);
    if (groups.length < 678 || membership.length !== 11_610) failures.push("FULL_GROUP_PARTITION_RED");
    const denominators = {
      g_full: groups.length,
      web_group25: groups.length * 25,
      android_valid_group25: groups.length * 25,
      parity_group5: groups.length * 5,
      android_invalid: 3_390,
      android_total: groups.length * 25 + 3_390,
      combined_valid_web_android: groups.length * 50,
    };
    atomicJson(GROUP_PATH, groupManifest);
    atomicJson(RECONCILIATION_PATH, reconciliation);
    const receiptBase = {
      schema_version: "rik-expo-app-r554.catalog-search-reconciliation-and-groups-build.v1",
      generated_utc: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      status: failures.length === 0 ? "BUILT_R554_CATALOG_SEARCH_RECONCILIATION_AND_GROUPS_AWAITING_VALIDATION" : "RED_R554_CATALOG_SEARCH_RECONCILIATION_AND_GROUPS_BUILD",
      reconciliation_equation: reconciliation.equation,
      group_equation: {
        groups: groups.length,
        source_memberships: membership.length,
        visible_memberships: groupBase.visible_membership_count,
        redirect_memberships: groupBase.redirect_membership_count,
      },
      denominators,
      failures,
      artifacts: [GROUP_PATH, RECONCILIATION_PATH].map((path) => ({ path, bytes: readFileSync(resolve(path)).length, sha256: sha256(readFileSync(resolve(path))) })),
      active_release_changed: false,
      production_accessed: false,
    };
    const receipt = { ...receiptBase, payload_sha256: shaObject(receiptBase) };
    atomicJson(RECEIPT_PATH, receipt);
    process.stdout.write(`${JSON.stringify({ status: receipt.status, reconciliation_equation: receipt.reconciliation_equation, group_equation: receipt.group_equation, denominators, failures, payload_sha256: receipt.payload_sha256 })}\n`);
    if (failures.length) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
