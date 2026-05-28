import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { getConstructionPrimitiveDomain } from "../constructionPrimitives";
import { buildBoqLaborRows } from "./buildBoqLaborRows";

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
    nameRu: input.name,
    unit: input.unit ?? input.primitive.unit,
    quantityFactor: input.factor,
    unitPrice: input.unitPrice,
    rateKey: `parametric_${input.code}`,
    sourcePolicy: input.primitive.riskClass === "regulated" ? "manual_review" : "configured_reference",
    catalogPolicy: "not_material",
    commentRu: `Parametric ${input.primitive.domain}/${input.primitive.operation}/${input.primitive.method} labor row.`,
  };
}

function familyLaborRows(primitive: WorldConstructionPrimitive): ProfessionalBoqRow[] {
  const domain = getConstructionPrimitiveDomain(primitive.domain);
  const laborTypes = domain.laborTypes.length > 0 ? domain.laborTypes : [`${primitive.domain} crew`];
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
      name: `${primitive.domain} ${primitive.operation} ${phase} (${laborTypes[index % laborTypes.length]})`,
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
