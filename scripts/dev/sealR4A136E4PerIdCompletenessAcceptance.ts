import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS,
} from "../../src/lib/estimate/v4/masonryBrickWallBiaTn10R1";
import {
  FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS,
  FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS,
  FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS,
  FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS,
} from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";
import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.e4-frami-bia-concrete-per-id-completeness.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "592dce0c-a06d-5424-81ed-e7e2d587be3f";
const SEARCH_RELEASE_ID = "aaa7f4aa-c5b3-5f5c-a11f-dcfe5f8e7261";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md",
);
const OUTPUT_ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/e4-frami-bia-concrete-per-id-completeness",
);
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");

const RECEIPTS = Object.freeze({
  framiStrip: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-strip-foundation-family/acceptance.json"),
  framiSlab: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-slab-foundation-family/acceptance.json"),
  framiGeneral: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-general-foundation-family/acceptance.json"),
  framiPileCapWet: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-wet-zone-full-project-kit/acceptance.json"),
  framiPileCapDistinct: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-distinct-project-family/acceptance.json"),
  framiPileCapApi: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-distinct-project-e4-api/acceptance.json"),
  framiPileCapWeb: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-distinct-project-e4-differential-web/acceptance.json"),
  framiPileCapAndroid: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-distinct-project-e4-differential-android/acceptance.json"),
  framiStripWeb: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/web-formwork-frami-xlife-strip-foundation-standard-full/acceptance.json"),
  framiSlabWeb: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/web-formwork-frami-xlife-slab-foundation-standard-full/acceptance.json"),
  framiGeneralWeb: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/web-formwork-frami-xlife-general-foundation-standard-full/acceptance.json"),
  framiPileCapWetWeb: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/web-formwork-frami-xlife-pile-cap-wet-zone-full/acceptance.json"),
  framiAndroidBaseline: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/android-formwork-frami-xlife-strip-foundation-standard-e6/acceptance.json"),
  biaFamily: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/bia-tn10-masonry-full-family/acceptance.json"),
  biaWeb: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/web-bia-tn10-masonry-full-family/acceptance.json"),
  biaAndroid: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/android-bia-tn10-full-family-e5/acceptance.json"),
  concreteFamily: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-concrete-placement-family/acceptance.json"),
  concreteApi: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-api/acceptance.json"),
  concreteWeb: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-differential-web/acceptance.json"),
  concreteAndroid: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-differential-android/acceptance.json"),
  concreteAndroidStandard: resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/android-strip-foundation-concrete-placement-standard/acceptance.json"),
});

const EXPECTED_STATUSES = Object.freeze({
  framiStrip: "GREEN_FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_FAMILY_PREPARED_NOT_ACTIVE",
  framiSlab: "GREEN_FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_FAMILY_PREPARED_NOT_ACTIVE",
  framiGeneral: "GREEN_FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_FAMILY_PREPARED_NOT_ACTIVE",
  framiPileCapWet: "GREEN_FORMWORK_FRAMI_XLIFE_SUCCESSOR_PREPARED_NOT_ACTIVE",
  framiPileCapDistinct: "GREEN_FORMWORK_FRAMI_XLIFE_PILE_CAP_DISTINCT_PROJECT_FAMILY_PREPARED_NOT_ACTIVE",
  framiPileCapApi: "GREEN_FORMWORK_FRAMI_XLIFE_PILE_CAP_6_OF_6_DISTINCT_PROJECT_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
  framiPileCapWeb: "GREEN_FORMWORK_FRAMI_XLIFE_PILE_CAP_DISTINCT_PROJECT_DIFFERENTIAL_WEB_HIGH_LOAD_AND_SMALL_AREA_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD",
  framiPileCapAndroid: "GREEN_FORMWORK_FRAMI_XLIFE_PILE_CAP_DISTINCT_PROJECT_DIFFERENTIAL_ANDROID_HIGH_LOAD_COLD_OPEN",
  framiStripWeb: "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_STANDARD_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY",
  framiSlabWeb: "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_STANDARD_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY",
  framiGeneralWeb: "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_STANDARD_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY",
  framiPileCapWetWeb: "GREEN_EXACT_FORMWORK_FRAMI_XLIFE_PILE_CAP_FULL_WEB_BACKEND_PDF_PROCUREMENT_HISTORY",
  framiAndroidBaseline: "GREEN_ANDROID_API34_STRIP_FOUNDATION_FULL_17_ROW_COLD_REOPEN_PROCUREMENT_ARTIFACT_RECOVERY",
  biaFamily: "GREEN_BIA_TN10_MASONRY_FULL_FAMILY_PREPARED_NOT_ACTIVE",
  biaWeb: "GREEN_EXACT_BIA_TN10_MASONRY_FULL_APPLICABLE_WEB_BACKEND_PDF_PROCUREMENT_HISTORY",
  biaAndroid: "GREEN_ANDROID_API34_BIA_TN10_FULL_18_ROW_COLD_REOPEN_ARTIFACT_RECOVERY",
  concreteFamily: "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_PREPARED_NOT_ACTIVE",
  concreteApi: "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
  concreteWeb: "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_DIFFERENTIAL_WEB_HIGH_LOAD_AND_REPAIR_CREATE_EDIT_COLD",
  concreteAndroid: "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_DIFFERENTIAL_ANDROID_HIGH_LOAD_COLD_OPEN",
  concreteAndroidStandard: "GREEN_ANDROID_API34_STRIP_FOUNDATION_CONCRETE_PLACEMENT_CREATE_EDIT_COLD_OPEN",
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`E4_PER_ID_COMPLETENESS:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
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

function exactSet(actual: readonly string[], expected: readonly string[], code: string): void {
  invariant(actual.length === expected.length, `${code}:COUNT:${actual.length}:${expected.length}`);
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();
  invariant(actualSorted.every((value, index) => value === expectedSorted[index]), `${code}:SET`);
}

function assertFamilyReceipt(
  receipt: Json,
  expectedIds: readonly string[],
  targetResultsPath: "targetResults" | "targets",
): void {
  const results = targetResultsPath === "targetResults"
    ? receipt.coreAcceptance?.targetResults
    : receipt.coreAcceptance?.targets;
  invariant(receipt.activationPerformed === false, `${receipt.status}:ACTIVATION_RED`);
  invariant(receipt.coreAcceptance?.compilerOwner === "compileCanonicalEstimateCore",
    `${receipt.status}:CORE_OWNER_RED`);
  invariant(Array.isArray(results) && results.length === expectedIds.length,
    `${receipt.status}:CORE_DENOMINATOR_RED`);
  exactSet(results.map((row: Json) => String(row.catalogId)), expectedIds, `${receipt.status}:CORE_IDS_RED`);
}

async function main(): Promise<void> {
  const databaseUrl = new URL(DATABASE_URL);
  invariant(
    databaseUrl.hostname === "127.0.0.1"
      && databaseUrl.port === "55432"
      && databaseUrl.pathname === "/rik_r4_runtime_b5_v2",
    "DATABASE_IDENTITY_RED",
  );

  const receipts = Object.fromEntries(
    Object.entries(RECEIPTS).map(([key, path]) => [key, readJson(path)]),
  ) as Record<keyof typeof RECEIPTS, Json>;
  for (const [key, expectedStatus] of Object.entries(EXPECTED_STATUSES)) {
    invariant(receipts[key as keyof typeof RECEIPTS]?.status === expectedStatus, `RECEIPT_STATUS_RED:${key}`);
  }

  const framiPileCapIds = FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS.map((target) => target.catalogId);
  const framiStripIds = FORMWORK_FRAMI_XLIFE_STRIP_FOUNDATION_TARGETS.map((target) => target.catalogId);
  const framiSlabIds = FORMWORK_FRAMI_XLIFE_SLAB_FOUNDATION_TARGETS.map((target) => target.catalogId);
  const framiGeneralIds = FORMWORK_FRAMI_XLIFE_GENERAL_FOUNDATION_TARGETS.map((target) => target.catalogId);
  const framiIds = [...framiPileCapIds, ...framiStripIds, ...framiSlabIds, ...framiGeneralIds];
  const biaIds = [...MASONRY_BRICK_WALL_BIA_TN10_NEUTRAL_CATALOG_IDS];
  const concreteIds = STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId);
  const allIds = [...framiIds, ...biaIds, ...concreteIds];
  const framiIdSet = new Set<string>(framiIds);
  const biaIdSet = new Set<string>(biaIds);
  const concreteIdSet = new Set<string>(concreteIds);
  invariant(framiIds.length === 28 && biaIds.length === 4 && concreteIds.length === 7,
    "SOURCE_DENOMINATOR_RED");
  invariant(new Set(allIds).size === 39, "SOURCE_ID_UNIQUENESS_RED");

  assertFamilyReceipt(receipts.framiStrip, framiStripIds, "targetResults");
  assertFamilyReceipt(receipts.framiSlab, framiSlabIds, "targetResults");
  assertFamilyReceipt(receipts.framiGeneral, framiGeneralIds, "targetResults");
  assertFamilyReceipt(receipts.biaFamily, biaIds, "targets");
  const distinctPileCapIds = framiPileCapIds.filter((catalogId) => !catalogId.endsWith("_wet_zone"));
  const distinctPileCapIdSet = new Set<string>(distinctPileCapIds);
  assertFamilyReceipt(receipts.framiPileCapDistinct, distinctPileCapIds, "targetResults");
  invariant(
    receipts.framiPileCapWet.targetCatalogId === framiPileCapIds.find((catalogId) => catalogId.endsWith("_wet_zone"))
      && receipts.framiPileCapWet.activationPerformed === false
      && receipts.framiPileCapWet.coreAcceptance?.compilerOwner === "compileCanonicalEstimateCore"
      && receipts.framiPileCapWet.coreAcceptance?.exact?.rows === 24
      && receipts.framiPileCapWet.coreAcceptance?.exact?.includedRows === 17
      && receipts.framiPileCapWet.coreAcceptance?.exact?.procurementRows === 14,
    "PILE_CAP_WET_FULL_RED",
  );
  invariant(
    receipts.framiPileCapApi.denominator?.acceptedTargetCount === 6
      && receipts.framiPileCapApi.denominator?.blockedTargetCount === 0
      && receipts.framiPileCapWeb.results?.length === 2
      && receipts.framiPileCapAndroid.activationPerformed === false,
    "PILE_CAP_DIFFERENTIAL_ACCEPTANCE_RED",
  );
  invariant(
    receipts.concreteApi.denominator?.acceptedTargetCount === 7
      && receipts.concreteApi.denominator?.blockedTargetCount === 0
      && receipts.concreteApi.targetResults?.length === 7
      && receipts.concreteWeb.results?.length === 2
      && receipts.concreteAndroid.activationPerformed === false,
    "CONCRETE_DIFFERENTIAL_ACCEPTANCE_RED",
  );
  exactSet(
    receipts.concreteApi.targetResults.map((row: Json) => String(row.catalogId)),
    concreteIds,
    "CONCRETE_API_IDS_RED",
  );
  invariant(
    receipts.biaFamily.coreAcceptance?.targetCount === 4
      && receipts.biaFamily.coreAcceptance?.exactApplicableRowCount === 18
      && receipts.biaFamily.activationPerformed === false,
    "BIA_FAMILY_ACCEPTANCE_RED",
  );
  for (const receipt of Object.values(receipts)) {
    invariant(receipt.productionAccessed !== true, `PRODUCTION_ACCESS_RED:${receipt.status}`);
    invariant(receipt.deployPerformed !== true, `DEPLOY_RED:${receipt.status}`);
    invariant(receipt.releasePerformed !== true, `RELEASE_RED:${receipt.status}`);
    invariant(receipt.otaPerformed !== true, `OTA_RED:${receipt.status}`);
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r4-a13-6-e4-per-id-completeness-seal",
  });
  await client.connect();
  let release: Json;
  let searchRelease: Json;
  let definitions: Json[];
  let searchDocuments: Json[];
  try {
    release = (await client.query(
      "select id::text,status,activated_at,parent_release_id::text from public.estimate_definition_release where id=$1",
      [RELEASE_ID],
    )).rows[0] as Json;
    searchRelease = (await client.query(
      "select id::text,status,activated_at from public.estimate_search_index_release where id=$1",
      [SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    definitions = (await client.query(
      `with recursive lineage as (
        select id,parent_release_id,0 depth,status,activated_at
        from public.estimate_definition_release where id=$1
        union all
        select parent.id,parent.parent_release_id,lineage.depth+1,parent.status,parent.activated_at
        from public.estimate_definition_release parent
        join lineage on parent.id=lineage.parent_release_id
        where lineage.depth<200
      ), ranked as (
        select definition.*,lineage.depth,lineage.status release_status,lineage.activated_at,
          row_number() over(partition by definition.catalog_id order by lineage.depth) rank
        from lineage
        join public.estimate_definition_version definition on definition.release_id=lineage.id
        where definition.catalog_id=any($2::text[])
      )
      select definition.catalog_id,definition.id::text definition_version_id,
        definition.release_id::text,definition.definition_version,definition.definition_sha256,
        definition.content_status,definition.content_gate_status,definition.depth,
        definition.release_status,definition.activated_at,
        count(distinct parameter.parameter_id)::int parameter_count,
        count(distinct formula.formula_id)::int formula_count,
        count(distinct resource.row_id)::int resource_count,
        passport.decision,passport.payload_sha256
      from ranked definition
      join public.estimate_content_passport_r3 passport
        on passport.definition_version_id=definition.id
      left join public.estimate_parameter_definition parameter
        on parameter.definition_version_id=definition.id
      left join public.estimate_formula_graph formula
        on formula.definition_version_id=definition.id
      left join public.estimate_resource_spec resource
        on resource.definition_version_id=definition.id
      where definition.rank=1
      group by definition.id,definition.catalog_id,definition.release_id,
        definition.definition_version,definition.definition_sha256,definition.content_status,
        definition.content_gate_status,definition.depth,definition.release_status,
        definition.activated_at,passport.decision,passport.payload_sha256
      order by definition.catalog_id`,
      [RELEASE_ID, allIds],
    )).rows as Json[];
    searchDocuments = (await client.query(
      `select catalog_id,definition_release_id::text,definition_version_id::text,
        required_inputs_count,selectable,publication_state,document_sha256,
        jsonb_array_length(included_boundaries)::int included_boundary_count,
        jsonb_array_length(excluded_boundaries)::int excluded_boundary_count
      from public.estimate_search_document
      where search_release_id=$1 and catalog_id=any($2::text[])
      order by catalog_id`,
      [SEARCH_RELEASE_ID, allIds],
    )).rows as Json[];
  } finally {
    await client.end();
  }

  invariant(release?.status === "prepared" && release.activated_at == null, "RELEASE_LIFECYCLE_RED");
  invariant(searchRelease?.status === "draft" && searchRelease.activated_at == null,
    "SEARCH_LIFECYCLE_RED");
  invariant(definitions.length === 39 && searchDocuments.length === 39, "DATABASE_DENOMINATOR_RED");
  exactSet(definitions.map((row) => String(row.catalog_id)), allIds, "DATABASE_DEFINITION_IDS_RED");
  exactSet(searchDocuments.map((row) => String(row.catalog_id)), allIds, "DATABASE_SEARCH_IDS_RED");

  const perId = allIds.map((catalogId) => {
    const definition = definitions.find((row) => row.catalog_id === catalogId);
    const search = searchDocuments.find((row) => row.catalog_id === catalogId);
    invariant(definition && search, `PER_ID_DATABASE_ROW_MISSING:${catalogId}`);
    const family = framiIdSet.has(catalogId)
      ? "frami_xlife"
      : biaIdSet.has(catalogId) ? "bia_tn10" : "concrete_placement";
    const expected = family === "frami_xlife"
      ? { parameters: 52, formulas: 20, resources: 24 }
      : family === "bia_tn10"
        ? { parameters: 60, formulas: 19, resources: 23 }
        : { parameters: 32, formulas: 13, resources: 13 };
    invariant(
      Number(definition.parameter_count) === expected.parameters
        && Number(definition.formula_count) === expected.formulas
        && Number(definition.resource_count) === expected.resources,
      `PER_ID_SHAPE_RED:${catalogId}`,
    );
    invariant(
      definition.content_status === "CANDIDATE_READY"
        && definition.content_gate_status === "GREEN"
        && definition.release_status === "prepared"
        && definition.activated_at == null
        && definition.decision?.quantityScope === "FULL"
        && definition.decision?.priceState === "PARTIAL_NEEDS_PRICE"
        && definition.decision?.activationAllowed === false
        && definition.decision?.productionEligible === false,
      `PER_ID_CONTENT_DECISION_RED:${catalogId}`,
    );
    invariant(
      search.definition_version_id === definition.definition_version_id
        && search.definition_release_id === RELEASE_ID
        && Number(search.required_inputs_count) === expected.parameters
        && search.selectable === true
        && search.publication_state === "ADMITTED_BACKEND",
      `PER_ID_SEARCH_RED:${catalogId}`,
    );
    invariant(
      /^[0-9a-f]{64}$/u.test(String(definition.definition_sha256))
        && /^[0-9a-f]{64}$/u.test(String(definition.payload_sha256))
        && /^[0-9a-f]{64}$/u.test(String(search.document_sha256)),
      `PER_ID_HASH_RED:${catalogId}`,
    );
    const differentialBackendAccepted = concreteIdSet.has(catalogId)
      || distinctPileCapIdSet.has(catalogId);
    return {
      catalogId,
      family,
      definitionVersionId: definition.definition_version_id,
      sourceReleaseId: definition.release_id,
      releaseDepth: Number(definition.depth),
      definitionVersion: Number(definition.definition_version),
      parameters: expected.parameters,
      formulas: expected.formulas,
      resources: expected.resources,
      quantityScope: "FULL",
      priceState: "PARTIAL_NEEDS_PRICE",
      searchSelectable: true,
      lifecycle: "prepared_not_active",
      e4AcceptanceBasis: differentialBackendAccepted
        ? "PER_ID_BACKEND_PLUS_DIFFERENTIAL_UI"
        : "PER_ID_CORE_PLUS_EQUIVALENCE_CLASS_UI",
      blocked: false,
    };
  });

  const receiptEvidence = Object.entries(RECEIPTS).map(([key, path]) => ({ key, ...evidence(path) }));
  const receiptBase = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_R4_A13_6_E4_FRAMI_BIA_CONCRETE_PER_ID_COMPLETENESS_39_OF_39_PREPARED_NOT_ACTIVE",
    globalStatus: GLOBAL_STATUS,
    master: evidence(MASTER),
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    },
    runtime: {
      definitionReleaseId: RELEASE_ID,
      definitionReleaseStatus: release.status,
      definitionActivatedAt: release.activated_at ?? null,
      searchReleaseId: SEARCH_RELEASE_ID,
      searchReleaseStatus: searchRelease.status,
      searchActivatedAt: searchRelease.activated_at ?? null,
      resolution: "NEAREST_DEFINITION_IN_RELEASE_PARENT_LINEAGE",
    },
    denominator: {
      originalTargetCount: 39,
      framiTargetCount: 28,
      biaTargetCount: 4,
      concreteTargetCount: 7,
      preparedFullTargetCount: 39,
      acceptedForE4TargetCount: 39,
      blockedTargetCount: 0,
      missingTargetCount: 0,
      measurementOnlyPileCapRemaining: 0,
      denominatorPreserved: true,
    },
    effectiveShape: {
      frami: { targetCount: 28, parameters: 52, formulas: 20, resources: 24 },
      bia: { targetCount: 4, parameters: 60, formulas: 19, resources: 23 },
      concrete: { targetCount: 7, parameters: 32, formulas: 13, resources: 13 },
    },
    acceptanceClasses: {
      perIdBackendPlusDifferentialUi: perId.filter((row) => (
        row.e4AcceptanceBasis === "PER_ID_BACKEND_PLUS_DIFFERENTIAL_UI"
      )).length,
      perIdCorePlusEquivalenceClassUi: perId.filter((row) => (
        row.e4AcceptanceBasis === "PER_ID_CORE_PLUS_EQUIVALENCE_CLASS_UI"
      )).length,
      equivalencePolicy: "Every ID has an exact full core result; only UI/native scenarios with different behavior are repeated.",
    },
    perId,
    blockedIds: [],
    missingIds: [],
    receiptEvidence,
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const receipt = { ...receiptBase, receiptSha256: sha256(JSON.stringify(receiptBase)) };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    denominator: "39/39",
    families: "28/4/7",
    blocked: 0,
    receiptSha256: receipt.receiptSha256,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
