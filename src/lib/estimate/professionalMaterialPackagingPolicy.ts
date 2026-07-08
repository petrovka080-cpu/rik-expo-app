import type { ProfessionalMaterialType } from "./professionalMaterialQuantityContract";

export type ProfessionalMaterialPackagingPolicyResult = {
  procurementUnit: string;
  procurementPackageSize: number;
  procurementQuantity: number;
  roundingRule: string;
};

function normalizeUnit(unit: string): string {
  const value = unit.trim().toLowerCase();
  if (value === "linear_m" || value === "lm" || value === "pog.m") return "m";
  if (value === "m²" || value === "sqm") return "m2";
  if (value === "m³" || value === "cbm") return "m3";
  if (value === "ton" || value === "tons") return "t";
  if (value === "pcs" || value === "pc" || value === "piece") return "pcs";
  if (value === "trip" || value === "trips") return "trip";
  if (value === "shift" || value === "shifts") return "shift";
  return value || unit;
}

function roundUpToPackage(value: number, packageSize: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(packageSize) || packageSize <= 0) return value;
  const rounded = Math.ceil((value - 1e-9) / packageSize) * packageSize;
  return Number(rounded.toFixed(4));
}

function decimalPackageForUnit(unit: string): number {
  if (unit === "m3" || unit === "t") return 0.1;
  if (unit === "kg" || unit === "l") return 1;
  if (unit === "m" || unit === "m2") return 1;
  return 1;
}

export function resolveProfessionalMaterialPackagingPolicy(input: {
  materialName: string;
  materialType: ProfessionalMaterialType;
  unit: string;
  grossQuantity: number;
  normProcurementUnit?: string | null;
  normProcurementPackageSize?: number | null;
}): ProfessionalMaterialPackagingPolicyResult {
  const unit = normalizeUnit(input.normProcurementUnit ?? input.unit);
  const name = input.materialName.toLowerCase();
  let packageSize = input.normProcurementPackageSize ?? 0;
  let rule = "round_up_to_unit";

  if (!Number.isFinite(packageSize) || packageSize <= 0) {
    if (unit === "kg" && /cement|adhesive|glue|plaster|screed|mix|mortar/.test(name)) {
      packageSize = 25;
      rule = "round_up_to_25kg_bag";
    } else if (unit === "l" && /paint|primer|bitumen/.test(name)) {
      packageSize = 10;
      rule = "round_up_to_10l_can";
    } else if (unit === "m" && /cable|conductor|pipe|profile/.test(name)) {
      packageSize = 10;
      rule = "round_up_to_10m_bundle";
    } else if (unit === "m2" && /membrane|geotextile|insulation|film|sheet/.test(name)) {
      packageSize = 10;
      rule = "round_up_to_10m2_pack";
    } else if (unit === "pcs" || unit === "set" || unit === "trip" || unit === "shift") {
      packageSize = 1;
      rule = "ceil_piece_count";
    } else {
      packageSize = decimalPackageForUnit(unit);
      rule = packageSize < 1 ? `round_up_to_${packageSize}_${unit}` : "round_up_to_unit";
    }
  }

  return {
    procurementUnit: unit,
    procurementPackageSize: packageSize,
    procurementQuantity: roundUpToPackage(input.grossQuantity, packageSize),
    roundingRule: rule,
  };
}
