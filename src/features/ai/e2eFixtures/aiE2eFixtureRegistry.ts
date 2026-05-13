import {
  AI_E2E_FIXTURE_ENV_KEYS,
  type AiE2eFixtureEnvKey,
  type AiE2eFixtureRegistryResolution,
} from "./aiE2eFixtureTypes";

function readRequiredFixture(env: NodeJS.ProcessEnv, key: AiE2eFixtureEnvKey): string | null {
  const value = String(env[key] ?? "").trim();
  return value.length > 0 ? value : null;
}

function blocked(missingKeys: readonly AiE2eFixtureEnvKey[]): AiE2eFixtureRegistryResolution {
  return {
    source: "missing",
    status: "blocked",
    greenEligible: false,
    fixturesResolved: false,
    blockedStatus: "BLOCKED_REQUIRED_E2E_FIXTURE_REFS_MISSING",
    missingKeys,
    fixtures: null,
    fixtureValueRedactionRequired: true,
    authAdminUsed: false,
    listUsersUsed: false,
    serviceRoleUsed: false,
    dbSeedUsed: false,
    dbWritesPerformed: false,
    fakeRequestCreated: false,
    fakeActionCreated: false,
    rawFixtureValuesPrinted: false,
    exactReason: "Explicit AI E2E fixture refs are missing.",
  };
}

export function getRequiredAiE2eFixtureEnvKeys(): readonly AiE2eFixtureEnvKey[] {
  return AI_E2E_FIXTURE_ENV_KEYS;
}

export function resolveAiE2eFixtureRegistry(
  env: NodeJS.ProcessEnv = process.env,
): AiE2eFixtureRegistryResolution {
  const fixtures = Object.fromEntries(
    AI_E2E_FIXTURE_ENV_KEYS.map((key) => [key, readRequiredFixture(env, key) ?? ""]),
  ) as Record<AiE2eFixtureEnvKey, string>;
  const missingKeys = AI_E2E_FIXTURE_ENV_KEYS.filter((key) => fixtures[key].length === 0);

  if (missingKeys.length > 0) {
    return blocked(missingKeys);
  }

  return {
    source: "explicit_env",
    status: "loaded",
    greenEligible: true,
    fixturesResolved: true,
    blockedStatus: null,
    missingKeys: [],
    fixtures,
    fixtureValueRedactionRequired: true,
    authAdminUsed: false,
    listUsersUsed: false,
    serviceRoleUsed: false,
    dbSeedUsed: false,
    dbWritesPerformed: false,
    fakeRequestCreated: false,
    fakeActionCreated: false,
    rawFixtureValuesPrinted: false,
    exactReason: null,
  };
}
