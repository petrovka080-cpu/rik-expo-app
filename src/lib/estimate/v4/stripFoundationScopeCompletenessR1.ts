import { STRIP_FOUNDATION_ROWS } from "./reinforcedConcreteStripFoundationR1";
import { STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES } from "./stripFoundationConcretePlacementR1";
import { STRIP_FOUNDATION_REINFORCEMENT_RESOURCES } from "./stripFoundationReinforcementR1";

export const STRIP_FOUNDATION_SCOPE_COMPLETENESS_R1_CONTRACT =
  "rik-expo-app.strip-foundation-scope-completeness-r1" as const;

export type StripFoundationScopeApplicabilityR1 = "REQUIRED" | "CONDITIONAL";
export type StripFoundationScopeResourceKindR1 =
  | "material"
  | "construction_work"
  | "machine_equipment"
  | "service"
  | "delivery"
  | "document";

export type StripFoundationScopeExpectationR1 = {
  expectationId: string;
  stageId: string;
  titleRu: string;
  applicability: StripFoundationScopeApplicabilityR1;
  resourceKinds: readonly StripFoundationScopeResourceKindR1[];
  currentDefinitionRowIds: readonly string[];
  typedChildRowIds: readonly string[];
  sourceBasis: readonly string[];
  reasonRu: string;
};

export type StripFoundationScopeDispositionR1 =
  | "INCLUDED_IN_CURRENT_DEFINITION"
  | "AVAILABLE_TYPED_CHILD_NOT_COMPOSED"
  | "CONTENT_GAP_SOURCE_REQUIRED";

export type StripFoundationScopeDecisionR1 = StripFoundationScopeExpectationR1 & {
  disposition: StripFoundationScopeDispositionR1;
  missingCurrentDefinitionRowIds: readonly string[];
  missingTypedChildRowIds: readonly string[];
  composedTypedChildRowIds: readonly string[];
};

/**
 * Independent expected-scope oracle for the declared full-foundation result.
 *
 * This list is intentionally not generated from STRIP_FOUNDATION_ROWS. The
 * production definition is only supplied to the auditor below as the object
 * under test. A row count is never used as a completeness target.
 */
export const STRIP_FOUNDATION_INDEPENDENT_SCOPE_EXPECTATIONS_R1:
readonly StripFoundationScopeExpectationR1[] = Object.freeze([
  {
    expectationId: "site_layout_and_axis_control",
    stageId: "site_preparation",
    titleRu: "Разбивка осей и контроль положения фундаментной ленты",
    applicability: "REQUIRED",
    resourceKinds: ["construction_work"],
    currentDefinitionRowIds: ["work:foundation:axis-setting-out-control"],
    typedChildRowIds: [],
    sourceBasis: [
      "PROJECT_SETTING_OUT_PLAN",
      "SN_KR_52_02_2024:11.5.2,11.5.6-11.5.7",
    ],
    reasonRu: "Геометрия бетона не заменяет отдельную проектную разбивку и контроль положения конструкции.",
  },
  {
    expectationId: "as_built_survey_and_record",
    stageId: "quality_control",
    titleRu: "Исполнительная геодезическая съёмка и её результат",
    applicability: "CONDITIONAL",
    resourceKinds: ["service", "document"],
    currentDefinitionRowIds: [
      "service:foundation:as-built-survey",
      "document:foundation:as-built-survey-record",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_SURVEY_CONTROL_PLAN", "SN_KR_52_02_2024:11.5.6-11.5.7"],
    reasonRu: "Разбивка до работ не заменяет исполнительную съёмку готовой конструкции; применимость и граница оплаты определяются проектным планом контроля.",
  },
  {
    expectationId: "excavation_and_surplus_soil",
    stageId: "earthworks",
    titleRu: "Разработка выемки и обращение с излишним грунтом",
    applicability: "CONDITIONAL",
    resourceKinds: ["construction_work", "machine_equipment", "delivery"],
    currentDefinitionRowIds: ["excavation_work", "excavator", "excavated_soil_disposal"],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_EXCAVATION_PROFILE", "SOIL_BALANCE", "APPROVED_DISPOSAL_ROUTE"],
    reasonRu: "Стадия зависит от границы работ, профиля выемки, баланса грунта и выбранного маршрута вывоза.",
  },
  {
    expectationId: "bedding_and_concrete_preparation",
    stageId: "foundation_base",
    titleRu: "Подушка основания и бетонная подготовка",
    applicability: "CONDITIONAL",
    resourceKinds: ["material", "construction_work", "machine_equipment", "delivery"],
    currentDefinitionRowIds: [
      "bedding_sand",
      "bedding_crushed_stone",
      "foundation_bedding_work",
      "bedding_compactor",
      "bedding_material_delivery",
      "preparation_concrete",
      "preparation_work",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_FOUNDATION_BASE_DETAIL", "SELECTED_COMPACTION_EQUIPMENT_PASSPORT"],
    reasonRu: "Вариант материала, объём, уплотнение и подготовка определяются проектом основания.",
  },
  {
    expectationId: "formwork_primary_scope",
    stageId: "formwork",
    titleRu: "Опалубочная система, монтаж, распалубка и перевозка",
    applicability: "REQUIRED",
    resourceKinds: ["material", "construction_work", "delivery"],
    currentDefinitionRowIds: ["formwork_system", "formwork_install", "formwork_remove", "formwork_delivery"],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_FORMWORK_LAYOUT", "SUPPLIER_KIT_SCHEDULE", "SUPPLIER_ROUTE"],
    reasonRu: "Контактная площадь должна быть связана с выбранной системой, комплектом и коммерческой моделью поставки.",
  },
  {
    expectationId: "formwork_accessories_and_release_agent",
    stageId: "formwork",
    titleRu: "Крепления, раскрепление, комплектующие и разделительный состав опалубки",
    applicability: "CONDITIONAL",
    resourceKinds: ["material"],
    currentDefinitionRowIds: [
      "material:formwork:ties-accessories",
      "material:formwork:release-agent",
    ],
    typedChildRowIds: [],
    sourceBasis: [
      "PROJECT_FORMWORK_LAYOUT",
      "SELECTED_FORMWORK_SYSTEM_TDS",
      "DOKA_TRENN:ABSORBENT_FORMWORK:UP_TO_100_M2_PER_L",
    ],
    reasonRu: "Крепления учитываются внутри выбранного комплекта без второй цены; расход Doka-Trenn рассчитывается из площади контакта по выбранному TDS-профилю.",
  },
  {
    expectationId: "formwork_cleaning_and_return_logistics",
    stageId: "formwork",
    titleRu: "Очистка арендной опалубки, подготовка и обратный рейс поставщику",
    applicability: "CONDITIONAL",
    resourceKinds: ["construction_work", "delivery"],
    currentDefinitionRowIds: [
      "work:formwork:strip-clean-return-preparation",
      "delivery:formwork:return-kit",
    ],
    typedChildRowIds: [],
    sourceBasis: [
      "PROJECT_FORMWORK_SUPPLY_MODE",
      "SUPPLIER_FORMWORK_RETURN_ROUTE_AND_QUOTE",
      "APPROVED_FORMWORK_RETURN_PLAN",
    ],
    reasonRu: "Обратный рейс и подготовка к возврату применяются только к арендному возвратному комплекту; собственная и купленная опалубка не должны получать ложную стоимость возврата.",
  },
  {
    expectationId: "formwork_tie_consumable_components",
    stageId: "formwork",
    titleRu: "Расходные трубки, конусы и заглушки стяжных узлов опалубки",
    applicability: "CONDITIONAL",
    resourceKinds: ["material"],
    currentDefinitionRowIds: [
      "material:formwork:tie-consumables-included",
      "material:formwork:tie-consumables-separate",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_FORMWORK_LAYOUT", "SELECTED_FORMWORK_SYSTEM_TDS", "SUPPLIER_KIT_SCHEDULE"],
    reasonRu: "Одно название креплений не доказывает наличие расходных деталей; количество должно поступать из раскладки, а включённый комплект не должен оплачиваться повторно.",
  },
  {
    expectationId: "reinforcement_primary_scope",
    stageId: "reinforcement",
    titleRu: "Арматурная сталь, вязальная проволока, изготовление и монтаж каркаса",
    applicability: "REQUIRED",
    resourceKinds: ["material", "construction_work", "machine_equipment", "delivery"],
    currentDefinitionRowIds: [
      "reinforcement",
      "binding_wire",
      "reinforcement_install",
      "reinforcement_fabrication",
      "rebar_cutting_machine",
      "rebar_bending_machine",
      "reinforcement_delivery",
    ],
    typedChildRowIds: [],
    sourceBasis: ["APPROVED_REINFORCEMENT_BAR_SCHEDULE", "PROJECT_REINFORCEMENT_EXECUTION_PLAN"],
    reasonRu: "Масса и применимые операции принадлежат утверждённой ведомости и выбранному способу изготовления.",
  },
  {
    expectationId: "reinforcement_accessories",
    stageId: "reinforcement",
    titleRu: "Фиксаторы защитного слоя и применимые соединительные муфты",
    applicability: "CONDITIONAL",
    resourceKinds: ["material"],
    currentDefinitionRowIds: [],
    typedChildRowIds: [
      "material:reinforcement:spacer-chairs",
      "material:reinforcement:mechanical-couplers",
    ],
    sourceBasis: [
      "MAX_FRANK_DBV_WALL_SPACERS:SUPPORTING_BARS_UP_TO_8MM:4_PIECE_PER_M2_PER_SIDE",
      "APPROVED_REINFORCEMENT_BAR_SCHEDULE",
      "PROJECT_COVER_AND_CONNECTION_DETAILS",
    ],
    reasonRu: "Предварительный профиль автоматически считает блочные фиксаторы по площади обеих сторон; муфты остаются условной проектной ветвью.",
  },
  {
    expectationId: "reinforcement_handling_and_control",
    stageId: "reinforcement",
    titleRu: "Разгрузка, складирование, контроль геометрии и инженерная приёмка армирования",
    applicability: "REQUIRED",
    resourceKinds: ["construction_work", "service", "document"],
    currentDefinitionRowIds: [],
    typedChildRowIds: [
      "work:reinforcement:unload-store",
      "work:reinforcement:cover-control",
      "service:reinforcement:inspection",
      "service:reinforcement:mill-certificates",
    ],
    sourceBasis: [
      "PROJECT_REINFORCEMENT_EXECUTION_PLAN",
      "SN_KR_52_02_2024:11.5.2,11.5.5-11.5.7",
      "SUPPLIER_CERTIFICATES",
    ],
    reasonRu: "Операции проецируются физическим объёмом арматуры и явно включаются в родительский монтаж/поставку без повторной стоимости.",
  },
  {
    expectationId: "reinforcement_lifting",
    stageId: "reinforcement",
    titleRu: "Подъём готовых арматурных каркасов",
    applicability: "CONDITIONAL",
    resourceKinds: ["machine_equipment"],
    currentDefinitionRowIds: [],
    typedChildRowIds: ["equipment:reinforcement:lifting"],
    sourceBasis: ["PROJECT_LIFTING_PLAN", "SELECTED_LIFTING_EQUIPMENT_PASSPORT"],
    reasonRu: "Необходимость и машино-время определяются массой каркаса, схемой монтажа и выбранным оборудованием.",
  },
  {
    expectationId: "concrete_placement_and_compaction",
    stageId: "concreting",
    titleRu: "Поставка, подача, укладка и уплотнение бетонной смеси",
    applicability: "REQUIRED",
    resourceKinds: ["material", "construction_work", "machine_equipment", "delivery"],
    currentDefinitionRowIds: [
      "main_concrete",
      "concrete_placement",
      "concrete_pump",
      "crane_bucket",
      "deep_vibrator",
      "concrete_delivery",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_CONCRETE_SPECIFICATION", "NRMCA_CIP31", "SELECTED_PLACEMENT_EQUIPMENT_PASSPORT"],
    reasonRu: "Определение содержит взаимоисключающие способы подачи и отдельную поставку товарного бетона.",
  },
  {
    expectationId: "concrete_finish_curing_and_winter_measures",
    stageId: "concrete_aftercare",
    titleRu: "Обработка поверхности, уход и применимые зимние меры",
    applicability: "REQUIRED",
    resourceKinds: ["material", "construction_work", "machine_equipment"],
    currentDefinitionRowIds: [
      "surface_finish",
      "curing_membrane",
      "curing_work",
      "winter_heating_cable",
      "winter_heating_work",
      "heating_transformer",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_CONCRETING_METHOD", "PROJECT_WINTER_CONCRETING_PLAN"],
    reasonRu: "Уход обязателен как стадия, а зимние ресурсы включаются только по подтверждённой технологии.",
  },
  {
    expectationId: "concrete_quality_control",
    stageId: "quality_control",
    titleRu: "Приёмочный контроль бетонных работ и испытания по программе качества",
    applicability: "CONDITIONAL",
    resourceKinds: ["service", "document"],
    currentDefinitionRowIds: [],
    typedChildRowIds: ["service:concrete:acceptance-control"],
    sourceBasis: [
      "SN_KR_52_02_2024:11.5.2-11.5.7",
      "PROJECT_CONCRETE_ACCEPTANCE_AND_TEST_PLAN",
      "NRMCA_CIP_41:ACCEPTANCE_TESTING_OF_CONCRETE",
    ],
    reasonRu: "Предварительный профиль показывает охваченный объём бетона и включает контроль в родительскую операцию; число самостоятельных испытаний определяется программой качества.",
  },
  {
    expectationId: "water_curing_material_and_supply",
    stageId: "concrete_aftercare",
    titleRu: "Вода и применимое оборудование подачи для водного ухода за бетоном",
    applicability: "CONDITIONAL",
    resourceKinds: ["material", "machine_equipment"],
    currentDefinitionRowIds: [
      "material:concrete:curing-water",
      "equipment:concrete:curing-water-supply",
    ],
    typedChildRowIds: [],
    sourceBasis: [
      "ACI_SPEC_308_1_23_METHOD_APPLICABILITY",
      "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
      "SELECTED_CURING_WATER_SUPPLY_EQUIPMENT_PASSPORT",
    ],
    reasonRu: "Работа по уходу не заменяет физический ресурс воды; отдельная машина включается только при выбранной отдельной подаче, а универсальный расход не придумывается.",
  },
  {
    expectationId: "concrete_construction_joints",
    stageId: "concreting",
    titleRu: "Рабочие швы бетонирования и применимая гидрошпонка",
    applicability: "CONDITIONAL",
    resourceKinds: ["material", "construction_work"],
    currentDefinitionRowIds: [],
    typedChildRowIds: [
      "material:concrete:construction-joint-waterstop",
      "work:concrete:construction-joint-waterstop-install",
    ],
    sourceBasis: ["PROJECT_CONSTRUCTION_JOINT_SCHEDULE", "SELECTED_WATERSTOP_TDS"],
    reasonRu: "Ветвь гидрошпонки включается только при подтверждённом рабочем шве; непрерывное бетонирование явно оставляет её неприменимой.",
  },
  {
    expectationId: "waterproofing_primary_scope",
    stageId: "waterproofing",
    titleRu: "Выбранная гидроизоляционная система и её нанесение",
    applicability: "CONDITIONAL",
    resourceKinds: ["material", "construction_work"],
    currentDefinitionRowIds: [
      "bituminous_waterproofing",
      "sheet_waterproofing_membrane",
      "coating_waterproofing_work",
      "sheet_waterproofing_work",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_WATERPROOFING_SYSTEM", "SIKA_IGOLFLEX_101DE:4_OR_5_L_PER_M2"],
    reasonRu: "Для обмазочного варианта выбранный профиль переводит площадь в литры продукта; режим воздействия воды остаётся видимым уточнением.",
  },
  {
    expectationId: "waterproofing_system_accessories",
    stageId: "waterproofing",
    titleRu: "Грунтовка, защитный слой, усиление примыканий и прочие компоненты выбранной системы",
    applicability: "CONDITIONAL",
    resourceKinds: ["material", "construction_work"],
    currentDefinitionRowIds: [
      "material:waterproofing:system-primer",
      "work:waterproofing:system-primer-application",
      "material:waterproofing:protection-layer",
      "work:waterproofing:protection-layer-install",
      "material:waterproofing:detail-reinforcement",
      "work:waterproofing:detail-reinforcement-install",
    ],
    typedChildRowIds: [],
    sourceBasis: [
      "PROJECT_WATERPROOFING_DETAILS",
      "SELECTED_WATERPROOFING_TDS",
      "SIKA_IGOLFLEX_P01_DE_TDS_PRIMER_RATE",
      "SIKA_IGOLFLEX_F01_EU_TDS_REINFORCEMENT_COVERAGE",
      "SIKASHIELD_PB_P15_PE_6MM:BACKFILL_PROTECTION",
    ],
    reasonRu: "Выбранный системный профиль автоматически считает грунтовку, армирующую ткань и защиту; проектное уточнение меняет связанную ветвь, а не требует ручного ввода расхода.",
  },
  {
    expectationId: "horizontal_cutoff_waterproofing",
    stageId: "waterproofing",
    titleRu: "Горизонтальная отсечная гидроизоляция в узле стены и фундамента",
    applicability: "CONDITIONAL",
    resourceKinds: ["material", "construction_work"],
    currentDefinitionRowIds: [
      "material:waterproofing:horizontal-cutoff",
      "work:waterproofing:horizontal-cutoff-install",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_WALL_FOUNDATION_JUNCTION_DETAIL", "SELECTED_HORIZONTAL_CUTOFF_SYSTEM_TDS"],
    reasonRu: "Вертикальная защита граней не заменяет отсечку в узле стены; ветвь включается только по проектному узлу и прямому количеству.",
  },
  {
    expectationId: "backfill_and_compaction",
    stageId: "backfill",
    titleRu: "Обратная засыпка и послойное уплотнение",
    applicability: "CONDITIONAL",
    resourceKinds: ["construction_work", "machine_equipment"],
    currentDefinitionRowIds: ["backfill_work", "backfill_compactor"],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_SOIL_BALANCE", "PROJECT_COMPACTION_REQUIREMENTS"],
    reasonRu: "Объём и уплотнение определяются балансом грунта после вычета конструкций и требованиями проекта.",
  },
  {
    expectationId: "temporary_excavation_support_and_dewatering",
    stageId: "temporary_works",
    titleRu: "Применимое крепление выемки и водоотлив",
    applicability: "CONDITIONAL",
    resourceKinds: ["material", "construction_work", "machine_equipment"],
    currentDefinitionRowIds: [
      "material:earthworks:excavation-support",
      "work:earthworks:excavation-support-install-remove",
      "equipment:earthworks:dewatering",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_EXCAVATION_SUPPORT_PLAN", "GEOTECHNICAL_AND_GROUNDWATER_DATA", "SELECTED_DEWATERING_EQUIPMENT_PASSPORT"],
    reasonRu: "Эти временные ресурсы нельзя включать всем фундаментам, но определение обязано уметь показать их при подтверждённых грунтовых и водных условиях.",
  },
  {
    expectationId: "cleanup_and_non_soil_construction_waste",
    stageId: "closeout",
    titleRu: "Уборка, упаковка и обращение со строительными отходами кроме грунта",
    applicability: "CONDITIONAL",
    resourceKinds: ["material", "construction_work", "delivery", "service"],
    currentDefinitionRowIds: [
      "work:foundation:site-cleanup",
      "material:foundation:waste-packaging",
      "work:foundation:waste-sort-load",
      "delivery:foundation:construction-waste-haul",
      "service:foundation:construction-waste-disposal",
    ],
    typedChildRowIds: [],
    sourceBasis: ["PROJECT_WASTE_MANAGEMENT_PLAN", "CONFIRMED_NON_SOIL_WASTE_MASS", "APPROVED_WASTE_RECIPIENT_AND_ROUTE"],
    reasonRu: "Вывоз грунта не закрывает упаковку и прочие строительные отходы; включённость в подряд и отдельная оплата должны быть явными.",
  },
]);

function missingIds(expected: readonly string[], actual: ReadonlySet<string>): string[] {
  return expected.filter((rowId) => !actual.has(rowId));
}

export function auditStripFoundationScopeCompletenessR1(input: {
  currentDefinitionRowIds?: readonly string[];
  typedChildRowIds?: readonly string[];
} = {}): {
  contract: typeof STRIP_FOUNDATION_SCOPE_COMPLETENESS_R1_CONTRACT;
  productionBuilderUsedAsOracle: false;
  fixedRowQuotaUsed: false;
  decisions: readonly StripFoundationScopeDecisionR1[];
  unresolvedExpectationIds: readonly string[];
  unresolvedCount: number;
  status: "GREEN" | "RED";
} {
  const current = new Set(input.currentDefinitionRowIds ?? STRIP_FOUNDATION_ROWS.map((row) => row.rowId));
  const typedChild = new Set(input.typedChildRowIds ?? [
    ...STRIP_FOUNDATION_REINFORCEMENT_RESOURCES,
    ...STRIP_FOUNDATION_CONCRETE_PLACEMENT_RESOURCES,
  ].map((row) => row.row_id));
  const decisions = STRIP_FOUNDATION_INDEPENDENT_SCOPE_EXPECTATIONS_R1.map((expectation) => {
    const missingCurrentDefinitionRowIds = missingIds(expectation.currentDefinitionRowIds, current);
    const missingTypedChildRowIds = missingIds(expectation.typedChildRowIds, typedChild);
    const composedTypedChildRowIds = expectation.typedChildRowIds.filter((rowId) => current.has(rowId));
    const baseDefinitionIncluded = expectation.currentDefinitionRowIds.length > 0
      && missingCurrentDefinitionRowIds.length === 0;
    const typedChildCompositionIncluded = expectation.typedChildRowIds.length > 0
      && composedTypedChildRowIds.length === expectation.typedChildRowIds.length;
    const currentIncluded = baseDefinitionIncluded || typedChildCompositionIncluded;
    const typedChildAvailable = !typedChildCompositionIncluded
      && expectation.typedChildRowIds.length > 0
      && missingTypedChildRowIds.length === 0;
    const disposition: StripFoundationScopeDispositionR1 = currentIncluded
      ? "INCLUDED_IN_CURRENT_DEFINITION"
      : typedChildAvailable
        ? "AVAILABLE_TYPED_CHILD_NOT_COMPOSED"
        : "CONTENT_GAP_SOURCE_REQUIRED";
    return {
      ...expectation,
      disposition,
      missingCurrentDefinitionRowIds,
      missingTypedChildRowIds,
      composedTypedChildRowIds,
    };
  });
  const unresolvedExpectationIds = decisions
    .filter((decision) => decision.disposition !== "INCLUDED_IN_CURRENT_DEFINITION")
    .map((decision) => decision.expectationId);
  return {
    contract: STRIP_FOUNDATION_SCOPE_COMPLETENESS_R1_CONTRACT,
    productionBuilderUsedAsOracle: false,
    fixedRowQuotaUsed: false,
    decisions,
    unresolvedExpectationIds,
    unresolvedCount: unresolvedExpectationIds.length,
    status: unresolvedExpectationIds.length === 0 ? "GREEN" : "RED",
  };
}
