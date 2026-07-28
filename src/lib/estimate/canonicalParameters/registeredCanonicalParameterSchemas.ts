import {
  ASPHALT_PARAMETER_SCHEMA_ID_V4,
  ASPHALT_WORK_ID_V4,
  ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4,
  ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
} from "../v4/asphalt";
import {
  ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION,
  ASPHALT_REFERENCE_V1_ID,
} from "../v4/asphalt/asphaltReferenceV1";
import { ELECTRICAL_CANONICAL_PARAMETER_SCHEMA } from "../v4/electrical/electricalCanonicalV1";
import {
  CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  type CanonicalParameterDefinition,
  type CanonicalParameterSchema,
  type CanonicalParameterValueType,
} from "./canonicalParameterCore";
import { createCanonicalParameterSchemaRegistry } from "./canonicalParameterSchemaRegistry";

function asphaltValueType(inputKind: string): CanonicalParameterValueType {
  if (["quantity", "integer", "decimal"].includes(inputKind)) return "number";
  if (inputKind === "boolean") return "boolean";
  return "string";
}

const ASPHALT_CANONICAL_PARAMETER_DEFINITIONS: readonly CanonicalParameterDefinition[] =
  ASPHALT_WORK_SPECIFIC_PARAMETER_SCHEMA_V4.parameters.map((parameter, index) => ({
    parameterId: parameter.canonical_key,
    label: parameter.professional_name_ru,
    description: parameter.user_help_ru,
    valueType: asphaltValueType(parameter.input_kind),
    unit: parameter.canonical_unit_id,
    requiredLevel: parameter.necessity === "critical"
      ? "BLOCKING_REQUIRED"
      : parameter.necessity === "recommended"
        ? "CONTRACT_REQUIRED"
        : "OPTIONAL",
    visibilityCondition: { kind: "ALWAYS" as const },
    validation: {
      ...(parameter.range?.minimum != null ? { min: parameter.range.minimum } : {}),
      ...(parameter.range?.maximum != null ? { max: parameter.range.maximum } : {}),
      ...(parameter.input_kind === "integer" ? { integer: true } : {}),
      ...(["text", "document", "location"].includes(parameter.input_kind)
        ? { nonEmpty: true }
        : {}),
    },
    allowedValues: parameter.choices.map((choice) => ({
      value: choice.value,
      label: choice.label_ru,
    })),
    affectsRows: [...parameter.affected_row_ids],
    affectsFormula: [...parameter.formula_dependencies],
    normativeSource: null,
    displayOrder: index + 1,
  }));

export const ASPHALT_CANONICAL_PARAMETER_SCHEMA: CanonicalParameterSchema = {
  coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  schemaId: `canonical:${ASPHALT_PARAMETER_SCHEMA_ID_V4}`,
  schemaVersion: "1.0.0",
  workPassportId: ASPHALT_REFERENCE_V1_ID,
  canonicalWorkKey: ASPHALT_WORK_ID_V4,
  calculationVersion: `${ASPHALT_V4_RUNTIME_TEMPLATE_VERSION}|${ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION}`,
  definitions: ASPHALT_CANONICAL_PARAMETER_DEFINITIONS,
  requiredAlternatives: [
    { alternativeId: "area", parameterIds: ["area_m2"] },
    { alternativeId: "length_width", parameterIds: ["length_m", "width_m"] },
  ],
};

export const REGISTERED_CANONICAL_PARAMETER_SCHEMAS =
  createCanonicalParameterSchemaRegistry([
    ASPHALT_CANONICAL_PARAMETER_SCHEMA,
    ELECTRICAL_CANONICAL_PARAMETER_SCHEMA,
  ]);
