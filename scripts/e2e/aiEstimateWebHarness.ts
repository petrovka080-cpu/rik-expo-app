import type { AiEstimateSmokeCase, AiEstimateSmokeCaseResult } from "./aiEstimateSmokeHarness";
import {
  buildAiEstimateCorpusFingerprint,
  isStrictConsolePolicyPassed,
  runAiEstimateSmokeCases,
} from "./aiEstimateSmokeHarness";

export type AiEstimateWebHarnessRun = {
  target: "web";
  caseResults: AiEstimateSmokeCaseResult[];
  corpusFingerprint: string;
  console_error_policy_strict: boolean;
  web_smoke_harness_created: true;
};

export async function runAiEstimateWebHarness(input: {
  cases: readonly AiEstimateSmokeCase[];
  consoleErrors?: readonly string[];
}): Promise<AiEstimateWebHarnessRun> {
  return {
    target: "web",
    caseResults: await runAiEstimateSmokeCases({ target: "web", cases: input.cases }),
    corpusFingerprint: buildAiEstimateCorpusFingerprint(input.cases),
    console_error_policy_strict: isStrictConsolePolicyPassed(input.consoleErrors ?? []),
    web_smoke_harness_created: true,
  };
}
