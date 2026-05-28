import { requiredMinimumRows } from "../worldConstructionOntology";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { compileClarifyingQuestionsFromPrimitives } from "./compileClarifyingQuestionsFromPrimitives";
import { compileEquipmentRowsFromPrimitives } from "./compileEquipmentRowsFromPrimitives";
import { compileExclusionsFromPrimitives } from "./compileExclusionsFromPrimitives";
import { compileLaborRowsFromPrimitives } from "./compileLaborRowsFromPrimitives";
import { compileLogisticsRowsFromPrimitives } from "./compileLogisticsRowsFromPrimitives";
import { compileMaterialRowsFromPrimitives } from "./compileMaterialRowsFromPrimitives";
import {
  PARAMETRIC_BOQ_RECIPE_COMPILER_ID,
  type ParametricBoqRecipe,
  type ParametricBoqRecipeMode,
} from "./parametricBoqRecipeTypes";
import type { ProfessionalBoqRow } from "./professionalBoqTypes";

function assuranceRow(primitive: WorldConstructionPrimitive, index: number): ProfessionalBoqRow {
  const sectionType = index % 3 === 0 ? "labor" : index % 3 === 1 ? "delivery" : "equipment";
  return {
    sectionType,
    code: `${primitive.domain}_${primitive.operation}_assurance_${index + 1}`,
    nameRu: `${primitive.domain} ${primitive.operation} professional assurance ${index + 1}`,
    unit: "set",
    quantityFactor: 1,
    unitPrice: 30 + index * 4,
    rateKey: `parametric_${primitive.domain}_${primitive.operation}_assurance_${index + 1}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "Parametric control row for measurement, quality, handover, and scope assurance.",
  };
}

function padRows(primitive: WorldConstructionPrimitive, rows: ProfessionalBoqRow[]): ProfessionalBoqRow[] {
  const minimum = requiredMinimumRows(primitive.complexity);
  if (rows.length >= minimum) return rows;
  const result = [...rows];
  let index = 0;
  while (result.length < minimum) {
    result.push(assuranceRow(primitive, index));
    index += 1;
  }
  return result;
}

function modeFor(primitive: WorldConstructionPrimitive): ParametricBoqRecipeMode {
  if (primitive.outcome === "TEMPLATE_GAP_SAFE_TRIAGE") return "safe_template_gap_triage";
  if (primitive.riskClass === "regulated") return "dangerous_regulated_safe_estimate_mode";
  if (primitive.workKey) return "exact_governed_recipe";
  if (primitive.method !== "generic_professional_method") return "method_derived_recipe";
  if (primitive.materialSystem.key !== "general_building") return "material_system_derived_recipe";
  return "family_derived_recipe";
}

export function compileParametricBoqRecipe(primitive: WorldConstructionPrimitive): ParametricBoqRecipe {
  const mode = modeFor(primitive);
  const baseRows = [
    ...compileMaterialRowsFromPrimitives(primitive),
    ...compileLaborRowsFromPrimitives(primitive),
    ...compileEquipmentRowsFromPrimitives(primitive),
    ...compileLogisticsRowsFromPrimitives(primitive),
  ];
  const rows = padRows(primitive, baseRows);
  return {
    compilerId: PARAMETRIC_BOQ_RECIPE_COMPILER_ID,
    mode,
    classification:
      mode === "safe_template_gap_triage" ? "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE" :
        mode === "dangerous_regulated_safe_estimate_mode" ? "DANGEROUS_REGULATED_SAFE_ESTIMATE" :
          "EXPANDED_PROFESSIONAL_BOQ_OK",
    primitive,
    rows,
    exclusions: compileExclusionsFromPrimitives(primitive),
    clarifyingQuestions: compileClarifyingQuestionsFromPrimitives(primitive),
    assumptions: primitive.assumptions,
  };
}
