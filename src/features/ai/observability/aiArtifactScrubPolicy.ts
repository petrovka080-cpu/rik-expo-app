import { safeJsonParse } from "../../../lib/format";

export const AI_ARTIFACT_SCRUB_POLICY_ID = "ai_artifact_scrub_policy_v1" as const;
export const AI_ARTIFACT_SCRUB_REDACTION_MARKER = "[redacted:artifact-field]" as const;

export type AiArtifactScrubFinding = {
  artifactPath: string;
  path: string;
  code:
    | "forbidden_artifact_key"
    | "sensitive_artifact_string"
    | "artifact_json_parse_failed"
    | "unsafe_guard_value";
  exactReason: string;
};

export type AiArtifactScrubVerification = {
  policyId: typeof AI_ARTIFACT_SCRUB_POLICY_ID;
  artifactsScanned: number;
  findings: readonly AiArtifactScrubFinding[];
  safeForCommit: boolean;
  rawPromptExposed: false;
  rawProviderPayloadExposed: false;
  rawDbRowsExposed: false;
  credentialsExposed: false;
};

const FORBIDDEN_AI_ARTIFACT_KEY_PATTERN =
  /raw[_-]?prompt|provider[_-]?payload|raw[_-]?provider|messages?|choices?|candidates?|tool[_-]?calls?|^authorization$|authorization[_-]?header|auth[_-]?header|api[_-]?key|secret|password|token|credential|raw[_-]?rows?|db[_-]?rows?/i;

const SENSITIVE_AI_ARTIFACT_STRING_PATTERN =
  /\bBearer\s+[A-Za-z0-9._-]+|sk-[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}|AIza[A-Za-z0-9_-]{10,}/i;

const SAFE_FALSE_GUARD_SUFFIXES = [
  "exposed",
  "stored",
  "printed",
  "used",
  "called",
  "changed",
  "claimed",
  "allowed",
] as const;

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
}

function isNoGuardKey(key: string, value: unknown): boolean {
  const normalized = normalizeKey(key);
  return normalized.startsWith("no") && value === true;
}

function isSafeFalseGuardKey(key: string, value: unknown): boolean {
  const normalized = normalizeKey(key);
  return value === false && SAFE_FALSE_GUARD_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function isUnsafeGuardKey(key: string, value: unknown): boolean {
  const normalized = normalizeKey(key);
  return (
    (normalized.startsWith("no") && value === false) ||
    (value === true && SAFE_FALSE_GUARD_SUFFIXES.some((suffix) => normalized.endsWith(suffix)))
  );
}

function isBudgetLimitKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return normalized === "maxproviderpayloadbytes" || normalized === "maxproviderpayloadsize";
}

function shouldFlagArtifactKey(key: string, value: unknown): boolean {
  if (!FORBIDDEN_AI_ARTIFACT_KEY_PATTERN.test(key)) return false;
  if (isBudgetLimitKey(key)) return false;
  if (isNoGuardKey(key, value) || isSafeFalseGuardKey(key, value)) return false;
  return true;
}

function scanArtifactValue(
  value: unknown,
  artifactPath: string,
  path: string,
  findings: AiArtifactScrubFinding[],
): void {
  if (typeof value === "string") {
    if (SENSITIVE_AI_ARTIFACT_STRING_PATTERN.test(value)) {
      findings.push({
        artifactPath,
        path,
        code: "sensitive_artifact_string",
        exactReason: "Artifact contains a credential-like string.",
      });
    }
    return;
  }

  if (!value || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanArtifactValue(item, artifactPath, `${path}[${index}]`, findings));
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = path === "$" ? `$.${key}` : `${path}.${key}`;
    if (isUnsafeGuardKey(key, child) && FORBIDDEN_AI_ARTIFACT_KEY_PATTERN.test(key)) {
      findings.push({
        artifactPath,
        path: childPath,
        code: "unsafe_guard_value",
        exactReason: "Artifact guard key advertises an unsafe value.",
      });
    } else if (shouldFlagArtifactKey(key, child)) {
      findings.push({
        artifactPath,
        path: childPath,
        code: "forbidden_artifact_key",
        exactReason: "Artifact stores a raw prompt, provider payload, row, or credential field.",
      });
    }
    scanArtifactValue(child, artifactPath, childPath, findings);
  }
}

export function scanAiArtifactValueForUnsafePayloads(params: {
  artifactPath: string;
  value: unknown;
}): AiArtifactScrubFinding[] {
  const findings: AiArtifactScrubFinding[] = [];
  scanArtifactValue(params.value, params.artifactPath, "$", findings);
  return findings;
}

export function scanAiArtifactSourceForUnsafePayloads(params: {
  artifactPath: string;
  source: string;
}): AiArtifactScrubFinding[] {
  const trimmed = params.source.trim();
  if (params.artifactPath.endsWith(".json")) {
    const parsed = safeJsonParse<unknown>(trimmed, null);
    if (!parsed.ok) {
      return [
        {
          artifactPath: params.artifactPath,
          path: "$",
          code: "artifact_json_parse_failed",
          exactReason: "Artifact JSON could not be parsed.",
        },
      ];
    }
    return scanAiArtifactValueForUnsafePayloads({
      artifactPath: params.artifactPath,
      value: parsed.value,
    });
  }

  if (SENSITIVE_AI_ARTIFACT_STRING_PATTERN.test(trimmed)) {
    return [
      {
        artifactPath: params.artifactPath,
        path: "$",
        code: "sensitive_artifact_string",
        exactReason: "Artifact text contains a credential-like string.",
      },
    ];
  }
  return [];
}

export function scrubAiArtifactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return SENSITIVE_AI_ARTIFACT_STRING_PATTERN.test(value) ? AI_ARTIFACT_SCRUB_REDACTION_MARKER : value;
  }
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrubAiArtifactValue);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      shouldFlagArtifactKey(key, child) ? AI_ARTIFACT_SCRUB_REDACTION_MARKER : scrubAiArtifactValue(child),
    ]),
  );
}

export function verifyAiArtifactScrubPolicy(params: {
  artifacts: readonly { artifactPath: string; source: string }[];
}): AiArtifactScrubVerification {
  const findings = params.artifacts.flatMap((artifact) => scanAiArtifactSourceForUnsafePayloads(artifact));
  return Object.freeze({
    policyId: AI_ARTIFACT_SCRUB_POLICY_ID,
    artifactsScanned: params.artifacts.length,
    findings,
    safeForCommit: findings.length === 0,
    rawPromptExposed: false,
    rawProviderPayloadExposed: false,
    rawDbRowsExposed: false,
    credentialsExposed: false,
  } satisfies AiArtifactScrubVerification);
}
