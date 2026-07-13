import {
  EXACT_MATERIAL_PRICE_ESTIMATE_GREEN_STATUS,
} from "../../src/lib/ai/exactMaterialPriceEstimate";
import {
  gitOutput,
  readExactWaveJson,
  writeExactWaveJson,
} from "./userInputExactMaterialPriceEstimate.shared";

type Artifact = Record<string, unknown>;

function finalStatus(name: string): string | null {
  return (readExactWaveJson<Artifact>(name)?.final_status as string | undefined) ?? null;
}

function artifactPassed(name: string): boolean {
  const artifact = readExactWaveJson<Artifact>(name);
  if (!artifact) return false;
  if (artifact.passed === true) return true;
  if (artifact.success === true) return true;
  if (artifact.exit_code === 0) return true;
  const status = artifact.final_status;
  return typeof status === "string" && status.startsWith("GREEN");
}

function fullJestPassed(): boolean {
  const artifact = readExactWaveJson<Artifact>("full_jest_results.json");
  return Boolean(
    artifact?.success === true &&
    artifact?.numFailedTestSuites === 0 &&
    artifact?.numFailedTests === 0,
  );
}

function artifactFailures(name: string): unknown[] {
  const failures = readExactWaveJson<Artifact>(name)?.failures;
  return Array.isArray(failures) ? failures : [];
}

function sourceHeadMatches(required: string[], expectedHead: string): boolean {
  return required.every((name) => {
    const artifact = readExactWaveJson<Artifact>(name);
    return artifact?.source_code_head === expectedHead && artifact?.current_head_at_write_time === expectedHead;
  });
}

function cleanStatus(status: string): boolean {
  return status
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .every((line) => line.startsWith("## ") && !line.includes("[ahead") && !line.includes("[behind"));
}

export function runUserInputExactMaterialPriceEstimateCloseout() {
  const required = [
    "matrix.json",
    "user_input_1000_results.json",
    "semantic_500_material_price_results.json",
    "compatibility_10000_results.json",
    "pricebook_lookup_results.json",
    "recipe_coverage_results.json",
    "missing_price_results.json",
    "pdf_results.json",
    "web_results.json",
    "responsive_results.json",
    "android_api34_results.json",
    "ios_protocol_readiness.json",
  ];
  const missing = required.filter((name) => !readExactWaveJson(name));
  const android = readExactWaveJson<Artifact>("android_api34_results.json");
  const web = readExactWaveJson<Artifact>("web_results.json");
  const responsive = readExactWaveJson<Artifact>("responsive_results.json");
  const backend = readExactWaveJson<Artifact>("matrix.json");
  const localHead = gitOutput(["rev-parse", "HEAD"], "unknown");
  const originHead = gitOutput(["rev-parse", "origin/enterprise/catalog-work-platform-additive-ontology"], "unknown");
  const status = gitOutput(["status", "--short", "--branch", "--untracked-files=all"], "");
  const writeFinalMatrix = process.env.EXACT_CLOSEOUT_WRITE_MATRIX === "1";
  const requirePushedClean = !writeFinalMatrix;

  const typecheckPassed = artifactPassed("typecheck_results.json");
  const lintPassed = artifactPassed("lint_results.json");
  const releaseVerifyPassed =
    artifactPassed("release_verify_first_results.json") &&
    artifactPassed("release_verify_second_results.json");
  const backendBlockers = Array.isArray(backend?.blockers) ? backend.blockers : ["BACKEND_MATRIX_MISSING"];
  const allRequiredArtifactsMatchSource = sourceHeadMatches(required, localHead);

  const blockers = [
    ...missing.map((name) => `ARTIFACT_MISSING:${name}`),
    ...(android?.android_api34_tested === true && android?.actual_api === 34 ? [] : ["ANDROID_API34_NOT_GREEN"]),
    ...(web?.web_chromium_passed && web?.web_firefox_passed && web?.web_webkit_passed ? [] : ["WEB_ALL_BROWSERS_NOT_GREEN"]),
    ...(responsive?.responsive_mobile_passed && responsive?.responsive_tablet_passed ? [] : ["RESPONSIVE_NOT_GREEN"]),
    ...(backendBlockers.length === 0 ? [] : ["BACKEND_MATRIX_HAS_BLOCKERS"]),
    ...(typecheckPassed ? [] : ["TYPECHECK_NOT_GREEN"]),
    ...(lintPassed ? [] : ["LINT_NOT_GREEN"]),
    ...(fullJestPassed() ? [] : ["FULL_JEST_NOT_GREEN"]),
    ...(releaseVerifyPassed ? [] : ["RELEASE_VERIFY_TWICE_NOT_GREEN"]),
    ...(allRequiredArtifactsMatchSource ? [] : ["SOURCE_CODE_HEAD_MISMATCH"]),
    ...(requirePushedClean && localHead !== originHead ? ["LOCAL_HEAD_NOT_PUSHED"] : []),
    ...(requirePushedClean && !cleanStatus(status) ? ["WORKTREE_NOT_CLEAN"] : []),
  ];
  const finalMatrix = {
    final_status: blockers.length === 0
      ? EXACT_MATERIAL_PRICE_ESTIMATE_GREEN_STATUS
      : "BLOCKED_USER_INPUT_TO_EXACT_MATERIAL_PRICE_ESTIMATE_CLOSEOUT",
    source_code_head_matches: allRequiredArtifactsMatchSource,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    full_jest_passed: fullJestPassed(),
    release_verify_passed: releaseVerifyPassed,
    user_input_parsing_passed: backend?.user_input_parsing_passed === true,
    selected_work_source_of_truth_passed: backend?.selected_work_source_of_truth_passed === true,
    quantity_parser_passed: backend?.quantity_parser_passed === true,
    exact_recipe_resolution_passed: backend?.exact_recipe_resolution_passed === true,
    material_consumption_calculation_passed: backend?.material_consumption_calculation_passed === true,
    pricebook_lookup_passed: backend?.pricebook_lookup_passed === true,
    no_random_prices: backend?.no_random_prices === true,
    no_fake_suppliers: backend?.no_fake_suppliers === true,
    missing_price_handled_honestly: backend?.missing_price_handled_honestly === true,
    acceptance_1000_passed: backend?.acceptance_1000_passed === true,
    semantic_500_passed: backend?.semantic_500_passed === true,
    compatibility_10000_passed: backend?.compatibility_10000_passed === true,
    web_chromium_passed: web?.web_chromium_passed === true,
    web_firefox_passed: web?.web_firefox_passed === true,
    web_webkit_passed: web?.web_webkit_passed === true,
    android_api34_tested: android?.android_api34_tested === true,
    actual_api: android?.actual_api ?? null,
    api36_rejected: android?.api36_rejected === true,
    api36_used_as_substitute: android?.api36_used_as_substitute === true,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    ios_protocol_ready: backend?.ios_protocol_ready === true,
    generic_rows_for_known_work: backend?.generic_rows_for_known_work ?? null,
    paid_control_rows: backend?.paid_control_rows ?? null,
    internal_keys_visible: backend?.internal_keys_visible ?? null,
    mojibake_found: backend?.mojibake_found ?? null,
    fake_prices_found: backend?.fake_prices_found ?? null,
    fake_suppliers_found: backend?.fake_suppliers_found ?? null,
    random_price_fallbacks_found: backend?.random_price_fallbacks_found ?? null,
    selected_work_key_lost: backend?.selected_work_key_lost ?? null,
    quantity_parser_failures: backend?.quantity_parser_failures ?? null,
    fake_green_claimed: false,
    blockers,
  };
  if (writeFinalMatrix) {
    writeExactWaveJson("matrix.json", finalMatrix);
  }
  const result = {
    ...finalMatrix,
    local_head: localHead,
    origin_head: originHead,
    local_head_matches_origin: localHead === originHead,
    worktree_status: status,
    artifact_statuses: Object.fromEntries(required.map((name) => [name, finalStatus(name)])),
    gate_artifact_failures: {
      typecheck: artifactFailures("typecheck_results.json"),
      lint: artifactFailures("lint_results.json"),
      release_verify_first: artifactFailures("release_verify_first_results.json"),
      release_verify_second: artifactFailures("release_verify_second_results.json"),
    },
  };
  writeExactWaveJson("closeout_results.json", result);
  console.log(result.final_status);
  if (blockers.length > 0) {
    console.error(JSON.stringify(blockers, null, 2));
    process.exitCode = 1;
  }
  return result;
}

if (require.main === module) {
  runUserInputExactMaterialPriceEstimateCloseout();
}
