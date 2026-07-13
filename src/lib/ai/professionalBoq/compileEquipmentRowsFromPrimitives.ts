import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { getConstructionPrimitiveDomain } from "../constructionPrimitives";
import { buildBoqEquipmentRows } from "./buildBoqEquipmentRows";
import { toVisibleEstimateLabel } from "../../estimatePresentation/visibleEstimateLabelPolicy";

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
    nameRu: toVisibleEstimateLabel({
      label: input.name,
      domainKey: input.primitive.domain,
      objectKey: input.primitive.objectScope,
      operationKey: input.primitive.operation,
      sectionType: "equipment",
    }),
    unit: "set",
    quantityFactor: input.factor,
    unitPrice: input.unitPrice,
    rateKey: `parametric_${input.code}`,
    sourcePolicy: input.primitive.riskClass === "regulated" ? "manual_review" : "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "\u0422\u0435\u0445\u043d\u0438\u043a\u0430 \u0438 \u043e\u0441\u043d\u0430\u0441\u0442\u043a\u0430 \u0443\u0442\u043e\u0447\u043d\u044f\u044e\u0442\u0441\u044f \u0434\u043e \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430.",
  };
}

function familyEquipmentRows(primitive: WorldConstructionPrimitive): ProfessionalBoqRow[] {
  const domain = getConstructionPrimitiveDomain(primitive.domain);
  const equipment = domain.equipment.length > 0 ? domain.equipment : [];
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
