import type { GlobalEstimateSectionType } from "../globalEstimate";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { compileParametricBoqRecipe } from "./compileParametricBoqRecipe";
import type { ProfessionalBoqResult, ProfessionalBoqRow, ProfessionalBoqSection } from "./professionalBoqTypes";
import { validateParametricBoqRecipe } from "./validateParametricBoqRecipe";

const sectionTitles: Record<GlobalEstimateSectionType, string> = {
  materials: "Материалы и оборудование",
  labor: "Работы",
  equipment: "Техника и инструмент",
  delivery: "Логистика и резерв",
  tax: "Налоги",
};

function groupSections(rows: ProfessionalBoqRow[]): ProfessionalBoqSection[] {
  const types: GlobalEstimateSectionType[] = ["materials", "labor", "equipment", "delivery"];
  return types
    .map((type) => ({
      type,
      titleRu: sectionTitles[type],
      rows: rows.filter((row) => row.sectionType === type),
    }))
    .filter((section) => section.rows.length > 0);
}

export function compileProfessionalBoqFromPrimitives(primitive: WorldConstructionPrimitive): ProfessionalBoqResult {
  const recipe = compileParametricBoqRecipe(primitive);
  const validation = validateParametricBoqRecipe(recipe);
  if (!validation.passed) {
    throw new Error(validation.failures.join(";"));
  }
  return {
    primitive,
    compilerId: recipe.compilerId,
    recipeMode: recipe.mode,
    sections: groupSections(recipe.rows),
    assumptions: recipe.assumptions,
    exclusions: recipe.exclusions,
    costIncreaseFactors: primitive.costIncreaseFactors,
    clarifyingQuestions: recipe.clarifyingQuestions,
    catalogGapWarnings: recipe.rows
      .filter((row) => row.sectionType === "materials" && row.catalogPolicy === "candidate_or_gap_warning")
      .map((row) => `catalog_gap_warning:${row.materialKey ?? row.code}`),
  };
}
