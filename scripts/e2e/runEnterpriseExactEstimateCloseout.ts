import fs from "node:fs";
import path from "node:path";

import {
  artifactFailures,
  ENTERPRISE_EXACT_ESTIMATE_GREEN_STATUS,
  gitOutput,
  greenArtifact,
  readEnterpriseExactJson,
  sourceCodeHead,
  writeEnterpriseExactJson,
  writeEnterpriseProofMarkdown,
} from "./enterpriseExactEstimate.shared";

type Artifact = Record<string, unknown>;

function cleanBranchStatus(status: string): boolean {
  return status
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .every((line) => line.startsWith("## ") && !line.includes("[ahead") && !line.includes("[behind"));
}

function artifactStatus(name: string): string | null {
  return (readEnterpriseExactJson<Artifact>(name)?.final_status as string | undefined) ?? null;
}

function sourceHeadMatches(names: string[], expectedHead: string): boolean {
  return names.every((name) => {
    const artifact = readEnterpriseExactJson<Artifact>(name);
    return artifact?.source_code_head === expectedHead && artifact?.current_head_at_write_time === expectedHead;
  });
}

export function runEnterpriseExactEstimateCloseout() {
  const requiredArtifacts = [
    "backend_acceptance_results.json",
    "real_user_input_1000_results.json",
    "real500_semantic_results.json",
    "real10000_compatibility_results.json",
    "pricebook_ratebook_results.json",
    "recipe_coverage_results.json",
    "missing_price_results.json",
    "pdf_results.json",
    "web_results.json",
    "responsive_results.json",
    "android_api34_results.json",
    "ios_protocol_readiness.json",
    "typecheck_results.json",
    "lint_results.json",
    "full_jest_results.json",
    "release_verify_first_results.json",
    "release_verify_second_results.json",
    "release_verify_postpush_results.json",
  ];
  const requiredFiles = [
    "scripts/e2e/enterpriseExactEstimate.shared.ts",
    "scripts/e2e/runEnterpriseExactEstimateBackendAcceptance.ts",
    "scripts/e2e/runEnterpriseExactEstimatePdfProof.ts",
    "scripts/e2e/runAndroidApi34EnterpriseExactEstimateSmoke.ts",
    "scripts/e2e/runEnterpriseExactEstimateCloseout.ts",
    "tests/enterpriseExactEstimate/userInputExactEstimateSource.contract.test.ts",
    "tests/enterpriseExactEstimate/pricebookRatebookGovernance.contract.test.ts",
    "tests/enterpriseExactEstimate/exactMaterialRecipes.contract.test.ts",
    "tests/enterpriseExactEstimate/realEnterpriseEstimate1000Audits.contract.test.ts",
    "tests/enterpriseExactEstimate/platformProtocol.contract.test.ts",
    "tests/e2e/enterpriseExactEstimate.web.spec.ts",
    "tests/e2e/enterpriseExactEstimate.responsive.web.spec.ts",
  ];
  const localHead = sourceCodeHead();
  const originHead = gitOutput(["rev-parse", "origin/enterprise/catalog-work-platform-additive-ontology"], "unknown");
  const status = gitOutput(["status", "--short", "--branch", "--untracked-files=all"], "");
  const backend = readEnterpriseExactJson<Artifact>("backend_acceptance_results.json");
  const web = readEnterpriseExactJson<Artifact>("web_results.json");
  const responsive = readEnterpriseExactJson<Artifact>("responsive_results.json");
  const android = readEnterpriseExactJson<Artifact>("android_api34_results.json");
  const missingArtifacts = requiredArtifacts.filter((name) => !readEnterpriseExactJson(name));
  const missingFiles = requiredFiles.filter((filePath) => !fs.existsSync(path.join(process.cwd(), filePath)));
  const nonGreenArtifacts = requiredArtifacts
    .filter((name) => !missingArtifacts.includes(name))
    .filter((name) => !greenArtifact(name));
  const lineageOk = sourceHeadMatches(requiredArtifacts.filter((name) => !missingArtifacts.includes(name)), localHead);
  const blockers = [
    ...missingArtifacts.map((name) => `ARTIFACT_MISSING:${name}`),
    ...nonGreenArtifacts.map((name) => `ARTIFACT_NOT_GREEN:${name}:${artifactStatus(name) ?? "missing"}`),
    ...missingFiles.map((filePath) => `REQUIRED_FILE_MISSING:${filePath}`),
    ...(lineageOk ? [] : ["SOURCE_CODE_HEAD_MISMATCH"]),
    ...(localHead === originHead ? [] : ["LOCAL_HEAD_NOT_PUSHED"]),
    ...(cleanBranchStatus(status) ? [] : ["WORKTREE_NOT_CLEAN"]),
    ...(web?.web_chromium_passed && web?.web_firefox_passed && web?.web_webkit_passed ? [] : ["WEB_ALL_BROWSERS_NOT_GREEN"]),
    ...(responsive?.responsive_mobile_passed && responsive?.responsive_tablet_passed ? [] : ["RESPONSIVE_NOT_GREEN"]),
    ...(android?.android_api34_tested === true && android?.actual_api === 34 ? [] : ["ANDROID_API34_NOT_GREEN"]),
  ];
  const result = {
    final_status: blockers.length === 0
      ? ENTERPRISE_EXACT_ESTIMATE_GREEN_STATUS
      : "BLOCKED_ENTERPRISE_EXACT_AI_ESTIMATE_PLATFORM_CLOSEOUT",
    local_head: localHead,
    origin_head: originHead,
    local_head_matches_origin: localHead === originHead,
    source_code_head_matches: lineageOk,
    worktree_status: status,
    required_files: requiredFiles,
    missing_files: missingFiles,
    artifact_statuses: Object.fromEntries(requiredArtifacts.map((name) => [name, artifactStatus(name)])),
    gate_artifact_failures: {
      typecheck: artifactFailures("typecheck_results.json"),
      lint: artifactFailures("lint_results.json"),
      full_jest: artifactFailures("full_jest_results.json"),
      release_verify_first: artifactFailures("release_verify_first_results.json"),
      release_verify_second: artifactFailures("release_verify_second_results.json"),
      release_verify_postpush: artifactFailures("release_verify_postpush_results.json"),
    },
    user_input_parsing_passed: backend?.user_input_parsing_passed === true,
    selected_work_source_of_truth_passed: backend?.selected_work_source_of_truth_passed === true,
    quantity_parser_passed: backend?.quantity_parser_passed === true,
    exact_recipe_resolution_passed: backend?.exact_recipe_resolution_passed === true,
    material_consumption_calculation_passed: backend?.material_consumption_calculation_passed === true,
    pricebook_lookup_passed: backend?.pricebook_lookup_passed === true,
    acceptance_1000_passed: backend?.acceptance_1000_passed === true,
    semantic_500_passed: backend?.semantic_500_passed === true,
    compatibility_10000_passed: backend?.compatibility_10000_passed === true,
    web_chromium_passed: web?.web_chromium_passed === true,
    web_firefox_passed: web?.web_firefox_passed === true,
    web_webkit_passed: web?.web_webkit_passed === true,
    responsive_mobile_passed: responsive?.responsive_mobile_passed === true,
    responsive_tablet_passed: responsive?.responsive_tablet_passed === true,
    android_api34_tested: android?.android_api34_tested === true,
    actual_api: android?.actual_api ?? null,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    ota_publish_started: false,
    fake_green_claimed: false,
    blockers,
  };
  writeEnterpriseExactJson("matrix.json", result);
  writeEnterpriseProofMarkdown(result);
  console.log(result.final_status);
  if (blockers.length > 0) {
    console.error(JSON.stringify(blockers, null, 2));
    process.exitCode = 1;
  }
  return result;
}

if (require.main === module) {
  runEnterpriseExactEstimateCloseout();
}
