import { buildNoHintRealUserWorkCorpus } from "../../src/lib/ai/workOntology/noHintRealUserCorpus";
import { evaluateNoHintCandidateRanking } from "../../src/lib/ai/workOntology/noHintSemanticEvaluator";
import {
  assertNoHintFailures,
  buildNoHintMatrixSnapshot,
  writeNoHintJson,
} from "./noHintRealUserWorkCorpus";

export function runNoHintWorkOntologyCandidateRankingAudit() {
  const cases = buildNoHintRealUserWorkCorpus();
  const audit = evaluateNoHintCandidateRanking(cases);
  writeNoHintJson("candidate_ranking_results.json", audit);
  writeNoHintJson("matrix.json", buildNoHintMatrixSnapshot({
    candidate_ranking_status: audit.final_status,
  }));

  console.log(JSON.stringify(audit, null, 2));
  assertNoHintFailures(audit.failures, "NO_HINT_CANDIDATE_RANKING_AUDIT_FAILED");
  return audit;
}

if (require.main === module) {
  runNoHintWorkOntologyCandidateRankingAudit();
}
