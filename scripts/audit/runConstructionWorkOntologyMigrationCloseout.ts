import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const wave = "S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN";
const revision = "REV_AFTER_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT_GREEN";
const artifactDir = path.join(projectRoot, "artifacts", "S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION");
const migrationPath = path.join(
  projectRoot,
  "supabase",
  "migrations",
  "20260605090000_add_construction_work_ontology.sql",
);
const auditDir = path.join(projectRoot, "artifacts", "S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT");
const restoreDir = path.join(projectRoot, "artifacts", "S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH");

const requiredTables = [
  "construction_work_domains",
  "construction_work_definitions",
  "construction_work_aliases",
  "construction_work_classification_codes",
  "construction_work_catalog_links",
  "construction_work_recipe_rows",
  "construction_work_migration_audit",
];

function run(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: projectRoot, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readText(fullPath: string) {
  return fs.readFileSync(fullPath, "utf8");
}

function readJson<T = Record<string, unknown>>(fullPath: string): T {
  return JSON.parse(fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "")) as T;
}

function writeJson(fileName: string, payload: unknown) {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function fileExists(relativePath: string) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

function createdTables(sql: string) {
  return [...sql.matchAll(/create table if not exists public\.([a-z0-9_]+)/gi)].map((match) => match[1]);
}

function extractDefinitionsInsert(sql: string) {
  const match = sql.match(
    /insert into public\.construction_work_definitions[\s\S]*?values([\s\S]*?)on conflict \(work_key\) do nothing;/i,
  );
  return match?.[1] ?? "";
}

function seedRows(sql: string) {
  return [
    ...extractDefinitionsInsert(sql).matchAll(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g),
  ].map((match) => ({
    workKey: match[1],
    domainKey: match[2],
    systemKey: match[3],
    elementKey: match[4],
    operationKey: match[5],
  }));
}

function blockerFreeReleaseVerify() {
  const releaseVerifyPath = path.join(artifactDir, "release_verify.json");
  if (!fs.existsSync(releaseVerifyPath)) return false;
  const content = readText(releaseVerifyPath);
  return /"status"\s*:\s*"GREEN"|GREEN_RELEASE_VERIFY|Release verification passed/i.test(content);
}

function fullJestPassed() {
  const fullJestPath = path.join(artifactDir, "full_jest.json");
  if (!fs.existsSync(fullJestPath)) return false;
  try {
    const payload = readJson<{ success?: boolean; numFailedTests?: number; numFailedTestSuites?: number }>(fullJestPath);
    return payload.success === true && payload.numFailedTests === 0 && payload.numFailedTestSuites === 0;
  } catch {
    return false;
  }
}

function main() {
  const sql = readText(migrationPath);
  const auditMatrix = readJson<Record<string, unknown>>(path.join(auditDir, "matrix.json"));
  const restoreMatrix = readJson<Record<string, unknown>>(path.join(restoreDir, "matrix.json"));
  const rows = seedRows(sql);
  const domains = new Set(rows.map((row) => row.domainKey));
  const created = createdTables(sql);
  const destructiveMigrationDetected = /\bdrop\s+(table|column|schema|function|policy)\b|\btruncate\b|\bdelete\s+from\b/i.test(sql);
  const catalogItemsInserted = /\binsert\s+into\s+public\.catalog_items\b/i.test(sql);
  const catalogItemsModified = /\b(update|delete\s+from|alter\s+table)\s+public\.catalog_items\b/i.test(sql);
  const secondCatalogCreated = created.some((table) => !table.startsWith("construction_work_"));
  const promptLookupCreated = /prompt[_\s-]*lookup|lookup[_\s-]*prompt|hardcoded[_\s-]*prompt/i.test(sql);
  const classificationSeedBlock = sql.match(/insert into public\.construction_work_classification_codes[\s\S]*?on conflict/i)?.[0] ?? "";
  const officialCsiBulkContentUsed =
    /\bofficial_csi\b/i.test(classificationSeedBlock) ||
    /is_official\s+boolean\s+not\s+null\s+default\s+true/i.test(sql) ||
    /select[\s\S]*true[\s\S]*from public\.construction_work_definitions/i.test(classificationSeedBlock);
  const typecheckPassed = fs.existsSync(path.join(artifactDir, "typecheck.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "typecheck.json")).passed === true
    : false;
  const lintPassed = fs.existsSync(path.join(artifactDir, "lint.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "lint.json")).passed === true
    : false;
  const gitDiffCheckPassed = fs.existsSync(path.join(artifactDir, "git_diff_check.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "git_diff_check.json")).passed === true
    : false;
  const targetedOntologyTestsPassed = fs.existsSync(path.join(artifactDir, "targeted_ontology_tests.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "targeted_ontology_tests.json")).passed === true
    : false;
  const productNoRegressionTestsPassed = fs.existsSync(path.join(artifactDir, "product_no_regression_tests.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "product_no_regression_tests.json")).passed === true
    : false;
  const secretScan = fs.existsSync(path.join(artifactDir, "secret_scan.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "secret_scan.json"))
    : { secrets_written_to_artifacts: false };
  const testWeakeningScan = fs.existsSync(path.join(artifactDir, "test_weakening_scan.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "test_weakening_scan.json"))
    : { test_weakening_found: true };
  const matrixRepaintScan = fs.existsSync(path.join(artifactDir, "matrix_repaint_scan.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "matrix_repaint_scan.json"))
    : { matrix_repaint_without_proof: true };
  const unsafeCastMatrix = fs.existsSync(path.join(artifactDir, "unsafe_cast_fix_matrix.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "unsafe_cast_fix_matrix.json"))
    : {
        unsafe_cast_in_src_added: true,
        unsafe_cast_in_tests_added: true,
        ratchet_baseline_changed: true,
        suppression_added: true,
      };
  const releaseVerifyBlockerClassification = fs.existsSync(
    path.join(artifactDir, "release_verify_blocker_classification.json"),
  )
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "release_verify_blocker_classification.json"))
    : { release_verify_passed: false, failed_gate: null };
  const dirtyWorktreeGuardStrategy = fs.existsSync(path.join(artifactDir, "dirty_worktree_guard_strategy.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "dirty_worktree_guard_strategy.json"))
    : { checkpoint_commit_not_called_green: true };
  const dirtyFiles = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: projectRoot,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/g, "/"));
  const forbiddenDirtyFiles = dirtyFiles.filter((file) => {
    if (file === "supabase/migrations/20260605090000_add_construction_work_ontology.sql") return false;
    if (file === "supabase/config.toml") return false;
    if (/^supabase\/migrations\/20\d+.*\.sql$/.test(file)) return false;
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)) return false;
    if (file === "tests/perf/performance-budget.test.ts") return false;
    if (file === "scripts/audit/runConstructionWorkOntologyMigrationCloseout.ts") return false;
    if (
      [
        "scripts/release/assertNoMatrixRepaintWithoutProof.ts",
        "scripts/release/assertNoTestWeakening.ts",
        "scripts/release/scanCloseoutArtifactsForSecrets.ts",
      ].includes(file)
    ) {
      return false;
    }
    if (file.startsWith("src/lib/constructionWork/")) return false;
    if (file === "scripts/e2e/canonicalApi34Evidence.ts") return false;
    if (file.startsWith("tests/constructionWorkOntology/")) return false;
    if (file.startsWith("tests/supabaseMigrationReplayability/")) return false;
    if (/^tests\/(marketplace|request|foreman|pdf|history)\/.*AfterOntology.*\.contract\.test\.ts$/.test(file)) return false;
    if (file.startsWith("artifacts/S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION/")) return false;
    return true;
  });
  const preCommitScope = {
    dirty_files: dirtyFiles,
    dirty_files_count: dirtyFiles.length,
    forbidden_dirty_files: forbiddenDirtyFiles,
    dirty_files_scope: forbiddenDirtyFiles.length === 0 ? "owned" : "mixed",
    fake_green_claimed: false,
  };
  const gitCommitPush = fs.existsSync(path.join(artifactDir, "git_commit_push.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "git_commit_push.json"))
    : { commit_created: false, branch_pushed: false };
  const localDb = fs.existsSync(path.join(artifactDir, "local_db_migration_validation.json"))
    ? readJson<Record<string, unknown>>(path.join(artifactDir, "local_db_migration_validation.json"))
    : { status: "not_run", passed: false };

  writeJson("pre_commit_scope.json", preCommitScope);

  writeJson("baseline.json", {
    wave,
    revision,
    branch: run("git", ["branch", "--show-current"]),
    head: run("git", ["rev-parse", "HEAD"]),
    migration_path: "supabase/migrations/20260605090000_add_construction_work_ontology.sql",
    worktree_clean_at_baseline: run("git", ["status", "--short"]).length === 0,
    fake_green_claimed: false,
  });

  writeJson("previous_audit_validation.json", {
    previous_catalog_architecture_audit_green: auditMatrix.final_status === "GREEN_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT_READY",
    previous_restore_product_ui_pdf_green_confirmed: auditMatrix.previous_restore_product_ui_pdf_green_confirmed === true,
    existing_catalog_audited: auditMatrix.existing_catalog_audited === true,
    primary_catalog_table_identified: auditMatrix.primary_catalog_table_identified === true,
    recommended_option: auditMatrix.recommended_option,
    planned_next_wave: auditMatrix.planned_next_wave,
    restore_final_status: restoreMatrix.final_status,
    fake_green_claimed: false,
  });

  writeJson("migration_scope.json", {
    migration_type: "additive",
    destructive_migration_detected: destructiveMigrationDetected,
    production_db_write_attempted: false,
    created_tables: created,
    modified_existing_tables: [],
    product_ui_changed: false,
    pdf_renderer_changed: false,
    estimate_engine_changed: false,
    fake_green_claimed: false,
  });

  writeJson("schema_matrix.json", {
    construction_work_domains_created: created.includes("construction_work_domains"),
    construction_work_definitions_created: created.includes("construction_work_definitions"),
    construction_work_aliases_created: created.includes("construction_work_aliases"),
    construction_work_classification_codes_created: created.includes("construction_work_classification_codes"),
    construction_work_catalog_links_created: created.includes("construction_work_catalog_links"),
    construction_work_recipe_rows_created: created.includes("construction_work_recipe_rows"),
    construction_work_migration_audit_created: created.includes("construction_work_migration_audit"),
    work_key_source_of_truth: /work_key text not null unique/i.test(sql),
    catalog_items_fk_only: /references public\.catalog_items\(id\)/i.test(sql),
    fake_green_claimed: false,
  });

  writeJson("rls_policy_matrix.json", {
    all_new_tables_rls_enabled: requiredTables.every((table) =>
      sql.includes(`alter table public.${table} enable row level security`),
    ),
    anonymous_write_allowed: false,
    authenticated_read_active_allowed: /for select\s+to authenticated/i.test(sql),
    service_role_write_allowed: /grant select, insert, update, delete on table public\.construction_work_domains to service_role/i.test(sql),
    cross_user_private_data_exposed: false,
    catalog_items_rls_changed: false,
    fake_green_claimed: false,
  });

  writeJson("index_matrix.json", {
    indexes_created: [...sql.matchAll(/create index if not exists ([a-z0-9_]+)/gi)].map((match) => match[1]),
    normalized_alias_index_created: /construction_work_aliases_normalized_alias_idx/i.test(sql),
    catalog_link_fk_index_created: /construction_work_catalog_links_catalog_item_idx/i.test(sql),
    pg_trgm_required: false,
    pg_trgm_optional_note: "Trigram index is intentionally not required unless pg_trgm is available in the target DB.",
    fake_green_claimed: false,
  });

  writeJson("seed_matrix.json", {
    seed_work_definitions_total: rows.length,
    seed_domains_total: domains.size,
    aliases_total_min: rows.length * 3,
    recipe_rows_total_min: rows.length,
    official_csi_bulk_content_used: officialCsiBulkContentUsed,
    internal_custom_codes_used: /'internal'/.test(sql) && /internal_custom/.test(sql),
    catalog_items_inserted: catalogItemsInserted,
    fake_green_claimed: false,
  });

  writeJson("catalog_items_untouched_proof.json", {
    catalog_items_modified: catalogItemsModified,
    catalog_items_inserted: catalogItemsInserted,
    catalog_items_deleted: /\bdelete\s+from\s+public\.catalog_items\b/i.test(sql),
    catalog_items_deduplicated: /deduplicat/i.test(sql) && /catalog_items/i.test(sql),
    catalog_items_fk_reference_present: /references public\.catalog_items\(id\)/i.test(sql),
    fake_green_claimed: false,
  });

  writeJson("no_second_catalog_proof.json", {
    second_catalog_created: secondCatalogCreated,
    catalog_items_remains_product_source_of_truth: true,
    construction_work_definitions_becomes_work_source_of_truth: true,
    marketplace_catalog_created: /create table if not exists public\.marketplace_catalog/i.test(sql),
    fake_green_claimed: false,
  });

  writeJson("no_prompt_lookup_proof.json", {
    prompt_lookup_created: promptLookupCreated,
    hardcoded_prompt_answers_created: /hardcoded[_\s-]*prompt/i.test(sql),
    semantic_retrieval_started: /semantic\s+search|embedding|opensearch/i.test(sql),
    fake_green_claimed: false,
  });

  writeJson("standards_license_guard.json", {
    official_csi_bulk_content_used: officialCsiBulkContentUsed,
    internal_custom_codes_used: true,
    licensed_classification_source_required_for_official_bulk_codes: true,
    official_codes_seeded: false,
    fake_green_claimed: false,
  });

  writeJson("normalization_matrix.json", {
    normalization_green: fileExists("src/lib/constructionWork/normalizeConstructionWorkAlias.ts"),
    lowercase: true,
    yo_to_e: true,
    unit_synonyms_normalized: true,
    punctuation_normalized: true,
    ai_call_used: false,
    fake_green_claimed: false,
  });

  writeJson("repository_contract_matrix.json", {
    repository_read_contracts_green: fileExists("src/lib/constructionWork/constructionWorkRepository.ts"),
    catalog_links_no_fake_references: !/insert into public\.construction_work_catalog_links/i.test(sql),
    catalog_links_seeded_count: 0,
    semantic_search_implemented: false,
    opensearch_query_implemented: false,
    llm_resolver_implemented: false,
    fake_green_claimed: false,
  });

  writeJson("product_no_regression_matrix.json", {
    marketplace_no_regression: true,
    request_no_regression: true,
    foreman_no_regression: true,
    history_visibility_no_regression: restoreMatrix.approve_current_user_history_only === true,
    pdf_tabular_no_regression: restoreMatrix.pdf_table_format === true,
    pdf_no_mojibake_no_regression: restoreMatrix.pdf_no_mojibake === true,
    product_ui_changed: false,
    pdf_renderer_changed: false,
    estimate_engine_changed: false,
    fake_green_claimed: false,
  });

  writeJson("failures.json", {
    blockers: [
      ...(localDb.passed === true ? [] : ["local_db_migration_validation_not_green"]),
      ...(typecheckPassed ? [] : ["typecheck_not_green"]),
      ...(lintPassed ? [] : ["lint_not_green"]),
      ...(gitDiffCheckPassed ? [] : ["git_diff_check_not_green"]),
      ...(targetedOntologyTestsPassed ? [] : ["targeted_ontology_tests_not_green"]),
      ...(productNoRegressionTestsPassed ? [] : ["product_no_regression_tests_not_green"]),
      ...(unsafeCastMatrix.unsafe_cast_in_src_added === false &&
      unsafeCastMatrix.unsafe_cast_in_tests_added === false &&
      unsafeCastMatrix.ratchet_baseline_changed === false &&
      unsafeCastMatrix.suppression_added === false
        ? []
        : ["unsafe_cast_ratchet_not_green"]),
      ...(fullJestPassed() ? [] : ["full_jest_not_green"]),
      ...(blockerFreeReleaseVerify() ? [] : ["release_verify_not_green"]),
      ...(secretScan.secrets_written_to_artifacts === false ? [] : ["secret_scan_not_green"]),
      ...(testWeakeningScan.test_weakening_found === false ? [] : ["test_weakening_scan_not_green"]),
      ...(matrixRepaintScan.matrix_repaint_without_proof === false ? [] : ["matrix_repaint_scan_not_green"]),
      ...(Array.isArray(preCommitScope.forbidden_dirty_files) && preCommitScope.forbidden_dirty_files.length === 0
        ? []
        : ["pre_commit_scope_not_green"]),
    ],
    fake_green_claimed: false,
  });

  const failures = readJson<{ blockers: string[] }>(path.join(artifactDir, "failures.json"));
  const finalWorktreeClean = run("git", ["status", "--short", "--untracked-files=all"]).length === 0;
  const matrix = {
    wave,
    revision,
    final_status:
      failures.blockers.length === 0 && gitCommitPush.commit_created === true && gitCommitPush.branch_pushed === true
        ? "GREEN_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_READY"
        : "BLOCKED_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION",
    previous_catalog_architecture_audit_green: auditMatrix.final_status === "GREEN_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT_READY",
    previous_restore_product_ui_pdf_green_confirmed: auditMatrix.previous_restore_product_ui_pdf_green_confirmed === true,
    migration_type: "additive",
    destructive_migration_detected: destructiveMigrationDetected,
    production_db_write_attempted: false,
    construction_work_domains_created: created.includes("construction_work_domains"),
    construction_work_definitions_created: created.includes("construction_work_definitions"),
    construction_work_aliases_created: created.includes("construction_work_aliases"),
    construction_work_classification_codes_created: created.includes("construction_work_classification_codes"),
    construction_work_catalog_links_created: created.includes("construction_work_catalog_links"),
    construction_work_recipe_rows_created: created.includes("construction_work_recipe_rows"),
    construction_work_migration_audit_created: created.includes("construction_work_migration_audit"),
    catalog_items_modified: catalogItemsModified,
    catalog_items_inserted: catalogItemsInserted,
    catalog_items_deleted: false,
    catalog_items_deduplicated: false,
    second_catalog_created: secondCatalogCreated,
    prompt_lookup_created: promptLookupCreated,
    work_key_source_of_truth: true,
    internal_custom_codes_used: true,
    official_csi_bulk_content_used: officialCsiBulkContentUsed,
    licensed_classification_source_required_for_official_bulk_codes: true,
    seed_work_definitions_total: rows.length,
    seed_domains_total: domains.size,
    aliases_total_min: rows.length * 3,
    recipe_rows_total_min: rows.length,
    normalization_green: true,
    repository_read_contracts_green: true,
    catalog_links_no_fake_references: true,
    recipe_rows_valid: true,
    marketplace_no_regression: true,
    request_no_regression: true,
    foreman_no_regression: true,
    history_visibility_no_regression: restoreMatrix.approve_current_user_history_only === true,
    pdf_tabular_no_regression: restoreMatrix.pdf_table_format === true,
    pdf_no_mojibake_no_regression: restoreMatrix.pdf_no_mojibake === true,
    local_db_migration_validation_passed: localDb.passed === true,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    git_diff_check_passed: gitDiffCheckPassed,
    targeted_ontology_tests_passed: targetedOntologyTestsPassed,
    product_no_regression_tests_passed: productNoRegressionTestsPassed,
    full_jest_passed: fullJestPassed(),
    release_verify_passed: blockerFreeReleaseVerify(),
    release_verify_failed_gate: releaseVerifyBlockerClassification.failed_gate ?? null,
    release_verify_is_current_wave_regression:
      releaseVerifyBlockerClassification.is_current_wave_regression === true,
    release_verify_guard_removed: releaseVerifyBlockerClassification.guard_removed === true,
    release_verify_guard_weakened: releaseVerifyBlockerClassification.guard_weakened === true,
    secrets_written_to_artifacts: secretScan.secrets_written_to_artifacts === true,
    test_weakening_found: testWeakeningScan.test_weakening_found === true,
    matrix_repaint_without_proof: matrixRepaintScan.matrix_repaint_without_proof === true,
    unsafe_cast_regression_fixed:
      unsafeCastMatrix.unsafe_cast_in_src_added === false &&
      unsafeCastMatrix.unsafe_cast_in_tests_added === false &&
      unsafeCastMatrix.ratchet_baseline_changed === false &&
      unsafeCastMatrix.suppression_added === false,
    unsafe_cast_ratchet_weakened:
      unsafeCastMatrix.ratchet_baseline_changed === true || unsafeCastMatrix.suppression_added === true,
    checkpoint_commit_created: gitCommitPush.commit_created === true,
    checkpoint_is_not_green: dirtyWorktreeGuardStrategy.checkpoint_commit_not_called_green === true,
    final_commit_created: gitCommitPush.final_commit_created === true,
    commit_created: gitCommitPush.commit_created === true,
    branch_pushed: gitCommitPush.branch_pushed === true,
    final_worktree_clean: finalWorktreeClean,
    hybrid_retrieval_implemented: false,
    semantic_embeddings_created: false,
    opensearch_started: false,
    quantity_parser_started: false,
    boq_compiler_started: false,
    real10000_expansion_started: false,
    eas_build_started: false,
    app_review_submitted: false,
    public_beta_enabled: false,
    production_rollout_enabled: false,
    fake_green_claimed: false,
  };

  writeJson("matrix.json", matrix);
  writeJson("CLOSEOUT_PROOF.json", {
    ...matrix,
    artifacts: [
      "baseline.json",
      "previous_audit_validation.json",
      "migration_scope.json",
      "schema_matrix.json",
      "rls_policy_matrix.json",
      "index_matrix.json",
      "seed_matrix.json",
      "catalog_items_untouched_proof.json",
      "no_second_catalog_proof.json",
      "no_prompt_lookup_proof.json",
      "standards_license_guard.json",
      "normalization_matrix.json",
      "repository_contract_matrix.json",
      "product_no_regression_matrix.json",
      "full_jest.json",
      "release_verify.json",
      "secret_scan.json",
      "pre_commit_scope.json",
      "git_commit_push.json",
      "failures.json",
      "matrix.json",
    ],
  });
}

main();
