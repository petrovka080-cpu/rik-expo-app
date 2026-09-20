import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import {
  asphaltRelatedAdmissionPolicyR6,
  ASPHALT_RELATED_RUNTIME_ADMISSION_CONTRACT_R6,
} from "../../src/lib/estimate/v4/asphalt/asphaltRelatedAdmissionR6";

describe("R6 full asphalt-related runtime admission", () => {
  test("keeps the extra nine owners under the same no-hidden-fixture rule", () => {
    expect(ASPHALT_RELATED_RUNTIME_ADMISSION_CONTRACT_R6).toContain("r6");
    expect(asphaltRelatedAdmissionPolicyR6("wearing_layer_thickness_mm")).toMatchObject({
      baselineClassification: "VALIDATION_FIXTURE",
      runtimeValue: null,
      visibilityRole: "USER_INPUT",
      valueSourceRole: "USER_MEASURED",
    });
    expect(asphaltRelatedAdmissionPolicyR6("asphalt_density_t_m3")).toMatchObject({
      baselineClassification: "VALIDATION_FIXTURE",
      runtimeValue: null,
      requiresSourceConfirmation: true,
      valueSourceRole: "MANUFACTURER_CONFIRMED",
    });
    expect(asphaltRelatedAdmissionPolicyR6("tack_coat_rate_l_m2")).toMatchObject({
      baselineClassification: "VALIDATION_FIXTURE",
      runtimeValue: null,
      requiresSourceConfirmation: true,
      valueSourceRole: "MANUFACTURER_CONFIRMED",
    });
    expect(asphaltRelatedAdmissionPolicyR6("machine_paver_productivity_m2_per_machine_hour"))
      .toMatchObject({
        valueSourceRole: "SELECTED_EQUIPMENT_PASSPORT",
        guideKind: "MANUFACTURER_RANGE",
      });
    expect(asphaltRelatedAdmissionPolicyR6("core_sampling_interval_m2_per_test"))
      .toMatchObject({
        valueSourceRole: "PROJECT_DOCUMENTATION",
        guideKind: "PROJECT_DEFINED",
      });
    expect(asphaltRelatedAdmissionPolicyR6("marking_material_rate_kg_m2"))
      .toMatchObject({
        valueSourceRole: "MANUFACTURER_CONFIRMED",
        guideKind: "MANUFACTURER_RANGE",
      });
    expect(asphaltRelatedAdmissionPolicyR6("marking_glass_beads_rate_kg_m2"))
      .toMatchObject({
        valueSourceRole: "MANUFACTURER_CONFIRMED",
        guideKind: "MANUFACTURER_RANGE",
      });
    expect(asphaltRelatedAdmissionPolicyR6("labor_productivity_m2_per_man_hour"))
      .toMatchObject({
        valueSourceRole: "PROJECT_DOCUMENTATION",
        guideKind: "PROJECT_DEFINED",
        requiresSourceConfirmation: true,
      });
    expect(asphaltRelatedAdmissionPolicyR6("waste_factor"))
      .toMatchObject({
        valueSourceRole: "PROJECT_DOCUMENTATION",
        guideKind: "PROJECT_DEFINED",
        requiresSourceConfirmation: true,
      });
    expect(asphaltRelatedAdmissionPolicyR6("road_worker_productivity_m2_per_man_hour"))
      .toMatchObject({ valueSourceRole: "PROJECT_DOCUMENTATION" });
    expect(asphaltRelatedAdmissionPolicyR6("marking_productivity_m2_per_man_hour"))
      .toMatchObject({ valueSourceRole: "PROJECT_DOCUMENTATION" });
  });

  test("does not turn the old asphalt-related example into a 500 m2 runtime estimate", () => {
    const result = buildEstimateFromInlineWorkPrompt({
      rawInput: "Ямочный ремонт асфальтобетонного покрытия 500 м²",
      selectedWorkKey: "built-in-ai-1000:0704",
      selectedTemplateId: "built-in-ai-1000:0704",
      selectedTemplateName: "Ямочный ремонт асфальтобетонного покрытия",
      city: "Bishkek",
      currency: "KGS",
      countryCode: "KG",
    });
    expect(result.draft).not.toBeNull();
    expect(result.draft?.items).toHaveLength(0);
    expect(result.draft?.missingData.length).toBeGreaterThan(0);
    expect(result.draft?.missingData.join(" ")).toMatch(/параметр|источник/iu);
  });
});
