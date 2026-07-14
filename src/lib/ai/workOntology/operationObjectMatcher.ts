import { resolveConstructionWorkOntologyIntent } from "./constructionWorkOntologyMatcher";
import { rankNoHintWorkOntologyCandidates } from "./workOntologyCandidateRanker";
import type { WorkOntologyCountry } from "./constructionWorkOntologyTypes";
import { resolveNoHintWorkOntologyIntent } from "./workOntologyResolverContracts";

export type OperationObjectMatchInput = {
  userInput: string;
  country?: WorkOntologyCountry;
  region?: string;
};

export function matchOperationObjectIntent(input: OperationObjectMatchInput) {
  return {
    strict_intent: resolveConstructionWorkOntologyIntent(input.userInput),
    no_hint_resolution: resolveNoHintWorkOntologyIntent({
      userInput: input.userInput,
      country: input.country,
      region: input.region,
    }),
    no_hint_candidates: rankNoHintWorkOntologyCandidates(input.userInput, 8),
    fake_green_claimed: false,
  };
}
