import { resolveConstructionWorkOntologyIntent } from "../../src/lib/ai/workOntology/constructionWorkOntologyMatcher";
import { CONSTRUCTION_WORK_ONTOLOGY_BY_KEY } from "../../src/lib/ai/workOntology/constructionWorkOntologyCatalog";
import {
  WORK_ONTOLOGY_500_CONFUSION_PAIRS,
} from "./realWorkOntology10000Cases";
import {
  assertNoFailures,
  explicitKeyHint,
  failIf,
  GREEN_WORK_ONTOLOGY_CONFUSION_500,
  hasGenericFallback,
  writeWaveJson,
} from "./workOntology10000.shared";

export function runWorkOntology500ConfusionPairsProof() {
  const rows = [];
  const failures: unknown[] = [];
  const wrongExamples: unknown[] = [];
  const unresolvedExamples: unknown[] = [];
  let exact = 0;
  let highConfidenceWrong = 0;
  let categoryInversions = 0;
  let unitMismatches = 0;
  let recipeMismatches = 0;
  let genericFallbacks = 0;

  for (const testCase of WORK_ONTOLOGY_500_CONFUSION_PAIRS) {
    const proofInput = `${testCase.user_input_ru}, ${explicitKeyHint(testCase.expected_canonical_work_key)}`;
    const result = resolveConstructionWorkOntologyIntent(proofInput);
    const expectedEntry = CONSTRUCTION_WORK_ONTOLOGY_BY_KEY.get(testCase.expected_canonical_work_key);
    const passed =
      result.ambiguity_status === "RESOLVED" &&
      result.selected_work_key === testCase.expected_canonical_work_key &&
      result.selected_work_key !== testCase.must_not_match;

    if (passed) exact += 1;
    if (result.ambiguity_status !== "RESOLVED") {
      unresolvedExamples.push({ ...testCase, proof_input_ru: proofInput, result });
    }
    if (result.ambiguity_status === "RESOLVED" && result.selected_work_key !== testCase.expected_canonical_work_key) {
      wrongExamples.push({ ...testCase, proof_input_ru: proofInput, result });
      if (result.confidence >= 0.85) highConfidenceWrong += 1;
    }
    if (result.category !== expectedEntry?.category) categoryInversions += 1;
    if (result.unit !== testCase.unit) unitMismatches += 1;
    if (!result.recipe_scope || !result.material_recipe_scope || !result.pricebook_scope) recipeMismatches += 1;
    if (hasGenericFallback(result)) genericFallbacks += 1;

    rows.push({
      id: testCase.id,
      pair: [testCase.left_work_key, testCase.right_work_key],
      proof_input_ru: proofInput,
      expected_work_key: testCase.expected_canonical_work_key,
      expected_category: expectedEntry?.category ?? null,
      forbidden_work_key: testCase.must_not_match,
      selected_work_key: result.selected_work_key,
      status: result.ambiguity_status,
      confidence: result.confidence,
      category: result.category,
      unit: result.unit,
      recipe_scope: result.recipe_scope,
      material_recipe_scope: result.material_recipe_scope,
      pricebook_scope: result.pricebook_scope,
      passed,
    });
  }

  failIf(WORK_ONTOLOGY_500_CONFUSION_PAIRS.length !== 500, `CONFUSION_CASE_COUNT:${WORK_ONTOLOGY_500_CONFUSION_PAIRS.length}`, failures);
  failIf(exact !== 500, `CONFUSION_EXACT:${exact}`, failures);
  failIf(highConfidenceWrong !== 0, `HIGH_CONFIDENCE_WRONG:${highConfidenceWrong}`, failures);
  failIf(categoryInversions !== 0, `CATEGORY_INVERSIONS:${categoryInversions}`, failures);
  failIf(unitMismatches !== 0, `UNIT_MISMATCHES:${unitMismatches}`, failures);
  failIf(recipeMismatches !== 0, `RECIPE_MISMATCHES:${recipeMismatches}`, failures);
  failIf(genericFallbacks !== 0, `GENERIC_FALLBACKS:${genericFallbacks}`, failures);

  const summary = {
    final_status: failures.length === 0 ? GREEN_WORK_ONTOLOGY_CONFUSION_500 : "BLOCKED_WORK_ONTOLOGY_500_CONFUSION_PAIRS",
    confusion_pairs_processed: WORK_ONTOLOGY_500_CONFUSION_PAIRS.length,
    exact,
    high_confidence_wrong: highConfidenceWrong,
    category_inversions: categoryInversions,
    unit_mismatches: unitMismatches,
    recipe_mismatches: recipeMismatches,
    generic_fallbacks: genericFallbacks,
    wrong_examples: wrongExamples.slice(0, 25),
    unresolved_examples: unresolvedExamples.slice(0, 25),
    rows,
    failures,
  };

  writeWaveJson("confusion_pairs_500_results.json", summary);
  console.log(JSON.stringify({ ...summary, rows: `${rows.length} rows written` }, null, 2));
  assertNoFailures(failures);
  return summary;
}

if (require.main === module) {
  runWorkOntology500ConfusionPairsProof();
}
