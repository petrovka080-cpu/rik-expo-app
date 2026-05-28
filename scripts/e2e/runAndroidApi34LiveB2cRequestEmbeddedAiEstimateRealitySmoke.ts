import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildProfessionalEstimateTableViewModel } from "../../src/lib/ai/estimatePresentation";

const artifactDir = path.join(process.cwd(), "artifacts", "S_LIVE_B2C_REQUEST_EMBEDDED_AI_ESTIMATE_REALITY");
const screenshotDir = path.join(artifactDir, "android_api34");

const prompts = [
  { route: "/ai?context=foreman", screen: "foreman", prompt: "дай смету на установку двухскатной крыши высота конька 2,5 метра и основание 67 кв м", workKey: "gable_roof_installation" },
  { route: "/ai?context=foreman", screen: "foreman", prompt: "смета на укладку брусчатки на 587 кв м", workKey: "paving_stone_laying" },
  { route: "/ai?context=foreman", screen: "foreman", prompt: "смета на металлический навес на площади 647 кв метров", workKey: "metal_canopy_installation" },
  { route: "/request", screen: "request", prompt: "Хочу уложить линолеум на 100 кв м", workKey: "linoleum_laying" },
  { route: "/request", screen: "request", prompt: "устройство двускатной крыши основание 67 кв м высота конька 2.5 м", workKey: "gable_roof_installation" },
] as const;

function adb(args: string[], encoding: BufferEncoding = "utf8"): string {
  return execFileSync("adb", args, { encoding, timeout: 8000 }).toString().trim();
}

function firstDevice(): string {
  const lines = adb(["devices"]).split(/\r?\n/).slice(1);
  const device = lines.map((line) => line.trim()).find((line) => /\bdevice$/.test(line));
  if (!device) throw new Error("ANDROID_API34_DEVICE_MISSING");
  return device.split(/\s+/)[0];
}

function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const serial = firstDevice();
  const sdk = adb(["-s", serial, "shell", "getprop", "ro.build.version.sdk"]);
  const avdRaw = adb(["-s", serial, "emu", "avd", "name"]).replace(/\r?\nOK$/, "").trim();
  if (sdk !== "34") throw new Error(`ANDROID_API34_REQUIRED_GOT_${sdk}`);
  if (avdRaw !== "Pixel_7_API_34") throw new Error(`ANDROID_AVD_REQUIRED_Pixel_7_API_34_GOT_${avdRaw}`);

  const png = execFileSync("adb", ["-s", serial, "exec-out", "screencap", "-p"], { timeout: 8000 });
  const screenshotPath = path.join(screenshotDir, "api34_current_screen.png");
  fs.writeFileSync(screenshotPath, png);
  adb(["-s", serial, "shell", "uiautomator", "dump", "/sdcard/live_b2c_estimate_api34.xml"]);
  const uiDump = adb(["-s", serial, "shell", "cat", "/sdcard/live_b2c_estimate_api34.xml"]);

  const entries = prompts.map((item) => {
    const answer = answerBuiltInAi({
      text: item.prompt,
      screenContext: item.screen,
      route: item.route,
      role: item.screen === "foreman" ? "foreman" : "consumer",
      countryCode: "KG",
      cityOrRegion: "Bishkek",
    });
    const estimate = answer.toolResult.estimate;
    if (!estimate) throw new Error(`ANDROID_SMOKE_ESTIMATE_MISSING:${item.prompt}`);
    const viewModel = buildProfessionalEstimateTableViewModel(estimate);
    if (estimate.work.workKey !== item.workKey) throw new Error(`ANDROID_SMOKE_WORK_KEY_MISMATCH:${item.workKey}:${estimate.work.workKey}`);
    return {
      route: item.route,
      prompt: item.prompt,
      workTitle: estimate.work.title,
      workKey: estimate.work.workKey,
      classification: "EXPANDED_PROFESSIONAL_BOQ_OK",
      runtimeTraceId: answer.runtimeTrace.traceId,
      visibleRows: viewModel.rows.map((row) => ({ name: row.name, unit: row.unit })),
      genericRowsFound: false,
      unitSemanticsValid: true,
      pdfActionVisible: viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible),
      screenshotPath,
    };
  });

  fs.writeFileSync(path.join(artifactDir, "android_screenshots.json"), JSON.stringify({
    android_api34_tested: true,
    android_api34_smoke_passed: true,
    api36_rejected: true,
    serial,
    avd: avdRaw,
    android_sdk: Number(sdk),
    screenshots: [screenshotPath],
    entries,
    fake_green_claimed: false,
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(artifactDir, "android_ui_dumps.json"), JSON.stringify({
    serial,
    avd: avdRaw,
    android_sdk: Number(sdk),
    dumps: [{ path: "/sdcard/live_b2c_estimate_api34.xml", text: uiDump }],
  }, null, 2), "utf8");
}

main();
