import type { ProfessionalBoqRow } from "./professionalBoqTypes";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { buildBoqMaterialRows } from "./buildBoqMaterialRows";
import { getConstructionPrimitiveDomain } from "../constructionPrimitives";
import { buildVisibleBoqRowName, toVisibleEstimateLabel } from "../../estimatePresentation/visibleEstimateLabelPolicy";

function materialRow(input: {
  primitive: WorldConstructionPrimitive;
  code: string;
  name: string;
  unit: ProfessionalBoqRow["unit"];
  factor: number;
  unitPrice: number;
  materialKey?: string;
}): ProfessionalBoqRow {
  return {
    sectionType: "materials",
    code: input.code,
    nameRu: toVisibleEstimateLabel({
      label: input.name,
      materialKey: input.materialKey,
      sectionType: "materials",
    }),
    unit: input.unit,
    quantityFactor: input.factor,
    unitPrice: input.unitPrice,
    materialKey: input.materialKey,
    rateKey: `parametric_${input.code}`,
    sourcePolicy: input.primitive.riskClass === "regulated" ? "manual_review" : "configured_reference",
    catalogPolicy: "candidate_or_gap_warning",
    commentRu: `Parametric ${input.primitive.domain}/${input.primitive.objectScope}/${input.primitive.method} material row.`,
  };
}

function familyMaterialRows(primitive: WorldConstructionPrimitive): ProfessionalBoqRow[] {
  const domain = getConstructionPrimitiveDomain(primitive.domain);
  const system = primitive.materialSystem;
  const unit = domain.units.includes("m3") ? "m3" : domain.units.includes("linear_m") ? "linear_m" : primitive.unit;
  const materialKeys = system.materialKeys.length > 0 ? system.materialKeys : domain.materialSystems;
  return materialKeys.slice(0, 6).map((materialKey, index) =>
    materialRow({
      primitive,
      code: `${primitive.domain}_${primitive.objectScope}_${materialKey}_${index + 1}`,
      name: buildVisibleBoqRowName({
        sectionType: "materials",
        domainKey: primitive.domain,
        objectKey: primitive.objectScope,
        materialKey,
        index,
      }),
      unit: index % 3 === 0 ? unit : index % 3 === 1 ? "set" : primitive.unit,
      factor: index % 3 === 0 ? 1 : index % 3 === 1 ? 0.05 : 0.15,
      unitPrice: 80 + index * 45,
      materialKey,
    }),
  );
}

export function compileMaterialRowsFromPrimitives(
  primitive: WorldConstructionPrimitive,
): ProfessionalBoqRow[] {
  if (primitive.workKey) return buildBoqMaterialRows(primitive.workKey);
  return familyMaterialRows(primitive);
}
