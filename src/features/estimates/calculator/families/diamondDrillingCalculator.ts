import {
  auditP0FamilyCalculator,
  criticalCalculatorRow,
  type P0FamilyCalculatorSpec,
} from "./p0FamilyCalculatorShared";

export const P0_CALCULATOR_WORK_FAMILY = "diamond_concrete_drilling" as const;
export const P0_CALCULATOR_FAMILY_ID = "calc_family_diamond_concrete_drilling_v1" as const;

const SPEC: P0FamilyCalculatorSpec = {
  calculator_family_id: P0_CALCULATOR_FAMILY_ID,
  work_family_id: P0_CALCULATOR_WORK_FAMILY,
  sample_work_key: null,
  sample_quantity: 12,
  required_parameters: ["holes_count", "diameter_mm", "drilling_depth_mm", "material"],
  expected_units: ["linear_m", "piece", "l", "day"],
  expected_source_token: "diamond_drilling_critical_calculator",
  critical_rows: () => {
    const holes = 12;
    const depthM = 250 / 1000;
    const totalDepthM = holes * depthM;
    return [
      criticalCalculatorRow({
        family: "diamond_drilling",
        rowCode: "diamond_drilling_labor_01",
        section: "labor",
        lineType: "work",
        unit: "linear_m",
        quantity: totalDepthM,
        formula: "holes_count * drilling_depth_mm / 1000",
        includedInProcurement: false,
      }),
      criticalCalculatorRow({
        family: "diamond_drilling",
        rowCode: "diamond_drilling_consumables_02",
        section: "consumables",
        lineType: "material",
        unit: "piece",
        quantity: Math.max(0.1, totalDepthM * 0.08),
        formula: "max(0.1, total_depth_m * segment_wear_norm)",
        includedInProcurement: true,
      }),
      criticalCalculatorRow({
        family: "diamond_drilling",
        rowCode: "diamond_drilling_materials_03",
        section: "materials",
        lineType: "material",
        unit: "l",
        quantity: totalDepthM * 10,
        formula: "total_depth_m * technical_water_allowance",
        includedInProcurement: true,
      }),
      criticalCalculatorRow({
        family: "diamond_drilling",
        rowCode: "diamond_drilling_equipment_04",
        section: "equipment",
        lineType: "equipment",
        unit: "day",
        quantity: Math.max(1, Math.ceil(totalDepthM / 12)),
        formula: "max(1, ceil(total_depth_m / 12))",
        includedInProcurement: true,
      }),
    ];
  },
};

export function auditDiamondDrillingCalculatorP0() {
  return auditP0FamilyCalculator(SPEC);
}
