export type AiE2eFixtureEnvKey =
  | "E2E_PROCUREMENT_REQUEST_REF"
  | "E2E_APPROVED_PROCUREMENT_ACTION_REF"
  | "E2E_PENDING_APPROVAL_ACTION_REF"
  | "E2E_COMMAND_CENTER_SCREEN_REF"
  | "E2E_WAREHOUSE_ITEM_REF"
  | "E2E_FINANCE_COMPANY_REF"
  | "E2E_CONTRACTOR_OWN_SUBCONTRACT_REF"
  | "E2E_ROLE_MODE";

export type AiE2eFixtureRoleMode =
  | "developer_full_access_or_separate_roles"
  | "separate_roles";

export type AiE2eFixtureSource = "explicit_env" | "missing";

export type AiE2eFixtureBlockedStatus =
  "BLOCKED_REQUIRED_E2E_FIXTURE_REFS_MISSING";

export type AiE2eFixtureRegistryResolution = {
  source: AiE2eFixtureSource;
  status: "loaded" | "blocked";
  greenEligible: boolean;
  fixturesResolved: boolean;
  blockedStatus: AiE2eFixtureBlockedStatus | null;
  missingKeys: readonly AiE2eFixtureEnvKey[];
  fixtures: Record<AiE2eFixtureEnvKey, string> | null;
  fixtureValueRedactionRequired: true;
  authAdminUsed: false;
  listUsersUsed: false;
  serviceRoleUsed: false;
  dbSeedUsed: false;
  dbWritesPerformed: false;
  fakeRequestCreated: false;
  fakeActionCreated: false;
  rawFixtureValuesPrinted: false;
  exactReason: string | null;
};

export const AI_E2E_FIXTURE_ENV_KEYS = [
  "E2E_PROCUREMENT_REQUEST_REF",
  "E2E_APPROVED_PROCUREMENT_ACTION_REF",
  "E2E_PENDING_APPROVAL_ACTION_REF",
  "E2E_COMMAND_CENTER_SCREEN_REF",
  "E2E_WAREHOUSE_ITEM_REF",
  "E2E_FINANCE_COMPANY_REF",
  "E2E_CONTRACTOR_OWN_SUBCONTRACT_REF",
  "E2E_ROLE_MODE",
] as const satisfies readonly AiE2eFixtureEnvKey[];

export const AI_E2E_ROLE_SECRET_ENV_KEYS = [
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
