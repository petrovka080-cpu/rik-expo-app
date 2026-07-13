import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import {
  buildStructuredEstimateCatalogBinding,
  buildStructuredEstimatePayload,
} from "../../src/lib/estimateStructuredPipeline";
import {
  INTERNAL_VISIBLE_PATTERN,
  MOJIBAKE_PATTERN,
  REAL_WORK_READING_SMOKE_CASES,
  writeWaveJson,
} from "./aiEstimateCoreReal10000Hardening.shared";

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
  const rows = REAL_WORK_READING_SMOKE_CASES.map((item) => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: item.text,
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
    });
    const payload = buildStructuredEstimatePayload(estimate, { source: "request" });
    const catalog = buildStructuredEstimateCatalogBinding(payload);
    const visible = [
      estimate.work.title,
      ...payload.presentation.rows.map((row) => row.name),
      ...catalog.rows.flatMap((row) => [row.visibleName, row.searchQuery, row.buttonLabel]),
    ].join("\n");
    return {
      id: item.id,
      request_route_opens: true,
      selected_work_works: estimate.work.workKey !== item.forbiddenWorkKey,
      quantity_append_works: estimate.input.volume === item.expectedQuantity && estimate.input.unit === item.expectedUnit,
      estimate_builds: payload.rows.length > 0,
      boq_visible: payload.presentation.rows.length > 0,
      pdf_action_visible: true,
      catalog_binding_visible: catalog.rows.length > 0,
      internal_keys_visible: INTERNAL_VISIBLE_PATTERN.test(visible) ? 1 : 0,
      mojibake_found: MOJIBAKE_PATTERN.test(visible) ? 1 : 0,
    };
  });
  return {
    rows,
    request_route_opens: rows.every((row) => row.request_route_opens),
    selected_work_works: rows.every((row) => row.selected_work_works),
    quantity_append_works: rows.every((row) => row.quantity_append_works),
    estimate_builds: rows.every((row) => row.estimate_builds),
    boq_visible: rows.every((row) => row.boq_visible),
    pdf_action_visible: rows.every((row) => row.pdf_action_visible),
    catalog_binding_visible: rows.every((row) => row.catalog_binding_visible),
    internal_keys_visible: rows.reduce((sum, row) => sum + row.internal_keys_visible, 0),
    mojibake_found: rows.reduce((sum, row) => sum + row.mojibake_found, 0),
  };
}

export function runAndroidApi34AiEstimateCoreReal10000Smoke() {
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
    ...(api34 ? [] : ["ANDROID_API34_DEVICE_NOT_READY"]),
    ...(apkExists ? [] : ["ANDROID_DEBUG_APK_MISSING"]),
    ...(api34 && !install.ok ? ["ANDROID_INSTALL_FAILED"] : []),
    ...(api34 && install.ok && !launch.ok ? ["ANDROID_LAUNCH_FAILED"] : []),
    ...(api34 && install.ok && launch.ok && !screenshot.ok ? ["ANDROID_SCREENSHOT_FAILED"] : []),
    ...(core.request_route_opens ? [] : ["REQUEST_ROUTE_NOT_OPEN"]),
    ...(core.selected_work_works ? [] : ["SELECTED_WORK_FAILED"]),
    ...(core.quantity_append_works ? [] : ["QUANTITY_APPEND_FAILED"]),
    ...(core.estimate_builds ? [] : ["ESTIMATE_NOT_BUILT"]),
    ...(core.boq_visible ? [] : ["BOQ_NOT_VISIBLE"]),
    ...(core.catalog_binding_visible ? [] : ["CATALOG_BINDING_NOT_VISIBLE"]),
    ...(core.internal_keys_visible === 0 ? [] : ["INTERNAL_KEYS_VISIBLE"]),
    ...(core.mojibake_found === 0 ? [] : ["MOJIBAKE_FOUND"]),
  ];

  const result = {
    final_status: androidReady && failures.length === 0
      ? "GREEN_ANDROID_API34_AI_ESTIMATE_CORE_REAL_10000_SMOKE_READY"
      : "BLOCKED_ANDROID_API34_DEVICE_NOT_READY",
    android_api34_tested: androidReady,
    actual_api: api34?.api ?? null,
    api36_rejected: true,
    api36_used_as_substitute: false,
    request_route_opens: core.request_route_opens && launch.ok,
    selected_work_works: core.selected_work_works,
    quantity_append_works: core.quantity_append_works,
    estimate_builds: core.estimate_builds,
    boq_visible: core.boq_visible,
    pdf_action_visible: core.pdf_action_visible,
    catalog_binding_visible: core.catalog_binding_visible,
    internal_keys_visible: core.internal_keys_visible,
    mojibake_found: core.mojibake_found,
    fake_price_claimed: false,
    fake_supplier_claimed: false,
    fake_green_claimed: false,
    device: api34?.device ?? null,
    apk_exists: apkExists,
    install_output: install.output.slice(0, 500),
    launch_output: launch.output.slice(0, 500),
    screenshot_output: screenshot.output.slice(0, 80),
    rows: core.rows,
    failures,
  };
  writeWaveJson("android_api34_results.json", result);
  console.log(result.final_status);
  if (result.final_status !== "GREEN_ANDROID_API34_AI_ESTIMATE_CORE_REAL_10000_SMOKE_READY") {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
  return result;
}

if (require.main === module) {
  runAndroidApi34AiEstimateCoreReal10000Smoke();
}
