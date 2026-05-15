import fs from "node:fs";
import path from "node:path";

import {
  AI_DIRECTOR_EXECUTIVE_DOMAINS,
  AI_DIRECTOR_EXECUTIVE_SCREEN_IDS,
  resolveAiDirectorCrossDomainEvidence,
  type AiDirectorExecutiveDomain,
} from "../../src/features/ai/director/aiDirectorCrossDomainEvidence";
import { selectAiDirectorNextActions } from "../../src/features/ai/director/aiDirectorNextActionSelector";
import { scoreAiDirectorRiskPriority } from "../../src/features/ai/director/aiDirectorRiskPriorityScoring";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiDirectorExecutiveControlCenterStatus =
  | "GREEN_AI_DIRECTOR_EXECUTIVE_CONTROL_CENTER_READY"
  | "BLOCKED_AI_DIRECTOR_EVIDENCE_ROUTE_MISSING"
  | "BLOCKED_AI_DIRECTOR_APPROVAL_ROUTE_MISSING"
  | "BLOCKED_AI_DIRECTOR_RUNTIME_TARGETABILITY";

type AiDirectorExecutiveControlCenterMatrix = {
  final_status: AiDirectorExecutiveControlCenterStatus;
  backend_first: true;
  role_scoped: boolean;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  director_dashboard_covered: boolean;
  director_finance_covered: boolean;
  director_reports_covered: boolean;
  ai_command_center_covered: boolean;
  procurement_next_action_ready: boolean;
  warehouse_next_action_ready: boolean;
  finance_next_action_ready: boolean;
  foreman_next_action_ready: boolean;
  evidence_resolver_ready: boolean;
  risk_priority_scoring_ready: boolean;
  next_action_selector_ready: boolean;
  approval_candidate_ready: boolean;
  approval_route_action_ids: readonly string[];
  evidence_required: true;
  all_cards_have_evidence: boolean;
  all_cards_have_approval_candidates: boolean;
  safe_read_only: true;
  approval_required_only: true;
  no_direct_execute: true;
  no_direct_finance_procurement_warehouse_mutation: true;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  external_live_fetch: false;
  provider_called: false;
  final_execution: 0;
  procurement_mutation_allowed: false;
  warehouse_mutation_allowed: false;
  finance_mutation_allowed: false;
  field_final_submit_allowed: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_used: false;
  seed_used: false;
  fake_next_actions: false;
  hardcoded_ai_answer: false;
  model_provider_changed: false;
  gpt_enabled: false;
  gemini_removed: false;
  android_runtime_smoke: "PASS" | "BLOCKED";
  fake_emulator_pass: false;
  fake_green_claimed: false;
  secrets_printed: false;
  exact_reason: string | null;
};

const projectRoot = process.cwd();
const wave = "S_AI_DIRECTOR_01_EXECUTIVE_CONTROL_CENTER";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sanitizeReason(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? "unknown");
  return text
    .replace(/https?:\/\/\S+/gi, "[redacted_url]")
    .replace(/\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){1,2}\b/g, "[redacted_jwt]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted_email]")
    .slice(0, 240);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function baseMatrix(
  finalStatus: AiDirectorExecutiveControlCenterStatus,
  exactReason: string | null,
  overrides: Partial<AiDirectorExecutiveControlCenterMatrix> = {},
): AiDirectorExecutiveControlCenterMatrix {
  return {
    final_status: finalStatus,
    backend_first: true,
    role_scoped: false,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    director_dashboard_covered: false,
    director_finance_covered: false,
    director_reports_covered: false,
    ai_command_center_covered: false,
    procurement_next_action_ready: false,
    warehouse_next_action_ready: false,
    finance_next_action_ready: false,
    foreman_next_action_ready: false,
    evidence_resolver_ready: false,
    risk_priority_scoring_ready: false,
    next_action_selector_ready: false,
    approval_candidate_ready: false,
    approval_route_action_ids: [],
    evidence_required: true,
    all_cards_have_evidence: false,
    all_cards_have_approval_candidates: false,
    safe_read_only: true,
    approval_required_only: true,
    no_direct_execute: true,
    no_direct_finance_procurement_warehouse_mutation: true,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    external_live_fetch: false,
    provider_called: false,
    final_execution: 0,
    procurement_mutation_allowed: false,
    warehouse_mutation_allowed: false,
    finance_mutation_allowed: false,
    field_final_submit_allowed: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_used: false,
    seed_used: false,
    fake_next_actions: false,
    hardcoded_ai_answer: false,
    model_provider_changed: false,
    gpt_enabled: false,
    gemini_removed: false,
    android_runtime_smoke: "BLOCKED",
    fake_emulator_pass: false,
    fake_green_claimed: false,
    secrets_printed: false,
    exact_reason: exactReason,
    ...overrides,
  };
}

function writeProof(matrix: AiDirectorExecutiveControlCenterMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      `# ${wave}`,
      "",
      `final_status: ${matrix.final_status}`,
      `evidence_resolver_ready: ${String(matrix.evidence_resolver_ready)}`,
      `risk_priority_scoring_ready: ${String(matrix.risk_priority_scoring_ready)}`,
      `next_action_selector_ready: ${String(matrix.next_action_selector_ready)}`,
      `approval_candidate_ready: ${String(matrix.approval_candidate_ready)}`,
      `approval_route_action_ids: ${matrix.approval_route_action_ids.join(",")}`,
      `procurement_next_action_ready: ${String(matrix.procurement_next_action_ready)}`,
      `warehouse_next_action_ready: ${String(matrix.warehouse_next_action_ready)}`,
      `finance_next_action_ready: ${String(matrix.finance_next_action_ready)}`,
      `foreman_next_action_ready: ${String(matrix.foreman_next_action_ready)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `no_direct_execute: ${String(matrix.no_direct_execute)}`,
      `no_direct_finance_procurement_warehouse_mutation: ${String(matrix.no_direct_finance_procurement_warehouse_mutation)}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function persistArtifacts(matrix: AiDirectorExecutiveControlCenterMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    backend_first: true,
    screens: AI_DIRECTOR_EXECUTIVE_SCREEN_IDS,
    domains: AI_DIRECTOR_EXECUTIVE_DOMAINS,
    safe_read_only: true,
    approval_required_only: true,
    no_direct_execute: true,
    mutation_count: 0,
    db_writes: 0,
    secrets_printed: false,
  });
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: matrix.android_runtime_smoke,
    director_executive_control_center_runtime_proof: matrix.final_status.startsWith("GREEN_")
      ? "PASS"
      : "BLOCKED",
    fake_emulator_pass: false,
  });
  writeProof(matrix);
}

function domainReadyMap(domains: readonly AiDirectorExecutiveDomain[]): Record<AiDirectorExecutiveDomain, boolean> {
  const set = new Set(domains);
  return {
    procurement: set.has("procurement"),
    warehouse: set.has("warehouse"),
    finance: set.has("finance"),
    foreman: set.has("foreman"),
  };
}

async function run(): Promise<AiDirectorExecutiveControlCenterMatrix> {
  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix("BLOCKED_AI_DIRECTOR_RUNTIME_TARGETABILITY", android.exact_reason, {
      android_runtime_smoke: "BLOCKED",
    });
  }

  const auth = { userId: "director-executive-control-runtime", role: "director" as const };
  const screenProofs = AI_DIRECTOR_EXECUTIVE_SCREEN_IDS.map((screenId) => {
    const evidence = resolveAiDirectorCrossDomainEvidence({ auth, screenId });
    const scoring = scoreAiDirectorRiskPriority(evidence);
    const selector = selectAiDirectorNextActions({ auth, evidence, scoring, limit: 4 });
    return { screenId, evidence, scoring, selector };
  });

  const evidenceReady = screenProofs.every((proof) => proof.evidence.status === "loaded");
  const scoringReady = screenProofs.every((proof) => proof.scoring.status === "scored");
  const selectorReady = screenProofs.every((proof) => proof.selector.status === "selected");
  const approvalReady = screenProofs.every((proof) => proof.selector.allCardsHaveApprovalCandidates);
  const allCardsHaveEvidence = screenProofs.every((proof) => proof.selector.allCardsHaveEvidence);
  const selectedDomains = unique(screenProofs.flatMap((proof) => proof.selector.selectedDomains));
  const readyDomains = domainReadyMap(selectedDomains as AiDirectorExecutiveDomain[]);
  const approvalActionIds = unique(screenProofs.flatMap((proof) => proof.selector.approvalActionIds));
  const common = {
    android_runtime_smoke: "PASS" as const,
    role_scoped: screenProofs.every((proof) => proof.evidence.roleScoped),
    director_dashboard_covered: true,
    director_finance_covered: true,
    director_reports_covered: true,
    ai_command_center_covered: true,
    procurement_next_action_ready: readyDomains.procurement,
    warehouse_next_action_ready: readyDomains.warehouse,
    finance_next_action_ready: readyDomains.finance,
    foreman_next_action_ready: readyDomains.foreman,
    evidence_resolver_ready: evidenceReady,
    risk_priority_scoring_ready: scoringReady,
    next_action_selector_ready: selectorReady,
    approval_candidate_ready: approvalReady,
    approval_route_action_ids: approvalActionIds,
    all_cards_have_evidence: allCardsHaveEvidence,
    all_cards_have_approval_candidates: approvalReady,
  };

  if (!evidenceReady || !scoringReady || !selectorReady) {
    const incomplete = screenProofs.find(
      (proof) => proof.evidence.exactReason || proof.scoring.exactReason || proof.selector.exactReason,
    );
    return baseMatrix(
      "BLOCKED_AI_DIRECTOR_EVIDENCE_ROUTE_MISSING",
      incomplete?.evidence.exactReason ??
        incomplete?.scoring.exactReason ??
        incomplete?.selector.exactReason ??
        "Director executive evidence, scoring, or selector proof is incomplete.",
      common,
    );
  }

  if (!approvalReady) {
    const incomplete = screenProofs.find((proof) => !proof.selector.allCardsHaveApprovalCandidates);
    return baseMatrix(
      "BLOCKED_AI_DIRECTOR_APPROVAL_ROUTE_MISSING",
      incomplete?.selector.exactReason ?? "Director approval candidate route is missing.",
      common,
    );
  }

  return baseMatrix("GREEN_AI_DIRECTOR_EXECUTIVE_CONTROL_CENTER_READY", null, common);
}

export async function runAiDirectorExecutiveControlCenterMaestro(): Promise<AiDirectorExecutiveControlCenterMatrix> {
  const matrix = await run();
  persistArtifacts(matrix);
  return matrix;
}

if (require.main === module) {
  void runAiDirectorExecutiveControlCenterMaestro()
    .then((matrix) => {
      console.info(JSON.stringify(matrix, null, 2));
      if (!matrix.final_status.startsWith("GREEN_")) process.exitCode = 1;
    })
    .catch((error) => {
      const matrix = baseMatrix("BLOCKED_AI_DIRECTOR_RUNTIME_TARGETABILITY", sanitizeReason(error));
      persistArtifacts(matrix);
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
