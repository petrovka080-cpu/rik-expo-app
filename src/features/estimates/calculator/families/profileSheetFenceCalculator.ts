import {
  auditP0FamilyCalculator,
  criticalCalculatorRow,
  type P0FamilyCalculatorSpec,
} from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "profile_sheet_fence" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_profile_sheet_fence_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: null,
  sample_quantity: 50,
  required_parameters: ["fence_length_m", "fence_height_m", "post_spacing_m", "profile_sheet_thickness_mm"],
  expected_units: ["m2", "piece", "linear_m", "m3"],
  expected_source_token: "profile_sheet_fence",
  critical_rows: () => {
    const length = 50;
    const height = 2;
    const spacing = 2.5;
    const waste = 0.07;
    const posts = Math.ceil(length / spacing) + 1;
    const sheetArea = length * height * (1 + waste);
    const railsLm = length * 2;
    const concreteM3 = posts * Math.PI * (0.25 / 2) ** 2 * 0.8;
    return [
      criticalCalculatorRow({ family: "profile_sheet_fence", rowCode: "profile_sheet_fence_materials_01", section: "materials", lineType: "material", unit: "m2", quantity: sheetArea, formula: "length * height * (1 + waste_percent)", includedInProcurement: true }),
      criticalCalculatorRow({ family: "profile_sheet_fence", rowCode: "profile_sheet_fence_components_02", section: "components", lineType: "material", unit: "piece", quantity: posts, formula: "ceil(length / post_spacing) + 1", includedInProcurement: true }),
      criticalCalculatorRow({ family: "profile_sheet_fence", rowCode: "profile_sheet_fence_components_03", section: "components", lineType: "material", unit: "linear_m", quantity: railsLm, formula: "length * rail_rows_count", includedInProcurement: true }),
      criticalCalculatorRow({ family: "profile_sheet_fence", rowCode: "profile_sheet_fence_materials_04", section: "materials", lineType: "material", unit: "m3", quantity: concreteM3, formula: "posts_count * pi * radius^2 * depth", includedInProcurement: true }),
      criticalCalculatorRow({ family: "profile_sheet_fence", rowCode: "profile_sheet_fence_labor_05", section: "labor", lineType: "work", unit: "linear_m", quantity: length, formula: "fence_length_m", includedInProcurement: false }),
    ];
  },
};

export function auditProfileSheetFenceCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
