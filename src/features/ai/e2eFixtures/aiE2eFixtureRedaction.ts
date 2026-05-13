import { AI_E2E_FIXTURE_ENV_KEYS } from "./aiE2eFixtureTypes";
import type { AiE2eFixtureEnvKey } from "./aiE2eFixtureTypes";

const OPAQUE_REF_PATTERN =
  /\b(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|[A-Za-z0-9_-]{20,})\b/gi;

export function collectAiE2eFixtureValues(
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] {
  return AI_E2E_FIXTURE_ENV_KEYS
    .map((key) => String(env[key] ?? "").trim())
    .filter((value) => value.length > 0);
}

export function redactAiE2eFixtureValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "<missing>";
  const visibleSuffix = trimmed.slice(-4);
  return `<redacted-fixture:${visibleSuffix}>`;
}

export function redactAiE2eFixtureRecord(
  fixtures: Partial<Record<AiE2eFixtureEnvKey, string>>,
): Record<AiE2eFixtureEnvKey, string> {
  return Object.fromEntries(
    AI_E2E_FIXTURE_ENV_KEYS.map((key) => [
      key,
      redactAiE2eFixtureValue(fixtures[key] ?? ""),
    ]),
  ) as Record<AiE2eFixtureEnvKey, string>;
}

export function redactAiE2eFixtureText(
  value: string,
  fixtureValues: readonly string[] = collectAiE2eFixtureValues(),
): string {
  let redacted = value;
  for (const fixtureValue of fixtureValues) {
    redacted = redacted.split(fixtureValue).join(redactAiE2eFixtureValue(fixtureValue));
  }
  return redacted.replace(OPAQUE_REF_PATTERN, "<redacted-fixture-ref>");
}
