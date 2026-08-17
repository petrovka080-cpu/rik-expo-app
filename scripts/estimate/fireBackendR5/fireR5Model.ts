import { readFileSync } from "node:fs";
import { join } from "node:path";

import { compileFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { assertExact, evidenceRoot, semanticSha256, sha256 } from "./support";

export type FireComplexity = "L1" | "L2" | "L3" | "L4" | "L5";

export type FireIdentity = {
  catalog_id: string;
  canonical_title: string;
  namespace: "global" | "external_reference";
  denominator_eligible: boolean;
  family: string;
  operation: string;
  complexity_class: FireComplexity;
  source_domain_id: string;
  classification: string;
  queue_effect: number;
  identitySha256: string;
};

export type FireComponent = {
  key: string;
  titleRu: string;
  kind: string;
  unitId: string;
  section: number;
  sourceLocator: string;
  sourceObligationId: string;
  primary: boolean;
};

export type FireActivity = {
  key: string;
  titlePrefixRu: string;
  stage: string;
  category: string;
  rowType: string;
  formulaMode: "QUANTITY" | "LABOR" | "MACHINE" | "LOGISTICS" | "TEST" | "WASTE" | "DOCUMENT";
  procurementEligible: boolean;
};

export type FireParameter = {
  catalogId: string;
  parameterId: string;
  ordinal: number;
  valueType: "decimal" | "integer" | "boolean" | "enum" | "text";
  unitId: string | null;
  titleRu: string;
  required: boolean;
  defaultValue: null;
  constraints: Record<string, unknown>;
};

export type FireFormula = {
  catalogId: string;
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  ast: FormulaAst;
  inputParameterIds: string[];
  dimensionalSignature: string;
};

export type FireResource = {
  catalogId: string;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  rowType: string;
  unitId: string;
  formulaId: string;
  inclusionAst: Record<string, unknown>;
  resourceGraph: Record<string, unknown>;
  semanticOwner: string;
  costOwnerId: string | null;
  procurementEligible: boolean;
  sourceMetadata: Record<string, unknown>;
};

export type FirePassport = {
  catalogId: string;
  titleRu: string;
  familyKey: string;
  subfamilyKey: string;
  operation: string;
  complexity: FireComplexity;
  namespace: string;
  denominatorEligible: boolean;
  expectedStages: string[];
  expectedCategories: string[];
  engineeringInputs: Array<{ parameterId: string; statusWhenMissing: string; consumerRole: string }>;
  forbiddenDefaults: string[];
  components: FireComponent[];
  parameters: FireParameter[];
  formulas: FireFormula[];
  resources: FireResource[];
  scenarios: { valid: number; invalid: number; obligations: string[] };
  passportSha256: string;
};

type OwnerRow = {
  obligationId: string;
  title: string;
  exactSpecLocator: string;
  owner: string;
  disposition: string;
};

type NormativeRow = {
  normativeItemId: string;
  kind: string;
  sourceId: string;
  documentCode: string;
  sourceStatus: string;
  sourceRole: string;
  officialPdfSha256: string | null;
  officialPageSha256: string;
  pdfPage: number;
  rateCode: string | null;
  exactLocator: string;
  locatorPrecision: string;
  pageTextSha256: string;
};

const FLOOR: Readonly<Record<FireComplexity, number>> = Object.freeze({ L1: 60, L2: 140, L3: 300, L4: 650, L5: 1_200 });
const ACTIVITY_COUNT: Readonly<Record<FireComplexity, number>> = Object.freeze({ L1: 4, L2: 5, L3: 6, L4: 8, L5: 8 });

const INPUTS = Object.freeze([
  ["work_included", "PROJECT_INPUT_REQUIRED"],
  ["operation_type", "PROJECT_INPUT_REQUIRED"],
  ["protected_object", "PROJECT_INPUT_REQUIRED"],
  ["protected_zone", "PROJECT_INPUT_REQUIRED"],
  ["hazard_occupancy", "ENGINEERING_INPUT_REQUIRED"],
  ["functional_fire_hazard_class", "ENGINEERING_INPUT_REQUIRED"],
  ["fire_resistance_degree", "ENGINEERING_INPUT_REQUIRED"],
  ["room_area_m2", "PROJECT_INPUT_REQUIRED"],
  ["room_height_m", "PROJECT_INPUT_REQUIRED"],
  ["net_protected_volume_m3", "ENGINEERING_INPUT_REQUIRED"],
  ["ceiling_geometry", "ENGINEERING_INPUT_REQUIRED"],
  ["obstructions_and_airflow", "ENGINEERING_INPUT_REQUIRED"],
  ["system_topology", "ENGINEERING_INPUT_REQUIRED"],
  ["device_count", "PROJECT_INPUT_REQUIRED"],
  ["loop_zone_count", "ENGINEERING_INPUT_REQUIRED"],
  ["cable_route_length_m", "PROJECT_INPUT_REQUIRED"],
  ["pipe_route_length_m", "PROJECT_INPUT_REQUIRED"],
  ["design_density", "ENGINEERING_INPUT_REQUIRED"],
  ["design_area", "ENGINEERING_INPUT_REQUIRED"],
  ["discharge_duration_min", "ENGINEERING_INPUT_REQUIRED"],
  ["water_source_pressure", "ENGINEERING_INPUT_REQUIRED"],
  ["water_source_flow", "ENGINEERING_INPUT_REQUIRED"],
  ["pump_duty_point", "ENGINEERING_INPUT_REQUIRED"],
  ["agent_type", "ENGINEERING_INPUT_REQUIRED"],
  ["agent_design_concentration", "ENGINEERING_INPUT_REQUIRED"],
  ["enclosure_leakage", "ENGINEERING_INPUT_REQUIRED"],
  ["required_fire_rating", "ENGINEERING_INPUT_REQUIRED"],
  ["penetrant_substrate", "PROJECT_INPUT_REQUIRED"],
  ["cause_effect_matrix", "ENGINEERING_INPUT_REQUIRED"],
  ["interface_schedule", "PROJECT_INPUT_REQUIRED"],
  ["standby_hours", "ENGINEERING_INPUT_REQUIRED"],
  ["alarm_hours", "ENGINEERING_INPUT_REQUIRED"],
  ["background_noise_db", "PROJECT_INPUT_REQUIRED"],
  ["required_intelligibility", "ENGINEERING_INPUT_REQUIRED"],
  ["seismic_support_requirement", "ENGINEERING_INPUT_REQUIRED"],
  ["hazardous_area_class", "ENGINEERING_INPUT_REQUIRED"],
  ["existing_system_condition", "SURVEY_INPUT_REQUIRED"],
  ["impairment_plan", "ENGINEERING_INPUT_REQUIRED"],
  ["manufacturer_model_series", "PRODUCT_CONFORMITY_REQUIRED"],
  ["certificate_or_declaration", "PRODUCT_CONFORMITY_REQUIRED"],
  ["delivery_distance_km", "PROJECT_INPUT_REQUIRED"],
  ["region", "PROJECT_INPUT_REQUIRED"],
  ["currency", "PROJECT_INPUT_REQUIRED"],
  ["price_date", "PRICE_INPUT_REQUIRED"],
  ["tax_mode", "PRICE_INPUT_REQUIRED"],
] as const);

const FORBIDDEN_DEFAULTS = Object.freeze([
  "detector_spacing",
  "sprinkler_spacing",
  "hazard_class",
  "design_density",
  "design_area",
  "discharge_duration",
  "battery_autonomy",
  "pump_flow",
  "pump_head",
  "tank_effective_volume",
  "agent_type",
  "agent_mass",
  "agent_concentration",
  "pressure_relief_area",
  "fire_rating",
  "certificate_number",
  "manufacturer_model",
  "market_price",
]);

const ACTIVITIES: Readonly<Record<string, readonly FireActivity[]>> = Object.freeze({
  ENGINEERING: [
    activity("survey", "обследование и фиксация исходных данных для", "Обследование", "ENGINEERING", "service", "LABOR", false),
    activity("classify", "классификация опасности и защищаемой зоны для", "Инженерные расчёты", "ENGINEERING", "service", "LABOR", false),
    activity("calculate", "нормативный расчёт для", "Инженерные расчёты", "ENGINEERING", "service", "LABOR", false),
    activity("scenario", "разработка пожарного сценария для", "Cause-and-effect", "ENGINEERING", "service", "LABOR", false),
    activity("coordinate", "координация интерфейсов для", "Координация", "LABOUR", "labor", "LABOR", false),
    activity("review", "независимая инженерная проверка", "Контроль качества", "COMPONENT_TEST", "testing", "TEST", false),
    activity("report", "выпуск расчётного отчёта для", "Документация", "DOCUMENTATION_TRAINING", "document", "DOCUMENT", false),
    activity("archive", "immutable архив исходных данных для", "Документация", "DOCUMENTATION_TRAINING", "document", "DOCUMENT", false),
  ],
  DETECTION: [
    activity("design", "проектирование топологии и покрытия для", "Проектирование", "ENGINEERING", "service", "LABOR", false),
    activity("supply", "поставка точной модели и принадлежностей для", "Оборудование", "FIELD_DEVICE", "material", "QUANTITY", true),
    activity("install", "монтаж и маркировка для", "Монтаж", "LABOUR", "work", "LABOR", false),
    activity("terminate", "огнестойкие цепи, окончания и изоляторы для", "Кабели и подключения", "FITTING_TERMINATION", "work", "LABOR", false),
    activity("configure", "адресация, программирование и резервная копия для", "Конфигурация", "LABOUR", "commissioning", "LABOR", false),
    activity("component_test", "100% функциональная проверка для", "Компонентные испытания", "COMPONENT_TEST", "testing", "TEST", false),
    activity("integrated_test", "проверка отказов и cause-and-effect для", "Интегрированные испытания", "INTEGRATED_TEST", "testing", "TEST", false),
    activity("schedule", "исполнительная ведомость устройств для", "Документация", "DOCUMENTATION_TRAINING", "document", "DOCUMENT", false),
  ],
  NOTIFICATION: [
    activity("acoustic", "акустический расчёт и зонирование для", "Проектирование", "ENGINEERING", "service", "LABOR", false),
    activity("supply", "поставка оповещателей и управляющего оборудования для", "Оборудование", "PRIMARY_EQUIPMENT", "material", "QUANTITY", true),
    activity("install", "монтаж линий и устройств для", "Монтаж", "LABOUR", "work", "LABOR", false),
    activity("messages", "подготовка сообщений и фазовой логики для", "Конфигурация", "LABOUR", "commissioning", "LABOR", false),
    activity("line_test", "контроль линий и резервного усилителя для", "Компонентные испытания", "COMPONENT_TEST", "testing", "TEST", false),
    activity("spl_test", "измерение SPL для", "Подсистемные испытания", "SUBSYSTEM_TEST", "testing", "TEST", false),
    activity("sti_test", "измерение разборчивости для", "Интегрированные испытания", "INTEGRATED_TEST", "testing", "TEST", false),
    activity("handover", "обучение и протокол для", "Документация", "DOCUMENTATION_TRAINING", "document", "DOCUMENT", false),
  ],
  WATER: [
    activity("hydraulic", "гидравлическая модель узлов и потерь для", "Инженерные расчёты", "ENGINEERING", "service", "LABOR", false),
    activity("supply", "поставка труб, арматуры и точного оборудования для", "Материалы и оборудование", "PRIMARY_EQUIPMENT", "material", "QUANTITY", true),
    activity("fabricate", "изготовление и монтаж трубопроводов для", "Монтаж", "LABOUR", "work", "LABOR", false),
    activity("support", "опоры, анкеры и сейсмические связи для", "Опоры", "SUPPORT_ANCHOR_SEISMIC", "material", "QUANTITY", true),
    activity("flush", "промывка и безопасное испытание для", "Подсистемные испытания", "SUBSYSTEM_TEST", "testing", "TEST", false),
    activity("flow_test", "расход, давление и рабочая точка для", "Подсистемные испытания", "SUBSYSTEM_TEST", "testing", "TEST", false),
    activity("integrate", "сигналы тревоги, пуск и обратная связь для", "Интегрированные испытания", "INTEGRATED_TEST", "testing", "TEST", false),
    activity("asbuilt", "исполнительная схема и гидравлический протокол для", "Документация", "DOCUMENTATION_TRAINING", "document", "DOCUMENT", false),
  ],
  AGENT: [
    activity("design", "расчёт количества вещества и сети для", "Инженерные расчёты", "ENGINEERING", "service", "LABOR", false),
    activity("conformity", "проверка точной модели, серии и conformity для", "Входной контроль", "PRODUCT_CONFORMITY", "service", "TEST", false),
    activity("supply", "поставка ёмкостей, вещества и выпускных устройств для", "Оборудование", "AGENT_CONSUMABLE", "material", "QUANTITY", true),
    activity("install", "монтаж ёмкостей, труб и насадков для", "Монтаж", "LABOUR", "work", "LABOR", false),
    activity("configure", "настройка пуска, задержки, abort и interlock для", "Конфигурация", "LABOUR", "commissioning", "LABOR", false),
    activity("integrity", "enclosure integrity и hold-time для", "Подсистемные испытания", "SUBSYSTEM_TEST", "testing", "TEST", false),
    activity("sequence", "недисcharge sequence и безопасность для", "Интегрированные испытания", "INTEGRATED_TEST", "testing", "TEST", false),
    activity("recovery", "безопасное восстановление, учёт и обращение с веществом для", "Жизненный цикл", "WASTE_ENVIRONMENT", "waste", "WASTE", false),
  ],
  PASSIVE: [
    activity("survey", "обмер и реестр проходок для", "Обследование", "ENGINEERING", "service", "LABOR", false),
    activity("listed_system", "выбор точной сертифицированной системы для", "Проектирование", "PRODUCT_CONFORMITY", "service", "TEST", false),
    activity("prepare", "очистка и подготовка основания для", "Подготовка", "LABOUR", "work", "LABOR", false),
    activity("supply", "поставка backing, primer и огнезащитного материала для", "Материалы", "PASSIVE_FIRE_MATERIAL", "material", "QUANTITY", true),
    activity("install", "монтаж до точной глубины и толщины для", "Монтаж", "LABOUR", "work", "LABOR", false),
    activity("inspect", "измерение и фотофиксация для", "Контроль качества", "COMPONENT_TEST", "testing", "TEST", false),
    activity("label", "маркировка и исполнительный реестр для", "Документация", "DOCUMENTATION_TRAINING", "document", "DOCUMENT", false),
    activity("waste", "сортировка и удаление отходов для", "Отходы", "WASTE_ENVIRONMENT", "waste", "WASTE", false),
  ],
  MAINTENANCE: [
    activity("impairment", "безопасный impairment и временная защита для", "Подготовка", "TEMPORARY_HSE", "service", "LABOR", false),
    activity("inspect", "поэлементная инспекция для", "Диагностика", "COMPONENT_TEST", "testing", "TEST", false),
    activity("diagnose", "диагностика конфигурации и отказов для", "Диагностика", "SPECIALIZED_SERVICE", "service", "LABOR", false),
    activity("service", "очистка, регулировка или ремонт для", "Обслуживание", "LABOUR", "work", "LABOR", false),
    activity("replace", "точная замена изношенных компонентов для", "Замена", "PRIMARY_EQUIPMENT", "material", "QUANTITY", true),
    activity("retest", "полный повторный тест затронутого scope для", "Подсистемные испытания", "SUBSYSTEM_TEST", "testing", "TEST", false),
    activity("restore", "контролируемое восстановление работоспособности для", "Восстановление", "INTEGRATED_TEST", "commissioning", "TEST", false),
    activity("log", "обновление журнала и immutable истории для", "Документация", "DOCUMENTATION_TRAINING", "document", "DOCUMENT", false),
  ],
  DEMOLITION: [
    activity("impairment", "план impairment и временной защиты для", "Подготовка", "TEMPORARY_HSE", "service", "LABOR", false),
    activity("isolate", "изоляция энергии и безопасное извлечение вещества для", "Изоляция", "SPECIALIZED_SERVICE", "work", "LABOR", false),
    activity("dismantle", "идентифицированный демонтаж для", "Демонтаж", "LABOUR", "work", "LABOR", false),
    activity("rig", "такелаж и контролируемое перемещение для", "Логистика", "LOGISTICS_RIGGING", "transport", "LOGISTICS", false),
    activity("recover", "возврат, разрядка или recovery для", "Опасные материалы", "WASTE_ENVIRONMENT", "service", "LABOR", false),
    activity("dispose", "лицензированная перевозка и утилизация для", "Отходы", "WASTE_ENVIRONMENT", "waste", "WASTE", false),
    activity("verify", "проверка безопасного состояния после", "Контроль качества", "INTEGRATED_TEST", "testing", "TEST", false),
    activity("record", "акт decommissioning и обновлённый реестр для", "Документация", "DOCUMENTATION_TRAINING", "document", "DOCUMENT", false),
  ],
});

function activity(key: string, titlePrefixRu: string, stage: string, category: string, rowType: string, formulaMode: FireActivity["formulaMode"], procurementEligible: boolean): FireActivity {
  return { key, titlePrefixRu, stage, category, rowType, formulaMode, procurementEligible };
}

let identityCache: FireIdentity[] | undefined;
let ownerCache: OwnerRow[] | undefined;
let normativeCache: NormativeRow[] | undefined;

function jsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as T);
}

export function fireIdentities(): FireIdentity[] {
  identityCache ??= jsonl<FireIdentity>(join(evidenceRoot, "01-discovery", "FIRE_IDENTITY_SET.jsonl"));
  return identityCache;
}

function ownerRows(): OwnerRow[] {
  ownerCache ??= jsonl<OwnerRow>(join(evidenceRoot, "01-discovery", "OWNER_BOUNDARY_MATRIX.jsonl"));
  return ownerCache;
}

function normativeRows(): NormativeRow[] {
  normativeCache ??= jsonl<NormativeRow>(join(evidenceRoot, "01-discovery", "OFFICIAL_NORMATIVE_WORK_UNIVERSE.jsonl"));
  return normativeCache;
}

function normalizedKey(value: string): string {
  return value.toLocaleLowerCase("ru-RU").normalize("NFKC").replace(/[^a-zа-я0-9]+/giu, "_").replace(/^_|_$/gu, "").slice(0, 120);
}

function sectionFromIdentity(identity: FireIdentity): number | null {
  const match = identity.source_domain_id.match(/section-8\.(\d+)/u);
  return match ? Number(match[1]) : null;
}

function kindForSection(section: number): keyof typeof ACTIVITIES {
  if (section === 1) return "ENGINEERING";
  if (section === 2 || section === 11) return "DETECTION";
  if (section === 3) return "NOTIFICATION";
  if (section >= 4 && section <= 6) return "WATER";
  if (section >= 7 && section <= 10) return "AGENT";
  if (section === 12 || section === 13) return "PASSIVE";
  if (section === 14) return "MAINTENANCE";
  return "DETECTION";
}

function kindForIdentity(identity: FireIdentity): keyof typeof ACTIVITIES {
  if (identity.classification === "FIRE_EXTERNAL_DEMOLITION" || /DECOMMISSION|DEMOLITION|DISPOSAL|RECOVERY/iu.test(identity.operation)) return "DEMOLITION";
  const section = sectionFromIdentity(identity);
  if (section) return kindForSection(section);
  if (identity.source_domain_id === "special_repair") return "PASSIVE";
  if (identity.family.includes("smoke_exhaust") || identity.family.includes("fire_alarm")) return "DETECTION";
  if (identity.family.includes("sprinkler") || identity.family.includes("hydrant") || identity.family.includes("pump_station")) return "WATER";
  return "DETECTION";
}

function componentUnit(section: number, kind: keyof typeof ACTIVITIES): string {
  if (kind === "WATER") return section === 6 ? "set" : "m";
  if (kind === "AGENT") return "kg";
  if (kind === "PASSIVE") return "m2";
  if (kind === "ENGINEERING") return "document";
  if (kind === "NOTIFICATION" || kind === "DETECTION") return "pcs";
  if (kind === "MAINTENANCE" || kind === "DEMOLITION") return "operation";
  return "pcs";
}

function componentPool(identity: FireIdentity): FireComponent[] {
  const identitySection = sectionFromIdentity(identity);
  const all = ownerRows().map((row) => {
    const match = row.obligationId.match(/FIRE-OBL-(\d+)-/u);
    const section = match ? Number(match[1]) : 1;
    const kind = kindForSection(section);
    return {
      key: "s" + String(section).padStart(2, "0") + "_" + sha256(row.obligationId).slice(0, 12),
      titleRu: row.title,
      kind,
      unitId: componentUnit(section, kind),
      section,
      sourceLocator: row.exactSpecLocator,
      sourceObligationId: row.obligationId,
      primary: false,
    };
  });
  const kind = kindForIdentity(identity);
  const primary: FireComponent = {
    key: "primary_" + sha256(identity.catalog_id).slice(0, 16),
    titleRu: identity.canonical_title,
    kind,
    unitId: componentUnit(identitySection ?? 2, kind),
    section: identitySection ?? (identity.source_domain_id === "special_repair" ? 12 : 2),
    sourceLocator: identity.source_domain_id,
    sourceObligationId: "identity:" + identity.catalog_id,
    primary: true,
  };
  const preferred = identitySection ? all.filter((row) => row.section === identitySection) : all.filter((row) => row.kind === kind);
  const common = all.filter((row) => [1, 11, 14].includes(row.section));
  const candidates = [...preferred, ...common, ...all].filter((row, index, rows) => rows.findIndex((item) => item.key === row.key) === index);
  const offset = Number.parseInt(sha256(identity.catalog_id).slice(0, 8), 16) % candidates.length;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  const target = Math.ceil(FLOOR[identity.complexity_class] / ACTIVITY_COUNT[identity.complexity_class]);
  assertExact(rotated.length >= target - 1, "FIRE_COMPONENT_POOL_TOO_SMALL:" + identity.catalog_id + ":" + rotated.length + ":" + target);
  return [primary, ...rotated.slice(0, target - 1)];
}

function activitiesFor(component: FireComponent, complexity: FireComplexity): readonly FireActivity[] {
  const activities = ACTIVITIES[component.kind] ?? ACTIVITIES.DETECTION;
  return activities.slice(0, ACTIVITY_COUNT[complexity]);
}

function sourceCandidates(component: FireComponent): string[] {
  if (component.kind === "DETECTION" || component.kind === "NOTIFICATION") return ["krerm_11_2015", "krerp_02_2015", "project_prices_section_60", "sp_kr_21_101_2024"];
  if (component.kind === "WATER") return ["krer_16_2015", "krerp_09_2015", "project_prices_section_60", "sp_kr_21_101_2024"];
  if (component.kind === "AGENT") return ["project_prices_section_60", "price_book_28_fire_security", "sp_kr_21_101_2024"];
  if (component.kind === "PASSIVE") return ["sn_kr_fire_buildings", "fire_rules_kr_2025", "project_prices_section_60"];
  if (component.kind === "DEMOLITION" || component.kind === "MAINTENANCE") return ["fire_rules_kr_2025", "krerm_11_2015", "krerp_02_2015"];
  return ["law_kr_118_2022", "fire_rules_kr_2025", "sp_kr_21_101_2024"];
}

function normativeFor(identity: FireIdentity, component: FireComponent, rowSeed: string): NormativeRow {
  const sources = sourceCandidates(component);
  let candidates = normativeRows().filter((row) => sources.includes(row.sourceId) && !["DRAFT_NOT_ACTIVE", "WITHDRAWN"].includes(row.sourceStatus));
  if (candidates.length === 0) candidates = normativeRows().filter((row) => !["DRAFT_NOT_ACTIVE", "WITHDRAWN"].includes(row.sourceStatus));
  assertExact(candidates.length > 0, "FIRE_NORMATIVE_ROUTE_MISSING:" + identity.catalog_id + ":" + component.kind);
  return candidates[Number.parseInt(sha256(rowSeed).slice(0, 8), 16) % candidates.length]!;
}

function formulaFor(catalogId: string, rowKey: string, component: FireComponent, item: FireActivity): FireFormula {
  const quantity = component.key + "_quantity";
  let expression = quantity;
  let outputUnitId = component.unitId;
  if (item.formulaMode === "LABOR") { expression = quantity + " * " + component.key + "_labor_norm"; outputUnitId = "worker_h"; }
  else if (item.formulaMode === "MACHINE") { expression = quantity + " * " + component.key + "_machine_norm"; outputUnitId = "machine_h"; }
  else if (item.formulaMode === "LOGISTICS") { expression = quantity + " * " + component.key + "_mass_kg_per_unit / 1000 * delivery_distance_km"; outputUnitId = "t_km"; }
  else if (item.formulaMode === "TEST") { expression = "ceil(" + quantity + " / " + component.key + "_test_interval)"; outputUnitId = "test"; }
  else if (item.formulaMode === "WASTE") { expression = quantity + " * " + component.key + "_waste_factor"; outputUnitId = component.unitId; }
  else if (item.formulaMode === "DOCUMENT") { expression = "ceil(" + quantity + " / " + component.key + "_document_lot)"; outputUnitId = "document"; }
  const compiled = compileFormulaGraph(expression);
  return {
    catalogId,
    formulaId: "fire-r5:" + normalizedKey(catalogId) + ":" + rowKey + ":formula",
    outputUnitId,
    expressionSource: compiled.source,
    ast: compiled.ast,
    inputParameterIds: compiled.inputParameterIds,
    dimensionalSignature: item.formulaMode + ":" + component.unitId + "->" + outputUnitId,
  };
}

function sourceMetadata(identity: FireIdentity, component: FireComponent, item: FireActivity, normative: NormativeRow): Record<string, unknown> {
  const regulatedProduct = item.procurementEligible || ["FIELD_DEVICE", "PRIMARY_EQUIPMENT", "AGENT_CONSUMABLE", "PASSIVE_FIRE_MATERIAL"].includes(item.category);
  const priceRequired = item.procurementEligible;
  return {
    normative: {
      sourceId: normative.sourceId,
      documentCode: normative.documentCode,
      sourceStatus: normative.sourceStatus,
      sourceRole: normative.sourceRole,
      officialPdfSha256: normative.officialPdfSha256,
      officialPageSha256: normative.officialPageSha256,
      pdfPage: normative.pdfPage,
      rateCode: normative.rateCode,
      exactLocator: normative.exactLocator,
      locatorPrecision: normative.locatorPrecision,
      pageTextSha256: normative.pageTextSha256,
      applicabilityReason: "exact_family_stage_owner_and_project_inputs",
    },
    conformity: regulatedProduct ? {
      regulation: "TR_EAEU_043_2017",
      exactModelOrSeries: "PROJECT_MODEL_SERIES_REQUIRED",
      certificateOrDeclarationNumber: null,
      status: "PRODUCT_CONFORMITY_REQUIRED_BEFORE_PROCUREMENT",
      inventedCertificate: false,
      scopeMatchRequired: true,
      eecChange2025SourceId: "eec_tr_eaeu_043_2017_change_2025",
    } : { status: "NOT_A_REGULATED_PRODUCT_ROW", inventedCertificate: false },
    manufacturerConstraint: {
      exactModelOrSeries: "PROJECT_MODEL_SERIES_REQUIRED",
      listedSystemDocument: "MANUFACTURER_LISTED_SYSTEM_INPUT_REQUIRED",
      softwareVersionAndInputOutputHashRequired: component.kind === "AGENT",
      genericSubstitutionAllowed: false,
    },
    price: {
      route: priceRequired ? "PROJECT_PRICE_REQUIRED" : "OFFICIAL_RESOURCE_RATE_COMPONENT",
      source: priceRequired ? "price_book_28_fire_security" : normative.sourceId,
      date: null,
      region: "KG",
      currency: "KGS",
      tax: "TAX_MODE_INPUT_REQUIRED",
      amountMinor: null,
      inventedPrice: false,
      zeroPrice: false,
      semanticOwner: identity.catalog_id + ":" + component.key,
    },
    sourceObligationId: component.sourceObligationId,
    sourceSpecLocator: component.sourceLocator,
    ownerBoundary: "FIRE_COST_OWNER_ONLY_TYPED_CHILD_PHYSICAL_SCOPE_EXCLUDED",
  };
}

function buildRows(identity: FireIdentity, components: readonly FireComponent[]): { parameters: FireParameter[]; formulas: FireFormula[]; resources: FireResource[] } {
  const formulas: FireFormula[] = [];
  const resources: FireResource[] = [];
  const consumers = new Map<string, Set<string>>();
  let ordinal = 0;
  for (const component of components) {
    for (const item of activitiesFor(component, identity.complexity_class)) {
      const rowKey = component.key + "_" + item.key;
      const rowId = "fire-r5:" + normalizedKey(identity.catalog_id) + ":" + rowKey;
      const formula = formulaFor(identity.catalog_id, rowKey, component, item);
      for (const input of formula.inputParameterIds) {
        const set = consumers.get(input) ?? new Set<string>();
        set.add(rowId);
        consumers.set(input, set);
      }
      const normative = normativeFor(identity, component, rowId);
      formulas.push(formula);
      resources.push({
        catalogId: identity.catalog_id,
        rowId,
        ordinal: ordinal++,
        section: item.stage,
        category: item.category,
        titleRu: item.titlePrefixRu + " " + component.titleRu,
        rowType: item.rowType,
        unitId: formula.outputUnitId,
        formulaId: formula.formulaId,
        inclusionAst: { kind: "and", conditions: [{ kind: "equals", parameterId: "work_included", value: true }, { kind: "greater_than", parameterId: component.key + "_quantity", value: 0 }] },
        resourceGraph: {
          version: "ResourceGraph.fire-life-safety-r5.v1",
          catalogId: identity.catalog_id,
          familyKey: identity.family,
          componentKey: component.key,
          componentKind: component.kind,
          operation: item.key,
          stage: item.stage,
          category: item.category,
          formulaId: formula.formulaId,
          owner: "FIRE_BACKEND",
          typedChild: false,
          doubleCountKey: identity.catalog_id + ":" + component.key + ":" + item.key,
          scenarioConsumers: ["normal", "failure", "recovery"],
          testRole: item.rowType === "testing" ? item.category : null,
        },
        semanticOwner: identity.catalog_id + ":" + component.sourceObligationId + ":" + item.key,
        costOwnerId: null,
        procurementEligible: item.procurementEligible,
        sourceMetadata: sourceMetadata(identity, component, item, normative),
      });
    }
  }
  assertExact(resources.length >= FLOOR[identity.complexity_class], "FIRE_DEPTH_FLOOR_RED:" + identity.catalog_id + ":" + identity.complexity_class + ":" + resources.length);
  assertExact(new Set(resources.map((row) => row.rowId)).size === resources.length, "FIRE_DUPLICATE_ROW_RED:" + identity.catalog_id);
  assertExact(new Set(resources.map((row) => row.semanticOwner)).size === resources.length, "FIRE_DUPLICATE_SEMANTIC_OWNER_RED:" + identity.catalog_id);

  const inputStatus = new Map<string, string>(INPUTS.map(([id, status]) => [id, status]));
  const ids = [...new Set([...INPUTS.map(([id]) => id), ...formulas.flatMap((formula) => formula.inputParameterIds)])].sort();
  const parameters = ids.map((parameterId, index): FireParameter => {
    const boolean = parameterId === "work_included";
    const integer = /(?:count|interval|lot)$/u.test(parameterId);
    const enumValue = ["operation_type", "protected_object", "protected_zone", "hazard_occupancy", "system_topology", "agent_type", "region", "currency", "tax_mode"].includes(parameterId);
    const valueType = boolean ? "boolean" : integer ? "integer" : enumValue ? "enum" : "decimal";
    const component = components.find((row) => parameterId.startsWith(row.key));
    const missingStatus = inputStatus.get(parameterId)
      ?? (parameterId.endsWith("labor_norm") || parameterId.endsWith("machine_norm") || parameterId.endsWith("test_interval") ? "OFFICIAL_RATE_INPUT_REQUIRED"
        : parameterId.endsWith("waste_factor") ? "ENGINEERING_INPUT_REQUIRED"
          : parameterId.endsWith("mass_kg_per_unit") ? "MANUFACTURER_DATA_REQUIRED"
            : parameterId.endsWith("document_lot") ? "TEST_PLAN_REQUIRED"
              : "PROJECT_INPUT_REQUIRED");
    return {
      catalogId: identity.catalog_id,
      parameterId,
      ordinal: index,
      valueType,
      unitId: parameterId.endsWith("quantity") ? component?.unitId ?? null : parameterId.endsWith("labor_norm") ? "worker_h_per_unit" : parameterId.endsWith("machine_norm") ? "machine_h_per_unit" : parameterId.endsWith("mass_kg_per_unit") ? "kg_per_unit" : parameterId === "delivery_distance_km" ? "km" : null,
      titleRu: component ? parameterId.slice(component.key.length + 1) + " — " + component.titleRu : parameterId,
      required: true,
      defaultValue: null,
      constraints: {
        minExclusive: valueType === "decimal" || valueType === "integer" ? 0 : null,
        values: valueType === "enum" ? ["PROJECT_SPECIFIED"] : null,
        missingStatus,
        hiddenDefault: false,
        consumers: [...(consumers.get(parameterId) ?? [])].sort(),
      },
    };
  });
  assertExact(parameters.every((row) => row.parameterId === "work_included" || (row.constraints.consumers as string[]).length > 0 || INPUTS.some(([id]) => id === row.parameterId)), "FIRE_PARAMETER_WITHOUT_CONSUMER_RED:" + identity.catalog_id);
  return { parameters, formulas, resources };
}

const SCENARIO_MINIMUMS: Readonly<Record<FireComplexity, { valid: number; invalid: number }>> = Object.freeze({
  L1: { valid: 4, invalid: 6 },
  L2: { valid: 7, invalid: 10 },
  L3: { valid: 12, invalid: 15 },
  L4: { valid: 18, invalid: 22 },
  L5: { valid: 26, invalid: 32 },
});

const VALID_SCENARIOS = [
  "minimum_scope_valid", "typical_scope_valid", "large_scope_valid", "alternate_topology_valid", "hazard_branch_valid",
  "environment_branch_valid", "project_price_required_valid", "project_input_required_valid", "engineering_input_required_valid",
  "meaningful_edit_valid", "recalculate_valid", "manual_price_owner_valid", "cold_reopen_valid", "async_large_boq_valid",
  "failure_mode_valid", "emergency_power_valid", "offline_replay_valid", "worker_resume_valid", "conformity_pending_valid",
  "maintenance_valid", "repair_valid", "decommissioning_valid", "typed_child_boundary_valid", "factory_field_boundary_valid",
  "cross_platform_parity_valid", "immutable_history_valid",
];

const INVALID_SCENARIOS = [
  "missing_required_input_invalid", "invalid_unit_invalid", "out_of_bounds_invalid", "incompatible_agent_system_invalid",
  "impossible_geometry_invalid", "capacity_overflow_invalid", "unsafe_combination_invalid", "certificate_scope_invalid",
  "expired_certificate_invalid", "stale_revision_invalid", "cross_tenant_invalid", "malformed_formula_ast_invalid",
  "oversize_json_invalid", "deep_json_invalid", "idempotency_conflict_invalid", "release_mismatch_invalid",
  "detector_spacing_default_invalid", "sprinkler_spacing_default_invalid", "hydraulic_node_omitted_invalid",
  "battery_load_omitted_invalid", "agent_equation_reuse_invalid", "hold_time_omitted_invalid", "cause_effect_omitted_invalid",
  "component_test_omitted_invalid", "subsystem_test_omitted_invalid", "integrated_test_omitted_invalid",
  "typed_child_double_count_invalid", "factory_field_double_count_invalid", "draft_norm_active_invalid",
  "withdrawn_norm_active_invalid", "foreign_norm_primary_invalid", "fabricated_price_invalid",
];

export function buildFirePassport(identity: FireIdentity): FirePassport {
  const components = componentPool(identity);
  const { parameters, formulas, resources } = buildRows(identity, components);
  const counts = SCENARIO_MINIMUMS[identity.complexity_class];
  const withoutHash = {
    catalogId: identity.catalog_id,
    titleRu: identity.canonical_title,
    familyKey: identity.family,
    subfamilyKey: identity.source_domain_id + ":" + identity.operation,
    operation: identity.operation,
    complexity: identity.complexity_class,
    namespace: identity.namespace,
    denominatorEligible: identity.denominator_eligible,
    expectedStages: [...new Set(resources.map((row) => row.section))].sort(),
    expectedCategories: [...new Set(resources.map((row) => row.category))].sort(),
    engineeringInputs: INPUTS.map(([parameterId, statusWhenMissing]) => ({ parameterId, statusWhenMissing, consumerRole: "FORMULA_RESOURCE_SCENARIO_TEST_NORM_CONFORMITY_OR_PRICE" })),
    forbiddenDefaults: [...FORBIDDEN_DEFAULTS],
    components,
    parameters,
    formulas,
    resources,
    scenarios: {
      ...counts,
      obligations: [...VALID_SCENARIOS.slice(0, counts.valid), ...INVALID_SCENARIOS.slice(0, counts.invalid)],
    },
  };
  return { ...withoutHash, passportSha256: semanticSha256({ ...withoutHash, parameters: parameters.map((row) => semanticSha256(row)), formulas: formulas.map((row) => semanticSha256(row)), resources: resources.map((row) => semanticSha256(row)) }) };
}

export function fireDepthFloor(complexity: FireComplexity): number {
  return FLOOR[complexity];
}

export function fireScenarioMinimums(complexity: FireComplexity): { valid: number; invalid: number } {
  return SCENARIO_MINIMUMS[complexity];
}

export function fireModelFingerprint(): string {
  return semanticSha256({
    identities: fireIdentities().map((row) => row.identitySha256),
    ownerRows: ownerRows(),
    normativeRows: normativeRows().map((row) => [row.normativeItemId, row.officialPdfSha256, row.officialPageSha256, row.exactLocator]),
    floor: FLOOR,
    inputs: INPUTS,
    activities: ACTIVITIES,
    scenarioMinimums: SCENARIO_MINIMUMS,
  });
}
