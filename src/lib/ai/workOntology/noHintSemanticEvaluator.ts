import { CONSTRUCTION_WORK_ONTOLOGY_BY_KEY } from "./constructionWorkOntologyCatalog";
import type { WorkOntologyCategory, WorkOntologyUnit } from "./constructionWorkOntologyTypes";
import {
  GREEN_NO_HINT_WORK_ONTOLOGY,
  type NoHintAuditSummary,
  type NoHintCandidate,
  type NoHintCaseEvaluation,
  type NoHintConfusionCase,
  type NoHintConfusionSummary,
  type NoHintRealUserWorkCase,
  type NoHintWorkOntologyResolution,
} from "./noHintSemanticAuditTypes";
import { resolveNoHintWorkOntologyIntent } from "./workOntologyResolverContracts";
import { rankNoHintWorkOntologyCandidates } from "./workOntologyCandidateRanker";

export const NO_HINT_EXPECTED_REAL_USER_CASES_TOTAL = 3000;
export const NO_HINT_EXPECTED_CONFUSION_CASES_TOTAL = 700;
export const NO_HINT_RESOLVED_PASS_PERCENT_MIN = 95;
export const NO_HINT_AMBIGUOUS_PASS_PERCENT_MIN = 98;
export const NO_HINT_HIGH_CONFIDENCE_WRONG_FLOOR = 0.85;

const CANONICAL_HINT_PATTERN =
  /\b(?:type|workKey|selectedWorkKey|canonical_work_key|canonical work key)\b|(?:\u0442\u0438\u043f)\s+[a-z0-9_]+|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/iu;
const INTERNAL_VISIBLE_PATTERN =
  /\b(?:selectedWorkKey|workKey|materialKey|rateKey|rowId|sourcePayloadHash|known_catalog_price|price_required)\b|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/i;
const GENERIC_WORK_KEY_PATTERN = /\b(?:other_construction_work|generic_repair|unknown_work|template_gap|fallback)\b/i;
const MOJIBAKE_PATTERN =
  /(?:\uFFFD|Р В Р’В [\u0080-\u00bf]|Р В Р Р‹[\u0080-\u00bf]|Р В Р вЂ [\u0080-\u00bf])/u;

export type NoHintDetailedEvaluation = NoHintCaseEvaluation & {
  input: string;
  expected_category: WorkOntologyCategory | null;
  actual_category: WorkOntologyCategory | null;
  expected_quantity: number | null;
  expected_unit: WorkOntologyUnit | null;
  auto_selected: boolean;
  generic_fallback_used: boolean;
  first_item_fallback_used: boolean;
  random_choice_used: boolean;
  recipe_scope: string | null;
  material_recipe_scope: string | null;
  pricebook_scope: string | null;
};

export type NoHintSemanticAudit = {
  final_status: string;
  summary: NoHintAuditSummary;
  evaluations: NoHintDetailedEvaluation[];
};

export type NoHintCandidateRankingAudit = {
  final_status: string;
  total_cases: number;
  candidate_lists_checked: number;
  deterministic_failures: number;
  duplicate_candidate_lists: number;
  unsorted_candidate_lists: number;
  over_max_candidate_lists: number;
  internal_visible_candidates: number;
  mojibake_visible_candidates: number;
  broad_ambiguous_cases_checked: number;
  broad_ambiguous_cases_passed: number;
  expected_key_missing_from_candidates: number;
  failures: unknown[];
  examples: unknown[];
  fake_green_claimed: false;
};

export type NoHintScopeReadiness = {
  total_required: number;
  ready: number;
  missing: number;
  failures: unknown[];
  fake_green_claimed: false;
};

function percent(passed: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((passed / total) * 10_000) / 100;
}

function expectedKeys(testCase: NoHintRealUserWorkCase): string[] {
  return [
    testCase.expected_canonical_work_key,
    ...(testCase.acceptable_canonical_work_keys ?? []),
  ].filter((value): value is string => Boolean(value));
}

function textHasCanonicalHint(text: string): boolean {
  return CANONICAL_HINT_PATTERN.test(text);
}

function textHasUnderscoreKey(text: string): boolean {
  return /[a-z][a-z0-9]+(?:_[a-z0-9]+)+/i.test(text) || text.includes("_");
}

function textHasMojibake(text: string | null | undefined): boolean {
  return Boolean(text && MOJIBAKE_PATTERN.test(text));
}

function textHasInternalVisible(text: string | null | undefined): boolean {
  return Boolean(text && INTERNAL_VISIBLE_PATTERN.test(text));
}

function hasGenericFallback(result: NoHintWorkOntologyResolution): boolean {
  return [
    result.canonical_work_key,
    result.selected_work_key,
    result.recipe_scope,
    result.material_recipe_scope,
    result.pricebook_scope,
  ]
    .filter(Boolean)
    .some((value) => GENERIC_WORK_KEY_PATTERN.test(String(value)));
}

function candidatesHaveDuplicates(candidates: readonly NoHintCandidate[]): boolean {
  return new Set(candidates.map((candidate) => candidate.canonical_work_key)).size !== candidates.length;
}

function candidatesAreSorted(candidates: readonly NoHintCandidate[]): boolean {
  return candidates.every((candidate, index) => {
    const previous = candidates[index - 1];
    if (!previous) return true;
    if (previous.score !== candidate.score) return previous.score >= candidate.score;
    return previous.canonical_work_key.localeCompare(candidate.canonical_work_key) <= 0;
  });
}

function candidatesHaveVisibleLeak(candidates: readonly NoHintCandidate[]): boolean {
  return candidates.some((candidate) => textHasInternalVisible(candidate.visible_name_ru));
}

function candidatesHaveMojibake(candidates: readonly NoHintCandidate[]): boolean {
  return candidates.some((candidate) => textHasMojibake(candidate.visible_name_ru));
}

function candidateListFailures(result: NoHintWorkOntologyResolution): string[] {
  const failures: string[] = [];
  if (result.top_candidates.length > 8) failures.push("TOP_CANDIDATES_OVER_MAX");
  if (candidatesHaveDuplicates(result.top_candidates)) failures.push("DUPLICATE_CANDIDATES");
  if (!candidatesAreSorted(result.top_candidates)) failures.push("UNSORTED_CANDIDATES");
  if (candidatesHaveVisibleLeak(result.top_candidates)) failures.push("INTERNAL_VISIBLE_CANDIDATE");
  if (candidatesHaveMojibake(result.top_candidates)) failures.push("MOJIBAKE_VISIBLE_CANDIDATE");
  return failures;
}

function quantityMatches(actual: number | null, expected: number | null | undefined): boolean {
  if (expected === undefined || expected === null) return true;
  return actual !== null && Math.abs(actual - expected) < 0.00001;
}

function unitMatches(actual: WorkOntologyUnit | null, expected: WorkOntologyUnit | null | undefined): boolean {
  if (expected === undefined || expected === null) return true;
  return actual === expected;
}

function isHighConfidenceWrong(testCase: NoHintRealUserWorkCase, result: NoHintWorkOntologyResolution): boolean {
  if (testCase.expected_status !== "RESOLVED") return false;
  if (result.status !== "RESOLVED") return false;
  const accepted = expectedKeys(testCase);
  return result.confidence >= NO_HINT_HIGH_CONFIDENCE_WRONG_FLOOR && !accepted.includes(result.canonical_work_key ?? "");
}

export function evaluateNoHintCase(testCase: NoHintRealUserWorkCase): NoHintDetailedEvaluation {
  const result = resolveNoHintWorkOntologyIntent({
    userInput: testCase.user_input_ru,
    country: testCase.country,
    region: testCase.region,
  });
  const accepted = expectedKeys(testCase);
  const failures: string[] = [];

  if (textHasCanonicalHint(testCase.user_input_ru)) failures.push("CANONICAL_HINT_IN_USER_INPUT");
  if (textHasUnderscoreKey(testCase.user_input_ru)) failures.push("UNDERSCORE_KEY_IN_USER_INPUT");
  if (textHasMojibake(testCase.user_input_ru)) failures.push("MOJIBAKE_IN_USER_INPUT");
  failures.push(...candidateListFailures(result));

  if (testCase.expected_status === "RESOLVED") {
    if (result.status !== "RESOLVED") failures.push(`STATUS_${result.status}`);
    if (!accepted.includes(result.canonical_work_key ?? "")) failures.push("WRONG_CANONICAL_WORK_KEY");
    if (result.selected_work_key !== result.canonical_work_key || !result.selected_work_key) {
      failures.push("SELECTED_WORK_KEY_LOST");
    }
    if (testCase.expected_category && result.category !== testCase.expected_category) failures.push("WRONG_CATEGORY");
    if (!result.auto_selected) failures.push("RESOLVED_NOT_AUTO_SELECTED");
  } else if (testCase.expected_status === "AMBIGUOUS_WORK_INPUT") {
    if (result.status !== "AMBIGUOUS_WORK_INPUT") failures.push(`STATUS_${result.status}`);
    if (result.auto_selected || result.canonical_work_key || result.selected_work_key) failures.push("AMBIGUOUS_AUTO_SELECTED");
    const min = testCase.expected_top_candidates_min ?? 1;
    const max = testCase.expected_top_candidates_max ?? 8;
    if (result.top_candidates.length < min) failures.push("AMBIGUOUS_CANDIDATES_BELOW_MIN");
    if (result.top_candidates.length > max) failures.push("AMBIGUOUS_CANDIDATES_OVER_MAX");
  } else if (result.status !== testCase.expected_status) {
    failures.push(`STATUS_${result.status}`);
  }

  if (testCase.must_not_match?.includes(result.canonical_work_key ?? "")) failures.push("MUST_NOT_MATCH_SELECTED");
  if (!quantityMatches(result.quantity, testCase.expected_quantity)) failures.push("QUANTITY_MISMATCH");
  if (!unitMatches(result.unit, testCase.expected_unit)) failures.push("UNIT_MISMATCH");
  if (testCase.expected_recipe_scope_required && !result.recipe_scope) failures.push("RECIPE_SCOPE_MISSING");
  if (testCase.expected_material_recipe_scope_required && !result.material_recipe_scope) failures.push("MATERIAL_RECIPE_SCOPE_MISSING");
  if (testCase.expected_pricebook_scope_required && !result.pricebook_scope) failures.push("PRICEBOOK_SCOPE_MISSING");
  if (textHasInternalVisible(result.visible_name_ru)) failures.push("INTERNAL_VISIBLE_RESULT");
  if (textHasMojibake(result.visible_name_ru)) failures.push("MOJIBAKE_VISIBLE_RESULT");
  if (hasGenericFallback(result)) failures.push("GENERIC_FALLBACK_USED");
  if (result.first_item_fallback_used) failures.push("FIRST_ITEM_FALLBACK_USED");
  if (result.random_choice_used) failures.push("RANDOM_CHOICE_USED");
  if (result.fake_green_claimed) failures.push("FAKE_GREEN_CLAIMED");

  return {
    case_id: testCase.id,
    input: testCase.user_input_ru,
    passed: failures.length === 0,
    failures,
    expected_status: testCase.expected_status,
    expected_canonical_work_key: testCase.expected_canonical_work_key ?? null,
    acceptable_canonical_work_keys: accepted,
    actual_status: result.status,
    actual_canonical_work_key: result.canonical_work_key,
    selected_work_key: result.selected_work_key,
    expected_category: testCase.expected_category ?? null,
    actual_category: result.category,
    confidence: result.confidence,
    expected_quantity: testCase.expected_quantity ?? null,
    quantity: result.quantity,
    expected_unit: testCase.expected_unit ?? null,
    unit: result.unit,
    top_candidates: result.top_candidates,
    auto_selected: result.auto_selected,
    generic_fallback_used: result.generic_fallback_used || hasGenericFallback(result),
    first_item_fallback_used: result.first_item_fallback_used,
    random_choice_used: result.random_choice_used,
    recipe_scope: result.recipe_scope,
    material_recipe_scope: result.material_recipe_scope,
    pricebook_scope: result.pricebook_scope,
  };
}

export function evaluateNoHintSemanticAudit(cases: readonly NoHintRealUserWorkCase[]): NoHintSemanticAudit {
  const evaluations = cases.map(evaluateNoHintCase);
  const resolved = evaluations.filter((item) => item.expected_status === "RESOLVED");
  const ambiguous = evaluations.filter((item) => item.expected_status === "AMBIGUOUS_WORK_INPUT");
  const highConfidenceWrong = cases.filter((testCase) => {
    const result = resolveNoHintWorkOntologyIntent({
      userInput: testCase.user_input_ru,
      country: testCase.country,
      region: testCase.region,
    });
    return isHighConfidenceWrong(testCase, result);
  }).length;
  const blockers: string[] = [];

  const summary: NoHintAuditSummary = {
    no_hint_cases_total: cases.length,
    canonical_hints_found: evaluations.filter((item) => item.failures.includes("CANONICAL_HINT_IN_USER_INPUT")).length,
    underscore_keys_in_user_input: evaluations.filter((item) => item.failures.includes("UNDERSCORE_KEY_IN_USER_INPUT")).length,
    resolved_expected_cases_total: resolved.length,
    resolved_expected_cases_passed: resolved.filter((item) => item.passed).length,
    resolved_expected_cases_passed_percent: percent(resolved.filter((item) => item.passed).length, resolved.length),
    ambiguous_expected_cases_total: ambiguous.length,
    ambiguous_expected_cases_passed: ambiguous.filter((item) => item.passed).length,
    ambiguous_expected_cases_passed_percent: percent(ambiguous.filter((item) => item.passed).length, ambiguous.length),
    high_confidence_wrong_matches: highConfidenceWrong,
    known_work_to_generic_fallback: evaluations.filter((item) => item.generic_fallback_used).length,
    first_item_fallback_used: evaluations.filter((item) => item.first_item_fallback_used).length,
    random_choice_used: evaluations.filter((item) => item.random_choice_used).length,
    top_candidate_lists_valid: evaluations.every((item) =>
      !item.failures.some((failure) => failure.includes("CANDIDATE"))
    ),
    selected_work_key_lost: evaluations.filter((item) => item.failures.includes("SELECTED_WORK_KEY_LOST")).length,
    quantity_parser_regressions: evaluations.filter((item) =>
      item.failures.includes("QUANTITY_MISMATCH") || item.failures.includes("UNIT_MISMATCH")
    ).length,
    internal_keys_visible: evaluations.filter((item) =>
      item.failures.includes("INTERNAL_VISIBLE_RESULT") || item.failures.includes("INTERNAL_VISIBLE_CANDIDATE")
    ).length,
    mojibake_found: evaluations.filter((item) =>
      item.failures.some((failure) => failure.startsWith("MOJIBAKE"))
    ).length,
    duplicate_candidates: evaluations.filter((item) => item.failures.includes("DUPLICATE_CANDIDATES")).length,
    recipe_scope_missing: evaluations.filter((item) => item.failures.includes("RECIPE_SCOPE_MISSING")).length,
    material_recipe_scope_missing: evaluations.filter((item) => item.failures.includes("MATERIAL_RECIPE_SCOPE_MISSING")).length,
    pricebook_scope_missing: evaluations.filter((item) => item.failures.includes("PRICEBOOK_SCOPE_MISSING")).length,
    fake_green_claimed: false,
    blockers,
  };

  if (summary.no_hint_cases_total !== NO_HINT_EXPECTED_REAL_USER_CASES_TOTAL) {
    blockers.push(`NO_HINT_CASE_COUNT_${summary.no_hint_cases_total}`);
  }
  if (summary.canonical_hints_found !== 0) blockers.push(`CANONICAL_HINTS_${summary.canonical_hints_found}`);
  if (summary.underscore_keys_in_user_input !== 0) blockers.push(`UNDERSCORE_KEYS_${summary.underscore_keys_in_user_input}`);
  if (summary.resolved_expected_cases_passed_percent < NO_HINT_RESOLVED_PASS_PERCENT_MIN) {
    blockers.push(`RESOLVED_PASS_PERCENT_${summary.resolved_expected_cases_passed_percent}`);
  }
  if (summary.ambiguous_expected_cases_passed_percent < NO_HINT_AMBIGUOUS_PASS_PERCENT_MIN) {
    blockers.push(`AMBIGUOUS_PASS_PERCENT_${summary.ambiguous_expected_cases_passed_percent}`);
  }
  if (summary.high_confidence_wrong_matches !== 0) blockers.push(`HIGH_CONFIDENCE_WRONG_${summary.high_confidence_wrong_matches}`);
  if (summary.known_work_to_generic_fallback !== 0) blockers.push(`GENERIC_FALLBACK_${summary.known_work_to_generic_fallback}`);
  if (summary.first_item_fallback_used !== 0) blockers.push(`FIRST_ITEM_FALLBACK_${summary.first_item_fallback_used}`);
  if (summary.random_choice_used !== 0) blockers.push(`RANDOM_CHOICE_${summary.random_choice_used}`);
  if (!summary.top_candidate_lists_valid) blockers.push("TOP_CANDIDATE_LISTS_INVALID");
  if (summary.selected_work_key_lost !== 0) blockers.push(`SELECTED_WORK_KEY_LOST_${summary.selected_work_key_lost}`);
  if (summary.quantity_parser_regressions !== 0) blockers.push(`QUANTITY_UNIT_REGRESSIONS_${summary.quantity_parser_regressions}`);
  if (summary.internal_keys_visible !== 0) blockers.push(`INTERNAL_KEYS_VISIBLE_${summary.internal_keys_visible}`);
  if (summary.mojibake_found !== 0) blockers.push(`MOJIBAKE_${summary.mojibake_found}`);
  if (summary.recipe_scope_missing !== 0) blockers.push(`RECIPE_SCOPE_MISSING_${summary.recipe_scope_missing}`);
  if (summary.material_recipe_scope_missing !== 0) blockers.push(`MATERIAL_RECIPE_SCOPE_MISSING_${summary.material_recipe_scope_missing}`);
  if (summary.pricebook_scope_missing !== 0) blockers.push(`PRICEBOOK_SCOPE_MISSING_${summary.pricebook_scope_missing}`);

  return {
    final_status: blockers.length === 0 ? GREEN_NO_HINT_WORK_ONTOLOGY : "BLOCKED_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT",
    summary,
    evaluations,
  };
}

export function evaluateNoHintConfusionHardSet(cases: readonly NoHintConfusionCase[]): {
  final_status: string;
  summary: NoHintConfusionSummary;
  evaluations: NoHintDetailedEvaluation[];
} {
  const evaluations = cases.map(evaluateNoHintCase);
  const blockers: string[] = [];
  const highConfidenceWrong = evaluations.filter((item) =>
    item.expected_status === "RESOLVED" &&
    item.actual_status === "RESOLVED" &&
    !item.acceptable_canonical_work_keys.includes(item.actual_canonical_work_key ?? "") &&
    item.confidence >= NO_HINT_HIGH_CONFIDENCE_WRONG_FLOOR
  ).length;
  const categoryInversions = evaluations.filter((item) =>
    item.expected_category !== null &&
    item.actual_category !== null &&
    item.actual_category !== item.expected_category
  ).length;
  const wrongAutoSelectForAmbiguous = evaluations.filter((item) =>
    item.expected_status === "AMBIGUOUS_WORK_INPUT" && item.auto_selected
  ).length;
  const summary: NoHintConfusionSummary = {
    hard_confusion_cases_total: cases.length,
    high_confidence_wrong_matches: highConfidenceWrong,
    category_inversions: categoryInversions,
    wrong_auto_select_for_ambiguous_input: wrongAutoSelectForAmbiguous,
    fake_green_claimed: false,
    blockers,
  };
  if (summary.hard_confusion_cases_total !== NO_HINT_EXPECTED_CONFUSION_CASES_TOTAL) {
    blockers.push(`CONFUSION_COUNT_${summary.hard_confusion_cases_total}`);
  }
  if (summary.high_confidence_wrong_matches !== 0) blockers.push(`HIGH_CONFIDENCE_WRONG_${summary.high_confidence_wrong_matches}`);
  if (summary.category_inversions !== 0) blockers.push(`CATEGORY_INVERSIONS_${summary.category_inversions}`);
  if (summary.wrong_auto_select_for_ambiguous_input !== 0) {
    blockers.push(`WRONG_AUTO_SELECT_AMBIGUOUS_${summary.wrong_auto_select_for_ambiguous_input}`);
  }
  const failed = evaluations.filter((item) => !item.passed).length;
  if (failed !== 0) blockers.push(`CONFUSION_CASE_FAILURES_${failed}`);
  return {
    final_status: blockers.length === 0 ? GREEN_NO_HINT_WORK_ONTOLOGY : "BLOCKED_WORK_ONTOLOGY_NO_HINT_CONFUSION_HARD_SET",
    summary,
    evaluations,
  };
}

export function evaluateNoHintCandidateRanking(cases: readonly NoHintRealUserWorkCase[]): NoHintCandidateRankingAudit {
  const failures: unknown[] = [];
  const examples: unknown[] = [];
  let deterministicFailures = 0;
  let duplicateCandidateLists = 0;
  let unsortedCandidateLists = 0;
  let overMaxCandidateLists = 0;
  let internalVisibleCandidates = 0;
  let mojibakeVisibleCandidates = 0;
  let broadAmbiguousCasesChecked = 0;
  let broadAmbiguousCasesPassed = 0;
  let expectedKeyMissingFromCandidates = 0;

  for (const testCase of cases) {
    const first = rankNoHintWorkOntologyCandidates(testCase.user_input_ru, 8);
    const second = rankNoHintWorkOntologyCandidates(testCase.user_input_ru, 8);
    const deterministic = JSON.stringify(first) === JSON.stringify(second);
    if (!deterministic) deterministicFailures += 1;
    if (candidatesHaveDuplicates(first)) duplicateCandidateLists += 1;
    if (!candidatesAreSorted(first)) unsortedCandidateLists += 1;
    if (first.length > 8) overMaxCandidateLists += 1;
    if (candidatesHaveVisibleLeak(first)) internalVisibleCandidates += 1;
    if (candidatesHaveMojibake(first)) mojibakeVisibleCandidates += 1;
    const accepted = expectedKeys(testCase);
    if (testCase.expected_status === "RESOLVED" && !first.some((candidate) => accepted.includes(candidate.canonical_work_key))) {
      expectedKeyMissingFromCandidates += 1;
      if (examples.length < 50) {
        examples.push({
          id: testCase.id,
          input: testCase.user_input_ru,
          expected: accepted,
          candidates: first,
        });
      }
    }
    if (testCase.expected_status === "AMBIGUOUS_WORK_INPUT") {
      broadAmbiguousCasesChecked += 1;
      const min = testCase.expected_top_candidates_min ?? 1;
      const max = testCase.expected_top_candidates_max ?? 8;
      if (first.length >= min && first.length <= max && !candidatesHaveDuplicates(first) && candidatesAreSorted(first)) {
        broadAmbiguousCasesPassed += 1;
      }
    }
  }

  if (deterministicFailures !== 0) failures.push(`DETERMINISTIC_FAILURES_${deterministicFailures}`);
  if (duplicateCandidateLists !== 0) failures.push(`DUPLICATE_CANDIDATES_${duplicateCandidateLists}`);
  if (unsortedCandidateLists !== 0) failures.push(`UNSORTED_CANDIDATES_${unsortedCandidateLists}`);
  if (overMaxCandidateLists !== 0) failures.push(`OVER_MAX_CANDIDATES_${overMaxCandidateLists}`);
  if (internalVisibleCandidates !== 0) failures.push(`INTERNAL_VISIBLE_CANDIDATES_${internalVisibleCandidates}`);
  if (mojibakeVisibleCandidates !== 0) failures.push(`MOJIBAKE_VISIBLE_CANDIDATES_${mojibakeVisibleCandidates}`);
  if (expectedKeyMissingFromCandidates !== 0) failures.push(`EXPECTED_KEY_MISSING_${expectedKeyMissingFromCandidates}`);
  if (broadAmbiguousCasesChecked > 0 && broadAmbiguousCasesPassed !== broadAmbiguousCasesChecked) {
    failures.push(`BROAD_AMBIGUOUS_RANKING_${broadAmbiguousCasesPassed}_${broadAmbiguousCasesChecked}`);
  }

  return {
    final_status: failures.length === 0 ? GREEN_NO_HINT_WORK_ONTOLOGY : "BLOCKED_WORK_ONTOLOGY_NO_HINT_CANDIDATE_RANKING",
    total_cases: cases.length,
    candidate_lists_checked: cases.length,
    deterministic_failures: deterministicFailures,
    duplicate_candidate_lists: duplicateCandidateLists,
    unsorted_candidate_lists: unsortedCandidateLists,
    over_max_candidate_lists: overMaxCandidateLists,
    internal_visible_candidates: internalVisibleCandidates,
    mojibake_visible_candidates: mojibakeVisibleCandidates,
    broad_ambiguous_cases_checked: broadAmbiguousCasesChecked,
    broad_ambiguous_cases_passed: broadAmbiguousCasesPassed,
    expected_key_missing_from_candidates: expectedKeyMissingFromCandidates,
    failures,
    examples,
    fake_green_claimed: false,
  };
}

export function summarizeScopeReadiness(
  evaluations: readonly NoHintDetailedEvaluation[],
  scope: "recipe_scope" | "material_recipe_scope" | "pricebook_scope",
): NoHintScopeReadiness {
  const required = evaluations.filter((item) => item.expected_status === "RESOLVED");
  const failures = required
    .filter((item) => !item[scope])
    .map((item) => ({
      case_id: item.case_id,
      input: item.input,
      selected_work_key: item.selected_work_key,
      status: item.actual_status,
    }));
  return {
    total_required: required.length,
    ready: required.length - failures.length,
    missing: failures.length,
    failures: failures.slice(0, 100),
    fake_green_claimed: false,
  };
}

export function ontologyEntryExists(workKey: string): boolean {
  return CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.has(workKey);
}
