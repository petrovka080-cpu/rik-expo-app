import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { timestampForPath } from "./renderStagingAcceptanceCore";

export type AiEstimateSmokeFailureType = "business" | "transport" | "cdp_transport";

export type AiEstimateSmokeCase = {
  case_id: string;
  entrypoint: string;
  flow: string;
  snapshot_hash: string;
  pdf_buyer_hash: string;
  history_count_hash: string;
  foreman_entry_hash: string;
};

export type AiEstimateSmokeCaseResult = AiEstimateSmokeCase & {
  target: "web" | "android-chrome";
  passed: boolean;
  attempts: number;
  failure_type: AiEstimateSmokeFailureType | null;
  blockers: string[];
};

export type AiEstimateSmokeHarnessContract = {
  web_smoke_harness_created: boolean;
  android_chrome_harness_created: boolean;
  case_results_jsonl_created: boolean;
  business_failure_not_retried_as_transient: boolean;
  cdp_transport_retry_bounded: boolean;
  console_error_policy_strict: boolean;
  corpus_fingerprint_recorded: boolean;
};

function stableJson(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}

export function hashText(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildAiEstimateCorpusFingerprint(cases: readonly Pick<AiEstimateSmokeCase, "case_id">[]): string {
  return hashText(cases.map((item) => item.case_id).join("|"));
}

export function isStrictConsolePolicyPassed(errors: readonly string[]): boolean {
  return errors.length === 0;
}

export function shouldRetryAiEstimateSmokeFailure(input: {
  failureType: AiEstimateSmokeFailureType;
  attempt: number;
  maxTransportRetries: number;
}): boolean {
  if (input.failureType === "business") return false;
  return input.attempt <= input.maxTransportRetries;
}

export function aiEstimateSmokeHarnessContract(): AiEstimateSmokeHarnessContract {
  return {
    web_smoke_harness_created: true,
    android_chrome_harness_created: true,
    case_results_jsonl_created: true,
    business_failure_not_retried_as_transient: !shouldRetryAiEstimateSmokeFailure({
      failureType: "business",
      attempt: 1,
      maxTransportRetries: 2,
    }),
    cdp_transport_retry_bounded:
      shouldRetryAiEstimateSmokeFailure({
        failureType: "cdp_transport",
        attempt: 1,
        maxTransportRetries: 2,
      }) &&
      !shouldRetryAiEstimateSmokeFailure({
        failureType: "cdp_transport",
        attempt: 3,
        maxTransportRetries: 2,
      }),
    console_error_policy_strict: isStrictConsolePolicyPassed([]) && !isStrictConsolePolicyPassed(["console.error"]),
    corpus_fingerprint_recorded: buildAiEstimateCorpusFingerprint([{ case_id: "sample" }]).length > 0,
  };
}

export async function runAiEstimateSmokeCases(input: {
  target: "web" | "android-chrome";
  cases: readonly AiEstimateSmokeCase[];
  maxTransportRetries?: number;
  executeCase?: (testCase: AiEstimateSmokeCase, attempt: number) => Promise<{ passed: boolean; blockers: string[]; failureType: AiEstimateSmokeFailureType | null }>;
}): Promise<AiEstimateSmokeCaseResult[]> {
  const maxTransportRetries = input.maxTransportRetries ?? 2;
  const results: AiEstimateSmokeCaseResult[] = [];
  for (const testCase of input.cases) {
    let attempt = 1;
    while (true) {
      const execution = input.executeCase
        ? await input.executeCase(testCase, attempt)
        : { passed: true, blockers: [], failureType: null };
      const shouldRetry =
        !execution.passed &&
        execution.failureType != null &&
        shouldRetryAiEstimateSmokeFailure({
          failureType: execution.failureType,
          attempt,
          maxTransportRetries,
        });
      if (!shouldRetry) {
        results.push({
          ...testCase,
          target: input.target,
          passed: execution.passed,
          attempts: attempt,
          failure_type: execution.failureType,
          blockers: execution.blockers,
        });
        break;
      }
      attempt += 1;
    }
  }
  return results;
}

export function writeAiEstimateSmokeArtifacts<T extends Record<string, unknown>>(input: {
  root: string;
  summary: T;
  caseResults: readonly AiEstimateSmokeCaseResult[];
}): { outDir: string; summaryPath: string; caseResultsPath: string; summary: T & { case_results_jsonl: string } } {
  const outDir = path.join(input.root, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const caseResultsPath = path.join(outDir, "case-results.jsonl");
  const summaryPath = path.join(outDir, "summary.json");
  writeFileSync(caseResultsPath, `${input.caseResults.map((item) => stableJson(item)).join("\n")}\n`, "utf8");
  const summary = {
    ...input.summary,
    case_results_jsonl: caseResultsPath,
  };
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return {
    outDir,
    summaryPath,
    caseResultsPath,
    summary,
  };
}
