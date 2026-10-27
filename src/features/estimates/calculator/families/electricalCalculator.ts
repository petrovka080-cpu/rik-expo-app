import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "electrical" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_electrical_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "electrical_interior_socket_install_standard",
  sample_quantity: 10,
  required_parameters: ["points_count", "cable_length_m"],
  expected_units: ["linear_m", "point", "piece", "set"],
  expected_source_token: "electrical",
};

export function auditElectricalCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
