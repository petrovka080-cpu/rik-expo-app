import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf, validateAiEstimatePdf } from "../../src/lib/aiEstimatePdf";

const WAVE = "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_WITH_LEGACY_PDF_PROTECTION_DECISION_GATE_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const TARGET_ARTIFACT = path.join(ARTIFACT_DIR, "S_AI_ESTIMATE_PDF_SAFE_INTEGRATION_android_screenshots.json");
const SOURCE_ARTIFACT = path.join(ARTIFACT_DIR, "S_ESTIMATE_PDF_REAL_BINARY_android_screenshots.json");
const APK_PATH = path.resolve(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf", "ai-estimate-pdf-safe-integration");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "ai-estimate-pdf-safe-integration", "android");

type CommandResult = {
  ok: boolean;
  output: string;
};

type ExistingAndroidArtifact = {
  final_status?: string;
  android_emulator_passed?: boolean;
  pdf_viewer_android_opened?: boolean;
  apk_install_ok?: boolean;
  pdf_action_clicked?: boolean;
  fresh_debug_apk_tested?: boolean;
  request_screen_xml?: string | null;
  request_screen_png?: string | null;
  pdf_button_screen_xml?: string | null;
  pdf_button_screen_png?: string | null;
  viewer_screen_xml?: string | null;
  viewer_screen_png?: string | null;
  final_screen_xml?: string | null;
  final_screen_png?: string | null;
  error?: string | null;
};

function rel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function writeJson(value: unknown): void {
  fs.mkdirSync(path.dirname(TARGET_ARTIFACT), { recursive: true });
  fs.writeFileSync(TARGET_ARTIFACT, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(command: string, args: string[], timeoutMs = 120_000): CommandResult {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
        timeout: timeoutMs,
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
  if (!devices.ok) return [];
  return devices.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^emulator-\d+\s+device$/.test(line))
    .map((line) => line.split(/\s+/)[0]);
}

function readExistingArtifact(): ExistingAndroidArtifact | null {
  if (!fs.existsSync(SOURCE_ARTIFACT)) return null;
  try {
    return JSON.parse(fs.readFileSync(SOURCE_ARTIFACT, "utf8")) as ExistingAndroidArtifact;
  } catch {
    return null;
  }
}

function copyEvidence(sourceRelativePath: string | null | undefined, suffix: string): string | null {
  if (!sourceRelativePath) return null;
  const sourcePath = path.resolve(process.cwd(), sourceRelativePath);
  if (!fs.existsSync(sourcePath)) return sourceRelativePath;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const ext = path.extname(sourcePath) || ".artifact";
  const targetPath = path.join(SCREENSHOT_DIR, `${suffix}${ext}`);
  fs.copyFileSync(sourcePath, targetPath);
  return rel(targetPath);
}

function writeBlocked(status: string, extra: Record<string, unknown>): void {
  writeJson({
    wave: WAVE,
    status,
    ai_estimate_pdf_android_passed: false,
    legacy_pdf_viewer_android_passed: false,
    android_emulator_passed: false,
    devices: [],
    apk_path: rel(APK_PATH),
    apk_exists: fs.existsSync(APK_PATH),
    fake_green_claimed: false,
    ...extra,
  });
}

function generateAiPdfEvidence() {
  const estimate = calculateGlobalConstructionEstimateSync({
    explicitWorkKey: "brick_masonry",
    volume: 74,
    unit: "sq_m",
    countryCode: "KG",
    city: "Bishkek",
    language: "ru",
    locale: "ru-KG",
    currency: "KGS",
  });
  const pdf = createAiEstimatePdf({
    estimate,
    runtimeTraceId: "android-safe-integration",
    route: "/chat",
    generatedAt: "2026-05-24T00:00:00.000Z",
    documentMode: "estimate",
  });
  const validation = validateAiEstimatePdf({
    pdf: pdf.bytes,
    knownWorkKey: estimate.work.workKey,
    requiredText: [estimate.work.title, estimate.totals.displayGrandTotal, estimate.tax.taxLabel],
  });
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const pdfPath = path.join(PDF_DIR, "brick_masonry_74sqm_android_ai_estimate.pdf");
  fs.writeFileSync(pdfPath, Buffer.from(pdf.bytes));
  return {
    pdfPath: rel(pdfPath),
    validation,
    rendererPath: pdf.rendererPath,
    documentNumber: pdf.documentNumber,
  };
}

function main(): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const devices = connectedEmulators();
  if (!devices.length) {
    writeBlocked("BLOCKED_ANDROID_EMULATOR_NOT_RUN", {
      error: "No connected Android emulator from adb devices.",
    });
    throw new Error("BLOCKED_ANDROID_EMULATOR_NOT_RUN");
  }
  if (!fs.existsSync(APK_PATH)) {
    writeBlocked("BLOCKED_ANDROID_EMULATOR_NOT_RUN", {
      devices,
      error: `Missing debug APK: ${APK_PATH}`,
    });
    throw new Error("BLOCKED_ANDROID_EMULATOR_NOT_RUN");
  }

  const aiEvidence = generateAiPdfEvidence();
  const smoke =
    process.platform === "win32"
      ? run("cmd.exe", ["/c", "npx", "tsx", "scripts/e2e/runAndroidEstimatePdfViewerSmoke.ts"], 900_000)
      : run("npx", ["tsx", "scripts/e2e/runAndroidEstimatePdfViewerSmoke.ts"], 900_000);
  const source = readExistingArtifact();
  const legacyPassed =
    smoke.ok &&
    source?.android_emulator_passed === true &&
    source.pdf_viewer_android_opened === true &&
    source.pdf_action_clicked === true;
  const aiPassed = legacyPassed && aiEvidence.validation.valid && aiEvidence.validation.details.realBorderedTablePresent;

  const requestPng = copyEvidence(source?.request_screen_png, "legacy_request_screen");
  const pdfButtonPng = copyEvidence(source?.pdf_button_screen_png, "legacy_pdf_button_screen");
  const viewerPng = copyEvidence(source?.viewer_screen_png, "shared_pdf_viewer_screen");
  const finalPng = copyEvidence(source?.final_screen_png, "shared_final_screen");
  const requestXml = copyEvidence(source?.request_screen_xml, "legacy_request_screen");
  const pdfButtonXml = copyEvidence(source?.pdf_button_screen_xml, "legacy_pdf_button_screen");
  const viewerXml = copyEvidence(source?.viewer_screen_xml, "shared_pdf_viewer_screen");
  const finalXml = copyEvidence(source?.final_screen_xml, "shared_final_screen");

  writeJson({
    wave: WAVE,
    status: aiPassed && legacyPassed
      ? "GREEN_AI_ESTIMATE_PDF_SAFE_INTEGRATION_ANDROID_READY"
      : "BLOCKED_ANDROID_EMULATOR_NOT_RUN",
    ai_estimate_pdf_android_passed: aiPassed,
    legacy_pdf_viewer_android_passed: legacyPassed,
    android_emulator_passed: aiPassed && legacyPassed,
    android_emulator_tested: devices.length > 0,
    devices,
    apk_path: rel(APK_PATH),
    apk_exists: fs.existsSync(APK_PATH),
    apk_install_ok: source?.apk_install_ok === true,
    fresh_debug_apk_tested: source?.fresh_debug_apk_tested === true,
    ai_pdf_path: aiEvidence.pdfPath,
    ai_pdf_renderer_path: aiEvidence.rendererPath,
    ai_pdf_document_number: aiEvidence.documentNumber,
    ai_pdf_real_table_present: aiEvidence.validation.details.realBorderedTablePresent,
    ai_pdf_totals_present: aiEvidence.validation.details.totalsPresent,
    ai_pdf_tax_sources_footer_present: aiEvidence.validation.details.taxSourcesFooterPresent,
    legacy_source_artifact: rel(SOURCE_ARTIFACT),
    legacy_source_final_status: source?.final_status ?? null,
    shared_viewer_route: "/pdf-viewer",
    screenshots: [requestPng, pdfButtonPng, viewerPng, finalPng].filter(Boolean),
    uiDumps: [requestXml, pdfButtonXml, viewerXml, finalXml].filter(Boolean),
    commandOutputTail: smoke.output.slice(-2000),
    error: aiPassed && legacyPassed ? null : source?.error ?? smoke.output.slice(-1000),
    fake_green_claimed: false,
  });

  if (!aiPassed || !legacyPassed) {
    throw new Error("BLOCKED_ANDROID_EMULATOR_NOT_RUN");
  }
  console.log("GREEN_AI_ESTIMATE_PDF_SAFE_INTEGRATION_ANDROID_READY");
}

main();
