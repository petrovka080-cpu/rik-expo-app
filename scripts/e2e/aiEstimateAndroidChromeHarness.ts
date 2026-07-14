import type { AiEstimateSmokeCase, AiEstimateSmokeCaseResult } from "./aiEstimateSmokeHarness";
import {
  aiEstimateSmokeHarnessContract,
  buildAiEstimateCorpusFingerprint,
  isStrictConsolePolicyPassed,
  runAiEstimateSmokeCases,
} from "./aiEstimateSmokeHarness";

export const AI_ESTIMATE_ANDROID_CDP_MAX_TRANSPORT_RETRIES = 2;

export type AiEstimateAndroidChromeHarnessRun = {
  target: "android-chrome";
  caseResults: AiEstimateSmokeCaseResult[];
  corpusFingerprint: string;
  console_error_policy_strict: boolean;
  cdp_transport_retry_bounded: boolean;
  android_chrome_harness_created: true;
};

export async function runAiEstimateAndroidChromeHarness(input: {
  cases: readonly AiEstimateSmokeCase[];
  consoleErrors?: readonly string[];
}): Promise<AiEstimateAndroidChromeHarnessRun> {
  return {
    target: "android-chrome",
    caseResults: await runAiEstimateSmokeCases({
      target: "android-chrome",
      cases: input.cases,
      maxTransportRetries: AI_ESTIMATE_ANDROID_CDP_MAX_TRANSPORT_RETRIES,
    }),
    corpusFingerprint: buildAiEstimateCorpusFingerprint(input.cases),
    console_error_policy_strict: isStrictConsolePolicyPassed(input.consoleErrors ?? []),
    cdp_transport_retry_bounded: aiEstimateSmokeHarnessContract().cdp_transport_retry_bounded,
    android_chrome_harness_created: true,
  };
}
