const DEBUG_NOISE = [
  "runtime",
  "debug",
  "trace",
  "intent",
  "entity",
  "source planner",
  "raw payload",
  "json",
  "policy internals",
  "semantic guard",
  "screen manifest",
  "service_role",
  "provider unavailable",
] as const;

export type AiLiveScreenNoiseGuardResult = {
  passed: boolean;
  debugSignals: string[];
  providerSignals: string[];
  rawPayloadVisible: boolean;
};

export function validateAiLiveScreenNoise(text: string): AiLiveScreenNoiseGuardResult {
  const lower = String(text || "").toLowerCase();
  const debugSignals = DEBUG_NOISE.filter((signal) => lower.includes(signal));
  const providerSignals = ["provider", "transport", "fallback"].filter((signal) => lower.includes(signal));
  const rawPayloadVisible = /\{[\s\S]*"[^"]+"\s*:/.test(text);

  return {
    passed: debugSignals.length === 0 && providerSignals.length === 0 && !rawPayloadVisible,
    debugSignals,
    providerSignals,
    rawPayloadVisible,
  };
}

export function aiLiveProviderUnavailableUserCopy(): string {
  return [
    "AI сейчас не смог подготовить ответ. Данные приложения не изменены.",
    "Попробуйте ещё раз или откройте данные вручную.",
  ].join("\n");
}
