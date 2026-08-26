import {
  TECHNOLOGY_PASSPORT_R1_CONTRACT,
  type TechnologyPassportConditionalMaterialFamilyR1,
  type TechnologyPassportConstructionOperationR1,
  type TechnologyPassportDeliveryFlowR1,
  type TechnologyPassportEquipmentRuleR1,
  type TechnologyPassportEvidenceR1,
  type TechnologyPassportExclusionR1,
  type TechnologyPassportFormulaR1,
  type TechnologyPassportMaterialFamilyR1,
  type TechnologyPassportMaterialSelectionResolutionR33,
  type TechnologyPassportNormSourceR1,
  type TechnologyPassportParameterR1,
  type TechnologyPassportProcurementRuleR1,
  type TechnologyPassportR1,
  type TechnologyPassportStageR1,
  type TechnologyPassportWasteFlowR1,
} from "../../../backendPlatform/technologyPassportR1";
import {
  buildDrywallMaterialPreliminaryAssumptionR33,
  MASTER_TZ_R33_SHA256,
  MASTER_TZ_R33_SOURCE_ID,
  resolveDrywallMaterialSelectionR33,
} from "./drywallMaterialSelectionR33";

/**
 * Independent BATCH-002 engineering expectation source.
 *
 * This module intentionally imports no BATCH-002 runtime definition, resource
 * blueprint, predecessor oracle, formula graph or compiled row. Family rules
 * below were authored from frozen manufacturer documents and the frozen master
 * requirement. The explicit 55-entry delta ledger is the identity boundary.
 */
export const BATCH002_DRYWALL_TECHNOLOGY_PASSPORT_R1_CONTRACT =
  "real-useful-estimates.batch002-drywall-technology-passport-r1.v1" as const;

export const BATCH002_DRYWALL_MASTER_SHA256_R1 =
  "1781cb869ae7996c5b7bbbddbeb76cca5de29b521d86d20d22c2e5ecf32d7510" as const;
export const BATCH002_KNAUF_P11_SHA256_R1 =
  "822c9d46f2c9d4eb9209ff47569b148374e4bbe06b1343cfef1336ebb43a3fed" as const;
export const BATCH002_KNAUF_FLEXIBOARD_SHA256_R1 =
  "975e9cb9ec21d1c2c8c944eeab44b93d31176aa1d9b9353ad1df5e7ae195f4c2" as const;
export const BATCH002_KNAUF_PAPER_TAPE_SHA256_R1 =
  "5c38913ac1aae013cfde671606d3de1ccd099cc4be973c4770cb5e0e7d99bbb4" as const;
export const BATCH002_KNAUF_INSULATION_SHA256_R1 =
  "ab7b1a32689b7fc295c9b89e43781e538ed31021f65340bcfa69fdf82240a197" as const;
export const BATCH002_USG_J371_SHA256_R1 =
  "05fd83321ca540f21becd75968992d0580278747743139bea73ab8600d519688" as const;

export type Batch002PassportSystemR1 = "BULKHEAD" | "CURVE";
export type Batch002PassportOperationR1 =
  | "FRAME"
  | "ALIGN"
  | "CLAD"
  | "FINISH_JOINT"
  | "INSULATE"
  | "PREPARE"
  | "REPAIR";
export type Batch002PassportVariantR1 =
  | "standard"
  | "large_area"
  | "small_area"
  | "technical_room"
  | "wet_zone";

type MaterialKeyR1 =
  | "joint_base_compound"
  | "joint_finish_compound"
  | "joint_paper_tape"
  | "corner_profile"
  | "joint_abrasive"
  | "insulation_layer"
  | "support_mesh"
  | "vapour_membrane"
  | "penetration_sealant"
  | "substrate_cleaner"
  | "substrate_primer"
  | "local_repair_compound"
  | "protective_film"
  | "repair_board"
  | "repair_screws"
  | "repair_profile"
  | "repair_insulation"
  | "alignment_shims"
  | "reinforcement_profile"
  | "profile_fasteners"
  | "curve_board_6_5"
  | "wet_curve_board"
  | "board_screws"
  | "flexible_track"
  | "curve_profile"
  | "hangers"
  | "anchors"
  | "frame_screws"
  | "deformation_joint_profile"
  | "wet_zone_membrane";

type OperationKeyR1 =
  | "prepare_edges"
  | "embed_tape"
  | "finish_joints"
  | "cut_insulation"
  | "install_insulation"
  | "seal_insulation"
  | "protect_adjacent"
  | "clean_substrate"
  | "prime_substrate"
  | "remove_damage"
  | "restore_repair_support"
  | "install_repair_board"
  | "finish_repair"
  | "survey_frame"
  | "adjust_frame"
  | "reinforce_frame"
  | "accept_frame"
  | "form_curve_board"
  | "install_curve_board"
  | "layout_curve_frame"
  | "install_curve_tracks"
  | "install_curve_frame"
  | "align_curve_frame";

type MaterialSeedR1 = {
  familyId: MaterialKeyR1;
  titleRu: string;
  purposeRu: string;
  stageId: "preparation" | "execution" | "finishing";
  specificationRequirementRu: string;
  sourceIds: readonly string[];
  conditionParameterId: string | null;
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
  stageId: "preparation" | "execution" | "finishing";
  sourceIds: readonly string[];
};

export type Batch002DrywallTechnologyDeltaR1 = {
  deltaId: string;
  catalogId: string;
  system: Batch002PassportSystemR1;
  operation: Batch002PassportOperationR1;
  variant: Batch002PassportVariantR1;
  publicWorkTitleRu: string;
  requiredMaterialKeys: readonly MaterialKeyR1[];
  conditionalMaterialKeys: readonly MaterialKeyR1[];
  operationKeys: readonly OperationKeyR1[];
  applicabilityRu: readonly string[];
  incompatibleVariantIds: readonly string[];
  deltaReasonRu: string;
};

const MASTER = "MASTER_TZ_REAL_USEFUL_R1";
const PROJECT = "PROJECT_SYSTEM_SPECIFICATION_REQUIRED_R1";
const P11 = "KNAUF_P11_2025";
const FLEXIBOARD = "KNAUF_FLEXIBOARD_TDS_2025";
const PAPER_TAPE = "KNAUF_PAPER_TAPE_2025";
const INSULATION = "KNAUF_CEILING_INSULATION_2024";
const USG_REPAIR = "USG_SHEETROCK_J371_2021";
const BASE = [MASTER, PROJECT] as const;

const material = (
  familyId: MaterialKeyR1,
  titleRu: string,
  purposeRu: string,
  stageId: MaterialSeedR1["stageId"],
  specificationRequirementRu: string,
  sourceIds: readonly string[],
  conditionParameterId: string | null = null,
): MaterialSeedR1 => ({
  familyId, titleRu, purposeRu, stageId, specificationRequirementRu, sourceIds, conditionParameterId,
});

const MATERIALS: Readonly<Record<MaterialKeyR1, MaterialSeedR1>> = {
  joint_base_compound: material("joint_base_compound", "Шпаклёвка базовая для стыков гипсовых листов", "Заполнение стыка и втапливание армирующей ленты.", "finishing", "Указать марку, тип твердения, совместимый лист и ленту, расход кг/м и массу упаковки.", [PAPER_TAPE, PROJECT]),
  joint_finish_compound: material("joint_finish_compound", "Шпаклёвка финишная для стыков гипсовых листов", "Финишное выравнивание стыков и головок крепежа.", "finishing", "Указать марку, допустимый слой, совместимость, расход кг/м² и массу ведра или мешка.", [PAPER_TAPE, PROJECT]),
  joint_paper_tape: material("joint_paper_tape", "Лента бумажная армирующая для стыков, ширина 50–51 мм", "Армирование прямых стыков и внутренних углов.", "finishing", "Указать материал, ширину 50–51 мм, длину рулона и совместимую шпаклёвочную систему.", [PAPER_TAPE, PROJECT]),
  corner_profile: material("corner_profile", "Профиль защитный наружного угла гипсокартонной конструкции", "Формирование и защита измеренной длины наружных углов.", "finishing", "Указать гибкий или прямой тип, материал, ширину полок, длину поставки и радиус применения.", [PAPER_TAPE, PROJECT], "external_corner_present"),
  joint_abrasive: material("joint_abrasive", "Абразивная сетка для финишного шлифования стыков", "Удаление наплывов после полного высыхания состава.", "finishing", "Указать зернистость, размер листа/сетки, ресурс м² на единицу и упаковку.", [PAPER_TAPE, PROJECT]),
  insulation_layer: material("insulation_layer", "Плиты или маты минеральной изоляции проектной плотности", "Непрерывное заполнение проектной полости без щелей и пустот.", "execution", "Указать назначение, марку, плотность кг/м³, толщину мм, тепловое/акустическое требование и площадь упаковки.", [INSULATION, PROJECT]),
  support_mesh: material("support_mesh", "Сетка поддерживающая изоляцию от провисания", "Удержание изоляции в горизонтальной или криволинейной полости.", "execution", "Указать материал, размер ячейки, ширину рулона, способ крепления и площадь упаковки.", [INSULATION, PROJECT], "support_mesh_required"),
  vapour_membrane: material("vapour_membrane", "Мембрана пароограничивающая для потолочной полости", "Непрерывный проектный пароограничивающий слой.", "execution", "Указать тип, эквивалентную толщину воздуха Sd, ширину и длину рулона, нахлёст и совместимую ленту.", [INSULATION, PROJECT], "vapour_membrane_required"),
  penetration_sealant: material("penetration_sealant", "Герметик проектного класса для проходок и примыканий", "Герметизация подтверждённых инженерных проходов.", "finishing", "Указать тип, класс огне-/влагостойкости, допустимую ширину шва, объём картриджа и совместимые основания.", [MASTER, PROJECT], "penetrations_present"),
  substrate_cleaner: material("substrate_cleaner", "Средство очистки основания перед грунтованием", "Удаление пыли и загрязнений с совместимого основания.", "preparation", "Указать состав, совместимость с основанием, расход л/м² и объём канистры.", [P11, PROJECT]),
  substrate_primer: material("substrate_primer", "Грунтовка основания под выбранную систему", "Выравнивание впитывания и обеспечение совместимости последующих слоёв.", "preparation", "Указать марку, тип основания, расход кг/м² или л/м², время сушки и объём упаковки.", [P11, PROJECT]),
  local_repair_compound: material("local_repair_compound", "Ремонтный состав для локальных дефектов основания", "Заполнение измеренных выбоин до грунтования.", "preparation", "Указать марку, основание, допустимую толщину слоя, расход кг/м²·мм и массу мешка.", [MASTER, PROJECT], "local_defects_present"),
  protective_film: material("protective_film", "Плёнка защитная полиэтиленовая не менее 100 мкм", "Защита остающегося оборудования и отделки в зоне работ.", "preparation", "Указать толщину не менее 100 мкм, ширину, длину рулона и площадь укрытия.", [MASTER, PROJECT], "adjacent_protection_required"),
  repair_board: material("repair_board", "Гипсовый лист ремонтный того же типа и толщины, что существующий", "Восстановление удалённой части облицовки без смены класса системы.", "execution", "Указать тип по EN 520, толщину мм, кромку, огне-/влагостойкость, размер листа и соответствие существующей системе.", [USG_REPAIR, PROJECT]),
  repair_screws: material("repair_screws", "Шурупы для ремонтного гипсового листа выбранной толщины", "Крепление ремонтной карты к существующему или восстановленному каркасу.", "execution", "Указать тип, диаметр, длину, защитное покрытие, шаг крепления и количество в упаковке.", [USG_REPAIR, PROJECT]),
  repair_profile: material("repair_profile", "Профиль оцинкованный усиления ремонтной карты", "Восстановление опоры по границе повреждения.", "execution", "Указать типоразмер, толщину стали, покрытие, длину и узел соединения с существующим каркасом.", [USG_REPAIR, PROJECT], "damaged_frame_present"),
  repair_insulation: material("repair_insulation", "Изоляция ремонтная того же типа, плотности и толщины", "Восстановление удалённой изоляции внутри ремонтной карты.", "execution", "Указать марку, тип, плотность кг/м³, толщину мм и размер плиты/мата по существующему слою.", [INSULATION, USG_REPAIR, PROJECT], "damaged_insulation_present"),
  alignment_shims: material("alignment_shims", "Прокладки регулировочные негорючие для узлов каркаса", "Локальная корректировка положения принятого металлического каркаса.", "execution", "Указать материал, толщину, размеры, класс горючести и разрешённый проектный узел.", [P11, PROJECT], "alignment_shims_required"),
  reinforcement_profile: material("reinforcement_profile", "Профиль оцинкованный локального усиления каркаса", "Усиление измеренной длины недостаточно жёстких участков.", "execution", "Указать типоразмер, толщину стали, покрытие, длину и проектный узел усиления.", [P11, PROJECT], "local_reinforcement_required"),
  profile_fasteners: material("profile_fasteners", "Крепёж оцинкованный для регулировки и усиления каркаса", "Фиксация прокладок и дополнительных профилей.", "execution", "Указать тип анкера/шурупа, диаметр, длину, основание, расчётную нагрузку и упаковку.", [P11, PROJECT], "alignment_fasteners_required"),
  curve_board_6_5: material("curve_board_6_5", "Гипсовый лист гибкий для криволинейных поверхностей, толщина 6,5 мм", "Обшивка выпуклых и вогнутых элементов по допустимому радиусу.", "execution", "Указать марку, толщину 6,5 мм, массу около 4,1 кг/м², размер листа, допустимый радиус и число слоёв.", [FLEXIBOARD, PROJECT]),
  wet_curve_board: material("wet_curve_board", "Гипсовый лист для криволинейной поверхности влажной зоны", "Обшивка криволинейного элемента с подтверждённой влагостойкостью.", "execution", "Указать тип H по EN 520 или эквивалент, толщину, допустимый радиус, размер листа и сертификат конкретной системы.", [MASTER, PROJECT]),
  board_screws: material("board_screws", "Шурупы для крепления криволинейного гипсового листа", "Крепление каждого проектного слоя к металлическому каркасу.", "execution", "Указать тип, диаметр, длину по суммарной толщине слоёв, покрытие, шаг и упаковку.", [FLEXIBOARD, P11, PROJECT]),
  flexible_track: material("flexible_track", "Профиль направляющий гибкий для проектного радиуса", "Формирование верхней и нижней направляющих криволинейного элемента.", "execution", "Указать типоразмер, толщину стали, минимальный радиус, способ фиксации формы и длину поставки.", [FLEXIBOARD, PROJECT]),
  curve_profile: material("curve_profile", "Профиль стоечный или поперечный оцинкованный криволинейного каркаса", "Формирование несущих стоек и перемычек по проектной дуге.", "execution", "Указать сечение, толщину стали, шаг, покрытие, длину и совместимость с направляющим профилем.", [P11, PROJECT]),
  hangers: material("hangers", "Подвес регулируемый криволинейного потолочного каркаса", "Передача нагрузки каркаса на несущую конструкцию.", "execution", "Указать тип, длину тяги, расчётную нагрузку, защиту и совместимый профиль.", [P11, PROJECT]),
  anchors: material("anchors", "Анкеры потолочные расчётной несущей способности", "Крепление подвесов и направляющих к подтверждённому основанию.", "execution", "Указать тип, диаметр, длину, материал основания, расчётную нагрузку и количество в упаковке.", [P11, PROJECT]),
  frame_screws: material("frame_screws", "Шурупы самонарезающие для соединения стальных профилей", "Соединение элементов криволинейного металлического каркаса.", "execution", "Указать тип, диаметр, длину, толщину соединяемой стали, покрытие и упаковку.", [P11, PROJECT]),
  deformation_joint_profile: material("deformation_joint_profile", "Профиль деформационного шва гипсокартонной системы", "Разделение большой площади по проектному шву.", "execution", "Указать тип, ширину, материал, длину поставки и точный проектный узел.", [MASTER, PROJECT], "deformation_joint_present"),
  wet_zone_membrane: material("wet_zone_membrane", "Мембрана гидроизоляционная совместимая с гипсовой системой", "Защита подтверждённой площади и примыканий влажной зоны.", "finishing", "Указать марку, число слоёв, расход кг/м², время сушки, упаковку и совместимые ленты примыканий.", [MASTER, PROJECT], "waterproofing_required"),
};

const operation = (
  operationId: OperationKeyR1,
  titleRu: string,
  purposeRu: string,
  stageId: OperationSeedR1["stageId"],
  sourceIds: readonly string[],
): OperationSeedR1 => ({ operationId, titleRu, purposeRu, stageId, sourceIds });

const OPERATIONS: Readonly<Record<OperationKeyR1, OperationSeedR1>> = {
  prepare_edges: operation("prepare_edges", "Подготовка обрезных кромок и удаление пыли", "Обеспечить правильную геометрию и чистоту стыка.", "preparation", [PAPER_TAPE, PROJECT]),
  embed_tape: operation("embed_tape", "Заполнение стыков и втапливание бумажной ленты", "Сформировать армированный базовый слой без пузырей.", "finishing", [PAPER_TAPE, PROJECT]),
  finish_joints: operation("finish_joints", "Финишное шпаклевание и шлифование стыков", "Получить проектный уровень поверхности после высыхания.", "finishing", [PAPER_TAPE, PROJECT]),
  cut_insulation: operation("cut_insulation", "Раскрой изоляции по полости и препятствиям", "Подготовить детали без щелей и недопустимого сжатия.", "preparation", [INSULATION, PROJECT]),
  install_insulation: operation("install_insulation", "Укладка изоляции непрерывным слоем", "Заполнить проектную полость без пустот и провисания.", "execution", [INSULATION, PROJECT]),
  seal_insulation: operation("seal_insulation", "Герметизация примыканий изоляционного слоя", "Сохранить непрерывность проектного контура.", "finishing", [INSULATION, PROJECT]),
  protect_adjacent: operation("protect_adjacent", "Укрытие сохраняемых поверхностей и оборудования", "Исключить загрязнение вне границ подготовки.", "preparation", [MASTER, PROJECT]),
  clean_substrate: operation("clean_substrate", "Очистка и обеспыливание основания", "Подготовить совместимое основание без непрочных частиц.", "preparation", [P11, PROJECT]),
  prime_substrate: operation("prime_substrate", "Грунтование подготовленного основания", "Получить равномерно обработанную площадь под следующий слой.", "execution", [P11, PROJECT]),
  remove_damage: operation("remove_damage", "Удаление повреждённого листа и непрочных участков", "Открыть устойчивую границу ремонтной карты после устранения причины.", "preparation", [USG_REPAIR, PROJECT]),
  restore_repair_support: operation("restore_repair_support", "Восстановление опоры и изоляции ремонтной карты", "Вернуть несущий и изоляционный слой существующей системы.", "execution", [USG_REPAIR, INSULATION, PROJECT]),
  install_repair_board: operation("install_repair_board", "Монтаж ремонтного гипсового листа", "Закрыть ремонтную карту материалом того же класса и толщины.", "execution", [USG_REPAIR, PROJECT]),
  finish_repair: operation("finish_repair", "Армирование, шпаклевание, шлифование и грунтование ремонта", "Подготовить восстановленный участок к отделке.", "finishing", [USG_REPAIR, PAPER_TAPE, PROJECT]),
  survey_frame: operation("survey_frame", "Инструментальная проверка геометрии каркаса", "Определить только фактические узлы корректировки.", "preparation", [P11, PROJECT]),
  adjust_frame: operation("adjust_frame", "Регулировка существующих подвесов и соединений", "Вывести принятую плоскость каркаса в проектное положение.", "execution", [P11, PROJECT]),
  reinforce_frame: operation("reinforce_frame", "Локальное усиление недостаточно жёстких участков", "Восстановить проектную жёсткость измеренной зоны.", "execution", [P11, PROJECT]),
  accept_frame: operation("accept_frame", "Проверка принятого каркаса перед обшивкой", "Подтвердить геометрию, шаг и завершение скрытых работ.", "preparation", [P11, PROJECT]),
  form_curve_board: operation("form_curve_board", "Раскрой и формование листов по проектному радиусу", "Получить листы допустимого радиуса без разрушения сердечника.", "preparation", [FLEXIBOARD, PROJECT]),
  install_curve_board: operation("install_curve_board", "Монтаж криволинейных гипсовых листов", "Закрепить проектное число слоёв с правильным шагом крепежа.", "execution", [FLEXIBOARD, PROJECT]),
  layout_curve_frame: operation("layout_curve_frame", "Разметка осей и проектного радиуса", "Перенести геометрию криволинейного элемента на основание.", "preparation", [MASTER, PROJECT]),
  install_curve_tracks: operation("install_curve_tracks", "Монтаж гибких направляющих профилей", "Зафиксировать проектную дугу и границы элемента.", "execution", [P11, PROJECT]),
  install_curve_frame: operation("install_curve_frame", "Монтаж стоек, перемычек и подвесов криволинейного каркаса", "Собрать несущий каркас с проектным шагом.", "execution", [P11, PROJECT]),
  align_curve_frame: operation("align_curve_frame", "Выверка криволинейного каркаса", "Получить устойчивую проектную геометрию до обшивки.", "finishing", [P11, PROJECT]),
};

const OPERATION_MATERIALS: Readonly<Record<Batch002PassportOperationR1, {
  required: readonly MaterialKeyR1[];
  conditional: readonly MaterialKeyR1[];
  operations: readonly OperationKeyR1[];
}>> = {
  FINISH_JOINT: { required: ["joint_base_compound", "joint_finish_compound", "joint_paper_tape", "joint_abrasive"], conditional: ["corner_profile"], operations: ["prepare_edges", "embed_tape", "finish_joints"] },
  INSULATE: { required: ["insulation_layer"], conditional: ["support_mesh", "vapour_membrane", "penetration_sealant"], operations: ["cut_insulation", "install_insulation", "seal_insulation"] },
  PREPARE: { required: ["substrate_cleaner", "substrate_primer"], conditional: ["local_repair_compound", "protective_film"], operations: ["protect_adjacent", "clean_substrate", "prime_substrate"] },
  REPAIR: { required: ["repair_board", "repair_screws", "joint_paper_tape", "joint_base_compound", "substrate_primer"], conditional: ["repair_profile", "repair_insulation", "protective_film"], operations: ["remove_damage", "restore_repair_support", "install_repair_board", "finish_repair"] },
  ALIGN: { required: [], conditional: ["alignment_shims", "reinforcement_profile", "profile_fasteners"], operations: ["survey_frame", "adjust_frame", "reinforce_frame"] },
  CLAD: { required: ["curve_board_6_5", "board_screws"], conditional: ["corner_profile"], operations: ["accept_frame", "form_curve_board", "install_curve_board"] },
  FRAME: { required: ["flexible_track", "curve_profile", "hangers", "anchors", "frame_screws"], conditional: ["deformation_joint_profile", "penetration_sealant"], operations: ["layout_curve_frame", "install_curve_tracks", "install_curve_frame", "align_curve_frame"] },
};

const ACTION_LABEL: Readonly<Record<Batch002PassportOperationR1, string>> = {
  FRAME: "Монтаж металлического каркаса",
  ALIGN: "Выравнивание металлического каркаса",
  CLAD: "Обшивка гипсовыми листами",
  FINISH_JOINT: "Заделка стыков и углов",
  INSULATE: "Устройство изоляции",
  PREPARE: "Подготовка основания",
  REPAIR: "Локальный ремонт",
};

const VARIANT_LABEL: Readonly<Record<Batch002PassportVariantR1, string>> = {
  standard: "стандартного исполнения",
  large_area: "большой площади",
  small_area: "малой площади",
  technical_room: "в техническом помещении",
  wet_zone: "во влажной зоне",
};

function variantAdditions(
  operationId: Batch002PassportOperationR1,
  variant: Batch002PassportVariantR1,
): readonly MaterialKeyR1[] {
  if (variant === "technical_room") return ["penetration_sealant"];
  if (variant === "wet_zone") {
    return ["PREPARE", "REPAIR", "CLAD"].includes(operationId)
      ? ["wet_zone_membrane"]
      : ["penetration_sealant"];
  }
  if (variant === "large_area" && ["FRAME", "CLAD", "FINISH_JOINT"].includes(operationId)) {
    return ["deformation_joint_profile"];
  }
  return [];
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function delta(
  catalogId: string,
  system: Batch002PassportSystemR1,
  operationId: Batch002PassportOperationR1,
  variant: Batch002PassportVariantR1,
): Batch002DrywallTechnologyDeltaR1 {
  const family = OPERATION_MATERIALS[operationId];
  const required = operationId === "CLAD" && variant === "wet_zone"
    ? family.required.map((key) => key === "curve_board_6_5" ? "wet_curve_board" as const : key)
    : family.required;
  const conditional = unique([...family.conditional, ...variantAdditions(operationId, variant)])
    .filter((key) => !required.includes(key));
  const objectRu = system === "BULKHEAD" ? "потолочного короба" : "криволинейного потолочного элемента";
  const deltaReason: Readonly<Record<Batch002PassportVariantR1, string>> = {
    standard: "Стандартный вариант не наследует специальные материалы большой площади, технического помещения или влажной зоны.",
    large_area: "Вариант большой площади отдельно проверяет проектные деформационные швы и не добавляет их без измеренной длины.",
    small_area: "Вариант малой площади использует фактическую раскладку и закупочное округление без искусственного коэффициента «малого объёма».",
    technical_room: "Вариант технического помещения отдельно учитывает только подтверждённые проходки и защиту действующего оборудования.",
    wet_zone: "Вариант влажной зоны требует совместимой влагостойкой системы и запрещает неподтверждённую замену обычным листом.",
  };
  return {
    deltaId: `batch002-r1-delta:${catalogId}`,
    catalogId,
    system,
    operation: operationId,
    variant,
    publicWorkTitleRu: `${ACTION_LABEL[operationId]} ${objectRu} ${VARIANT_LABEL[variant]}`,
    requiredMaterialKeys: required,
    conditionalMaterialKeys: conditional,
    operationKeys: family.operations,
    applicabilityRu: [
      `Самостоятельная операция «${ACTION_LABEL[operationId]}» для ${objectRu}.`,
      `Применяется только к варианту «${VARIANT_LABEL[variant]}» после подтверждения проектной системы и фактической геометрии.`,
    ],
    incompatibleVariantIds: variant === "wet_zone"
      ? ["ordinary_board_without_wet_zone_approval"]
      : ["wet_zone_substitution_without_project_requirement"],
    deltaReasonRu: deltaReason[variant],
  };
}

export const BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1: readonly Batch002DrywallTechnologyDeltaR1[] = [
  delta("drywall_ceiling_interior_bulkhead_finish_joint_large_area", "BULKHEAD", "FINISH_JOINT", "large_area"),
  delta("drywall_ceiling_interior_bulkhead_finish_joint_small_area", "BULKHEAD", "FINISH_JOINT", "small_area"),
  delta("drywall_ceiling_interior_bulkhead_finish_joint_standard", "BULKHEAD", "FINISH_JOINT", "standard"),
  delta("drywall_ceiling_interior_bulkhead_finish_joint_technical_room", "BULKHEAD", "FINISH_JOINT", "technical_room"),
  delta("drywall_ceiling_interior_bulkhead_finish_joint_wet_zone", "BULKHEAD", "FINISH_JOINT", "wet_zone"),
  delta("drywall_ceiling_interior_bulkhead_insulate_large_area", "BULKHEAD", "INSULATE", "large_area"),
  delta("drywall_ceiling_interior_bulkhead_insulate_small_area", "BULKHEAD", "INSULATE", "small_area"),
  delta("drywall_ceiling_interior_bulkhead_insulate_standard", "BULKHEAD", "INSULATE", "standard"),
  delta("drywall_ceiling_interior_bulkhead_insulate_technical_room", "BULKHEAD", "INSULATE", "technical_room"),
  delta("drywall_ceiling_interior_bulkhead_insulate_wet_zone", "BULKHEAD", "INSULATE", "wet_zone"),
  delta("drywall_ceiling_interior_bulkhead_prepare_large_area", "BULKHEAD", "PREPARE", "large_area"),
  delta("drywall_ceiling_interior_bulkhead_prepare_small_area", "BULKHEAD", "PREPARE", "small_area"),
  delta("drywall_ceiling_interior_bulkhead_prepare_standard", "BULKHEAD", "PREPARE", "standard"),
  delta("drywall_ceiling_interior_bulkhead_prepare_technical_room", "BULKHEAD", "PREPARE", "technical_room"),
  delta("drywall_ceiling_interior_bulkhead_prepare_wet_zone", "BULKHEAD", "PREPARE", "wet_zone"),
  delta("drywall_ceiling_interior_bulkhead_repair_large_area", "BULKHEAD", "REPAIR", "large_area"),
  delta("drywall_ceiling_interior_bulkhead_repair_small_area", "BULKHEAD", "REPAIR", "small_area"),
  delta("drywall_ceiling_interior_bulkhead_repair_standard", "BULKHEAD", "REPAIR", "standard"),
  delta("drywall_ceiling_interior_bulkhead_repair_technical_room", "BULKHEAD", "REPAIR", "technical_room"),
  delta("drywall_ceiling_interior_bulkhead_repair_wet_zone", "BULKHEAD", "REPAIR", "wet_zone"),
  delta("drywall_ceiling_interior_curve_align_large_area", "CURVE", "ALIGN", "large_area"),
  delta("drywall_ceiling_interior_curve_align_small_area", "CURVE", "ALIGN", "small_area"),
  delta("drywall_ceiling_interior_curve_align_standard", "CURVE", "ALIGN", "standard"),
  delta("drywall_ceiling_interior_curve_align_technical_room", "CURVE", "ALIGN", "technical_room"),
  delta("drywall_ceiling_interior_curve_align_wet_zone", "CURVE", "ALIGN", "wet_zone"),
  delta("drywall_ceiling_interior_curve_clad_large_area", "CURVE", "CLAD", "large_area"),
  delta("drywall_ceiling_interior_curve_clad_small_area", "CURVE", "CLAD", "small_area"),
  delta("drywall_ceiling_interior_curve_clad_standard", "CURVE", "CLAD", "standard"),
  delta("drywall_ceiling_interior_curve_clad_technical_room", "CURVE", "CLAD", "technical_room"),
  delta("drywall_ceiling_interior_curve_clad_wet_zone", "CURVE", "CLAD", "wet_zone"),
  delta("drywall_ceiling_interior_curve_finish_joint_large_area", "CURVE", "FINISH_JOINT", "large_area"),
  delta("drywall_ceiling_interior_curve_finish_joint_small_area", "CURVE", "FINISH_JOINT", "small_area"),
  delta("drywall_ceiling_interior_curve_finish_joint_standard", "CURVE", "FINISH_JOINT", "standard"),
  delta("drywall_ceiling_interior_curve_finish_joint_technical_room", "CURVE", "FINISH_JOINT", "technical_room"),
  delta("drywall_ceiling_interior_curve_finish_joint_wet_zone", "CURVE", "FINISH_JOINT", "wet_zone"),
  delta("drywall_ceiling_interior_curve_frame_large_area", "CURVE", "FRAME", "large_area"),
  delta("drywall_ceiling_interior_curve_frame_small_area", "CURVE", "FRAME", "small_area"),
  delta("drywall_ceiling_interior_curve_frame_standard", "CURVE", "FRAME", "standard"),
  delta("drywall_ceiling_interior_curve_frame_technical_room", "CURVE", "FRAME", "technical_room"),
  delta("drywall_ceiling_interior_curve_frame_wet_zone", "CURVE", "FRAME", "wet_zone"),
  delta("drywall_ceiling_interior_curve_insulate_large_area", "CURVE", "INSULATE", "large_area"),
  delta("drywall_ceiling_interior_curve_insulate_small_area", "CURVE", "INSULATE", "small_area"),
  delta("drywall_ceiling_interior_curve_insulate_standard", "CURVE", "INSULATE", "standard"),
  delta("drywall_ceiling_interior_curve_insulate_technical_room", "CURVE", "INSULATE", "technical_room"),
  delta("drywall_ceiling_interior_curve_insulate_wet_zone", "CURVE", "INSULATE", "wet_zone"),
  delta("drywall_ceiling_interior_curve_prepare_large_area", "CURVE", "PREPARE", "large_area"),
  delta("drywall_ceiling_interior_curve_prepare_small_area", "CURVE", "PREPARE", "small_area"),
  delta("drywall_ceiling_interior_curve_prepare_standard", "CURVE", "PREPARE", "standard"),
  delta("drywall_ceiling_interior_curve_prepare_technical_room", "CURVE", "PREPARE", "technical_room"),
  delta("drywall_ceiling_interior_curve_prepare_wet_zone", "CURVE", "PREPARE", "wet_zone"),
  delta("drywall_ceiling_interior_curve_repair_large_area", "CURVE", "REPAIR", "large_area"),
  delta("drywall_ceiling_interior_curve_repair_small_area", "CURVE", "REPAIR", "small_area"),
  delta("drywall_ceiling_interior_curve_repair_standard", "CURVE", "REPAIR", "standard"),
  delta("drywall_ceiling_interior_curve_repair_technical_room", "CURVE", "REPAIR", "technical_room"),
  delta("drywall_ceiling_interior_curve_repair_wet_zone", "CURVE", "REPAIR", "wet_zone"),
];

const EVIDENCE: readonly TechnologyPassportEvidenceR1[] = [
  { evidenceId: "master-tz-r33", sourceKind: "PROJECT_DOCUMENT", title: "MASTER-ТЗ R3.3 Production Grade Global Green", locator: "локальный governing-файл; разделы R3.3-C о точных материальных спецификациях и подтверждаемых предварительных значениях", contentSha256: MASTER_TZ_R33_SHA256 },
  { evidenceId: "master-tz-real-useful-r1", sourceKind: "PROJECT_DOCUMENT", title: "Мастер-ТЗ на реальные полезные сметы BATCH-001…008 R1", locator: "локальный frozen-файл; требования к материалам, оборудованию, доставке и закупке", contentSha256: BATCH002_DRYWALL_MASTER_SHA256_R1 },
  { evidenceId: "knauf-p11-2025", sourceKind: "MANUFACTURER_TDS", title: "КНАУФ П 11. Потолки из КНАУФ-листов", locator: "frozen PDF; страницы 1–3: профили, подвесы, соединители, листы и стыки", contentSha256: BATCH002_KNAUF_P11_SHA256_R1 },
  { evidenceId: "knauf-flexiboard-2025", sourceKind: "MANUFACTURER_TDS", title: "Knauf Flexiboard Specialty Board Product Datasheet", locator: "frozen PDF 09/2025; Description, Advantages, Specification, Application", contentSha256: BATCH002_KNAUF_FLEXIBOARD_SHA256_R1 },
  { evidenceId: "knauf-paper-tape-2025", sourceKind: "MANUFACTURER_TDS", title: "Knauf Paper Joint Tape and jointing guidance", locator: "frozen official PDF; joint reinforcement and finishing sequence", contentSha256: BATCH002_KNAUF_PAPER_TAPE_SHA256_R1 },
  { evidenceId: "knauf-insulation-2024", sourceKind: "MANUFACTURER_TDS", title: "Knauf Insulation Ceiling Installation Instructions", locator: "frozen official PDF 10/2024; cutting around obstructions and continuous layer without gaps", contentSha256: BATCH002_KNAUF_INSULATION_SHA256_R1 },
  { evidenceId: "usg-j371-2021", sourceKind: "MANUFACTURER_TDS", title: "USG Sheetrock Gypsum Panels Installation and Finishing Guide J371", locator: "frozen official PDF; Repairing Damaged Panels and Finishing the Panels", contentSha256: BATCH002_USG_J371_SHA256_R1 },
];

const NORM_SOURCES: readonly TechnologyPassportNormSourceR1[] = [
  { sourceId: MASTER_TZ_R33_SOURCE_ID, evidenceId: "master-tz-r33", title: "MASTER-ТЗ R3.3 Production Grade Global Green", editionOrVersion: "R3.3 от 22.08.2026", locator: "R3.3-C, правила MATERIAL_SELECTION_RESOLUTION", applicabilityRu: "Фиксирует понятные пользователю точные характеристики, допустимые диапазоны и честные preliminary defaults без фиктивного инженерного принятия." },
  { sourceId: MASTER, evidenceId: "master-tz-real-useful-r1", title: "Мастер-ТЗ на реальные полезные сметы", editionOrVersion: "R1 от 21.08.2026", locator: "разделы о точных материалах, оборудовании, доставке, потерях и закупке", applicabilityRu: "Задаёт обязательный независимый fail-closed состав паспорта." },
  { sourceId: PROJECT, evidenceId: "master-tz-real-useful-r1", title: "Проектная спецификация выбранной комплектной системы", editionOrVersion: "обязательный ввод текущего объекта", locator: "точная марка, типоразмер, норма, потери, упаковка и проектный узел", applicabilityRu: "Уточняет конкретные изделия и нормы без скрытого значения по умолчанию." },
  { sourceId: P11, evidenceId: "knauf-p11-2025", title: "КНАУФ П 11. Потолки из КНАУФ-листов", editionOrVersion: "02/2025", locator: "страницы 1–3", applicabilityRu: "Подтверждает системный состав потолочного каркаса и обшивки." },
  { sourceId: FLEXIBOARD, evidenceId: "knauf-flexiboard-2025", title: "Knauf Flexiboard Specialty Board", editionOrVersion: "09/2025", locator: "Specification and Application", applicabilityRu: "Подтверждает гибкий лист 6,5 мм, массу 4,1 кг/м² и применение для криволинейных потолков." },
  { sourceId: PAPER_TAPE, evidenceId: "knauf-paper-tape-2025", title: "Knauf Paper Joint Tape and jointing guidance", editionOrVersion: "2025", locator: "Jointing and Finishing", applicabilityRu: "Подтверждает армирование стыков бумажной лентой и послойную отделку." },
  { sourceId: INSULATION, evidenceId: "knauf-insulation-2024", title: "Knauf Insulation Ceiling Installation Instructions", editionOrVersion: "10/2024", locator: "Installation Instructions", applicabilityRu: "Подтверждает раскрой и непрерывную укладку изоляции без щелей и пустот." },
  { sourceId: USG_REPAIR, evidenceId: "usg-j371-2021", title: "USG Sheetrock Installation and Finishing Guide J371", editionOrVersion: "2021", locator: "Repairing Damaged Panels", applicabilityRu: "Подтверждает физическую последовательность ремонта, армирования, сушки, шлифования и грунтования." },
];

function stages(operationId: Batch002PassportOperationR1): readonly TechnologyPassportStageR1[] {
  return [
    { stageId: "preparation", sequence: 1, titleRu: "Подготовка", resultRu: "Подтверждены проектная система, геометрия, основание и границы операции." },
    { stageId: "execution", sequence: 2, titleRu: "Основная строительная операция", resultRu: `Выполнена физическая операция «${ACTION_LABEL[operationId]}» в измеренном объёме.` },
    { stageId: "finishing", sequence: 3, titleRu: "Завершение технологического этапа", resultRu: "Получен готовый результат без журнальных и универсальных контрольных строк." },
    { stageId: "logistics", sequence: 4, titleRu: "Доставка", resultRu: "Учтён один доказанный грузопоток или подтверждено включение доставки поставщиком." },
    ...(operationId === "REPAIR" ? [{ stageId: "waste", sequence: 5, titleRu: "Вывоз отходов", resultRu: "Отходы ремонтной карты переданы выбранному получателю по измеренному маршруту." }] : []),
  ];
}

const materialExpectationId = (familyId: string): string => `material:${familyId}`;
const materialFormulaId = (familyId: string): string => `material-quantity:${familyId}`;

function requiredMaterial(seed: ResolvedMaterialSeedR33): TechnologyPassportMaterialFamilyR1 {
  return {
    expectationId: materialExpectationId(seed.familyId), familyId: seed.familyId,
    stageId: seed.stageId, titleRu: seed.titleRu, purposeRu: seed.purposeRu,
    formulaId: materialFormulaId(seed.familyId), normSourceIds: seed.sourceIds,
    inclusionCondition: "Материал обязателен для выбранной самостоятельной операции.",
    specificationRequirementRu: seed.specificationRequirementRu,
    procurementRuleId: `procurement:${seed.familyId}`,
    selectionResolutionR33: seed.selectionResolutionR33,
  };
}

function conditionalMaterial(seed: ResolvedMaterialSeedR33): TechnologyPassportConditionalMaterialFamilyR1 {
  if (!seed.conditionParameterId) throw new Error(`BATCH002_R1_CONDITIONAL_PARAMETER_MISSING:${seed.familyId}`);
  return {
    ...requiredMaterial(seed),
    inclusionCondition: `${seed.conditionParameterId} = true`,
    exclusionId: `exclude:material:${seed.familyId}`,
  };
}

function constructionOperation(seed: OperationSeedR1): TechnologyPassportConstructionOperationR1 {
  return {
    expectationId: `operation:${seed.operationId}`, operationId: seed.operationId,
    stageId: seed.stageId, titleRu: seed.titleRu, purposeRu: seed.purposeRu,
    formulaId: `operation-quantity:${seed.operationId}`, normSourceIds: seed.sourceIds,
    inclusionCondition: "Операция обязательна для физического результата выбранной работы.", required: true,
  };
}

function equipmentRules(primary: OperationSeedR1): readonly TechnologyPassportEquipmentRuleR1[] {
  return [
    {
      expectationId: "equipment:mobile_tower_5m", equipmentRuleId: "mobile_tower_5m",
      stageId: "execution", titleRu: "Вышка-тура, рабочая высота 5 м",
      purposeRu: `Безопасный доступ при операции «${primary.titleRu}» в пределах подтверждённой высоты.`,
      formulaId: "equipment-shifts:access", normSourceIds: BASE,
      inclusionCondition: "access_method = TOWER_5M", equipmentClassRu: "Вышка-тура передвижная",
      keyCharacteristicsRu: ["рабочая высота 5 м", "операция: выполнение выбранной работы на высоте"],
      operationId: primary.operationId, mutuallyExclusiveGroupId: "ACCESS_METHOD",
    },
    {
      expectationId: "equipment:scissor_lift_8m_230kg", equipmentRuleId: "scissor_lift_8m_230kg",
      stageId: "execution", titleRu: "Ножничный подъёмник, рабочая высота 8 м, платформа 230 кг",
      purposeRu: `Механизированный доступ при операции «${primary.titleRu}» на подтверждённой высоте.`,
      formulaId: "equipment-shifts:access", normSourceIds: BASE,
      inclusionCondition: "access_method = SCISSOR_8M_230KG", equipmentClassRu: "Подъёмник ножничный самоходный",
      keyCharacteristicsRu: ["рабочая высота 8 м", "грузоподъёмность платформы 230 кг", "операция: выполнение выбранной работы на высоте"],
      operationId: primary.operationId, mutuallyExclusiveGroupId: "ACCESS_METHOD",
    },
  ];
}

function deliveryFlow(materials: readonly MaterialSeedR1[]): TechnologyPassportDeliveryFlowR1 | null {
  if (materials.length === 0) return null;
  return {
    expectationId: "delivery:material_cargo", deliveryFlowId: "material_cargo",
    stageId: "logistics", titleRu: "Доставка материалов одним подтверждённым грузопотоком",
    purposeRu: "Перевозка фактического закупочного состава без повторной универсальной доставки.",
    formulaId: "delivery-tonne-kilometres", normSourceIds: BASE,
    inclusionCondition: "delivery_included_by_supplier = false",
    cargoFamilyIds: materials.map((seed) => seed.familyId),
    vehicleTypeRu: "Автомобиль бортовой грузоподъёмностью 5 т",
    capacityRequirementRu: "Грузоподъёмность 5 т; число рейсов определяется фактической массой груза.",
    distanceParameterId: "delivery_distance_km", deduplicationKey: "BATCH002_MATERIAL_CARGO_TO_SITE",
  };
}

function wasteFlow(deltaItem: Batch002DrywallTechnologyDeltaR1, materials: readonly MaterialSeedR1[]): TechnologyPassportWasteFlowR1 | null {
  if (deltaItem.operation !== "REPAIR") return null;
  return {
    expectationId: "waste:repair_demolition", wasteFlowId: "repair_demolition",
    stageId: "waste", titleRu: "Вывоз отходов локального ремонта",
    purposeRu: "Перевозка фактической массы демонтированных листов, профилей и изоляции к выбранному получателю.",
    formulaId: "waste-tonne-kilometres", normSourceIds: [USG_REPAIR, PROJECT],
    inclusionCondition: "waste_mass_t > 0", sourceMaterialFamilyIds: materials.map((seed) => seed.familyId),
    vehicleTypeRu: "Автомобиль-самосвал грузоподъёмностью 5 т",
    distanceParameterId: "waste_distance_km", deduplicationKey: "BATCH002_REPAIR_WASTE_TO_RECEIVER",
  };
}

function materialFormula(seed: ResolvedMaterialSeedR33): TechnologyPassportFormulaR1 {
  return {
    formulaId: materialFormulaId(seed.familyId),
    expressionSource: `result_area_m2 × norm_${seed.familyId} × (1 + loss_${seed.familyId}_percent / 100)`,
    inputParameterIds: ["result_area_m2", `norm_${seed.familyId}`, `loss_${seed.familyId}_percent`],
    outputUnitId: seed.selectionResolutionR33.materialUnitId, roundingRule: "Сохранить чистую и валовую потребность раздельно; закупку округлить только по реальной упаковке.",
    lossRule: `Потери задаются явно параметром loss_${seed.familyId}_percent и не входят повторно в норму.`, normSourceIds: seed.sourceIds,
  };
}

function procurementRules(materials: readonly ResolvedMaterialSeedR33[]): readonly TechnologyPassportProcurementRuleR1[] {
  return materials.map((seed) => ({
    procurementRuleId: `procurement:${seed.familyId}`, familyId: seed.familyId,
    procurementEligible: true, packageUnitRu: seed.selectionResolutionR33.packageUnitRu,
    packageSizeFormula: `package_size_${seed.familyId}`,
    roundingRule: "Округлить валовую потребность вверх до целой фактической упаковки без изменения чистой нормы и потерь.",
    sourceIds: seed.sourceIds,
  }));
}

function conditionParameters(materials: readonly ResolvedMaterialSeedR33[]): readonly TechnologyPassportParameterR1[] {
  return unique(materials.map((seed) => seed.conditionParameterId).filter((id): id is string => Boolean(id))).map((parameterId) => ({
    parameterId, titleRu: `Условие применения «${parameterId.replaceAll("_", " ")}»`,
    guideRu: "Подтвердите применимость по проекту, обмеру или дефектной ведомости; скрытое значение по умолчанию запрещено.",
    unitId: null, required: true, acceptedDefault: null, defaultProvenanceId: null,
    formulaConsumerIds: [], expectationConsumerIds: materials.filter((seed) => seed.conditionParameterId === parameterId).map((seed) => materialExpectationId(seed.familyId)),
  }));
}

function materialParameters(materials: readonly ResolvedMaterialSeedR33[]): readonly TechnologyPassportParameterR1[] {
  return materials.flatMap((seed) => [
    { parameterId: seed.selectionResolutionR33.selectionParameterId, titleRu: seed.selectionResolutionR33.selectionParameterTitleRu, guideRu: seed.selectionResolutionR33.plainHintRu, unitId: null, required: seed.selectionResolutionR33.confirmationRequired, acceptedDefault: seed.selectionResolutionR33.preliminaryValueRu, defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID, formulaConsumerIds: [], expectationConsumerIds: [materialExpectationId(seed.familyId)] },
    { parameterId: `norm_${seed.familyId}`, titleRu: `Норма расхода: ${seed.titleRu}`, guideRu: "Введите норму из паспорта выбранного изделия или принятого инженерного расчёта в единицах материала на м² результата.", unitId: `${seed.selectionResolutionR33.materialUnitId}_per_m2`, required: false, acceptedDefault: seed.selectionResolutionR33.preliminaryNormPerResultUnit, defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID, formulaConsumerIds: [materialFormulaId(seed.familyId)], expectationConsumerIds: [materialExpectationId(seed.familyId)] },
    { parameterId: `loss_${seed.familyId}_percent`, titleRu: `Потери: ${seed.titleRu}`, guideRu: "Введите обоснованный процент раскроя или технологических потерь отдельно от чистой нормы.", unitId: "percent", required: false, acceptedDefault: seed.selectionResolutionR33.preliminaryLossPercent, defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID, formulaConsumerIds: [materialFormulaId(seed.familyId)], expectationConsumerIds: [materialExpectationId(seed.familyId)] },
    { parameterId: `package_size_${seed.familyId}`, titleRu: `Размер упаковки: ${seed.titleRu}`, guideRu: "Введите фактическое количество материала в одной закупочной упаковке выбранной позиции.", unitId: seed.selectionResolutionR33.materialUnitId, required: false, acceptedDefault: seed.selectionResolutionR33.preliminaryPackageSize, defaultProvenanceId: MASTER_TZ_R33_SOURCE_ID, formulaConsumerIds: [], expectationConsumerIds: [materialExpectationId(seed.familyId)] },
  ] satisfies TechnologyPassportParameterR1[]);
}

function userInputs(input: {
  materials: readonly ResolvedMaterialSeedR33[];
  conditionalMaterials: readonly ResolvedMaterialSeedR33[];
  operations: readonly OperationSeedR1[];
  delivery: TechnologyPassportDeliveryFlowR1 | null;
  waste: TechnologyPassportWasteFlowR1 | null;
}): readonly TechnologyPassportParameterR1[] {
  const operationFormulaIds = input.operations.map((seed) => `operation-quantity:${seed.operationId}`);
  const operationExpectationIds = input.operations.map((seed) => `operation:${seed.operationId}`);
  const result: TechnologyPassportParameterR1[] = [
    { parameterId: "result_area_m2", titleRu: "Площадь физического результата", guideRu: "Введите площадь самостоятельной операции по проекту или обмеру без объёма другого этапа.", unitId: "m2", required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: [...input.materials.map((seed) => materialFormulaId(seed.familyId)), ...operationFormulaIds, "equipment-shifts:access"], expectationConsumerIds: [...input.materials.map((seed) => materialExpectationId(seed.familyId)), ...operationExpectationIds] },
    { parameterId: "system_passport_reference", titleRu: "Паспорт выбранной системы", guideRu: "Укажите проектную спецификацию или документ производителя, подтверждающий совместимость компонентов.", unitId: null, required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: [], expectationConsumerIds: input.materials.map((seed) => materialExpectationId(seed.familyId)) },
    { parameterId: "access_method", titleRu: "Способ доступа", guideRu: "Выберите работу с пола/в расценке, вышку-туру 5 м или ножничный подъёмник 8 м с платформой 230 кг.", unitId: null, required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: [], expectationConsumerIds: ["equipment:mobile_tower_5m", "equipment:scissor_lift_8m_230kg"] },
    { parameterId: "access_productivity_m2_per_shift", titleRu: "Производительность средства доступа", guideRu: "Введите принятую производительность выбранного средства доступа в м² за смену.", unitId: "m2_per_shift", required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: ["equipment-shifts:access"], expectationConsumerIds: ["equipment:mobile_tower_5m", "equipment:scissor_lift_8m_230kg"] },
  ];
  if (input.delivery) result.push(
    { parameterId: "delivery_included_by_supplier", titleRu: "Доставка включена поставщиком", guideRu: "Подтвердите это договором или предложением; иначе доставка остаётся отдельным грузопотоком.", unitId: null, required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: [], expectationConsumerIds: [input.delivery.expectationId] },
    { parameterId: "delivery_mass_t", titleRu: "Масса доставляемых материалов", guideRu: "Введите массу точного закупочного состава без повторного учёта груза другой операции.", unitId: "t", required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: ["delivery-tonne-kilometres"], expectationConsumerIds: [input.delivery.expectationId] },
    { parameterId: "delivery_distance_km", titleRu: "Расстояние доставки", guideRu: "Введите расстояние от фактического поставщика до объекта по принятому маршруту.", unitId: "km", required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: ["delivery-tonne-kilometres"], expectationConsumerIds: [input.delivery.expectationId] },
  );
  if (input.waste) result.push(
    { parameterId: "waste_mass_t", titleRu: "Масса отходов ремонта", guideRu: "Введите фактическую массу демонтированных листов, профилей и изоляции.", unitId: "t", required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: ["waste-tonne-kilometres"], expectationConsumerIds: [input.waste.expectationId] },
    { parameterId: "waste_distance_km", titleRu: "Расстояние вывоза отходов", guideRu: "Введите маршрут до выбранного законного получателя строительных отходов.", unitId: "km", required: true, acceptedDefault: null, defaultProvenanceId: null, formulaConsumerIds: ["waste-tonne-kilometres"], expectationConsumerIds: [input.waste.expectationId] },
  );
  return [...result, ...conditionParameters(input.conditionalMaterials), ...materialParameters(input.materials)];
}

function exclusions(input: {
  conditionalMaterials: readonly ResolvedMaterialSeedR33[];
  delivery: TechnologyPassportDeliveryFlowR1 | null;
  waste: TechnologyPassportWasteFlowR1 | null;
}): readonly TechnologyPassportExclusionR1[] {
  return [
    ...input.conditionalMaterials.map((seed) => ({
      exclusionId: `exclude:material:${seed.familyId}`, expectationId: materialExpectationId(seed.familyId),
      conditionExpression: `${seed.conditionParameterId} = false`,
      reasonRu: "Материал исключается только после явного подтверждения отсутствия соответствующего проектного условия.", sourceIds: seed.sourceIds,
    })),
    { exclusionId: "exclude:equipment:mobile_tower_5m", expectationId: "equipment:mobile_tower_5m", conditionExpression: "access_method != TOWER_5M", reasonRu: "Вышка-тура исключается при выборе другого взаимоисключающего способа доступа.", sourceIds: BASE },
    { exclusionId: "exclude:equipment:scissor_lift_8m_230kg", expectationId: "equipment:scissor_lift_8m_230kg", conditionExpression: "access_method != SCISSOR_8M_230KG", reasonRu: "Ножничный подъёмник исключается при выборе другого взаимоисключающего способа доступа.", sourceIds: BASE },
    ...(input.delivery ? [{ exclusionId: "exclude:delivery:material_cargo", expectationId: input.delivery.expectationId, conditionExpression: "delivery_included_by_supplier = true", reasonRu: "Отдельная доставка исключается только по подтверждению поставщика.", sourceIds: BASE }] : []),
    ...(input.waste ? [{ exclusionId: "exclude:waste:repair_demolition", expectationId: input.waste.expectationId, conditionExpression: "waste_mass_t = 0", reasonRu: "Вывоз исключается только при доказанном отсутствии демонтируемого материала.", sourceIds: [USG_REPAIR, PROJECT] }] : []),
  ];
}

function formulas(input: {
  materials: readonly ResolvedMaterialSeedR33[];
  operations: readonly OperationSeedR1[];
  delivery: TechnologyPassportDeliveryFlowR1 | null;
  waste: TechnologyPassportWasteFlowR1 | null;
}): readonly TechnologyPassportFormulaR1[] {
  return [
    ...input.materials.map(materialFormula),
    ...input.operations.map((seed) => ({ formulaId: `operation-quantity:${seed.operationId}`, expressionSource: "result_area_m2", inputParameterIds: ["result_area_m2"], outputUnitId: "m2", roundingRule: "Сохранить измеренную площадь без скрытого округления.", lossRule: "Потери к физическому объёму операции не применяются.", normSourceIds: seed.sourceIds })),
    { formulaId: "equipment-shifts:access", expressionSource: "ceil(result_area_m2 / access_productivity_m2_per_shift)", inputParameterIds: ["result_area_m2", "access_productivity_m2_per_shift"], outputUnitId: "shift", roundingRule: "Округлить вверх до целой оплачиваемой смены только выбранного средства доступа.", lossRule: "Потери материалов к сменам оборудования не применяются.", normSourceIds: BASE },
    ...(input.delivery ? [{ formulaId: "delivery-tonne-kilometres", expressionSource: "delivery_mass_t × delivery_distance_km", inputParameterIds: ["delivery_mass_t", "delivery_distance_km"], outputUnitId: "t_km", roundingRule: "Сохранить тонно-километры; число рейсов округлить отдельно по грузоподъёмности 5 т.", lossRule: "Материальные потери повторно в доставке не начисляются.", normSourceIds: BASE }] : []),
    ...(input.waste ? [{ formulaId: "waste-tonne-kilometres", expressionSource: "waste_mass_t × waste_distance_km", inputParameterIds: ["waste_mass_t", "waste_distance_km"], outputUnitId: "t_km", roundingRule: "Сохранить измеренный маршрут и округлить число рейсов отдельно по грузоподъёмности 5 т.", lossRule: "Отходы не увеличиваются универсальным процентом.", normSourceIds: [USG_REPAIR, PROJECT] }] : []),
  ];
}

export function buildBatch002DrywallTechnologyPassportDraftR1(catalogId: string): TechnologyPassportR1 {
  const deltaItem = BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1.find((item) => item.catalogId === catalogId);
  if (!deltaItem) throw new Error(`BATCH002_R1_PASSPORT_OUTSIDE_SCOPE:${catalogId}`);
  const requiredSeeds = deltaItem.requiredMaterialKeys.map((key) => resolveMaterialSeedR33(MATERIALS[key], catalogId));
  const conditionalSeeds = deltaItem.conditionalMaterialKeys.map((key) => resolveMaterialSeedR33(MATERIALS[key], catalogId));
  const allMaterials = [...requiredSeeds, ...conditionalSeeds];
  if (unique(allMaterials.map((seed) => seed.familyId)).length !== allMaterials.length) {
    throw new Error(`BATCH002_R1_DUPLICATE_MATERIAL_DELTA:${catalogId}`);
  }
  const operationSeeds = deltaItem.operationKeys.map((key) => OPERATIONS[key]);
  const primaryOperation = operationSeeds[0];
  if (!primaryOperation) throw new Error(`BATCH002_R1_OPERATION_EMPTY:${catalogId}`);
  const delivery = deliveryFlow(allMaterials);
  const waste = wasteFlow(deltaItem, allMaterials);
  const equipment = equipmentRules(primaryOperation);
  const capabilitySources = unique([MASTER_TZ_R33_SOURCE_ID, MASTER, PROJECT, ...operationSeeds.flatMap((seed) => seed.sourceIds)]);
  return {
    contract: TECHNOLOGY_PASSPORT_R1_CONTRACT,
    catalogId: deltaItem.catalogId,
    technologyVariantId: `${BATCH002_DRYWALL_TECHNOLOGY_PASSPORT_R1_CONTRACT}:${deltaItem.system}:${deltaItem.operation}:${deltaItem.variant}`,
    publicWorkTitleRu: deltaItem.publicWorkTitleRu,
    resultUnitId: "m2",
    provenance: {
      expectationBasis: "INDEPENDENT_ENGINEERING_EVIDENCE",
      runtimeRowsUsedAsExpectation: false,
      evidence: EVIDENCE,
      authorRole: "ENGINEER",
      review: { status: "DRAFT", reviewerId: "UNASSIGNED_ENGINEERING_REVIEW", reviewedAt: "2026-08-21T00:00:00.000Z", reviewEvidenceSha256: "0000000000000000000000000000000000000000000000000000000000000000" },
    },
    applicabilityRu: [...deltaItem.applicabilityRu, deltaItem.deltaReasonRu],
    exclusions: exclusions({ conditionalMaterials: conditionalSeeds, delivery, waste }),
    userInputs: userInputs({ materials: allMaterials, conditionalMaterials: conditionalSeeds, operations: operationSeeds, delivery, waste }),
    acceptedPreliminaryAssumptions: allMaterials.map((seed) =>
      buildDrywallMaterialPreliminaryAssumptionR33(seed.familyId, seed.selectionResolutionR33)),
    stages: stages(deltaItem.operation),
    capabilities: [
      { group: "material", status: allMaterials.length > 0 ? "REQUIRED" : "NOT_APPLICABLE", reasonRu: allMaterials.length > 0 ? "Материалы имеют точную спецификацию, норму, потери и закупочную упаковку." : "Операция выравнивания не закупает материал без подтверждённого дефектного узла.", normSourceIds: capabilitySources },
      { group: "construction_work", status: "REQUIRED", reasonRu: "Паспорт содержит только измеряемые физические строительные операции.", normSourceIds: capabilitySources },
      { group: "machine_equipment", status: "CONDITIONAL", reasonRu: "Способ доступа выбирается явно из взаимоисключающих вариантов с числовыми характеристиками.", normSourceIds: BASE },
      { group: "delivery", status: delivery ? "CONDITIONAL" : "NOT_APPLICABLE", reasonRu: delivery ? "Один грузопоток остаётся до доказанного включения доставки поставщиком." : "Без отдельной закупки новый грузопоток не создаётся.", normSourceIds: BASE },
      { group: "waste", status: waste ? "CONDITIONAL" : "NOT_APPLICABLE", reasonRu: waste ? "Ремонт учитывает фактическую массу и маршрут вывоза." : "Демонтаж и вывоз не входят в самостоятельную новую монтажную операцию.", normSourceIds: waste ? [USG_REPAIR, PROJECT] : BASE },
    ],
    requiredMaterialFamilies: requiredSeeds.map(requiredMaterial),
    conditionalMaterialFamilies: conditionalSeeds.map(conditionalMaterial),
    constructionOperations: operationSeeds.map(constructionOperation),
    equipmentRules: equipment,
    deliveryFlows: delivery ? [delivery] : [],
    wasteFlows: waste ? [waste] : [],
    quantityFormulas: formulas({ materials: allMaterials, operations: operationSeeds, delivery, waste }),
    normSources: NORM_SOURCES,
    procurementRules: procurementRules(allMaterials),
    incompatibleVariants: deltaItem.incompatibleVariantIds.map((variantId) => ({
      variantId,
      reasonRu: deltaItem.variant === "wet_zone"
        ? "Обычная система запрещена без подтверждённой влагостойкости всех совместимых компонентов."
        : "Специальная система влажной зоны не подставляется без проектного требования и отдельной спецификации.",
      sourceIds: [MASTER, PROJECT],
    })),
  };
}

export function buildAllBatch002DrywallTechnologyPassportDraftsR1(): readonly TechnologyPassportR1[] {
  const ids = BATCH002_DRYWALL_TECHNOLOGY_DELTAS_R1.map((item) => item.catalogId);
  if (ids.length !== 55 || new Set(ids).size !== 55) {
    throw new Error(`BATCH002_R1_DELTA_IDENTITY_DRIFT:${ids.length}:${new Set(ids).size}`);
  }
  return ids.map(buildBatch002DrywallTechnologyPassportDraftR1);
}
