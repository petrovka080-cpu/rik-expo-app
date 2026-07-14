import fs from "node:fs";
import path from "node:path";

import {
  buildProfessionalEstimateSnapshot,
  detectCrossDomainRowLeaks,
  resolveProfessionalWorkTemplate,
} from "../../src/lib/ai/professionalEstimateTemplates";
import { resolveConstructionWorkOntologyIntent } from "../../src/lib/ai/workOntology/constructionWorkOntologyMatcher";
import { rankNoHintWorkOntologyCandidates } from "../../src/lib/ai/workOntology/workOntologyCandidateRanker";
import {
  currentHeadAtWriteTime,
  gitOutput,
  runCommandForProfessionalEstimate,
  runProfessionalEstimateCarpetGoldenAudit,
  runProfessionalEstimateCrossDomainLeakAudit,
  runProfessionalEstimateExpandedPdfAudit,
  sourceCodeHead,
} from "./professionalEstimate1500WorkCases";

const WAVE = "S_P0_OPERATION_OBJECT_MATCHING_AND_CROSS_DOMAIN_ESTIMATE_ISOLATION";
const GREEN = "GREEN_P0_OPERATION_OBJECT_MATCHING_AND_CROSS_DOMAIN_ESTIMATE_ISOLATION_READY";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", WAVE);

type WaveJson = Record<string, unknown>;

type SemanticCase = {
  id: string;
  input: string;
  expectedWorkKey?: string;
  expectedCategory?: string;
  allowUnresolved?: boolean;
  forbiddenCategory?: string;
};

function withLineage<T extends WaveJson>(value: T): T & {
  wave: string;
  source_code_head: string;
  current_head_at_write_time: string;
  fake_green_claimed: false;
} {
  return {
    wave: WAVE,
    ...value,
    source_code_head: sourceCodeHead(),
    current_head_at_write_time: currentHeadAtWriteTime(),
    fake_green_claimed: false,
  };
}

function writeJson(name: string, value: WaveJson): WaveJson {
  const payload = withLineage(value);
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

function passedCommand(result: WaveJson): boolean {
  return result.exit_code === 0 && result.timed_out !== true;
}

function buildSemanticMatrix(): WaveJson {
  const cases: SemanticCase[] = [
    {
      id: "carpet_ukladka_object_dominates",
      input: "укладка ковролина 100 м2",
      expectedWorkKey: "carpet_laying",
      expectedCategory: "flooring",
      forbiddenCategory: "masonry",
    },
    {
      id: "carpet_ukladka_no_quantity",
      input: "укладка ковролина",
      expectedWorkKey: "carpet_laying",
      expectedCategory: "flooring",
      forbiddenCategory: "masonry",
    },
    {
      id: "plain_ukladka_does_not_imply_masonry",
      input: "укладка 100 м2",
      allowUnresolved: true,
      forbiddenCategory: "masonry",
    },
    {
      id: "brick_kladka_requires_masonry_object",
      input: "кладка кирпича 40 м2",
      expectedWorkKey: "brick_masonry",
      expectedCategory: "masonry",
    },
    {
      id: "brick_ukladka_allowed_by_object",
      input: "укладка кирпича 40 м2",
      expectedWorkKey: "brick_masonry",
      expectedCategory: "masonry",
    },
    {
      id: "aerated_block_ukladka_allowed_by_object",
      input: "укладка газоблока 60 м2",
      expectedWorkKey: "aerated_block_masonry",
      expectedCategory: "masonry",
    },
  ];

  const evaluations = cases.map((item) => {
    const intent = resolveConstructionWorkOntologyIntent(item.input);
    const noHint = rankNoHintWorkOntologyCandidates(item.input, 8);
    const forbiddenIntentCandidates = item.forbiddenCategory
      ? intent.candidates.filter((candidate) => candidate.category === item.forbiddenCategory)
      : [];
    const forbiddenNoHintCandidates = item.forbiddenCategory
      ? noHint.filter((candidate) => candidate.category === item.forbiddenCategory)
      : [];
    const resolvedOk = item.allowUnresolved || intent.ambiguity_status === "RESOLVED";
    const workKeyOk = item.expectedWorkKey === undefined || intent.selected_work_key === item.expectedWorkKey;
    const categoryOk = item.expectedCategory === undefined || intent.category === item.expectedCategory;
    const noHintTopOk = item.expectedWorkKey === undefined || noHint[0]?.canonical_work_key === item.expectedWorkKey;
    const passed = resolvedOk && workKeyOk && categoryOk && noHintTopOk &&
      forbiddenIntentCandidates.length === 0 &&
      forbiddenNoHintCandidates.length === 0;

    return {
      id: item.id,
      input: item.input,
      selected_work_key: intent.selected_work_key,
      category: intent.category,
      ambiguity_status: intent.ambiguity_status,
      no_hint_top_work_key: noHint[0]?.canonical_work_key ?? null,
      no_hint_top_category: noHint[0]?.category ?? null,
      forbidden_intent_candidates: forbiddenIntentCandidates.map((candidate) => candidate.canonical_work_key),
      forbidden_no_hint_candidates: forbiddenNoHintCandidates.map((candidate) => candidate.canonical_work_key),
      passed,
    };
  });

  const failed = evaluations.filter((item) => item.passed !== true);
  return writeJson("ukladka_semantic_matrix.json", {
    final_status: failed.length === 0 ? "GREEN_OPERATION_OBJECT_MATCHING_READY" : "BLOCKED_OPERATION_OBJECT_MATCHING",
    cases_total: evaluations.length,
    cases_passed: evaluations.length - failed.length,
    cases_failed: failed.length,
    substring_kladka_inside_ukladka_blocked: failed.length === 0,
    operation_object_gate_enabled: true,
    canonical_duplicate_preference_for_carpet: true,
    evaluations,
    failures: failed,
  });
}

function recipeRowsForCarpet() {
  const template = resolveProfessionalWorkTemplate("carpet_laying");
  if (!template) throw new Error("CARPET_TEMPLATE_MISSING");
  return [
    ...template.material_recipe_rows,
    ...template.labor_rows,
    ...template.equipment_rows,
    ...template.delivery_rows,
    ...template.overhead_rows,
  ];
}

function buildCarpetProvenance() {
  const rows = recipeRowsForCarpet();
  const snapshot = buildProfessionalEstimateSnapshot({
    selected_work_key: "carpet_laying",
    quantity: 100,
    unit: "m2",
    region: "KG_BISHKEK",
  });
  const rowKeyText = rows.map((row) => `${row.row_key} ${row.material_key ?? ""} ${row.visible_name_ru}`).join("\n");
  const forbiddenRecipeRows = rows.filter((row) => /brick|masonry|concrete|rebar|foundation/i.test(`${row.row_key} ${row.material_key ?? ""}`));
  const leaks = detectCrossDomainRowLeaks({
    selected_work_key: "carpet_laying",
    expected_domain: "flooring",
    rows,
  });

  return {
    recipe_rows_total: rows.length,
    recipe_rows_allowed_for_carpet: rows.filter((row) => row.allowed_work_keys.includes("carpet_laying")).length,
    recipe_rows_with_source_policy: rows.filter((row) => row.source_policy === "work_specific_template").length,
    recipe_wrong_domain_rows: rows.filter((row) => row.row_domain !== "flooring").length,
    recipe_forbidden_key_rows: forbiddenRecipeRows.length,
    snapshot_rows_total: snapshot.lines.length,
    snapshot_wrong_domain_rows: snapshot.lines.filter((line) => line.row_domain !== "flooring").length,
    snapshot_cross_domain_leaks: leaks.length,
    row_key_text_has_forbidden_terms: /brick|masonry|concrete|rebar|foundation/i.test(rowKeyText),
    passed: rows.length > 0 &&
      rows.every((row) => row.allowed_work_keys.includes("carpet_laying")) &&
      rows.every((row) => row.source_policy === "work_specific_template") &&
      rows.every((row) => row.row_domain === "flooring") &&
      forbiddenRecipeRows.length === 0 &&
      snapshot.lines.every((line) => line.row_domain === "flooring") &&
      leaks.length === 0,
  };
}

function buildCarpetGolden(): WaveJson {
  const base = runProfessionalEstimateCarpetGoldenAudit({ writeArtifacts: false });
  const provenance = buildCarpetProvenance();
  return writeJson("carpet_golden_results.json", {
    ...base,
    final_status: base.carpet_cases_passed === true && provenance.passed === true
      ? "GREEN_CARPET_GOLDEN_NO_MASONRY_READY"
      : "BLOCKED_CARPET_GOLDEN_NO_MASONRY",
    operation_object_selected_work_key: "carpet_laying",
    row_provenance: provenance,
  });
}

function buildCrossDomainLeakScan(): WaveJson {
  const base = runProfessionalEstimateCrossDomainLeakAudit({ writeArtifacts: false });
  const provenance = buildCarpetProvenance();
  return writeJson("cross_domain_leak_scan.json", {
    ...base,
    final_status: base.cross_domain_row_leaks === 0 && provenance.passed === true
      ? "GREEN_CROSS_DOMAIN_ESTIMATE_ISOLATION_READY"
      : "BLOCKED_CROSS_DOMAIN_ESTIMATE_ISOLATION",
    carpet_recipe_provenance_checked: true,
    row_provenance: provenance,
  });
}

function buildExpandedPdfSignatureResults(): WaveJson {
  const base = runProfessionalEstimateExpandedPdfAudit({ writeArtifacts: false });
  return writeJson("pdf_expanded_signature_results.json", {
    ...base,
    final_status: base.full_names_appendix_removed === true &&
      base.signature_blocks_present === true &&
      base.customer_signature_block_present === true &&
      base.contractor_signature_block_present === true
      ? "GREEN_EXPANDED_PDF_SIGNATURE_READY"
      : "BLOCKED_EXPANDED_PDF_SIGNATURE",
  });
}

function buildMatrix(input: {
  semantic: WaveJson;
  carpet: WaveJson;
  crossDomain: WaveJson;
  pdf: WaveJson;
  typecheck: WaveJson;
  lint: WaveJson;
  focused: WaveJson;
}): WaveJson {
  const blockers: string[] = [];
  if (input.semantic.final_status !== "GREEN_OPERATION_OBJECT_MATCHING_READY") blockers.push("SEMANTIC_MATRIX_FAILED");
  if (input.carpet.final_status !== "GREEN_CARPET_GOLDEN_NO_MASONRY_READY") blockers.push("CARPET_GOLDEN_FAILED");
  if (input.crossDomain.final_status !== "GREEN_CROSS_DOMAIN_ESTIMATE_ISOLATION_READY") blockers.push("CROSS_DOMAIN_LEAK_SCAN_FAILED");
  if (input.pdf.final_status !== "GREEN_EXPANDED_PDF_SIGNATURE_READY") blockers.push("EXPANDED_PDF_SIGNATURE_FAILED");
  if (!passedCommand(input.typecheck)) blockers.push("TYPECHECK_FAILED");
  if (!passedCommand(input.lint)) blockers.push("LINT_FAILED");
  if (!passedCommand(input.focused)) blockers.push("FOCUSED_TESTS_FAILED");

  return writeJson("matrix.json", {
    final_status: blockers.length === 0 ? GREEN : "BLOCKED_P0_OPERATION_OBJECT_MATCHING_AND_CROSS_DOMAIN_ESTIMATE_ISOLATION",
    operation_object_matching_ready: input.semantic.final_status === "GREEN_OPERATION_OBJECT_MATCHING_READY",
    carpet_golden_ready: input.carpet.final_status === "GREEN_CARPET_GOLDEN_NO_MASONRY_READY",
    cross_domain_isolation_ready: input.crossDomain.final_status === "GREEN_CROSS_DOMAIN_ESTIMATE_ISOLATION_READY",
    expanded_pdf_signature_ready: input.pdf.final_status === "GREEN_EXPANDED_PDF_SIGNATURE_READY",
    typecheck_passed: passedCommand(input.typecheck),
    lint_passed: passedCommand(input.lint),
    focused_tests_passed: passedCommand(input.focused),
    production_db_write_attempted: false,
    ios_build_started: false,
    eas_build_started: false,
    testflight_started: false,
    blockers,
  });
}

function main(): void {
  const headBefore = gitOutput(["rev-parse", "HEAD"], "unknown");
  const originBefore = gitOutput(["rev-parse", "@{u}"], "unknown");
  const statusBefore = gitOutput(["status", "--short", "--branch", "--untracked-files=all"], "");
  const semantic = buildSemanticMatrix();
  const carpet = buildCarpetGolden();
  const crossDomain = buildCrossDomainLeakScan();
  const pdf = buildExpandedPdfSignatureResults();
  const typecheck = runCommandForProfessionalEstimate("npm", ["run", "verify:typecheck"], 20 * 60_000);
  const lint = runCommandForProfessionalEstimate("npm", ["run", "lint"], 20 * 60_000);
  const focused = runCommandForProfessionalEstimate("npm", [
    "test",
    "--",
    "--runInBand",
    "tests/workOntology/workOntology.operationObjectDisambiguation.contract.test.ts",
    "tests/professionalEstimateTemplates/operationObjectCarpetIsolation.contract.test.ts",
    "tests/professionalEstimateTemplates/carpetGoldenEstimate.contract.test.ts",
    "tests/professionalEstimateTemplates/crossDomainRowLeakDetector.contract.test.ts",
    "tests/professionalEstimateTemplates/expandedPdfSignatureBlocks.contract.test.ts",
  ], 20 * 60_000);

  const matrix = buildMatrix({ semantic, carpet, crossDomain, pdf, typecheck, lint, focused });
  const proof = writeJson("CLOSEOUT_PROOF.json", {
    ...matrix,
    source_code_head: sourceCodeHead(),
    head_before_closeout: headBefore,
    origin_before_closeout: originBefore,
    status_before_closeout: statusBefore,
    typecheck,
    lint,
    focused_tests: focused,
    typecheck_passed: passedCommand(typecheck),
    lint_passed: passedCommand(lint),
    focused_tests_passed: passedCommand(focused),
    final_worktree_clean: gitOutput(["status", "--short", "--untracked-files=all"], "").trim().length === 0,
    local_head_equals_origin_head: headBefore === originBefore,
    branch_pushed: headBefore === originBefore,
    post_push_release_verify_passed: false,
  });

  console.log(JSON.stringify(proof, null, 2));
}

main();
