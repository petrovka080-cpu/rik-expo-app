export const AI_PROVIDER_PAYLOAD_REDACTION_POLICY_ID = "ai_provider_payload_redaction_v1" as const;
export const AI_PROVIDER_PAYLOAD_REDACTION_MARKER = "[redacted:provider-payload]" as const;

export type AiProviderPayloadRedactionFinding = {
  path: string;
  code: "forbidden_provider_payload_key" | "sensitive_provider_payload_string";
  exactReason: string;
};

export type AiProviderPayloadRedactionResult = {
  policyId: typeof AI_PROVIDER_PAYLOAD_REDACTION_POLICY_ID;
  payloadBytes: number;
  maxProviderPayloadBytes: number;
  unsafeKeys: readonly string[];
  findings: readonly AiProviderPayloadRedactionFinding[];
  redactedPayload: typeof AI_PROVIDER_PAYLOAD_REDACTION_MARKER;
  acceptedForArtifact: false;
  rawPromptExposed: false;
  rawProviderPayloadExposed: false;
  rawProviderPayloadStored: false;
  credentialsExposed: false;
};

const FORBIDDEN_AI_PROVIDER_PAYLOAD_KEY_PATTERN =
  /raw[_-]?prompt|system[_-]?prompt|user[_-]?prompt|provider[_-]?payload|raw[_-]?provider|messages?|choices?|candidates?|tool[_-]?calls?|api[_-]?key|secret|password|authorization|token|credential|full[_-]?user[_-]?email|user[_-]?email|email/i;

const SENSITIVE_AI_PROVIDER_PAYLOAD_STRING_PATTERN =
  /\bBearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}|AIza[A-Za-z0-9_-]{10,}/i;

function stringifyForMeasurement(value: unknown): string {
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function measureAiProviderPayloadBytes(value: unknown): number {
  return new TextEncoder().encode(stringifyForMeasurement(value)).length;
}

function scanProviderPayloadValue(value: unknown, path: string, findings: AiProviderPayloadRedactionFinding[]): void {
  if (typeof value === "string") {
    if (SENSITIVE_AI_PROVIDER_PAYLOAD_STRING_PATTERN.test(value)) {
      findings.push({
        path,
        code: "sensitive_provider_payload_string",
        exactReason: "Provider payload contains a credential-like string and cannot be stored.",
      });
    }
    return;
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanProviderPayloadValue(item, `${path}[${index}]`, findings));
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;
    if (FORBIDDEN_AI_PROVIDER_PAYLOAD_KEY_PATTERN.test(key)) {
      findings.push({
        path: childPath,
        code: "forbidden_provider_payload_key",
        exactReason: "Provider payload key is forbidden in logs and artifacts.",
      });
    }
    scanProviderPayloadValue(child, childPath, findings);
  }
}

export function scanAiProviderPayloadForUnsafeContent(value: unknown): AiProviderPayloadRedactionFinding[] {
  const findings: AiProviderPayloadRedactionFinding[] = [];
  scanProviderPayloadValue(value, "$", findings);
  return findings;
}

export function redactAiProviderPayload(params: {
  payload: unknown;
  maxProviderPayloadBytes: number;
}): AiProviderPayloadRedactionResult {
  const payloadBytes = measureAiProviderPayloadBytes(params.payload);
  const findings = scanAiProviderPayloadForUnsafeContent(params.payload);
  const unsafeKeys = findings
    .filter((finding) => finding.code === "forbidden_provider_payload_key")
    .map((finding) => finding.path)
    .sort();

  return Object.freeze({
    policyId: AI_PROVIDER_PAYLOAD_REDACTION_POLICY_ID,
    payloadBytes,
    maxProviderPayloadBytes: Math.max(0, Math.trunc(params.maxProviderPayloadBytes)),
    unsafeKeys,
    findings,
    redactedPayload: AI_PROVIDER_PAYLOAD_REDACTION_MARKER,
    acceptedForArtifact: false,
    rawPromptExposed: false,
    rawProviderPayloadExposed: false,
    rawProviderPayloadStored: false,
    credentialsExposed: false,
  } satisfies AiProviderPayloadRedactionResult);
}

export function verifyAiProviderPayloadRedactionPolicy(): AiProviderPayloadRedactionResult {
  return redactAiProviderPayload({
    maxProviderPayloadBytes: 0,
    payload: {
      messages: [{ role: "user", content: "redaction probe" }],
      providerPayload: { token: "Bearer redaction-probe" },
    },
  });
}
