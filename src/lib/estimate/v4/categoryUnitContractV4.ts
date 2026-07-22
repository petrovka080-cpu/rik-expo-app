import { getEngineeringUnitV4 } from "./engineeringUnitRegistryV4";
import type { BoqCategoryV4, EngineeringDimensionV4 } from "./professionalEstimateV4Contract";

export const CATEGORY_UNIT_CONTRACT_V4: Readonly<Record<BoqCategoryV4, readonly EngineeringDimensionV4[]>> = {
  material: ["count", "length", "area", "volume", "mass", "package"],
  equipment: ["count", "package", "power", "flow", "machine_time"],
  labor: ["labor_time"],
  machinery: ["machine_time"],
  subcontract_service: ["count", "length", "area", "volume", "time", "service", "package"],
  transport: ["count", "mass", "volume", "transport_distance", "transport_work", "service"],
  temporary_work: ["count", "length", "area", "volume", "time", "package", "service"],
  testing: ["count", "test", "service", "pressure", "temperature", "flow"],
  documentation: ["document", "package", "service"],
  permit: ["document", "service", "count"],
  waste: ["count", "area", "volume", "mass", "package"],
  commercial_adjustment: ["dimensionless", "currency", "currency_per_unit"],
};

export type CategoryUnitValidationV4 = {
  ok: boolean;
  category: BoqCategoryV4;
  unit_id: string | null;
  dimension: EngineeringDimensionV4 | null;
  blockers: ("ROW_UNIT_NOT_ALLOWED" | "UNCONVERTED_UNIT" | "CATEGORY_UNIT_MISMATCH")[];
};

export function validateCategoryUnitV4(input: {
  category: BoqCategoryV4;
  unit_id: string | null | undefined;
  professional_name_ru?: string | null;
}): CategoryUnitValidationV4 {
  const unit = getEngineeringUnitV4(input.unit_id);
  const blockers: CategoryUnitValidationV4["blockers"] = [];
  if (!unit) blockers.push("ROW_UNIT_NOT_ALLOWED");
  if (input.unit_id && unit && input.unit_id !== unit.unit_id) blockers.push("UNCONVERTED_UNIT");
  const semanticMaterialMismatch = input.category === "material" &&
    /(?:геодез|разбив|survey|испыт|лаборатор|документ|разрешен)/i.test(input.professional_name_ru ?? "");
  if (
    unit &&
    (semanticMaterialMismatch ||
      !CATEGORY_UNIT_CONTRACT_V4[input.category].includes(unit.dimension) ||
      !unit.allowed_boq_categories.includes(input.category))
  ) {
    blockers.push("CATEGORY_UNIT_MISMATCH");
  }
  return {
    ok: blockers.length === 0,
    category: input.category,
    unit_id: unit?.unit_id ?? input.unit_id ?? null,
    dimension: unit?.dimension ?? null,
    blockers,
  };
}
