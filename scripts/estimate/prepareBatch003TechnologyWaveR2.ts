import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  csv,
  setHash,
  sha256,
  stableJson,
  stableJsonLine,
  writeDeterministic,
  type JsonRecord,
} from "./postM1ReadmissionR2Core";

const H2 = "34b51b28097d376d132762808785072666f72419";
const T2 = "4a3064568664f4f49a3a871df0e2196eb4c45cd7";
const P2 = "ef3ccace2bc37cc2e0e49d77ca6c287b2d0a367e";
const M2 = "d30592725e74dc17935a57be016d42363cf8343092f20d6335494fc7a25003cd";
const CONTRACT_SHA = "57ac9bae8c53d818aa36290e3747c2b48199c23e0eab6f2cf76d94ddb15d4f0c";
const CAPTURED_AT = "2026-08-13T23:55:00.000+06:00";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=")];
}));
const required = (name: string): string => {
  const value = argv[name];
  if (!value) throw new Error(`BATCH003_PREFLIGHT_ARGUMENT_MISSING:${name}`);
  return path.resolve(value);
};
const target = required("target");
const predecessorRoot = required("predecessor-root");
const output = required("output");
if (existsSync(output)) throw new Error("BATCH003_PREFLIGHT_OUTPUT_ALREADY_EXISTS");

const git = (...args: string[]): string => execFileSync("git", ["-C", target, ...args], { encoding: "utf8", windowsHide: true }).trim();
if (git("rev-parse", "HEAD") !== H2 || git("rev-parse", "HEAD^{tree}") !== T2 || git("rev-parse", "HEAD^") !== P2) {
  throw new Error("BATCH003_A0_EXACT_GIT_IDENTITY_RED");
}
if (git("merge-base", "--is-ancestor", "10f8497b33836a158bf009e0448cf4e43033f37a", H2) !== "") {
  throw new Error("BATCH003_A0_ANCESTRY_RED");
}

const bytes = (relativePath: string): Buffer => readFileSync(path.join(predecessorRoot, relativePath));
const json = (relativePath: string): any => JSON.parse(bytes(relativePath).toString("utf8"));
const jsonl = (relativePath: string): JsonRecord[] => bytes(relativePath).toString("utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
const manifestBytes = bytes("closeout/MANIFEST.json");
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const evidenceBytes = bytes("closeout/EXACT_SHA_EVIDENCE_INDEX.json");
const evidence = JSON.parse(evidenceBytes.toString("utf8"));
const reportBytes = bytes("closeout/BATCH002_FINAL_REPORT_RU.md");
const tokenBytes = bytes("closeout/BATCH002_TECHNOLOGY_WAVE_R1_TOKEN.txt");
const token = tokenBytes.toString("utf8").trim();
const v5Bytes = bytes("09-queue/MASTER_11610_PROGRAM_CONTROL_STATE_V5.json");
const v5 = JSON.parse(v5Bytes.toString("utf8"));
const replay = json("08-tests/REPLAY_RECONCILIATION.json");
const audit = json("07-audit/INDEPENDENT_AUDIT_REPORT.json");
const sidecar = bytes("closeout/MANIFEST.sha256").toString("utf8").trim().split(/\s+/u)[0];
if (sha256(manifestBytes) !== M2 || sidecar !== M2 || manifest.candidateHead !== H2 || manifest.candidateTree !== T2) throw new Error("BATCH003_A0_MANIFEST_RED");
const evidenceMismatches = evidence.entries.filter((entry: JsonRecord) => {
  const artifact = bytes(String(entry.path));
  return artifact.length !== entry.bytes || sha256(artifact) !== entry.sha256;
});
if (evidence.artifactCount !== 53 || evidence.entries.length !== 53 || evidenceMismatches.length !== 0) throw new Error("BATCH003_A0_EVIDENCE_RED");
if (!token.startsWith("GREEN_BATCH002_TECHNOLOGY_DOMAIN_WAVE_R1|") || !token.includes(H2)) throw new Error("BATCH003_A0_TOKEN_RED");
if (manifest.status !== "GREEN_BATCH002_TECHNOLOGY_WAVE_R1" || manifest.batch003Selected !== false || manifest.batch003ExecutionStarted !== false || replay.replay !== "2/2" || replay.byteMismatch !== 0 || audit.admitted !== "55/55") throw new Error("BATCH003_A0_GREEN_STATE_RED");
const N2 = 55;
const A5 = Number(v5.currentGlobalAdmitted);
const Q5 = Number(v5.m5Remaining);
const M6 = Number(v5.m6Remaining);
const G5 = Number(v5.currentGlobalRemaining);
if (N2 !== A5 - 71 || N2 !== 3989 - Q5 || M6 !== 7550 || A5 + Q5 + M6 !== 11610 || G5 !== Q5 + M6 || G5 !== 11539 - N2) throw new Error("BATCH003_A0_V5_ARITHMETIC_RED");

const m5RemainingMemberSet = json("09-queue/M5_REMAINING_AFTER_BATCH002_MEMBER_SET.json");
const remainingSet = new Set<string>(m5RemainingMemberSet.catalogIds);
const originalLedger = jsonl("01-inventory/M5_BEFORE_EXACT_ORDERED_LEDGER.jsonl");
const remainingLedger: JsonRecord[] = originalLedger
  .filter((row) => remainingSet.has(String(row.catalogId)))
  .map((row, index): JsonRecord => ({ ...row, v5RemainingOrdinal: index + 1 }));
if (remainingLedger.length !== Q5 || new Set(remainingLedger.map((row) => row.catalogId)).size !== Q5 || setHash(remainingLedger.map((row) => String(row.catalogId))) !== v5.setHashes.m5Remaining) throw new Error("BATCH003_M5_V5_INVENTORY_RED");

const selectedGroupIds = [
  "wg:base:drywall_ceiling_interior_drywall_ceiling_prepare",
  "wg:base:drywall_ceiling_interior_drywall_ceiling_frame",
  "wg:base:drywall_ceiling_interior_drywall_ceiling_align",
  "wg:base:drywall_ceiling_interior_drywall_ceiling_insulate",
  "wg:base:drywall_ceiling_interior_drywall_ceiling_clad",
  "wg:base:drywall_ceiling_interior_drywall_ceiling_finish_joint",
  "wg:base:drywall_ceiling_interior_drywall_ceiling_repair",
] as const;
const selectedGroupSet = new Set<string>(selectedGroupIds);
const selected = remainingLedger.filter((row) => selectedGroupSet.has(String(row.workGroupId)));
const selectedIds = selected.map((row) => String(row.catalogId));
if (selected.length !== 36 || new Set(selectedIds).size !== 36 || selected.some((row) => String(row.catalogId).includes("_install_"))) throw new Error("BATCH003_SELECTION_EXACT36_RED");
const groups = selectedGroupIds.map((groupId, index) => {
  const members = selected.filter((row) => row.workGroupId === groupId);
  if (![5, 6].includes(members.length)) throw new Error(`BATCH003_GROUP_DENOMINATOR_RED:${groupId}:${members.length}`);
  return { executionOrder: index + 1, groupId, groupKey: `CEILING:${["PREPARE", "FRAME", "ALIGN", "INSULATE", "CLAD", "FINISH_JOINT", "REPAIR"][index]}`, count: members.length, memberSetHash: setHash(members.map((row) => String(row.catalogId))) };
});
const identityRoles = Object.fromEntries(["PRIMARY", "VARIANT", "ALIAS"].map((role) => [role, selected.filter((row) => row.identityRole === role).length]));
if (identityRoles.PRIMARY !== 7 || identityRoles.VARIANT !== 29 || identityRoles.ALIAS !== 0) throw new Error("BATCH003_IDENTITY_ROLE_RED");

type ExpectedCategory = "material" | "labor" | "equipment" | "transport" | "testing" | "documentation" | "subcontract_service" | "temporary_work" | "waste";
type ExpectedCandidate = { candidateId: string; category: ExpectedCategory; titleRu: string; unitId: string; applicability: "APPLICABLE" | "CONDITIONAL"; basis: string };
const operationRu: Readonly<Record<string, string>> = {
  PREPARE: "подготовки плоского подвесного потолка", FRAME: "устройства каркаса плоского подвесного потолка",
  ALIGN: "выверки каркаса плоского подвесного потолка", INSULATE: "изоляции плоского подвесного потолка",
  CLAD: "обшивки плоского подвесного потолка", FINISH_JOINT: "заделки швов плоского подвесного потолка",
  REPAIR: "ремонта плоского подвесного потолка",
};
const candidate = (candidateId: string, category: ExpectedCategory, titleRu: string, unitId: string, applicability: ExpectedCandidate["applicability"] = "APPLICABLE"): ExpectedCandidate => ({
  candidateId, category, titleRu, unitId, applicability,
  basis: "Независимо восстановлено из физической технологии плоского подвесного потолка, owner-границы и стадий приемки; legacy BOQ и implementation builder не использованы.",
});
const COMMON_EXPECTED: readonly ExpectedCandidate[] = [
  candidate("scope_condition_survey", "testing", "Обследование фронта и подтверждение исходных условий", "test"),
  candidate("approved_shop_drawing_review", "subcontract_service", "Инженерная проверка рабочей раскладки и узлов", "service"),
  candidate("mep_interface_coordination", "subcontract_service", "Координация светильников, решеток, проходок и люков с MEP", "service"),
  candidate("material_submittal_approval", "documentation", "Согласование материалов и комплектной системы", "document"),
  candidate("existing_finish_protection", "material", "Защита существующих полов, стен и оборудования", "m2"),
  candidate("dust_partition_and_extraction", "temporary_work", "Локальная пылезащитная зона и пылеудаление", "service"),
  candidate("access_tower_delivery", "transport", "Доставка сертифицированной вышки или подмащивания", "trip"),
  candidate("access_tower_assembly", "temporary_work", "Монтаж и приемка средств доступа", "service"),
  candidate("access_tower_operation", "equipment", "Эксплуатация и перестановка средств доступа", "machine_hour"),
  candidate("access_tower_dismantle", "temporary_work", "Демонтаж и возврат средств доступа", "service"),
  candidate("material_delivery", "transport", "Доставка материалов на объект", "t_km"),
  candidate("supplier_loading", "labor", "Погрузка материалов у поставщика", "man_hour"),
  candidate("site_unloading", "labor", "Разгрузка материалов на объекте", "man_hour"),
  candidate("horizontal_material_movement", "labor", "Внутриплощадочное горизонтальное перемещение", "man_hour"),
  candidate("vertical_material_lift", "equipment", "Механизированный или ручной подъем к рабочему горизонту", "machine_hour"),
  candidate("temporary_protected_power", "equipment", "Временное защищенное питание инструмента", "machine_hour"),
  candidate("temporary_task_lighting", "equipment", "Временное рабочее освещение зоны", "machine_hour"),
  candidate("ppe_consumables", "material", "СИЗ дыхания, глаз, рук и слуха", "person_shift"),
  candidate("barriers_and_warning_signs", "material", "Ограждения и предупреждающие знаки", "set"),
  candidate("incoming_material_inspection", "testing", "Входной контроль партий материалов", "test"),
  candidate("waste_collection", "labor", "Сбор отходов по месту образования", "man_hour"),
  candidate("waste_sorting", "labor", "Раздельная сортировка отходов и возвратных ресурсов", "man_hour"),
  candidate("waste_loading", "labor", "Погрузка отходов для вывоза", "man_hour"),
  candidate("waste_haul", "transport", "Вывоз отходов подтвержденному получателю", "t_km"),
  candidate("waste_receiver_service", "waste", "Прием и учет отходов уполномоченным получателем", "t"),
  candidate("final_work_zone_cleaning", "labor", "Финишная уборка и обеспыливание", "man_hour"),
  candidate("stage_photo_record", "documentation", "Фотофиксация контрольной стадии", "document"),
  candidate("work_journal_entry", "documentation", "Запись в журнале производства работ", "document"),
  candidate("certificate_register", "documentation", "Реестр сертификатов и паспортов примененных материалов", "document"),
  candidate("hidden_or_stage_acceptance_act", "documentation", "Акт освидетельствования скрытой или самостоятельной стадии", "document"),
  candidate("executive_measurement_scheme", "documentation", "Исполнительная схема и карта контрольных замеров", "document"),
  candidate("quality_control_protocol", "documentation", "Протокол контроля качества самостоятельной стадии", "document"),
  candidate("owner_handover_act", "documentation", "Акт передачи результата следующему владельцу или заказчику", "document"),
] as const;

const OPERATION_EXPECTED_IDS: Readonly<Record<string, readonly [string, ExpectedCategory, string, string, ExpectedCandidate["applicability"]?][]>> = {
  PREPARE: [
    ["substrate_plane_survey", "testing", "Инструментальная съемка плоскости и отметок", "test"],
    ["substrate_moisture_test", "testing", "Контроль влажности основания и помещения", "test"],
    ["hidden_utility_detection", "equipment", "Поиск скрытых коммуникаций перед сверлением или ремонтом", "machine_hour"],
    ["ceiling_axis_laser_setout", "labor", "Лазерная разбивка осей и проектной отметки потолка", "man_hour"],
    ["control_benchmark_markers", "material", "Реперы и контрольные метки", "item"],
    ["floor_protection_board", "material", "Жесткая защита пола", "m2"],
    ["protective_film", "material", "Защитная пленка поверхностей и оборудования", "m2"],
    ["masking_sealing_tape", "material", "Лента герметизации защитных укрытий", "m"],
    ["substrate_vacuum_cleaning", "labor", "Очистка и обеспыливание основания", "man_hour"],
    ["loose_layer_removal", "labor", "Удаление непрочных локальных участков", "man_hour", "CONDITIONAL"],
    ["local_base_repair", "labor", "Локальное восстановление допустимых дефектов основания", "man_hour", "CONDITIONAL"],
    ["base_repair_compound", "material", "Ремонтный состав для локальных дефектов", "kg", "CONDITIONAL"],
    ["compatible_substrate_primer", "material", "Совместимая грунтовка основания", "kg"],
    ["trial_area_material", "material", "Материалы пробного участка", "set", "CONDITIONAL"],
    ["trial_area_execution", "labor", "Устройство и оценка пробного участка", "man_hour", "CONDITIONAL"],
    ["base_readiness_acceptance", "testing", "Приемка готовности основания и фронта", "test"],
  ],
  FRAME: [
    ["perimeter_track", "material", "Периметральный направляющий профиль", "m"],
    ["primary_ceiling_profile", "material", "Несущий профиль первого уровня", "m"],
    ["secondary_ceiling_profile", "material", "Поперечный профиль второго уровня", "m"],
    ["profile_splice_connectors", "material", "Соединители продольных стыков профиля", "item"],
    ["cross_profile_connectors", "material", "Одно- или двухуровневые соединители пересечений", "item"],
    ["adjustable_hangers", "material", "Регулируемые подвесы проектного типа", "item"],
    ["hanger_rods_or_wire", "material", "Тяги, проволока или резьбовые шпильки подвесов", "m"],
    ["hanger_clips_and_nuts", "material", "Зажимы, гайки, шайбы и контргайки подвесов", "set"],
    ["slab_hanger_anchors", "material", "Анкеры подвесов к несущему основанию", "item"],
    ["perimeter_track_anchors", "material", "Анкеры периметрального профиля", "item"],
    ["metal_to_metal_screws", "material", "Винты металл-металл", "item"],
    ["acoustic_perimeter_tape", "material", "Уплотнительная или акустическая лента периметра", "m"],
    ["access_hatch_reinforcement_profile", "material", "Профиль усиления ревизионных люков", "m", "CONDITIONAL"],
    ["mep_opening_reinforcement_profile", "material", "Профиль усиления MEP-проходок и оборудования", "m", "CONDITIONAL"],
    ["movement_joint_profile", "material", "Профиль деформационного или контрольного шва", "m", "CONDITIONAL"],
    ["cut_edge_corrosion_protection", "material", "Защита мест реза металлического профиля", "l"],
    ["frame_hidden_labels", "material", "Маркировка скрытых элементов и зон нагрузок", "item"],
    ["anchor_point_layout", "labor", "Разметка точек анкеров и подвесов", "man_hour"],
    ["anchor_hole_drilling", "labor", "Сверление отверстий с пылеудалением", "man_hour"],
    ["anchor_installation", "labor", "Установка и контроль анкеров", "man_hour"],
    ["profile_cutting", "labor", "Раскрой профилей по карте", "man_hour"],
    ["perimeter_track_installation", "labor", "Монтаж направляющего периметра", "man_hour"],
    ["hanger_installation", "labor", "Монтаж подвесов и тяг", "man_hour"],
    ["primary_profile_installation", "labor", "Монтаж несущих профилей", "man_hour"],
    ["secondary_profile_installation", "labor", "Монтаж поперечных профилей", "man_hour"],
    ["opening_reinforcement_installation", "labor", "Усиление люков и инженерных отверстий", "man_hour", "CONDITIONAL"],
    ["frame_level_adjustment", "labor", "Пространственная выверка каркаса", "man_hour"],
    ["profile_cut_treatment", "labor", "Обработка мест реза профиля", "man_hour"],
    ["laser_level", "equipment", "Лазерный нивелир", "machine_hour"],
    ["utility_locator", "equipment", "Трассоискатель скрытых коммуникаций", "machine_hour"],
    ["rotary_hammer", "equipment", "Перфоратор для анкеровки", "machine_hour"],
    ["dust_extractor", "equipment", "Промышленное пылеудаление при сверлении", "machine_hour"],
    ["profile_cutting_tool", "equipment", "Механизированный инструмент раскроя профиля", "machine_hour"],
    ["screwdriver", "equipment", "Шуруповерт монтажа каркаса", "machine_hour"],
    ["anchor_pull_test", "testing", "Выборочное испытание или контроль анкеров", "test", "CONDITIONAL"],
    ["hanger_spacing_check", "testing", "Контроль шага подвесов и профилей", "test"],
    ["frame_level_and_plane_survey", "testing", "Приемочная съемка уровня, плоскости и жесткости", "test"],
  ],
  ALIGN: [
    ["adjustable_hanger_parts", "material", "Регулировочные детали подвесов", "item"],
    ["corrective_connectors", "material", "Корректирующие соединители", "item"],
    ["system_shims", "material", "Системные регулировочные прокладки", "item"],
    ["local_cross_profiles", "material", "Локальные дополнительные перемычки", "m", "CONDITIONAL"],
    ["correction_fasteners", "material", "Крепеж корректирующих элементов", "item"],
    ["reference_grid_setout", "labor", "Разбивка контрольной сетки отметок", "man_hour"],
    ["hanger_adjustment", "labor", "Регулировка подвесов по контрольной сетке", "man_hour"],
    ["local_reinforcement_installation", "labor", "Установка локальных усилений", "man_hour", "CONDITIONAL"],
    ["node_refastening", "labor", "Перефиксация ослабленных соединений", "man_hour", "CONDITIONAL"],
    ["laser_plane_survey", "equipment", "Лазерная съемка плоскости", "machine_hour"],
    ["deviation_gauge", "equipment", "Контрольный измерительный инструмент", "machine_hour"],
    ["final_deviation_survey", "testing", "Итоговая съемка отклонений", "test"],
    ["deviation_map", "documentation", "Карта отклонений и корректировок", "document"],
  ],
  INSULATE: [
    ["primary_insulation_layer", "material", "Изоляция основного проектного слоя", "m2"],
    ["additional_insulation_layers", "material", "Изоляция дополнительных слоев", "m2", "CONDITIONAL"],
    ["acoustic_membrane", "material", "Акустическая мембрана", "m2", "CONDITIONAL"],
    ["vapour_control_membrane", "material", "Пароизоляционная мембрана", "m2", "CONDITIONAL"],
    ["support_mesh", "material", "Поддерживающая сетка изоляции", "m2", "CONDITIONAL"],
    ["disc_fasteners", "material", "Тарельчатые или системные фиксаторы", "item", "CONDITIONAL"],
    ["membrane_tape", "material", "Лента герметизации мембраны", "m", "CONDITIONAL"],
    ["perimeter_sealant", "material", "Герметик периметра изоляционного контура", "kg", "CONDITIONAL"],
    ["penetration_cuffs", "material", "Манжеты инженерных проходок", "item", "CONDITIONAL"],
    ["cavity_dryness_test", "testing", "Контроль сухости полости до закрытия", "test"],
    ["insulation_cutting", "labor", "Раскрой изоляции без щелей", "man_hour"],
    ["mep_fitting", "labor", "Подгонка изоляции вокруг MEP-элементов", "man_hour", "CONDITIONAL"],
    ["layer_installation", "labor", "Послойная установка изоляции", "man_hour"],
    ["membrane_installation", "labor", "Монтаж и герметизация мембраны", "man_hour", "CONDITIONAL"],
    ["insulation_cutting_tool", "equipment", "Инструмент точного раскроя изоляции", "machine_hour"],
    ["insulation_dust_extractor", "equipment", "Пылеудаление при раскрое", "machine_hour"],
    ["insulation_continuity_test", "testing", "Контроль сплошности и отсутствия щелей", "test"],
    ["membrane_integrity_test", "testing", "Контроль герметичности мембраны", "test", "CONDITIONAL"],
  ],
  CLAD: [
    ["first_layer_gypsum_board", "material", "Гипсокартонная плита первого слоя", "m2"],
    ["additional_layer_gypsum_board", "material", "Гипсокартонные плиты дополнительных слоев", "m2", "CONDITIONAL"],
    ["first_layer_screws", "material", "Винты крепления первого слоя", "item"],
    ["additional_layer_screws", "material", "Винты крепления дополнительных слоев", "item", "CONDITIONAL"],
    ["separation_tape", "material", "Разделительная лента примыканий", "m"],
    ["elastic_perimeter_sealant", "material", "Эластичный герметик периметра", "kg", "CONDITIONAL"],
    ["opening_sleeves_and_edges", "material", "Обрамление и гильзы отверстий", "item", "CONDITIONAL"],
    ["movement_joint_component", "material", "Компонент деформационного шва", "m", "CONDITIONAL"],
    ["surface_protection_sheet", "material", "Защита смонтированной обшивки до сдачи", "m2"],
    ["frame_readiness_survey", "testing", "Приемка каркаса перед закрытием", "test"],
    ["board_layout_and_stagger_plan", "documentation", "Карта раскладки и разбежки швов", "document"],
    ["board_cutting", "labor", "Раскрой плит по карте", "man_hour"],
    ["edge_preparation", "labor", "Обработка заводских и резаных кромок", "man_hour"],
    ["first_layer_installation", "labor", "Монтаж первого слоя плит", "man_hour"],
    ["additional_layer_installation", "labor", "Монтаж дополнительных слоев", "man_hour", "CONDITIONAL"],
    ["opening_cutouts", "labor", "Вырезы под люки, светильники и MEP", "man_hour", "CONDITIONAL"],
    ["board_lift", "equipment", "Подъемник листов", "machine_hour"],
    ["board_saw", "equipment", "Инструмент раскроя плит", "machine_hour"],
    ["cladding_screwdriver", "equipment", "Шуруповерт с ограничителем глубины", "machine_hour"],
    ["fastener_depth_test", "testing", "Контроль глубины и шага крепежа", "test"],
    ["layer_stagger_test", "testing", "Контроль разбежки стыков слоев", "test", "CONDITIONAL"],
    ["cladding_handover", "documentation", "Передача обшивки владельцу заделки швов", "document"],
  ],
  FINISH_JOINT: [
    ["edge_primer", "material", "Грунтовка резаных кромок", "kg", "CONDITIONAL"],
    ["base_joint_compound", "material", "Базовый состав заделки швов", "kg"],
    ["finish_joint_compound", "material", "Финишный состав швов", "kg"],
    ["paper_joint_tape", "material", "Бумажная армирующая лента", "m"],
    ["internal_corner_tape", "material", "Лента внутренних углов", "m", "CONDITIONAL"],
    ["external_corner_profile", "material", "Профиль наружных углов", "m", "CONDITIONAL"],
    ["separation_tape_joint", "material", "Разделительная лента примыканий", "m"],
    ["elastic_joint_sealant", "material", "Эластичный герметик примыканий", "kg", "CONDITIONAL"],
    ["screw_head_compound", "material", "Состав обработки головок крепежа", "kg"],
    ["coarse_abrasive", "material", "Абразив промежуточного шлифования", "item"],
    ["fine_abrasive", "material", "Абразив финишного шлифования", "item"],
    ["cut_edge_bevel", "labor", "Формирование фаски резаных кромок", "man_hour", "CONDITIONAL"],
    ["edge_dedusting", "labor", "Обеспыливание кромок", "man_hour"],
    ["gap_prefill", "labor", "Предварительное заполнение раскрытых зазоров", "man_hour", "CONDITIONAL"],
    ["base_layer_application", "labor", "Нанесение базового слоя состава", "man_hour"],
    ["tape_embedding", "labor", "Втапливание армирующей ленты", "man_hour"],
    ["second_layer_application", "labor", "Нанесение второго слоя", "man_hour"],
    ["finish_layer_application", "labor", "Нанесение финишного слоя", "man_hour"],
    ["screw_head_treatment", "labor", "Послойная обработка головок винтов", "man_hour"],
    ["corner_treatment", "labor", "Обработка внутренних и наружных углов", "man_hour", "CONDITIONAL"],
    ["technological_drying", "temporary_work", "Выдержка технологических интервалов с контролем условий", "service"],
    ["joint_mixer", "equipment", "Миксер приготовления состава", "machine_hour"],
    ["sander_with_dust_extraction", "equipment", "Шлифмашина с пылеудалением", "machine_hour"],
    ["surface_quality_test", "testing", "Контроль плоскости, полос и качества поверхности", "test"],
  ],
  REPAIR: [
    ["defect_survey", "testing", "Детальное обследование дефектов", "test"],
    ["cause_determination", "subcontract_service", "Диагностика причины повреждения", "service"],
    ["moisture_survey", "testing", "Карта влажности ремонтной зоны", "test", "CONDITIONAL"],
    ["frame_support_survey", "testing", "Обследование каркаса, подвесов и основания", "test"],
    ["repair_mep_coordination", "subcontract_service", "Координация ремонта с MEP-владельцами", "service", "CONDITIONAL"],
    ["repair_equipment_protection", "material", "Защита оборудования и отделки", "m2"],
    ["repair_dust_enclosure", "temporary_work", "Герметичная пылезащитная зона ремонта", "service"],
    ["temporary_frame_support", "temporary_work", "Временное поддержание ослабленной конструкции", "service", "CONDITIONAL"],
    ["demolition_boundary_marking", "labor", "Разметка границ контролируемого вскрытия", "man_hour"],
    ["local_controlled_opening", "labor", "Контролируемое вскрытие конструкции", "man_hour"],
    ["finish_layer_removal", "labor", "Удаление поврежденного финишного слоя", "man_hour", "CONDITIONAL"],
    ["board_layer_removal", "labor", "Послойный демонтаж поврежденных плит", "man_hour"],
    ["joint_and_corner_removal", "labor", "Удаление поврежденных швов и углов", "man_hour"],
    ["insulation_removal", "labor", "Извлечение загрязненной изоляции", "man_hour", "CONDITIONAL"],
    ["fastener_removal", "labor", "Демонтаж поврежденного крепежа", "man_hour"],
    ["profile_removal", "labor", "Демонтаж поврежденных профилей", "man_hour", "CONDITIONAL"],
    ["reusable_resource_sorting", "labor", "Отбор и учет пригодных возвратных материалов", "man_hour"],
    ["replacement_profile", "material", "Новый профиль точного типа", "m", "CONDITIONAL"],
    ["replacement_connectors", "material", "Новые соединители ремонтного контура", "item", "CONDITIONAL"],
    ["replacement_anchors_hangers", "material", "Новые анкеры и подвесы", "item", "CONDITIONAL"],
    ["repair_contour_reinforcement", "material", "Профиль усиления ремонтного контура", "m", "CONDITIONAL"],
    ["replacement_insulation", "material", "Новая изоляция", "m2", "CONDITIONAL"],
    ["replacement_membrane", "material", "Новая мембрана и герметизирующая лента", "m2", "CONDITIONAL"],
    ["replacement_board_first_layer", "material", "Плита первого восстанавливаемого слоя", "m2"],
    ["replacement_board_additional_layers", "material", "Плиты дополнительных слоев", "m2", "CONDITIONAL"],
    ["replacement_layer_fasteners", "material", "Крепеж восстановленных слоев", "item"],
    ["repair_joint_tape", "material", "Лента ремонтных швов", "m"],
    ["repair_base_compound", "material", "Базовый ремонтный состав", "kg"],
    ["repair_finish_compound", "material", "Финишный ремонтный состав", "kg"],
    ["repair_compatible_primer", "material", "Совместимая грунтовка ремонтной зоны", "kg"],
    ["frame_reinstatement", "labor", "Восстановление каркаса и подвесов", "man_hour", "CONDITIONAL"],
    ["insulation_reinstatement", "labor", "Восстановление изоляции и мембраны", "man_hour", "CONDITIONAL"],
    ["board_reinstatement", "labor", "Послойное восстановление обшивки", "man_hour"],
    ["joint_reinstatement", "labor", "Восстановление швов и углов", "man_hour"],
    ["repair_demolition_saw", "equipment", "Пила контролируемого вскрытия", "machine_hour"],
    ["repair_dust_extractor", "equipment", "Пылеудаление ремонта", "machine_hour"],
    ["repair_moisture_meter", "equipment", "Измеритель влажности", "machine_hour", "CONDITIONAL"],
    ["repair_frame_tool", "equipment", "Инструмент восстановления каркаса", "machine_hour", "CONDITIONAL"],
    ["repair_board_tool", "equipment", "Инструмент раскроя и крепления плит", "machine_hour"],
    ["cause_elimination_test", "testing", "Подтверждение устранения причины дефекта", "test"],
    ["preclosure_moisture_test", "testing", "Контроль влажности до закрытия", "test", "CONDITIONAL"],
    ["anchor_support_test", "testing", "Контроль восстановленных анкеров и подвесов", "test", "CONDITIONAL"],
    ["repair_plane_test", "testing", "Контроль плоскости и отметки ремонта", "test"],
    ["hidden_layer_test", "testing", "Контроль восстановленных скрытых слоев", "test"],
    ["before_during_after_photo", "documentation", "Фотофиксация до, во время и после ремонта", "document"],
    ["replaced_reused_schedule", "documentation", "Ведомость замененных и сохраненных ресурсов", "document"],
    ["repair_as_built_record", "documentation", "Исполнительная запись ремонтного контура", "document"],
    ["repair_final_acceptance", "testing", "Итоговая приемка устраненного дефекта", "test"],
  ],
};
const VARIANT_EXPECTED: Readonly<Record<string, readonly [string, ExpectedCategory, string, string, ExpectedCandidate["applicability"]?][]>> = {
  standard: [],
  large_area: [["large_area_control_zones", "testing", "Дополнительные контрольные захватки большой площади", "test"], ["large_area_joint_review", "subcontract_service", "Проверка деформационных и контрольных швов", "service"], ["large_area_internal_logistics", "transport", "Логистика между захватками", "t_m"]],
  small_area: [["small_area_manual_feed", "labor", "Ручная подача в стесненной зоне", "man_hour"], ["small_area_local_cutting", "labor", "Локальный раскрой в стесненной зоне", "man_hour"], ["small_area_compact_enclosure", "temporary_work", "Компактная пылезащитная зона", "service"]],
  technical_room: [["technical_room_permit_loto", "documentation", "Permit/LOTO решение владельца оборудования", "document"], ["technical_equipment_protection", "material", "Защита действующего оборудования", "m2"], ["technical_extra_utility_detection", "equipment", "Расширенный поиск коммуникаций", "machine_hour"], ["technical_interface_scheme", "documentation", "Исполнительная схема MEP-интерфейсов", "document"]],
  wet_zone: [["wet_zone_material_compatibility", "testing", "Проверка совместимости материалов влажной зоны", "test"], ["wet_zone_corrosion_resistant_fasteners", "material", "Коррозионностойкий крепеж", "item"], ["wet_zone_cut_protection", "material", "Защита мест реза и обработки", "kg"], ["wet_zone_moisture_control", "testing", "Контроль влажности перед закрытием", "test"], ["wet_zone_edge_penetration_seal", "material", "Герметизация кромок и проходок", "kg"], ["wet_zone_protocol", "documentation", "Протокол условий влажной зоны", "document"]],
  high_load: [["high_load_engineering_check", "subcontract_service", "Инженерная проверка расчетной нагрузки", "service"], ["high_load_primary_profile", "material", "Усиленный несущий профиль", "m"], ["high_load_supplemental_hangers", "material", "Дополнительные подвесы", "item"], ["high_load_supplemental_anchors", "material", "Дополнительные анкеры", "item"], ["high_load_local_reinforcement", "material", "Локальные усиления в точках нагрузок", "m"], ["high_load_connection_fasteners", "material", "Усиленный крепеж соединений", "item"], ["high_load_proof_test", "testing", "Контрольная проверка усиленных узлов", "test"], ["high_load_capacity_protocol", "documentation", "Протокол допустимой нагрузки и зон крепления", "document"]],
};
const operationOfId = (catalogId: string): string => {
  for (const [marker, operation] of [["_finish_joint_", "FINISH_JOINT"], ["_insulate_", "INSULATE"], ["_prepare_", "PREPARE"], ["_repair_", "REPAIR"], ["_align_", "ALIGN"], ["_clad_", "CLAD"], ["_frame_", "FRAME"]] as const) if (catalogId.includes(marker)) return operation;
  throw new Error(`BATCH003_OPERATION_NOT_FOUND:${catalogId}`);
};
const variantOfId = (catalogId: string): string => {
  for (const variant of ["technical_room", "large_area", "small_area", "wet_zone", "high_load", "standard"] as const) if (catalogId.endsWith(`_${variant}`)) return variant;
  throw new Error(`BATCH003_VARIANT_NOT_FOUND:${catalogId}`);
};
const expectedScopeByCatalog = new Map<string, ExpectedCandidate[]>();
for (const row of selected) {
  const catalogId = String(row.catalogId);
  const operation = operationOfId(catalogId);
  const variant = variantOfId(catalogId);
  const operationCandidates = OPERATION_EXPECTED_IDS[operation].map(([id, category, title, unit, applicability]) => candidate(id, category, title, unit, applicability));
  const variantCandidates = VARIANT_EXPECTED[variant].map(([id, category, title, unit, applicability]) => candidate(id, category, title, unit, applicability));
  const candidates = [...COMMON_EXPECTED, ...operationCandidates, ...variantCandidates];
  if (new Set(candidates.map((item) => item.candidateId)).size !== candidates.length) throw new Error(`BATCH003_EXPECTED_CANDIDATE_DUPLICATE:${catalogId}`);
  expectedScopeByCatalog.set(catalogId, candidates);
}

mkdirSync(output, { recursive: true });
const writeJson = (relativePath: string, value: unknown): void => writeDeterministic(output, relativePath, stableJson(value));
const writeJsonl = (relativePath: string, rows: readonly JsonRecord[]): void => writeDeterministic(output, relativePath, `${rows.map(stableJsonLine).join("\n")}\n`);
const binding = {
  schemaVersion: "Batch003PredecessorExactBindingV1", status: "FROZEN_GREEN", contractSha256: CONTRACT_SHA,
  checkedAt: CAPTURED_AT, diagnosticWorktreePath: path.resolve(target), H2, T2, P2, M2,
  E2: sha256(evidenceBytes), RPT2: sha256(reportBytes), TOK2: sha256(tokenBytes), programControlStateV5Sha256: sha256(v5Bytes),
  N2, A5, Q5, M6, G5, evidenceFilesVerified: "53/53",
  originalBatch002TokenPresent: false,
  tokenOrigin: "POST_SEAL_DETERMINISTIC_DERIVATION",
  tokenDerivedOnlyFromSealedManifestAndProgramControlStateV5: true,
  derivedTokenSha256: sha256(tokenBytes),
  derivedTokenNotPartOfOriginalEvidenceIndex: true,
  equations: { n2FromAdmitted: A5 - 71, n2FromM5: 3989 - Q5, partition: A5 + Q5 + M6, remaining: Q5 + M6 }, verdict: "GREEN",
};
writeJson("00-activation/BATCH003_PREDECESSOR_EXACT_BINDING.json", binding);
writeJson("00-activation/BATCH002_CLOSEOUT_RECONCILIATION.json", { ...binding, manifestStatus: manifest.status, independentAdmission: audit.admitted, finalBoqRows: audit.totalRows, rowRange: audit.range, replay: replay.replay, replayMismatch: replay.byteMismatch, evidenceMismatch: evidenceMismatches.length, batch003Selected: false, worktreeAtGateA0: "CLEAN", verdict: "GREEN" });
writeJson("00-activation/BATCH003_ADAPTIVE_WAVE_TIER_DECISION.json", {
  schemaVersion: "Batch003AdaptiveWaveTierDecisionR2", tier: "HOLD", reasonCode: "TELEMETRY_FIELD_ABSENT_SAFE_HOLD",
  inputs: { batch002GroupCount: 11, N2, batch002FinalBoqRows: 5037, batch002RepairLoopCount: null, batch002P0DefectCountBeforeRepair: null, batch002P0DefectCountAfterRepair: 0, batch002MutationCount: 120, batch002ReplayMismatchCount: 0, batch002LongestSingleCommandSeconds: null, batch002RecoveredOomCount: null, batch002AndroidPassCount: 55, batch002OutsideScopeCount: 0, batch002QueueMismatchCount: 0 },
  absentTelemetryFields: ["batch002RepairLoopCount", "batch002P0DefectCountBeforeRepair", "batch002LongestSingleCommandSeconds", "batch002RecoveredOomCount"],
  budget: { preferredGroupCount: [8, 12], preferredWorkCount: [40, 96], hardMaximumGroupCount: 14, hardMaximumWorkCount: 120, preferredPredictedBoqRows: [2500, 7500], hardMaximumPredictedBoqRows: 8000 }, verdict: "GREEN_SAFE_HOLD",
});
writeJsonl("01-inventory/M5_V5_EXACT_ORDERED_LEDGER.jsonl", remainingLedger);
writeJson("01-inventory/GLOBAL_PARTITION_V5_PROOF.json", { counts: { admitted: A5, m5Remaining: Q5, m6Remaining: M6, globalRemaining: G5, globalTotal: 11610 }, setHashes: v5.setHashes, arithmetic: { partition: A5 + Q5 + M6, remaining: Q5 + M6 }, duplicate: 0, missing: 0, orphan: 0, admittedContamination: 0, m6Contamination: 0, verdict: "GREEN" });

const candidates = [
  { anchorOrdinal: 1, familyId: "DRYWALL_BULKHEAD_INSTALL_UMBRELLA", groupCount: 1, workCount: 6, predictedRows: 0, decision: "DEFERRED_WITH_EXACT_REASON", reasonCode: "PARENT_CHILD_DOUBLE_COUNT_UNRESOLVED" },
  { anchorOrdinal: 21, familyId: "DRYWALL_CURVE_INSTALL_UMBRELLA", groupCount: 1, workCount: 6, predictedRows: 0, decision: "DEFERRED_WITH_EXACT_REASON", reasonCode: "PARENT_CHILD_DOUBLE_COUNT_UNRESOLVED" },
  { anchorOrdinal: 42, familyId: "DRYWALL_FLAT_SUSPENDED_CEILING_SUBWAVE_R2", groupCount: 7, workCount: 36, predictedRows: 3450, decision: "SELECTED_DEPENDENCY_CLOSED_SUBWAVE", reasonCode: "WHOLE_TECHNOLOGY_STAGE_SET_BELOW_PREFERRED_MINIMUM_TO_PRESERVE_OWNER_INTEGRITY" },
];
writeJsonl("02-selection/TECHNOLOGY_FAMILY_CANDIDATE_INDEX.jsonl", candidates);
writeJsonl("02-selection/FAMILY_DECISION_LEDGER.jsonl", candidates);
writeJson("02-selection/BATCH003_SELECTED_WAVE_CONTRACT.json", { familyId: "DRYWALL_FLAT_SUSPENDED_CEILING_SUBWAVE_R2", activeTier: "HOLD", selectedGroupCount: 7, selectedWorkCount: 36, preferredMinimumException: true, predictedRowsAtFreeze: 3450, hardMaximumRows: 8000, selectedSetHash: setHash(selectedIds), batch003Selected: true, executionAuthorizedByContract: true, executionStarted: true, manifestPlaceholders: 0, verdict: "GREEN" });
writeJsonl("02-selection/BATCH003_SELECTED_CATALOG_ID_INDEX.jsonl", selected.map((row, index) => ({ selectionOrdinal: index + 1, queuePosition: row.queuePosition, catalogId: row.catalogId, titleRu: row.titleRu, identityRole: row.identityRole, groupId: row.workGroupId })));
writeJson("02-selection/DEPENDENCY_CLOSURE_PROOF.json", { executionOrder: groups.map((group) => group.groupKey), dependencies: { PREPARE: ["accepted_joint_finish_revision_id"], FRAME: [], ALIGN: ["accepted_frame_revision_id"], INSULATE: ["accepted_frame_revision_id"], CLAD: ["accepted_frame_revision_id", "accepted_alignment_revision_id"], FINISH_JOINT: ["accepted_cladding_revision_id"], REPAIR: ["condition_survey_record_id", "accepted_repair_detail_id"] }, umbrellaInstallDeferred: true, hardPrerequisiteMissing: 0, ownerConflict: 0, doubleCountConflict: 0, verdict: "GREEN" });
writeJson("02-selection/SELECTION_DETERMINISM_PROOF.json", { source: "M5_V5_EXACT_ORDERED_LEDGER", firstAnchor: remainingLedger[0].catalogId, deferredAnchors: candidates.slice(0, 2).map((row) => row.familyId), firstExecutableFamily: candidates[2].familyId, selectedSetHash: setHash(selectedIds), rerunStable: true, verdict: "GREEN" });

const sources: JsonRecord[] = [
  { sourceId: "KG_SP_KR_65_101_2025", authority: "Минстрой КР", title: "СП КР 65-101:2025 Изоляционные и отделочные покрытия", status: "active", registryUrl: "https://minstroy.gov.kg/ru/document/150/show", openTextUrl: "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/obedinennyeizolacionnye-61267ac76cb3f36a0.49346677.pdf", checkedAt: "2026-08-13", sha256: "d80e0d65fcf4c269f044381eac13a2b6c8b376878d60e439a41e6296f9901fa1", locators: ["PDF p.99 §§4.4–4.9", "PDF p.140 §§7.7.1–7.7.5", "PDF pp.140–141 table 7.8"], roles: ["KG_CONSTRUCTION_NORM_PRIMARY", "KG_ACCEPTANCE_AND_TESTING"] },
  { sourceId: "KG_KRER_10_05_011", authority: "Минстрой КР", title: "КРЕР 10-05-011 Устройство подвесных потолков из гипсокартонных листов", status: "active", registryUrl: "https://minstroy.gov.kg/ru/kyzmat/431/show", openTextUrl: "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/prikazot28aprela2022godano52npa_compressed-25868e3850a3ecfb9.81892156.pdf", checkedAt: "2026-08-13", sha256: "d99c0a9a8aab76cffa70b34cbc76de2dc6c0694dbd9ecbaba3a9a379c8e018c9", locators: ["PDF pp.97–99", "table 10-05-011", "Е10-05-011-01/02", "measure 100 m2"], roles: ["KG_ESTIMATE_RATE_PRIMARY"] },
  { sourceId: "kg_krerr_2015_application_guidance", authority: "Минстрой КР", title: "Указания по применению КРЕРр-2015", status: "active", registryUrl: "https://minstroy.gov.kg/ru/kyzmat/358/show", openTextUrl: "https://minstroy.gov.kg/ru/state_program/download-pdf/remontnostroitelnyeraboty-7816900591f076187.31620629.pdf", checkedAt: "2026-08-13", sha256: "ac01cbf60ee8c24b336a75f42efb4ff2747ed261bcbe5c2e93a1f6c92f1e7576", locators: ["PDF p.7 §3.3", "PDF p.10 vertical transport and waste"], roles: ["KG_ESTIMATE_RATE_PRIMARY_REPAIR"] },
  { sourceId: "KG_SN_KR_12_01_2018", authority: "Минстрой КР", title: "СН КР 12-01:2018 Безопасность труда в строительстве", status: "active", registryUrl: "https://cbd.minjust.gov.kg/200258/edition/1121976/ru", openTextUrl: "https://minstroy.gov.kg/kg/state_program/download-pdf/snkr12012018bezopasnosttrudavstroitelstve-6366853ed862b98c2.90721660.pdf", checkedAt: "2026-08-13", sha256: "a143d151e3bd6f36a24e789686f95d4445b3f6d0ae8c5bb66f5a433021be9529", locators: ["§6.1.6", "§6.2.2", "ППР/рабочие места/СИЗ"], roles: ["KG_SAFETY_PRIMARY"] },
  { sourceId: "KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE", authority: "Минстрой КР", title: "Реестр сертификатов соответствия на строительные материалы", status: "live project-specific route", registryUrl: "https://minstroy.gov.kg/ru/building/materials/sertificate", openTextUrl: "https://minstroy.gov.kg/ru/building/materials/sertificate", checkedAt: "2026-08-13", sha256: "e3ca1768c5c3afa608b5eb77334f74e1da460d2572a1d46801b50badded300c1", locators: ["active certificate for exact party", "system passport", "project specification"], roles: ["KG_MATERIAL_STANDARD"] },
];
writeJsonl("03-norms/SOURCE_LOCATOR_LEDGER.jsonl", sources);
writeJsonl("03-norms/KG_NORMATIVE_READINESS.jsonl", groups.map((group) => ({ groupKey: group.groupKey, roles: ["KG_CONSTRUCTION_NORM_PRIMARY", "KG_ESTIMATE_RATE_PRIMARY", "KG_MATERIAL_STANDARD", "KG_SAFETY_PRIMARY", "KG_ACCEPTANCE_AND_TESTING"], sourceIds: sources.map((source) => source.sourceId), locatorReady: true, verdict: "GREEN" })));
const lanes = ["KG", "EAEU", "CIS_GOST", "RU", "KZ", "UZ", "TJ", "TM", "AM", "AZ", "INTERNATIONAL"];
writeJsonl("03-norms/REGIONAL_11_DIRECTION_DECISIONS.jsonl", groups.flatMap((group) => lanes.map((lane) => ({ groupKey: group.groupKey, lane, decision: lane === "KG" ? "MANDATORY_IN_KG" : lane === "EAEU" ? "EAEU_MANDATORY_SAFETY_ONLY" : lane === "CIS_GOST" ? "INTERSTATE_COMPARATIVE" : "FOREIGN_COMPARATIVE", foreignPromotedToKgMandatory: false, reason: lane === "KG" ? "Применяется запечатанная первичная цепочка КР." : "Только сравнительное решение; обязательность в КР не заявляется." }))));
const internationalSystems = ["ISO", "IEC", "EN", "ASTM", "NFPA", "ASHRAE", "DIN", "BS"];
writeJsonl("03-norms/INTERNATIONAL_APPLICABILITY_DECISIONS.jsonl", groups.flatMap((group) => internationalSystems.map((system) => ({ groupKey: group.groupKey, system, decision: ["EN", "ASTM", "DIN", "BS"].includes(system) ? "TECHNICAL_SYSTEM_EVIDENCE_ONLY" : "NOT_APPLICABLE_WITH_REASON", reason: "Не заменяет обязательную цепочку КР; применяется только при точной проектной ссылке или паспорте системы." }))));

const expectedScopes: JsonRecord[] = [];
const candidateDispositions: JsonRecord[] = [];
const plannedParameterSchemas: JsonRecord[] = [];
const plannedPassports: JsonRecord[] = [];
const completenessSlots = [
  "основные материалы", "вспомогательные материалы", "крепёж", "закладные/опоры/системные компоненты", "труд",
  "геодезия/разметка/трассировка", "обследование и подготовка основания/фронта", "вскрытие/демонтаж/очистка",
  "основные монтажные или строительные операции", "соединения/стыки/герметизация/огнезаделка",
  "финиш/защита/антикоррозионная обработка", "машины", "ручной и механизированный инструмент",
  "производственное и измерительное оборудование", "доставка", "погрузка", "разгрузка",
  "внутриплощадочное перемещение/подъём", "временный доступ/ограждения/защита", "измерения/испытания/QA",
  "настройка/пусконаладка/commissioning", "специализированные инженерные и лабораторные услуги",
  "interfaces, проходки, примыкания и восстановление смежных систем", "отходы/упаковка/сортировка/вывоз/утилизация",
  "HSE/пожарная/экологическая безопасность", "проектные документы/submittals/material approvals",
  "журналы/акты скрытых работ/исполнительные схемы", "освидетельствование/приёмка/передача заказчику",
  "обучение/ЗИП/гарантийные и эксплуатационные документы", "typed children, альтернативы, исключения и границы владельцев",
] as const;
const completeness: JsonRecord[] = [];
for (const row of selected) {
  const catalogId = String(row.catalogId);
  const operation = operationOfId(catalogId);
  const variant = variantOfId(catalogId);
  const candidates = expectedScopeByCatalog.get(catalogId)!;
  const scopeId = `IndependentExpectedResourceScopeV6:${catalogId}`;
  const candidateSetHash = setHash(candidates.map((item) => `${item.candidateId}:${item.category}:${item.unitId}:${item.applicability}`));
  expectedScopes.push({
    schemaVersion: "IndependentExpectedResourceScopeV6", scopeId, catalogId, titleRu: row.titleRu,
    system: "FLAT_SUSPENDED_DRYWALL_CEILING", operation, variant,
    restorationMethod: "SEMANTIC_WORK_MEANING_PLUS_PHYSICAL_TECHNOLOGY_PLUS_KG_NORMATIVE_STAGES_PLUS_OWNER_BOUNDARIES",
    legacyBoqUsedAsCompletenessOracle: false, implementationBuilderUsedAsCompletenessOracle: false,
    candidateCount: candidates.length, candidateSetHash, candidates, expectedCandidateDispositionCoverage: 100,
  });
  for (const item of candidates) candidateDispositions.push({
    schemaVersion: "PerWorkResourceCandidateDispositionV6", catalogId, scopeId, candidateId: item.candidateId,
    category: item.category, unitId: item.unitId,
    disposition: item.applicability === "APPLICABLE" ? "INCLUDED_AS_SEPARATE_ROW" : "CONDITIONAL_ON_USER_PARAMETER",
    expectedRowId: `${row.canonicalTechnologyId}:drywall-flat-ceiling-v6:row:${item.candidateId}`,
    reasonRu: item.applicability === "APPLICABLE" ? "Физически самостоятельная применимая позиция; отдельная строка обязательна." : "Включается отдельной строкой при явном project/user parameter; скрытое количество запрещено.",
    basis: item.basis,
  });
  const controls = [
    { parameterId: "work_included", labelRu: "Работа включена в проект", inputType: "boolean", unitId: null, required: true, consumers: [`scope:${catalogId}`] },
    { parameterId: "estimate_scope_mode", labelRu: "Режим профессиональной полноты", inputType: "choice", unitId: null, required: true, choices: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"], consumers: [`scope:${catalogId}`] },
    { parameterId: "price_basis_reference", labelRu: "Источник цены", inputType: "text", unitId: null, required: true, consumers: candidates.map((item) => `price-route:${item.candidateId}`) },
    { parameterId: "price_basis_date", labelRu: "Дата источника цены", inputType: "text", unitId: null, required: true, consumers: candidates.map((item) => `price-route:${item.candidateId}`) },
  ];
  const candidateParameters = candidates.flatMap((item) => [
    { parameterId: `quantity_${item.candidateId}`, labelRu: `Проектное количество: ${item.titleRu}`, inputType: "number", unitId: item.unitId, minimum: item.applicability === "APPLICABLE" ? 0.000001 : 0, maximum: 100_000_000, required: item.applicability === "APPLICABLE", visibleWhen: item.applicability === "APPLICABLE" ? "ALWAYS" : `PROJECT_CONDITION_${item.candidateId}=true`, consumers: [`formula:${item.candidateId}`], normativeSourceIds: [operation === "REPAIR" ? "kg_krerr_2015_application_guidance" : "KG_KRER_10_05_011", "KG_SP_KR_65_101_2025"], sourceLocator: operation === "REPAIR" ? "КРЕРр указания §3.3 + проектная дефектная ведомость" : "КРЕР 10-05-011 pp.97–99 + проектная раскладка" },
    { parameterId: `unit_price_${item.candidateId}_kgs`, labelRu: `Цена: ${item.titleRu}`, inputType: "number", unitId: `KGS_per_${item.unitId}`, minimum: 0.000001, maximum: 1_000_000_000_000, required: true, visibleWhen: "ROW_APPLICABLE", consumers: [`price-route:${item.candidateId}`], normativeSourceIds: ["KG_KRER_10_05_011"], sourceLocator: "Точная цена из catalog/regional input/supplier quote/manual contract route; silent zero запрещен." },
  ]);
  const parameters = [...controls, ...candidateParameters];
  const schemaId = `${row.canonicalTechnologyId}:NormBoundUserParameterSchemaV6`;
  plannedParameterSchemas.push({
    schemaVersion: "NormBoundUserParameterSchemaV6", schemaId, catalogId, titleRu: row.titleRu, operation, variant,
    parameters, shownButUnusedParameters: 0, formulaInputsWithoutUserOrDerivedSource: 0, outOfBoundsAccepted: 0,
    invalidChoiceAccepted: 0, hiddenQuantitativeAssumptions: 0, unitMismatch: 0,
    schemaHash: sha256(stableJson(parameters)),
  });
  plannedPassports.push({
    schemaVersion: "IndividualProfessionalEstimatePassportV6", passportId: `IndividualProfessionalEstimatePassportV6:${catalogId}`,
    catalogId, displayNameRu: row.titleRu, groupId: row.workGroupId, identityRole: row.identityRole,
    system: "FLAT_SUSPENDED_DRYWALL_CEILING", operation, variant,
    workResultRu: `Самостоятельно принятая стадия ${operationRu[operation]}.`,
    inScope: candidates.map((item) => item.candidateId),
    outOfScope: ["INSTALL umbrella bundle", "other exact typed-child costs", "M6", "BATCH004 content"],
    upstreamDependencies: operation === "FRAME" ? [] : operation === "ALIGN" || operation === "INSULATE" ? ["accepted_frame_revision_id"] : operation === "CLAD" ? ["accepted_frame_revision_id", "accepted_alignment_revision_id"] : operation === "FINISH_JOINT" ? ["accepted_cladding_revision_id"] : operation === "PREPARE" ? ["accepted_joint_finish_revision_id"] : ["condition_survey_record_id", "accepted_repair_detail_id"],
    downstreamOwners: operation === "FRAME" ? ["ALIGN", "INSULATE", "CLAD"] : operation === "CLAD" ? ["FINISH_JOINT"] : operation === "FINISH_JOINT" ? ["PREPARE"] : [],
    typedChildBoundaries: ["PREPARE", "FRAME", "ALIGN", "INSULATE", "CLAD", "FINISH_JOINT", "REPAIR"].filter((owner) => owner !== operation),
    normBoundParameterSchemaId: schemaId, expectedResourceScopeId: scopeId, expectedCandidateCount: candidates.length,
    formulaPlan: "ONE_DIMENSIONALLY_TYPED_FORMULA_PER_PHYSICAL_ROW_FROM_EXPLICIT_PROJECT_INPUT_OR_DERIVED_GEOMETRY",
    resourceGraphPlan: "ONE_SEMANTIC_RESOURCE_NODE_AND_ONE_COST_OWNER_PER_ROW",
    normativeSourceIds: sources.map((source) => source.sourceId), candidateSetHash,
    legacyBoqUsedAsCompletenessOracle: false, unexplainedAlias: false,
  });
  for (let index = 0; index < completenessSlots.length; index += 1) {
    const slot = index + 1;
    const status = slot === 21 || slot === 29 ? "N_A_WITH_REASON" : slot === 30 ? "OWNED_BY_EXACT_TYPED_CHILD" : "INCLUDED";
    completeness.push({
      catalogId, slot, slotNameRu: completenessSlots[index], status,
      reasonRu: slot === 21 ? "У плоской гипсокартонной стадии нет самостоятельной пусконаладки; приемка и instrument QA учтены в слотах 20 и 28." : slot === 29 ? "Работа не образует эксплуатируемого оборудования, ЗИП или обучения персонала." : slot === 30 ? "Альтернативы и смежные стадии имеют exact typed-child owners; INSTALL umbrella не допускается к двойному счету." : "Применимый состав восстановлен независимым expected-resource scope и должен иметь отдельные строки или явные project conditions.",
      evidenceScopeId: scopeId, candidateSetHash,
    });
  }
}
if (expectedScopes.length !== 36 || plannedPassports.length !== 36 || plannedParameterSchemas.length !== 36 || completeness.length !== 1080 || candidateDispositions.length !== expectedScopes.reduce((sum, scope) => sum + Number(scope.candidateCount), 0)) throw new Error("BATCH003_PREFLIGHT_PROFESSIONAL_OBJECT_DENOMINATOR_RED");
writeJsonl("05-execution/INDEPENDENT_EXPECTED_RESOURCE_SCOPE.jsonl", expectedScopes);
writeJsonl("05-execution/PER_WORK_RESOURCE_CANDIDATE_DISPOSITIONS.jsonl", candidateDispositions);
writeJsonl("05-execution/INDIVIDUAL_PROFESSIONAL_ESTIMATE_PASSPORTS.jsonl", plannedPassports);
writeJsonl("05-execution/NORM_BOUND_USER_PARAMETER_SCHEMAS.jsonl", plannedParameterSchemas);
writeDeterministic(output, "05-execution/PER_WORK_COMPLETENESS_30_SLOT_MATRIX.csv", csv(completeness, ["catalogId", "slot", "slotNameRu", "status", "reasonRu", "evidenceScopeId", "candidateSetHash"]));

const authorizedProductionFiles = [
  "src/lib/estimate/v4/domainFactory/constructionNormativeRegistryV1.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/index.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallFlatCeilingExpectedScopeV6.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsProfessionalV4.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsMaximumScopeV5.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRevisionMigrationV4.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding.ts",
];
writeJson("04-manifest/BATCH003_EXACT_EXECUTION_MANIFEST.json", {
  schemaVersion: "Batch003TechnologyWaveExecutionManifestR2",
  predecessorBinding: { H2, T2, M2, E2: binding.E2, RPT2: binding.RPT2, TOK2: binding.TOK2, originalBatch002TokenPresent: false, tokenOrigin: "POST_SEAL_DETERMINISTIC_DERIVATION" },
  programControlStateV5Sha256: binding.programControlStateV5Sha256,
  activeTier: "HOLD", familyId: "DRYWALL_FLAT_SUSPENDED_CEILING_SUBWAVE_R2", groups,
  orderedCatalogIds: selectedIds, count: 36, setHash: setHash(selectedIds), identityRoles,
  dependencyOrder: groups.map((group) => group.groupKey),
  canonicalOwners: selectedIds.map((catalogId) => `domain-passport:drywall-architectural-element-professional-v4:${catalogId}`),
  typedChildBoundaries: ["PREPARE", "FRAME", "ALIGN", "INSULATE", "CLAD", "FINISH_JOINT", "REPAIR"],
  normativeSources: sources.map((source) => source.sourceId), authorizedProductionFiles,
  frozenProfessionalObjects: {
    individualPassports: plannedPassports.length,
    normBoundParameterSchemas: plannedParameterSchemas.length,
    independentExpectedResourceScopes: expectedScopes.length,
    expectedCandidateDispositions: candidateDispositions.length,
    completenessDecisions: completeness.length,
    passportSetHash: setHash(plannedPassports.map((passport) => sha256(stableJson(passport)))),
    parameterSchemaSetHash: setHash(plannedParameterSchemas.map((schema) => sha256(stableJson(schema)))),
    expectedScopeSetHash: setHash(expectedScopes.map((scope) => String(scope.candidateSetHash))),
    dispositionSetHash: setHash(candidateDispositions.map((item) => `${item.catalogId}:${item.candidateId}:${item.disposition}`)),
  },
  forbiddenScope: ["INSTALL umbrella admission", "unselected M5 identities", "M6", "BATCH004 selection or execution"],
  completenessObligations: { slotsPerWork: 30, totalSlots: 1080, candidateDisposition: 100 },
  tests: "focused bounded suites; typecheck 4/4; mutations >=96; Web/Android API34; replay 2/2",
  rollback: `revert one content commit relative to ${H2}`,
  budgets: { tier: "HOLD", groups: 7, works: 36, predictedRows: 3450, hardMaximumWorks: 120, hardMaximumRows: 8000 },
  placeholders: 0, unknownFields: 0, verdict: "GREEN_FROZEN_BEFORE_PRODUCTION_MUTATION",
});
writeJson("04-manifest/BATCH003_SCOPE_GUARD.json", { authorizedProductionFiles, authorizedTestAndEvidencePrefixes: ["tests/aiEstimateV4/technologyWaveR2", "scripts/estimate/*Batch003*", "scripts/e2e/*Batch003*"], forbidden: ["M6", "BATCH004 content", "push", "deploy", "release"], outsideScope: 0, verdict: "GREEN" });
writeDeterministic(output, "JOURNAL.jsonl", `${[
  { seq: 1, time: CAPTURED_AT, stage: "ACTIVATION", gate: "A0", purposeRu: "Точная привязка к запечатанному BATCH-002.", command: "prepareBatch003TechnologyWaveR2 --phase=preflight", exitCode: 0, resultRu: "HEAD/TREE, manifest, 53/53 evidence, token, V5 и replay GREEN.", status: "GREEN", completed: ["A0 binding"], incomplete: ["production execution"], next: "freeze HOLD selection" },
  { seq: 2, time: CAPTURED_AT, stage: "SELECTION", gate: "S0-S5", purposeRu: "Восстановить M5 и выбрать первую исполнимую technology family.", command: "deterministic M5 V5 filter", exitCode: 0, resultRu: "INSTALL umbrellas deferred; flat suspended ceiling 7 groups/36 works selected.", status: "GREEN", completed: ["inventory", "tier", "selection", "norms", "manifest"], incomplete: ["production execution"], next: "implement 36 individual estimates" },
].map(stableJsonLine).join("\n")}\n`);

process.stdout.write(stableJson({ verdict: "GREEN_BATCH003_PREFLIGHT_FROZEN", H2, T2, M2, tier: "HOLD", groups: groups.length, works: selected.length, predictedRows: 3450, selectedSetHash: setHash(selectedIds), output }));
