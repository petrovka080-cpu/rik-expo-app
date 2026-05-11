export type ExplicitAiRoleName = "director" | "foreman" | "buyer" | "accountant" | "contractor";

export type ExplicitAiRoleAuthSource = "explicit_env" | "missing";

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
  | "E2E_CONTRACTOR_PASSWORD";

type ExplicitRoleConfig = {
  role: ExplicitAiRoleName;
  emailKey: ExplicitAiRoleSecretKey;
  passwordKey: ExplicitAiRoleSecretKey;
};

export type ExplicitAiRoleAuthResolution = {
  source: ExplicitAiRoleAuthSource;
  greenEligible: boolean;
  allRolesResolved: boolean;
  blockedStatus: "BLOCKED_NO_E2E_ROLE_SECRETS" | null;
  env: Record<ExplicitAiRoleSecretKey, string> | null;
  missingKeys: readonly ExplicitAiRoleSecretKey[];
  rolesResolved: readonly ExplicitAiRoleName[];
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

function readRequiredSecret(
  env: NodeJS.ProcessEnv,
  key: ExplicitAiRoleSecretKey,
): string | null {
  const value = String(env[key] ?? "").trim();
  return value.length > 0 ? value : null;
}

export function resolveExplicitAiRoleAuthEnv(
  env: NodeJS.ProcessEnv = process.env,
): ExplicitAiRoleAuthResolution {
  const resolvedEnv: Record<ExplicitAiRoleSecretKey, string> = {
    E2E_DIRECTOR_EMAIL: readRequiredSecret(env, "E2E_DIRECTOR_EMAIL") ?? "",
    E2E_DIRECTOR_PASSWORD: readRequiredSecret(env, "E2E_DIRECTOR_PASSWORD") ?? "",
    E2E_FOREMAN_EMAIL: readRequiredSecret(env, "E2E_FOREMAN_EMAIL") ?? "",
    E2E_FOREMAN_PASSWORD: readRequiredSecret(env, "E2E_FOREMAN_PASSWORD") ?? "",
    E2E_BUYER_EMAIL: readRequiredSecret(env, "E2E_BUYER_EMAIL") ?? "",
    E2E_BUYER_PASSWORD: readRequiredSecret(env, "E2E_BUYER_PASSWORD") ?? "",
    E2E_ACCOUNTANT_EMAIL: readRequiredSecret(env, "E2E_ACCOUNTANT_EMAIL") ?? "",
    E2E_ACCOUNTANT_PASSWORD: readRequiredSecret(env, "E2E_ACCOUNTANT_PASSWORD") ?? "",
    E2E_CONTRACTOR_EMAIL: readRequiredSecret(env, "E2E_CONTRACTOR_EMAIL") ?? "",
    E2E_CONTRACTOR_PASSWORD: readRequiredSecret(env, "E2E_CONTRACTOR_PASSWORD") ?? "",
  };
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
      greenEligible: false,
      allRolesResolved: false,
      blockedStatus: "BLOCKED_NO_E2E_ROLE_SECRETS",
      env: null,
      missingKeys,
      rolesResolved,
      exactReason: "Explicit E2E role secrets are missing.",
    };
  }

  return {
    source: "explicit_env",
    greenEligible: true,
    allRolesResolved: true,
    blockedStatus: null,
    env: resolvedEnv,
    missingKeys: [],
    rolesResolved,
    exactReason: null,
  };
}
