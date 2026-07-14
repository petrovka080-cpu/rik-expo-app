import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "roofing" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_roofing_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "roofing_interior_metal_roof_install_standard",
  sample_quantity: 100,
  required_parameters: ["roof_area_m2", "covering_material"],
  expected_units: ["m2", "set", "linear_m"],
  expected_source_token: "roofing",
};

export function auditRoofingCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
