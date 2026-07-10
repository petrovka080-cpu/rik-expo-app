import fs from "node:fs";
import path from "node:path";

import { aiEvalCasesAreVersioned } from "../../src/lib/aiPlatform/eval/AiEvalCase";
import {
  AI_ESTIMATE_GOLDEN_CASES_FIXTURE,
  AI_PLATFORM_EVALOPS_ROOT,
  AI_RED_TEAM_CASES_FIXTURE,
  currentGitState,
  timestampForPath,
  writeJson,
} from "./evalOpsAuditUtils";
import {
  AI_EVAL_FIXTURE_GENERATOR_ID,
  buildAiEstimateGoldenEvalFixture,
  buildAiRedTeamEvalFixture,
} from "./generateAiEvalFixtures";

export const GREEN_AI_EVAL_FIXTURE_GENERATION = "GREEN_AI_EVAL_FIXTURE_GENERATION" as const;
export const STOP_AI_EVAL_FIXTURE_GENERATION_FAILED = "STOP_AI_EVAL_FIXTURE_GENERATION_FAILED" as const;

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readFixture(filePath: string): string {
  return fs.readFileSync(path.resolve(filePath), "utf8");
}

export function verifyAiEvalFixturesGenerated(input: { writeSummary?: boolean } = {}) {
  const goldenExpected = buildAiEstimateGoldenEvalFixture();
  const redTeamExpected = buildAiRedTeamEvalFixture();
  const goldenActualText = readFixture(AI_ESTIMATE_GOLDEN_CASES_FIXTURE);
  const redTeamActualText = readFixture(AI_RED_TEAM_CASES_FIXTURE);
  const goldenMatchesGenerator = goldenActualText === canonicalJson(goldenExpected);
  const redTeamMatchesGenerator = redTeamActualText === canonicalJson(redTeamExpected);
  const goldenActual = JSON.parse(goldenActualText) as typeof goldenExpected;
  const redTeamActual = JSON.parse(redTeamActualText) as typeof redTeamExpected;
  const evalCasesAreVersioned = aiEvalCasesAreVersioned(goldenActual.cases) && aiEvalCasesAreVersioned(redTeamActual.cases);
  const checks = {
    ai_eval_fixture_generator_created: true,
    golden_fixture_generated_by_script: goldenActual.generatedBy === AI_EVAL_FIXTURE_GENERATOR_ID,
    red_team_fixture_generated_by_script: redTeamActual.generatedBy === AI_EVAL_FIXTURE_GENERATOR_ID,
    golden_fixture_matches_generator: goldenMatchesGenerator,
    red_team_fixture_matches_generator: redTeamMatchesGenerator,
    eval_cases_are_versioned: evalCasesAreVersioned,
    manual_golden_overwrite_rejected: goldenMatchesGenerator && redTeamMatchesGenerator,
    golden_expected_update_requires_generator_change: goldenMatchesGenerator && redTeamMatchesGenerator,
  };
  const blockers = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);
  const summary = {
    final_status: blockers.length === 0 ? GREEN_AI_EVAL_FIXTURE_GENERATION : STOP_AI_EVAL_FIXTURE_GENERATION_FAILED,
    ...currentGitState(),
    generated_at: new Date().toISOString(),
    ...checks,
    golden_cases_total: goldenActual.cases.length,
    red_team_cases_total: redTeamActual.cases.length,
    blockers,
  };
  const summaryPath = path.join(AI_PLATFORM_EVALOPS_ROOT, "fixture-generation", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = verifyAiEvalFixturesGenerated({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_EVAL_FIXTURE_GENERATION) process.exitCode = 1;
}
