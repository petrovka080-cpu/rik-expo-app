import {
  findAiActionLedgerForbiddenPayloadKeys,
  isAiActionLedgerPayloadSafe,
  redactAiActionLedgerPayload,
} from "../../src/features/ai/actionLedger/aiActionLedgerRedaction";

describe("AI action ledger redaction contract", () => {
  it("removes raw ids, prompts, provider payloads, and secrets from ledger payloads", () => {
    const raw = {
      user_id: "raw-user-id",
      organization_id: "raw-org-id",
      raw_prompt: "full prompt",
      provider_payload: { token: "secret-token" },
      safe_note: "ok",
    };
    const redacted = redactAiActionLedgerPayload(raw);

    expect(findAiActionLedgerForbiddenPayloadKeys(raw)).toEqual(
      expect.arrayContaining(["user_id", "organization_id", "raw_prompt", "provider_payload"]),
    );
    expect(isAiActionLedgerPayloadSafe(redacted)).toBe(true);
    expect(JSON.stringify(redacted)).not.toContain("raw-user-id");
    expect(JSON.stringify(redacted)).not.toContain("full prompt");
    expect(JSON.stringify(redacted)).not.toContain("secret-token");
  });
});
