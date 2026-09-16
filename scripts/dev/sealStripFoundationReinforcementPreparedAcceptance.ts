import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID } from "../../src/lib/estimate/v4/domainFactory";
import {
  STRIP_FOUNDATION_REINFORCEMENT_FORMULAS,
  STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS,
  STRIP_FOUNDATION_REINFORCEMENT_RESOURCES,
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
  compileStripFoundationReinforcementR1,
  stripFoundationReinforcementAcceptanceInputR1,
} from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-reinforcement-prepared-seal.v1";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "831a5ba4-af0f-561c-8766-09a960cf2c74";
const SEARCH_RELEASE_ID = "2a89ec21-c69a-50f2-9c84-9810a9c276e1";
const PARENT_RELEASE_ID = "592dce0c-a06d-5424-81ed-e7e2d587be3f";
const LEGACY_SOURCE_ID = "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1";
const FAMILY_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family/acceptance.json",
);
const POINTER = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family/prepared-acceptance.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`STRIP_REINFORCEMENT_PREPARED_SEAL:${code}`);
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

function sha256(value: unknown): string {
  const bytes = typeof value === "string" || Buffer.isBuffer(value)
    ? value
    : JSON.stringify(stable(value));
  return createHash("sha256").update(bytes).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function evidence(path: string): Json {
  const bytes = readFileSync(path);
  return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  const targetIds = STRIP_FOUNDATION_REINFORCEMENT_TARGETS.map((target) => target.catalogId);
  invariant(targetIds.length === 7 && new Set(targetIds).size === 7, "TARGET_DENOMINATOR_RED");
  invariant(STRIP_FOUNDATION_REINFORCEMENT_PARAMETERS.length === 37, "PARAMETER_SCHEMA_RED");
  invariant(STRIP_FOUNDATION_REINFORCEMENT_FORMULAS.length === 16, "FORMULA_SCHEMA_RED");
  invariant(STRIP_FOUNDATION_REINFORCEMENT_RESOURCES.length === 16, "RESOURCE_SCHEMA_RED");

  const sourceReceipt = readJson(FAMILY_RECEIPT);
  const sourceReceiptBody = { ...sourceReceipt };
  delete sourceReceiptBody.receiptSha256;
  invariant(sourceReceipt.receiptSha256 === sha256(sourceReceiptBody), "SOURCE_RECEIPT_HASH_RED");
  invariant(sourceReceipt.receiptSha256 === "2bce2fc38cce86f349042cb0c2dab716d8178ea42881a5d313f86385c1cf5558",
    "SOURCE_RECEIPT_IDENTITY_RED");
  invariant(sourceReceipt.status === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    && sourceReceipt.activationPerformed === false, "SOURCE_RECEIPT_STATE_RED");

  const pointer = readJson(POINTER);
  invariant(pointer.definitionReleaseId === RELEASE_ID
    && pointer.searchReleaseId === SEARCH_RELEASE_ID
    && pointer.definitionReleaseStatus === "prepared"
    && pointer.searchReleaseStatus === "draft"
    && pointer.owner === "EXACT_STRIP_FOUNDATION_REINFORCEMENT_FAMILY_SUCCESSOR",
  "LOCAL_POINTER_RED");

  const parsed = new URL(DATABASE_URL);
  invariant(parsed.hostname === "127.0.0.1" && parsed.port === "55432"
    && parsed.pathname === "/rik_r4_runtime_b5_v2", "DATABASE_IDENTITY_RED");
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "strip-foundation-reinforcement-prepared-seal",
  });
  await client.connect();
  let release: Json;
  let searchRelease: Json;
  let definitions: Json[];
  let searchDocuments: Json[];
  let manifest: Json;
  let unrelated: Json;
  try {
    release = (await client.query(`select id::text,status,activated_at,parent_release_id::text,
        definition_count,parameter_count,formula_count,resource_row_count,source_manifest_sha256
      from public.estimate_definition_release where id=$1`, [RELEASE_ID])).rows[0] as Json;
    searchRelease = (await client.query(`select id::text,status,activated_at,snapshot_sha256
      from public.estimate_search_index_release where id=$1`, [SEARCH_RELEASE_ID])).rows[0] as Json;
    manifest = (await client.query(`select count(*)::int identities,
        count(*) filter(where catalog_id=any($2::text[]))::int targets,
        encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
      from public.estimate_cumulative_manifest_entry where release_id=$1`, [RELEASE_ID, targetIds])).rows[0] as Json;
    definitions = (await client.query(`select definition.id::text definition_version_id,
        definition.catalog_id,definition.release_id::text,definition.definition_version,
        definition.definition_sha256,definition.content_status,definition.content_gate_status,
        passport.decision,passport.payload_sha256,
        (select count(*)::int from public.estimate_parameter_definition parameter
          where parameter.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph formula
          where formula.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id) resources,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id and resource.procurement_eligible) procurement_rows,
        (select count(*)::int from public.estimate_work_normative_binding binding
          where binding.definition_version_id=definition.id) bindings,
        (select array_agg(distinct source.source_key order by source.source_key)
          from public.estimate_work_normative_binding binding
          join public.estimate_normative_locator locator on locator.id=binding.locator_id
          join public.estimate_normative_source source on source.id=locator.source_id
          where binding.definition_version_id=definition.id) source_keys,
        (select count(*)::int from public.estimate_resource_spec resource
          where resource.definition_version_id=definition.id
            and resource.source_metadata::text like '%'||$3||'%') legacy_resource_rows
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      order by definition.catalog_id`, [RELEASE_ID, targetIds, LEGACY_SOURCE_ID])).rows as Json[];
    searchDocuments = (await client.query(`select catalog_id,definition_release_id::text,
        definition_version_id::text,required_inputs_count,selectable,publication_state,document_sha256
      from public.estimate_search_document where search_release_id=$1 and catalog_id=any($2::text[])
      order by catalog_id`, [SEARCH_RELEASE_ID, targetIds])).rows as Json[];
    unrelated = (await client.query(`select count(*)::int changed
      from public.estimate_cumulative_manifest_entry parent
      join public.estimate_cumulative_manifest_entry successor using(catalog_id)
      where parent.release_id=$1 and successor.release_id=$2
        and parent.catalog_id<>all($3::text[])
        and (parent.definition_version_id<>successor.definition_version_id
          or parent.source_batch<>successor.source_batch
          or parent.source_release_id<>successor.source_release_id
          or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
          or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
      PARENT_RELEASE_ID, RELEASE_ID, targetIds,
    ])).rows[0] as Json;
  } finally {
    await client.end();
  }

  invariant(release?.status === "prepared" && release.activated_at == null
    && release.parent_release_id === PARENT_RELEASE_ID, "RELEASE_LIFECYCLE_RED");
  invariant(searchRelease?.status === "draft" && searchRelease.activated_at == null,
    "SEARCH_LIFECYCLE_RED");
  invariant(Number(manifest?.identities) === 10_331 && Number(manifest?.targets) === 7
    && manifest.snapshot === release.source_manifest_sha256, "MANIFEST_RED");
  invariant(Number(unrelated?.changed) === 0, "UNRELATED_MANIFEST_DRIFT_RED");
  invariant(definitions.length === 7 && searchDocuments.length === 7, "DATABASE_DENOMINATOR_RED");

  const compiledResults: Json[] = [];
  for (const target of STRIP_FOUNDATION_REINFORCEMENT_TARGETS) {
    const definition = definitions.find((row) => row.catalog_id === target.catalogId);
    const search = searchDocuments.find((row) => row.catalog_id === target.catalogId);
    invariant(definition && search, `TARGET_MISSING_RED:${target.catalogId}`);
    invariant(definition.release_id === RELEASE_ID
      && Number(definition.parameters) === 37
      && Number(definition.formulas) === 16
      && Number(definition.resources) === 16
      && Number(definition.bindings) === 1
      && Number(definition.procurement_rows) === 10
      && Number(definition.legacy_resource_rows) === 0,
    `TARGET_SHAPE_RED:${target.catalogId}`);
    invariant(definition.content_status === "CANDIDATE_READY"
      && definition.content_gate_status === "GREEN"
      && definition.decision?.quantityScope === "FULL"
      && definition.decision?.priceState === "PARTIAL_NEEDS_PRICE"
      && definition.decision?.activationAllowed === false
      && definition.decision?.productionEligible === false,
    `TARGET_DECISION_RED:${target.catalogId}`);
    invariant(Array.isArray(definition.source_keys)
      && definition.source_keys.length === 1
      && definition.source_keys[0] === REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
    `TARGET_SOURCE_CLOSURE_RED:${target.catalogId}`);
    invariant(search.definition_release_id === RELEASE_ID
      && search.definition_version_id === definition.definition_version_id
      && Number(search.required_inputs_count) === 37
      && search.selectable === true
      && search.publication_state === "ADMITTED_BACKEND",
    `TARGET_SEARCH_RED:${target.catalogId}`);

    const compiled = await compileStripFoundationReinforcementR1(
      { ...stripFoundationReinforcementAcceptanceInputR1(target.contextKey) },
      { catalogId: target.catalogId },
    );
    invariant(compiled.preliminaryNeeds.length === 0
      && compiled.totals.unpricedRowCount === compiled.totals.includedRowCount,
    `TARGET_CORE_RED:${target.catalogId}`);
    compiledResults.push({
      catalogId: target.catalogId,
      contextKey: target.contextKey,
      definitionVersionId: definition.definition_version_id,
      includedRows: compiled.rows.length,
      procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      approvedScheduleWeightKg: compiled.rows.find(
        (row) => row.row_id === "material:reinforcement:steel-approved-schedule",
      )?.quantity,
      compiledSha256: sha256(compiled),
    });
  }
  invariant(new Set(compiledResults.map((row) => row.includedRows)).size >= 3,
    "CONTEXTS_CLONED_BLINDLY_RED");

  const receiptBase = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_STRIP_FOUNDATION_REINFORCEMENT_FINAL_PREPARED_DRAFT_NOT_ACTIVE",
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      familyReceipt: evidence(FAMILY_RECEIPT),
      familyReceiptSha256: sourceReceipt.receiptSha256,
      localPointer: evidence(POINTER),
    },
    runtime: {
      definitionReleaseId: RELEASE_ID,
      definitionReleaseStatus: release.status,
      definitionActivatedAt: release.activated_at ?? null,
      searchReleaseId: SEARCH_RELEASE_ID,
      searchReleaseStatus: searchRelease.status,
      searchActivatedAt: searchRelease.activated_at ?? null,
      manifestSnapshotSha256: manifest.snapshot,
      searchSnapshotSha256: searchRelease.snapshot_sha256,
    },
    denominator: {
      targetCount: 7,
      preparedTargetCount: 7,
      blockedTargetCount: 0,
      parameterCountPerTarget: 37,
      formulaCountPerTarget: 16,
      resourceDefinitionCountPerTarget: 16,
      normativeBindingCountPerTarget: 1,
      legacyBindingOrResourceCount: 0,
      unrelatedManifestChanges: 0,
    },
    normativeClosure: {
      sourceId: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
      sameUnitRoutingOnly: true,
      automaticKgPerM3AllowanceForbidden: true,
      legacySourceId: LEGACY_SOURCE_ID,
      legacyRows: 0,
    },
    compiledResults,
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const receipt = { ...receiptBase, receiptSha256: sha256(receiptBase) };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    denominator: "7/7",
    lifecycle: "prepared/draft/not-active",
    sourceClosure: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
    receiptSha256: receipt.receiptSha256,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
