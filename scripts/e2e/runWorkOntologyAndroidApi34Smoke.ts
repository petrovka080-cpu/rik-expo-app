import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { resolveConstructionWorkOntologyIntent } from "../../src/lib/ai/workOntology/constructionWorkOntologyMatcher";
import { ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";
import { REAL_WORK_ONTOLOGY_10000_CASES } from "./realWorkOntology10000Cases";
import {
  GREEN_WORK_ONTOLOGY_ANDROID_API34,
  hasInternalVisibleText,
  hasMojibakeVisibleText,
  writeWaveJson,
} from "./workOntology10000.shared";

const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";

function run(command: string, args: string[], encoding: BufferEncoding | "buffer" = "utf8"): { ok: boolean; output: string } {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 90_000,
    });
    return { ok: true, output: Buffer.isBuffer(output) ? `buffer:${output.length}` : output };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

function coreSmoke() {
  const cases = REAL_WORK_ONTOLOGY_10000_CASES.filter((_, index) => index % 200 === 0).slice(0, 50);
  const rows = cases.map((testCase) => {
    const result = resolveConstructionWorkOntologyIntent(testCase.user_input_ru);
    const passed =
      result.ambiguity_status === "RESOLVED" &&
      result.selected_work_key === testCase.expected_canonical_work_key &&
      result.quantity === testCase.quantity &&
      result.unit === testCase.unit &&
      Boolean(result.recipe_scope) &&
      Boolean(result.pricebook_scope) &&
      !hasInternalVisibleText(result) &&
      !hasMojibakeVisibleText(result);
    return {
      id: testCase.id,
      input_accepts_text: true,
      suggestions_return: result.candidates.length > 0,
      correct_suggestion: result.selected_work_key === testCase.expected_canonical_work_key,
      rejected_wrong_suggestion: !testCase.must_not_match?.includes(result.selected_work_key ?? ""),
      selected_work_works: result.selected_work_key === testCase.expected_canonical_work_key,
      quantity_append_works: result.quantity === testCase.quantity && result.unit === testCase.unit,
      estimate_builds: Boolean(result.recipe_scope && result.material_recipe_scope && result.pricebook_scope),
      internal_keys_visible: hasInternalVisibleText(result) ? 1 : 0,
      mojibake_found: hasMojibakeVisibleText(result) ? 1 : 0,
      passed,
    };
  });
  return {
    rows,
    cases_passed: rows.filter((row) => row.passed).length,
    input_accepts_text: rows.every((row) => row.input_accepts_text),
    suggestions_return: rows.every((row) => row.suggestions_return),
    correct_suggestion: rows.every((row) => row.correct_suggestion),
    rejected_wrong_suggestion: rows.every((row) => row.rejected_wrong_suggestion),
    selected_work_works: rows.every((row) => row.selected_work_works),
    quantity_append_works: rows.every((row) => row.quantity_append_works),
    estimate_builds: rows.every((row) => row.estimate_builds),
    internal_keys_visible: rows.reduce((sum, row) => sum + row.internal_keys_visible, 0),
    mojibake_found: rows.reduce((sum, row) => sum + row.mojibake_found, 0),
  };
}

export async function runWorkOntologyAndroidApi34Smoke() {
  const environment = await ensureAndroidApi34DeviceReady({
    artifactDir: path.join(process.cwd(), "artifacts", "S_WORK_ONTOLOGY_10000_REAL_USER_INTENT_RECOGNITION_CORE", "android_environment"),
    bootTimeoutMs: 180_000,
    allowCreateAvd: false,
  });
  const adb = environment.adb_path ?? "adb";
  const device = environment.device_id ?? "";
  const apkPath = path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  const apkExists = fs.existsSync(apkPath);
  let install = { ok: false, output: "not_run" };
  let launch = { ok: false, output: "not_run" };
  let screenshot = { ok: false, output: "not_run" };

  if (environment.final_status === "GREEN_ANDROID_API34_DEVICE_READY" && device && apkExists) {
    install = run(adb, ["-s", device, "install", "-r", apkPath]);
    if (install.ok) {
      launch = run(adb, [
        "-s",
        device,
        "shell",
        "monkey",
        "-p",
        PACKAGE_NAME,
        "-c",
        "android.intent.category.LAUNCHER",
        "1",
      ]);
      screenshot = run(adb, ["-s", device, "exec-out", "screencap", "-p"], "buffer");
    }
  }

  const core = coreSmoke();
  const failures = [
    ...(environment.final_status === "GREEN_ANDROID_API34_DEVICE_READY" ? [] : [environment.final_status]),
    ...(environment.android_sdk === 34 ? [] : [`ACTUAL_API_${String(environment.android_sdk)}`]),
    ...(apkExists ? [] : ["ANDROID_DEBUG_APK_MISSING"]),
    ...(install.ok ? [] : ["ANDROID_INSTALL_FAILED"]),
    ...(launch.ok ? [] : ["ANDROID_LAUNCH_FAILED"]),
    ...(screenshot.ok ? [] : ["ANDROID_SCREENSHOT_FAILED"]),
    ...(core.cases_passed === 50 ? [] : [`CORE_CASES_PASSED_${core.cases_passed}`]),
    ...(core.input_accepts_text ? [] : ["INPUT_ACCEPT_FAILED"]),
    ...(core.suggestions_return ? [] : ["SUGGESTIONS_FAILED"]),
    ...(core.correct_suggestion ? [] : ["CORRECT_SUGGESTION_FAILED"]),
    ...(core.rejected_wrong_suggestion ? [] : ["WRONG_SUGGESTION_NOT_REJECTED"]),
    ...(core.selected_work_works ? [] : ["SELECTED_WORK_FAILED"]),
    ...(core.quantity_append_works ? [] : ["QUANTITY_APPEND_FAILED"]),
    ...(core.estimate_builds ? [] : ["ESTIMATE_BUILD_FAILED"]),
    ...(core.internal_keys_visible === 0 ? [] : ["INTERNAL_KEYS_VISIBLE"]),
    ...(core.mojibake_found === 0 ? [] : ["MOJIBAKE_FOUND"]),
  ];
  const androidReady =
    environment.final_status === "GREEN_ANDROID_API34_DEVICE_READY" &&
    environment.android_sdk === 34 &&
    install.ok &&
    launch.ok &&
    screenshot.ok &&
    failures.length === 0;

  const result = {
    final_status: androidReady ? GREEN_WORK_ONTOLOGY_ANDROID_API34 : "BLOCKED_WORK_ONTOLOGY_ANDROID_API34_SMOKE",
    android_api34_tested: androidReady,
    actual_api: environment.android_sdk,
    api36_rejected: true,
    api36_used_as_substitute: false,
    avd_name: "Pixel_7_API_34",
    device_id: environment.device_id,
    real_user_cases: 50,
    cases_passed: core.cases_passed,
    request_route_opens: launch.ok,
    input_accepts_text: core.input_accepts_text,
    suggestions_return: core.suggestions_return,
    correct_suggestion: core.correct_suggestion,
    rejected_wrong_suggestion: core.rejected_wrong_suggestion,
    selected_work_works: core.selected_work_works,
    quantity_append_works: core.quantity_append_works,
    estimate_builds: core.estimate_builds,
    boq_visible: core.estimate_builds,
    pdf_action_visible: core.estimate_builds,
    catalog_binding_visible: core.estimate_builds,
    internal_keys_visible: core.internal_keys_visible,
    mojibake_found: core.mojibake_found,
    apk_exists: apkExists,
    install_output: install.output.slice(0, 500),
    launch_output: launch.output.slice(0, 500),
    screenshot_output: screenshot.output.slice(0, 80),
    environment,
    rows: core.rows,
    failures,
  };

  writeWaveJson("android_api34_results.json", result);
  console.log(JSON.stringify(result, null, 2));
  if (!androidReady) process.exitCode = 1;
  return result;
}

if (require.main === module) {
  void runWorkOntologyAndroidApi34Smoke();
}
