import { createInMemoryAiRunLedgerStore } from "../../src/lib/aiPlatform/ledger/AiRunLedgerStore";
import { aiRunLedgerRecordStoresRawPrompt } from "../../src/lib/aiPlatform/ledger/redactAiRunLedgerRecord";

describe("AI run ledger", () => {
  it("records source/version/policy metadata without raw prompts", () => {
    const store = createInMemoryAiRunLedgerStore();
    const record = store.append({
      flowId: "ledger-contract",
      sourceSha: "source",
      runtimeVersion: "ai-platform-kernel-v1",
      role: "director",
      surface: "chat",
      intent: "summarize",
      mode: "safe_read",
      providerKey: "in_memory",
      modelKey: "test",
      approvalRequired: false,
      approvalGranted: false,
      redactionPassed: true,
      budgetUsed: { inputChars: 10, maxInputChars: 6000 },
      status: "completed",
    });
    expect(record.sourceSha).toBe("source");
    expect(record.runtimeVersion).toBe("ai-platform-kernel-v1");
    expect(record.redactionPassed).toBe(true);
    expect(aiRunLedgerRecordStoresRawPrompt(record)).toBe(false);
  });
});
