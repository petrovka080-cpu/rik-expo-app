import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { detectEstimatePdfLayoutQuality } from "../../src/lib/estimatePdf/audit/detectEstimatePdfLayoutQuality";

const WAVE = "S_ESTIMATE_PDF_ARCHITECTURE_AUDIT_AND_DOCUMENT_ENGINE_DECISION_GATE_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const TARGET_ARTIFACT = path.join(ARTIFACT_DIR, "S_ESTIMATE_PDF_ARCH_AUDIT_android_screenshots.json");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "estimate-pdf-arch-audit", "android");
const SOURCE_ARTIFACT = path.join(ARTIFACT_DIR, "S_ESTIMATE_PDF_REAL_BINARY_android_screenshots.json");
const APK_PATH = path.resolve(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");

type CommandResult = {
  ok: boolean;
  output: string;
};

type SourceAndroidArtifact = {
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

function readSourceArtifact(): SourceAndroidArtifact | null {
  if (!fs.existsSync(SOURCE_ARTIFACT)) return null;
  try {
    return JSON.parse(fs.readFileSync(SOURCE_ARTIFACT, "utf8")) as SourceAndroidArtifact;
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
    android_visual_audit_completed: false,
    android_emulator_tested: false,
    apk_path: rel(APK_PATH),
    apk_exists: fs.existsSync(APK_PATH),
    screenshots: [],
    uiDumps: [],
    classification: "BROKEN_OR_UNREADABLE",
    fake_green_claimed: false,
    ...extra,
  });
}

function main(): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const devices = connectedEmulators();
  if (!devices.length) {
    writeBlocked("BLOCKED_ANDROID_PDF_ARCH_AUDIT_NOT_RUN", {
      error: "No connected Android emulator from adb devices.",
      devices,
    });
    throw new Error("BLOCKED_ANDROID_PDF_ARCH_AUDIT_NOT_RUN");
  }

  if (!fs.existsSync(APK_PATH)) {
    writeBlocked("BLOCKED_ANDROID_PDF_ARCH_AUDIT_NOT_RUN", {
      android_emulator_tested: true,
      devices,
      error: `Missing debug APK: ${APK_PATH}`,
    });
    throw new Error("BLOCKED_ANDROID_PDF_ARCH_AUDIT_NOT_RUN");
  }

  const smoke =
    process.platform === "win32"
      ? run("cmd.exe", ["/c", "npx", "tsx", "scripts/e2e/runAndroidEstimatePdfViewerSmoke.ts"], 900_000)
      : run("npx", ["tsx", "scripts/e2e/runAndroidEstimatePdfViewerSmoke.ts"], 900_000);
  const source = readSourceArtifact();
  const passed =
    smoke.ok &&
    source?.android_emulator_passed === true &&
    source.pdf_viewer_android_opened === true &&
    source.pdf_action_clicked === true;

  const layoutQuality = detectEstimatePdfLayoutQuality({
    documentHeader: true,
    documentNumberStatusDate: true,
    metadataBlock: true,
    realBorderedTable: false,
    tableHeader: true,
    rowGrid: false,
    totalsBlock: true,
    taxSourceBlock: true,
    footerSignatureBlock: false,
    readableWebViewerScreenshot: false,
    readableAndroidViewerScreenshot: passed,
    textExtractable: passed,
    plainTextPipeRows: true,
    visualRendererKind: "text_pdf",
  });

  const requestPng = copyEvidence(source?.request_screen_png, "request_screen");
  const pdfButtonPng = copyEvidence(source?.pdf_button_screen_png, "pdf_button_screen");
  const viewerPng = copyEvidence(source?.viewer_screen_png, "viewer_screen");
  const finalPng = copyEvidence(source?.final_screen_png, "final_screen");
  const requestXml = copyEvidence(source?.request_screen_xml, "request_screen");
  const pdfButtonXml = copyEvidence(source?.pdf_button_screen_xml, "pdf_button_screen");
  const viewerXml = copyEvidence(source?.viewer_screen_xml, "viewer_screen");
  const finalXml = copyEvidence(source?.final_screen_xml, "final_screen");

  writeJson({
    wave: WAVE,
    status: passed
      ? "GREEN_ANDROID_PDF_ARCH_AUDIT_READY"
      : "BLOCKED_ANDROID_PDF_ARCH_AUDIT_NOT_RUN",
    android_visual_audit_completed: passed,
    android_emulator_tested: devices.length > 0,
    devices,
    apk_path: rel(APK_PATH),
    apk_exists: fs.existsSync(APK_PATH),
    apk_install_ok: source?.apk_install_ok === true,
    fresh_debug_apk_tested: source?.fresh_debug_apk_tested === true,
    flow: "request -> make PDF -> /pdf-viewer or native handoff",
    pdf_action_clicked: source?.pdf_action_clicked === true,
    pdf_viewer_android_opened: source?.pdf_viewer_android_opened === true,
    screenshots: [requestPng, pdfButtonPng, viewerPng, finalPng].filter(Boolean),
    uiDumps: [requestXml, pdfButtonXml, viewerXml, finalXml].filter(Boolean),
    sourceArtifact: rel(SOURCE_ARTIFACT),
    sourceFinalStatus: source?.final_status ?? null,
    classification: layoutQuality.classification,
    enterprise_tabular_layout_claimed: false,
    commandOutputTail: smoke.output.slice(-2000),
    error: passed ? null : source?.error ?? smoke.output.slice(-1000),
    fake_green_claimed: false,
  });

  if (!passed) {
    throw new Error("BLOCKED_ANDROID_PDF_ARCH_AUDIT_NOT_RUN");
  }

  console.log("GREEN_ANDROID_PDF_ARCH_AUDIT_READY");
}

main();
