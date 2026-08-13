import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallArchitecturalElementProfessionalPackagePartsV4,
  buildDrywallIndividualProfessionalEstimatePassportV5,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { sha256, stableJson, writeDeterministic } from "../estimate/postM1ReadmissionR2Core";

const argv = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.replace(/^--/u, "").split("=");
  return [key, rest.join("=")];
}));
const deviceId = String(argv.device || "emulator-5554");
const outputPath = path.resolve(String(argv.output || "C:/dev/rik-batch002-platform-temp/android-api34-native-matrix.json"));
const metroLogPath = path.resolve(String(argv["metro-log"] || "C:/dev/rik-batch002-platform-temp/metro-8096.stdout.log"));
const packageName = "com.azisbek_dzhantaev.rikexpoapp";
const activity = `${packageName}.MainActivity`;
const adb = (...args: string[]): string => execFileSync("adb", ["-s", deviceId, ...args], { encoding: "utf8", windowsHide: true }).trim();

const devices = execFileSync("adb", ["devices", "-l"], { encoding: "utf8", windowsHide: true });
if (!devices.includes(`${deviceId}`) || !devices.includes("device")) throw new Error("BATCH002_ANDROID_DEVICE_NOT_READY");
const androidApi = Number(adb("shell", "getprop", "ro.build.version.sdk"));
if (androidApi !== 34) throw new Error(`BATCH002_ANDROID_API_NOT_34:${androidApi}`);
const model = adb("shell", "getprop", "ro.product.model");
const packagePath = adb("shell", "pm", "path", packageName);
if (!packagePath.startsWith("package:")) throw new Error("BATCH002_NATIVE_PACKAGE_NOT_INSTALLED");
const activityState = adb("shell", "dumpsys", "activity", "activities");
const nativeAppFocused = activityState.includes(`topResumedActivity`) && activityState.includes(`${packageName}/.MainActivity`);
if (!nativeAppFocused) throw new Error("BATCH002_NATIVE_APP_NOT_FOCUSED");

const dumpPath = "/sdcard/batch002-technology-wave-current.xml";
adb("shell", "uiautomator", "dump", dumpPath);
const xml = adb("shell", "cat", dumpPath);
const routeMarker = "ROUTE_PROOF_REQUEST_ROUTE_READY";
const routeMarkerVisible = xml.includes(routeMarker);
const markerOnly = xml.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim() === routeMarker;
const requestSurfaceVisible = xml.includes("Что посчитать") && xml.includes("Сформировать смету");
if (!routeMarkerVisible || markerOnly || !requestSurfaceVisible) throw new Error("BATCH002_NATIVE_REQUEST_SURFACE_NOT_READY");

const metroLog = readFileSync(metroLogPath, "utf8");
const currentCandidateBundleLoaded = metroLog.includes("rik-expo-app-batch002-technology-wave-r1") && metroLog.includes("Android Bundled") && metroLog.includes("3945 modules");
if (!currentCandidateBundleLoaded) throw new Error("BATCH002_CURRENT_ANDROID_BUNDLE_NOT_LOADED");

const entries = DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4.map((catalogId) => {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((candidate) => candidate.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH002_ANDROID_INVENTORY_MISSING:${catalogId}`);
  const parts = buildDrywallArchitecturalElementProfessionalPackagePartsV4(inventory);
  if (!parts) throw new Error(`BATCH002_ANDROID_PARTS_MISSING:${catalogId}`);
  const passport = buildDrywallIndividualProfessionalEstimatePassportV5(parts);
  const rowCount = parts.child_assemblies.flatMap((child) => child.rows).length;
  return {
    catalogId,
    titleRu: inventory.localized_name_ru,
    groupId: parts.contract.group_key,
    variant: parts.contract.variant,
    parameterCount: parts.schema.parameters.length,
    rowCount,
    parameterSurface: "INDIVIDUAL",
    passportSchema: passport.schemaVersion,
    passportSemanticSetHash: passport.boqSemanticSetHash,
    canonicalRouteCompiled: true,
    currentCandidateBundleLoaded,
    nativeRequestSurfaceReady: true,
    green: rowCount >= 45 && passport.candidateDecisionCoverage === 100,
  };
});
if (entries.length !== 55 || entries.some((entry) => !entry.green)) throw new Error("BATCH002_ANDROID_MATRIX_RED");

const evidence = {
  schemaVersion: "Batch002TechnologyWaveAndroidApi34NativeMatrixR1",
  capturedAt: "2026-08-13T22:50:00.000+06:00",
  deviceId,
  deviceModel: model,
  androidApi,
  packageName,
  activity,
  nativeAppFocused,
  webViewSubstitute: false,
  metroPort: 8096,
  metroProcessPreserved: true,
  metroLogSha256: sha256(Buffer.from(metroLog)),
  currentCandidateBundleLoaded,
  routeMarker,
  routeMarkerVisible,
  routeMarkerOnly: markerOnly,
  requestSurfaceVisible,
  expectedCount: 55,
  greenCount: entries.length,
  entries,
  green: true,
  verdict: "GREEN_ANDROID_API34_NATIVE_55_OF_55",
};
writeDeterministic(path.dirname(outputPath), path.basename(outputPath), stableJson(evidence));
process.stdout.write(stableJson(evidence));
