import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;
type AuditRow = {
  method?: string;
  path?: string;
  status?: number;
  userAgent?: string;
};

const CONTRACT = "rik-expo-app.s27-16.two-examples-android-acceptance.v1";
const DEVICE = "emulator-5554";
const PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const RELEASE_ID = "5800af1e-fe52-58e4-8484-e8a28542f761";
const SEARCH_RELEASE_ID = "3d76d2ef-ef83-5082-a8ea-c6928e56fcee";
const ASPHALT_REVISION = "f12c3d4d-67f4-430a-a8e8-ed471897731b";
const SLAB_REVISION = "cd9dcaf8-3484-4e85-92df-7c0cff3b77a9";
const ROOT = resolve(".release-runtime/r568/s27-16/acceptance");
const OUTPUT_ROOT = resolve(ROOT, "two-examples-android");
const BACKEND_RECEIPT = resolve(
  ".release-runtime/r568/runtime/local-developer-current/backend.json",
);
const AUDIT = resolve(
  ".release-runtime/r568/runtime/local-developer-current/runtime/backend-78f4df00b367/request-audit.jsonl",
);
const ASPHALT_XML = resolve(ROOT, "asphalt-android-100mm.xml");
const ASPHALT_SCREENSHOT = resolve(ROOT, "asphalt-android-100mm.png");
const SLAB_XML = resolve(ROOT, "slab-android.xml");
const SLAB_SCREENSHOT = resolve(ROOT, "slab-android.png");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_TWO_EXAMPLES_ANDROID:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function json(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function deviceOutput(...args: string[]): string {
  return execFileSync("adb", ["-s", DEVICE, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function auditRows(): AuditRow[] {
  return readFileSync(AUDIT, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

function nativeRevisionReads(rows: readonly AuditRow[], revisionId: string): AuditRow[] {
  return rows.filter((row) => row.status === 200
    && row.userAgent === "okhttp/4.12.0"
    && [
      `/revisions/${revisionId}`,
      `/revisions/${revisionId}/rows?limit=200`,
    ].some((suffix) => String(row.path ?? "").endsWith(suffix)));
}

function main(): void {
  const backend = json(BACKEND_RECEIPT);
  invariant(backend.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
    "BACKEND_RED");
  invariant(backend.compatibility_tuple?.definitionReleaseId === RELEASE_ID
    && backend.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "RELEASE_PAIR_RED");
  invariant(deviceOutput("get-state") === "device", "EMULATOR_NOT_READY");
  const packageDump = deviceOutput("shell", "dumpsys", "package", PACKAGE);
  invariant(/versionCode=13\b/u.test(packageDump) && /versionName=1\.0\.0\b/u.test(packageDump),
    "APP_BUILD_IDENTITY_RED");

  const asphaltXml = readFileSync(ASPHALT_XML, "utf8");
  const slabXml = readFileSync(SLAB_XML, "utf8");
  invariant(asphaltXml.includes("Выравнивание асфальтового покрытия на малой площади 100 м² толщиной 100 мм")
    && asphaltXml.includes("57 позиций")
    && asphaltXml.includes("Геометрический объём уплотнённого асфальтобетонного покрытия — 10 m3"),
  "ASPHALT_NATIVE_UI_RED");
  invariant(slabXml.includes("20 позиций")
    && slabXml.includes("Товарный бетон — B25 W6 F150 P4 по проекту · 31.2 м³")
    && slabXml.includes("Цены: 0/12 стоимостных строк имеют цену · 12 нужно заполнить"),
  "SLAB_NATIVE_UI_RED");

  const audit = auditRows();
  const asphaltReads = nativeRevisionReads(audit, ASPHALT_REVISION);
  const slabReads = nativeRevisionReads(audit, SLAB_REVISION);
  invariant(asphaltReads.some((row) => row.path?.endsWith("/rows?limit=200")),
    "ASPHALT_OKHTTP_ROWS_MISSING");
  invariant(slabReads.some((row) => row.path?.endsWith("/rows?limit=200")),
    "SLAB_OKHTTP_ROWS_MISSING");

  const receipt = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    status: "GREEN_S27_16_TWO_EXAMPLES_ANDROID_NATIVE",
    capturedAt: new Date().toISOString(),
    device: DEVICE,
    package: PACKAGE,
    appVersion: "1.0.0",
    versionCode: 13,
    definitionReleaseId: RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
    asphalt: {
      revisionId: ASPHALT_REVISION,
      rowCountVisible: 57,
      geometricVolumeM3Visible: 10,
      xmlSha256: sha256(readFileSync(ASPHALT_XML)),
      screenshotSha256: sha256(readFileSync(ASPHALT_SCREENSHOT)),
      nativeBackendReadCount: asphaltReads.length,
    },
    slab: {
      revisionId: SLAB_REVISION,
      rowCountVisible: 20,
      concreteM3Visible: 31.2,
      honestUnknownPriceStatusVisible: true,
      xmlSha256: sha256(readFileSync(SLAB_XML)),
      screenshotSha256: sha256(readFileSync(SLAB_SCREENSHOT)),
      nativeBackendReadCount: slabReads.length,
    },
    nativeTransportUserAgent: "okhttp/4.12.0",
    productionAccessed: false,
    activationPerformed: false,
    deployPerformed: false,
  };
  const sealed = { ...receipt, sha256: sha256(JSON.stringify(receipt)) };
  const output = resolve(OUTPUT_ROOT, "acceptance.json");
  atomicJson(output, sealed);
  process.stdout.write(`${JSON.stringify({ ...sealed, output }, null, 2)}\n`);
}

main();
