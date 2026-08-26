import {
  TECHNOLOGY_PASSPORT_R1_CONTRACT,
  type TechnologyPassportConditionalMaterialFamilyR1,
  type TechnologyPassportConstructionOperationR1,
  type TechnologyPassportDeliveryFlowR1,
  type TechnologyPassportEquipmentRuleR1,
  type TechnologyPassportExclusionR1,
  type TechnologyPassportFormulaR1,
  type TechnologyPassportMaterialFamilyR1,
  type TechnologyPassportMaterialSelectionResolutionR33,
  type TechnologyPassportParameterR1,
  type TechnologyPassportProcurementRuleR1,
  type TechnologyPassportR1,
  type TechnologyPassportStageR1,
} from "../../../backendPlatform/technologyPassportR1";
import {
  buildDrywallMaterialPreliminaryAssumptionR33,
  MASTER_TZ_R33_SHA256,
  MASTER_TZ_R33_SOURCE_ID,
  resolveDrywallMaterialSelectionR33,
} from "./drywallMaterialSelectionR33";

/**
 * Independent BATCH-001 expectation source.
 *
 * Deliberately do not import a runtime definition, runtime resource row or a
 * predecessor oracle here. The expectations below were authored from the
 * frozen master requirement and the frozen primary manufacturer technical
 * sheet. A production compiler may be compared with this passport later, but
 * it must never be used to generate the passport itself.
 */
export const BATCH001_DRYWALL_TECHNOLOGY_PASSPORT_R1_CONTRACT =
  "real-useful-estimates.batch001-drywall-technology-passport-r1.v1" as const;

export const BATCH001_DRYWALL_MASTER_SHA256_R1 =
  "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510" as const;
export const BATCH001_DRYWALL_KNAUF_P11_SHA256_R1 =
  "822c9d46f2c9d4eb9209ff47569b148374e4bbe06b1343cfef1336ebb43a3fed" as const;

export type Batch001DrywallPassportOperationR1 = "FRAME" | "ALIGN" | "CLAD";
export type Batch001DrywallPassportVariantR1 =
  | "standard"
  | "large_area"
  | "small_area"
  | "technical_room"
  | "wet_zone"
  | "high_load";

type MaterialKeyR1 =
  | "ceiling_profile_pp_60_27"
  | "guide_profile_pn_28_27"
  | "self_supporting_profile"
  | "adjustable_suspension"
  | "suspension_anchor"
  | "profile_extension"
  | "single_level_connector"
  | "two_level_connector"
  | "profile_screw_ln_9"
  | "separation_tape"
  | "control_joint_profile"
  | "opening_frame_profile"
  | "opening_frame_fastener"
  | "frame_corrosion_protection"
  | "alignment_shim"
  | "gypsum_board_12_5"
  | "board_screw_tn"
  | "paper_joint_tape"
  | "joint_compound"
  | "surface_primer"
  | "finish_putty"
  | "external_corner_profile"
  | "cut_edge_primer"
  | "acoustic_fire_insulation"
  | "acoustic_fire_sealant"
  | "waterproof_primer"
  | "waterproof_membrane"
  | "waterproof_tape"
  | "penetration_cuff"
  | "penetration_sealant";

type OperationKeyR1 =
  | "install_frame"
  | "align_frame"
  | "install_boards"
  | "finish_joints"
  | "prepare_surface"
  | "form_control_joints"
  | "frame_openings"
  | "seal_openings"
  | "waterproof_surface";

export type Batch001DrywallTechnologyDeltaR1 = {
  catalogId: string;
  operation: Batch001DrywallPassportOperationR1;
  variant: Batch001DrywallPassportVariantR1;
  publicWorkTitleRu: string;
  applicabilityRu: readonly string[];
  requiredMaterialKeys: readonly MaterialKeyR1[];
  conditionalMaterialKeys: readonly MaterialKeyR1[];
  operationKeys: readonly OperationKeyR1[];
  deltaReasonRu: string;
};

type MaterialSeedR1 = {
  familyId: MaterialKeyR1;
  titleRu: string;
  purposeRu: string;
  stageId: string;
  specificationRequirementRu: string;
  sourceIds: readonly string[];
  inclusionCondition: string;
  exclusionCondition: string;
  exclusionReasonRu: string;
};

type ResolvedMaterialSeedR33 = MaterialSeedR1 & {
  selectionResolutionR33: TechnologyPassportMaterialSelectionResolutionR33;
};

function resolveMaterialSeedR33(seed: MaterialSeedR1, catalogId: string): ResolvedMaterialSeedR33 {
  const selectionResolutionR33 = resolveDrywallMaterialSelectionR33({
    familyId: seed.familyId,
    catalogId,
    sourceIds: seed.sourceIds,
  });
  return {
    ...seed,
    titleRu: selectionResolutionR33.publicBoqTitleRu,
    specificationRequirementRu: selectionResolutionR33.plainHintRu,
    sourceIds: selectionResolutionR33.sourceIds,
    selectionResolutionR33,
  };
}

type OperationSeedR1 = {
  operationId: OperationKeyR1;
  titleRu: string;
  purposeRu: string;
  stageId: string;
  sourceIds: readonly string[];
};

const MASTER_SOURCE_ID = "MASTER_TZ_REAL_USEFUL_R1";
const KNAUF_P11_SOURCE_ID = "KNAUF_P11_2025";
const PROJECT_SYSTEM_SOURCE_ID = "PROJECT_SYSTEM_SPECIFICATION_REQUIRED_R1";

const BASE_SOURCE_IDS = [KNAUF_P11_SOURCE_ID, PROJECT_SYSTEM_SOURCE_ID] as const;
const MASTER_AND_PROJECT_SOURCE_IDS = [MASTER_SOURCE_ID, PROJECT_SYSTEM_SOURCE_ID] as const;

const MATERIALS: Readonly<Record<MaterialKeyR1, MaterialSeedR1>> = {
  ceiling_profile_pp_60_27: {
    familyId: "ceiling_profile_pp_60_27",
    titleRu: "Профиль потолочный оцинкованный ПП 60×27 мм",
    purposeRu: "Основные и несущие элементы металлического каркаса потолочного короба.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать марку, размер 60×27 мм, толщину стали, длину поставки, защитное покрытие и совместимую систему.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "operation = FRAME",
    exclusionCondition: "operation != FRAME",
    exclusionReasonRu: "Профиль не закупается в отдельной операции выравнивания или обшивки принятого каркаса.",
  },
  guide_profile_pn_28_27: {
    familyId: "guide_profile_pn_28_27",
    titleRu: "Профиль направляющий оцинкованный ПН 28×27 мм",
    purposeRu: "Направляющий профиль одноуровневой схемы П113 и проектных примыканий.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать размер 28×27 мм, толщину стали, длину поставки и подтверждение применения в выбранной схеме.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "system_route = P113 OR project_detail_requires_PN_28_27 = true",
    exclusionCondition: "system_route != P113 AND project_detail_requires_PN_28_27 = false",
    exclusionReasonRu: "ПН 28×27 исключается, если выбранная схема и узлы примыканий его не предусматривают.",
  },
  self_supporting_profile: {
    familyId: "self_supporting_profile",
    titleRu: "Профиль оцинкованный самонесущего потолочного короба",
    purposeRu: "Формирование короткого самонесущего участка без подвесов по подтверждённому проектному узлу.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать тип профиля, ширину, высоту полок, толщину стали, расчётный пролёт и проектный узел.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "variant = small_area AND self_supporting_detail_confirmed = true",
    exclusionCondition: "variant != small_area OR self_supporting_detail_confirmed = false",
    exclusionReasonRu: "Самонесущий профиль запрещён без проектного узла и проверки допустимого пролёта.",
  },
  adjustable_suspension: {
    familyId: "adjustable_suspension",
    titleRu: "Подвес регулируемый для профиля ПП 60×27 мм",
    purposeRu: "Крепление и регулировка положения основного потолочного профиля относительно перекрытия.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать вид подвеса, диапазон регулировки, толщину стали, несущую способность и совместимый крепёж.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "suspended_frame = true",
    exclusionCondition: "suspended_frame = false",
    exclusionReasonRu: "Подвес исключается только для подтверждённого самонесущего или непосредственно закреплённого узла.",
  },
  suspension_anchor: {
    familyId: "suspension_anchor",
    titleRu: "Анкерный элемент крепления подвеса к несущему основанию",
    purposeRu: "Передача нагрузки от подвесного каркаса на подтверждённое бетонное или деревянное основание.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать тип и размер анкера, материал основания, расчётную нагрузку, глубину анкеровки и документ допуска.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "suspended_frame = true",
    exclusionCondition: "suspended_frame = false",
    exclusionReasonRu: "Анкер подвеса исключается вместе с подвесом только при подтверждённой иной схеме крепления.",
  },
  profile_extension: {
    familyId: "profile_extension",
    titleRu: "Удлинитель профиля ПП 60×27 мм",
    purposeRu: "Стыковка потолочных профилей при длине элемента больше длины поставки.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать совместимый тип, толщину стали и длину поставляемого профиля, от которой рассчитано число стыков.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "profile_joint_count > 0",
    exclusionCondition: "profile_joint_count = 0",
    exclusionReasonRu: "Удлинитель не нужен, если раскладка выполняется без продольных стыков профиля.",
  },
  single_level_connector: {
    familyId: "single_level_connector",
    titleRu: "Соединитель одноуровневый для профилей ПП 60×27 мм",
    purposeRu: "Соединение основных и несущих профилей в одной плоскости схемы П113.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать размер, толщину стали и совместимость с ПП 60×27 выбранной системы.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "system_route = P113",
    exclusionCondition: "system_route != P113",
    exclusionReasonRu: "Одноуровневый соединитель исключается для двухуровневой и самонесущей схемы.",
  },
  two_level_connector: {
    familyId: "two_level_connector",
    titleRu: "Соединитель двухуровневый для профилей ПП 60×27 мм",
    purposeRu: "Соединение основных и несущих профилей в разных уровнях схемы П112.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать размер, толщину стали и совместимость с ПП 60×27 выбранной системы.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "system_route = P112",
    exclusionCondition: "system_route != P112",
    exclusionReasonRu: "Двухуровневый соединитель исключается для одноуровневой и самонесущей схемы.",
  },
  profile_screw_ln_9: {
    familyId: "profile_screw_ln_9",
    titleRu: "Шуруп самонарезающий LN 9 мм для соединения стальных профилей",
    purposeRu: "Фиксация подвесов и соединителей к профилю в узлах выбранной системы.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать полный типоразмер, защитное покрытие и перечень узлов, где шуруп требуется паспортом системы.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "system_detail_requires_LN_9 = true",
    exclusionCondition: "system_detail_requires_LN_9 = false",
    exclusionReasonRu: "Шуруп LN 9 не добавляется процентом и исключается, если соединитель не требует дополнительной фиксации.",
  },
  separation_tape: {
    familyId: "separation_tape",
    titleRu: "Лента разделительная для примыкания гипсокартонного потолка",
    purposeRu: "Разделение шпаклёвочного шва потолка и примыкающей ограждающей конструкции.",
    stageId: "joint_finishing",
    specificationRequirementRu: "Указать материал, ширину, толщину, длину рулона и совместимость со шпаклёвкой выбранной системы.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "perimeter_joint_length_m > 0",
    exclusionCondition: "perimeter_joint_length_m = 0",
    exclusionReasonRu: "Лента исключается только при отсутствии соответствующего примыкания в scope.",
  },
  control_joint_profile: {
    familyId: "control_joint_profile",
    titleRu: "Профиль деформационного шва гипсокартонного потолка",
    purposeRu: "Формирование проектного деформационного шва большой площади без растрескивания отделки.",
    stageId: "joint_finishing",
    specificationRequirementRu: "Указать тип профиля, ширину, материал, длину поставки и проектный узел деформационного шва.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "control_joint_length_m > 0",
    exclusionCondition: "control_joint_length_m = 0",
    exclusionReasonRu: "Профиль не включается без проектной длины деформационного шва.",
  },
  opening_frame_profile: {
    familyId: "opening_frame_profile",
    titleRu: "Профиль оцинкованный обрамления инженерного прохода",
    purposeRu: "Усиление и геометрическое формирование подтверждённых проходов и люков.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать тип профиля, размеры сечения, толщину стали и узел обрамления конкретного прохода.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "technical_opening_count > 0",
    exclusionCondition: "technical_opening_count = 0",
    exclusionReasonRu: "Профиль обрамления исключается, если инженерных проходов и люков нет.",
  },
  opening_frame_fastener: {
    familyId: "opening_frame_fastener",
    titleRu: "Крепёж усиления обрамления инженерного прохода",
    purposeRu: "Фиксация дополнительных профилей вокруг подтверждённых проходов и люков.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать тип, диаметр или длину, защитное покрытие и число креплений каждого узла.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "technical_opening_count > 0",
    exclusionCondition: "technical_opening_count = 0",
    exclusionReasonRu: "Дополнительный крепёж исключается вместе с отсутствующим обрамлением проходов.",
  },
  frame_corrosion_protection: {
    familyId: "frame_corrosion_protection",
    titleRu: "Антикоррозионное покрытие мест реза стального профиля влажной зоны",
    purposeRu: "Восстановление защитного слоя на обработанных кромках стальных элементов.",
    stageId: "frame_installation",
    specificationRequirementRu: "Указать химический тип, толщину сухого слоя, расход, фасовку и совместимость с оцинкованной сталью.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "variant = wet_zone AND exposed_cut_length_m > 0",
    exclusionCondition: "variant != wet_zone OR exposed_cut_length_m = 0",
    exclusionReasonRu: "Отдельный состав исключается, если нет открытых резов или системный паспорт не требует восстановления покрытия.",
  },
  alignment_shim: {
    familyId: "alignment_shim",
    titleRu: "Прокладка регулировочная коррозионностойкая для потолочного каркаса",
    purposeRu: "Локальная коррекция принятого каркаса во влажной зоне по результатам измерений.",
    stageId: "alignment",
    specificationRequirementRu: "Указать материал, размеры, толщину, допустимую нагрузку и точный узел установки.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "variant = wet_zone AND adjustment_point_count > 0",
    exclusionCondition: "variant != wet_zone OR adjustment_point_count = 0",
    exclusionReasonRu: "Регулировочные прокладки исключаются, если измеряемых точек исправления нет.",
  },
  gypsum_board_12_5: {
    familyId: "gypsum_board_12_5",
    titleRu: "Лист гипсовый строительный 12,5 мм для потолочной системы",
    purposeRu: "Формирование проектной листовой обшивки принятого потолочного каркаса.",
    stageId: "board_installation",
    specificationRequirementRu: "Указать тип ГСП, толщину, ширину, длину листа, тип кромки, класс влажности/огнестойкости и системный паспорт.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "operation = CLAD",
    exclusionCondition: "operation != CLAD",
    exclusionReasonRu: "Лист не закупается в отдельной операции каркаса или его выравнивания.",
  },
  board_screw_tn: {
    familyId: "board_screw_tn",
    titleRu: "Шуруп самонарезающий TN для крепления гипсового листа к металлу",
    purposeRu: "Крепление каждого слоя листовой обшивки к профилю с шагом принятой системы.",
    stageId: "board_installation",
    specificationRequirementRu: "Указать тип TN, длину для каждого слоя, диаметр, покрытие и норму крепления системного паспорта.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "operation = CLAD",
    exclusionCondition: "operation != CLAD",
    exclusionReasonRu: "Крепёж листов не закупается в отдельной операции каркаса или выравнивания.",
  },
  paper_joint_tape: {
    familyId: "paper_joint_tape",
    titleRu: "Лента бумажная армирующая для швов гипсовых листов",
    purposeRu: "Армирование продольных и поперечных стыков листовой обшивки.",
    stageId: "joint_finishing",
    specificationRequirementRu: "Указать материал, ширину, длину рулона и совместимость со шпаклёвкой выбранной системы.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "joint_length_m > 0",
    exclusionCondition: "joint_length_m = 0",
    exclusionReasonRu: "Лента исключается только при доказанном отсутствии обрабатываемых стыков или иной принятой технологии шва.",
  },
  joint_compound: {
    familyId: "joint_compound",
    titleRu: "Шпаклёвочная смесь для швов гипсовых листов",
    purposeRu: "Заполнение стыков и углублений крепежа с принятой армирующей лентой.",
    stageId: "joint_finishing",
    specificationRequirementRu: "Указать вид смеси, область применения, совместимую ленту, расход, массу упаковки и TDS.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "joint_length_m > 0 OR fastener_count > 0",
    exclusionCondition: "joint_length_m = 0 AND fastener_count = 0",
    exclusionReasonRu: "Смесь исключается только при отсутствии швов и углублений крепежа в scope.",
  },
  surface_primer: {
    familyId: "surface_primer",
    titleRu: "Грунтовка поверхности гипсового листа перед отделкой",
    purposeRu: "Подготовка листовой поверхности под принятую финишную отделку.",
    stageId: "surface_preparation",
    specificationRequirementRu: "Указать тип основы, назначение, расход, объём упаковки, совместимость с листом и последующим покрытием.",
    sourceIds: BASE_SOURCE_IDS,
    inclusionCondition: "finish_scope_included = true",
    exclusionCondition: "finish_scope_included = false",
    exclusionReasonRu: "Грунтовка исключается, если подготовка под финишное покрытие явно находится вне scope.",
  },
  finish_putty: {
    familyId: "finish_putty",
    titleRu: "Шпаклёвочная смесь финишная для уровня поверхности Q2–Q4",
    purposeRu: "Доведение поверхности до явно выбранного уровня качества перед отделкой.",
    stageId: "surface_preparation",
    specificationRequirementRu: "Указать вид смеси, допустимую толщину слоя, расход, массу упаковки и требуемый уровень Q2, Q3 или Q4.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "surface_quality_level IN (Q2,Q3,Q4)",
    exclusionCondition: "surface_quality_level = Q1",
    exclusionReasonRu: "Финишная смесь не добавляется при принятом уровне Q1.",
  },
  external_corner_profile: {
    familyId: "external_corner_profile",
    titleRu: "Профиль углозащитный перфорированный оцинкованный",
    purposeRu: "Защита открытых наружных углов потолочного короба.",
    stageId: "joint_finishing",
    specificationRequirementRu: "Указать размер полок, толщину стали, длину изделия и совместимый способ закрепления.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "external_corner_length_m > 0",
    exclusionCondition: "external_corner_length_m = 0",
    exclusionReasonRu: "Углозащитный профиль исключается, если открытых наружных углов нет.",
  },
  cut_edge_primer: {
    familyId: "cut_edge_primer",
    titleRu: "Грунтовочный состав для резаных кромок гипсовых листов",
    purposeRu: "Подготовка подрезанных кромок малого короба перед заполнением шва.",
    stageId: "joint_finishing",
    specificationRequirementRu: "Указать химический тип, расход, фасовку и совместимость со шпаклёвочной системой.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "cut_edge_length_m > 0",
    exclusionCondition: "cut_edge_length_m = 0",
    exclusionReasonRu: "Состав исключается при отсутствии резаных кромок в scope.",
  },
  acoustic_fire_insulation: {
    familyId: "acoustic_fire_insulation",
    titleRu: "Плита минераловатная для акустического или огнезащитного заполнения",
    purposeRu: "Заполнение короба при подтверждённом акустическом или огнезащитном требовании.",
    stageId: "board_installation",
    specificationRequirementRu: "Указать толщину, плотность, класс горючести, акустические показатели, размеры плиты и проектное требование.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "acoustic_or_fire_fill_required = true",
    exclusionCondition: "acoustic_or_fire_fill_required = false",
    exclusionReasonRu: "Заполнение не добавляется без проектного акустического или огнезащитного требования.",
  },
  acoustic_fire_sealant: {
    familyId: "acoustic_fire_sealant",
    titleRu: "Герметик огнестойкий или акустический для инженерных проходов",
    purposeRu: "Герметизация подтверждённых проходов с требуемым пределом огнестойкости или звукоизоляции.",
    stageId: "joint_finishing",
    specificationRequirementRu: "Указать химический тип, класс огнестойкости или акустические свойства, ширину шва, объём упаковки и системный узел.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "technical_opening_count > 0 AND rated_sealing_required = true",
    exclusionCondition: "technical_opening_count = 0 OR rated_sealing_required = false",
    exclusionReasonRu: "Специальный герметик исключается без проходов или нормируемого требования к их заделке.",
  },
  waterproof_primer: {
    familyId: "waterproof_primer",
    titleRu: "Грунтовка основания под обмазочную гидроизоляцию",
    purposeRu: "Подготовка листовой поверхности прямой влажной зоны к гидроизоляции.",
    stageId: "waterproofing",
    specificationRequirementRu: "Указать тип основы, расход, объём упаковки и совместимость с листом и гидроизоляционной мастикой.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "direct_wet_exposure = true",
    exclusionCondition: "direct_wet_exposure = false",
    exclusionReasonRu: "Гидроизоляционная грунтовка исключается для обычного технического помещения без прямого увлажнения.",
  },
  waterproof_membrane: {
    familyId: "waterproof_membrane",
    titleRu: "Гидроизоляция обмазочная полимерная для гипсового основания",
    purposeRu: "Создание сплошного водозащитного слоя прямой влажной зоны.",
    stageId: "waterproofing",
    specificationRequirementRu: "Указать химический тип, число слоёв, расход, массу упаковки, допустимое основание и TDS системы.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "direct_wet_exposure = true",
    exclusionCondition: "direct_wet_exposure = false",
    exclusionReasonRu: "Обмазочная гидроизоляция исключается без прямого влажностного воздействия.",
  },
  waterproof_tape: {
    familyId: "waterproof_tape",
    titleRu: "Лента гидроизоляционная для углов и примыканий 120 мм",
    purposeRu: "Армирование водозащитного слоя в углах и примыканиях.",
    stageId: "waterproofing",
    specificationRequirementRu: "Указать ширину, материал, длину рулона и совместимость с выбранной обмазочной гидроизоляцией.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "direct_wet_exposure = true AND waterproof_joint_length_m > 0",
    exclusionCondition: "direct_wet_exposure = false OR waterproof_joint_length_m = 0",
    exclusionReasonRu: "Лента исключается без прямого увлажнения или гидроизолируемых углов и примыканий.",
  },
  penetration_cuff: {
    familyId: "penetration_cuff",
    titleRu: "Манжета гидроизоляционная для инженерной проходки",
    purposeRu: "Герметизация подтверждённой проходки в водозащитном слое.",
    stageId: "waterproofing",
    specificationRequirementRu: "Указать внутренний и наружный размер, материал и диапазон диаметра проходки.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "direct_wet_exposure = true AND wet_penetration_count > 0",
    exclusionCondition: "direct_wet_exposure = false OR wet_penetration_count = 0",
    exclusionReasonRu: "Манжета исключается без прямого увлажнения или проходок.",
  },
  penetration_sealant: {
    familyId: "penetration_sealant",
    titleRu: "Герметик эластичный для проходок листовой обшивки",
    purposeRu: "Герметизация зазора вокруг подтверждённых инженерных проходов.",
    stageId: "joint_finishing",
    specificationRequirementRu: "Указать химический тип, допустимую ширину шва, объём упаковки и совместимость с листом и проходкой.",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "technical_opening_count > 0",
    exclusionCondition: "technical_opening_count = 0",
    exclusionReasonRu: "Герметик проходок исключается, если проходов в scope нет.",
  },
};

const CONDITION_INPUTS: Readonly<Record<string, {
  titleRu: string;
  guideRu: string;
  unitId: string | null;
}>> = {
  system_route: {
    titleRu: "Схема выбранной потолочной системы",
    guideRu: "Выберите П112, П113 либо укажите проектный эквивалент с точным паспортом и схемой соединителей.",
    unitId: null,
  },
  project_detail_requires_PN_28_27: {
    titleRu: "Направляющий профиль ПН 28×27 предусмотрен узлом",
    guideRu: "Подтвердите наличие ПН 28×27 точным проектным узлом примыкания или паспортом выбранной системы.",
    unitId: null,
  },
  self_supporting_detail_confirmed: {
    titleRu: "Самонесущий узел подтверждён проектом",
    guideRu: "Подтвердите расчётный пролёт и точный узел самонесущего малого короба; иначе используйте подвесную схему.",
    unitId: null,
  },
  suspended_frame: {
    titleRu: "Каркас закрепляется подвесами",
    guideRu: "Укажите, является ли выбранная схема подвесной; значение должно соответствовать системному паспорту и проектному узлу.",
    unitId: null,
  },
  profile_joint_count: {
    titleRu: "Количество продольных стыков потолочного профиля",
    guideRu: "Введите число стыков из карты раскладки с учётом фактической длины поставляемого профиля.",
    unitId: "item",
  },
  system_detail_requires_LN_9: {
    titleRu: "Соединения требуют шурупов LN 9",
    guideRu: "Подтвердите по системному узлу, нужна ли дополнительная фиксация подвесов или соединителей шурупами LN 9.",
    unitId: null,
  },
  perimeter_joint_length_m: {
    titleRu: "Длина примыканий с разделительной лентой",
    guideRu: "Введите измеренную длину примыкания листовой поверхности к ограждающей конструкции.",
    unitId: "m",
  },
  control_joint_length_m: {
    titleRu: "Длина проектных деформационных швов",
    guideRu: "Введите длину швов только по проектной карте; универсальный процент от площади не применяется.",
    unitId: "m",
  },
  technical_opening_count: {
    titleRu: "Количество инженерных проходов и люков",
    guideRu: "Введите фактическое число проходов и люков по координационному чертежу или обмеру.",
    unitId: "item",
  },
  exposed_cut_length_m: {
    titleRu: "Длина открытых резов стального профиля",
    guideRu: "Введите длину резаных кромок, для которых паспорт системы требует восстановления защитного покрытия.",
    unitId: "m",
  },
  adjustment_point_count: {
    titleRu: "Количество точек регулировки каркаса",
    guideRu: "Введите число точек, где измерения подтвердили необходимость отдельной корректировки принятого каркаса.",
    unitId: "item",
  },
  joint_length_m: {
    titleRu: "Длина обрабатываемых стыков листов",
    guideRu: "Введите суммарную длину продольных и поперечных стыков по раскладке листов.",
    unitId: "m",
  },
  fastener_count: {
    titleRu: "Количество мест крепления листов",
    guideRu: "Введите число креплений из площади, шага и числа слоёв выбранной системы.",
    unitId: "item",
  },
  finish_scope_included: {
    titleRu: "Подготовка поверхности под отделку входит в работу",
    guideRu: "Укажите, включены ли грунтование и подготовка поверхности в текущий физический scope.",
    unitId: null,
  },
  surface_quality_level: {
    titleRu: "Требуемый уровень подготовки поверхности",
    guideRu: "Выберите Q1, Q2, Q3 или Q4 по отделочному заданию; от выбора зависит финишная шпаклёвка.",
    unitId: null,
  },
  external_corner_length_m: {
    titleRu: "Длина открытых наружных углов",
    guideRu: "Введите измеренную длину углов, которым действительно требуется отдельный углозащитный профиль.",
    unitId: "m",
  },
  cut_edge_length_m: {
    titleRu: "Длина резаных кромок гипсовых листов",
    guideRu: "Введите суммарную длину подрезанных кромок по фактической раскладке малого короба.",
    unitId: "m",
  },
  acoustic_or_fire_fill_required: {
    titleRu: "Требуется акустическое или огнезащитное заполнение",
    guideRu: "Подтвердите требование проектом с точными толщиной, плотностью и классом выбранной минераловатной плиты.",
    unitId: null,
  },
  rated_sealing_required: {
    titleRu: "Для проходов требуется нормируемая заделка",
    guideRu: "Подтвердите требуемый предел огнестойкости или акустический показатель узла проходки.",
    unitId: null,
  },
  direct_wet_exposure: {
    titleRu: "Поверхность находится в зоне прямого увлажнения",
    guideRu: "Отличите прямую влажную зону от обычного технического помещения; гидроизоляция без этого признака не добавляется.",
    unitId: null,
  },
  waterproof_joint_length_m: {
    titleRu: "Длина гидроизолируемых углов и примыканий",
    guideRu: "Введите длину углов и примыканий, где по схеме гидроизоляции требуется армирующая лента.",
    unitId: "m",
  },
  wet_penetration_count: {
    titleRu: "Количество проходок в гидроизолируемой поверхности",
    guideRu: "Введите число трубных или кабельных проходок, которым требуются отдельные гидроизоляционные манжеты.",
    unitId: "item",
  },
};

const OPERATIONS: Readonly<Record<OperationKeyR1, OperationSeedR1>> = {
  install_frame: {
    operationId: "install_frame",
    titleRu: "Монтаж профилей, подвесов и соединителей металлического каркаса потолочного короба",
    purposeRu: "Получить закреплённый металлический каркас проектной геометрии.",
    stageId: "frame_installation",
    sourceIds: BASE_SOURCE_IDS,
  },
  align_frame: {
    operationId: "align_frame",
    titleRu: "Выравнивание принятого каркаса потолочного короба в проектной плоскости",
    purposeRu: "Получить измеряемую проектную плоскость каркаса до обшивки.",
    stageId: "alignment",
    sourceIds: BASE_SOURCE_IDS,
  },
  install_boards: {
    operationId: "install_boards",
    titleRu: "Раскрой и крепление гипсовых листов к принятому потолочному каркасу",
    purposeRu: "Сформировать листовую поверхность заданной площади и числа слоёв.",
    stageId: "board_installation",
    sourceIds: BASE_SOURCE_IDS,
  },
  finish_joints: {
    operationId: "finish_joints",
    titleRu: "Армирование и шпаклевание швов, кромок и мест крепления гипсовых листов",
    purposeRu: "Получить непрерывные обработанные стыки и закрытые углубления крепежа.",
    stageId: "joint_finishing",
    sourceIds: BASE_SOURCE_IDS,
  },
  prepare_surface: {
    operationId: "prepare_surface",
    titleRu: "Грунтование и шпаклевание листовой поверхности до выбранного уровня Q1–Q4",
    purposeRu: "Подготовить измеряемую поверхность к принятому финишному покрытию.",
    stageId: "surface_preparation",
    sourceIds: BASE_SOURCE_IDS,
  },
  form_control_joints: {
    operationId: "form_control_joints",
    titleRu: "Устройство проектных деформационных швов потолочного короба",
    purposeRu: "Разделить большую поверхность по проектной карте деформационных швов.",
    stageId: "joint_finishing",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
  },
  frame_openings: {
    operationId: "frame_openings",
    titleRu: "Обрамление профилями инженерных проходов и люков потолочного короба",
    purposeRu: "Сформировать усиленные проёмы заданного количества и периметра.",
    stageId: "frame_installation",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
  },
  seal_openings: {
    operationId: "seal_openings",
    titleRu: "Герметизация инженерных проходов в листовой обшивке",
    purposeRu: "Закрыть измеряемый периметр проходок принятой герметизирующей системой.",
    stageId: "joint_finishing",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
  },
  waterproof_surface: {
    operationId: "waterproof_surface",
    titleRu: "Устройство обмазочной гидроизоляции листовой поверхности прямой влажной зоны",
    purposeRu: "Получить непрерывный водозащитный слой с обработанными углами и проходками.",
    stageId: "waterproofing",
    sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
  },
};

const FRAME_REQUIRED = [
  "ceiling_profile_pp_60_27",
  "adjustable_suspension",
  "suspension_anchor",
] as const satisfies readonly MaterialKeyR1[];
const FRAME_CONDITIONAL = [
  "guide_profile_pn_28_27",
  "profile_extension",
  "single_level_connector",
  "two_level_connector",
  "profile_screw_ln_9",
] as const satisfies readonly MaterialKeyR1[];
const CLAD_REQUIRED = [
  "gypsum_board_12_5",
  "board_screw_tn",
  "paper_joint_tape",
  "joint_compound",
] as const satisfies readonly MaterialKeyR1[];
const CLAD_CONDITIONAL = [
  "separation_tape",
  "surface_primer",
  "finish_putty",
  "external_corner_profile",
] as const satisfies readonly MaterialKeyR1[];

/** Explicit per-work deltas. No delta is inferred from a runtime resource list. */
export const BATCH001_DRYWALL_TECHNOLOGY_DELTAS_R1: readonly Batch001DrywallTechnologyDeltaR1[] = [
  {
    catalogId: "drywall_ceiling_interior_bulkhead_frame_large_area", operation: "FRAME", variant: "large_area",
    publicWorkTitleRu: "Монтаж каркаса потолочного короба большой площади",
    applicabilityRu: ["Двухуровневый или проектный металлический каркас большой площади с явной картой деформационных швов."],
    requiredMaterialKeys: FRAME_REQUIRED,
    conditionalMaterialKeys: [...FRAME_CONDITIONAL, "control_joint_profile"],
    operationKeys: ["install_frame", "form_control_joints"],
    deltaReasonRu: "Большая площадь добавляет проектные деформационные швы; их длина не наследуется от стандартного варианта.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_frame_small_area", operation: "FRAME", variant: "small_area",
    publicWorkTitleRu: "Монтаж каркаса малого потолочного короба",
    applicabilityRu: ["Малый короб с явным выбором подвесной либо подтверждённой самонесущей схемы."],
    requiredMaterialKeys: FRAME_REQUIRED,
    conditionalMaterialKeys: [...FRAME_CONDITIONAL, "self_supporting_profile"],
    operationKeys: ["install_frame"],
    deltaReasonRu: "Самонесущий профиль допускается только как отдельная подтверждённая ветвь, без одновременного подвесного каркаса.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_frame_standard", operation: "FRAME", variant: "standard",
    publicWorkTitleRu: "Монтаж стандартного каркаса потолочного короба",
    applicabilityRu: ["Стандартный потолочный короб по выбранной системе П112, П113 либо проектному эквиваленту."],
    requiredMaterialKeys: FRAME_REQUIRED,
    conditionalMaterialKeys: FRAME_CONDITIONAL,
    operationKeys: ["install_frame"],
    deltaReasonRu: "Стандартный вариант не получает материалы специальных зон без доказанного условия.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_frame_technical_room", operation: "FRAME", variant: "technical_room",
    publicWorkTitleRu: "Монтаж каркаса потолочного короба технического помещения",
    applicabilityRu: ["Каркас с подтверждёнными инженерными проходами или люками технического помещения."],
    requiredMaterialKeys: FRAME_REQUIRED,
    conditionalMaterialKeys: [...FRAME_CONDITIONAL, "opening_frame_profile", "opening_frame_fastener"],
    operationKeys: ["install_frame", "frame_openings"],
    deltaReasonRu: "Обрамление добавляется по фактическому числу и периметру проходов, а не универсальным комплектом.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_frame_wet_zone", operation: "FRAME", variant: "wet_zone",
    publicWorkTitleRu: "Монтаж каркаса потолочного короба влажной зоны",
    applicabilityRu: ["Металлический каркас влажной зоны с явным классом воздействия и защитой мест реза по проекту системы."],
    requiredMaterialKeys: FRAME_REQUIRED,
    conditionalMaterialKeys: [...FRAME_CONDITIONAL, "frame_corrosion_protection"],
    operationKeys: ["install_frame"],
    deltaReasonRu: "Антикоррозионный состав учитывается только для открытых резов и подтверждённого требования системы.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_align_large_area", operation: "ALIGN", variant: "large_area",
    publicWorkTitleRu: "Выравнивание каркаса потолочного короба большой площади",
    applicabilityRu: ["Отдельно измеряемая корректировка уже принятого каркаса по захваткам нивелирования."],
    requiredMaterialKeys: [], conditionalMaterialKeys: [], operationKeys: ["align_frame"],
    deltaReasonRu: "Выравнивание не наследует повторную закупку профилей и подвесов из FRAME.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_align_small_area", operation: "ALIGN", variant: "small_area",
    publicWorkTitleRu: "Выравнивание каркаса малого потолочного короба",
    applicabilityRu: ["Локальная измеряемая корректировка коротких граней и углов принятого каркаса."],
    requiredMaterialKeys: [], conditionalMaterialKeys: [], operationKeys: ["align_frame"],
    deltaReasonRu: "Малый вариант отличается числом локальных точек, но не создаёт универсальный комплект материалов.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_align_standard", operation: "ALIGN", variant: "standard",
    publicWorkTitleRu: "Выравнивание стандартного каркаса потолочного короба",
    applicabilityRu: ["Отдельная корректировка принятого каркаса до проектной плоскости перед обшивкой."],
    requiredMaterialKeys: [], conditionalMaterialKeys: [], operationKeys: ["align_frame"],
    deltaReasonRu: "Стандартный ALIGN содержит только физическую операцию и не дублирует стоимость FRAME.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_align_technical_room", operation: "ALIGN", variant: "technical_room",
    publicWorkTitleRu: "Выравнивание каркаса потолочного короба у инженерных проходов",
    applicabilityRu: ["Локальная корректировка принятого каркаса возле подтверждённых вводов и люков."],
    requiredMaterialKeys: [], conditionalMaterialKeys: [], operationKeys: ["align_frame"],
    deltaReasonRu: "Число препятствий является отдельным параметром; новые профили относятся к FRAME, если действительно нужны.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_align_wet_zone", operation: "ALIGN", variant: "wet_zone",
    publicWorkTitleRu: "Выравнивание каркаса потолочного короба влажной зоны",
    applicabilityRu: ["Корректировка принятого каркаса влажной зоны с подсчитанными точками регулировки."],
    requiredMaterialKeys: [], conditionalMaterialKeys: ["alignment_shim"], operationKeys: ["align_frame"],
    deltaReasonRu: "Коррозионностойкая прокладка добавляется по точкам коррекции и точному узлу, а не комплектом расходников.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_clad_high_load", operation: "CLAD", variant: "high_load",
    publicWorkTitleRu: "Обшивка усиленного потолочного короба гипсовыми листами",
    applicabilityRu: ["Обшивка с подтверждённым классом нагрузки, типом листа и принятой ревизией усиленного каркаса."],
    requiredMaterialKeys: CLAD_REQUIRED,
    conditionalMaterialKeys: [...CLAD_CONDITIONAL, "acoustic_fire_insulation"],
    operationKeys: ["install_boards", "finish_joints", "prepare_surface"],
    deltaReasonRu: "Класс нагрузки и выбранный лист задаются проектом; обычный лист не подставляется скрытым default.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_clad_large_area", operation: "CLAD", variant: "large_area",
    publicWorkTitleRu: "Обшивка потолочного короба большой площади гипсовыми листами",
    applicabilityRu: ["Листовая обшивка большой площади с явной картой деформационных швов."],
    requiredMaterialKeys: CLAD_REQUIRED,
    conditionalMaterialKeys: [...CLAD_CONDITIONAL, "control_joint_profile"],
    operationKeys: ["install_boards", "finish_joints", "form_control_joints", "prepare_surface"],
    deltaReasonRu: "Профиль шва и отдельная операция включаются только по проектной длине швов.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_clad_small_area", operation: "CLAD", variant: "small_area",
    publicWorkTitleRu: "Обшивка малого потолочного короба гипсовыми листами",
    applicabilityRu: ["Листовая обшивка малого короба с измеренной длиной подрезанных кромок."],
    requiredMaterialKeys: CLAD_REQUIRED,
    conditionalMaterialKeys: [...CLAD_CONDITIONAL, "cut_edge_primer"],
    operationKeys: ["install_boards", "finish_joints", "prepare_surface"],
    deltaReasonRu: "Обработка резаных кромок считается по их длине; универсальная строка расходников запрещена.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_clad_standard", operation: "CLAD", variant: "standard",
    publicWorkTitleRu: "Обшивка стандартного потолочного короба гипсовыми листами",
    applicabilityRu: ["Обшивка принятого стандартного каркаса точным типом, размером и числом слоёв гипсового листа."],
    requiredMaterialKeys: CLAD_REQUIRED,
    conditionalMaterialKeys: CLAD_CONDITIONAL,
    operationKeys: ["install_boards", "finish_joints", "prepare_surface"],
    deltaReasonRu: "Стандартный вариант не наследует специальные материалы влажной, технической или высоконагруженной зоны.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_clad_technical_room", operation: "CLAD", variant: "technical_room",
    publicWorkTitleRu: "Обшивка потолочного короба технического помещения гипсовыми листами",
    applicabilityRu: ["Обшивка с подтверждёнными инженерными проходами и требованиями к их герметизации."],
    requiredMaterialKeys: CLAD_REQUIRED,
    conditionalMaterialKeys: [...CLAD_CONDITIONAL, "opening_frame_profile", "opening_frame_fastener", "acoustic_fire_sealant", "penetration_sealant"],
    operationKeys: ["install_boards", "finish_joints", "seal_openings", "prepare_surface"],
    deltaReasonRu: "Материалы проходок включаются по топологии и классу заделки, а не одной строкой совместимого состава.",
  },
  {
    catalogId: "drywall_ceiling_interior_bulkhead_clad_wet_zone", operation: "CLAD", variant: "wet_zone",
    publicWorkTitleRu: "Обшивка потолочного короба влажной зоны влагостойкими гипсовыми листами",
    applicabilityRu: ["Влагостойкая обшивка с отдельным признаком прямого увлажнения и выбранной гидроизоляционной системой."],
    requiredMaterialKeys: CLAD_REQUIRED,
    conditionalMaterialKeys: [
      ...CLAD_CONDITIONAL,
      "waterproof_primer",
      "waterproof_membrane",
      "waterproof_tape",
      "penetration_cuff",
      "penetration_sealant",
    ],
    operationKeys: ["install_boards", "finish_joints", "waterproof_surface", "prepare_surface"],
    deltaReasonRu: "Влагостойкий лист обязателен по точной спецификации; гидроизоляция включается только для прямой влажной зоны.",
  },
] as const;

const EXPECTED_CATALOG_COUNT = 16;

function unique<T>(items: readonly T[]): readonly T[] {
  return [...new Set(items)];
}

function stagesFor(delta: Batch001DrywallTechnologyDeltaR1): readonly TechnologyPassportStageR1[] {
  const all: readonly TechnologyPassportStageR1[] = [
    { stageId: "frame_installation", sequence: 1, titleRu: "Монтаж каркаса", resultRu: "Закреплённый металлический каркас проектной геометрии." },
    { stageId: "alignment", sequence: 2, titleRu: "Выравнивание каркаса", resultRu: "Принятый каркас в проектной плоскости." },
    { stageId: "board_installation", sequence: 3, titleRu: "Монтаж листов", resultRu: "Закреплённая листовая поверхность заданной площади." },
    { stageId: "joint_finishing", sequence: 4, titleRu: "Обработка швов и узлов", resultRu: "Армированные и заполненные швы, кромки и проходки." },
    { stageId: "waterproofing", sequence: 5, titleRu: "Гидроизоляция", resultRu: "Непрерывный водозащитный слой прямой влажной зоны." },
    { stageId: "surface_preparation", sequence: 6, titleRu: "Подготовка поверхности", resultRu: "Поверхность принятого уровня Q1–Q4." },
    { stageId: "logistics", sequence: 7, titleRu: "Доставка", resultRu: "Материалы доставлены одним доказанным грузопотоком без дубля." },
  ];
  const needed = new Set<string>(delta.operation === "ALIGN" ? [] : ["logistics"]);
  delta.requiredMaterialKeys.forEach((key) => needed.add(MATERIALS[key].stageId));
  delta.conditionalMaterialKeys.forEach((key) => needed.add(MATERIALS[key].stageId));
  delta.operationKeys.forEach((key) => needed.add(OPERATIONS[key].stageId));
  return all.filter((stage) => needed.has(stage.stageId)).map((stage, index) => ({ ...stage, sequence: index + 1 }));
}

function materialFormulaId(familyId: MaterialKeyR1): string {
  return `material-gross:${familyId}`;
}

function materialExpectationId(familyId: MaterialKeyR1): string {
  return `material:${familyId}`;
}

function materialFormula(seed: ResolvedMaterialSeedR33): TechnologyPassportFormulaR1 {
  return {
    formulaId: materialFormulaId(seed.familyId),
    expressionSource: `result_area_m2 × norm_${seed.familyId} × (1 + loss_${seed.familyId}_percent / 100)`,
    inputParameterIds: ["result_area_m2", `norm_${seed.familyId}`, `loss_${seed.familyId}_percent`],
    outputUnitId: seed.selectionResolutionR33.materialUnitId,
    roundingRule: "Расчётное количество сохраняется без скрытого округления; закупка округляется только правилом упаковки.",
    lossRule: `Потери вводятся явно параметром loss_${seed.familyId}_percent с provenance выбранной системы.`,
    normSourceIds: seed.sourceIds,
  };
}

function requiredMaterial(seed: ResolvedMaterialSeedR33): TechnologyPassportMaterialFamilyR1 {
  return {
    expectationId: materialExpectationId(seed.familyId),
    familyId: seed.familyId,
    stageId: seed.stageId,
    titleRu: seed.titleRu,
    purposeRu: seed.purposeRu,
    formulaId: materialFormulaId(seed.familyId),
    normSourceIds: seed.sourceIds,
    inclusionCondition: seed.inclusionCondition,
    specificationRequirementRu: seed.specificationRequirementRu,
    procurementRuleId: `procurement:${seed.familyId}`,
    selectionResolutionR33: seed.selectionResolutionR33,
  };
}

function conditionalMaterial(seed: ResolvedMaterialSeedR33): TechnologyPassportConditionalMaterialFamilyR1 {
  return {
    ...requiredMaterial(seed),
    exclusionId: `exclude:material:${seed.familyId}`,
  };
}

function operation(seed: OperationSeedR1): TechnologyPassportConstructionOperationR1 {
  return {
    expectationId: `operation:${seed.operationId}`,
    operationId: seed.operationId,
    stageId: seed.stageId,
    titleRu: seed.titleRu,
    purposeRu: seed.purposeRu,
    formulaId: `operation-quantity:${seed.operationId}`,
    normSourceIds: seed.sourceIds,
    inclusionCondition: "Работа входит в выбранный catalog_id и имеет положительный физический объём.",
    required: true,
  };
}

function equipmentRules(primaryOperation: OperationSeedR1): readonly TechnologyPassportEquipmentRuleR1[] {
  const common = {
    stageId: primaryOperation.stageId,
    purposeRu: "Обеспечить безопасный доступ к измеряемой операции на заданной рабочей высоте.",
    formulaId: "equipment-shifts:access",
    normSourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    operationId: primaryOperation.operationId,
    mutuallyExclusiveGroupId: "batch001-access-method",
  } as const;
  return [
    {
      ...common,
      expectationId: "equipment:mobile_tower_5m",
      equipmentRuleId: "mobile_tower_5m",
      titleRu: `Вышка-тура передвижная, рабочая высота 5 м — доступ к операции «${primaryOperation.titleRu}»`,
      equipmentClassRu: "Вышка-тура передвижная",
      keyCharacteristicsRu: ["рабочая высота 5 м"],
      inclusionCondition: "access_method = TOWER_5M",
    },
    {
      ...common,
      expectationId: "equipment:self_propelled_scissor_lift_8m_230kg",
      equipmentRuleId: "self_propelled_scissor_lift_8m_230kg",
      titleRu: `Подъёмник ножничный самоходный, рабочая высота 8 м, платформа 230 кг — доступ к операции «${primaryOperation.titleRu}»`,
      equipmentClassRu: "Подъёмник ножничный самоходный",
      keyCharacteristicsRu: ["рабочая высота 8 м", "грузоподъёмность платформы 230 кг"],
      inclusionCondition: "access_method = SCISSOR_8M_230KG",
    },
  ];
}

function deliveryFlow(delta: Batch001DrywallTechnologyDeltaR1): TechnologyPassportDeliveryFlowR1 | null {
  const familyIds = [...delta.requiredMaterialKeys, ...delta.conditionalMaterialKeys];
  if (delta.operation === "ALIGN" || familyIds.length === 0) return null;
  const cargo = delta.operation === "FRAME" ? "профилей, подвесов и крепежа" : "гипсовых листов и отделочных материалов";
  return {
    expectationId: "delivery:batch001-materials-5t",
    deliveryFlowId: "batch001-materials-5t",
    stageId: "logistics",
    titleRu: `Доставка ${cargo} бортовым автомобилем грузоподъёмностью 5 т`,
    purposeRu: "Доставить точный закупочный состав одним грузопотоком без повторного начисления перевозки.",
    formulaId: "delivery-tonne-kilometres",
    normSourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    inclusionCondition: "delivery_included_by_supplier = false",
    cargoFamilyIds: familyIds,
    vehicleTypeRu: "Бортовой грузовой автомобиль",
    capacityRequirementRu: "грузоподъёмность 5 т",
    distanceParameterId: "delivery_distance_km",
    deduplicationKey: `${delta.catalogId}:materials:board-truck-5t`,
  };
}

function materialInputs(materials: readonly ResolvedMaterialSeedR33[]): readonly TechnologyPassportParameterR1[] {
  return materials.flatMap((seed): readonly TechnologyPassportParameterR1[] => {
    const expectationId = materialExpectationId(seed.familyId);
    const formulaId = materialFormulaId(seed.familyId);
    return [
      {
        parameterId: seed.selectionResolutionR33.selectionParameterId,
        titleRu: seed.selectionResolutionR33.selectionParameterTitleRu,
        guideRu: seed.selectionResolutionR33.plainHintRu,
        unitId: null,
        required: seed.selectionResolutionR33.confirmationRequired,
        acceptedDefault: seed.selectionResolutionR33.preliminaryValueRu,
        defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID,
        formulaConsumerIds: [],
        expectationConsumerIds: [expectationId],
      },
      {
        parameterId: `norm_${seed.familyId}`,
        titleRu: `Норма расхода: ${seed.titleRu}`,
        guideRu: "Введите норму выбранной системы на единицу физического результата и приложите точный источник.",
        unitId: `${seed.selectionResolutionR33.materialUnitId}_per_m2`,
        required: false,
        acceptedDefault: seed.selectionResolutionR33.preliminaryNormPerResultUnit,
        defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID,
        formulaConsumerIds: [formulaId],
        expectationConsumerIds: [expectationId],
      },
      {
        parameterId: `loss_${seed.familyId}_percent`,
        titleRu: `Потери или запас, %: ${seed.titleRu}`,
        guideRu: "Введите отдельно обоснованный процент раскроя или технологических потерь; скрытого универсального запаса нет.",
        unitId: "percent",
        required: false,
        acceptedDefault: seed.selectionResolutionR33.preliminaryLossPercent,
        defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID,
        formulaConsumerIds: [formulaId],
        expectationConsumerIds: [expectationId],
      },
      {
        parameterId: `package_size_${seed.familyId}`,
        titleRu: `Размер упаковки: ${seed.titleRu}`,
        guideRu: "Введите фактическое число единиц в листе, пачке, рулоне, мешке или другой упаковке выбранной позиции.",
        unitId: seed.selectionResolutionR33.materialUnitId,
        required: false,
        acceptedDefault: seed.selectionResolutionR33.preliminaryPackageSize,
        defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID,
        formulaConsumerIds: [],
        expectationConsumerIds: [expectationId],
      },
    ];
  });
}

function conditionInputs(materials: readonly ResolvedMaterialSeedR33[]): readonly TechnologyPassportParameterR1[] {
  const consumers = new Map<string, Set<string>>();
  for (const seed of materials) {
    const expression = `${seed.inclusionCondition} ${seed.exclusionCondition}`;
    for (const parameterId of Object.keys(CONDITION_INPUTS)) {
      if (!new RegExp(`(?:^|[^A-Za-z0-9_])${parameterId}(?:$|[^A-Za-z0-9_])`, "u").test(expression)) continue;
      const ids = consumers.get(parameterId) ?? new Set<string>();
      ids.add(materialExpectationId(seed.familyId));
      consumers.set(parameterId, ids);
    }
  }
  return [...consumers.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([parameterId, ids]) => {
    const metadata = CONDITION_INPUTS[parameterId];
    if (!metadata) throw new Error(`BATCH001_R1_CONDITION_INPUT_METADATA_MISSING:${parameterId}`);
    return {
      parameterId,
      titleRu: metadata.titleRu,
      guideRu: metadata.guideRu,
      unitId: metadata.unitId,
      required: true,
      acceptedDefault: null,
      defaultProvenanceId: null,
      formulaConsumerIds: [],
      expectationConsumerIds: [...ids].sort(),
    };
  });
}

function baseInputs(input: {
  materials: readonly ResolvedMaterialSeedR33[];
  operations: readonly OperationSeedR1[];
  equipment: readonly TechnologyPassportEquipmentRuleR1[];
  delivery: TechnologyPassportDeliveryFlowR1 | null;
}): readonly TechnologyPassportParameterR1[] {
  const materialExpectationIds = input.materials.map((seed) => materialExpectationId(seed.familyId));
  const materialFormulaIds = input.materials.map((seed) => materialFormulaId(seed.familyId));
  const operationFormulaIds = input.operations.map((seed) => `operation-quantity:${seed.operationId}`);
  const equipmentExpectationIds = input.equipment.map((item) => item.expectationId);
  const deliveryExpectationIds = input.delivery ? [input.delivery.expectationId] : [];
  const parameters: TechnologyPassportParameterR1[] = [
    {
      parameterId: "result_area_m2",
      titleRu: "Площадь физического результата",
      guideRu: "Введите площадь из проекта или обмера после вычета проёмов; значение не заменяется площадью другого этапа.",
      unitId: "m2", required: true, acceptedDefault: null, defaultProvenanceId: null,
      formulaConsumerIds: [...materialFormulaIds, ...operationFormulaIds, "equipment-shifts:access"],
      expectationConsumerIds: [...materialExpectationIds, ...input.operations.map((item) => `operation:${item.operationId}`)],
    },
    {
      parameterId: "working_height_m",
      titleRu: "Высота рабочей зоны",
      guideRu: "Введите фактическую высоту рабочей зоны, чтобы выбрать безопасный и конкретный способ доступа.",
      unitId: "m", required: true, acceptedDefault: null, defaultProvenanceId: null,
      formulaConsumerIds: [], expectationConsumerIds: equipmentExpectationIds,
    },
    {
      parameterId: "access_method",
      titleRu: "Способ доступа к рабочей зоне",
      guideRu: "Выберите: работа с пола/в составе расценки, вышка-тура 5 м либо ножничный подъёмник 8 м, платформа 230 кг.",
      unitId: null, required: true, acceptedDefault: null, defaultProvenanceId: null,
      formulaConsumerIds: [], expectationConsumerIds: equipmentExpectationIds,
    },
    {
      parameterId: "access_productivity_m2_per_shift",
      titleRu: "Производительность выбранного средства доступа",
      guideRu: "Введите принятую производительность в м² за смену из ППР, предложения аренды или расчёта производства работ.",
      unitId: "m2_per_shift", required: true, acceptedDefault: null, defaultProvenanceId: null,
      formulaConsumerIds: ["equipment-shifts:access"], expectationConsumerIds: equipmentExpectationIds,
    },
  ];
  if (input.materials.length > 0) {
    parameters.push({
      parameterId: "system_passport_reference",
      titleRu: "Паспорт и ревизия выбранной системы",
      guideRu: "Укажите документ производителя или проектную спецификацию, где подтверждены совместимость и точные типоразмеры.",
      unitId: null, required: true, acceptedDefault: null, defaultProvenanceId: null,
      formulaConsumerIds: [], expectationConsumerIds: materialExpectationIds,
    });
  }
  if (input.delivery) {
    parameters.push(
      {
        parameterId: "delivery_included_by_supplier",
        titleRu: "Доставка включена в цену поставщика",
        guideRu: "Подтвердите договором или предложением поставщика; без подтверждения перевозка остаётся отдельным грузопотоком.",
        unitId: null, required: true, acceptedDefault: null, defaultProvenanceId: null,
        formulaConsumerIds: [], expectationConsumerIds: deliveryExpectationIds,
      },
      {
        parameterId: "delivery_distance_km",
        titleRu: "Расстояние отдельной доставки",
        guideRu: "Введите расстояние от фактического поставщика до объекта в километрах по принятому маршруту.",
        unitId: "km", required: true, acceptedDefault: null, defaultProvenanceId: null,
        formulaConsumerIds: ["delivery-tonne-kilometres"], expectationConsumerIds: deliveryExpectationIds,
      },
      {
        parameterId: "cargo_mass_t",
        titleRu: "Масса перевозимых материалов",
        guideRu: "Введите массу точного закупочного состава без включения материалов другого этапа и повторной доставки.",
        unitId: "t", required: true, acceptedDefault: null, defaultProvenanceId: null,
        formulaConsumerIds: ["delivery-tonne-kilometres"], expectationConsumerIds: deliveryExpectationIds,
      },
    );
  }
  return [...parameters, ...conditionInputs(input.materials), ...materialInputs(input.materials)];
}

function exclusions(input: {
  conditionalMaterials: readonly ResolvedMaterialSeedR33[];
  equipment: readonly TechnologyPassportEquipmentRuleR1[];
  delivery: TechnologyPassportDeliveryFlowR1 | null;
}): readonly TechnologyPassportExclusionR1[] {
  return [
    ...input.conditionalMaterials.map((seed) => ({
      exclusionId: `exclude:material:${seed.familyId}`,
      expectationId: materialExpectationId(seed.familyId),
      conditionExpression: seed.exclusionCondition,
      reasonRu: seed.exclusionReasonRu,
      sourceIds: seed.sourceIds,
    })),
    ...input.equipment.map((item) => ({
      exclusionId: `exclude:${item.expectationId}`,
      expectationId: item.expectationId,
      conditionExpression: `access_method != ${item.equipmentRuleId === "mobile_tower_5m" ? "TOWER_5M" : "SCISSOR_8M_230KG"}`,
      reasonRu: "Этот конкретный вариант доступа исключён явным выбором другого, взаимоисключающего способа доступа.",
      sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    })),
    ...(input.delivery ? [{
      exclusionId: `exclude:${input.delivery.expectationId}`,
      expectationId: input.delivery.expectationId,
      conditionExpression: "delivery_included_by_supplier = true",
      reasonRu: "Отдельная перевозка исключается только после подтверждения, что поставщик включил этот грузопоток в цену.",
      sourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    }] : []),
  ];
}

function procurementRules(materials: readonly ResolvedMaterialSeedR33[]): readonly TechnologyPassportProcurementRuleR1[] {
  return materials.map((seed) => ({
    procurementRuleId: `procurement:${seed.familyId}`,
    familyId: seed.familyId,
    procurementEligible: true,
    packageUnitRu: seed.selectionResolutionR33.packageUnitRu,
    packageSizeFormula: `package_size_${seed.familyId}`,
    roundingRule: "Округлить итоговое количество вверх до целой фактической упаковки; не менять чистую потребность и процент потерь.",
    sourceIds: seed.sourceIds,
  }));
}

function formulas(input: {
  materials: readonly ResolvedMaterialSeedR33[];
  operations: readonly OperationSeedR1[];
  delivery: TechnologyPassportDeliveryFlowR1 | null;
}): readonly TechnologyPassportFormulaR1[] {
  return [
    ...input.materials.map(materialFormula),
    ...input.operations.map((seed) => ({
      formulaId: `operation-quantity:${seed.operationId}`,
      expressionSource: "result_area_m2",
      inputParameterIds: ["result_area_m2"],
      outputUnitId: "m2",
      roundingRule: "Сохранить измеренную площадь без скрытого округления.",
      lossRule: "Потери к физическому объёму строительной операции не применяются.",
      normSourceIds: seed.sourceIds,
    })),
    {
      formulaId: "equipment-shifts:access",
      expressionSource: "ceil(result_area_m2 / access_productivity_m2_per_shift)",
      inputParameterIds: ["result_area_m2", "access_productivity_m2_per_shift"],
      outputUnitId: "shift",
      roundingRule: "Округлить вверх до целой оплачиваемой смены только для выбранного отдельного средства доступа.",
      lossRule: "Технологические потери к сменам оборудования не применяются.",
      normSourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    },
    ...(input.delivery ? [{
      formulaId: "delivery-tonne-kilometres",
      expressionSource: "cargo_mass_t × delivery_distance_km",
      inputParameterIds: ["cargo_mass_t", "delivery_distance_km"],
      outputUnitId: "t_km",
      roundingRule: "Тонно-километры сохраняются без скрытого округления; число рейсов рассчитывается отдельно по грузоподъёмности 5 т.",
      lossRule: "Потери материалов не добавляются повторно в доставке.",
      normSourceIds: MASTER_AND_PROJECT_SOURCE_IDS,
    }] : []),
  ];
}

export function buildBatch001DrywallTechnologyPassportDraftR1(catalogId: string): TechnologyPassportR1 {
  if (BATCH001_DRYWALL_TECHNOLOGY_DELTAS_R1.length !== EXPECTED_CATALOG_COUNT) {
    throw new Error(`BATCH001_R1_DELTA_COUNT_DRIFT:${BATCH001_DRYWALL_TECHNOLOGY_DELTAS_R1.length}`);
  }
  const delta = BATCH001_DRYWALL_TECHNOLOGY_DELTAS_R1.find((item) => item.catalogId === catalogId);
  if (!delta) throw new Error(`BATCH001_R1_PASSPORT_OUTSIDE_SCOPE:${catalogId}`);
  const requiredSeeds = delta.requiredMaterialKeys.map((key) => resolveMaterialSeedR33(MATERIALS[key], catalogId));
  const conditionalSeeds = delta.conditionalMaterialKeys.map((key) => resolveMaterialSeedR33(MATERIALS[key], catalogId));
  const allMaterialSeeds = [...requiredSeeds, ...conditionalSeeds];
  if (unique(allMaterialSeeds.map((seed) => seed.familyId)).length !== allMaterialSeeds.length) {
    throw new Error(`BATCH001_R1_DUPLICATE_MATERIAL_DELTA:${catalogId}`);
  }
  const operationSeeds = delta.operationKeys.map((key) => OPERATIONS[key]);
  const primaryOperation = operationSeeds[0];
  if (!primaryOperation) throw new Error(`BATCH001_R1_OPERATION_EMPTY:${catalogId}`);
  const equipment = equipmentRules(primaryOperation);
  const delivery = deliveryFlow(delta);
  const capabilitySources = [MASTER_TZ_R33_SOURCE_ID, MASTER_SOURCE_ID, KNAUF_P11_SOURCE_ID, PROJECT_SYSTEM_SOURCE_ID] as const;
  return {
    contract: TECHNOLOGY_PASSPORT_R1_CONTRACT,
    catalogId: delta.catalogId,
    technologyVariantId: `${BATCH001_DRYWALL_TECHNOLOGY_PASSPORT_R1_CONTRACT}:${delta.operation}:${delta.variant}`,
    publicWorkTitleRu: delta.publicWorkTitleRu,
    resultUnitId: "m2",
    provenance: {
      expectationBasis: "INDEPENDENT_ENGINEERING_EVIDENCE",
      runtimeRowsUsedAsExpectation: false,
      evidence: [
        {
          evidenceId: "master-tz-r33",
          sourceKind: "PROJECT_DOCUMENT",
          title: "MASTER-ТЗ R3.3: единый канонический код и реально полезные сметы",
          locator: "C:/Users/User/Downloads/MASTER_TZ_R3_3_PRODUCTION_GRADE_GLOBAL_GREEN_CANONICAL_CODE_REAL_ESTIMATES_RU.md; разделы 7–10",
          contentSha256: MASTER_TZ_R33_SHA256,
        },
        {
          evidenceId: "master-tz-real-useful-r1",
          sourceKind: "PROJECT_DOCUMENT",
          title: "MASTER-TZ REAL USEFUL PROFESSIONAL ESTIMATES BATCH-001…008 R1",
          locator: "локальный frozen-файл; разделы 3–8 и 13.1",
          contentSha256: BATCH001_DRYWALL_MASTER_SHA256_R1,
        },
        {
          evidenceId: "knauf-p11-technical-sheet-2025",
          sourceKind: "MANUFACTURER_TDS",
          title: "КНАУФ П 11. Потолки из КНАУФ-листов, технический лист 02/2025",
          locator: ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch001/independent-sources/KNAUF_P11_CEILINGS_TECHNICAL_SHEET_2025.pdf; страницы 1–3",
          contentSha256: BATCH001_DRYWALL_KNAUF_P11_SHA256_R1,
        },
      ],
      authorRole: "ENGINEER",
      review: {
        status: "DRAFT",
        reviewerId: "UNASSIGNED_ENGINEERING_REVIEW",
        reviewedAt: "2026-08-21T00:00:00.000Z",
        reviewEvidenceSha256: "0000000000000000000000000000000000000000000000000000000000000000",
      },
    },
    applicabilityRu: [...delta.applicabilityRu, delta.deltaReasonRu],
    exclusions: exclusions({ conditionalMaterials: conditionalSeeds, equipment, delivery }),
    userInputs: baseInputs({ materials: allMaterialSeeds, operations: operationSeeds, equipment, delivery }),
    acceptedPreliminaryAssumptions: allMaterialSeeds.map((seed) =>
      buildDrywallMaterialPreliminaryAssumptionR33(seed.familyId, seed.selectionResolutionR33)),
    stages: stagesFor(delta),
    capabilities: [
      {
        group: "material",
        status: allMaterialSeeds.length > 0 ? "REQUIRED" : "NOT_APPLICABLE",
        reasonRu: allMaterialSeeds.length > 0
          ? "Каждая закупочная семья имеет точное предварительное наименование, единицу, норму, потери, упаковку и понятный параметр подтверждения."
          : "Отдельная операция выравнивания не наследует повторную закупку материалов каркаса.",
        normSourceIds: capabilitySources,
      },
      {
        group: "construction_work",
        status: "REQUIRED",
        reasonRu: "В смете остаются только измеряемые физические операции выбранного catalog_id.",
        normSourceIds: capabilitySources,
      },
      {
        group: "machine_equipment",
        status: "CONDITIONAL",
        reasonRu: "Отдельно оплачиваемый способ доступа выбирается явно; два взаимоисключающих варианта одновременно запрещены.",
        normSourceIds: capabilitySources,
      },
      {
        group: "delivery",
        status: delivery ? "CONDITIONAL" : "NOT_APPLICABLE",
        reasonRu: delivery
          ? "Один точный грузопоток остаётся до подтверждения включения перевозки поставщиком."
          : "Отдельная операция выравнивания не создаёт новый грузопоток без фактической закупки.",
        normSourceIds: capabilitySources,
      },
      {
        group: "waste",
        status: "NOT_APPLICABLE",
        reasonRu: "Демонтаж и вывоз отходов не входят в эти новые монтажные операции; для ремонта требуется отдельный доказанный scope.",
        normSourceIds: capabilitySources,
      },
    ],
    requiredMaterialFamilies: requiredSeeds.map(requiredMaterial),
    conditionalMaterialFamilies: conditionalSeeds.map(conditionalMaterial),
    constructionOperations: operationSeeds.map(operation),
    equipmentRules: equipment,
    deliveryFlows: delivery ? [delivery] : [],
    wasteFlows: [],
    quantityFormulas: formulas({ materials: allMaterialSeeds, operations: operationSeeds, delivery }),
    normSources: [
      {
        sourceId: MASTER_TZ_R33_SOURCE_ID,
        evidenceId: "master-tz-r33",
        title: "MASTER-ТЗ R3.3",
        editionOrVersion: "R3.3 от 22.08.2026",
        locator: "разделы 7–10: паспорта, материалы, формулы и разрешение 400 material selections",
        applicabilityRu: "Задаёт точное публичное наименование, безопасное предварительное значение и обязательное подтверждение критических характеристик.",
      },
      {
        sourceId: MASTER_SOURCE_ID,
        evidenceId: "master-tz-real-useful-r1",
        title: "Мастер-ТЗ на точный и полезный состав смет",
        editionOrVersion: "R1 от 21.08.2026",
        locator: "разделы 3–8, 12 и 13.1",
        applicabilityRu: "Задаёт fail-closed требования к точным материалам, оборудованию, доставке, потерям и упаковкам.",
      },
      {
        sourceId: KNAUF_P11_SOURCE_ID,
        evidenceId: "knauf-p11-technical-sheet-2025",
        title: "П 11. Потолки из КНАУФ-листов",
        editionOrVersion: "технический лист 02/2025",
        locator: "страницы 1–3: П112/П113, ПП 60×27, ПН 28×27, подвесы, соединители, крепёж листов и обработка швов",
        applicabilityRu: "Первичный источник состава и последовательности базовой потолочной системы; нормы уточняются проектом и паспортом выбранного варианта.",
      },
      {
        sourceId: PROJECT_SYSTEM_SOURCE_ID,
        evidenceId: "master-tz-real-useful-r1",
        title: "Проектная спецификация и паспорт выбранной комплектной системы",
        editionOrVersion: "обязательный runtime input без скрытого default",
        locator: "system_passport_reference и exact_spec_* текущей сметы",
        applicabilityRu: "Источник точных размеров, марок, совместимости, норм, потерь и упаковок конкретного объекта.",
      },
    ],
    procurementRules: procurementRules(allMaterialSeeds),
    incompatibleVariants: [],
  };
}

export function buildAllBatch001DrywallTechnologyPassportDraftsR1(): readonly TechnologyPassportR1[] {
  const ids = BATCH001_DRYWALL_TECHNOLOGY_DELTAS_R1.map((delta) => delta.catalogId);
  if (new Set(ids).size !== EXPECTED_CATALOG_COUNT) {
    throw new Error(`BATCH001_R1_DELTA_IDENTITY_DRIFT:${ids.length}:${new Set(ids).size}`);
  }
  return ids.map(buildBatch001DrywallTechnologyPassportDraftR1);
}
