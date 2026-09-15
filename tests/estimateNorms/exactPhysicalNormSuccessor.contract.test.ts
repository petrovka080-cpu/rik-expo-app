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
    expect(source).toContain("round_to(measured_formwork_contact_area_m2 * 1, 4)");
    expect(source).toContain("src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1");
    expect(source).toContain("STOP_EXACT_NORM_FORBIDDEN_SOURCE_RETAINED");
    expect(source).toContain("STOP_EXACT_NORM_SOURCE_SNAPSHOT_SHA256_INVALID");
  });

  test("creates a normalized binding and cannot activate or release", () => {
    expect(source).toContain("estimate_work_normative_binding");
    expect(source).toContain("PREPARED_NOT_ACTIVE");
    expect(source).toContain("activationAllowed: false");
    expect(source).toContain("releasePerformed: false");
    expect(source).not.toMatch(/estimate_activate_definition_release|status='active'|status\s*=\s*'active'/u);
  });
});
