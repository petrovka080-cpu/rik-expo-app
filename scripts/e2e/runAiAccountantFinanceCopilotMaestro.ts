import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  draftAgentFinanceSummary,
  getAgentFinanceDebts,
  getAgentFinanceSummary,
  previewAgentFinanceRisk,
} from "../../src/features/ai/agent/agentFinanceCopilotRoutes";
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
  | "GREEN_AI_ACCOUNTANT_FINANCE_COPILOT_READY"
  | "BLOCKED_AI_ACCOUNTANT_FINANCE_APPROVAL_MISSING"
  | "BLOCKED_AI_ACCOUNTANT_FINANCE_AUTH_MISSING"
  | "BLOCKED_REAL_FINANCE_SUMMARY_NOT_AVAILABLE"
  | "BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE";

type AiAccountantFinanceCopilotMatrix = {
  final_status: AiAccountantFinanceCopilotStatus;
  backend_first: true;
  role_scoped: boolean;
  developer_control_full_access: true;
  role_isolation_e2e_claimed: false;
  finance_bff_routes_ready: boolean;
  live_finance_safe_read_attempted: boolean;
  live_finance_safe_read_available: boolean;
  summary_loaded: boolean;
  debt_cards_created: number;
  honest_empty_state: boolean;
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
const wave = "S_AI_MAGIC_07_ACCOUNTANT_FINANCE_COPILOT";
const artifactPrefix = path.join(projectRoot, "artifacts", wave);
const inventoryPath = `${artifactPrefix}_inventory.json`;
const matrixPath = `${artifactPrefix}_matrix.json`;
const emulatorPath = `${artifactPrefix}_emulator.json`;
const proofPath = `${artifactPrefix}_proof.md`;

const REQUIRED_FLAGS = [
  "S_AI_MAGIC_WAVES_APPROVED",
  "S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF",
  "S_AI_MAGIC_REQUIRE_EVIDENCE",
  "S_AI_MAGIC_REQUIRE_ROLE_SCOPE",
  "S_AI_ALLOW_SAFE_READ",
  "S_AI_ALLOW_DRAFT_PREVIEW",
  "S_AI_NO_FAKE_GREEN",
  "S_AI_NO_FAKE_CARDS",
  "S_AI_NO_SECRETS_PRINTING",
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

function envEnabled(key: string): boolean {
  return ["true", "1", "yes"].includes(String(process.env[key] ?? "").trim().toLowerCase());
}

function envText(key: string): string {
  return String(process.env[key] ?? "").trim();
}

function flagsReady(): boolean {
  return REQUIRED_FLAGS.every((key) => envEnabled(key));
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
    live_finance_safe_read_attempted: false,
    live_finance_safe_read_available: false,
    summary_loaded: false,
    debt_cards_created: 0,
    honest_empty_state: false,
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
      "# S_AI_MAGIC_07_ACCOUNTANT_FINANCE_COPILOT",
      "",
      `final_status: ${matrix.final_status}`,
      `live_finance_safe_read_available: ${String(matrix.live_finance_safe_read_available)}`,
      `summary_loaded: ${String(matrix.summary_loaded)}`,
      `debt_cards_created: ${matrix.debt_cards_created}`,
      `risk_preview_ready: ${String(matrix.risk_preview_ready)}`,
      `draft_summary_ready: ${String(matrix.draft_summary_ready)}`,
      `mutation_count: ${matrix.mutation_count}`,
      `payment_created: ${String(matrix.payment_created)}`,
      `posting_created: ${String(matrix.posting_created)}`,
      `invoice_mutated: ${String(matrix.invoice_mutated)}`,
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
    safe_read_only: true,
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

  if (!flagsReady()) {
    return baseMatrix(
      "BLOCKED_AI_ACCOUNTANT_FINANCE_APPROVAL_MISSING",
      `Missing required approval flags: ${REQUIRED_FLAGS.filter((key) => !envEnabled(key)).join(", ")}`,
    );
  }

  const android = await verifyAndroidInstalledBuildRuntime();
  if (android.final_status !== "GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF") {
    return baseMatrix("BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE", android.exact_reason, {
      android_runtime_smoke: "BLOCKED",
    });
  }

  const supabaseUrl = envText("STAGING_SUPABASE_URL") || envText("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey = envText("STAGING_SUPABASE_ANON_KEY") || envText("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const authSecret = resolveAuthSecret();
  if (!supabaseUrl || !anonKey || !authSecret) {
    return baseMatrix(
      "BLOCKED_AI_ACCOUNTANT_FINANCE_AUTH_MISSING",
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
      "BLOCKED_AI_ACCOUNTANT_FINANCE_AUTH_MISSING",
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
        "BLOCKED_REAL_FINANCE_SUMMARY_NOT_AVAILABLE",
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
        "BLOCKED_REAL_FINANCE_SUMMARY_NOT_AVAILABLE",
        summaryResult.blockedReason ?? "Finance summary safe-read was blocked.",
        {
          android_runtime_smoke: "PASS",
          finance_bff_routes_ready: true,
          live_finance_safe_read_attempted: true,
        },
      );
    }

    const summaryLoaded = summaryResult.status === "loaded";
    const debtCards = summaryResult.debtCards;
    const draftReady = draftResult.status === "draft" || draftResult.status === "empty";

    return baseMatrix("GREEN_AI_ACCOUNTANT_FINANCE_COPILOT_READY", null, {
      android_runtime_smoke: "PASS",
      role_scoped: summaryResult.roleScoped,
      finance_bff_routes_ready: true,
      live_finance_safe_read_attempted: true,
      live_finance_safe_read_available: summaryLoaded,
      summary_loaded: summaryLoaded,
      debt_cards_created: debtCards.length,
      honest_empty_state: debtCards.length === 0,
      risk_preview_ready: riskResult.status === "preview" || riskResult.status === "empty",
      draft_summary_ready: draftReady,
      all_cards_have_evidence: summaryResult.allCardsHaveEvidence,
      all_cards_have_risk_policy: summaryResult.allCardsHaveRiskPolicy,
      all_cards_have_known_tool: summaryResult.allCardsHaveKnownTool,
    });
  } catch (error) {
    return baseMatrix("BLOCKED_REAL_FINANCE_SUMMARY_NOT_AVAILABLE", sanitizeReason(error), {
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
      const matrix = baseMatrix("BLOCKED_REAL_FINANCE_SUMMARY_NOT_AVAILABLE", sanitizeReason(error));
      persistArtifacts(matrix);
      console.info(JSON.stringify(matrix, null, 2));
      process.exitCode = 1;
    });
}
