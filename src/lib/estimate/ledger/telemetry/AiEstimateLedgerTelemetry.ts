export type AiEstimateLedgerTelemetryEvent = {
  eventName: string;
  estimateIdHash: string;
  sourceSha: string;
  adapterKind: string;
  status: "ok" | "blocked" | "failed";
  payload: Record<string, string | number | boolean | null>;
};

function redactValue(value: unknown): string | number | boolean | null {
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value == null) return null;
  const text = String(value);
  if (text.includes("@") || /\+?\d[\d\s()-]{7,}/.test(text)) return "[redacted]";
  if (text.length > 80) return `${text.slice(0, 77)}...`;
  return text;
}

export function createAiEstimateLedgerTelemetryEvent(input: {
  eventName: string;
  estimateId: string;
  sourceSha: string;
  adapterKind: string;
  status: AiEstimateLedgerTelemetryEvent["status"];
  payload?: Record<string, unknown>;
}): AiEstimateLedgerTelemetryEvent {
  let hash = 0;
  for (let index = 0; index < input.estimateId.length; index += 1) {
    hash = Math.imul(31, hash) + input.estimateId.charCodeAt(index);
  }
  const payload = Object.fromEntries(
    Object.entries(input.payload ?? {}).map(([key, value]) => [key, redactValue(value)]),
  );
  return {
    eventName: input.eventName,
    estimateIdHash: `estimate:${(hash >>> 0).toString(16)}`,
    sourceSha: input.sourceSha,
    adapterKind: input.adapterKind,
    status: input.status,
    payload,
  };
}
