import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("generic exact physical norm forward-only successor", () => {
  const source = readFileSync(
    resolve("scripts/estimate/prepareExactPhysicalNormSuccessor.ts"),
    "utf8",
  );

  test("uses the existing canonical compiler and physical applicability owner", () => {
    expect(source).toContain("compileCanonicalEstimateCore");
    expect(source).toContain("compileFormulaGraph");
    expect(source).toContain("resolveProfessionalPhysicalNormParameterValuesV1");
    expect(source).toContain("professionalPhysicalNormBindingV1");
  });

  test("replaces the misleading generic formwork identity without its rejected factor", () => {
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_formwork_form_standard");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_formwork_form_high_load");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_formwork_form_large_area");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_formwork_form_repair");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_formwork_form_small_area");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_formwork_form_technical_room");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_formwork_form_wet_zone");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_strip_foundation_form_standard");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_strip_foundation_form_high_load");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_strip_foundation_form_large_area");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_strip_foundation_form_repair");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_strip_foundation_form_small_area");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_strip_foundation_form_technical_room");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_strip_foundation_form_wet_zone");
    expect(source).toContain("STRIP_FOUNDATION_FORMWORK_PROFILE_TARGETS");
    expect(source).toContain('element_type: "STRIP_FOUNDATION"');
    expect(source).toContain('single_or_double_sided_scope: "DOUBLE_SIDED"');
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_slab_foundation_form_standard");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_slab_foundation_form_high_load");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_slab_foundation_form_large_area");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_slab_foundation_form_repair");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_slab_foundation_form_small_area");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_slab_foundation_form_technical_room");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_slab_foundation_form_wet_zone");
    expect(source).toContain("SLAB_FOUNDATION_FORMWORK_PROFILE_TARGETS");
    expect(source).toContain('element_type: "SLAB_FOUNDATION"');
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_pile_cap_form_standard");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_pile_cap_form_high_load");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_pile_cap_form_large_area");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_pile_cap_form_repair");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_pile_cap_form_small_area");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_pile_cap_form_technical_room");
    expect(source).toContain("canonical-work:base:concrete_foundation_interior_pile_cap_form_wet_zone");
    expect(source).toContain("PILE_CAP_FORMWORK_PROFILE_TARGETS");
    expect(source).toContain('element_type: "PILE_CAP"');
    expect(source).toContain("round_to(measured_formwork_contact_area_m2 * 1, 4)");
    expect(source).toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(source).toContain("STOP_EXACT_NORM_FORBIDDEN_SOURCE_RETAINED");
    expect(source).toContain("STOP_EXACT_NORM_SOURCE_SNAPSHOT_SHA256_INVALID");
    expect(source).toContain("const baselineNormativeSources = Object.fromEntries");
    expect(source).toContain('capability: "PRICE_AND_PROCUREMENT"');
    expect(source).toContain('contract: "real-professional-estimates-r3.content-passport.v1"');
    expect(source).toContain("normative_classifiers=$10::text[],applicability_tags=$11::text[]");
    expect(source).toContain("active_forbidden_source_rows");
    expect(source).toContain("normalized_search_terms=$16::text[],normalized_search_blob=$17");
    expect(source).toContain("function exactSearchTerms");
  });

  test("creates a normalized binding and cannot activate or release", () => {
    expect(source).toContain("estimate_work_normative_binding");
    expect(source).toContain("PREPARED_NOT_ACTIVE");
    expect(source).toContain("activationAllowed: false");
    expect(source).toContain("releasePerformed: false");
    expect(source).not.toMatch(/estimate_activate_definition_release|status='active'|status\s*=\s*'active'/u);
  });

  test("publishes measurement truth without presenting one row as a complete formwork estimate", () => {
    expect(source).toContain('estimateLevel: "PRELIMINARY_QUANTITY_BOQ"');
    expect(source).toContain('scopeMode: "MEASUREMENT_ONLY"');
    expect(source).toContain("MEASUREMENT_ONLY_FULL_WORK_INCOMPLETE");
    expect(source).toContain("FORMWORK_FULL_SCOPE_SOURCE_SET_PARAMETER_ID");
    expect(source).toContain("FORMWORK_FULL_SCOPE_GAP_ROW_ID");
    expect(source).toContain('preliminary_compilation_allowed:');
    expect(source).toContain('capability: "WORK_SCOPE_COMPLETENESS", status: "STOP_MEASUREMENT_ONLY"');
    expect(source).toContain('rowType: "service"');
    expect(source).toContain("не полный состав работ");
    expect(source).not.toContain('rowTitleRu: "Монтаж и демонтаж опалубки по измеренной площади контакта"');
  });

  test("fails before mutation when the canonical database schema drifts", () => {
    expect(source).toContain("function exactSchemaPreflight");
    expect(source).toContain("STOP_EXACT_NORM_SCHEMA_PREFLIGHT");
    expect(source).toContain("STOP_EXACT_NORM_ROW_TYPE_PREFLIGHT");
    expect(source).toContain('["estimate_formula_graph", "input_parameter_ids", "ARRAY", "_text"]');
    expect(source).toContain('["estimate_approved_template_baseline", "normative_source_ids", "jsonb", "jsonb"]');
    expect(source).toContain('["estimate_content_passport_r3", "capability_matrix", "jsonb", "jsonb"]');
    expect(source).toContain('["estimate_search_document", "aliases", "ARRAY", "_text"]');
    expect(source).toContain("const schemaPreflight = await exactSchemaPreflight(client)");
  });
});
