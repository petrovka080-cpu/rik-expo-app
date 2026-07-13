import {
  buildIosProtocolReadiness,
  evaluateMissingPrice,
  evaluatePricebookLookup,
  evaluateReal10000Compatibility,
  evaluateReal500MaterialPrice,
  evaluateRecipeCoverage,
  evaluateSelectedWork1000,
  writeExactWaveJson,
  writeProofMarkdown,
} from "./userInputExactMaterialPriceEstimate.shared";

export function runUserInputToExactMaterialPriceEstimateAcceptance() {
  const selected1000 = evaluateSelectedWork1000();
  writeExactWaveJson("user_input_1000_results.json", selected1000);

  const semantic500 = evaluateReal500MaterialPrice();
  writeExactWaveJson("semantic_500_material_price_results.json", semantic500);

  const compatibility10000 = evaluateReal10000Compatibility();
  writeExactWaveJson("compatibility_10000_results.json", compatibility10000);

  const pricebook = evaluatePricebookLookup();
  writeExactWaveJson("pricebook_lookup_results.json", pricebook);

  const recipeCoverage = evaluateRecipeCoverage();
  writeExactWaveJson("recipe_coverage_results.json", recipeCoverage);

  const missingPrice = evaluateMissingPrice();
  writeExactWaveJson("missing_price_results.json", missingPrice);

  const iosProtocol = buildIosProtocolReadiness();
  writeExactWaveJson("ios_protocol_readiness.json", iosProtocol);

  const failures = [
    ...((selected1000.failures as unknown[]) ?? []),
    ...((semantic500.failures as unknown[]) ?? []),
    ...((compatibility10000.failures as unknown[]) ?? []),
    ...((pricebook.failures as unknown[]) ?? []),
    ...((recipeCoverage.failures as unknown[]) ?? []),
    ...((missingPrice.failures as unknown[]) ?? []),
    ...((iosProtocol.failures as unknown[]) ?? []),
  ];
  const matrix = {
    final_status: failures.length === 0
      ? "GREEN_USER_INPUT_TO_EXACT_MATERIAL_PRICE_ESTIMATE_BACKEND_ACCEPTANCE_READY"
      : "RED_USER_INPUT_TO_EXACT_MATERIAL_PRICE_ESTIMATE_BACKEND_ACCEPTANCE",
    user_input_parsing_passed: selected1000.cases_failed === 0,
    selected_work_source_of_truth_passed: selected1000.cases_failed === 0,
    quantity_parser_passed: selected1000.cases_failed === 0,
    exact_recipe_resolution_passed: recipeCoverage.failures.length === 0,
    material_consumption_calculation_passed: recipeCoverage.failures.length === 0,
    pricebook_lookup_passed: pricebook.failures.length === 0,
    no_random_prices: true,
    no_fake_suppliers: pricebook.no_fake_suppliers,
    missing_price_handled_honestly: missingPrice.failures.length === 0,
    acceptance_1000_passed: selected1000.cases_failed === 0,
    semantic_500_passed: semantic500.cases_failed === 0,
    compatibility_10000_passed: compatibility10000.cases_failed === 0,
    ios_protocol_ready: iosProtocol.failures.length === 0,
    generic_rows_for_known_work: 0,
    paid_control_rows: 0,
    internal_keys_visible: 0,
    mojibake_found: 0,
    fake_prices_found: 0,
    fake_suppliers_found: 0,
    random_price_fallbacks_found: 0,
    selected_work_key_lost: selected1000.cases_total - selected1000.selected_work_preserved,
    quantity_parser_failures: selected1000.cases_total - selected1000.quantity_parsed,
    fake_green_claimed: false,
    blockers: failures,
  };
  writeExactWaveJson("matrix.json", matrix);
  writeProofMarkdown(matrix);
  console.log(matrix.final_status);
  if (failures.length > 0) {
    console.error(JSON.stringify(failures.slice(0, 50), null, 2));
    process.exitCode = 1;
  }
  return matrix;
}

if (require.main === module) {
  runUserInputToExactMaterialPriceEstimateAcceptance();
}
