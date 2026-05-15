import fs from "node:fs";
import path from "node:path";

import {
  AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS,
  listAiScreenButtonRoleActionEntries,
} from "../../src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry";
import { buildAiScreenAuditSummary } from "../../src/features/ai/screenAudit/aiScreenAuditSummary";
import type { AiScreenAuditSummary } from "../../src/features/ai/screenAudit/aiScreenButtonRoleActionTypes";

export const AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE =
  "S_AI_AUDIT_02_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP" as const;

const projectRoot = process.cwd();
const artifactPrefix = path.join(
  projectRoot,
  "artifacts",
  AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE,
);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

export type AiAllScreenButtonRoleActionMapMatrix = {
  wave: typeof AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE;
  final_status: AiScreenAuditSummary["finalStatus"];
  exact_reason?: string;
  screens_audited: number;
  actions_audited: number;
  roles_covered: readonly string[];
  safe_read_opportunities: number;
  draft_only_opportunities: number;
  approval_required_opportunities: number;
  forbidden_actions: number;
  missing_bff_routes: number;
  unsafe_direct_mutation_paths: number;
  route_missing_or_not_registered: readonly string[];
  fake_ai_cards_added: false;
  ui_changed: false;
  hooks_added: false;
  db_writes_used: false;
  provider_called: false;
  secrets_printed: false;
  raw_rows_printed: false;
  fake_green_claimed: false;
};

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildMatrix(summary: AiScreenAuditSummary): AiAllScreenButtonRoleActionMapMatrix {
  return {
    wave: AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE,
    final_status: summary.finalStatus,
    ...(summary.exactReason ? { exact_reason: summary.exactReason } : {}),
    screens_audited: summary.screensAudited,
    actions_audited: summary.actionsAudited,
    roles_covered: summary.rolesCovered,
    safe_read_opportunities: summary.safeReadOpportunities,
    draft_only_opportunities: summary.draftOnlyOpportunities,
    approval_required_opportunities: summary.approvalRequiredOpportunities,
    forbidden_actions: summary.forbiddenActions,
    missing_bff_routes: summary.missingBffRoutes,
    unsafe_direct_mutation_paths: summary.unsafeDirectMutationPaths,
    route_missing_or_not_registered: summary.routeMissingScreens,
    fake_ai_cards_added: false,
    ui_changed: false,
    hooks_added: false,
    db_writes_used: false,
    provider_called: false,
    secrets_printed: false,
    raw_rows_printed: false,
    fake_green_claimed: false,
  };
}

function writeProof(summary: AiScreenAuditSummary): void {
  fs.writeFileSync(
    proofPath,
    [
      "# S_AI_AUDIT_02_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP",
      "",
      `final_status: ${summary.finalStatus}`,
      `screens_audited: ${summary.screensAudited}`,
      `actions_audited: ${summary.actionsAudited}`,
      `roles_covered: ${summary.rolesCovered.join(", ")}`,
      `safe_read_opportunities: ${summary.safeReadOpportunities}`,
      `draft_only_opportunities: ${summary.draftOnlyOpportunities}`,
      `approval_required_opportunities: ${summary.approvalRequiredOpportunities}`,
      `forbidden_actions: ${summary.forbiddenActions}`,
      `missing_bff_routes: ${summary.missingBffRoutes}`,
      `unsafe_direct_mutation_paths: ${summary.unsafeDirectMutationPaths}`,
      `route_missing_or_not_registered: ${summary.routeMissingScreens.join(", ") || "none"}`,
      "fake_ai_cards_added: false",
      "ui_changed: false",
      "hooks_added: false",
      "db_writes_used: false",
      "provider_called: false",
      "secrets_printed: false",
      "raw_rows_printed: false",
      "fake_green_claimed: false",
      summary.exactReason ? `exact_reason: ${summary.exactReason}` : "exact_reason: null",
      "",
    ].join("\n"),
    "utf8",
  );
}

export function writeAiAllScreenButtonRoleActionMapArtifacts(): AiAllScreenButtonRoleActionMapMatrix {
  const entries = listAiScreenButtonRoleActionEntries();
  const summary = buildAiScreenAuditSummary(entries);
  const matrix = buildMatrix(summary);

  writeJson(inventoryPath, {
    wave: AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE,
    registry: "src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry.ts",
    classifiers: [
      "src/features/ai/screenAudit/aiScreenButtonOpportunityClassifier.ts",
      "src/features/ai/screenAudit/aiScreenForbiddenActionPolicy.ts",
      "src/features/ai/screenAudit/aiScreenBffCoverageClassifier.ts",
    ],
    required_screens: AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS,
    summary,
    entries,
    fake_ai_cards_added: false,
    ui_changed: false,
    hooks_added: false,
    db_writes_used: false,
    provider_called: false,
    secrets_printed: false,
    raw_rows_printed: false,
  });

  writeJson(matrixPath, matrix);
  writeJson(emulatorPath, {
    wave: AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_WAVE,
    final_status: summary.ok
      ? "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY"
      : "BLOCKED_SCREEN_BUTTON_AUDIT_INCOMPLETE",
    emulator_targetability: {
      targetable: entries.filter((entry) => entry.emulatorTargetability === "targetable").length,
      not_targeted_yet: entries.filter((entry) => entry.emulatorTargetability === "not_targeted_yet").length,
      route_missing: entries.filter((entry) => entry.emulatorTargetability === "route_missing").length,
      blocked_runtime: entries.filter((entry) => entry.emulatorTargetability === "blocked_runtime").length,
    },
    key_ai_surfaces_targetable: ["ai.command_center", "approval.inbox", "procurement.copilot", "screen.runtime"].every(
      (screenId) =>
        entries.some((entry) => entry.screenId === screenId && entry.emulatorTargetability === "targetable"),
    ),
    android_runtime_smoke: "NOT_RUN",
    fake_emulator_pass: false,
    provider_called: false,
    db_writes_used: false,
    secrets_printed: false,
  });
  writeProof(summary);

  return matrix;
}

if (require.main === module) {
  try {
    const matrix = writeAiAllScreenButtonRoleActionMapArtifacts();
    console.info(JSON.stringify(matrix, null, 2));
    if (matrix.final_status !== "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY") {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
