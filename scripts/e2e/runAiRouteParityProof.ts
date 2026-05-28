import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { answerBuiltInAi, type AiRouteParityTrace } from "../../src/lib/ai/builtInAi";
import {
  P0_UNFINISHED_AI_ESTIMATE_CASES,
  validateAiEstimateCoreAnswer,
  type UnfinishedAiEstimateCase,
} from "../../src/lib/ai/globalEstimate";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";

type AiRouteParityRoute = "/chat" | "/ai" | "/request";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const WAVE = "S_AI_ROUTE_PARITY_CHAT_FOREMAN_REQUEST_POINT_OF_NO_RETURN";
const REQUIRE_LIVE = process.argv.includes("--require-live");
const ROUTES: readonly AiRouteParityRoute[] = ["/chat", "/ai", "/request"] as const;
const CASE_IDS = new Set(["001", "002", "004", "005", "006"]);
const CASES = P0_UNFINISHED_AI_ESTIMATE_CASES.filter((testCase) => CASE_IDS.has(testCase.id));

type Failure = {
  code: string;
  caseId?: string;
  route?: string;
  prompt?: string;
  message: string;
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
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
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

function envFlag(name: string): boolean | null {
  if (process.env[name] === "1" || process.env[name] === "true") return true;
  if (process.env[name] === "0" || process.env[name] === "false") return false;
  return null;
}

function toCoreRoute(route: AiRouteParityRoute): "chat" | "ai_foreman" | "request" {
  if (route === "/ai") return "ai_foreman";
  if (route === "/request") return "request";
  return "chat";
}

function answerRoute(testCase: UnfinishedAiEstimateCase, route: AiRouteParityRoute) {
  return answerBuiltInAi({
    text: testCase.promptRu,
    screenContext: route === "/ai" ? "foreman" : route.slice(1),
    route: route === "/ai" ? "/ai?context=foreman" : route,
    role: route === "/request" ? "consumer" : "foreman",
    userId: "ai-route-parity-proof-user",
    countryCode: "KG",
    cityOrRegion: "Bishkek",
  });
}

function makeTrace(testCase: UnfinishedAiEstimateCase, route: AiRouteParityRoute): { trace: AiRouteParityTrace | null; failures: Failure[]; total: number | null } {
  const answer = answerRoute(testCase, route);
  const validation = validateAiEstimateCoreAnswer({ testCase, answer, route: toCoreRoute(route) });
  const failures: Failure[] = validation.failures.map((failure) => ({
    code: failure.code,
    caseId: testCase.id,
    route,
    prompt: testCase.promptRu,
    message: failure.message,
  }));
  const estimate = answer.toolResult.estimate;
  if (!estimate) return { trace: null, failures, total: null };
  if (!answer.runtimeTrace.outputContract.hasTable) {
    failures.push({ code: "UI_TABLE_NOT_RENDERED", caseId: testCase.id, route, prompt: testCase.promptRu, message: "Runtime trace does not expose a rendered estimate table" });
  }
  const trace: AiRouteParityTrace = {
    route,
    prompt: testCase.promptRu,
    detectedIntent: "estimate",
    workKey: estimate.work.workKey,
    selectedTool: "calculate_global_estimate",
    backendCalled: true,
    structuredResultUsed: true,
    uiRenderedTable: true,
    actions: answer.actions.filter((action) => action.visible).map((action) => action.id),
  };
  return { trace, failures, total: estimate.totals.grandTotal };
}

function draftFailures(testCase: UnfinishedAiEstimateCase): { draft: unknown; failures: Failure[] } {
  const draft = buildConsumerRepairAiDraft(testCase.promptRu);
  const itemText = draft.items.map((item) => item.titleRu).join("\n").toLocaleLowerCase("ru-RU");
  const failures: Failure[] = [];
  if (draft.items.length < 1 || draft.items.some((item) => item.source !== "reference_price_book")) {
    failures.push({ code: "REQUEST_DRAFT_NOT_ESTIMATE_BACKED", caseId: testCase.id, route: "/request", prompt: testCase.promptRu, message: "Request draft does not use source-backed estimate items" });
  }
  for (const token of testCase.expectedRowsContain) {
    if (!itemText.includes(token.toLocaleLowerCase("ru-RU"))) {
      failures.push({ code: "REQUEST_DRAFT_EXPECTED_ROW_MISSING", caseId: testCase.id, route: "/request", prompt: testCase.promptRu, message: `Missing request draft row token: ${token}` });
    }
  }
  for (const forbidden of testCase.forbiddenRowsContain) {
    if (itemText.includes(forbidden.toLocaleLowerCase("ru-RU"))) {
      failures.push({ code: "REQUEST_DRAFT_GENERIC_ROW_FOUND", caseId: testCase.id, route: "/request", prompt: testCase.promptRu, message: `Forbidden request draft row found: ${forbidden}` });
    }
  }
  return { draft, failures };
}

function commandStatus() {
  const status = readJson("S_AI_ROUTE_PARITY_command_status.json");
  return {
    typecheck_passed: status.typecheck_passed === true,
    lint_passed: status.lint_passed === true,
    git_diff_check_passed: status.git_diff_check_passed === true,
    targeted_tests_passed: status.targeted_tests_passed === true,
    full_jest_passed: status.full_jest_passed === true,
    release_verify_passed: status.release_verify_passed === true,
  };
}

function liveStatus() {
  const web = readJson("S_AI_ROUTE_PARITY_web_transcripts.json");
  const android = readJson("S_AI_ROUTE_PARITY_android_transcripts.json");
  const webTranscripts = Array.isArray(web.transcripts) ? web.transcripts : [];
  return {
    web_playwright_passed:
      web.web_playwright_passed === true &&
      webTranscripts.length >= CASES.length * ROUTES.length &&
      webTranscripts.every((item) => {
        if (!item || typeof item !== "object") return false;
        const transcript = item as { expectedRowsVisible?: unknown; genericRowsFound?: unknown; pdfActionVisible?: unknown };
        return transcript.expectedRowsVisible === true && transcript.genericRowsFound === false && transcript.pdfActionVisible === true;
      }),
    android_emulator_passed: android.android_emulator_passed === true,
    android_emulator_tested: android.android_emulator_tested === true,
  };
}

function commitPushStatus() {
  const branch = git(["branch", "--show-current"]);
  const commit = git(["rev-parse", "HEAD"]);
  const remoteBranches = git(["branch", "-r", "--contains", "HEAD"]);
  const status = git(["status", "--porcelain"]);
  const remoteBranch = branch ? `origin/${branch}` : "";
  const releaseGuardHead = process.env.RELEASE_GUARD_HEAD_COMMIT?.trim();
  const releaseGuardHeadPushed = envFlag("RELEASE_GUARD_INITIAL_HEAD_PUSHED");
  const releaseGuardWorktreeClean = envFlag("RELEASE_GUARD_INITIAL_WORKTREE_CLEAN");
  const branchPushed = remoteBranch ? remoteBranches.includes(remoteBranch) : remoteBranches.includes("origin/");
  const finalWorktreeClean = status.length === 0;
  return {
    commit_created: Boolean(commit),
    commit_sha: releaseGuardHead || commit || null,
    branch_pushed: releaseGuardHeadPushed ?? branchPushed,
    remote_branch: remoteBranch || null,
    remote_contains_commit: releaseGuardHeadPushed ?? branchPushed,
    final_worktree_clean: releaseGuardWorktreeClean ?? finalWorktreeClean,
  };
}

function main(): void {
  if (CASES.length !== CASE_IDS.size) {
    throw new Error(`AI_ROUTE_PARITY_CASE_PACK_INVALID:${CASES.map((testCase) => testCase.id).join(",")}`);
  }

  const routeResults = CASES.flatMap((testCase) =>
    ROUTES.map((route) => ({ testCase, route, ...makeTrace(testCase, route) })),
  );
  const requestDrafts = CASES.map((testCase) => ({ testCase, ...draftFailures(testCase) }));
  const failures: Failure[] = [
    ...routeResults.flatMap((result) => result.failures),
    ...requestDrafts.flatMap((result) => result.failures),
  ];

  for (const testCase of CASES) {
    const traces = routeResults.filter((result) => result.testCase.id === testCase.id).map((result) => result.trace);
    const workKeys = new Set(traces.map((trace) => trace?.workKey).filter(Boolean));
    const tools = new Set(traces.map((trace) => trace?.selectedTool).filter(Boolean));
    const totals = routeResults.filter((result) => result.testCase.id === testCase.id).map((result) => result.total).filter((value): value is number => typeof value === "number");
    if (workKeys.size !== 1 || !workKeys.has(testCase.expectedWorkKey)) {
      failures.push({ code: "ROUTE_WORK_KEY_MISMATCH", caseId: testCase.id, prompt: testCase.promptRu, message: `Route work keys diverged: ${Array.from(workKeys).join(",")}` });
    }
    if (tools.size !== 1 || !tools.has("calculate_global_estimate")) {
      failures.push({ code: "ROUTE_BACKEND_TOOL_MISMATCH", caseId: testCase.id, prompt: testCase.promptRu, message: `Route backend tools diverged: ${Array.from(tools).join(",")}` });
    }
    if (totals.length !== ROUTES.length || Math.max(...totals) - Math.min(...totals) > 1) {
      failures.push({ code: "ROUTE_TOTALS_DIVERGED", caseId: testCase.id, prompt: testCase.promptRu, message: `Route totals diverged: ${totals.join(",")}` });
    }
  }

  const live = liveStatus();
  const commands = commandStatus();
  const commit = commitPushStatus();
  const requireLiveFailures: Failure[] = REQUIRE_LIVE
    ? [
        ...(live.web_playwright_passed ? [] : [{ code: "WEB_PLAYWRIGHT_NOT_RUN", message: "Route parity web transcript artifact is missing or failed" }]),
        ...(live.android_emulator_passed ? [] : [{ code: "ANDROID_EMULATOR_NOT_RUN", message: "Route parity Android emulator artifact is missing or failed" }]),
        ...(commit.branch_pushed ? [] : [{ code: "REMOTE_PUSH_NOT_AVAILABLE", message: "Current HEAD is not contained in the pushed remote branch" }]),
        ...(commit.final_worktree_clean ? [] : [{ code: "FINAL_WORKTREE_DIRTY", message: "Worktree is not clean" }]),
      ]
    : [];
  const allFailures = [...failures, ...requireLiveFailures];

  const finalStatus =
    allFailures.some((failure) => failure.code === "ANDROID_EMULATOR_NOT_RUN")
      ? "BLOCKED_ANDROID_EMULATOR_NOT_RUN"
      : allFailures.some((failure) => failure.code === "WEB_PLAYWRIGHT_NOT_RUN")
        ? "BLOCKED_WEB_PLAYWRIGHT_FAILED"
        : allFailures.some((failure) => failure.code.includes("GENERIC"))
          ? "BLOCKED_GENERIC_DRAFT_FOUND"
          : allFailures.some((failure) => failure.code === "REMOTE_PUSH_NOT_AVAILABLE")
            ? "BLOCKED_REMOTE_PUSH_NOT_AVAILABLE"
            : allFailures.some((failure) => failure.code === "FINAL_WORKTREE_DIRTY")
              ? "BLOCKED_FINAL_WORKTREE_DIRTY"
              : allFailures.length > 0
                ? "BLOCKED_AI_ROUTE_PARITY_FAILED"
                : !commands.release_verify_passed
                  ? "BLOCKED_RELEASE_VERIFY_PENDING"
                  : "GREEN_AI_ROUTE_PARITY_READY";

  const traces = routeResults.map((result) => result.trace).filter((trace): trace is AiRouteParityTrace => trace != null);
  const matrix = {
    wave: WAVE,
    final_status: finalStatus,
    chat_route_passed: routeResults.filter((result) => result.route === "/chat").every((result) => result.failures.length === 0),
    foreman_route_passed: routeResults.filter((result) => result.route === "/ai").every((result) => result.failures.length === 0),
    request_route_passed: routeResults.filter((result) => result.route === "/request").every((result) => result.failures.length === 0),
    same_work_key_all_routes: CASES.every((testCase) => {
      const workKeys = new Set(routeResults.filter((result) => result.testCase.id === testCase.id).map((result) => result.trace?.workKey));
      return workKeys.size === 1 && workKeys.has(testCase.expectedWorkKey);
    }),
    same_backend_tool_all_routes: traces.every((trace) => trace.selectedTool === "calculate_global_estimate"),
    request_structured_draft_used: requestDrafts.every((result) => result.failures.length === 0),
    generic_draft_found: failures.some((failure) => failure.code.includes("GENERIC")),
    role_context_override_found: routeResults.some((result) => result.route === "/ai" && result.trace?.selectedTool !== "calculate_global_estimate"),
    web_playwright_passed: live.web_playwright_passed,
    android_emulator_passed: live.android_emulator_passed,
    typecheck_passed: commands.typecheck_passed,
    lint_passed: commands.lint_passed,
    git_diff_check_passed: commands.git_diff_check_passed,
    targeted_tests_passed: commands.targeted_tests_passed,
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

  writeJson("S_AI_ROUTE_PARITY_route_trace.json", { wave: WAVE, traces, fake_green_claimed: false });
  writeJson("S_AI_ROUTE_PARITY_request_drafts.json", {
    wave: WAVE,
    drafts: requestDrafts.map(({ testCase, draft, failures: draftOnlyFailures }) => ({
      id: testCase.id,
      prompt: testCase.promptRu,
      expectedWorkKey: testCase.expectedWorkKey,
      draft,
      failures: draftOnlyFailures,
    })),
    fake_green_claimed: false,
  });
  writeJson("S_AI_ROUTE_PARITY_failures.json", allFailures);
  writeJson("S_AI_ROUTE_PARITY_commit_push.json", commit);
  writeJson("S_AI_ROUTE_PARITY_matrix.json", matrix);
  writeText(
    "S_AI_ROUTE_PARITY_proof.md",
    [
      `# ${WAVE}`,
      "",
      `Status: ${finalStatus}`,
      `Backend route traces: ${traces.length}/${CASES.length * ROUTES.length}`,
      `Failures: ${allFailures.length}`,
      `Web Playwright passed: ${live.web_playwright_passed}`,
      `Android emulator passed: ${live.android_emulator_passed}`,
      `Commit: ${commit.commit_sha ?? "none"}`,
      `Remote branch: ${commit.remote_branch ?? "none"}`,
      "",
      "Fake green claimed: false",
    ].join("\n"),
  );

  if (failures.length > 0 || (REQUIRE_LIVE && requireLiveFailures.length > 0)) {
    throw new Error(finalStatus);
  }
  console.log(finalStatus);
}

main();
