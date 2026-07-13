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
import { buildVisibleBoqRowName } from "../../estimatePresentation/visibleEstimateLabelPolicy";

function assuranceRow(primitive: WorldConstructionPrimitive, index: number): ProfessionalBoqRow {
  const sectionType = index % 3 === 0 ? "labor" : index % 3 === 1 ? "delivery" : "equipment";
  return {
    sectionType,
    code: `${primitive.domain}_${primitive.operation}_assurance_${index + 1}`,
    nameRu: buildVisibleBoqRowName({
      sectionType,
      domainKey: primitive.domain,
      objectKey: primitive.objectScope,
      operationKey: primitive.operation,
      index,
    }),
    unit: "set",
    quantityFactor: 1,
    unitPrice: 30 + index * 4,
    rateKey: `parametric_${primitive.domain}_${primitive.operation}_assurance_${index + 1}`,
    sourcePolicy: "configured_reference",
    catalogPolicy: "not_material",
    commentRu: "\u0421\u0442\u0440\u043e\u043a\u0430 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0439 \u0441\u043c\u0435\u0442\u044b \u0434\u043b\u044f \u043e\u0431\u044a\u0435\u043c\u0430, \u043f\u0440\u0438\u0435\u043c\u043a\u0438 \u0438 \u0441\u0434\u0430\u0447\u0438.",
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
