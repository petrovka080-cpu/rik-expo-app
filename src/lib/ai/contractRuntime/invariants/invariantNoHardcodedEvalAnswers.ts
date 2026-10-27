import type { AiContractRuntimePatchScanResult } from "../aiContractRuntimeTypes";
import { createAiInvariantCheck } from "../aiInvariantCatalog";

export function invariantNoHardcodedEvalAnswers(scan: AiContractRuntimePatchScanResult) {
  const count =
    scan.questionIdHardcodesFound +
    scan.screenIdAnswerHardcodesFound +
    scan.buttonIdAnswerHardcodesFound;
  return createAiInvariantCheck(
    "NO_HARDCODED_EVAL_ANSWERS",
    count === 0,
    count === 0 ? undefined : `Found answer hardcode patterns: ${count}.`,
  );
}
