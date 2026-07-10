import { readFileSync } from "node:fs";
import path from "node:path";

import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

export const GREEN_STAGING_RC_CASES_READY = "GREEN_STAGING_RC_CASES_READY" as const;
export const STOP_STAGING_RC_CASES_FAILED_NO_GREEN = "STOP_STAGING_RC_CASES_FAILED_NO_GREEN" as const;

export type StagingRcCase = {
  case_id: string;
  category: string;
  prompt_ru: string;
  expected_flow: string;
  requires_pdf?: boolean;
  requires_buyer_package?: boolean;
  requires_history?: boolean;
};

type StagingRcFixture = {
  schema: string;
  minimum_required_count: number;
  categories: string[];
  cases: StagingRcCase[];
};

export const STAGING_RC_REQUIRED_CATEGORIES = [
  "consumer_request",
  "foreman_materials",
  "foreman_subcontracts",
  "director_review",
  "buyer_package",
  "history_pdf_revision",
] as const;

const REQUIRED_WORK_SNIPPETS = [
  "Капитальный ремонт квартиры",
  "Алмазное бурение бетона",
  "Забор из профлиста",
  "Вентфасад",
  "Водоснабжение села",
  "Строительство дороги",
  "Строительство дамбы",
  "ЛЭП 10 кВ",
  "Мансардная крыша",
  "Подстанция 10 кВ",
] as const;

export function loadStagingReleaseCandidateCases(): StagingRcFixture {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "tests/fixtures/estimate/stagingReleaseCandidateCriticalCases.json"), "utf8"),
  ) as StagingRcFixture;
}

export function validateStagingReleaseCandidateCases(fixture = loadStagingReleaseCandidateCases()) {
  const counts = Object.fromEntries(
    STAGING_RC_REQUIRED_CATEGORIES.map((category) => [
      category,
      fixture.cases.filter((testCase) => testCase.category === category).length,
    ]),
  ) as Record<typeof STAGING_RC_REQUIRED_CATEGORIES[number], number>;
  const prompts = fixture.cases.map((testCase) => testCase.prompt_ru).join("\n");
  const duplicateIds = fixture.cases
    .map((testCase) => testCase.case_id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  const blockers = [
    fixture.schema === "ai-estimate-staging-release-candidate-critical-cases-v1" ? "" : "staging_rc_cases_schema_mismatch",
    fixture.cases.length >= 60 ? "" : "staging_rc_cases_total_below_60",
    ...STAGING_RC_REQUIRED_CATEGORIES.map((category) => counts[category] >= 10 ? "" : `${category}_count_below_10`),
    duplicateIds.length === 0 ? "" : "duplicate_case_ids",
    REQUIRED_WORK_SNIPPETS.every((snippet) => prompts.includes(snippet)) ? "" : "critical_work_families_missing",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_STAGING_RC_CASES_READY
      : STOP_STAGING_RC_CASES_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_rc_cases_created: true,
    staging_rc_cases_total: fixture.cases.length,
    consumer_cases_count: counts.consumer_request,
    foreman_materials_cases_count: counts.foreman_materials,
    foreman_subcontracts_cases_count: counts.foreman_subcontracts,
    director_cases_count: counts.director_review,
    buyer_cases_count: counts.buyer_package,
    history_pdf_revision_cases_count: counts.history_pdf_revision,
    critical_work_families_covered: REQUIRED_WORK_SNIPPETS.every((snippet) => prompts.includes(snippet)),
    same_staging_rc_corpus_used_for_web_android: true,
    case_ids: fixture.cases.map((testCase) => testCase.case_id),
    blocking_reasons: blockers,
  };
}

export function runAiEstimateStagingReleaseCandidateCases(input: { writeSummary?: boolean } = {}) {
  const summary = validateStagingReleaseCandidateCases();
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "critical-cases", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/critical-cases", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  const result = runAiEstimateStagingReleaseCandidateCases({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    staging_rc_cases_total: result.summary.staging_rc_cases_total,
    blocking_reasons: result.summary.blocking_reasons,
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
