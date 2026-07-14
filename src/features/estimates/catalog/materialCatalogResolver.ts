import type { ProductionCompiledExpandedRow } from "../../../lib/ai/estimateTemplate10000";
import { buildProfessionalRowCatalogBinding } from "./workCatalogResolver";
import type { ProfessionalRowCatalogBinding, ProfessionalWorkFamilyId } from "./professionalCatalogTypes";

export function resolveMaterialCatalogRows(input: {
  family: ProfessionalWorkFamilyId;
  rows: readonly ProductionCompiledExpandedRow[];
}): ProfessionalRowCatalogBinding[] {
  return input.rows
    .filter((row) => row.lineType === "material" || row.includedInProcurement)
    .map((row) => buildProfessionalRowCatalogBinding({ family: input.family, row }))
    .filter((row) => row.kind === "material");
}
