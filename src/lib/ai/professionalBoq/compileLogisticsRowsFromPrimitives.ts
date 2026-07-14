import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { buildBoqLogisticsRows } from "./buildBoqLogisticsRows";
import { buildVisibleBoqRowName, toVisibleEstimateLabel } from "../../estimatePresentation/visibleEstimateLabelPolicy";

function deliveryRow(input: {
  primitive: WorldConstructionPrimitive;
  code: string;
  name: string;
  factor: number;
  unitPrice: number;
}): ProfessionalBoqRow {
  return {
    sectionType: "delivery",
    code: input.code,
    nameRu: toVisibleEstimateLabel({
      label: input.name,
      domainKey: input.primitive.domain,
      objectKey: input.primitive.objectScope,
      operationKey: input.primitive.operation,
      sectionType: "delivery",
    }),
    unit: "set",
    quantityFactor: input.factor,
    unitPrice: input.unitPrice,
    rateKey: `parametric_${input.code}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "\u041b\u043e\u0433\u0438\u0441\u0442\u0438\u043a\u0430, \u0434\u043e\u0441\u0442\u0443\u043f \u0438 \u043f\u043b\u0435\u0447\u043e \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u0443\u0442\u043e\u0447\u043d\u044f\u044e\u0442\u0441\u044f \u0434\u043e \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430.",
  };
}

function familyLogisticsRows(primitive: WorldConstructionPrimitive): ProfessionalBoqRow[] {
  return [
    deliveryRow({
      primitive,
      code: `${primitive.domain}_mobilization`,
      name: buildVisibleBoqRowName({
        sectionType: "delivery",
        domainKey: primitive.domain,
        objectKey: primitive.objectScope,
        operationKey: primitive.operation,
        index: 0,
      }),
      factor: 1,
      unitPrice: 120,
    }),
    deliveryRow({
      primitive,
      code: `${primitive.domain}_material_delivery`,
      name: buildVisibleBoqRowName({
        sectionType: "delivery",
        domainKey: primitive.domain,
        objectKey: primitive.objectScope,
        operationKey: primitive.operation,
        index: 1,
      }),
      factor: 1,
      unitPrice: 160,
    }),
    deliveryRow({
      primitive,
      code: `${primitive.domain}_waste_handling`,
      name: buildVisibleBoqRowName({
        sectionType: "delivery",
        domainKey: primitive.domain,
        objectKey: primitive.objectScope,
        operationKey: primitive.operation,
        index: 2,
      }),
      factor: 1,
      unitPrice: 95,
    }),
  ];
}

export function compileLogisticsRowsFromPrimitives(
  primitive: WorldConstructionPrimitive,
): ProfessionalBoqRow[] {
  if (primitive.workKey) return buildBoqLogisticsRows(primitive.workKey);
  return familyLogisticsRows(primitive);
}
