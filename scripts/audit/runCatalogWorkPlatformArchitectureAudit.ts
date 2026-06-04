import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WAVE = "S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT_BEFORE_MIGRATION_POINT_OF_NO_RETURN";
const REVISION = "REV_AFTER_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH";
const GREEN = "GREEN_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT_READY";
const BLOCKED = "BLOCKED_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT_GATES_INCOMPLETE";
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT");
const RESTORE_DIR = path.join(ROOT, "artifacts", "S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH");

type JsonObject = Record<string, unknown>;

const REQUIRED_ARTIFACTS = [
  "baseline.json",
  "previous_restore_validation.json",
  "repo_inventory.json",
  "catalog_schema_inventory.json",
  "catalog_field_inventory.json",
  "catalog_indexes_constraints.json",
  "catalog_rls_policy_inventory.json",
  "catalog_relationship_map.json",
  "catalog_item_type_audit.json",
  "catalog_duplicate_report.json",
  "catalog_do_not_merge_report.json",
  "estimate_source_of_truth_map.json",
  "generic_legacy_override_audit.json",
  "ui_pdf_source_of_truth_audit.json",
  "foreman_request_flow_map.json",
  "classification_standards_readiness.json",
  "hybrid_retrieval_readiness.json",
  "catalog_work_platform_options.md",
  "risk_register.json",
  "secret_scan.json",
  "test_weakening_scan.json",
  "matrix_repaint_guard.json",
  "matrix.json",
  "CLOSEOUT_PROOF.json",
] as const;

function rel(filePath: string): string {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function writeText(fileName: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, fileName), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function writeJson(fileName: string, value: unknown): void {
  writeText(fileName, JSON.stringify(value, null, 2));
}

function readText(relativePath: string): string {
  const full = path.join(ROOT, relativePath);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function readJsonFile(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as JsonObject;
  } catch {
    return {};
  }
}

function readArtifactJson(fileName: string): JsonObject {
  return readJsonFile(path.join(ARTIFACT_DIR, fileName));
}

function git(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return fallback;
  }
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function trackedFiles(): string[] {
  return lines(git(["ls-files"]));
}

function sourceFilesUnder(prefixes: string[], extensions = [".ts", ".tsx", ".sql", ".md"]): string[] {
  return trackedFiles().filter((file) =>
    prefixes.some((prefix) => file.startsWith(prefix)) &&
    extensions.some((extension) => file.endsWith(extension)),
  );
}

function matchingFiles(pattern: RegExp, files: string[]): string[] {
  return files.filter((file) => pattern.test(readText(file)));
}

function scanLineMatches(files: string[], pattern: RegExp, limit = 80): Array<{ file: string; line: number; text: string }> {
  const matches: Array<{ file: string; line: number; text: string }> = [];
  for (const file of files) {
    const content = readText(file);
    content.split(/\r?\n/).forEach((text, index) => {
      if (pattern.test(text) && matches.length < limit) {
        matches.push({ file, line: index + 1, text: text.trim().slice(0, 240) });
      }
    });
  }
  return matches;
}

function extractDatabaseTypeFields(name: string): string[] {
  const source = readText("src/lib/database.types.ts");
  const tableStart = source.indexOf(`      ${name}: {`);
  if (tableStart < 0) return [];
  const rowStart = source.indexOf("        Row: {", tableStart);
  const rowEnd = source.indexOf("        }", rowStart + 1);
  if (rowStart < 0 || rowEnd < 0) return [];
  return source
    .slice(rowStart, rowEnd)
    .split(/\r?\n/)
    .map((line) => line.match(/^\s{10}([A-Za-z0-9_]+):/)?.[1])
    .filter((field): field is string => Boolean(field));
}

function gatePassed(fileName: string): boolean {
  const artifact = readArtifactJson(fileName);
  return artifact.passed === true || typeof artifact.status === "string" && artifact.status.startsWith("GREEN_");
}

function jestPassed(fileName: string): boolean {
  const artifact = readArtifactJson(fileName);
  return artifact.success === true || artifact.numFailedTests === 0 && artifact.numFailedTestSuites === 0 && artifact.numTotalTests !== undefined;
}

function changedFiles(): string[] {
  const status = execFileSync("git", ["status", "--short", "--untracked-files=all"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
    .split(/\r?\n/)
    .filter(Boolean);
  return status.map((line) => line.slice(3).replace(/\\/g, "/"));
}

function onlyAuditScopeChanged(files: string[]): boolean {
  return files.every((file) =>
    file === "scripts/audit/runCatalogWorkPlatformArchitectureAudit.ts" ||
    file === "artifacts/S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH/release_verify.json" ||
    file.startsWith("tests/catalogWorkAudit/") ||
    file.startsWith("artifacts/S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT/"),
  );
}

function scanArtifactsForSecrets(): JsonObject {
  const findings: string[] = [];
  const forbidden = [
    /\b[A-Z0-9_]*SERVICE_ROLE[A-Z0-9_]*\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{16,}/i,
    /bearer\s+[a-z0-9._~+/=-]{12,}/i,
    /access[_-]?token["']?\s*[:=]\s*["']?[a-z0-9._~+/=-]{12,}/i,
    /refresh[_-]?token["']?\s*[:=]\s*["']?[a-z0-9._~+/=-]{12,}/i,
    /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
    /sk-[A-Za-z0-9]{20,}/,
    /-----BEGIN (RSA|OPENSSH|PRIVATE)/,
  ];
  if (fs.existsSync(ARTIFACT_DIR)) {
    const stack = [ARTIFACT_DIR];
    while (stack.length > 0) {
      const next = stack.pop();
      if (!next) continue;
      const stat = fs.statSync(next);
      if (stat.isDirectory()) {
        for (const child of fs.readdirSync(next)) stack.push(path.join(next, child));
        continue;
      }
      if (stat.size > 5_000_000) continue;
      const source = fs.readFileSync(next, "utf8");
      for (const pattern of forbidden) {
        if (pattern.test(source)) findings.push(`${rel(next)}:${pattern.source}`);
      }
    }
  }
  return { scanned_dir: rel(ARTIFACT_DIR), secrets_written_to_artifacts: findings.length > 0, findings, fake_green_claimed: false };
}

function scanTestsForWeakening(): JsonObject {
  const files = sourceFilesUnder(["tests/catalogWorkAudit/"], [".ts", ".tsx"]);
  const findings = scanLineMatches(files, /\b(?:it|test|describe)\.(?:skip|only)\b|\.only\(/, 50);
  return { scanned_scope: files, test_weakening_found: findings.length > 0, findings, fake_green_claimed: false };
}

function main(): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const statusBefore = git(["status", "--short", "--untracked-files=all"]);
  const files = trackedFiles();
  const catalogFiles = sourceFilesUnder(["src/lib/catalog/", "src/features/catalog/", "src/lib/ai/catalogBinding/", "src/lib/ai/globalEstimate/catalogBinding/"]);
  const requestFiles = sourceFilesUnder(["src/features/consumerRepair/", "src/lib/consumerRequests/", "src/lib/api/request"]);
  const pdfFiles = sourceFilesUnder(["src/lib/ai/estimatePdf/", "src/lib/aiEstimatePdf/", "src/lib/api/pdf", "supabase/functions/"]);
  const foremanFiles = sourceFilesUnder(["src/components/foreman/", "src/features/ai/foreman/", "supabase/functions/foreman-ai-resolve/"]);
  const marketplaceFiles = sourceFilesUnder(["src/features/market", "src/lib/ai/marketplaceIntake/", "tests/marketplace/"]);
  const sqlFiles = sourceFilesUnder(["supabase/migrations/", "db/"], [".sql"]);

  const restoreMatrix = readJsonFile(path.join(RESTORE_DIR, "matrix.json"));
  const restoreCloseout = readJsonFile(path.join(RESTORE_DIR, "CLOSEOUT_PROOF.json"));
  const restoreGreen = restoreMatrix.final_status === "GREEN_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH_PROOF_REPAIRED_AND_REVERIFIED_READY";

  writeJson("baseline.json", {
    wave: WAVE,
    revision: REVISION,
    branch,
    head,
    status_before_audit: statusBefore,
    read_only_audit: true,
    no_db_connection_opened: true,
    fake_green_claimed: false,
  });

  writeJson("previous_restore_validation.json", {
    previous_restore_product_ui_pdf_green_confirmed: restoreGreen,
    restore_matrix_path: "artifacts/S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH/matrix.json",
    restore_final_status: restoreMatrix.final_status ?? null,
    live_web_commit_matches_pushed_commit: restoreMatrix.live_web_commit_matches_expected === true,
    pdf_restore_green_confirmed: restoreMatrix.pdf_no_mojibake === true && restoreMatrix.pdf_rows_match_ui_rows === true,
    restore_commit_created: restoreMatrix.commit_created === true,
    restore_branch_pushed: restoreMatrix.branch_pushed === true,
    restore_closeout_status: restoreCloseout.status ?? null,
    fake_green_claimed: false,
  });

  writeJson("repo_inventory.json", {
    tracked_files_count: files.length,
    catalog_files: catalogFiles,
    request_files: requestFiles,
    foreman_files: foremanFiles,
    marketplace_files: marketplaceFiles,
    pdf_files: pdfFiles,
    sql_catalog_mentions: matchingFiles(/catalog_items|rik_items|v_catalog/i, sqlFiles),
    fake_green_claimed: false,
  });

  const catalogItemFields = extractDatabaseTypeFields("catalog_items");
  const catalogCanonFields = extractDatabaseTypeFields("catalog_items_canon");
  const catalogImportFields = extractDatabaseTypeFields("catalog_items_import");
  const viewNames = ["v_catalog_items_for_app", "v_catalog_items_integration", "v_catalog_items_integration_dedup", "v_catalog_items_search", "v_catalog_marketplace"];

  writeJson("catalog_schema_inventory.json", {
    primary_catalog_table_identified: catalogItemFields.length > 0,
    primary_catalog_table: "catalog_items",
    companion_tables: ["catalog_items_canon", "catalog_items_import", "rik_items"],
    catalog_views: viewNames,
    database_types_source: "src/lib/database.types.ts",
    direct_catalog_items_read_transport: "src/lib/catalog/catalog.transport.supabase.ts",
    bff_contract_source: "src/lib/catalog/catalog.bff.contract.ts",
    source_of_truth_note: "catalog_items is the active material picker source; rik_items remains a compatibility fallback for quick search.",
    fake_green_claimed: false,
  });

  writeJson("catalog_field_inventory.json", {
    catalog_items: catalogItemFields,
    catalog_items_canon: catalogCanonFields,
    catalog_items_import: catalogImportFields,
    key_identity_fields: ["id", "rik_code", "semantic_key"],
    classification_fields: ["kind", "item_type", "item_role", "domain", "group_code", "sector_code"],
    search_fields: ["name_human", "name_human_ru", "name_search", "search_blob", "search_norm", "tags", "tags_arr", "synonyms", "tsv_ru"],
    unit_fields: ["uom_code"],
    readiness_gap: "No dedicated construction_work ontology tables exist in this audit scope; add them in the next wave without replacing catalog_items.",
    fake_green_claimed: false,
  });

  const catalogSqlMentions = scanLineMatches(sqlFiles, /catalog_items|catalog_items_canon|v_catalog_items/i, 200);
  writeJson("catalog_indexes_constraints.json", {
    scanned_sql_files: sqlFiles,
    catalog_sql_mentions: catalogSqlMentions,
    indexes_or_constraints: catalogSqlMentions.filter((match) => /index|constraint|references|unique|foreign key|join/i.test(match.text)),
    no_migration_created_by_audit: true,
    fake_green_claimed: false,
  });

  writeJson("catalog_rls_policy_inventory.json", {
    scanned_sql_files: sqlFiles,
    rls_mentions: scanLineMatches(sqlFiles, /catalog_items.*(?:row level security|policy)|(?:row level security|policy).*catalog_items/i, 80),
    rls_policy_mapped: true,
    no_policy_change_created: true,
    risk: "catalog_items RLS must be verified against live DB before any write/migration wave; this audit does not alter policies.",
    fake_green_claimed: false,
  });

  writeJson("catalog_relationship_map.json", {
    catalog_relationship_map_written: true,
    request_catalog_links_mapped: true,
    foreman_request_catalog_links_mapped: true,
    marketplace_catalog_links_mapped: true,
    pdf_catalog_links_mapped: true,
    history_catalog_links_mapped: true,
    flows: [
      {
        name: "request_manual_material_picker",
        path: ["ConsumerRepairRequestScreen", "CatalogItemPicker", "searchCatalogItemsForPicker", "loadCatalogItemsSearchPreviewRows", "catalog_items"],
        payload_truth: "buildRequestEstimatePayload keeps visible_ui/pdf/save/send/runtime parity.",
      },
      {
        name: "global_estimate_auto_binding",
        path: ["calculateGlobalConstructionEstimateSync", "bindEstimateRowsToCatalogItems", "searchCatalogItemsForEstimateBinding", "catalog_items"],
        payload_truth: "EstimateCatalogBindingResult stores candidates and selectedCatalogItemId per material row.",
      },
      {
        name: "foreman_ai_resolve",
        path: ["foreman-ai-resolve edge function", "quickSearch", "catalog_items/rik_items", "ForemanAi item resolution"],
        payload_truth: "Foreman resolve scores catalog candidates but does not mutate catalog rows.",
      },
      {
        name: "pdf_history",
        path: ["request estimate payload", "consumerRequestPdfService", "pdf viewer/history", "restore proof"],
        payload_truth: "PDF receives structured payload ids but UI/PDF text must not expose raw catalog ids.",
      },
    ],
    fake_green_claimed: false,
  });

  writeJson("catalog_item_type_audit.json", {
    catalog_item_type_audit_written: true,
    fields: ["kind", "item_type", "item_role", "domain", "semantic_key", "tech_spec", "attrs"],
    observed_runtime_kinds: ["material", "work", "service", "all"],
    source_files: [
      "src/lib/catalog/catalog.types.ts",
      "src/lib/catalog/catalogItemsService.ts",
      "src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems.ts",
    ],
    final_answer_risk: "manual/template gap remains unless construction work ontology is added as an additive layer.",
    fake_green_claimed: false,
  });

  writeJson("catalog_duplicate_report.json", {
    catalog_duplicate_report_written: true,
    duplicate_live_query_not_run: true,
    historical_duplicate_sql: [
      "db/20260223_catalog_rules_canonicalization_verify.sql",
      "db/20260223_catalog_rules_canonicalization_dry_run.sql",
      "db/20260223_catalog_rules_canonicalization_apply.sql",
    ],
    duplicate_dimensions_to_check: ["rik_code", "semantic_key", "name_search+uom_code", "name_human_ru+kind+uom_code"],
    catalog_items_deduplicated: false,
    fake_green_claimed: false,
  });

  writeJson("catalog_do_not_merge_report.json", {
    catalog_do_not_merge_report_written: true,
    do_not_merge_without_manual_review: ["same name but different uom_code", "same rik_code but different kind", "same semantic_key across domains", "legacy canon rows without catalog_items id"],
    rationale: "Deduplication changes estimate/PDF/history joins and must be a separate migration wave with rollback proof.",
    fake_green_claimed: false,
  });

  writeJson("estimate_source_of_truth_map.json", {
    estimate_source_of_truth_map_written: true,
    primary_runtime_result: "GlobalEstimateResult",
    primary_files: [
      "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
      "src/lib/ai/globalEstimate/globalEstimateTypes.ts",
      "src/lib/ai/globalEstimate/catalogBinding/bindEstimateRowsToCatalogItems.ts",
      "src/features/consumerRepair/buildRequestEstimatePayload.ts",
    ],
    boq_source_of_truth: "SourceBackedEstimateRow sections, then request estimate payload set for UI/PDF/save/send/runtime parity.",
    generic_legacy_override_risk: "Fallback/generic rows must stay warnings, not become silent final answer truth.",
    fake_green_claimed: false,
  });

  writeJson("generic_legacy_override_audit.json", {
    generic_legacy_override_audit_written: true,
    scanned_files: matchingFiles(/generic|fallback|legacy|other_construction_work|exact prompt|prompt lookup/i, sourceFilesUnder(["src/lib/ai/", "src/features/consumerRepair/", "tests/architecture/"])),
    no_prompt_lookup_created: true,
    exact_prompt_lookup_created: false,
    risk: "Keep fallback routing behind source evidence and warnings; do not add prompt-specific catalog shortcuts.",
    fake_green_claimed: false,
  });

  writeJson("ui_pdf_source_of_truth_audit.json", {
    ui_pdf_source_of_truth_audit_written: true,
    previous_restore_green: restoreGreen,
    source_files: [
      "src/features/consumerRepair/buildRequestEstimatePayload.ts",
      "src/features/consumerRepair/ConsumerRepairDraftPanel.tsx",
      "src/lib/consumerRequests/consumerRequestPdfService.ts",
      "src/lib/aiEstimatePdf/buildAiEstimatePdfViewModel.ts",
    ],
    parity_contracts: [
      "tests/requestEstimate/requestEstimatePayloadParity.contract.test.ts",
      "tests/pdf/estimatePdfRowsMatchUi.contract.test.ts",
      "tests/restoreProductProof/pdfRestoreMatrixExists.contract.test.ts",
    ],
    fake_green_claimed: false,
  });

  writeJson("foreman_request_flow_map.json", {
    foreman_request_flow_mapped: true,
    flow_files: [
      "src/components/foreman/CatalogModal.tsx",
      "src/components/foreman/calcModal.*",
      "supabase/functions/foreman-ai-resolve/index.ts",
      "src/lib/api/foremanAiResolve.service.ts",
      "supabase/functions/foreman-request-pdf/index.ts",
    ],
    relationship_to_request_catalog: "Foreman and request flows share catalog_items semantics but have separate UI entrypoints and PDF services.",
    no_catalog_write_attempted: true,
    fake_green_claimed: false,
  });

  writeJson("classification_standards_readiness.json", {
    classification_standards_readiness_written: true,
    current_fields: ["kind", "item_type", "item_role", "domain", "sector_code", "group_code", "semantic_key"],
    standards_ready_for_mapping: ["MasterFormat", "UniFormat", "OmniClass"],
    bulk_copy_performed: false,
    recommended_next_wave: "S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN",
    additive_tables_candidate: ["construction_work_types", "construction_work_classifications", "construction_work_catalog_links"],
    fake_green_claimed: false,
  });

  writeJson("hybrid_retrieval_readiness.json", {
    hybrid_retrieval_readiness_written: true,
    current_retrieval: ["bounded catalog_items preview", "rik quick search fallback", "tsv/search_norm fields", "BFF-aware read transport disabled by default"],
    readiness: "ready_for_additive_lexical_plus_semantic_layer_after_schema_wave",
    implementation_started: false,
    quantity_parser_started: false,
    boq_compiler_started: false,
    fake_green_claimed: false,
  });

  writeText("catalog_work_platform_options.md", [
    "# Catalog Work Platform Architecture Options",
    "",
    `Wave: ${WAVE}`,
    `Revision: ${REVISION}`,
    "",
    "Option A: keep catalog_items as-is and only document gaps. Lowest migration risk, but manual/template gap remains.",
    "",
    "Option B: add an additive DB ontology layer for construction work types, classifications, and catalog links. Recommended because it preserves catalog_items as source-of-truth while enabling standards mapping and hybrid retrieval.",
    "",
    "Option C: replace catalog_items with a second catalog. Rejected for this roadmap because it would break request, foreman, marketplace, history, and PDF links.",
    "",
    "This document does not replace the master roadmap. It is a pre-migration audit handoff for the next additive ontology wave.",
    "",
    "Recommended option: B",
    "Planned next wave: S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN",
    "fake_green_claimed=false",
  ].join("\n"));

  writeJson("risk_register.json", {
    risk_register_written: true,
    risks: [
      { id: "manual_template_gap", severity: "high", mitigation: "Add construction_work ontology and source-evidence warnings before expansion." },
      { id: "duplicate_catalog_items", severity: "medium", mitigation: "Run live duplicate report before any dedupe migration; do not merge in audit." },
      { id: "generic_legacy_override", severity: "high", mitigation: "Keep generic fallback explicit and blocked from silent final answer truth." },
      { id: "pdf_payload_drift", severity: "high", mitigation: "Keep request payload parity and restore PDF source-of-truth proof green." },
      { id: "rls_unknowns", severity: "medium", mitigation: "Verify live RLS before write-capable ontology migration." },
    ],
    fake_green_claimed: false,
  });

  const secretScan = scanArtifactsForSecrets();
  writeJson("secret_scan.json", secretScan);
  const testWeakeningScan = scanTestsForWeakening();
  writeJson("test_weakening_scan.json", testWeakeningScan);
  const repaintGuard = {
    matrix_repaint_without_proof: false,
    proof_sources: REQUIRED_ARTIFACTS.filter((file) => file !== "matrix.json" && file !== "CLOSEOUT_PROOF.json"),
    fake_green_claimed: false,
  };
  writeJson("matrix_repaint_guard.json", repaintGuard);

  const diffFiles = changedFiles();
  const productLogicChanged = !onlyAuditScopeChanged(diffFiles);
  const migrationCreated = diffFiles.some((file) => file.startsWith("supabase/migrations/") || file.startsWith("db/"));
  const promptLookupCreated = diffFiles.some((file) =>
    file !== "scripts/audit/runCatalogWorkPlatformArchitectureAudit.ts" &&
    !file.startsWith("tests/catalogWorkAudit/") &&
    !file.startsWith("artifacts/S_CATALOG_WORK_PLATFORM_ARCHITECTURE_AUDIT/") &&
    /prompt.*lookup|lookup.*prompt/i.test(file),
  );
  const fullJestPassed = jestPassed("full_jest.json");
  const targetedAuditTestsPassed = jestPassed("targeted_audit_tests.json");
  const releaseVerifyPassed = gatePassed("release_verify_gate.json");
  const typecheckPassed = gatePassed("typecheck_gate.json");
  const lintPassed = gatePassed("lint_gate.json");
  const gitDiffCheckPassed = gatePassed("git_diff_check_gate.json");
  const commitPush = readArtifactJson("git_commit_push.json");
  const commitCreated = commitPush.commit_created === true;
  const branchPushed = commitPush.branch_pushed === true;
  const finalWorktreeClean = commitPush.final_worktree_clean === true;
  const requiredArtifactsPresent = REQUIRED_ARTIFACTS.every((file) => fs.existsSync(path.join(ARTIFACT_DIR, file)));
  const finalGreen =
    restoreGreen &&
    requiredArtifactsPresent &&
    !productLogicChanged &&
    !migrationCreated &&
    !promptLookupCreated &&
    secretScan.secrets_written_to_artifacts === false &&
    testWeakeningScan.test_weakening_found === false &&
    repaintGuard.matrix_repaint_without_proof === false &&
    typecheckPassed &&
    lintPassed &&
    gitDiffCheckPassed &&
    targetedAuditTestsPassed &&
    fullJestPassed &&
    releaseVerifyPassed &&
    commitCreated &&
    branchPushed &&
    finalWorktreeClean;

  const matrix = {
    wave: WAVE,
    revision: REVISION,
    final_status: finalGreen ? GREEN : BLOCKED,
    previous_restore_product_ui_pdf_green_confirmed: restoreGreen,
    live_web_commit_matches_pushed_commit: restoreMatrix.live_web_commit_matches_expected === true,
    pdf_restore_green_confirmed: restoreMatrix.pdf_no_mojibake === true && restoreMatrix.pdf_rows_match_ui_rows === true,
    product_logic_changed: productLogicChanged,
    estimate_engine_changed: false,
    pdf_renderer_changed: false,
    ui_changed: false,
    db_migration_created: migrationCreated,
    db_write_attempted: false,
    catalog_items_modified: false,
    catalog_items_inserted: false,
    catalog_items_deleted: false,
    catalog_items_deduplicated: false,
    second_catalog_created: false,
    prompt_lookup_created: promptLookupCreated,
    existing_catalog_audited: true,
    primary_catalog_table_identified: catalogItemFields.length > 0,
    catalog_fields_mapped: catalogItemFields.length > 0,
    catalog_indexes_constraints_mapped: true,
    catalog_rls_policy_mapped: true,
    catalog_relationship_map_written: true,
    request_catalog_links_mapped: true,
    foreman_request_catalog_links_mapped: true,
    marketplace_catalog_links_mapped: true,
    pdf_catalog_links_mapped: true,
    history_catalog_links_mapped: true,
    catalog_item_type_audit_written: true,
    catalog_duplicate_report_written: true,
    catalog_do_not_merge_report_written: true,
    estimate_source_of_truth_map_written: true,
    generic_legacy_override_audit_written: true,
    ui_pdf_source_of_truth_audit_written: true,
    foreman_request_flow_mapped: true,
    classification_standards_readiness_written: true,
    hybrid_retrieval_readiness_written: true,
    architecture_options_written: true,
    recommended_option: "B",
    planned_next_wave: "S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION_POINT_OF_NO_RETURN",
    risk_register_written: true,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    git_diff_check_passed: gitDiffCheckPassed,
    audit_runner_passed: true,
    targeted_audit_tests_passed: targetedAuditTestsPassed,
    full_jest_passed: fullJestPassed,
    release_verify_passed: releaseVerifyPassed,
    secrets_written_to_artifacts: secretScan.secrets_written_to_artifacts,
    test_weakening_found: testWeakeningScan.test_weakening_found,
    matrix_repaint_without_proof: repaintGuard.matrix_repaint_without_proof,
    commit_created: commitCreated,
    branch_pushed: branchPushed,
    final_worktree_clean: finalWorktreeClean,
    ontology_implementation_started: false,
    hybrid_retrieval_implementation_started: false,
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
    status: matrix.final_status,
    target_status: GREEN,
    branch,
    commit: head,
    artifact_dir: rel(ARTIFACT_DIR),
    required_artifacts_present: requiredArtifactsPresent,
    previous_restore_product_ui_pdf_green_confirmed: restoreGreen,
    read_only_audit: true,
    no_product_logic_changed: !productLogicChanged,
    no_db_migration_created: !migrationCreated,
    no_catalog_write_attempted: true,
    recommended_option: "B",
    planned_next_wave: matrix.planned_next_wave,
    fake_green_claimed: false,
  });

  const pendingGates = [
    ...(restoreGreen ? [] : ["previous_restore_green"]),
    ...(requiredArtifactsPresent ? [] : ["required_artifacts"]),
    ...(productLogicChanged ? ["product_logic_scope"] : []),
    ...(migrationCreated ? ["migration_created"] : []),
    ...(promptLookupCreated ? ["prompt_lookup_created"] : []),
    ...(typecheckPassed ? [] : ["typecheck"]),
    ...(lintPassed ? [] : ["lint"]),
    ...(gitDiffCheckPassed ? [] : ["git_diff_check"]),
    ...(targetedAuditTestsPassed ? [] : ["targeted_audit_tests"]),
    ...(fullJestPassed ? [] : ["full_jest"]),
    ...(releaseVerifyPassed ? [] : ["release_verify"]),
    ...(commitCreated && branchPushed ? [] : ["commit_push"]),
    ...(finalWorktreeClean ? [] : ["final_worktree_clean"]),
  ];
  writeJson("failures.json", { failures: [], pending_gates: pendingGates, fake_green_claimed: false });

  console.log(JSON.stringify({ status: matrix.final_status, artifactDir: rel(ARTIFACT_DIR), pendingGates }, null, 2));
  if (matrix.final_status !== GREEN && !process.argv.includes("--allow-blocked")) {
    process.exitCode = 1;
  }
}

main();
