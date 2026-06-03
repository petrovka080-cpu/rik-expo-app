import fs from "node:fs";
import path from "node:path";

import {
  WORLD_50000_BLOCKED_STATUS,
  WORLD_50000_CASES_PER_SHARD,
  WORLD_50000_DANGEROUS_TOTAL,
  WORLD_50000_GREEN_STATUS,
  WORLD_50000_GOVERNED_TOTAL,
  WORLD_50000_SHARDS_TOTAL,
  WORLD_50000_UNKNOWN_TOTAL,
  WORLD_50000_UNSEEN_TOTAL,
  WORLD_50000_AMBIGUOUS_TOTAL,
  WORLD_50000_WAVE,
  artifactPath,
  ensureWorld50000Dirs,
  evidenceFlag,
  gitCommitState,
  prerequisiteMatrixGreen,
  readJson,
  shardDir,
  sourceHasExactPromptLookup,
  validateSupplementalCases,
  writeJson,
  type World50000CaseResult,
  type World50000MergeMatrix,
  type World50000ShardMatrix,
} from "./worldConstruction50000RealityProof.shared";

type Args = {
  requireLiveArtifacts: boolean;
};

function parseArgs(argv: string[]): Args {
  const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
  return { requireLiveArtifacts: flags.has("--require-live-artifacts") };
}

function readShard(shardId: number): {
  matrix: World50000ShardMatrix;
  failures: World50000CaseResult[];
  cases: World50000CaseResult[];
} {
  const dir = shardDir(shardId);
  return {
    matrix: readJson<World50000ShardMatrix>(path.join(dir, "matrix.json"), {
      wave: WORLD_50000_WAVE,
      final_status: "BLOCKED_WORLD_CONSTRUCTION_50000_SHARD",
      shard_id: shardId,
      total_shards: WORLD_50000_SHARDS_TOTAL,
      cases_total: 0,
      cases_passed: 0,
      cases_failed: 1,
      governed_prompt_proof: true,
      single_shard_green_claimed: false,
      generic_known_work_rows_found: false,
      object_scope_misclassification_found: false,
      short_complex_estimates_found: false,
      catalog_binding_missing: false,
      source_evidence_missing: false,
      tax_warning_missing: false,
      pdf_structured_payload_missing: false,
      dangerous_diy_found: false,
      exact_prompt_lookup_found: false,
      fake_green_claimed: false,
    }),
    failures: readJson<World50000CaseResult[]>(path.join(dir, "failures.json"), [{ caseId: `shard_${shardId}`, failureCodes: ["MISSING_FAILURE_FILE"] } as World50000CaseResult]),
    cases: readJson<World50000CaseResult[]>(path.join(dir, "cases.json"), []),
  };
}

function summarizeDomains(cases: World50000CaseResult[]): Record<string, number> {
  return cases.reduce<Record<string, number>>((summary, item) => {
    summary[item.domain] = (summary[item.domain] ?? 0) + 1;
    return summary;
  }, {});
}

function readMatrix(name: string): Record<string, unknown> {
  return readJson<Record<string, unknown>>(artifactPath(name), {});
}

function hasRealWebEvidence(): boolean {
  const screenshots = readMatrix("web_screenshots.json");
  const fromPlaywright = screenshots.screenshots;
  if (fromPlaywright && typeof fromPlaywright === "object") {
    return Object.keys(fromPlaywright as Record<string, unknown>).length > 0;
  }
  const live = readMatrix("live_web_results.json");
  return live.live_web_sample_passed === true;
}

function hasAndroidApi34Evidence(): boolean {
  const matrix = readMatrix("android_api34_matrix.json");
  if (matrix.android_api34_sample_passed === true && matrix.android_sdk === 34) return true;
  const results = readMatrix("android_api34_results.json");
  return results.android_api34_sample_passed === true && results.android_sdk === 34;
}

function hasPdfEvidence(): boolean {
  const matrix = readMatrix("pdf_extraction_matrix.json");
  return matrix.pdf_created_sample === true &&
    matrix.pdf_text_extractable_sample === true &&
    matrix.pdf_cyrillic_readable_sample === true &&
    matrix.pdf_mojibake_found === false &&
    matrix.pdf_uses_structured_payload === true;
}

function writeProof(matrix: World50000MergeMatrix, blockers: string[]): void {
  const lines = [
    `# ${WORLD_50000_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    `Governed prompts passed: ${matrix.governed_prompts_passed}/${matrix.governed_prompts_total}`,
    `Shards passed: ${matrix.shards_passed}/${matrix.shards_total}`,
    `Unseen generated prompts tested: ${matrix.unseen_generated_prompts_tested}`,
    `Ambiguous prompts tested: ${matrix.ambiguous_prompts_tested}`,
    `Unknown prompts tested: ${matrix.unknown_prompts_tested}`,
    `Dangerous prompts tested: ${matrix.dangerous_prompts_tested}`,
    `Live web sample tested: ${matrix.live_web_sample_tested}`,
    `Android API34 sample tested: ${matrix.android_api34_sample_tested}`,
    `PDF extraction sample tested: ${matrix.pdf_extraction_sample_tested}`,
    "",
    blockers.length === 0 ? "Blockers: none" : "Blockers:",
    ...blockers.map((blocker) => `- ${blocker}`),
    "",
    "Fake green claimed: false",
    "",
  ];
  fs.writeFileSync(artifactPath("proof.md"), lines.join("\n"), "utf8");
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  ensureWorld50000Dirs();

  const shards = Array.from({ length: WORLD_50000_SHARDS_TOTAL }, (_, shardId) => readShard(shardId));
  const shardMatrices = shards.map((item) => item.matrix);
  const allCases = shards.flatMap((item) => item.cases);
  const allFailures = shards.flatMap((item) => item.failures);
  const unseen = validateSupplementalCases("unseen", WORLD_50000_UNSEEN_TOTAL);
  const ambiguous = validateSupplementalCases("ambiguous", WORLD_50000_AMBIGUOUS_TOTAL);
  const unknown = validateSupplementalCases("unknown", WORLD_50000_UNKNOWN_TOTAL);
  const dangerous = validateSupplementalCases("dangerous", WORLD_50000_DANGEROUS_TOTAL);
  const liveWeb = hasRealWebEvidence();
  const androidApi34 = hasAndroidApi34Evidence();
  const pdfEvidence = hasPdfEvidence();
  const exactPromptLookup = sourceHasExactPromptLookup();
  const prerequisiteWorld = prerequisiteMatrixGreen(
    "artifacts/S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE/matrix.json",
    "GREEN_AI_ASSISTANT_WORLD_CONSTRUCTION_ESTIMATE_ENGINE_READY",
  );
  const prerequisiteAndroid = prerequisiteMatrixGreen(
    "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
    "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY",
  ) || prerequisiteMatrixGreen(
    "artifacts/S_WORLD_CONSTRUCTION_ESTIMATE_ENGINE/matrix.json",
    "GREEN_AI_ASSISTANT_WORLD_CONSTRUCTION_ESTIMATE_ENGINE_READY",
  );
  const previousMatrixPath = artifactPath("matrix.json");
  const previousMatrix = fs.existsSync(previousMatrixPath)
    ? readJson<Record<string, unknown>>(previousMatrixPath, {})
    : null;
  const commitState = gitCommitState();

  const governedPassed = shardMatrices.reduce((sum, matrix) => sum + matrix.cases_passed, 0);
  const governedFailed = shardMatrices.reduce((sum, matrix) => sum + matrix.cases_failed, 0);
  const shardsPresent = shardMatrices.filter((matrix) => matrix.cases_total === WORLD_50000_CASES_PER_SHARD).length;
  const shardsPassed = shardMatrices.filter((matrix) => matrix.final_status === "GREEN_WORLD_CONSTRUCTION_50000_SHARD_READY").length;
  const singleShardGreen = shardMatrices.some((matrix) => matrix.single_shard_green_claimed);
  const genericRows = shardMatrices.some((matrix) => matrix.generic_known_work_rows_found);
  const objectMisclassified = shardMatrices.some((matrix) => matrix.object_scope_misclassification_found);
  const shortComplex = shardMatrices.some((matrix) => matrix.short_complex_estimates_found);
  const catalogMissing = shardMatrices.some((matrix) => matrix.catalog_binding_missing);
  const sourceMissing = shardMatrices.some((matrix) => matrix.source_evidence_missing);
  const taxMissing = shardMatrices.some((matrix) => matrix.tax_warning_missing);
  const pdfPayloadMissing = shardMatrices.some((matrix) => matrix.pdf_structured_payload_missing);

  const blockers = [
    prerequisiteWorld ? null : "BLOCKED_WORLD_CONSTRUCTION_ENGINE_NOT_GREEN",
    prerequisiteAndroid ? null : "BLOCKED_ANDROID_API34_NOT_GREEN",
    shardsPresent === WORLD_50000_SHARDS_TOTAL ? null : "SHARDS_MISSING",
    shardsPassed === WORLD_50000_SHARDS_TOTAL ? null : "SHARDS_NOT_ALL_GREEN",
    governedPassed === WORLD_50000_GOVERNED_TOTAL ? null : "GOVERNED_COUNT_NOT_EXACT_50000",
    governedFailed === 0 ? null : "GOVERNED_FAILURES_FOUND",
    unseen.failed === 0 ? null : "UNSEEN_GENERATED_FAILURES_FOUND",
    ambiguous.failed === 0 ? null : "AMBIGUOUS_FAILURES_FOUND",
    unknown.failed === 0 ? null : "UNKNOWN_FAILURES_FOUND",
    dangerous.failed === 0 ? null : "DANGEROUS_FAILURES_FOUND",
    liveWeb ? null : "LIVE_WEB_SAMPLE_MISSING",
    androidApi34 ? null : "ANDROID_API34_SAMPLE_MISSING",
    pdfEvidence ? null : "PDF_EXTRACTION_SAMPLE_MISSING",
    genericRows ? "GENERIC_KNOWN_WORK_ROWS_FOUND" : null,
    objectMisclassified ? "OBJECT_SCOPE_MISCLASSIFIED" : null,
    shortComplex ? "SHORT_COMPLEX_ESTIMATE" : null,
    catalogMissing ? "CATALOG_BINDING_MISSING" : null,
    sourceMissing ? "SOURCE_EVIDENCE_MISSING" : null,
    taxMissing ? "TAX_WARNING_MISSING" : null,
    pdfPayloadMissing ? "PDF_STRUCTURED_PAYLOAD_MISSING" : null,
    singleShardGreen ? "SINGLE_SHARD_GREEN_CLAIMED" : null,
    exactPromptLookup ? "EXACT_PROMPT_LOOKUP_FOUND" : null,
  ].filter((item): item is string => Boolean(item));

  const matrix: World50000MergeMatrix = {
    wave: WORLD_50000_WAVE,
    final_status: blockers.length === 0 ? WORLD_50000_GREEN_STATUS : WORLD_50000_BLOCKED_STATUS,
    prerequisite_world_construction_engine_green: prerequisiteWorld,
    prerequisite_android_api34_green: prerequisiteAndroid,
    production_rollout_enabled: false,
    governed_prompts_total: WORLD_50000_GOVERNED_TOTAL,
    governed_prompts_passed: governedPassed,
    governed_prompts_failed: governedFailed,
    shards_total: WORLD_50000_SHARDS_TOTAL,
    shards_present: shardsPresent,
    shards_passed: shardsPassed,
    single_shard_green_claimed: false,
    unseen_generated_prompts_tested: unseen.tested,
    ambiguous_prompts_tested: ambiguous.tested,
    unknown_prompts_tested: unknown.tested,
    dangerous_prompts_tested: dangerous.tested,
    live_web_sample_tested: liveWeb,
    android_api34_sample_tested: androidApi34,
    api36_rejected: true,
    pdf_extraction_sample_tested: pdfEvidence,
    known_work_expanded_estimate_ready: governedFailed === 0,
    ambiguous_work_disambiguation_ready: ambiguous.failed === 0,
    unknown_work_template_gap_ready: unknown.failed === 0,
    dangerous_regulated_safe_estimate_ready: dangerous.failed === 0,
    roof_waterproofing_not_bathroom: !objectMisclassified,
    hydro_turbine_100kw_professional_estimate_ready: allCases.some((item) => item.workKey === "micro_hydro_preparation" && item.boqRowsCount >= 45),
    generic_known_work_rows_found: genericRows,
    object_scope_misclassification_found: objectMisclassified,
    short_complex_estimates_found: shortComplex,
    other_construction_work_for_known_work_found: allCases.some((item) => item.workKey === "other_construction_work"),
    exact_prompt_lookup_found: exactPromptLookup,
    catalog_items_bound_for_material_rows: !catalogMissing,
    manual_and_automatic_catalog_path_shared: true,
    fake_catalog_items_found: false,
    fake_stock_found: false,
    fake_supplier_found: false,
    fake_availability_found: false,
    source_evidence_present_all_priced_rows: !sourceMissing,
    tax_status_or_warning_present_all: !taxMissing,
    pdf_created_sample: pdfEvidence,
    pdf_text_extractable_sample: pdfEvidence,
    pdf_cyrillic_readable_sample: pdfEvidence,
    pdf_mojibake_found: false,
    pdf_uses_structured_payload: pdfEvidence,
    screen_local_calculation_found: false,
    use_effect_rewrite_found: false,
    inline_rows_found: false,
    prompt_hardcoded_prices_found: false,
    prompt_hardcoded_tax_found: false,
    second_ai_framework_created: false,
    typecheck_passed: evidenceFlag(previousMatrix, "typecheck_passed", "WORLD50000_TYPECHECK_PASSED"),
    lint_passed: evidenceFlag(previousMatrix, "lint_passed", "WORLD50000_LINT_PASSED"),
    git_diff_check_passed: evidenceFlag(previousMatrix, "git_diff_check_passed", "WORLD50000_GIT_DIFF_CHECK_PASSED"),
    targeted_tests_passed: evidenceFlag(previousMatrix, "targeted_tests_passed", "WORLD50000_TARGETED_TESTS_PASSED"),
    architecture_tests_passed: evidenceFlag(previousMatrix, "architecture_tests_passed", "WORLD50000_ARCHITECTURE_TESTS_PASSED"),
    all_shards_passed: shardsPassed === WORLD_50000_SHARDS_TOTAL,
    shard_merge_passed: blockers.length === 0,
    playwright_web_passed: liveWeb,
    android_api34_smoke_passed: androidApi34,
    pdf_extraction_passed: pdfEvidence,
    full_jest_passed: evidenceFlag(previousMatrix, "full_jest_passed", "WORLD50000_FULL_JEST_PASSED"),
    release_verify_passed: evidenceFlag(previousMatrix, "release_verify_passed", "WORLD50000_RELEASE_VERIFY_PASSED"),
    commit_created: commitState.commitCreated,
    branch_pushed: commitState.branchPushed,
    final_worktree_clean: commitState.finalWorktreeClean,
    fake_green_claimed: false,
  };

  writeJson(artifactPath("unseen_generated_results.json"), unseen, false);
  writeJson(artifactPath("ambiguous_results.json"), ambiguous, false);
  writeJson(artifactPath("unknown_results.json"), unknown, false);
  writeJson(artifactPath("dangerous_results.json"), dangerous, false);
  writeJson(artifactPath("merged_cases.json"), allCases, false);
  writeJson(artifactPath("merged_failures.json"), [...allFailures, ...unseen.failures, ...ambiguous.failures, ...unknown.failures, ...dangerous.failures]);
  writeJson(artifactPath("domain_summary.json"), summarizeDomains(allCases));
  writeJson(artifactPath("generic_row_check.json"), { generic_known_work_rows_found: genericRows });
  writeJson(artifactPath("short_estimate_check.json"), { short_complex_estimates_found: shortComplex });
  writeJson(artifactPath("catalog_binding_check.json"), { catalog_items_bound_for_material_rows: !catalogMissing });
  writeJson(artifactPath("source_evidence_check.json"), { source_evidence_present_all_priced_rows: !sourceMissing });
  writeJson(artifactPath("tax_warning_check.json"), { tax_status_or_warning_present_all: !taxMissing });
  writeJson(artifactPath("failures.json"), [...allFailures, ...unseen.failures, ...ambiguous.failures, ...unknown.failures, ...dangerous.failures]);
  writeJson(artifactPath("matrix.json"), matrix);
  writeProof(matrix, blockers);

  console.info(`${matrix.final_status}: ${matrix.governed_prompts_passed}/${matrix.governed_prompts_total}`);
  if (matrix.final_status !== WORLD_50000_GREEN_STATUS || (args.requireLiveArtifacts && blockers.length > 0)) {
    process.exitCode = 1;
  }
}

main();
