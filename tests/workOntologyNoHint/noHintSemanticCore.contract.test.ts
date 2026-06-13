import {
  noHintConfusionAudit,
  noHintConfusionCases,
  noHintCorpus,
  noHintRankingAudit,
  noHintSemanticAudit,
  NO_HINT_TARGET_CATEGORY_COUNTS,
  resolveNoHintWorkOntologyIntent,
  sourceText,
} from "./noHintWorkOntologyTestHelpers";
import {
  GREEN_NO_HINT_WORK_ONTOLOGY,
} from "../../src/lib/ai/workOntology/noHintSemanticAuditTypes";

describe("no-hint work ontology semantic core audit", () => {
  jest.setTimeout(240_000);

  it("builds exactly 3000 no-hint real-user cases with no canonical key hints", () => {
    const cases = noHintCorpus();
    const distributionTotal = Object.values(NO_HINT_TARGET_CATEGORY_COUNTS).reduce((sum, value) => sum + value, 0);
    const audit = noHintSemanticAudit();
    expect(distributionTotal).toBe(3000);
    expect(cases).toHaveLength(3000);
    expect(audit.summary.no_hint_cases_total).toBe(3000);
    expect(audit.summary.canonical_hints_found).toBe(0);
    expect(audit.summary.underscore_keys_in_user_input).toBe(0);
  });

  it("resolves no-hint work inputs above the production threshold", () => {
    const audit = noHintSemanticAudit();
    expect(audit.summary.resolved_expected_cases_passed_percent).toBeGreaterThanOrEqual(95);
    expect(audit.summary.high_confidence_wrong_matches).toBe(0);
  });

  it("keeps broad no-hint inputs ambiguous instead of auto-selecting", () => {
    const audit = noHintSemanticAudit();
    expect(audit.summary.ambiguous_expected_cases_total).toBeGreaterThanOrEqual(3);
    expect(audit.summary.ambiguous_expected_cases_passed_percent).toBeGreaterThanOrEqual(98);
    for (const item of audit.evaluations.filter((evaluation) => evaluation.expected_status === "AMBIGUOUS_WORK_INPUT")) {
      expect(item.actual_status).toBe("AMBIGUOUS_WORK_INPUT");
      expect(item.auto_selected).toBe(false);
      expect(item.selected_work_key).toBeNull();
    }
  });

  it("passes the 700 hard confusion set without high-confidence wrong matches", () => {
    const cases = noHintConfusionCases();
    const audit = noHintConfusionAudit();
    expect(cases).toHaveLength(700);
    expect(audit.summary.hard_confusion_cases_total).toBe(700);
    expect(audit.summary.high_confidence_wrong_matches).toBe(0);
    expect(audit.summary.category_inversions).toBe(0);
    expect(audit.summary.wrong_auto_select_for_ambiguous_input).toBe(0);
    expect(audit.summary.blockers).toEqual([]);
  });

  it("keeps candidate ranking deterministic, sorted, bounded, and visible-safe", () => {
    const audit = noHintRankingAudit();
    expect(audit.deterministic_failures).toBe(0);
    expect(audit.duplicate_candidate_lists).toBe(0);
    expect(audit.unsorted_candidate_lists).toBe(0);
    expect(audit.over_max_candidate_lists).toBe(0);
    expect(audit.internal_visible_candidates).toBe(0);
    expect(audit.mojibake_visible_candidates).toBe(0);
    expect(audit.failures).toEqual([]);
  });

  it("preserves selected_work_key, quantity, unit, and recipe/material/pricebook readiness", () => {
    const audit = noHintSemanticAudit();
    expect(audit.summary.selected_work_key_lost).toBe(0);
    expect(audit.summary.quantity_parser_regressions).toBe(0);
    expect(audit.summary.recipe_scope_missing).toBe(0);
    expect(audit.summary.material_recipe_scope_missing).toBe(0);
    expect(audit.summary.pricebook_scope_missing).toBe(0);
  });

  it("does not expose internal keys, mojibake, generic fallback, first-row fallback, or random choice", () => {
    const audit = noHintSemanticAudit();
    expect(audit.summary.internal_keys_visible).toBe(0);
    expect(audit.summary.mojibake_found).toBe(0);
    expect(audit.summary.known_work_to_generic_fallback).toBe(0);
    expect(audit.summary.first_item_fallback_used).toBe(0);
    expect(audit.summary.random_choice_used).toBe(0);
  });

  it("handles the mandatory real-user no-hint examples explicitly", () => {
    expect(resolveNoHintWorkOntologyIntent({ userInput: "\u0437\u0430\u043b\u0438\u0442\u044c \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 30 \u043a\u0443\u0431\u043e\u0432" })).toMatchObject({
      status: "RESOLVED",
      selected_work_key: "foundation_concrete",
      quantity: 30,
      unit: "m3",
    });
    expect(resolveNoHintWorkOntologyIntent({ userInput: "\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b\u044f\u0446\u0438\u044f 100 \u043c2" })).toMatchObject({
      status: "AMBIGUOUS_WORK_INPUT",
      selected_work_key: null,
      quantity: 100,
      unit: "m2",
    });
    expect(resolveNoHintWorkOntologyIntent({ userInput: "\u043f\u043b\u0438\u0442\u043a\u0430 \u0432 \u0432\u0430\u043d\u043d\u043e\u0439 28 \u043c2" })).toMatchObject({
      status: "RESOLVED",
      selected_work_key: "bathroom_tile_full",
      quantity: 28,
      unit: "m2",
    });
    expect(resolveNoHintWorkOntologyIntent({ userInput: "\u044d\u043b\u0435\u043a\u0442\u0440\u0438\u043a\u0430" })).toMatchObject({
      status: "AMBIGUOUS_WORK_INPUT",
      selected_work_key: null,
    });
  });

  it("keeps the no-hint implementation free of corpus lookup and unsafe resolver escape hatches", () => {
    const ranker = sourceText("src/lib/ai/workOntology/workOntologyCandidateRanker.ts");
    const resolver = sourceText("src/lib/ai/workOntology/workOntologyResolverContracts.ts");
    const policy = sourceText("src/lib/ai/workOntology/workOntologyAmbiguityPolicy.ts");
    const implementation = `${ranker}\n${resolver}\n${policy}`;
    expect(implementation).not.toMatch(/buildNoHintRealUserWorkCorpus|MANDATORY_CASES|CONFUSION_BASE/);
    expect(implementation).not.toMatch(/CONSTRUCTION_WORK_ONTOLOGY\s*\[\s*0\s*\]/);
    expect(implementation).not.toMatch(/Math\.random/);
    expect(implementation).not.toMatch(/Date\.now|new Date/);
    expect(implementation).not.toMatch(/other_construction_work|generic_repair|unknown_work/);
  });

  it("produces the green final semantic matrix status", () => {
    const audit = noHintSemanticAudit();
    expect(audit.final_status).toBe(GREEN_NO_HINT_WORK_ONTOLOGY);
    expect(audit.summary.blockers).toEqual([]);
  });
});
