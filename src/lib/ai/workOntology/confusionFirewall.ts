import type { NoHintDetailedEvaluation } from "./noHintSemanticEvaluator";

export const CONFUSION_FIREWALL_1500_WAVE =
  "S_CONFUSION_FIREWALL_1500_REAL_WORK_ESTIMATE_AUDIT_CLOSEOUT_POINT_OF_NO_RETURN" as const;

export const GREEN_CONFUSION_FIREWALL_1500 =
  "GREEN_CONFUSION_FIREWALL_1500_REAL_WORK_ESTIMATE_AUDIT_READY" as const;

const CANONICAL_HINT_PATTERN =
  /\b(?:type|workKey|selectedWorkKey|canonical_work_key|canonical work key)\b|(?:\u0442\u0438\u043f)\s+[a-z0-9_]+|[a-z][a-z0-9]+(?:_[a-z0-9]+)+/iu;
const UNDERSCORE_KEY_PATTERN = /[a-z][a-z0-9]+(?:_[a-z0-9]+)+|_/i;
const GENERIC_FALLBACK_PATTERN = /\b(?:other_construction_work|generic_repair|unknown_work|template_gap|fallback)\b/i;

export function hasCanonicalWorkHint(userInput: string): boolean {
  return CANONICAL_HINT_PATTERN.test(userInput);
}

export function hasUnderscoreKeyInUserInput(userInput: string): boolean {
  return UNDERSCORE_KEY_PATTERN.test(userInput);
}

export function evaluationUsesGenericFallback(evaluation: NoHintDetailedEvaluation): boolean {
  return evaluation.generic_fallback_used ||
    [
      evaluation.actual_canonical_work_key,
      evaluation.selected_work_key,
      evaluation.recipe_scope,
      evaluation.material_recipe_scope,
      evaluation.pricebook_scope,
    ].some((value) => GENERIC_FALLBACK_PATTERN.test(String(value ?? "")));
}

export function buildConfusionFirewallBlockers(summary: {
  real_work_cases_total: number;
  canonical_hints_found: number;
  underscore_keys_in_user_input: number;
  unresolved_known_work_cases: number;
  high_confidence_wrong_matches: number;
  wrong_work_matches: number;
  known_work_to_generic_fallback: number;
  first_item_fallback_used: number;
  random_choice_used: number;
  selected_work_key_lost: number;
  ukladka_to_kladka_wrong_matches: number;
  substring_kladka_inside_ukladka_used: boolean;
  object_dominance_passed: boolean;
  masonry_requires_masonry_object: boolean;
  cross_domain_row_leaks: number;
  row_without_provenance: number;
  generic_material_rows: number;
  paid_control_rows: number;
  fake_green_claimed: boolean;
}): string[] {
  const blockers: string[] = [];
  if (summary.real_work_cases_total !== 1500) blockers.push(`REAL_WORK_CASES_${summary.real_work_cases_total}`);
  if (summary.canonical_hints_found !== 0) blockers.push(`CANONICAL_HINTS_${summary.canonical_hints_found}`);
  if (summary.underscore_keys_in_user_input !== 0) blockers.push(`UNDERSCORE_KEYS_${summary.underscore_keys_in_user_input}`);
  if (summary.unresolved_known_work_cases !== 0) blockers.push(`UNRESOLVED_KNOWN_WORK_${summary.unresolved_known_work_cases}`);
  if (summary.high_confidence_wrong_matches !== 0) blockers.push(`HIGH_CONFIDENCE_WRONG_${summary.high_confidence_wrong_matches}`);
  if (summary.wrong_work_matches !== 0) blockers.push(`WRONG_WORK_MATCHES_${summary.wrong_work_matches}`);
  if (summary.known_work_to_generic_fallback !== 0) blockers.push(`GENERIC_FALLBACK_${summary.known_work_to_generic_fallback}`);
  if (summary.first_item_fallback_used !== 0) blockers.push(`FIRST_ITEM_FALLBACK_${summary.first_item_fallback_used}`);
  if (summary.random_choice_used !== 0) blockers.push(`RANDOM_CHOICE_${summary.random_choice_used}`);
  if (summary.selected_work_key_lost !== 0) blockers.push(`SELECTED_WORK_KEY_LOST_${summary.selected_work_key_lost}`);
  if (summary.ukladka_to_kladka_wrong_matches !== 0) blockers.push(`UKLADKA_TO_KLADKA_${summary.ukladka_to_kladka_wrong_matches}`);
  if (summary.substring_kladka_inside_ukladka_used) blockers.push("SUBSTRING_KLADKA_INSIDE_UKLADKA_USED");
  if (!summary.object_dominance_passed) blockers.push("OBJECT_DOMINANCE_FAILED");
  if (!summary.masonry_requires_masonry_object) blockers.push("MASONRY_REQUIRES_OBJECT_FAILED");
  if (summary.cross_domain_row_leaks !== 0) blockers.push(`CROSS_DOMAIN_ROW_LEAKS_${summary.cross_domain_row_leaks}`);
  if (summary.row_without_provenance !== 0) blockers.push(`ROW_WITHOUT_PROVENANCE_${summary.row_without_provenance}`);
  if (summary.generic_material_rows !== 0) blockers.push(`GENERIC_MATERIAL_ROWS_${summary.generic_material_rows}`);
  if (summary.paid_control_rows !== 0) blockers.push(`PAID_CONTROL_ROWS_${summary.paid_control_rows}`);
  if (summary.fake_green_claimed) blockers.push("FAKE_GREEN_CLAIMED");
  return blockers;
}
