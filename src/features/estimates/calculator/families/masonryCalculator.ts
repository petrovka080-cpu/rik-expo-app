import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "masonry" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_masonry_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "masonry_interior_gas_block_lay_standard",
  sample_quantity: 400,
  required_parameters: ["area_m2", "material", "wall_thickness_mm"],
  expected_units: ["piece", "kg", "m2"],
  expected_source_token: "masonry",
};

export function auditMasonryCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
