import type { Client } from "pg";
import type { MasterSingleDefinitionSuccessorConfig } from "./prepareMasterSingleDefinitionSuccessorR1";
import { canonicalDefinitionPublicationStableValueR1 as stable } from
  "../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1";

type Json = Record<string, any>;
type QueryClient = Pick<Client, "query">;
export type MasterSingleDefinitionAppendGuardInput = Readonly<{
  config: Pick<MasterSingleDefinitionSuccessorConfig,
    "stopCode" | "catalogId" | "parentReleaseId" | "parentSearchReleaseId" | "sourceId" | "catalogAppend">;
  successorReleaseId: string;
  successorSearchReleaseId: string;
  compositeSourceArtifactSha256: string | null;
}>;

function invariant(value: unknown, input: MasterSingleDefinitionAppendGuardInput, suffix: string): asserts value {
  if (!value) throw new Error(`STOP_${input.config.stopCode}_${suffix}`);
}
function appendOf(input: MasterSingleDefinitionAppendGuardInput) {
  const append = input.config.catalogAppend;
  invariant(append != null, input, "APPEND_GUARD_REQUIRES_APPEND");
  return append;
}
// PG timestamp objects must become JSON strings before the historical object
// key serializer; otherwise a Date would be reduced to an empty object.
function normalized(value: unknown): unknown {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}
function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(stable(normalized(left))) === JSON.stringify(stable(normalized(right)));
}

export function masterSingleDefinitionAppendLockKeysR1(
  input: MasterSingleDefinitionAppendGuardInput,
): readonly string[] {
  const append = appendOf(input);
  const prefix = "master-single-definition-append:v1:";
  return [...new Set([
    ["parent", input.config.parentReleaseId, input.config.parentSearchReleaseId],
    ["catalog", input.config.catalogId],
    ["source-identity", append.identity.namespace, append.identity.sourceIdentity],
    ["group", input.config.parentSearchReleaseId, append.searchPlacement.groupId],
    ["source-key", input.config.sourceId],
  ].map(parts => prefix + JSON.stringify(parts)))].sort();
}

/** A narrow local publication lock set: these are exactly the tables whose
 * absent/existing rows form the append/source gates. Advisory keys coordinate
 * cooperating callers; the table locks also block conflicting DML from callers
 * that do not use those keys. They do not govern the filesystem pointer after
 * COMMIT, and do not claim to freeze every unrelated database table. */
export async function lockMasterSingleDefinitionAppendPreconditionsR1(
  client: QueryClient, input: MasterSingleDefinitionAppendGuardInput,
): Promise<void> {
  const append = appendOf(input);
  for (const key of masterSingleDefinitionAppendLockKeysR1(input)) {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [key]);
  }
  await client.query(`lock table
    public.estimate_cumulative_manifest_entry,
    public.estimate_definition_release,
    public.estimate_definition_version,
    public.estimate_normative_locator,
    public.estimate_normative_source,
    public.estimate_search_document,
    public.estimate_search_group,
    public.estimate_search_group_membership,
    public.estimate_search_index_release,
    public.estimate_work_identity
    in share row exclusive mode`);
  // The fixed order is shared by every caller of this helper.
  await client.query("select id from public.estimate_definition_release where id=$1 for update",
    [input.config.parentReleaseId]);
  await client.query("select id from public.estimate_search_index_release where id=$1 for update",
    [input.config.parentSearchReleaseId]);
  await client.query("select group_id from public.estimate_search_group where search_release_id=$1 and group_id=$2 for update",
    [input.config.parentSearchReleaseId, append.searchPlacement.groupId]);
  await client.query("select id from public.estimate_normative_source where source_key=$1 for update",
    [input.config.sourceId]);
}

export function assertMasterSingleDefinitionCompositeSourceR1(
  input: MasterSingleDefinitionAppendGuardInput,
  actual: Json | null | undefined,
  phase: "BEFORE" | "AFTER",
): void {
  const expected = input.compositeSourceArtifactSha256;
  if (expected == null) return;
  invariant(/^[0-9a-f]{64}$/i.test(expected), input, "COMPOSITE_SOURCE_ARTIFACT_REQUIRED");
  if (actual == null && phase === "BEFORE") return;
  invariant(actual != null && typeof actual.artifact_sha256 === "string"
    && actual.artifact_sha256.toLowerCase() === expected.toLowerCase(),
  input, phase === "BEFORE" ? "COMPOSITE_SOURCE_ARTIFACT_IMMUTABLE" : "COMPOSITE_SOURCE_ARTIFACT_PERSISTENCE");
}

export function assertMasterSingleDefinitionAppendSnapshotR1(
  input: MasterSingleDefinitionAppendGuardInput, snapshot: Json,
): void {
  const append = appendOf(input);
  invariant(snapshot.parent?.id === input.config.parentReleaseId
    && snapshot.parent.status === "prepared" && snapshot.parent.activated_at == null,
  input, "APPEND_PARENT_NOT_PREPARED_INACTIVE");
  invariant(snapshot.parentSearch?.id === input.config.parentSearchReleaseId
    && snapshot.parentSearch.status === "draft" && snapshot.parentSearch.activated_at == null
    && snapshot.parentSearch.sealed_at == null,
  input, "APPEND_PARENT_SEARCH_NOT_DRAFT_INACTIVE");
  for (const [field, suffix] of [
    ["parentTargetCount", "APPEND_PARENT_ALREADY_HAS_TARGET"],
    ["catalogDefinitionCount", "APPEND_DEFINITION_HISTORY_COLLISION"],
    ["parentSearchTargetCount", "APPEND_PARENT_SEARCH_ALREADY_HAS_TARGET"],
    ["ordinalCollisionCount", "APPEND_SEARCH_ORDINAL_COLLISION"],
    ["successorReleaseCount", "APPEND_SUCCESSOR_RELEASE_APPEARED"],
    ["successorSearchReleaseCount", "APPEND_SUCCESSOR_SEARCH_APPEARED"],
  ] as const) invariant(snapshot[field] === 0, input, suffix);
  invariant(Array.isArray(snapshot.identities) && snapshot.identities.length === 0,
    input, "APPEND_IDENTITY_OR_SOURCE_IDENTITY_COLLISION");
  const placement = append.searchPlacement;
  if (placement.groupMode === "create") {
    invariant(snapshot.group == null, input, "APPEND_SEARCH_GROUP_ALREADY_EXISTS");
  } else {
    const group = snapshot.group;
    invariant(group != null && group.group_id === placement.groupId
      && group.group_name_ru === placement.groupNameRu
      && group.domain_id === placement.domainId
      && group.system_id === placement.systemId
      && group.subsystem_id === placement.subsystemId
      && group.assembly_id === placement.assemblyId
      && group.work_family_id === placement.workFamilyId
      && equal(group.breadcrumb, placement.breadcrumb),
    input, "APPEND_SEARCH_GROUP_DRIFT");
  }
  const capturedSource = append.capturedSourcePreimage;
  if (capturedSource !== undefined) {
    invariant(capturedSource != null && typeof capturedSource === "object"
      && !Array.isArray(capturedSource) && capturedSource.sourceKey === input.config.sourceId
      && capturedSource.expected === null,
    input, "APPEND_CAPTURED_SOURCE_PREIMAGE_INVALID");
    // Identical artifact bytes do not authorize a source row absent from capture.
    invariant(snapshot.source === null, input, "APPEND_CAPTURED_SOURCE_PREIMAGE_CHANGED");
  }
  assertMasterSingleDefinitionCompositeSourceR1(input, snapshot.source, "BEFORE");
}

/** Same reader and validator are used before BEGIN and again under locks.
 * No DML, no catalog/group choice, and no acceptance of an existing successor. */
export async function readMasterSingleDefinitionAppendPreconditionsR1(
  client: QueryClient, input: MasterSingleDefinitionAppendGuardInput,
): Promise<Json> {
  const append = appendOf(input);
  const one = async (sql: string, values: unknown[]) =>
    (await client.query(sql, values)).rows[0] as Json | undefined;
  const count = async (sql: string, values: unknown[]) => Number((await one(sql, values))?.value);
  const snapshot: Json = {
    parent: await one("select * from public.estimate_definition_release where id=$1",
      [input.config.parentReleaseId]) ?? null,
    parentSearch: await one("select * from public.estimate_search_index_release where id=$1",
      [input.config.parentSearchReleaseId]) ?? null,
    parentTargetCount: await count(`select count(*)::int value from public.estimate_cumulative_manifest_entry
      where release_id=$1 and catalog_id=$2`, [input.config.parentReleaseId, input.config.catalogId]),
    catalogDefinitionCount: await count("select count(*)::int value from public.estimate_definition_version where catalog_id=$1",
      [input.config.catalogId]),
    identities: (await client.query(`select catalog_id,namespace,domain,source_identity,work_key,title_ru,
      denominator_eligible,canonical_owner,retired_at from public.estimate_work_identity
      where catalog_id=$1 or (namespace=$2 and source_identity=$3)
        or ($4::boolean and work_key=$5) order by catalog_id`,
    [input.config.catalogId, append.identity.namespace, append.identity.sourceIdentity,
      append.requireUniqueWorkKey === true, append.identity.workKey])).rows,
    parentSearchTargetCount: await count(`select count(*)::int value from public.estimate_search_document
      where search_release_id=$1 and catalog_id=$2`, [input.config.parentSearchReleaseId, input.config.catalogId]),
    group: await one("select * from public.estimate_search_group where search_release_id=$1 and group_id=$2",
      [input.config.parentSearchReleaseId, append.searchPlacement.groupId]) ?? null,
    ordinalCollisionCount: await count(`select count(*)::int value from public.estimate_search_group_membership
      where search_release_id=$1 and group_id=$2 and ordinal=$3`,
    [input.config.parentSearchReleaseId, append.searchPlacement.groupId, append.searchPlacement.membershipOrdinal]),
    successorReleaseCount: await count("select count(*)::int value from public.estimate_definition_release where id=$1",
      [input.successorReleaseId]),
    successorSearchReleaseCount: await count("select count(*)::int value from public.estimate_search_index_release where id=$1",
      [input.successorSearchReleaseId]),
    source: await one("select id::text,source_key,artifact_sha256 from public.estimate_normative_source where source_key=$1",
      [input.config.sourceId]) ?? null,
  };
  assertMasterSingleDefinitionAppendSnapshotR1(input, snapshot);
  return normalized(snapshot) as Json;
}

export function assertMasterSingleDefinitionAppendParentAnchorR1(
  input: MasterSingleDefinitionAppendGuardInput, snapshot: Json, parent: Json, parentSearch: Json,
): void {
  invariant(equal(snapshot.parent, parent) && equal(snapshot.parentSearch, parentSearch),
    input, "APPEND_PARENT_CHANGED_DURING_PREFLIGHT");
}

export function assertMasterSingleDefinitionAppendUnchangedR1(
  input: MasterSingleDefinitionAppendGuardInput, preflight: Json, underTransaction: Json,
): void {
  assertMasterSingleDefinitionAppendSnapshotR1(input, underTransaction);
  invariant(equal(preflight, underTransaction), input, "APPEND_PREFLIGHT_CHANGED_BEFORE_WRITE");
}

