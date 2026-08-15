import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a2");

function read(name: string): Json {
  return JSON.parse(readFileSync(join(EVIDENCE, name), "utf8")) as Json;
}

function sha256(name: string): string {
  return createHash("sha256").update(readFileSync(join(EVIDENCE, name))).digest("hex");
}

function main(): void {
  const webName = "A2_11_WEB_MATRIX_50.json";
  const androidName = "A2_11_ANDROID_API34_MAINACTIVITY_MATRIX_50.json";
  const web = read(webName);
  const android = read(androidName);
  const webIds = new Set((web.cases ?? []).map((row: Json) => row.catalogId));
  const androidIds = new Set((android.cases ?? []).map((row: Json) => row.catalogId));
  const identityMismatch = [...webIds].filter((id) => !androidIds.has(id)).length
    + [...androidIds].filter((id) => !webIds.has(id)).length;
  const releaseMismatch = web.releaseId === android.releaseId ? 0 : 1;
  const webReachability = web.productionBundleReachability ?? {};
  const nativeReachability = android.productionBundleReachability ?? {};
  const report = {
    schemaVersion: "water-r6-a2-platform-and-bundle-ownership-proof.v1",
    generatedAt: new Date().toISOString(),
    releaseId: web.releaseId,
    source: web.source,
    web: {
      evidenceSha256: sha256(webName),
      matrix: `${web.green}/${web.expected}`,
      realBrowser: web.browser,
      FRONTEND_WATER_OWNER: webReachability.FRONTEND_WATER_OWNER,
      CLIENT_WATER_COMPILER_REACHABILITY: webReachability.CLIENT_WATER_COMPILER_REACHABILITY,
      WATER_CORPUS_IN_WEB_BUNDLE: webReachability.WATER_CORPUS_IN_WEB_BUNDLE,
    },
    android: {
      evidenceSha256: sha256(androidName),
      matrix: `${android.green}/${android.expected}`,
      component: android.device?.component,
      apiLevel: android.device?.apiLevel,
      realMainActivity: android.realMainActivity,
      webViewSubstitution: android.webViewSubstitution,
      FRONTEND_WATER_OWNER: nativeReachability.FRONTEND_WATER_OWNER,
      CLIENT_WATER_COMPILER_REACHABILITY: nativeReachability.CLIENT_WATER_COMPILER_REACHABILITY,
      WATER_CORPUS_IN_NATIVE_BUNDLE: nativeReachability.WATER_CORPUS_IN_NATIVE_BUNDLE,
    },
    identityMismatch,
    releaseMismatch,
    FRONTEND_WATER_OWNER: Number(webReachability.FRONTEND_WATER_OWNER ?? -1) + Number(nativeReachability.FRONTEND_WATER_OWNER ?? -1),
    CLIENT_WATER_COMPILER_REACHABILITY: Number(webReachability.CLIENT_WATER_COMPILER_REACHABILITY ?? -1) + Number(nativeReachability.CLIENT_WATER_COMPILER_REACHABILITY ?? -1),
    WATER_CORPUS_IN_WEB_BUNDLE: webReachability.WATER_CORPUS_IN_WEB_BUNDLE,
    WATER_CORPUS_IN_NATIVE_BUNDLE: nativeReachability.WATER_CORPUS_IN_NATIVE_BUNDLE,
    productionDeployed: false,
    batch007Started: false,
    status: "GREEN",
  };
  if (web.status !== "GREEN" || android.status !== "GREEN" || web.green !== 50 || android.green !== 50
    || webIds.size !== 50 || androidIds.size !== 50 || identityMismatch !== 0 || releaseMismatch !== 0
    || report.FRONTEND_WATER_OWNER !== 0 || report.CLIENT_WATER_COMPILER_REACHABILITY !== 0
    || report.WATER_CORPUS_IN_WEB_BUNDLE !== 0 || report.WATER_CORPUS_IN_NATIVE_BUNDLE !== 0
    || android.device?.apiLevel !== "34" || android.realMainActivity !== true || android.webViewSubstitution !== false) {
    report.status = "RED";
  }
  writeFileSync(join(EVIDENCE, "A2_11_BUNDLE_OWNERSHIP_PROOF.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report)}\n`);
  if (report.status !== "GREEN") throw new Error(`WATER_R6_A2_PLATFORM_EVIDENCE_RED:${JSON.stringify(report)}`);
}

main();
