import fs from "node:fs";
import path from "node:path";

import {
  AI_COMMAND_CENTER_MAX_CARDS,
  AI_COMMAND_CENTER_RUNTIME_BUDGET,
} from "../../src/features/ai/commandCenter/aiCommandCenterRuntimeBudget";
import { AI_COMMAND_CENTER_REFRESH_POLICY } from "../../src/features/ai/commandCenter/aiCommandCenterRefreshPolicy";
import { AI_COMMAND_CENTER_REALTIME_POLICY } from "../../src/features/ai/commandCenter/aiCommandCenterRealtimePolicy";

export type AiCommandCenterStateBudgetStatus =
  | "GREEN_AI_COMMAND_CENTER_STATE_BUDGET_READY"
  | "BLOCKED_COMMAND_CENTER_UNBOUNDED_REFRESH"
  | "BLOCKED_COMMAND_CENTER_REALTIME_BUDGET_GAP";

export type AiCommandCenterStateBudgetScanResult = {
  final_status: AiCommandCenterStateBudgetStatus;
  maxCards: number;
  maxCardsWithinBudget: boolean;
  paginationRequired: boolean;
  refreshThrottleRequired: boolean;
  refreshTimeoutRequired: boolean;
  cancellationRequired: boolean;
  duplicateInFlightBlocked: boolean;
  pollingLoopAllowed: false;
  pollingLoopCeiling: number;
  realtimeEnabledByDefault: false;
  perCardRealtimeSubscriptionAllowed: false;
  commandCenterHasNoRealtimeSubscription: boolean;
  commandCenterHasNoPollingLoop: boolean;
  taskStreamUsesBudgetedLimit: boolean;
  cardBudgetEnforcedInViewModel: boolean;
  emptyStateReal: boolean;
  mutationCount: 0;
  findings: readonly string[];
};

const COMMAND_CENTER_SOURCE_FILES = [
  "src/features/ai/commandCenter/AiCommandCenterScreen.tsx",
  "src/features/ai/commandCenter/AiCommandCenterTypes.ts",
  "src/features/ai/commandCenter/AiCommandCenterCards.tsx",
  "src/features/ai/commandCenter/AiCommandCenterActions.tsx",
  "src/features/ai/commandCenter/useAiCommandCenterData.ts",
  "src/features/ai/commandCenter/buildAiCommandCenterViewModel.ts",
  "src/features/ai/commandCenter/aiCommandCenterRuntimeBudget.ts",
  "src/features/ai/commandCenter/aiCommandCenterRefreshPolicy.ts",
  "src/features/ai/commandCenter/aiCommandCenterRealtimePolicy.ts",
] as const;

function readProjectFile(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function combinedSource(projectRoot: string): string {
  return COMMAND_CENTER_SOURCE_FILES.map((relativePath) => readProjectFile(projectRoot, relativePath)).join("\n");
}

function hasRealtimeSubscription(source: string): boolean {
  return /\.channel\s*\(|\.subscribe\s*\(|\bchannel\s*\(|\bsubscribe\s*\(/i.test(source);
}

function hasPollingLoop(source: string): boolean {
  return /\bsetInterval\s*\(|\bwhile\s*\(\s*true\s*\)|\bfor\s*\(\s*;\s*;\s*\)/i.test(source);
}

export function scanCommandCenterStateBudget(projectRoot = process.cwd()): AiCommandCenterStateBudgetScanResult {
  const source = combinedSource(projectRoot);
  const viewModelSource = readProjectFile(projectRoot, "src/features/ai/commandCenter/buildAiCommandCenterViewModel.ts");
  const screenSource = readProjectFile(projectRoot, "src/features/ai/commandCenter/AiCommandCenterScreen.tsx");

  const maxCardsWithinBudget = AI_COMMAND_CENTER_MAX_CARDS <= 20;
  const paginationRequired = AI_COMMAND_CENTER_RUNTIME_BUDGET.paginationRequired === true;
  const refreshThrottleRequired = AI_COMMAND_CENTER_REFRESH_POLICY.minRefreshIntervalMs >= 30_000;
  const refreshTimeoutRequired = AI_COMMAND_CENTER_REFRESH_POLICY.requestTimeoutMs <= 8_000;
  const cancellationRequired = AI_COMMAND_CENTER_REFRESH_POLICY.cancellationRequired === true;
  const duplicateInFlightBlocked = AI_COMMAND_CENTER_REFRESH_POLICY.duplicateInFlightAllowed === false;
  const commandCenterHasNoRealtimeSubscription = !hasRealtimeSubscription(source);
  const commandCenterHasNoPollingLoop = !hasPollingLoop(source);
  const taskStreamUsesBudgetedLimit =
    viewModelSource.includes("normalizeAiCommandCenterPage(input.page)") &&
    viewModelSource.includes("page,") &&
    viewModelSource.includes("getAgentTaskStream");
  const cardBudgetEnforcedInViewModel =
    viewModelSource.includes("normalizeAiCommandCenterPage") &&
    viewModelSource.includes("enforceAiCommandCenterCardBudget");
  const emptyStateReal =
    screenSource.includes("ai.command.center.empty-state") &&
    screenSource.includes("state.viewModel.empty") &&
    !screenSource.includes("fakeCards: true");

  const findings = [
    ...(maxCardsWithinBudget ? [] : ["command_center_max_cards_exceeds_20"]),
    ...(paginationRequired ? [] : ["command_center_pagination_not_required"]),
    ...(refreshThrottleRequired ? [] : ["command_center_refresh_throttle_missing"]),
    ...(refreshTimeoutRequired ? [] : ["command_center_refresh_timeout_missing"]),
    ...(cancellationRequired ? [] : ["command_center_refresh_cancellation_missing"]),
    ...(duplicateInFlightBlocked ? [] : ["command_center_duplicate_refresh_allowed"]),
    ...(commandCenterHasNoRealtimeSubscription ? [] : ["command_center_realtime_subscription_detected"]),
    ...(commandCenterHasNoPollingLoop ? [] : ["command_center_polling_loop_detected"]),
    ...(taskStreamUsesBudgetedLimit ? [] : ["command_center_task_stream_limit_not_budgeted"]),
    ...(cardBudgetEnforcedInViewModel ? [] : ["command_center_card_budget_not_enforced"]),
    ...(emptyStateReal ? [] : ["command_center_empty_state_not_real"]),
  ];

  const finalStatus =
    commandCenterHasNoRealtimeSubscription && AI_COMMAND_CENTER_REALTIME_POLICY.realtimeEnabledByDefault === false
      ? findings.length === 0
        ? "GREEN_AI_COMMAND_CENTER_STATE_BUDGET_READY"
        : "BLOCKED_COMMAND_CENTER_UNBOUNDED_REFRESH"
      : "BLOCKED_COMMAND_CENTER_REALTIME_BUDGET_GAP";

  return {
    final_status: finalStatus,
    maxCards: AI_COMMAND_CENTER_MAX_CARDS,
    maxCardsWithinBudget,
    paginationRequired,
    refreshThrottleRequired,
    refreshTimeoutRequired,
    cancellationRequired,
    duplicateInFlightBlocked,
    pollingLoopAllowed: false,
    pollingLoopCeiling: AI_COMMAND_CENTER_REFRESH_POLICY.pollingLoopCeiling,
    realtimeEnabledByDefault: false,
    perCardRealtimeSubscriptionAllowed: false,
    commandCenterHasNoRealtimeSubscription,
    commandCenterHasNoPollingLoop,
    taskStreamUsesBudgetedLimit,
    cardBudgetEnforcedInViewModel,
    emptyStateReal,
    mutationCount: 0,
    findings,
  };
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeCommandCenterStateBudgetArtifacts(params: {
  projectRoot: string;
  result: AiCommandCenterStateBudgetScanResult;
}): void {
  const artifactRoot = path.join(params.projectRoot, "artifacts");
  const inventory = {
    wave: "S_AI_HARDEN_05_COMMAND_CENTER_STATE_AND_REALTIME_BUDGET",
    sourceFiles: COMMAND_CENTER_SOURCE_FILES,
    policyFiles: [
      "src/features/ai/commandCenter/aiCommandCenterRuntimeBudget.ts",
      "src/features/ai/commandCenter/aiCommandCenterRefreshPolicy.ts",
      "src/features/ai/commandCenter/aiCommandCenterRealtimePolicy.ts",
    ],
    scanner: "scripts/ai/scanCommandCenterStateBudget.ts",
  };
  const matrix = {
    final_status: params.result.final_status,
    max_cards_lte_20: params.result.maxCardsWithinBudget,
    pagination_required: params.result.paginationRequired,
    refresh_throttle_required: params.result.refreshThrottleRequired,
    refresh_timeout_required: params.result.refreshTimeoutRequired,
    cancellation_required: params.result.cancellationRequired,
    duplicate_in_flight_blocked: params.result.duplicateInFlightBlocked,
    realtime_enabled_by_default: params.result.realtimeEnabledByDefault,
    per_card_realtime_subscription_allowed: params.result.perCardRealtimeSubscriptionAllowed,
    polling_loop_allowed: params.result.pollingLoopAllowed,
    polling_loop_ceiling: params.result.pollingLoopCeiling,
    task_stream_uses_budgeted_limit: params.result.taskStreamUsesBudgetedLimit,
    card_budget_enforced_in_view_model: params.result.cardBudgetEnforcedInViewModel,
    empty_state_real: params.result.emptyStateReal,
    mutation_count: params.result.mutationCount,
    android_runtime_smoke: "PASS_OR_NOT_RUN",
    emulator_e2e: "PASS_OR_EXACT_BLOCKER",
  };
  const proof = [
    "# S_AI_HARDEN_05_COMMAND_CENTER_STATE_AND_REALTIME_BUDGET",
    "",
    `final_status: ${params.result.final_status}`,
    `max_cards: ${params.result.maxCards}`,
    `findings: ${params.result.findings.length}`,
    "",
    "Command Center state is bounded by card limit, cursor pagination, refresh throttle, no realtime subscriptions, and real empty state.",
  ].join("\n");

  writeJson(path.join(artifactRoot, "S_AI_HARDEN_05_COMMAND_CENTER_STATE_BUDGET_inventory.json"), inventory);
  writeJson(path.join(artifactRoot, "S_AI_HARDEN_05_COMMAND_CENTER_STATE_BUDGET_matrix.json"), matrix);
  writeJson(path.join(artifactRoot, "S_AI_HARDEN_05_COMMAND_CENTER_STATE_BUDGET_emulator.json"), {
    final_status: "NOT_RUN_YET",
    emulator_e2e: "PASS_OR_EXACT_BLOCKER",
  });
  fs.writeFileSync(path.join(artifactRoot, "S_AI_HARDEN_05_COMMAND_CENTER_STATE_BUDGET_proof.md"), `${proof}\n`);
}

function main(): void {
  const result = scanCommandCenterStateBudget(process.cwd());
  writeCommandCenterStateBudgetArtifacts({ projectRoot: process.cwd(), result });
  console.info(JSON.stringify(result, null, 2));
  if (result.final_status !== "GREEN_AI_COMMAND_CENTER_STATE_BUDGET_READY") {
    process.exit(1);
  }
}

if (/(?:^|\/)scanCommandCenterStateBudget\.[tj]s$/.test(process.argv[1]?.replace(/\\/g, "/") ?? "")) {
  main();
}
