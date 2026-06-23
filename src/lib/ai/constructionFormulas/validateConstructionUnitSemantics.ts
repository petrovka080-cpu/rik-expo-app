import type { GlobalEstimateResult } from "../globalEstimate/globalEstimateTypes";

export type ConstructionUnitSemanticsValidation = {
  passed: boolean;
  failures: string[];
};

function allRows(result: GlobalEstimateResult) {
  return result.sections.flatMap((section) => section.rows.map((row) => ({ section, row })));
}

function isNonQuantitySupportRow(code: string): boolean {
  const normalized = code.toLocaleLowerCase("en-US");
  return normalized === "survey" ||
    normalized === "layout" ||
    normalized === "quality" ||
    normalized === "documentation" ||
    normalized === "profile_fasteners" ||
    normalized === "reserve" ||
    normalized.startsWith("assurance_");
}

export function validateConstructionUnitSemantics(result: GlobalEstimateResult): ConstructionUnitSemanticsValidation {
  const failures: string[] = [];
  const rows = allRows(result);
  const units = new Set(rows.map(({ row }) => row.unit));

  if ((result.work.workKey === "metal_canopy_installation" || result.work.workKey === "gable_roof_installation") && units.size < 4) {
    failures.push(`unit_variety_too_low:${result.work.workKey}:${[...units].join(",")}`);
  }

  for (const { section, row } of rows) {
    const pieceCountRowCode = /^(laminate_baseboard_(inner_corners|outer_corners|connectors|end_caps)|brick_material_(7|9)|drywall_material_6|window_consumable_2|gable_material_4)$/.test(row.code);
    const asphaltAreaQuantityCode = /^asphalt_(material_(6|7)|waste_1)$/.test(row.code);
    if (pieceCountRowCode || asphaltAreaQuantityCode) {
      if (pieceCountRowCode && row.unit !== "pcs") failures.push(`pcs_expected:${row.code}:${row.unit}`);
      continue;
    }
    const name = row.name.toLocaleLowerCase("ru-RU");
    const nonQuantitySupportRow = isNonQuantitySupportRow(row.code);
    const deliveryOrLogisticsRow = /доставка|вывоз|логист|подъем|подъём/.test(name);
    const supportOrControlRow = nonQuantitySupportRow || /^logistics_\d+$/.test(row.code);
    const waterproofingSurfaceSupportRow =
      result.work.workKey === "foundation_waterproofing" &&
      /\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a|\u043f\u043e\u0432\u0435\u0440\u0445\u043d\u043e\u0441\u0442|\u043f\u0440\u0430\u0439\u043c\u0435\u0440|\u043c\u0430\u0441\u0442\u0438\u043a|\u043c\u0435\u043c\u0431\u0440\u0430\u043d|\u0433\u0438\u0434\u0440\u043e\u0438\u0437\u043e\u043b|\u0437\u0430\u0441\u044b\u043f/.test(name);
    const expectsPieces = /\u0441\u0442\u043e\u0439\u043a|\u0430\u043d\u043a\u0435\u0440|\u0437\u0430\u043a\u043b\u0430\u0434\u043d/.test(name) && !/\u0432\u043b\u0430\u0433\u043e\u0441\u0442\u043e\u0439\u043a|\u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442|\u0431\u0435\u0442\u043e\u043d/.test(name);
    if (!supportOrControlRow && !deliveryOrLogisticsRow && expectsPieces && row.unit !== "pcs") {
      failures.push(`pcs_expected:${row.code}:${row.unit}`);
    }
    const structuralMetalKeyword = /\u0444\u0435\u0440\u043c|\u0431\u0430\u043b\u043a|\u0441\u0432\u044f\u0437|\u0440\u0430\u0441\u043a\u043e\u0441/.test(name) && !/\u0441\u0432\u044f\u0437\u0438/.test(name);
    const metalStructuralRow = structuralMetalKeyword
      || (/\u043c\u0435\u0442\u0430\u043b\u043b/.test(name) && !/\u043c\u0435\u0442\u0430\u043b\u043b\u043e\u0447\u0435\u0440\u0435\u043f|\u043e\u0431\u043c\u0435\u0440|\u0441\u0445\u0435\u043c|\u0434\u043e\u0441\u0442\u0430\u0432\u043a|\u043e\u043a\u0440\u0430\u0441\u043a|\u043c\u043e\u043d\u0442\u0430\u0436 \u0441\u0442\u043e\u0435\u043a|\u0441\u0442\u043e\u0439\u043a/.test(name));
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
      !waterproofingSurfaceSupportRow &&
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
