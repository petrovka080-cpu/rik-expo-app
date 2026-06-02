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

  for (const { section, row } of rows) {
    const name = row.name.toLocaleLowerCase("ru-RU");
    const deliveryOrLogisticsRow = /доставка|вывоз|логист|подъем|подъём/.test(name);
    const supportOrControlRow = /^(survey|layout|quality|documentation|profile_fasteners|reserve|assurance_\d+|logistics_\d+)$/.test(row.code);
    const expectsPieces = /стойк|анкер|закладн/.test(name) && !/влагостойк|фундамент|бетон/.test(name);
    if (!supportOrControlRow && !deliveryOrLogisticsRow && expectsPieces && row.unit !== "pcs") {
      failures.push(`pcs_expected:${row.code}:${row.unit}`);
    }
    const structuralMetalKeyword = /ферм|балк|связ|раскос/.test(name) && !/связи/.test(name);
    const metalStructuralRow = structuralMetalKeyword
      || (/металл/.test(name) && !/металлочереп|обмер|схем|доставка|окраск|монтаж стоек|стойк/.test(name));
    if (!supportOrControlRow && !deliveryOrLogisticsRow && metalStructuralRow && row.unit !== "kg" && row.unit !== "ton" && row.unit !== "linear_m") {
      failures.push(`metal_unit_expected:${row.code}:${row.unit}`);
    }
    const reinforcementOrMetalQuantityRow =
      /арматур|металл|сталь|сетк|проволок/.test(name) ||
      /rebar|steel|metal|mesh/.test(row.code);
    if (!supportOrControlRow &&
      !deliveryOrLogisticsRow &&
      section.type !== "equipment" &&
      !reinforcementOrMetalQuantityRow &&
      /бетон|фундамент/.test(name) &&
      !/асфальтобетон/.test(name) &&
      row.unit !== "m3" &&
      row.unit !== "kg" &&
      row.unit !== "ton" &&
      !/монтаж|установ|устройств/.test(name)) {
      failures.push(`concrete_m3_expected:${row.code}:${row.unit}`);
    }
    if (!supportOrControlRow && !deliveryOrLogisticsRow && !expectsPieces && !/бетон|фурнитур/.test(name) && /бордюр|водосток|прогон|плинтус/.test(name) && row.unit !== "linear_m") {
      failures.push(`linear_m_expected:${row.code}:${row.unit}`);
    }
    const liftingEquipmentRow =
      /автовыш|виброплит/.test(name) ||
      (/кран/.test(name) &&
        !/radiator|valve|faucet|plumbing|boiler|heating/.test(row.code) &&
        !/маевск|шаров|запор|смесит|радиатор|водоразбор/.test(name));
    if (!supportOrControlRow && !deliveryOrLogisticsRow && liftingEquipmentRow && row.unit !== "shift") {
      failures.push(`shift_expected:${row.code}:${row.unit}`);
    }
    if (/доставка/.test(name) && row.unit !== "trip" && row.unit !== "set") failures.push(`delivery_unit_expected:${row.code}:${row.unit}`);
  }

  return { passed: failures.length === 0, failures };
}
