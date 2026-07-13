import { parseWorkOntologyQuantityUnit, resolveConstructionWorkOntologyIntent } from "../../src/lib/ai/workOntology/constructionWorkOntologyMatcher";
import type { WorkOntologyCategory, WorkOntologyIntentResult } from "../../src/lib/ai/workOntology/constructionWorkOntologyTypes";
import {
  CONSTRUCTION_WORK_ONTOLOGY,
  REAL_WORK_ONTOLOGY_10000_CASES,
  WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS,
} from "./realWorkOntology10000Cases";
import {
  assertNoFailures,
  failIf,
  hasGenericFallback,
  hasInternalVisibleText,
  hasMojibakeVisibleText,
  GREEN_WORK_ONTOLOGY_10000,
  writeIosProtocolReadiness,
  writeWaveJson,
} from "./workOntology10000.shared";

type AuditRow = {
  id: string;
  expected_work_key: string;
  selected_work_key: string | null;
  status: string;
  confidence: number;
  expected_category: WorkOntologyCategory;
  selected_category: WorkOntologyCategory | null;
  expected_quantity: number | null;
  quantity: number | null;
  expected_unit: string | null;
  unit: string | null;
  expected_pricebook_scope: string | null;
  pricebook_scope: string | null;
  recipe_scope: string | null;
  material_recipe_scope: string | null;
  country: string;
  region: string;
  expected_currency: string;
};

function rowFor(result: WorkOntologyIntentResult, id: string, expectedWorkKey: string, category: WorkOntologyCategory, expectedPricebookScope: string | null): AuditRow {
  return {
    id,
    expected_work_key: expectedWorkKey,
    selected_work_key: result.selected_work_key,
    status: result.ambiguity_status,
    confidence: result.confidence,
    expected_category: category,
    selected_category: result.category,
    expected_quantity: null,
    quantity: result.quantity,
    expected_unit: null,
    unit: result.unit,
    expected_pricebook_scope: expectedPricebookScope,
    pricebook_scope: result.pricebook_scope,
    recipe_scope: result.recipe_scope,
    material_recipe_scope: result.material_recipe_scope,
    country: result.country,
    region: result.region,
    expected_currency: result.expected_currency,
  };
}

export function runWorkOntology10000IntentRecognitionAudit() {
  const rows: AuditRow[] = [];
  const wrongMatchExamples: unknown[] = [];
  const ambiguousInputExamples: unknown[] = [];
  const missingRecipeExamples: unknown[] = [];
  const missingPricebookScopeExamples: unknown[] = [];
  const unitParserFailures: unknown[] = [];
  const categoryCoverage = new Map<WorkOntologyCategory, { target: number; cases: number; exact: number }>();
  for (const [category, target] of Object.entries(WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS) as [WorkOntologyCategory, number][]) {
    categoryCoverage.set(category, { target, cases: 0, exact: 0 });
  }

  let exactMatchCount = 0;
  let resolvedCount = 0;
  let wrongMatchCount = 0;
  let highConfidenceWrongCount = 0;
  let selectedWorkKeyLost = 0;
  let genericFallbackCount = 0;
  let internalKeysVisible = 0;
  let mojibakeFound = 0;
  let missingRecipeCount = 0;
  let missingPricebookScopeCount = 0;

  for (const testCase of REAL_WORK_ONTOLOGY_10000_CASES) {
    const result = resolveConstructionWorkOntologyIntent(testCase.user_input_ru);
    const parsed = parseWorkOntologyQuantityUnit(testCase.user_input_ru);
    const row = rowFor(
      result,
      testCase.id,
      testCase.expected_canonical_work_key,
      testCase.category,
      testCase.expected_pricebook_scope,
    );
    row.expected_quantity = testCase.quantity;
    row.expected_unit = testCase.unit;
    rows.push(row);

    const coverage = categoryCoverage.get(testCase.category);
    if (coverage) coverage.cases += 1;

    if (parsed.quantity !== testCase.quantity || parsed.unit !== testCase.unit) {
      unitParserFailures.push({
        id: testCase.id,
        input: testCase.user_input_ru,
        expected_quantity: testCase.quantity,
        actual_quantity: parsed.quantity,
        expected_unit: testCase.unit,
        actual_unit: parsed.unit,
      });
    }

    if (result.ambiguity_status !== "RESOLVED") {
      ambiguousInputExamples.push({
        id: testCase.id,
        input: testCase.user_input_ru,
        expected_work_key: testCase.expected_canonical_work_key,
        status: result.ambiguity_status,
        candidates: result.candidates,
      });
      continue;
    }

    resolvedCount += 1;
    if (!result.selected_work_key) selectedWorkKeyLost += 1;
    if (hasGenericFallback(result)) genericFallbackCount += 1;
    if (hasInternalVisibleText(result)) internalKeysVisible += 1;
    if (hasMojibakeVisibleText(result)) mojibakeFound += 1;
    if (!result.recipe_scope || !result.material_recipe_scope) {
      missingRecipeCount += 1;
      missingRecipeExamples.push({ id: testCase.id, selected_work_key: result.selected_work_key, result });
    }
    if (!result.pricebook_scope) {
      missingPricebookScopeCount += 1;
      missingPricebookScopeExamples.push({ id: testCase.id, selected_work_key: result.selected_work_key, result });
    }

    if (result.selected_work_key === testCase.expected_canonical_work_key) {
      exactMatchCount += 1;
      if (coverage) coverage.exact += 1;
    } else {
      wrongMatchCount += 1;
      if (result.confidence >= 0.85) highConfidenceWrongCount += 1;
      wrongMatchExamples.push({
        id: testCase.id,
        input: testCase.user_input_ru,
        expected_work_key: testCase.expected_canonical_work_key,
        selected_work_key: result.selected_work_key,
        confidence: result.confidence,
        candidates: result.candidates,
      });
    }
  }

  const failures: unknown[] = [];
  failIf(CONSTRUCTION_WORK_ONTOLOGY.length !== 1000, `ONTOLOGY_SIZE_${CONSTRUCTION_WORK_ONTOLOGY.length}`, failures);
  failIf(REAL_WORK_ONTOLOGY_10000_CASES.length !== 10000, `CASE_COUNT_${REAL_WORK_ONTOLOGY_10000_CASES.length}`, failures);
  failIf(rows.length !== 10000, `PROCESSED_COUNT_${rows.length}`, failures);
  failIf(exactMatchCount < 9850, `EXACT_MATCH_BELOW_9850:${exactMatchCount}`, failures);
  failIf(resolvedCount !== 10000, `UNRESOLVED_COUNT:${10000 - resolvedCount}`, failures);
  failIf(highConfidenceWrongCount !== 0, `HIGH_CONFIDENCE_WRONG:${highConfidenceWrongCount}`, failures);
  failIf(selectedWorkKeyLost !== 0, `SELECTED_WORK_KEY_LOST:${selectedWorkKeyLost}`, failures);
  failIf(genericFallbackCount !== 0, `GENERIC_FALLBACK:${genericFallbackCount}`, failures);
  failIf(missingRecipeCount !== 0, `MISSING_RECIPE:${missingRecipeCount}`, failures);
  failIf(missingPricebookScopeCount !== 0, `MISSING_PRICEBOOK_SCOPE:${missingPricebookScopeCount}`, failures);
  failIf(unitParserFailures.length !== 0, `UNIT_PARSER_FAILURES:${unitParserFailures.length}`, failures);
  failIf(internalKeysVisible !== 0, `INTERNAL_KEYS_VISIBLE:${internalKeysVisible}`, failures);
  failIf(mojibakeFound !== 0, `MOJIBAKE_FOUND:${mojibakeFound}`, failures);

  const summary = {
    final_status: failures.length === 0 ? GREEN_WORK_ONTOLOGY_10000 : "BLOCKED_WORK_ONTOLOGY_10000_INTENT_RECOGNITION",
    ontology_entries: CONSTRUCTION_WORK_ONTOLOGY.length,
    real_user_cases_processed: rows.length,
    exact_match_count: exactMatchCount,
    exact_match_rate: exactMatchCount / rows.length,
    resolved_count: resolvedCount,
    wrong_match_count: wrongMatchCount,
    high_confidence_wrong_count: highConfidenceWrongCount,
    selected_work_key_lost: selectedWorkKeyLost,
    generic_fallback_count: genericFallbackCount,
    missing_recipe_count: missingRecipeCount,
    missing_pricebook_scope_count: missingPricebookScopeCount,
    internal_keys_visible: internalKeysVisible,
    mojibake_found: mojibakeFound,
    unit_parser_failures: unitParserFailures.length,
    failures,
  };

  writeWaveJson("real_work_10000_cases.json", {
    case_count: REAL_WORK_ONTOLOGY_10000_CASES.length,
    target_category_counts: WORK_ONTOLOGY_TARGET_CATEGORY_COUNTS,
    cases: REAL_WORK_ONTOLOGY_10000_CASES,
  });
  writeWaveJson("intent_recognition_10000_results.json", {
    ...summary,
    rows,
  });
  writeWaveJson("wrong_match_examples.json", { count: wrongMatchExamples.length, examples: wrongMatchExamples.slice(0, 100) });
  writeWaveJson("ambiguous_input_examples.json", { count: ambiguousInputExamples.length, examples: ambiguousInputExamples.slice(0, 100) });
  writeWaveJson("missing_recipe_examples.json", { count: missingRecipeExamples.length, examples: missingRecipeExamples.slice(0, 100) });
  writeWaveJson("missing_pricebook_scope_examples.json", { count: missingPricebookScopeExamples.length, examples: missingPricebookScopeExamples.slice(0, 100) });
  writeWaveJson("category_coverage.json", {
    categories: [...categoryCoverage.entries()].map(([category, value]) => ({ category, ...value })),
  });
  writeWaveJson("unit_parser_results.json", {
    total_cases: REAL_WORK_ONTOLOGY_10000_CASES.length,
    failures: unitParserFailures.slice(0, 100),
    failure_count: unitParserFailures.length,
  });
  writeIosProtocolReadiness();

  console.log(JSON.stringify(summary, null, 2));
  assertNoFailures(failures);
  return summary;
}

if (require.main === module) {
  runWorkOntology10000IntentRecognitionAudit();
}
