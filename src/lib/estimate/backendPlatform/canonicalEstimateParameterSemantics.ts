import type { CanonicalEstimateCatalogItem } from "./contracts";
import { hasHumanReadableAiEstimateParameterPassport, isAiEstimateTechnicalHiddenParam } from "../aiEstimateRuParameterDictionary";
import { waterMaterialVariantLabelRuR542 } from "./russianTechnologyTitleR542";
import { evaluateInclusionGraph } from "./inclusionGraph";
import { canonicalPublicEstimateChoiceLabelRu } from './canonicalPublicEstimateLanguageRu';
import knaufOptionalScope from '../../../../data/estimate-benchmarks/source-packs/knauf-interior-plaster-conditional-composition-five-s27-63.json';

type ParameterSchema = CanonicalEstimateCatalogItem["parameterSchema"][number];

/** Authored optional selectors can exclude a pending scope after an explicit
 * fact. Their applicability condition does not require every selector upfront.
 * Missing answers still retain the unresolved needs and block full acceptance. */
export function canonicalEstimateParameterIsOptionalScopeChoice(schema:ParameterSchema):boolean{
  return schema.required===false && schema.valueSourceRole==='PROJECT_SPECIFIC_INPUT'
    && schema.provenance?.consumer_input_role_v1==='ADVANCED_OPTION'
    && schema.guide?.guideVersion===knaufOptionalScope.contract && schema.guide.sourceSnapshotHash===knaufOptionalScope.source.sha256
    && knaufOptionalScope.facts.some(f=>f.parameterId===schema.parameterId)
    && schema.formulaConsumers?.length===0 && (schema.resourceBranchConsumers?.length??0)>0;
}

/** The immutable passport owns the short form; labels never assign ownership. */
export function canonicalEstimateConsumerInputRole(schema: Pick<ParameterSchema, "provenance">):
  "OBJECT_FACT" | "ADVANCED_OPTION" | "APPLICATION_TECHNICAL" | undefined {
  const role = schema.provenance?.consumer_input_role_v1;
  return role === "OBJECT_FACT" || role === "ADVANCED_OPTION" || role === "APPLICATION_TECHNICAL" ? role : undefined;
}

const SOURCE_MANAGED_CONSUMER_ROLES = new Set<ParameterSchema["valueSourceRole"]>([
  "MANDATORY_NORM_VALUE",
  "UNRESOLVED_APPLICATION_NORM",
  "NORM_REQUIRED_BUT_PROJECT_SELECTED",
  "MANUFACTURER_CONFIRMED",
  "SELECTED_EQUIPMENT_PASSPORT",
  "SOURCE_BACKED_PRELIMINARY_PROFILE",
  "BACKEND_DERIVED",
]);

const DERIVED_OR_INTERNAL_PARAMETER_ID = /(?:^quantity_|^unit_price_|(?:^|_)(?:compacted_volume|coverage_area|work_quantity|calculated|derived|consumption_total|material_m3|trip_count)(?:_|$))/iu;
const PER_OUTPUT_OR_UNIT_INTERNAL_PARAMETER_ID = /(?:^qty_.+_per_output$|^(?:labor|machine|mass|handling|inspection|waste)_.+_per_unit$)/iu;
const SOURCE_LIKE_PARAMETER_ID = /(?:^quantity_|(?:^|_)(?:productivity|consumption|waste_factor|tack_coat_l_m2|base_emulsion_rate_l_m2|laboratory_test_interval|laboratory_protocol_count|control_interval|sampling_interval)(?:_|$)|(?:^|_)(?:worker|labor|machine)_h(?:ours?)?(?:_|$)|(?:^|_)[a-z0-9]+_per_[a-z0-9_]+$)/iu;
const DERIVED_OR_INTERNAL_TITLE = /^\s*(?:Количество|Объём|Объем):/iu;
const PRELIMINARY_DOCUMENT_SOURCE_ROLES = new Set<string>([
  "PROJECT_DOCUMENTATION",
  "ENGINEERING_DESIGN",
  "SITE_SURVEY",
  "MANUFACTURER_CONFIRMED",
  // Legacy professional families used this pre-contract spelling.
  "PROJECT_SPECIFIC_INPUT",
]);

const VISIBLE_REPLACEABLE_PROFILE_CLASSIFICATIONS = new Set<string>([
  "ASSUMPTION",
  "VISIBLE_PRELIMINARY_SCENARIO",
  "RUNTIME_STRUCTURAL_DEFAULT",
]);

const VISIBLE_REPLACEABLE_PROFILE_SOURCE_ROLES = new Set<string>([
  "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
  "VISIBLE_PRELIMINARY_SCENARIO",
  "VISIBLE_BASELINE_ASSUMPTION",
]);

const CANONICAL_CHOICE_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  ACCEPTED: "Принято, ремонт не требуется",
  LOCAL_REPAIR_REQUIRED: "Требуется локальный ремонт",
  REPLACEMENT_REQUIRED: "Требуется полная замена",
  NEW_BASE_REQUIRED: "Требуется новое основание",
  RECONSTRUCTION_REQUIRED: "Требуется восстановление слоя",
  LIGHT: "Лёгкая нагрузка",
  MEDIUM: "Средняя нагрузка",
  HEAVY: "Тяжёлая нагрузка",
  VERY_HEAVY: "Особо тяжёлая нагрузка",
  SURFACING_ONLY: "Только покрытие по готовому основанию",
  PAVEMENT_STRUCTURE: "Покрытие и конструкция дорожной одежды",
  FULL_ROAD_INFRASTRUCTURE: "Полная дорога с инфраструктурой",
  TURNKEY_PARKING_WITH_SITE_FEATURES: "Парковка под ключ с обустройством",
  REHABILITATION: "Восстановление существующего покрытия",
  contractor: "Контроль выполняет подрядчик",
  independent: "Независимый лабораторный контроль",
  project_spec: "По программе контроля проекта",
  ROLLED: "Рулонная гидроизоляция",
  MASTIC: "Мастичная гидроизоляция",
  SPRAY_APPLIED: "Напыляемая гидроизоляция",
  DENSE_FINE_GRAINED: "Плотная мелкозернистая смесь",
  DENSE_COARSE_GRAINED: "Плотная крупнозернистая смесь",
  STONE_MASTIC: "Щебёночно-мастичный асфальтобетон",
  POROUS: "Пористая асфальтобетонная смесь",
});

const CONSTRUCTION_CHOICE_LABELS_RU: Readonly<Record<string, string>> = Object.freeze({
  // Exact source-wave choice labels; stored values and source gates are unchanged.
  "GALVANIZED_STEEL_WATER_GAS_PIPE_DN15": "Оцинкованная водогазопроводная труба с условным проходом 15 мм",
  "INTERNAL_BUILDING_WATER_SUPPLY_LE_1_6_MPA": "Внутренний водопровод здания с давлением до 1,6 МПа",
  "NOMINAL_BORE_DN15_NOT_OUTSIDE_DIAMETER": "15 мм — условный проход трубы, а не наружный диаметр",
  "PROJECT_STEEL_LENGTH_WITH_FITTINGS_VALVES_U_COMPENSATORS": "Длина по проекту с фасонными частями, арматурой и П-образными компенсаторами",
  "INTERNAL_DISTRIBUTION_ONLY_NOT_STEEL_BUILDING_WATER_INLET_TABLE16_02_004_005": "Только внутренняя разводка, без ввода водопровода в здание",
  "EXCLUDE_METER_NODE_ELEVATOR_HAND_PUMP_CONDENSATE_TRAP_DISTRIBUTION_MANIFOLD_COMPLEX_INCLUDED_LENGTHS": "Не учитывать повторно трубы, уже включённые в комплексные узлы",
  "TRANSPORTABLE_ASSEMBLED_NODES_WITH_SLEEVES_PHYSICAL_SUPPLY_CONFIRMED": "Подтверждена поставка укрупнённых транспортабельных узлов с гильзами",
  "PROJECT_IDENTIFIED_HANDWHEEL_VALVES_IN_MOUNTED_NODES": "Ведомость подтверждает вентили с маховиками в монтируемых узлах",
  "PROJECT_DOCUMENTED_ABSENCE_OF_VALVES_IN_THIS_SCOPE": "Ведомость подтверждает отсутствие вентилей в этом объёме",
  "AT_MOST_3_M_FROM_FLOOR_OR_CONTINUOUS_DECK": "Не выше 3 м от пола или сплошного настила",
  "READY_THROUGH_OPENINGS_NOT_NEW_STRUCTURAL_BORING": "Сквозные проёмы готовы; новое сверление конструкций сюда не входит",
  "WHOLE_INSTALLATION_LABOUR_ONCE_FLUSH_AND_FIXING_INSTALL_INCLUDED_TEST_SEPARATE": "Один цельный труд монтажа с промывкой и установкой креплений; испытание отдельно",
  "GALVANIZED_SHEET_STEEL_ONLY": "Только оцинкованная листовая сталь",
  "ROUND_ONLY": "Только круглое сечение",
  "N_NORMAL_KRER20_ONLY": "Нормальный класс Н по исходной норме",
  "BOLTED_WITH_GASKETS_NO_CLAMPS": "Болтовые соединения с прокладками, без замены хомутами",
  "PROJECT_SURFACE_STRAIGHT_AND_FITTINGS_M2": "Проектная площадь поверхности прямых и фасонных частей",
  "READY_THROUGH_OPENINGS": "Сквозные проёмы готовы",
  "PROJECT_P_ITEMS_NOT_INVENTED": "Проектные комплектующие учитываются по отдельной ведомости",
  "FACTORY_PRIMARY_FINISH_SCOPE_CONFIRMED": "Первичное заводское покрытие подтверждено; отдельная окраска не добавляется",
  "WHOLE_INSTALLATION_NO_DUPLICATE_OPERATIONS": "Один цельный труд монтажа без повторной оплаты включённых операций",
  "BUILDING_VENTILATION_NON_PROCESS_NON_NUCLEAR": "Обычная вентиляция здания, без технологического оборудования и АЭС",
  "SIDE_HOT_BITUMINOUS_COATING_TWO_COATS_KRER08_01_003_07": "Боковая обмазочная гидроизоляция горячей битумной мастикой в два слоя",
  "SIDE_NOT_HORIZONTAL_OR_ROOF_OR_WET_ROOM": "Боковая поверхность стены или фундамента",
  "PREPARED_EVEN_RUBBLE_MASONRY": "Подготовленная выровненная бутовая кладка",
  "PREPARED_EVEN_BRICK": "Подготовленная выровненная кирпичная кладка",
  "PREPARED_EVEN_CONCRETE": "Подготовленная выровненная бетонная поверхность",
  "TWO_SOURCE_COATS_INCLUDED_ONCE": "Два слоя уже учтены; расход повторно не умножается",
  "INCLUDED_PRIMING_AND_HEATED_BITUMINOUS_MASTIC": "Грунтовка и разогрев горячей битумной мастики включены",
  "SOURCE_HOT_ROOFING_MASTIC_BN90_10_KT1_OR_KT2_AND_RAGS": "Горячая кровельная мастика, битум БН-90/10, керосин КТ-1 или КТ-2 и ветошь",
  "WHOLE_LABOUR_ONCE_MACHINE_AND_MATERIAL_PRICE_PENDING_INFO_ONLY": "Цельный труд один раз; стоимость машин и материалов ещё требует подтверждения",
  "SOURCE_METHOD_APPLICABLE_NO_UNPROVED_ADJUSTMENTS": "Применимость исходного способа подтверждена без произвольных поправок",
  "COMPOSITE_00801_FLASHINGS_AND_DOWNSPOUTS": "Фасадные обделки вместе с изготовлением и навеской водосточных труб",
  "GROSS_FACADE_AREA_WITHOUT_OPENING_DEDUCTIONS": "Полная площадь фасада без вычета проёмов",
  "GALVANIZED_SHEET0_7MM": "Оцинкованная листовая сталь толщиной 0,7 мм",
  "FABRICATE_ASSEMBLE_HANG_DOWNPIPES_AT_WALL": "Изготовление, сборка и навеска водосточных труб у стены",
  "SOURCE_NAILS_FORGINGS_WIRE_BASE_CONFIRMED": "Основание пригодно для предусмотренных нормой гвоздей, поковок и проволоки",
  "NO_GUTTER009_OR_ROOF_COVER010_SUBSTITUTION": "Без подмены подвесными желобами или самостоятельным кровельным покрытием",
  "WHOLE_COMPOSITE_SCOPE_RECONCILED_SINGLE_OWNER": "Цельный состав сверён; один владелец оплаты без повторного учёта",
  "NORMAL_NEW_CONSTRUCTION_POSITIVE_TEMPERATURE": "Нормальные условия нового строительства при положительной температуре",
  "BASE_HEIGHT_LE15_NO_OTHER_COEFFICIENTS": "Базовые условия при высоте до 15 м без других неподтверждённых поправок",
  "SOURCE00308_PARTIAL_PRICKING_AND_MORTAR_LEVELING_RUBBLE_ONLY": "Частичная приколка и выравнивание раствором только бутовой поверхности",
  "RUBBLE_MASONRY_SIDE_SURFACE_ONLY": "Только боковая поверхность бутовой кладки",
  "ONE_SAME_SIDE_FACE_FULL_REQUIRED_PREPARATION_SCOPE": "Самостоятельно измерен один и тот же боковой участок для подготовки и изоляции",
  "PARTIAL_PRICKING_THEN_SOURCE_MORTAR_LEVELING": "Частичная приколка с последующим выравниванием раствором",
  "READY_HEAVY_FINISHING_CEMENT_MORTAR_1_3_CODE03_0409_0003": "Готовый тяжёлый отделочный цементный раствор 1:3",
  "WHOLE00308_ONCE_NO007_PRIMER_HEAT_OR_OTHER_PREPARATION_DOUBLE_PAYMENT": "Труд подготовки один раз; без повторной грунтовки, разогрева или другой подготовки",
  "PRINTED_SOURCE100M2_NO_THICKNESS_DENSITY_OR_RECIPE_INFERENCE": "Расход по площади без вычисления толщины, плотности или рецепта смеси",
  "RUBBLE_PREPARATION_REQUIRED_NOT_YET_ACCEPTED_00308": "Подготовка бутовой поверхности требуется; основание ещё не принято",
  "SOURCE00308_WORK_INCLUDED_AND_BASE_SEPARATELY_ACCEPTED": "Подготовка включена в эту смету; готовность основания подтверждена отдельно",
  "ALREADY_READY_ACCEPTED_NO_NEW00308_WORK": "Основание уже подготовлено и принято; новую подготовку не добавлять",
  "OTHER_OR_UNCONFIRMED_PREPARATION": "Другой способ подготовки или условия пока не подтверждены",
  "MANUAL_PREVIOUSLY_THROWN_SOIL_GROUP1_KRER01_02_061_01": "Ручная засыпка ранее выброшенным грунтом первой группы",
  "TRENCH": "Траншея",
  "PIT_SIDE_SPACE": "Пазухи котлована",
  "HOLE": "Яма",
  "GROUP_1_CONFIRMED": "Первая группа грунта подтверждена",
  "UNFROZEN_NATURAL_MOISTURE_NO_UNPROVED_ADJUSTMENTS": "Немёрзлый грунт естественной влажности без неподтверждённых поправок",
  "PREVIOUSLY_THROWN_SUITABLE_SOIL_AT_WORKPLACE": "Пригодный ранее выброшенный грунт доступен у места работ",
  "MANUAL_FILL_CLOD_BREAKING_AND_TAMPING": "Ручная засыпка с разбивкой комьев и трамбованием",
  "REQUIRED_INCLUDED_LABOUR_WATER_QUANTITY_UNRESOLVED": "Поливка требуется; труд включён, расход воды ещё не определён",
  "NOT_REQUIRED_CONFIRMED": "Подтверждено, что поливка не требуется",
  "PROJECT_BACKFILL_SOIL_M3_NO_LOOSE_OR_PIPE_PROXY": "Проектный объём грунта засыпки; без замены рыхлым объёмом или длиной трубы",
  "EXCAVATION_STRUCTURES_AND_UTILITIES_APPROVED_FOR_BACKFILL": "Выемка, конструкции и коммуникации приняты перед засыпкой",
  "WHOLE_LABOUR_ONCE_INCLUDED_STEPS_NO_SECOND_CHARGE": "Цельный труд один раз, без второй оплаты трамбования и поливки",
  "SOURCE03904_CERAMIC_STRAIGHT_ON_READY_M150": "Прямой керамический плинтус на готовом растворе М150",
  "OTHER_OR_UNCONFIRMED_SKIRTING_METHOD": "Другой способ устройства плинтуса или условия пока не подтверждены",
  "CERAMIC_STRAIGHT_SKIRTING_CODE01_3211_0001": "Готовые прямые керамические плинтусные плитки",
  "READY_CEMENT_MASONRY_M150_CODE03_0406_0005": "Готовый цементный кладочный раствор М150",
  "SEPARATE_PROJECT_SKIRTING_LINE_FOR_PARENT_FLOOR_COMPARTMENT": "Отдельно измеренная линия плинтуса в том же помещении",
  "SOURCE_CONSUMPTION_NO_COMMERCIAL_STOCK_ORDER_OR_TRIM_ADMISSION": "Исходный расход; заказ, наличие и раскрой ещё не подтверждены",
  "WHOLE03904_ONCE_NO02703_OR_GERFLOR_GLUE_DUPLICATION": "Труд плинтуса один раз, без переноса оплаты пола или другого плинтуса",
  "PREPARED_WALL_LINE_CONFIRMED_BY_SEPARATE_PROJECT_REFERENCE": "Готовность линии стены подтверждена отдельным проектным документом",
  "PROJECT_P_PITOT_CAP_REFERENCE_ONLY": "Показать проектную потребность в заглушках измерительных лючков, справочно",
  "OTHER_OR_UNCONFIRMED_PITOT_CAP_SCOPE": "Другие заглушки или проектная потребность пока не подтверждена",
  "PROJECT_P_PITOT_MEASUREMENT_PORT_CAP_ONLY": "Заглушка измерительного лючка; не торцевая заглушка воздуховода",
  "WHOLE_PCS_NOT_KG_M2_OR_METRES": "Количество задано целыми штуками",
  "SAME_PROJECT_PORT_TYPE_SIZE_AND_DUCT_ROUTE_CONFIRMED": "Подтверждены точные тип, размер лючка и принадлежность к этой трассе",
  "INSTALLATION_ALREADY_IN_WHOLE167_86_NO_NEW_LABOUR": "Монтаж заглушек включён в цельный труд воздуховода",
  "REFERENCE_ONLY_NO_PAID_OR_PROCUREMENT_ADMISSION": "Только справочное количество; оплата и закупка не допущены",
  "ONE_HOMOGENEOUS_CAP_POSITION_NO_MIXED_SIZES_OR_KIT": "Одна однородная проектная позиция без смешения размеров и комплектов",
  "ONE_SMALL_ROOM_STRAIGHTEDGE_PLAN_INFO_ONLY": "План контроля рейкой для одного небольшого помещения, справочно",
  "ONE_SMALL_ROOM_RECORDED_STRAIGHTEDGE_INFO_ONLY": "Записанные измерения рейкой одного небольшого помещения, справочно",
  "OTHER_OR_UNCONFIRMED_STRAIGHTEDGE_SCOPE": "Другой участок или условия контроля рейкой пока не подтверждены",
  "PHYSICAL_SIDE_PLATES_ONLY_NO_SALES_UNIT_OR_PAYMENT": "Показать две физические боковые пластины на стык, без заказа и оплаты",
  "UNCONFIRMED_OR_OTHER_EP_SUPPLY": "Состав боковых пластин не подтверждён или выбрана другая поставка",
  "SOURCE_SIMPLE_CEMENT_LIME_INTERNAL_STONE_WALL_COLUMN01601": "Простая цементно-известковая штукатурка внутренних каменных стен",
  "READY_HEAVY_CEMENT_LIME_1_1_6_SOURCE03_0410_0001": "Готовый тяжёлый цементно-известковый раствор 1:1:6",
  "PROJECT_CONFIRMED_READY_STONE_MASONRY_FOR01601_NO_IMPORTED_PREPARATION_NORM": "Каменное основание подготовлено и подтверждено для этого способа",
  "NET_INTERNAL_WALL_LESS_BOX_OPENINGS_AND_DRAWN_ARCHITRAVES_HEIGHT_FINISHED_FLOOR_TO_CEILING": "Чистая площадь стены с вычетом проёмов и тянутых наличников; высота от чистого пола",
  "PROJECT_RECONCILED_NONOVERLAPPING_INCLUDED01601_WINDOW_SURFACES_AND_DISTINCT031_ELEMENTS_NO_DOUBLE_PAYMENT": "Поверхности у окон и отдельные элементы разграничены без двойной оплаты",
  "EXACT_BASE_COLUMN_NO_THICKNESS_HEIGHT_REPAIR_ALTITUDE_OR_SPECIAL_COEFFICIENT": "Базовая норма без самостоятельно назначенных поправок",
  "SINGLE_WHOLE_LABOUR_INCLUDES_SOURCE_OPERATIONS_NO_KNAUF_CT29_OR_EXTRA_OPERATOR": "Один цельный труд без второго монтажа или отдельной оплаты оператора",
  "LITERAL_SOURCE_CONSUMPTION_ONLY_NO_PRODUCT_ORDER_STOCK_OR_RECIPE_ADMISSION": "Только исходный расход; фасовка, наличие, заказ и рецепт не подтверждены",
  PRELIMINARY_PROFILE: "Предварительные допущения, обследование не выполнено",
  CONFIRMED_PROJECT_FACTS: "Условия подтверждены обследованием и проектом",
  CEMENT_LIME_MINERAL_PLASTER: "Минеральная цементно-известковая штукатурка",
  CT54_EN_GL_0819: "Ceresit CT 54 Silicate Aero, технический лист en GL 08.19",
  CT17_PROFI_EN_GL_03_24: "Ceresit CT 17 PROFI, технический лист en GL 03.24",
  CT17_UNDILUTED: "CT 17 без разбавления",
  CT17_DILUTED_1_TO_1: "CT 17 с водой в соотношении 1:1",
  ALREADY_PRIMED: "Основание уже загрунтовано",
  THIRD_COAT_PREPARED_MINERAL_WALL: "Третье финишное нанесение по подготовленной минеральной стене",
  CT127_EN_GL_0120: "Ceresit CT 127, технический лист en GL 01.2020",
  MANUAL_ROLLER_BRUSH: "Вручную валиком и кистью",
  PAID_SPRAY_EQUIPMENT: "Распыление с отдельной оплатой аппарата",
  SURVEY_PENDING: "Обследование ещё не выполнено",
  CT29_REQUIRED: "Требуется минеральный ремонт CT 29",
  MOISTEN_ONLY: "Увлажнение основания без грунтовки",
  YES: "Подтверждено",
  full_reinforced_structure: "Полное устройство железобетонной конструкции",
  placement_only: "Только укладка и уход за бетонной смесью",
  ready_cages: "Готовые арматурные каркасы",
  site_fabricated: "Изготовление арматурного каркаса на площадке",
  ready_mix: "Готовая бетонная смесь с РБУ",
  pump: "Подача бетононасосом",
  crane_bucket: "Подача краном в бадье",
  direct_chute: "Прямая выгрузка из автобетоносмесителя",
  membrane: "Плёнкообразующий состав",
  water: "Водный уход",
  WATER_CURING: "Увлажнение бетона водой",
  WET_COVERING: "Укрытие влажным материалом",
  IMPERVIOUS_SHEET: "Укрытие водонепроницаемой плёнкой",
  MEMBRANE_CURING_COMPOUND: "Нанесение плёнкообразующего состава",
  ON_SITE_SUPPLY: "Вода уже есть на объекте",
  SEPARATE_DELIVERY: "Отдельная доставка воды",
  INCLUDED_IN_CURING_MATERIAL_RATE: "Включены в подтверждённую цену материала",
  SEPARATE_SUPPLY: "Отдельная поставка",
  SEPARATE: "Доставка отдельной строкой",
  INCLUDED_IN_SUPPLY: "Доставка включена в поставку",
  NONE: "Не требуется",
  WATERSTOP: "Рабочий шов с гидрошпонкой",
  sand: "Песчаная подушка",
  crushed_stone: "Щебёночная подушка",
  bituminous_coating: "Обмазочная битумная гидроизоляция",
  sheet_membrane: "Листовая или мембранная гидроизоляция",
  "method-profile:nrmca-cip31:ready-mix-order:v1": "Заказ товарного бетона по NRMCA CIP 31",
  "project-profile:approved-reinforcement-bar-schedule:fhwa-rics:v1": "Масса по утверждённой ведомости арматуры",
});
/**
 * Product editor admission is intentionally fail-closed. A parameter can be
 * editable only when the immutable definition declares user ownership and a
 * concrete calculation consumer. Formula impact alone never proves ownership.
 * Names such as `waste_factor` and `*_productivity_*` are not intrinsically
 * derived: a published definition may explicitly assign those source values to
 * the user. Generated factor/productivity outputs remain excluded by the other
 * ownership, guide and generated-input checks below. Units do not establish
 * ownership either: for example, truck turnaround is a legitimate
 * user/project input measured in machine-hours.
 */
export function isCanonicalEstimateUserEditableParameter(schema: ParameterSchema): boolean {
  if (hasProtectedParameterOwnership(schema)) return false;
  if (!hasSchemaOwnedUserFact(schema) && !hasOptionalProjectNumericOwnership(schema)) {
    if (!hasHumanReadableAiEstimateParameterPassport(schema.parameterId, schema.titleRu)) return false;
    if (DERIVED_OR_INTERNAL_TITLE.test(schema.titleRu)) return false;
  }
  return canonicalEstimateParameterChangesPreliminaryEstimate(schema);
}

/**
 * A field belongs to the calculation screen only when the immutable
 * definition names a formula or resource branch that consumes it. Required
 * document references without a consumer may be useful for a later contract
 * or procurement package, but cannot honestly block a preliminary estimate.
 */
export function canonicalEstimateParameterHasCalculationConsumer(
  schema: ParameterSchema,
): boolean {
  return (schema.formulaConsumers?.length ?? 0) > 0
    || (schema.resourceBranchConsumers?.length ?? 0) > 0;
}

/**
 * A published runtime profile is an application-supplied calculation input,
 * not a hidden norm or a generated output. It must remain visible and
 * replaceable even when its technical id resembles a productivity or labor
 * norm that the ordinary consumer-input admission intentionally rejects.
 */
export function isCanonicalEstimateVisibleReplaceableProfile(
  schema: ParameterSchema,
): boolean {
  if (canonicalEstimateConsumerInputRole(schema) === "APPLICATION_TECHNICAL") return false;
  if (schema.visibilityRole !== "USER_INPUT") return false;
  if (!canonicalEstimateParameterHasCalculationConsumer(schema)) return false;
  const classification = String(schema.runtimeProfileClassification ?? "")
    .trim()
    .toUpperCase();
  const sourceRole = String(schema.valueSourceRole ?? "").trim().toUpperCase();
  return VISIBLE_REPLACEABLE_PROFILE_CLASSIFICATIONS.has(classification)
    || VISIBLE_REPLACEABLE_PROFILE_SOURCE_ROLES.has(sourceRole);
}

function hasDeclaredConditionalRequirement(schema: ParameterSchema): boolean {
  const raw = schema.requiredWhen ?? schema.constraints.requiredWhen;
  if (typeof raw === "string") {
    return raw.trim().length > 0 && raw.split(/\s+OR\s+/iu)
      .every(clause => /^([A-Za-z][A-Za-z0-9_.:-]*)\s*==\s*(.+)$/u.test(clause.trim()));
  }
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return false;
  const condition = raw as Record<string, unknown>;
  if (typeof condition.kind === "string" && condition.kind.trim()) {
    try {
      // Validate with the shared graph, not a second applicability evaluator.
      // Actual true/false/unknown visibility is resolved by the session owner.
      evaluateInclusionGraph(condition, {});
      return true;
    } catch {
      return false;
    }
  }
  return typeof condition.parameterId === "string" && condition.parameterId.trim().length > 0
    && Object.prototype.hasOwnProperty.call(condition, "equals");
}

/** Explicit source/derived ownership always wins, including conflicting tags. */
function hasProtectedParameterOwnership(schema: ParameterSchema): boolean {
  return schema.visibilityRole !== "USER_INPUT"
    || canonicalEstimateConsumerInputRole(schema) === "APPLICATION_TECHNICAL"
    || isAiEstimateTechnicalHiddenParam(schema.parameterId)
    || DERIVED_OR_INTERNAL_PARAMETER_ID.test(schema.parameterId)
    || PER_OUTPUT_OR_UNIT_INTERNAL_PARAMETER_ID.test(schema.parameterId)
    || SOURCE_MANAGED_CONSUMER_ROLES.has(schema.valueSourceRole)
    || ["DERIVED_VALUE_RULE", "MANDATORY_NORM_VALUE", "NORMATIVE_RANGE", "MANUFACTURER_RANGE"].includes(String(schema.guide?.guideKind))
    || ["PRIMARY_SOURCE_NORM", ...SOURCE_MANAGED_CONSUMER_ROLES].includes(String(schema.guide?.sourceRole));
}

/**
 * A bound project/measurement guide and real consumers establish user ownership.
 * OBJECT_FACT alone cannot confer it. This also admits compatible passports
 * published before that tag existed, without changing their immutable schema.
 * Source-like rate IDs keep the narrower numeric/reference exceptions below.
 */
function hasSchemaOwnedUserFact(schema: ParameterSchema): boolean {
  if (hasProtectedParameterOwnership(schema) || !canonicalEstimateParameterHasCalculationConsumer(schema)) return false;
  if (!schema.parameterId.trim() || !schema.semanticParameterKey?.trim()) return false;
  const condition = schema.requiredWhen ?? schema.constraints.requiredWhen;
  if (condition != null && !hasDeclaredConditionalRequirement(schema)) return false;
  if (schema.visibleWhen != null && !hasDeclaredConditionalRequirement({ ...schema, requiredWhen: schema.visibleWhen })) return false;
  const guide = schema.guide;
  if (!guide || guide.guideValidationPolicy !== "MANDATORY_BLOCK"
    || !guide.sourceDocument?.trim() || !guide.sourceLocator?.trim()
    || !/^[a-f0-9]{64}$/iu.test(guide.sourceSnapshotHash ?? "")) return false;
  const projectFact = ["PROJECT_SPECIFIC_INPUT", "CONDITIONAL_PROJECT_FACT"].includes(String(schema.valueSourceRole))
    && guide.guideKind === "PROJECT_DEFINED" && guide.sourceRole === "PROJECT_DOCUMENTATION";
  const measuredFact = ["USER_INPUT", "USER_MEASURED", "USER_OR_PROJECT_MEASURED"].includes(String(schema.valueSourceRole))
    && guide.guideKind === "MEASUREMENT_RULE"
    && ["USER_SUPPLIED_PRIMARY_FACT", "USER_INPUT", "USER_MEASURED", "USER_OR_PROJECT_MEASURED"].includes(String(guide.sourceRole));
  if (!projectFact && !measuredFact) return false;
  if (SOURCE_LIKE_PARAMETER_ID.test(schema.parameterId)
    && !(projectFact && (isMandatoryProjectNumericResourceFact(schema) || isMandatoryProjectReferenceResourceFact(schema)))) return false;
  if (schema.valueType === "enum") return Array.isArray(schema.constraints.values) && schema.constraints.values.length > 0;
  if (schema.valueType === "text") return schema.constraints.minLength === 1
    && typeof schema.constraints.maxLength === "number" && schema.constraints.maxLength > 0 && schema.constraints.maxLength <= 1000;
  return ["decimal", "integer", "boolean", "array_object"].includes(schema.valueType);
}

function isMandatoryProjectNumericResourceFact(schema: ParameterSchema): boolean {
  return ["decimal", "integer"].includes(schema.valueType)
    && ["CONDITIONAL_PROJECT_FACT", "PROJECT_SPECIFIC_INPUT"].includes(String(schema.valueSourceRole))
    && schema.guide?.guideKind === "PROJECT_DEFINED"
    && schema.guide.guideValidationPolicy === "MANDATORY_BLOCK"
    && (hasDeclaredConditionalRequirement(schema) || (schema.valueSourceRole === "PROJECT_SPECIFIC_INPUT" && schema.required === true))
    && canonicalEstimateParameterHasCalculationConsumer(schema);
}

/** An optional actual project plan can still be needed by an informational
 * resource (for example, the area covered by each QA check). Its immutable
 * project guide admits editing; a missing value does not become a mandatory
 * preliminary input merely because the resource is shown in the estimate. */
function hasOptionalProjectNumericOwnership(schema: ParameterSchema): boolean {
  return !hasProtectedParameterOwnership(schema)
    && ["decimal", "integer"].includes(schema.valueType)
    && schema.required !== true
    && (schema.requiredWhen ?? schema.constraints.requiredWhen) == null
    && ["CONDITIONAL_PROJECT_FACT", "PROJECT_SPECIFIC_INPUT"].includes(String(schema.valueSourceRole))
    && schema.guide?.guideKind === "PROJECT_DEFINED"
    && schema.guide.guideValidationPolicy === "MANDATORY_BLOCK"
    && schema.guide.sourceRole === "PROJECT_DOCUMENTATION"
    && Boolean(schema.guide.sourceDocument?.trim() && schema.guide.sourceLocator?.trim())
    && /^[a-f0-9]{64}$/iu.test(schema.guide.sourceSnapshotHash ?? "")
    && (schema.formulaConsumers?.length ?? 0) > 0
    && (schema.resourceBranchConsumers?.length ?? 0) > 0;
}

export function isCanonicalEstimateOptionalProjectNumericResourceFact(schema: ParameterSchema): boolean {
  return hasOptionalProjectNumericOwnership(schema) && isCanonicalEstimateUserEditableParameter(schema);
}

/** A bounded reference to actual project documentation can mention a rate or
 * consumption. Its checked immutable guide/ownership and real row consumers
 * distinguish it from entering a free-form professional norm. Protected norm,
 * equipment/manufacturer and derived roles are still checked first below. */
function isMandatoryProjectReferenceResourceFact(schema: ParameterSchema): boolean {
  const guide = schema.guide;
  return schema.valueType === "text"
    && ["CONDITIONAL_PROJECT_FACT", "PROJECT_SPECIFIC_INPUT"].includes(String(schema.valueSourceRole))
    && guide?.guideKind === "PROJECT_DEFINED"
    && guide.guideValidationPolicy === "MANDATORY_BLOCK"
    && guide.sourceRole === "PROJECT_DOCUMENTATION"
    && Boolean(guide.sourceDocument?.trim() && guide.sourceLocator?.trim())
    && /^[a-f0-9]{64}$/iu.test(guide.sourceSnapshotHash ?? "")
    && schema.constraints.minLength === 1
    && typeof schema.constraints.maxLength === "number" && schema.constraints.maxLength > 0 && schema.constraints.maxLength <= 1000
    && (hasDeclaredConditionalRequirement(schema) || (schema.valueSourceRole === "PROJECT_SPECIFIC_INPUT" && schema.required === true))
    && (schema.resourceBranchConsumers?.length ?? 0) > 0;
}

/** A required user choice or explicitly owned project gate can supply a BOQ
 * resource without a numeric formula. Mandatory project gates are classified
 * by immutable ownership/guide metadata, not by a reference-like field name.
 */
export function isCanonicalEstimateVisibleUserResourceSelectionParameter(
  schema: ParameterSchema,
): boolean {
  if (hasProtectedParameterOwnership(schema)) return false;
  if (["enum", "boolean", "array_object"].includes(schema.valueType)
    && (schema.resourceBranchConsumers?.length ?? 0) > 0
    && hasSchemaOwnedUserFact(schema)) return true;
  if (["decimal", "integer"].includes(schema.valueType)) {
    return isMandatoryProjectNumericResourceFact(schema) && isCanonicalEstimateUserEditableParameter(schema);
  }
  if (schema.valueType !== "text") return false;
  const conditionalRequirement = hasDeclaredConditionalRequirement(schema);
  if (schema.required !== true && !conditionalRequirement) return false;
  if ((schema.resourceBranchConsumers?.length ?? 0) === 0) return false;
  const sourceRole = String(schema.valueSourceRole ?? "").trim().toUpperCase();
  const mandatoryProjectGate = ((sourceRole === "CONDITIONAL_PROJECT_FACT" && conditionalRequirement)
      || (sourceRole === "PROJECT_SPECIFIC_INPUT" && schema.required === true))
    && schema.guide?.guideKind === "PROJECT_DEFINED"
    && schema.guide?.guideValidationPolicy === "MANDATORY_BLOCK";
  // Legacy document links without explicit preliminary project-gate ownership
  // remain excluded. Norm/source/derived ownership still fails admission below.
  if (!mandatoryProjectGate && /(?:^|_)(?:reference|approval|certificate|document)(?:_|$)/iu.test(schema.parameterId)) return false;
  return (["USER_INPUT", "USER_MEASURED", "PROJECT_SPECIFIC_INPUT"].includes(sourceRole)
    || (sourceRole === "CONDITIONAL_PROJECT_FACT" && conditionalRequirement))
    && !isCanonicalEstimateSourceManagedParameter(schema);
}

/**
 * A resource row may name a document reference only for contract validation.
 * That does not mean the value changes quantity or branch composition. Formula
 * inputs always matter; resource-only values matter on the first screen when
 * they are explicit branch controls (choice/boolean/structured selection).
 */
export function canonicalEstimateParameterChangesPreliminaryEstimate(
  schema: ParameterSchema,
): boolean {
  if ((schema.formulaConsumers?.length ?? 0) > 0) return true;
  if ((schema.resourceBranchConsumers?.length ?? 0) === 0) return false;
  // A declared actual numeric compatibility gate can affect a resource without
  // being an arithmetic multiplier (e.g. the permitted transported length).
  if (isMandatoryProjectNumericResourceFact(schema)) return true;
  const conditional = schema.requiredWhen ?? schema.constraints.requiredWhen;
  const optionalDocumentProfile = schema.valueType === "enum"
    && schema.required !== true
    && schema.defaultValue == null
    && conditional == null
    && PRELIMINARY_DOCUMENT_SOURCE_ROLES.has(String(schema.valueSourceRole ?? ""))
    && !hasSchemaOwnedUserFact(schema);
  if (optionalDocumentProfile) return false;
  return schema.valueType === "boolean"
    || schema.valueType === "enum"
    || schema.valueType === "array_object";
}

export function canonicalEstimateParameterAllowsPreliminaryCompilation(
  schema: ParameterSchema,
): boolean {
  // MASTER (22): every catalogue work must expose its applicable composition
  // before every exact quantity or branch choice is known. Legacy `false`
  // flags belong to exact/final acceptance; they cannot turn an unknown
  // preliminary input into a hard failure. Invalid supplied values and
  // cross-field conflicts remain blocking, while unresolved values remain
  // visible as preliminary needs outside totals and procurement.
  // New automatic construction owners explicitly distinguish the small set
  // of real user/project facts from their visible replaceable engineering
  // profile. Only that fail-closed combination opens parameter collection;
  // legacy `false` flags remain non-blocking until their definitions receive
  // the same explicit policy and source ownership.
  const mandatoryPrimaryFact = schema.preliminaryCompilationAllowed === false
    && schema.guide?.guideValidationPolicy === "MANDATORY_BLOCK"
    && String(schema.valueSourceRole ?? "") === "USER_INPUT";
  const mandatoryConditionalProjectFact = schema.preliminaryCompilationAllowed === false
    && schema.guide?.guideValidationPolicy === "MANDATORY_BLOCK"
    && String(schema.valueSourceRole ?? "") === "CONDITIONAL_PROJECT_FACT";
  return !(mandatoryPrimaryFact || mandatoryConditionalProjectFact);
}

/**
 * All estimate entry points must classify the same missing field in the same
 * way. A missing value can be deferred only for the preliminary stage; type,
 * range, geometry and cross-field conflicts always remain blocking.
 */
export function canonicalEstimateBlockingParameterIssues<
  Issue extends { code: string; parameterId: string },
>(
  schema: readonly ParameterSchema[],
  issues: readonly Issue[],
): Issue[] {
  const schemaById = new Map(schema.map((parameter) => [parameter.parameterId, parameter]));
  return issues.filter((issue) => {
    if (issue.code !== "REQUIRED" && issue.code !== "REQUIRED_WHEN") return true;
    const definition = schemaById.get(issue.parameterId);
    return definition == null || !canonicalEstimateParameterAllowsPreliminaryCompilation(definition);
  });
}

/**
 * Consumer UI cannot accept a bare number where the definition requires a
 * normative source. Such values need a bound catalogue norm, approved work
 * method or equipment passport, none of which is represented by the scalar
 * consumer editor today.
 */
export function isCanonicalEstimateConsumerSuppliedParameter(schema: ParameterSchema): boolean {
  if (!isCanonicalEstimateUserEditableParameter(schema)) return false;
  return !isCanonicalEstimateSourceManagedParameter(schema);
}

/**
 * A consumer can describe the object and provide measurements or approved
 * project data. A norm, a selected machine/product passport and a derived
 * value need a bound source; a scalar entered by the customer is not proof of
 * that source.
 */
export function isCanonicalEstimateSourceManagedParameter(schema: ParameterSchema): boolean {
  if (hasProtectedParameterOwnership(schema)) return true;
  if (hasSchemaOwnedUserFact(schema)) return false;
  // A mandatory actual project fact may contain words such as "mass per unit"
  // or "capacity". Its immutable role/guide and consumers establish ownership;
  // the technical-looking name alone cannot turn it into a hidden norm.
  if (isMandatoryProjectNumericResourceFact(schema) || isMandatoryProjectReferenceResourceFact(schema)
    || isCanonicalEstimateOptionalProjectNumericResourceFact(schema)) return false;
  return canonicalEstimateParameterRequiresManagedProfessionalSource(schema);
}

/**
 * A customer may provide dimensions, selected products and project choices,
 * but never becomes the source of a professional norm merely because an old
 * passport labelled the scalar USER_INPUT. The missing value stays visible as
 * a source-managed gap until a checked norm, product passport or work method
 * supplies it.
 */
export function canonicalEstimateParameterRequiresManagedProfessionalSource(
  schema: Pick<ParameterSchema, "parameterId" | "titleRu">,
): boolean {
  return SOURCE_LIKE_PARAMETER_ID.test(schema.parameterId)
    || /(?:расход|производительност|трудозатрат|человеко.?час|машино.?час|коэффициент|норм[аы])/iu
      .test(schema.titleRu);
}

function conditionScalar(value: string): string | number | boolean {
  const normalized = value.trim();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^[+-]?\d+(?:\.\d+)?$/u.test(normalized)) return Number(normalized);
  return normalized.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
}

/** True only while this definition is applicable to the immutable revision. */
export function isCanonicalEstimateParameterRequiredForValues(
  schema: ParameterSchema,
  values: Readonly<Record<string, unknown>>,
): boolean {
  if (schema.required) return true;
  if (canonicalEstimateParameterIsOptionalScopeChoice(schema)) return false;
  const raw = schema.requiredWhen ?? schema.constraints.requiredWhen;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const condition = raw as Record<string, unknown>;
    if (typeof condition.kind === "string" && condition.kind.trim()) {
      return evaluateInclusionGraph(condition, values);
    }
    const parameterId = String(condition.parameterId ?? "").trim();
    return Boolean(
      parameterId
      && Object.prototype.hasOwnProperty.call(condition, "equals")
      && values[parameterId] === condition.equals,
    );
  }
  if (typeof raw !== "string" || !raw.trim()) return false;
  return raw.split(/\s+OR\s+/iu).some((clause) => {
    const match = /^([A-Za-z][A-Za-z0-9_.:-]*)\s*==\s*(.+)$/u.exec(clause.trim());
    return Boolean(match && values[match[1]] === conditionScalar(match[2]));
  });
}

export function canonicalEstimateParameterChoiceLabelRu(
  parameterId: string,
  value: unknown,
  fallback?: string,
): string {
  return canonicalPublicEstimateChoiceLabelRu(canonicalEstimateSourceParameterChoiceLabelRu(parameterId, value, fallback));
}

function canonicalEstimateSourceParameterChoiceLabelRu(
  parameterId: string,
  value: unknown,
  fallback?: string,
): string {
  const normalized = String(value);
  if(parameterId==='selected_delivery_selection'){
    if(normalized==='NOT_SELECTED')return 'Не добавлять отдельную доставку';
    if(normalized==='SEPARATE_CONFIRMED')return 'Отдельная доставка по документу партии';
  }
  if(parameterId==='selected_delivery_product_profile_id'&&normalized==='manufacturer-profile:ford-transit-v363:500-l4-h3:selected-derivative:v1')
    return 'Ford Transit V363 500 L4 H3 — характеристики машины требуют подтверждения';
  if(parameterId==='selected_delivery_selected_vehicle_model_and_derivative'&&normalized==='FORD_TRANSIT_V363_500_L4_H3')
    return 'Ford Transit V363 500 L4 H3';

  // Saved facts can arrive as Booleans or their transport strings.
  if (normalized === "true") return "Да";
  if (normalized === "false") return "Нет";
  if (["slab_main_concrete_transport_pricing_basis", "slab_soil_transport_pricing_basis"].includes(parameterId)) {
    if (normalized === "PER_TRIP") return "За рейс";
    if (normalized === "PER_M3_KM") return "За м³·км";
    if (normalized === "PER_MACHINE_HOUR") return "За машино-час";
  }
  if (["base_delivery_cost_mode", "base_extra_mobilization_cost_mode", "base_qa_cost_mode"].includes(parameterId)) {
    if (normalized === "SEPARATE") return "Оплачивается отдельно";
    if (normalized === "INCLUDED") return "Включено в подтверждённую стоимость";
  }
  if (parameterId === "c111_insulation_mode") {
    if (normalized === "AKUSTIKNAUF_50") return "АкустиКНАУФ 50 мм, упаковка 12 м²";
    if (normalized === "NONE") return "Без изоляции, если допустимо по проекту";
  }
  if (parameterId === "ct54_first_coat_water_ratio") {
    if (normalized === "0") return "Без разбавления";
    if (normalized === "0.1") return "10% воды только в первом слое";
  }
  // Decision values describe opposite branch choices. Do not fall back to the
  // parameter's generic guide/title for both options.
  if (normalized === "NOT_REQUIRED") return "Не требуется";
  if (normalized === "REQUIRED") return "Требуется";
  const constructionLabel = CONSTRUCTION_CHOICE_LABELS_RU[normalized];
  if (constructionLabel) return constructionLabel;
  if (parameterId === "concrete_class" && /^B\d+(?:[.,]\d+)?$/u.test(normalized)) {
    return `Бетон класса ${normalized}`;
  }
  if (parameterId === "watertightness" && /^W\d+$/u.test(normalized)) {
    return `Водонепроницаемость ${normalized}`;
  }
  if (parameterId === "frost_resistance" && /^F\d+$/u.test(normalized)) {
    return `Морозостойкость ${normalized}`;
  }
  if (parameterId === "mobility" && /^P\d+$/u.test(normalized)) {
    return `Подвижность ${normalized}`;
  }
  if (parameterId === "estimate_scope_mode") {
    if (normalized === "MINIMAL_EXPLICIT_SCOPE") return "Базовый состав";
    if (normalized === "FULL_APPLICABLE_SCOPE") return "Полный применимый состав";
  }
  if (parameterId === "material_variant") {
    return waterMaterialVariantLabelRuR542(normalized);
  }
  if (parameterId === "installation_method") {
    if (normalized === "OPEN_TRENCH") return "Открытая траншея";
    if (normalized === "TRENCHLESS") return "Бестраншейная прокладка";
  }
  if (normalized === "PROJECT_SPECIFIED") return "По проектной документации";
  const canonicalLabel = CANONICAL_CHOICE_LABELS_RU[normalized];
  if (canonicalLabel) return canonicalLabel;
  const technologyLabel = waterMaterialVariantLabelRuR542(normalized);
  if (technologyLabel !== normalized) return technologyLabel;
  const safeFallback = fallback?.trim();
  if (safeFallback && /[А-Яа-яЁё]/u.test(safeFallback)) return safeFallback;
  if (/^[A-Za-z][A-Za-z0-9_:-]*$/u.test(normalized)) {
    return "Вариант по проектной документации";
  }
  return normalized;
}
