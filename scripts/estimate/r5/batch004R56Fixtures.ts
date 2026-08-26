import type {
  Batch004R56CanonicalSuccessorDefinition,
  Batch004R56ParameterDefinition,
} from "./batch004R56SharedCoreProjection";

export const BATCH004_R56_FIXTURE_CAPTURED_AT = "2026-08-21T06:30:00+06:00" as const;

function numericValue(parameter: Batch004R56ParameterDefinition): number {
  const id = parameter.parameterId;
  if (id === "area_m2") return 96;
  if (id === "joint_length_m") return 210;
  if (id === "defect_area_m2") return 18;
  if (id === "opening_count_item") return 4;
  if (id === "board_layer_count") return 2;
  if (id === "delivery_mass_kg") return 1_250;
  if (id === "waste_mass_kg") return 180;
  if (id.includes("distance_km")) return 18;
  if (id.includes("fraction")) return 0.08;
  if (id.includes("count")) return 4;
  if (id.startsWith("unit_price_")) return 275;
  if (id.includes("fastener_item_per_measure")) return 18;
  if (id.includes("item_per_measure")) return 4;
  if (id.includes("profile_m_per_measure")) return 2.4;
  if (id.includes("board_m2_per_measure")) return 1.08;
  if (id.includes("insulation_m2_per_measure")) return 1.05;
  if (id.includes("tape_m_per_measure")) return 1.08;
  if (id.includes("kg_per_measure")) return 0.35;
  if (id.includes("m2_per_measure")) return 1.05;
  if (id.includes("m_per_measure")) return 1.15;
  if (id.endsWith("_length_m")) return 12;
  if (id.endsWith("_perimeter_m")) return 1.8;
  if (id === "access_equipment_shift_count") return 3;
  const minimum = parameter.minimum ?? 0.000001;
  const value = Math.max(minimum, 1);
  return parameter.maximum != null && value > parameter.maximum ? parameter.maximum : value;
}

function valueFor(parameter: Batch004R56ParameterDefinition): string | number | boolean {
  if (parameter.parameterId === "work_included") return true;
  if (["delivery_required", "waste_haul_required", "access_equipment_required"].includes(parameter.parameterId)) return true;
  if (parameter.parameterId === "estimate_scope_mode") return "FULL_APPLICABLE_SCOPE";
  if (parameter.parameterId === "project_type") return "RESIDENTIAL_OR_PUBLIC_INTERIOR";
  if (parameter.parameterId === "product_profile_id") return "PROJECT-COMPATIBLE-DRYWALL-SYSTEM-BATCH004";
  if (parameter.parameterId === "system_passport_reference") return "SYSTEM-PASSPORT-AND-TDS-BATCH004";
  if (parameter.parameterId === "material_certificate_reference") return "KG-ACTIVE-PARTY-CERTIFICATE-BATCH004";
  if (parameter.parameterId === "price_basis_reference") return "SUPPLIER-QUOTATION-BISHKEK-BATCH004";
  if (parameter.parameterId === "price_basis_date") return "2026-08-21";
  if (parameter.inputType === "boolean") return true;
  if (parameter.inputType === "choice") return parameter.choices[0] ?? "PROJECT_SPECIFIED";
  if (parameter.inputType === "text") return `PROJECT:${parameter.parameterId}`;
  return numericValue(parameter);
}

export function batch004R56FixtureValues(
  definition: Batch004R56CanonicalSuccessorDefinition,
): Readonly<Record<string, string | number | boolean>> {
  return Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, valueFor(parameter)]));
}
