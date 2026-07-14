import { requiredMinimumRows } from "../worldConstructionOntology";
import type { ParametricBoqRecipe, ParametricBoqRecipeValidation } from "./parametricBoqRecipeTypes";
import {
  isWeakGenericVisibleEstimateLabel,
  visibleEstimateLabelViolations,
} from "../../estimatePresentation/visibleEstimateLabelPolicy";

const forbiddenStandaloneRows = new Set([
  "material",
  "materials",
  "work",
  "works",
  "installation",
  "mounting",
  "misc",
  "other",
  "additional materials",
  "additional works",
  "construction works",
  "roofing",
  "repair roof",
  "материал",
  "материалы",
  "работы",
  "прочее",
  "монтаж",
  "кровля",
]);

function normalized(value: string): string {
  return value.toLocaleLowerCase("ru-RU").replace(/\s+/g, " ").trim();
}

export function findWeakGenericRecipeRows(recipe: ParametricBoqRecipe): string[] {
  return recipe.rows
    .map((row) => row.nameRu)
    .filter((name) => forbiddenStandaloneRows.has(normalized(name)) || isWeakGenericVisibleEstimateLabel(name));
}

export function validateParametricBoqRecipe(recipe: ParametricBoqRecipe): ParametricBoqRecipeValidation {
  const failures: string[] = [];
  const weakGenericRows = findWeakGenericRecipeRows(recipe);
  const minimumRows = requiredMinimumRows(recipe.primitive.complexity);
  if (recipe.rows.length < minimumRows) {
    failures.push(`PARAMETRIC_RECIPE_TOO_SHALLOW:${recipe.rows.length}/${minimumRows}`);
  }
  if (weakGenericRows.length > 0) {
    failures.push(`WEAK_GENERIC_BOQ_ROWS:${weakGenericRows.join(",")}`);
  }
  for (const row of recipe.rows) {
    const visibleFailures = visibleEstimateLabelViolations(row.nameRu);
    if (visibleFailures.length > 0) {
      failures.push(`VISIBLE_LABEL_POLICY_FAILED:${row.code}:${visibleFailures.join("|")}`);
    }
  }
  if (recipe.rows.length > 0 && recipe.primitive.unit !== "set") {
    const units = new Set(recipe.rows.map((row) => row.unit));
    if (units.size === 1 && recipe.rows.length >= 8 && units.has(recipe.primitive.unit)) {
      failures.push(`UNIT_INHERITANCE_RISK:${recipe.primitive.unit}`);
    }
  }
  const sectionTypes = new Set(recipe.rows.map((row) => row.sectionType));
  if (!sectionTypes.has("labor")) failures.push("PARAMETRIC_RECIPE_WITHOUT_LABOR_ROWS");
  if (recipe.primitive.outcome !== "TEMPLATE_GAP_SAFE_TRIAGE" && sectionTypes.size < 2) {
    failures.push("PARAMETRIC_RECIPE_WITHOUT_MULTIPLE_ROW_GROUPS");
  }
  return {
    passed: failures.length === 0,
    failures,
    weakGenericRows,
    minimumRows,
    actualRows: recipe.rows.length,
  };
}
