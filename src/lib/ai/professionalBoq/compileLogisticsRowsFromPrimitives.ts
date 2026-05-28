import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { buildBoqLogisticsRows } from "./buildBoqLogisticsRows";

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
    nameRu: input.name,
    unit: "set",
    quantityFactor: input.factor,
    unitPrice: input.unitPrice,
    rateKey: `parametric_${input.code}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "not_material",
    commentRu: `Parametric ${input.primitive.domain} logistics row; local access and haul distance must be confirmed.`,
  };
}

function familyLogisticsRows(primitive: WorldConstructionPrimitive): ProfessionalBoqRow[] {
  return [
    deliveryRow({
      primitive,
      code: `${primitive.domain}_mobilization`,
      name: `${primitive.domain} crew mobilization`,
      factor: 1,
      unitPrice: 120,
    }),
    deliveryRow({
      primitive,
      code: `${primitive.domain}_material_delivery`,
      name: `${primitive.domain} material delivery and unloading`,
      factor: 1,
      unitPrice: 160,
    }),
    deliveryRow({
      primitive,
      code: `${primitive.domain}_waste_handling`,
      name: `${primitive.domain} waste handling and site cleanup`,
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
