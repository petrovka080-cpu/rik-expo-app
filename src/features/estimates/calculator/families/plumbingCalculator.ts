import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "plumbing" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_plumbing_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "plumbing_interior_water_pipe_install_standard",
  sample_quantity: 10,
  required_parameters: ["points_count", "pipe_length_m"],
  expected_units: ["linear_m", "point", "piece", "set"],
  expected_source_token: "plumbing",
};

export function auditPlumbingCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
