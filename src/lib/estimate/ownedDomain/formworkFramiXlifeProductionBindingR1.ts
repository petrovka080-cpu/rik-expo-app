import {
  FORMWORK_FRAMI_XLIFE_FOUNDATION_TARGETS,
  FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
} from "../v4/formworkFramiXlifeProjectKitR1";
import { extractRicsNrm2FormworkCanonicalParametersV1 } from "./formworkRicsNrm2ProductionBindingV1";

type Primitive = string | number | boolean;

const CATALOG_IDS: ReadonlySet<string> = new Set(
  FORMWORK_FRAMI_XLIFE_FOUNDATION_TARGETS.map((target) => target.catalogId),
);

const TEXT_FIELDS = Object.freeze({
  project_drawing_reference: "ссылка на чертёж",
  element_type: "тип элемента",
  element_dimensions_and_face_count: "размеры и количество граней",
  plain_or_special_finish: "отделка",
  vertical_battered_horizontal_or_curved_class: "класс геометрии",
  single_or_double_sided_scope: "стороны опалубки",
  openings_voids_and_deduction_rule: "правило проёмов и пустот",
  permanent_or_removable_formwork: "тип опалубки",
  project_measurement_rule_reference: "правило измерения проекта",
  estimator_approval_reference: "согласование сметчика",
  project_formwork_layout_reference: "утверждённая раскладка щитов и комплектующих",
  system_engineer_approval_reference: "согласование раскладки инженером",
  panel_specification: "точный тип и размер щита frami xlife",
  corner_element_specification: "точный тип углового элемента frami xlife",
  panel_connector_specification: "точный тип соединителя щитов frami",
  joint_sealing_tape_specification: "точный тип ленты для герметизации стыков",
  form_release_agent_specification: "точный разделительный состав для щитов",
} satisfies Readonly<Record<string, string>>);

const NUMBER_FIELDS = Object.freeze({
  foundation_wall_thickness_cm: "толщина бетонируемого элемента",
  frami_xlife_panel_count: "щиты frami xlife по проектной ведомости",
  frami_xlife_corner_element_count: "угловые элементы frami xlife по проектной ведомости",
  frami_clamp_count: "соединители щитов frami по проектной ведомости",
  flat_tie_rod_10_80_count: "плоские стяжки frami 10–80 см по проектной ведомости",
  flat_tie_rod_clip_count: "зажимы плоских стяжек frami по проектной ведомости",
  foundation_clamp_count: "фундаментные зажимы frami по проектной ведомости",
  plumbing_strut_260_count: "подкосы для выверки 260 по проектной ведомости",
  perforated_tape_50x2_length_m: "перфорированная лента 50×2 мм по проектной ведомости",
  joint_sealing_tape_length_m: "лента для герметизации стыков по проектной ведомости",
  form_release_agent_l: "разделительный состав по проектной ведомости",
  formwork_handling_worker_h: "приёмка, сортировка и перемещение комплекта",
  assembly_alignment_worker_h: "сборка, установка и выверка опалубки",
  stripping_cleaning_worker_h: "распалубка, очистка и подготовка к возврату",
  layout_review_document_count: "проверка раскладки и ведомости инженером",
  crane_hours: "работа крана на подачу и перестановку",
  shipping_mass_t: "масса отправляемого комплекта",
  outbound_distance_km: "расстояние доставки на объект",
  return_distance_km: "расстояние возврата арендного комплекта",
  rental_duration_days: "срок аренды возвратного комплекта",
  project_stage_count: "число этапов установки и перестановки",
} satisfies Readonly<Record<string, string>>);

const SELECTION_FIELDS = Object.freeze({
  reusable_equipment_supply_mode: {
    label: "способ обеспечения возвратного комплекта",
    values: { "аренда с возвратом": "RENTAL_RETURNABLE" },
  },
  consumables_supply_mode: {
    label: "способ обеспечения расходных материалов",
    values: { "покупка для проекта": "PURCHASE_FOR_PROJECT" },
  },
  labor_supply_mode: {
    label: "способ привлечения рабочих",
    values: { "отдельная работа подрядчика": "CONTRACTOR_SEPARATE" },
  },
  crane_supply_mode: {
    label: "способ обеспечения крана",
    values: { "отдельная аренда": "RENTAL_SEPARATE" },
  },
  transport_supply_mode: {
    label: "способ учёта доставки и возврата",
    values: { "доставка и возврат отдельными рейсами": "SEPARATE_OUTBOUND_AND_RETURN" },
  },
  separate_working_platform_applicability: {
    label: "отдельная рабочая площадка",
    values: { "не требуется для фундамента на уровне земли": "NOT_APPLICABLE_GROUND_LEVEL_FOUNDATION" },
  },
  supporting_construction_applicability: {
    label: "отдельная поддерживающая конструкция",
    values: { "не требуется для двухсторонней стяжной опалубки": "NOT_APPLICABLE_DOUBLE_SIDED_TIED" },
  },
  compensation_insert_applicability: {
    label: "компенсационная вставка",
    values: { "не требуется: утверждённая раскладка без зазоров": "NOT_APPLICABLE_APPROVED_LAYOUT_HAS_NO_GAPS" },
  },
  deposit_applicability: {
    label: "отдельный арендный депозит",
    values: { "не предусмотрен предложением поставщика": "NOT_APPLICABLE_NO_DEPOSIT_IN_SUPPLIER_QUOTE" },
  },
  separate_maintenance_service_applicability: {
    label: "отдельная сервисная плата за обслуживание",
    values: { "не предусмотрена: включена в условия возврата": "NOT_APPLICABLE_INCLUDED_IN_RETURN_CONDITION" },
  },
} satisfies Readonly<Record<string, {
  label: string;
  values: Readonly<Record<string, string>>;
}>>);

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
}

function labeledValues(text: string): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  for (const segment of text.split(/\n+/u)) {
    const separator = segment.indexOf(":");
    if (separator <= 0) continue;
    const label = normalize(segment.slice(0, separator));
    const value = segment.slice(separator + 1).trim();
    if (label && value) values.set(label, value);
  }
  return values;
}

function leadingNumber(value: string): number | null {
  const raw = value.match(/^\s*(\d[\d\s]*(?:[.,]\d+)?)/u)?.[1];
  if (!raw) return null;
  const parsed = Number(raw.replace(/\s+/gu, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function isFormworkFramiXlifeFoundationCatalogR1(catalogId: string): boolean {
  return CATALOG_IDS.has(catalogId);
}

/**
 * Reads a named project/supplier schedule from ordinary Russian form copy.
 * It never derives a universal kit from area. Manufacturer-owned constants
 * are selected only after the user explicitly chooses Doka Frami Xlife;
 * every commercial quantity remains an explicit project schedule value.
 */
export function extractFormworkFramiXlifeCanonicalParametersR1(input: {
  catalogId: string;
  text: string;
}): Readonly<Record<string, Primitive>> | null {
  if (!isFormworkFramiXlifeFoundationCatalogR1(input.catalogId)
    || !/(?:Doka\s*)?Frami\s*Xlife/iu.test(input.text)) return null;
  const measured = extractRicsNrm2FormworkCanonicalParametersV1(input.text);
  if (!measured) return null;
  const fields = labeledValues(input.text);
  const result: Record<string, Primitive> = {
    ...measured,
    formwork_system_profile_id: FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
    manufacturer_document_reference: FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  };

  for (const [parameterId, label] of Object.entries(TEXT_FIELDS)) {
    const value = fields.get(normalize(label));
    if (value) result[parameterId] = value;
  }
  for (const [parameterId, label] of Object.entries(NUMBER_FIELDS)) {
    const value = fields.get(normalize(label));
    const parsed = value ? leadingNumber(value) : null;
    if (parsed !== null) result[parameterId] = parsed;
  }
  for (const [parameterId, selection] of Object.entries(SELECTION_FIELDS)) {
    const value = fields.get(normalize(selection.label));
    if (!value) continue;
    const selected = Object.entries(selection.values)
      .find(([visibleValue]) => normalize(visibleValue) === normalize(value))?.[1];
    if (selected) result[parameterId] = selected;
  }
  return Object.freeze(result);
}
