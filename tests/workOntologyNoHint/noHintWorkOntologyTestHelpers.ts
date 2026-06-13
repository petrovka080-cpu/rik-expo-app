import fs from "node:fs";
import path from "node:path";

import {
  buildNoHintConfusionHardSet,
  buildNoHintRealUserWorkCorpus,
  NO_HINT_TARGET_CATEGORY_COUNTS,
} from "../../src/lib/ai/workOntology/noHintRealUserCorpus";
import {
  evaluateNoHintCandidateRanking,
  evaluateNoHintConfusionHardSet,
  evaluateNoHintSemanticAudit,
} from "../../src/lib/ai/workOntology/noHintSemanticEvaluator";
import { resolveNoHintWorkOntologyIntent } from "../../src/lib/ai/workOntology/workOntologyResolverContracts";

type SemanticAudit = ReturnType<typeof evaluateNoHintSemanticAudit>;
type ConfusionAudit = ReturnType<typeof evaluateNoHintConfusionHardSet>;
type RankingAudit = ReturnType<typeof evaluateNoHintCandidateRanking>;

let corpusCache: ReturnType<typeof buildNoHintRealUserWorkCorpus> | null = null;
let confusionCache: ReturnType<typeof buildNoHintConfusionHardSet> | null = null;
let semanticAuditCache: SemanticAudit | null = null;
let confusionAuditCache: ConfusionAudit | null = null;
let rankingAuditCache: RankingAudit | null = null;

export { NO_HINT_TARGET_CATEGORY_COUNTS, resolveNoHintWorkOntologyIntent };

export function noHintCorpus() {
  corpusCache ??= buildNoHintRealUserWorkCorpus();
  return corpusCache;
}

export function noHintConfusionCases() {
  confusionCache ??= buildNoHintConfusionHardSet();
  return confusionCache;
}

export function noHintSemanticAudit() {
  semanticAuditCache ??= evaluateNoHintSemanticAudit(noHintCorpus());
  return semanticAuditCache;
}

export function noHintConfusionAudit() {
  confusionAuditCache ??= evaluateNoHintConfusionHardSet(noHintConfusionCases());
  return confusionAuditCache;
}

export function noHintRankingAudit() {
  rankingAuditCache ??= evaluateNoHintCandidateRanking(noHintCorpus());
  return rankingAuditCache;
}

export function sourceText(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}
