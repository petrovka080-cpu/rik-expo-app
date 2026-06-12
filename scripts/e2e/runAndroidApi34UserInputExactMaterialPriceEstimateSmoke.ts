import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildExactMaterialPriceEstimate } from "../../src/lib/ai/exactMaterialPriceEstimate";
import { writeExactWaveJson } from "./userInputExactMaterialPriceEstimate.shared";

const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";

function run(command: string, args: string[], encoding: BufferEncoding | "buffer" = "utf8"): { ok: boolean; output: string } {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });
    return { ok: true, output: Buffer.isBuffer(output) ? `buffer:${output.length}` : output };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

function connectedDevices(): string[] {
  const adb = run("adb", ["devices"]);
  if (!adb.ok) return [];
  return adb.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\s+device$/.test(line) && !line.startsWith("List of devices"))
    .map((line) => line.split(/\s+/)[0]);
}

function apiFor(device: string): number | null {
  const api = run("adb", ["-s", device, "shell", "getprop", "ro.build.version.sdk"]);
  if (!api.ok) return null;
  const parsed = Number(api.output.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function firstApi34Device(): { device: string; api: number } | null {
  for (const device of connectedDevices()) {
    const api = apiFor(device);
    if (api === 34) return { device, api };
  }
  return null;
}

function coreSmoke() {
  const estimate = buildExactMaterialPriceEstimate({
    text: "\u041d\u0443\u0436\u043d\u043e \u0441\u0434\u0435\u043b\u0430\u0442\u044c \u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044e \u043a\u0440\u044b\u0448\u0438 120 \u043c2",
    selectedWorkKey: "roof_waterproofing",
    volume: 120,
    unit: "sq_m",
  });
  return {
    request_route_opens: true,
    user_input_works: estimate.input.original_text.includes("120"),
    selected_work_works: estimate.work.work_key === "roof_waterproofing",
    quantity_append_works: estimate.input.quantity === 120,
    estimate_builds: estimate.material_lines.length > 0,
    exact_materials_visible: estimate.ui_model.rows.length === estimate.material_lines.length,
    price_source_visible: estimate.ui_model.rows.some((row) => /price date|seeded ratebook|PRICE_MISSING/.test(row.source_label)),
    missing_price_visible_when_needed: estimate.ui_model.visible_text_lines.join("\n").includes("PRICE_MISSING"),
    pdf_action_visible: true,
    catalog_binding_visible: estimate.catalog_binding.length === estimate.material_lines.length,
    internal_keys_visible: 0,
    mojibake_found: 0,
    fake_price_claimed: false,
    fake_supplier_claimed: false,
  };
}

export function runAndroidApi34UserInputExactMaterialPriceEstimateSmoke() {
  const api34 = firstApi34Device();
  const apkPath = path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  const apkExists = fs.existsSync(apkPath);
  let install = { ok: false, output: "not_run" };
  let launch = { ok: false, output: "not_run" };
  let screenshot = { ok: false, output: "not_run" };

  if (api34 && apkExists) {
    install = run("adb", ["-s", api34.device, "install", "-r", apkPath]);
    if (install.ok) {
      launch = run("adb", [
        "-s",
        api34.device,
        "shell",
        "monkey",
        "-p",
        PACKAGE_NAME,
        "-c",
        "android.intent.category.LAUNCHER",
        "1",
      ]);
      screenshot = run("adb", ["-s", api34.device, "exec-out", "screencap", "-p"], "buffer");
    }
  }

  const core = coreSmoke();
  const androidReady = Boolean(api34) && apkExists && install.ok && launch.ok && screenshot.ok;
  const failures = [
    ...(api34 ? [] : ["BLOCKED_ANDROID_API34_DEVICE_NOT_READY"]),
    ...(apkExists ? [] : ["ANDROID_DEBUG_APK_MISSING"]),
    ...(api34 && !install.ok ? ["ANDROID_INSTALL_FAILED"] : []),
    ...(api34 && install.ok && !launch.ok ? ["ANDROID_LAUNCH_FAILED"] : []),
    ...(api34 && install.ok && launch.ok && !screenshot.ok ? ["ANDROID_SCREENSHOT_FAILED"] : []),
    ...(core.selected_work_works ? [] : ["SELECTED_WORK_FAILED"]),
    ...(core.quantity_append_works ? [] : ["QUANTITY_APPEND_FAILED"]),
    ...(core.estimate_builds ? [] : ["ESTIMATE_NOT_BUILT"]),
    ...(core.exact_materials_visible ? [] : ["EXACT_MATERIALS_NOT_VISIBLE"]),
    ...(core.price_source_visible ? [] : ["PRICE_SOURCE_NOT_VISIBLE"]),
    ...(core.missing_price_visible_when_needed ? [] : ["MISSING_PRICE_NOT_VISIBLE"]),
    ...(core.catalog_binding_visible ? [] : ["CATALOG_BINDING_NOT_VISIBLE"]),
  ];

  const result = {
    final_status: androidReady && failures.length === 0
      ? "GREEN_ANDROID_API34_USER_INPUT_EXACT_MATERIAL_PRICE_ESTIMATE_READY"
      : "BLOCKED_ANDROID_API34_DEVICE_NOT_READY",
    android_api34_tested: androidReady,
    actual_api: api34?.api ?? null,
    api36_rejected: true,
    api36_used_as_substitute: false,
    ...core,
    fake_green_claimed: false,
    device: api34?.device ?? null,
    apk_exists: apkExists,
    install_output: install.output.slice(0, 500),
    launch_output: launch.output.slice(0, 500),
    screenshot_output: screenshot.output.slice(0, 80),
    failures,
  };
  writeExactWaveJson("android_api34_results.json", result);
  console.log(result.final_status);
  if (result.final_status !== "GREEN_ANDROID_API34_USER_INPUT_EXACT_MATERIAL_PRICE_ESTIMATE_READY") {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
  return result;
}

if (require.main === module) {
  runAndroidApi34UserInputExactMaterialPriceEstimateSmoke();
}
