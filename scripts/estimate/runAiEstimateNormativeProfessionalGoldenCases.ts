import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { buildAiEstimateMissingInputQuestions } from "../../src/lib/estimate/buildAiEstimateMissingInputQuestions";
import { buildNormativeParameterCompletenessModel } from "../../src/lib/estimate/buildNormativeParameterCompletenessModel";
import { applyAiEstimateMissingInputAnswer } from "../../src/lib/estimate/applyAiEstimateMissingInputAnswer";
import { buildAiEstimateNormativeWorkParameterPassport } from "../../src/lib/estimate/aiEstimateNormativeWorkParameterPassport";
import { classifyAiEstimateNormativeWorkFamily } from "../../src/lib/estimate/aiEstimateNormativeParameterFamilies";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { validateAiEstimateQuantityTrace } from "../../src/lib/estimate/validateAiEstimateQuantityTrace";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES =
  "GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES" as const;
export const STOP_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES_FAILED =
  "STOP_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES_FAILED" as const;

type GoldenCase = {
  id: string;
  templatePattern: string;
  prompt: string;
  expectedFamily: string;
  requiredKeys: string[];
};

type GoldenCaseResult = {
  id: string;
  template_id: string | null;
  passed: boolean;
  reason?: string;
};

type TemplateIndexEntry = {
  templateId: string;
  text: string;
  workFamily: string;
};

export type AiEstimateNormativeProfessionalGoldenCasesSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES
    | typeof STOP_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  fixture_cases: number;
  golden_50_passed: string;
  all_expected_families_matched: boolean;
  all_required_parameters_present: boolean;
  all_missing_questions_ranked_lte_5: boolean;
  all_quantity_traces_current: boolean;
  all_missing_answers_recalculate: boolean;
  blocking_reasons: string[];
};

const ROOT = path.join(".release-runtime", "ai-estimate-normative-parameter-completeness", "golden-cases");
const FIXTURE_PATH = path.join("tests", "fixtures", "estimate", "normativeProfessionalGoldenCases.json");
let templateIndexCache: TemplateIndexEntry[] | null = null;

function readCases(): GoldenCase[] {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as GoldenCase[];
}

function templateText(templateId: string): { text: string; workFamily: string } | null {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) return null;
  return {
    workFamily: classifyAiEstimateNormativeWorkFamily(passport),
    text: [
    passport.templateId,
    passport.workKey,
    passport.familyId,
    passport.category,
    passport.localizedNameRu,
    ...passport.aliases,
    ].join(" "),
  };
}

function buildTemplateIndex(): TemplateIndexEntry[] {
  if (templateIndexCache) return templateIndexCache;
  const entries: TemplateIndexEntry[] = [];
  const ids = listProfessionalWorkPassportTemplateIds();
  ids.forEach((templateId, index) => {
    const resolved = templateText(templateId);
    if (resolved) entries.push({ templateId, ...resolved });
    if (index > 0 && index % 250 === 0) clearProfessionalWorkPassportBuildCaches();
  });
  clearProfessionalWorkPassportBuildCaches();
  templateIndexCache = entries;
  return entries;
}

function findTemplateForCase(testCase: GoldenCase): string | null {
  const pattern = new RegExp(testCase.templatePattern, "i");
  const matching = buildTemplateIndex().filter((entry) => pattern.test(entry.text));
  const expected = matching.find((entry) => entry.workFamily === testCase.expectedFamily);
  return expected?.templateId ?? matching[0]?.templateId ?? null;
}

function answerForKey(key: string): string {
  if (/diameter|depth|thickness|insulation/i.test(key)) return "120";
  if (/voltage/i.test(key)) return "10";
  if (/power/i.test(key)) return "75";
  if (/section|specification|material|equipment|access|location/i.test(key)) return "уточнено по проекту";
  return "12";
}

function runCase(testCase: GoldenCase, index: number): GoldenCaseResult {
  try {
    const templateId = findTemplateForCase(testCase);
    if (!templateId) return { id: testCase.id, template_id: null, passed: false, reason: "template_not_found" };
    const passport = buildAiEstimateNormativeWorkParameterPassport(templateId);
    if (!passport) return { id: testCase.id, template_id: templateId, passed: false, reason: "passport_missing" };
    const revision = createEstimateDraftRevision({
      estimateDraftId: `norm-golden-${testCase.id}`,
      rawInput: testCase.prompt,
      selectedTemplateId: templateId,
      selectedTemplateName: passport.templateNameRu,
      createdAt: "2026-07-09T00:00:00.000Z",
    });
    const model = buildNormativeParameterCompletenessModel(revision);
    const questions = buildAiEstimateMissingInputQuestions({ revision, model });
    const cards = buildAiEstimateParameterCards({ revision, includeMissing: true });
    const trace = validateAiEstimateQuantityTrace({ revision });
    const cardKeys = new Set(cards.map((card) => card.key));
    const passportKeys = new Set(passport.requirements.map((requirement) => requirement.key));
    const missingRequired = testCase.requiredKeys.filter((key) => !passportKeys.has(key) && !cardKeys.has(key));
    const firstQuestion = questions?.questions[0] ?? null;
    const answerResult = firstQuestion
      ? applyAiEstimateMissingInputAnswer({
        revision,
        paramKey: firstQuestion.key,
        rawValue: answerForKey(firstQuestion.key),
        createdAt: "2026-07-09T00:01:00.000Z",
        revisionIndex: 2,
      })
      : null;
    const familyMatched = passport.workFamily === testCase.expectedFamily;
    const answerRecalculates = !firstQuestion ||
      Boolean(answerResult?.revision.params[firstQuestion.key]) &&
      answerResult?.revision.previousRevisionId === revision.revisionId;
    const passed = familyMatched &&
      missingRequired.length === 0 &&
      (questions?.questions.length ?? 0) <= 5 &&
      trace.ok &&
      answerRecalculates;
    return {
      id: testCase.id,
      template_id: templateId,
      passed,
      reason: passed
        ? undefined
        : `family:${passport.workFamily}/${testCase.expectedFamily} missing:${missingRequired.join(",")} questions:${questions?.questions.length ?? -1} trace:${trace.blockingReasons.join("|")} answer:${answerRecalculates}`,
    };
  } catch (error) {
    return {
      id: testCase.id,
      template_id: null,
      passed: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (index > 0 && index % 10 === 0) clearProfessionalWorkPassportBuildCaches();
  }
}

function writeText(filePath: string, value: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value, "utf8");
}

export function runAiEstimateNormativeProfessionalGoldenCases(input: { writeSummary?: boolean } = {}) {
  const cases = readCases();
  const results = cases.map(runCase);
  clearProfessionalWorkPassportBuildCaches();
  const failures = results.filter((result) => !result.passed);
  const blockers = [
    cases.length === 50 ? "" : `fixture_cases:${cases.length}`,
    failures.length === 0 ? "" : `golden_failures:${failures.length}`,
  ].filter(Boolean);
  const summary: AiEstimateNormativeProfessionalGoldenCasesSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES
      : STOP_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    fixture_cases: cases.length,
    golden_50_passed: `${results.filter((result) => result.passed).length}/${cases.length}`,
    all_expected_families_matched: failures.every((failure) => !String(failure.reason).includes("family:")),
    all_required_parameters_present: failures.every((failure) => !String(failure.reason).includes("missing:")),
    all_missing_questions_ranked_lte_5: failures.every((failure) => !String(failure.reason).includes("questions:")),
    all_quantity_traces_current: failures.every((failure) => !String(failure.reason).includes("trace:")),
    all_missing_answers_recalculate: failures.every((failure) => !String(failure.reason).includes("answer:false")),
    blocking_reasons: blockers,
  };
  const outDir = path.join(ROOT, timestampForPath());
  const summaryPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) {
    writeJson(summaryPath, summary);
    writeText(path.join(outDir, "failures.json"), `${JSON.stringify(failures, null, 2)}\n`);
  }
  return { summary, results, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateNormativeProfessionalGoldenCases({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES) process.exitCode = 1;
}
