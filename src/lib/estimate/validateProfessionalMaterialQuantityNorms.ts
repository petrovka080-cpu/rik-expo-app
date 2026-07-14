import { listProfessionalMaterialQuantityNorms } from "./professionalMaterialQuantityNormRegistry";

export type ProfessionalMaterialQuantityNormsValidation = {
  passed: boolean;
  normsCount: number;
  duplicateNormIds: string[];
  invalidNormIds: string[];
  blockers: string[];
};

export function validateProfessionalMaterialQuantityNorms(): ProfessionalMaterialQuantityNormsValidation {
  const norms = listProfessionalMaterialQuantityNorms();
  const seen = new Set<string>();
  const duplicateNormIds: string[] = [];
  const invalidNormIds: string[] = [];
  for (const norm of norms) {
    if (seen.has(norm.normId)) duplicateNormIds.push(norm.normId);
    seen.add(norm.normId);
    const invalid =
      !norm.normId?.trim() ||
      !norm.family?.trim() ||
      !norm.materialType?.trim() ||
      !norm.formula?.trim() ||
      !Array.isArray(norm.formulaInputsRequired) ||
      !norm.sourceId?.trim() ||
      !norm.citationLabel?.trim() ||
      (norm.wastePercent != null && norm.wastePercent < 0) ||
      (norm.lossPercent != null && norm.lossPercent < 0) ||
      (norm.procurementPackageSize != null && norm.procurementPackageSize <= 0);
    if (invalid) invalidNormIds.push(norm.normId || "<missing>");
  }
  const blockers = [
    norms.length > 0 ? "" : "material_quantity_norm_registry_empty",
    duplicateNormIds.length === 0 ? "" : "duplicate_material_quantity_norm_ids",
    invalidNormIds.length === 0 ? "" : "invalid_material_quantity_norms",
  ].filter(Boolean);
  return {
    passed: blockers.length === 0,
    normsCount: norms.length,
    duplicateNormIds,
    invalidNormIds,
    blockers,
  };
}
