import {
  validateProfessionalBoqUnit,
  type ProfessionalBoqUnitValidationInput,
} from "./canonicalUnits";

export type ProfessionalBoqUnitRowInput = ProfessionalBoqUnitValidationInput & {
  rowId: string;
};

export type ProfessionalBoqUnitRowsValidation = {
  row_count: number;
  wrong_unit_rows_count: number;
  unknown_unit_rows_count: number;
  material_rows_forced_to_m2_count: number;
  blocking_reasons: string[];
};

export function validateProfessionalBoqUnitRows(
  rows: readonly ProfessionalBoqUnitRowInput[],
): ProfessionalBoqUnitRowsValidation {
  const blockingReasons: string[] = [];
  let wrongUnitRows = 0;
  let unknownUnitRows = 0;
  let materialRowsForcedToM2 = 0;

  for (const row of rows) {
    const validation = validateProfessionalBoqUnit(row);
    if (validation.blocking_reasons.length > 0) {
      wrongUnitRows += validation.blocking_reasons.some((reason) => reason !== "UNKNOWN_UNIT") ? 1 : 0;
      unknownUnitRows += validation.blocking_reasons.includes("UNKNOWN_UNIT") ? 1 : 0;
      if (String(row.rowKind ?? "").toLowerCase() === "material" && validation.canonicalUnit === "m2") {
        materialRowsForcedToM2 += 1;
      }
      blockingReasons.push(...validation.blocking_reasons.map((reason) => `${row.rowId}:${reason}`));
    }
  }

  return {
    row_count: rows.length,
    wrong_unit_rows_count: wrongUnitRows,
    unknown_unit_rows_count: unknownUnitRows,
    material_rows_forced_to_m2_count: materialRowsForcedToM2,
    blocking_reasons: blockingReasons,
  };
}
