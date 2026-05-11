import { redactSensitiveText } from "../../../lib/security/redaction";
import type { AiActionAuditEvent } from "./aiActionAuditTypes";

export type CreateAiActionAuditEventParams =
  Omit<AiActionAuditEvent, "redacted" | "timestamp" | "reason"> & {
    reason: string;
    timestamp?: string;
  };

export function createAiActionAuditEvent(
  params: CreateAiActionAuditEventParams,
): AiActionAuditEvent {
  return {
    ...params,
    reason: redactSensitiveText(params.reason),
    redacted: true,
    timestamp: params.timestamp ?? new Date().toISOString(),
  };
}

export function hasAiActionAuditEvent(value: AiActionAuditEvent | null | undefined): boolean {
  return value?.redacted === true && typeof value.timestamp === "string" && value.timestamp.trim().length > 0;
}
