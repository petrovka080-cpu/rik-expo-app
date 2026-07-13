import { auditP0FamilyCalculator, type P0FamilyCalculatorSpec } from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "formwork" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_formwork_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: "concrete_foundation_interior_formwork_form_standard",
  sample_quantity: 20,
  required_parameters: ["contact_area_m2"],
  expected_units: ["m2"],
  expected_source_token: "formwork_contact_area",
};

export function auditFormworkCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
