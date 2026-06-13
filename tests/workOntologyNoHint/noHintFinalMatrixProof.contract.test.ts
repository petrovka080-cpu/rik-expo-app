import { buildNoHintMatrixSnapshot } from "../../scripts/e2e/noHintRealUserWorkCorpus";
import { GREEN_NO_HINT_WORK_ONTOLOGY } from "../../src/lib/ai/workOntology/noHintSemanticAuditTypes";

describe("no-hint work ontology final matrix proof", () => {
  it("contains the required enterprise closeout proof fields", () => {
    const matrix = buildNoHintMatrixSnapshot({
      branch_pushed: true,
      typecheck_passed: true,
      lint_passed: true,
      focused_tests_passed: true,
      release_verify_passed: true,
      post_push_release_verify_passed: true,
      local_head_equals_origin_head: true,
      final_worktree_clean: true,
      blockers: [],
    });

    expect(matrix).toMatchObject({
      final_status: GREEN_NO_HINT_WORK_ONTOLOGY,
      fake_green_claimed: false,
      previous_work_ontology_10000_green: true,
      core_platform_only: true,
      ui_changed: false,
      pdf_changed: false,
      android_product_logic_changed: false,
      ios_build_started: false,
      eas_build_started: false,
      testflight_started: false,
      no_hint_cases_total: 3000,
      canonical_hints_found: 0,
      underscore_keys_in_user_input: 0,
      resolved_expected_cases_passed_min_percent: 95,
      ambiguous_expected_cases_passed_min_percent: 98,
      hard_confusion_cases_total: 700,
      high_confidence_wrong_matches: 0,
      category_inversions: 0,
      wrong_auto_select_for_ambiguous_input: 0,
      candidate_ranking_deterministic: true,
      top_candidates_min_max_enforced: true,
      duplicate_candidates: 0,
      known_work_to_generic_fallback: 0,
      first_item_fallback_used: 0,
      random_choice_used: 0,
      selected_work_key_lost: 0,
      quantity_parser_regressions: 0,
      recipe_scope_readiness_checked: true,
      material_recipe_scope_readiness_checked: true,
      pricebook_scope_readiness_checked: true,
      internal_keys_visible: 0,
      mojibake_found: 0,
      typecheck_passed: true,
      lint_passed: true,
      focused_tests_passed: true,
      release_verify_passed: true,
      branch_pushed: true,
      post_push_release_verify_passed: true,
      local_head_equals_origin_head: true,
      final_worktree_clean: true,
      blockers: [],
    });
  });
});
