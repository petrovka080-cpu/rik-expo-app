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
    const controlOrAdministrativeRow =
      /обследован|обмер|осмотр|разметк|привязк|контроль|приемк|приёмк|исполнительн|документац|схем|проверка|резерв|креп[её]ж|расходник/.test(name);
    const expectsPieces = /стойк|анкер|закладн/.test(name) && !/фундамент|бетон/.test(name);
    if (expectsPieces && row.unit !== "pcs") failures.push(`pcs_expected:${row.code}:${row.unit}`);
    const metalStructuralRow = /ферм|балк|связ|раскос/.test(name)
      || (/металл/.test(name) && !/обмер|схем|доставка|окраск|монтаж|установ|сборк|укладк|зачистк|стойк/.test(name));
    const glazingOrOpeningRow = /glazing|window|balcony|остекл|окн|балкон/i.test(`${row.code} ${name}`);
    if (!deliveryOrLogisticsRow && !controlOrAdministrativeRow && !glazingOrOpeningRow && metalStructuralRow && row.unit !== "kg" && row.unit !== "ton" && row.unit !== "linear_m") {
      failures.push(`metal_unit_expected:${row.code}:${row.unit}`);
    }
    const reinforcementOrMetalQuantityRow =
      /арматур|металл|сталь|сетк|проволок/.test(name) ||
      /rebar|steel|metal|mesh/.test(row.code);
    const concreteSurfaceOrAncillaryRow =
      /гидроизоляц|уход за бетоном|опалубк|асфальт|свая|сваи|свай|бетононасос|подача бетона|насос|пленк|мембран|геотекстил|топпинг|герметик/.test(name);
    const concreteAreaAncillaryCode = /waterproofing|primer|surface_prep|membrane|mastic|protection|insulation/i.test(row.code);
    if (!deliveryOrLogisticsRow &&
      section.type !== "equipment" &&
      !reinforcementOrMetalQuantityRow &&
      !controlOrAdministrativeRow &&
      !concreteAreaAncillaryCode &&
      !concreteSurfaceOrAncillaryRow &&
      /бетон|фундамент/.test(name) &&
      row.unit !== "m3" &&
      row.unit !== "kg" &&
      row.unit !== "ton" &&
      !/монтаж|установ|устройств/.test(name)) {
      failures.push(`concrete_m3_expected:${row.code}:${row.unit}`);
    }
    const baseboardFittingOrHardware = /фурнитур|креп[её]ж|расходник/.test(name) && /плинтус/.test(name);
    if (!expectsPieces && !baseboardFittingOrHardware && !/бетон/.test(name) && /бордюр|водосток|прогон|плинтус/.test(name) && row.unit !== "linear_m") {
      failures.push(`linear_m_expected:${row.code}:${row.unit}`);
    }
    const liftingEquipmentRow =
      /автовыш|виброплит/.test(name) ||
      (/кран/.test(name) &&
        !/radiator|valve|faucet|plumbing|boiler|heating/.test(row.code) &&
        !/маевск|шаров|запор|смесит|радиатор|водоразбор/.test(name));
    if (liftingEquipmentRow && row.unit !== "shift") failures.push(`shift_expected:${row.code}:${row.unit}`);
    const concreteOrBulkDelivery = /доставка/.test(name) && /бетон|асфальт|щеб|песок|грунт|смес/.test(name);
    if (/доставка/.test(name) && row.unit !== "trip" && row.unit !== "set" && !(concreteOrBulkDelivery && (row.unit === "m3" || row.unit === "ton"))) {
      failures.push(`delivery_unit_expected:${row.code}:${row.unit}`);
    }
  }

  return { passed: failures.length === 0, failures };
}
