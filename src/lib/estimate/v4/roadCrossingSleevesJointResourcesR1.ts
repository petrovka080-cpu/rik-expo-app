import type { AutomaticParameterSpec, AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { ROAD_CROSSING_SLEEVES_QUANTITY_EXPRESSIONS_R1 as quantities } from "./roadCrossingSleevesQuantityModelR1";

/** Selected MMA site-joint resources, not a complete crossing or WPS approval.
 * Gross electrode consumption comes from the applicable approved procedure and
 * selected product, not casing mass or a universal electrode-efficiency table.
 * TWI electrode efficiency can use core-wire mass only; it is NOT gross bought
 * electrode recovery. Gross kg/joint already includes its process losses; do
 * not apply another stub/flux/deposition loss factor here.
 * https://www.twi-global.com/technical-knowledge/job-knowledge/welding-costs-096
 * Full owner must exclude this component when there are no site joints; its
 * resource-input gates are not a new question for a single-section crossing.
 */
export const ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_SCOPE_R1 = Object.freeze({
  fullOwner: false, engineeringAccepted: false, process: "MMA_ONLY",
  applicability: "Confirmed applicable WPS and selected electrode for site casing joints",
  labor: "All joint crew person-hours; excludes separately owned material and equipment cost",
  equipment: "Equipment hours excluding ALL personnel and electrodes, including energy",
  excluded: "Joint preparation, fit-up, inspection/NDT, repairs, coating, drying/storage, lifting and civil execution require separate actual owners",
});
export const ROAD_CROSSING_SLEEVES_JOINT_COST_BASES_R1 = Object.freeze({
  process: "Ручная дуговая сварка покрытыми электродами (MMA)",
  labor: "Все исполнители сварки; без электродов и оборудования",
  equipment: "Без персонала и электродов; энергия включена",
});
const text = (id: string, title: string): AutomaticParameterSpec =>
  ({ id, title, kind: "ordinary", valueType: "text", unitId: null });
const number = (id: string, title: string, unitId: string, min = 0): AutomaticParameterSpec =>
  ({ id, title, kind: "ordinary", valueType: "decimal", unitId, min });
const basis = (id: string, title: string, value: string): AutomaticParameterSpec =>
  ({ id, title, kind: "ordinary", valueType: "enum", unitId: null, values: [value] });

export const ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_PARAMETERS_R1: readonly AutomaticParameterSpec[] = Object.freeze([
  text("rcs_joint_wps_reference", "Применимая к выбранному футляру утверждённая WPS/технологическая карта стыка"),
  basis("rcs_joint_welding_process", "Подтверждённый процесс сварки для данного компонента", ROAD_CROSSING_SLEEVES_JOINT_COST_BASES_R1.process),
  text("rcs_joint_electrode_designation", "Фактическая марка и размер совместимых покрытых электродов по WPS"),
  number("rcs_joint_gross_electrode_kg_per_joint", "Полный расход купленных электродов на один стык по технологии, уже с потерями", "kg_per_piece", 0.000_001),
  number("rcs_joint_electrode_retained_spare_kg", "Сохраняемый резерв совместимых электродов", "kg"),
  number("rcs_joint_electrode_compatible_stock_kg", "Подтверждённые пригодные совместимые электроды в наличии", "kg"),
  number("rcs_joint_electrode_supplier_pack_kg", "Масса электродов без тары в одной фактической поставочной упаковке", "kg", 0.000_001),
  text("rcs_joint_crew_designation", "Фактический состав исполнителей сварки, включая сварщика"),
  number("rcs_joint_total_crew_person_hours_per_joint", "Совокупные человеко-часы всех исполнителей на один стык по технологии", "man_hour_per_piece", 0.000_001),
  basis("rcs_joint_crew_cost_basis", "Состав отдельной стоимости труда исполнителей", ROAD_CROSSING_SLEEVES_JOINT_COST_BASES_R1.labor),
  text("rcs_joint_equipment_designation", "Фактический комплект сварочного оборудования с включённой энергией"),
  number("rcs_joint_equipment_hours_per_joint", "Машино-часы выбранного сварочного комплекта на один стык по технологии", "machine_hour_per_piece", 0.000_001),
  basis("rcs_joint_equipment_cost_basis", "Состав отдельной стоимости сварочного оборудования", ROAD_CROSSING_SLEEVES_JOINT_COST_BASES_R1.equipment),
]);

const JOINTS = quantities.site_joint_count;
const CONSUMED = `(${JOINTS})*rcs_joint_gross_electrode_kg_per_joint`;
const SPARE = "rcs_joint_electrode_retained_spare_kg";
const STOCK = "rcs_joint_electrode_compatible_stock_kg";
const PACK = "rcs_joint_electrode_supplier_pack_kg";
const TOTAL = `(${CONSUMED})+${SPARE}`;
const NEED = `max(0,(${TOTAL})-${STOCK})`;
const PACKS = `ceil((${NEED})/${PACK})`;
const ORDER = `(${PACKS})*${PACK}`;
const REMAINING = `${STOCK}+(${ORDER})-(${CONSUMED})`;
const METHOD_INPUTS = ["rcs_joint_wps_reference", "rcs_joint_welding_process", "rcs_casing_outside_diameter_mm", "rcs_casing_inside_diameter_mm"];
const ELECTRODE_INPUTS = [...METHOD_INPUTS, "rcs_joint_electrode_designation"];

function control(id: string, title: string, expression: string, unitId = "kg"): AutomaticRowSpec {
  return { rowId: `rcs:joint:${id}`, formulaId: `rcs:joint:${id}`, section: "Баланс электродов сварки футляра",
    category: "material", title, unitId, expression, costTreatment: "INFORMATIONAL_SCOPE",
    inputParameterIds: ELECTRODE_INPUTS };
}
export const ROAD_CROSSING_SLEEVES_JOINT_RESOURCE_ROWS_R1: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rcs:joint:site_joint_count", formulaId: "rcs:joint:site_joint_count", section: "Стыки футляра", category: "service",
    title: "Монтажные стыки физических секций, без отдельной повторной оплаты сварки", unitId: "piece", expression: JOINTS,
    costTreatment: "INFORMATIONAL_SCOPE" },
  control("electrode_consumed", "Расход электродов на монтажные стыки, уже с технологическими потерями", CONSUMED),
  control("electrode_spare", "Сохраняемый резерв электродов", SPARE),
  control("electrode_stock", "Пригодные совместимые электроды в наличии", STOCK),
  control("electrode_total", "Общая потребность электродов с резервом, без повторных потерь", TOTAL),
  control("electrode_need", "Дополнительная потребность электродов после наличия", NEED),
  control("electrode_packs", "Число новых поставочных упаковок электродов", PACKS, "package"),
  { rowId: "rcs:joint:electrode_ordered", formulaId: "rcs:joint:electrode_ordered", section: "Материалы сварки футляра", category: "material",
    title: "Новый заказ покрытых электродов по WPS", unitId: "kg", expression: ORDER, procurement: true,
    costTreatment: "OWN_COST", titleParameterIds: ["rcs_joint_electrode_designation", "rcs_joint_wps_reference"], inputParameterIds: ELECTRODE_INPUTS },
  control("electrode_remaining", "Остаток электродов после сварки, включая сохраняемый резерв", REMAINING),
  control("electrode_free", "Свободный остаток электродов сверх сохраняемого резерва", `(${REMAINING})-${SPARE}`),
  { rowId: "rcs:joint:crew_person_hours", formulaId: "rcs:joint:crew_person_hours", section: "Работы сварки футляра", category: "labor",
    title: "Труд всех исполнителей сварки монтажных стыков", unitId: "man_hour",
    expression: `(${JOINTS})*rcs_joint_total_crew_person_hours_per_joint`, costTreatment: "OWN_COST", procurement: true,
    titleParameterIds: ["rcs_joint_crew_designation"], inputParameterIds: [...METHOD_INPUTS, "rcs_joint_crew_cost_basis"] },
  { rowId: "rcs:joint:equipment_hours", formulaId: "rcs:joint:equipment_hours", section: "Механизмы сварки футляра", category: "equipment",
    title: "Сварочный комплект без персонала и электродов, с включённой энергией", unitId: "machine_hour",
    expression: `(${JOINTS})*rcs_joint_equipment_hours_per_joint`, costTreatment: "OWN_COST", procurement: true,
    titleParameterIds: ["rcs_joint_equipment_designation"], inputParameterIds: [...METHOD_INPUTS, "rcs_joint_equipment_cost_basis"] },
]);
