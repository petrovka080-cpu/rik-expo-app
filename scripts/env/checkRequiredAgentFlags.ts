import fs from "node:fs";
import path from "node:path";

export const REQUIRED_AGENT_OWNER_FLAGS = [
  "S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED",
  "S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED",
  "S_AI_ACTION_LEDGER_MIGRATION_APPLY_APPROVED",
  "S_AI_ACTION_LEDGER_MIGRATION_VERIFY_APPROVED",
  "S_AI_ACTION_LEDGER_MIGRATION_ROLLBACK_PLAN_APPROVED",
] as const;

export const REQUIRED_E2E_ROLE_USER_FLAGS = [
  "E2E_DIRECTOR_EMAIL",
  "E2E_DIRECTOR_PASSWORD",
  "E2E_FOREMAN_EMAIL",
  "E2E_FOREMAN_PASSWORD",
  "E2E_BUYER_EMAIL",
  "E2E_BUYER_PASSWORD",
  "E2E_ACCOUNTANT_EMAIL",
  "E2E_ACCOUNTANT_PASSWORD",
  "E2E_CONTRACTOR_EMAIL",
  "E2E_CONTRACTOR_PASSWORD",
] as const;

export const REQUIRED_E2E_RUNTIME_FIXTURE_FLAGS = [
  "E2E_PROCUREMENT_REQUEST_REF",
  "E2E_PENDING_APPROVAL_ACTION_REF",
  "E2E_APPROVED_PROCUREMENT_ACTION_REF",
  "E2E_WAREHOUSE_ITEM_REF",
  "E2E_FINANCE_COMPANY_REF",
  "E2E_CONTRACTOR_OWN_SUBCONTRACT_REF",
  "E2E_ROLE_MODE",
] as const;

export type RequiredAgentFlagSource = "process" | ".env.agent.staging.local" | "missing";

export type RequiredAgentFlagStatus = {
  key: string;
  present: boolean;
  enabled: boolean;
  source: RequiredAgentFlagSource;
};

export type RequiredAgentFlagsReport = {
  status: "GREEN_EXPLICIT_ENV_OWNER_GATES_NORMALIZED" | "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING";
  ownerFlags: RequiredAgentFlagStatus[];
  roleUserFlags: RequiredAgentFlagStatus[];
  runtimeFixtureFlags: RequiredAgentFlagStatus[];
  missingOwnerFlags: string[];
  missingRoleUserFlags: string[];
  missingRuntimeFixtureFlags: string[];
  valuesPrinted: false;
  secretsPrinted: false;
  envFileReadMode: "key_presence_only";
};

type EnvLike = Record<string, string | undefined>;

type ParsedEnvFile = Map<string, string>;

function parseEnvLine(rawLine: string): { key: string; value: string } | null {
  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) {
    return null;
  }

  const rawValue = match[2].trim();
  const value =
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ? rawValue.slice(1, -1)
      : rawValue;

  return { key: match[1], value };
}

export function parseAgentEnvFileValues(envFilePath: string): ParsedEnvFile {
  const parsed = new Map<string, string>();
  if (!fs.existsSync(envFilePath)) {
    return parsed;
  }

  const source = fs.readFileSync(envFilePath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const parsedLine = parseEnvLine(line);
    if (parsedLine) {
      parsed.set(parsedLine.key, parsedLine.value);
    }
  }

  return parsed;
}

export function isAgentFlagEnabled(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function resolveFlagStatus(
  key: string,
  env: EnvLike,
  agentEnv: ParsedEnvFile,
): RequiredAgentFlagStatus {
  const processValue = env[key];
  if (processValue != null && String(processValue).trim() !== "") {
    return {
      key,
      present: true,
      enabled: isAgentFlagEnabled(processValue),
      source: "process",
    };
  }

  if (agentEnv.has(key)) {
    const fileValue = agentEnv.get(key);
    return {
      key,
      present: true,
      enabled: isAgentFlagEnabled(fileValue),
      source: ".env.agent.staging.local",
    };
  }

  return {
    key,
    present: false,
    enabled: false,
    source: "missing",
  };
}

export function loadAgentOwnerFlagsIntoEnv(
  env: EnvLike = process.env,
  projectRoot = process.cwd(),
): void {
  const agentEnv = parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"));
  for (const key of REQUIRED_AGENT_OWNER_FLAGS) {
    if ((env[key] == null || String(env[key]).trim() === "") && agentEnv.has(key)) {
      env[key] = agentEnv.get(key);
    }
  }
}

export function buildRequiredAgentFlagsReport(
  env: EnvLike = process.env,
  projectRoot = process.cwd(),
): RequiredAgentFlagsReport {
  const agentEnv = parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"));
  const ownerFlags = REQUIRED_AGENT_OWNER_FLAGS.map((key) => resolveFlagStatus(key, env, agentEnv));
  const roleUserFlags = REQUIRED_E2E_ROLE_USER_FLAGS.map((key) => resolveFlagStatus(key, env, agentEnv));
  const runtimeFixtureFlags = REQUIRED_E2E_RUNTIME_FIXTURE_FLAGS.map((key) =>
    resolveFlagStatus(key, env, agentEnv),
  );
  const missingOwnerFlags = ownerFlags
    .filter((flag) => !flag.present || !flag.enabled)
    .map((flag) => flag.key);
  const missingRoleUserFlags = roleUserFlags
    .filter((flag) => !flag.present)
    .map((flag) => flag.key);
  const missingRuntimeFixtureFlags = runtimeFixtureFlags
    .filter((flag) => !flag.present)
    .map((flag) => flag.key);

  return {
    status:
      missingOwnerFlags.length === 0
        ? "GREEN_EXPLICIT_ENV_OWNER_GATES_NORMALIZED"
        : "BLOCKED_REQUIRED_OWNER_FLAGS_MISSING",
    ownerFlags,
    roleUserFlags,
    runtimeFixtureFlags,
    missingOwnerFlags,
    missingRoleUserFlags,
    missingRuntimeFixtureFlags,
    valuesPrinted: false,
    secretsPrinted: false,
    envFileReadMode: "key_presence_only",
  };
}

function main(): void {
  const json = process.argv.includes("--json");
  const report = buildRequiredAgentFlagsReport();

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(`${report.status}\n`);
    if (report.missingOwnerFlags.length > 0) {
      process.stdout.write(`Missing owner flags: ${report.missingOwnerFlags.join(", ")}\n`);
    }
    if (report.missingRuntimeFixtureFlags.length > 0) {
      process.stdout.write(`Missing runtime fixture flags: ${report.missingRuntimeFixtureFlags.join(", ")}\n`);
    }
  }

  process.exitCode = report.status === "GREEN_EXPLICIT_ENV_OWNER_GATES_NORMALIZED" ? 0 : 2;
}

if (require.main === module) {
  main();
}
