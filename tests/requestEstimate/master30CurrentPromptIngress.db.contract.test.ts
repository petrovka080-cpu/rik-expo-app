import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { Client } from "pg";
import { buildCanonicalBaselinePlan } from "../../src/lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";

import {readCurrentIngressCatalogTuplesV1, verifyCurrentIngressPhysicalExpectationV1, currentIngressBoundedDiagnosticV1, type CurrentIngressExpectedV1} from './master30CurrentIngressTupleReader.testAdapter';
import {canonicalCatalogParameterStorageViewV1} from '../../src/lib/estimate/backendPlatform/canonicalCatalogParameterStorageMapperV1';
import {canonicalDefinitionTitleRu} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {assertCanonicalNewWorkCatalogIdV1} from '../../src/lib/estimate/backendPlatform/canonicalPublicCatalogVisibilityV1';
type Json = Record<string, any>;
const RELEASE_ID = "a76ff40a-8030-5ee4-a83b-11ec0828fee4"; // Original historical30 release, never relabelled active.
const EVIDENCE_MAP_PATH = resolve(".release-runtime/r4a13-6/s19-first-estimate/master-benchmark-evidence-map-v1/master-benchmark-evidence-map.json");
const EVIDENCE_MAP_SHA = "2759cc49e0d15cc1230a6b5557a5b5378c96e3305e721289844a9ebf96dbf6c9";
const POINTER_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const POINTER_SHA = "9b6322feb70e38191e7fe171d82dadebfe47816890d4c339f890477ebc83a258";
// Resource policy reused from the reviewed source capture, not observed schema byte facts.
const RAW_ROW_BYTES = 512 * 1024, WIRE_BYTES = 1024 * 1024, PARENT_BYTES = 3 * 1024 * 1024, TABLE_ROWS = 4096;
// Historical audit97375a65, exact30 matching definition IDs: max51, total717.
const HISTORICAL_PARAMETER_COUNTS: Readonly<Record<string, number>> = {"e4a464fb-7384-529c-9cdf-663095fd6bfd":51,"1777e9d5-79d8-595d-8c54-9cfa9f4669dd":21,"93c4aa39-b667-5e27-9dbb-103221771a82":36,"9288d9d9-bfda-588b-b19c-2c0982f44281":36,"8ed2ca11-16cd-57b2-b841-3ff4ad2953d5":18,"0b0e5c37-5c85-5a5d-8c35-49d08d441756":17,"21b8df20-162b-5e57-adf9-b154c70837ec":22,"22952aff-a162-5e80-846f-85d7cf17a354":25,"d8b54bec-f7f8-52e6-ae91-b83938890315":25,"b563a34e-5819-5e43-94c7-e5c2969fb9ac":16,"b81c1af8-53a6-5be6-86b9-3d2396734e99":17,"0407f63e-0b06-5ae6-ba4f-2d60aca86bc1":22,"44f781a1-9b84-5022-926a-d019d4103859":25,"946f6b2f-5fb7-595c-8a51-4f7872886078":16,"3ede8c46-11b5-5484-b10b-f923ec8bd5b4":24,"a65dc769-0d7f-5ea6-9de2-a8166fe9202d":17,"954ed824-569b-53ea-9827-c534818974b9":25,"ced26855-f373-5907-8859-8212472e2f55":20,"8673b354-17a3-5980-93f0-44863b843dd3":26,"5d08b22a-d141-53a4-b7b3-9ca59dcd3514":19,"e53cd86c-5fcd-593c-857c-ad101bd90a59":22,"e5e77d5f-4c76-5224-8ec9-1596e33c1658":26,"f382aeed-dcd2-5b02-a387-4fea76d49178":29,"47090350-6266-5045-ab9e-7ce865970f81":26,"f33a1e71-40ad-5424-9a7c-61161f7ff1d5":20,"8c6ac868-557f-5856-8894-632ece8e8502":30,"32c375c6-cb11-5e1c-9834-1eda234f12bf":25,"a426c7c8-0ed2-50eb-bed8-b351794da35b":23,"a663bdf7-d8ba-52e2-a3c8-895153cf95ea":17,"d35e4aff-1150-576d-a141-86ad4db0723a":21};
const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const need = (value: unknown, code: string): void => { if (!value) throw new Error("MASTER30_" + code); };

export function assertMaster30SelectSql(sql: string): void {
  if (typeof sql !== "string" || !/^\s*select\b/iu.test(sql) || sql.includes(";") ||
      /\b(insert|update|delete|merge|copy|create|alter|drop|truncate|grant|revoke|lock|call|do|pg_sleep|set_config|nextval)\b/iu.test(sql))
    throw new Error("MASTER30_FIXED_SELECT_ONLY");
}
export function assertMaster30LocalEndpoint(value: string | undefined): string {
  let parsed: URL;
  try { if (!value) throw new Error(); parsed = new URL(value); } catch { throw new Error("MASTER30_LOCAL_ENDPOINT_REQUIRED"); }
  if (!["postgresql:", "postgres:"].includes(parsed.protocol) || parsed.hostname !== "127.0.0.1" || parsed.port !== "55432" ||
      parsed.pathname !== "/rik_r4_runtime_b5_v2" || parsed.search || parsed.hash) throw new Error("MASTER30_LOCAL_ENDPOINT_REQUIRED");
  return value!; // Credential bytes are passed only to the existing Client, never printed or persisted.
}
export function assertMaster30Membership(rows: readonly Json[], mappings: readonly Json[]): void {
  if (mappings.length !== 30 || rows.length !== 30) throw new Error("MASTER30_MAPPING_CARDINALITY_HOLD");
  const expected = new Map(mappings.map(mapping => [String(mapping.currentCatalogId), String(mapping.currentDefinitionVersionId)])), seen = new Set<string>();
  if (expected.size !== 30 || new Set(expected.values()).size !== 30) throw new Error("MASTER30_MAPPING_IDENTITIES_HOLD");
  for (const row of rows) {
    const catalogId = String(row.catalog_id), definitionId = String(row.definition_version_id);
    if (seen.has(catalogId) || !expected.has(catalogId) || expected.get(catalogId) !== definitionId)
      throw new Error("MASTER30_ACTIVE_OR_HISTORICAL_MAPPING_DRIFT_HOLD");
    seen.add(catalogId);
  }
}

/** Numeric-only failure evidence from the same suppressed SQL records. No schema,
 * prompt, SQL text or credentials are returned; invalid diagnostic data is ignored. */
export function master30SchemaResourceDiagnostic(rows: unknown): Readonly<Record<string, number | string | boolean>> | null {
  try {
    const own = (value: unknown, key: string): unknown => {
      if (value === null || typeof value !== "object") throw new Error("DIAGNOSTIC_DATA_ONLY");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) throw new Error("DIAGNOSTIC_DATA_ONLY");
      return descriptor.value;
    };
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 31) return null;
    let first: { rowCount: string; maxRowBytes: string; aggregateBytes: string } | undefined;
    for (let index = 0; index < rows.length; index++) {
      const row = own(rows, String(index));
      if (row === null || typeof row !== "object" || Object.keys(row).join(",") !== "payload") return null;
      const payload = own(row, "payload");
      if (payload === null || typeof payload !== "object" ||
          Object.keys(payload).sort().join(",") !== "aggregateBytes,gate,maxRowBytes,rowCount" ||
          own(payload, "gate") !== "SOURCE_SCHEMA_RESOURCE_POLICY_HOLD") return null;
      const rowCount = own(payload, "rowCount"), maxRowBytes = own(payload, "maxRowBytes"), aggregateBytes = own(payload, "aggregateBytes");
      if (typeof rowCount !== "string" || !/^(?:0|[1-9][0-9]{0,12})$/u.test(rowCount) ||
          typeof maxRowBytes !== "string" || !/^(?:0|[1-9][0-9]{0,12})$/u.test(maxRowBytes) ||
          typeof aggregateBytes !== "string" || !/^(?:0|[1-9][0-9]{0,12})$/u.test(aggregateBytes)) return null;
      const count = Number(rowCount), maximum = Number(maxRowBytes), aggregate = Number(aggregateBytes);
      if (count !== rows.length || maximum > 2 ** 40 || aggregate > 2 ** 40 ||
          aggregate < maximum + count + 1 ||
          !(maximum > 524288 || aggregate > 1048576 || count > 30)) return null;
      const measured = { rowCount, maxRowBytes, aggregateBytes };
      if (first && JSON.stringify(first) !== JSON.stringify(measured)) return null;
      first = measured;
    }
    if (!first) return null;
    const result = { contract: "master30-schema-resource-diagnostic/r1", ...first,
      rawRowCap: 524288, aggregateCap: 1048576, rowCap: 30,
      rawPayloadSuppressed: true, sourceAdmission: false, full: false };
    return Buffer.byteLength(JSON.stringify(result), "utf8") <= 600 ? result : null;
  } catch { return null; }
}

/** Bounded own-data diagnostic from the already-read membership rows only.
 * Never a replacement mapping, fallback, source admission or successful gate. */
export function master30MembershipDiagnostic(rows: unknown): Readonly<Record<string, unknown>> | null {
  try {
    const own = (value: unknown, key: string): unknown => {
      if (value === null || typeof value !== "object") throw new Error("MEMBERSHIP_DIAGNOSTIC_DATA_ONLY");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) throw new Error("MEMBERSHIP_DIAGNOSTIC_DATA_ONLY");
      return descriptor.value;
    };
    if (!Array.isArray(rows)) return null;
    const length = own(rows, "length");
    if (typeof length !== "number" || !Number.isInteger(length) || length < 0 || length > 31) return null;
    if (Object.keys(rows).length !== length) return null;
    const observed: Array<{ catalogId: string; definitionVersionId: string; definitionVersion?: number }> = [];
    for (let index = 0; index < length; index++) {
      const row = own(rows, String(index));
      if (row === null || typeof row !== "object" || Array.isArray(row)) return null;
      const keys = Object.keys(row).sort().join(",");
      if (keys !== "catalog_id,definition_version,definition_version_id" && keys !== "catalog_id,definition_version_id") return null;
      const catalogId = own(row, "catalog_id"), definitionVersionId = own(row, "definition_version_id");
      if (typeof catalogId !== "string" || !/^canonical-work:(?:base|expanded):[a-z0-9_:-]+$/u.test(catalogId) || Buffer.byteLength(catalogId, "utf8") > 512
        || typeof definitionVersionId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(definitionVersionId)) return null;
      const value: { catalogId: string; definitionVersionId: string; definitionVersion?: number } = { catalogId, definitionVersionId };
      if (Object.hasOwn(row, "definition_version")) {
        const version = own(row, "definition_version");
        if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) return null;
        value.definitionVersion = version;
      }
      observed.push(value);
    }
    const result = { contract: "master30-membership-own-data-diagnostic/r1", rowCount: length, observed,
      diagnosticOnly: true, sourceAdmission: false, full: false };
    return Buffer.byteLength(JSON.stringify(result), "utf8") <= 32768 ? result : null;
  } catch { return null; }
}
/** Independent full-source evidence, computed in SQL BEFORE projection. Never
 * hash only projected fields and describe it as full-source equality. */
export function master30FullSourceEvidence(schemas: readonly Json[]): string {
  need(schemas.length === 30, "FULL_SOURCE_EVIDENCE_CARDINALITY_HOLD");
  const seen = new Set<string>();
  const evidence = schemas.map(schema => {
    need(typeof schema.catalogId === "string" && typeof schema.definitionVersionId === "string"
      && typeof schema.fullSourceSha256 === "string" && /^[a-f0-9]{64}$/u.test(schema.fullSourceSha256), "FULL_SOURCE_EVIDENCE_REQUIRED_HOLD");
    need(!seen.has(schema.catalogId), "FULL_SOURCE_EVIDENCE_DUPLICATE_HOLD"); seen.add(schema.catalogId);
    return [schema.catalogId, schema.definitionVersionId, schema.fullSourceSha256];
  });
  return sha256(JSON.stringify(evidence));
}

const MEMBERSHIP_SQL = `select definition.catalog_id,definition.id as definition_version_id,definition.definition_version
 from estimate_cumulative_manifest_entry manifest
 join estimate_definition_version definition on definition.id=manifest.definition_version_id
 where manifest.release_id=$1 and definition.catalog_id=any($2::text[])
 order by definition.catalog_id,definition.id limit 31`;
// The original complete schema aggregation is shared by both fixed read modes.
// No truth/guide/constraints projection; no offset, cursor or additional source.
const FULL_SCHEMA_INNER_SQL = ` select jsonb_build_object('catalogId',definition.catalog_id,'definitionVersionId',definition.id,
 'definitionVersion',definition.definition_version,'parameterCount',count(parameter.parameter_id),
 'parameters',case when count(parameter.parameter_id)<=51 and count(parameter.parameter_id)>0 then jsonb_agg(jsonb_build_object(
 'parameter_id',parameter.parameter_id,'ordinal',parameter.ordinal,'value_type',parameter.value_type,'unit_id',parameter.unit_id,
 'title_ru',parameter.title_ru,'required',parameter.required,'default_value',parameter.default_value,
 'constraints_json',parameter.constraints_json,'truth_metadata',parameter.truth_metadata) order by parameter.ordinal,parameter.parameter_id)
 else null end) as payload
 from estimate_cumulative_manifest_entry manifest
 join estimate_definition_version definition on definition.id=manifest.definition_version_id
 left join estimate_parameter_definition parameter on parameter.definition_version_id=definition.id
 where manifest.release_id=$1 and definition.catalog_id=any($2::text[])
 group by definition.catalog_id,definition.id,definition.definition_version
 order by definition.catalog_id,definition.id limit 31`;
const master30SchemaResponseSql = (full: boolean): string => `select case when max(raw.source_row_bytes) over ()<=524288
 and max(raw.row_bytes) over ()<=524288 and sum(raw.row_bytes) over ()+count(*) over ()+1<=1048576
 and count(*) over ()<=${full ? 5 : 30} then raw.payload else jsonb_build_object('gate','SOURCE_SCHEMA_RESOURCE_POLICY_HOLD',
 'rowCount',(count(*) over ())::text,'maxRowBytes',(max(greatest(raw.row_bytes,raw.source_row_bytes)) over ())::text,
 'aggregateBytes',(sum(raw.row_bytes) over ()+count(*) over ()+1)::text) end as payload
 from (select payload,source_row_bytes,octet_length(jsonb_build_object('payload',payload)::text) as row_bytes from (
 select octet_length(jsonb_build_object('payload',full_payload)::text) as source_row_bytes,
 ${full ? "full_payload || jsonb_build_object('fullSourceSha256',encode(sha256(convert_to(full_payload::text,'UTF8')),'hex'))"
 : "jsonb_build_object('catalogId',full_payload->'catalogId','definitionVersionId',full_payload->'definitionVersionId','fullSourceSha256',encode(sha256(convert_to(full_payload::text,'UTF8')),'hex'))"} as payload
 from (select payload as full_payload from (${FULL_SCHEMA_INNER_SQL}) scoped) full_source) emitted) raw`;
const SCHEMA_BATCH_SQL = master30SchemaResponseSql(true), SCHEMA_HASH_SQL = master30SchemaResponseSql(false);

/** Exactly six disjoint full reads, or one exact active source-proof vector.
 * Caller owns the one cumulative byte counter and the same read-only snapshot. */
export async function readMaster30LosslessSchemas(input: {
  select: (sql: string, values: unknown[], maximumRows: number) => Promise<Json[]>;
  releaseId: string; mappings: readonly Json[]; historicalRows?: readonly Json[];
  onDiagnostic?: (value: Readonly<Record<string, number | string | boolean>>) => void;
}): Promise<Json[]> {
  const ids = input.mappings.map(mapping => String(mapping.currentCatalogId)).sort();
  need(ids.length === 30 && new Set(ids).size === 30
    && new Set(input.mappings.map(mapping => String(mapping.currentDefinitionVersionId))).size === 30, "LOSSLESS_MAPPING_IDENTITIES_HOLD");
  const ordered = (rows: readonly Json[], expectedIds: readonly string[]): Json[] => {
    const diagnostic = master30SchemaResourceDiagnostic(rows);
    if (diagnostic !== null) input.onDiagnostic?.(diagnostic);
    need(rows.length === expectedIds.length, "LOSSLESS_EXACT_BATCH_OR_VECTOR_CARDINALITY_HOLD");
    const byId = new Map<string, Json>(), definitions = new Set<string>();
    for (const row of rows) {
      const payload = row.payload;
      need(payload && !payload.gate && typeof payload.catalogId === "string" && typeof payload.definitionVersionId === "string"
        && typeof payload.fullSourceSha256 === "string" && /^[a-f0-9]{64}$/u.test(payload.fullSourceSha256), "LOSSLESS_SOURCE_EVIDENCE_REQUIRED_HOLD");
      const mapping = input.mappings.find(value => value.currentCatalogId === payload.catalogId);
      need(expectedIds.includes(payload.catalogId) && mapping?.currentDefinitionVersionId === payload.definitionVersionId
        && !byId.has(payload.catalogId) && !definitions.has(payload.definitionVersionId), "LOSSLESS_BATCH_OR_VECTOR_IDENTITIES_HOLD");
      byId.set(payload.catalogId, row); definitions.add(payload.definitionVersionId);
    }
    return expectedIds.map(id => { const row = byId.get(id); need(row, "LOSSLESS_UNION_OMISSION_HOLD"); return row!; });
  };
  if (input.historicalRows !== undefined) {
    const historical = ordered(input.historicalRows, ids);
    const historicalReadSha256 = sha256(JSON.stringify(historical));
    const active = ordered(await input.select(SCHEMA_HASH_SQL, [input.releaseId, ids], 31), ids);
    need(sha256(JSON.stringify(historical)) === historicalReadSha256, "HISTORICAL_FULL_SCHEMA_MUTATED_DURING_ACTIVE_READ_HOLD");
    need(master30FullSourceEvidence(active.map(row => row.payload)) === master30FullSourceEvidence(historical.map(row => row.payload)),
      "ACTIVE_FULL_SOURCE_DIFFERS_FROM_EXACT_HISTORICAL_MAPPING_HOLD");
    return historical; // Full-schema reuse only AFTER exact active immutable source proof.
  }
  const union: Json[] = [];
  for (let batch = 0; batch < 6; batch++) {
    const batchIds = ids.slice(batch * 5, batch * 5 + 5);
    need(batchIds.length === 5, "LOSSLESS_FIXED_BATCH_SIZE_HOLD");
    union.push(...ordered(await input.select(SCHEMA_BATCH_SQL, [input.releaseId, batchIds], 6), batchIds));
  }
  return ordered(union, ids);
}

const CURRENT_MEMBERSHIP_SQL = `select m.catalog_id,m.definition_version_id,
 d.catalog_id as definition_catalog_id,d.id as resolved_definition_id from estimate_cumulative_manifest_entry m
 left join estimate_definition_version d on d.id=m.definition_version_id
 where m.release_id=$1::uuid and m.catalog_id=any($2::text[]) order by m.catalog_id,m.definition_version_id limit 31`;
const CURRENT_ROOT_SQL = `select pg_backend_pid() as backend_pid,
 current_setting('transaction_read_only') as read_only,current_setting('transaction_isolation') as isolation,
 current_setting('TimeZone') as timezone,r.id,r.status,r.source_manifest_sha256,
 (select encode(sha256(convert_to(coalesce(string_agg(m.entry_sha256,'' order by m.catalog_id),''),'UTF8')),'hex')
 from estimate_cumulative_manifest_entry m where m.release_id=r.id) as actual_manifest_sha256
 from estimate_definition_release r where r.id=$1::uuid limit 2`;
const CURRENT_ENVELOPE_BODY = `jsonb_build_object('identity',jsonb_build_object('catalog_id',i.catalog_id,
 'namespace',i.namespace,'domain',i.domain,'work_key',i.work_key,'title_ru',i.title_ru),
 'definition',jsonb_build_object('id',d.id,'definition_version',d.definition_version,'definition_sha256',d.definition_sha256,
 'passport',d.passport,'applicability',d.applicability,'source_metadata',d.source_metadata))`;
const CURRENT_ENVELOPE_SQL = `select case when octet_length(jsonb_build_object('envelope',envelope)::text)<=524288
 then envelope else jsonb_build_object('gate','CURRENT_ENVELOPE_RESOURCE_HOLD') end as envelope,
 encode(sha256(convert_to(envelope::text,'UTF8')),'hex') as envelope_sha256
 from (select ${CURRENT_ENVELOPE_BODY} as envelope from estimate_cumulative_manifest_entry m
 join estimate_definition_version d on d.id=m.definition_version_id and d.catalog_id=m.catalog_id
 join estimate_work_identity i on i.catalog_id=m.catalog_id and i.retired_at is null
 where m.release_id=$1::uuid and m.catalog_id=$2 and d.id=$3::uuid limit 2) scoped`;
const CURRENT_VECTOR_SQL = `select m.catalog_id,d.id as definition_version_id,d.definition_version,
 d.definition_sha256,m.entry_sha256,
 encode(sha256(convert_to(${CURRENT_ENVELOPE_BODY}::text,'UTF8')),'hex') as envelope_sha256,
 case when p.parameter_count between 1 and 4096 then encode(sha256(convert_to(jsonb_build_object(
 'contract','pg-unprojected-parameter-storage9/v1','catalogId',d.catalog_id,'definitionVersionId',d.id,
 'definitionVersion',d.definition_version,'definitionSha256',d.definition_sha256,'parameters',p.parameters)::text,'UTF8')),'hex')
 else null end as full_source_sha256,p.parameter_count
 from estimate_cumulative_manifest_entry m
 join estimate_definition_version d on d.id=m.definition_version_id and d.catalog_id=m.catalog_id
 join estimate_work_identity i on i.catalog_id=m.catalog_id and i.retired_at is null
 cross join lateral (select count(*)::integer as parameter_count,jsonb_agg(jsonb_build_array(
 p.parameter_id,p.ordinal,p.value_type,p.unit_id,p.title_ru,p.required,p.default_value,p.constraints_json,p.truth_metadata)
 order by p.ordinal,p.parameter_id) as parameters from (select p.* from estimate_parameter_definition p
 where p.definition_version_id=d.id order by p.ordinal,p.parameter_id limit 4097) p) p
 where m.release_id=$1::uuid and m.catalog_id=any($2::text[]) order by m.catalog_id,d.id limit 31`;
const CURRENT_FIXTURE_ROOT = 'tests/requestEstimate/fixtures/master30-current29/';
const CURRENT_FILES = [
 ['CURRENT29_EXPECTATION_MATRIX.json','50868739d99406b88a4a6e588bf1141dc1b17fbc4c9555143eade075c6f9d921'],
 ['SOURCE_REFERENCES.json','e65f0c6256e48ea28c9e8b36e2fd6b32b5b1093107cd8ee1807ed960d7717f83'],
 ['ARCHIVE_ORDERED_PARAMETER_IDS.json','7f80b1a2caa84231b4e076b1c28828c21bf9af71488ffe109c2631231400fb5c'],
 ['CURRENT29_PHYSICAL_EXPECTATIONS.json','cb70738f96ead199aa445c49cde18455462f04134ddf594a3df93ff3a4342d48'],
 ['CURRENT29_SOURCE_PHYSICAL_PROOF.json','30c534f8dc3ddf158ec9e7204d4ddce169b54b634d716aa211fee159434af675'],
] as const;
function freezeCurrentSource<T>(value: T): T {
  if (value && typeof value === 'object') {for (const child of Object.values(value)) freezeCurrentSource(child);Object.freeze(value);}return value;
}
function copyCurrentReadRows(value: unknown): Json[] {
  let nodes = 0;
  const copy = (input: unknown, depth: number): any => {
    need(++nodes <= 250000 && depth <= 64, 'CURRENT_CONTROL_DATA_BOUND');
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number') {need(Number.isFinite(input),'CURRENT_CONTROL_FINITE');return input;}
    need(input && typeof input === 'object','CURRENT_CONTROL_DATA_ONLY');
    const object = input as object;
    const array = Array.isArray(object), proto = Object.getPrototypeOf(object);
    need((array ? proto === Array.prototype : proto === Object.prototype || proto === null)
      && Object.getOwnPropertySymbols(object).length === 0, 'CURRENT_CONTROL_PROTOTYPE');
    const names = Object.getOwnPropertyNames(object), keys = Object.keys(object), result: any = array ? [] : {};
    if (array) {const descriptor = Object.getOwnPropertyDescriptor(object,'length');
      need(descriptor && Object.hasOwn(descriptor,'value') && Number.isSafeInteger(descriptor.value)
        && descriptor.value <= 65536 && descriptor.value >= 0 && keys.length === descriptor.value
        && names.length === keys.length + 1,'CURRENT_CONTROL_ARRAY');
      for (let index = 0;index < descriptor!.value;index++) {const item = Object.getOwnPropertyDescriptor(object,String(index));
        need(item && item.enumerable && Object.hasOwn(item,'value'),'CURRENT_CONTROL_ACCESSOR');result.push(copy(item!.value,depth+1));}
    } else {need(names.length === keys.length && keys.length <= 65536,'CURRENT_CONTROL_OBJECT');
      for (const key of keys) {need(!['__proto__','constructor','prototype'].includes(key),'CURRENT_CONTROL_UNSAFE_KEY');
        const item = Object.getOwnPropertyDescriptor(object,key);need(item && item.enumerable && Object.hasOwn(item,'value'),'CURRENT_CONTROL_ACCESSOR');
        Object.defineProperty(result,key,{value:copy(item!.value,depth+1),enumerable:true});}}
    return result;
  };
  const rows = copy(value,0);need(Array.isArray(rows),'CURRENT_CONTROL_ARRAY_REQUIRED');return rows;
}
describe("MASTER-30 historical30 and independent current29 with retired14 ingress owned DB preflight", () => {
  test("preserves historical30 positives and verifies independent current29 scoped outcomes plus retired14 in one read-only snapshot", async () => {
    const readPinned = (file: string, expected: string): Buffer => {
      need(statSync(file).size <= RAW_ROW_BYTES, "INPUT_FILE_BYTE_POLICY");
      const bytes = readFileSync(file); need(bytes.length <= RAW_ROW_BYTES && sha256(bytes) === expected, "INPUT_SOURCE_PIN_DRIFT"); return bytes;
    };
    const evidenceBytes = readPinned(EVIDENCE_MAP_PATH, EVIDENCE_MAP_SHA), pointerBytes = readPinned(POINTER_PATH, POINTER_SHA),
      evidenceMap = JSON.parse(evidenceBytes.toString("utf8")) as Json, mappings = evidenceMap.mappedBenchmarks as Json[],
      pointer = JSON.parse(pointerBytes.toString("utf8")) as Json, catalogIds = mappings.map(mapping => String(mapping.currentCatalogId));
    expect(mappings).toHaveLength(30); expect(new Set(catalogIds).size).toBe(30);
    expect(new Set(mappings.map(mapping => String(mapping.currentDefinitionVersionId))).size).toBe(30);
    expect(mappings.map(mapping => Number(mapping.ordinal)).sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    need(typeof pointer.definitionReleaseId === "string" && /^[a-f0-9-]{36}$/u.test(pointer.definitionReleaseId), "ACTIVE_POINTER_ID_REQUIRED");
    let parentBytes = evidenceBytes.length + pointerBytes.length;
    const client = new Client({ connectionString: assertMaster30LocalEndpoint(process.env.R4A13_DATABASE_URL),
      connectionTimeoutMillis: 5000, query_timeout: 10000 });
    let connected = false, transaction = false;
    const witness: Json = { scope: "PROMPT_SCHEMA_INGRESS_ONLY_NOT_SOURCE_COMPLETENESS_OR_FULL", historical: { status: "UNRUN", releaseId: RELEASE_ID },
      active: { status: "OPEN_UNPROVEN", releaseId: pointer.definitionReleaseId }, sourceAdmission: false, full: false };
    const select = async (sql: string, values: unknown[], maximumRows: number): Promise<Json[]> => {
      assertMaster30SelectSql(sql); need(maximumRows <= TABLE_ROWS, "TABLE_ROW_POLICY");
      const result = await client.query(sql, values), rows = result.rows as Json[];
      need(rows.length <= maximumRows, "SELECT_ROW_POLICY");
      const bytes = Buffer.byteLength(JSON.stringify(rows), "utf8");
      need(rows.every(row => Buffer.byteLength(JSON.stringify(row), "utf8") <= RAW_ROW_BYTES) && bytes <= WIRE_BYTES, "SELECT_BYTE_POLICY");
      parentBytes += bytes; need(parentBytes <= PARENT_BYTES, "PARENT_BYTE_POLICY"); return rows;
    };
    const historicalPhysicalSources = new Map<number, Json>();
    const historicalPhase = async (releaseId: string): Promise<void> => {
      const label = "historical" as const;
      witness[label] = { status: "OBSERVING", releaseId };
      const membership = await select(MEMBERSHIP_SQL, [releaseId, catalogIds], 31);
      witness[label].observedMembershipSha256 = sha256(JSON.stringify(membership));
      witness[label].observedMembershipCount = membership.length;
      witness[label].observedDefinitionIds = membership.map(row => String(row.definition_version_id)).sort();
      assertMaster30Membership(membership, mappings);
      const schemaRows = await readMaster30LosslessSchemas({ select, releaseId, mappings,
        onDiagnostic: value => { witness[label].schemaResourceDiagnostic = value; } });
      witness[label].fullSchemaReadMode = "SIX_FIXED_DISJOINT_FIVE_FULL_ROWS";
      const fullSchemaReadSha256 = sha256(JSON.stringify(schemaRows));
      witness[label].observedFullSchemaSha256 = fullSchemaReadSha256;
      need(schemaRows.length === 30, "SCHEMA_EXACT_THIRTY_HOLD");
      const schemas = new Map<string, Json>(), definitionIds = new Set<string>(); let parameterTotal = 0;
      for (const { payload } of schemaRows) {
        need(payload && !payload.gate && typeof payload.catalogId === "string" && typeof payload.definitionVersionId === "string", "SCHEMA_RESOURCE_POLICY_HOLD");
        need(!schemas.has(payload.catalogId) && !definitionIds.has(payload.definitionVersionId), "SCHEMA_DUPLICATE_IDENTITY_HOLD");
        const expected = mappings.find(mapping => mapping.currentCatalogId === payload.catalogId);
        need(expected && expected.currentDefinitionVersionId === payload.definitionVersionId, "SCHEMA_MAPPING_DRIFT_HOLD");
        need(Array.isArray(payload.parameters) && payload.parameterCount === HISTORICAL_PARAMETER_COUNTS[payload.definitionVersionId]
          && payload.parameters.length === payload.parameterCount && payload.parameterCount > 0 && payload.parameterCount <= 51, "SCHEMA_PARAMETER_CARDINALITY_HOLD");
        need(new Set(payload.parameters.map((row: Json) => String(row.parameter_id))).size === payload.parameterCount, "SCHEMA_PARAMETER_DUPLICATE_HOLD");
        schemas.set(payload.catalogId, payload); definitionIds.add(payload.definitionVersionId); parameterTotal += payload.parameterCount;
      }
      need(parameterTotal === 717, "SCHEMA_HISTORICAL_PARAMETER_TOTAL_HOLD");
      const fullSourceEvidenceSha256 = master30FullSourceEvidence([...schemas.values()]);
      const outcomes = mappings.map(mapping => {
        const catalogId = String(mapping.currentCatalogId), schema = schemas.get(catalogId); need(schema, "SCHEMA_CATALOG_MISSING_HOLD");
        const parameterRows = schema!.parameters as Json[]; expect(parameterRows.length).toBeGreaterThan(0);
        const parameterSchema = parameterRows.map(row => {
          const truth = (row.truth_metadata ?? {}) as Json;
          return { parameterId: String(row.parameter_id), ordinal: Number(row.ordinal), valueType: String(row.value_type),
            unitId: row.unit_id == null ? null : String(row.unit_id), titleRu: String(row.title_ru), required: Boolean(row.required), defaultValue: row.default_value,
            constraints: row.constraints_json ?? {}, semanticParameterKey: String(truth.semantic_parameter_key ?? row.parameter_id),
            visibilityRole: truth.visibility_role, valueSourceRole: truth.value_source_role, preliminaryCompilationAllowed: truth.preliminary_compilation_allowed === true,
            normativeLinks: [], formulaConsumers: Array.isArray(truth.formula_consumers) ? truth.formula_consumers : [],
            resourceBranchConsumers: Array.isArray(truth.resource_branch_consumers) ? truth.resource_branch_consumers : [], validationRules: [], provenance: truth, guide: truth.guide };
        }) as CanonicalEstimateCatalogItem["parameterSchema"];
        const catalog = { releaseId, catalogId, workKey: catalogId.replace(/^canonical-work:(?:base|expanded):/u, ""),
          definitionVersion: Number(schema!.definitionVersion), parameterSchema } as unknown as CanonicalEstimateCatalogItem;
        const plan = buildCanonicalBaselinePlan({ catalog, prompt: String(mapping.historicalPromptRu) }),
          primary = parameterSchema.find(parameter => parameter.parameterId === plan.primaryMeasureParameterId);
        if ((primary?.formulaConsumers?.length ?? 0) === 0) throw new Error(`PRIMARY_FORMULA_DISCONNECTED:${String(mapping.ordinal)}:${plan.primaryMeasureParameterId}`);
        if (cases.some(row => row.ordinal === Number(mapping.ordinal) && row.changeClass === 'RETAINED_HISTORICAL_DEFINITION_IDENTITY'))
          historicalPhysicalSources.set(Number(mapping.ordinal), {definitionVersionId:schema!.definitionVersionId,
            historicalPrimaryId:plan.primaryMeasureParameterId,unitId:primary!.unitId,
            rawParameterRows:parameterRows,rawParameterRowsSha256:sha256(JSON.stringify(parameterRows)),
            historicalFullSourceSha256:schema!.fullSourceSha256,source:'PINNED_A76_IMMUTABLE_ORIGINAL_SCHEMA_BEFORE_CURRENT_READ'});
        return { ordinal: Number(mapping.ordinal), primaryMeasureParameterId: plan.primaryMeasureParameterId, extractedParameterCount: Object.keys(plan.parameters).length };
      });
      expect(outcomes).toHaveLength(30); expect(outcomes.filter(outcome => outcome.extractedParameterCount > 0)).toHaveLength(30);
      const fullSchemaSha256 = sha256(JSON.stringify(schemaRows));
      need(fullSchemaSha256 === fullSchemaReadSha256, "FULL_SCHEMA_MUTATED_DURING_PLANNER_HOLD");
      witness[label] = { status: "ACTUAL_THIRTY_PROMPT_POSITIVES", releaseId, observedDefinitionIds: [...definitionIds].sort(),
        membershipSha256: sha256(JSON.stringify(membership)), fullSchemaSha256, fullSourceEvidenceSha256, parameterTotal, outcomes };
    };
    const currentInputs = CURRENT_FILES.map(([name, hash]) => ({name, hash,
      bytes: readPinned(resolve(CURRENT_FIXTURE_ROOT, name), hash)}));
    const matrix = JSON.parse(currentInputs.find(file => file.name === 'CURRENT29_EXPECTATION_MATRIX.json')!.bytes.toString('utf8')) as Json;
    const archiveIds = JSON.parse(currentInputs.find(file => file.name === 'ARCHIVE_ORDERED_PARAMETER_IDS.json')!.bytes.toString('utf8')) as Json;
    const physicalFile = currentInputs.find(file => file.name === 'CURRENT29_PHYSICAL_EXPECTATIONS.json')!;
    const physical = JSON.parse(physicalFile.bytes.toString('utf8')) as Json;
    const cases = matrix.positiveCases as Json[];
    need(cases.length === 29 && new Set(cases.map(row => row.ordinal)).size === 29
      && cases.every(row => row.ordinal !== 14 && mappings.some(mapping => mapping.ordinal === row.ordinal
        && mapping.currentCatalogId === row.catalogId)), 'CURRENT_DECLARED_ORIGINAL29_HOLD');
    need(cases.reduce((sum, row) => sum + row.expected.parameterCount, 0) === 2849, 'CURRENT_PREBOUND_PARAMETER_TOTAL_HOLD');
    const retired = matrix.separateRetiredProductNegative;
    need(retired.ordinal === 14 && retired.originalCatalogId === mappings.find(row => row.ordinal === 14)!.currentCatalogId
      && retired.expectedCurrentSelectedMembershipCount === 0, 'RETIRED_ORIGINAL14_DECLARATION_HOLD');
    const currentPhase = async (): Promise<void> => {
      const releaseId = String(pointer.definitionReleaseId);
      // Independent retained-operation sources are pinned before current reads and charged below.
      const retainedAuthorityInputs = new Map<string, {hash:string;bytes:Buffer}>();
      const readRetainedAuthority = (ref: Json): Buffer => {
        need(ref && typeof ref.path === 'string' && /^(?:\.release-runtime|src|scripts)\//u.test(ref.path)
          && !ref.path.split('/').includes('..') && typeof ref.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(ref.sha256), 'RETAINED_AUTHORITY_SOURCE_REF_HOLD');
        const old = retainedAuthorityInputs.get(ref.path);
        need(!old || old.hash === ref.sha256, 'RETAINED_AUTHORITY_SOURCE_CONFLICT_HOLD');
        if (old) return old.bytes;
        const bytes = readPinned(resolve(ref.path), ref.sha256);
        retainedAuthorityInputs.set(ref.path,{hash:ref.sha256,bytes}); return bytes;
      };
      const declarations = new Map<number, CurrentIngressExpectedV1>();
    for (const row of cases) {
      const expected = row.expected, business = physical.cases.find((value: Json) => value.ordinal === row.ordinal);
      need(business && business.catalogId === row.catalogId && business.originalPrompt === mappings.find(value => value.ordinal === row.ordinal)!.historicalPromptRu,
        'CURRENT_PREBOUND_BUSINESS_MAPPING_HOLD');
      if (row.changeClass === 'RETAINED_HISTORICAL_DEFINITION_IDENTITY') {
        const historical = historicalPhysicalSources.get(row.ordinal);
        if (!historical) throw new Error('MASTER30_RETAINED_HISTORICAL_SOURCE_UNIT_REQUIRED_HOLD');
        need(historical && historical.definitionVersionId === row.expected.definitionVersionId
          && typeof historical.unitId === 'string', 'RETAINED_HISTORICAL_SOURCE_UNIT_REQUIRED_HOLD');
        need(historical.rawParameterRowsSha256 === sha256(JSON.stringify(historical.rawParameterRows)), 'RETAINED_HISTORICAL_SOURCE_CACHE_HOLD');
        historical.productionDtoSha256 = sha256(JSON.stringify(historical.rawParameterRows.map(canonicalCatalogParameterStorageViewV1)));
        const authority = business.retainedMainMeasureAuthority;
        if (authority != null) {
          need(authority.contract === 'independent-retained-main-measure-authority/v1'
            && authority.definitionVersionId === historical.definitionVersionId && authority.catalogId === row.catalogId
            && authority.parameterCount === historical.rawParameterRows.length && typeof authority.parameterId === 'string'
            && typeof authority.unitId === 'string' && Number.isInteger(authority.definitionVersion), 'RETAINED_MAIN_AUTHORITY_IDENTITY_HOLD');
          const receipt = JSON.parse(readRetainedAuthority(authority.publicationReceipt).toString('utf8')) as Json;
          need(receipt.audit?.target?.catalog_id === authority.catalogId
            && receipt.audit.target.definition_version_id === authority.definitionVersionId
            && receipt.audit.target.definition_version === authority.definitionVersion
            && receipt.audit.target.parameters === authority.parameterCount
            && receipt.audit.search.definition_version_id === authority.definitionVersionId
            && receipt.audit.search.primary_uom === authority.unitId, 'RETAINED_MAIN_AUTHORITY_PUBLICATION_HOLD');
          need(Array.isArray(authority.producerSources) && authority.producerSources.length > 0
            && authority.producerSources.length <= 4, 'RETAINED_MAIN_AUTHORITY_PRODUCER_REFS_HOLD');
          for (const ref of authority.producerSources) {
            need(receipt.source.sourceHashes.some((pin: Json) => pin.path === ref.path && pin.sha256 === ref.sha256), 'RETAINED_MAIN_AUTHORITY_PRODUCER_BINDING_HOLD');
            readRetainedAuthority(ref);
          }
          const primaryRows = historical.rawParameterRows.filter((parameter: Json) => parameter.parameter_id === authority.parameterId);
          need(primaryRows.length === 1 && primaryRows[0].unit_id === authority.unitId
            && ['integer','decimal'].includes(primaryRows[0].value_type)
            && Array.isArray(primaryRows[0].truth_metadata?.formula_consumers)
            && primaryRows[0].truth_metadata.formula_consumers.length > 0, 'RETAINED_MAIN_AUTHORITY_A76_PARAMETER_HOLD');
          need(business.expected.kind === 'MEASURE_UNIT_VALUE' && business.expected.unitId === authority.unitId, 'RETAINED_MAIN_AUTHORITY_EXPECTED_UNIT_HOLD');
          historical.currentMainMeasureAuthority = {parameterId:authority.parameterId,unitId:authority.unitId,definitionVersion:authority.definitionVersion};
        } else business.expected.unitId = historical.unitId;
        freezeCurrentSource(historical);
      }
      if (row.evidenceLevel === 'ARCHIVED_COMPLETE_DTO') {
        const ids = archiveIds.cases['case' + row.ordinal];
        need(ids.count === expected.parameterCount && ids.sha256 === expected.completeDto.orderedParameterIdsSha256
          && sha256(JSON.stringify(ids.orderedParameterIds)) === ids.sha256, 'CURRENT_ARCHIVE_ID_VECTOR_HOLD');
        declarations.set(row.ordinal, {evidenceMode:'ARCHIVED_COMPLETE_DTO',catalogId:row.catalogId,
          definitionVersionId:expected.definitionVersionId,definitionVersion:expected.definitionVersion,
          definitionSha256:expected.definitionSha256,parameterCount:expected.parameterCount,
          orderedParameterIds:ids.orderedParameterIds,orderedParameterIdsSha256:ids.sha256,
          expectedDtoSha256:expected.completeDto.jsonSha256});
      } else {
        declarations.set(row.ordinal, {evidenceMode:'PUBLISHED_IDENTITY_SCOPED_INGRESS',catalogId:row.catalogId,
          definitionVersionId:expected.definitionVersionId,parameterCount:expected.parameterCount,
          independentReceipt:{path:CURRENT_FIXTURE_ROOT+'CURRENT29_EXPECTATION_MATRIX.json#/positiveCases/'+cases.findIndex(value => value.ordinal === row.ordinal),
            sha256:CURRENT_FILES[0][1]},
          versionEvidence:expected.definitionVersion == null ? {kind:'OBSERVED_WITNESS_ONLY'} : {kind:'INDEPENDENT',value:expected.definitionVersion},
          definitionHashEvidence:expected.definitionSha256 == null ? {kind:'OBSERVED_WITNESS_ONLY'} : {kind:'INDEPENDENT',value:expected.definitionSha256},
          physicalExpectation:business.expected} as CurrentIngressExpectedV1);
      }
    }

      freezeCurrentSource(physical);freezeCurrentSource(matrix);freezeCurrentSource(archiveIds);
      const businessSha256 = sha256(JSON.stringify(physical));
      witness.active = {status:'OBSERVING_CURRENT29_AND_RETIRED14',releaseId,sourceAdmission:false,full:false};
      const rawRead = async (sql: string, values: readonly unknown[], maximumRows: number): Promise<Json[]> => {
        assertMaster30SelectSql(sql); need(Number.isInteger(maximumRows) && maximumRows > 0 && maximumRows <= TABLE_ROWS, 'CURRENT_TABLE_ROW_POLICY');
        const rows = copyCurrentReadRows((await client.query(sql, [...values])).rows);
        need(rows.length <= maximumRows && rows.every(row => Buffer.byteLength(JSON.stringify(row),'utf8') <= RAW_ROW_BYTES)
          && Buffer.byteLength(JSON.stringify(rows),'utf8') <= WIRE_BYTES, 'CURRENT_SELECT_PHYSICAL_BYTE_HOLD');
        return rows;
      };
      const rootBefore = await rawRead(CURRENT_ROOT_SQL,[releaseId],1);
      need(rootBefore.length === 1 && rootBefore[0].id === releaseId && rootBefore[0].status === pointer.definitionReleaseStatus
        && rootBefore[0].read_only === 'on' && rootBefore[0].isolation === 'repeatable read' && rootBefore[0].timezone === 'UTC'
        && rootBefore[0].source_manifest_sha256 === pointer.definitionSnapshotSha256
        && rootBefore[0].actual_manifest_sha256 === pointer.definitionSnapshotSha256, 'CURRENT_SELECTED_ROOT_HOLD');
      const membership = await rawRead(CURRENT_MEMBERSHIP_SQL,[releaseId,catalogIds],31);
      need(membership.length === 29 && !membership.some(row => row.catalog_id === retired.originalCatalogId), 'CURRENT_UNFILTERED_MANIFEST29_RETIRED14_HOLD');
      need(new Set(membership.map(row => row.catalog_id)).size === 29 && membership.every(row => cases.some(expected => expected.catalogId === row.catalog_id
        && expected.expected.definitionVersionId === row.definition_version_id && row.resolved_definition_id === row.definition_version_id
        && row.definition_catalog_id === row.catalog_id)), 'CURRENT_UNFILTERED_PREBOUND_MEMBERSHIP_HOLD');
      const before = freezeCurrentSource(await rawRead(CURRENT_VECTOR_SQL,[releaseId,catalogIds],31));
      need(before.length === 29 && !before.some(row => row.catalog_id === retired.originalCatalogId), 'CURRENT29_RETIRED14_MEMBERSHIP_HOLD');
      const seen = new Set<string>();
      for (const row of before) {
        const expected = cases.find(value => value.catalogId === row.catalog_id)?.expected;
        need(expected && expected.definitionVersionId === row.definition_version_id && expected.parameterCount === row.parameter_count
          && !seen.has(row.catalog_id) && /^[a-f0-9]{64}$/u.test(row.full_source_sha256)
          && /^[a-f0-9]{64}$/u.test(row.envelope_sha256), 'CURRENT_PREBOUND_SELECTED_COHORT_HOLD'); seen.add(row.catalog_id);
        if (expected.definitionVersion != null) need(expected.definitionVersion === row.definition_version, 'CURRENT_PREBOUND_VERSION_HOLD');
        if (expected.definitionSha256 != null) need(expected.definitionSha256 === row.definition_sha256, 'CURRENT_PREBOUND_DEFINITION_SHA_HOLD');
      }
      let retiredError: unknown;
      try {assertCanonicalNewWorkCatalogIdV1(retired.originalCatalogId);} catch (error) {retiredError = error;}
      need(retiredError instanceof Error && retiredError.message === 'CANONICAL_AREA_CATALOG_VARIANT_RETIRED', 'CURRENT_RETIRED14_PRODUCT_NEGATIVE_HOLD');
      const sourceRows = [{file:EVIDENCE_MAP_PATH,utf8:evidenceBytes.toString('utf8')},{file:POINTER_PATH,utf8:pointerBytes.toString('utf8')},
        ...currentInputs.map(file => ({file:CURRENT_FIXTURE_ROOT+file.name,utf8:file.bytes.toString('utf8')})),
        ...[...retainedAuthorityInputs].map(([file, input]) => ({file,utf8:input.bytes.toString('utf8')}))];
      const globalControls: unknown[] = [sourceRows,rootBefore,membership,before];
      // Controls are assigned once to the small ordinal20 unit, never to a nearly-full archive unit.
      let globalControlBytes = 0;
      for (const rows of globalControls) {const count = Buffer.byteLength(JSON.stringify(rows),'utf8');
        need(count <= WIRE_BYTES, 'CURRENT_CONTROL_WIRE_HOLD');globalControlBytes += count;}
      need(globalControlBytes <= PARENT_BYTES, 'CURRENT_CONTROL_PARENT_HOLD');
      const readers = new Map<number, Awaited<ReturnType<typeof readCurrentIngressCatalogTuplesV1>>>();
      const outcomes: Json[] = [], failures: Json[] = [], scopedDiagnostics: Json[] = [];
      witness.active.outcomes = outcomes;witness.active.failures = failures;witness.active.scopedDiagnostics = scopedDiagnostics;
      for (const row of cases) {
        const business = physical.cases.find((value: Json) => value.ordinal === row.ordinal)!;
        let retainedDiagnostic: unknown;
        try {
          const envelopeRows = await rawRead(CURRENT_ENVELOPE_SQL,[releaseId,row.catalogId,row.expected.definitionVersionId],1);
          const expectedVector = before.find(value => value.catalog_id === row.catalogId)!;
          need(envelopeRows.length === 1 && envelopeRows[0].envelope_sha256 === expectedVector.envelope_sha256
            && !envelopeRows[0].envelope?.gate, 'CURRENT_REAL_ENVELOPE_HOLD');
          const envelope = freezeCurrentSource(envelopeRows[0].envelope), identity = envelope.identity, definition = envelope.definition;
          need(identity.catalog_id === row.catalogId && definition.id === row.expected.definitionVersionId
            && typeof identity.work_key === 'string' && identity.work_key.length > 0
            && definition.applicability && typeof definition.applicability === 'object'
            && definition.source_metadata && typeof definition.source_metadata === 'object', 'CURRENT_REAL_ENVELOPE_SHAPE_HOLD');
          const catalogHeader = {catalogId:identity.catalog_id,releaseId,namespace:identity.namespace,domain:identity.domain,
            workKey:identity.work_key,titleRu:canonicalDefinitionTitleRu({...definition,title_ru:identity.title_ru}),
            definitionVersion:definition.definition_version,applicability:definition.applicability,professionalMetadata:definition.source_metadata};
          const envelopeHash = sha256(JSON.stringify(envelope));
          const reader = await readCurrentIngressCatalogTuplesV1({declaration:declarations.get(row.ordinal)!,releaseId,
            expectedBackendPid:rootBefore[0].backend_pid,select:rawRead,
            assignedControlRows:row.ordinal === 20 ? [...globalControls,envelopeRows] : [envelopeRows]});
          readers.set(row.ordinal,reader);
          need(reader.witness().fullSourceSha256 === expectedVector.full_source_sha256, 'CURRENT_VECTOR_PARAMETER_SOURCE_HOLD');
          if (row.changeClass === 'RETAINED_HISTORICAL_DEFINITION_IDENTITY') {
            const historical = historicalPhysicalSources.get(row.ordinal)!;
            need(reader.witness().dtoSha256 === historical.productionDtoSha256, 'CURRENT_RETAINED_PRODUCTION_DTO_DIFFERS_FROM_PINNED_HISTORICAL_HOLD');
            const declaredId = definition.applicability.primaryMeasureParameterId;
            const authority = historical.currentMainMeasureAuthority;
            if (authority != null) need(declaredId === authority.parameterId && definition.definition_version === authority.definitionVersion,
              'CURRENT_RETAINED_PASSPORT_MAIN_AUTHORITY_MISMATCH_HOLD');
            if(row.ordinal===20 && typeof currentIngressBoundedDiagnosticV1==='function') retainedDiagnostic=currentIngressBoundedDiagnosticV1({
              declared:definition.applicability,historical,schema:reader.parameterSchema});
            if (typeof declaredId === 'string') need(reader.parameterSchema.some(parameter => parameter.parameterId === declaredId
              && parameter.unitId === (authority?.unitId ?? historical.unitId)), 'CURRENT_RETAINED_PASSPORT_UNIT_MISMATCH_HOLD');
          }
          const catalog = {...catalogHeader,parameterSchema:reader.parameterSchema} as unknown as CanonicalEstimateCatalogItem;
          const invoke = (prompt: string, overrides?: Json) => {
            reader.assertUnchanged();need(sha256(JSON.stringify(physical)) === businessSha256,'CURRENT_BUSINESS_SOURCE_MUTATED_HOLD');need(envelopeHash === sha256(JSON.stringify(envelope)), 'CURRENT_ENVELOPE_CACHE_HOLD');
            const plan = buildCanonicalBaselinePlan({catalog,prompt,...(overrides ? {parameterOverrides:overrides} : {})});
            need(!business.forbiddenPrimaryIds.includes(plan.primaryMeasureParameterId), 'CURRENT_CONTEXT_CANNOT_PAY_PRIMARY_HOLD');
            const primary = reader.parameterSchema.find(parameter => parameter.parameterId === plan.primaryMeasureParameterId);
            need(primary && Array.isArray(primary.formulaConsumers) && primary.formulaConsumers.length > 0, 'CURRENT_PRIMARY_FORMULA_CONNECTED_HOLD');
            reader.assertUnchanged();need(sha256(JSON.stringify(physical)) === businessSha256,'CURRENT_BUSINESS_SOURCE_MUTATED_HOLD');need(envelopeHash === sha256(JSON.stringify(envelope)), 'CURRENT_ENVELOPE_CACHE_HOLD');return plan;
          };
          let originalOutcome: unknown;
          if (row.evidenceLevel === 'ARCHIVED_COMPLETE_DTO') originalOutcome = verifyCurrentIngressPhysicalExpectationV1(business.expected,reader.parameterSchema,invoke);
          else originalOutcome = reader.verifyPublishedPhysical(prompt => invoke(prompt));
          const refinements: Json[] = [];
          for (const refinement of business.refinements) refinements.push(verifyCurrentIngressPhysicalExpectationV1(refinement.expected,
            reader.parameterSchema,prompt => invoke(prompt,refinement.parameterOverrides)) as Json);
          reader.assertUnchanged();
          outcomes.push({ordinal:row.ordinal,evidenceMode:declarations.get(row.ordinal)!.evidenceMode,
            originalOutcome,refinements,retainedHistoricalUnitSource:row.changeClass === 'RETAINED_HISTORICAL_DEFINITION_IDENTITY' ? {
              source:historicalPhysicalSources.get(row.ordinal)!.source,definitionVersionId:historicalPhysicalSources.get(row.ordinal)!.definitionVersionId,
              historicalPrimaryId:historicalPhysicalSources.get(row.ordinal)!.historicalPrimaryId,unitId:historicalPhysicalSources.get(row.ordinal)!.unitId,
              productionDtoSha256:historicalPhysicalSources.get(row.ordinal)!.productionDtoSha256,
              rawParameterRowsSha256:historicalPhysicalSources.get(row.ordinal)!.rawParameterRowsSha256,
              historicalFullSourceSha256:historicalPhysicalSources.get(row.ordinal)!.historicalFullSourceSha256} : null,fullResourceCompile:'OPEN_NOT_REQUESTED',sourceAdmission:false,full:false});
        } catch (error) {
          // Per-case failure remains failure; keep exercising the remaining declared cases before final rejection.
          if([4,8,10,20].includes(row.ordinal) && scopedDiagnostics.length<4) {
            let diagnostic: unknown=retainedDiagnostic;
            try {if(diagnostic===undefined && error && typeof error==='object'){
              const descriptor=Object.getOwnPropertyDescriptor(error,'currentIngressDiagnostic');
              if(descriptor && Object.hasOwn(descriptor,'value'))diagnostic=descriptor.value;
            }} catch { /* unavailable, original failure still recorded below */ }
            const safe=typeof currentIngressBoundedDiagnosticV1==='function'
              ? currentIngressBoundedDiagnosticV1({record:diagnostic}) : {unavailable:true};
            scopedDiagnostics.push({ordinal:row.ordinal,...safe});
          }
          const message = error instanceof Error ? error.message : 'UNCLASSIFIED';
                    const name = error instanceof Error && /^[A-Za-z][A-Za-z0-9_]{0,80}$/u.test(error.name) ? error.name : 'Unclassified';
          const missing = error && typeof error === 'object' ? Object.getOwnPropertyDescriptor(error,'missingParameterIds') : undefined;
          const ids = missing && Object.hasOwn(missing,'value') && Array.isArray(missing.value) && missing.value.length <= 4096
            && missing.value.every((id: unknown) => typeof id === 'string' && /^[A-Za-z_][A-Za-z0-9_.:-]{0,511}$/u.test(id)) ? [...missing.value] : undefined;
          failures.push({ordinal:row.ordinal,name,code:/^[A-Z0-9_:,.-]{1,256}$/u.test(message) ? message : 'CURRENT_CASE_TYPED_OR_PRODUCT_FAILURE',
            ...(ids ? {missingParameterIds:ids} : {})});
        }
      }
      const after = await rawRead(CURRENT_VECTOR_SQL,[releaseId,catalogIds],31), rootAfter = await rawRead(CURRENT_ROOT_SQL,[releaseId],1);
      need(JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(rootBefore) === JSON.stringify(rootAfter), 'CURRENT_GLOBAL_SOURCE_VECTOR_CHANGED_HOLD');
      const recheckedInputs = currentInputs.map(file => {const bytes = readPinned(resolve(CURRENT_FIXTURE_ROOT,file.name),file.hash);
        need(bytes.equals(file.bytes),'CURRENT_SOURCE_FILE_CHANGED_HOLD');return {file:CURRENT_FIXTURE_ROOT+file.name,utf8:bytes.toString('utf8')};});
      need(readPinned(EVIDENCE_MAP_PATH,EVIDENCE_MAP_SHA).equals(evidenceBytes) && readPinned(POINTER_PATH,POINTER_SHA).equals(pointerBytes), 'SOURCE_INPUT_CHANGED_AFTER_READ');
      recheckedInputs.push({file:EVIDENCE_MAP_PATH,utf8:evidenceBytes.toString('utf8')},{file:POINTER_PATH,utf8:pointerBytes.toString('utf8')});
      for (const [file, input] of retainedAuthorityInputs) {
        const bytes = readPinned(resolve(file),input.hash);need(bytes.equals(input.bytes),'RETAINED_AUTHORITY_SOURCE_CHANGED_HOLD');
        recheckedInputs.push({file,utf8:bytes.toString('utf8')});
      }
      const globalReader = readers.get(20);need(globalReader,'CURRENT_GLOBAL_LEDGER_OWNER20_FAILED_HOLD');
      globalReader!.chargeAdditionalControlRows(after);globalReader!.chargeAdditionalControlRows(rootAfter);globalReader!.chargeAdditionalControlRows(recheckedInputs);
      for (const reader of readers.values()) reader.assertUnchanged();
      need(sha256(JSON.stringify(physical)) === businessSha256,'CURRENT_BUSINESS_SOURCE_MUTATED_HOLD');
      for (const source of historicalPhysicalSources.values()) need(source.rawParameterRowsSha256 === sha256(JSON.stringify(source.rawParameterRows)), 'RETAINED_HISTORICAL_SOURCE_CACHE_HOLD');
      witness.active = {status:failures.length ? 'CURRENT29_ATTEMPTED_WITH_REAL_FAILURES' : 'CURRENT29_SCOPED_INGRESS_AND_RETIRED14_VERIFIED',
        releaseId,caseCount:29,outcomeCount:outcomes.length,failures,outcomes,scopedDiagnostics,
        retired14:'ACTUAL_SELECTED_ABSENCE_AND_ORIGINAL_PRODUCT_GUARD_VERIFIED',parameterTotal:2849,
        beforeVectorSha256:sha256(JSON.stringify(before)),afterVectorSha256:sha256(JSON.stringify(after)),
        catalogUnits:[...readers.entries()].map(([ordinal,reader]) => ({ordinal,...reader.witness()})),
        returnedCatalogChargedBytes:[...readers.values()].reduce((sum,reader) => sum+reader.witness().chargedCatalogBytes,0),
        aggregateComplete:readers.size === 29,aggregateIsNotOne3MiBClaim:true,sourceAdmission:false,full:false,productionReady:false};
      need(failures.length === 0 && outcomes.length === 29 && readers.size === 29, 'CURRENT29_REAL_CASE_FAILURES_HOLD');
    };
    try {
      await client.connect(); connected = true;
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"); transaction = true;
      await client.query("set local timezone='UTC'"); await client.query("set local statement_timeout='10000ms'");
      await client.query("set local lock_timeout='1000ms'"); await client.query("set local idle_in_transaction_session_timeout='15000ms'");
      const settings = await select("select current_setting('transaction_read_only') as read_only,current_setting('transaction_isolation') as isolation,current_setting('TimeZone') as timezone", [], 1);
      need(settings.length === 1 && settings[0].read_only === "on" && settings[0].isolation === "repeatable read" && settings[0].timezone === "UTC", "READ_ONLY_REPEATABLE_SNAPSHOT_REQUIRED");
      await historicalPhase(RELEASE_ID); await currentPhase();
    } catch (failure) {
      for (const label of ["historical", "active"] as const) if (String(witness[label].status).startsWith("OBSERVING")) witness[label].status = "HOLD_ACTUAL_READ_OR_MAPPING_FAILURE";
      // Preserve our source-contract failures; external PG errors expose only their code.
      if (failure instanceof Error && /^(?:MASTER30_|CURRENT_|PRIMARY_FORMULA_DISCONNECTED:)/u.test(failure.message)) throw failure;
      const code = failure && typeof failure === "object" && "code" in failure ? String(failure.code) : "UNCLASSIFIED";
      throw new Error("MASTER30_READ_FAILED:" + (/^[A-Z0-9_]{1,64}$/u.test(code) ? code : "UNCLASSIFIED"));
    } finally {
      try { if (connected && transaction) await client.query("ROLLBACK"); }
      finally {
        try { await client.end(); }
        finally {
          // Hashes/IDs/counts only. No URL, prompt, credential, raw schema or user data.
          console.log(JSON.stringify({ master30PromptIngressWitness: witness }));
        }
      }
    }
  }, 120_000);
});
