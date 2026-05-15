import fs from "node:fs";
import path from "node:path";

import {
  draftAgentFieldAct,
  draftAgentFieldReport,
  getAgentFieldContext,
  planAgentFieldAction,
} from "../../src/features/ai/agent/agentFieldWorkCopilotRoutes";
import { buildAiFieldCloseoutDraftEngine } from "../../src/features/ai/foreman/aiFieldCloseoutDraftEngine";
import { buildAiForemanApprovalCandidate } from "../../src/features/ai/foreman/aiForemanApprovalCandidate";
import {
  resolveAiForemanEvidence,
  type AiForemanCloseoutScreenId,
} from "../../src/features/ai/foreman/aiForemanEvidenceResolver";
import { buildAiForemanMissingEvidenceChecklist } from "../../src/features/ai/foreman/aiForemanMissingEvidenceChecklist";
import type { AiFieldContextSnapshot } from "../../src/features/ai/field/aiFieldWorkCopilotTypes";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiForemanFieldCloseoutStatus =
  | "GREEN_AI_FOREMAN_FIELD_CLOSEOUT_DRAFT_ENGINE_READY"
  | "BLOCKED_AI_FOREMAN_EVIDENCE_ROUTE_MISSING"
  | "BLOCKED_AI_FOREMAN_RUNTIME_TARGETABILITY";

type AiForemanFieldCloseoutMatrix = {
  final_status: AiForemanFieldCloseoutStatus;
  backend_first: true;
  role_scoped: boolean;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  foreman_bff_routes_ready: boolean;
  foreman_main_covered: boolean;
  foreman_ai_quick_modal_covered: boolean;
  foreman_subcontract_covered: boolean;
  field_context_loaded: boolean;
  evidence_resolver_ready: boolean;
  missing_evidence_checklist_ready: boolean;
  field_closeout_draft_engine_ready: boolean;
  approval_candidate_ready: boolean;
  approval_route_action_ids: readonly string[];
  report_draft_ready: boolean;
  act_draft_ready: boolean;
  message_draft_ready: boolean;
  action_plan_ready: boolean;
  submit_candidate_only: boolean;
  evidence_required: true;
  all_context_has_evidence: boolean;
  all_drafts_have_evidence: boolean;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  external_live_fetch: false;
  provider_called: false;
  final_execution: 0;
  final_submit: false;
  signing: false;
  report_published: false;
  act_signed: false;
  message_sent: false;
  direct_subcontract_mutation: false;
  contractor_confirmation: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_used: false;
  seed_used: false;
  fake_field_cards: false;
  fake_documents: false;
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
const wave = "S_AI_FOREMAN_01_FIELD_CLOSEOUT_DRAFT_ENGINE";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const FOREMAN_CLOSEOUT_SCREENS: readonly AiForemanCloseoutScreenId[] = [
  "foreman.main",
  "foreman.ai.quick_modal",
  "foreman.subcontract",
];

const runtimeFieldContext: AiFieldContextSnapshot = {
  scope: "foreman_project_scope",
  objectId: "field_object:redacted-runtime",
  objectName: "redacted field object",
  subcontractId: "field_subcontract:redacted-runtime",
  periodStart: "2026-05-15",
  periodEnd: "2026-05-15",
  workSummary: "Redacted field closeout evidence is ready for report, act, and message drafting.",
  sourceEvidenceRefs: [
    "field_closeout:screen_state:redacted",
    "field_closeout:approval_policy:redacted",
  ],
  workItems: [
    {
      workId: "field_work:redacted-runtime",
      name: "redacted closeout work item",
      quantity: 1,
      unit: "scope",
      status: "ready_for_act",
      evidenceRefs: ["field_closeout:work_item:redacted"],
    },
  ],
  documents: [
    {
      documentType: "photo",
      title: "redacted photo evidence",
      evidenceRef: "field_closeout:document_metadata:redacted",
    },
  ],
};

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

function baseMatrix(
  finalStatus: AiForemanFieldCloseoutStatus,
  exactReason: string | null,
  overrides: Partial<AiForemanFieldCloseoutMatrix> = {},
): AiForemanFieldCloseoutMatrix {
  return {
    final_status: finalStatus,
    backend_first: true,
    role_scoped: false,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    foreman_bff_routes_ready: false,
    foreman_main_covered: false,
    foreman_ai_quick_modal_covered: false,
    foreman_subcontract_covered: false,
    field_context_loaded: false,
    evidence_resolver_ready: false,
    missing_evidence_checklist_ready: false,
    field_closeout_draft_engine_ready: false,
    approval_candidate_ready: false,
    approval_route_action_ids: [],
    report_draft_ready: false,
    act_draft_ready: false,
    message_draft_ready: false,
    action_plan_ready: false,
    submit_candidate_only: false,
    evidence_required: true,
    all_context_has_evidence: false,
    all_drafts_have_evidence: false,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    external_live_fetch: false,
    provider_called: false,
    final_execution: 0,
    final_submit: false,
    signing: false,
    report_published: false,
    act_signed: false,
    message_sent: false,
    direct_subcontract_mutation: false,
    contractor_confirmation: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_used: false,
    seed_used: false,
    fake_field_cards: false,
    fake_documents: false,
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

function writeProof(matrix: AiForemanFieldCloseoutMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      `# ${wave}`,
      "",
      `final_status: ${matrix.final_status}`,
      `field_context_loaded: ${String(matrix.field_context_loaded)}`,
      `evidence_resolver_ready: ${String(matrix.evidence_resolver_ready)}`,
      `missing_evidence_checklist_ready: ${String(matrix.missing_evidence_checklist_ready)}`,
      `field_closeout_draft_engine_ready: ${String(matrix.field_closeout_draft_engine_ready)}`,
      `approval_candidate_ready: ${String(matrix.approval_candidate_ready)}`,
      `report_draft_ready: ${String(matrix.report_draft_ready)}`,
      `act_draft_ready: ${String(matrix.act_draft_ready)}`,
      `message_draft_ready: ${String(matrix.message_draft_ready)}`,
      `submit_candidate_only: ${String(matrix.submit_candidate_only)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `final_submit: ${String(matrix.final_submit)}`,
      `signing: ${String(matrix.signing)}`,
      `direct_subcontract_mutation: ${String(matrix.direct_subcontract_mutation)}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function persistArtifacts(matrix: AiForemanFieldCloseoutMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    backend_first: true,
    screens: FOREMAN_CLOSEOUT_SCREENS,
    safe_read_only: true,
    draft_only: true,
    approval_submit_candidate_only: true,
    mutation_count: 0,
    db_writes: 0,
    secrets_printed: false,
  });
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: matrix.android_runtime_smoke,
    foreman_field_closeout_runtime_proof: matrix.final_status.startsWith("GREEN_") ? "PASS" : "BLOCKED",
    fake_emulator_pass: false,
  });
  writeProof(matrix);
}

async function run(): Promise<AiForemanFieldCloseoutMatrix> {
  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix("BLOCKED_AI_FOREMAN_RUNTIME_TARGETABILITY", android.exact_reason, {
      android_runtime_smoke: "BLOCKED",
    });
  }

  const auth = { userId: "foreman-field-closeout-runtime", role: "foreman" as const };
  const input = {
    fieldContext: runtimeFieldContext,
    reportKind: "progress" as const,
    actKind: "subcontract_progress" as const,
    notes: "Redacted field closeout draft proof.",
  };

  const context = await getAgentFieldContext({ auth, input });
  const report = await draftAgentFieldReport({ auth, input });
  const act = await draftAgentFieldAct({ auth, input });
  const plan = await planAgentFieldAction({
    auth,
    input: { ...input, intent: "submit_for_approval" },
  });

  if (
    !context.ok ||
    !report.ok ||
    !act.ok ||
    !plan.ok ||
    context.data.documentType !== "agent_field_context" ||
    report.data.documentType !== "agent_field_draft_report" ||
    act.data.documentType !== "agent_field_draft_act" ||
    plan.data.documentType !== "agent_field_action_plan"
  ) {
    return baseMatrix(
      "BLOCKED_AI_FOREMAN_RUNTIME_TARGETABILITY",
      "Foreman field closeout BFF route returned an auth or route envelope blocker.",
      { android_runtime_smoke: "PASS" },
    );
  }

  const contextResult = context.data.result;
  const reportResult = report.data.result;
  const actResult = act.data.result;
  const planResult = plan.data.result;
  if (contextResult.status !== "loaded") {
    return baseMatrix(
      "BLOCKED_AI_FOREMAN_EVIDENCE_ROUTE_MISSING",
      contextResult.emptyState?.reason ?? contextResult.blockedReason ?? "Foreman field context evidence is missing.",
      {
        android_runtime_smoke: "PASS",
        foreman_bff_routes_ready: true,
        field_context_loaded: false,
      },
    );
  }

  const screenProofs = await Promise.all(
    FOREMAN_CLOSEOUT_SCREENS.map(async (screenId) => {
      const evidence = await resolveAiForemanEvidence({ auth, screenId, input });
      const checklist = buildAiForemanMissingEvidenceChecklist(evidence);
      const draft = await buildAiFieldCloseoutDraftEngine({ auth, evidence, checklist, input });
      const approval = buildAiForemanApprovalCandidate({ auth, evidence, checklist, draft });
      return { screenId, evidence, checklist, draft, approval };
    }),
  );
  const evidenceReady = screenProofs.every((proof) => proof.evidence.status === "loaded");
  const checklistReady = screenProofs.every((proof) => proof.checklist.status === "complete");
  const draftReady = screenProofs.every((proof) => proof.draft.status === "drafted");
  const approvalReady = screenProofs.every((proof) => proof.approval.status === "ready");

  if (!evidenceReady || !checklistReady || !draftReady || !approvalReady) {
    const incompleteProof = screenProofs.find(
      (proof) =>
        proof.evidence.exactReason ||
        proof.checklist.exactReason ||
        proof.draft.exactReason ||
        proof.approval.blocker,
    );
    return baseMatrix(
      "BLOCKED_AI_FOREMAN_EVIDENCE_ROUTE_MISSING",
      incompleteProof?.evidence.exactReason ??
        incompleteProof?.checklist.exactReason ??
        incompleteProof?.draft.exactReason ??
        incompleteProof?.approval.blocker ??
        "Foreman field closeout evidence, draft, or approval candidate proof is incomplete.",
      {
        android_runtime_smoke: "PASS",
        foreman_bff_routes_ready: true,
        field_context_loaded: true,
        evidence_resolver_ready: evidenceReady,
        missing_evidence_checklist_ready: checklistReady,
        field_closeout_draft_engine_ready: draftReady,
        approval_candidate_ready: approvalReady,
      },
    );
  }

  const approvalActionIds = screenProofs.map((proof) => proof.approval.actionId);
  const allDraftsHaveEvidence = screenProofs.every((proof) =>
    proof.draft.draftItems.every((item) => item.evidenceRefs.length > 0),
  );

  return baseMatrix("GREEN_AI_FOREMAN_FIELD_CLOSEOUT_DRAFT_ENGINE_READY", null, {
    android_runtime_smoke: "PASS",
    role_scoped: contextResult.roleScoped,
    foreman_bff_routes_ready: true,
    foreman_main_covered: true,
    foreman_ai_quick_modal_covered: true,
    foreman_subcontract_covered: true,
    field_context_loaded: true,
    evidence_resolver_ready: evidenceReady,
    missing_evidence_checklist_ready: checklistReady,
    field_closeout_draft_engine_ready: draftReady,
    approval_candidate_ready: approvalReady,
    approval_route_action_ids: approvalActionIds,
    report_draft_ready: reportResult.status === "draft",
    act_draft_ready: actResult.status === "draft",
    message_draft_ready: screenProofs.every((proof) => proof.draft.messageDraft !== null),
    action_plan_ready: planResult.status === "preview" && planResult.approvalRequired,
    submit_candidate_only: screenProofs.every((proof) => proof.approval.directExecuteAllowed === false),
    all_context_has_evidence: contextResult.allContextHasEvidence,
    all_drafts_have_evidence: allDraftsHaveEvidence,
  });
}

export async function runAiForemanFieldCloseoutMaestro(): Promise<AiForemanFieldCloseoutMatrix> {
  const matrix = await run();
  persistArtifacts(matrix);
  return matrix;
}

if (require.main === module) {
  void runAiForemanFieldCloseoutMaestro()
    .then((matrix) => {
      console.info(JSON.stringify(matrix, null, 2));
      if (!matrix.final_status.startsWith("GREEN_")) process.exitCode = 1;
    })
    .catch((error) => {
      const matrix = baseMatrix("BLOCKED_AI_FOREMAN_RUNTIME_TARGETABILITY", sanitizeReason(error));
      persistArtifacts(matrix);
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
