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

type CapturedJoinGroup = NonNullable<NonNullable<MasterSingleDefinitionSuccessorConfig["catalogAppend"]>["capturedJoinGroupMembers"]>;
function object(value: unknown): value is Json {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value: Json, expected: readonly string[]): boolean {
  return equal(Object.keys(value).sort(), [...expected].sort());
}
/** Omission of captureScope preserves the accepted exact-four intake.
 * A declared bounded scope is strict and never falls back on malformed input.
 * Factories must pin captureSha256 to their actual accepted capture file. */
function capturedJoinGroupOf(input: MasterSingleDefinitionAppendGuardInput): CapturedJoinGroup | null {
  const append = appendOf(input);
  if (!Object.prototype.hasOwnProperty.call(append, "capturedJoinGroupMembers")) return null;
  const value = append.capturedJoinGroupMembers;
  const placement = append.searchPlacement;
  invariant(object(value)
    && exactKeys(value, Object.prototype.hasOwnProperty.call(value, "captureScope")
      ? ["groupId", "members", "captureScope"] : ["groupId", "members"])
    && placement.groupMode === "join" && typeof value.groupId === "string"
    && value.groupId.length > 0 && value.groupId === value.groupId.trim() && value.groupId === placement.groupId
    && Array.isArray(value.members),
  input, "APPEND_CAPTURED_JOIN_GROUP_INVALID");
  if (Object.prototype.hasOwnProperty.call(value, "captureScope")) {
    const scope = value.captureScope;
    invariant(object(scope) && exactKeys(scope, ["contract", "memberCount", "maxMembers", "captureSha256"])
      && scope.contract === "master-bounded-join-group-capture/r1"
      && Number.isSafeInteger(scope.memberCount) && scope.memberCount >= 1 && scope.memberCount <= 32
      && scope.maxMembers === 32
      && typeof scope.captureSha256 === "string" && /^[0-9a-f]{64}$/u.test(scope.captureSha256)
      && scope.memberCount === value.members.length,
    input, "APPEND_CAPTURED_JOIN_GROUP_CAPTURE_SCOPE_INVALID");
  } else {
    invariant(value.members.length === 4, input, "APPEND_CAPTURED_JOIN_GROUP_INVALID");
  }
  const keys = ["catalogId", "ordinal", "definitionVersionId", "approvedTemplateBaselineId",
    "definitionSha256", "sourceIdentity", "workKey", "searchGroupId"];
  const text = (v: unknown) => typeof v === "string" && v.length > 0 && v === v.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
  invariant(value.members.every(member => object(member) && exactKeys(member, keys)
    && text(member.catalogId) && member.catalogId !== input.config.catalogId
    && Number.isSafeInteger(member.ordinal) && member.ordinal >= 0
    && typeof member.definitionVersionId === "string" && uuid.test(member.definitionVersionId)
    && typeof member.approvedTemplateBaselineId === "string" && uuid.test(member.approvedTemplateBaselineId)
    && typeof member.definitionSha256 === "string" && /^[0-9a-f]{64}$/u.test(member.definitionSha256)
    && text(member.sourceIdentity) && text(member.workKey) && member.searchGroupId === placement.groupId),
  input, "APPEND_CAPTURED_JOIN_GROUP_MEMBER_INVALID");
  for (const key of ["catalogId", "ordinal", "definitionVersionId", "approvedTemplateBaselineId"] as const) {
    invariant(new Set(value.members.map(member => member[key])).size === value.members.length,
      input, "APPEND_CAPTURED_JOIN_GROUP_DUPLICATE");
  }
  invariant(placement.membershipOrdinal === Math.max(...value.members.map(member => member.ordinal)) + 1,
    input, "APPEND_CAPTURED_JOIN_GROUP_TAIL_ORDINAL");
  return value;
}
function assertCapturedJoinGroupMembers(input: MasterSingleDefinitionAppendGuardInput, snapshot: Json): void {
  const captured = capturedJoinGroupOf(input);
  if (captured == null) return;
  const actual = snapshot.groupMembers;
  invariant(snapshot.group?.member_count === captured.members.length,
    input, "APPEND_CAPTURED_JOIN_GROUP_COUNT_METADATA");
  invariant(Array.isArray(actual) && actual.length === captured.members.length,
    input, "APPEND_CAPTURED_JOIN_GROUP_MEMBER_COUNT");
  invariant(actual.every(row => object(row)
    && row.searchReleaseId === input.config.parentSearchReleaseId
    && row.membershipGroupId === captured.groupId
    && row.manifestReleaseId === input.config.parentReleaseId
    && row.actualDefinitionId === row.definitionVersionId
    && row.definitionCatalogId === row.catalogId
    && row.actualDefinitionSha256 === row.definitionSha256
    && row.actualBaselineId === row.approvedTemplateBaselineId
    && row.baselineCatalogId === row.catalogId
    && row.baselineDefinitionVersionId === row.definitionVersionId
    && row.identityCatalogId === row.catalogId && row.identityRetiredAt === null
    && row.searchCatalogId === row.catalogId && row.searchGroupId === captured.groupId
    && row.searchDefinitionReleaseId === input.config.parentReleaseId
    && row.searchDefinitionVersionId === row.definitionVersionId),
  input, "APPEND_CAPTURED_JOIN_GROUP_CURRENT_ANCHOR_INCOHERENT");
  const projection = (row: Json) => ({catalogId: row.catalogId, ordinal: row.ordinal,
    definitionVersionId: row.definitionVersionId, approvedTemplateBaselineId: row.approvedTemplateBaselineId,
    definitionSha256: row.definitionSha256, sourceIdentity: row.sourceIdentity,
    workKey: row.workKey, searchGroupId: row.searchGroupId});
  const ordered = (rows: readonly Json[]) => [...rows].sort((a, b) => a.ordinal - b.ordinal);
  invariant(equal(ordered(actual.map(projection)), ordered(captured.members)),
    input, "APPEND_CAPTURED_JOIN_GROUP_MEMBERS_CHANGED");
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
  const capturedGroup = capturedJoinGroupOf(input);
  if (capturedGroup != null) {
    const isolation = (await client.query("show transaction_isolation")).rows[0];
    invariant(isolation?.transaction_isolation === "read committed", input,
      "APPEND_CAPTURED_JOIN_GROUP_LOCKED_REREAD_REQUIRES_READ_COMMITTED");
  }
  for (const key of masterSingleDefinitionAppendLockKeysR1(input)) {
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [key]);
  }
  await client.query(`lock table
    public.estimate_cumulative_manifest_entry,
    public.estimate_definition_release,
    public.estimate_definition_version,
    public.estimate_normative_locator,
    public.estimate_normative_source,${capturedGroup == null ? "" : "\n    public.estimate_approved_template_baseline,"}
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

/** Shared pure predicate for the already-governed source preimage. The append
 * caller retains its historical undefined omission and exact error prefix.
 * Retained REPLACE opts in separately with exact-key validation. No SQL/DML. */
export function assertMasterSingleDefinitionCapturedSourcePreimageR1(
  input: Readonly<{stopCode: string; sourceId: string}>,
  captured: unknown, actual: Json | null | undefined,
  phase: "BEFORE" | "REGISTERED",
): void {
  const requireSource = (ok: unknown, suffix: string) => {
    if (!ok) throw new Error(`STOP_${input.stopCode}_CAPTURED_SOURCE_PREIMAGE_${suffix}`);
  };
  requireSource(phase === "BEFORE" || phase === "REGISTERED", "PHASE_INVALID");
  requireSource(object(captured) && captured.sourceKey === input.sourceId
    && captured.expected === null, "INVALID");
  // Exact source/locator business fields are still checked by their existing
  // full snapshot validators. This predicate governs only absent -> present.
  requireSource(phase === "BEFORE" ? actual === null : object(actual),
    phase === "BEFORE" ? "CHANGED" : "PERSISTENCE");
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
  assertCapturedJoinGroupMembers(input, snapshot);
  const capturedSource = append.capturedSourcePreimage;
  if (capturedSource !== undefined) {
    assertMasterSingleDefinitionCapturedSourcePreimageR1(
      {stopCode: input.config.stopCode + "_APPEND", sourceId: input.config.sourceId},
      capturedSource, snapshot.source, "BEFORE",
    );
  }
  assertMasterSingleDefinitionCompositeSourceR1(input, snapshot.source, "BEFORE");
}

/** Same reader and validator are used before BEGIN and again under locks.
 * No DML, no catalog/group choice, and no acceptance of an existing successor. */
export async function readMasterSingleDefinitionAppendPreconditionsR1(
  client: QueryClient, input: MasterSingleDefinitionAppendGuardInput,
): Promise<Json> {
  const append = appendOf(input);
  const capturedGroup = capturedJoinGroupOf(input);
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
  if (capturedGroup != null) {
    // LEFT joins preserve a missing current anchor as NULL, rather than hiding
    // that member. n+1 distinguishes an unexpected fifth member with no deep
    // JSON or release-wide scan. Historical release_id/entry_sha256 are not
    // compared to current contextual release FKs.
    const members = await client.query(`select
      x.catalog_id "catalogId",x.ordinal,x.search_release_id::text "searchReleaseId",x.group_id "membershipGroupId",
      m.release_id::text "manifestReleaseId",m.definition_version_id::text "definitionVersionId",
      m.approved_template_baseline_id::text "approvedTemplateBaselineId",m.definition_hash "definitionSha256",
      d.id::text "actualDefinitionId",d.catalog_id "definitionCatalogId",d.definition_sha256 "actualDefinitionSha256",
      b.id::text "actualBaselineId",b.catalog_id "baselineCatalogId",b.definition_version_id::text "baselineDefinitionVersionId",
      i.catalog_id "identityCatalogId",i.source_identity "sourceIdentity",i.work_key "workKey",i.retired_at "identityRetiredAt",
      s.catalog_id "searchCatalogId",s.group_id "searchGroupId",s.definition_release_id::text "searchDefinitionReleaseId",
      s.definition_version_id::text "searchDefinitionVersionId"
      from public.estimate_search_group_membership x
      left join public.estimate_cumulative_manifest_entry m on m.release_id=$3::uuid and m.catalog_id=x.catalog_id
      left join public.estimate_definition_version d on d.id=m.definition_version_id
      left join public.estimate_approved_template_baseline b on b.id=m.approved_template_baseline_id
      left join public.estimate_work_identity i on i.catalog_id=x.catalog_id
      left join public.estimate_search_document s on s.search_release_id=x.search_release_id and s.catalog_id=x.catalog_id
      where x.search_release_id=$1::uuid and x.group_id=$2::text
      order by x.ordinal,x.catalog_id limit $4::int`,
    [input.config.parentSearchReleaseId, capturedGroup.groupId, input.config.parentReleaseId, capturedGroup.members.length + 1]);
    invariant(members.rows.length <= capturedGroup.members.length, input, "APPEND_CAPTURED_JOIN_GROUP_READ_CAP");
    snapshot.groupMembers = members.rows;
  }
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

