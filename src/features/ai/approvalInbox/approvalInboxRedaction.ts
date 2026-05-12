import {
  findAiActionLedgerForbiddenPayloadKeys,
  isAiActionLedgerPayloadSafe,
  redactAiActionLedgerPayload,
} from "../actionLedger/aiActionLedgerRedaction";
import type { AiActionLedgerRecord } from "../actionLedger/aiActionLedgerTypes";

export function redactApprovalInboxPayload(value: unknown): unknown {
  return redactAiActionLedgerPayload(value);
}

export function findApprovalInboxForbiddenPayloadKeys(value: unknown): string[] {
  return findAiActionLedgerForbiddenPayloadKeys(value);
}

export function isApprovalInboxPayloadSafe(value: unknown): boolean {
  return isAiActionLedgerPayloadSafe(value);
}

export function redactApprovalInboxRecordPayload(record: AiActionLedgerRecord): unknown {
  return redactApprovalInboxPayload(record.redactedPayload);
}
