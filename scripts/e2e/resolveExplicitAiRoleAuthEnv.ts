import path from "node:path";

import { parseAgentEnvFileValues } from "../env/checkRequiredAgentFlags";

export type ExplicitAiRoleName = "director" | "foreman" | "buyer" | "accountant" | "contractor";

export type E2ERoleMode = "separate_roles" | "developer_control_full_access";

export type ExplicitAiRoleAuthSource = "explicit_env" | "developer_control_explicit_env" | "missing";
type EnvLike = Record<string, string | undefined>;

export type ExplicitAiRoleSecretKey =
  | "E2E_DIRECTOR_EMAIL"
  | "E2E_DIRECTOR_PASSWORD"
  | "E2E_FOREMAN_EMAIL"
  | "E2E_FOREMAN_PASSWORD"
  | "E2E_BUYER_EMAIL"
  | "E2E_BUYER_PASSWORD"
  | "E2E_ACCOUNTANT_EMAIL"
  | "E2E_ACCOUNTANT_PASSWORD"
  | "E2E_CONTRACTOR_EMAIL"
  | "E2E_CONTRACTOR_PASSWORD"
  | "E2E_CONTROL_EMAIL"
  | "E2E_CONTROL_PASSWORD"
  | "E2E_DEVELOPER_EMAIL"
  | "E2E_DEVELOPER_PASSWORD";

type ExplicitRoleConfig = {
  role: ExplicitAiRoleName;
  emailKey: ExplicitAiRoleSecretKey;
  passwordKey: ExplicitAiRoleSecretKey;
};

export type ExplicitAiRoleAuthResolution = {
  source: ExplicitAiRoleAuthSource;
  auth_source: ExplicitAiRoleAuthSource;
  roleMode: E2ERoleMode;
  greenEligible: boolean;
  allRolesResolved: boolean;
  blockedStatus: "BLOCKED_NO_E2E_ROLE_SECRETS" | "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING" | null;
  env: Record<ExplicitAiRoleSecretKey, string> | null;
  missingKeys: readonly ExplicitAiRoleSecretKey[];
  rolesResolved: readonly ExplicitAiRoleName[];
  roleIsolationClaimed: boolean;
  role_isolation_e2e_claimed: boolean;
  fullAccessRuntimeClaimed: boolean;
  full_access_runtime_claimed: boolean;
  separateRoleUsersRequired: boolean;
  separate_role_users_required: boolean;
  auth_admin_used: false;
  list_users_used: false;
  serviceRoleUsed: false;
  seed_used: false;
  fake_users_created: false;
  exactReason: string | null;
};

export const EXPLICIT_AI_ROLE_AUTH_CONFIG: readonly ExplicitRoleConfig[] = [
  {
    role: "director",
    emailKey: "E2E_DIRECTOR_EMAIL",
    passwordKey: "E2E_DIRECTOR_PASSWORD",
  },
  {
    role: "foreman",
    emailKey: "E2E_FOREMAN_EMAIL",
    passwordKey: "E2E_FOREMAN_PASSWORD",
  },
  {
    role: "buyer",
    emailKey: "E2E_BUYER_EMAIL",
    passwordKey: "E2E_BUYER_PASSWORD",
  },
  {
    role: "accountant",
    emailKey: "E2E_ACCOUNTANT_EMAIL",
    passwordKey: "E2E_ACCOUNTANT_PASSWORD",
  },
  {
    role: "contractor",
    emailKey: "E2E_CONTRACTOR_EMAIL",
    passwordKey: "E2E_CONTRACTOR_PASSWORD",
  },
];

export function getExplicitAiRoleSecretKeys(): readonly ExplicitAiRoleSecretKey[] {
  return EXPLICIT_AI_ROLE_AUTH_CONFIG.flatMap((entry) => [entry.emailKey, entry.passwordKey]);
}

export function getDeveloperControlSecretKeys(): readonly ExplicitAiRoleSecretKey[] {
  return [
    "E2E_CONTROL_EMAIL",
    "E2E_CONTROL_PASSWORD",
    "E2E_DEVELOPER_EMAIL",
    "E2E_DEVELOPER_PASSWORD",
    "E2E_DIRECTOR_EMAIL",
    "E2E_DIRECTOR_PASSWORD",
  ];
}

function readEnvValue(
  env: EnvLike,
  agentEnv: ReadonlyMap<string, string>,
  key: ExplicitAiRoleSecretKey,
): string | null {
  const value = String(env[key] ?? agentEnv.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function resolveRoleMode(env: EnvLike, agentEnv: ReadonlyMap<string, string>): E2ERoleMode {
  const raw = String(env.E2E_ROLE_MODE ?? agentEnv.get("E2E_ROLE_MODE") ?? "separate_roles").trim();
  return raw === "developer_control_full_access" ? "developer_control_full_access" : "separate_roles";
}

function readAgentEnvForDefaultCall(
  env: EnvLike,
  projectRoot: string,
): ReadonlyMap<string, string> {
  return env === process.env
    ? parseAgentEnvFileValues(path.join(projectRoot, ".env.agent.staging.local"))
    : new Map<string, string>();
}

function emptyResolvedEnv(): Record<ExplicitAiRoleSecretKey, string> {
  return {
    E2E_DIRECTOR_EMAIL: "",
    E2E_DIRECTOR_PASSWORD: "",
    E2E_FOREMAN_EMAIL: "",
    E2E_FOREMAN_PASSWORD: "",
    E2E_BUYER_EMAIL: "",
    E2E_BUYER_PASSWORD: "",
    E2E_ACCOUNTANT_EMAIL: "",
    E2E_ACCOUNTANT_PASSWORD: "",
    E2E_CONTRACTOR_EMAIL: "",
    E2E_CONTRACTOR_PASSWORD: "",
    E2E_CONTROL_EMAIL: "",
    E2E_CONTROL_PASSWORD: "",
    E2E_DEVELOPER_EMAIL: "",
    E2E_DEVELOPER_PASSWORD: "",
  };
}

function buildDeveloperControlEnv(params: {
  email: string;
  password: string;
  developerEmail: string;
  developerPassword: string;
}): Record<ExplicitAiRoleSecretKey, string> {
  return {
    E2E_DIRECTOR_EMAIL: params.email,
    E2E_DIRECTOR_PASSWORD: params.password,
    E2E_FOREMAN_EMAIL: params.email,
    E2E_FOREMAN_PASSWORD: params.password,
    E2E_BUYER_EMAIL: params.email,
    E2E_BUYER_PASSWORD: params.password,
    E2E_ACCOUNTANT_EMAIL: params.email,
    E2E_ACCOUNTANT_PASSWORD: params.password,
    E2E_CONTRACTOR_EMAIL: params.email,
    E2E_CONTRACTOR_PASSWORD: params.password,
    E2E_CONTROL_EMAIL: params.email,
    E2E_CONTROL_PASSWORD: params.password,
    E2E_DEVELOPER_EMAIL: params.developerEmail,
    E2E_DEVELOPER_PASSWORD: params.developerPassword,
  };
}

export function resolveExplicitAiRoleAuthEnv(
  env: EnvLike = process.env,
  projectRoot = process.cwd(),
): ExplicitAiRoleAuthResolution {
  const agentEnv = readAgentEnvForDefaultCall(env, projectRoot);
  const roleMode = resolveRoleMode(env, agentEnv);
  const resolvedEnv = emptyResolvedEnv();

  if (roleMode === "developer_control_full_access") {
    const controlEmail =
      readEnvValue(env, agentEnv, "E2E_CONTROL_EMAIL") ??
      readEnvValue(env, agentEnv, "E2E_DEVELOPER_EMAIL") ??
      readEnvValue(env, agentEnv, "E2E_DIRECTOR_EMAIL");
    const controlPassword =
      readEnvValue(env, agentEnv, "E2E_CONTROL_PASSWORD") ??
      readEnvValue(env, agentEnv, "E2E_DEVELOPER_PASSWORD") ??
      readEnvValue(env, agentEnv, "E2E_DIRECTOR_PASSWORD");
    const missingKeys: ExplicitAiRoleSecretKey[] = [];

    if (!controlEmail) missingKeys.push("E2E_CONTROL_EMAIL");
    if (!controlPassword) missingKeys.push("E2E_CONTROL_PASSWORD");

    if (!controlEmail || !controlPassword) {
      return {
        source: "missing",
        auth_source: "missing",
        roleMode,
        greenEligible: false,
        allRolesResolved: false,
        blockedStatus: "BLOCKED_CONTROL_ACCOUNT_ENV_MISSING",
        env: null,
        missingKeys,
        rolesResolved: [],
        roleIsolationClaimed: false,
        role_isolation_e2e_claimed: false,
        fullAccessRuntimeClaimed: false,
        full_access_runtime_claimed: false,
        separateRoleUsersRequired: false,
        separate_role_users_required: false,
        auth_admin_used: false,
        list_users_used: false,
        serviceRoleUsed: false,
        seed_used: false,
        fake_users_created: false,
        exactReason:
          "developer_control_full_access requires E2E_CONTROL_EMAIL/PASSWORD, E2E_DEVELOPER_EMAIL/PASSWORD, or director fallback credentials.",
      };
    }

    return {
      source: "developer_control_explicit_env",
      auth_source: "developer_control_explicit_env",
      roleMode,
      greenEligible: true,
      allRolesResolved: false,
      blockedStatus: null,
      env: buildDeveloperControlEnv({
        email: controlEmail,
        password: controlPassword,
        developerEmail: readEnvValue(env, agentEnv, "E2E_DEVELOPER_EMAIL") ?? controlEmail,
        developerPassword: readEnvValue(env, agentEnv, "E2E_DEVELOPER_PASSWORD") ?? controlPassword,
      }),
      missingKeys: [],
      rolesResolved: ["director", "foreman", "buyer", "accountant", "contractor"],
      roleIsolationClaimed: false,
      role_isolation_e2e_claimed: false,
      fullAccessRuntimeClaimed: true,
      full_access_runtime_claimed: true,
      separateRoleUsersRequired: false,
      separate_role_users_required: false,
      auth_admin_used: false,
      list_users_used: false,
      serviceRoleUsed: false,
      seed_used: false,
      fake_users_created: false,
      exactReason: null,
    };
  }

  for (const config of EXPLICIT_AI_ROLE_AUTH_CONFIG) {
    resolvedEnv[config.emailKey] = readEnvValue(env, agentEnv, config.emailKey) ?? "";
    resolvedEnv[config.passwordKey] = readEnvValue(env, agentEnv, config.passwordKey) ?? "";
  }
  const missingKeys: ExplicitAiRoleSecretKey[] = [];
  const rolesResolved: ExplicitAiRoleName[] = [];

  for (const config of EXPLICIT_AI_ROLE_AUTH_CONFIG) {
    const email = resolvedEnv[config.emailKey];
    const password = resolvedEnv[config.passwordKey];

    if (!email) missingKeys.push(config.emailKey);
    if (!password) missingKeys.push(config.passwordKey);

    if (email && password) {
      rolesResolved.push(config.role);
    }
  }

  if (missingKeys.length > 0) {
    return {
      source: "missing",
      auth_source: "missing",
      roleMode,
      greenEligible: false,
      allRolesResolved: false,
      blockedStatus: "BLOCKED_NO_E2E_ROLE_SECRETS",
      env: null,
      missingKeys,
      rolesResolved,
      roleIsolationClaimed: false,
      role_isolation_e2e_claimed: false,
      fullAccessRuntimeClaimed: false,
      full_access_runtime_claimed: false,
      separateRoleUsersRequired: true,
      separate_role_users_required: true,
      auth_admin_used: false,
      list_users_used: false,
      serviceRoleUsed: false,
      seed_used: false,
      fake_users_created: false,
      exactReason: "Explicit E2E role secrets are missing.",
    };
  }

  return {
    source: "explicit_env",
    auth_source: "explicit_env",
    roleMode,
    greenEligible: true,
    allRolesResolved: true,
    blockedStatus: null,
    env: resolvedEnv,
    missingKeys: [],
    rolesResolved,
    roleIsolationClaimed: true,
    role_isolation_e2e_claimed: true,
    fullAccessRuntimeClaimed: false,
    full_access_runtime_claimed: false,
    separateRoleUsersRequired: true,
    separate_role_users_required: true,
    auth_admin_used: false,
    list_users_used: false,
    serviceRoleUsed: false,
    seed_used: false,
    fake_users_created: false,
    exactReason: null,
  };
}
