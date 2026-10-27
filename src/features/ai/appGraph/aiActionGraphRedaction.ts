const RAW_PAYLOAD_KEYS = new Set([
  "rawPrompt",
  "raw_prompt",
  "providerPayload",
  "provider_payload",
  "rawDbRows",
  "raw_db_rows",
  "dbRows",
  "rows",
  "secret",
  "token",
  "password",
]);

export type AiActionGraphRedactionResult = {
  safe: boolean;
  blockedKeys: readonly string[];
};

export function inspectAiActionGraphPayloadForRawFields(value: unknown): AiActionGraphRedactionResult {
  const blockedKeys: string[] = [];

  function visit(node: unknown): void {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (RAW_PAYLOAD_KEYS.has(key)) blockedKeys.push(key);
      visit(child);
    }
  }

  visit(value);

  return {
    safe: blockedKeys.length === 0,
    blockedKeys,
  };
}

export function assertAiActionGraphPayloadSafe(value: unknown): AiActionGraphRedactionResult {
  return inspectAiActionGraphPayloadForRawFields(value);
}
