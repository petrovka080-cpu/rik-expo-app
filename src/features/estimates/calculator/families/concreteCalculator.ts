import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "concrete" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_concrete_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "concrete_foundation_interior_concrete_slab_pour_standard",
  sample_quantity: 10,
  required_parameters: ["volume_m3"],
  expected_units: ["m3"],
  expected_source_token: "concrete_ready_mix",
};

export function auditConcreteCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
