import { buildCanonicalBaselinePlan } from "../../src/features/consumerRepair/consumerCanonicalBaselineCompile";
import type { CanonicalEstimateCatalogItem } from "../../src/lib/estimate/backendPlatform/contracts";
import { NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID } from "../../src/lib/estimate/v4/domainFactory";

const PARAMETER_IDS = [
  "total_axis_length_m",
  "strip_width_m",
  "strip_height_m",
  "concrete_order_allowance_percent",
  "product_profile_id",
  "plan_volume_calculation_reference",
  "mix_design_or_project_specification_reference",
  "mixture_designation",
  "placement_location",
  "placement_method",
  "contingency_selection_justification",
  "delivery_schedule_and_truck_capacity",
  "producer_order_confirmation",
  "estimator_approval_reference",
] as const;

function catalog(): CanonicalEstimateCatalogItem {
  return {
    catalogId: "canonical-work:expanded:strip_foundation",
    releaseId: "00000000-0000-5000-8000-000000000031",
    namespace: "global",
    domain: "concrete",
    workKey: "strip_foundation",
    titleRu: "Устройство монолитного железобетонного ленточного фундамента",
    definitionVersion: 6,
    applicability: {},
    professionalMetadata: {},
    parameterSchema: PARAMETER_IDS.map((parameterId, ordinal) => ({
      parameterId,
      ordinal,
      valueType: [
        "total_axis_length_m",
        "strip_width_m",
        "strip_height_m",
        "concrete_order_allowance_percent",
      ].includes(parameterId) ? "decimal" as const : "text" as const,
      unitId: null,
      titleRu: parameterId,
      required: true,
      defaultValue: null,
      constraints: {},
      visibilityRole: "USER_INPUT" as const,
      valueSourceRole: "PROJECT_DOCUMENTATION" as const,
    })),
  };
}

const PROMPT = [
  "Устройство ленточного фундамента по NRMCA CIP 31.",
  "Длина самой ленты 40 м; ширина самой ленты 0,5 м; высота бетонной ленты 1,5 м;",
  "запас бетонной смеси 8%; placement method: pump;",
  "plan volume calculation reference: KJ-4 axes 1-8/A-D rev.5;",
  "mix design or project specification reference: KJ-4 note 7, mix card RM-25-114;",
  "mixture designation: B25 W6 F150 P4, RM-25-114;",
  "placement location: strip foundation axes 1-8/A-D, pour 1;",
  "contingency selection justification: complex formwork and pump remainder;",
  "delivery schedule and truck capacity: 4 trucks x 8 m3, final load confirmed before dispatch;",
  "producer order confirmation: RM-PRODUCER-2026-0912-17;",
  "estimator approval reference: EST-APPROVAL-2026-0912-04.",
].join(" ");

describe("consumer NRMCA CIP 31 strip-foundation baseline", () => {
  test("routes the exact project evidence into the existing canonical strip-foundation compile request", () => {
    const plan = buildCanonicalBaselinePlan({ catalog: catalog(), prompt: PROMPT });
    expect(plan.primaryMeasureParameterId).toBe("total_axis_length_m");
    expect(plan.parameters).toEqual({
      total_axis_length_m: "40",
      strip_width_m: "0.5",
      strip_height_m: "1.5",
      concrete_order_allowance_percent: "8",
      product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
      plan_volume_calculation_reference: "KJ-4 axes 1-8/A-D rev.5",
      mix_design_or_project_specification_reference: "KJ-4 note 7, mix card RM-25-114",
      mixture_designation: "B25 W6 F150 P4, RM-25-114",
      placement_location: "strip foundation axes 1-8/A-D, pour 1",
      placement_method: "pump",
      contingency_selection_justification: "complex formwork and pump remainder",
      delivery_schedule_and_truck_capacity: "4 trucks x 8 m3, final load confirmed before dispatch",
      producer_order_confirmation: "RM-PRODUCER-2026-0912-17",
      estimator_approval_reference: "EST-APPROVAL-2026-0912-04.",
    });
  });
});
