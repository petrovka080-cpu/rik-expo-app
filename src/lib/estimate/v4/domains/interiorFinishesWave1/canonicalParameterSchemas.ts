import {
  CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
  type CanonicalParameterDefinition,
  type CanonicalParameterSchema,
  type CanonicalParameterValueType,
} from "../../../canonicalParameters/canonicalParameterCore";
import type { ProfessionalDomainParameterDefinitionV1 } from "../../domainFactory";
import { INTERIOR_FINISHES_WAVE_1_INVENTORY } from "./inventory";
import { interiorFinishesWave1DomainFactory } from "./domainPackage";

function valueType(parameter: ProfessionalDomainParameterDefinitionV1): CanonicalParameterValueType {
  if (parameter.input_type === "number") return "number";
  if (parameter.input_type === "boolean") return "boolean";
  return "string";
}

function visibility(
  parameter: ProfessionalDomainParameterDefinitionV1,
): CanonicalParameterDefinition["visibilityCondition"] {
  if (parameter.visible_when.kind === "ALWAYS") return { kind: "ALWAYS" };
  if (parameter.visible_when.kind === "EQUALS") {
    return {
      kind: "PARAMETER_EQUALS",
      parameterId: parameter.visible_when.parameter_id,
      value: parameter.visible_when.value,
    };
  }
  return {
    kind: "ANY_OF",
    conditions: parameter.visible_when.conditions.map((condition) => ({
      parameterId: condition.parameter_id,
      value: condition.value,
    })),
  };
}

function definition(
  parameter: ProfessionalDomainParameterDefinitionV1,
  index: number,
): CanonicalParameterDefinition {
  return {
    parameterId: parameter.parameter_id,
    label: parameter.label_ru,
    description: `${parameter.label_ru}. Укажите точное значение по проекту, паспорту материала или принятой применимой норме. Значение не подставляется автоматически.`,
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
      ? [
        { value: true, label: "Да" },
        { value: false, label: "Нет" },
      ]
      : (parameter.choices ?? []).map((choice) => ({
        value: choice.value,
        label: choice.label_ru,
      })),
    affectsRows: [...parameter.formula_consumers],
    affectsFormula: [...parameter.formula_consumers],
    normativeSource: null,
    displayOrder: index + 1,
  };
}

export const INTERIOR_FINISHES_WAVE_1_CANONICAL_PARAMETER_SCHEMAS: readonly CanonicalParameterSchema[] =
  Object.freeze(INTERIOR_FINISHES_WAVE_1_INVENTORY.map((inventory) => {
    const technology = interiorFinishesWave1DomainFactory.technology_by_id.get(inventory.canonical_technology_id);
    if (!technology) throw new Error(`INTERIOR_WAVE1_CANONICAL_TECHNOLOGY_NOT_FOUND:${inventory.catalog_id}`);
    const schema = interiorFinishesWave1DomainFactory.schema_by_id.get(technology.parameter_schema_id);
    if (!schema) throw new Error(`INTERIOR_WAVE1_CANONICAL_SCHEMA_NOT_FOUND:${inventory.catalog_id}`);
    return Object.freeze({
      coreSchemaVersion: CANONICAL_PARAMETER_CORE_SCHEMA_VERSION,
      schemaId: `canonical:${schema.schema_id}:${inventory.catalog_id}`,
      schemaVersion: schema.schema_version,
      workPassportId: `domain-passport:${inventory.catalog_id}:v1`,
      canonicalWorkKey: inventory.work_key,
      calculationVersion: `${interiorFinishesWave1DomainFactory.package.manifest.domain_version}|${technology.formula_pack_id}`,
      definitions: Object.freeze(schema.parameters.map(definition)),
      requiredAlternatives: Object.freeze(schema.quantity_alternatives.map((alternative, index) => ({
        alternativeId: `${inventory.work_key}:quantity:${index + 1}`,
        parameterIds: Object.freeze([...alternative]),
      }))),
    });
  }));

if (INTERIOR_FINISHES_WAVE_1_CANONICAL_PARAMETER_SCHEMAS.length !== 84) {
  throw new Error("INTERIOR_WAVE1_CANONICAL_SCHEMA_DENOMINATOR_MISMATCH");
}
