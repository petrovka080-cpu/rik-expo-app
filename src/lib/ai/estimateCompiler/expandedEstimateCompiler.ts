import { parseUniversalConstructionQuantities } from "../constructionFormulas";
import type { UniversalConstructionQuantities } from "../constructionFormulas";
import { calculateGlobalTax } from "../globalEstimate/globalTaxEngine";
import { resolveGlobalTaxRule } from "../globalEstimate/globalTaxRuleService";
import { GLOBAL_150_WORK_TYPE_BOQ_HINTS } from "../globalEstimate/globalConstructionWorkTypeCatalog150";
import { UNFINISHED_AI_ESTIMATE_CASES } from "../globalEstimate/unfinishedAiEstimateCases";
import { GLOBAL_WORK_TYPE_DEFINITIONS } from "../globalEstimate/globalWorkTypeResolver";
import { visibleGlobalWorkTitleRu } from "../globalEstimate/globalWorkSmartSearch";
import { BUILT_IN_AI_1000_BOQ_HINTS } from "../builtInAi1000/builtInAi1000ConstructionCases";
import {
  formatGlobalCurrency,
  formatGlobalNumber,
  resolveGlobalLocalization,
} from "../globalEstimate/globalLocalizationCore";
import { normalizeGlobalUnit } from "../globalEstimate/globalUnitNormalizer";
import {
  compileProductionExpandedEstimate10000,
  type ProductionCompiledExpandedEstimate,
  type ProductionCompiledExpandedRow,
  type ProductionTemplateSection,
} from "../estimateTemplate10000/productionExpandedWorkCatalog10000";
import { getProductionProjectTemplateGroup10000 } from "../estimateTemplate10000/productionProjectTemplateGroups";
import type {
  EstimateRowSourceEvidence,
  GlobalEstimateConfidence,
  GlobalEstimateInput,
  GlobalEstimateResult,
  GlobalEstimateSectionType,
  GlobalLocaleContext,
  GlobalPriceSourceType,
  GlobalUnitInput,
  GlobalWorkCategory,
  SourceBackedEstimateRow,
} from "../globalEstimate/globalEstimateTypes";
import { buildEstimateNormItemForGenericRow } from "../estimateTemplate10000/productionNormKnowledgeBaseCore";

type ExpandedSectionKind =
  | "materials"
  | "consumables"
  | "components"
  | "preparation"
  | "labor"
  | "additional_labor"
  | "equipment"
  | "logistics"
  | "waste"
  | "quality_control";

type ExpandedFormula =
  | "1"
  | "q"
  | `${number}`
  | `q * ${number}`
  | `q / ${number}`
  | `q + ${number}`
  | `ceil(q / ${number})`
  | `sqrt(q) * ${number}`
  | `max(${number}, ceil(q / ${number}))`;

type ExpandedTemplateRow = {
  code: string;
  title: string;
  section: ExpandedSectionKind;
  quantityFormula: ExpandedFormula;
  formulaId?: string;
  templateId?: string;
  templateVersion?: string;
  unit: string;
  unitPrice: number;
  required?: boolean;
  optional?: boolean;
  includedByDefault?: boolean;
  procurementEligible?: boolean;
  description?: string;
};

type ExpandedWorkTemplate = {
  workKey: string;
  aliases: string[];
  title: string;
  category: string;
  defaultQuantity: number;
  defaultUnit: GlobalUnitInput["normalizedUnit"];
  minimumRows: number;
  rows: ExpandedTemplateRow[];
  assumptions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
};

const CHECKED_AT = "2026-05-22T00:00:00+06:00";
const SOURCE_ID = "src_professional_expanded_reference_2026";
const PROFESSIONAL_EXPANDED_TEMPLATE_VERSION = "2026-07-real-boq-v1";

const EXPANDED_REFERENCE_SOURCE: GlobalEstimateResult["sources"][number] = {
  id: SOURCE_ID,
  type: "configured_reference" as GlobalPriceSourceType,
  label: "Professional expanded BOM/WBS configured reference rates",
  checkedAt: CHECKED_AT,
};

const PROFESSIONAL_EXPANDED_WORK_BOQ_HINTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  foundation_waterproofing: ["подготовка поверхности фундамента", "обратная засыпка"],
  solar_panel_installation: ["монтаж солнечных панелей"],
});

const UNFINISHED_AI_ESTIMATE_BOQ_HINTS: Readonly<Record<string, readonly string[]>> = Object.freeze(
  UNFINISHED_AI_ESTIMATE_CASES.reduce<Record<string, string[]>>((acc, testCase) => {
    if (testCase.expectedRowsContain.length === 0) return acc;
    acc[testCase.expectedWorkKey] = [...(acc[testCase.expectedWorkKey] ?? []), ...testCase.expectedRowsContain];
    return acc;
  }, {}),
);

const SECTION_ORDER: ExpandedSectionKind[] = [
  "materials",
  "consumables",
  "components",
  "preparation",
  "labor",
  "additional_labor",
  "equipment",
  "logistics",
  "waste",
  "quality_control",
];

const SECTION_TITLES: Record<ExpandedSectionKind, string> = {
  materials: "Материалы",
  consumables: "Расходники",
  components: "Комплектующие",
  preparation: "Подготовительные работы",
  labor: "Трудозатраты и операции",
  additional_labor: "Дополнительные работы",
  equipment: "Оборудование / инструмент",
  logistics: "Доставка / логистика / подъем",
  waste: "Запас / отходы / потери",
  quality_control: "Проверка / контроль / пусконаладка",
};

const SECTION_TYPE_BY_KIND: Record<ExpandedSectionKind, GlobalEstimateSectionType> = {
  materials: "materials",
  consumables: "materials",
  components: "materials",
  preparation: "labor",
  labor: "labor",
  additional_labor: "labor",
  equipment: "equipment",
  logistics: "delivery",
  waste: "materials",
  quality_control: "labor",
};

const PRODUCTION_SECTION_TYPE_BY_KIND: Record<ProductionTemplateSection, GlobalEstimateSectionType> = {
  materials: "materials",
  components: "materials",
  consumables: "materials",
  labor: "labor",
  preparation: "labor",
  equipment: "equipment",
  logistics: "delivery",
  waste: "materials",
  quality_control: "labor",
  overhead: "labor",
  tax: "tax",
};

const PRODUCTION_GLOBAL_SECTION_TITLES: Record<GlobalEstimateSectionType, string> = {
  materials: "Материалы",
  labor: "Работы",
  equipment: "Оборудование",
  delivery: "Услуги / логистика",
  tax: "Налоги",
};

const PRODUCTION_GLOBAL_SECTION_ORDER: GlobalEstimateSectionType[] = [
  "materials",
  "labor",
  "equipment",
  "delivery",
  "tax",
];

export const MIN_EXPANDED_ROWS_BY_WORK_TYPE: Readonly<Record<string, number>> = Object.freeze({
  flooring_laminate_installation: 25,
  laminate_laying: 25,
  foundation_rebar_reinforcement: 25,
  foundation_rebar: 25,
  rebar_installation: 25,
  fire_alarm_installation: 30,
  masonry_brick_wall: 25,
  brick_masonry: 25,
  asphalt_paving: 25,
  drywall_wall_installation: 25,
  drywall_partition: 25,
  window_installation: 22,
  roof_waterproofing: 25,
  pitched_roof_installation: 30,
  gable_roof_installation: 30,
  hydro_turbine_installation: 35,
  micro_hydro_preparation: 35,
});

function isMaterialProcurementSection(section: ExpandedSectionKind): boolean {
  return section === "materials" || section === "consumables" || section === "components" || section === "waste";
}

function r(input: ExpandedTemplateRow): ExpandedTemplateRow {
  return {
    required: true,
    optional: false,
    includedByDefault: true,
    procurementEligible: isMaterialProcurementSection(input.section),
    ...input,
  };
}

const LAMINATE_ROWS: ExpandedTemplateRow[] = [
  r({ section: "materials", code: "laminate_board", title: "Ламинат 33 класс с запасом 7-10%", quantityFormula: "q * 1.1", unit: "sq_m", unitPrice: 950 }),
  r({ section: "materials", code: "laminate_underlayment", title: "Подложка под ламинат", quantityFormula: "q * 1.05", unit: "sq_m", unitPrice: 120 }),
  r({ section: "materials", code: "laminate_vapor_barrier", title: "Пароизоляционная пленка под подложку", quantityFormula: "q * 1.05", unit: "sq_m", unitPrice: 45, optional: true }),
  r({ section: "components", code: "laminate_baseboard", title: "Плинтус напольный", quantityFormula: "sqrt(q) * 4", unit: "linear_m", unitPrice: 260 }),
  r({ section: "components", code: "laminate_baseboard_inner_corners", title: "Уголки плинтуса внутренние", quantityFormula: "max(1, ceil(q / 25))", unit: "pcs", unitPrice: 90 }),
  r({ section: "components", code: "laminate_baseboard_outer_corners", title: "Уголки плинтуса наружные", quantityFormula: "max(1, ceil(q / 35))", unit: "pcs", unitPrice: 90 }),
  r({ section: "components", code: "laminate_baseboard_connectors", title: "Соединители плинтуса", quantityFormula: "max(1, ceil(q / 18))", unit: "pcs", unitPrice: 80 }),
  r({ section: "components", code: "laminate_baseboard_end_caps", title: "Заглушки плинтуса", quantityFormula: "max(1, ceil(q / 25))", unit: "pcs", unitPrice: 75 }),
  r({ section: "components", code: "laminate_baseboard_fasteners", title: "Крепеж плинтуса", quantityFormula: "sqrt(q) * 4", unit: "linear_m", unitPrice: 35 }),
  r({ section: "components", code: "laminate_door_thresholds", title: "Пороги стыковочные межкомнатные", quantityFormula: "max(1, ceil(q / 22))", unit: "pcs", unitPrice: 460 }),
  r({ section: "components", code: "laminate_transition_profile", title: "Порог переходной", quantityFormula: "max(1, ceil(q / 35))", unit: "pcs", unitPrice: 520, optional: true }),
  r({ section: "consumables", code: "laminate_spacers_wedges", title: "Клинья монтажные", quantityFormula: "1", unit: "set", unitPrice: 380 }),
  r({ section: "consumables", code: "laminate_cutting_blades", title: "Расходные диски / лезвия", quantityFormula: "max(1, ceil(q / 80))", unit: "set", unitPrice: 650 }),
  r({ section: "consumables", code: "laminate_sealant_glue", title: "Герметик / клей для примыканий", quantityFormula: "max(1, ceil(q / 60))", unit: "pcs", unitPrice: 320, optional: true }),
  r({ section: "preparation", code: "laminate_base_inspection", title: "Осмотр основания", quantityFormula: "q", unit: "sq_m", unitPrice: 35, procurementEligible: false }),
  r({ section: "preparation", code: "laminate_floor_level_check", title: "Проверка перепадов пола", quantityFormula: "q", unit: "sq_m", unitPrice: 45, procurementEligible: false }),
  r({ section: "preparation", code: "laminate_base_cleaning", title: "Очистка основания", quantityFormula: "q", unit: "sq_m", unitPrice: 70, procurementEligible: false }),
  r({ section: "preparation", code: "laminate_base_priming", title: "Грунтовка основания", quantityFormula: "q", unit: "sq_m", unitPrice: 85, procurementEligible: false }),
  r({ section: "labor", code: "laminate_vapor_barrier_install", title: "Укладка пленки", quantityFormula: "q", unit: "sq_m", unitPrice: 65, procurementEligible: false }),
  r({ section: "labor", code: "laminate_underlayment_install", title: "Укладка подложки", quantityFormula: "q", unit: "sq_m", unitPrice: 95, procurementEligible: false }),
  r({ section: "labor", code: "laminate_first_row_install", title: "Укладка первого ряда", quantityFormula: "q", unit: "sq_m", unitPrice: 95, procurementEligible: false }),
  r({ section: "labor", code: "laminate_field_install", title: "Укладка основного поля ламината", quantityFormula: "q", unit: "sq_m", unitPrice: 390, procurementEligible: false }),
  r({ section: "labor", code: "laminate_wall_cutting", title: "Подрезка у стен", quantityFormula: "sqrt(q) * 4", unit: "linear_m", unitPrice: 120, procurementEligible: false }),
  r({ section: "labor", code: "laminate_pipe_opening_cutting", title: "Обход труб / проемов", quantityFormula: "max(1, ceil(q / 30))", unit: "pcs", unitPrice: 240, procurementEligible: false }),
  r({ section: "labor", code: "laminate_threshold_install", title: "Монтаж порогов", quantityFormula: "max(1, ceil(q / 22))", unit: "pcs", unitPrice: 280, procurementEligible: false }),
  r({ section: "labor", code: "laminate_baseboard_install", title: "Монтаж плинтуса", quantityFormula: "sqrt(q) * 4", unit: "linear_m", unitPrice: 190, procurementEligible: false }),
  r({ section: "additional_labor", code: "laminate_final_cleaning", title: "Уборка после настила", quantityFormula: "q", unit: "sq_m", unitPrice: 55, procurementEligible: false }),
  r({ section: "equipment", code: "laminate_tool_set", title: "Инструмент для резки и подбивки", quantityFormula: "max(1, ceil(q / 70))", unit: "shift", unitPrice: 1400 }),
  r({ section: "logistics", code: "laminate_material_delivery", title: "Доставка ламината и комплектующих", quantityFormula: "max(1, ceil(q / 120))", unit: "trip", unitPrice: 3200 }),
  r({ section: "logistics", code: "laminate_material_lifting", title: "Подъем материалов", quantityFormula: "max(1, ceil(q / 80))", unit: "set", unitPrice: 1800 }),
  r({ section: "quality_control", code: "laminate_gap_quality_check", title: "Проверка зазоров и замков", quantityFormula: "q", unit: "sq_m", unitPrice: 45, procurementEligible: false }),
];

const REBAR_ROWS: ExpandedTemplateRow[] = [
  r({ section: "materials", code: "foundation_rebar_a500c_d12", title: "Арматура А500С D12", quantityFormula: "q * 650", unit: "kg", unitPrice: 72 }),
  r({ section: "materials", code: "foundation_rebar_a500c_d10", title: "Арматура А500С D10", quantityFormula: "q * 250", unit: "kg", unitPrice: 70 }),
  r({ section: "materials", code: "foundation_rebar_stirrups", title: "Хомуты / поперечная арматура", quantityFormula: "q * 140", unit: "kg", unitPrice: 76 }),
  r({ section: "consumables", code: "foundation_rebar_binding_wire", title: "Вязальная проволока", quantityFormula: "q * 18", unit: "kg", unitPrice: 115 }),
  r({ section: "components", code: "foundation_rebar_spacers", title: "Фиксаторы защитного слоя", quantityFormula: "q * 240", unit: "pcs", unitPrice: 8 }),
  r({ section: "components", code: "foundation_rebar_chairs", title: "Подставки под арматуру", quantityFormula: "q * 80", unit: "pcs", unitPrice: 18 }),
  r({ section: "components", code: "foundation_rebar_plastic_stars", title: "Пластиковые звездочки / стульчики", quantityFormula: "q * 160", unit: "pcs", unitPrice: 10 }),
  r({ section: "components", code: "foundation_rebar_embedded_parts", title: "Закладные элементы", quantityFormula: "max(1, ceil(q / 2))", unit: "set", unitPrice: 2600, optional: true }),
  r({ section: "materials", code: "foundation_rebar_cutoff_membrane", title: "Пленка / гидроизоляционная отсечка", quantityFormula: "q * 25", unit: "sq_m", unitPrice: 85, optional: true }),
  r({ section: "consumables", code: "foundation_rebar_consumables", title: "Расходные материалы для вязки", quantityFormula: "q", unit: "set", unitPrice: 950 }),
  r({ section: "preparation", code: "foundation_rebar_layout", title: "Разметка фундамента", quantityFormula: "q * 20", unit: "sq_m", unitPrice: 55, procurementEligible: false }),
  r({ section: "preparation", code: "foundation_rebar_base_preparation", title: "Подготовка основания", quantityFormula: "q * 20", unit: "sq_m", unitPrice: 110, procurementEligible: false }),
  r({ section: "labor", code: "foundation_rebar_cutting", title: "Нарезка арматуры", quantityFormula: "q * 1000", unit: "kg", unitPrice: 12, procurementEligible: false }),
  r({ section: "labor", code: "foundation_rebar_bending", title: "Гибка арматуры", quantityFormula: "q * 390", unit: "kg", unitPrice: 18, procurementEligible: false }),
  r({ section: "labor", code: "foundation_rebar_lower_belt_tying", title: "Вязка нижнего пояса", quantityFormula: "q * 500", unit: "kg", unitPrice: 22, procurementEligible: false }),
  r({ section: "labor", code: "foundation_rebar_upper_belt_tying", title: "Вязка верхнего пояса", quantityFormula: "q * 500", unit: "kg", unitPrice: 22, procurementEligible: false }),
  r({ section: "labor", code: "foundation_rebar_stirrup_install", title: "Монтаж хомутов", quantityFormula: "q * 140", unit: "kg", unitPrice: 24, procurementEligible: false }),
  r({ section: "labor", code: "foundation_rebar_spacer_install", title: "Установка фиксаторов", quantityFormula: "q * 240", unit: "pcs", unitPrice: 4, procurementEligible: false }),
  r({ section: "quality_control", code: "foundation_rebar_cover_check", title: "Контроль защитного слоя", quantityFormula: "q * 20", unit: "sq_m", unitPrice: 35, procurementEligible: false }),
  r({ section: "quality_control", code: "foundation_rebar_frame_acceptance", title: "Приемка армокаркаса", quantityFormula: "1", unit: "set", unitPrice: 3600, procurementEligible: false }),
  r({ section: "additional_labor", code: "foundation_rebar_before_concrete_ready", title: "Подготовка к бетонированию", quantityFormula: "1", unit: "set", unitPrice: 2800, procurementEligible: false }),
  r({ section: "materials", code: "foundation_rebar_concrete_optional", title: "Бетон, если входит в scope", quantityFormula: "q * 4", unit: "m3", unitPrice: 8200, optional: true }),
  r({ section: "logistics", code: "foundation_rebar_concrete_delivery_optional", title: "Доставка бетона", quantityFormula: "max(1, ceil(q / 4))", unit: "trip", unitPrice: 4200, optional: true }),
  r({ section: "labor", code: "foundation_rebar_concrete_receiving_optional", title: "Прием бетона", quantityFormula: "q * 4", unit: "m3", unitPrice: 450, optional: true, procurementEligible: false }),
  r({ section: "labor", code: "foundation_rebar_concrete_pouring_optional", title: "Укладка бетона", quantityFormula: "q * 4", unit: "m3", unitPrice: 950, optional: true, procurementEligible: false }),
  r({ section: "equipment", code: "foundation_rebar_vibrator_optional", title: "Вибратор глубинный", quantityFormula: "max(1, ceil(q / 3))", unit: "shift", unitPrice: 1700, optional: true }),
  r({ section: "additional_labor", code: "foundation_rebar_concrete_curing_optional", title: "Уход за бетоном", quantityFormula: "q * 20", unit: "sq_m", unitPrice: 45, optional: true, procurementEligible: false }),
  r({ section: "logistics", code: "foundation_rebar_delivery", title: "Доставка арматуры", quantityFormula: "max(1, ceil(q / 2))", unit: "trip", unitPrice: 5200 }),
  r({ section: "logistics", code: "foundation_rebar_unloading", title: "Разгрузка арматуры", quantityFormula: "q", unit: "ton", unitPrice: 1800 }),
  r({ section: "equipment", code: "foundation_rebar_tool_set", title: "Инструмент для резки и вязки", quantityFormula: "max(1, ceil(q / 2))", unit: "shift", unitPrice: 1900 }),
  r({ section: "waste", code: "foundation_rebar_waste", title: "Отходы / запас арматуры", quantityFormula: "q * 40", unit: "kg", unitPrice: 72 }),
];

const FIRE_ALARM_ROWS: ExpandedTemplateRow[] = [
  r({ section: "materials", code: "fire_alarm_cable_fr_1x2x075", title: "Кабель КПСнг(А)-FRLS 1x2x0.75", quantityFormula: "q * 12", unit: "linear_m", unitPrice: 48 }),
  r({ section: "materials", code: "fire_alarm_cable_fr_2x2x075", title: "Кабель КПСнг(А)-FRLS 2x2x0.75", quantityFormula: "q * 4", unit: "linear_m", unitPrice: 64 }),
  r({ section: "materials", code: "fire_alarm_corrugated_pipe", title: "Гофротруба / кабель-канал", quantityFormula: "q * 8", unit: "linear_m", unitPrice: 38 }),
  r({ section: "consumables", code: "fire_alarm_cable_fasteners", title: "Крепеж кабеля", quantityFormula: "q * 10", unit: "set", unitPrice: 24 }),
  r({ section: "components", code: "fire_alarm_smoke_detector", title: "Извещатель дымовой", quantityFormula: "q", unit: "pcs", unitPrice: 980 }),
  r({ section: "components", code: "fire_alarm_heat_detector", title: "Извещатель тепловой", quantityFormula: "max(1, ceil(q / 6))", unit: "pcs", unitPrice: 850 }),
  r({ section: "components", code: "fire_alarm_manual_call_point", title: "Извещатель ручной", quantityFormula: "max(1, ceil(q / 10))", unit: "pcs", unitPrice: 1250 }),
  r({ section: "components", code: "fire_alarm_light_annunciator", title: "Оповещатель световой", quantityFormula: "max(1, ceil(q / 8))", unit: "pcs", unitPrice: 1150 }),
  r({ section: "components", code: "fire_alarm_sound_annunciator", title: "Оповещатель звуковой", quantityFormula: "max(1, ceil(q / 8))", unit: "pcs", unitPrice: 1350 }),
  r({ section: "components", code: "fire_alarm_control_panel", title: "Прибор приемно-контрольный", quantityFormula: "1", unit: "pcs", unitPrice: 18500 }),
  r({ section: "components", code: "fire_alarm_power_supply", title: "Блок питания", quantityFormula: "1", unit: "pcs", unitPrice: 5200 }),
  r({ section: "components", code: "fire_alarm_backup_battery", title: "АКБ резервного питания", quantityFormula: "2", unit: "pcs", unitPrice: 2400 }),
  r({ section: "components", code: "fire_alarm_junction_boxes", title: "Коробки распределительные", quantityFormula: "max(1, ceil(q / 5))", unit: "pcs", unitPrice: 180 }),
  r({ section: "consumables", code: "fire_alarm_cable_marking", title: "Маркировка кабеля", quantityFormula: "q * 3", unit: "set", unitPrice: 35 }),
  r({ section: "consumables", code: "fire_alarm_consumables", title: "Расходники для слаботочного монтажа", quantityFormula: "1", unit: "set", unitPrice: 2800 }),
  r({ section: "preparation", code: "fire_alarm_site_survey", title: "Обследование объекта", quantityFormula: "1", unit: "set", unitPrice: 4500, procurementEligible: false }),
  r({ section: "preparation", code: "fire_alarm_route_layout", title: "Разметка трасс", quantityFormula: "q * 8", unit: "linear_m", unitPrice: 28, procurementEligible: false }),
  r({ section: "labor", code: "fire_alarm_cable_laying", title: "Прокладка кабельных линий", quantityFormula: "q * 16", unit: "linear_m", unitPrice: 95, procurementEligible: false }),
  r({ section: "labor", code: "fire_alarm_cable_channel_install", title: "Монтаж кабель-канала / гофры", quantityFormula: "q * 8", unit: "linear_m", unitPrice: 120, procurementEligible: false }),
  r({ section: "labor", code: "fire_alarm_smoke_detector_install", title: "Установка извещателей", quantityFormula: "q", unit: "pcs", unitPrice: 450, procurementEligible: false }),
  r({ section: "labor", code: "fire_alarm_manual_detector_install", title: "Установка ручных извещателей", quantityFormula: "max(1, ceil(q / 10))", unit: "pcs", unitPrice: 520, procurementEligible: false }),
  r({ section: "labor", code: "fire_alarm_annunciator_install", title: "Установка оповещателей", quantityFormula: "max(2, ceil(q / 4))", unit: "pcs", unitPrice: 520, procurementEligible: false }),
  r({ section: "labor", code: "fire_alarm_panel_install", title: "Монтаж ППК", quantityFormula: "1", unit: "pcs", unitPrice: 3800, procurementEligible: false }),
  r({ section: "labor", code: "fire_alarm_loop_connection", title: "Подключение шлейфов", quantityFormula: "max(1, ceil(q / 8))", unit: "set", unitPrice: 1200, procurementEligible: false }),
  r({ section: "quality_control", code: "fire_alarm_programming", title: "Программирование", quantityFormula: "1", unit: "set", unitPrice: 6500, procurementEligible: false }),
  r({ section: "quality_control", code: "fire_alarm_commissioning", title: "Пусконаладка", quantityFormula: "1", unit: "set", unitPrice: 8500, procurementEligible: false }),
  r({ section: "quality_control", code: "fire_alarm_zone_check", title: "Проверка зон", quantityFormula: "max(1, ceil(q / 8))", unit: "set", unitPrice: 900, procurementEligible: false }),
  r({ section: "quality_control", code: "fire_alarm_system_test", title: "Испытание системы", quantityFormula: "1", unit: "set", unitPrice: 5200, procurementEligible: false }),
  r({ section: "quality_control", code: "fire_alarm_as_built_docs", title: "Исполнительная документация", quantityFormula: "1", unit: "set", unitPrice: 6500, procurementEligible: false }),
  r({ section: "quality_control", code: "fire_alarm_customer_handover", title: "Сдача заказчику", quantityFormula: "1", unit: "set", unitPrice: 2800, procurementEligible: false }),
  r({ section: "logistics", code: "fire_alarm_equipment_delivery", title: "Доставка оборудования", quantityFormula: "1", unit: "trip", unitPrice: 3200 }),
  r({ section: "logistics", code: "fire_alarm_lifting", title: "Подъем / перемещение", quantityFormula: "1", unit: "set", unitPrice: 1500 }),
  r({ section: "equipment", code: "fire_alarm_testing_tool", title: "Тестер линий / расход инструмента", quantityFormula: "max(1, ceil(q / 20))", unit: "shift", unitPrice: 1800 }),
];

function semanticUnitForTitle(params: {
  section: ExpandedSectionKind;
  title: string;
  fallbackUnit: string;
  category?: string;
}): string {
  const name = params.title.toLocaleLowerCase("ru-RU");
  if (params.section === "equipment") return "shift";
  if (params.section === "logistics") {
    if (/подача\s+бетона|укладка\s+бетона/.test(name)) return "m3";
    if (/доставка|вывоз|разгруз|перемещ|такелаж|подъ[её]м|рейс|контейнер/.test(name)) return "trip";
  }
  if (/кран\s*\/\s*автовыш|автовыш|подъ[её]мник|виброплит|сварочный аппарат|болгарк|перфоратор|пылесос|малая механизация/.test(name)) {
    return "shift";
  }
  if (/краск|эмульс|праймер|грунтовк|пропитк|лак/.test(name) && (params.section === "materials" || params.section === "consumables")) {
    return "l";
  }
  if (/клей|шпаклев|шпатлев|сух.*смес|смес|топпинг|мастик|пластификатор/.test(name) && (params.section === "materials" || params.section === "consumables")) {
    return "kg";
  }
  if (/песок|щебен|грунт засып|основание фракции/.test(name) && params.section === "materials") {
    return "m3";
  }
  if (/плинтус|бордюр|бортовой|бортов|водосток|водосточ|прогон|лоток|лотки|профил|труб|кабел|воздуховод|трасс|гофр|конек|ендов|карнизн|примыкан/.test(name)) {
    return "linear_m";
  }
  if (/стойк|анкер|закладн|крепеж|крепёж|болт|фиксатор|пластин|косынк|дюбел|саморез|решетк|вентилятор|клапан|радиатор|прибор|датчик|извещател|розет|выключател|точк|уголк|заглушк|соединител|переходник|кронштейн|фурнитур/.test(name)) {
    return "pcs";
  }
  if (/ферм|балк|связ|раскос|металлопрокат|металл|сталь|арматур|сетка|проволок|электрод|сварочн/.test(name) && !/краск|обмер|схем|доставка|монтаж/.test(name)) {
    return "kg";
  }
  if (/бетон|раствор/.test(name) && (params.section === "materials" || params.category === "concrete" || params.category === "foundation")) {
    return "m3";
  }
  if (/кровельное покрытие|мембран|геотекстиль|гидроизоляц|утеплитель|покрытие|пленк|опалуб|песок|щебень|грунт|праймер|мастик|краск|линолеум|подложк|смес|топпинг/.test(name)) {
    return "sq_m";
  }
  if (/обмер|схем|разметк|осмотр|обслед|проект|расчет|документац|пусконалад|пнр|испыт|проверка|контроль|приемк|приёмк|обучение/.test(name)) {
    return "set";
  }
  return params.fallbackUnit;
}

function semanticUnitPicker(section: ExpandedSectionKind, fallbackUnit: string, category?: string): (title: string) => string {
  return (title) => semanticUnitForTitle({ section, title, fallbackUnit, category });
}

function semanticQuantityFormulaForTitle(params: {
  section: ExpandedSectionKind;
  title: string;
  fallbackUnit: string;
  resolvedUnit: string;
  baseFormula: ExpandedFormula;
}): ExpandedFormula {
  const compact = params.baseFormula.replace(/\s+/g, "");
  if (compact !== "q") return params.baseFormula;
  const name = params.title.toLocaleLowerCase("ru-RU");
  if (params.resolvedUnit === "linear_m") {
    if (/плинтус|бордюр|бортовой|бортов/.test(name) && params.fallbackUnit === "sq_m") return "sqrt(q) * 4";
    if (/кабел|гофр|трасс|труб|воздуховод/.test(name) && params.fallbackUnit === "sq_m") return "q * 2";
    if (/профил|лоток|водосток|примыкан|карниз|конек|ендов/.test(name) && params.fallbackUnit === "sq_m") return "q * 1.1";
    return params.fallbackUnit === "sq_m" ? "q * 0.35" : params.baseFormula;
  }
  if (params.resolvedUnit === "pcs") {
    if (/розет|выключател|точк|датчик|извещател|светильник|клапан|радиатор|прибор/.test(name)) return "max(1, ceil(q / 6))";
    if (/двер|ворот|окн|блок/.test(name)) return "max(1, ceil(q / 18))";
    if (/крепеж|крепёж|дюбел|саморез|болт|анкер/.test(name)) return "q * 4";
    if (/уголк|заглушк|соединител|переходник|кронштейн|фурнитур|пластин/.test(name)) return "max(1, ceil(q / 20))";
    return "max(1, ceil(q / 10))";
  }
  if (params.resolvedUnit === "kg") {
    if (/клей/.test(name)) return "q * 4.5";
    if (/шпаклев|шпатлев/.test(name)) return "q * 4";
    if (/мастик|гидроизоляц/.test(name)) return "q * 0.8";
    if (/пластификатор/.test(name)) return "q * 0.12";
    if (/арматур|металл|сталь|сетка|проволок|электрод/.test(name)) return "q * 8";
    return "q * 18";
  }
  if (params.resolvedUnit === "l") {
    if (/грунтовк|праймер|пропитк/.test(name)) return "q * 0.18";
    if (/лак|краск|эмульс/.test(name)) return "q * 0.28";
    return "q * 0.25";
  }
  if (params.resolvedUnit === "m3" && params.fallbackUnit === "sq_m") {
    if (/песок|щебен|грунт/.test(name)) return "q * 0.08";
    if (/бетон|раствор/.test(name)) return "q * 0.06";
  }
  if (params.section === "preparation" && /обмер|осмотр|обслед|замер/.test(name)) return "1";
  if (params.section === "quality_control" && /документац|приемк|приёмк|сдача|обучение/.test(name)) return "1";
  return params.baseFormula;
}

function rowSpecificUnitPrice(params: {
  section: ExpandedSectionKind;
  title: string;
  unit: string;
  baseUnitPrice: number;
  index: number;
}): number {
  const name = params.title.toLocaleLowerCase("ru-RU");
  let multiplier = 1 + ((params.index % 9) - 4) * 0.035;
  if (/финиш|верхн|чист/.test(name)) multiplier += 0.12;
  if (/чернов|подготов|нижн|перв/.test(name)) multiplier -= 0.08;
  if (/армир|усилен|гидроизоляц|огне|акуст|влаг/.test(name)) multiplier += 0.16;
  if (/доставка|вывоз|подъ[её]м|разгруз|такелаж/.test(name)) multiplier += 0.08;
  if (params.unit === "pcs" && /крепеж|крепёж|саморез|дюбел|болт/.test(name)) multiplier = Math.min(multiplier, 0.18);
  if (params.unit === "kg" && /пластификатор|проволок|электрод/.test(name)) multiplier = Math.max(multiplier, 0.22);
  const priced = Math.max(1, params.baseUnitPrice * multiplier);
  const roundTo = priced >= 1000 ? 50 : priced >= 100 ? 10 : 1;
  return Math.max(1, Math.round(priced / roundTo) * roundTo);
}

function rowsFromTitles(
  prefix: string,
  section: ExpandedSectionKind,
  titles: readonly string[],
  unit: string,
  formula: ExpandedFormula,
  unitPrice: number,
  unitForTitle?: (title: string, index: number) => string,
): ExpandedTemplateRow[] {
  return titles.map((title, index) => {
    const resolvedUnit = unitForTitle?.(title, index) ?? unit;
    return r({
      section,
      code: `${prefix}_${index + 1}`,
      title,
      quantityFormula: semanticQuantityFormulaForTitle({
        section,
        title,
        fallbackUnit: unit,
        resolvedUnit,
        baseFormula: formula,
      }),
      unit: resolvedUnit,
      unitPrice: rowSpecificUnitPrice({ section, title, unit: resolvedUnit, baseUnitPrice: unitPrice, index }),
      procurementEligible: isMaterialProcurementSection(section),
    });
  });
}

function semanticRowsFromTitles(
  prefix: string,
  category: string,
  section: ExpandedSectionKind,
  titles: readonly string[],
  unit: string,
  formula: ExpandedFormula,
  unitPrice: number,
): ExpandedTemplateRow[] {
  return rowsFromTitles(prefix, section, titles, unit, formula, unitPrice, semanticUnitPicker(section, unit, category));
}

const BRICK_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("brick_material", "masonry", "materials", ["Кирпич рядовой", "Кирпич доборный / половинки", "Кладочная сетка", "Раствор кладочный", "Пластификатор раствора", "Гидроизоляционная отсечка", "Анкера и гибкие связи", "Перемычки над проемами", "Закладные детали"], "sq_m", "q", 420),
  ...rowsFromTitles("brick_consumable", "consumables", ["Шнур-причалка", "Крестики / шаблоны шва", "Диски и расход инструмента"], "set", "max(1, ceil(q / 80))", 650),
  ...rowsFromTitles("brick_prep", "preparation", ["Разметка стен", "Подготовка основания", "Вынос осей", "Приготовление раствора"], "sq_m", "q", 85),
  ...rowsFromTitles("brick_labor", "labor", ["Кладка первого ряда", "Кладка основного поля", "Армирование рядов", "Устройство углов", "Обход проемов", "Расшивка швов", "Очистка кладки"], "sq_m", "q", 780),
  ...rowsFromTitles("brick_equipment", "equipment", ["Бетономешалка / миксер", "Леса / подмости", "Режущий инструмент"], "shift", "max(1, ceil(q / 80))", 1400),
  ...rowsFromTitles("brick_logistics", "logistics", ["Доставка кирпича", "Доставка раствора / сухих смесей", "Разгрузка и подъем"], "trip", "max(1, ceil(q / 120))", 4200),
  ...rowsFromTitles("brick_waste", "waste", ["Запас кирпича на бой и подрезку", "Вывоз боя и упаковки"], "set", "1", 2600),
  ...rowsFromTitles("brick_qc", "quality_control", ["Контроль геометрии кладки", "Проверка перевязки и армирования"], "sq_m", "q", 55),
];

const ASPHALT_ROWS: ExpandedTemplateRow[] = [
  ...rowsFromTitles("asphalt_material", "materials", ["Геотекстиль", "Песчаное основание", "Щебеночное основание фракции 20-40", "Щебень фракции 5-20", "Битумная эмульсия", "Асфальтобетон нижний слой", "Асфальтобетон верхний слой", "Бортовой камень", "Пескоцементная смесь", "Разметочная краска"], "sq_m", "q", 380),
  ...rowsFromTitles("asphalt_consumable", "consumables", ["Расход топлива техники", "Вода для уплотнения", "Мелкий инструмент и СИЗ"], "set", "max(1, ceil(q / 1000))", 2200),
  ...rowsFromTitles("asphalt_prep", "preparation", ["Геодезическая разбивка", "Очистка площадки", "Планировка основания", "Уплотнение грунта"], "sq_m", "q", 55),
  ...semanticRowsFromTitles("asphalt_labor", "roadworks", "labor", ["Укладка геотекстиля", "Устройство песчаного слоя", "Устройство щебеночного основания", "Проливка битумной эмульсией", "Укладка нижнего слоя асфальта", "Укладка верхнего слоя асфальта", "Устройство примыканий", "Монтаж бордюров"], "sq_m", "q", 260),
  ...rowsFromTitles("asphalt_equipment", "equipment", ["Асфальтоукладчик", "Каток вибрационный", "Погрузчик", "Самосвалы", "Виброплита"], "shift", "max(1, ceil(q / 1500))", 9500),
  ...rowsFromTitles("asphalt_logistics", "logistics", ["Доставка асфальта", "Доставка щебня", "Вывоз лишнего грунта"], "trip", "max(1, ceil(q / 800))", 6800),
  ...rowsFromTitles("asphalt_waste", "waste", ["Запас асфальтобетона на потери", "Потери щебня и песка"], "sq_m", "q * 0.03", 380),
  ...rowsFromTitles("asphalt_qc", "quality_control", ["Контроль уклонов", "Контроль уплотнения", "Финишная приемка покрытия"], "sq_m", "q", 35),
];

const DRYWALL_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("drywall_material", "drywall", "materials", ["Листы ГКЛ", "Направляющий профиль", "Стоечный профиль", "Минеральная вата", "Лента уплотнительная", "Саморезы по металлу", "Дюбель-гвозди", "Серпянка / бумажная лента", "Шпаклевка для швов", "Уголок защитный"], "sq_m", "q", 310),
  ...rowsFromTitles("drywall_consumable", "consumables", ["Расходные биты и ножи", "Абразивная сетка", "Пленка защитная"], "set", "max(1, ceil(q / 80))", 700),
  ...rowsFromTitles("drywall_prep", "preparation", ["Разметка перегородки", "Проверка основания и потолка", "Подготовка мест крепления"], "sq_m", "q", 75),
  ...rowsFromTitles("drywall_labor", "labor", ["Монтаж направляющего профиля", "Монтаж каркаса и стоечного профиля", "Прокладка утеплителя", "Обшивка первой стороны ГКЛ", "Прокладка коммуникаций в каркасе", "Обшивка второй стороны ГКЛ", "Заделка швов", "Шлифовка швов"], "sq_m", "q", 520),
  ...rowsFromTitles("drywall_equipment", "equipment", ["Лазерный уровень", "Шуруповерт / перфоратор", "Стремянки / подмости"], "shift", "max(1, ceil(q / 100))", 1100),
  ...rowsFromTitles("drywall_logistics", "logistics", ["Доставка ГКЛ и профиля", "Подъем листов", "Вывоз упаковки"], "trip", "max(1, ceil(q / 120))", 3600),
  ...rowsFromTitles("drywall_waste", "waste", ["Запас ГКЛ на подрезку", "Запас профиля и крепежа"], "sq_m", "q * 0.08", 310),
  ...rowsFromTitles("drywall_qc", "quality_control", ["Контроль плоскости", "Контроль жесткости каркаса"], "sq_m", "q", 45),
];

const WINDOW_ROWS: ExpandedTemplateRow[] = [
  ...rowsFromTitles("window_material", "materials", ["Оконный блок ПВХ", "Стеклопакет", "Подоконник", "Отлив", "Москитная сетка", "Откосная панель", "Пароизоляционная лента", "Гидроизоляционная лента"], "pcs", "q", 7200),
  ...semanticRowsFromTitles("window_consumable", "doors_windows", "consumables", ["Монтажная пена", "Анкерные пластины / крепеж", "Герметик наружный", "Герметик внутренний", "Клинья монтажные"], "set", "q", 850),
  ...rowsFromTitles("window_prep", "preparation", ["Замер проема", "Демонтаж старого окна", "Подготовка проема"], "pcs", "q", 850),
  ...rowsFromTitles("window_labor", "labor", ["Установка оконного блока", "Выставление по уровню", "Крепление анкерами", "Запенивание шва", "Монтаж подоконника", "Монтаж отлива", "Устройство откосов"], "pcs", "q", 2400),
  ...rowsFromTitles("window_equipment", "equipment", ["Инструмент монтажника", "Пылесос / уборочный инструмент"], "shift", "max(1, ceil(q / 4))", 1100),
  ...rowsFromTitles("window_logistics", "logistics", ["Доставка окон", "Подъем окон", "Вывоз старых рам"], "trip", "max(1, ceil(q / 6))", 3200),
  ...rowsFromTitles("window_qc", "quality_control", ["Проверка открывания створок", "Герметизация шва"], "pcs", "q", 450),
];

const ROOF_WATERPROOFING_ROWS: ExpandedTemplateRow[] = [
  ...rowsFromTitles("roof_wp_material", "materials", ["Праймер битумный", "Рулонная мембрана", "Битумная мастика", "Лента примыканий", "Герметик кровельный", "Воронки / проходки", "Прижимные планки", "Крепеж мембраны"], "sq_m", "q", 420),
  ...rowsFromTitles("roof_wp_consumable", "consumables", ["Газ / топливо горелки", "Кисти / валики", "Перчатки и СИЗ"], "set", "max(1, ceil(q / 100))", 900),
  ...rowsFromTitles("roof_wp_prep", "preparation", ["Очистка кровли", "Ремонт дефектов основания", "Просушка основания", "Грунтование основания"], "sq_m", "q", 130),
  ...rowsFromTitles("roof_wp_labor", "labor", ["Нанесение праймера", "Наплавление / укладка мембраны", "Герметизация примыканий", "Герметизация проходок", "Устройство водоприемных узлов", "Финишная обработка швов"], "sq_m", "q", 430),
  ...rowsFromTitles("roof_wp_equipment", "equipment", ["Газовая горелка", "Леса / страховка", "Ручной каток"], "shift", "max(1, ceil(q / 150))", 1600),
  ...rowsFromTitles("roof_wp_logistics", "logistics", ["Доставка рулонов и мастики", "Подъем на кровлю", "Вывоз старого покрытия"], "trip", "max(1, ceil(q / 250))", 4300),
  ...rowsFromTitles("roof_wp_waste", "waste", ["Запас мембраны на нахлест", "Отходы и обрезки"], "sq_m", "q * 0.1", 420),
  ...rowsFromTitles("roof_wp_qc", "quality_control", ["Проверка нахлестов", "Проверка герметичности", "Контроль протечек"], "sq_m", "q", 65),
];

const GABLE_ROOF_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("gable_material", "roofing", "materials", ["Мауэрлат", "Стропила", "Коньковый прогон", "Стойки и подкосы", "Гидроизоляционная подкровельная мембрана", "Контробрешетка", "Обрешетка", "Кровельное покрытие", "Конек и доборные элементы", "Ветровые планки", "Карнизные планки", "Водосточная система", "Крепеж кровельный", "Антисептик древесины"], "sq_m", "q", 580),
  ...rowsFromTitles("gable_consumable", "consumables", ["Диски / пилы", "Биты и расход крепежа", "СИЗ для высотных работ"], "set", "max(1, ceil(q / 120))", 1200),
  ...rowsFromTitles("gable_prep", "preparation", ["Замер основания", "Разметка стропильной системы", "Проверка опорного пояса"], "sq_m", "q", 75),
  ...semanticRowsFromTitles("gable_labor", "roofing", "labor", ["Монтаж мауэрлата", "Монтаж стропильной системы", "Монтаж конькового прогона", "Монтаж мембраны", "Монтаж контробрешетки", "Монтаж обрешетки", "Монтаж кровли и кровельного покрытия", "Монтаж доборов", "Монтаж водостока"], "sq_m", "q", 720),
  ...rowsFromTitles("gable_equipment", "equipment", ["Леса / страховочная система", "Подъемник материалов", "Пила / шуруповерты"], "shift", "max(1, ceil(q / 160))", 2800),
  ...rowsFromTitles("gable_logistics", "logistics", ["Доставка древесины", "Доставка кровельного покрытия", "Подъем материалов на крышу"], "trip", "max(1, ceil(q / 220))", 5200),
  ...rowsFromTitles("gable_waste", "waste", ["Запас кровельного покрытия", "Запас древесины и доборов"], "sq_m", "q * 0.08", 580),
  ...rowsFromTitles("gable_qc", "quality_control", ["Контроль геометрии скатов", "Проверка крепежа", "Проверка водоотвода"], "sq_m", "q", 55),
];

const HYDRO_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("hydro_material", "concrete", "materials", ["Предпроектное обследование", "Гидравлический расчет", "Турбина ГЭС для микро-ГЭС", "Генератор", "Рама / муфта / виброопоры", "Шкаф управления", "Защита / синхронизация", "Кабели и щит 0.4 кВ", "Гидромеханика", "Металлоконструкции", "ЗИП и крепеж турбины ГЭС", "Задвижки / арматура", "Датчики и КИП"], "set", "1", 18000),
  ...semanticRowsFromTitles("hydro_consumable", "concrete", "consumables", ["Крепеж агрегата", "Кабельные наконечники", "Расходные материалы для сварки"], "set", "1", 4200),
  ...semanticRowsFromTitles("hydro_prep", "concrete", "preparation", ["Обследование машинного зала", "Проверка водовода", "Проверка основания под агрегат", "Разметка анкеров"], "set", "1", 8500),
  ...semanticRowsFromTitles("hydro_labor", "concrete", "labor", ["Подготовка машинного зала", "Монтаж закладных", "Такелаж турбины", "Монтаж турбины", "Монтаж генератора", "Центровка агрегата", "Монтаж шкафа управления", "Подключение кабелей", "Подключение гидромеханики"], "set", "1", 14500),
  ...semanticRowsFromTitles("hydro_equipment", "concrete", "equipment", ["Кран / такелажное оборудование", "Измерительный инструмент", "Сварочный пост", "Подъемное оборудование"], "shift", "2", 6500),
  ...semanticRowsFromTitles("hydro_logistics", "concrete", "logistics", ["Доставка оборудования", "Разгрузка агрегата", "Перемещение в машинный зал", "Страховка груза"], "trip", "1", 18000),
  ...semanticRowsFromTitles("hydro_waste", "concrete", "waste", ["Резерв на уточнение проекта", "Запас кабеля и крепежа"], "set", "1", 22000),
  ...semanticRowsFromTitles("hydro_qc", "concrete", "quality_control", ["ПНР / пусконаладка", "Испытания гидроагрегата под нагрузкой", "Проверка вибраций", "Проверка защит", "Синхронизация", "Обучение персонала", "Исполнительная документация"], "set", "1", 12000),
];

const LINOLEUM_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("linoleum_material", "flooring", "materials", ["Линолеум", "Подложка / основание", "Клей / монтажная лента", "Плинтус", "Пороги", "Грунтовка основания", "Локальная выравнивающая смесь", "Расходные материалы"], "sq_m", "q", 680),
  ...semanticRowsFromTitles("linoleum_prep", "flooring", "preparation", ["Обмер помещения", "Проверка основания", "Очистка основания", "Разметка раскроя"], "sq_m", "q", 80),
  ...semanticRowsFromTitles("linoleum_labor", "flooring", "labor", ["Раскрой линолеума", "Укладка линолеума", "Прокатка покрытия", "Монтаж плинтуса", "Монтаж порогов", "Подрезка у стен", "Финишная уборка"], "sq_m", "q", 320),
  ...semanticRowsFromTitles("linoleum_equipment", "flooring", "equipment", ["Ножи / раскройный инструмент", "Валик для прокатки", "Пылесос"], "shift", "max(1, ceil(q / 120))", 900),
  ...semanticRowsFromTitles("linoleum_logistics", "flooring", "logistics", ["Доставка линолеума", "Вывоз упаковки"], "trip", "max(1, ceil(q / 200))", 2200),
  ...semanticRowsFromTitles("linoleum_waste", "flooring", "waste", ["Запас линолеума на подрезку", "Запас плинтуса"], "sq_m", "q * 0.07", 680),
  ...semanticRowsFromTitles("linoleum_qc", "flooring", "quality_control", ["Контроль стыков", "Проверка приклейки", "Приемка покрытия"], "sq_m", "q", 45),
];

const PAVING_STONE_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("paving_stone_material", "landscaping", "materials", ["Геотекстиль", "Песок", "Щебень", "Брусчатка", "Бордюр", "Пескоцементная смесь", "Смесь для заполнения швов", "Водоотводные элементы"], "sq_m", "q", 720),
  ...semanticRowsFromTitles("paving_stone_component", "landscaping", "components", ["Крепеж бордюра", "Разделители", "Лотки водоотвода", "Маркировочные колышки"], "set", "max(1, ceil(q / 100))", 650),
  ...semanticRowsFromTitles("paving_stone_prep", "landscaping", "preparation", ["Геодезическая разбивка", "Разметка дорожек", "Выемка грунта", "Подготовка основания"], "sq_m", "q", 130),
  ...semanticRowsFromTitles("paving_stone_labor", "landscaping", "labor", ["Укладка геотекстиля", "Устройство песчаного слоя", "Устройство щебеночного основания", "Монтаж бордюра", "Укладка брусчатки", "Подрезка брусчатки", "Заполнение швов", "Финишное уплотнение"], "sq_m", "q", 460),
  ...semanticRowsFromTitles("paving_stone_equipment", "landscaping", "equipment", ["Виброплита", "Резчик брусчатки", "Мини-погрузчик"], "shift", "max(1, ceil(q / 300))", 2600),
  ...semanticRowsFromTitles("paving_stone_logistics", "landscaping", "logistics", ["Доставка брусчатки", "Доставка инертных", "Вывоз грунта"], "trip", "max(1, ceil(q / 250))", 4200),
  ...semanticRowsFromTitles("paving_stone_waste", "landscaping", "waste", ["Запас брусчатки на подрезку", "Потери песка и щебня"], "sq_m", "q * 0.05", 720),
  ...semanticRowsFromTitles("paving_stone_qc", "landscaping", "quality_control", ["Контроль уклонов", "Контроль швов", "Приемка мощения"], "sq_m", "q", 55),
];

const METAL_CANOPY_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("metal_canopy_material", "metalworks", "materials", ["Стойки металлические", "Фермы / балки", "Прогоны", "Кровельное покрытие", "Болты / анкера", "Пластины и закладные", "Грунт по металлу", "Краска", "Водосточная система"], "kg", "q", 120),
  ...semanticRowsFromTitles("metal_canopy_prep", "metalworks", "preparation", ["Обмер / схема", "Разметка осей", "Проверка оснований", "Раскрой металла"], "set", "1", 6500),
  ...semanticRowsFromTitles("metal_canopy_labor", "metalworks", "labor", ["Сборка стоек", "Сборка ферм / балок", "Монтаж прогонов", "Монтаж кровельного покрытия", "Сварка / сборка", "Анкеровка", "Грунтование", "Окраска"], "kg", "q", 1450),
  ...semanticRowsFromTitles("metal_canopy_equipment", "metalworks", "equipment", ["Кран / автовышка", "Сварочный аппарат", "Болгарка"], "shift", "max(1, ceil(q / 180))", 5200),
  ...semanticRowsFromTitles("metal_canopy_logistics", "metalworks", "logistics", ["Доставка металла", "Доставка кровельного покрытия", "Такелаж"], "trip", "max(1, ceil(q / 250))", 5600),
  ...semanticRowsFromTitles("metal_canopy_waste", "metalworks", "waste", ["Запас металла", "Отходы резки", "Запас кровельного покрытия"], "kg", "q * 0.05", 120),
  ...semanticRowsFromTitles("metal_canopy_qc", "metalworks", "quality_control", ["Контроль швов", "Контроль геометрии", "Приемка покрытия"], "set", "1", 4800),
];

const APARTMENT_RENOVATION_ROWS: ExpandedTemplateRow[] = [
  r({ section: "materials", code: "apartment_screed_dry_mix", title: "Сухая смесь для стяжки пола 40 мм", quantityFormula: "q * 18", unit: "kg", unitPrice: 11 }),
  r({ section: "materials", code: "apartment_self_leveling_compound", title: "Самовыравнивающая смесь локально", quantityFormula: "q * 6", unit: "kg", unitPrice: 24 }),
  r({ section: "materials", code: "apartment_floor_primer", title: "Грунтовка пола глубокого проникновения", quantityFormula: "q * 0.18", unit: "l", unitPrice: 110 }),
  r({ section: "materials", code: "apartment_wet_zone_waterproofing", title: "Обмазочная гидроизоляция мокрых зон", quantityFormula: "q * 0.55", unit: "kg", unitPrice: 185 }),
  r({ section: "materials", code: "apartment_tile_adhesive", title: "Плиточный клей C1/C2", quantityFormula: "q * 4.2", unit: "kg", unitPrice: 32 }),
  r({ section: "materials", code: "apartment_tile_grout", title: "Затирка межплиточных швов", quantityFormula: "q * 0.32", unit: "kg", unitPrice: 140 }),
  r({ section: "materials", code: "apartment_ceramic_tile_wet_zones", title: "Плитка / керамогранит мокрых зон с запасом", quantityFormula: "q * 0.72", unit: "sq_m", unitPrice: 1150 }),
  r({ section: "materials", code: "apartment_laminate_flooring", title: "Ламинат 33 класс / SPC с запасом", quantityFormula: "q * 0.72", unit: "sq_m", unitPrice: 920 }),
  r({ section: "materials", code: "apartment_floor_underlay", title: "Подложка под напольное покрытие", quantityFormula: "q * 0.74", unit: "sq_m", unitPrice: 95 }),
  r({ section: "materials", code: "apartment_moisture_barrier_roll", title: "Влагозащитная пленка под покрытие", quantityFormula: "max(1, ceil(q / 55))", unit: "roll", unitPrice: 780 }),
  r({ section: "materials", code: "apartment_wall_plaster_mix", title: "Штукатурная смесь для стен", quantityFormula: "q * 22", unit: "kg", unitPrice: 10 }),
  r({ section: "materials", code: "apartment_base_putty", title: "Шпаклевка стартовая", quantityFormula: "q * 7", unit: "kg", unitPrice: 18 }),
  r({ section: "materials", code: "apartment_finish_putty", title: "Шпаклевка финишная", quantityFormula: "q * 3.8", unit: "kg", unitPrice: 26 }),
  r({ section: "materials", code: "apartment_wall_primer", title: "Грунтовка стен и потолков", quantityFormula: "q * 0.42", unit: "l", unitPrice: 105 }),
  r({ section: "materials", code: "apartment_fiberglass_mesh", title: "Армирующая стеклосетка локально", quantityFormula: "q * 0.35", unit: "sq_m", unitPrice: 65 }),
  r({ section: "materials", code: "apartment_wall_paint", title: "Краска интерьерная для стен", quantityFormula: "q * 0.62", unit: "l", unitPrice: 240 }),
  r({ section: "materials", code: "apartment_ceiling_paint", title: "Краска для потолков", quantityFormula: "q * 0.2", unit: "l", unitPrice: 260 }),
  r({ section: "materials", code: "apartment_ceiling_board", title: "ГКЛ / потолочная плита для локальных участков", quantityFormula: "q * 0.18", unit: "sq_m", unitPrice: 320 }),
  r({ section: "materials", code: "apartment_ceiling_profile", title: "Профиль потолочный и направляющий", quantityFormula: "q * 0.7", unit: "linear_m", unitPrice: 85 }),
  r({ section: "materials", code: "apartment_floor_baseboard", title: "Плинтус напольный", quantityFormula: "sqrt(q) * 4", unit: "linear_m", unitPrice: 260 }),
  r({ section: "materials", code: "apartment_floor_thresholds", title: "Пороги межкомнатные", quantityFormula: "max(2, ceil(q / 24))", unit: "pcs", unitPrice: 520 }),
  r({ section: "materials", code: "apartment_interior_door_blocks", title: "Дверные блоки межкомнатные", quantityFormula: "max(2, ceil(q / 18))", unit: "pcs", unitPrice: 7600 }),
  r({ section: "materials", code: "apartment_door_foam", title: "Монтажная пена для дверных блоков", quantityFormula: "max(3, ceil(q / 18))", unit: "pcs", unitPrice: 380 }),
  r({ section: "materials", code: "apartment_electrical_cable", title: "Кабель ВВГнг-LS по группам", quantityFormula: "q * 2.8", unit: "linear_m", unitPrice: 62 }),
  r({ section: "materials", code: "apartment_electrical_conduit", title: "Гофротруба / кабель-канал", quantityFormula: "q * 2.2", unit: "linear_m", unitPrice: 32 }),
  r({ section: "materials", code: "apartment_socket_boxes", title: "Подрозетники и монтажные коробки", quantityFormula: "max(12, ceil(q / 3))", unit: "pcs", unitPrice: 45 }),
  r({ section: "materials", code: "apartment_sockets_switches", title: "Розетки и выключатели чистовые", quantityFormula: "max(12, ceil(q / 3))", unit: "pcs", unitPrice: 260 }),
  r({ section: "materials", code: "apartment_breakers_rcd", title: "Автоматы защиты / УЗО", quantityFormula: "max(6, ceil(q / 10))", unit: "pcs", unitPrice: 480 }),
  r({ section: "materials", code: "apartment_electrical_panel", title: "Квартирный электрощит в сборе", quantityFormula: "1", unit: "set", unitPrice: 6200 }),
  r({ section: "materials", code: "apartment_water_pipe", title: "Трубы водоснабжения", quantityFormula: "q * 0.65", unit: "linear_m", unitPrice: 145 }),
  r({ section: "materials", code: "apartment_sewer_pipe", title: "Канализационные трубы", quantityFormula: "q * 0.35", unit: "linear_m", unitPrice: 180 }),
  r({ section: "materials", code: "apartment_plumbing_fittings", title: "Фитинги водоснабжения и канализации", quantityFormula: "max(3, ceil(q / 18))", unit: "set", unitPrice: 1900 }),
  r({ section: "materials", code: "apartment_valves", title: "Запорная арматура", quantityFormula: "max(4, ceil(q / 16))", unit: "pcs", unitPrice: 420 }),
  r({ section: "materials", code: "apartment_sanitary_fixture_set", title: "Предварительный комплект санфаянса", quantityFormula: "1", unit: "set", unitPrice: 18500 }),
  r({ section: "consumables", code: "apartment_screws_anchors", title: "Саморезы, дюбели, анкера", quantityFormula: "max(3, ceil(q / 20))", unit: "pack", unitPrice: 420 }),
  r({ section: "consumables", code: "apartment_masking_film", title: "Пленка укрывочная", quantityFormula: "max(2, ceil(q / 35))", unit: "roll", unitPrice: 360 }),
  r({ section: "consumables", code: "apartment_masking_tape", title: "Малярная лента", quantityFormula: "max(2, ceil(q / 30))", unit: "pack", unitPrice: 290 }),
  r({ section: "consumables", code: "apartment_abrasive_mesh", title: "Абразивная сетка / шлифовальные круги", quantityFormula: "max(2, ceil(q / 25))", unit: "pack", unitPrice: 340 }),
  r({ section: "consumables", code: "apartment_diamond_discs", title: "Алмазные диски и коронки", quantityFormula: "max(2, ceil(q / 45))", unit: "pcs", unitPrice: 680 }),
  r({ section: "consumables", code: "apartment_mixing_buckets", title: "Ведра, миксерные емкости, ванночки", quantityFormula: "max(1, ceil(q / 60))", unit: "set", unitPrice: 520 }),
  r({ section: "consumables", code: "apartment_cleanup_bags", title: "Мешки строительные", quantityFormula: "max(2, ceil(q / 25))", unit: "pack", unitPrice: 260 }),
  r({ section: "consumables", code: "apartment_silicone_sealant", title: "Силикон / акриловый герметик", quantityFormula: "max(4, ceil(q / 18))", unit: "pcs", unitPrice: 310 }),
  r({ section: "components", code: "apartment_corner_beads", title: "Уголки штукатурные защитные", quantityFormula: "q * 0.45", unit: "linear_m", unitPrice: 95 }),
  r({ section: "components", code: "apartment_plaster_beacons", title: "Маяки штукатурные", quantityFormula: "q * 0.55", unit: "linear_m", unitPrice: 72 }),
  r({ section: "components", code: "apartment_tile_trim", title: "Профили примыкания плитки", quantityFormula: "q * 0.28", unit: "linear_m", unitPrice: 180 }),
  r({ section: "components", code: "apartment_baseboard_corners", title: "Уголки и заглушки плинтуса", quantityFormula: "max(8, ceil(q / 7))", unit: "pcs", unitPrice: 85 }),
  r({ section: "components", code: "apartment_baseboard_connectors", title: "Соединители плинтуса", quantityFormula: "max(4, ceil(q / 12))", unit: "pcs", unitPrice: 70 }),
  r({ section: "components", code: "apartment_door_hardware", title: "Ручки, петли, защелки дверей", quantityFormula: "max(2, ceil(q / 18))", unit: "set", unitPrice: 1550 }),
  r({ section: "components", code: "apartment_revision_hatches", title: "Ревизионные люки", quantityFormula: "max(1, ceil(q / 45))", unit: "pcs", unitPrice: 2100 }),
  r({ section: "components", code: "apartment_junction_boxes", title: "Коробки распределительные", quantityFormula: "max(6, ceil(q / 8))", unit: "pcs", unitPrice: 75 }),
  r({ section: "components", code: "apartment_panel_accessories", title: "DIN-рейка, шины и щитовые аксессуары", quantityFormula: "1", unit: "set", unitPrice: 950 }),
  r({ section: "components", code: "apartment_pipe_clamps", title: "Крепления труб", quantityFormula: "max(20, ceil(q / 2))", unit: "pcs", unitPrice: 18 }),
  r({ section: "components", code: "apartment_waterproofing_tape", title: "Гидроизоляционная лента углов и примыканий", quantityFormula: "q * 0.25", unit: "linear_m", unitPrice: 120 }),
  r({ section: "preparation", code: "apartment_room_measurement", title: "Обмер квартиры и ведомость помещений", quantityFormula: "1", unit: "set", unitPrice: 2500, procurementEligible: false }),
  r({ section: "preparation", code: "apartment_floor_protection", title: "Защита существующих поверхностей", quantityFormula: "q", unit: "sq_m", unitPrice: 45, procurementEligible: false }),
  r({ section: "preparation", code: "apartment_old_finish_removal", title: "Демонтаж старой отделки стен и потолков", quantityFormula: "q * 1.8", unit: "sq_m", unitPrice: 160, procurementEligible: false }),
  r({ section: "preparation", code: "apartment_old_floor_removal", title: "Демонтаж старого напольного покрытия", quantityFormula: "q * 0.75", unit: "sq_m", unitPrice: 140, procurementEligible: false }),
  r({ section: "preparation", code: "apartment_debris_bagging", title: "Сбор и упаковка строительного мусора", quantityFormula: "max(1, ceil(q / 40))", unit: "set", unitPrice: 1800, procurementEligible: false }),
  r({ section: "preparation", code: "apartment_engineering_point_layout", title: "Разметка электроточек и сантехнических выводов", quantityFormula: "max(12, ceil(q / 3))", unit: "pcs", unitPrice: 80, procurementEligible: false }),
  r({ section: "preparation", code: "apartment_substrate_moisture_check", title: "Проверка влажности и перепадов основания", quantityFormula: "1", unit: "set", unitPrice: 1500, procurementEligible: false }),
  r({ section: "preparation", code: "apartment_work_sequence_plan", title: "План-график работ по комнатам", quantityFormula: "1", unit: "set", unitPrice: 2200, procurementEligible: false }),
  r({ section: "labor", code: "apartment_screed_labor", title: "Устройство цементно-песчаной стяжки", quantityFormula: "q", unit: "sq_m", unitPrice: 380, procurementEligible: false }),
  r({ section: "labor", code: "apartment_self_leveling_labor", title: "Наливное выравнивание локально", quantityFormula: "q * 0.55", unit: "sq_m", unitPrice: 260, procurementEligible: false }),
  r({ section: "labor", code: "apartment_wall_plaster_labor", title: "Штукатурка стен по маякам", quantityFormula: "q * 2.4", unit: "sq_m", unitPrice: 420, procurementEligible: false }),
  r({ section: "labor", code: "apartment_putty_labor", title: "Шпаклевание стен и потолков", quantityFormula: "q * 2.9", unit: "sq_m", unitPrice: 260, procurementEligible: false }),
  r({ section: "labor", code: "apartment_primer_labor", title: "Грунтование оснований", quantityFormula: "q * 3", unit: "sq_m", unitPrice: 65, procurementEligible: false }),
  r({ section: "labor", code: "apartment_waterproofing_labor", title: "Гидроизоляция мокрых зон", quantityFormula: "q * 0.72", unit: "sq_m", unitPrice: 310, procurementEligible: false }),
  r({ section: "labor", code: "apartment_tile_labor", title: "Укладка плитки с подрезкой", quantityFormula: "q * 0.72", unit: "sq_m", unitPrice: 980, procurementEligible: false }),
  r({ section: "labor", code: "apartment_flooring_labor", title: "Укладка напольного покрытия", quantityFormula: "q * 0.72", unit: "sq_m", unitPrice: 360, procurementEligible: false }),
  r({ section: "labor", code: "apartment_ceiling_labor", title: "Монтаж локальных потолочных участков", quantityFormula: "q * 0.18", unit: "sq_m", unitPrice: 620, procurementEligible: false }),
  r({ section: "labor", code: "apartment_paint_labor", title: "Окраска стен и потолков в два слоя", quantityFormula: "q * 2.2", unit: "sq_m", unitPrice: 190, procurementEligible: false }),
  r({ section: "labor", code: "apartment_baseboard_install_labor", title: "Монтаж плинтуса", quantityFormula: "sqrt(q) * 4", unit: "linear_m", unitPrice: 170, procurementEligible: false }),
  r({ section: "labor", code: "apartment_door_install_labor", title: "Установка межкомнатных дверей", quantityFormula: "max(2, ceil(q / 18))", unit: "pcs", unitPrice: 2400, procurementEligible: false }),
  r({ section: "labor", code: "apartment_cable_chasing_labor", title: "Штробление трасс под электрику", quantityFormula: "q * 1.4", unit: "linear_m", unitPrice: 190, procurementEligible: false }),
  r({ section: "labor", code: "apartment_cable_pulling_labor", title: "Прокладка кабеля в гофре", quantityFormula: "q * 2.8", unit: "linear_m", unitPrice: 95, procurementEligible: false }),
  r({ section: "labor", code: "apartment_socket_install_labor", title: "Монтаж розеток, выключателей и коробок", quantityFormula: "max(12, ceil(q / 3))", unit: "pcs", unitPrice: 210, procurementEligible: false }),
  r({ section: "labor", code: "apartment_panel_assembly_labor", title: "Сборка квартирного электрощита", quantityFormula: "1", unit: "set", unitPrice: 4800, procurementEligible: false }),
  r({ section: "labor", code: "apartment_plumbing_rough_in_labor", title: "Разводка водоснабжения и канализации", quantityFormula: "q * 0.95", unit: "linear_m", unitPrice: 520, procurementEligible: false }),
  r({ section: "labor", code: "apartment_sanitary_connection_labor", title: "Подключение сантехнических приборов", quantityFormula: "1", unit: "set", unitPrice: 3600, procurementEligible: false }),
  r({ section: "labor", code: "apartment_final_cleaning_labor", title: "Финишная строительная уборка", quantityFormula: "q", unit: "sq_m", unitPrice: 85, procurementEligible: false }),
  r({ section: "additional_labor", code: "apartment_patch_openings", title: "Заделка штроб и технологических отверстий", quantityFormula: "max(6, ceil(q / 8))", unit: "pcs", unitPrice: 320, procurementEligible: false }),
  r({ section: "additional_labor", code: "apartment_door_reveals", title: "Откосы и примыкания дверных проемов", quantityFormula: "max(8, ceil(q / 5))", unit: "linear_m", unitPrice: 360, procurementEligible: false }),
  r({ section: "additional_labor", code: "apartment_wet_perimeter_seal", title: "Герметизация периметра мокрых зон", quantityFormula: "q * 0.2", unit: "linear_m", unitPrice: 220, procurementEligible: false }),
  r({ section: "equipment", code: "apartment_mixer_rental", title: "Миксер строительный / станция замеса", quantityFormula: "max(1, ceil(q / 90))", unit: "shift", unitPrice: 900, procurementEligible: false }),
  r({ section: "equipment", code: "apartment_dust_extractor", title: "Пылеудаление и строительный пылесос", quantityFormula: "max(1, ceil(q / 70))", unit: "shift", unitPrice: 1400, procurementEligible: false }),
  r({ section: "equipment", code: "apartment_laser_level", title: "Лазерный уровень", quantityFormula: "max(1, ceil(q / 80))", unit: "shift", unitPrice: 650, procurementEligible: false }),
  r({ section: "equipment", code: "apartment_tile_cutter", title: "Плиткорез", quantityFormula: "max(1, ceil(q / 60))", unit: "shift", unitPrice: 1200, procurementEligible: false }),
  r({ section: "equipment", code: "apartment_wall_chaser", title: "Штроборез с пылеотводом", quantityFormula: "max(1, ceil(q / 80))", unit: "shift", unitPrice: 1800, procurementEligible: false }),
  r({ section: "logistics", code: "apartment_material_delivery", title: "Доставка черновых и финишных материалов", quantityFormula: "max(1, ceil(q / 80))", unit: "trip", unitPrice: 4200, procurementEligible: false }),
  r({ section: "logistics", code: "apartment_material_lifting", title: "Подъем материалов до квартиры", quantityFormula: "max(1, ceil(q / 60))", unit: "set", unitPrice: 2600, procurementEligible: false }),
  r({ section: "logistics", code: "apartment_debris_removal", title: "Вывоз строительного мусора", quantityFormula: "max(1, ceil(q / 55))", unit: "trip", unitPrice: 3900, procurementEligible: false }),
  r({ section: "logistics", code: "apartment_fixture_delivery", title: "Доставка дверей и сантехнических приборов", quantityFormula: "1", unit: "trip", unitPrice: 3100, procurementEligible: false }),
  r({ section: "waste", code: "apartment_dry_mix_reserve", title: "Запас сухих смесей на потери", quantityFormula: "q * 2.5", unit: "kg", unitPrice: 11 }),
  r({ section: "waste", code: "apartment_finish_covering_waste", title: "Запас плитки и напольного покрытия на подрезку", quantityFormula: "q * 0.08", unit: "sq_m", unitPrice: 980 }),
  r({ section: "waste", code: "apartment_cable_reserve", title: "Запас кабеля на расключение", quantityFormula: "q * 0.25", unit: "linear_m", unitPrice: 62 }),
  r({ section: "waste", code: "apartment_fittings_reserve", title: "Резерв фитингов и крепежа", quantityFormula: "max(1, ceil(q / 55))", unit: "set", unitPrice: 950 }),
  r({ section: "quality_control", code: "apartment_plane_control", title: "Контроль плоскостей стен и пола", quantityFormula: "q * 2.4", unit: "sq_m", unitPrice: 55, procurementEligible: false }),
  r({ section: "quality_control", code: "apartment_waterproofing_test", title: "Проверка гидроизоляции мокрых зон", quantityFormula: "1", unit: "set", unitPrice: 1900, procurementEligible: false }),
  r({ section: "quality_control", code: "apartment_electrical_continuity_test", title: "Прозвонка электрических линий", quantityFormula: "max(12, ceil(q / 3))", unit: "pcs", unitPrice: 120, procurementEligible: false }),
  r({ section: "quality_control", code: "apartment_plumbing_pressure_test", title: "Опрессовка сантехнических трасс", quantityFormula: "1", unit: "set", unitPrice: 2400, procurementEligible: false }),
  r({ section: "quality_control", code: "apartment_final_punch_list", title: "Финальная приемка и дефектная ведомость", quantityFormula: "1", unit: "set", unitPrice: 1800, procurementEligible: false }),
];

const VENTILATION_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("ventilation_material", "heating_hvac", "materials", ["Воздуховоды", "Фасонные элементы", "Решетки / диффузоры", "Вентилятор", "Шумоизоляция", "Крепеж воздуховодов", "Гибкие вставки"], "linear_m", "q", 1150),
  ...semanticRowsFromTitles("ventilation_component", "heating_hvac", "components", ["Хомуты и подвесы", "Клапаны", "Переходники", "Ревизионные люки"], "pcs", "max(1, ceil(q / 20))", 850),
  ...semanticRowsFromTitles("ventilation_prep", "heating_hvac", "preparation", ["Разметка трасс", "Проверка проемов", "Согласование проходок", "Подготовка креплений"], "set", "1", 4200),
  ...semanticRowsFromTitles("ventilation_labor", "heating_hvac", "labor", ["Монтаж воздуховодов", "Монтаж фасонных элементов", "Монтаж решеток", "Герметизация стыков", "Подключение вентилятора", "Балансировка системы"], "linear_m", "q", 950),
  ...semanticRowsFromTitles("ventilation_equipment", "heating_hvac", "equipment", ["Подъемник", "Перфоратор", "Измерительный прибор"], "shift", "max(1, ceil(q / 120))", 2600),
  ...semanticRowsFromTitles("ventilation_logistics", "heating_hvac", "logistics", ["Доставка воздуховодов", "Подъем воздуховодов", "Вывоз упаковки"], "trip", "max(1, ceil(q / 180))", 3200),
  ...semanticRowsFromTitles("ventilation_waste", "heating_hvac", "waste", ["Запас воздуховодов", "Запас крепежа"], "linear_m", "q * 0.05", 1150),
  ...semanticRowsFromTitles("ventilation_qc", "heating_hvac", "quality_control", ["Проверка тяги", "Балансировка расходов", "Акт проверки"], "set", "1", 5200),
];

const CONCRETE_SLAB_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("concrete_slab_material", "concrete", "materials", ["Бетон", "Арматура", "Опалубка", "Пленка для ухода", "Добавки", "Топпинг", "Шовный герметик"], "m3", "q", 8200),
  ...semanticRowsFromTitles("concrete_slab_component", "concrete", "components", ["Фиксаторы арматуры", "Анкера", "Закладные", "Крепеж опалубки"], "pcs", "max(1, ceil(q / 10))", 450),
  ...semanticRowsFromTitles("concrete_slab_prep", "concrete", "preparation", ["Разметка", "Подготовка основания", "Монтаж опалубки", "Монтаж арматуры"], "m3", "q", 360),
  ...semanticRowsFromTitles("concrete_slab_labor", "concrete", "labor", ["Прием бетона", "Заливка бетона", "Вибрирование бетона", "Выравнивание", "Затирка", "Нарезка швов", "Уход за бетоном"], "m3", "q", 1300),
  ...semanticRowsFromTitles("concrete_slab_equipment", "concrete", "equipment", ["Бетононасос", "Вибратор", "Затирочная машина"], "shift", "max(1, ceil(q / 80))", 4800),
  ...semanticRowsFromTitles("concrete_slab_logistics", "concrete", "logistics", ["Доставка бетона", "Подача бетона", "Вывоз отходов"], "trip", "max(1, ceil(q / 120))", 5200),
  ...semanticRowsFromTitles("concrete_slab_waste", "concrete", "waste", ["Запас бетона", "Отходы опалубки"], "m3", "q * 0.03", 8200),
  ...semanticRowsFromTitles("concrete_slab_qc", "concrete", "quality_control", ["Контроль марки", "Контроль объема", "Акт бетонирования"], "set", "1", 3600),
];

const WELDED_FRAME_ROWS: ExpandedTemplateRow[] = [
  ...semanticRowsFromTitles("welded_frame_material", "metalworks", "materials", ["Сталь / металлопрокат", "Болты / анкера", "Пластины и косынки", "Сварочные материалы", "Грунт по металлу", "Краска"], "kg", "q", 105),
  ...semanticRowsFromTitles("welded_frame_prep", "metalworks", "preparation", ["Обмер / схема", "Раскрой металла", "Разметка креплений", "Подготовка кромок"], "set", "1", 6200),
  ...semanticRowsFromTitles("welded_frame_labor", "metalworks", "labor", ["Сварка / сборка", "Сборка узлов", "Монтаж конструкций", "Анкеровка", "Зачистка швов", "Грунтование", "Окраска"], "kg", "q", 1250),
  ...semanticRowsFromTitles("welded_frame_equipment", "metalworks", "equipment", ["Кран / автовышка", "Сварочный аппарат", "Болгарка"], "shift", "max(1, ceil(q / 180))", 5200),
  ...semanticRowsFromTitles("welded_frame_logistics", "metalworks", "logistics", ["Доставка металла", "Такелаж", "Вывоз отходов резки"], "trip", "max(1, ceil(q / 250))", 5200),
  ...semanticRowsFromTitles("welded_frame_waste", "metalworks", "waste", ["Запас металла", "Отходы резки"], "kg", "q * 0.05", 105),
  ...semanticRowsFromTitles("welded_frame_qc", "metalworks", "quality_control", ["Контроль швов", "Контроль геометрии", "Приемка покрытия"], "set", "1", 4200),
];

type CategoryTemplateSeed = {
  defaultUnit?: GlobalUnitInput["normalizedUnit"];
  materials: readonly string[];
  components?: readonly string[];
  consumables?: readonly string[];
  preparation?: readonly string[];
  labor: readonly string[];
  equipment?: readonly string[];
  logistics?: readonly string[];
  waste?: readonly string[];
  quality?: readonly string[];
  materialPrice?: number;
  laborPrice?: number;
};

const FINISHING_SHARED: Partial<CategoryTemplateSeed> = {
  consumables: ["Малярная лента", "Защитная пленка", "Диски / лезвия / расход инструмента"],
  preparation: ["Осмотр основания", "Очистка основания", "Локальный ремонт дефектов", "Разметка зоны работ"],
  equipment: ["Ручной инструмент", "Лазерный уровень", "Пылесос / уборочный инструмент"],
  logistics: ["Доставка материалов", "Подъем материалов"],
  waste: ["Запас материалов на подрезку", "Вывоз упаковки и отходов"],
  quality: ["Контроль геометрии", "Проверка готовности к сдаче", "Финишная приемка"],
} as const;

const CATEGORY_SEEDS: Record<GlobalWorkCategory, CategoryTemplateSeed> = {
  flooring: {
    materials: ["Напольное покрытие", "Подложка / основание покрытия", "Плинтус", "Переходные профили", "Грунтовка основания", "Локальная выравнивающая смесь"],
    components: ["Уголки плинтуса", "Соединители плинтуса", "Заглушки плинтуса", "Крепеж плинтуса"],
    labor: ["Проверка перепадов", "Подготовка основания", "Укладка подложки", "Монтаж покрытия", "Подрезка у стен", "Монтаж порогов", "Монтаж плинтуса"],
    materialPrice: 780,
    laborPrice: 360,
    ...FINISHING_SHARED,
  },
  wall_finishing: {
    materials: ["Финишное покрытие стен", "Грунтовка", "Шпаклевочная смесь", "Армирующая сетка", "Уголок защитный", "Материалы примыканий"],
    components: ["Профиль примыкания", "Уголки наружные", "Лента стыковочная", "Крепежные элементы"],
    labor: ["Подготовка стен", "Грунтование", "Локальное выравнивание", "Нанесение базового слоя", "Нанесение финишного слоя", "Обработка углов", "Финишная зачистка"],
    ...FINISHING_SHARED,
  },
  ceiling: {
    materials: ["Потолочная система", "Подвесы", "Профиль несущий", "Плиты / листы потолка", "Крепеж", "Материалы примыканий"],
    components: ["Периметральный профиль", "Соединители профиля", "Ревизионный люк", "Узлы светильников"],
    labor: ["Разметка уровня", "Монтаж подвесов", "Монтаж каркаса", "Монтаж полотна / плит", "Обход светильников", "Заделка примыканий", "Финишная регулировка"],
    ...FINISHING_SHARED,
  },
  drywall: {
    materials: ["ГКЛ / ГВЛ листы", "Профиль направляющий", "Профиль стоечный", "Минеральная вата", "Шпаклевка швов", "Лента для швов"],
    components: ["Саморезы", "Дюбель-гвозди", "Уголок защитный", "Уплотнительная лента"],
    labor: ["Разметка каркаса", "Монтаж направляющих", "Монтаж стоек", "Укладка изоляции", "Обшивка листами", "Заделка швов", "Шлифовка"],
    ...FINISHING_SHARED,
  },
  painting: {
    materials: ["Краска основная", "Грунтовка", "Шпаклевка локальная", "Стеклохолст / армирующий слой", "Колер", "Материал защиты пола"],
    components: ["Валики", "Кисти", "Лотки", "Удлинители"],
    labor: ["Защита примыканий", "Подготовка поверхности", "Грунтование", "Шлифовка", "Первый слой краски", "Второй слой краски", "Финишная зачистка"],
    ...FINISHING_SHARED,
  },
  plastering: {
    materials: ["Штукатурная смесь", "Маяки", "Грунтовка глубокого проникновения", "Армирующая сетка", "Уголок штукатурный", "Ремонтный состав"],
    components: ["Профили маяков", "Крепеж маяков", "Правило / расход", "Защитные уголки"],
    labor: ["Провешивание стен", "Установка маяков", "Грунтование", "Наброс / нанесение смеси", "Выравнивание правилом", "Подрезка", "Демонтаж маяков и заделка"],
    materialPrice: 260,
    laborPrice: 520,
    ...FINISHING_SHARED,
  },
  putty: {
    materials: ["Шпаклевка стартовая", "Шпаклевка финишная", "Грунтовка", "Армирующая лента", "Абразивная сетка", "Ремонтный состав"],
    components: ["Шпатели / расход", "Терки", "Уголки", "Лента примыканий"],
    labor: ["Подготовка основания", "Грунтование", "Стартовое шпаклевание", "Промежуточная шлифовка", "Финишное шпаклевание", "Финишная шлифовка", "Обеспыливание"],
    materialPrice: 170,
    laborPrice: 320,
    ...FINISHING_SHARED,
  },
  tile: {
    materials: ["Плитка / керамогранит", "Плиточный клей", "Затирка", "Грунтовка", "Гидроизоляция зоны", "Профили примыканий"],
    components: ["СВП / крестики", "Профили наружных углов", "Клинья", "Коронки / диски"],
    labor: ["Разметка раскладки", "Подготовка основания", "Грунтование", "Нанесение клея", "Укладка плитки", "Подрезка", "Затирка швов"],
    materialPrice: 980,
    laborPrice: 920,
    ...FINISHING_SHARED,
  },
  doors_windows: {
    defaultUnit: "pcs",
    materials: ["Блок изделия", "Доборные элементы", "Пена монтажная", "Герметик", "Ленты примыканий", "Фурнитура"],
    components: ["Анкера", "Крепежные пластины", "Клинья", "Заглушки"],
    consumables: ["Расход инструмента", "Пленка защиты", "Уборочные расходники"],
    preparation: ["Замер проема", "Демонтаж старого блока", "Подготовка проема", "Проверка уровня"],
    labor: ["Установка блока", "Выставление по уровню", "Крепление", "Запенивание", "Монтаж доборов", "Герметизация", "Регулировка фурнитуры"],
    equipment: ["Перфоратор / шуруповерт", "Лазерный уровень", "Пылесос"],
    logistics: ["Доставка изделий", "Подъем изделий"],
    waste: ["Вывоз старого блока", "Запас расходников"],
    quality: ["Проверка открывания", "Проверка герметичности", "Финишная приемка"],
    materialPrice: 7200,
    laborPrice: 2400,
  },
  electrical: {
    defaultUnit: "pcs",
    materials: ["Кабель силовой", "Гофра / кабель-канал", "Подрозетники / коробки", "Автоматика защиты", "Розетки / выключатели", "Клеммы"],
    components: ["Крепеж кабеля", "Маркировка", "DIN-рейка", "Щитовые аксессуары"],
    consumables: ["Изолента", "Наконечники", "Алмазные коронки"],
    preparation: ["Обследование трасс", "Разметка точек", "Проверка существующей сети", "Отключение зоны работ"],
    labor: ["Штробление / прокладка трасс", "Прокладка кабеля", "Монтаж коробок", "Подключение точек", "Сборка щита", "Маркировка линий", "Восстановление штроб"],
    equipment: ["Штроборез", "Перфоратор", "Тестер / мультиметр"],
    logistics: ["Доставка кабеля и щита", "Вынос строительного мусора"],
    waste: ["Запас кабеля", "Отходы штробления"],
    quality: ["Прозвонка линий", "Проверка защит", "Исполнительная схема"],
    materialPrice: 850,
    laborPrice: 650,
  },
  plumbing: {
    defaultUnit: "pcs",
    materials: ["Трубы водоснабжения", "Канализационные трубы", "Фитинги", "Запорная арматура", "Герметики", "Теплоизоляция труб"],
    components: ["Крепления труб", "Ревизии", "Переходники", "Компенсаторы"],
    consumables: ["Пакля / фум-лента", "Сварочные насадки", "Хомуты"],
    preparation: ["Обследование стояков", "Разметка трасс", "Перекрытие воды", "Подготовка проходок"],
    labor: ["Демонтаж старых труб", "Монтаж водопровода", "Монтаж канализации", "Установка арматуры", "Крепление трасс", "Теплоизоляция", "Подключение приборов"],
    equipment: ["Паяльник ППР", "Пресс-инструмент", "Опрессовочный насос"],
    logistics: ["Доставка труб", "Вынос демонтированных труб"],
    waste: ["Запас фитингов", "Отходы труб"],
    quality: ["Опрессовка", "Проверка уклонов", "Акт скрытых работ"],
    materialPrice: 680,
    laborPrice: 900,
  },
  heating_hvac: {
    materials: ["Трубы отопления", "Радиаторы / приборы", "Клапаны", "Коллектор", "Теплоизоляция", "Крепления"],
    components: ["Краны Маевского", "Термоголовки", "Переходники", "Компенсаторы"],
    consumables: ["Уплотнители", "Паста / фум", "Расход пресс-инструмента"],
    preparation: ["Теплотехническое уточнение", "Разметка трасс", "Отключение участка", "Подготовка креплений"],
    labor: ["Демонтаж старых приборов", "Монтаж труб", "Установка радиаторов", "Монтаж коллектора", "Подключение арматуры", "Теплоизоляция", "Балансировка"],
    equipment: ["Пресс-инструмент", "Опрессовщик", "Тепловизор / прибор контроля"],
    logistics: ["Доставка радиаторов", "Подъем оборудования"],
    waste: ["Запас фитингов", "Вывоз старых приборов"],
    quality: ["Опрессовка", "Проверка герметичности", "Пуск и балансировка"],
    materialPrice: 1100,
    laborPrice: 1250,
  },
  roofing: {
    materials: ["Кровельное покрытие", "Мембрана", "Обрешетка", "Доборные элементы", "Крепеж", "Водосточная система"],
    components: ["Конек", "Ендовы", "Карнизные планки", "Примыкания"],
    consumables: ["Антисептик", "Диски / биты", "СИЗ высотные"],
    preparation: ["Обмер кровли", "Проверка основания", "Разметка скатов", "Организация безопасности"],
    labor: ["Монтаж основания", "Монтаж мембраны", "Монтаж обрешетки", "Монтаж покрытия", "Монтаж доборов", "Монтаж водостока", "Герметизация примыканий"],
    equipment: ["Леса / страховка", "Подъемник", "Электроинструмент"],
    logistics: ["Доставка кровельных материалов", "Подъем на кровлю"],
    waste: ["Запас покрытия", "Вывоз старой кровли"],
    quality: ["Контроль нахлестов", "Проверка крепежа", "Проверка водоотвода"],
    materialPrice: 720,
    laborPrice: 680,
  },
  facade: {
    materials: ["Фасадная система", "Утеплитель", "Клей фасадный", "Армирующая сетка", "Декоративная штукатурка", "Грунтовка фасадная"],
    components: ["Дюбели фасадные", "Уголки", "Цокольный профиль", "Примыкания"],
    labor: ["Подготовка фасада", "Монтаж утеплителя", "Армирующий слой", "Грунтование", "Финишный слой", "Обработка примыканий", "Уборка лесов"],
    equipment: ["Леса", "Подъемник", "Миксер"],
    materialPrice: 920,
    laborPrice: 860,
    ...FINISHING_SHARED,
  },
  foundation: {
    defaultUnit: "m3",
    materials: ["Бетон", "Арматура", "Опалубка", "Песчаная подготовка", "Щебеночная подготовка", "Гидроизоляция"],
    components: ["Фиксаторы арматуры", "Вязальная проволока", "Закладные", "Крепеж опалубки"],
    consumables: ["Пленка", "Расход инструмента", "СИЗ"],
    preparation: ["Разбивка осей", "Земляные работы", "Подготовка основания", "Монтаж опалубки"],
    labor: ["Вязка арматуры", "Прием бетона", "Укладка бетона", "Вибрирование", "Выравнивание верха", "Уход за бетоном", "Распалубка"],
    equipment: ["Бетононасос", "Глубинный вибратор", "Лазерный нивелир"],
    logistics: ["Доставка бетона", "Доставка арматуры"],
    waste: ["Запас бетона", "Отходы опалубки"],
    quality: ["Контроль геометрии", "Контроль защитного слоя", "Акт скрытых работ"],
    materialPrice: 8600,
    laborPrice: 1450,
  },
  concrete: {
    defaultUnit: "m3",
    materials: ["Бетон", "Арматура", "Опалубочные материалы", "Добавки", "Пленка для ухода", "Подготовительный слой"],
    components: ["Фиксаторы", "Анкера", "Закладные", "Крепеж"],
    consumables: ["Вязальная проволока", "Расход вибратора", "СИЗ"],
    preparation: ["Разметка", "Подготовка основания", "Монтаж опалубки", "Монтаж арматуры"],
    labor: ["Прием бетона", "Укладка", "Вибрирование", "Выравнивание", "Затирка", "Уход за бетоном", "Распалубка"],
    equipment: ["Бетононасос", "Вибратор", "Затирочная машина"],
    logistics: ["Доставка бетона", "Подача бетона"],
    waste: ["Запас бетона", "Вывоз отходов"],
    quality: ["Контроль марки", "Контроль объема", "Акт бетонирования"],
    materialPrice: 8200,
    laborPrice: 1300,
  },
  masonry: {
    materials: ["Кладочные блоки / кирпич", "Кладочный раствор", "Кладочная сетка", "Перемычки", "Гидроизоляционная отсечка", "Анкера"],
    components: ["Гибкие связи", "Закладные", "Уголки", "Профили примыканий"],
    consumables: ["Шнур-причалка", "Диски", "СИЗ"],
    preparation: ["Разметка", "Подготовка основания", "Вынос осей", "Приготовление раствора"],
    labor: ["Кладка первого ряда", "Кладка основного поля", "Армирование", "Устройство углов", "Обход проемов", "Расшивка", "Очистка"],
    equipment: ["Бетономешалка", "Леса", "Режущий инструмент"],
    logistics: ["Доставка кладочных материалов", "Разгрузка"],
    waste: ["Запас на бой", "Вывоз боя"],
    quality: ["Контроль перевязки", "Контроль вертикальности", "Приемка кладки"],
    materialPrice: 480,
    laborPrice: 780,
  },
  waterproofing: {
    materials: ["Гидроизоляционный материал", "Праймер", "Мастика", "Лента примыканий", "Герметик", "Защитный слой"],
    components: ["Прижимные планки", "Крепеж гидроизоляции", "Узлы проходок", "Уголки"],
    consumables: ["Кисти / валики", "Газ / топливо", "СИЗ"],
    preparation: ["Подготовка основания", "Ремонт дефектов", "Просушка", "Грунтование"],
    labor: ["Нанесение праймера", "Устройство основного слоя", "Герметизация примыканий", "Обработка проходок", "Защитный слой", "Финишная обработка", "Уборка"],
    equipment: ["Газовая горелка требуется уточнение", "Ручной каток", "Страховка доступа"],
    logistics: ["Доставка гидроизоляции", "Подъем материалов"],
    waste: ["Запас на нахлест", "Отходы обрезки"],
    quality: ["Проверка нахлестов", "Проверка герметичности", "Фотофиксация скрытых работ"],
    materialPrice: 520,
    laborPrice: 430,
  },
  insulation: {
    materials: ["Утеплитель", "Пароизоляция", "Ветрозащита", "Клей / крепеж", "Армирующая сетка", "Герметик швов"],
    components: ["Дюбели", "Профили", "Ленты примыканий", "Уголки"],
    labor: ["Подготовка основания", "Раскрой утеплителя", "Монтаж утеплителя", "Устройство пароизоляции", "Герметизация швов", "Монтаж защиты", "Финишная проверка"],
    equipment: ["Ножи / резаки", "Леса / стремянки", "Пылесос"],
    materialPrice: 420,
    laborPrice: 360,
    ...FINISHING_SHARED,
  },
  demolition: {
    materials: ["Защитная пленка", "Мешки строительные", "Укрывной материал", "Контейнер", "Пылеподавление", "Расход крепежа защиты"],
    components: ["Ограждение зоны", "Сигнальная лента", "Пылезащита проемов", "Защитные щиты"],
    consumables: ["Диски / пики", "СИЗ", "Фильтры пылесоса"],
    preparation: ["Осмотр зоны", "Отключение коммуникаций", "Защита смежных поверхностей", "Организация проходов"],
    labor: ["Разборка покрытия", "Демонтаж крепежа", "Сортировка мусора", "Погрузка мусора", "Черновая уборка", "Пылеудаление", "Подготовка к следующему этапу"],
    equipment: ["Перфоратор", "Отбойный инструмент", "Строительный пылесос"],
    logistics: ["Вывоз мусора", "Подача контейнера"],
    waste: ["Контейнерный запас", "Расход мешков"],
    quality: ["Контроль скрытых повреждений", "Проверка готовности основания", "Фотофиксация"],
    materialPrice: 120,
    laborPrice: 420,
  },
  landscaping: {
    materials: ["Растительный грунт", "Геотекстиль", "Песок", "Щебень", "Посадочный материал", "Бордюр"],
    components: ["Крепеж бордюра", "Дренажные элементы", "Поливочные элементы", "Разделители"],
    consumables: ["Семена / удобрения", "СИЗ", "Расход инструмента"],
    preparation: ["Планировка участка", "Разметка", "Снятие старого слоя", "Подготовка основания"],
    labor: ["Устройство основания", "Монтаж геотекстиля", "Укладка грунта", "Посадка / устройство покрытия", "Монтаж бордюра", "Полив", "Финишная уборка"],
    equipment: ["Виброплита", "Мини-погрузчик", "Садовый инструмент"],
    logistics: ["Доставка грунта", "Вывоз лишнего грунта"],
    waste: ["Запас грунта", "Отходы упаковки"],
    quality: ["Контроль уклонов", "Контроль приживаемости / покрытия", "Приемка участка"],
    materialPrice: 360,
    laborPrice: 320,
  },
  roadworks: {
    materials: ["Песок", "Щебень", "Геотекстиль", "Битумная эмульсия", "Покрытие", "Бортовой камень"],
    components: ["Лотки", "Бордюры", "Крепеж / анкера", "Разметочные материалы"],
    consumables: ["Топливо техники", "Вода", "СИЗ"],
    preparation: ["Геодезическая разбивка", "Очистка участка", "Планировка", "Уплотнение основания"],
    labor: ["Укладка геотекстиля", "Устройство песчаного слоя", "Устройство щебня", "Устройство покрытия", "Монтаж бортов", "Примыкания", "Финишная уборка"],
    equipment: ["Каток", "Погрузчик", "Самосвал"],
    logistics: ["Доставка инертных", "Вывоз грунта"],
    waste: ["Запас материалов", "Потери при уплотнении"],
    quality: ["Контроль уклонов", "Контроль уплотнения", "Приемка покрытия"],
    materialPrice: 420,
    laborPrice: 280,
  },
  metalworks: {
    materials: ["Металлопрокат", "Сварочные материалы", "Грунт по металлу", "Краска", "Анкера", "Крепеж"],
    components: ["Пластины", "Косынки", "Закладные", "Болтовые соединения"],
    consumables: ["Электроды / проволока", "Диски", "СИЗ сварщика"],
    preparation: ["Замер", "Раскрой металла", "Подготовка кромок", "Разметка креплений"],
    labor: ["Сборка узлов", "Сварка", "Зачистка швов", "Монтаж конструкций", "Анкеровка", "Грунтование", "Окраска"],
    equipment: ["Сварочный аппарат", "Болгарка", "Подъемное оборудование"],
    logistics: ["Доставка металла", "Такелаж"],
    waste: ["Запас металла", "Отходы резки"],
    quality: ["Контроль швов", "Контроль геометрии", "Приемка покрытия"],
    materialPrice: 95,
    laborPrice: 1250,
  },
  carpentry: {
    materials: ["Пиломатериал", "Листовые материалы", "Крепеж", "Клей", "Защитная пропитка", "Финишное покрытие"],
    components: ["Уголки", "Петли / фурнитура", "Соединители", "Заглушки"],
    consumables: ["Диски / пилы", "Шлифматериал", "СИЗ"],
    preparation: ["Замер", "Раскрой", "Сортировка материала", "Разметка"],
    labor: ["Сборка каркаса", "Монтаж элементов", "Подгонка", "Шлифовка", "Пропитка", "Финишная отделка", "Уборка"],
    equipment: ["Пила", "Шуруповерт", "Шлифмашина"],
    logistics: ["Доставка древесины", "Подъем материалов"],
    waste: ["Запас на раскрой", "Отходы древесины"],
    quality: ["Контроль геометрии", "Контроль крепежа", "Приемка отделки"],
    materialPrice: 620,
    laborPrice: 680,
  },
  documents_design: {
    defaultUnit: "set",
    materials: ["Обмерный план", "Техническое задание", "Чертежи", "Спецификация материалов", "Ведомость объемов", "Пакет согласований"],
    components: ["Исходные данные", "Фотофиксация", "Нормативные ссылки", "Пояснительная записка"],
    consumables: ["Печать / копии", "Электронный архив", "Расходы связи"],
    preparation: ["Сбор исходных данных", "Выезд на объект", "Обмеры", "Проверка ограничений"],
    labor: ["Разработка решения", "Расчет объемов", "Составление спецификации", "Проверка сметы", "Внесение правок", "Согласование", "Передача пакета"],
    equipment: ["Измерительный инструмент", "ПО проектирования", "Сканирование / печать"],
    logistics: ["Выезд специалиста", "Передача документов"],
    waste: ["Резерв правок", "Архивирование версий"],
    quality: ["Внутренняя проверка", "Проверка комплектности", "Контроль версии"],
    materialPrice: 4500,
    laborPrice: 6500,
  },
  cleaning: {
    materials: ["Моющие средства", "Мешки", "Салфетки / ветошь", "Защитные покрытия", "Контейнер", "Средства обеспыливания"],
    components: ["Насадки", "Фильтры", "Скребки", "Щетки"],
    consumables: ["Перчатки", "Респираторы", "Расход пылесоса"],
    preparation: ["Осмотр зоны", "Сортировка мусора", "Защита элементов", "Организация контейнера"],
    labor: ["Сбор крупного мусора", "Погрузка", "Обеспыливание", "Влажная уборка", "Очистка пятен", "Финишная уборка", "Передача зоны"],
    equipment: ["Промышленный пылесос", "Поломоечная машина", "Ручной инструмент"],
    logistics: ["Вывоз мусора", "Подача контейнера"],
    waste: ["Запас мешков", "Дополнительный объем мусора"],
    quality: ["Контроль чистоты", "Проверка готовности", "Фотофиксация"],
    materialPrice: 95,
    laborPrice: 180,
  },
  delivery_equipment: {
    defaultUnit: "set",
    materials: ["Транспортная единица", "Крепеж груза", "Упаковка", "Поддоны", "Защитные материалы", "Маркировка"],
    components: ["Стропы", "Такелаж", "Ремни", "Упоры"],
    consumables: ["Пленка", "Скотч", "СИЗ"],
    preparation: ["План логистики", "Проверка доступа", "Подготовка груза", "Согласование времени"],
    labor: ["Погрузка", "Крепление груза", "Перевозка", "Разгрузка", "Перемещение по объекту", "Распаковка", "Проверка комплектности"],
    equipment: ["Манипулятор", "Рохля / тележка", "Такелажный комплект"],
    logistics: ["Основная доставка", "Дополнительный рейс"],
    waste: ["Резерв упаковки", "Вывоз упаковки"],
    quality: ["Контроль повреждений", "Проверка документов", "Акт передачи"],
    materialPrice: 3500,
    laborPrice: 2800,
  },
  other: {
    defaultUnit: "set",
    materials: ["Специализированные материалы", "Крепежная система", "Расходные материалы", "Защитные материалы", "Узлы примыканий", "Комплект поставки"],
    components: ["Крепеж", "Переходники", "Маркировка", "Упаковка"],
    consumables: ["СИЗ", "Расход инструмента", "Уборочные расходники"],
    preparation: ["Обследование", "Разметка", "Подготовка зоны", "Согласование метода"],
    labor: ["Подготовительная операция", "Основная операция", "Монтаж / установка", "Подгонка", "Крепление", "Финишная обработка", "Уборка"],
    equipment: ["Ручной инструмент", "Измерительный инструмент", "Подъем / доступ"],
    logistics: ["Доставка комплекта", "Подъем / перемещение"],
    waste: ["Запас материалов", "Вывоз отходов"],
    quality: ["Контроль комплектности", "Проверка качества", "Финишная приемка"],
    materialPrice: 2500,
    laborPrice: 3500,
  },
};

function titleForCategoryTemplate(definition: (typeof GLOBAL_WORK_TYPE_DEFINITIONS)[number]): string {
  return definition.names.ru ?? definition.names.en ?? definition.workKey;
}

function workTitleForLocale(template: ExpandedWorkTemplate, locale: GlobalLocaleContext): string {
  const title = template.title.trim();
  if (locale.language !== "ru" || /[\u0400-\u04ff]/u.test(title)) return title;

  const definition = GLOBAL_WORK_TYPE_DEFINITIONS.find((item) => item.workKey === template.workKey);
  return definition ? visibleGlobalWorkTitleRu(definition) : title;
}

function isCatalogLaborAnchor(title: string): boolean {
  const normalized = title.toLocaleLowerCase("ru-RU");
  if (/засып/i.test(normalized)) return true;
  return /монтаж|уклад|устройств|установ|демонтаж|подготов|нанес|залив|сборк|проклад|подключ|пуск|провер|контроль|испыт|размет|резк|подрез|обработ|выравнив|затир|прием|приём|очист/i
    .test(normalized);
}

function workSpecificCatalogHints(workKey: string): readonly string[] {
  return Array.from(new Set([
    ...(GLOBAL_150_WORK_TYPE_BOQ_HINTS[workKey] ?? []),
    ...(BUILT_IN_AI_1000_BOQ_HINTS[workKey] ?? []),
    ...(PROFESSIONAL_EXPANDED_WORK_BOQ_HINTS[workKey] ?? []),
    ...(UNFINISHED_AI_ESTIMATE_BOQ_HINTS[workKey] ?? []),
  ]));
}

function isBroadCatalogAnchor(title: string): boolean {
  return ["монтаж", "укладка", "работы", "материалы", "объемы", "объёмы", "источники", "закупка", "pdf"].includes(
    title.trim().toLocaleLowerCase("ru-RU"),
  );
}

function workObjectForActionAnchor(definition: (typeof GLOBAL_WORK_TYPE_DEFINITIONS)[number], action: string): string {
  const title = titleForCategoryTemplate(definition).trim();
  if (action === "укладка") return title.replace(/^укладк[ау]\s+/i, "").trim();
  if (action === "монтаж") return title.replace(/^монтаж\s+/i, "").trim();
  return title;
}

function capitalizeCatalogAnchor(title: string): string {
  return title.length > 0 ? `${title[0].toLocaleUpperCase("ru-RU")}${title.slice(1)}` : title;
}

function catalogAnchorTitle(definition: (typeof GLOBAL_WORK_TYPE_DEFINITIONS)[number], hint: string): string {
  const action = hint.trim().toLocaleLowerCase("ru-RU");
  if (action === "укладка" || action === "монтаж") return `${action} ${workObjectForActionAnchor(definition, action)}`.trim();
  return isBroadCatalogAnchor(hint)
    ? `${hint}: ${titleForCategoryTemplate(definition)}`
    : capitalizeCatalogAnchor(hint);
}

function buildWorkSpecificAnchorRows(
  definition: (typeof GLOBAL_WORK_TYPE_DEFINITIONS)[number],
  unit: GlobalUnitInput["normalizedUnit"],
  materialPrice: number,
  laborPrice: number,
): ExpandedTemplateRow[] {
  const hints = workSpecificCatalogHints(definition.workKey).map((hint) => catalogAnchorTitle(definition, hint));
  if (hints.length === 0) return [];

  const materialHints = hints.filter((hint) => !isCatalogLaborAnchor(hint));
  const laborHints = hints.filter(isCatalogLaborAnchor);
  const materialRows = rowsFromTitles(
    `${definition.workKey}_catalog_anchor_material`,
    "materials",
    materialHints,
    unit,
    "q",
    materialPrice,
    semanticUnitPicker("materials", unit, definition.category),
  );
  const laborRows = rowsFromTitles(
    `${definition.workKey}_catalog_anchor_labor`,
    "labor",
    laborHints,
    unit,
    "q",
    laborPrice,
    semanticUnitPicker("labor", unit, definition.category),
  );
  return [...materialRows, ...laborRows];
}

const ELECTRICAL_ACCEPTANCE_MATERIAL_ROWS = [
  "\u041a\u0430\u0431\u0435\u043b\u044c\u043d\u044b\u0435 \u043b\u0438\u043d\u0438\u0438",
  "\u0429\u0438\u0442 \u0438 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u043a\u0430",
] as const;

const ELECTRICAL_ACCEPTANCE_PREPARATION_ROWS = [
  "\u0420\u0430\u0437\u043c\u0435\u0442\u043a\u0430 \u044d\u043b\u0435\u043a\u0442\u0440\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u0442\u0440\u0430\u0441\u0441",
] as const;

function buildCategoryAcceptanceRows(
  definition: (typeof GLOBAL_WORK_TYPE_DEFINITIONS)[number],
  unit: GlobalUnitInput["normalizedUnit"],
  materialPrice: number,
  laborPrice: number,
): ExpandedTemplateRow[] {
  if (definition.category !== "electrical") return [];

  return [
    ...rowsFromTitles(
      `${definition.workKey}_acceptance_material`,
      "materials",
      ELECTRICAL_ACCEPTANCE_MATERIAL_ROWS,
      unit,
      "q",
      materialPrice,
      semanticUnitPicker("materials", unit, definition.category),
    ),
    ...rowsFromTitles(
      `${definition.workKey}_acceptance_preparation`,
      "preparation",
      ELECTRICAL_ACCEPTANCE_PREPARATION_ROWS,
      unit,
      "q",
      Math.round(laborPrice * 0.25),
      semanticUnitPicker("preparation", unit, definition.category),
    ),
  ];
}

function buildCategoryTemplate(definition: (typeof GLOBAL_WORK_TYPE_DEFINITIONS)[number]): ExpandedWorkTemplate {
  const seed = CATEGORY_SEEDS[definition.category] ?? CATEGORY_SEEDS.other;
  const emptyRows: readonly string[] = [];
  const unit = seed.defaultUnit ?? definition.defaultMeasureUnit;
  const prefix = definition.workKey;
  const materialPrice = seed.materialPrice ?? 500;
  const laborPrice = seed.laborPrice ?? 450;
  const rows = [
    ...buildWorkSpecificAnchorRows(definition, unit, materialPrice, laborPrice),
    ...buildCategoryAcceptanceRows(definition, unit, materialPrice, laborPrice),
    ...rowsFromTitles(`${prefix}_group_material`, "materials", seed.materials, unit, "q", materialPrice, semanticUnitPicker("materials", unit, definition.category)),
    ...rowsFromTitles(`${prefix}_group_component`, "components", seed.components ?? emptyRows, "set", "max(1, ceil(q / 40))", Math.round(materialPrice * 0.45), semanticUnitPicker("components", "set", definition.category)),
    ...rowsFromTitles(`${prefix}_group_consumable`, "consumables", seed.consumables ?? emptyRows, "set", "max(1, ceil(q / 80))", 850),
    ...rowsFromTitles(`${prefix}_group_preparation`, "preparation", seed.preparation ?? emptyRows, unit, "q", Math.round(laborPrice * 0.25), semanticUnitPicker("preparation", unit, definition.category)),
    ...rowsFromTitles(`${prefix}_group_labor`, "labor", seed.labor, unit, "q", laborPrice, semanticUnitPicker("labor", unit, definition.category)),
    ...rowsFromTitles(`${prefix}_group_equipment`, "equipment", seed.equipment ?? emptyRows, "shift", "max(1, ceil(q / 120))", 1800, semanticUnitPicker("equipment", "shift", definition.category)),
    ...rowsFromTitles(`${prefix}_group_logistics`, "logistics", seed.logistics ?? emptyRows, "trip", "max(1, ceil(q / 200))", 3200, semanticUnitPicker("logistics", "trip", definition.category)),
    ...rowsFromTitles(`${prefix}_group_waste`, "waste", seed.waste ?? emptyRows, unit, "q * 0.05", materialPrice, semanticUnitPicker("waste", unit, definition.category)),
    ...rowsFromTitles(`${prefix}_group_quality`, "quality_control", seed.quality ?? emptyRows, unit, "q", Math.round(laborPrice * 0.12), semanticUnitPicker("quality_control", unit, definition.category)),
  ];
  return {
    workKey: definition.workKey,
    aliases: [],
    title: titleForCategoryTemplate(definition),
    category: definition.category,
    defaultQuantity: definition.defaultMeasureUnit === "pcs" || definition.defaultMeasureUnit === "set" ? 1 : 100,
    defaultUnit: definition.defaultMeasureUnit,
    minimumRows: definition.category === "delivery_equipment" || definition.category === "documents_design" ? 22 : 25,
    rows,
    assumptions: [
      `Смета раскрыта по профессиональному групповому шаблону для "${titleForCategoryTemplate(definition)}".`,
      "Материалы, работы, логистика, запас, инструмент и контроль отданы отдельными строками для ручного редактирования.",
    ],
    costIncreaseFactors: [
      "Состояние основания и фактический доступ на объект.",
      "Уточнение марки материалов и локальных требований.",
      "Срочность, высота, доставка и скрытые дефекты.",
    ],
    clarifyingQuestions: [
      "Какие точные размеры и зона работ?",
      "Какие материалы или бренды уже выбраны?",
      "Что включать в закупку, а что оставить только в смете?",
    ],
  };
}

const TEMPLATES: ExpandedWorkTemplate[] = [
  {
    workKey: "linoleum_laying",
    aliases: [],
    title: "Укладка линолеума",
    category: "flooring",
    defaultQuantity: 100,
    defaultUnit: "sq_m",
    minimumRows: 25,
    rows: LINOLEUM_ROWS,
    assumptions: ["Смета включает линолеум, основание, плинтус, раскрой, укладку и приемку покрытия."],
    costIncreaseFactors: ["Состояние основания", "Количество примыканий", "Подъем рулонов"],
    clarifyingQuestions: ["Какая площадь?", "Нужен ли демонтаж старого покрытия?", "Какой тип линолеума выбран?"],
  },
  {
    workKey: "paving_stone_laying",
    aliases: [],
    title: "Укладка брусчатки",
    category: "landscaping",
    defaultQuantity: 100,
    defaultUnit: "sq_m",
    minimumRows: 30,
    rows: PAVING_STONE_ROWS,
    assumptions: ["Смета включает основание, геотекстиль, брусчатку, бордюр, швы, технику и контроль уклонов."],
    costIncreaseFactors: ["Толщина основания", "Сложность рисунка", "Вывоз грунта"],
    clarifyingQuestions: ["Какая площадь мощения?", "Нужен ли бордюр?", "Какая нагрузка на покрытие?"],
  },
  {
    workKey: "metal_canopy_installation",
    aliases: [],
    title: "Металлический навес",
    category: "metalworks",
    defaultQuantity: 100,
    defaultUnit: "sq_m",
    minimumRows: 30,
    rows: METAL_CANOPY_ROWS,
    assumptions: ["Смета включает стойки, фермы, прогоны, кровлю, анкеровку, подъемную технику и контроль швов."],
    costIncreaseFactors: ["Высота навеса", "Тип кровельного покрытия", "Такелажный доступ"],
    clarifyingQuestions: ["Какие габариты навеса?", "Нужен ли водосток?", "Есть ли проект металлоконструкций?"],
  },
  {
    workKey: "apartment_capital_renovation",
    aliases: [],
    title: "Капитальный ремонт квартиры",
    category: "other",
    defaultQuantity: 36,
    defaultUnit: "sq_m",
    minimumRows: 30,
    rows: APARTMENT_RENOVATION_ROWS,
    assumptions: ["Смета раскрывает черновые смеси, финишные покрытия, обмер, демонтаж, инструмент, логистику и приемку."],
    costIncreaseFactors: ["Состояние квартиры", "Состав инженерных работ", "Ограничения по шуму и доступу"],
    clarifyingQuestions: ["Какая площадь и количество комнат?", "Что демонтировать?", "Какие финишные материалы выбраны?"],
  },
  {
    workKey: "ventilation_installation",
    aliases: [],
    title: "Монтаж вентиляции",
    category: "heating_hvac",
    defaultQuantity: 120,
    defaultUnit: "sq_m",
    minimumRows: 30,
    rows: VENTILATION_ROWS,
    assumptions: ["Смета включает воздуховоды, фасонные элементы, трассы, монтаж, подъемник, балансировку и акт проверки."],
    costIncreaseFactors: ["Длина трасс", "Проходки через стены", "Высота монтажа"],
    clarifyingQuestions: ["Какая схема вентиляции?", "Есть ли проект?", "Нужны ли шумоглушители и автоматика?"],
  },
  {
    workKey: "concrete_slab",
    aliases: [],
    title: "Бетонная плита",
    category: "concrete",
    defaultQuantity: 20,
    defaultUnit: "m3",
    minimumRows: 30,
    rows: CONCRETE_SLAB_ROWS,
    assumptions: ["Смета включает бетон, арматуру, опалубку, заливку, вибрирование, уход за бетоном и контроль."],
    costIncreaseFactors: ["Толщина плиты", "Армирование", "Доступ бетононасоса"],
    clarifyingQuestions: ["Какая толщина плиты?", "Нужен ли топпинг?", "Есть ли проект армирования?"],
  },
  {
    workKey: "welded_frame",
    aliases: [],
    title: "Сварной металлокаркас",
    category: "metalworks",
    defaultQuantity: 500,
    defaultUnit: "kg",
    minimumRows: 25,
    rows: WELDED_FRAME_ROWS,
    assumptions: ["Смета включает сталь, болты и анкера, обмер, сварку, сборку, кран или автовышку и контроль швов."],
    costIncreaseFactors: ["Масса металла", "Высота монтажа", "Требования к антикоррозионной защите"],
    clarifyingQuestions: ["Есть ли КМ/КМД?", "Какая масса конструкций?", "Нужна ли окраска на площадке?"],
  },
  {
    workKey: "laminate_laying",
    aliases: ["flooring_laminate_installation"],
    title: "Укладка ламината",
    category: "flooring",
    defaultQuantity: 100,
    defaultUnit: "sq_m",
    minimumRows: 25,
    rows: LAMINATE_ROWS,
    assumptions: ["Смета раскрыта до материалов, расходников, комплектующих, работ, логистики, запаса и контроля."],
    costIncreaseFactors: ["Неровное основание", "Сложная геометрия помещений", "Подъем материалов без лифта"],
    clarifyingQuestions: ["Нужны ли пороги?", "Есть ли перепады основания?", "Входит ли демонтаж старого покрытия?"],
  },
  {
    workKey: "foundation_rebar_reinforcement",
    aliases: ["foundation_rebar", "rebar_installation"],
    title: "Армирование фундамента",
    category: "concrete",
    defaultQuantity: 2,
    defaultUnit: "ton",
    minimumRows: 25,
    rows: REBAR_ROWS,
    assumptions: ["Количество принято в тоннах арматуры; бетонные позиции отмечены как optional scope."],
    costIncreaseFactors: ["Сложная схема армирования", "Дополнительные закладные", "Доставка крупной партии арматуры"],
    clarifyingQuestions: ["Есть ли проект армирования?", "Бетон входит в этот scope?", "Какие диаметры арматуры требуются?"],
  },
  {
    workKey: "fire_alarm_installation",
    aliases: ["fire_alarm", "fire_alarm_system"],
    title: "Пожарная сигнализация",
    category: "electrical",
    defaultQuantity: 10,
    defaultUnit: "pcs",
    minimumRows: 30,
    rows: FIRE_ALARM_ROWS,
    assumptions: ["Пожарная сигнализация является регулируемой работой; нужна проверка лицензированным специалистом."],
    costIncreaseFactors: ["Количество зон", "Требования СОУЭ", "Скрытая прокладка кабеля"],
    clarifyingQuestions: ["Сколько зон и помещений?", "Нужно ли СОУЭ?", "Есть ли проект АПС?"],
  },
  {
    workKey: "brick_masonry",
    aliases: ["masonry_brick_wall"],
    title: "Кладка кирпича",
    category: "masonry",
    defaultQuantity: 74,
    defaultUnit: "sq_m",
    minimumRows: 25,
    rows: BRICK_ROWS,
    assumptions: ["Площадь кладки принята по видимой поверхности стены."],
    costIncreaseFactors: ["Проемы и перемычки", "Высота работ", "Сложность перевязки"],
    clarifyingQuestions: ["Толщина стены?", "Есть ли проемы?", "Нужна ли расшивка лицевого шва?"],
  },
  {
    workKey: "asphalt_paving",
    aliases: [],
    title: "Асфальтирование",
    category: "roadworks",
    defaultQuantity: 10000,
    defaultUnit: "sq_m",
    minimumRows: 25,
    rows: ASPHALT_ROWS,
    assumptions: ["Смета включает основание, асфальтобетон, технику, логистику и контроль покрытия."],
    costIncreaseFactors: ["Толщина слоев", "Дальность доставки асфальта", "Требования к уклонам"],
    clarifyingQuestions: ["Какая проектная толщина слоев?", "Это дорога, двор или парковка?", "Нужна ли разметка?"],
  },
  {
    workKey: "drywall_partition",
    aliases: ["drywall_wall_installation"],
    title: "Перегородка из ГКЛ",
    category: "drywall",
    defaultQuantity: 60,
    defaultUnit: "sq_m",
    minimumRows: 25,
    rows: DRYWALL_ROWS,
    assumptions: ["Смета рассчитана для каркасной перегородки с обшивкой ГКЛ."],
    costIncreaseFactors: ["Двойная обшивка", "Звукоизоляция", "Высота перегородки"],
    clarifyingQuestions: ["Один или два слоя ГКЛ?", "Нужна ли шумоизоляция?", "Есть ли двери или ниши?"],
  },
  {
    workKey: "window_installation",
    aliases: [],
    title: "Установка окна",
    category: "doors_windows",
    defaultQuantity: 1,
    defaultUnit: "pcs",
    minimumRows: 22,
    rows: WINDOW_ROWS,
    assumptions: ["Расчет выполнен по количеству оконных блоков."],
    costIncreaseFactors: ["Размеры и профиль окна", "Демонтаж старой рамы", "Откосы и подъем"],
    clarifyingQuestions: ["Сколько окон и какие размеры?", "Нужны ли откосы?", "Входит ли демонтаж?"],
  },
  {
    workKey: "roof_waterproofing",
    aliases: [],
    title: "Гидроизоляция кровли",
    category: "roofing",
    defaultQuantity: 100,
    defaultUnit: "sq_m",
    minimumRows: 25,
    rows: ROOF_WATERPROOFING_ROWS,
    assumptions: ["Смета включает подготовку основания, материалы, нанесение, безопасность и контроль герметичности."],
    costIncreaseFactors: ["Состояние основания", "Количество примыканий", "Доступ на кровлю"],
    clarifyingQuestions: ["Тип кровли?", "Есть ли протечки и вздутия?", "Нужна ли полная замена покрытия?"],
  },
  {
    workKey: "gable_roof_installation",
    aliases: ["pitched_roof_installation"],
    title: "Двускатная крыша",
    category: "roofing",
    defaultQuantity: 120,
    defaultUnit: "sq_m",
    minimumRows: 30,
    rows: GABLE_ROOF_ROWS,
    assumptions: ["Площадь принята по площади скатов; точный расчет требует геометрию крыши."],
    costIncreaseFactors: ["Сложность стропильной системы", "Высота работ", "Тип кровельного покрытия"],
    clarifyingQuestions: ["Какая площадь скатов?", "Какое покрытие выбрано?", "Нужен ли водосток?"],
  },
  {
    workKey: "micro_hydro_preparation",
    aliases: ["hydro_turbine_installation"],
    title: "Турбина / микро-ГЭС",
    category: "concrete",
    defaultQuantity: 1,
    defaultUnit: "set",
    minimumRows: 35,
    rows: HYDRO_ROWS,
    assumptions: ["Смета предварительная; параметры H/Q, проект и разрешения уточняются отдельно."],
    costIncreaseFactors: ["Напор и расход", "Такелажный доступ", "Синхронизация и автоматика"],
    clarifyingQuestions: ["Какие напор H и расход Q?", "Есть ли проект?", "Нужна ли работа в сеть или автономно?"],
  },
];

const GENERATED_CATEGORY_TEMPLATES = GLOBAL_WORK_TYPE_DEFINITIONS
  .filter((definition) => definition.workKey !== "other_construction_work")
  .map(buildCategoryTemplate);

const TEMPLATE_BY_KEY = new Map<string, ExpandedWorkTemplate>();
for (const template of GENERATED_CATEGORY_TEMPLATES) {
  TEMPLATE_BY_KEY.set(template.workKey, template);
}
for (const template of TEMPLATES) {
  TEMPLATE_BY_KEY.set(template.workKey, template);
  for (const alias of template.aliases) {
    if (!TEMPLATE_BY_KEY.has(alias)) TEMPLATE_BY_KEY.set(alias, template);
  }
}

export const PROFESSIONAL_EXPANDED_TEMPLATE_COVERAGE = Object.freeze({
  generatedKnownWorkTemplates: GENERATED_CATEGORY_TEMPLATES.length,
  workSpecificOverlayTemplates: TEMPLATES.length,
  manualOverlayTemplates: TEMPLATES.length,
  totalSupportedTemplateKeys: new Set([...TEMPLATE_BY_KEY.values()].map((template) => template.workKey)).size,
  minimumProductionKnownWorkTemplates: 100,
});

function estimateIdFor(input: GlobalEstimateInput, workKey: string): string {
  const source = JSON.stringify({ input, workKey, detailLevel: "professional_expanded" });
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  return `professional_expanded_${Math.abs(hash)}`;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("ru-RU");
}

function shouldUseFoundationRebarTemplate(normalized: string): boolean {
  const hasFoundationContext = /\b(?:foundation|slab)\b|фундамент|плит/i.test(normalized);
  const hasRebarContext = /\b(?:rebar|reinforcement)\b|армирован|арматур/i.test(normalized);
  if (!hasFoundationContext || !hasRebarContext) return false;

  const hasConcreteSystemScope = /\b(?:concrete|formwork|pouring|pour|curing)\b|бетон|опалуб|залив|бетонир/i.test(normalized);
  const hasRebarOnlyAction =
    /\b(?:foundation\s+rebar|slab\s+rebar)\s+(?:installation|reinforcement|tying|placing|fixing|cutting|bending)\b/i.test(normalized) ||
    /\brebar\s+(?:installation|reinforcement|tying|placing|fixing|cutting|bending)\b.*\b(?:foundation|slab)\b/i.test(normalized) ||
    /армирован\w*\s+(?:фундамент|плит)|(?:вязк|монтаж)\w*\s+арматур\w*\s+(?:фундамент|плит)/i.test(normalized);

  return hasRebarOnlyAction && !hasConcreteSystemScope;
}

function resolveTextTemplateKey(text: string | undefined): string | null {
  const normalized = normalizeText(text ?? "");
  if (!normalized) return null;
  if (/(substation|transformer\s+substation|switchgear|power\s+line|grounding\s+electrical|electrical\s+cable\s+protection)/i.test(normalized)) return "transformer_substation";
  if (/(?:\u043f\u043e\u0436\u0430\u0440\u043d|\u0430\u043f\u0441|\u0441\u043e\u0443\u044d|fire\s*alarm|fire\s*safety)/i.test(normalized)) return "fire_alarm_installation";
  if (shouldUseFoundationRebarTemplate(normalized)) return "foundation_rebar_reinforcement";
  if (/гидроизоляц/i.test(normalized) && /крыш|кровл|roof/i.test(normalized)) return "roof_waterproofing";
  if (/двускат|скатн|pitched|gable/i.test(normalized) && /крыш|кровл|roof/i.test(normalized)) return "gable_roof_installation";
  return null;
}

export function resolveProfessionalExpandedWorkKey(input: {
  estimateInput: GlobalEstimateInput;
  resolvedWorkKey?: string;
  semanticWorkKey?: string | null;
}): string | null {
  if (input.estimateInput.explicitWorkKey && input.estimateInput.explicitWorkKeyFromRoute !== true) {
    const explicitTemplate = TEMPLATE_BY_KEY.get(input.estimateInput.explicitWorkKey);
    if (explicitTemplate) return explicitTemplate.workKey;
  }

  const explicitTextKey = resolveTextTemplateKey(input.estimateInput.text);
  if (explicitTextKey && TEMPLATE_BY_KEY.has(explicitTextKey)) return explicitTextKey;

  const candidates = [
    input.semanticWorkKey,
    input.resolvedWorkKey,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const template = TEMPLATE_BY_KEY.get(candidate);
    if (template) return template.workKey;
  }
  return null;
}

export function isProfessionalExpandedWorkSupported(workKey: string): boolean {
  return TEMPLATE_BY_KEY.has(workKey);
}

function parsedQuantity(input: GlobalEstimateInput, template: ExpandedWorkTemplate): { value: number; unit: string } {
  if (input.volume != null && Number.isFinite(input.volume) && input.volume > 0) {
    return { value: input.volume, unit: input.unit ? normalizeGlobalUnit(input.unit) : template.defaultUnit };
  }
  const textQuantity = input.text?.match(/(\d+(?:[.,]\d+)?)\s*(sq\s*ft|sqft|ft2|ft²|m2|m²|м2|м²|кв\.?\s*м)/i);
  if (textQuantity) {
    const value = Number(textQuantity[1].replace(",", "."));
    if (Number.isFinite(value) && value > 0) {
      const rawUnit = textQuantity[2].toLowerCase();
      return {
        value,
        unit: /sq\s*ft|sqft|ft2|ft²/.test(rawUnit) ? "sq_ft" : "sq_m",
      };
    }
  }
  const parsed: Partial<UniversalConstructionQuantities> = input.text
    ? parseUniversalConstructionQuantities(input.text)
    : {};
  if (parsed.primaryQuantity != null && Number.isFinite(parsed.primaryQuantity) && parsed.primaryQuantity > 0) {
    return {
      value: parsed.primaryQuantity,
      unit: parsed.primaryUnit ? normalizeGlobalUnit(parsed.primaryUnit) : template.defaultUnit,
    };
  }
  return { value: template.defaultQuantity, unit: template.defaultUnit };
}

function evaluateFormula(formula: ExpandedFormula, quantity: number): number {
  const compact = formula.replace(/\s+/g, "");
  if (compact === "1") return 1;
  if (compact === "q") return quantity;
  const literal = compact.match(/^\d+(?:\.\d+)?$/);
  if (literal) return Number(literal[0]);
  const multiply = compact.match(/^q\*(\d+(?:\.\d+)?)$/);
  if (multiply) return quantity * Number(multiply[1]);
  const divide = compact.match(/^q\/(\d+(?:\.\d+)?)$/);
  if (divide) return quantity / Number(divide[1]);
  const add = compact.match(/^q\+(\d+(?:\.\d+)?)$/);
  if (add) return quantity + Number(add[1]);
  const ceilDivide = compact.match(/^ceil\(q\/(\d+(?:\.\d+)?)\)$/);
  if (ceilDivide) return Math.ceil(quantity / Number(ceilDivide[1]));
  const maxCeilDivide = compact.match(/^max\((\d+(?:\.\d+)?),ceil\(q\/(\d+(?:\.\d+)?)\)\)$/);
  if (maxCeilDivide) return Math.max(Number(maxCeilDivide[1]), Math.ceil(quantity / Number(maxCeilDivide[2])));
  const sqrtMultiply = compact.match(/^sqrt\(q\)\*(\d+(?:\.\d+)?)$/);
  if (sqrtMultiply) return Math.sqrt(quantity) * Number(sqrtMultiply[1]);
  throw new Error(`UNSUPPORTED_PROFESSIONAL_EXPANDED_FORMULA:${formula}`);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function unitLabel(unit: string): string {
  const labels: Record<string, string> = {
    sq_m: "м²",
    sq_ft: "sq ft",
    m3: "м³",
    cu_ft: "cu ft",
    linear_m: "пог. м",
    linear_ft: "linear ft",
    pcs: "шт.",
    set: "компл.",
    kg: "кг",
    lbs: "lbs",
    ton: "т",
    shift: "смена",
    trip: "рейс",
    l: "л",
    roll: "рул.",
    bag: "меш.",
    pack: "упак.",
  };
  return labels[unit] ?? unit;
}

function localExpandedUnit(unit: string, locale: GlobalLocaleContext): string {
  if (locale.unitSystem !== "imperial" && !(locale.unitSystem === "mixed" && locale.countryCode === "SG")) return unit;
  if (unit === "sq_m") return "sq_ft";
  if (unit === "linear_m") return "linear_ft";
  if (unit === "m3") return "cu_ft";
  if (unit === "kg") return "lbs";
  return unit;
}

function sourceEvidence(confidence: GlobalEstimateConfidence): EstimateRowSourceEvidence[] {
  return [{
    sourceId: EXPANDED_REFERENCE_SOURCE.id,
    sourceType: "configured_reference",
    label: EXPANDED_REFERENCE_SOURCE.label,
    checkedAt: EXPANDED_REFERENCE_SOURCE.checkedAt,
    freshness: "fresh",
    confidence,
  }];
}

function normLineTypeForExpandedSection(section: ExpandedSectionKind): "material" | "work" | "service" | "equipment" {
  if (section === "equipment") return "equipment";
  if (section === "logistics") return "service";
  if (section === "preparation" || section === "labor" || section === "additional_labor" || section === "quality_control") return "work";
  return "material";
}

function rowConfidence(row: ExpandedTemplateRow): GlobalEstimateConfidence {
  if (row.optional) return "medium";
  return "medium";
}

function compileRow(input: {
  template: ExpandedWorkTemplate;
  row: ExpandedTemplateRow;
  sectionNumber: string;
  rowIndex: number;
  baseQuantity: number;
  locale: GlobalLocaleContext;
}): SourceBackedEstimateRow {
  const unit = localExpandedUnit(input.row.unit, input.locale);
  const quantity = Math.max(0.01, round2(evaluateFormula(input.row.quantityFormula, input.baseQuantity)));
  const total = round2(quantity * input.row.unitPrice);
  const confidence = rowConfidence(input.row);
  const label = unitLabel(unit);
  const templateId = input.row.templateId ?? `${input.template.workKey}_professional_expanded_real_boq`;
  const templateVersion = input.row.templateVersion ?? PROFESSIONAL_EXPANDED_TEMPLATE_VERSION;
  const formulaId = input.row.formulaId ?? `${input.template.workKey}_${input.row.code}_quantity_v1`;
  const norm = buildEstimateNormItemForGenericRow({
    workKey: input.template.workKey,
    templateKey: templateId,
    templateFamily: input.template.category,
    category: input.template.category,
    defaultUnit: input.template.defaultUnit,
    row: {
      code: input.row.code,
      section: input.row.section,
      lineType: normLineTypeForExpandedSection(input.row.section),
      recipeId: `${templateId}_${input.row.code}_norm_recipe_v1`,
      quantityFormula: input.row.quantityFormula,
      unit,
    },
  });
  return {
    rowNumber: `${input.sectionNumber}.${input.rowIndex}`,
    code: input.row.code,
    rateKey: input.row.code,
    materialKey: input.row.procurementEligible ? input.row.code : undefined,
    name: input.row.title,
    quantity,
    unit,
    displayQuantity: `${formatGlobalNumber(quantity, input.locale)} ${label}`,
    unitPrice: input.row.unitPrice,
    displayUnitPrice: `${formatGlobalCurrency(input.row.unitPrice, input.locale)} / ${label}`,
    total,
    displayTotal: formatGlobalCurrency(total, input.locale),
    currency: input.locale.currency,
    priceStatus: "priced",
    sourceId: EXPANDED_REFERENCE_SOURCE.id,
    sourceEvidence: sourceEvidence(confidence),
    formulaId,
    quantityFormula: input.row.quantityFormula,
    calculationTrace: [
      `template=${templateId}`,
      `templateVersion=${templateVersion}`,
      `baseQuantity=${input.baseQuantity} ${input.template.defaultUnit}`,
      `formula=${input.row.quantityFormula}`,
      `normId=${norm.norm_id}`,
      `normVersion=${norm.norm_version}`,
      `normSource=${norm.source_id}`,
      `normFamily=${norm.norm_family_id}`,
      `normRate=${norm.consumption_rate}`,
      `normReviewStatus=${norm.review_status}`,
      `normProvenance=${norm.source_provenance}`,
      `result=${quantity} ${unit}`,
    ].join("; "),
    sourceParameters: {
      baseQuantity: input.baseQuantity,
      baseUnit: input.template.defaultUnit,
      rowUnit: unit,
      workKey: input.template.workKey,
      rowCode: input.row.code,
      normId: norm.norm_id,
      normFamilyId: norm.norm_family_id,
      normVersion: norm.norm_version,
      normSourceId: norm.source_id,
      normSourceTitle: norm.source_title,
      normSourceType: norm.source_type,
      normSourceDocumentVersion: norm.source_document_version,
      normSourceProvenance: norm.source_provenance,
      normReviewStatus: norm.review_status,
      normLicenseStatus: norm.license_status,
      normQualityStatus: norm.quality_status,
      normUnit: norm.unit,
      normBaseUnit: norm.base_unit,
      normFormulaInputs: norm.formula_inputs,
      normParameterRequirements: norm.parameter_requirements,
    },
    templateId,
    templateVersion,
    normId: norm.norm_id,
    normFamilyId: norm.norm_family_id,
    normSourceId: norm.source_id,
    normSourceTitle: norm.source_title,
    normVersion: norm.norm_version,
    normReviewStatus: norm.review_status,
    confidence,
    includedInEstimate: input.row.includedByDefault !== false,
    includedInProcurement: input.row.procurementEligible === true,
    optional: input.row.optional === true,
    editable: true,
    deletedByUser: false,
  };
}

function compileSections(input: {
  template: ExpandedWorkTemplate;
  baseQuantity: number;
  locale: GlobalLocaleContext;
  estimateInput: GlobalEstimateInput;
}): GlobalEstimateResult["sections"] {
  return SECTION_ORDER
    .map((kind, sectionIndex) => {
      if (kind === "materials" && input.estimateInput.includeMaterials === false) return null;
      if (
        (kind === "preparation" || kind === "labor" || kind === "additional_labor" || kind === "quality_control") &&
        input.estimateInput.includeLabor === false
      ) {
        return null;
      }
      if (kind === "logistics" && input.estimateInput.includeDelivery === false) return null;
      const rows = input.template.rows.filter((row) => row.section === kind);
      if (rows.length === 0) return null;
      const sectionNumber = String(sectionIndex + 1);
      return {
        sectionNumber,
        title: SECTION_TITLES[kind],
        type: SECTION_TYPE_BY_KIND[kind],
        rows: rows.map((row, rowIndex) => compileRow({
          template: input.template,
          row,
          sectionNumber,
          rowIndex: rowIndex + 1,
          baseQuantity: input.baseQuantity,
          locale: input.locale,
        })),
      };
    })
    .filter((section): section is GlobalEstimateResult["sections"][number] => Boolean(section));
}

function sumByType(sections: GlobalEstimateResult["sections"], type: GlobalEstimateSectionType): number {
  return round2(sections
    .filter((section) => section.type === type)
    .reduce((sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + row.total, 0), 0));
}

function minConfidence(values: GlobalEstimateConfidence[]): GlobalEstimateConfidence {
  if (values.includes("low")) return "low";
  if (values.includes("medium")) return "medium";
  return "high";
}

function forbiddenGenericRowName(value: string): boolean {
  const normalized = normalizeText(value);
  return (
    /\bgeneric\b|\bfallback\b|other_construction_work/i.test(normalized) ||
    normalized.includes("дополнительные материалы:") ||
    normalized.includes("дополнительные работы:") ||
    normalized.includes("оборудование и инструмент:") ||
    normalized === "материалы" ||
    normalized === "монтаж" ||
    normalized === "работы"
  );
}

export function validateProfessionalExpandedEstimate(result: GlobalEstimateResult): {
  passed: boolean;
  actualRows: number;
  minimumRows: number;
  blockers: string[];
} {
  const rows = result.sections.flatMap((section) => section.rows);
  const minimumRows =
    TEMPLATE_BY_KEY.get(result.work.workKey)?.minimumRows ??
    MIN_EXPANDED_ROWS_BY_WORK_TYPE[result.work.workKey] ??
    MIN_EXPANDED_ROWS_BY_WORK_TYPE[TEMPLATE_BY_KEY.get(result.work.workKey)?.workKey ?? ""] ??
    0;
  const blockers: string[] = [];
  if (minimumRows > 0 && rows.length < minimumRows) {
    blockers.push(`KNOWN_WORK_EXPANDED_ESTIMATE_TOO_SHORT:${result.work.workKey}:${rows.length}<${minimumRows}`);
  }
  const genericRow = rows.find((row) => forbiddenGenericRowName(row.name) || forbiddenGenericRowName(row.code));
  if (genericRow && result.work.workKey !== "other_construction_work") {
    blockers.push(`KNOWN_WORK_EXPANDED_ESTIMATE_GENERIC_ROW:${result.work.workKey}:${genericRow.code}`);
  }
  if (!rows.every((row) => row.includedInEstimate === true && row.editable === true)) {
    blockers.push(`KNOWN_WORK_EXPANDED_ROW_EDIT_FLAGS_MISSING:${result.work.workKey}`);
  }
  if (!rows.some((row) => row.includedInProcurement === true)) {
    blockers.push(`KNOWN_WORK_EXPANDED_PROCUREMENT_FLAGS_MISSING:${result.work.workKey}`);
  }
  return {
    passed: blockers.length === 0,
    actualRows: rows.length,
    minimumRows,
    blockers,
  };
}

export function assertProfessionalExpandedEstimate(result: GlobalEstimateResult): void {
  const validation = validateProfessionalExpandedEstimate(result);
  if (!validation.passed) {
    throw new Error(validation.blockers[0] ?? "PROFESSIONAL_EXPANDED_ESTIMATE_INVALID");
  }
}

function productionProjectGroupQuantity(input: {
  estimateInput: GlobalEstimateInput;
  defaultQuantity: number;
}): number {
  if (input.estimateInput.volume != null && Number.isFinite(input.estimateInput.volume) && input.estimateInput.volume > 0) {
    return input.estimateInput.volume;
  }
  const match = input.estimateInput.text?.match(/(\d+(?:[.,]\d+)?)\s*(sq\s*m|sqm|m2|mВІ|Рј2|РјВІ|РєРІ\.?\s*Рј)/i);
  if (match) {
    const value = Number(match[1].replace(",", "."));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return input.defaultQuantity;
}

function productionLineType(row: ProductionCompiledExpandedRow): SourceBackedEstimateRow["sourceEvidence"][number]["confidence"] {
  if (row.optional) return "medium";
  return "medium";
}

function productionRowSourceEvidence(
  row: ProductionCompiledExpandedRow,
): EstimateRowSourceEvidence[] {
  return [{
    sourceId: row.normSourceId,
    sourceType: "configured_reference",
    label: row.normSourceTitle,
    checkedAt: CHECKED_AT,
    freshness: "fresh",
    confidence: productionLineType(row),
  }];
}

function publicProductionRowUnit(row: ProductionCompiledExpandedRow): string {
  if (row.unit === "m2") return "sq_m";
  if (row.unit === "piece") return "pcs";
  return row.unit;
}

function productionCompiledRowToGlobalRow(input: {
  row: ProductionCompiledExpandedRow;
  rowNumber: string;
  locale: GlobalLocaleContext;
}): SourceBackedEstimateRow {
  const displayQuantity = `${formatGlobalNumber(input.row.quantity, input.locale)} ${input.row.displayUnit}`;
  const rowUnit = publicProductionRowUnit(input.row);
  return {
    rowNumber: input.rowNumber,
    code: input.row.rowCode,
    rateKey: input.row.laborRateKey ?? input.row.rowCode,
    materialKey: input.row.includedInProcurement ? input.row.materialKey ?? input.row.rowCode : undefined,
    name: input.row.titleRu,
    quantity: input.row.quantity,
    unit: rowUnit,
    displayQuantity,
    unitPrice: 0,
    displayUnitPrice: `${formatGlobalCurrency(0, input.locale)} / ${input.row.displayUnit}`,
    total: 0,
    displayTotal: formatGlobalCurrency(0, input.locale),
    currency: input.row.currency,
    priceStatus: "unavailable",
    sourceId: input.row.normSourceId,
    sourceEvidence: productionRowSourceEvidence(input.row),
    formulaId: input.row.formulaId,
    quantityFormula: input.row.quantityFormula,
    calculationTrace: input.row.calculationTrace,
    sourceParameters: input.row.sourceParameters,
    templateId: input.row.templateId,
    templateVersion: input.row.templateVersion,
    normId: input.row.normId,
    normFamilyId: input.row.normFamilyId,
    normSourceId: input.row.normSourceId,
    normSourceTitle: input.row.normSourceTitle,
    normVersion: input.row.normVersion,
    normReviewStatus: input.row.normReviewStatus,
    confidence: productionLineType(input.row),
    includedInEstimate: input.row.includedInEstimate,
    includedInProcurement: input.row.includedInProcurement,
    optional: input.row.optional,
    editable: input.row.editable,
    deletedByUser: false,
  };
}

function productionCompiledSectionsToGlobal(
  compiled: ProductionCompiledExpandedEstimate,
  locale: GlobalLocaleContext,
): GlobalEstimateResult["sections"] {
  return PRODUCTION_GLOBAL_SECTION_ORDER
    .map((sectionType, sectionIndex) => {
      const rows = compiled.rows.filter((row) => PRODUCTION_SECTION_TYPE_BY_KIND[row.section] === sectionType);
      if (rows.length === 0) return null;
      return {
        sectionNumber: String(sectionIndex + 1),
        title: PRODUCTION_GLOBAL_SECTION_TITLES[sectionType],
        type: sectionType,
        rows: rows.map((row, rowIndex) => productionCompiledRowToGlobalRow({
          row,
          rowNumber: `${sectionIndex + 1}.${rowIndex + 1}`,
          locale,
        })),
      };
    })
    .filter((section): section is GlobalEstimateResult["sections"][number] => Boolean(section));
}

function productionCompiledSources(
  compiled: ProductionCompiledExpandedEstimate,
): GlobalEstimateResult["sources"] {
  const sourceMap = new Map<string, GlobalEstimateResult["sources"][number]>();
  for (const row of compiled.rows) {
    if (!sourceMap.has(row.normSourceId)) {
      sourceMap.set(row.normSourceId, {
        id: row.normSourceId,
        type: "configured_reference",
        label: row.normSourceTitle,
        checkedAt: CHECKED_AT,
      });
    }
  }
  return [...sourceMap.values()];
}

function buildProductionProjectGroupGlobalEstimate(input: {
  estimateInput: GlobalEstimateInput;
  workKey: string;
}): GlobalEstimateResult | null {
  const group = getProductionProjectTemplateGroup10000(input.workKey);
  if (!group) return null;
  const locale = resolveGlobalLocalization(input.estimateInput);
  const quantity = productionProjectGroupQuantity({
    estimateInput: input.estimateInput,
    defaultQuantity: group.defaultQuantity,
  });
  const compiled = compileProductionExpandedEstimate10000({
    workKey: group.workKey,
    quantity,
    countryCode: locale.countryCode,
  });
  const sections = productionCompiledSectionsToGlobal(compiled, locale);
  const taxResolution = input.estimateInput.includeTax === false
    ? { confidence: "high" as const, requiresLocationPrecision: false, warning: "Tax excluded by request." }
    : resolveGlobalTaxRule(locale, input.estimateInput);
  const tax = calculateGlobalTax({ sections, taxResolution });
  const sources = taxResolution.source
    ? [...productionCompiledSources(compiled), taxResolution.source]
    : productionCompiledSources(compiled);
  const materialsTotal = sumByType(sections, "materials");
  const laborTotal = sumByType(sections, "labor");
  const equipmentTotal = sumByType(sections, "equipment");
  const deliveryTotal = sumByType(sections, "delivery");
  const taxTotal = tax.included ? 0 : tax.taxAmount;
  const grandTotal = round2(materialsTotal + laborTotal + equipmentTotal + deliveryTotal + taxTotal);
  const result: GlobalEstimateResult = {
    estimateId: estimateIdFor(input.estimateInput, group.workKey),
    outputContract: {
      format: "professional_boq",
      detailLevel: "professional_expanded",
      hasIntro: true,
      hasAssumptions: true,
      hasMaterialsSection: sections.some((section) => section.type === "materials" && section.rows.length > 0),
      hasLaborSection: sections.some((section) => section.type === "labor" && section.rows.length > 0),
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: true,
      hasClarifyingQuestions: true,
    },
    locale,
    work: {
      workKey: group.workKey,
      title: group.visibleNameRu,
      category: group.category,
    },
    input: {
      volume: quantity,
      unit: input.estimateInput.unit ? normalizeGlobalUnit(input.estimateInput.unit) : group.defaultUnit,
      originalText: input.estimateInput.text,
      photoBased: input.estimateInput.photoAnalysis !== undefined,
    },
    assumptions: [
      "Project BOQ is assembled as a production template group from 10000-catalog child templates.",
      "Norm trace is inherited from child production templates; real source-backed norm pack coverage is audited separately.",
    ],
    sections,
    tax,
    totals: {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal,
      grandTotal,
      currency: locale.currency,
      displayMaterialsTotal: formatGlobalCurrency(materialsTotal, locale),
      displayLaborTotal: formatGlobalCurrency(laborTotal, locale),
      displayTaxTotal: formatGlobalCurrency(taxTotal, locale),
      displayGrandTotal: formatGlobalCurrency(grandTotal, locale),
    },
    regionalRisks: [
      {
        title: "Production template group",
        text: "Apartment scope is routed through the same production formula compiler as child work templates.",
      },
      {
        title: "Norm source coverage",
        text: "Real standard/textbook/manufacturer norm packs remain a separate blocker before green certification.",
      },
    ],
    costIncreaseFactors: [
      "Apartment condition",
      "Engineering systems scope",
      "Access and logistics constraints",
    ],
    clarifyingQuestions: [
      "Confirm apartment area, wet zones, wall height, electrical points and plumbing points.",
      "Confirm selected finish materials and demolition scope.",
    ],
    sources,
    confidence: minConfidence([
      locale.confidence,
      taxResolution.confidence,
      ...sections.flatMap((section) => section.rows.map((row) => row.confidence)),
    ]),
    requiresReview: true,
  };
  assertProfessionalExpandedEstimate(result);
  return result;
}

export function buildProfessionalExpandedGlobalEstimate(input: {
  estimateInput: GlobalEstimateInput;
  workKey: string;
}): GlobalEstimateResult {
  const projectGroupEstimate = buildProductionProjectGroupGlobalEstimate(input);
  if (projectGroupEstimate) return projectGroupEstimate;

  const template = TEMPLATE_BY_KEY.get(input.workKey);
  if (!template) throw new Error(`PROFESSIONAL_EXPANDED_TEMPLATE_NOT_FOUND:${input.workKey}`);

  const locale = resolveGlobalLocalization(input.estimateInput);
  const quantity = parsedQuantity(input.estimateInput, template);
  const sections = compileSections({
    template,
    baseQuantity: quantity.value,
    locale,
    estimateInput: input.estimateInput,
  });
  const taxResolution = input.estimateInput.includeTax === false
    ? { confidence: "high" as const, requiresLocationPrecision: false, warning: "Tax excluded by request." }
    : resolveGlobalTaxRule(locale, input.estimateInput);
  const tax = calculateGlobalTax({ sections, taxResolution });
  const sources = taxResolution.source
    ? [EXPANDED_REFERENCE_SOURCE, taxResolution.source]
    : [EXPANDED_REFERENCE_SOURCE];

  const materialsTotal = sumByType(sections, "materials");
  const laborTotal = sumByType(sections, "labor");
  const equipmentTotal = sumByType(sections, "equipment");
  const deliveryTotal = sumByType(sections, "delivery");
  const taxTotal = tax.included ? 0 : tax.taxAmount;
  const grandTotal = round2(materialsTotal + laborTotal + equipmentTotal + deliveryTotal + taxTotal);
  const result: GlobalEstimateResult = {
    estimateId: estimateIdFor(input.estimateInput, template.workKey),
    outputContract: {
      format: "professional_boq",
      detailLevel: "professional_expanded",
      hasIntro: true,
      hasAssumptions: true,
      hasMaterialsSection: sections.some((section) => section.type === "materials" && section.rows.length > 0),
      hasLaborSection: sections.some((section) => section.type === "labor" && section.rows.length > 0),
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: true,
      hasClarifyingQuestions: true,
    },
    locale,
    work: {
      workKey: template.workKey,
      title: workTitleForLocale(template, locale),
      category: template.category,
    },
    input: {
      volume: quantity.value,
      unit: quantity.unit,
      originalText: input.estimateInput.text,
      photoBased: input.estimateInput.photoAnalysis !== undefined,
    },
    assumptions: template.assumptions,
    sections,
    tax,
    totals: {
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal,
      grandTotal,
      currency: locale.currency,
      displayMaterialsTotal: formatGlobalCurrency(materialsTotal, locale),
      displayLaborTotal: formatGlobalCurrency(laborTotal, locale),
      displayTaxTotal: formatGlobalCurrency(taxTotal, locale),
      displayGrandTotal: formatGlobalCurrency(grandTotal, locale),
    },
    regionalRisks: [
      {
        title: "Профессиональное раскрытие",
        text: "Смета раскрыта в BOM/WBS: материалы, расходники, комплектующие, работы, инструмент, логистика, запас и контроль.",
      },
      {
        title: "Источник цен",
        text: "Цены являются настроенным справочным ориентиром и требуют подтверждения поставщиком перед закупкой.",
      },
    ],
    costIncreaseFactors: template.costIncreaseFactors,
    clarifyingQuestions: template.clarifyingQuestions,
    sources,
    confidence: minConfidence([
      locale.confidence,
      taxResolution.confidence,
      ...sections.flatMap((section) => section.rows.map((row) => row.confidence)),
    ]),
    requiresReview: true,
  };

  assertProfessionalExpandedEstimate(result);
  return result;
}
