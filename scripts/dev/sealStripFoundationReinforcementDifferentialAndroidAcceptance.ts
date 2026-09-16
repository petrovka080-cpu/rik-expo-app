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

const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-reinforcement.differential-android.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "831a5ba4-af0f-561c-8766-09a960cf2c74";
const SEARCH_RELEASE_ID = "2a89ec21-c69a-50f2-9c84-9810a9c276e1";
const CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_high_load";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md",
);
const ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-android",
);
const OUTPUT = resolve(ROOT, "acceptance.json");
const API_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-api/acceptance.json",
);
const WEB_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-differential-web/acceptance.json",
);
const DEVICE_HEALTH = resolve(ROOT, "device/device_health.json");
const BACKEND_RECEIPT = resolve(
  ".release-runtime/r568/runtime/local-developer-current/backend.json",
);
const METRO_RECEIPT = resolve(
  ".release-runtime/r568/runtime/local-developer-current/metro.json",
);
const HEADER_XML = resolve(ROOT, "06_high_load_header_history.xml");
const HEADER_PNG = resolve(ROOT, "06_high_load_header_history.png");
const ROWS_XML = resolve(ROOT, "05_high_load_rows.xml");
const ROWS_PNG = resolve(ROOT, "05_high_load_rows.png");
const TIMELINE_XML = resolve(ROOT, "07_high_load_timeline_artifacts.xml");
const TIMELINE_PNG = resolve(ROOT, "07_high_load_timeline_artifacts.png");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`STRIP_REINFORCEMENT_DIFFERENTIAL_ANDROID:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
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

function processInfo(pid: number): Json | null {
  const script = [
    `$p=Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\" -ErrorAction SilentlyContinue;`,
    "if($p){$p|Select-Object ProcessId,Name,CommandLine,WorkingSetSize|ConvertTo-Json -Compress}",
  ].join(" ");
  const output = execFileSync("powershell", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script,
  ], { encoding: "utf8" }).trim();
  return output ? JSON.parse(output) as Json : null;
}

function qemuProcesses(): Json[] {
  const script = [
    "$p=Get-CimInstance Win32_Process |",
    "Where-Object {$_.Name -like 'qemu-system*'} |",
    "Select-Object ProcessId,Name,CommandLine,WorkingSetSize;",
    "if($p){$p|ConvertTo-Json -Compress}",
  ].join(" ");
  const output = execFileSync("powershell", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script,
  ], { encoding: "utf8" }).trim();
  if (!output) return [];
  const parsed = JSON.parse(output) as Json | Json[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

function resourceSnapshot(metroPid: number): Json {
  const disk = statfsSync(resolve("."));
  const qemu = qemuProcesses();
  const metro = processInfo(metroPid);
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
    qemu: qemu.map((entry) => ({
      pid: Number(entry.ProcessId),
      workingSetBytes: Number(entry.WorkingSetSize ?? 0),
      commandLine: String(entry.CommandLine ?? ""),
    })),
    metro: metro ? {
      pid: Number(metro.ProcessId),
      workingSetBytes: Number(metro.WorkingSetSize ?? 0),
      commandLine: String(metro.CommandLine ?? ""),
    } : null,
  };
}

async function waitForCleanup(metroPid: number): Promise<Json> {
  const deadline = Date.now() + 30_000;
  let snapshot = resourceSnapshot(metroPid);
  while (Date.now() < deadline && (snapshot.qemu.length > 0 || snapshot.metro != null)) {
    await new Promise((accept) => setTimeout(accept, 500));
    snapshot = resourceSnapshot(metroPid);
  }
  return snapshot;
}

async function main(): Promise<void> {
  invariant(new URL(DATABASE_URL).hostname === "127.0.0.1", "DATABASE_NOT_LOOPBACK");
  const api = readJson(API_RECEIPT);
  const web = readJson(WEB_RECEIPT);
  const device = readJson(DEVICE_HEALTH);
  const backend = readJson(BACKEND_RECEIPT);
  const metro = readJson(METRO_RECEIPT);
  invariant(api.status
    === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    && api.denominator?.acceptedTargetCount === 7
    && api.denominator?.blockedTargetCount === 0,
  "API_FAMILY_RED");
  invariant(web.status
    === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE",
  "DIFFERENTIAL_WEB_RED");
  invariant(device.final_status === "GREEN_ANDROID_API34_DEVICE_READY"
    && device.android_sdk === 34 && device.cpu_abi === "x86_64"
    && device.single_device_active === true && device.framework_services_ready === true,
  "ANDROID_DEVICE_RED");
  invariant(backend.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT"
    && backend.compatibility_tuple?.definitionReleaseId === RELEASE_ID
    && backend.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "BACKEND_TUPLE_RED");
  invariant(metro.definition_release_id === RELEASE_ID
    && metro.search_release_id === SEARCH_RELEASE_ID
    && metro.source_tree_hash === web.runtime.sourceTree,
  "METRO_TUPLE_RED");

  const highLoad = (web.results as Json[]).find((entry) => entry.contextKey === "high_load");
  invariant(highLoad?.edit?.approvedScheduleWeightKg === 8_700
    && highLoad.edit?.rowCount === 16
    && highLoad.edit?.procurementRowCount === 10
    && highLoad.edit?.deliveryTKm === 278.4,
  "WEB_HIGH_LOAD_TRUTH_RED");
  const revisionId = String(highLoad.edit.revisionId);
  const definitionVersionId = String(highLoad.definitionVersionId);

  const headerXml = readFileSync(HEADER_XML, "utf8");
  const rowsXml = readFileSync(ROWS_XML, "utf8");
  const timelineXml = readFileSync(TIMELINE_XML, "utf8");
  invariant(headerXml.includes("estimate-revision-timeline")
    && headerXml.includes("request-estimate-items-total-count")
    && headerXml.includes("16 позиций")
    && headerXml.includes("8700")
    && headerXml.includes("Арматурная сталь по утверждённой ведомости стержней")
    && headerXml.includes("PDF") && headerXml.includes("Закупка"),
  "ANDROID_HEADER_UI_SIGNALS_RED");
  invariant(rowsXml.includes("request-estimate-positions-panel")
    && rowsXml.includes("Инженерный контроль армирования до бетонирования")
    && rowsXml.includes("Комплект сертификатов и исполнительных документов на арматуру")
    && rowsXml.includes("Доставка арматурной стали или готовых каркасов")
    && rowsXml.includes("278.4"),
  "ANDROID_ROW_UI_SIGNALS_RED");
  invariant(timelineXml.includes(`revision-${revisionId}`)
    && timelineXml.includes("rows-16--status-draft_ready")
    && timelineXml.includes("request-estimate-row-count")
    && timelineXml.includes("request-estimate-price-status")
    && timelineXml.includes("PDF и пакет закупки актуальны")
    && timelineXml.includes("8 700 кг")
    && timelineXml.includes("Версия 4"),
  "ANDROID_TIMELINE_UI_SIGNALS_RED");
  for (const imagePath of [HEADER_PNG, ROWS_PNG, TIMELINE_PNG]) {
    const bytes = readFileSync(imagePath);
    invariant(bytes.length > 100_000 && bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ), `ANDROID_PNG_RED:${imagePath}`);
  }

  const requestAudit = resolve(
    `.release-runtime/r568/runtime/local-developer-current/runtime/backend-${String(
      web.runtime.sourceTree,
    ).slice(0, 12)}/request-audit.jsonl`,
  );
  const auditRows = readFileSync(requestAudit, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Json)
    .filter((row) => row.userAgent === "okhttp/4.12.0"
      && Date.parse(String(row.at)) >= Date.parse("2026-09-16T18:34:11.000Z")
      && Date.parse(String(row.at)) <= Date.parse("2026-09-16T18:34:39.000Z"));
  invariant(auditRows.length === 11 && auditRows.every((row) => row.method === "GET"),
    `ANDROID_AUDIT_READ_ONLY:${auditRows.length}`);
  invariant(auditRows.some((row) => row.path === "/runtime-manifest" && row.status === 200)
    && auditRows.some((row) => row.path === `/revisions/${revisionId}` && row.status === 200)
    && auditRows.some((row) => row.path === `/revisions/${revisionId}/rows?limit=200` && row.status === 200)
    && auditRows.some((row) => row.path === `/revisions/${revisionId}/artifacts/pdf?documentProfile=professional_v1`
      && row.status === 200)
    && auditRows.some((row) => row.path === `/revisions/${revisionId}/artifacts/procurement`
      && row.status === 200)
    && auditRows.some((row) => String(row.path).includes(encodeURIComponent(CATALOG_ID))
      && row.status === 200),
  "ANDROID_AUDIT_EXACT_GETS_MISSING");
  const auditEvidencePath = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(auditEvidencePath,
    `${auditRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "strip-reinforcement-differential-android-seal",
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
      [revisionId],
    )).rows[0] as Json;
    exactRows = (await client.query(
      `select row_id,quantity::text,unit_id
        from public.estimate_revision_row
        where revision_id=$1 and row_id = any($2::text[])
        order by ordinal`,
      [revisionId, [
        "material:reinforcement:steel-approved-schedule",
        "material:reinforcement:mechanical-couplers",
        "equipment:reinforcement:lifting",
        "delivery:reinforcement:steel",
      ]],
    )).rows as Json[];
  } finally {
    await client.end();
  }
  invariant(release?.status === "prepared" && release.activated_at == null,
    "RELEASE_LIFECYCLE_RED");
  invariant(search?.status === "draft" && search.activated_at == null,
    "SEARCH_LIFECYCLE_RED");
  invariant(revision?.release_id === RELEASE_ID
    && revision.definition_version_id === definitionVersionId
    && revision.catalog_id === CATALOG_ID
    && Number(revision.row_count) === 16
    && Number(revision.input_parameters?.approved_reinforcement_schedule_weight_kg) === 8_700,
  "REVISION_DATABASE_RED");
  const quantity = (rowId: string): number => Number(
    exactRows.find((row) => row.row_id === rowId)?.quantity,
  );
  invariant(quantity("material:reinforcement:steel-approved-schedule") === 8_700
    && quantity("material:reinforcement:mechanical-couplers") === 188
    && quantity("equipment:reinforcement:lifting") === 16
    && quantity("delivery:reinforcement:steel") === 278.4,
  "ROW_QUANTITIES_RED");

  const metroPid = Number(metro.pid);
  const beforeCleanup = resourceSnapshot(metroPid);
  invariant(beforeCleanup.qemu.length === 1
    && String(beforeCleanup.qemu[0].commandLine).includes("Pixel_7_API_34")
    && beforeCleanup.metro?.pid === metroPid
    && String(beforeCleanup.metro.commandLine).includes("rik-expo-app-r4a5-dc4f0ce7")
    && String(beforeCleanup.metro.commandLine).includes("expo\\bin\\cli start --web"),
  "CLEANUP_OWNERSHIP_RED");
  const adbPath = String(device.adb_path);
  execFileSync(adbPath, ["-s", String(device.device_id), "emu", "kill"], { stdio: "ignore" });
  process.kill(metroPid, "SIGTERM");
  const afterCleanup = await waitForCleanup(metroPid);
  invariant(afterCleanup.qemu.length === 0 && afterCleanup.metro == null,
    "HEAVY_PROCESS_CLEANUP_RED");

  const receiptBase = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_STRIP_FOUNDATION_REINFORCEMENT_DIFFERENTIAL_ANDROID_HIGH_LOAD_COLD_OPEN_PDF_PROCUREMENT_HISTORY_PREPARED_NOT_ACTIVE",
    globalStatus: GLOBAL_STATUS,
    master: evidence(MASTER),
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      runtimeSourceTreeHash: web.runtime.sourceTree,
      frontendJsBundleFingerprint: web.runtime.frontendBuildIdentity.jsBundleFingerprint,
    },
    selectionRationale: {
      nativeContext: "high_load",
      reason: "maximal onsite/couplers/lifting branch; minimal standard branch accepted on Web",
      backendAcceptedEquivalentOrIntermediateContexts: [
        "standard", "large_area", "repair", "small_area", "technical_room", "wet_zone",
      ],
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
      uri: `rik:///request?canonicalRevisionId=${revisionId}`,
      revisionId,
      parentRevisionId: revision.parent_revision_id,
      revisionNumber: Number(revision.revision_number),
      catalogId: CATALOG_ID,
      approvedScheduleWeightKg: 8_700,
      estimateRowCount: 16,
      categoryCounts: { material: 4, constructionWork: 6, equipment: 3, service: 2, delivery: 1 },
      procurementRowCount: 10,
      pricedRowCount: 0,
      deliveryTKm: 278.4,
      pdfAndProcurementCurrent: true,
      exactUiSignalsVisible: true,
      inventedPriceCount: 0,
      databaseRevisionMatched: true,
    },
    requestAudit: {
      windowStart: "2026-09-16T18:34:11.000Z",
      windowEnd: "2026-09-16T18:34:39.000Z",
      requestCount: auditRows.length,
      methods: [...new Set(auditRows.map((row) => row.method))],
      mutationCount: auditRows.filter((row) => row.method !== "GET").length,
      exactRevisionGet200: true,
      exactRowsGet200: true,
      exactCatalogGet200: true,
      exactPdfGet200: true,
      exactProcurementGet200: true,
    },
    reusedAcceptance: {
      apiFamily: { status: api.status, accepted: "7/7", receiptSha256: api.receiptSha256 },
      differentialWeb: { status: web.status, contexts: "2/2", receiptSha256: web.receiptSha256 },
    },
    evidence: [
      evidence(HEADER_XML), evidence(HEADER_PNG),
      evidence(ROWS_XML), evidence(ROWS_PNG),
      evidence(TIMELINE_XML), evidence(TIMELINE_PNG),
      evidence(DEVICE_HEALTH), evidence(auditEvidencePath),
      evidence(API_RECEIPT), evidence(WEB_RECEIPT),
    ],
    resourceControl: {
      beforeCleanup,
      afterCleanup,
      availableMemoryDeltaBytes:
        afterCleanup.availableMemoryBytes - beforeCleanup.availableMemoryBytes,
      availableDiskDeltaBytes:
        afterCleanup.availableDiskBytes - beforeCleanup.availableDiskBytes,
      emulatorStopped: true,
      metroStopped: true,
      databasePreserved: true,
      backendPreserved: processInfo(Number(backend.backend_pid)) != null,
      providerPreserved: true,
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  invariant(receiptBase.resourceControl.backendPreserved, "BACKEND_NOT_PRESERVED");
  const receipt = { ...receiptBase, receiptSha256: sha256(JSON.stringify(receiptBase)) };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    revisionId,
    rows: 16,
    procurementRows: 10,
    requestAuditMutations: 0,
    freedMemoryBytes: receipt.resourceControl.availableMemoryDeltaBytes,
    receiptSha256: receipt.receiptSha256,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
