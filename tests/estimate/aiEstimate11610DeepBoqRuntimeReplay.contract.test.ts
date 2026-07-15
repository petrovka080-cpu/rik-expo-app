import {
  calculateGlobalConstructionEstimateSync,
  validateEstimateBoqDepth,
  validateEstimateUnitSemantics,
} from "../../src/lib/ai/globalEstimate";
import {
  runAiEstimate11610DeepBoqRuntimeReplay,
  STOP_AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_34830_BLOCKED_NO_RELEASE,
} from "../../scripts/estimate/runAiEstimate11610DeepBoqRuntimeReplay";

describe("AI estimate 11610 deep BOQ runtime replay", () => {
  it("runs exact passport-backed runtime estimates without claiming full green from a limited smoke", () => {
    const result = runAiEstimate11610DeepBoqRuntimeReplay({ limit: 2 });

    expect(result.summary.selected_templates).toBe(2);
    expect(result.summary.cases_completed).toBe(6);
    expect(result.summary.cases_passed).toBe(6);
    expect(result.summary.cases_failed).toBe(0);
    expect(result.summary.limited_smoke_only).toBe(true);
    expect(result.summary.full_34830_runtime_replay_passed).toBe(false);
    expect(result.summary.web_android_pdf_proven_in_this_script).toBe(false);
    expect(result.summary.final_status).toBe(STOP_AI_ESTIMATE_11610_DEEP_BOQ_RUNTIME_34830_BLOCKED_NO_RELEASE);
  });

  it("validates exact strip-foundation passport rows without requiring legacy global row codes", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      explicitTemplateId: "strip_foundation_preliminary_boq_expanded_complex_v1",
      explicitWorkKey: "strip_foundation",
      text: "ленточный фундамент паспортная смета",
      volume: 48,
      unit: "linear_m",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
      estimateDetailLevel: "professional_expanded",
    });

    expect(estimate.work.workKey).toBe("strip_foundation");
    expect(validateEstimateBoqDepth(estimate).passed).toBe(true);
    expect(validateEstimateUnitSemantics(estimate).passed).toBe(true);
    expect(estimate.sections.flatMap((section) => section.rows).every((row) => row.priceStatus === "unavailable")).toBe(true);
  });

  it("keeps exact mining passport material nomenclature and units distinct", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      explicitTemplateId: "quarry_road_preliminary_boq_expanded_complex_v1",
      explicitWorkKey: "quarry_road",
      text: "карьерная дорога паспортная смета",
      volume: 100,
      unit: "sq_m",
      language: "ru",
      countryCode: "KG",
      city: "Bishkek",
      estimateDetailLevel: "professional_expanded",
    });
    const rows = estimate.sections.flatMap((section) => section.rows);

    expect(validateEstimateBoqDepth(estimate).passed).toBe(true);
    expect(rows.find((row) => row.code === "temporary_stabilization_geotextile_m2")?.name).toContain("Temporary geotextile");
    expect(rows.find((row) => row.code === "dust_suppression_water_l")?.name).toContain("Dust suppression water");
    expect(rows.find((row) => row.code === "dust_suppression_water_l")?.unit).toBe("l");
  });
});
