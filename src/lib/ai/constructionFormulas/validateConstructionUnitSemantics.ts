import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";

export type ConstructionUnitSemanticsValidation = {
  passed: boolean;
  failures: string[];
};

function allRows(result: GlobalEstimateResult) {
  return result.sections.flatMap((section) => section.rows.map((row) => ({ section, row })));
}

export function validateConstructionUnitSemantics(result: GlobalEstimateResult): ConstructionUnitSemanticsValidation {
  const failures: string[] = [];
  const rows = allRows(result);
  const units = new Set(rows.map(({ row }) => row.unit));

  if ((result.work.workKey === "metal_canopy_installation" || result.work.workKey === "gable_roof_installation") && units.size < 4) {
    failures.push(`unit_variety_too_low:${result.work.workKey}:${[...units].join(",")}`);
  }

  for (const { row } of rows) {
    const name = row.name.toLocaleLowerCase("ru-RU");
    const expectsPieces = /стойк|анкер|закладн/.test(name) && !/фундамент|бетон/.test(name);
    if (expectsPieces && row.unit !== "pcs") failures.push(`pcs_expected:${row.code}:${row.unit}`);
    const metalStructuralRow = /ферм|балк|связ|раскос/.test(name)
      || (/металл/.test(name) && !/обмер|схем|доставка|окраск|монтаж стоек|стойк/.test(name));
    if (metalStructuralRow && row.unit !== "kg" && row.unit !== "ton" && row.unit !== "linear_m") {
      failures.push(`metal_unit_expected:${row.code}:${row.unit}`);
    }
    if (/бетон|фундамент/.test(name) && row.unit !== "m3" && !/монтаж|установ|устройств/.test(name)) {
      failures.push(`concrete_m3_expected:${row.code}:${row.unit}`);
    }
    if (!expectsPieces && !/бетон/.test(name) && /бордюр|водосток|прогон|плинтус/.test(name) && row.unit !== "linear_m") {
      failures.push(`linear_m_expected:${row.code}:${row.unit}`);
    }
    if (/кран|автовыш|виброплит/.test(name) && row.unit !== "shift") failures.push(`shift_expected:${row.code}:${row.unit}`);
    if (/доставка/.test(name) && row.unit !== "trip" && row.unit !== "set") failures.push(`delivery_unit_expected:${row.code}:${row.unit}`);
  }

  return { passed: failures.length === 0, failures };
}
