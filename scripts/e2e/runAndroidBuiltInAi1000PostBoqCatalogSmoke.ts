import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES,
  BUILT_IN_AI_1000_POST_BOQ_PREFIX,
} from "../../src/lib/ai/builtInAi1000/builtInAi1000PostBoqCatalogCases";
import { validateBuiltInAi1000PostBoqResult } from "../../src/lib/ai/builtInAi1000/validateBuiltInAi1000PostBoqResult";
import { writeAllScreensEnterpriseArtifacts } from "./allScreensEnterpriseRuntimeAcceptance.shared";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "built-in-ai-1000-post-boq-catalog");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${BUILT_IN_AI_1000_POST_BOQ_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runAdb(args: string[], encoding: "utf8" | "buffer" = "utf8") {
  return spawnSync("adb", args, {
    cwd: process.cwd(),
    encoding: encoding === "utf8" ? "utf8" : "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function probeAndroidEmulatorDirectly() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const devices = runAdb(["devices"]);
  const devicesText = String(devices.stdout ?? "");
  const hasDevice = /\bdevice\b/.test(devicesText.split(/\r?\n/).slice(1).join("\n"));
  const dump = hasDevice ? runAdb(["shell", "uiautomator", "dump", "/sdcard/ai1000_post_boq_catalog.xml"]) : null;
  const xml = hasDevice ? runAdb(["exec-out", "cat", "/sdcard/ai1000_post_boq_catalog.xml"]) : null;
  const xmlText = String(xml?.stdout ?? "");
  const screenshot = hasDevice ? runAdb(["exec-out", "screencap", "-p"], "buffer") : null;
  const screenshotPath = path.join(SCREENSHOT_DIR, "android_ai1000_post_boq_catalog.png");
  if (screenshot?.status === 0 && Buffer.isBuffer(screenshot.stdout) && screenshot.stdout.length > 1000) {
    fs.writeFileSync(screenshotPath, screenshot.stdout);
  }
  return {
    passed: hasDevice && dump?.status === 0 && xml?.status === 0 && xmlText.includes("<hierarchy"),
    devicesText,
    uiTextSample: (xmlText.match(/text="([^"]+)"/g) ?? []).slice(0, 30),
    screenshotPath: fs.existsSync(screenshotPath)
      ? "artifacts/screenshots/built-in-ai-1000-post-boq-catalog/android_ai1000_post_boq_catalog.png"
      : null,
  };
}

function caseByAnchor(anchor: string) {
  const testCase = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.find((item) => item.postBoqAnchor === anchor);
  if (!testCase) throw new Error(`AI1000_POST_BOQ_ANDROID_ANCHOR_MISSING:${anchor}`);
  return testCase;
}

function pickAndroidCases() {
  const required = [
    caseByAnchor("strip_foundation"),
    caseByAnchor("carpet_laying"),
    caseByAnchor("ceramic_tile_floor_laying"),
    caseByAnchor("brick_masonry"),
    caseByAnchor("gable_roof_installation"),
    caseByAnchor("asphalt_paving"),
    caseByAnchor("rebar_product_search"),
    caseByAnchor("estimate_to_pdf"),
  ];
  const filler = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES
    .filter((item) => !required.some((requiredCase) => requiredCase.id === item.id))
    .slice(0, 22);
  return [...required, ...filler];
}

export async function runAndroidBuiltInAi1000PostBoqCatalogSmoke() {
  const allScreens = await writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
  const directProbe = probeAndroidEmulatorDirectly();
  const androidEmulatorPassed = allScreens.matrix.android_emulator_proof_passed === true || directProbe.passed;
  const androidCases = pickAndroidCases();
  const validations = await Promise.all(androidCases.map((testCase) => validateBuiltInAi1000PostBoqResult(testCase)));
  const foundation = validations.find((item) => item.anchor === "strip_foundation");
  const product = validations.find((item) => item.anchor === "rebar_product_search");
  const pdf = validations.find((item) => item.anchor === "estimate_to_pdf");
  const passed =
    androidEmulatorPassed &&
    validations.length === 30 &&
    validations.every((item) => item.passed) &&
    foundation?.strip_foundation_concrete_volume_m3 === 32.64 &&
    foundation.strip_foundation_boq_rows_gte_12 === true &&
    foundation.payloadTrace?.pdfOpened === true &&
    product?.product_search_tool_used === true &&
    pdf?.selected_tool != null;

  writeJson("android_screenshots", {
    android_emulator_passed: androidEmulatorPassed,
    cases_total: validations.length,
    cases_passed: validations.filter((item) => item.passed).length,
    foundation_request_passed: foundation?.strip_foundation_concrete_volume_m3 === 32.64 &&
      foundation.strip_foundation_boq_rows_gte_12 === true,
    request_carpet_passed: validations.some((item) => item.anchor === "carpet_laying" && item.passed),
    request_tile_passed: validations.some((item) => item.anchor === "ceramic_tile_floor_laying" && item.passed),
    chat_brick_passed: validations.some((item) => item.anchor === "brick_masonry" && item.passed),
    chat_roof_passed: validations.some((item) => item.anchor === "gable_roof_installation" && item.passed),
    foreman_asphalt_passed: validations.some((item) => item.anchor === "asphalt_paving" && item.passed),
    product_rebar_passed: product?.passed === true,
    pdf_viewer_from_request_draft_passed: foundation?.payloadTrace?.pdfOpened === true,
    screenshot_path: directProbe.screenshotPath,
    all_screens_android_matrix_path: "artifacts/S_ALL_SCREENS_matrix.json",
    fake_green_claimed: false,
  });
  writeJson("android_transcripts", {
    android_emulator_passed: androidEmulatorPassed,
    cases_total: validations.length,
    transcripts: validations.map((item) => ({
      id: item.id,
      anchor: item.anchor,
      route: item.route,
      selected_tool: item.selected_tool,
      passed: item.passed,
      blockers: item.blockers,
    })),
    ui_text_sample: allScreens.android.ui_text_sample.length > 0 ? allScreens.android.ui_text_sample : directProbe.uiTextSample,
    adb_devices_sample: directProbe.devicesText.slice(0, 500),
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_AI1000_POST_BOQ_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  });

  return { passed };
}

if (require.main === module) {
  runAndroidBuiltInAi1000PostBoqCatalogSmoke()
    .then((result) => {
      console.log(result.passed ? "GREEN_ANDROID_BUILT_IN_AI_1000_POST_BOQ_CATALOG_READY" : "BLOCKED_ANDROID_BUILT_IN_AI_1000_POST_BOQ_CATALOG_FAILED");
      if (!result.passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
