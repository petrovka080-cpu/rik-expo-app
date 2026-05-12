import {
  hasAiTaskStreamEvidence,
  hasUnsafeAiTaskStreamPayload,
  normalizeAiTaskStreamEvidenceRefs,
  toAiTaskStreamEvidenceRefs,
} from "../../src/features/ai/taskStream/aiTaskStreamEvidence";

describe("AI task stream evidence", () => {
  it("normalizes evidence refs and keeps evidence objects redacted", () => {
    expect(normalizeAiTaskStreamEvidenceRefs([" a ", "", "a", "b"])).toEqual(["a", "b"]);
    expect(hasAiTaskStreamEvidence(["  "])).toBe(false);
    expect(toAiTaskStreamEvidenceRefs({
      refs: ["warehouse:1"],
      source: "safe_read",
      labelPrefix: "warehouse",
    })).toEqual([
      {
        id: "warehouse:1",
        source: "safe_read",
        label: "warehouse 1",
        redacted: true,
        rawPayloadStored: false,
        rawDbRowsExposed: false,
        rawPromptExposed: false,
      },
    ]);
  });

  it("rejects raw prompt, provider payload, and raw database row keys", () => {
    expect(hasUnsafeAiTaskStreamPayload({ rawPrompt: "leak" })).toBe(true);
    expect(hasUnsafeAiTaskStreamPayload({ provider_payload: {} })).toBe(true);
    expect(hasUnsafeAiTaskStreamPayload({ raw_db_rows: [] })).toBe(true);
    expect(hasUnsafeAiTaskStreamPayload({ nested: { rows: [] } })).toBe(true);
    expect(hasUnsafeAiTaskStreamPayload({ rawDbRowsExposed: false })).toBe(false);
  });
});
