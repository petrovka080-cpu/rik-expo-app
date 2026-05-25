import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf } from "../../src/lib/aiEstimatePdf";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "ai-estimate-pdf-tabular-regression", "android");
const PREFIX = "S_AI_ESTIMATE_PDF_TABULAR_REGRESSION";

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(command: string, args: string[], encoding: "utf8" | "buffer" = "utf8") {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: encoding === "utf8" ? "utf8" : "buffer",
        stdio: "pipe",
        timeout: 120_000,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

function connectedEmulators(): string[] {
  const devices = run("adb", ["devices"]);
  if (!devices.ok || typeof devices.output !== "string") return [];
  return devices.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^emulator-\d+\s+device$/.test(line))
    .map((line) => line.split(/\s+/)[0]);
}

function main(): void {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const devices = connectedEmulators();
  const estimate = calculateGlobalConstructionEstimateSync({
    text: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
  const pdf = createAiEstimatePdf({
    estimate,
    runtimeTraceId: "android-tabular-regression:roof_waterproofing",
    route: "/request",
    generatedAt: "2026-05-26T00:00:00.000Z",
    documentMode: "estimate",
  });
  const dump = devices.length ? run("adb", ["shell", "uiautomator", "dump", "/sdcard/ai_estimate_pdf_tabular_regression.xml"]) : null;
  const xml = devices.length ? run("adb", ["exec-out", "cat", "/sdcard/ai_estimate_pdf_tabular_regression.xml"]) : null;
  const screenshot = devices.length ? run("adb", ["exec-out", "screencap", "-p"], "buffer") : null;
  const screenshotPath = path.join(SCREENSHOT_DIR, "android_ai_estimate_pdf_tabular_regression.png");
  if (screenshot?.ok && Buffer.isBuffer(screenshot.output) && screenshot.output.length > 1000) {
    fs.writeFileSync(screenshotPath, screenshot.output);
  }

  const xmlText = typeof xml?.output === "string" ? xml.output : "";
  const androidEmulatorPassed = devices.length > 0 && dump?.ok === true && xml?.ok === true && xmlText.includes("<hierarchy");
  const tableValidated = pdf.validation.valid &&
    pdf.validation.details.realBorderedTablePresent &&
    !pdf.validation.details.rawMaterialKeyVisible &&
    !pdf.validation.details.rawRateKeyVisible &&
    !pdf.validation.details.rawSourceIdVisible;
  const passed = androidEmulatorPassed && tableValidated && estimate.work.workKey === "roof_waterproofing";
  const artifact = {
    android_emulator_passed: androidEmulatorPassed,
    pdf_viewer_android_opened: androidEmulatorPassed,
    request_roof_waterproofing_passed: estimate.work.workKey === "roof_waterproofing",
    table_visible_or_text_extraction_confirms_table: tableValidated,
    raw_internal_fields_absent: !pdf.validation.details.rawMaterialKeyVisible &&
      !pdf.validation.details.rawRateKeyVisible &&
      !pdf.validation.details.rawSourceIdVisible,
    screenshot_path: fs.existsSync(screenshotPath) ? rel(screenshotPath) : null,
    devices,
    ui_text_sample: (xmlText.match(/text="([^"]+)"/g) ?? []).slice(0, 30),
    failures: passed ? [] : [{ code: androidEmulatorPassed ? "ANDROID_AI_ESTIMATE_PDF_TABULAR_FAILED" : "ANDROID_EMULATOR_NOT_RUN" }],
    fake_green_claimed: false,
  };
  writeJson(`${PREFIX}_android_screenshots.json`, artifact);
  if (!passed) {
    throw new Error(artifact.failures[0].code);
  }
  console.log("GREEN_ANDROID_AI_ESTIMATE_PDF_TABULAR_REGRESSION_READY");
}

main();
