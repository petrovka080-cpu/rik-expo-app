export type AgentRuntimeGatewayErrorCode =
  | "AGENT_RUNTIME_AUTH_REQUIRED"
  | "AGENT_RUNTIME_ROUTE_NOT_MOUNTED"
  | "AGENT_RUNTIME_ROUTE_BUDGET_MISSING"
  | "AGENT_RUNTIME_FORBIDDEN_PAYLOAD"
  | "AGENT_RUNTIME_PAYLOAD_TOO_LARGE"
  | "AGENT_RUNTIME_RESULT_LIMIT_EXCEEDED"
  | "AGENT_RUNTIME_EVIDENCE_REQUIRED"
  | "AGENT_RUNTIME_IDEMPOTENCY_REQUIRED";

export type AgentRuntimeGatewayError = {
  code: AgentRuntimeGatewayErrorCode;
  message: string;
  redacted: true;
  rawPayloadExposed: false;
  secretExposed: false;
};

const MAX_ERROR_MESSAGE_LENGTH = 220;

function sanitizeRuntimeErrorMessage(value: string): string {
  return value
    .replace(/https?:\/\/\S+/gi, "[redacted_url]")
    .replace(/\beyJ[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){1,2}\b/g, "[redacted_jwt]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted_email]")
    .replace(
      /\b(password|secret|token|service[_-]?role|authorization)\s*[:=]\s*\S+/gi,
      "$1=[redacted]",
    )
    .slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

export function createAgentRuntimeGatewayError(
  code: AgentRuntimeGatewayErrorCode,
  message: string,
): AgentRuntimeGatewayError {
  return {
    code,
    message: sanitizeRuntimeErrorMessage(message),
    redacted: true,
    rawPayloadExposed: false,
    secretExposed: false,
  };
}
