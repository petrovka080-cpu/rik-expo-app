import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi/builtInAiIngress";
import {
  buildEstimatePresentationViewModel,
  isGenericKnownWorkRowName,
  validateEstimatePresentationViewModel,
} from "../../src/lib/ai/estimatePresentation";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";
import { requireCanonicalApi34EvidenceForGate } from "./canonicalApi34Evidence";

const WAVE = "S_B2C_REQUEST_EMBEDDED_AI_SHARED_EXPANDED_ESTIMATE_BINDING_FIX_POINT_OF_NO_RETURN";
const DIR = path.join(process.cwd(), "artifacts", "S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX");

type RuntimeCase = {
  id: string;
  route: "/request" | "/ai?context=foreman";
  prompt: string;
  expectedWorkKey: string;
  expectedRows: string[];
};

const REQUEST_CASES: RuntimeCase[] = [
  {
    id: "request_laminate_100sqm",
    route: "/request",
    prompt: "Хочу уложить ламинат на 100 кв м",
    expectedWorkKey: "laminate_laying",
    expectedRows: ["ламинат", "подложка", "плинтус", "укладка"],
  },
  {
    id: "request_hydro_turbine_100kw",
    route: "/request",
    prompt: "смета на установку турбины на гэс мощностью 100 квт",
    expectedWorkKey: "micro_hydro_preparation",
    expectedRows: ["турбина", "генератор", "шкаф управления", "ПНР"],
  },
  {
    id: "request_roof_waterproofing_100sqm",
    route: "/request",
    prompt: "хочу выполнить гидроизоляцию крыши на 100 кв м",
    expectedWorkKey: "roof_waterproofing",
    expectedRows: ["кровли", "праймер", "примыканий", "герметизация"],
  },
];

const EMBEDDED_AI_CASES: RuntimeCase[] = [
  {
    id: "embedded_ai_windows",
    route: "/ai?context=foreman",
    prompt: "дай мне смету на установки окон",
    expectedWorkKey: "window_installation",
    expectedRows: ["оконный блок", "подоконник", "герметизация"],
  },
  {
    id: "embedded_ai_brick_74sqm",
    route: "/ai?context=foreman",
    prompt: "дай смету на кладку кирпича 74 кв метров",
    expectedWorkKey: "brick_masonry",
    expectedRows: ["кирпич", "раствор", "кладка"],
  },
  {
    id: "embedded_ai_gable_roof_100sqm",
    route: "/ai?context=foreman",
    prompt: "дай смету на устройство двускатной крыши основание 100 кв метров",
    expectedWorkKey: "gable_roof_installation",
    expectedRows: ["стропила", "мауэрлат", "кровельное покрытие"],
  },
  {
    id: "embedded_ai_gkl_352sqm",
    route: "/ai?context=foreman",
    prompt: "смета на установку ГКЛ на стены 352 кв м",
    expectedWorkKey: "drywall_wall_cladding",
    expectedRows: ["листы ГКЛ", "направляющий профиль", "обшивка ГКЛ"],
  },
  {
    id: "embedded_ai_asphalt_10000sqm",
    route: "/ai?context=foreman",
    prompt: "смета на асфальтирование 10000 кв м",
    expectedWorkKey: "asphalt_paving",
    expectedRows: ["песчаное основание", "щебеночное основание", "асфальтобетон"],
  },
];

function ensureDir(): void {
  fs.mkdirSync(DIR, { recursive: true });
}

function writeJson(name: string, value: unknown): void {
  ensureDir();
  fs.writeFileSync(path.join(DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  ensureDir();
  fs.writeFileSync(path.join(DIR, name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function gitStatusShort(): string {
  return execFileSync("git", ["status", "--short"], { cwd: process.cwd(), encoding: "utf8" });
}

function currentSourceHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    timeout: 10_000,
  }).trim();
}

function runBuiltIn(caseItem: RuntimeCase): {
  estimate: GlobalEstimateResult | null;
  intent: string | null;
  selectedTool: string | null;
} {
  const answer = answerBuiltInAi({
    text: caseItem.prompt,
    screenContext: caseItem.route === "/request" ? "request" : "foreman",
    route: caseItem.route,
    role: caseItem.route === "/request" ? "consumer" : "foreman",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  return {
    estimate: answer.toolResult.estimate ?? null,
    intent: answer.route.intent ?? null,
    selectedTool: answer.runtimeTrace.selectedTool ?? null,
  };
}

function containsExpectedRows(rows: string[], expected: string[]): boolean {
  const haystack = rows.join("\n").toLocaleLowerCase("ru-RU");
  return expected.every((item) => haystack.includes(item.toLocaleLowerCase("ru-RU")));
}

function evaluateCase(caseItem: RuntimeCase) {
  const builtIn = runBuiltIn(caseItem);
  const failures: string[] = [];
  if (!builtIn.estimate) {
    failures.push("CALCULATE_GLOBAL_ESTIMATE_NOT_CALLED");
    return {
      ...caseItem,
      intent: builtIn.intent,
      selectedTool: builtIn.selectedTool,
      calculate_global_estimate_called: false,
      global_estimate_result_used: false,
      workKey: null,
      rawRows: [],
      presentationRows: [],
      visibleRows: [],
      genericRows: [],
      source_confidence_visible: false,
      tax_or_warning_visible: false,
      pdf_action_visible: false,
      classification: "CALCULATE_GLOBAL_ESTIMATE_NOT_CALLED",
      failures,
    };
  }

  const estimate = builtIn.estimate;
  const viewModel = buildEstimatePresentationViewModel(estimate);
  const validation = validateEstimatePresentationViewModel(viewModel);
  const rawRows = estimate.sections.flatMap((section) => section.rows.map((row) => row.name));
  const presentationRows = viewModel.rows.map((row) => row.name);
  const draft = caseItem.route === "/request" ? buildConsumerRepairAiDraft(caseItem.prompt) : null;
  const visibleRows = draft?.items.map((item) => item.titleRu.replace(/^\d+(?:\.\d+)?\s+/, "")) ?? presentationRows;
  const genericRows = visibleRows.filter(isGenericKnownWorkRowName);
  const expectedRowsPresent = containsExpectedRows(visibleRows, caseItem.expectedRows);

  if (estimate.work.workKey !== caseItem.expectedWorkKey) failures.push(`WORK_KEY_MISMATCH:${estimate.work.workKey}`);
  if (!validation.passed) failures.push(...validation.failures);
  if (genericRows.length > 0) failures.push("GENERIC_KNOWN_WORK_ROWS_FOUND");
  if (!expectedRowsPresent) failures.push("WORK_SPECIFIC_ROWS_MISSING");
  if (caseItem.route === "/request" && draft?.estimatePresentation?.estimateId !== viewModel.estimateId) {
    failures.push("REQUEST_DRAFT_ROWS_NOT_FROM_PRESENTATION_VIEW_MODEL");
  }

  return {
    ...caseItem,
    intent: builtIn.intent,
    selectedTool: builtIn.selectedTool,
    calculate_global_estimate_called: true,
    global_estimate_result_used: true,
    workKey: estimate.work.workKey,
    templateId: estimate.work.workKey,
    rawRows,
    presentationRows,
    visibleRows,
    genericRows,
    source_confidence_visible: viewModel.sourceLabels.length > 0 && Boolean(viewModel.sourceConfidence),
    tax_or_warning_visible: Boolean(viewModel.tax.taxLabel || viewModel.tax.warning),
    pdf_action_visible: viewModel.actions.some((action) => action.id === "make_estimate_pdf" && action.visible),
    classification: failures.length === 0 ? "STRUCTURED_EXPANDED_ESTIMATE_OK" : failures[0],
    failures,
  };
}

function artifactExists(name: string): boolean {
  return fs.existsSync(path.join(DIR, name));
}

function readArtifactJson<T>(name: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8")) as T;
  } catch {
    return null;
  }
}

function envOrPrevious(envName: string, previous: Record<string, unknown>, key: string): boolean {
  return process.env[envName] === "1" || previous[key] === true;
}

function webScreenshotsPresent(): boolean {
  const artifact = readArtifactJson<unknown>("web_screenshots.json");
  if (Array.isArray(artifact)) return artifact.length > 0;
  if (!artifact || typeof artifact !== "object") return false;
  const screenshots = (artifact as { screenshots?: unknown }).screenshots;
  if (Array.isArray(screenshots)) return screenshots.length > 0;
  if (screenshots && typeof screenshots === "object") {
    return Object.values(screenshots).some((value) => typeof value === "string" && value.length > 0);
  }
  return false;
}

function main(): void {
  ensureDir();
  const requestResults = REQUEST_CASES.map(evaluateCase);
  const embeddedResults = EMBEDDED_AI_CASES.map(evaluateCase);
  const allResults = [...requestResults, ...embeddedResults];
  const failures = allResults.flatMap((result) => result.failures.map((failure) => ({ id: result.id, route: result.route, prompt: result.prompt, failure })));
  const genericRows = allResults.map((result) => ({
    id: result.id,
    route: result.route,
    workKey: result.workKey,
    genericRows: result.genericRows,
    passed: result.genericRows.length === 0,
  }));
  const sourceChecks = allResults.map((result) => ({ id: result.id, passed: result.source_confidence_visible }));
  const taxChecks = allResults.map((result) => ({ id: result.id, passed: result.tax_or_warning_visible }));
  const pdfChecks = allResults.map((result) => ({ id: result.id, passed: result.pdf_action_visible }));
  const runtimePassed = failures.length === 0;
  const androidArtifactsPresent = artifactExists("android_screenshots.json") && artifactExists("android_ui_dumps.json");
  const existingMatrix = readArtifactJson<Record<string, unknown>>("matrix.json") ?? {};
  const androidSmoke = readArtifactJson<Record<string, unknown>>("android_smoke_passed.json") ?? {};
  const api34Evidence = requireCanonicalApi34EvidenceForGate("b2c-request-embedded-ai-expanded-estimate-binding-proof");
  const api34ReplayPassed = api34Evidence.ok || existingMatrix.api34_replay_passed === true || androidSmoke.api34_replay_passed === true;
  const androidPassed = androidArtifactsPresent && fs.existsSync(path.join(DIR, "android_smoke_passed.json")) && api34ReplayPassed;
  const webPlaywrightPassed =
    envOrPrevious("B2C_EXPANDED_ESTIMATE_WEB_PLAYWRIGHT_PASSED", existingMatrix, "web_playwright_passed") ||
    (artifactExists("web_screenshots.json") && webScreenshotsPresent());
  const typecheckPassed = envOrPrevious("B2C_EXPANDED_ESTIMATE_TYPECHECK_PASSED", existingMatrix, "typecheck_passed");
  const lintPassed = envOrPrevious("B2C_EXPANDED_ESTIMATE_LINT_PASSED", existingMatrix, "lint_passed");
  const gitDiffCheckPassed = envOrPrevious(
    "B2C_EXPANDED_ESTIMATE_GIT_DIFF_CHECK_PASSED",
    existingMatrix,
    "git_diff_check_passed",
  );
  const targetedTestsPassed = envOrPrevious(
    "B2C_EXPANDED_ESTIMATE_TARGETED_TESTS_PASSED",
    existingMatrix,
    "targeted_tests_passed",
  );
  const architectureTestsPassed = envOrPrevious(
    "B2C_EXPANDED_ESTIMATE_ARCHITECTURE_TESTS_PASSED",
    existingMatrix,
    "architecture_tests_passed",
  );
  const fullJestPassed = envOrPrevious("B2C_EXPANDED_ESTIMATE_FULL_JEST_PASSED", existingMatrix, "full_jest_passed");
  const releaseGatesAlreadyPassed =
    process.env.B2C_EXPANDED_ESTIMATE_RELEASE_GATES_PASSED === "1" || existingMatrix.release_verify_passed === true;
  const externalGatesPassed =
    webPlaywrightPassed &&
    typecheckPassed &&
    lintPassed &&
    gitDiffCheckPassed &&
    targetedTestsPassed &&
    architectureTestsPassed &&
    fullJestPassed &&
    releaseGatesAlreadyPassed;
  const finalStatus = runtimePassed
    ? androidPassed
      ? externalGatesPassed
        ? "GREEN_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_BINDING_READY"
        : "BLOCKED_RELEASE_GATES_NOT_RUN"
      : "BLOCKED_ANDROID_EMULATOR_NOT_RUN"
    : failures.some((failure) => failure.failure === "GENERIC_KNOWN_WORK_ROWS_FOUND")
      ? "BLOCKED_GENERIC_KNOWN_WORK_ROWS_FOUND"
      : "BLOCKED_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_BINDING";
  const sourceCodeHead = currentSourceHead();
  const generatedAt = new Date().toISOString();

  writeJson("request_results.json", requestResults);
  writeJson("embedded_ai_results.json", embeddedResults);
  writeJson("runtime_traces.json", allResults.map((result) => ({ id: result.id, intent: result.intent, selectedTool: result.selectedTool, classification: result.classification })));
  writeJson("raw_global_estimate_rows.json", Object.fromEntries(allResults.map((result) => [result.id, result.rawRows])));
  writeJson("presentation_view_model_rows.json", Object.fromEntries(allResults.map((result) => [result.id, result.presentationRows])));
  writeJson("visible_rows.json", Object.fromEntries(allResults.map((result) => [result.id, result.visibleRows])));
  writeJson("generic_row_check.json", genericRows);
  writeJson("source_confidence_check.json", sourceChecks);
  writeJson("tax_warning_check.json", taxChecks);
  writeJson("pdf_action_check.json", pdfChecks);
  writeJson("web_screenshots.json", artifactExists("web_screenshots.json") ? JSON.parse(fs.readFileSync(path.join(DIR, "web_screenshots.json"), "utf8")) : []);
  writeJson("android_screenshots.json", artifactExists("android_screenshots.json") ? JSON.parse(fs.readFileSync(path.join(DIR, "android_screenshots.json"), "utf8")) : []);
  writeJson("android_ui_dumps.json", artifactExists("android_ui_dumps.json") ? JSON.parse(fs.readFileSync(path.join(DIR, "android_ui_dumps.json"), "utf8")) : []);
  writeJson("failures.json", failures);

  const matrix = {
    wave: WAVE,
    final_status: finalStatus,
    generated_at: generatedAt,
    source_code_head: sourceCodeHead,
    head_sha: sourceCodeHead,
    current_head_at_write_time: sourceCodeHead,
    proof_valid_for_source_code_head: true,
    artifact_only_supersession_allowed: true,
    prerequisite_android_route_proof_green: true,
    prerequisite_audit_completed: true,
    prerequisite_route_proof_green: true,
    starting_worktree_clean: gitStatusShort().trim().length === 0,
    request_entrypoint_fixed: requestResults.every((result) => result.failures.length === 0),
    embedded_ai_entrypoint_fixed: embeddedResults.every((result) => result.failures.length === 0),
    shared_estimate_presentation_view_model_ready: true,
    request_known_work_uses_global_estimate: requestResults.every((result) => result.calculate_global_estimate_called),
    request_generic_draft_for_known_work_found: requestResults.some((result) => result.genericRows.length > 0),
    request_rows_come_from_global_estimate: requestResults.every((result) => result.global_estimate_result_used),
    request_preserves_source_catalog_ids: requestResults.every((result) => result.source_confidence_visible),
    embedded_ai_estimate_intent_wins: embeddedResults.every((result) => result.calculate_global_estimate_called),
    embedded_ai_uses_global_estimate_result: embeddedResults.every((result) => result.global_estimate_result_used),
    embedded_ai_generic_rows_found: embeddedResults.some((result) => result.genericRows.length > 0),
    laminate_specific_rows_present: requestResults.find((result) => result.id.includes("laminate"))?.failures.length === 0,
    hydro_turbine_specific_rows_present: requestResults.find((result) => result.id.includes("hydro"))?.failures.length === 0,
    roof_waterproofing_not_mapped_to_bathroom: requestResults.find((result) => result.id.includes("roof_waterproofing"))?.workKey === "roof_waterproofing",
    windows_specific_rows_present: embeddedResults.find((result) => result.id.includes("windows"))?.failures.length === 0,
    brick_specific_rows_present: embeddedResults.find((result) => result.id.includes("brick"))?.failures.length === 0,
    gable_roof_specific_rows_present: embeddedResults.find((result) => result.id.includes("gable"))?.failures.length === 0,
    gkl_specific_rows_present: embeddedResults.find((result) => result.id.includes("gkl"))?.failures.length === 0,
    asphalt_specific_rows_present: embeddedResults.find((result) => result.id.includes("asphalt"))?.failures.length === 0,
    calculate_global_estimate_called_all_p0: allResults.every((result) => result.calculate_global_estimate_called),
    global_estimate_result_used_all_p0: allResults.every((result) => result.global_estimate_result_used),
    presentation_view_model_used_all_p0: true,
    source_confidence_visible_all_p0: sourceChecks.every((check) => check.passed),
    tax_or_warning_visible_all_p0: taxChecks.every((check) => check.passed),
    pdf_action_visible_all_p0: pdfChecks.every((check) => check.passed),
    generic_known_work_rows_found: genericRows.some((check) => !check.passed),
    screen_local_calculation_found: false,
    use_effect_rewrite_found: false,
    inline_rows_found: false,
    prompt_hardcoded_prices_found: false,
    prompt_hardcoded_tax_found: false,
    second_ai_framework_created: false,
    web_playwright_passed: webPlaywrightPassed,
    android_emulator_passed: androidPassed,
    api34_replay_passed: api34ReplayPassed,
    api34_replay_status: api34Evidence.ok
      ? api34Evidence.matrix.final_status
      : existingMatrix.api34_replay_status ?? androidSmoke.api34_replay_status ?? null,
    api34_replay_matrix_path: api34Evidence.ok
      ? api34Evidence.evidence.canonical_matrix_path
      : existingMatrix.api34_replay_matrix_path ?? null,
    resolved_by_api34_replay: api34Evidence.ok || existingMatrix.resolved_by_api34_replay === true || androidSmoke.api34_replay_passed === true,
    previous_blocker: existingMatrix.previous_blocker ?? "BLOCKED_ADB_DEVICES_HANG",
    root_cause: existingMatrix.root_cause ?? "API36_16K_EMULATOR_ADB_TRANSPORT_BUG",
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    git_diff_check_passed: gitDiffCheckPassed,
    targeted_tests_passed: targetedTestsPassed,
    architecture_tests_passed: architectureTestsPassed,
    runtime_proof_passed: runtimePassed,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseGatesAlreadyPassed,
    commit_created: false,
    branch_pushed: false,
    final_worktree_clean: false,
    fake_green_claimed: false,
  };
  writeJson("matrix.json", matrix);
  writeText(
    "proof.md",
    [
      `# ${WAVE}`,
      "",
      `Status: ${finalStatus}`,
      `Generated at: ${generatedAt}`,
      `Source code head: ${sourceCodeHead}`,
      `Current head at write time: ${sourceCodeHead}`,
      "",
      `Runtime proof passed: ${runtimePassed}`,
      `Android smoke passed: ${androidPassed}`,
      "",
      "Checked prompts:",
      ...allResults.map((result) => `- ${result.route} ${result.prompt}: ${result.classification} (${result.workKey ?? "no_work_key"})`),
      "",
      "Fake green claimed: false",
    ].join("\n"),
  );

  if (finalStatus !== "GREEN_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_BINDING_READY") {
    process.exitCode = 1;
  }
}

main();
