import { buildNoHintConfusionHardSet } from "../../src/lib/ai/workOntology/noHintRealUserCorpus";
import { evaluateNoHintConfusionHardSet } from "../../src/lib/ai/workOntology/noHintSemanticEvaluator";
import {
  assertNoHintFailures,
  buildNoHintMatrixSnapshot,
  writeNoHintJson,
} from "./noHintRealUserWorkCorpus";

export function runNoHintWorkOntologyConfusionHardSet() {
  const cases = buildNoHintConfusionHardSet();
  const audit = evaluateNoHintConfusionHardSet(cases);
  const failures = audit.evaluations.filter((item) => !item.passed);

  writeNoHintJson("no_hint_confusion_hard_set.json", {
    case_count: cases.length,
    cases,
  });
  writeNoHintJson("no_hint_confusion_results.json", {
    final_status: audit.final_status,
    summary: audit.summary,
    evaluations: audit.evaluations,
  });
  writeNoHintJson("no_hint_confusion_failure_examples.json", {
    count: failures.length,
    examples: failures.slice(0, 100),
  });
  writeNoHintJson("matrix.json", buildNoHintMatrixSnapshot({
    confusion_hard_set_status: audit.final_status,
  }));

  console.log(JSON.stringify({
    final_status: audit.final_status,
    summary: audit.summary,
    failure_examples: failures.length,
  }, null, 2));
  assertNoHintFailures(audit.summary.blockers, "NO_HINT_CONFUSION_HARD_SET_FAILED");
  return audit;
}

if (require.main === module) {
  runNoHintWorkOntologyConfusionHardSet();
}
