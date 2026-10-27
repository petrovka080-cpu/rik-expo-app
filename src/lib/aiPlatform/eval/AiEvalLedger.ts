import type { AiEvalScoreBreakdown } from "./AiEvalContract";

export type AiEvalLedgerRecord = {
  evalRunId: string;
  caseId: string;
  sourceSha: string;
  runtimeVersion: string;
  promptVersion: string;
  providerKey: string;
  modelKey: string;
  status: "passed" | "failed" | "blocked";
  score: number;
  scoreBreakdown: AiEvalScoreBreakdown;
  driftDetected: boolean;
  piiRedactionPassed: boolean;
  cost: {
    inputTokens?: number;
    outputTokens?: number;
    estimatedCost?: number;
    durationMs: number;
  };
  createdAt: string;
};

export type AiEvalLedgerStore = {
  append(record: AiEvalLedgerRecord): AiEvalLedgerRecord;
  list(): AiEvalLedgerRecord[];
};

export function createInMemoryAiEvalLedgerStore(): AiEvalLedgerStore {
  const records: AiEvalLedgerRecord[] = [];
  return {
    append(record) {
      records.push(record);
      return record;
    },
    list() {
      return [...records];
    },
  };
}
