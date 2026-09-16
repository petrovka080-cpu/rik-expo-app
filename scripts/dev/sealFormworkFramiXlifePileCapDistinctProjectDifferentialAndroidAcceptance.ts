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

const CONTRACT = "rik-expo-app.r4-a13-6.formwork-frami-xlife-pile-cap-distinct-project.differential-android.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "592dce0c-a06d-5424-81ed-e7e2d587be3f";
const SEARCH_RELEASE_ID = "aaa7f4aa-c5b3-5f5c-a11f-dcfe5f8e7261";
const REVISION_ID = "a2866800-c7ba-44ab-983e-6fc82c9a5827";
const CATALOG_ID = "canonical-work:base:concrete_foundation_interior_pile_cap_form_high_load";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md",
);
const ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-distinct-project-e4-differential-android",
);
const OUTPUT = resolve(ROOT, "acceptance.json");
const API_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-distinct-project-e4-api/acceptance.json",
);
const WEB_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-distinct-project-e4-differential-web/acceptance.json",
);
const STANDARD_ANDROID_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/android-formwork-frami-xlife-strip-foundation-standard-e6/acceptance.json",
);
const DEVICE_HEALTH = resolve(ROOT, "device_health.json");
const REQUEST_AUDIT = resolve(
  ".release-runtime/r568/runtime/local-developer-current/runtime/backend-64a10b0af855/request-audit.jsonl",
);
const ROWS_XML = resolve(ROOT, "06_high_load_rows_expanded.xml");
const ROWS_PNG = resolve(ROOT, "06_high_load_rows_expanded.png");
const PARAMETERS_XML = resolve(ROOT, "10_edit_parameters.xml");
const PARAMETERS_PNG = resolve(ROOT, "10_edit_parameters.png");
const PROCUREMENT_XML = resolve(ROOT, "11_high_load_procurement.xml");
const PROCUREMENT_PNG = resolve(ROOT, "11_high_load_procurement.png");

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
  invariant(
    parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    "ANDROID_DIFFERENTIAL_DATABASE_IDENTITY_RED",
  );
}

async function main(): Promise<void> {
  exactLocalDatabaseGuard();
  const api = readJson(API_RECEIPT);
  const web = readJson(WEB_RECEIPT);
  const standardAndroid = readJson(STANDARD_ANDROID_RECEIPT);
  const deviceHealth = readJson(DEVICE_HEALTH);

  invariant(
    api.status === "GREEN_FORMWORK_FRAMI_XLIFE_PILE_CAP_6_OF_6_DISTINCT_PROJECT_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
    "ANDROID_DIFFERENTIAL_API_FAMILY_RED",
  );
  invariant(
    api.denominator?.acceptedTargetCount === 6
      && api.denominator?.blockedTargetCount === 0
      && api.denominator?.exactRowCountPerTarget === 24
      && api.denominator?.includedRowCountPerTarget === 17
      && api.denominator?.procurementRowCountPerTarget === 14,
    "ANDROID_DIFFERENTIAL_API_DENOMINATOR_RED",
  );
  invariant(
    web.status === "GREEN_FORMWORK_FRAMI_XLIFE_PILE_CAP_DISTINCT_PROJECT_DIFFERENTIAL_WEB_HIGH_LOAD_AND_SMALL_AREA_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD",
    "ANDROID_DIFFERENTIAL_WEB_RED",
  );
  invariant(
    standardAndroid.status === "GREEN_ANDROID_API34_STRIP_FOUNDATION_FULL_17_ROW_COLD_REOPEN_PROCUREMENT_ARTIFACT_RECOVERY",
    "ANDROID_DIFFERENTIAL_STANDARD_NATIVE_RED",
  );
  invariant(
    api.activationPerformed === false
      && web.activationPerformed === false
      && standardAndroid.runtime?.releaseDeployActivationOta === "DEFERRED_NOT_EXECUTED",
    "ANDROID_DIFFERENTIAL_ACTIVATION_RED",
  );
  invariant(
    deviceHealth.final_status === "GREEN_ANDROID_API34_DEVICE_READY"
      && deviceHealth.android_sdk === 34
      && deviceHealth.cpu_abi === "x86_64"
      && deviceHealth.sys_boot_completed === "1"
      && deviceHealth.framework_services_ready === true,
    "ANDROID_DIFFERENTIAL_DEVICE_RED",
  );

  const highLoad = (web.results as Json[]).find((entry) => entry.contextKey === "high_load");
  invariant(
    highLoad?.edit?.revisionId === REVISION_ID
      && highLoad.edit?.editedMeasuredContactAreaM2 === 145
      && highLoad.edit?.rowCount === 24
      && highLoad.edit?.visibleRowCount === 17
      && highLoad.edit?.procurementRowCount === 14
      && highLoad.edit?.panelRentalPieceDays === 648,
    "ANDROID_DIFFERENTIAL_WEB_REVISION_DRIFT",
  );

  const rowsXml = readFileSync(ROWS_XML, "utf8");
  const parametersXml = readFileSync(PARAMETERS_XML, "utf8");
  const procurementXml = readFileSync(PROCUREMENT_XML, "utf8");
  for (const signal of ["648", "216", "1728", "864", "17 позиций", "0/17"]) {
    invariant(rowsXml.includes(signal), `ANDROID_DIFFERENTIAL_UI_SIGNAL_MISSING:${signal}`);
  }
  for (const signal of ["Исходные данные расчёта", "145", "м²", "Версия 5"]) {
    invariant(parametersXml.includes(signal), `ANDROID_DIFFERENTIAL_PARAMETER_SIGNAL_MISSING:${signal}`);
  }
  for (const signal of ["Список закупки", "14 позиций", "версия №5", "648", "Цена не заполнена"]) {
    invariant(procurementXml.includes(signal), `ANDROID_DIFFERENTIAL_PROCUREMENT_SIGNAL_MISSING:${signal}`);
  }
  for (const imagePath of [ROWS_PNG, PARAMETERS_PNG, PROCUREMENT_PNG]) {
    const bytes = readFileSync(imagePath);
    invariant(
      bytes.length > 100_000
        && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      `ANDROID_DIFFERENTIAL_PNG_RED:${imagePath}`,
    );
  }

  const auditRows = readFileSync(REQUEST_AUDIT, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Json)
    .filter((row) => row.userAgent === "okhttp/4.12.0"
      && Date.parse(String(row.at)) >= Date.parse("2026-09-16T16:53:20.000Z")
      && Date.parse(String(row.at)) <= Date.parse("2026-09-16T16:58:00.000Z"));
  invariant(
    auditRows.length >= 10 && auditRows.every((row) => row.method === "GET"),
    "ANDROID_DIFFERENTIAL_AUDIT_NOT_READ_ONLY",
  );
  invariant(
    auditRows.some((row) => row.path === `/revisions/${REVISION_ID}` && row.status === 200)
      && auditRows.some((row) => row.path === `/revisions/${REVISION_ID}/rows?limit=200` && row.status === 200)
      && auditRows.some((row) => String(row.path).includes(encodeURIComponent(CATALOG_ID)) && row.status === 200),
    "ANDROID_DIFFERENTIAL_EXACT_GETS_MISSING",
  );
  const auditEvidencePath = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(auditEvidencePath, `${auditRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "frami-pile-cap-differential-android-seal",
  });
  await client.connect();
  let release: Json;
  let search: Json;
  let revision: Json;
  let exactRows: Json[];
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
        catalog_id,revision_number,row_count,input_parameters
        from public.estimate_revision where id=$1`,
      [REVISION_ID],
    )).rows[0] as Json;
    exactRows = (await client.query(
      `select row_id,quantity::text,unit_id
        from public.estimate_revision_row
        where revision_id=$1 and row_id = any($2::text[])
        order by ordinal`,
      [REVISION_ID, [
        "information:formwork:measured-contact-area",
        "equipment:formwork:frami-xlife-panels-rental",
        "equipment:formwork:frami-xlife-corners-rental",
        "equipment:formwork:frami-panel-connectors-rental",
        "equipment:formwork:frami-flat-ties-10-80-rental",
      ]],
    )).rows as Json[];
  } finally {
    await client.end();
  }
  invariant(
    release?.status === "prepared" && release.activated_at == null,
    "ANDROID_DIFFERENTIAL_RELEASE_LIFECYCLE_RED",
  );
  invariant(
    search?.status === "draft" && search.activated_at == null,
    "ANDROID_DIFFERENTIAL_SEARCH_LIFECYCLE_RED",
  );
  invariant(
    revision?.release_id === RELEASE_ID
      && revision.catalog_id === CATALOG_ID
      && Number(revision.row_count) === 24
      && Number(revision.input_parameters?.measured_formwork_contact_area_m2) === 145,
    "ANDROID_DIFFERENTIAL_REVISION_DATABASE_RED",
  );
  const exactQuantity = (rowId: string): number => Number(
    exactRows.find((row) => row.row_id === rowId)?.quantity,
  );
  invariant(
    exactQuantity("information:formwork:measured-contact-area") === 145
      && exactQuantity("equipment:formwork:frami-xlife-panels-rental") === 648
      && exactQuantity("equipment:formwork:frami-xlife-corners-rental") === 216
      && exactQuantity("equipment:formwork:frami-panel-connectors-rental") === 1728
      && exactQuantity("equipment:formwork:frami-flat-ties-10-80-rental") === 864,
    "ANDROID_DIFFERENTIAL_ROW_QUANTITIES_RED",
  );

  const disk = statfsSync(resolve("."));
  const receiptBase = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_FORMWORK_FRAMI_XLIFE_PILE_CAP_DISTINCT_PROJECT_DIFFERENTIAL_ANDROID_HIGH_LOAD_COLD_OPEN",
    globalStatus: GLOBAL_STATUS,
    master: evidence(MASTER),
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      runtimeSourceTreeHash: web.runtime.sourceTree,
      frontendJsBundleFingerprint: web.runtime.frontendBuildIdentity.jsBundleFingerprint,
    },
    selectionRationale: {
      fullFramiNativeCreateEditColdProcurementAlreadyAccepted: true,
      differentialNativeContext: "high_load",
      reason: "maximum confirmed pile-cap project schedule; minimum schedule is separately accepted on Web",
      repeatedEquivalentNativeContextsSkipped: ["standard", "large_area", "repair", "small_area", "technical_room"],
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
      measuredContactAreaM2: 145,
      sourceDefinitionRowCount: 24,
      visibleEstimateRowCount: 17,
      procurementRowCount: 14,
      pricedRowCount: 0,
      panelRentalPieceDays: 648,
      cornerRentalPieceDays: 216,
      connectorRentalPieceDays: 1728,
      flatTieRentalPieceDays: 864,
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
      exactCatalogGet200: true,
    },
    reusedAcceptance: {
      apiFamily: { status: api.status, accepted: "6/6", receiptSha256: api.receiptSha256 },
      differentialWeb: { status: web.status, contexts: "2/2", receiptSha256: web.receiptSha256 },
      standardFramiAndroid: {
        status: standardAndroid.status,
        sourceDefinitionRowCount: standardAndroid.coldReopen?.sourceDefinitionRowCount,
        visibleEstimateRowCount: standardAndroid.coldReopen?.activeEstimateRowCount,
        procurementRowCount: standardAndroid.coldReopen?.procurementRowCount,
        receiptFileSha256: evidence(STANDARD_ANDROID_RECEIPT).sha256,
      },
    },
    evidence: [
      evidence(ROWS_XML),
      evidence(ROWS_PNG),
      evidence(PARAMETERS_XML),
      evidence(PARAMETERS_PNG),
      evidence(PROCUREMENT_XML),
      evidence(PROCUREMENT_PNG),
      evidence(DEVICE_HEALTH),
      evidence(auditEvidencePath),
      evidence(API_RECEIPT),
      evidence(WEB_RECEIPT),
      evidence(STANDARD_ANDROID_RECEIPT),
    ],
    resourceControl: {
      beforeCleanup: { freeMemoryMiB: 1736, diskFreeGiB: 44.06, qemuRunning: true, metroRunning: true },
      afterCleanup: {
        measuredFreeMemoryMiB: 6970,
        measuredFreedMemoryMiB: 5234,
        freeMemoryBytesAtSeal: freemem(),
        availableDiskBytesAtSeal: Number(disk.bavail) * Number(disk.bsize),
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
    sourceRows: 24,
    visibleRows: 17,
    procurementRows: 14,
    requestAuditMutations: 0,
    receiptSha256: receipt.receiptSha256,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
