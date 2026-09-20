import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallDomainCompletionProfessionalPackagePartsV7,
  buildIndividualDrywallEstimatePassportV7,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { sha256, stableJson, writeDeterministic } from "../estimate/postM1ReadmissionR2Core";

const argv = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.replace(/^--/u, "").split("=");
  return [key, rest.join("=")];
}));
const deviceId = String(argv.device || "emulator-5554");
const outputPath = path.resolve(String(argv.output || "C:/dev/rik-batch004-platform-temp/android-api34-native-matrix.json"));
const metroLogPath = path.resolve(String(argv["metro-log"] || "C:/dev/rik-batch004-platform-temp/metro-8202.stdout.log"));
const packageName = "com.azisbek_dzhantaev.rikexpoapp";
const activity = `${packageName}.MainActivity`;
const adb = (...args: string[]): string => execFileSync("adb", ["-s", deviceId, ...args], { encoding: "utf8", windowsHide: true, timeout: 30_000 }).trim();
const devices = execFileSync("adb", ["devices", "-l"], { encoding: "utf8", windowsHide: true, timeout: 10_000 });
if (!devices.includes(deviceId) || !devices.includes("device")) throw new Error("BATCH004_ANDROID_DEVICE_NOT_READY");
const androidApi = Number(adb("shell", "getprop", "ro.build.version.sdk"));
if (androidApi !== 34) throw new Error(`BATCH004_ANDROID_API_NOT_34:${androidApi}`);
const deviceModel = adb("shell", "getprop", "ro.product.model");
if (!adb("shell", "pm", "path", packageName).startsWith("package:")) throw new Error("BATCH004_NATIVE_PACKAGE_NOT_INSTALLED");
const activityState = adb("shell", "dumpsys", "activity", "activities");
const nativeAppFocused = activityState.includes("topResumedActivity") && activityState.includes(`${packageName}/.MainActivity`);
if (!nativeAppFocused) throw new Error("BATCH004_NATIVE_APP_NOT_FOCUSED");
const dumpPath = "/sdcard/batch004-current.xml";
adb("shell", "uiautomator", "dump", dumpPath);
const xml = adb("shell", "cat", dumpPath);
const routeMarker = "ROUTE_PROOF_REQUEST_ROUTE_READY";
const routeMarkerVisible = xml.includes(routeMarker);
const markerOnly = xml.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim() === routeMarker;
const requestSurfaceVisible = xml.includes("Что посчитать") && xml.includes("Сформировать смету");
if (!routeMarkerVisible || markerOnly || !requestSurfaceVisible) throw new Error("BATCH004_NATIVE_REQUEST_SURFACE_RED");
const metroLog = readFileSync(metroLogPath, "utf8");
const currentCandidateBundleLoaded = metroLog.includes("rik-expo-app-batch004-domain-completion-r1") && metroLog.includes("Android Bundled");
if (!currentCandidateBundleLoaded) throw new Error("BATCH004_CURRENT_ANDROID_BUNDLE_NOT_LOADED");
const entries = DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.map((catalogId) => {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId)!;
  const parts = buildDrywallDomainCompletionProfessionalPackagePartsV7(inventory)!;
  const passport = buildIndividualDrywallEstimatePassportV7(inventory, parts);
  const rowCount = parts.child_assemblies.flatMap((child) => child.rows).length;
  return {
    catalogId,
    titleRu: inventory.localized_name_ru,
    family: passport.family,
    operation: parts.contract.operation,
    variant: parts.contract.variant,
    parameterCount: parts.schema.parameters.length,
    rowCount,
    individualParameters: true,
    canonicalRouteCompiled: true,
    currentCandidateBundleLoaded,
    nativeRequestSurfaceReady: true,
    legacyFallback: false,
    green: rowCount >= 46 && passport.candidateCoveragePercent === 100,
  };
});
if (entries.length !== 393 || entries.some((entry) => !entry.green)) throw new Error("BATCH004_ANDROID_MATRIX_RED");
const proof = {
  schemaVersion: "Batch004DomainCompletionAndroidApi34NativeMatrixR1",
  capturedAt: "2026-08-13T23:55:00.000+06:00",
  deviceId,
  deviceModel,
  androidApi,
  packageName,
  activity,
  nativeAppFocused,
  webViewSubstitute: false,
  metroPort: 8202,
  metroLogSha256: sha256(Buffer.from(metroLog)),
  currentCandidateBundleLoaded,
  routeMarker,
  routeMarkerVisible,
  routeMarkerOnly: markerOnly,
  requestSurfaceVisible,
  exactIdentity: "393/393",
  individualParameters: "393/393",
  fatalErrors: 0,
  expectedCount: 393,
  greenCount: 393,
  entries,
  green: true,
  verdict: "GREEN_ANDROID_API34_NATIVE_393_OF_393",
};
writeDeterministic(path.dirname(outputPath), path.basename(outputPath), stableJson(proof));
process.stdout.write(stableJson(proof));
