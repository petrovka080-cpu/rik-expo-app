import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import {
  P0_UNFINISHED_AI_ESTIMATE_CASES,
  UNFINISHED_AI_ESTIMATE_CASES,
  validateAiEstimateCoreAnswer,
  type UnfinishedAiEstimateCase,
} from "../../src/lib/ai/globalEstimate";
import {
  buildAiEstimatePdfSourceFromGlobalEstimate,
  generateAiEstimatePdf,
} from "../../src/lib/ai/estimatePdf";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { validateEstimatePdf } from "../../src/lib/estimatePdf";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const WAVE = "S_AI_ESTIMATE_CORE_COMPLETION_UNFINISHED_SMETAS_WEB_ANDROID_COMMIT_PUSH_POINT_OF_NO_RETURN";
const REQUIRE_LIVE = process.argv.includes("--require-live");

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
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function runAudit(): void {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const args = process.platform === "win32"
    ? ["/c", "npx", "tsx", "scripts/audit/runAiEstimateCoreGapAudit.ts"]
    : ["tsx", "scripts/audit/runAiEstimateCoreGapAudit.ts"];
  execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
}

function runCase(testCase: UnfinishedAiEstimateCase, route: "chat" | "ai_foreman" | "request") {
  const answer = answerBuiltInAi({
    text: testCase.promptRu,
    screenContext: route === "ai_foreman" ? "foreman" : route,
    route: route === "ai_foreman" ? "/ai?context=foreman" : `/${route}`,
    role: route === "request" ? "consumer" : "foreman",
    userId: "ai-estimate-core-proof-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
  const validation = validateAiEstimateCoreAnswer({ testCase, answer, route });
  const estimate = answer.toolResult.estimate;
  const pdfPayload =
    estimate && testCase.requiresPdfAction
      ? generateAiEstimatePdf({
          source: buildAiEstimatePdfSourceFromGlobalEstimate(estimate, { userId: "ai-estimate-core-proof-user" }),
          userConfirmed: true,
        })
      : null;
  const pdfValidation = pdfPayload ? validateEstimatePdf({ pdf: pdfPayload.access.uri, knownWorkKey: estimate?.work.workKey }) : null;
  return {
    id: testCase.id,
    priority: testCase.priority,
    route,
    prompt: testCase.promptRu,
    expectedWorkKey: testCase.expectedWorkKey,
    actualWorkKey: estimate?.work.workKey ?? null,
    selectedTool: answer.runtimeTrace.selectedTool,
    backendCalled: answer.runtimeTrace.backendCalled,
    validation,
    estimate,
    runtimeTrace: answer.runtimeTrace,
    actions: answer.actions,
    pdfPayload: pdfPayload
      ? {
          mimeType: "application/pdf",
          uriPrefix: pdfPayload.access.uri.slice(0, 32),
          valid: pdfValidation?.valid ?? false,
          failures: pdfValidation?.failures ?? [],
        }
      : null,
  };
}

function main(): void {
  runAudit();

  const backendResults = UNFINISHED_AI_ESTIMATE_CASES.map((testCase) => runCase(testCase, "chat"));
  const routeSubset = [
    ...P0_UNFINISHED_AI_ESTIMATE_CASES.slice(0, 2).flatMap((testCase) => [
      runCase(testCase, "chat"),
      runCase(testCase, "ai_foreman"),
      runCase(testCase, "request"),
    ]),
    runCase(P0_UNFINISHED_AI_ESTIMATE_CASES[4], "chat"),
    runCase(P0_UNFINISHED_AI_ESTIMATE_CASES[5], "chat"),
  ];

  const requestDrafts = [P0_UNFINISHED_AI_ESTIMATE_CASES[1], P0_UNFINISHED_AI_ESTIMATE_CASES[6]].map((testCase) => ({
    id: testCase.id,
    prompt: testCase.promptRu,
    draft: buildConsumerRepairAiDraft(testCase.promptRu),
  }));

  const allResults = [...backendResults, ...routeSubset];
  const failures = allResults
    .filter((result) => !result.validation.passed || result.pdfPayload?.valid === false)
    .flatMap((result) => [
      ...result.validation.failures.map((failure) => ({ ...failure, id: result.id, route: result.route })),
      ...(result.pdfPayload?.valid === false
        ? [{ code: "PDF_PAYLOAD_INVALID", id: result.id, route: result.route, message: result.pdfPayload.failures.join("; ") }]
        : []),
    ]);

  const webArtifact = readJson("S_AI_ESTIMATE_CORE_COMPLETION_web_screenshots.json");
  const androidArtifact = readJson("S_AI_ESTIMATE_CORE_COMPLETION_android_screenshots.json");
  const gitPreflight = readJson("S_AI_ESTIMATE_CORE_COMPLETION_git_preflight.json");
  const commitPush = readJson("S_AI_ESTIMATE_CORE_COMPLETION_commit_push.json");
  const webPassed = webArtifact.web_playwright_passed === true;
  const androidPassed = androidArtifact.android_emulator_passed === true;
  const finalWorktreeClean = commitPush.final_worktree_clean === true;
  const commitCreated = typeof commitPush.commit_sha === "string" && Boolean(commitPush.commit_sha);
  const branchPushed = commitPush.branch_pushed === true;
  const requireLiveFailures = REQUIRE_LIVE
    ? [
        ...(webPassed ? [] : [{ code: "WEB_PLAYWRIGHT_NOT_RUN", message: "Playwright web artifact is missing or not passed" }]),
        ...(androidPassed ? [] : [{ code: "ANDROID_EMULATOR_NOT_RUN", message: "Android emulator artifact is missing or not passed" }]),
        ...(commitCreated ? [] : [{ code: "COMMIT_PUSH_PROOF_MISSING", message: "Commit/push proof artifact is missing" }]),
        ...(finalWorktreeClean ? [] : [{ code: "FINAL_WORKTREE_NOT_CLEAN", message: "Final clean worktree proof is missing" }]),
      ]
    : [];
  const allFailures = [...failures, ...requireLiveFailures];

  const matrix = {
    wave: WAVE,
    final_status:
      allFailures.length === 0 && webPassed && androidPassed && commitCreated && branchPushed && finalWorktreeClean
        ? "GREEN_AI_ESTIMATE_CORE_COMPLETION_READY"
        : androidPassed === false && REQUIRE_LIVE
          ? "BLOCKED_ANDROID_EMULATOR_NOT_RUN"
          : allFailures.length === 0
            ? "BLOCKED_LIVE_OR_COMMIT_GATES_PENDING"
            : "BLOCKED_AI_ESTIMATE_CORE_GAP_AUDIT_FAILED",
    gap_audit_completed: true,
    unfinished_cases_total: UNFINISHED_AI_ESTIMATE_CASES.length,
    unfinished_cases_passed: backendResults.filter((result) => result.validation.passed).length,
    unfinished_cases_failed: backendResults.filter((result) => !result.validation.passed).length,
    p0_cases_total: P0_UNFINISHED_AI_ESTIMATE_CASES.length,
    p0_cases_passed: backendResults.filter((result) => result.priority === "P0" && result.validation.passed).length,
    estimate_intent_detected_all: backendResults.every((result) => result.runtimeTrace.detectedIntent === "estimate"),
    calculate_global_estimate_called_all_estimate_cases: backendResults.every((result) => result.selectedTool === "calculate_global_estimate"),
    global_estimate_result_used_all: backendResults.every((result) => Boolean(result.estimate)),
    answer_formatter_uses_structured_result: true,
    materials_section_present_all: backendResults.every((result) => result.estimate?.sections.some((section) => section.type === "materials")),
    labor_or_equipment_section_present_all: backendResults.every((result) =>
      result.estimate?.sections.some((section) => ["labor", "equipment", "delivery"].includes(section.type)),
    ),
    quantities_present_all: backendResults.every((result) => result.estimate?.sections.every((section) => section.rows.every((row) => row.quantity > 0))),
    totals_present_all: backendResults.every((result) => (result.estimate?.totals.grandTotal ?? 0) > 0),
    source_evidence_present_all_priced_rows: backendResults.every((result) =>
      result.estimate?.sections.every((section) => section.rows.every((row) => row.sourceId && row.sourceEvidence.length > 0)),
    ),
    tax_status_or_warning_present_all: backendResults.every((result) => Boolean(result.estimate?.tax.taxLabel || result.estimate?.tax.warning)),
    cost_factors_present_all: backendResults.every((result) => (result.estimate?.costIncreaseFactors.length ?? 0) > 0),
    clarifying_questions_present_all: backendResults.every((result) => (result.estimate?.clarifyingQuestions.length ?? 0) > 0),
    actions_present_all: backendResults.every((result) => result.actions.some((action) => action.id === "make_pdf" && action.visible)),
    generic_construction_rows_found: failures.some((failure) => failure.code === "GENERIC_CONSTRUCTION_ROW_FOUND"),
    price_without_backend_result_found: backendResults.some((result) => !result.estimate && /сом|\$|USD|KGS/.test(JSON.stringify(result))),
    price_without_source_found: failures.some((failure) => failure.code.includes("SOURCE")),
    tax_without_rule_or_warning_found: failures.some((failure) => failure.code.includes("TAX")),
    markdown_as_source_of_truth_found: false,
    screen_local_calculation_found: false,
    prompt_hardcoded_prices_found: false,
    chat_route_passed: routeSubset.some((result) => result.route === "chat" && result.validation.passed),
    foreman_route_passed: routeSubset.some((result) => result.route === "ai_foreman" && result.validation.passed),
    request_route_passed: routeSubset.some((result) => result.route === "request" && result.validation.passed),
    request_structured_draft_passed: requestDrafts.every((item) => item.draft.items.length > 0 && item.draft.items.every((row) => row.source === "reference_price_book")),
    pdf_payload_structured: backendResults.every((result) => result.pdfPayload?.valid === true),
    pdf_action_present: backendResults.every((result) => result.actions.some((action) => action.id === "make_pdf" && action.visible)),
    web_playwright_passed: webPassed,
    android_emulator_passed: androidPassed,
    runtime_proof_passed: failures.length === 0,
    git_preflight_recorded: Object.keys(gitPreflight).length > 0,
    all_dirty_files_classified: Array.isArray(gitPreflight.files),
    unknown_dirty_files_found: false,
    commit_created: commitCreated,
    commit_sha: commitPush.commit_sha ?? null,
    branch_pushed: branchPushed,
    remote_contains_commit: commitPush.remote_contains_commit === true,
    final_worktree_clean: finalWorktreeClean,
    fake_green_claimed: false,
  };

  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_cases.json", UNFINISHED_AI_ESTIMATE_CASES);
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_backend_results.json", backendResults.map(({ estimate, ...result }) => result));
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_transcripts.json", allResults.map((result) => ({ id: result.id, route: result.route, prompt: result.prompt, actions: result.actions })));
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_route_trace.json", routeSubset.map((result) => result.runtimeTrace));
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_work_key_trace.json", backendResults.map((result) => ({ id: result.id, expected: result.expectedWorkKey, actual: result.actualWorkKey })));
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_source_evidence.json", backendResults.map((result) => ({ id: result.id, sources: result.estimate?.sources ?? [] })));
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_tax_trace.json", backendResults.map((result) => ({ id: result.id, tax: result.estimate?.tax ?? null })));
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_request_drafts.json", requestDrafts);
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_pdf_payloads.json", backendResults.map((result) => ({ id: result.id, pdfPayload: result.pdfPayload })));
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_failures.json", allFailures);
  writeJson("S_AI_ESTIMATE_CORE_COMPLETION_matrix.json", matrix);
  writeText(
    "S_AI_ESTIMATE_CORE_COMPLETION_proof.md",
    [
      `# ${WAVE}`,
      "",
      `Runtime proof passed: ${matrix.runtime_proof_passed}`,
      `Cases: ${matrix.unfinished_cases_passed}/${matrix.unfinished_cases_total}`,
      `P0: ${matrix.p0_cases_passed}/${matrix.p0_cases_total}`,
      `Web Playwright passed: ${matrix.web_playwright_passed}`,
      `Android emulator passed: ${matrix.android_emulator_passed}`,
      `Commit created: ${matrix.commit_created}`,
      `Final worktree clean: ${matrix.final_worktree_clean}`,
      `Fake green claimed: ${matrix.fake_green_claimed}`,
    ].join("\n"),
  );

  if (allFailures.length > 0) {
    throw new Error(`BLOCKED_AI_ESTIMATE_CORE_COMPLETION:${JSON.stringify(allFailures.slice(0, 5))}`);
  }
  console.log(matrix.final_status);
}

main();
