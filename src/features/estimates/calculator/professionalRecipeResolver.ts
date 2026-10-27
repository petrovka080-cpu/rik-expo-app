import type { ProductionCompiledExpandedEstimate } from "../../../lib/ai/estimateTemplate10000";

export type ProfessionalRecipeCoverage = {
  material_recipe_present: boolean;
  labor_recipe_present: boolean;
  service_recipe_present: boolean;
  equipment_recipe_present: boolean;
};

export function resolveProfessionalRecipeCoverage(
  estimate: ProductionCompiledExpandedEstimate,
): ProfessionalRecipeCoverage {
  return {
    material_recipe_present: estimate.rows.some((row) => row.lineType === "material" || row.section === "materials"),
    labor_recipe_present: estimate.rows.some((row) => row.lineType === "work" || row.section === "labor"),
    service_recipe_present: estimate.rows.some((row) => row.lineType === "service" || row.section === "logistics"),
    equipment_recipe_present: estimate.rows.some((row) => row.lineType === "equipment" || row.section === "equipment"),
  };
}
