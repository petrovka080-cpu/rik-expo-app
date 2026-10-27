import type { AiRunLedgerAppendInput, AiRunLedgerRecord } from "./AiRunLedgerContract";
import { redactAiRunLedgerRecord } from "./redactAiRunLedgerRecord";

export type AiRunLedgerStore = {
  append(input: AiRunLedgerAppendInput): AiRunLedgerRecord;
  list(): AiRunLedgerRecord[];
  clear(): void;
};

export function createInMemoryAiRunLedgerStore(): AiRunLedgerStore {
  const records: AiRunLedgerRecord[] = [];
  return {
    append(input) {
      const record = redactAiRunLedgerRecord({
        ...input,
        aiRunId: input.aiRunId ?? `ai-run:${input.flowId}:${records.length + 1}`,
        createdAt: input.createdAt ?? new Date().toISOString(),
      });
      records.push(record);
      return record;
    },
    list() {
      return [...records];
    },
    clear() {
      records.length = 0;
    },
  };
}
