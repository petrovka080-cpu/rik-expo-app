import type { AiScreenRuntimeCard, AiScreenRuntimeResponse } from "./aiScreenRuntimeTypes";

const RAW_FIELD_PATTERNS: readonly RegExp[] = [
  /\braw[_-]?(db|row|rows|payload|prompt|provider)\b/i,
  /\bservice[_-]?role\b/i,
  /\bauth\.admin\b/i,
  /\blistUsers\b/i,
  /\bselect\s*\(\s*["'`]\s*\*\s*["'`]\s*\)/i,
];

function hashOpaque(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function toAiScreenRuntimeOpaqueHash(prefix: string, value: string): string {
  return `${prefix}_${hashOpaque(value.trim() || "empty")}`;
}

export function assertAiScreenRuntimePayloadSafe(value: unknown): void {
  const text = JSON.stringify(value);
  for (const pattern of RAW_FIELD_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error("AI screen runtime payload contains a forbidden raw/provider/admin marker.");
    }
  }
}

export function redactAiScreenRuntimeCard(card: AiScreenRuntimeCard): AiScreenRuntimeCard {
  const redacted: AiScreenRuntimeCard = {
    ...card,
    sourceEntityIdHash:
      card.sourceEntityIdHash && card.sourceEntityIdHash.includes(":")
        ? toAiScreenRuntimeOpaqueHash("entity", card.sourceEntityIdHash)
        : card.sourceEntityIdHash,
  };
  assertAiScreenRuntimePayloadSafe(redacted);
  return redacted;
}

export function assertAiScreenRuntimeResponseSafe(response: AiScreenRuntimeResponse): AiScreenRuntimeResponse {
  assertAiScreenRuntimePayloadSafe(response);
  return response;
}
