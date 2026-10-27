import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "screed" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_screed_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "screed_cement_sand_50mm",
  sample_quantity: 100,
  required_parameters: ["area_m2", "thickness_mm"],
  expected_units: ["kg", "m2", "l", "linear_m", "piece", "set"],
  expected_source_token: "screed_cement_sand_mix",
};

export function auditScreedCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
