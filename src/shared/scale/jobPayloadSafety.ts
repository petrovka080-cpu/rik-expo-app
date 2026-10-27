import { redactBffText } from "./bffSafety";
import type { JobPolicy, JobType } from "./jobPolicies";
import { getJobPolicy } from "./jobPolicies";

export type JobPayloadEnvelope = {
  jobType: JobType;
  payload: unknown;
  metadata?: Record<string, unknown> | null;
};

export type JobPayloadSafetyResult =
  | {
      ok: true;
      redactedPayload: unknown;
      payloadBytes: number;
    }
  | {
      ok: false;
      code:
        | "JOB_POLICY_MISSING"
        | "JOB_PAYLOAD_TOO_LARGE"
        | "JOB_PAYLOAD_FORBIDDEN_FIELD"
        | "JOB_PAYLOAD_SECRET_VALUE";
      message: string;
    };

const FORBIDDEN_PAYLOAD_FIELDS = new Set([
  "rawaccesstoken",
  "refreshtoken",
  "servicerolekey",
  "signedurl",
  "rawprompt",
  "rawairesponse",
  "fulladdress",
  "phone",
  "email",
]);

const SECRET_OR_SIGNED_VALUE_PATTERN =
  /\b(?:Bearer\s+[A-Za-z0-9._~+/=-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|token=|access_token=|signature=|sig=|service[_-]?role)/i;

const normalizedFieldName = (key: string): string =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "");

const stableSerialize = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`);
  return `{${entries.join(",")}}`;
};

const byteLength = (value: string): number => {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
};

const containsSecretValue = (value: string): boolean =>
  SECRET_OR_SIGNED_VALUE_PATTERN.test(value) || redactBffText(value) !== value;

const sanitizePayload = (
  value: unknown,
  policy: JobPolicy,
  depth = 0,
): { ok: true; value: unknown } | { ok: false; code: "JOB_PAYLOAD_FORBIDDEN_FIELD" | "JOB_PAYLOAD_SECRET_VALUE" } => {
  if (value === null || typeof value === "boolean") return { ok: true, value };
  if (typeof value === "number") return { ok: true, value: Number.isFinite(value) ? value : null };
  if (typeof value === "string") {
    if (containsSecretValue(value) && policy.piiPolicy === "reject_pii") {
      return { ok: false, code: "JOB_PAYLOAD_SECRET_VALUE" };
    }
    return { ok: true, value: redactBffText(value).slice(0, 240) };
  }
  if (depth > 6) return { ok: true, value: "[redacted]" };
  if (Array.isArray(value)) {
    const safe: unknown[] = [];
    for (const entry of value.slice(0, 100)) {
      const sanitized = sanitizePayload(entry, policy, depth + 1);
      if (!sanitized.ok) return sanitized;
      safe.push(sanitized.value);
    }
    return { ok: true, value: safe };
  }
  if (typeof value === "object") {
    const safe: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value).slice(0, 100)) {
      if (FORBIDDEN_PAYLOAD_FIELDS.has(normalizedFieldName(key))) {
        return { ok: false, code: "JOB_PAYLOAD_FORBIDDEN_FIELD" };
      }
      const sanitized = sanitizePayload(entry, policy, depth + 1);
      if (!sanitized.ok) return sanitized;
      safe[key.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 80)] = sanitized.value;
    }
    return { ok: true, value: safe };
  }

  return { ok: true, value: null };
};

export function validateJobPayloadEnvelope(envelope: JobPayloadEnvelope): JobPayloadSafetyResult {
  const policy = getJobPolicy(envelope.jobType);
  if (!policy) {
    return {
      ok: false,
      code: "JOB_POLICY_MISSING",
      message: "Job policy is not registered",
    };
  }

  if (byteLength(stableSerialize(envelope.payload)) > policy.payloadMaxBytes) {
    return {
      ok: false,
      code: "JOB_PAYLOAD_TOO_LARGE",
      message: "Job payload exceeds the configured boundary",
    };
  }

  const sanitized = sanitizePayload(envelope.payload, policy);
  if (!sanitized.ok) {
    return {
      ok: false,
      code: sanitized.code,
      message: "Job payload cannot be accepted safely",
    };
  }

  const payloadBytes = byteLength(stableSerialize(sanitized.value));
  if (payloadBytes > policy.payloadMaxBytes) {
    return {
      ok: false,
      code: "JOB_PAYLOAD_TOO_LARGE",
      message: "Job payload exceeds the configured boundary",
    };
  }

  return {
    ok: true,
    redactedPayload: sanitized.value,
    payloadBytes,
  };
}

export function buildSafeJobPayloadError(result: Exclude<JobPayloadSafetyResult, { ok: true }>): {
  code: string;
  message: string;
} {
  return {
    code: result.code,
    message: result.message,
  };
}
