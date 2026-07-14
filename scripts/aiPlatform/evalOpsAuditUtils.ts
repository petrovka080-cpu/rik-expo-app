import { readFileSync } from "node:fs";
import path from "node:path";

import type { AiEvalCase } from "../../src/lib/aiPlatform/eval/AiEvalContract";
import {
  currentGitState,
  gitStatusShort,
  newestSummary,
  runCommand,
  timestampForPath,
  touchedFilesInHead,
  writeJson,
} from "../architecture/aiPlatformKernelAuditUtils";

export {
  currentGitState,
  gitStatusShort,
  newestSummary,
  runCommand,
  timestampForPath,
  touchedFilesInHead,
  writeJson,
};

export const AI_PLATFORM_EVALOPS_ROOT = path.join(".release-runtime", "ai-platform-evalops-golden-quality-drift-guard-v1");
export const AI_ESTIMATE_GOLDEN_CASES_FIXTURE = path.join("tests", "fixtures", "aiPlatform", "eval", "aiEstimateGoldenEvalCases.json");
export const AI_RED_TEAM_CASES_FIXTURE = path.join("tests", "fixtures", "aiPlatform", "eval", "aiRedTeamEvalCases.json");

export type AiEvalFixture = {
  version: string;
  generated_at: string;
  cases: AiEvalCase[];
};

export function loadAiEvalFixture(filePath: string): AiEvalFixture {
  return JSON.parse(readFileSync(filePath, "utf8")) as AiEvalFixture;
}

export function countCasesByTag(cases: readonly AiEvalCase[], tag: string): number {
  return cases.filter((testCase) => testCase.tags?.includes(tag)).length;
}

export function latestEvalOpsSummary<T extends { source_sha: string; final_status: string }>(dir: string, sourceSha: string, status: string) {
  return newestSummary<T>(path.join(AI_PLATFORM_EVALOPS_ROOT, dir), (summary) =>
    summary.source_sha === sourceSha && summary.final_status === status
  );
}
