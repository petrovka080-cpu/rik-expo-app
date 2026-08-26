import type { Batch003R56CanonicalSuccessorDefinition, Batch003R56ParameterDefinition } from "./batch003R56SharedCoreProjection";

export const BATCH003_R56_FIXTURE_CAPTURED_AT = "2026-08-21T00:00:00+06:00" as const;

function numericFixture(parameter: Batch003R56ParameterDefinition): number {
  const id = parameter.parameterId;
  if (id === "area_m2") return 96;
  if (id === "length_m") return 12;
  if (id === "width_m") return 8;
  if (id === "perimeter_m") return 40;
  if (id === "working_height_m") return 3.4;
  if (id === "defect_area_m2") return 18;
  if (id === "joint_length_m") return 210;
  if (id === "delivery_mass_kg") return 1_250;
  if (id.includes("distance_km")) return 18;
  if (id.startsWith("unit_price_")) return 275;
  if (id.includes("productivity")) return 8;
  if (id.includes("fraction")) return 0.08;
  if (id.includes("layer_count")) return 2;
  if (id.includes("count")) return 4;
  if (id.includes("rate_")) return 1.15;
  const value = Math.max(parameter.minimum ?? 0.000001, 1);
  return parameter.maximum != null && value > parameter.maximum ? parameter.maximum : value;
}

function valueFor(parameter: Batch003R56ParameterDefinition): string | number | boolean {
  if (parameter.parameterId === "work_included") return true;
  if (parameter.parameterId === "estimate_scope_mode") return "FULL_APPLICABLE_SCOPE";
  if (parameter.parameterId === "funding_source") return "PRIVATE_RECOMMENDED";
  if (parameter.parameterId === "project_type") return "RESIDENTIAL_INTERIOR";
  if (parameter.parameterId === "normative_rate_code") return "E10-05-011-02-PARTIAL-APPLICABILITY";
  if (parameter.parameterId === "price_basis_reference") return "SUPPLIER-QUOTATION-BISHKEK-2026-08-21";
  if (parameter.parameterId === "price_basis_date") return "2026-08-21";
  if (parameter.parameterId === "product_profile_id") return "PROJECT-COMPATIBLE-DRYWALL-SYSTEM-001";
  if (parameter.parameterId === "material_certificate_reference") return "KG-ACTIVE-PARTY-CERTIFICATE-001";
  if (parameter.parameterId === "system_passport_reference") return "SYSTEM-PASSPORT-AND-TDS-001";
  if (parameter.inputType === "boolean") return true;
  if (parameter.inputType === "choice") return parameter.choices[0] ?? "PROJECT_SPECIFIED";
  if (parameter.inputType === "text") return `PROJECT:${parameter.parameterId}`;
  return numericFixture(parameter);
}

export function batch003R56FixtureValues(
  definition: Batch003R56CanonicalSuccessorDefinition,
): Readonly<Record<string, string | number | boolean>> {
  return Object.fromEntries(definition.parameters.map((parameter) => [parameter.parameterId, valueFor(parameter)]));
}
