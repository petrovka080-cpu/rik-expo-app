import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "reinforcement" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_reinforcement_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "concrete_foundation_interior_reinforcement_frame_reinforce_standard",
  sample_quantity: 100,
  required_parameters: ["diameter_mm", "spacing_mm", "area_m2"],
  expected_units: ["kg"],
  expected_source_token: "reinforcement_rebar",
};

export function auditReinforcementCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
