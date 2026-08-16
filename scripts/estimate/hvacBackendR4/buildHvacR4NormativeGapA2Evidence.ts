import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  HVAC_DOMAIN_INVENTORY,
  type HvacDomainInventoryRow,
} from "../../../src/lib/estimate/v4/domains/heatingVentilationComplete";
import {
  buildAllHvacPassports,
  HVAC_R4_EXTERNAL_A2_NON_DEMOLITION_INVENTORY,
  HVAC_R4_EXTERNAL_DEMOLITION_INVENTORY,
} from "./hvacR4Model";
import {
  HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS,
  type HvacA2ExternalWorkSpec,
} from "./hvacR4NormativeGapA2";
import {
  assertExact,
  BATCH007_PREDECESSOR_COMMIT,
  BATCH007_PREDECESSOR_TREE,
  evidenceRoot,
  git,
  semanticSha256,
  sha256,
  writeJson,
  writeJsonl,
} from "./support";

const CREATED_AT = "2026-08-16T07:50:00.000Z";
const A2_DIR = "A2";
const G = 920;
const D = 4;

type MappingStatus =
  | "EXISTING_GLOBAL_EXACT"
  | "EXISTING_EXTERNAL_EXACT"
  | "ADD_EXTERNAL_NON_DEMOLITION"
  | "ADD_EXTERNAL_DEMOLITION"
  | "CROSS_DOMAIN_INTERFACE_ONLY"
  | "NOT_APPLICABLE_WITH_EXACT_REASON"
  | "DUPLICATE_ALIAS_REJECTED"
  | "SOURCE_LOCATOR_REQUIRED_RED";

type LedgerRow = {
  schema_version: "batch007-hvac-r4-a2-normative-gap-ledger.v1";
  source_id: string;
  source_status: "ACTIVE" | "AMENDED_ACTIVE";
  edition: string;
  page: number;
  section: string;
  table: string;
  item: string;
  normative_work_identity_ru: string;
  system_cluster: string;
  operation_class: string;
  technology_class: string;
  primary_uom: string;
  scope_inclusions: readonly string[];
  scope_exclusions: readonly string[];
  cross_domain_interfaces: readonly string[];
  existing_catalog_id: string | null;
  mapping_status: MappingStatus;
  mapping_reason: string;
  new_external_catalog_id: string | null;
  counts_toward_global_queue: false;
  oracle_a_status: "PENDING_FROZEN_LEDGER_AUDIT";
  oracle_b_status: "PENDING_FROZEN_LEDGER_AUDIT";
  row_semantic_sha256: string;
};

type ExistingSeed = Readonly<{
  sourceId: string;
  page: number;
  section: string;
  table: string;
  item: string;
  identityRu: string;
  cluster: string;
  operation: string;
  technology: string;
  uom: string;
  material: string;
  globalOperation: string;
}>;

type DispositionSeed = Readonly<{
  sourceId: string;
  page: number;
  section: string;
  table: string;
  item: string;
  identityRu: string;
  cluster: string;
  operation: string;
  technology: string;
  uom: string;
  status: "CROSS_DOMAIN_INTERFACE_ONLY" | "NOT_APPLICABLE_WITH_EXACT_REASON";
  reason: string;
  interfaces?: readonly string[];
}>;

const sourceEdition: Readonly<Record<string, string>> = Object.freeze({
  sn_kr_41_04_2022: "СН КР 41-04:2022, введён 20.01.2023",
  kg_krer18_2015: "КРЕР 18-2015, приказ №2-нпа от 28.03.2016",
  kg_krer20_2015: "КРЕР 20-2015, приказ №2-нпа от 28.03.2016",
  kg_krer24_2015: "КРЕР 24-2015, приказ №2-нпа от 28.03.2016",
  kg_krer26_2015: "КРЕР 26-2015, приказ №2-нпа от 28.03.2016",
  kg_krerm06_2015: "КРЕРм 06-2015, приказ №2-нпа от 28.03.2016",
  kg_krerm07_2015: "КРЕРм 07-2015, приказ №2-нпа от 28.03.2016",
  kg_krerp03_2015: "КРЕРп 03-2015, приказ №2-нпа от 28.03.2016",
  kg_krerp06_2015: "КРЕРп 06-2015, приказ №2-нпа от 28.03.2016",
  kg_krerp07_2015: "КРЕРп 07-2015, приказ №2-нпа от 28.03.2016",
  kg_price_book22_2015: "Книга 22, база цен 01.01.2015",
  kg_price_book23_2015: "Книга 23, база цен 01.01.2015",
  kg_krerr65_2015: "КРЕРр 65-2015 в Книге 2, приказ №2-нпа от 28.03.2016",
  kg_krer_application_2015: "Указания КРЕР-2015",
  kg_krerm_application_2015: "Указания КРЕРм-2015",
  kg_krerp_application_2015: "Указания КРЕРп-2015",
  kg_krerr_application_2015: "Указания КРЕРр-2015",
  kg_order_52_npa_2022: "Приказ №52-нпа от 28.04.2022",
});

const existingSeeds: readonly ExistingSeed[] = Object.freeze([
  { sourceId: "kg_krer18_2015", page: 8, section: "Раздел 1. Котлы отопительные", table: "КРЕР 18-01-001/002", item: "Котлы чугунные и стальные", identityRu: "Монтаж отопительного котла проектного типа", cluster: "BOILER_AND_ITP", operation: "INSTALL", technology: "HYDRONIC_EQUIPMENT", uom: "item", material: "BOILER", globalOperation: "INSTALL" },
  { sourceId: "kg_krer18_2015", page: 25, section: "Раздел 3. Отопительные приборы", table: "КРЕР 18-03-001", item: "Радиаторы", identityRu: "Монтаж радиатора", cluster: "INTERNAL_HEATING", operation: "INSTALL", technology: "HEATING_TERMINAL", uom: "item", material: "RADIATOR", globalOperation: "INSTALL" },
  { sourceId: "kg_krer18_2015", page: 38, section: "Раздел 5. Насосы центробежные", table: "КРЕР 18-05-001", item: "Центробежные насосы с электродвигателем", identityRu: "Монтаж насоса отопления", cluster: "INTERNAL_HEATING", operation: "INSTALL", technology: "HYDRONIC_EQUIPMENT", uom: "item", material: "HEATING_PUMP", globalOperation: "INSTALL" },
  { sourceId: "sn_kr_41_04_2022", page: 19, section: "6.2 Системы отопления", table: "СН КР 41-04:2022, раздел 6.2", item: "Напольное водяное отопление", identityRu: "Монтаж водяного тёплого пола", cluster: "INTERNAL_HEATING", operation: "INSTALL", technology: "WARM_FLOOR_SYSTEM", uom: "m2", material: "WARM_FLOOR", globalOperation: "INSTALL" },
  { sourceId: "sn_kr_41_04_2022", page: 19, section: "6.2 Системы отопления", table: "СН КР 41-04:2022, раздел 6.2", item: "Коллекторные узлы", identityRu: "Монтаж коллектора отопления", cluster: "INTERNAL_HEATING", operation: "INSTALL", technology: "HYDRONIC_EQUIPMENT", uom: "item", material: "COLLECTOR", globalOperation: "INSTALL" },
  { sourceId: "kg_krer20_2015", page: 10, section: "Раздел 1. Воздуховоды металлические", table: "КРЕР 20-01-001..005", item: "Воздуховоды по материалу и толщине", identityRu: "Монтаж сети металлических воздуховодов", cluster: "VENTILATION", operation: "INSTALL", technology: "DUCT_NETWORK", uom: "m2", material: "DUCT", globalOperation: "INSTALL" },
  { sourceId: "kg_krer20_2015", page: 25, section: "Раздел 2. Воздухораспределение", table: "КРЕР 20-02-001/002/003", item: "Воздухораспределители и решётки", identityRu: "Монтаж вентиляционной решётки", cluster: "VENTILATION", operation: "INSTALL", technology: "AIR_TERMINAL", uom: "item", material: "GRILLE", globalOperation: "INSTALL" },
  { sourceId: "kg_krer20_2015", page: 25, section: "Раздел 2. Воздухораспределение", table: "КРЕР 20-02-001", item: "Воздухораспределители", identityRu: "Монтаж диффузора", cluster: "VENTILATION", operation: "INSTALL", technology: "AIR_TERMINAL", uom: "item", material: "DIFFUSER", globalOperation: "INSTALL" },
  { sourceId: "kg_krer20_2015", page: 50, section: "Раздел 3. Вентиляторы", table: "КРЕР 20-03-001..004", item: "Радиальные, осевые, крышные и пылеулавливающие вентиляторы", identityRu: "Монтаж вентилятора с проектными параметрами", cluster: "VENTILATION", operation: "INSTALL", technology: "AIR_HANDLING_EQUIPMENT", uom: "item", material: "FAN", globalOperation: "INSTALL" },
  { sourceId: "kg_krer20_2015", page: 43, section: "Раздел 2. Шумоглушители", table: "КРЕР 20-02-014..016", item: "Шумоглушители трубчатые и пластинчатые", identityRu: "Монтаж шумоглушителя", cluster: "VENTILATION", operation: "INSTALL", technology: "DUCT_NETWORK", uom: "item", material: "SILENCER", globalOperation: "INSTALL" },
  { sourceId: "kg_krer20_2015", page: 54, section: "Раздел 4. Калориферы", table: "КРЕР 20-04-001", item: "Агрегаты воздушно-отопительные", identityRu: "Монтаж воздушной завесы", cluster: "AIR_HEATING", operation: "INSTALL", technology: "AIR_HANDLING_EQUIPMENT", uom: "item", material: "AIR_CURTAIN", globalOperation: "INSTALL" },
  { sourceId: "kg_krer20_2015", page: 90, section: "Раздел 6. Кондиционеры", table: "КРЕР 20-06-018", item: "Кондиционеры и split-системы", identityRu: "Монтаж split-системы", cluster: "COMFORT_COOLING", operation: "INSTALL", technology: "REFRIGERANT_SYSTEM", uom: "system", material: "SPLIT", globalOperation: "INSTALL" },
  { sourceId: "kg_krerp06_2015", page: 18, section: "Отдел 01. Холодильные установки", table: "КРЕРп 06-01-001..031", item: "Холодильные установки", identityRu: "Пусконаладка чиллера", cluster: "CENTRAL_REFRIGERATION", operation: "COMMISSION", technology: "REFRIGERANT_SYSTEM", uom: "system", material: "CHILLER", globalOperation: "COMMISSION" },
  { sourceId: "kg_krer26_2015", page: 12, section: "Раздел 1.1. Изоляция горячих поверхностей", table: "КРЕР 26-01-001..024", item: "Изоляция трубопроводов и оборудования", identityRu: "Монтаж теплоизоляции отопительного трубопровода", cluster: "HVAC_INSULATION", operation: "INSTALL", technology: "THERMAL_INSULATION", uom: "m2", material: "INSULATION", globalOperation: "INSTALL" },
  { sourceId: "kg_krer26_2015", page: 30, section: "Раздел 1.2. Изоляция холодных поверхностей", table: "КРЕР 26-01-036..047", item: "Холодные поверхности", identityRu: "Монтаж теплоизоляции воздуховода", cluster: "HVAC_INSULATION", operation: "INSTALL", technology: "THERMAL_INSULATION", uom: "m2", material: "DUCT_INSULATION", globalOperation: "INSTALL" },
  { sourceId: "kg_krerp03_2015", page: 21, section: "Отдел 01. Сети систем вентиляции", table: "КРЕРп 03-01-022", item: "Сеть вентиляции и кондиционирования", identityRu: "Балансировка вентиляционной сети", cluster: "VENTILATION_TAB", operation: "BALANCE", technology: "TESTING_BALANCING_COMMISSIONING", uom: "system", material: "BALANCING", globalOperation: "BALANCE" },
  { sourceId: "kg_krerp03_2015", page: 29, section: "Отдел 01. Центральное кондиционирование", table: "КРЕРп 03-01-060", item: "Система кондиционирования центральная", identityRu: "Пусконаладка центральной системы вентиляции", cluster: "HVAC_COMMISSIONING", operation: "COMMISSION", technology: "TESTING_BALANCING_COMMISSIONING", uom: "system", material: "COMMISSIONING", globalOperation: "COMMISSION" },
  { sourceId: "kg_krerr65_2015", page: 117, section: "Сборник 65. Ремонт внутренних систем", table: "КРЕРр 65-01-003/009", item: "Смена радиаторов и отопительных приборов", identityRu: "Замена радиатора", cluster: "HVAC_REPAIR", operation: "REPLACE", technology: "HEATING_TERMINAL", uom: "item", material: "RADIATOR", globalOperation: "REPLACE" },
  { sourceId: "kg_krerr65_2015", page: 150, section: "Сборник 65. Ремонт вентиляции", table: "КРЕРр 65-03-004/005", item: "Демонтаж и смена вентиляторов; ремонтная позиция без demolition portion", identityRu: "Ремонт вентилятора", cluster: "HVAC_REPAIR", operation: "REPAIR", technology: "AIR_HANDLING_EQUIPMENT", uom: "item", material: "FAN", globalOperation: "REPAIR" },
]);

const dispositions: readonly DispositionSeed[] = Object.freeze([
  { sourceId: "sn_kr_41_04_2022", page: 80, section: "Раздел 9. Пожарная безопасность", table: "СН КР 41-04:2022, раздел 9", item: "Пожарные алгоритмы и cause-and-effect", identityRu: "Пожарный алгоритм управления HVAC", cluster: "SMOKE_CONTROL_INTERFACE", operation: "COMMISSION", technology: "FIRE_AUTOMATION", uom: "scenario", status: "CROSS_DOMAIN_INTERFACE_ONLY", reason: "Физическая HVAC-часть допускается в BATCH-007, но алгоритм, release и пожарная автоматика принадлежат Fire owner/BATCH-009.", interfaces: ["FIRE_OWNER", "BMS_OWNER", "ELECTRICAL_OWNER"] },
  { sourceId: "kg_krer24_2015", page: 126, section: "Раздел 2. Газопроводы городов и посёлков", table: "КРЕР 24-02-001..125", item: "Газопроводы, газовые вводы и электрохимзащита", identityRu: "Самостоятельные работы газоснабжения", cluster: "GAS_NETWORK", operation: "INSTALL", technology: "GAS_SUPPLY", uom: "m", status: "CROSS_DOMAIN_INTERFACE_ONLY", reason: "Раздел 2 сборника 24 является газоснабжением, а не теплоснабжением; в HVAC остаётся только топливный interface котла.", interfaces: ["GAS_OWNER", "ELECTRICAL_OWNER"] },
  { sourceId: "kg_krer24_2015", page: 200, section: "Раздел 3. Золошлакопроводы", table: "КРЕР 24-03-001..003", item: "Золошлакопроводы", identityRu: "Золошлакопровод", cluster: "ASH_HANDLING", operation: "INSTALL", technology: "INDUSTRIAL_PROCESS", uom: "m", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Технологическое золошлакоудаление не является HVAC work identity BATCH-007." },
  { sourceId: "kg_krer26_2015", page: 53, section: "Раздел 2. Огнезащита", table: "КРЕР 26-02-001..037", item: "Огнезащита конструкций, кабелей и прочих поверхностей", identityRu: "Общая огнезащита конструкций", cluster: "FIRE_PROTECTION", operation: "INSTALL", technology: "FIRE_OR_STRUCTURAL", uom: "m2", status: "CROSS_DOMAIN_INTERFACE_ONLY", reason: "Общая огнезащита конструкций и кабелей не дублируется в HVAC; применимая изоляция HVAC остаётся в разделе 1.", interfaces: ["FIRE_OWNER", "STRUCTURAL_OWNER", "ELECTRICAL_OWNER"] },
  { sourceId: "kg_krerm06_2015", page: 138, section: "Отдел 02. Котельно-вспомогательное оборудование", table: "КРЕРм 06-02-001..014", item: "Топки и оборудование пылеприготовления", identityRu: "Топливоподача и пылеприготовление", cluster: "FUEL_HANDLING", operation: "INSTALL", technology: "INDUSTRIAL_FUEL", uom: "item", status: "CROSS_DOMAIN_INTERFACE_ONLY", reason: "Самостоятельное топливное хозяйство и пылеприготовление находятся вне HVAC cost owner; интерфейс горелки сохранён.", interfaces: ["FUEL_OWNER", "PROCESS_OWNER"] },
  { sourceId: "kg_krerm06_2015", page: 200, section: "Отдел 04. Турбоагрегаты", table: "КРЕРм 06-04-001..024", item: "Турбины, конденсаторы и турбогенераторы", identityRu: "Монтаж турбоагрегата", cluster: "POWER_GENERATION", operation: "INSTALL", technology: "POWER_GENERATION", uom: "item", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Power-generation equipment не является HVAC/теплоснабжением здания в BATCH-007." },
  { sourceId: "kg_krerm07_2015", page: 13, section: "Отдел 01-02. Компрессорные установки", table: "КРЕРм 07-01/02, неприменимые process variants", item: "Газомоторные, газоперекачивающие и технологические компрессоры", identityRu: "Технологический газовый компрессор", cluster: "PROCESS_COMPRESSORS", operation: "INSTALL", technology: "INDUSTRIAL_PROCESS", uom: "item", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "В HVAC включён только холодильный/климатический компрессор с exact external ID; технологические газовые агрегаты исключены." },
  { sourceId: "kg_krerm07_2015", page: 71, section: "Отдел 04. Насосы", table: "КРЕРм 07-04-027..030", item: "Вакуумные, шахтные и артезианские насосы", identityRu: "Шахтный или артезианский насос", cluster: "NON_HVAC_PUMPS", operation: "INSTALL", technology: "WATER_OR_MINING", uom: "item", status: "CROSS_DOMAIN_INTERFACE_ONLY", reason: "Насосы источника воды/скважины принадлежат Water/Mining owner, не отопительному контуру HVAC.", interfaces: ["WATER_OWNER", "MINING_OWNER"] },
  { sourceId: "kg_krerp06_2015", page: 38, section: "Отдел 02-03. CO2 и разделение воздуха", table: "КРЕРп 06-02-001..017/06-03-001..013", item: "Углекислотные установки и разделение воздуха", identityRu: "ПНР технологической газоразделительной установки", cluster: "INDUSTRIAL_GAS", operation: "COMMISSION", technology: "INDUSTRIAL_PROCESS", uom: "system", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Промышленные CO2/air-separation installations не относятся к HVAC BATCH-007." },
  { sourceId: "kg_krerp07_2015", page: 55, section: "Отдел 05. Топливное хозяйство", table: "КРЕРп 07-05-001..009", item: "Приём, хранение и подача топлива", identityRu: "ПНР топливного хозяйства", cluster: "FUEL_HANDLING", operation: "COMMISSION", technology: "FUEL_SYSTEM", uom: "system", status: "CROSS_DOMAIN_INTERFACE_ONLY", reason: "Самостоятельное топливное хозяйство остаётся у Fuel/Gas owner; HVAC получает только подтверждённые boundary inputs.", interfaces: ["FUEL_OWNER", "GAS_OWNER"] },
  { sourceId: "kg_krerr65_2015", page: 116, section: "Сборник 65. Внутренние санитарно-технические работы", table: "КРЕРр 65, водопровод/канализация", item: "Ремонт водопровода, канализации и санитарных приборов", identityRu: "Ремонт санитарно-технических систем не-HVAC", cluster: "WATER_SANITARY", operation: "REPAIR", technology: "WATER", uom: "item", status: "CROSS_DOMAIN_INTERFACE_ONLY", reason: "Из сборника 65 в BATCH-007 взяты только отопление/вентиляция; водопровод и канализация принадлежат Water owner.", interfaces: ["WATER_OWNER"] },
  { sourceId: "kg_price_book22_2015", page: 1, section: "Материалы теплоснабжения", table: "Книга 22, группы материалов", item: "Номенклатура материалов и изделий", identityRu: "Материальный price reference, не work identity", cluster: "PRICE_REFERENCE", operation: "PRICE", technology: "MATERIAL_CATALOG", uom: "various", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Книга 22 маршрутизирует цену конкретной ресурсной строки и не создаёт selectable work identity." },
  { sourceId: "kg_price_book23_2015", page: 1, section: "Материалы вентиляции и кондиционирования", table: "Книга 23, группы материалов", item: "Номенклатура материалов и изделий", identityRu: "Материальный price reference, не work identity", cluster: "PRICE_REFERENCE", operation: "PRICE", technology: "MATERIAL_CATALOG", uom: "various", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Книга 23 маршрутизирует цену конкретной ресурсной строки и не создаёт selectable work identity." },
  { sourceId: "kg_krer_application_2015", page: 1, section: "Общие положения", table: "Указания КРЕР, пункты 1.4-1.6 и 2.4-2.9", item: "Правила выбора точной или индивидуальной расценки", identityRu: "Методическое правило применения КРЕР", cluster: "APPLICATION_INSTRUCTION", operation: "RATE_ROUTE", technology: "NORMATIVE_METHOD", uom: "rule", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Методическое правило определяет rate route и запрет выдуманной нормы, но не является самостоятельной работой." },
  { sourceId: "kg_krerm_application_2015", page: 1, section: "Общие положения", table: "Указания КРЕРм", item: "Правила применения монтажных расценок", identityRu: "Методическое правило применения КРЕРм", cluster: "APPLICATION_INSTRUCTION", operation: "RATE_ROUTE", technology: "NORMATIVE_METHOD", uom: "rule", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Источник применяется к equipment installation route и не создаёт work identity." },
  { sourceId: "kg_krerp_application_2015", page: 1, section: "Общие положения", table: "Указания КРЕРп", item: "Правила применения пусконаладочных расценок", identityRu: "Методическое правило применения КРЕРп", cluster: "APPLICATION_INSTRUCTION", operation: "RATE_ROUTE", technology: "NORMATIVE_METHOD", uom: "rule", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Источник определяет commissioning rate route и не создаёт work identity." },
  { sourceId: "kg_krerr_application_2015", page: 1, section: "Общие положения", table: "Указания КРЕРр", item: "Правила применения ремонтных расценок", identityRu: "Методическое правило применения КРЕРр", cluster: "APPLICATION_INSTRUCTION", operation: "RATE_ROUTE", technology: "NORMATIVE_METHOD", uom: "rule", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Источник определяет repair rate route и не создаёт work identity." },
  { sourceId: "kg_order_52_npa_2022", page: 1, section: "Приказ и приложения", table: "Приказ №52-нпа", item: "Изменения к указаниям и отдельным расценкам", identityRu: "Amendment applicability record", cluster: "AMENDMENT", operation: "RATE_ROUTE", technology: "NORMATIVE_METHOD", uom: "rule", status: "NOT_APPLICABLE_WITH_EXACT_REASON", reason: "Приказ проверен: применяется только к затронутым таблицам/rate inputs и сам не является HVAC work identity." },
]);

function resolveGlobal(material: string, operation: string): HvacDomainInventoryRow {
  const candidates = HVAC_DOMAIN_INVENTORY.filter((row) =>
    row.primary_material_or_system === material
    && row.operation_class === operation);
  const exact = candidates.find((row) => row.scope_capability === "standard") ?? candidates[0];
  assertExact(Boolean(exact), `A2_EXISTING_GLOBAL_MAPPING_NOT_FOUND:${material}:${operation}`);
  return exact!;
}

function baseRow(input: Omit<LedgerRow, "schema_version" | "source_status" | "edition" | "counts_toward_global_queue" | "oracle_a_status" | "oracle_b_status" | "row_semantic_sha256">): LedgerRow {
  const withoutHash = {
    schema_version: "batch007-hvac-r4-a2-normative-gap-ledger.v1" as const,
    source_status: input.source_id === "kg_order_52_npa_2022" ? "AMENDED_ACTIVE" as const : "ACTIVE" as const,
    edition: sourceEdition[input.source_id] ?? "ACTIVE_OFFICIAL_SNAPSHOT",
    ...input,
    counts_toward_global_queue: false as const,
    oracle_a_status: "PENDING_FROZEN_LEDGER_AUDIT" as const,
    oracle_b_status: "PENDING_FROZEN_LEDGER_AUDIT" as const,
  };
  return { ...withoutHash, row_semantic_sha256: semanticSha256(withoutHash) };
}

function rowForExternal(spec: HvacA2ExternalWorkSpec): LedgerRow {
  return baseRow({
    source_id: spec.sourceId,
    page: spec.sourcePage,
    section: spec.sourceSection,
    table: spec.sourceTable,
    item: spec.sourceItem,
    normative_work_identity_ru: spec.titleRu,
    system_cluster: spec.systemCluster,
    operation_class: spec.operationClass,
    technology_class: spec.technologyClass,
    primary_uom: spec.primaryUom,
    scope_inclusions: spec.scopeInclusions,
    scope_exclusions: spec.scopeExclusions,
    cross_domain_interfaces: spec.crossDomainInterfaces,
    existing_catalog_id: null,
    mapping_status: "ADD_EXTERNAL_NON_DEMOLITION",
    mapping_reason: "Отдельная нормативная/технологическая позиция имеет самостоятельный UOM, inputs, FormulaGraph, ResourceGraph и приёмочный результат; exact global ID отсутствует.",
    new_external_catalog_id: spec.catalogId,
  });
}

function main(): void {
  const snapshotPath = join(evidenceRoot, "03-norms", "OFFICIAL_SOURCE_SNAPSHOTS.jsonl");
  const snapshots = readFileSync(snapshotPath, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line) as Record<string, unknown>);
  assertExact(snapshots.length === 18, `A2_OFFICIAL_SOURCE_DENOMINATOR_RED:${snapshots.length}`);
  assertExact(snapshots.every((row) => row.status === "GREEN_OFFICIAL_PAGE_AND_PDF_SNAPSHOT" && row.pdfMagic === "%PDF-"), "A2_OFFICIAL_SNAPSHOT_RED");

  const externalInventoryIds = new Set(HVAC_R4_EXTERNAL_A2_NON_DEMOLITION_INVENTORY.map((row) => row.catalog_id));
  const passportById = new Map(buildAllHvacPassports().map((row) => [row.catalogId, row]));
  assertExact(externalInventoryIds.size === HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS.length, "A2_EXTERNAL_INVENTORY_DENOMINATOR_RED");
  for (const spec of HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS) {
    assertExact(externalInventoryIds.has(spec.catalogId), `A2_EXTERNAL_IMPLEMENTATION_MISSING:${spec.catalogId}`);
  }

  const ledger: LedgerRow[] = HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS.map(rowForExternal);
  const exactMappings = existingSeeds.map((seed) => {
    const existing = resolveGlobal(seed.material, seed.globalOperation);
    return baseRow({
      source_id: seed.sourceId,
      page: seed.page,
      section: seed.section,
      table: seed.table,
      item: seed.item,
      normative_work_identity_ru: seed.identityRu,
      system_cluster: seed.cluster,
      operation_class: seed.operation,
      technology_class: seed.technology,
      primary_uom: seed.uom,
      scope_inclusions: [existing.title_ru, `primary_material_or_system=${seed.material}`, `operation_class=${seed.globalOperation}`, "точные параметры остаются INPUT_REQUIRED"],
      scope_exclusions: ["другие технологии и operation states"],
      cross_domain_interfaces: [],
      existing_catalog_id: existing.catalog_id,
      mapping_status: "EXISTING_GLOBAL_EXACT",
      mapping_reason: "Exact global ID совпадает по технологии, operation state и самостоятельному результату; таблица содержит только параметрические варианты этого work identity.",
      new_external_catalog_id: null,
    });
  });
  ledger.push(...exactMappings);

  const demolitionSeeds = [
    ["external-hvac:heating-pipe-network-demolition:r4", "kg_krerr65_2015", 116, "КРЕРр 65-01-001/002", "Декомиссия и демонтаж трубопроводов отопления", "HEATING_PIPE_NETWORK"],
    ["external-hvac:duct-network-demolition:r4", "kg_krerr65_2015", 150, "КРЕРр 65-03-001/002", "Декомиссия и демонтаж сети воздуховодов", "DUCT_NETWORK"],
    ["external-hvac:air-handling-equipment-demolition:r4", "kg_krerr65_2015", 152, "КРЕРр 65-03-004/005", "Декомиссия и демонтаж приточно-вытяжной установки", "AIR_HANDLING_EQUIPMENT"],
    ["external-hvac:chiller-refrigerant-system-demolition:r4", "kg_krer_application_2015", 6, "Указания КРЕР 3.3.1 и individual rate route", "Декомиссия, recovery хладагента и демонтаж chiller-контура", "REFRIGERANT_SYSTEM"],
  ] as const;
  const demolitionInventoryIds = new Set(HVAC_R4_EXTERNAL_DEMOLITION_INVENTORY.map((row) => row.catalog_id));
  for (const [catalogId, sourceId, page, table, title, technology] of demolitionSeeds) {
    assertExact(demolitionInventoryIds.has(catalogId), `A2_DEMOLITION_IMPLEMENTATION_MISSING:${catalogId}`);
    ledger.push(baseRow({
      source_id: sourceId,
      page,
      section: "Демонтаж и разборка HVAC",
      table,
      item: "Отдельный физический demolition scope с предварительной изоляцией и обращением с отходами",
      normative_work_identity_ru: title,
      system_cluster: "HVAC_DEMOLITION",
      operation_class: "DEMOLITION",
      technology_class: technology,
      primary_uom: "system",
      scope_inclusions: ["обследование", "изоляция", "отсоединение", "демонтаж", "сортировка", "закрывающий реестр"],
      scope_exclusions: ["новый монтаж", "replacement equipment", "чужие owner scopes"],
      cross_domain_interfaces: ["ELECTRICAL_OWNER", "STRUCTURAL_OWNER", "ENVIRONMENTAL_OWNER"],
      existing_catalog_id: null,
      mapping_status: "ADD_EXTERNAL_DEMOLITION",
      mapping_reason: "В global 920 не было operation_class=DEMOLITION; четыре физически разные системы не объединяются в generic alias.",
      new_external_catalog_id: catalogId,
    }));
  }

  for (const seed of dispositions) {
    ledger.push(baseRow({
      source_id: seed.sourceId,
      page: seed.page,
      section: seed.section,
      table: seed.table,
      item: seed.item,
      normative_work_identity_ru: seed.identityRu,
      system_cluster: seed.cluster,
      operation_class: seed.operation,
      technology_class: seed.technology,
      primary_uom: seed.uom,
      scope_inclusions: [],
      scope_exclusions: [seed.reason],
      cross_domain_interfaces: seed.interfaces ?? [],
      existing_catalog_id: null,
      mapping_status: seed.status,
      mapping_reason: seed.reason,
      new_external_catalog_id: null,
    }));
  }

  ledger.sort((left, right) => `${left.source_id}:${left.table}:${left.normative_work_identity_ru}`.localeCompare(`${right.source_id}:${right.table}:${right.normative_work_identity_ru}`));
  const allowed = new Set<MappingStatus>(["EXISTING_GLOBAL_EXACT", "EXISTING_EXTERNAL_EXACT", "ADD_EXTERNAL_NON_DEMOLITION", "ADD_EXTERNAL_DEMOLITION", "CROSS_DOMAIN_INTERFACE_ONLY", "NOT_APPLICABLE_WITH_EXACT_REASON", "DUPLICATE_ALIAS_REJECTED", "SOURCE_LOCATOR_REQUIRED_RED"]);
  assertExact(ledger.every((row) => allowed.has(row.mapping_status) && row.table && row.item && row.page > 0), "A2_LEDGER_ROW_RED");
  assertExact(ledger.filter((row) => row.mapping_status === "SOURCE_LOCATOR_REQUIRED_RED").length === 0, "A2_UNRESOLVED_LOCATOR_RED");
  assertExact(ledger.filter((row) => row.mapping_status === "ADD_EXTERNAL_NON_DEMOLITION").length === HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS.length, "A2_N_ARITHMETIC_RED");
  assertExact(ledger.filter((row) => row.mapping_status === "ADD_EXTERNAL_DEMOLITION").length === D, "A2_D_ARITHMETIC_RED");
  const sourceIdsInLedger = new Set(ledger.map((row) => row.source_id));
  for (const snapshot of snapshots) assertExact(sourceIdsInLedger.has(String(snapshot.sourceId)), `A2_SOURCE_WITHOUT_LEDGER_DISPOSITION:${snapshot.sourceId}`);

  const N = HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS.length;
  const H_TOTAL = G + D + N;
  const count = (status: MappingStatus) => ledger.filter((row) => row.mapping_status === status).length;
  const summary = {
    schemaVersion: "batch007-hvac-r4-a2-normative-gap-summary.v1",
    createdAt: CREATED_AT,
    normativeIdentitiesTotal: ledger.length,
    existingGlobalExact: count("EXISTING_GLOBAL_EXACT"),
    existingExternalExact: count("EXISTING_EXTERNAL_EXACT"),
    addedExternalNonDemolition: count("ADD_EXTERNAL_NON_DEMOLITION"),
    addedExternalDemolition: count("ADD_EXTERNAL_DEMOLITION"),
    crossDomainInterfaceOnly: count("CROSS_DOMAIN_INTERFACE_ONLY"),
    notApplicableWithExactReason: count("NOT_APPLICABLE_WITH_EXACT_REASON"),
    duplicateAliasRejected: count("DUPLICATE_ALIAS_REJECTED"),
    unresolved: count("SOURCE_LOCATOR_REQUIRED_RED"),
    arithmeticSum: ledger.length,
    officialSources: snapshots.length,
    sourcesWithDisposition: sourceIdsInLedger.size,
    G,
    D,
    N,
    H_TOTAL,
    globalAdmittedAfter: 2925,
    globalQueueAfter: 8685,
    externalQueueSubtraction: 0,
    corpusBuildStatus: "PENDING_AFTER_LEDGER_FREEZE",
    packageCreated: false,
    databaseMutationStarted: false,
    status: "GREEN_GAP_LEDGER_IMPLEMENTED_AWAITING_FULL_CONTENT_ORACLES",
  };
  assertExact(summary.normativeIdentitiesTotal === summary.existingGlobalExact + summary.existingExternalExact + summary.addedExternalNonDemolition + summary.addedExternalDemolition + summary.crossDomainInterfaceOnly + summary.notApplicableWithExactReason + summary.duplicateAliasRejected + summary.unresolved, "A2_LEDGER_SUM_RED");

  const diffStat = git("diff", "--stat");
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  writeJson(`${A2_DIR}/A2_00_CURRENT_CHECKPOINT.json`, {
    schemaVersion: "batch007-hvac-r4-a2-checkpoint.v1",
    createdAt: CREATED_AT,
    worktree: process.cwd(),
    branch: git("branch", "--show-current"),
    head,
    tree,
    predecessorCommit: BATCH007_PREDECESSOR_COMMIT,
    predecessorTree: BATCH007_PREDECESSOR_TREE,
    diffStat,
    databaseMutationStarted: false,
    packageCreated: false,
    previousH924Evidence: "STALE_DO_NOT_USE",
    nextExactAction: "BUILD_A2_FULL_CONTENT_THEN_RUN_INDEPENDENT_ORACLES",
  });
  writeJsonl(`${A2_DIR}/A2_01_OFFICIAL_SOURCE_STATUS.jsonl`, snapshots.map((row) => ({
    source_id: row.sourceId,
    source_status: row.sourceId === "kg_order_52_npa_2022" ? "AMENDED_ACTIVE" : "ACTIVE",
    route_status: row.routeStatus,
    edition: sourceEdition[String(row.sourceId)],
    official_page_url: row.officialPageUrl,
    official_pdf_url: row.officialPdfUrl,
    page_http_status: row.pageHttpStatus,
    pdf_http_status: row.pdfHttpStatus,
    pdf_sha256: row.pdfSha256,
    locator_policy: "EXACT_TABLE_OR_CLAUSE_REQUIRED; PARAMETRIC_RATE_SUFFIX_INPUT_REQUIRED",
    status: "GREEN_OFFICIAL_SNAPSHOT_REVIEWED",
  })));
  writeJsonl(`${A2_DIR}/A2_02_OFFICIAL_SOURCE_SNAPSHOT_MANIFEST.jsonl`, snapshots.map((row) => ({
    ...row,
    frozen_snapshot_sha256: semanticSha256(row),
    stale_exclusion_status: "LIVE_A2_SOURCE",
  })));
  writeJsonl(`${A2_DIR}/A2_03_NORMATIVE_WORK_IDENTITY_GAP_LEDGER.jsonl`, ledger);
  writeJson(`${A2_DIR}/A2_04_NORMATIVE_GAP_SUMMARY.json`, summary);
  writeJsonl(`${A2_DIR}/A2_05_EXISTING_EXACT_MAPPING.jsonl`, exactMappings);
  writeJsonl(`${A2_DIR}/A2_06_NEW_NON_DEMOLITION_DEFINITIONS.jsonl`, HVAC_A2_EXTERNAL_NON_DEMOLITION_SPECS.map((spec) => ({
    ...spec,
    source_identity: `${spec.sourceId}:${spec.sourceTable}:${spec.sourceItem}`,
    revision_lineage: "BATCH007_R4_A2_INITIAL_EXTERNAL_REVISION",
    counts_toward_global_queue: false,
    implementation_status: externalInventoryIds.has(spec.catalogId) ? "IMPLEMENTED" : "MISSING",
    obligation_signature_sha256: semanticSha256({ components: spec.components, inputs: spec.requiredInputs, operation: spec.operationClass, technology: spec.technologyClass }),
    formula_graph_rows: passportById.get(spec.catalogId)?.formulas.length ?? 0,
    formula_graph_sha256: semanticSha256(passportById.get(spec.catalogId)?.formulas ?? []),
    resource_graph_rows: passportById.get(spec.catalogId)?.resources.length ?? 0,
    resource_graph_sha256: semanticSha256((passportById.get(spec.catalogId)?.resources ?? []).map((row) => row.resourceGraph)),
  })));
  writeJsonl(`${A2_DIR}/A2_07_NEW_DEMOLITION_DEFINITIONS.jsonl`, demolitionSeeds.map(([catalogId, sourceId, page, table, title, technology]) => ({ catalog_id: catalogId, source_id: sourceId, page, table, title_ru: title, technology_class: technology, counts_toward_global_queue: false, complexity_source: "PHYSICAL_SCOPE_ONLY", implementation_status: "IMPLEMENTED" })));
  writeJson(`${A2_DIR}/A2_08_EXTERNAL_ID_BEFORE_AFTER.json`, { before: { global: G, demolition: D, nonDemolition: 0, H_TOTAL: G + D }, after: { global: G, demolition: D, nonDemolition: N, H_TOTAL }, addedNonDemolitionCatalogIds: [...externalInventoryIds].sort(), removedCatalogIds: [], globalIdsChanged: 0, status: "GREEN" });
  writeJson(`${A2_DIR}/A2_09_QUEUE_ARITHMETIC.json`, { denominator: 11610, globalBatch006Admitted: 2005, globalBatch007Admitted: G, globalAdmittedAfter: 2925, globalQueueAfter: 8685, externalDemolition: D, externalNonDemolition: N, externalQueueSubtraction: 0, H_TOTAL, equation: "11610-2005-920=8685; external IDs do not alter global denominator", status: "GREEN" });
  writeJson("../RESUME_STATE.json", {
    schemaVersion: "batch007-hvac-r4-resume-state.v2",
    updatedAt: CREATED_AT,
    phase: "A2_NORMATIVE_GAP_LEDGER_FROZEN_CONTENT_BUILD_PENDING",
    lastCompletedCheckpoint: "A2_TABLE_BY_TABLE_GAP_LEDGER_AND_FACTUAL_N",
    G,
    D,
    N,
    H_TOTAL,
    normativeIdentitiesTotal: ledger.length,
    officialSourceRegistrySha256: semanticSha256(snapshots),
    ledgerSha256: sha256(readFileSync(join(evidenceRoot, A2_DIR, "A2_03_NORMATIVE_WORK_IDENTITY_GAP_LEDGER.jsonl"))),
    packageCreated: false,
    databaseMutationStarted: false,
    nextExactAction: "BUILD_FULL_A2_CONTENT_AND_DEPTH_EVIDENCE",
    batch008Started: false,
    productionDeployed: false,
  });
}

main();
