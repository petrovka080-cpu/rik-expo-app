import {
  CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  type CanonicalParameterDefinition,
  type CanonicalParameterSchema,
  type CanonicalParameterValueType,
} from "../../../canonicalParameters/canonicalParameterCore";
import type { ProfessionalDomainParameterDefinitionV1 } from "../../domainFactory";
import { electricalCompleteDomainFactory } from "./domainPackage";
import { ELECTRICAL_COMPLETE_RECORD_COUNT, ELECTRICAL_DOMAIN_INVENTORY } from "./inventory";

function valueType(parameter: ProfessionalDomainParameterDefinitionV1): CanonicalParameterValueType {
  if (parameter.input_type === "number") return "number";
  if (parameter.input_type === "boolean") return "boolean";
  return "string";
}

function visibility(parameter: ProfessionalDomainParameterDefinitionV1): CanonicalParameterDefinition["visibilityCondition"] {
  if (parameter.visible_when.kind === "ALWAYS") return { kind: "ALWAYS" };
  if (parameter.visible_when.kind === "EQUALS") return { kind: "PARAMETER_EQUALS", parameterId: parameter.visible_when.parameter_id, value: parameter.visible_when.value };
  return { kind: "ANY_OF", conditions: parameter.visible_when.conditions.map((condition) => ({ parameterId: condition.parameter_id, value: condition.value })) };
}

function definition(parameter: ProfessionalDomainParameterDefinitionV1, index: number): CanonicalParameterDefinition {
  return {
    parameterId: parameter.parameter_id,
    label: parameter.label_ru,
    description: `${parameter.label_ru}. Только явное проектное, паспортное, нормативное или проверенное ценовое значение; скрытые значения не подставляются.`,
    valueType: valueType(parameter),
    unit: parameter.unit_id,
    requiredLevel: parameter.priority === "P2" ? "OPTIONAL" : "BLOCKING_REQUIRED",
    visibilityCondition: visibility(parameter),
    validation: {
      ...(parameter.minimum == null ? {} : { min: parameter.minimum }),
      ...(parameter.maximum == null ? {} : { max: parameter.maximum }),
      ...(parameter.input_type === "text" ? { nonEmpty: true } : {}),
    },
    allowedValues: parameter.input_type === "boolean"
      ? [{ value: true, label: "Да" }, { value: false, label: "Нет" }]
      : (parameter.choices ?? []).map((choice) => ({ value: choice.value, label: choice.label_ru })),
    affectsRows: [...parameter.formula_consumers],
    affectsFormula: [...parameter.formula_consumers],
    normativeSource: null,
    displayOrder: index + 1,
  };
}

export const ELECTRICAL_CANONICAL_PARAMETER_SCHEMAS: readonly CanonicalParameterSchema[] = Object.freeze(
  ELECTRICAL_DOMAIN_INVENTORY.map((inventory) => {
    const technology = electricalCompleteDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    if (!technology) throw new Error(`ELECTRICAL_CANONICAL_TECHNOLOGY_NOT_FOUND:${inventory.catalog_id}`);
    const schema = electricalCompleteDomainFactory.schema_by_id.get(technology.parameter_schema_id);
    if (!schema) throw new Error(`ELECTRICAL_CANONICAL_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
    return Object.freeze({
      coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
      schemaId: `canonical:${schema.schema_id}:${inventory.catalog_id}`,
      schemaVersion: schema.schema_version,
      workPassportId: `domain-passport:${inventory.catalog_id}:v1`,
      canonicalWorkKey: inventory.work_key,
      calculationVersion: `${electricalCompleteDomainFactory.package.manifest.domain_version}|${technology.formula_pack_id}`,
      definitions: Object.freeze(schema.parameters.map(definition)),
      requiredAlternatives: Object.freeze(schema.quantity_alternatives.map((alternative, index) => ({
        alternativeId: `${inventory.work_key}:resource-quantities:${index + 1}`,
        parameterIds: Object.freeze([...alternative]),
      }))),
    });
  }),
);

if (ELECTRICAL_CANONICAL_PARAMETER_SCHEMAS.length !== ELECTRICAL_COMPLETE_RECORD_COUNT) {
  throw new Error("ELECTRICAL_CANONICAL_SCHEMA_DENOMINATOR_MISMATCH");
}
