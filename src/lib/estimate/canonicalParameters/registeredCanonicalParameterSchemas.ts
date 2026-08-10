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
  ASPHALT_RELATED_EXTRA_PROFILES_V4,
  ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
} from "../v4/asphalt/asphaltRelatedSemanticRegistryV4";
import { ASPHALT_RELATED_PARAMETER_METADATA_V4 } from "../v4/asphalt/asphaltRelatedProductionBindingV4";
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

function asphaltRelatedValueType(
  key: string,
  allowedValues: readonly (string | boolean)[],
): CanonicalParameterValueType {
  if (allowedValues.length > 0) {
    return typeof allowedValues[0] === "boolean" ? "boolean" : "string";
  }
  return ASPHALT_RELATED_PARAMETER_METADATA_V4[key]?.unit ? "number" : "string";
}

export const ASPHALT_RELATED_CANONICAL_PARAMETER_SCHEMAS_V4: readonly CanonicalParameterSchema[] =
  Object.freeze(ASPHALT_RELATED_EXTRA_PROFILES_V4
    // asphalt_concrete_pavement is the established Asphalt V4 owner above.
    // Its expanded-template IDs are routing aliases, not a second canonical
    // schema/work/passport registration.
    .filter((profile) => profile.canonicalWorkKey !== ASPHALT_WORK_ID_V4)
    .map((profile): CanonicalParameterSchema => {
    const keys = [...new Set([...profile.requiredParameters, ...profile.optionalParameters, "work_scope"])];
    const definitions = keys.map((key, index): CanonicalParameterDefinition => {
      const metadata = ASPHALT_RELATED_PARAMETER_METADATA_V4[key] ?? { labelRu: key, tier: "P1" as const };
      const allowedValues = metadata.allowedValues ?? [];
      const haulConditional = (key === "haul_distance_km" || key === "truck_payload_t") &&
        keys.includes("haul_required");
      const reinstatementConditional = key === "reinstatement_depth_mm" || key === "new_asphalt_density_t_m3";
      const partialRemovalConditional = key === "total_area_m2" || key === "removal_share";
      const required = profile.requiredParameters.includes(key);
      return {
        parameterId: key,
        label: metadata.labelRu,
        description: `${metadata.labelRu}. Значение используется только точным паспортом ${profile.professionalNameRu}.`,
        valueType: asphaltRelatedValueType(key, allowedValues),
        unit: metadata.unit ?? null,
        requiredLevel: required || haulConditional || reinstatementConditional || partialRemovalConditional
          ? "BLOCKING_REQUIRED"
          : "OPTIONAL",
        visibilityCondition: haulConditional
          ? { kind: "PARAMETER_EQUALS" as const, parameterId: "haul_required", value: true }
          : reinstatementConditional
            ? {
              kind: "PARAMETER_EQUALS" as const,
              parameterId: "work_scope",
              value: "DEMOLITION_AND_REINSTATEMENT",
            }
            : partialRemovalConditional
              ? {
                kind: "PARAMETER_EQUALS" as const,
                parameterId: "removal_extent",
                value: "PARTIAL",
              }
            : { kind: "ALWAYS" as const },
        validation: metadata.unit || metadata.minimum != null || metadata.maximum != null
          ? {
            min: metadata.minimum ?? Number.EPSILON,
            ...(metadata.maximum != null ? { max: metadata.maximum } : {}),
            ...(metadata.integer ? { integer: true } : {}),
          }
          : { nonEmpty: true },
        allowedValues: allowedValues.map((value) => ({ value, label: String(value) })),
        affectsRows: [profile.canonicalWorkKey],
        affectsFormula: [profile.formulaGraphVersion],
        normativeSource: null,
        displayOrder: index + 1,
      };
    });
    const requiredIds = definitions
      .filter((definition) => definition.requiredLevel === "BLOCKING_REQUIRED")
      .map((definition) => definition.parameterId);
    return Object.freeze({
      coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
      schemaId: `canonical:${profile.parameterSchemaId}`,
      schemaVersion: ASPHALT_RELATED_SEMANTIC_REGISTRY_VERSION_V4,
      workPassportId: profile.passportId,
      canonicalWorkKey: profile.canonicalWorkKey,
      calculationVersion: `${profile.calculationStrategyId}|${profile.formulaGraphVersion}`,
      definitions: Object.freeze(definitions),
      requiredAlternatives: Object.freeze([{
        alternativeId: `${profile.canonicalWorkKey}:all-required`,
        parameterIds: Object.freeze(requiredIds),
      }]),
    });
    }));

export const REGISTERED_CANONICAL_PARAMETER_SCHEMAS =
  createCanonicalParameterSchemaRegistry([
    ASPHALT_CANONICAL_PARAMETER_SCHEMA,
    ELECTRICAL_CANONICAL_PARAMETER_SCHEMA,
    ...ASPHALT_RELATED_CANONICAL_PARAMETER_SCHEMAS_V4,
  ]);
