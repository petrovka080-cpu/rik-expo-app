import { normalizeWorkOntologyText } from "./constructionWorkOntologyCatalog";
import type { NoHintCandidate, NoHintExpectedStatus } from "./noHintSemanticAuditTypes";

export type NoHintAmbiguityDecision = {
  status: NoHintExpectedStatus;
  auto_selected: boolean;
  reason: string;
};

const RESOLVE_CONFIDENCE_FLOOR = 0.68;
const CLOSE_CONFIDENCE_GAP = 0.08;

function includesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function broadKnownTerm(normalized: string): string | null {
  if (/фундамент/.test(normalized) && /дом/.test(normalized) && /\b\d+(?:[.,]\d+)?\s*(?:на|x|х)\s*\d+(?:[.,]\d+)?\b/u.test(normalized)) {
    return "broad_foundation_house_dimensions";
  }
  if (
    /гидроизоляц/.test(normalized) &&
    !includesAny(normalized, [/крыш|кровл|ванн|сануз|душев|фундамент|подвал|погреб|балкон|террас|бассейн/])
  ) {
    return "broad_waterproofing";
  }
  if (/электрик|электромонтаж/.test(normalized) && !includesAny(normalized, [/провод|кабел|розет|щит|автомат|узо|свет|освещ|интернет|слаботоч|видео|домофон/])) {
    return "broad_electrical";
  }
  if (/сантехник/.test(normalized) && !includesAny(normalized, [/водопровод|водоснаб|канализац|унитаз|раковин|мойк|душ|смесител|труб|бойлер/])) {
    return "broad_plumbing";
  }
  if (
    /плитк|кафель|керамогранит/.test(normalized) &&
    !/демонтаж|снять|разобрать/.test(normalized) &&
    !includesAny(normalized, [/ванн|сануз|пол|стен|фартук|ступен|балкон|террас/])
  ) {
    return "broad_tile";
  }
  if (/утеплен/.test(normalized) && !includesAny(normalized, [/крыш|кровл|фасад|стен|подвал|чердак/])) {
    return "broad_insulation";
  }
  return null;
}

export function decideNoHintWorkOntologyAmbiguity(input: {
  userInput: string;
  candidates: readonly NoHintCandidate[];
}): NoHintAmbiguityDecision {
  const normalized = normalizeWorkOntologyText(input.userInput);
  const broadReason = broadKnownTerm(normalized);
  if (broadReason) {
    return { status: "AMBIGUOUS_WORK_INPUT", auto_selected: false, reason: broadReason };
  }

  const top = input.candidates[0];
  if (!top) return { status: "WORK_NOT_SUPPORTED", auto_selected: false, reason: "no_candidate" };
  if (top.confidence < RESOLVE_CONFIDENCE_FLOOR) {
    return { status: "LOW_CONFIDENCE_MATCH", auto_selected: false, reason: "below_confidence_floor" };
  }

  const second = input.candidates[1];
  if (second && second.category === top.category && top.confidence - second.confidence <= CLOSE_CONFIDENCE_GAP) {
    const topHasSpecificRule = top.reasons.some((reason) => reason.startsWith("real_user_"));
    if (!topHasSpecificRule) {
      return { status: "AMBIGUOUS_WORK_INPUT", auto_selected: false, reason: "close_same_category_candidates" };
    }
  }

  return { status: "RESOLVED", auto_selected: true, reason: "deterministic_confident_match" };
}
