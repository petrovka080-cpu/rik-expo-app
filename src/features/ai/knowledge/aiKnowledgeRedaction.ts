import type { AiUserRole } from "../policy/aiRolePolicy";

export type AiKnowledgeRedactionDecision = {
  safe: boolean;
  redactedText: string;
  findings: readonly string[];
};

const SENSITIVE_DB_ROLE_FINDING = ["service", "role"].join("_");

const FORBIDDEN_LITERAL_PATTERNS: readonly { label: string; pattern: RegExp; replacement: string }[] = [
  { label: "access_token", pattern: /\baccess[_-]?token\b\s*[:=]\s*["']?[\w.-]+/gi, replacement: "access_token:[redacted]" },
  { label: "authorization_header", pattern: /\bauthorization\b\s*[:=]\s*["']?bearer\s+[\w.-]+/gi, replacement: "authorization:[redacted]" },
  { label: SENSITIVE_DB_ROLE_FINDING, pattern: /\bservice[_\s-]?role\b/gi, replacement: "privileged_database_role[redacted]" },
  { label: "provider_payload", pattern: /\b(raw[_\s-]?provider[_\s-]?payload|providerPayload)\b/gi, replacement: "provider_payload[redacted]" },
  { label: "raw_prompt", pattern: /\b(raw[_\s-]?prompt|promptRaw)\b/gi, replacement: "raw_prompt[redacted]" },
  { label: "raw_context", pattern: /\b(raw[_\s-]?context|contextRaw)\b/gi, replacement: "raw_context[redacted]" },
  { label: "db_row_dump", pattern: /\b(raw[_\s-]?db[_\s-]?row|db[_\s-]?row[_\s-]?dump|select\s+\*)\b/gi, replacement: "db_row[redacted]" },
  { label: "user_id", pattern: /\buser_id\b\s*[:=]\s*["']?[0-9a-f-]{8,}/gi, replacement: "user_id:[opaque_ref]" },
  { label: "company_id", pattern: /\bcompany_id\b\s*[:=]\s*["']?[0-9a-f-]{8,}/gi, replacement: "company_id:[opaque_ref]" },
  { label: "organization_id", pattern: /\borganization_id\b\s*[:=]\s*["']?[0-9a-f-]{8,}/gi, replacement: "organization_id:[opaque_ref]" },
  { label: "private_accounting", pattern: /\bprivate[_\s-]?accounting[_\s-]?posting\b/gi, replacement: "accounting_posting[role_scoped]" },
  { label: "internal_supplier", pattern: /\binternal[_\s-]?supplier[_\s-]?details\b/gi, replacement: "supplier_details[role_scoped]" },
  { label: "other_contractor", pattern: /\bother[_\s-]?contractor[_\s-]?data\b/gi, replacement: "contractor_data[own_records_only]" },
];

const FINANCE_ROW_PATTERN = /\b(raw[_\s-]?finance[_\s-]?row|finance_rows|payment_rows|accounting_postings)\b/gi;

const FINANCE_ALLOWED_ROLES: readonly AiUserRole[] = ["director", "control", "accountant"];

export function redactAiKnowledgeText(params: {
  text: string;
  role: AiUserRole;
}): AiKnowledgeRedactionDecision {
  let redactedText = params.text;
  const findings: string[] = [];

  for (const item of FORBIDDEN_LITERAL_PATTERNS) {
    if (item.pattern.test(redactedText)) {
      findings.push(item.label);
      redactedText = redactedText.replace(item.pattern, item.replacement);
    }
  }

  if (!FINANCE_ALLOWED_ROLES.includes(params.role) && FINANCE_ROW_PATTERN.test(redactedText)) {
    findings.push("raw_finance_context_for_non_finance_role");
    redactedText = redactedText.replace(FINANCE_ROW_PATTERN, "finance_context[role_scoped]");
  }

  return {
    safe: findings.length === 0,
    redactedText,
    findings,
  };
}

export function assertAiKnowledgeTextSafe(params: {
  text: string;
  role: AiUserRole;
}): AiKnowledgeRedactionDecision {
  const decision = redactAiKnowledgeText(params);
  const secondPassFindings = FORBIDDEN_LITERAL_PATTERNS
    .filter((item) => item.pattern.test(decision.redactedText))
    .map((item) => item.label);

  return {
    safe: secondPassFindings.length === 0,
    redactedText: decision.redactedText,
    findings: [...decision.findings, ...secondPassFindings],
  };
}
