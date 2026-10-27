import type { AiEvalResult } from "./AiEvalContract";
import type { AiEvalLedgerStore } from "./AiEvalLedger";
import { redactAiEvalLedgerRecord } from "./redactAiEvalLedger";

export function writeAiEvalLedger(store: AiEvalLedgerStore, result: AiEvalResult) {
  return store.append(redactAiEvalLedgerRecord({
    evalRunId: result.evalRunId,
    caseId: result.caseId,
    sourceSha: result.sourceSha,
    runtimeVersion: result.runtimeVersion,
    promptVersion: result.promptVersion,
    providerKey: result.providerKey,
    modelKey: result.modelKey,
    status: result.status,
    score: result.score,
    scoreBreakdown: result.scoreBreakdown,
    driftDetected: result.driftDetected,
    piiRedactionPassed: result.piiRedactionPassed,
    cost: result.cost,
    createdAt: result.createdAt,
  }));
}
