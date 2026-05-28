import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { getConstructionPrimitiveDomain } from "../constructionPrimitives";
import { buildBoqEquipmentRows } from "./buildBoqEquipmentRows";

function equipmentRow(input: {
  primitive: WorldConstructionPrimitive;
  code: string;
  name: string;
  factor: number;
  unitPrice: number;
}): ProfessionalBoqRow {
  return {
    sectionType: "equipment",
    code: input.code,
    nameRu: input.name,
    unit: "set",
    quantityFactor: input.factor,
    unitPrice: input.unitPrice,
    rateKey: `parametric_${input.code}`,
    sourcePolicy: input.primitive.riskClass === "regulated" ? "manual_review" : "configured_reference",
    catalogPolicy: "not_material",
    commentRu: `Parametric ${input.primitive.domain} equipment row; exact machinery is confirmed before contract.`,
  };
}

function familyEquipmentRows(primitive: WorldConstructionPrimitive): ProfessionalBoqRow[] {
  const domain = getConstructionPrimitiveDomain(primitive.domain);
  const equipment = domain.equipment.length > 0 ? domain.equipment : [`${primitive.domain} professional tools`];
  return equipment.slice(0, 4).map((item, index) =>
    equipmentRow({
      primitive,
      code: `${primitive.domain}_equipment_${index + 1}`,
      name: `${primitive.domain} ${item}`,
      factor: 1,
      unitPrice: 60 + index * 40,
    }),
  );
}

export function compileEquipmentRowsFromPrimitives(
  primitive: WorldConstructionPrimitive,
): ProfessionalBoqRow[] {
  if (primitive.workKey) return buildBoqEquipmentRows(primitive.workKey);
  if (!getConstructionPrimitiveDomain(primitive.domain).requiredBoqGroups.includes("equipment")) return [];
  return familyEquipmentRows(primitive);
}
