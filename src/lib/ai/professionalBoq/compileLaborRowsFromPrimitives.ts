import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { buildBoqLaborRows } from "./buildBoqLaborRows";
import { buildVisibleBoqRowName, toVisibleEstimateLabel } from "../../estimatePresentation/visibleEstimateLabelPolicy";

function laborRow(input: {
  primitive: WorldConstructionPrimitive;
  code: string;
  name: string;
  factor: number;
  unitPrice: number;
  unit?: ProfessionalBoqRow["unit"];
}): ProfessionalBoqRow {
  return {
    sectionType: "labor",
    code: input.code,
    nameRu: toVisibleEstimateLabel({
      label: input.name,
      domainKey: input.primitive.domain,
      objectKey: input.primitive.objectScope,
      operationKey: input.primitive.operation,
      sectionType: "labor",
    }),
    unit: input.unit ?? input.primitive.unit,
    quantityFactor: input.factor,
    unitPrice: input.unitPrice,
    rateKey: `parametric_${input.code}`,
    sourcePolicy: input.primitive.riskClass === "regulated" ? "manual_review" : "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "\u0422\u0440\u0443\u0434\u043e\u0432\u0430\u044f \u0441\u0442\u0440\u043e\u043a\u0430 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0439 \u0441\u043c\u0435\u0442\u044b.",
  };
}

function familyLaborRows(primitive: WorldConstructionPrimitive): ProfessionalBoqRow[] {
  const phases = [
    "survey and setting-out",
    "base preparation",
    "primary installation",
    "interfaces and penetrations",
    "quality control",
    "handover documentation",
  ];
  return phases.map((phase, index) =>
    laborRow({
      primitive,
      code: `${primitive.domain}_${primitive.operation}_${phase.replace(/[^a-z0-9]+/g, "_")}_${index + 1}`,
      name: buildVisibleBoqRowName({
        sectionType: "labor",
        domainKey: primitive.domain,
        objectKey: primitive.objectScope,
        operationKey: primitive.operation,
        index,
      }),
      factor: index === 0 || index >= 4 ? 0.08 : 1,
      unitPrice: 35 + index * 18,
      unit: index === 0 || index >= 4 ? "set" : primitive.unit,
    }),
  );
}

export function compileLaborRowsFromPrimitives(
  primitive: WorldConstructionPrimitive,
): ProfessionalBoqRow[] {
  if (primitive.workKey) return buildBoqLaborRows(primitive.workKey);
  return familyLaborRows(primitive);
}
