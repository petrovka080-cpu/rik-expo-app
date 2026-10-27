import type {
  WorkOntologyCategory,
  WorkOntologyCountry,
  WorkOntologyMatchStatus,
  WorkOntologyUnit,
} from "./constructionWorkOntologyTypes";

export const NO_HINT_WORK_ONTOLOGY_WAVE =
  "S_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT_CLOSEOUT_POINT_OF_NO_RETURN";

export const GREEN_NO_HINT_WORK_ONTOLOGY =
  "GREEN_WORK_ONTOLOGY_NO_HINT_REAL_USER_SEMANTIC_CORE_AUDIT_READY";

export type NoHintExpectedStatus =
  | WorkOntologyMatchStatus
  | "MATERIAL_RECIPE_MISSING";

export type NoHintRealUserWorkCase = {
  id: string;
  user_input_ru: string;
  expected_status: NoHintExpectedStatus;
  expected_canonical_work_key?: string;
  acceptable_canonical_work_keys?: string[];
  must_not_match?: string[];
  expected_category?: WorkOntologyCategory;
  expected_quantity?: number | null;
  expected_unit?: WorkOntologyUnit | null;
  expected_top_candidates_min?: number;
  expected_top_candidates_max?: number;
  expected_recipe_scope_required: boolean;
  expected_material_recipe_scope_required: boolean;
  expected_pricebook_scope_required: boolean;
  country?: WorkOntologyCountry;
  region?: string;
};

export type NoHintCandidate = {
  canonical_work_key: string;
  visible_name_ru: string;
  category: WorkOntologyCategory;
  confidence: number;
  score: number;
  reasons: string[];
};

export type NoHintWorkOntologyResolution = {
  user_input_ru: string;
  normalized_input: string;
  status: NoHintExpectedStatus;
  canonical_work_key: string | null;
  selected_work_key: string | null;
  visible_name_ru: string | null;
  category: WorkOntologyCategory | null;
  quantity: number | null;
  unit: WorkOntologyUnit | null;
  confidence: number;
  top_candidates: NoHintCandidate[];
  auto_selected: boolean;
  generic_fallback_used: false;
  first_item_fallback_used: false;
  random_choice_used: false;
  recipe_scope: string | null;
  material_recipe_scope: string | null;
  pricebook_scope: string | null;
  fake_green_claimed: false;
};

export type NoHintCaseEvaluation = {
  case_id: string;
  passed: boolean;
  failures: string[];
  expected_status: NoHintExpectedStatus;
  expected_canonical_work_key: string | null;
  acceptable_canonical_work_keys: string[];
  actual_status: NoHintExpectedStatus;
  actual_canonical_work_key: string | null;
  selected_work_key: string | null;
  confidence: number;
  quantity: number | null;
  unit: WorkOntologyUnit | null;
  top_candidates: NoHintCandidate[];
};

export type NoHintAuditSummary = {
  no_hint_cases_total: number;
  canonical_hints_found: number;
  underscore_keys_in_user_input: number;
  resolved_expected_cases_total: number;
  resolved_expected_cases_passed: number;
  resolved_expected_cases_passed_percent: number;
  ambiguous_expected_cases_total: number;
  ambiguous_expected_cases_passed: number;
  ambiguous_expected_cases_passed_percent: number;
  high_confidence_wrong_matches: number;
  known_work_to_generic_fallback: number;
  first_item_fallback_used: number;
  random_choice_used: number;
  top_candidate_lists_valid: boolean;
  selected_work_key_lost: number;
  quantity_parser_regressions: number;
  internal_keys_visible: number;
  mojibake_found: number;
  duplicate_candidates: number;
  recipe_scope_missing: number;
  material_recipe_scope_missing: number;
  pricebook_scope_missing: number;
  fake_green_claimed: false;
  blockers: string[];
};

export type NoHintConfusionCase = NoHintRealUserWorkCase & {
  confusion_pair: string;
};

export type NoHintConfusionSummary = {
  hard_confusion_cases_total: number;
  high_confidence_wrong_matches: number;
  category_inversions: number;
  wrong_auto_select_for_ambiguous_input: number;
  fake_green_claimed: false;
  blockers: string[];
};
