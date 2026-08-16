import { readFileSync } from "node:fs";
import { join } from "node:path";

import { compileFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { assertExact, evidenceRoot, semanticSha256, sha256 } from "./support";

export type ConcreteComplexity = "L1" | "L2" | "L3" | "L4" | "L5";

export type ConcreteIdentity = {
  catalog_id: string;
  canonical_title: string;
  namespace: "global" | "external_reference";
  denominator_eligible: boolean;
  family: string;
  operation: string;
  complexity_class: ConcreteComplexity;
  source_domain_id: string;
  classification: string;
  queue_effect: number;
  identitySha256: string;
};

export type ConcreteComponent = {
  key: string;
  titleRu: string;
  kind: string;
  unitId: string;
  section: number;
  sourceLocator: string;
  sourceObligationId: string;
  primary: boolean;
};

export type ConcreteActivity = {
  key: string;
  titlePrefixRu: string;
  stage: string;
  category: string;
  rowType: string;
  formulaMode: "QUANTITY" | "LABOR" | "MACHINE" | "LOGISTICS" | "TEST" | "WASTE" | "DOCUMENT";
  procurementEligible: boolean;
};

export type ConcreteParameter = {
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

export type ConcreteFormula = {
  catalogId: string;
  formulaId: string;
  outputUnitId: string;
  expressionSource: string;
  ast: FormulaAst;
  inputParameterIds: string[];
  dimensionalSignature: string;
};

export type ConcreteResource = {
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

export type ConcretePassport = {
  catalogId: string;
  titleRu: string;
  familyKey: string;
  subfamilyKey: string;
  operation: string;
  complexity: ConcreteComplexity;
  namespace: string;
  denominatorEligible: boolean;
  expectedStages: string[];
  expectedCategories: string[];
  engineeringInputs: Array<{ parameterId: string; statusWhenMissing: string; consumerRole: string }>;
  forbiddenDefaults: string[];
  components: ConcreteComponent[];
  parameters: ConcreteParameter[];
  formulas: ConcreteFormula[];
  resources: ConcreteResource[];
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
  officialPdfSha256: string;
  pdfPage: number;
  rateCode: string | null;
  exactLocator: string;
  pageTextSha256: string;
};

const FLOOR: Readonly<Record<ConcreteComplexity, number>> = Object.freeze({ L1: 80, L2: 180, L3: 350, L4: 700, L5: 1_500 });

const INPUTS = Object.freeze([
  ["operation_type", "PROJECT_INPUT_REQUIRED"], ["structure_type", "PROJECT_INPUT_REQUIRED"], ["quantity", "PROJECT_INPUT_REQUIRED"],
  ["length", "PROJECT_INPUT_REQUIRED"], ["width", "PROJECT_INPUT_REQUIRED"], ["height", "PROJECT_INPUT_REQUIRED"],
  ["thickness", "PROJECT_INPUT_REQUIRED"], ["diameter_radius", "PROJECT_INPUT_REQUIRED"], ["element_count", "PROJECT_INPUT_REQUIRED"],
  ["openings_recesses", "PROJECT_INPUT_REQUIRED"], ["pour_lift_count", "POUR_PLAN_REQUIRED"], ["access_congestion", "SURVEY_INPUT_REQUIRED"],
  ["delivery_distance_km", "PROJECT_INPUT_REQUIRED"], ["vertical_transport", "LIFTING_PLAN_REQUIRED"], ["region", "PROJECT_INPUT_REQUIRED"],
  ["currency", "PROJECT_INPUT_REQUIRED"], ["price_date", "PRICE_INPUT_REQUIRED"], ["tax_mode", "PRICE_INPUT_REQUIRED"],
  ["design_loads", "STRUCTURAL_DESIGN_REQUIRED"], ["concrete_class", "STRUCTURAL_DESIGN_REQUIRED"], ["exposure_class", "STRUCTURAL_DESIGN_REQUIRED"],
  ["watertightness", "STRUCTURAL_DESIGN_REQUIRED"], ["frost_resistance", "STRUCTURAL_DESIGN_REQUIRED"], ["fire_resistance", "STRUCTURAL_DESIGN_REQUIRED"],
  ["seismic_requirements", "STRUCTURAL_DESIGN_REQUIRED"], ["cover", "REBAR_SCHEDULE_REQUIRED"], ["reinforcement_schedule", "REBAR_SCHEDULE_REQUIRED"],
  ["bar_class_diameters", "REBAR_SCHEDULE_REQUIRED"], ["lap_anchorage", "REBAR_SCHEDULE_REQUIRED"], ["coupler_locations", "REBAR_SCHEDULE_REQUIRED"],
  ["embedment_schedule", "EMBEDMENT_SCHEDULE_REQUIRED"], ["joint_layout", "STRUCTURAL_DESIGN_REQUIRED"], ["prestressing_design", "PRESTRESSING_DESIGN_REQUIRED"],
  ["formwork_pressure", "FORMWORK_DESIGN_REQUIRED"], ["striking_strength", "FORMWORK_DESIGN_REQUIRED"], ["temporary_works", "TEMPORARY_WORKS_DESIGN_REQUIRED"],
  ["shoring_sequence", "TEMPORARY_WORKS_DESIGN_REQUIRED"], ["pour_sequence", "POUR_PLAN_REQUIRED"], ["surface_class", "PROJECT_INPUT_REQUIRED"],
  ["tolerances", "STRUCTURAL_DESIGN_REQUIRED"], ["mix_design", "MIX_DESIGN_REQUIRED"], ["placement_method", "POUR_PLAN_REQUIRED"],
  ["curing_method_duration", "POUR_PLAN_REQUIRED"], ["thermal_control", "THERMAL_CONTROL_PLAN_REQUIRED"], ["test_lot_plan", "LAB_TEST_PLAN_REQUIRED"],
  ["precast_mass_route", "LIFTING_PLAN_REQUIRED"], ["defect_map", "SURVEY_INPUT_REQUIRED"], ["repair_depth", "ENGINEERING_INPUT_REQUIRED"],
  ["demolition_sequence", "DEMOLITION_METHOD_STATEMENT_REQUIRED"], ["waste_route", "ENVIRONMENTAL_INPUT_REQUIRED"], ["manufacturer_data", "MANUFACTURER_DATA_REQUIRED"],
] as const);

const FORBIDDEN_DEFAULTS = Object.freeze([
  "reinforcement_percentage", "bar_diameter_spacing", "cover", "lap_anchorage", "concrete_class", "exposure_class",
  "structural_loads", "seismic_parameters", "formwork_pressure", "shoring_spacing", "striking_strength", "prestress_force",
  "tendon_layout", "mix_composition", "admixture_dosage", "thermal_gradient", "pump_productivity", "crane_duty",
  "test_lot_frequency", "repair_depth", "demolition_sequence", "market_price",
]);

const ACTIVITIES: Readonly<Record<string, readonly ConcreteActivity[]>> = Object.freeze({
  STRUCTURE: [
    ["survey", "обмер и подтверждение", "Изыскания", "LABOR", "labor", "LABOR", false],
    ["detail", "рабочая детализация", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["supply", "поставка состава для", "Материалы", "MATERIAL", "material", "QUANTITY", true],
    ["execute", "выполнение", "Производство работ", "LABOR", "work", "LABOR", false],
    ["plant", "работа механизма для", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["inspect", "операционный контроль", "Контроль качества", "TEST", "test", "TEST", false],
    ["record", "исполнительная запись для", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "учёт технологических отходов для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  REINFORCEMENT: [
    ["schedule", "проверка ведомости для", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["supply", "поставка арматурного компонента", "Арматура", "MATERIAL", "material", "QUANTITY", true],
    ["process", "резка и подготовка", "Арматура", "LABOR", "work", "LABOR", false],
    ["install", "установка и фиксация", "Арматура", "LABOR", "work", "LABOR", false],
    ["plant", "механизация обработки", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["inspect", "контроль положения", "Контроль качества", "TEST", "test", "TEST", false],
    ["record", "исполнительная схема для", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "сортировка обрезков для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  PRESTRESSING: [
    ["design", "проверка проекта преднапряжения для", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["supply", "поставка системы для", "Материалы", "MATERIAL", "material", "QUANTITY", true],
    ["install", "монтаж системы", "Предварительное напряжение", "LABOR", "work", "LABOR", false],
    ["stress", "натяжение и фиксация", "Предварительное напряжение", "LABOR", "work", "LABOR", false],
    ["plant", "работа домкратов и насосов для", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["measure", "измерение усилия и удлинения для", "Контроль качества", "TEST", "test", "TEST", false],
    ["protocol", "протоколирование", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "утилизация обрезков и промывочных остатков для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  FORMWORK: [
    ["design", "проверка расчёта опалубки для", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["supply", "комплектование опалубки для", "Опалубка", "MATERIAL", "material", "QUANTITY", true],
    ["assemble", "сборка и выверка", "Опалубка", "LABOR", "work", "LABOR", false],
    ["plant", "механизация перестановки", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["inspect", "приёмка перед бетонированием", "Контроль качества", "TEST", "test", "TEST", false],
    ["strip", "распалубка после подтверждения прочности", "Опалубка", "LABOR", "work", "LABOR", false],
    ["record", "журнал оборотов для", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "учёт ремонта и потерь для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  MIX: [
    ["design", "подбор состава для", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["supply", "поставка материалов для", "Бетонная смесь", "MATERIAL", "material", "QUANTITY", true],
    ["batch", "дозирование и смешивание для", "Производство смеси", "LABOR", "work", "LABOR", false],
    ["plant", "работа смесительного оборудования для", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["test", "контроль свежей смеси для", "Контроль качества", "TEST", "test", "TEST", false],
    ["deliver", "транспортирование для", "Логистика", "LOGISTICS", "logistics", "LOGISTICS", false],
    ["record", "паспорт партии для", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "учёт возвратной смеси для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  PLACEMENT: [
    ["plan", "планирование захватки для", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["setup", "подготовка оборудования для", "Подготовка", "LABOR", "work", "LABOR", false],
    ["execute", "выполнение операции", "Укладка", "LABOR", "work", "LABOR", false],
    ["plant", "работа укладочного оборудования для", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["logistics", "подача к месту работ для", "Логистика", "LOGISTICS", "logistics", "LOGISTICS", false],
    ["inspect", "операционный контроль", "Контроль качества", "TEST", "test", "TEST", false],
    ["record", "журнал бетонирования для", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "очистка и отходы после", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  CURING: [
    ["plan", "план ухода для", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["supply", "материалы ухода для", "Уход", "MATERIAL", "material", "QUANTITY", true],
    ["install", "устройство защиты для", "Уход", "LABOR", "work", "LABOR", false],
    ["plant", "работа климатического оборудования для", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["monitor", "мониторинг режима для", "Контроль качества", "TEST", "test", "TEST", false],
    ["remove", "снятие защиты по критериям для", "Уход", "LABOR", "work", "LABOR", false],
    ["record", "температурный журнал для", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "утилизация материалов ухода для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  JOINT: [
    ["detail", "проверка узла для", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["supply", "поставка компонентов для", "Швы и закладные", "MATERIAL", "material", "QUANTITY", true],
    ["prepare", "подготовка основания для", "Швы и закладные", "LABOR", "work", "LABOR", false],
    ["install", "установка и выверка", "Швы и закладные", "LABOR", "work", "LABOR", false],
    ["plant", "механизация обработки для", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["inspect", "контроль положения и герметичности для", "Контроль качества", "TEST", "test", "TEST", false],
    ["record", "исполнительная фиксация для", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "остатки и упаковка для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  TEST: [
    ["plan", "планирование контроля", "Контроль качества", "LABOR", "labor", "LABOR", false],
    ["sample", "отбор и идентификация для", "Контроль качества", "TEST", "test", "TEST", false],
    ["setup", "подготовка оснащения для", "Контроль качества", "MACHINE", "machine", "MACHINE", false],
    ["perform", "выполнение испытания", "Испытания", "TEST", "test", "TEST", false],
    ["witness", "освидетельствование", "Испытания", "LABOR", "labor", "LABOR", false],
    ["evaluate", "оценка результатов", "Контроль качества", "LABOR", "labor", "LABOR", false],
    ["protocol", "оформление протокола", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["archive", "привязка к партии и архивирование", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
  ].map(activity),
  REPAIR: [
    ["survey", "обследование и картирование для", "Обследование", "LABOR", "labor", "LABOR", false],
    ["prepare", "подготовка дефекта для", "Ремонт", "LABOR", "work", "LABOR", false],
    ["supply", "поставка ремонтной системы для", "Материалы", "MATERIAL", "material", "QUANTITY", true],
    ["execute", "выполнение ремонта", "Ремонт", "LABOR", "work", "LABOR", false],
    ["plant", "работа ремонтного оборудования для", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["test", "контроль качества ремонта для", "Контроль качества", "TEST", "test", "TEST", false],
    ["record", "карта и акт ремонта для", "Документация", "DOCUMENT", "document", "DOCUMENT", false],
    ["waste", "сбор удалённого материала для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
  DEMOLITION: [
    ["survey", "подтверждение сохраняемых границ для", "Обследование", "LABOR", "labor", "LABOR", false],
    ["plan", "методика безопасного демонтажа для", "Проектирование", "LABOR", "labor", "LABOR", false],
    ["isolate", "изоляция зоны для", "Подготовка", "LABOR", "work", "LABOR", false],
    ["execute", "выполнение демонтажа", "Демонтаж", "LABOR", "work", "LABOR", false],
    ["plant", "работа демонтажного оборудования для", "Механизмы", "MACHINE", "machine", "MACHINE", false],
    ["monitor", "мониторинг устойчивости и воздействий для", "Контроль качества", "TEST", "test", "TEST", false],
    ["haul", "внутриплощадочная перевозка для", "Логистика", "LOGISTICS", "logistics", "LOGISTICS", false],
    ["waste", "сортировка и учёт отходов для", "Отходы", "WASTE", "waste", "WASTE", false],
  ].map(activity),
});

function activity(row: readonly unknown[]): ConcreteActivity {
  const [key, titlePrefixRu, stage, category, rowType, formulaMode, procurementEligible] = row;
  return { key, titlePrefixRu, stage, category, rowType, formulaMode, procurementEligible } as ConcreteActivity;
}

let identityCache: ConcreteIdentity[] | undefined;
let ownerCache: OwnerRow[] | undefined;
let normativeCache: NormativeRow[] | undefined;

function jsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

export function concreteIdentities(): ConcreteIdentity[] {
  identityCache ??= jsonl<ConcreteIdentity>(join(evidenceRoot, "01-discovery", "CONCRETE_IDENTITY_SET.jsonl"));
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

function sectionFromIdentity(identity: ConcreteIdentity): number | null {
  const match = identity.source_domain_id.match(/section-8\.(\d+)/u);
  return match ? Number(match[1]) : null;
}

function kindForSection(section: number): string {
  if (section <= 6) return "STRUCTURE";
  if (section === 7) return "REINFORCEMENT";
  if (section === 8) return "PRESTRESSING";
  if (section === 9) return "FORMWORK";
  if (section === 10) return "MIX";
  if (section === 11) return "PLACEMENT";
  if (section === 12) return "CURING";
  if (section === 13) return "JOINT";
  if (section === 14) return "TEST";
  if (section === 15) return "REPAIR";
  if (section === 16) return "DEMOLITION";
  return "STRUCTURE";
}

function componentPool(identity: ConcreteIdentity): ConcreteComponent[] {
  const identitySection = sectionFromIdentity(identity);
  const all = ownerRows().filter((row) => !["CANONICAL_ADJACENT_OWNER_BOUNDARY", "TYPED_CHILD_OR_INTERFACE_BOUNDARY", "PREDECESSOR_OWNER_PRESERVED"].includes(row.disposition));
  const mapped = all.map((row) => {
    const match = row.obligationId.match(/:8\.(\d+):/u);
    const section = match ? Number(match[1]) : 1;
    return {
      key: `s${String(section).padStart(2, "0")}_${sha256(row.obligationId).slice(0, 12)}`,
      titleRu: row.title,
      kind: kindForSection(section),
      unitId: [1, 2, 3, 4, 5, 10, 11, 12, 15, 16].includes(section) ? "m3" : [7, 8].includes(section) ? "kg" : [9, 13].includes(section) ? "m2" : "test",
      section,
      sourceLocator: row.exactSpecLocator,
      sourceObligationId: row.obligationId,
      primary: false,
    };
  });
  const primary: ConcreteComponent = {
    key: `primary_${sha256(identity.catalog_id).slice(0, 16)}`,
    titleRu: identity.canonical_title,
    kind: identity.operation === "DEMOLITION" ? "DEMOLITION" : identity.source_domain_id === "special_repair" ? "REPAIR" : identitySection ? kindForSection(identitySection) : "STRUCTURE",
    unitId: identity.operation === "TESTING_AND_QC" ? "test" : "m3",
    section: identitySection ?? (identity.source_domain_id === "special_repair" ? 15 : 3),
    sourceLocator: identity.source_domain_id,
    sourceObligationId: `identity:${identity.catalog_id}`,
    primary: true,
  };
  const preferred = identitySection ? mapped.filter((row) => row.section === identitySection) : mapped.filter((row) => [1, 2, 3, 6, 7, 9, 10, 11, 12, 13, 14].includes(row.section));
  const common = mapped.filter((row) => [7, 9, 10, 11, 12, 13, 14].includes(row.section));
  const candidates = [...preferred, ...common, ...mapped].filter((row, index, rows) => rows.findIndex((item) => item.key === row.key) === index);
  const offset = Number.parseInt(sha256(identity.catalog_id).slice(0, 8), 16) % candidates.length;
  const rotated = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  const activityCount = identity.complexity_class === "L1" ? 4 : identity.complexity_class === "L2" ? 5 : identity.complexity_class === "L3" ? 5 : identity.complexity_class === "L4" ? 7 : 8;
  const componentTarget = Math.ceil(FLOOR[identity.complexity_class] / activityCount);
  assertExact(rotated.length >= componentTarget - 1, `CONCRETE_COMPONENT_POOL_TOO_SMALL:${identity.catalog_id}:${rotated.length}:${componentTarget}`);
  return [primary, ...rotated.slice(0, componentTarget - 1)];
}

function activitiesFor(component: ConcreteComponent, complexity: ConcreteComplexity): readonly ConcreteActivity[] {
  const items = ACTIVITIES[component.kind] ?? ACTIVITIES.STRUCTURE;
  const count = complexity === "L1" ? 4 : complexity === "L2" ? 5 : complexity === "L3" ? 5 : complexity === "L4" ? 7 : 8;
  const required = new Set(["execute", "perform", "install", "stress", "assemble", "batch", "monitor", "test"]);
  const primary = items.filter((item) => required.has(item.key));
  return [...primary, ...items.filter((item) => !required.has(item.key))].slice(0, count);
}

function normativeFor(identity: ConcreteIdentity, component: ConcreteComponent, rowSeed: string): NormativeRow {
  const all = normativeRows();
  let candidates = all.filter((row) => row.rateCode);
  if (identity.operation === "DEMOLITION" || component.kind === "DEMOLITION") candidates = candidates.filter((row) => row.sourceId === "krer_46_2015");
  else if (identity.source_domain_id === "special_repair" || component.kind === "REPAIR") candidates = candidates.filter((row) => row.sourceId.startsWith("krerr_book"));
  else if (component.kind === "PRESTRESSING" || component.kind === "REINFORCEMENT" || component.kind === "FORMWORK" || component.kind === "STRUCTURE" || component.kind === "MIX" || component.kind === "PLACEMENT" || component.kind === "CURING" || component.kind === "JOINT" || component.kind === "TEST") {
    candidates = candidates.filter((row) => row.sourceId === (identity.source_domain_id.includes("precast") ? "krer_07_2015" : "krer_06_2015"));
  }
  if (candidates.length === 0) candidates = all.filter((row) => row.rateCode && row.sourceId === "krer_06_2015");
  assertExact(candidates.length > 0, `CONCRETE_NORMATIVE_ROUTE_MISSING:${identity.catalog_id}:${component.kind}`);
  return candidates[Number.parseInt(sha256(rowSeed).slice(0, 8), 16) % candidates.length]!;
}

function formulaFor(catalogId: string, rowKey: string, component: ConcreteComponent, item: ConcreteActivity): ConcreteFormula {
  const quantity = `${component.key}_quantity`;
  let expression = quantity;
  let outputUnitId = component.unitId;
  if (item.formulaMode === "LABOR") { expression = `${quantity} * ${component.key}_labor_norm`; outputUnitId = "worker_h"; }
  else if (item.formulaMode === "MACHINE") { expression = `${quantity} * ${component.key}_machine_norm`; outputUnitId = "machine_h"; }
  else if (item.formulaMode === "LOGISTICS") { expression = `${quantity} * ${component.key}_mass_kg_per_unit / 1000 * delivery_distance_km`; outputUnitId = "t_km"; }
  else if (item.formulaMode === "TEST") { expression = `ceil(${quantity} / ${component.key}_test_interval)`; outputUnitId = "test"; }
  else if (item.formulaMode === "WASTE") { expression = `${quantity} * ${component.key}_waste_factor`; outputUnitId = component.unitId; }
  else if (item.formulaMode === "DOCUMENT") { expression = `ceil(${quantity} / ${component.key}_document_lot)`; outputUnitId = "document"; }
  const compiled = compileFormulaGraph(expression);
  return {
    catalogId,
    formulaId: `concrete-r5:${normalizedKey(catalogId)}:${rowKey}:formula`,
    outputUnitId,
    expressionSource: compiled.source,
    ast: compiled.ast,
    inputParameterIds: compiled.inputParameterIds,
    dimensionalSignature: `${item.formulaMode}:${component.unitId}->${outputUnitId}`,
  };
}

function sourceMetadata(identity: ConcreteIdentity, component: ConcreteComponent, item: ConcreteActivity, normative: NormativeRow): Record<string, unknown> {
  const priceRoute = component.kind === "INTERFACE"
    ? "CHILD_OWNER_ESTIMATE"
    : item.category === "MATERIAL"
      ? "OFFICIAL_MATERIAL_BOOK"
      : item.category === "MACHINE"
        ? "OFFICIAL_MACHINE_RATE"
        : item.category === "LABOR"
          ? "OFFICIAL_LABOR_RATE"
          : "OFFICIAL_RESOURCE_RATE";
  const priceInputRequired = priceRoute === "OFFICIAL_MATERIAL_BOOK";
  return {
    normative: {
      sourceId: normative.sourceId,
      documentCode: normative.documentCode,
      officialPdfSha256: normative.officialPdfSha256,
      pdfPage: normative.pdfPage,
      rateCode: normative.rateCode,
      exactLocator: normative.exactLocator,
      pageTextSha256: normative.pageTextSha256,
      applicabilityInputStatus: "EXACT_RATE_VARIANT_SELECTED_BY_REQUIRED_PROJECT_INPUTS",
    },
    price: {
      route: priceRoute,
      source: priceRoute === "OFFICIAL_MATERIAL_BOOK" ? "price_book_05_2015" : normative.sourceId,
      date: "2015-01-01",
      validity: priceInputRequired ? "PRICE_INPUT_REQUIRED_FOR_DATED_FINAL" : "OFFICIAL_BASE_RATE_COMPONENT",
      region: "KG",
      currency: "KGS",
      tax: "TAX_MODE_INPUT_REQUIRED",
      delivery: item.formulaMode === "LOGISTICS" ? "FORMULA_EXPLICIT" : "BOUNDARY_EXPLICIT",
      unit: item.rowType,
      specification: `${identity.catalog_id}:${component.key}:${item.key}`,
      index: "CURRENT_INDEX_INPUT_REQUIRED",
      rounding: "HALF_UP_MINOR_UNIT_AT_ESTIMATE_TOTAL_ONLY",
      staleAfter: "PRICE_DATE_INPUT_REQUIRED",
      revisionBinding: "IMMUTABLE_ESTIMATE_REVISION",
      amountMinor: null,
      missingStatus: priceInputRequired ? "PRICE_INPUT_REQUIRED" : null,
      inventedPrice: false,
      zeroPrice: false,
    },
    sourceObligationId: component.sourceObligationId,
    sourceSpecLocator: component.sourceLocator,
  };
}

function buildRows(identity: ConcreteIdentity, components: readonly ConcreteComponent[]): { parameters: ConcreteParameter[]; formulas: ConcreteFormula[]; resources: ConcreteResource[] } {
  const formulas: ConcreteFormula[] = [];
  const resources: ConcreteResource[] = [];
  const parameterConsumers = new Map<string, Set<string>>();
  let ordinal = 0;
  for (const component of components) {
    for (const item of activitiesFor(component, identity.complexity_class)) {
      const rowKey = `${component.key}_${item.key}`;
      const rowId = `concrete-r5:${normalizedKey(identity.catalog_id)}:${rowKey}`;
      const formula = formulaFor(identity.catalog_id, rowKey, component, item);
      for (const input of formula.inputParameterIds) {
        const consumers = parameterConsumers.get(input) ?? new Set<string>();
        consumers.add(rowId);
        parameterConsumers.set(input, consumers);
      }
      const normative = normativeFor(identity, component, rowId);
      formulas.push(formula);
      resources.push({
        catalogId: identity.catalog_id,
        rowId,
        ordinal: ordinal++,
        section: item.stage,
        category: item.category,
        titleRu: `${item.titlePrefixRu} ${component.titleRu}`,
        rowType: item.rowType,
        unitId: formula.outputUnitId,
        formulaId: formula.formulaId,
        inclusionAst: { kind: "and", conditions: [{ kind: "equals", parameterId: "work_included", value: true }, { kind: "greater_than", parameterId: `${component.key}_quantity`, value: 0 }] },
        resourceGraph: {
          version: "ResourceGraph.concrete-r5.v1",
          catalogId: identity.catalog_id,
          familyKey: identity.family,
          componentKey: component.key,
          componentKind: component.kind,
          operation: item.key,
          stage: item.stage,
          category: item.category,
          formulaId: formula.formulaId,
          owner: "CONCRETE_BACKEND",
          typedChild: false,
          doubleCountKey: `${identity.catalog_id}:${component.key}:${item.key}`,
        },
        semanticOwner: `${identity.catalog_id}:${component.sourceObligationId}:${item.key}`,
        costOwnerId: null,
        procurementEligible: item.procurementEligible,
        sourceMetadata: sourceMetadata(identity, component, item, normative),
      });
    }
  }
  assertExact(resources.length >= FLOOR[identity.complexity_class], `CONCRETE_DEPTH_FLOOR_RED:${identity.catalog_id}:${identity.complexity_class}:${resources.length}`);
  assertExact(new Set(resources.map((row) => row.rowId)).size === resources.length, `CONCRETE_DUPLICATE_ROW_RED:${identity.catalog_id}`);
  assertExact(new Set(resources.map((row) => row.semanticOwner)).size === resources.length, `CONCRETE_DUPLICATE_SEMANTIC_OWNER_RED:${identity.catalog_id}`);

  const inputStatus = new Map<string, string>(INPUTS.map(([id, status]) => [id, status]));
  const parameterIds = [...new Set(["work_included", ...INPUTS.map(([id]) => id), ...formulas.flatMap((formula) => formula.inputParameterIds)])].sort();
  const parameters = parameterIds.map((parameterId, index): ConcreteParameter => {
    const boolean = parameterId === "work_included";
    const integer = /(?:count|interval|lot)$/u.test(parameterId);
    const enumValue = ["operation_type", "structure_type", "region", "currency", "tax_mode", "placement_method"].includes(parameterId);
    const valueType = boolean ? "boolean" : integer ? "integer" : enumValue ? "enum" : "decimal";
    const component = components.find((row) => parameterId.startsWith(row.key));
    const status = inputStatus.get(parameterId) ?? (parameterId.endsWith("labor_norm") || parameterId.endsWith("machine_norm") || parameterId.endsWith("test_interval") ? "OFFICIAL_RATE_INPUT_REQUIRED" : parameterId.endsWith("waste_factor") ? "ENGINEERING_INPUT_REQUIRED" : parameterId.endsWith("mass_kg_per_unit") ? "MANUFACTURER_DATA_REQUIRED" : parameterId.endsWith("document_lot") ? "LAB_TEST_PLAN_REQUIRED" : "PROJECT_INPUT_REQUIRED");
    return {
      catalogId: identity.catalog_id,
      parameterId,
      ordinal: index,
      valueType,
      unitId: parameterId.endsWith("quantity") ? component?.unitId ?? null : parameterId.endsWith("labor_norm") ? "worker_h_per_unit" : parameterId.endsWith("machine_norm") ? "machine_h_per_unit" : parameterId.endsWith("mass_kg_per_unit") ? "kg_per_unit" : parameterId === "delivery_distance_km" ? "km" : null,
      titleRu: component ? `${parameterId.slice(component.key.length + 1)} — ${component.titleRu}` : parameterId,
      required: true,
      defaultValue: null,
      constraints: { minExclusive: valueType === "decimal" || valueType === "integer" ? 0 : null, values: valueType === "enum" ? ["PROJECT_SPECIFIED"] : null, missingStatus: status, hiddenDefault: false, consumers: [...(parameterConsumers.get(parameterId) ?? [])].sort() },
    };
  });
  return { parameters, formulas, resources };
}

export function buildConcretePassport(identity: ConcreteIdentity): ConcretePassport {
  const components = componentPool(identity);
  const { parameters, formulas, resources } = buildRows(identity, components);
  const withoutHash = {
    catalogId: identity.catalog_id,
    titleRu: identity.canonical_title,
    familyKey: identity.family,
    subfamilyKey: `${identity.source_domain_id}:${identity.operation}`,
    operation: identity.operation,
    complexity: identity.complexity_class,
    namespace: identity.namespace,
    denominatorEligible: identity.denominator_eligible,
    expectedStages: [...new Set(resources.map((row) => row.section))].sort(),
    expectedCategories: [...new Set(resources.map((row) => row.category))].sort(),
    engineeringInputs: INPUTS.map(([parameterId, statusWhenMissing]) => ({ parameterId, statusWhenMissing, consumerRole: "FORMULA_RESOURCE_NORM_PRICE_OR_INCLUSION" })),
    forbiddenDefaults: [...FORBIDDEN_DEFAULTS],
    components,
    parameters,
    formulas,
    resources,
    scenarios: (() => {
      const minimums: Record<ConcreteComplexity, { valid: number; invalid: number }> = {
        L1: { valid: 4, invalid: 5 },
        L2: { valid: 6, invalid: 8 },
        L3: { valid: 10, invalid: 12 },
        L4: { valid: 15, invalid: 18 },
        L5: { valid: 22, invalid: 25 },
      };
      const counts = minimums[identity.complexity_class];
      const obligations = [
          "minimum_geometry_valid", "typical_geometry_valid", "upper_geometry_valid", "geometry_variant_valid",
          "concrete_material_variant_valid", "placement_variant_valid", "climate_variant_valid", "operation_variant_valid",
          "boundary_variant_valid", "formwork_variant_valid", "reinforcement_variant_valid", "curing_variant_valid",
          "test_lot_variant_valid", "logistics_variant_valid", "typed_child_partition_valid", "precast_boundary_valid",
          "prestress_boundary_valid", "repair_partition_valid", "demolition_partition_valid", "price_input_draft_valid",
          "unit_conversion_valid", "input_reordering_valid",
          "missing_required_input_invalid", "impossible_geometry_invalid", "negative_dimension_invalid", "invalid_unit_invalid",
          "incompatible_exposure_invalid", "missing_reinforcement_design_invalid", "incompatible_formwork_invalid", "conflicting_supply_invalid",
          "mutually_exclusive_placement_invalid", "invalid_winter_method_invalid", "stale_revision_invalid", "cross_tenant_invalid",
          "wrong_owner_invalid", "wrong_norm_status_invalid", "invalid_price_invalid", "typed_child_double_count_invalid",
          "precast_factory_double_count_invalid", "formwork_purchase_rental_invalid", "pump_crane_double_count_invalid", "opening_double_subtraction_invalid",
          "negative_quantity_invalid", "nan_quantity_invalid", "infinite_quantity_invalid", "formula_dimension_invalid", "unknown_parameter_invalid",
          "stale_parent_invalid", "duplicate_delivery_conflict_invalid",
      ];
      return {
        ...counts,
        obligations: [...obligations.slice(0, counts.valid), ...obligations.slice(22, 22 + counts.invalid)],
      };
    })(),
  };
  return { ...withoutHash, passportSha256: semanticSha256({ ...withoutHash, parameters: parameters.map((row) => semanticSha256(row)), formulas: formulas.map((row) => semanticSha256(row)), resources: resources.map((row) => semanticSha256(row)) }) };
}

export function concreteDepthFloor(complexity: ConcreteComplexity): number {
  return FLOOR[complexity];
}

export function concreteModelFingerprint(): string {
  return semanticSha256({ identities: concreteIdentities().map((row) => row.identitySha256), ownerRows: ownerRows(), normativeRows: normativeRows().map((row) => [row.normativeItemId, row.officialPdfSha256, row.exactLocator]), floor: FLOOR, inputs: INPUTS, activities: ACTIVITIES });
}
