import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

export const EXTERNAL_LIVE_PROOF_CLOSEOUT_WAVE =
  "S_FINAL_50K_92_EXTERNAL_LIVE_PROOF_CLOSEOUT";
export const EXTERNAL_LIVE_PROOF_CLOSEOUT_ARTIFACT =
  "S_FINAL_50K_92_SCORE_external_live_closeout.json";
export const EXTERNAL_LIVE_PROOF_CLOSEOUT_PROOF =
  "S_FINAL_50K_92_SCORE_external_live_closeout.md";

const RLS_DATABASE_URL_ENV = "SUPABASE_RLS_PROOF_DATABASE_URL";
const RLS_OPT_IN_ENV = "ALLOW_RLS_DYNAMIC_MUTATION_PROOF";
const WHOLE_APP_DATABASE_URL_ENVS = [
  "WHOLE_APP_50K_DATABASE_URL",
  "SUPABASE_WHOLE_APP_50K_DATABASE_URL",
] as const;
const WHOLE_APP_OPT_IN_ENV = "ALLOW_WHOLE_APP_50K_LIVE_PROOF";

export type ExternalLiveProofStepPlan = {
  id: "rls_dynamic_cross_tenant" | "whole_app_50k_explain_p95" | "final_50k_92_reaudit";
  runner: string;
  mode: "live" | "blocked_preflight" | "reaudit";
  required_env_present: boolean;
  opt_in_present: boolean;
  missing_requirements: string[];
};

export type ExternalLiveProofCloseoutPlan = {
  wave: typeof EXTERNAL_LIVE_PROOF_CLOSEOUT_WAVE;
  generated_at: string;
  rls_database_url_present: boolean;
  rls_mutation_opt_in_present: boolean;
  whole_app_50k_database_url_present: boolean;
  whole_app_50k_live_opt_in_present: boolean;
  steps: ExternalLiveProofStepPlan[];
  missing_requirements: string[];
  can_run_all_live_proofs: boolean;
  fake_green_claimed: false;
};

export type ExternalLiveProofStepResult = ExternalLiveProofStepPlan & {
  exit_code: number | null;
  status: "passed" | "blocked" | "failed" | "not_run";
  stdout_tail: string;
  stderr_tail: string;
};

export type ExternalLiveProofCloseoutResult = Omit<ExternalLiveProofCloseoutPlan, "steps"> & {
  strict: boolean;
  after_gates: boolean;
  steps: ExternalLiveProofStepResult[];
  final_matrix: Record<string, unknown>;
  final_status: string;
  external_blockers: unknown[];
  green_ready: boolean;
};

type EnvLike = Record<string, string | undefined>;

function envHasValue(env: EnvLike, name: string): boolean {
  return Boolean(String(env[name] ?? "").trim());
}

export function loadAuditEnvFiles(rootDir = ROOT, env: EnvLike = process.env): void {
  for (const relativePath of [".env.local", ".env"]) {
    const fullPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
      const value = trimmed.slice(trimmed.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in env)) env[key] = value;
    }
  }
}

export function redactLiveProofOutput(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
    .replace(/password=[^&\s]+/gi, "password=[redacted]")
    .replace(/(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|EXPO_PUBLIC_SUPABASE_ANON_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY)=\S+/gi, "$1=[redacted]")
    .replace(/(apikey|access_token|refresh_token|service_role|authorization)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[redacted-jwt]")
    .replace(/connect\s+(ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH)\s+\S+/gi, "connect $1 [redacted-host]")
    .replace(/getaddrinfo\s+(ENOTFOUND|EAI_AGAIN)\s+\S+/gi, "getaddrinfo $1 [redacted-host]")
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}:\d+\b/g, "[redacted-host]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/g, "[redacted-phone]")
    .slice(-2500);
}

function step(
  id: ExternalLiveProofStepPlan["id"],
  runner: string,
  mode: ExternalLiveProofStepPlan["mode"],
  requiredEnvPresent: boolean,
  optInPresent: boolean,
  missingRequirements: string[],
): ExternalLiveProofStepPlan {
  return {
    id,
    runner,
    mode,
    required_env_present: requiredEnvPresent,
    opt_in_present: optInPresent,
    missing_requirements: missingRequirements,
  };
}

export function buildExternalLiveProofCloseoutPlan(
  env: EnvLike = process.env,
): ExternalLiveProofCloseoutPlan {
  const rlsDatabaseUrlPresent = envHasValue(env, RLS_DATABASE_URL_ENV);
  const rlsMutationOptInPresent = env[RLS_OPT_IN_ENV] === "1";
  const wholeApp50kDatabaseUrlPresent = WHOLE_APP_DATABASE_URL_ENVS.some((name) => envHasValue(env, name));
  const wholeApp50kLiveOptInPresent = env[WHOLE_APP_OPT_IN_ENV] === "1";

  const rlsMissing = [
    ...(!rlsDatabaseUrlPresent ? [RLS_DATABASE_URL_ENV] : []),
    ...(!rlsMutationOptInPresent ? [`${RLS_OPT_IN_ENV}=1`] : []),
  ];
  const wholeAppMissing = [
    ...(!wholeApp50kDatabaseUrlPresent ? ["WHOLE_APP_50K_DATABASE_URL or SUPABASE_WHOLE_APP_50K_DATABASE_URL"] : []),
    ...(!wholeApp50kLiveOptInPresent ? [`${WHOLE_APP_OPT_IN_ENV}=1`] : []),
  ];

  const steps = [
    step(
      "rls_dynamic_cross_tenant",
      rlsMissing.length === 0
        ? "scripts/audit/runRlsDynamicCrossTenantLiveProof.ts"
        : "scripts/audit/runRlsDynamicCrossTenantProof.ts",
      rlsMissing.length === 0 ? "live" : "blocked_preflight",
      rlsDatabaseUrlPresent,
      rlsMutationOptInPresent,
      rlsMissing,
    ),
    step(
      "whole_app_50k_explain_p95",
      wholeAppMissing.length === 0
        ? "scripts/e2e/runWholeApp50kExplainP95LiveProof.ts"
        : "scripts/e2e/runWholeApp50kExplainP95Proof.ts",
      wholeAppMissing.length === 0 ? "live" : "blocked_preflight",
      wholeApp50kDatabaseUrlPresent,
      wholeApp50kLiveOptInPresent,
      wholeAppMissing,
    ),
    step(
      "final_50k_92_reaudit",
      "scripts/audit/runFinal50k92ScoreReaudit.ts",
      "reaudit",
      true,
      true,
      [],
    ),
  ];
  const missingRequirements = [...rlsMissing, ...wholeAppMissing];

  return {
    wave: EXTERNAL_LIVE_PROOF_CLOSEOUT_WAVE,
    generated_at: new Date().toISOString(),
    rls_database_url_present: rlsDatabaseUrlPresent,
    rls_mutation_opt_in_present: rlsMutationOptInPresent,
    whole_app_50k_database_url_present: wholeApp50kDatabaseUrlPresent,
    whole_app_50k_live_opt_in_present: wholeApp50kLiveOptInPresent,
    steps,
    missing_requirements: missingRequirements,
    can_run_all_live_proofs: missingRequirements.length === 0,
    fake_green_claimed: false,
  };
}

export function readFinal50k92Matrix(rootDir = ROOT): Record<string, unknown> {
  const filePath = path.join(rootDir, "artifacts", "S_FINAL_50K_92_SCORE_matrix.json");
  if (!fs.existsSync(filePath)) return {};
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};
}

export function writeExternalLiveProofCloseoutArtifacts(
  result: ExternalLiveProofCloseoutResult,
  rootDir = ROOT,
): void {
  fs.mkdirSync(path.join(rootDir, "artifacts"), { recursive: true });
  fs.writeFileSync(
    path.join(rootDir, "artifacts", EXTERNAL_LIVE_PROOF_CLOSEOUT_ARTIFACT),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(rootDir, "artifacts", EXTERNAL_LIVE_PROOF_CLOSEOUT_PROOF),
    [
      `# ${EXTERNAL_LIVE_PROOF_CLOSEOUT_WAVE}`,
      "",
      `Status: ${result.final_status}`,
      `Green ready: ${result.green_ready}`,
      `Can run all live proofs: ${result.can_run_all_live_proofs}`,
      "",
      "Missing requirements:",
      ...(result.missing_requirements.length > 0
        ? result.missing_requirements.map((requirement) => `- ${requirement}`)
        : ["- none"]),
      "",
      "Step results:",
      ...result.steps.map((item) => `- ${item.id}: ${item.status} (${item.runner})`),
      "",
      "Fake green claimed: false",
      "",
    ].join("\n"),
    "utf8",
  );
}
