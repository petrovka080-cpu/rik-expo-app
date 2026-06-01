import {
  GLOBAL_WORK_TYPE_DEFINITIONS,
} from "./globalWorkTypeResolver";
import { GLOBAL_150_WORK_TYPE_BOQ_HINTS } from "./globalConstructionWorkTypeCatalog150";
import { BUILT_IN_AI_1000_BOQ_HINTS } from "../builtInAi1000/builtInAi1000ConstructionCases";
import type {
  GlobalEstimateTemplate,
  GlobalEstimateTemplateRowDefinition,
  GlobalPriceSourceType,
  GlobalRateRecord,
  GlobalTaxRule,
  GlobalUnitInput,
  GlobalWorkTypeDefinition,
} from "./globalEstimateTypes";

const CHECKED_AT = "2026-05-22T00:00:00+06:00";
const EFFECTIVE_FROM = "2026-01-01";

export const GLOBAL_PRICE_SOURCES: {
  id: string;
  type: GlobalPriceSourceType;
  label: string;
  countryCode?: string;
  url?: string;
  checkedAt: string;
}[] = [
  {
    id: "src_configured_global_reference_2026",
    type: "configured_reference",
    label: "Configured global construction reference rates",
    checkedAt: CHECKED_AT,
  },
  {
    id: "src_configured_regional_reference_2026",
    type: "configured_reference",
    label: "Configured regional construction reference rates",
    checkedAt: CHECKED_AT,
  },
  {
    id: "src_configured_tax_reference_2026",
    type: "configured_reference",
    label: "Configured tax reference rule; precise tax may require provider or official lookup",
    checkedAt: CHECKED_AT,
  },
];

function row(params: Omit<GlobalEstimateTemplateRowDefinition, "required" | "sortOrder"> & {
  required?: boolean;
  sortOrder?: number;
}): GlobalEstimateTemplateRowDefinition {
  return {
    required: true,
    sortOrder: Number(params.rowNumber.replace(/\D/g, "")) || 0,
    ...params,
  };
}

const laminateRows: GlobalEstimateTemplateRowDefinition[] = [
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.1",
    code: "laminate_board",
    names: { ru: "Ламинат 33 класс с запасом 10%", en: "Class 33 laminate flooring with 10% waste allowance", de: "Laminat Klasse 33 mit 10% Verschnitt" },
    quantityFormula: "area * 1.10",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "laminate_board",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.2",
    code: "underlayment",
    names: { ru: "Подложка под ламинат", en: "Laminate underlayment", de: "Trittschalldammung" },
    quantityFormula: "area * 1.05",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "underlayment",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.3",
    code: "baseboard",
    names: { ru: "Плинтус напольный", en: "Baseboard", de: "Sockelleiste" },
    quantityFormula: "sqrt(area) * 8",
    unitMetric: "linear_m",
    unitImperial: "linear_ft",
    rateKey: "baseboard",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.4",
    code: "baseboard_fittings",
    names: { ru: "Фурнитура для плинтуса", en: "Baseboard fittings", de: "Sockelleisten-Zubehor" },
    quantityFormula: "1",
    unitMetric: "set",
    unitImperial: "set",
    rateKey: "baseboard_fittings",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.5",
    code: "thresholds",
    names: { ru: "Пороги стыковочные межкомнатные", en: "Doorway transition thresholds", de: "Ubergangsprofile" },
    quantityFormula: "ceil(area / 20)",
    unitMetric: "pcs",
    unitImperial: "pcs",
    rateKey: "thresholds",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.1",
    code: "floor_priming",
    names: { ru: "Грунтование основания", en: "Subfloor priming", de: "Grundierung des Untergrunds" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "floor_priming",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.2",
    code: "underlayment_install",
    names: { ru: "Настил подложки", en: "Underlayment installation", de: "Unterlage verlegen" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "underlayment_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.3",
    code: "laminate_install",
    names: { ru: "Укладка ламината", en: "Laminate installation", de: "Laminat verlegen" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "laminate_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.4",
    code: "baseboard_install",
    names: { ru: "Монтаж напольного плинтуса", en: "Baseboard installation", de: "Sockelleisten montieren" },
    quantityFormula: "sqrt(area) * 8",
    unitMetric: "linear_m",
    unitImperial: "linear_ft",
    rateKey: "baseboard_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.5",
    code: "threshold_install",
    names: { ru: "Установка межкомнатных порогов", en: "Threshold installation", de: "Ubergangsprofile montieren" },
    quantityFormula: "ceil(area / 20)",
    unitMetric: "pcs",
    unitImperial: "pcs",
    rateKey: "threshold_install",
  }),
];

const asphaltRows: GlobalEstimateTemplateRowDefinition[] = [
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.1",
    code: "geotextile",
    names: { ru: "Геотекстиль", en: "Geotextile" },
    quantityFormula: "area * 1.05",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "geotextile",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.2",
    code: "sand_base",
    names: { ru: "Песчаное основание", en: "Sand base" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "sand_base",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.3",
    code: "crushed_stone_base",
    names: { ru: "Щебеночное основание", en: "Crushed stone base" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "crushed_stone_base",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.4",
    code: "bitumen_emulsion",
    names: { ru: "Битумная эмульсия", en: "Bitumen emulsion tack coat" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "bitumen_emulsion",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.5",
    code: "asphalt_lower_coarse",
    names: { ru: "Нижний слой крупнозернистого асфальтобетона", en: "Lower coarse asphalt layer" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "asphalt_lower_coarse",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.6",
    code: "asphalt_top_fine",
    names: { ru: "Верхний слой мелкозернистого асфальтобетона", en: "Top fine asphalt layer" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "asphalt_top_fine",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.7",
    code: "road_marking_optional",
    names: { ru: "Дорожная разметка", en: "Road marking" },
    quantityFormula: "area * 0.15",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "road_marking_optional",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.1",
    code: "site_cleaning",
    names: { ru: "Очистка и подготовка площадки", en: "Site cleaning and preparation" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "site_cleaning",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.2",
    code: "grading_compaction",
    names: { ru: "Планировка и уплотнение основания", en: "Grading and compaction" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "grading_compaction",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.3",
    code: "sand_base_install",
    names: { ru: "Устройство песчаного основания", en: "Sand base installation" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "sand_base_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.4",
    code: "crushed_stone_base_install",
    names: { ru: "Устройство щебеночного основания", en: "Crushed stone base installation" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "crushed_stone_base_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.5",
    code: "tack_coat_application",
    names: { ru: "Нанесение битумной эмульсии", en: "Tack coat application" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "tack_coat_application",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.6",
    code: "asphalt_lower_laying",
    names: { ru: "Укладка нижнего слоя асфальта", en: "Lower asphalt laying" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "asphalt_lower_laying",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.7",
    code: "asphalt_top_laying",
    names: { ru: "Укладка верхнего слоя асфальта", en: "Top asphalt laying" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "asphalt_top_laying",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.8",
    code: "equipment_mobilization",
    names: { ru: "Мобилизация техники", en: "Equipment mobilization" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "equipment_mobilization",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.9",
    code: "geodesy_quality_control",
    names: { ru: "Геодезия и контроль качества", en: "Geodesy and quality control" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "geodesy_quality_control",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.10",
    code: "final_cleanup",
    names: { ru: "Финальная уборка территории", en: "Final cleanup" },
    quantityFormula: "area",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "final_cleanup",
  }),
];

const stripFoundationRows: GlobalEstimateTemplateRowDefinition[] = [
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.1",
    code: "strip_foundation_sand_cushion",
    names: { ru: "Песчаная подушка", en: "Sand cushion" },
    quantityFormula: "strip_foundation_sand_volume_m3",
    unitMetric: "m3",
    unitImperial: "cu_ft",
    rateKey: "strip_foundation_sand_cushion",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.2",
    code: "strip_foundation_crushed_stone_base",
    names: { ru: "Щебёночная подготовка", en: "Crushed stone base" },
    quantityFormula: "strip_foundation_gravel_volume_m3",
    unitMetric: "m3",
    unitImperial: "cu_ft",
    rateKey: "strip_foundation_crushed_stone_base",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.3",
    code: "strip_foundation_geotextile",
    names: { ru: "Геотекстиль под основание", en: "Geotextile under base" },
    quantityFormula: "strip_foundation_base_area_m2",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "strip_foundation_geotextile",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.4",
    code: "strip_foundation_formwork_material",
    names: { ru: "Материалы опалубки", en: "Formwork materials" },
    quantityFormula: "strip_foundation_formwork_area_m2",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "strip_foundation_formwork_material",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.5",
    code: "strip_foundation_longitudinal_rebar",
    names: { ru: "Продольная арматура", en: "Longitudinal rebar" },
    quantityFormula: "strip_foundation_longitudinal_rebar_kg",
    unitMetric: "kg",
    unitImperial: "lbs",
    rateKey: "strip_foundation_longitudinal_rebar",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.6",
    code: "strip_foundation_stirrups_rebar",
    names: { ru: "Хомуты / поперечная арматура", en: "Stirrups and transverse rebar" },
    quantityFormula: "strip_foundation_stirrups_rebar_kg",
    unitMetric: "kg",
    unitImperial: "lbs",
    rateKey: "strip_foundation_stirrups_rebar",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.7",
    code: "strip_foundation_binding_wire",
    names: { ru: "Вязальная проволока", en: "Binding wire" },
    quantityFormula: "strip_foundation_wire_kg",
    unitMetric: "kg",
    unitImperial: "lbs",
    rateKey: "strip_foundation_binding_wire",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.8",
    code: "strip_foundation_rebar_spacers",
    names: { ru: "Фиксаторы арматуры", en: "Rebar spacers" },
    quantityFormula: "strip_foundation_spacers_pcs",
    unitMetric: "pcs",
    unitImperial: "pcs",
    rateKey: "strip_foundation_rebar_spacers",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.9",
    code: "strip_foundation_concrete_m300",
    names: { ru: "Бетон для ленточного фундамента", en: "Concrete for strip foundation" },
    quantityFormula: "strip_foundation_concrete_volume_m3",
    unitMetric: "m3",
    unitImperial: "cu_ft",
    rateKey: "strip_foundation_concrete_m300",
  }),
  row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: "1.10",
    code: "strip_foundation_waterproofing_material",
    names: { ru: "Гидроизоляция фундамента: материал", en: "Foundation waterproofing material" },
    quantityFormula: "strip_foundation_waterproofing_area_m2",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "strip_foundation_waterproofing_material",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.1",
    code: "strip_foundation_excavation",
    names: { ru: "Разработка траншеи / земляные работы", en: "Trench excavation" },
    quantityFormula: "strip_foundation_trench_volume_m3",
    unitMetric: "m3",
    unitImperial: "cu_ft",
    rateKey: "strip_foundation_excavation",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.2",
    code: "strip_foundation_formwork_install",
    names: { ru: "Монтаж опалубки", en: "Formwork installation" },
    quantityFormula: "strip_foundation_formwork_area_m2",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "strip_foundation_formwork_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.3",
    code: "strip_foundation_rebar_tying",
    names: { ru: "Вязка арматурного каркаса", en: "Rebar cage tying" },
    quantityFormula: "strip_foundation_total_rebar_kg",
    unitMetric: "kg",
    unitImperial: "lbs",
    rateKey: "strip_foundation_rebar_tying",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.4",
    code: "strip_foundation_concrete_pour",
    names: { ru: "Заливка бетона", en: "Concrete pouring" },
    quantityFormula: "strip_foundation_concrete_volume_m3",
    unitMetric: "m3",
    unitImperial: "cu_ft",
    rateKey: "strip_foundation_concrete_pour",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.5",
    code: "strip_foundation_concrete_vibration",
    names: { ru: "Вибрирование бетона", en: "Concrete vibration" },
    quantityFormula: "strip_foundation_concrete_volume_m3",
    unitMetric: "m3",
    unitImperial: "cu_ft",
    rateKey: "strip_foundation_concrete_vibration",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.6",
    code: "strip_foundation_concrete_curing",
    names: { ru: "Уход за бетоном", en: "Concrete curing" },
    quantityFormula: "strip_foundation_top_area_m2",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "strip_foundation_concrete_curing",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.7",
    code: "strip_foundation_waterproofing_install",
    names: { ru: "Нанесение гидроизоляции фундамента", en: "Foundation waterproofing installation" },
    quantityFormula: "strip_foundation_waterproofing_area_m2",
    unitMetric: "sq_m",
    unitImperial: "sq_ft",
    rateKey: "strip_foundation_waterproofing_install",
  }),
  row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: "2.8",
    code: "strip_foundation_backfill",
    names: { ru: "Обратная засыпка / вывоз лишнего грунта", en: "Backfill and excess soil handling" },
    quantityFormula: "strip_foundation_backfill_m3",
    unitMetric: "m3",
    unitImperial: "cu_ft",
    rateKey: "strip_foundation_backfill",
  }),
  row({
    sectionType: "delivery",
    sectionNumber: "3",
    rowNumber: "3.1",
    code: "strip_foundation_concrete_delivery",
    names: { ru: "Доставка бетона / миксер", en: "Concrete delivery mixer" },
    quantityFormula: "strip_foundation_concrete_volume_m3",
    unitMetric: "m3",
    unitImperial: "cu_ft",
    rateKey: "strip_foundation_concrete_delivery",
  }),
  row({
    sectionType: "equipment",
    sectionNumber: "3",
    rowNumber: "3.2",
    code: "strip_foundation_concrete_pump",
    names: { ru: "Бетононасос: требуется уточнить доступ техники", en: "Concrete pump: access to be confirmed" },
    quantityFormula: "strip_foundation_pump_set",
    unitMetric: "set",
    unitImperial: "set",
    rateKey: "strip_foundation_concrete_pump",
  }),
];

type KnownWorkTemplateMaterialRow = {
  code: string;
  nameRu: string;
  nameEn: string;
  formula?: string;
  rateKind?: "material" | "auxiliary";
  unitMetric?: GlobalUnitInput["normalizedUnit"];
  unitImperial?: GlobalUnitInput["normalizedUnit"];
};

type KnownWorkTemplateLaborRow = {
  code: string;
  nameRu: string;
  nameEn: string;
  formula?: string;
  unitMetric?: GlobalUnitInput["normalizedUnit"];
  unitImperial?: GlobalUnitInput["normalizedUnit"];
};

function knownWorkTemplate(input: {
  workKey: string;
  materialRows: KnownWorkTemplateMaterialRow[];
  laborRows: KnownWorkTemplateLaborRow[];
  assumptionsRu: string[];
  questionsRu: string[];
}): GlobalEstimateTemplate {
  function materialFormula(item: { code: string; formula?: string }, index: number): string {
    if (item.formula) return item.formula;
    if (/gable_roof_(membrane|covering)/.test(item.code)) return "area * 1.15";
    if (/gable_roof_batten/.test(item.code)) return "area";
    if (/gable_roof_flashings/.test(item.code)) return "area * 0.20";
    return index === 0 ? "area * 1.08" : "area * 0.18";
  }
  const materialRows = input.materialRows.map((item, index) => row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: `1.${index + 1}`,
    code: item.code,
    names: { ru: item.nameRu, en: item.nameEn },
    quantityFormula: materialFormula(item, index),
    unitMetric: item.unitMetric ?? "sq_m",
    unitImperial: item.unitImperial ?? "sq_ft",
    rateKey: `${input.workKey}_${item.rateKind === "auxiliary" ? "auxiliary" : "material"}`,
  }));
  const laborRows = input.laborRows.map((item, index) => row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: `2.${index + 1}`,
    code: item.code,
    names: { ru: item.nameRu, en: item.nameEn },
    quantityFormula: item.formula ?? "area",
    unitMetric: item.unitMetric ?? "sq_m",
    unitImperial: item.unitImperial ?? "sq_ft",
    rateKey: `${input.workKey}_labor`,
  }));
  const deliveryRows = [
    row({
      sectionType: "delivery",
      sectionNumber: "3",
      rowNumber: "3.1",
      code: `${input.workKey}_delivery_access_warning`,
      names: { ru: "Доставка / подъем / доступ: требуется уточнение", en: "Delivery, lifting and access: to be confirmed" },
      quantityFormula: "1",
      unitMetric: "set",
      unitImperial: "set",
      rateKey: `${input.workKey}_delivery`,
    }),
    row({
      sectionType: "equipment",
      sectionNumber: "3",
      rowNumber: "3.2",
      code: `${input.workKey}_equipment_mobilization_warning`,
      names: { ru: "Техника / инвентарь: требуется уточнение", en: "Equipment and tools: to be confirmed" },
      quantityFormula: "1",
      unitMetric: "set",
      unitImperial: "set",
      rateKey: `${input.workKey}_equipment`,
    }),
  ];
  return {
    workKey: input.workKey,
    inputMeasure: "area",
    defaultUnitMetric: "sq_m",
    defaultUnitImperial: "sq_ft",
    sections: [
      {
        type: "materials",
        sectionNumber: "1",
        title: { ru: "Материалы и комплектующие", en: "Materials and supplies" },
        rows: materialRows,
      },
      {
        type: "labor",
        sectionNumber: "2",
        title: { ru: "Работы / монтаж / техника", en: "Labor / installation / equipment" },
        rows: laborRows,
      },
      {
        type: "delivery",
        sectionNumber: "3",
        title: { ru: "Оборудование / доставка", en: "Equipment / delivery" },
        rows: deliveryRows,
      },
    ],
    assumptions: {
      ru: input.assumptionsRu,
      en: [
        "The estimate uses a work-specific backend template for the stated quantity.",
        "Hidden defects, delivery and lifting are reviewed before contract.",
        "Rates come from backend pricebook entries with source evidence.",
      ],
    },
    regionalRiskKeys: ["site_access", "surface_condition", "delivery_and_lifting", "local_tax_precision"],
    clarifyingQuestions: {
      ru: input.questionsRu,
      en: [
        "What city is the project located in?",
        "What is the current base or surface condition?",
        "Are there delivery, lifting, access or deadline constraints?",
      ],
    },
  };
}

export const CARPET_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "carpet_laying",
  materialRows: [
    { code: "carpet_covering", nameRu: "Ковролин с запасом на подрезку", nameEn: "Carpet with cutting waste allowance" },
    { code: "carpet_underlay", nameRu: "Подложка под ковролин", nameEn: "Carpet underlay", rateKind: "auxiliary" },
    { code: "carpet_glue_tape", nameRu: "Клей/лента для фиксации ковролина", nameEn: "Carpet adhesive or fixing tape", rateKind: "auxiliary" },
    { code: "carpet_baseboard_thresholds", nameRu: "Плинтус или порожки для примыканий", nameEn: "Baseboards or thresholds for transitions", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "carpet_base_preparation", nameRu: "Подготовка основания", nameEn: "Base preparation" },
    { code: "carpet_laying_work", nameRu: "Укладка ковролина", nameEn: "Carpet laying" },
    { code: "carpet_cutting", nameRu: "Подрезка и подгонка ковролина", nameEn: "Carpet cutting and fitting" },
  ],
  assumptionsRu: [
    "Расчёт выполнен для укладки ковролина по подготовленному основанию.",
    "Демонтаж старого покрытия, выравнивание и доставка уточняются отдельно.",
    "Материалы рассчитаны с запасом на подрезку.",
  ],
  questionsRu: [
    "Какое текущее основание пола?",
    "Нужен ли демонтаж старого покрытия или выравнивание?",
    "Нужны ли плинтусы, порожки и доставка материала?",
  ],
});

export const DRYWALL_PARTITION_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "drywall_partition",
  materialRows: [
    { code: "drywall_sheets", nameRu: "Листы ГКЛ", nameEn: "Drywall sheets" },
    { code: "drywall_track_profile", nameRu: "Направляющий профиль", nameEn: "Track profile", rateKind: "auxiliary" },
    { code: "drywall_stud_profile", nameRu: "Стоечный профиль", nameEn: "Stud profile", rateKind: "auxiliary" },
    { code: "drywall_fasteners", nameRu: "Крепёж для ГКЛ и профиля", nameEn: "Drywall and profile fasteners", rateKind: "auxiliary" },
    { code: "drywall_insulation", nameRu: "Утеплитель / звукоизоляция", nameEn: "Insulation or acoustic fill", rateKind: "auxiliary" },
    { code: "drywall_joint_tape", nameRu: "Лента для швов", nameEn: "Joint tape", rateKind: "auxiliary" },
    { code: "drywall_joint_putty", nameRu: "Шпаклёвка швов", nameEn: "Joint putty", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "drywall_frame_install", nameRu: "Монтаж каркаса", nameEn: "Frame installation" },
    { code: "drywall_sheet_install", nameRu: "Обшивка ГКЛ", nameEn: "Drywall sheet lining" },
    { code: "drywall_joint_finishing", nameRu: "Заделка и шпаклёвка швов", nameEn: "Joint finishing" },
  ],
  assumptionsRu: [
    "Расчёт выполнен для монтажа ГКЛ по типовой каркасной системе.",
    "Толщина листа, шаг профиля, звукоизоляция и влажностойкий ГКЛ уточняются перед договором.",
    "Цены берутся из backend pricebook с источниками.",
  ],
  questionsRu: [
    "Это перегородка, облицовка стены или потолок?",
    "Нужен ли влагостойкий/огнестойкий ГКЛ или звукоизоляция?",
    "Какая высота, количество слоёв и состояние основания?",
  ],
});

export const DRYWALL_WALL_CLADDING_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "drywall_wall_cladding",
  materialRows: [
    { code: "drywall_wall_cladding_sheets", nameRu: "Листы ГКЛ для облицовки стен", nameEn: "Drywall sheets for wall cladding" },
    { code: "drywall_wall_cladding_track_profile", nameRu: "Направляющий профиль", nameEn: "Track profile", rateKind: "auxiliary" },
    { code: "drywall_wall_cladding_stud_profile", nameRu: "Стоечный профиль", nameEn: "Stud profile", rateKind: "auxiliary" },
    { code: "drywall_wall_cladding_fasteners", nameRu: "Крепёж для ГКЛ и профиля", nameEn: "Drywall and profile fasteners", rateKind: "auxiliary" },
    { code: "drywall_wall_cladding_joint_tape", nameRu: "Лента для швов", nameEn: "Joint tape", rateKind: "auxiliary" },
    { code: "drywall_wall_cladding_joint_putty", nameRu: "Шпаклёвка швов", nameEn: "Joint putty", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "drywall_wall_cladding_frame_install", nameRu: "Монтаж каркаса на стены", nameEn: "Wall frame installation" },
    { code: "drywall_wall_cladding_sheet_install", nameRu: "Обшивка ГКЛ", nameEn: "Drywall sheet lining" },
    { code: "drywall_wall_cladding_joint_finishing", nameRu: "Заделка и шпаклёвка швов", nameEn: "Joint finishing" },
  ],
  assumptionsRu: [
    "Расчёт выполнен для облицовки стен ГКЛ по каркасной системе.",
    "Тип ГКЛ, шаг профиля, количество слоёв и подготовка основания уточняются перед договором.",
    "Цены берутся из backend pricebook с источниками.",
  ],
  questionsRu: [
    "Нужен обычный, влагостойкий или огнестойкий ГКЛ?",
    "Сколько слоёв ГКЛ и какая высота стен?",
    "Нужны ли утепление, звукоизоляция, демонтаж или подготовка основания?",
  ],
});

export const DRYWALL_CEILING_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "drywall_ceiling",
  materialRows: [
    { code: "drywall_ceiling_sheets", nameRu: "Листы ГКЛ", nameEn: "Drywall sheets" },
    { code: "drywall_ceiling_track_profile", nameRu: "Направляющий профиль", nameEn: "Track profile", rateKind: "auxiliary" },
    { code: "drywall_ceiling_ceiling_profile", nameRu: "Потолочный/стоечный профиль", nameEn: "Ceiling or stud profile", rateKind: "auxiliary" },
    { code: "drywall_ceiling_suspensions", nameRu: "Подвесы для потолочного каркаса", nameEn: "Ceiling frame hangers", rateKind: "auxiliary" },
    { code: "drywall_ceiling_fasteners", nameRu: "Крепёж для ГКЛ и профиля", nameEn: "Drywall and profile fasteners", rateKind: "auxiliary" },
    { code: "drywall_ceiling_joint_tape", nameRu: "Лента для швов", nameEn: "Joint tape", rateKind: "auxiliary" },
    { code: "drywall_ceiling_joint_putty", nameRu: "Шпаклёвка швов", nameEn: "Joint putty", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "drywall_ceiling_frame_install", nameRu: "Монтаж каркаса потолка", nameEn: "Ceiling frame installation" },
    { code: "drywall_ceiling_sheet_install", nameRu: "Обшивка ГКЛ", nameEn: "Drywall sheet lining" },
    { code: "drywall_ceiling_joint_finishing", nameRu: "Заделка и шпаклёвка швов", nameEn: "Joint finishing" },
  ],
  assumptionsRu: [
    "Расчёт выполнен для монтажа потолка из ГКЛ по подвесному или каркасному решению.",
    "Высота помещения, шаг подвесов, светильники и люки уточняются перед договором.",
    "Цены берутся из backend pricebook с источниками.",
  ],
  questionsRu: [
    "Какая высота помещения и нужен ли подвесной каркас?",
    "Нужен ли влагостойкий/огнестойкий ГКЛ или звукоизоляция?",
    "Есть ли светильники, люки или сложная геометрия потолка?",
  ],
});

function ceramicTileTemplate(workKey: string): GlobalEstimateTemplate {
  return knownWorkTemplate({
    workKey,
    materialRows: [
      { code: `${workKey}_tile_with_waste`, nameRu: "Керамическая плитка с запасом на подрезку", nameEn: "Ceramic tile with waste allowance", formula: "area * 1.10" },
      { code: `${workKey}_adhesive`, nameRu: "Плиточный клей", nameEn: "Tile adhesive", rateKind: "auxiliary" },
      { code: `${workKey}_grout`, nameRu: "Затирка для швов", nameEn: "Tile grout", rateKind: "auxiliary" },
      { code: `${workKey}_primer`, nameRu: "Грунтовка основания", nameEn: "Substrate primer", rateKind: "auxiliary" },
    ],
    laborRows: [
      { code: `${workKey}_base_preparation`, nameRu: "Подготовка основания под плитку", nameEn: "Tile substrate preparation" },
      { code: `${workKey}_tile_laying`, nameRu: "Укладка плитки", nameEn: "Tile laying" },
      { code: `${workKey}_grout_work`, nameRu: "Затирка и очистка швов", nameEn: "Grouting and cleaning joints" },
    ],
    assumptionsRu: [
      "Расчет выполнен для укладки плитки по подготовленному основанию.",
      "Плитка рассчитана с запасом на подрезку; клей, затирка и грунтовка включены отдельными строками.",
      "Выравнивание основания, гидроизоляция и сложная раскладка уточняются перед договором.",
    ],
    questionsRu: [
      "Какой формат плитки и схема раскладки?",
      "Нужно ли выравнивание основания или гидроизоляция?",
      "Есть ли пороги, примыкания, теплый пол или сложная геометрия?",
    ],
  });
}

export const CERAMIC_TILE_TEMPLATE: GlobalEstimateTemplate = ceramicTileTemplate("ceramic_tile_laying");
export const CERAMIC_TILE_FLOOR_TEMPLATE: GlobalEstimateTemplate = ceramicTileTemplate("ceramic_tile_floor_laying");

export const GABLE_ROOF_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "gable_roof_installation",
  materialRows: [
    { code: "gable_roof_rafters", nameRu: "Стропила", nameEn: "Rafters", formula: "ceil(area / 4)", unitMetric: "pcs", unitImperial: "pcs" },
    { code: "gable_roof_wall_plate", nameRu: "Мауэрлат / брус", nameEn: "Wall plate timber", formula: "sqrt(area) * 4", unitMetric: "linear_m", unitImperial: "linear_ft", rateKind: "auxiliary" },
    { code: "gable_roof_membrane", nameRu: "Гидроизоляция / мембрана", nameEn: "Waterproofing membrane", formula: "area * 1.15", unitMetric: "sq_m", unitImperial: "sq_ft", rateKind: "auxiliary" },
    { code: "gable_roof_batten", nameRu: "Обрешётка", nameEn: "Roof battens", formula: "area * 1.20", unitMetric: "linear_m", unitImperial: "linear_ft", rateKind: "auxiliary" },
    { code: "gable_roof_covering", nameRu: "Кровельное покрытие", nameEn: "Roof covering" },
    { code: "gable_roof_flashings", nameRu: "Доборные элементы", nameEn: "Flashings and trim", formula: "sqrt(area) * 4", unitMetric: "linear_m", unitImperial: "linear_ft", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "gable_roof_rafter_install", nameRu: "Монтаж стропильной системы", nameEn: "Rafter system installation", formula: "ceil(area / 4)", unitMetric: "pcs", unitImperial: "pcs" },
    { code: "gable_roof_batten_install", nameRu: "Монтаж обрешётки", nameEn: "Batten installation", formula: "area * 1.20", unitMetric: "linear_m", unitImperial: "linear_ft" },
    { code: "gable_roof_covering_install", nameRu: "Монтаж кровли", nameEn: "Roof covering installation" },
  ],
  assumptionsRu: [
    "Расчёт выполнен для устройства двускатной крыши по основанию указанной площади.",
    "Уклон, тип покрытия, утепление, водостоки и работы на высоте требуют проверки специалистом.",
    "Доставка, подъём и сложная геометрия уточняются отдельно.",
  ],
  questionsRu: [
    "Какой тип кровельного покрытия нужен?",
    "Есть ли проект стропильной системы и какой уклон крыши?",
    "Нужно ли утепление, водостоки, снегозадержатели и доборные элементы?",
  ],
});

export const BRICK_MASONRY_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "brick_masonry",
  materialRows: [
    { code: "brick_masonry_brick", nameRu: "Кирпич", nameEn: "Brick" },
    { code: "brick_masonry_mortar", nameRu: "Раствор / кладочная смесь", nameEn: "Mortar or masonry mix", rateKind: "auxiliary" },
    { code: "brick_masonry_mesh", nameRu: "Кладочная сетка / армирование", nameEn: "Masonry mesh or reinforcement", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "brick_masonry_laying", nameRu: "Кладка кирпича", nameEn: "Brick laying" },
    { code: "brick_masonry_jointing", nameRu: "Расшивка / перевязка швов", nameEn: "Jointing and bond work" },
    { code: "brick_masonry_access_scaffold", nameRu: "Подмости для кирпичной кладки", nameEn: "Access scaffold for brick masonry" },
  ],
  assumptionsRu: [
    "Расчёт выполнен для кирпичной кладки по площади.",
    "Толщина стены, тип кирпича, армирование, леса, доставка и подъём уточняются перед договором.",
    "Цены берутся из backend pricebook с источниками.",
  ],
  questionsRu: [
    "Какая толщина стены и тип кирпича?",
    "Нужны ли леса, доставка и подъём материала?",
    "Нужно ли армирование кладки и расшивка лицевых швов?",
  ],
});

export const WINDOW_INSTALLATION_TEMPLATE: GlobalEstimateTemplate = {
  workKey: "window_installation",
  inputMeasure: "count",
  defaultUnitMetric: "pcs",
  defaultUnitImperial: "pcs",
  sections: [
    {
      type: "materials",
      sectionNumber: "1",
      title: { ru: "Материалы и комплектующие", en: "Materials and supplies" },
      rows: [
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.1", code: "window_installation_window_unit", names: { ru: "Оконный блок", en: "Window unit" }, quantityFormula: "area", unitMetric: "pcs", unitImperial: "pcs", rateKey: "window_installation_material" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.2", code: "window_installation_sill_drip", names: { ru: "Подоконник / отлив", en: "Sill and drip cap" }, quantityFormula: "area", unitMetric: "pcs", unitImperial: "pcs", rateKey: "window_installation_auxiliary" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.3", code: "window_installation_foam_fixings", names: { ru: "Монтажная пена / крепёж", en: "Foam and fixings" }, quantityFormula: "area", unitMetric: "pcs", unitImperial: "pcs", rateKey: "window_installation_auxiliary" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.4", code: "window_installation_slopes_warning", names: { ru: "Откосы: включить после уточнения", en: "Slopes: include after confirmation" }, quantityFormula: "area", unitMetric: "pcs", unitImperial: "pcs", rateKey: "window_installation_auxiliary" }),
      ],
    },
    {
      type: "labor",
      sectionNumber: "2",
      title: { ru: "Работы / монтаж", en: "Labor and installation" },
      rows: [
        row({ sectionType: "labor", sectionNumber: "2", rowNumber: "2.1", code: "window_installation_old_window_removal", names: { ru: "Демонтаж старого окна, если требуется", en: "Old window removal when required" }, quantityFormula: "area", unitMetric: "pcs", unitImperial: "pcs", rateKey: "window_installation_labor" }),
        row({ sectionType: "labor", sectionNumber: "2", rowNumber: "2.2", code: "window_installation_mount", names: { ru: "Монтаж окна", en: "Window installation" }, quantityFormula: "area", unitMetric: "pcs", unitImperial: "pcs", rateKey: "window_installation_labor" }),
        row({ sectionType: "labor", sectionNumber: "2", rowNumber: "2.3", code: "window_installation_sealing", names: { ru: "Герметизация монтажного шва", en: "Installation joint sealing" }, quantityFormula: "area", unitMetric: "pcs", unitImperial: "pcs", rateKey: "window_installation_labor" }),
      ],
    },
    {
      type: "delivery",
      sectionNumber: "3",
      title: { ru: "Доставка / доступ", en: "Delivery and access" },
      rows: [
        row({ sectionType: "delivery", sectionNumber: "3", rowNumber: "3.1", code: "window_installation_delivery", names: { ru: "Доставка / подъем оконного блока", en: "Delivery and lifting" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "window_installation_delivery" }),
      ],
    },
  ],
  assumptions: {
    ru: [
      "Расчёт выполнен для установки окон по количеству блоков.",
      "Размеры, профиль, стеклопакет, демонтаж и откосы уточняются перед договором.",
      "Цены берутся из backend pricebook с источниками.",
    ],
    en: [
      "Estimate is based on the number of window units.",
      "Dimensions, profile, glazing, removal and slopes are confirmed before contract.",
      "Rates come from backend pricebook entries with source evidence.",
    ],
  },
  regionalRiskKeys: ["site_access", "delivery_and_lifting", "local_tax_precision"],
  clarifyingQuestions: {
    ru: [
      "Сколько окон и какие размеры?",
      "Нужен ли демонтаж старых окон?",
      "Входят ли откосы, подоконник, отлив и доставка?",
    ],
    en: [
      "How many windows and what dimensions?",
      "Is old window removal required?",
      "Are slopes, sill, drip cap and delivery included?",
    ],
  },
};

export const MICRO_HYDRO_TURBINE_TEMPLATE: GlobalEstimateTemplate = {
  workKey: "micro_hydro_preparation",
  inputMeasure: "set",
  defaultUnitMetric: "set",
  defaultUnitImperial: "set",
  sections: [
    {
      type: "materials",
      sectionNumber: "1",
      title: { ru: "Оборудование и материалы", en: "Equipment and materials" },
      rows: [
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.1", code: "micro_hydro_pre_survey", names: { ru: "Предпроектное обследование", en: "Pre-design survey" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_auxiliary" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.2", code: "micro_hydro_hydraulic_calculation", names: { ru: "Гидравлический расчёт", en: "Hydraulic calculation" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_auxiliary" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.3", code: "micro_hydro_turbine", names: { ru: "Турбина для микро-ГЭС", en: "Micro hydro turbine" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_material" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.4", code: "micro_hydro_generator", names: { ru: "Генератор", en: "Generator" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_material" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.5", code: "micro_hydro_frame_coupling_mounts", names: { ru: "Рама / муфта / виброопоры", en: "Frame, coupling and vibration mounts" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_material" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.6", code: "micro_hydro_control_cabinet", names: { ru: "Шкаф управления", en: "Control cabinet" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_material" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.7", code: "micro_hydro_protection_sync", names: { ru: "Защита / синхронизация", en: "Protection and synchronization" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_material" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.8", code: "micro_hydro_cables_switchgear", names: { ru: "Кабели и щит 0,4 кВ", en: "Cables and 0.4 kV switchboard" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_material" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.9", code: "micro_hydro_hydromechanics", names: { ru: "Гидромеханика", en: "Hydromechanical items" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_material" }),
        row({ sectionType: "materials", sectionNumber: "1", rowNumber: "1.10", code: "micro_hydro_metalworks", names: { ru: "Металлоконструкции", en: "Metal structures" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_material" }),
      ],
    },
    {
      type: "labor",
      sectionNumber: "2",
      title: { ru: "Работы / монтаж / ПНР", en: "Labor, installation and commissioning" },
      rows: [
        row({ sectionType: "labor", sectionNumber: "2", rowNumber: "2.1", code: "micro_hydro_local_civil_works", names: { ru: "Подготовка машинного зала и закладных под агрегат", en: "Powerhouse preparation and embedded parts for unit" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_labor" }),
        row({ sectionType: "labor", sectionNumber: "2", rowNumber: "2.2", code: "micro_hydro_rigging", names: { ru: "Такелаж", en: "Rigging" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_labor" }),
        row({ sectionType: "labor", sectionNumber: "2", rowNumber: "2.3", code: "micro_hydro_installation", names: { ru: "Монтаж турбины и генератора", en: "Turbine and generator installation" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_labor" }),
        row({ sectionType: "labor", sectionNumber: "2", rowNumber: "2.4", code: "micro_hydro_commissioning", names: { ru: "ПНР", en: "Commissioning" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_labor" }),
        row({ sectionType: "labor", sectionNumber: "2", rowNumber: "2.5", code: "micro_hydro_training", names: { ru: "Обучение персонала", en: "Operator training" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_labor" }),
      ],
    },
    {
      type: "delivery",
      sectionNumber: "3",
      title: { ru: "Доставка / резерв / ограничения", en: "Delivery, contingency and exclusions" },
      rows: [
        row({ sectionType: "delivery", sectionNumber: "3", rowNumber: "3.1", code: "micro_hydro_delivery", names: { ru: "Доставка оборудования", en: "Equipment delivery" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_delivery" }),
        row({ sectionType: "equipment", sectionNumber: "3", rowNumber: "3.2", code: "micro_hydro_equipment_mobilization", names: { ru: "Мобилизация техники", en: "Equipment mobilization" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_equipment" }),
        row({ sectionType: "delivery", sectionNumber: "3", rowNumber: "3.3", code: "micro_hydro_contingency", names: { ru: "Резерв на уточнение проекта", en: "Design clarification contingency" }, quantityFormula: "1", unitMetric: "set", unitImperial: "set", rateKey: "micro_hydro_preparation_delivery" }),
      ],
    },
  ],
  assumptions: {
    ru: [
      "Расчёт выполнен как предварительная BOQ-смета для установки турбины микро-ГЭС.",
      "Что не включено: земляные работы большого объёма, разрешения, сетевое присоединение и капитальные гидротехнические сооружения без обследования.",
      "Что может увеличить стоимость: напор H, расход Q, состояние водовода, доступ, сезонность, требования к автоматике и синхронизации.",
    ],
    en: [
      "Estimate is a preliminary BOQ for a micro hydro turbine installation.",
      "Exclusions: major earthworks, permits, grid interconnection and capital hydraulic structures without survey.",
      "Cost drivers: head H, flow Q, penstock condition, access, seasonality, automation and synchronization requirements.",
    ],
  },
  regionalRiskKeys: ["site_access", "delivery_and_lifting", "local_tax_precision"],
  clarifyingQuestions: {
    ru: [
      "Какие напор H и расход Q?",
      "Какая схема водовода/трубы и состояние гидромеханики?",
      "Нужно ли подключение к сети, автономная работа или синхронизация?",
      "Есть ли проект, разрешения и доступ для такелажа?",
    ],
    en: [
      "What are head H and flow Q?",
      "What is the penstock/waterway configuration and hydromechanical condition?",
      "Is grid connection, island operation or synchronization required?",
      "Are design documents, permits and rigging access available?",
    ],
  },
};

function localizedWorkName(definition: GlobalWorkTypeDefinition, language: string): string {
  return definition.names[language] ?? definition.names.en ?? definition.names.ru ?? definition.workKey;
}

function genericTemplate(definition: GlobalWorkTypeDefinition): GlobalEstimateTemplate {
  const unitMetric = definition.defaultMeasureUnit;
  const unitImperial: GlobalUnitInput["normalizedUnit"] =
    unitMetric === "sq_m" ? "sq_ft" :
      unitMetric === "linear_m" ? "linear_ft" :
        unitMetric === "m3" ? "cu_ft" :
          unitMetric === "kg" ? "lbs" :
            unitMetric;
  const materialRate = `${definition.workKey}_material`;
  const auxiliaryRate = `${definition.workKey}_auxiliary`;
  const laborRate = `${definition.workKey}_labor`;
  const workRu = localizedWorkName(definition, "ru");
  const workEn = localizedWorkName(definition, "en");
  const baseBoqHints = GLOBAL_150_WORK_TYPE_BOQ_HINTS[definition.workKey] ?? BUILT_IN_AI_1000_BOQ_HINTS[definition.workKey] ?? [];
  const boqHints = definition.workKey === "ventilation_installation"
    ? [
        "Воздуховоды оцинкованные",
        "Фасонные части воздуховодов",
        "Решётки и диффузоры",
        "Вентилятор / вентиляционная установка",
        "Клапаны, шумоглушители и гибкие вставки",
        "Крепления и подвесы воздуховодов",
        "Разметка трасс вентиляции",
        "Монтаж воздуховодов",
        "Монтаж вентилятора / установки",
        "Тепло/шумоизоляция воздуховодов",
        "Пусконаладка и балансировка",
        "Проверка расхода воздуха и приемка",
      ]
    : baseBoqHints;
  const splitIndex = Math.max(1, Math.ceil(boqHints.length / 2));
  const materialHints = boqHints.length > 0 ? boqHints.slice(0, splitIndex) : [`Основной материал: ${workRu}`, "Расходные материалы и крепёж"];
  const laborHints = boqHints.length > 0 ? boqHints.slice(splitIndex) : [`Подготовка: ${workRu}`, workRu];
  const materialRows = materialHints.map((hint, index) => row({
    sectionType: "materials",
    sectionNumber: "1",
    rowNumber: `1.${index + 1}`,
    code: `${definition.workKey}_material_${index + 1}`,
    names: { ru: hint, en: hint },
    quantityFormula: index === 0 ? "area * 1.08" : "area * 0.20",
    unitMetric,
    unitImperial,
    rateKey: materialRate,
  }));
  const laborRows = (laborHints.length > 0 ? laborHints : [workRu]).map((hint, index) => row({
    sectionType: "labor",
    sectionNumber: "2",
    rowNumber: `2.${index + 1}`,
    code: `${definition.workKey}_labor_${index + 1}`,
    names: { ru: hint, en: hint },
    quantityFormula: "area",
    unitMetric,
    unitImperial,
    rateKey: laborRate,
  }));
  const paddedMaterialRows = [...materialRows];
  while (paddedMaterialRows.length < 4) {
    const index = paddedMaterialRows.length;
    paddedMaterialRows.push(row({
      sectionType: "materials",
      sectionNumber: "1",
      rowNumber: `1.${index + 1}`,
      code: `${definition.workKey}_material_extra_${index + 1}`,
      names: { ru: `Дополнительные материалы: ${workRu}`, en: `Additional materials: ${workEn}` },
      quantityFormula: "area * 0.10",
      unitMetric,
      unitImperial,
      rateKey: auxiliaryRate,
    }));
  }
  const paddedLaborRows = [...laborRows];
  while (paddedLaborRows.length < 4) {
    const index = paddedLaborRows.length;
    paddedLaborRows.push(row({
      sectionType: "labor",
      sectionNumber: "2",
      rowNumber: `2.${index + 1}`,
      code: `${definition.workKey}_labor_extra_${index + 1}`,
      names: { ru: `Дополнительные работы: ${workRu}`, en: `Additional labor: ${workEn}` },
      quantityFormula: "area",
      unitMetric,
      unitImperial,
      rateKey: laborRate,
    }));
  }
  if (definition.category === "foundation") {
    const materialIndex = paddedMaterialRows.length;
    paddedMaterialRows.push(row({
      sectionType: "materials",
      sectionNumber: "1",
      rowNumber: `1.${materialIndex + 1}`,
      code: `${definition.workKey}_foundation_detail_materials`,
      names: { ru: `Р”РµС‚Р°Р»Рё РїРѕРґРіРѕС‚РѕРІРєРё С„СѓРЅРґР°РјРµРЅС‚Р°: ${workRu}`, en: `Foundation preparation details: ${workEn}` },
      quantityFormula: "area * 0.12",
      unitMetric,
      unitImperial,
      rateKey: auxiliaryRate,
    }));
    const laborIndex = paddedLaborRows.length;
    paddedLaborRows.push(row({
      sectionType: "labor",
      sectionNumber: "2",
      rowNumber: `2.${laborIndex + 1}`,
      code: `${definition.workKey}_foundation_detail_labor`,
      names: { ru: `Р”РµС‚Р°Р»РёР·Р°С†РёСЏ Рё РєРѕРЅС‚СЂРѕР»СЊ С„СѓРЅРґР°РјРµРЅС‚Р°: ${workRu}`, en: `Foundation detailing and control: ${workEn}` },
      quantityFormula: "area",
      unitMetric,
      unitImperial,
      rateKey: laborRate,
    }));
  }
  const genericEquipmentRows = [
    row({
      sectionType: "equipment",
      sectionNumber: "3",
      rowNumber: "3.1",
      code: `${definition.workKey}_equipment`,
      names: { ru: `Оборудование и инструмент: ${workRu}`, en: `Equipment and tools: ${workEn}` },
      quantityFormula: "1",
      unitMetric: "set",
      unitImperial: "set",
      rateKey: `${definition.workKey}_equipment`,
    }),
    row({
      sectionType: "delivery",
      sectionNumber: "3",
      rowNumber: "3.2",
      code: `${definition.workKey}_delivery`,
      names: { ru: `Доставка / логистика: ${workRu}`, en: `Delivery and logistics: ${workEn}` },
      quantityFormula: "1",
      unitMetric: "set",
      unitImperial: "set",
      rateKey: `${definition.workKey}_delivery`,
    }),
  ];

  if (boqHints.length > 0) {
    return {
      workKey: definition.workKey,
      inputMeasure: unitMetric === "m3" || unitMetric === "cu_ft" ? "volume" : unitMetric === "pcs" ? "count" : unitMetric === "set" ? "set" : "area",
      defaultUnitMetric: unitMetric,
      defaultUnitImperial: unitImperial,
      sections: [
        {
          type: "materials",
          sectionNumber: "1",
          title: { ru: "Материалы и комплектующие", en: "Materials and supplies" },
          rows: paddedMaterialRows,
        },
        {
          type: "labor",
          sectionNumber: "2",
          title: { ru: "Работы / монтаж / техника", en: "Labor / installation / equipment" },
          rows: paddedLaborRows,
        },
        {
          type: "equipment",
          sectionNumber: "3",
          title: { ru: "Оборудование / доставка", en: "Equipment / delivery" },
          rows: genericEquipmentRows,
        },
      ],
      assumptions: {
        ru: [
          "Расчёт сделан по типовой технологии для указанного объёма.",
          "Скрытые дефекты и демонтаж включаются только если они явно указаны в запросе.",
          "Цены берутся из backend pricebook с привязанными источниками и требуют проверки перед договором.",
        ],
        en: [
          "The estimate uses a standard method for the stated quantity.",
          "Hidden defects and demolition are included only when explicitly stated.",
          "Rates come from backend pricebook entries with source evidence and require review before contract.",
        ],
      },
      regionalRiskKeys: ["site_access", "surface_condition", "hidden_damage", "delivery_and_lifting", "local_tax_precision"],
      clarifyingQuestions: {
        ru: [
          "В каком городе находится объект?",
          "Какое состояние основания или поверхности?",
          "Нужен ли демонтаж старого покрытия или конструкций?",
          "Есть ли ограничения по доступу, доставке или срокам?",
        ],
        en: [
          "What city is the project located in?",
          "What is the current surface or base condition?",
          "Is demolition of existing finishes required?",
          "Are there access, delivery, or deadline constraints?",
        ],
      },
    };
  }

  return {
    workKey: definition.workKey,
    inputMeasure: unitMetric === "m3" || unitMetric === "cu_ft" ? "volume" : unitMetric === "pcs" ? "count" : unitMetric === "set" ? "set" : "area",
    defaultUnitMetric: unitMetric,
    defaultUnitImperial: unitImperial,
    sections: [
      {
        type: "materials",
        sectionNumber: "1",
        title: { ru: "Материалы и комплектующие", en: "Materials and supplies" },
        rows: [
          row({
            sectionType: "materials",
            sectionNumber: "1",
            rowNumber: "1.1",
            code: `${definition.workKey}_main_material`,
            names: { ru: `Основной материал: ${workRu}`, en: `Primary material: ${workEn}` },
            quantityFormula: "area * 1.08",
            unitMetric,
            unitImperial,
            rateKey: materialRate,
          }),
          row({
            sectionType: "materials",
            sectionNumber: "1",
            rowNumber: "1.2",
            code: `${definition.workKey}_auxiliary`,
            names: { ru: "Расходные материалы и крепеж", en: "Consumables and fixings" },
            quantityFormula: "area * 0.20",
            unitMetric,
            unitImperial,
            rateKey: auxiliaryRate,
          }),
          row({
            sectionType: "materials",
            sectionNumber: "1",
            rowNumber: "1.3",
            code: `${definition.workKey}_preparation_materials`,
            names: { ru: `Материалы подготовки: ${workRu}`, en: `Preparation materials: ${workEn}` },
            quantityFormula: "area * 0.15",
            unitMetric,
            unitImperial,
            rateKey: auxiliaryRate,
          }),
          row({
            sectionType: "materials",
            sectionNumber: "1",
            rowNumber: "1.4",
            code: `${definition.workKey}_waste_allowance`,
            names: { ru: `Запас / расходники: ${workRu}`, en: `Waste allowance and supplies: ${workEn}` },
            quantityFormula: "area * 0.08",
            unitMetric,
            unitImperial,
            rateKey: auxiliaryRate,
          }),
        ],
      },
      {
        type: "labor",
        sectionNumber: "2",
        title: { ru: "Трудозатраты и операции", en: "Labor and installation" },
        rows: [
          row({
            sectionType: "labor",
            sectionNumber: "2",
            rowNumber: "2.1",
            code: `${definition.workKey}_prep`,
            names: { ru: `Подготовка: ${workRu}`, en: `Preparation: ${workEn}` },
            quantityFormula: "area",
            unitMetric,
            unitImperial,
            rateKey: laborRate,
          }),
          row({
            sectionType: "labor",
            sectionNumber: "2",
            rowNumber: "2.2",
            code: `${definition.workKey}_install`,
            names: { ru: workRu, en: workEn },
            quantityFormula: "area",
            unitMetric,
            unitImperial,
            rateKey: laborRate,
          }),
          row({
            sectionType: "labor",
            sectionNumber: "2",
            rowNumber: "2.3",
            code: `${definition.workKey}_quality_control`,
            names: { ru: `Контроль качества: ${workRu}`, en: `Quality control: ${workEn}` },
            quantityFormula: "area",
            unitMetric,
            unitImperial,
            rateKey: laborRate,
          }),
          row({
            sectionType: "labor",
            sectionNumber: "2",
            rowNumber: "2.4",
            code: `${definition.workKey}_cleanup`,
            names: { ru: `Уборка и сдача участка: ${workRu}`, en: `Cleanup and handover: ${workEn}` },
            quantityFormula: "area",
            unitMetric,
            unitImperial,
            rateKey: laborRate,
          }),
        ],
      },
      {
        type: "equipment",
        sectionNumber: "3",
        title: { ru: "Оборудование / доставка", en: "Equipment / delivery" },
        rows: [
          row({
            sectionType: "equipment",
            sectionNumber: "3",
            rowNumber: "3.1",
            code: `${definition.workKey}_equipment`,
            names: { ru: `Оборудование и инструмент: ${workRu}`, en: `Equipment and tools: ${workEn}` },
            quantityFormula: "1",
            unitMetric: "set",
            unitImperial: "set",
            rateKey: `${definition.workKey}_equipment`,
          }),
          row({
            sectionType: "delivery",
            sectionNumber: "3",
            rowNumber: "3.2",
            code: `${definition.workKey}_delivery`,
            names: { ru: `Доставка / логистика: ${workRu}`, en: `Delivery and logistics: ${workEn}` },
            quantityFormula: "1",
            unitMetric: "set",
            unitImperial: "set",
            rateKey: `${definition.workKey}_delivery`,
          }),
        ],
      },
    ],
    assumptions: {
      ru: [
        "Расчет сделан по типовой технологии для указанного объема.",
        "Скрытые дефекты и демонтаж не включены, если пользователь не указал их явно.",
        "Цены являются настроенным backend-справочником и требуют проверки перед договором.",
      ],
      en: [
        "The estimate uses a standard method for the stated quantity.",
        "Hidden defects and demolition are not included unless explicitly stated.",
        "Prices come from configured backend reference data and require review before contract.",
      ],
    },
    regionalRiskKeys: ["site_access", "surface_condition", "hidden_damage", "delivery_and_lifting", "local_tax_precision"],
    clarifyingQuestions: {
      ru: [
        "В каком городе находится объект?",
        "Какое состояние основания или поверхности?",
        "Нужен ли демонтаж старого покрытия или конструкций?",
        "Есть ли ограничения по доступу, доставке или срокам?",
      ],
      en: [
        "What city is the project located in?",
        "What is the current surface or base condition?",
        "Is demolition of existing finishes required?",
        "Are there access, delivery, or deadline constraints?",
      ],
    },
  };
}

export const LAMINATE_TEMPLATE: GlobalEstimateTemplate = {
  workKey: "laminate_laying",
  inputMeasure: "area",
  defaultUnitMetric: "sq_m",
  defaultUnitImperial: "sq_ft",
  sections: [
    {
      type: "materials",
      sectionNumber: "1",
      title: { ru: "Материалы и комплектующие", en: "Materials and supplies", de: "Materialien und Zubehor" },
      rows: laminateRows.filter((item) => item.sectionType === "materials"),
    },
    {
      type: "labor",
      sectionNumber: "2",
      title: { ru: "Трудозатраты и операции", en: "Labor and installation", de: "Arbeitsleistungen" },
      rows: laminateRows.filter((item) => item.sectionType === "labor"),
    },
  ],
  assumptions: {
    ru: [
      "Основание считается ровным и готовым к укладке.",
      "Демонтаж старого покрытия не включен.",
      "Материал рассчитан с запасом на подрезку.",
      "Доставка и подъем не включены, если не указано отдельно.",
    ],
    en: [
      "Subfloor is assumed to be level and ready.",
      "Old flooring removal is not included.",
      "Material includes waste allowance.",
      "Delivery and lifting are not included unless specified.",
    ],
    de: [
      "Der Untergrund wird als eben und verlegebereit angenommen.",
      "Ruckbau alter Belage ist nicht enthalten.",
      "Material enthalt Verschnittreserve.",
      "Lieferung und Tragen sind nur enthalten, wenn angegeben.",
    ],
  },
  regionalRiskKeys: [
    "uneven_subfloor",
    "old_floor_demolition",
    "diagonal_layout",
    "continuous_layout_without_thresholds",
    "delivery_and_lifting",
    "local_tax_precision",
  ],
  clarifyingQuestions: {
    ru: [
      "В каком городе находится объект?",
      "Какое сейчас основание пола?",
      "Требуется ли демонтаж старого покрытия?",
      "Нужно ли выравнивание пола?",
      "Планируется прямая или диагональная укладка?",
    ],
    en: [
      "What city is the project located in?",
      "What is the current subfloor?",
      "Is old flooring removal required?",
      "Is floor leveling required?",
      "Straight or diagonal layout?",
    ],
    de: [
      "In welcher Stadt liegt das Objekt?",
      "Welcher Untergrund ist vorhanden?",
      "Muss der alte Boden entfernt werden?",
      "Ist Bodenausgleich erforderlich?",
      "Gerade oder diagonale Verlegung?",
    ],
  },
};

export const ASPHALT_TEMPLATE: GlobalEstimateTemplate = {
  workKey: "asphalt_paving",
  inputMeasure: "area",
  defaultUnitMetric: "sq_m",
  defaultUnitImperial: "sq_ft",
  sections: [
    {
      type: "materials",
      sectionNumber: "1",
      title: { ru: "Материалы и комплектующие", en: "Materials and supplies" },
      rows: asphaltRows.filter((item) => item.sectionType === "materials"),
    },
    {
      type: "labor",
      sectionNumber: "2",
      title: { ru: "Работы / монтаж / техника", en: "Labor / installation / equipment" },
      rows: asphaltRows.filter((item) => item.sectionType === "labor"),
    },
  ],
  assumptions: {
    ru: [
      "Расчет сделан для типового асфальтирования территории по подготовленному основанию.",
      "Толщина слоев, марка смеси и логистика должны быть подтверждены проектом.",
      "Дренаж, ливневка, бордюры и сложная геодезия считаются отдельно, если не указаны явно.",
      "Цены берутся из backend pricebook с привязанными источниками и требуют проверки перед договором.",
    ],
    en: [
      "The estimate assumes standard asphalt paving over a prepared base.",
      "Layer thickness, asphalt mix grade, and logistics must be confirmed by design.",
      "Drainage, curbs, and complex surveying are priced separately unless specified.",
      "Rates come from backend pricebook entries with source evidence and require review before contract.",
    ],
  },
  regionalRiskKeys: [
    "site_access",
    "surface_condition",
    "delivery_and_lifting",
    "local_tax_precision",
  ],
  clarifyingQuestions: {
    ru: [
      "В каком городе находится объект?",
      "Какое текущее основание: грунт, щебень, старый асфальт или бетон?",
      "Какая нужна толщина нижнего и верхнего слоя асфальта?",
      "Нужны ли бордюры, ливневка, разметка или организация движения?",
      "Есть ли ограничения по заезду техники и срокам работ?",
    ],
    en: [
      "What city is the project located in?",
      "What is the current base: soil, crushed stone, old asphalt, or concrete?",
      "What lower and top asphalt layer thickness is required?",
      "Are curbs, drainage, marking, or traffic management required?",
      "Are there machine access or deadline constraints?",
    ],
  },
};

export const STRIP_FOUNDATION_TEMPLATE: GlobalEstimateTemplate = {
  workKey: "strip_foundation",
  inputMeasure: "length",
  defaultUnitMetric: "linear_m",
  defaultUnitImperial: "linear_ft",
  sections: [
    {
      type: "materials",
      sectionNumber: "1",
      title: { ru: "Материалы", en: "Materials" },
      rows: stripFoundationRows.filter((item) => item.sectionType === "materials"),
    },
    {
      type: "labor",
      sectionNumber: "2",
      title: { ru: "Работы", en: "Labor" },
      rows: stripFoundationRows.filter((item) => item.sectionType === "labor"),
    },
    {
      type: "delivery",
      sectionNumber: "3",
      title: { ru: "Оборудование / доставка", en: "Equipment / delivery" },
      rows: stripFoundationRows.filter((item) => item.sectionType === "delivery" || item.sectionType === "equipment"),
    },
  ],
  assumptions: {
    ru: [
      "Расчёт сделан для ленточного фундамента по указанным длине, ширине и высоте.",
      "Марка бетона, схема армирования, грунт и доступ техники должны быть подтверждены перед договором.",
      "Бетононасос включён как отдельная позиция для уточнения доступа и необходимости.",
      "Цены берутся из backend pricebook с источниками; смета требует проверки специалистом.",
    ],
    en: [
      "The estimate uses length, width and height for a strip foundation.",
      "Concrete grade, reinforcement layout, soil and machine access must be confirmed.",
      "Concrete pump is separated for access confirmation.",
      "Rates come from backend pricebook entries with source evidence.",
    ],
  },
  regionalRiskKeys: ["site_access", "surface_condition", "delivery_and_lifting", "local_tax_precision"],
  clarifyingQuestions: {
    ru: [
      "Какой грунт и глубина промерзания на участке?",
      "Нужна ли дренажная система и утепление фундамента?",
      "Какая марка бетона и схема армирования заложены проектом?",
      "Есть ли подъезд миксера и бетононасоса к месту заливки?",
    ],
    en: [
      "What soil conditions and frost depth apply?",
      "Is drainage or foundation insulation required?",
      "What concrete grade and reinforcement layout are specified?",
      "Can a mixer and concrete pump access the pour area?",
    ],
  },
};

export const ROOF_WATERPROOFING_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "roof_waterproofing",
  materialRows: [
    { code: "roof_waterproofing_primer", nameRu: "Праймер / грунтовка основания кровли", nameEn: "Roof base primer" },
    { code: "roof_waterproofing_membrane_mastic", nameRu: "Мембрана / битумная мастика / гидроизоляционный материал", nameEn: "Membrane, bitumen mastic or waterproofing material" },
    { code: "roof_waterproofing_detail_tape", nameRu: "Лента и герметик для примыканий, парапетов, ендов и проходок", nameEn: "Detail tape and sealant for flashings, parapets, valleys and penetrations", rateKind: "auxiliary" },
    { code: "roof_waterproofing_quality_supplies", nameRu: "Расходники для контроля качества и проверки протечек", nameEn: "Quality control and leak test supplies", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "roof_waterproofing_base_cleaning", nameRu: "Очистка кровли и подготовка основания", nameEn: "Roof cleaning and base preparation" },
    { code: "roof_waterproofing_detail_sealing", nameRu: "Герметизация примыканий, парапетов, ендов и проходок", nameEn: "Sealing flashings, parapets, valleys and penetrations" },
    { code: "roof_waterproofing_application", nameRu: "Нанесение / монтаж гидроизоляции кровли", nameEn: "Roof waterproofing application or installation" },
    { code: "roof_waterproofing_leak_control", nameRu: "Проверка герметичности и контроль протечек", nameEn: "Watertightness and leak control" },
  ],
  assumptionsRu: [
    "Расчет выполнен для гидроизоляции кровли по указанной площади.",
    "Состояние основания, примыкания, парапеты, ендовы и проходки требуют осмотра перед договором.",
    "Работы на высоте требуют допуска и проверки специалистом.",
  ],
  questionsRu: [
    "Кровля плоская или скатная?",
    "Есть ли протечки, парапеты, ендовы, проходки или сложные примыкания?",
    "Какой материал нужен: мембрана, рубероид или битумная мастика?",
  ],
});

export const ROOF_MEMBRANE_WATERPROOFING_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "roof_membrane_waterproofing",
  materialRows: [
    { code: "roof_membrane_waterproofing_primer", nameRu: "Праймер / грунтовка основания кровли", nameEn: "Roof base primer" },
    { code: "roof_membrane_waterproofing_membrane", nameRu: "Кровельная мембрана / рубероид / гидроизоляционный материал", nameEn: "Roofing membrane or roll waterproofing material" },
    { code: "roof_membrane_waterproofing_fasteners", nameRu: "Крепеж, лента и герметик для примыканий", nameEn: "Fasteners, tape and sealant for flashings", rateKind: "auxiliary" },
    { code: "roof_membrane_waterproofing_detail_materials", nameRu: "Материалы для парапетов, ендов и проходок", nameEn: "Materials for parapets, valleys and penetrations", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "roof_membrane_waterproofing_base_cleaning", nameRu: "Очистка кровли и подготовка основания", nameEn: "Roof cleaning and base preparation" },
    { code: "roof_membrane_waterproofing_detail_sealing", nameRu: "Герметизация примыканий и обработка парапетов / ендов / проходок", nameEn: "Sealing flashings and treating parapets, valleys and penetrations" },
    { code: "roof_membrane_waterproofing_install", nameRu: "Монтаж мембранной гидроизоляции / сварка швов", nameEn: "Membrane waterproofing installation and seam welding" },
    { code: "roof_membrane_waterproofing_quality_control", nameRu: "Проверка герметичности и контроль протечек", nameEn: "Watertightness and leak control" },
  ],
  assumptionsRu: [
    "Расчет выполнен для мембранной гидроизоляции кровли по указанной площади.",
    "Тип мембраны, крепление, сварка швов и узлы примыканий уточняются перед договором.",
    "Работы на высоте требуют допуска и проверки специалистом.",
  ],
  questionsRu: [
    "Какая кровля: плоская, скатная или с парапетами?",
    "Нужна ПВХ/ТПО/битумная мембрана или рубероид?",
    "Есть ли проходки, ендовы, внутренние водостоки или протечки?",
  ],
});

export const BATHROOM_WATERPROOFING_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "bathroom_waterproofing",
  materialRows: [
    { code: "bathroom_waterproofing_primer", nameRu: "Праймер / грунтовка основания", nameEn: "Base primer" },
    { code: "bathroom_waterproofing_mastic", nameRu: "Гидроизоляционная мастика", nameEn: "Waterproofing mastic" },
    { code: "bathroom_waterproofing_tape", nameRu: "Гидроизоляционная лента", nameEn: "Waterproofing tape", rateKind: "auxiliary" },
    { code: "bathroom_waterproofing_tile_prep_supplies", nameRu: "Материалы для подготовки под плитку", nameEn: "Tile preparation supplies", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "bathroom_waterproofing_base_prep", nameRu: "Подготовка основания под гидроизоляцию", nameEn: "Base preparation for waterproofing" },
    { code: "bathroom_waterproofing_corners", nameRu: "Обработка углов и примыканий", nameEn: "Corners and junctions treatment" },
    { code: "bathroom_waterproofing_application", nameRu: "Нанесение гидроизоляции", nameEn: "Waterproofing application" },
    { code: "bathroom_waterproofing_tile_ready", nameRu: "Подготовка под плитку", nameEn: "Preparation for tile installation" },
  ],
  assumptionsRu: [
    "Расчет выполнен для гидроизоляции ванной / санузла по указанной площади.",
    "Стены, пол, углы, трапы и примыкания уточняются перед договором.",
    "Плиточные работы считаются отдельно, если не указаны в составе работ.",
  ],
  questionsRu: [
    "Гидроизоляция нужна на полу, стенах или в душевой зоне?",
    "Есть ли трап, поддон, ниша или мокрая зона?",
    "Плитка входит в эту смету или нужна отдельная смета на укладку?",
  ],
});

export const FOUNDATION_WATERPROOFING_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "foundation_waterproofing",
  materialRows: [
    { code: "foundation_waterproofing_primer", nameRu: "Праймер для поверхности фундамента", nameEn: "Foundation surface primer" },
    { code: "foundation_waterproofing_mastic_membrane", nameRu: "Битумная мастика / мембрана", nameEn: "Bitumen mastic or membrane" },
    { code: "foundation_waterproofing_protection_membrane", nameRu: "Защитная мембрана", nameEn: "Protection membrane", rateKind: "auxiliary" },
    { code: "foundation_waterproofing_insulation_optional", nameRu: "Утеплитель при необходимости", nameEn: "Optional insulation", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "foundation_waterproofing_surface_prep", nameRu: "Подготовка поверхности фундамента", nameEn: "Foundation surface preparation" },
    { code: "foundation_waterproofing_application", nameRu: "Нанесение мастики / монтаж мембраны", nameEn: "Mastic application or membrane installation" },
    { code: "foundation_waterproofing_backfill_warning", nameRu: "Обратная засыпка / warning: уточнить грунт и дренаж", nameEn: "Backfill warning: soil and drainage to be confirmed" },
  ],
  assumptionsRu: [
    "Расчет выполнен для гидроизоляции фундамента по указанной площади.",
    "Дренаж, утепление, обратная засыпка и доступ к наружной поверхности уточняются перед договором.",
    "Грунтовые воды и состояние основания требуют проверки специалистом.",
  ],
  questionsRu: [
    "Это наружная или внутренняя гидроизоляция?",
    "Нужны ли дренаж, утепление и защитная мембрана?",
    "Есть ли доступ для земляных работ и обратной засыпки?",
  ],
});

export const BASEMENT_WATERPROOFING_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "basement_waterproofing",
  materialRows: [
    { code: "basement_waterproofing_primer", nameRu: "Праймер основания подвала", nameEn: "Basement base primer" },
    { code: "basement_waterproofing_membrane_injection", nameRu: "Мембрана / инъекционная гидроизоляция", nameEn: "Membrane or injection waterproofing" },
    { code: "basement_waterproofing_tape_sealant", nameRu: "Лента и герметик для швов и примыканий", nameEn: "Tape and sealant for joints", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "basement_waterproofing_surface_prep", nameRu: "Подготовка поверхности подвала", nameEn: "Basement surface preparation" },
    { code: "basement_waterproofing_application", nameRu: "Работы по нанесению / монтажу гидроизоляции подвала", nameEn: "Basement waterproofing application or installation works" },
    { code: "basement_waterproofing_moisture_control", nameRu: "Контроль влажности и проверка протечек", nameEn: "Moisture control and leak check" },
  ],
  assumptionsRu: [
    "Расчет выполнен для гидроизоляции подвала по указанной площади.",
    "Причина влаги, дренаж, вентиляция и доступ к стенам требуют проверки специалистом.",
  ],
  questionsRu: [
    "Гидроизоляция нужна изнутри или снаружи?",
    "Есть ли активная протечка, капиллярная влага или конденсат?",
    "Нужен ли дренаж или вентиляция?",
  ],
});

export const POOL_WATERPROOFING_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "pool_waterproofing",
  materialRows: [
    { code: "pool_waterproofing_primer", nameRu: "Праймер чаши бассейна", nameEn: "Pool shell primer" },
    { code: "pool_waterproofing_mastic_membrane", nameRu: "Гидроизоляционная мастика / мембрана для бассейна", nameEn: "Pool waterproofing mastic or membrane" },
    { code: "pool_waterproofing_tape", nameRu: "Гидроизоляционная лента для углов и вводов", nameEn: "Waterproofing tape for corners and penetrations", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "pool_waterproofing_shell_prep", nameRu: "Подготовка чаши бассейна", nameEn: "Pool shell preparation" },
    { code: "pool_waterproofing_details", nameRu: "Обработка углов, вводов и примыканий", nameEn: "Corners, penetrations and junctions treatment" },
    { code: "pool_waterproofing_application", nameRu: "Нанесение гидроизоляции бассейна", nameEn: "Pool waterproofing application" },
  ],
  assumptionsRu: [
    "Расчет выполнен для гидроизоляции чаши бассейна по указанной площади.",
    "Технология должна быть совместима с отделкой, химией воды и вводами оборудования.",
  ],
  questionsRu: [
    "Бассейн бетонный, композитный или другой конструкции?",
    "Какая финишная отделка планируется?",
    "Есть ли вводы, форсунки, скиммеры и переливы?",
  ],
});

export const WATERPROOFING_UNDER_TILE_TEMPLATE: GlobalEstimateTemplate = knownWorkTemplate({
  workKey: "waterproofing_under_tile",
  materialRows: [
    { code: "waterproofing_under_tile_primer", nameRu: "Грунтовка основания пола", nameEn: "Floor base primer" },
    { code: "waterproofing_under_tile_mastic", nameRu: "Гидроизоляционная мастика под плитку", nameEn: "Waterproofing mastic under tile" },
    { code: "waterproofing_under_tile_tape", nameRu: "Гидроизоляционная лента для углов и примыканий", nameEn: "Waterproofing tape for corners and junctions", rateKind: "auxiliary" },
    { code: "waterproofing_under_tile_tile_prep", nameRu: "Подготовка поверхности перед укладкой плитки", nameEn: "Surface preparation before tile installation", rateKind: "auxiliary" },
  ],
  laborRows: [
    { code: "waterproofing_under_tile_base_prep", nameRu: "Подготовка пола перед плиткой", nameEn: "Floor preparation before tile" },
    { code: "waterproofing_under_tile_application", nameRu: "Нанесение гидроизоляции под плитку", nameEn: "Waterproofing application under tile" },
    { code: "waterproofing_under_tile_ready_check", nameRu: "Проверка готовности основания под плитку", nameEn: "Tile-ready base check" },
  ],
  assumptionsRu: [
    "Расчет выполнен для гидроизоляции пола перед укладкой плитки.",
    "Выравнивание основания и плиточные работы считаются отдельно, если не указаны в составе работ.",
  ],
  questionsRu: [
    "Это санузел, кухня, балкон или другое помещение?",
    "Нужно ли выравнивание пола перед гидроизоляцией?",
    "Плитка входит в эту смету или нужна отдельная смета?",
  ],
});

export const GLOBAL_ESTIMATE_TEMPLATES: readonly GlobalEstimateTemplate[] = GLOBAL_WORK_TYPE_DEFINITIONS.map((definition) =>
  definition.workKey === "laminate_laying" ? LAMINATE_TEMPLATE :
    definition.workKey === "asphalt_paving" ? ASPHALT_TEMPLATE :
      definition.workKey === "strip_foundation" ? STRIP_FOUNDATION_TEMPLATE :
        definition.workKey === "ceramic_tile_laying" ? CERAMIC_TILE_TEMPLATE :
          definition.workKey === "ceramic_tile_floor_laying" ? CERAMIC_TILE_FLOOR_TEMPLATE :
            definition.workKey === "carpet_laying" ? CARPET_TEMPLATE :
                definition.workKey === "drywall_partition" ? DRYWALL_PARTITION_TEMPLATE :
                  definition.workKey === "drywall_wall_cladding" ? DRYWALL_WALL_CLADDING_TEMPLATE :
                    definition.workKey === "drywall_ceiling" ? DRYWALL_CEILING_TEMPLATE :
                      definition.workKey === "window_installation" ? WINDOW_INSTALLATION_TEMPLATE :
                        definition.workKey === "micro_hydro_preparation" ? MICRO_HYDRO_TURBINE_TEMPLATE :
                          definition.workKey === "gable_roof_installation" ? GABLE_ROOF_TEMPLATE :
                            definition.workKey === "brick_masonry" ? BRICK_MASONRY_TEMPLATE :
                              definition.workKey === "roof_waterproofing" ? ROOF_WATERPROOFING_TEMPLATE :
                                definition.workKey === "roof_membrane_waterproofing" ? ROOF_MEMBRANE_WATERPROOFING_TEMPLATE :
                                  definition.workKey === "bathroom_waterproofing" ? BATHROOM_WATERPROOFING_TEMPLATE :
                                    definition.workKey === "foundation_waterproofing" ? FOUNDATION_WATERPROOFING_TEMPLATE :
                                      definition.workKey === "basement_waterproofing" ? BASEMENT_WATERPROOFING_TEMPLATE :
                                        definition.workKey === "pool_waterproofing" ? POOL_WATERPROOFING_TEMPLATE :
                                          definition.workKey === "waterproofing_under_tile" ? WATERPROOFING_UNDER_TILE_TEMPLATE :
                                            genericTemplate(definition),
);

export const GLOBAL_ESTIMATE_TEMPLATE_ROWS: readonly (GlobalEstimateTemplateRowDefinition & { workKey: string })[] =
  GLOBAL_ESTIMATE_TEMPLATES.flatMap((template) =>
    template.sections.flatMap((section) => section.rows.map((item) => ({ ...item, workKey: template.workKey }))),
  );

function rate(params: Omit<GlobalRateRecord, "id" | "effectiveFrom" | "checkedAt" | "active" | "sourceType" | "sourceLabel"> & {
  id?: string;
  sourceType?: GlobalRateRecord["sourceType"];
  sourceLabel?: string;
}): GlobalRateRecord {
  return {
    id: params.id ?? `rate_${params.rateKey}_${params.countryCode}_${params.unit}_${params.priceTier}`,
    sourceType: params.sourceType ?? "configured_reference",
    sourceLabel: params.sourceLabel ?? "Configured backend regional reference rate",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
    ...params,
  };
}

const COUNTRIES: { countryCode: string; currency: string; stateOrRegion?: string; city?: string; postalCode?: string; metric: boolean; multiplier: number }[] = [
  { countryCode: "XX", currency: "USD", metric: true, multiplier: 1 },
  { countryCode: "KG", currency: "KGS", city: "Bishkek", metric: true, multiplier: 89 },
  { countryCode: "US", stateOrRegion: "TX", city: "Dallas", postalCode: "75201", currency: "USD", metric: false, multiplier: 1.05 },
  { countryCode: "US", stateOrRegion: "TX", currency: "USD", metric: false, multiplier: 1 },
  { countryCode: "US", stateOrRegion: "CA", currency: "USD", metric: false, multiplier: 1.2 },
  { countryCode: "DE", currency: "EUR", metric: true, multiplier: 0.92 },
  { countryCode: "FR", city: "Paris", currency: "EUR", metric: true, multiplier: 1.05 },
  { countryCode: "GB", city: "London", currency: "GBP", metric: true, multiplier: 0.82 },
  { countryCode: "SG", city: "Singapore", currency: "SGD", metric: false, multiplier: 1.35 },
  { countryCode: "AE", city: "Dubai", currency: "AED", metric: true, multiplier: 3.67 },
  { countryCode: "IN", currency: "INR", metric: true, multiplier: 83 },
];

const BASE_UNIT_PRICES: Record<string, number> = {
  laminate_board: 18,
  underlayment: 2.2,
  baseboard: 3.5,
  baseboard_fittings: 45,
  thresholds: 18,
  floor_priming: 1.2,
  underlayment_install: 0.8,
  laminate_install: 3.8,
  baseboard_install: 2.5,
  threshold_install: 12,
  geotextile: 1.1,
  sand_base: 4,
  crushed_stone_base: 7,
  bitumen_emulsion: 0.8,
  asphalt_lower_coarse: 10,
  asphalt_top_fine: 12,
  road_marking_optional: 1.5,
  site_cleaning: 0.7,
  grading_compaction: 2,
  sand_base_install: 1.4,
  crushed_stone_base_install: 1.8,
  tack_coat_application: 0.6,
  asphalt_lower_laying: 3.2,
  asphalt_top_laying: 3.4,
  equipment_mobilization: 0.9,
  geodesy_quality_control: 0.5,
  final_cleanup: 0.4,
};

const GENERIC_PRICE_BY_CATEGORY: Record<string, { material: number; auxiliary: number; labor: number }> = {
  flooring: { material: 12, auxiliary: 2, labor: 5 },
  tile: { material: 16, auxiliary: 4, labor: 12 },
  painting: { material: 2.5, auxiliary: 0.8, labor: 4 },
  plastering: { material: 3, auxiliary: 1, labor: 7 },
  drywall: { material: 7, auxiliary: 2, labor: 8 },
  electrical: { material: 35, auxiliary: 8, labor: 55 },
  plumbing: { material: 45, auxiliary: 12, labor: 65 },
  waterproofing: { material: 8, auxiliary: 2, labor: 9 },
  foundation: { material: 120, auxiliary: 18, labor: 55 },
  concrete: { material: 110, auxiliary: 16, labor: 48 },
  roofing: { material: 18, auxiliary: 5, labor: 15 },
  facade: { material: 9, auxiliary: 3, labor: 10 },
  roadworks: { material: 14, auxiliary: 4, labor: 12 },
  masonry: { material: 20, auxiliary: 6, labor: 18 },
  demolition: { material: 1, auxiliary: 1, labor: 7 },
  other: { material: 10, auxiliary: 2, labor: 8 },
};

const ASPHALT_MATERIAL_RATE_KEYS = [
  "geotextile",
  "sand_base",
  "crushed_stone_base",
  "bitumen_emulsion",
  "asphalt_lower_coarse",
  "asphalt_top_fine",
  "road_marking_optional",
];

const ASPHALT_WORK_RATE_KEYS = [
  "site_cleaning",
  "grading_compaction",
  "sand_base_install",
  "crushed_stone_base_install",
  "tack_coat_application",
  "asphalt_lower_laying",
  "asphalt_top_laying",
  "equipment_mobilization",
  "geodesy_quality_control",
  "final_cleanup",
];

const STRIP_FOUNDATION_MATERIAL_RATES: { rateKey: string; unit: GlobalUnitInput["normalizedUnit"]; basePrice: number }[] = [
  { rateKey: "strip_foundation_sand_cushion", unit: "m3", basePrice: 22 },
  { rateKey: "strip_foundation_crushed_stone_base", unit: "m3", basePrice: 35 },
  { rateKey: "strip_foundation_geotextile", unit: "sq_m", basePrice: 1.1 },
  { rateKey: "strip_foundation_formwork_material", unit: "sq_m", basePrice: 8 },
  { rateKey: "strip_foundation_longitudinal_rebar", unit: "kg", basePrice: 1.2 },
  { rateKey: "strip_foundation_stirrups_rebar", unit: "kg", basePrice: 1.2 },
  { rateKey: "strip_foundation_binding_wire", unit: "kg", basePrice: 1.5 },
  { rateKey: "strip_foundation_rebar_spacers", unit: "pcs", basePrice: 0.12 },
  { rateKey: "strip_foundation_concrete_m300", unit: "m3", basePrice: 95 },
  { rateKey: "strip_foundation_waterproofing_material", unit: "sq_m", basePrice: 6 },
];

const STRIP_FOUNDATION_WORK_RATES: { rateKey: string; unit: GlobalUnitInput["normalizedUnit"]; basePrice: number }[] = [
  { rateKey: "strip_foundation_excavation", unit: "m3", basePrice: 10 },
  { rateKey: "strip_foundation_formwork_install", unit: "sq_m", basePrice: 5 },
  { rateKey: "strip_foundation_rebar_tying", unit: "kg", basePrice: 0.35 },
  { rateKey: "strip_foundation_concrete_pour", unit: "m3", basePrice: 12 },
  { rateKey: "strip_foundation_concrete_vibration", unit: "m3", basePrice: 3 },
  { rateKey: "strip_foundation_concrete_curing", unit: "sq_m", basePrice: 1 },
  { rateKey: "strip_foundation_waterproofing_install", unit: "sq_m", basePrice: 4 },
  { rateKey: "strip_foundation_backfill", unit: "m3", basePrice: 6 },
  { rateKey: "strip_foundation_concrete_delivery", unit: "m3", basePrice: 14 },
  { rateKey: "strip_foundation_concrete_pump", unit: "set", basePrice: 180 },
];

function localUnit(unit: GlobalUnitInput["normalizedUnit"], metric: boolean): GlobalUnitInput["normalizedUnit"] {
  if (metric) return unit;
  if (unit === "sq_m") return "sq_ft";
  if (unit === "linear_m") return "linear_ft";
  if (unit === "m3") return "cu_ft";
  if (unit === "kg") return "lbs";
  return unit;
}

function unitScaleForImperial(unit: GlobalUnitInput["normalizedUnit"]): number {
  if (unit === "sq_ft") return 0.092903;
  if (unit === "linear_ft") return 0.3048;
  if (unit === "cu_ft") return 0.0283168;
  if (unit === "lbs") return 0.45359237;
  return 1;
}

function buildRegionalRates(): GlobalRateRecord[] {
  const laminateRates = COUNTRIES.flatMap((country) =>
    Object.entries(BASE_UNIT_PRICES).map(([rateKey, basePrice]) => {
      const metricUnit: GlobalUnitInput["normalizedUnit"] =
        rateKey.includes("baseboard") ? "linear_m" :
          rateKey.includes("threshold") ? "pcs" :
            rateKey.includes("fittings") ? "set" :
              "sq_m";
      const unit = localUnit(metricUnit, country.metric);
      const unitFactor = country.metric ? 1 : unitScaleForImperial(unit);
      const priceDefault = Number((basePrice * unitFactor * country.multiplier).toFixed(2));
      return rate({
        rateKey,
        names: { en: rateKey.replace(/_/g, " "), ru: rateKey.replace(/_/g, " ") },
        countryCode: country.countryCode,
        stateOrRegion: country.stateOrRegion,
        city: country.city,
        postalCode: country.postalCode,
        unit,
        priceMin: Number((priceDefault * 0.85).toFixed(2)),
        priceMax: Number((priceDefault * 1.2).toFixed(2)),
        priceDefault,
        currency: country.currency,
        priceTier: "standard",
      });
    }),
  );

  const genericRates = GLOBAL_WORK_TYPE_DEFINITIONS.flatMap((definition) => {
    if (definition.workKey === "laminate_laying") return [];
    const prices = GENERIC_PRICE_BY_CATEGORY[definition.category] ?? GENERIC_PRICE_BY_CATEGORY.other;
    const rows = [
      { rateKey: `${definition.workKey}_material`, basePrice: prices.material, unit: definition.defaultMeasureUnit },
      { rateKey: `${definition.workKey}_auxiliary`, basePrice: prices.auxiliary, unit: definition.defaultMeasureUnit },
      { rateKey: `${definition.workKey}_labor`, basePrice: prices.labor, unit: definition.defaultMeasureUnit },
      { rateKey: `${definition.workKey}_equipment`, basePrice: Math.max(prices.auxiliary * 2, prices.labor * 0.2), unit: "set" as const },
      { rateKey: `${definition.workKey}_delivery`, basePrice: Math.max(prices.auxiliary * 3, prices.labor * 0.25), unit: "set" as const },
    ] as const;
    return COUNTRIES.flatMap((country) =>
      rows.map((rowDefinition) => {
        const unit = localUnit(rowDefinition.unit, country.metric);
        const unitFactor = country.metric ? 1 : unitScaleForImperial(unit);
        const priceDefault = Number((rowDefinition.basePrice * unitFactor * country.multiplier).toFixed(2));
        return rate({
          rateKey: rowDefinition.rateKey,
          names: { en: rowDefinition.rateKey.replace(/_/g, " "), ru: rowDefinition.rateKey.replace(/_/g, " ") },
          countryCode: country.countryCode,
          stateOrRegion: country.stateOrRegion,
          city: country.city,
          postalCode: country.postalCode,
          unit,
          priceMin: Number((priceDefault * 0.8).toFixed(2)),
          priceMax: Number((priceDefault * 1.25).toFixed(2)),
          priceDefault,
          currency: country.currency,
          priceTier: "standard",
        });
      }),
    );
  });

  const stripFoundationRates = COUNTRIES.flatMap((country) =>
    [...STRIP_FOUNDATION_MATERIAL_RATES, ...STRIP_FOUNDATION_WORK_RATES].map((definition) => {
      const unit = localUnit(definition.unit, country.metric);
      const unitFactor = country.metric ? 1 : unitScaleForImperial(unit);
      const priceDefault = Number((definition.basePrice * unitFactor * country.multiplier).toFixed(2));
      return rate({
        rateKey: definition.rateKey,
        names: { en: definition.rateKey.replace(/_/g, " "), ru: definition.rateKey.replace(/_/g, " ") },
        countryCode: country.countryCode,
        stateOrRegion: country.stateOrRegion,
        city: country.city,
        postalCode: country.postalCode,
        unit,
        priceMin: Number((priceDefault * 0.8).toFixed(2)),
        priceMax: Number((priceDefault * 1.25).toFixed(2)),
        priceDefault,
        currency: country.currency,
        priceTier: "standard",
      });
    }),
  );

  return [...laminateRates, ...genericRates, ...stripFoundationRates];
}

export const GLOBAL_RATE_MATERIALS: readonly GlobalRateRecord[] = buildRegionalRates().filter((item) =>
  item.rateKey.endsWith("_material") ||
  item.rateKey.endsWith("_auxiliary") ||
  [
    "laminate_board",
    "underlayment",
    "baseboard",
    "baseboard_fittings",
    "thresholds",
    ...ASPHALT_MATERIAL_RATE_KEYS,
    ...STRIP_FOUNDATION_MATERIAL_RATES.map((rateDefinition) => rateDefinition.rateKey),
  ].includes(item.rateKey),
);

export const GLOBAL_RATE_WORKS: readonly GlobalRateRecord[] = buildRegionalRates().filter((item) =>
  item.rateKey.endsWith("_labor") ||
  item.rateKey.endsWith("_equipment") ||
  item.rateKey.endsWith("_delivery") ||
  item.rateKey.includes("_labor") ||
  (item.rateKey.includes("_install") && !item.rateKey.endsWith("_material") && !item.rateKey.endsWith("_auxiliary")) ||
  item.rateKey.includes("priming") ||
  ASPHALT_WORK_RATE_KEYS.includes(item.rateKey) ||
  STRIP_FOUNDATION_WORK_RATES.some((rateDefinition) => rateDefinition.rateKey === item.rateKey),
);

export const GLOBAL_TAX_RULES: readonly GlobalTaxRule[] = [
  {
    id: "tax_us_tx_dallas_75201_sales_tax_configured",
    countryCode: "US",
    stateOrRegion: "TX",
    city: "Dallas",
    postalCode: "75201",
    taxType: "sales_tax",
    taxLabel: "Estimated Dallas TX sales tax",
    taxRate: 0.0825,
    appliesTo: "materials",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: true,
    requiredPrecision: "postal_code",
    sourceType: "configured_reference",
    sourceLabel: "Configured US sales tax reference; validate with address-based tax provider before billing",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_kg_nds_configured",
    countryCode: "KG",
    taxType: "nds",
    taxLabel: "НДС Кыргызстан",
    taxRate: 0.12,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured Kyrgyzstan NDS reference",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_de_vat_standard_configured",
    countryCode: "DE",
    taxType: "vat",
    taxLabel: "VAT Germany standard reference",
    taxRate: 0.19,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: true,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured EU VAT reference; category-specific reduced rates require review",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_fr_vat_standard_configured",
    countryCode: "FR",
    taxType: "vat",
    taxLabel: "TVA France standard reference",
    taxRate: 0.2,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: true,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured EU VAT reference; category-specific reduced rates require review",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_gb_vat_standard_configured",
    countryCode: "GB",
    taxType: "vat",
    taxLabel: "VAT UK standard reference",
    taxRate: 0.2,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: true,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured UK VAT reference; project category requires review",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_sg_gst_configured",
    countryCode: "SG",
    taxType: "gst",
    taxLabel: "Singapore GST reference",
    taxRate: 0.09,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured Singapore GST reference",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_ae_vat_configured",
    countryCode: "AE",
    taxType: "vat",
    taxLabel: "UAE VAT reference",
    taxRate: 0.05,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured UAE VAT reference",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
  {
    id: "tax_in_gst_configured",
    countryCode: "IN",
    taxType: "gst",
    taxLabel: "India GST reference",
    taxRate: 0.18,
    appliesTo: "all",
    customerType: "unknown",
    projectType: "unknown",
    includedInPrice: false,
    requiresPreciseAddress: false,
    sourceType: "configured_reference",
    sourceLabel: "Configured India GST reference; work/material category requires review",
    effectiveFrom: EFFECTIVE_FROM,
    checkedAt: CHECKED_AT,
    active: true,
  },
];

export const GLOBAL_UNIT_CONVERSIONS = [
  { fromUnit: "sq_m", toUnit: "sq_ft", multiplier: 10.76391041671, dimension: "area" },
  { fromUnit: "sq_ft", toUnit: "sq_m", multiplier: 0.09290304, dimension: "area" },
  { fromUnit: "linear_m", toUnit: "linear_ft", multiplier: 3.280839895, dimension: "length" },
  { fromUnit: "linear_ft", toUnit: "linear_m", multiplier: 0.3048, dimension: "length" },
  { fromUnit: "m3", toUnit: "cu_ft", multiplier: 35.314666721, dimension: "volume" },
  { fromUnit: "cu_ft", toUnit: "m3", multiplier: 0.0283168466, dimension: "volume" },
  { fromUnit: "kg", toUnit: "lbs", multiplier: 2.2046226218, dimension: "mass" },
  { fromUnit: "lbs", toUnit: "kg", multiplier: 0.45359237, dimension: "mass" },
] as const;
