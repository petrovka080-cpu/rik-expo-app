import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;
type AuditRow = { method?: string; path?: string; status?: number; userAgent?: string };

const CONTRACT = "rik-expo-app.s27-16.bridge-native-android-acceptance.v1";
const DEVICE = "emulator-5554";
const PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const RELEASE_ID = "5800af1e-fe52-58e4-8484-e8a28542f761";
const SEARCH_RELEASE_ID = "3d76d2ef-ef83-5082-a8ea-c6928e56fcee";
const REVISION_ID = "510b6294-4ebc-4c4a-bda1-2da41e613f6f";
const BACKEND_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/backend.json");
const BRIDGE_RECEIPT = resolve(".release-runtime/r568/s27-16/acceptance/bridge-backend/acceptance.json");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-16/acceptance/bridge-android");
const DEVICE_ROOT = resolve(OUTPUT_ROOT, "device");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_BRIDGE_ANDROID_SEAL:${code}`);
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

function adb(...args: string[]): string {
  return execFileSync("adb", ["-s", DEVICE, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function evidence(name: string): Json {
  const png = resolve(DEVICE_ROOT, `${name}.png`);
  const xml = resolve(DEVICE_ROOT, `${name}.xml`);
  const xmlText = readFileSync(xml, "utf8");
  invariant(statSync(png).size > 10_000 && statSync(xml).size > 500, `EVIDENCE_BYTES_RED:${name}`);
  return {
    png: png.replace(/\\/gu, "/"),
    pngBytes: statSync(png).size,
    pngSha256: sha256(readFileSync(png)),
    xml: xml.replace(/\\/gu, "/"),
    xmlBytes: statSync(xml).size,
    xmlSha256: sha256(xmlText),
    xmlText,
  };
}

function main(): void {
  const backend = json(BACKEND_RECEIPT);
  const bridge = json(BRIDGE_RECEIPT);
  invariant(backend.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT", "BACKEND_RED");
  invariant(backend.compatibility_tuple?.definitionReleaseId === RELEASE_ID
    && backend.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "RELEASE_PAIR_RED");
  invariant(bridge.status === "GREEN_S27_16_BRIDGE_BACKEND"
    && bridge.revisions?.pricedRevisionId === REVISION_ID
    && bridge.composition?.rowCount === 174
    && bridge.procurement?.rowCount === 45,
  "BRIDGE_BACKEND_RECEIPT_RED");

  invariant(adb("get-state") === "device", "EMULATOR_NOT_READY");
  const packageDump = adb("shell", "dumpsys", "package", PACKAGE);
  invariant(/versionCode=13\b/u.test(packageDump) && /versionName=1\.0\.0\b/u.test(packageDump),
    "APP_BUILD_IDENTITY_RED");

  const estimate = evidence("01-bridge-174-priced");
  const price = evidence("02-binder-material-price-5000");
  const procurement = evidence("03-bridge-procurement-45");
  const pdf = evidence("04-bridge-pdf-viewer");
  const estimateXml = String(estimate.xmlText);
  const priceXml = String(price.xmlText);
  const procurementXml = String(procurement.xmlText);
  const pdfXml = String(pdf.xmlText);
  invariant(estimateXml.includes("174")
    && /4(?:\s|\u00a0)*800/u.test(estimateXml)
    && /565[.,]44/u.test(estimateXml),
  "ESTIMATE_UI_RED");
  invariant(priceXml.includes("Смесь асфальтобетонная горячая плотная мелкозернистая")
    && priceXml.includes("нет -&gt; 5000 KGS"),
  "PRICE_HISTORY_UI_RED");
  invariant(procurementXml.includes("consumer-estimate-procurement-list")
    && procurementXml.includes("45 позиций")
    && procurementXml.includes("Смесь асфальтобетонная горячая плотная мелкозернистая")
    && procurementXml.includes("565,44 т"),
  "PROCUREMENT_UI_RED");
  invariant(pdfXml.includes("<hierarchy")
    && pdfXml.includes('package="com.google.android.apps.docs"')
    && pdf.pngSha256 !== procurement.pngSha256
    && pdf.xmlSha256 !== procurement.xmlSha256,
  "PDF_VIEWER_UI_RED");

  const sourceTree = String(backend.compatibility_tuple.sourceTree);
  const auditPath = resolve(`.release-runtime/r568/runtime/local-developer-current/runtime/backend-${sourceTree.slice(0, 12)}/request-audit.jsonl`);
  const audit = readFileSync(auditPath, "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
  const native = audit.filter((row) => String(row.userAgent ?? "").startsWith("okhttp/4.12.0")
    && String(row.path ?? "").includes(REVISION_ID));
  invariant(native.some((row) => row.method === "GET" && row.status === 200
    && row.path === `/revisions/${REVISION_ID}`)
    && native.some((row) => row.method === "GET" && row.status === 200
      && row.path === `/revisions/${REVISION_ID}/rows?limit=200`)
    && native.some((row) => row.method === "GET" && row.status === 200
      && row.path === `/revisions/${REVISION_ID}/artifacts/procurement`)
    && native.some((row) => row.method === "GET" && row.status === 200
      && row.path?.startsWith(`/revisions/${REVISION_ID}/artifacts/pdf`)),
  "OKHTTP_REVISION_OR_ARTIFACT_AUDIT_RED");

  const unsigned = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    status: "GREEN_S27_16_BRIDGE_ANDROID_NATIVE",
    capturedAt: new Date().toISOString(),
    device: DEVICE,
    package: PACKAGE,
    appVersion: "1.0.0",
    versionCode: 13,
    definitionReleaseId: RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
    revisionId: REVISION_ID,
    rowCountVisible: 174,
    areaM2Visible: 4_800,
    binderMixTVisible: 565.44,
    binderUnitPriceVisible: 5_000,
    procurement: { status: "GREEN", rowCountVisible: 45, binderMixTVisible: 565.44 },
    pdf: { status: "GREEN", viewer: "external_native_activity" },
    nativeTransportUserAgent: "okhttp/4.12.0",
    nativeAuditRowCount: native.length,
    auditPath: auditPath.replace(/\\/gu, "/"),
    evidence: {
      estimate: { ...estimate, xmlText: undefined },
      priceHistory: { ...price, xmlText: undefined },
      procurement: { ...procurement, xmlText: undefined },
      pdfViewer: { ...pdf, xmlText: undefined },
    },
    productionAccessed: false,
    activationPerformed: false,
    deployPerformed: false,
  };
  const receipt = { ...unsigned, sha256: sha256(JSON.stringify(unsigned)) };
  const output = resolve(OUTPUT_ROOT, "acceptance.json");
  atomicJson(output, receipt);
  process.stdout.write(`${JSON.stringify({ ...receipt, output }, null, 2)}\n`);
}

main();
