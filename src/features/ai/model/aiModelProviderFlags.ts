import type { AiModelProviderId } from "./AiModelTypes";

export type AiModelProviderEnv = Record<string, string | undefined>;

const normalizeProviderValue = (value: unknown): string =>
  String(value ?? "").trim().toLowerCase();

const readProviderValue = (env: AiModelProviderEnv): string =>
  normalizeProviderValue(env.AI_MODEL_PROVIDER ?? env.EXPO_PUBLIC_AI_MODEL_PROVIDER);

export function resolveAiModelProviderId(
  env: AiModelProviderEnv = process.env,
): AiModelProviderId {
  switch (readProviderValue(env)) {
    case "legacy_gemini":
      return "legacy_gemini";
    case "disabled":
    case "openai_future":
    default:
      return "disabled";
  }
}

export function resolveLegacyRuntimeAiModelProviderId(
  env: AiModelProviderEnv = process.env,
): AiModelProviderId {
  const configured = readProviderValue(env);
  if (!configured) return "legacy_gemini";
  return resolveAiModelProviderId(env);
}
