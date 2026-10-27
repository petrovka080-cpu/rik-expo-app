import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "metalwork" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_metalwork_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "carpentry_metal_interior_metal_frame_install_standard",
  sample_quantity: 100,
  required_parameters: ["length_m", "profile_type"],
  expected_units: ["linear_m", "kg", "m2", "piece", "set"],
  expected_source_token: "metalwork",
};

export function auditMetalworkCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
