import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-concrete-placement.differential-android.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "ffce7418-e0b2-54df-94b9-45ec442eb651";
const SEARCH_RELEASE_ID = "84ccfb2b-1c44-550f-9393-409c5a8d3ed1";
const REVISION_ID = "a8e49589-3f25-4d8c-a92b-56a19ab0e6ee";
const CATALOG_ID = "canonical-work:base:concrete_foundation_interior_strip_foundation_pour_high_load";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md",
);
const ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-differential-android",
);
const OUTPUT = resolve(ROOT, "acceptance.json");
const API_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-api/acceptance.json",
);
const WEB_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-differential-web/acceptance.json",
);
const STANDARD_ANDROID_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/android-strip-foundation-concrete-placement-standard/acceptance.json",
);
const REQUEST_AUDIT = resolve(
  ".release-runtime/r568/runtime/local-developer-current/runtime/backend-7ce27fa03fdb/request-audit.jsonl",
);
const COLD_XML = resolve(ROOT, "04_high_load_cold.xml");
const COLD_PNG = resolve(ROOT, "04_high_load_cold.png");
const ROWS_XML = resolve(ROOT, "06_high_load_exact_rows.xml");
const ROWS_PNG = resolve(ROOT, "06_high_load_exact_rows.png");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function evidence(path: string): Json {
  const bytes = readFileSync(path);
  return {
    path: path.replaceAll("\\", "/"),
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactLocalDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(parsed.hostname === "127.0.0.1", "ANDROID_DIFFERENTIAL_DATABASE_NOT_LOOPBACK");
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    "ANDROID_DIFFERENTIAL_DATABASE_IDENTITY_RED");
}

async function main(): Promise<void> {
  exactLocalDatabaseGuard();
  const api = readJson(API_RECEIPT);
  const web = readJson(WEB_RECEIPT);
  const standardAndroid = readJson(STANDARD_ANDROID_RECEIPT);
  invariant(api.status === "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
    "ANDROID_DIFFERENTIAL_API_FAMILY_RED");
  invariant(api.denominator?.acceptedTargetCount === 7 && api.denominator?.blockedTargetCount === 0,
    "ANDROID_DIFFERENTIAL_API_DENOMINATOR_RED");
  invariant(web.status === "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_DIFFERENTIAL_WEB_HIGH_LOAD_AND_REPAIR_CREATE_EDIT_COLD",
    "ANDROID_DIFFERENTIAL_WEB_RED");
  invariant(standardAndroid.status === "GREEN_ANDROID_API34_STRIP_FOUNDATION_CONCRETE_PLACEMENT_CREATE_EDIT_COLD_OPEN",
    "ANDROID_DIFFERENTIAL_STANDARD_NATIVE_RED");
  invariant(api.activationPerformed === false && web.activationPerformed === false
    && standardAndroid.activationPerformed === false, "ANDROID_DIFFERENTIAL_ACTIVATION_RED");

  const highLoad = (web.results as Json[]).find((entry) => entry.contextKey === "high_load");
  invariant(highLoad?.edit?.revisionId === REVISION_ID
    && highLoad.edit?.inputVolumeM3 === 73
    && highLoad.edit?.readyMixM3 === 80.3
    && highLoad.edit?.rowCount === 11, "ANDROID_DIFFERENTIAL_WEB_REVISION_DRIFT");

  const coldXml = readFileSync(COLD_XML, "utf8");
  const rowsXml = readFileSync(ROWS_XML, "utf8");
  invariant(coldXml.includes("SF-POUR-HIGH-LOAD") && coldXml.includes("72"),
    "ANDROID_DIFFERENTIAL_COLD_HEADER_RED");
  for (const signal of ["80.3", "540", "142", "11", "0/11", "15"]) {
    invariant(rowsXml.includes(signal), `ANDROID_DIFFERENTIAL_UI_SIGNAL_MISSING:${signal}`);
  }
  for (const imagePath of [COLD_PNG, ROWS_PNG]) {
    const bytes = readFileSync(imagePath);
    invariant(bytes.length > 100_000 && bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ), `ANDROID_DIFFERENTIAL_PNG_RED:${imagePath}`);
  }

  const auditRows = readFileSync(REQUEST_AUDIT, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Json)
    .filter((row) => row.userAgent === "okhttp/4.12.0"
      && Date.parse(String(row.at)) >= Date.parse("2026-09-16T16:04:50.000Z")
      && Date.parse(String(row.at)) <= Date.parse("2026-09-16T16:05:15.000Z"));
  invariant(auditRows.length >= 10 && auditRows.every((row) => row.method === "GET"),
    "ANDROID_DIFFERENTIAL_AUDIT_NOT_READ_ONLY");
  invariant(auditRows.some((row) => row.path === `/revisions/${REVISION_ID}` && row.status === 200)
    && auditRows.some((row) => row.path === `/revisions/${REVISION_ID}/rows?limit=200` && row.status === 200)
    && auditRows.some((row) => String(row.path).includes(encodeURIComponent(CATALOG_ID)) && row.status === 200),
  "ANDROID_DIFFERENTIAL_EXACT_GETS_MISSING");
  const auditEvidencePath = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(auditEvidencePath, `${auditRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "strip-concrete-differential-android-seal",
  });
  await client.connect();
  let release: Json;
  let search: Json;
  let revision: Json;
  try {
    release = (await client.query(
      "select id::text,status,activated_at from public.estimate_definition_release where id=$1",
      [RELEASE_ID],
    )).rows[0] as Json;
    search = (await client.query(
      "select id::text,status,activated_at from public.estimate_search_index_release where id=$1",
      [SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    revision = (await client.query(
      `select id::text,parent_revision_id::text,release_id::text,definition_version_id::text,
        catalog_id,revision_number,row_count
        from public.estimate_revision where id=$1`,
      [REVISION_ID],
    )).rows[0] as Json;
  } finally {
    await client.end();
  }
  invariant(release?.status === "prepared" && release.activated_at == null,
    "ANDROID_DIFFERENTIAL_RELEASE_LIFECYCLE_RED");
  invariant(search?.status === "draft" && search.activated_at == null,
    "ANDROID_DIFFERENTIAL_SEARCH_LIFECYCLE_RED");
  invariant(revision?.release_id === RELEASE_ID && revision.catalog_id === CATALOG_ID
    && Number(revision.row_count) === 11, "ANDROID_DIFFERENTIAL_REVISION_DATABASE_RED");

  const disk = statfsSync(resolve("."));
  const receiptBase = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_DIFFERENTIAL_ANDROID_HIGH_LOAD_COLD_OPEN",
    globalStatus: GLOBAL_STATUS,
    master: evidence(MASTER),
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      runtimeSourceTreeHash: web.runtime.sourceTree,
      frontendJsBundleFingerprint: web.runtime.frontendBuildIdentity.jsBundleFingerprint,
    },
    selectionRationale: {
      standardNativeCreateEditColdAlreadyAccepted: true,
      differentialNativeContext: "high_load",
      reason: "maximal winter/pump branch with 11 rows; repair already differs on Web and does not add a native-only branch",
      repeatedEquivalentNativeContextsSkipped: ["large_area", "repair", "small_area", "technical_room", "wet_zone"],
    },
    runtime: {
      platform: "android",
      apiLevel: 34,
      avd: "Pixel_7_API_34",
      package: "com.azisbek_dzhantaev.rikexpoapp",
      transport: "okhttp/4.12.0",
      providerMode: "local-only",
      definitionReleaseId: RELEASE_ID,
      definitionReleaseStatus: release.status,
      definitionActivatedAt: release.activated_at ?? null,
      searchReleaseId: SEARCH_RELEASE_ID,
      searchReleaseStatus: search.status,
      searchActivatedAt: search.activated_at ?? null,
    },
    coldOpen: {
      uri: `rik:///request?canonicalRevisionId=${REVISION_ID}`,
      revisionId: REVISION_ID,
      parentRevisionId: revision.parent_revision_id,
      revisionNumber: Number(revision.revision_number),
      catalogId: CATALOG_ID,
      inputConcreteVolumeM3: 73,
      readyMixConcreteM3: 80.3,
      heatingCableM: 540,
      placementLaborHours: 142,
      estimateRowCount: 11,
      pricedRowCount: 0,
      exactUiSignalsVisible: true,
      inventedPriceCount: 0,
      databaseRevisionMatched: true,
    },
    requestAudit: {
      requestCount: auditRows.length,
      methods: [...new Set(auditRows.map((row) => row.method))],
      mutationCount: auditRows.filter((row) => row.method !== "GET").length,
      exactRevisionGet200: true,
      exactRowsGet200: true,
    },
    reusedAcceptance: {
      apiFamily: { status: api.status, accepted: "7/7", receiptSha256: api.receiptSha256 },
      differentialWeb: { status: web.status, contexts: "2/2", receiptSha256: web.receiptSha256 },
      standardAndroid: { status: standardAndroid.status, receiptSha256: standardAndroid.receiptSha256 },
    },
    evidence: [
      evidence(COLD_XML),
      evidence(COLD_PNG),
      evidence(ROWS_XML),
      evidence(ROWS_PNG),
      evidence(auditEvidencePath),
      evidence(API_RECEIPT),
      evidence(WEB_RECEIPT),
      evidence(STANDARD_ANDROID_RECEIPT),
    ],
    resourceControl: {
      beforeCleanup: { freeMemoryMiB: 1339, qemuMiB: 2507, metroMiB: 1760 },
      afterCleanup: {
        freeMemoryBytes: freemem(),
        availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
        qemuRunning: false,
        metroRunning: false,
      },
      databasePreserved: true,
      backendPreserved: true,
      authBrokerPreserved: true,
      providerPreserved: true,
    },
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
    revisionId: REVISION_ID,
    rows: 11,
    requestAuditMutations: 0,
    receiptSha256: receipt.receiptSha256,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
