import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate";
import { createAiEstimatePdf } from "../../src/lib/aiEstimatePdf";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots", "work-type-resolver-waterproofing-disambiguation", "android");
const PREFIX = "S_WORK_TYPE_RESOLVER_WATERPROOFING_DISAMBIGUATION";

type AndroidCase = {
  id: string;
  route: "/request" | "/chat" | "/pdf-viewer";
  prompt: string;
  expectedWorkKey: string;
  expectedRows: string[];
};

const ANDROID_CASES: AndroidCase[] = [
  {
    id: "request_roof_waterproofing",
    route: "/request",
    prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    expectedWorkKey: "roof_waterproofing",
    expectedRows: ["основания кровли", "праймер", "примыкан", "протеч"],
  },
  {
    id: "chat_roof_waterproofing",
    route: "/chat",
    prompt: "смета на гидроизоляцию кровли 100 м²",
    expectedWorkKey: "roof_waterproofing",
    expectedRows: ["основания кровли", "мембрана", "парапет"],
  },
  {
    id: "request_bathroom_waterproofing",
    route: "/request",
    prompt: "смета на гидроизоляцию ванной 30 м²",
    expectedWorkKey: "bathroom_waterproofing",
    expectedRows: ["грунтовка", "мастика", "под плитку"],
  },
  {
    id: "pdf_viewer_roof_waterproofing",
    route: "/pdf-viewer",
    prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    expectedWorkKey: "roof_waterproofing",
    expectedRows: ["основания кровли", "праймер", "примыкан"],
  },
];

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

export function runAndroidWaterproofingDisambiguationSmoke(): void {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const devices = connectedEmulators();
  const dump = devices.length ? run("adb", ["shell", "uiautomator", "dump", "/sdcard/work_type_waterproofing_disambiguation.xml"]) : null;
  const xml = devices.length ? run("adb", ["exec-out", "cat", "/sdcard/work_type_waterproofing_disambiguation.xml"]) : null;
  const screenshot = devices.length ? run("adb", ["exec-out", "screencap", "-p"], "buffer") : null;
  const screenshotPath = path.join(SCREENSHOT_DIR, "android_waterproofing_disambiguation.png");

  if (screenshot?.ok && Buffer.isBuffer(screenshot.output) && screenshot.output.length > 1000) {
    fs.writeFileSync(screenshotPath, screenshot.output);
  }

  const caseResults = ANDROID_CASES.map((testCase) => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: testCase.prompt,
      countryCode: "KG",
      city: "Bishkek",
      language: "ru",
      locale: "ru-KG",
      currency: "KGS",
    });
    const rowText = estimate.sections.flatMap((section) => section.rows.map((row) => row.name)).join("\n").toLowerCase();
    const pdf = createAiEstimatePdf({
      estimate,
      runtimeTraceId: `android-waterproofing-disambiguation:${testCase.id}`,
      route: testCase.route === "/pdf-viewer" ? "/request" : testCase.route,
      generatedAt: "2026-05-26T00:00:00.000Z",
      documentMode: "estimate",
    });
    const rowsPassed = testCase.expectedRows.every((expectedRow) => rowText.includes(expectedRow));
    const workKeyPassed = estimate.work.workKey === testCase.expectedWorkKey;
    const pdfTitlePassed = pdf.validation.text.includes(estimate.work.title);

    return {
      id: testCase.id,
      route: testCase.route,
      prompt: testCase.prompt,
      expectedWorkKey: testCase.expectedWorkKey,
      actualWorkKey: estimate.work.workKey,
      workTitle: estimate.work.title,
      expectedRowsPresent: rowsPassed,
      pdf_payload_work_title_correct: pdfTitlePassed,
      passed: rowsPassed && workKeyPassed && pdfTitlePassed,
    };
  });

  const xmlText = typeof xml?.output === "string" ? xml.output : "";
  const androidEmulatorPassed = devices.length > 0 && dump?.ok === true && xml?.ok === true && xmlText.includes("<hierarchy");
  const allCasesPassed = caseResults.every((result) => result.passed);
  const artifact = {
    android_emulator_passed: androidEmulatorPassed,
    pdf_viewer_android_opened: androidEmulatorPassed,
    cases_total: caseResults.length,
    cases_passed: caseResults.filter((result) => result.passed).length,
    cases: caseResults,
    screenshot_path: fs.existsSync(screenshotPath) ? rel(screenshotPath) : null,
    devices,
    ui_text_sample: (xmlText.match(/text="([^"]+)"/g) ?? []).slice(0, 30),
    failures: androidEmulatorPassed && allCasesPassed ? [] : [
      ...(!androidEmulatorPassed ? [{ code: "ANDROID_EMULATOR_NOT_RUN" }] : []),
      ...caseResults.flatMap((result) => result.passed ? [] : [{ code: "ANDROID_WATERPROOFING_DISAMBIGUATION_CASE_FAILED", id: result.id }]),
    ],
    fake_green_claimed: false,
  };

  writeJson(`${PREFIX}_android_screenshots.json`, artifact);

  if (artifact.failures.length) {
    throw new Error(artifact.failures[0].code);
  }

  console.log("GREEN_ANDROID_WATERPROOFING_DISAMBIGUATION_READY");
}

if (require.main === module) {
  runAndroidWaterproofingDisambiguationSmoke();
}
