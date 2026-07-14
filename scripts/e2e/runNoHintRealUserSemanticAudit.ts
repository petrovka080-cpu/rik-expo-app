import { buildNoHintRealUserWorkCorpus, NO_HINT_TARGET_CATEGORY_COUNTS } from "../../src/lib/ai/workOntology/noHintRealUserCorpus";
import {
  evaluateNoHintSemanticAudit,
  summarizeScopeReadiness,
} from "../../src/lib/ai/workOntology/noHintSemanticEvaluator";
import {
  assertNoHintFailures,
  buildNoHintMatrixSnapshot,
  writeNoHintJson,
} from "./noHintRealUserWorkCorpus";

export function runNoHintRealUserSemanticAudit() {
  const cases = buildNoHintRealUserWorkCorpus();
  const audit = evaluateNoHintSemanticAudit(cases);
  const wrongMatchExamples = audit.evaluations.filter((item) =>
    item.expected_status === "RESOLVED" &&
    item.actual_status === "RESOLVED" &&
    !item.acceptable_canonical_work_keys.includes(item.actual_canonical_work_key ?? "")
  );
  const ambiguousExamples = audit.evaluations.filter((item) => item.actual_status === "AMBIGUOUS_WORK_INPUT");
  const unsupportedExamples = audit.evaluations.filter((item) =>
    item.actual_status === "WORK_NOT_SUPPORTED" || item.actual_status === "LOW_CONFIDENCE_MATCH"
  );
  const quantityUnitFailures = audit.evaluations.filter((item) =>
    item.failures.includes("QUANTITY_MISMATCH") || item.failures.includes("UNIT_MISMATCH")
  );
  const expectedAmbiguous = audit.evaluations.filter((item) => item.expected_status === "AMBIGUOUS_WORK_INPUT");

  writeNoHintJson("no_hint_real_user_cases.json", {
    case_count: cases.length,
    target_category_counts: NO_HINT_TARGET_CATEGORY_COUNTS,
    target_distribution_source_total_before_normalization: 3390,
    normalized_target_distribution_total: 3000,
    cases,
  });
  writeNoHintJson("no_hint_semantic_results.json", {
    final_status: audit.final_status,
    summary: audit.summary,
    evaluations: audit.evaluations,
  });
  writeNoHintJson("wrong_match_examples.json", {
    count: wrongMatchExamples.length,
    examples: wrongMatchExamples.slice(0, 100),
  });
  writeNoHintJson("ambiguous_examples.json", {
    count: ambiguousExamples.length,
    expected_ambiguous_count: expectedAmbiguous.length,
    examples: ambiguousExamples.slice(0, 100),
  });
  writeNoHintJson("unsupported_examples.json", {
    count: unsupportedExamples.length,
    examples: unsupportedExamples.slice(0, 100),
  });
  writeNoHintJson("quantity_unit_results.json", {
    total_cases_with_expected_quantity_or_unit: audit.evaluations.filter((item) =>
      item.expected_quantity !== null || item.expected_unit !== null
    ).length,
    failure_count: quantityUnitFailures.length,
    failures: quantityUnitFailures.slice(0, 100),
  });
  writeNoHintJson("ambiguity_policy_results.json", {
    total_expected_ambiguous: expectedAmbiguous.length,
    passed_expected_ambiguous: expectedAmbiguous.filter((item) => item.passed).length,
    failures: expectedAmbiguous.filter((item) => !item.passed),
    fake_green_claimed: false,
  });
  writeNoHintJson("recipe_scope_readiness.json", summarizeScopeReadiness(audit.evaluations, "recipe_scope"));
  writeNoHintJson("material_recipe_scope_readiness.json", summarizeScopeReadiness(audit.evaluations, "material_recipe_scope"));
  writeNoHintJson("pricebook_scope_readiness.json", summarizeScopeReadiness(audit.evaluations, "pricebook_scope"));
  writeNoHintJson("matrix.json", buildNoHintMatrixSnapshot({
    semantic_audit_status: audit.final_status,
    closeout_status: null,
  }));

  const failures = audit.summary.blockers;
  console.log(JSON.stringify({
    final_status: audit.final_status,
    summary: audit.summary,
    wrong_match_examples: wrongMatchExamples.length,
    unsupported_examples: unsupportedExamples.length,
  }, null, 2));
  assertNoHintFailures(failures, "NO_HINT_REAL_USER_SEMANTIC_AUDIT_FAILED");
  return audit;
}

if (require.main === module) {
  runNoHintRealUserSemanticAudit();
}
