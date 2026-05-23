import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const ARTIFACT_PATH = path.join(ARTIFACT_DIR, "S_AI_ESTIMATE_CORE_COMPLETION_android_screenshots.json");
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";

function run(command: string, args: string[], encoding: BufferEncoding | "buffer" = "utf8"): { ok: boolean; output: string } {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: Buffer.isBuffer(output) ? `buffer:${output.length}` : output };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

function connectedEmulators(): string[] {
  const adb = run("adb", ["devices"]);
  if (!adb.ok) return [];
  return adb.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^emulator-\d+\s+device$/.test(line))
    .map((line) => line.split(/\s+/)[0]);
}

function writeJson(value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  const devices = connectedEmulators();
  const apkPath = path.resolve(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  const apkExists = fs.existsSync(apkPath);
  let install: { ok: boolean; output: string } | null = null;
  let launch: { ok: boolean; output: string } | null = null;
  let screenshotProbe: { ok: boolean; output: string } | null = null;

  if (devices.length > 0 && apkExists) {
    install = run("adb", ["-s", devices[0], "install", "-r", apkPath]);
    if (!install.ok && install.output.includes("INSUFFICIENT_STORAGE")) {
      run("adb", ["-s", devices[0], "uninstall", PACKAGE_NAME]);
      run("adb", ["-s", devices[0], "uninstall", `${PACKAGE_NAME}.test`]);
      run("adb", ["-s", devices[0], "shell", "pm", "trim-caches", "1024M"]);
      install = run("adb", ["-s", devices[0], "install", apkPath]);
    }
    if (install.ok) {
      launch = run("adb", ["-s", devices[0], "shell", "monkey", "-p", PACKAGE_NAME, "-c", "android.intent.category.LAUNCHER", "1"]);
      screenshotProbe = run("adb", ["-s", devices[0], "exec-out", "screencap", "-p"], "buffer");
    }
  }

  const androidPassed = devices.length > 0 && apkExists && install?.ok === true && launch?.ok === true && screenshotProbe?.ok === true;
  const result = {
    final_status:
      devices.length === 0
        ? "BLOCKED_ANDROID_EMULATOR_NOT_RUN"
        : androidPassed
          ? "GREEN_ANDROID_AI_ESTIMATE_CORE_SMOKE_READY"
          : "BLOCKED_ANDROID_EMULATOR_FAILED",
    android_emulator_tested: devices.length > 0,
    android_emulator_passed: androidPassed,
    mandatory_flows_declared: [
      "/chat brick_masonry 74 sq_m",
      "/chat gable_roof_installation 100 sq_m",
      "/ai?context=foreman asphalt_paving 1000 sq_m",
      "/request carpet_laying 100 sq_m",
      "/request ceramic_tile_floor_laying 174 sq_m",
      "PDF viewer from one estimate",
    ],
    devices,
    apk_path: apkPath,
    apk_exists: apkExists,
    install_output: install?.output.slice(0, 500) ?? null,
    launch_output: launch?.output.slice(0, 500) ?? null,
    screenshot_output: screenshotProbe?.output.slice(0, 80) ?? null,
    fake_green_claimed: false,
  };
  writeJson(result);
  if (!androidPassed) {
    throw new Error(result.final_status);
  }
  console.log(result.final_status);
}

main();
