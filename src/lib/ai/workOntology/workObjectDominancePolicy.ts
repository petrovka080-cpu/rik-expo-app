import type { WorkOntologyCategory } from "./constructionWorkOntologyTypes";
import { evaluateForbiddenSubstringGuards } from "./forbiddenSubstringGuards";
import { matchOperationObjectIntent } from "./operationObjectMatcher";

export type WorkObjectDominanceEvaluation = {
  input: string;
  expected_work_key: string | null;
  expected_category: WorkOntologyCategory | null;
  forbidden_category: WorkOntologyCategory | null;
  selected_work_key: string | null;
  selected_category: WorkOntologyCategory | null;
  forbidden_category_candidates: string[];
  object_dominance_passed: boolean;
  substring_guard_passed: boolean;
  fake_green_claimed: false;
};

export function evaluateWorkObjectDominance(input: {
  userInput: string;
  expectedWorkKey?: string;
  expectedCategory?: WorkOntologyCategory;
  forbiddenCategory?: WorkOntologyCategory;
  allowUnresolved?: boolean;
}): WorkObjectDominanceEvaluation {
  const match = matchOperationObjectIntent({
    userInput: input.userInput,
    country: "KG",
    region: "Bishkek",
  });
  const forbiddenCandidates = input.forbiddenCategory
    ? match.no_hint_candidates
        .filter((candidate) => candidate.category === input.forbiddenCategory)
        .map((candidate) => candidate.canonical_work_key)
    : [];
  const strictResolved = input.allowUnresolved || match.strict_intent.ambiguity_status === "RESOLVED";
  const workKeyOk = !input.expectedWorkKey || match.strict_intent.selected_work_key === input.expectedWorkKey;
  const categoryOk = !input.expectedCategory || match.strict_intent.category === input.expectedCategory;
  const forbiddenOk = forbiddenCandidates.length === 0 &&
    (!input.forbiddenCategory || match.strict_intent.category !== input.forbiddenCategory);
  const substringGuard = evaluateForbiddenSubstringGuards(input.userInput);

  return {
    input: input.userInput,
    expected_work_key: input.expectedWorkKey ?? null,
    expected_category: input.expectedCategory ?? null,
    forbidden_category: input.forbiddenCategory ?? null,
    selected_work_key: match.strict_intent.selected_work_key,
    selected_category: match.strict_intent.category,
    forbidden_category_candidates: forbiddenCandidates,
    object_dominance_passed: strictResolved && workKeyOk && categoryOk && forbiddenOk,
    substring_guard_passed: substringGuard.substring_kladka_inside_ukladka_used === false,
    fake_green_claimed: false,
  };
}
