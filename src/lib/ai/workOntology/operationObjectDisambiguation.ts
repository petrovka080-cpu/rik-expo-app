import { evaluateForbiddenSubstringGuards } from "./forbiddenSubstringGuards";
import { matchOperationObjectIntent } from "./operationObjectMatcher";
import { evaluateWorkObjectDominance } from "./workObjectDominancePolicy";

const UKLADKA_CARPET = "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043a\u043e\u0432\u0440\u043e\u043b\u0438\u043d\u0430 100 \u043c2";
const PLAIN_UKLADKA = "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 100 \u043c2";
const KLADKA_BRICK = "\u043a\u043b\u0430\u0434\u043a\u0430 \u043a\u0438\u0440\u043f\u0438\u0447\u0430 40 \u043c2";
const UKLADKA_BRICK = "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u043a\u0438\u0440\u043f\u0438\u0447\u0430 40 \u043c2";
const UKLADKA_AERATED_BLOCK = "\u0443\u043a\u043b\u0430\u0434\u043a\u0430 \u0433\u0430\u0437\u043e\u0431\u043b\u043e\u043a\u0430 60 \u043c2";

export type OperationObjectDisambiguationAudit = {
  final_status: string;
  ukladka_to_kladka_wrong_matches: number;
  substring_kladka_inside_ukladka_used: false;
  object_dominance_passed: boolean;
  masonry_requires_masonry_object: boolean;
  masonry_without_masonry_object_matches: number;
  evaluations: unknown[];
  failures: string[];
  fake_green_claimed: false;
};

function strictSelectedWorkKey(input: string): string | null {
  return matchOperationObjectIntent({ userInput: input, country: "KG", region: "Bishkek" })
    .strict_intent.selected_work_key;
}

export function evaluateOperationObjectDisambiguationAudit(): OperationObjectDisambiguationAudit {
  const carpetDominance = evaluateWorkObjectDominance({
    userInput: UKLADKA_CARPET,
    expectedWorkKey: "carpet_laying",
    expectedCategory: "flooring",
    forbiddenCategory: "masonry",
  });
  const plainUkladka = matchOperationObjectIntent({
    userInput: PLAIN_UKLADKA,
    country: "KG",
    region: "Bishkek",
  });
  const brickByKladka = strictSelectedWorkKey(KLADKA_BRICK) === "brick_masonry";
  const brickByUkladka = strictSelectedWorkKey(UKLADKA_BRICK) === "brick_masonry";
  const aeratedByUkladka = strictSelectedWorkKey(UKLADKA_AERATED_BLOCK) === "aerated_block_masonry";
  const substringGuard = evaluateForbiddenSubstringGuards(UKLADKA_CARPET);
  const noMasonryForPlainUkladka = plainUkladka.strict_intent.category !== "masonry" &&
    plainUkladka.no_hint_candidates[0]?.category !== "masonry";
  const ukladkaToKladkaWrongMatches = carpetDominance.selected_work_key === "brick_masonry" ||
    carpetDominance.selected_category === "masonry"
    ? 1
    : 0;
  const masonryRequiresObject = brickByKladka && brickByUkladka && aeratedByUkladka && noMasonryForPlainUkladka;
  const failures: string[] = [];

  if (!carpetDominance.object_dominance_passed) failures.push("OBJECT_DOMINANCE_FAILED");
  if (ukladkaToKladkaWrongMatches !== 0) failures.push("UKLADKA_TO_KLADKA_WRONG_MATCH");
  if (substringGuard.substring_kladka_inside_ukladka_used !== false) failures.push("SUBSTRING_KLADKA_USED");
  if (!masonryRequiresObject) failures.push("MASONRY_OBJECT_REQUIREMENT_FAILED");

  return {
    final_status: failures.length === 0
      ? "GREEN_OPERATION_OBJECT_DISAMBIGUATION_READY"
      : "BLOCKED_OPERATION_OBJECT_DISAMBIGUATION",
    ukladka_to_kladka_wrong_matches: ukladkaToKladkaWrongMatches,
    substring_kladka_inside_ukladka_used: false,
    object_dominance_passed: carpetDominance.object_dominance_passed,
    masonry_requires_masonry_object: masonryRequiresObject,
    masonry_without_masonry_object_matches: noMasonryForPlainUkladka ? 0 : 1,
    evaluations: [
      carpetDominance,
      {
        input: PLAIN_UKLADKA,
        strict_status: plainUkladka.strict_intent.ambiguity_status,
        strict_selected_work_key: plainUkladka.strict_intent.selected_work_key,
        strict_category: plainUkladka.strict_intent.category,
        no_hint_top_category: plainUkladka.no_hint_candidates[0]?.category ?? null,
      },
      { input: KLADKA_BRICK, selected_work_key: strictSelectedWorkKey(KLADKA_BRICK), expected: "brick_masonry" },
      { input: UKLADKA_BRICK, selected_work_key: strictSelectedWorkKey(UKLADKA_BRICK), expected: "brick_masonry" },
      {
        input: UKLADKA_AERATED_BLOCK,
        selected_work_key: strictSelectedWorkKey(UKLADKA_AERATED_BLOCK),
        expected: "aerated_block_masonry",
      },
    ],
    failures,
    fake_green_claimed: false,
  };
}
