import {
  auditP0FamilyCalculator,
  criticalCalculatorRow,
  type P0FamilyCalculatorSpec,
} from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "mansard_roof" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_mansard_roof_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: null,
  sample_quantity: 200,
  required_parameters: ["roof_area_m2", "covering_material", "slope_angle_deg", "insulation_thickness_mm"],
  expected_units: ["m2", "m3", "linear_m", "piece", "trip"],
  expected_source_token: "mansard_roof_critical_calculator",
  critical_rows: () => {
    const area = 200;
    const waste = 0.07;
    const insulationM3 = area * 200 / 1000;
    return [
      criticalCalculatorRow({ family: "mansard_roof", rowCode: "mansard_roof_materials_01", section: "materials", lineType: "material", unit: "m2", quantity: area * (1 + waste), formula: "roof_area_m2 * (1 + waste_percent)", includedInProcurement: true }),
      criticalCalculatorRow({ family: "mansard_roof", rowCode: "mansard_roof_materials_02", section: "materials", lineType: "material", unit: "m3", quantity: insulationM3, formula: "roof_area_m2 * insulation_thickness_mm / 1000", includedInProcurement: true }),
      criticalCalculatorRow({ family: "mansard_roof", rowCode: "mansard_roof_components_03", section: "components", lineType: "material", unit: "linear_m", quantity: area / 0.95, formula: "roof_area_m2 / rafter_yield_coeff", includedInProcurement: true }),
      criticalCalculatorRow({ family: "mansard_roof", rowCode: "mansard_roof_consumables_04", section: "consumables", lineType: "material", unit: "piece", quantity: Math.ceil(area * 8), formula: "ceil(roof_area_m2 * fasteners_per_m2)", includedInProcurement: true }),
      criticalCalculatorRow({ family: "mansard_roof", rowCode: "mansard_roof_labor_05", section: "labor", lineType: "work", unit: "m2", quantity: area, formula: "roof_area_m2", includedInProcurement: false }),
      criticalCalculatorRow({ family: "mansard_roof", rowCode: "mansard_roof_logistics_06", section: "logistics", lineType: "service", unit: "trip", quantity: Math.max(1, Math.ceil(area / 120)), formula: "max(1, ceil(roof_area_m2 / 120))", includedInProcurement: true }),
    ];
  },
};

export function auditMansardRoofCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
