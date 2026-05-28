import type { WorldConstructionPrimitive } from "../worldConstructionOntology";

export type AmbiguousConstructionDisambiguation = {
  classification: "AMBIGUOUS_NEEDS_CLARIFICATION";
  likelyDomains: string[];
  questions: string[];
  randomObjectChoiceAllowed: false;
};

export function buildAmbiguousConstructionDisambiguation(
  primitive: WorldConstructionPrimitive,
): AmbiguousConstructionDisambiguation {
  return {
    classification: "AMBIGUOUS_NEEDS_CLARIFICATION",
    likelyDomains: [primitive.domain, ...primitive.secondaryDomains].filter((item) => item !== "unknown"),
    questions: primitive.clarifyingQuestions.length > 0
      ? primitive.clarifyingQuestions
      : ["Confirm object, method, quantity, and location before producing the estimate."],
    randomObjectChoiceAllowed: false,
  };
}
