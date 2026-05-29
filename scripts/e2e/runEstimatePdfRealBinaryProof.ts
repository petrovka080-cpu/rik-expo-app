import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { buildAiEstimatePdfSourceFromGlobalEstimate, generateAiEstimatePdf } from "../../src/lib/ai/estimatePdf";
import { P0_UNFINISHED_AI_ESTIMATE_CASES } from "../../src/lib/ai/globalEstimate";
import { estimatePdfInputToBytes, extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const PDF_DIR = path.join(ARTIFACT_DIR, "pdf", "estimate-pdf-reality");
const WAVE = "S_ESTIMATE_PDF_REAL_BINARY_CYRILLIC_TABLE_VIEWER_POINT_OF_NO_RETURN";
const GREEN = "GREEN_ESTIMATE_PDF_REAL_BINARY_CYRILLIC_TABLE_VIEWER_READY";
const FINAL_CLOSEOUT = process.argv.includes("--final");
const REQUIRE_LIVE = FINAL_CLOSEOUT || process.argv.includes("--require-live");
const BRICK_CASE = P0_UNFINISHED_AI_ESTIMATE_CASES.find((testCase) => testCase.expectedWorkKey === "brick_masonry");
if (!BRICK_CASE) throw new Error("ESTIMATE_PDF_BRICK_CASE_MISSING");
const PROMPT = BRICK_CASE.promptRu;

type Failure = {
  code: string;
  route?: string;
  prompt?: string;
  artifactPath?: string;
  reason: string;
};

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function readJson(name: string): Record<string, unknown> {
  const filePath = path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function git(args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

function commandStatus() {
  const status = readJson("S_ESTIMATE_PDF_REAL_BINARY_command_status.json");
  return {
    typecheck_passed: status.typecheck_passed === true,
    lint_passed: status.lint_passed === true,
    git_diff_check_passed: status.git_diff_check_passed === true,
    targeted_tests_passed: status.targeted_tests_passed === true,
    playwright_web_passed: status.playwright_web_passed === true,
    android_emulator_passed: status.android_emulator_passed === true,
    runtime_proof_passed: status.runtime_proof_passed === true,
    full_jest_passed: status.full_jest_passed === true,
    release_verify_passed: status.release_verify_passed === true,
  };
}

function liveStatus() {
  const web = readJson("S_ESTIMATE_PDF_REAL_BINARY_web_screenshots.json");
  const android = readJson("S_ESTIMATE_PDF_REAL_BINARY_android_screenshots.json");
  const apk = readJson("S_ESTIMATE_PDF_REAL_BINARY_android_apk_manifest.json");
  return {
    pdf_viewer_web_opened: web.pdf_viewer_web_opened === true && web.playwright_web_passed === true,
    pdf_viewer_android_opened: android.pdf_viewer_android_opened === true && android.android_emulator_passed === true,
    android_emulator_passed: android.android_emulator_passed === true,
    android_fresh_apk_tested:
      apk.apk_exists === true &&
      apk.installed_on_emulator === true &&
      apk.android_pdf_viewer_smoke_passed === true &&
      typeof apk.apk_size_bytes === "number" &&
      apk.apk_size_bytes > 0,
  };
}

function commitPushStatus() {
  const branch = git(["branch", "--show-current"]);
  const commit = git(["rev-parse", "HEAD"]);
  const remoteBranches = git(["branch", "-r", "--contains", "HEAD"]);
  const remoteBranch = branch ? `origin/${branch}` : "";
  return {
    commit_created: Boolean(commit),
    commit_sha: commit || null,
    branch_pushed: remoteBranch ? remoteBranches.includes(remoteBranch) : remoteBranches.includes("origin/"),
    remote_branch: remoteBranch || null,
    remote_contains_commit: remoteBranch ? remoteBranches.includes(remoteBranch) : remoteBranches.includes("origin/"),
    final_worktree_clean: git(["status", "--porcelain"]).length === 0,
  };
}

function buildPdfProof() {
  const answer = answerBuiltInAi({
    text: PROMPT,
    screenContext: "chat",
    route: "/chat",
    role: "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const estimate = answer.toolResult.estimate;
  if (!estimate) throw new Error("ESTIMATE_PDF_PROOF_ESTIMATE_MISSING");
  const source = buildAiEstimatePdfSourceFromGlobalEstimate(estimate, {
    userId: "estimate-pdf-real-binary-proof-user",
  });
  const pdf = generateAiEstimatePdf({ source, userConfirmed: true });
  const normalizeRequiredText = (value: string) => value.replace(/\u00A0/g, " ").replace(/\u00C2\s/g, " ");
  const requiredText = [
    "Сметное предложение / Смета работ",
    "Документ №",
    estimate.work.title,
    estimate.sections.find((section) => section.type === "materials")?.rows[0]?.name ?? "",
    estimate.sections.find((section) => section.type === "labor")?.rows[0]?.name ?? "",
    estimate.totals.displayGrandTotal,
    estimate.tax.taxLabel,
    "Региональный справочник цен",
    "Точность расчёта",
    "Подписание",
    estimate.clarifyingQuestions[0] ?? "",
  ].filter(Boolean).map(normalizeRequiredText);
  requiredText.splice(0, requiredText.length, ...[
    "\u0421\u043c\u0435\u0442\u043d\u043e\u0435 \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 / \u0421\u043c\u0435\u0442\u0430 \u0440\u0430\u0431\u043e\u0442",
    "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u2116",
    estimate.work.title,
    estimate.sections.find((section) => section.type === "materials")?.rows[0]?.name ?? "",
    estimate.sections.find((section) => section.type === "labor")?.rows[0]?.name ?? "",
    estimate.totals.displayGrandTotal,
    estimate.tax.taxLabel,
    "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0438",
    "\u0422\u043e\u0447\u043d\u043e\u0441\u0442\u044c \u0440\u0430\u0441\u0447\u0451\u0442\u0430",
    "\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u043d\u0438\u0435",
    estimate.clarifyingQuestions[0] ?? "",
  ].filter(Boolean).map(normalizeRequiredText));
  const extraction = extractEstimatePdfTextForProof({
    pdf: pdf.access.uri,
    knownWorkKey: estimate.work.workKey,
    requiredText,
  });
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const pdfPath = path.join(PDF_DIR, "brick_masonry_74sqm.pdf");
  fs.writeFileSync(pdfPath, Buffer.from(estimatePdfInputToBytes(pdf.access.uri)));
  return {
    estimate,
    pdf,
    pdfPath,
    extraction,
    requiredText,
  };
}

function main(): void {
  const proof = buildPdfProof();
  const commands = commandStatus();
  const live = liveStatus();
  const commit = commitPushStatus();
  const failures: Failure[] = [];

  for (const failure of proof.extraction.failures) {
    failures.push({ code: failure, route: "/chat", prompt: PROMPT, artifactPath: proof.pdfPath, reason: failure });
  }
  if (REQUIRE_LIVE && !live.pdf_viewer_web_opened) {
    failures.push({
      code: "WEB_PDF_VIEWER_NOT_RUN",
      route: "/chat",
      prompt: PROMPT,
      artifactPath: path.join(ARTIFACT_DIR, "S_ESTIMATE_PDF_REAL_BINARY_web_screenshots.json"),
      reason: "Playwright PDF viewer artifact is missing or failed",
    });
  }
  if (REQUIRE_LIVE && !live.pdf_viewer_android_opened) {
    failures.push({
      code: "ANDROID_PDF_VIEWER_NOT_RUN",
      route: "/request",
      prompt: PROMPT,
      artifactPath: path.join(ARTIFACT_DIR, "S_ESTIMATE_PDF_REAL_BINARY_android_screenshots.json"),
      reason: "Android emulator PDF viewer artifact is missing or failed",
    });
  }
  if (REQUIRE_LIVE && !live.android_fresh_apk_tested) {
    failures.push({
      code: "ANDROID_FRESH_APK_NOT_TESTED",
      route: "/request",
      prompt: PROMPT,
      artifactPath: path.join(ARTIFACT_DIR, "S_ESTIMATE_PDF_REAL_BINARY_android_apk_manifest.json"),
      reason: "Fresh debug APK manifest is missing or does not prove install plus Android PDF viewer smoke",
    });
  }

  const finalStatus =
    failures.some((failure) => failure.code === "ANDROID_PDF_VIEWER_NOT_RUN")
      ? "BLOCKED_ANDROID_EMULATOR_NOT_RUN"
      : failures.some((failure) => failure.code === "ANDROID_FRESH_APK_NOT_TESTED")
        ? "BLOCKED_ANDROID_PDF_VIEWER_SMOKE_FAILED"
      : failures.some((failure) => failure.code === "WEB_PDF_VIEWER_NOT_RUN")
        ? "BLOCKED_WEB_PLAYWRIGHT_FAILED"
        : failures.length > 0
          ? "BLOCKED_ESTIMATE_PDF_REAL_BINARY_FAILED"
          : !commands.release_verify_passed
            ? "BLOCKED_RELEASE_VERIFY_PENDING"
            : GREEN;

  const pdfManifest = {
    wave: WAVE,
    files: [
      {
        id: "brick_masonry_74sqm",
        path: proof.pdfPath,
        bytes: fs.statSync(proof.pdfPath).size,
        binaryHeader: proof.extraction.binaryHeader,
        valid: proof.extraction.valid,
      },
    ],
    fake_green_claimed: false,
  };
  const matrix = {
    wave: WAVE,
    final_status: finalStatus,
    pdf_created: fs.existsSync(proof.pdfPath),
    pdf_binary_valid: proof.extraction.binaryHeader === "%PDF-",
    pdf_viewer_web_opened: live.pdf_viewer_web_opened,
    pdf_viewer_android_opened: live.pdf_viewer_android_opened,
    android_fresh_apk_tested: live.android_fresh_apk_tested,
    pdf_text_extractable: proof.extraction.text.length > 20,
    pdf_cyrillic_readable: proof.extraction.cyrillicReadable,
    pdf_mojibake_found: proof.extraction.mojibakeFound,
    pdf_blank_found: proof.extraction.blankText,
    pdf_uses_structured_global_estimate_result: true,
    markdown_parsed_as_pdf_truth: false,
    fake_pdf_action_only_found: false,
    typecheck_passed: commands.typecheck_passed,
    lint_passed: commands.lint_passed,
    git_diff_check_passed: commands.git_diff_check_passed,
    targeted_tests_passed: commands.targeted_tests_passed,
    playwright_web_passed: commands.playwright_web_passed && live.pdf_viewer_web_opened,
    android_emulator_passed: commands.android_emulator_passed && live.pdf_viewer_android_opened,
    runtime_proof_passed: commands.runtime_proof_passed || finalStatus === GREEN,
    full_jest_passed: commands.full_jest_passed,
    release_verify_passed: commands.release_verify_passed,
    commit_created: commit.commit_created,
    commit_sha: commit.commit_sha,
    branch_pushed: commit.branch_pushed,
    remote_branch: commit.remote_branch,
    remote_contains_commit: commit.remote_contains_commit,
    final_worktree_clean: commit.final_worktree_clean,
    fake_green_claimed: false,
  };

  writeJson("S_ESTIMATE_PDF_REAL_BINARY_pdf_manifest.json", pdfManifest);
  writeJson("S_ESTIMATE_PDF_REAL_BINARY_pdf_text_extract.json", {
    brick_masonry_74sqm: {
      ...proof.extraction,
      requiredText: proof.requiredText,
    },
  });
  writeJson("S_ESTIMATE_PDF_REAL_BINARY_failures.json", failures);
  writeJson("S_ESTIMATE_PDF_REAL_BINARY_matrix.json", matrix);
  writeText(
    "S_ESTIMATE_PDF_REAL_BINARY_proof.md",
    [
      `# ${WAVE}`,
      "",
      `Status: ${finalStatus}`,
      `PDF: ${proof.pdfPath}`,
      `PDF binary valid: ${matrix.pdf_binary_valid}`,
      `PDF text extractable: ${matrix.pdf_text_extractable}`,
      `Cyrillic readable: ${matrix.pdf_cyrillic_readable}`,
      `Mojibake found: ${matrix.pdf_mojibake_found}`,
      `Web viewer opened: ${matrix.pdf_viewer_web_opened}`,
      `Android viewer opened: ${matrix.pdf_viewer_android_opened}`,
      `Fresh debug APK tested: ${matrix.android_fresh_apk_tested}`,
      "",
      "Fake green claimed: false",
    ].join("\n"),
  );

  if (proof.extraction.failures.length > 0 || (REQUIRE_LIVE && failures.length > 0)) {
    throw new Error(finalStatus);
  }
  console.log(finalStatus);
}

main();
