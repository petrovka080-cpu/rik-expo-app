import { classifyEstimateTemplateProfessionalReadiness } from "../../scripts/estimate/classifyEstimateTemplateProfessionalReadiness";
import { getTruthAuditManifest } from "./estimateTruthAuditTestHelpers";

describe("template professional readiness classification", () => {
  it("exposes required truth-audit policies for a representative template", () => {
    const manifest = getTruthAuditManifest();
    const representative = manifest.templates[0];
    const classified = classifyEstimateTemplateProfessionalReadiness(representative);

    expect(classified.readiness_status).toBe("NOT_READY_MISSING_NORM_SOURCE");
    expect(classified.work_family_id).toBeTruthy();
    expect(classified.calculator_family_id).toBeTruthy();
    expect(classified.parameter_schema_id).toBeTruthy();
    expect(classified.formula_status).toBe("PRESENT");
    expect(classified.material_recipe_status).toBe("PRESENT");
    expect(classified.labor_recipe_status).toBe("PRESENT");
    expect(classified.norm_source_type).toBe("partial_versioned_professional_norm_pack");
    expect(classified.unit_policy_id).toBeTruthy();
    expect(classified.ui_renderer_policy_id).toBeTruthy();
    expect(classified.pdf_policy_id).toBeTruthy();
    expect(classified.buyer_handoff_policy_id).toBeTruthy();
    expect(classified.professional_acceptance_blockers).toEqual(["not_every_row_has_source_backed_norm"]);
  });
});
