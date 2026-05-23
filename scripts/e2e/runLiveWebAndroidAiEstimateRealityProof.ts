import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { REALITY_CASES, type RealityCase } from "../../tests/e2e/liveEstimateReality.shared";

const WAVE = "S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY";
const FULL_WAVE = "S_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_GATE_POINT_OF_NO_RETURN";
const GREEN = "GREEN_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY_READY";
const BLOCKED = "BLOCKED_LIVE_WEB_ANDROID_AI_ESTIMATE_REALITY";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

const ARTIFACTS = {
  webScreenshots: path.join(ARTIFACT_DIR, `${WAVE}_web_screenshots.json`),
  androidScreenshots: path.join(ARTIFACT_DIR, `${WAVE}_android_screenshots.json`),
  runtimeTrace: path.join(ARTIFACT_DIR, `${WAVE}_runtime_trace.json`),
  transcripts: path.join(ARTIFACT_DIR, `${WAVE}_ui_transcripts.json`),
  failures: path.join(ARTIFACT_DIR, `${WAVE}_failures.json`),
  matrix: path.join(ARTIFACT_DIR, `${WAVE}_matrix.json`),
  proof: path.join(ARTIFACT_DIR, `${WAVE}_proof.md`),
};

type Matrix = {
  wave: typeof FULL_WAVE;
  final_status: typeof GREEN | typeof BLOCKED | "BLOCKED_ANDROID_EMULATOR_NOT_RUN";
  web_live_app_tested: boolean;
  android_emulator_tested: boolean;
  asphalt_specific_rows_present: boolean;
  carpet_specific_rows_present: boolean;
  gkl_specific_rows_present: boolean;
  gable_roof_specific_rows_present: boolean;
  brick_masonry_specific_rows_present: boolean;
  generic_construction_rows_found: boolean;
  request_known_work_generic_draft_found: boolean;
  foreman_role_override_found: boolean;
  pdf_action_clicked: boolean;
  pdf_viewer_opened: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  playwright_web_passed: boolean;
  android_emulator_passed: boolean;
  full_jest_passed: boolean;
  release_verify_passed: boolean;
  commit_created: boolean;
  branch_pushed: boolean;
  final_worktree_clean: boolean;
  fake_green_claimed: false;
};

const SPECIFIC_CASE_KEYS = {
  asphalt_specific_rows_present: "asphalt_paving",
  carpet_specific_rows_present: "carpet_laying",
  gkl_specific_rows_present: "drywall_gkl",
  gable_roof_specific_rows_present: "gable_roof_installation",
  brick_masonry_specific_rows_present: "brick_masonry",
} as const;

const FORBIDDEN_ROW_NAMES = new Set([
  "Строительные работы",
  "Основной материал: Строительные работы",
  "Подготовка: Строительные работы",
  "Материалы: Строительные работы",
  "Работы: Строительные работы",
]);

function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(command: string, args: string[]): { ok: boolean; output: string } {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return { ok: false, output: error instanceof Error ? error.message : String(error) };
  }
}

function flag(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function normalize(text: string): string {
  return text.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
}

function hasAny(text: string, alternatives: string[]): boolean {
  const haystack = normalize(text);
  return alternatives.some((candidate) => haystack.includes(normalize(candidate)));
}

function validateRows(text: string, expectedRows: string[][]): boolean {
  return expectedRows.every((group) => hasAny(text, group));
}

function runtimeInputFor(testCase: RealityCase) {
  return {
    text: testCase.prompt,
    screenContext: testCase.route === "/ai?context=foreman" ? "foreman" : testCase.route === "/request" ? "request" : "chat",
    route: testCase.route,
    role: testCase.route === "/request" ? "consumer" : "foreman",
    userId: "live-web-android-reality-proof",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  };
}

function validateBackendCase(testCase: RealityCase) {
  const answer = answerBuiltInAi(runtimeInputFor(testCase));
  const estimateRows = answer.toolResult.estimate?.sections.flatMap((section) => section.rows.map((row) => row.name)) ?? [];
  const rowText = estimateRows.join("\n");
  const failures: string[] = [];
  if (answer.runtimeTrace.selectedTool !== "calculate_global_estimate") {
    failures.push(`${testCase.id}:selected_tool_${answer.runtimeTrace.selectedTool ?? "missing"}`);
  }
  if (answer.runtimeTrace.workKey !== testCase.expectedWorkKey) {
    failures.push(`${testCase.id}:work_key_${answer.runtimeTrace.workKey ?? "missing"}`);
  }
  if (!validateRows(rowText, testCase.expectedRows)) {
    failures.push(`${testCase.id}:specific_rows_missing`);
  }
  for (const row of estimateRows) {
    if (FORBIDDEN_ROW_NAMES.has(row.trim())) failures.push(`${testCase.id}:generic_row:${row}`);
  }
  return {
    ok: failures.length === 0,
    failures,
    rows: estimateRows,
    trace: answer.runtimeTrace,
  };
}

function validateRequestDraft(testCase: RealityCase) {
  const draft = buildConsumerRepairAiDraft(testCase.prompt);
  const rows = draft.items.map((item) => item.titleRu);
  const rowText = rows.join("\n");
  const failures: string[] = [];
  if (!validateRows(rowText, testCase.expectedRows)) failures.push(`${testCase.id}:request_draft_specific_rows_missing`);
  for (const row of rows) {
    if (FORBIDDEN_ROW_NAMES.has(row.trim())) failures.push(`${testCase.id}:request_draft_generic_row:${row}`);
  }
  return { ok: failures.length === 0, failures, rows };
}

function latestCommitSubject(): string {
  return run("git", ["log", "-1", "--pretty=%s"]).output.trim();
}

function currentBranch(): string {
  return run("git", ["branch", "--show-current"]).output.trim();
}

function headSha(): string {
  return run("git", ["rev-parse", "HEAD"]).output.trim();
}

function remoteContainsHead(): boolean {
  const branch = currentBranch();
  const sha = headSha();
  if (!branch || !sha) return false;
  const remote = run("git", ["rev-parse", `origin/${branch}`]);
  return remote.ok && remote.output.trim() === sha;
}

function worktreeClean(): boolean {
  return run("git", ["status", "--porcelain"]).output.trim().length === 0;
}

function proofMarkdown(matrix: Matrix, failures: string[]): string {
  return [
    `# ${FULL_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    "## Live Gates",
    `- web_live_app_tested: ${matrix.web_live_app_tested}`,
    `- android_emulator_tested: ${matrix.android_emulator_tested}`,
    `- pdf_action_clicked: ${matrix.pdf_action_clicked}`,
    `- pdf_viewer_opened: ${matrix.pdf_viewer_opened}`,
    "",
    "## Specific Rows",
    `- asphalt: ${matrix.asphalt_specific_rows_present}`,
    `- carpet: ${matrix.carpet_specific_rows_present}`,
    `- gkl: ${matrix.gkl_specific_rows_present}`,
    `- gable_roof: ${matrix.gable_roof_specific_rows_present}`,
    `- brick_masonry: ${matrix.brick_masonry_specific_rows_present}`,
    `- generic_construction_rows_found: ${matrix.generic_construction_rows_found}`,
    "",
    "## Verification",
    `- typecheck_passed: ${matrix.typecheck_passed}`,
    `- lint_passed: ${matrix.lint_passed}`,
    `- playwright_web_passed: ${matrix.playwright_web_passed}`,
    `- android_emulator_passed: ${matrix.android_emulator_passed}`,
    `- full_jest_passed: ${matrix.full_jest_passed}`,
    `- release_verify_passed: ${matrix.release_verify_passed}`,
    "",
    "## Git",
    `- commit_created: ${matrix.commit_created}`,
    `- branch_pushed: ${matrix.branch_pushed}`,
    `- final_worktree_clean: ${matrix.final_worktree_clean}`,
    "",
    "## Failures",
    failures.length ? failures.map((failure) => `- ${failure}`).join("\n") : "- []",
    "",
    "Fake green claimed: false",
    "",
  ].join("\n");
}

function main(): void {
  const cases = Object.values(REALITY_CASES);
  const backend = Object.fromEntries(cases.map((testCase) => [testCase.id, validateBackendCase(testCase)]));
  const requestDraft = validateRequestDraft(REALITY_CASES.carpet_laying);
  const web = readJson<Record<string, unknown>>(ARTIFACTS.webScreenshots, {});
  const transcripts = readJson<Array<Record<string, unknown>>>(ARTIFACTS.transcripts, []);
  const android = readJson<Record<string, unknown>>(ARTIFACTS.androidScreenshots, {});

  const failures: string[] = [];
  for (const result of Object.values(backend)) failures.push(...result.failures);
  failures.push(...requestDraft.failures);

  const webLiveAppTested =
    web.web_live_app_tested === true &&
    transcripts.some((item) => item.id === "asphalt_paving") &&
    transcripts.some((item) => item.id === "carpet_laying") &&
    transcripts.some((item) => item.id === "drywall_gkl") &&
    transcripts.some((item) => item.id === "gable_roof_installation") &&
    transcripts.some((item) => item.id === "brick_masonry");
  const pdfActionClicked = transcripts.some((item) => item.pdfActionClicked === true);
  const pdfViewerOpened = transcripts.some((item) => item.pdfViewerOpened === true);
  const androidEmulatorTested = android.android_emulator_tested === true;
  const androidEmulatorPassed = android.android_emulator_passed === true;

  if (!webLiveAppTested) failures.push("web_live_artifacts_missing_or_incomplete");
  if (!pdfActionClicked) failures.push("pdf_action_not_clicked_in_web_artifact");
  if (!pdfViewerOpened) failures.push("pdf_viewer_not_opened_in_web_artifact");
  if (!androidEmulatorTested) failures.push("BLOCKED_ANDROID_EMULATOR_NOT_RUN");
  if (androidEmulatorTested && !androidEmulatorPassed) failures.push("android_emulator_failed");

  const specific = Object.fromEntries(
    Object.entries(SPECIFIC_CASE_KEYS).map(([field, caseId]) => [field, backend[caseId]?.ok === true]),
  ) as Record<keyof typeof SPECIFIC_CASE_KEYS, boolean>;
  const genericConstructionRowsFound =
    Object.values(backend).some((result) => result.rows.some((row) => FORBIDDEN_ROW_NAMES.has(row.trim()))) ||
    requestDraft.rows.some((row) => FORBIDDEN_ROW_NAMES.has(row.trim()));

  const commitSubject = latestCommitSubject();
  const commitCreated = commitSubject === "fix(ai): enforce live web and android estimate reality gate";
  const branchPushed = remoteContainsHead();
  const finalWorktreeClean = worktreeClean();

  const matrix: Matrix = {
    wave: FULL_WAVE,
    final_status: failures.some((failure) => failure.includes("BLOCKED_ANDROID_EMULATOR_NOT_RUN"))
      ? "BLOCKED_ANDROID_EMULATOR_NOT_RUN"
      : failures.length === 0 &&
          flag(`${WAVE}_TYPECHECK_PASSED`) &&
          flag(`${WAVE}_LINT_PASSED`) &&
          flag(`${WAVE}_PLAYWRIGHT_WEB_PASSED`) &&
          flag(`${WAVE}_ANDROID_EMULATOR_PASSED`) &&
          flag(`${WAVE}_FULL_JEST_PASSED`) &&
          flag(`${WAVE}_RELEASE_VERIFY_PASSED`) &&
          commitCreated &&
          branchPushed &&
          finalWorktreeClean
        ? GREEN
        : BLOCKED,
    web_live_app_tested: webLiveAppTested,
    android_emulator_tested: androidEmulatorTested,
    asphalt_specific_rows_present: specific.asphalt_specific_rows_present,
    carpet_specific_rows_present: specific.carpet_specific_rows_present && requestDraft.ok,
    gkl_specific_rows_present: specific.gkl_specific_rows_present,
    gable_roof_specific_rows_present: specific.gable_roof_specific_rows_present,
    brick_masonry_specific_rows_present: specific.brick_masonry_specific_rows_present,
    generic_construction_rows_found: genericConstructionRowsFound,
    request_known_work_generic_draft_found: !requestDraft.ok,
    foreman_role_override_found: backend.asphalt_paving?.trace.workKey !== "asphalt_paving",
    pdf_action_clicked: pdfActionClicked,
    pdf_viewer_opened: pdfViewerOpened,
    typecheck_passed: flag(`${WAVE}_TYPECHECK_PASSED`),
    lint_passed: flag(`${WAVE}_LINT_PASSED`),
    playwright_web_passed: flag(`${WAVE}_PLAYWRIGHT_WEB_PASSED`) && webLiveAppTested,
    android_emulator_passed: flag(`${WAVE}_ANDROID_EMULATOR_PASSED`) && androidEmulatorPassed,
    full_jest_passed: flag(`${WAVE}_FULL_JEST_PASSED`),
    release_verify_passed: flag(`${WAVE}_RELEASE_VERIFY_PASSED`),
    commit_created: commitCreated,
    branch_pushed: branchPushed,
    final_worktree_clean: finalWorktreeClean,
    fake_green_claimed: false,
  };

  if (matrix.generic_construction_rows_found) failures.push("generic_construction_rows_found");
  if (matrix.request_known_work_generic_draft_found) failures.push("request_known_work_generic_draft_found");
  if (matrix.foreman_role_override_found) failures.push("foreman_role_override_found");

  writeJson(ARTIFACTS.failures, failures);
  writeJson(ARTIFACTS.matrix, matrix);
  fs.writeFileSync(ARTIFACTS.proof, proofMarkdown(matrix, failures), "utf8");

  if (matrix.final_status !== GREEN) {
    throw new Error(matrix.final_status);
  }
  console.log(GREEN);
}

main();
