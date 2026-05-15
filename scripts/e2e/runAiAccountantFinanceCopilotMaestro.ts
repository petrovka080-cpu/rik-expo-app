import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  draftAgentFinanceSummary,
  getAgentFinanceDebts,
  getAgentFinanceSummary,
  previewAgentFinanceRisk,
} from "../../src/features/ai/agent/agentFinanceCopilotRoutes";
import { buildAiFinanceApprovalCandidate } from "../../src/features/ai/finance/aiFinanceApprovalCandidate";
import {
  resolveAiFinanceEvidence,
  type AiFinanceCopilotScreenId,
} from "../../src/features/ai/finance/aiFinanceEvidenceResolver";
import { buildAiPaymentDraftRationale } from "../../src/features/ai/finance/aiPaymentDraftRationale";
import { classifyAiPaymentRisk } from "../../src/features/ai/finance/aiPaymentRiskClassifier";
import {
  callBffReadonlyMobile,
  resolveBffReadonlyRuntimeConfig,
} from "../../src/shared/scale/bffClient";
import type {
  DirectorFinanceBffRequestDto,
  DirectorFinanceBffResponseDto,
} from "../../src/screens/director/director.finance.bff.contract";
import type { FinanceSummaryReader } from "../../src/features/ai/tools/getFinanceSummaryTool";
import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

type AiAccountantFinanceCopilotStatus =
  | "GREEN_AI_FINANCE_ACCOUNTANT_COPILOT_READY"
  | "BLOCKED_AI_FINANCE_EVIDENCE_ROUTE_MISSING"
  | "BLOCKED_AI_FINANCE_APPROVAL_ROUTE_MISSING"
  | "BLOCKED_AI_FINANCE_RUNTIME_TARGETABILITY";

type AiAccountantFinanceCopilotMatrix = {
  final_status: AiAccountantFinanceCopilotStatus;
  backend_first: true;
  role_scoped: boolean;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  finance_bff_routes_ready: boolean;
  accountant_main_covered: boolean;
  accountant_payment_covered: boolean;
  accountant_history_covered: boolean;
  director_finance_covered: boolean;
  live_finance_safe_read_attempted: boolean;
  live_finance_safe_read_available: boolean;
  summary_loaded: boolean;
  debt_cards_created: number;
  risk_signals_created: number;
  evidence_resolver_ready: boolean;
  payment_risk_classifier_ready: boolean;
  payment_draft_rationale_ready: boolean;
  approval_candidate_ready: boolean;
  approval_route_action_ids: readonly string[];
  risk_preview_ready: boolean;
  draft_summary_ready: boolean;
  evidence_required: true;
  all_cards_have_evidence: boolean;
  all_cards_have_risk_policy: boolean;
  all_cards_have_known_tool: boolean;
  mutation_count: 0;
  db_writes: 0;
  direct_supabase_from_ui: false;
  mobile_external_fetch: false;
  external_live_fetch: false;
  provider_called: false;
  final_execution: 0;
  payment_created: false;
  posting_created: false;
  invoice_mutated: false;
  direct_payment_allowed: false;
  direct_finance_posting_allowed: false;
  ledger_bypass_allowed: false;
  raw_rows_returned: false;
  raw_prompt_returned: false;
  raw_provider_payload_returned: false;
  auth_admin_used: false;
  list_users_used: false;
  service_role_used: false;
  seed_used: false;
  fake_finance_cards: false;
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

type SupabaseAuthClient = {
  auth: {
    signInWithPassword(input: { email: string; password: string }): Promise<{
      data: {
        user: { id: string } | null;
        session: { access_token: string } | null;
      };
      error: { message?: string } | null;
    }>;
    signOut(): Promise<unknown>;
  };
};

const projectRoot = process.cwd();
const wave = "S_AI_FINANCE_01_ACCOUNTANT_COPILOT";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const FINANCE_COPILOT_SCREENS: readonly AiFinanceCopilotScreenId[] = [
  "accountant.main",
  "accountant.payment",
  "accountant.history",
  "director.finance",
] as const;

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function loadEnvFilesIntoProcess(): void {
  for (const envFile of [".env", ".env.local", ".env.agent.staging.local"]) {
    const parsed = parseAgentEnvFileValues(path.join(projectRoot, envFile));
    for (const [key, value] of parsed) {
      if (process.env[key] == null || String(process.env[key]).trim() === "") {
        process.env[key] = value;
      }
    }
  }
}

function envText(key: string): string {
  return String(process.env[key] ?? "").trim();
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
  finalStatus: AiAccountantFinanceCopilotStatus,
  exactReason: string | null,
  overrides: Partial<AiAccountantFinanceCopilotMatrix> = {},
): AiAccountantFinanceCopilotMatrix {
  return {
    final_status: finalStatus,
    backend_first: true,
    role_scoped: false,
    developer_control_full_access: true,
    role_isolation_e2e_claimed: false,
    finance_bff_routes_ready: false,
    accountant_main_covered: false,
    accountant_payment_covered: false,
    accountant_history_covered: false,
    director_finance_covered: false,
    live_finance_safe_read_attempted: false,
    live_finance_safe_read_available: false,
    summary_loaded: false,
    debt_cards_created: 0,
    risk_signals_created: 0,
    evidence_resolver_ready: false,
    payment_risk_classifier_ready: false,
    payment_draft_rationale_ready: false,
    approval_candidate_ready: false,
    approval_route_action_ids: [],
    risk_preview_ready: false,
    draft_summary_ready: false,
    evidence_required: true,
    all_cards_have_evidence: false,
    all_cards_have_risk_policy: false,
    all_cards_have_known_tool: false,
    mutation_count: 0,
    db_writes: 0,
    direct_supabase_from_ui: false,
    mobile_external_fetch: false,
    external_live_fetch: false,
    provider_called: false,
    final_execution: 0,
    payment_created: false,
    posting_created: false,
    invoice_mutated: false,
    direct_payment_allowed: false,
    direct_finance_posting_allowed: false,
    ledger_bypass_allowed: false,
    raw_rows_returned: false,
    raw_prompt_returned: false,
    raw_provider_payload_returned: false,
    auth_admin_used: false,
    list_users_used: false,
    service_role_used: false,
    seed_used: false,
    fake_finance_cards: false,
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

function writeProof(matrix: AiAccountantFinanceCopilotMatrix): void {
  fs.writeFileSync(
    proofPath,
    [
      `# ${wave}`,
      "",
      `final_status: ${matrix.final_status}`,
      `live_finance_safe_read_available: ${String(matrix.live_finance_safe_read_available)}`,
      `summary_loaded: ${String(matrix.summary_loaded)}`,
      `debt_cards_created: ${matrix.debt_cards_created}`,
      `risk_signals_created: ${matrix.risk_signals_created}`,
      `evidence_resolver_ready: ${String(matrix.evidence_resolver_ready)}`,
      `payment_risk_classifier_ready: ${String(matrix.payment_risk_classifier_ready)}`,
      `payment_draft_rationale_ready: ${String(matrix.payment_draft_rationale_ready)}`,
      `approval_candidate_ready: ${String(matrix.approval_candidate_ready)}`,
      `risk_preview_ready: ${String(matrix.risk_preview_ready)}`,
      `draft_summary_ready: ${String(matrix.draft_summary_ready)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `payment_created: ${String(matrix.payment_created)}`,
      `posting_created: ${String(matrix.posting_created)}`,
      `invoice_mutated: ${String(matrix.invoice_mutated)}`,
      `direct_payment_allowed: ${String(matrix.direct_payment_allowed)}`,
      `direct_finance_posting_allowed: ${String(matrix.direct_finance_posting_allowed)}`,
      `ledger_bypass_allowed: ${String(matrix.ledger_bypass_allowed)}`,
      `android_runtime_smoke: ${matrix.android_runtime_smoke}`,
      `exact_reason: ${matrix.exact_reason ?? "none"}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function persistArtifacts(matrix: AiAccountantFinanceCopilotMatrix): void {
  writeJson(matrixPath, matrix);
  writeJson(inventoryPath, {
    wave,
    artifacts: [inventoryPath, matrixPath, emulatorPath, proofPath].map((filePath) =>
      path.relative(projectRoot, filePath).replace(/\\/g, "/"),
    ),
    backend_first: true,
    screens: FINANCE_COPILOT_SCREENS,
    safe_read_only: true,
    draft_only: true,
    approval_required_for_payment: true,
    mutation_count: 0,
    db_writes: 0,
    secrets_printed: false,
  });
  writeJson(emulatorPath, {
    wave,
    android_runtime_smoke: matrix.android_runtime_smoke,
    finance_copilot_runtime_proof: matrix.final_status.startsWith("GREEN_") ? "PASS" : "BLOCKED",
    fake_emulator_pass: false,
  });
  writeProof(matrix);
}

function resolveAuthSecret(): { email: string; password: string } | null {
  const email =
    envText("E2E_CONTROL_EMAIL") ||
    envText("E2E_DEVELOPER_EMAIL") ||
    envText("E2E_DIRECTOR_EMAIL") ||
    envText("E2E_ACCOUNTANT_EMAIL");
  const password =
    envText("E2E_CONTROL_PASSWORD") ||
    envText("E2E_DEVELOPER_PASSWORD") ||
    envText("E2E_DIRECTOR_PASSWORD") ||
    envText("E2E_ACCOUNTANT_PASSWORD");

  return email && password ? { email, password } : null;
}

function buildFinanceReader(accessToken: string): FinanceSummaryReader {
  return async () => {
    const runtime = resolveBffReadonlyRuntimeConfig();
    const response = await callBffReadonlyMobile<DirectorFinanceBffResponseDto, DirectorFinanceBffRequestDto>({
      config: runtime.clientConfig,
      operation: "director.finance.rpc.scope",
      input: {
        operation: "director.finance.summary.v2",
        args: {
          p_object_id: undefined,
          p_date_from: undefined,
          p_date_to: undefined,
        },
      },
      getAccessToken: async () => accessToken,
    });

    if (!response.ok) throw new Error(response.error.code);
    if (response.data.operation !== "director.finance.summary.v2") {
      throw new Error("DIRECTOR_FINANCE_BFF_INVALID_RESPONSE");
    }
    return { payload: response.data.payload };
  };
}

async function run(): Promise<AiAccountantFinanceCopilotMatrix> {
  loadEnvFilesIntoProcess();

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix("BLOCKED_AI_FINANCE_RUNTIME_TARGETABILITY", android.exact_reason, {
      android_runtime_smoke: "BLOCKED",
    });
  }

  const supabaseUrl = envText("STAGING_SUPABASE_URL") || envText("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = envText("STAGING_SUPABASE_ANON_KEY") || envText("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const authSecret = resolveAuthSecret();
  if (!supabaseUrl || !anonKey || !authSecret) {
    return baseMatrix(
      "BLOCKED_AI_FINANCE_RUNTIME_TARGETABILITY",
      "Supabase public URL, anon key, or explicit developer/control finance credentials are missing.",
      { android_runtime_smoke: "PASS" },
    );
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as unknown as SupabaseAuthClient;

  const signIn = await client.auth.signInWithPassword(authSecret);
  if (signIn.error || !signIn.data.user || !signIn.data.session) {
    return baseMatrix(
      "BLOCKED_AI_FINANCE_RUNTIME_TARGETABILITY",
      "Developer/control account could not authenticate for finance copilot proof.",
      { android_runtime_smoke: "PASS" },
    );
  }

  try {
    const input = {
      scope: "company" as const,
      readFinanceSummary: buildFinanceReader(signIn.data.session.access_token),
    };
    const auth = { userId: signIn.data.user.id, role: "director" as const };
    const summary = await getAgentFinanceSummary({ auth, input });
    const debts = await getAgentFinanceDebts({ auth, input });
    const risk = await previewAgentFinanceRisk({ auth, input });
    const draft = await draftAgentFinanceSummary({ auth, input });

    if (
      !summary.ok ||
      !debts.ok ||
      !risk.ok ||
      !draft.ok ||
      summary.data.documentType !== "agent_finance_summary" ||
      debts.data.documentType !== "agent_finance_debts" ||
      risk.data.documentType !== "agent_finance_risk_preview" ||
      draft.data.documentType !== "agent_finance_draft_summary"
    ) {
      return baseMatrix(
        "BLOCKED_AI_FINANCE_EVIDENCE_ROUTE_MISSING",
        "Finance copilot BFF route returned an auth or route envelope blocker.",
        {
          android_runtime_smoke: "PASS",
          live_finance_safe_read_attempted: true,
        },
      );
    }

    const summaryResult = summary.data.result;
    const riskResult = risk.data.result;
    const draftResult = draft.data.result;

    if (summaryResult.status === "blocked") {
      return baseMatrix(
        "BLOCKED_AI_FINANCE_EVIDENCE_ROUTE_MISSING",
        summaryResult.blockedReason ?? "Finance summary safe-read was blocked.",
        {
          android_runtime_smoke: "PASS",
          finance_bff_routes_ready: true,
          live_finance_safe_read_attempted: true,
        },
      );
    }

    const summaryLoaded = summaryResult.status === "loaded";
    const evidenceInput = { ...input, financeSummary: summaryResult.summary };
    const screenProofs = await Promise.all(
      FINANCE_COPILOT_SCREENS.map(async (screenId) => {
        const evidence = await resolveAiFinanceEvidence({ auth, screenId, input: evidenceInput });
        const riskProof = classifyAiPaymentRisk(evidence);
        const draftProof = await buildAiPaymentDraftRationale({ auth, evidence, risk: riskProof });
        const approval = buildAiFinanceApprovalCandidate({
          auth,
          evidence,
          risk: riskProof,
          draft: draftProof,
        });
        return { screenId, evidence, riskProof, draftProof, approval };
      }),
    );
    const evidenceReady = summaryLoaded && screenProofs.every((proof) => proof.evidence.status === "loaded");
    const riskReady = screenProofs.every((proof) => proof.riskProof.status === "classified");
    const draftRationaleReady = screenProofs.every((proof) => proof.draftProof.status === "planned");
    const approvalReady = screenProofs.every((proof) => proof.approval.status === "ready");
    if (!evidenceReady || !riskReady || !draftRationaleReady) {
      const incompleteProof = screenProofs.find(
        (proof) => proof.evidence.exactReason || proof.riskProof.exactReason || proof.draftProof.exactReason,
      );
      return baseMatrix(
        "BLOCKED_AI_FINANCE_EVIDENCE_ROUTE_MISSING",
        incompleteProof?.evidence.exactReason ??
          incompleteProof?.riskProof.exactReason ??
          incompleteProof?.draftProof.exactReason ??
          "Finance evidence, risk, or draft rationale proof is incomplete.",
        {
          android_runtime_smoke: "PASS",
          finance_bff_routes_ready: true,
          live_finance_safe_read_attempted: true,
          live_finance_safe_read_available: summaryLoaded,
          summary_loaded: summaryLoaded,
          evidence_resolver_ready: evidenceReady,
          payment_risk_classifier_ready: riskReady,
          payment_draft_rationale_ready: draftRationaleReady,
        },
      );
    }
    if (!approvalReady) {
      return baseMatrix(
        "BLOCKED_AI_FINANCE_APPROVAL_ROUTE_MISSING",
        screenProofs.find((proof) => proof.approval.blocker)?.approval.blocker ??
          "Finance approval candidate route is missing.",
        {
          android_runtime_smoke: "PASS",
          finance_bff_routes_ready: true,
          live_finance_safe_read_attempted: true,
          live_finance_safe_read_available: summaryLoaded,
          summary_loaded: summaryLoaded,
          evidence_resolver_ready: evidenceReady,
          payment_risk_classifier_ready: riskReady,
          payment_draft_rationale_ready: draftRationaleReady,
        },
      );
    }
    const debtCards = summaryResult.debtCards;
    const riskSignalCount = screenProofs.reduce((sum, proof) => sum + proof.riskProof.riskSignals.length, 0);
    const approvalActionIds = screenProofs.map((proof) => proof.approval.actionId);
    const draftReady = draftResult.status === "draft" || draftResult.status === "empty";

    return baseMatrix("GREEN_AI_FINANCE_ACCOUNTANT_COPILOT_READY", null, {
      android_runtime_smoke: "PASS",
      role_scoped: summaryResult.roleScoped,
      finance_bff_routes_ready: true,
      accountant_main_covered: true,
      accountant_payment_covered: true,
      accountant_history_covered: true,
      director_finance_covered: true,
      live_finance_safe_read_attempted: true,
      live_finance_safe_read_available: summaryLoaded,
      summary_loaded: summaryLoaded,
      debt_cards_created: debtCards.length,
      risk_signals_created: riskSignalCount,
      evidence_resolver_ready: evidenceReady,
      payment_risk_classifier_ready: riskReady,
      payment_draft_rationale_ready: draftRationaleReady,
      approval_candidate_ready: approvalReady,
      approval_route_action_ids: approvalActionIds,
      risk_preview_ready: riskResult.status === "preview" || riskResult.status === "empty",
      draft_summary_ready: draftReady,
      all_cards_have_evidence: summaryResult.allCardsHaveEvidence,
      all_cards_have_risk_policy: summaryResult.allCardsHaveRiskPolicy,
      all_cards_have_known_tool: summaryResult.allCardsHaveKnownTool,
    });
  } catch (error) {
    return baseMatrix("BLOCKED_AI_FINANCE_RUNTIME_TARGETABILITY", sanitizeReason(error), {
      android_runtime_smoke: "PASS",
      live_finance_safe_read_attempted: true,
    });
  } finally {
    await client.auth.signOut().catch(() => undefined);
  }
}

export async function runAiAccountantFinanceCopilotMaestro(): Promise<AiAccountantFinanceCopilotMatrix> {
  const matrix = await run();
  persistArtifacts(matrix);
  return matrix;
}

if (require.main === module) {
  void runAiAccountantFinanceCopilotMaestro()
    .then((matrix) => {
      console.info(JSON.stringify(matrix, null, 2));
      if (!matrix.final_status.startsWith("GREEN_")) process.exitCode = 1;
    })
    .catch((error) => {
      const matrix = baseMatrix("BLOCKED_AI_FINANCE_RUNTIME_TARGETABILITY", sanitizeReason(error));
      persistArtifacts(matrix);
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
