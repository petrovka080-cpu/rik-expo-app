import { evaluateTechnologyPassportR1 } from "../../../backendPlatform/technologyPassportR1";
import {
  buildAllBatch001DrywallSuccessorsR3,
  type Batch001DrywallSuccessorDefinitionR3,
} from "./drywallCeilingBulkheadSuccessorR3";
import {
  buildBatch001DrywallTechnologyPassportDraftR1,
  type Batch001DrywallPassportOperationR1,
} from "./drywallCeilingBulkheadTechnologyPassportR1";

export const BATCH001_DRYWALL_RUNTIME_DELTA_AUDIT_R1_CONTRACT =
  "real-useful-estimates.batch001-runtime-delta-audit-r1.v1" as const;

export const BATCH001_SELECTED_CASE_IDS_R1 = [
  "drywall_ceiling_interior_bulkhead_align_standard",
  "drywall_ceiling_interior_bulkhead_frame_large_area",
  "drywall_ceiling_interior_bulkhead_clad_wet_zone",
  "drywall_ceiling_interior_bulkhead_frame_wet_zone",
  "drywall_ceiling_interior_bulkhead_clad_large_area",
] as const;

type MaterialDispositionR1 =
  | "MAP_TO_EXPECTED_FAMILY"
  | "MERGE_INTO_EXPECTED_FAMILY"
  | "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION"
  | "REMOVE_UNJUSTIFIED_PUBLIC_ROW";

export type Batch001LegacyMaterialAdjudicationR1 = {
  legacyKey: string;
  disposition: MaterialDispositionR1;
  targetFamilyId: string | null;
  reasonRu: string;
};

/**
 * Explicit remediation bridge. It classifies current runtime keys but does not
 * create passport expectations. Target families were selected only after the
 * independent passport had been authored and frozen.
 */
export const BATCH001_LEGACY_MATERIAL_ADJUDICATION_R1: readonly Batch001LegacyMaterialAdjudicationR1[] = [
  { legacyKey: "acoustic_fire_insulation", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "acoustic_fire_insulation", reasonRu: "Сохраняется только при подтверждённом акустическом или огнезащитном требовании." },
  { legacyKey: "acoustic_joint_sealant", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "acoustic_fire_sealant", reasonRu: "Может стать точным специальным герметиком только при доказанном нормируемом классе заделки." },
  { legacyKey: "acoustic_tape", disposition: "REMOVE_UNJUSTIFIED_PUBLIC_ROW", targetFamilyId: null, reasonRu: "Отдельная акустическая лента обшивки не доказана первичным паспортом выбранной потолочной системы." },
  { legacyKey: "anchors", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "suspension_anchor", reasonRu: "Крепление каркаса объединяется с точным анкерным узлом без второй стоимости того же физического крепежа." },
  { legacyKey: "corner_connectors", disposition: "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION", targetFamilyId: null, reasonRu: "Тип углового соединителя нельзя определить без проектного узла потолочного короба." },
  { legacyKey: "cross_profiles", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "ceiling_profile_pp_60_27", reasonRu: "Основной и несущий ПП 60×27 остаются одной закупочной семьёй, но с раздельной длиной в расчёте." },
  { legacyKey: "cut_edge_primer", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "cut_edge_primer", reasonRu: "Сохраняется по фактической длине резаных кромок и точному TDS состава." },
  { legacyKey: "edge_profile", disposition: "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION", targetFamilyId: null, reasonRu: "Торцевой профиль требует точного узла, размера и различения с углозащитным профилем." },
  { legacyKey: "external_corner_profile", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "external_corner_profile", reasonRu: "Сохраняется по измеренной длине открытых наружных углов." },
  { legacyKey: "fastener_recess_compound", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "joint_compound", reasonRu: "Если применяется одна смесь, углубления крепежа не образуют вторую закупку той же шпаклёвки." },
  { legacyKey: "finish_putty", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "finish_putty", reasonRu: "Сохраняется только для явно выбранного уровня поверхности Q2–Q4." },
  { legacyKey: "gypsum_board_sheets", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "gypsum_board_12_5", reasonRu: "Должен стать точной строкой с типом, размерами листа, кромкой и классами применения." },
  { legacyKey: "internal_corner_tape", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "paper_joint_tape", reasonRu: "Лента внутреннего угла объединяется с совместимой армирующей лентой, если системный паспорт не требует другого изделия." },
  { legacyKey: "joint_compound", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "joint_compound", reasonRu: "Сохраняется с точным продуктом, фасовкой, нормой и TDS." },
  { legacyKey: "joint_reinforcement_tape", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "paper_joint_tape", reasonRu: "Сохраняется как точная бумажная либо иная подтверждённая системная лента." },
  { legacyKey: "large_area_clad_control_joint", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "control_joint_profile", reasonRu: "Сохраняется по проектной длине шва большой площади." },
  { legacyKey: "large_area_control_joint_profile", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "control_joint_profile", reasonRu: "Сохраняется по проектной длине шва каркаса большой площади." },
  { legacyKey: "large_area_two_level_connectors", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "two_level_connector", reasonRu: "Сохраняется только для явно выбранной двухуровневой схемы П112." },
  { legacyKey: "perimeter_profiles", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "guide_profile_pn_28_27", reasonRu: "Сохраняется только как точный ПН 28×27 для П113 либо подтверждённого узла примыкания." },
  { legacyKey: "primary_profiles", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "ceiling_profile_pp_60_27", reasonRu: "Должен стать точным профилем ПП 60×27 с толщиной стали и длиной поставки." },
  { legacyKey: "profile_connection_screws", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "profile_screw_ln_9", reasonRu: "Сохраняется только как точный LN 9 в тех узлах, где системный паспорт требует фиксацию." },
  { legacyKey: "profile_connectors", disposition: "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION", targetFamilyId: null, reasonRu: "Абстрактный соединитель должен быть заменён одноуровневым либо двухуровневым после выбора схемы." },
  { legacyKey: "profile_cut_protection", disposition: "REMOVE_UNJUSTIFIED_PUBLIC_ROW", targetFamilyId: null, reasonRu: "Для обычного варианта отдельное антикоррозионное покрытие резов не доказано выбранной системой." },
  { legacyKey: "profile_extensions", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "profile_extension", reasonRu: "Сохраняется только по фактическому числу стыков из карты раскладки." },
  { legacyKey: "protective_membrane", disposition: "REMOVE_UNJUSTIFIED_PUBLIC_ROW", targetFamilyId: null, reasonRu: "Защитная мембрана не добавляется без отдельного проектного требования и совместимого системного узла." },
  { legacyKey: "sealing_tape", disposition: "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION", targetFamilyId: null, reasonRu: "Уплотнительная лента под профилем требует точного узла, ширины и подтверждения для потолочной схемы." },
  { legacyKey: "separation_tape", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "separation_tape", reasonRu: "Сохраняется по измеренной длине примыкания и точной совместимой спецификации." },
  { legacyKey: "shadow_joint_profile", disposition: "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION", targetFamilyId: null, reasonRu: "Теневой шов является отдельным архитектурным вариантом и требует проектного узла, а не скрытого наследования." },
  { legacyKey: "sheet_screws", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "board_screw_tn", reasonRu: "Должен стать точным TN с длиной по числу слоёв и нормой крепления системы." },
  { legacyKey: "small_area_edge_screws", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "board_screw_tn", reasonRu: "Дополнительное количество по резаным кромкам объединяется в закупку точного шурупа TN." },
  { legacyKey: "small_area_self_supporting_guide_profiles", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "self_supporting_profile", reasonRu: "Направляющая часть учитывается в точной самонесущей системе по подтверждённому узлу." },
  { legacyKey: "small_area_self_supporting_stud_profiles", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "self_supporting_profile", reasonRu: "Стоечная часть учитывается в точной самонесущей системе по подтверждённому узлу." },
  { legacyKey: "surface_primer", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "surface_primer", reasonRu: "Сохраняется с точным типом, фасовкой и совместимостью последующей отделки." },
  { legacyKey: "suspension_anchors", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "suspension_anchor", reasonRu: "Должен стать точным анкером по материалу основания и расчётной нагрузке." },
  { legacyKey: "suspension_rods", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "adjustable_suspension", reasonRu: "Тяга является частью выбранного регулируемого подвеса и не должна создавать абстрактный альтернативный товар." },
  { legacyKey: "suspensions", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "adjustable_suspension", reasonRu: "Должен стать точным типом подвеса с диапазоном регулировки и несущей способностью." },
  { legacyKey: "technical_fire_acoustic_sealant", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "acoustic_fire_sealant", reasonRu: "Сохраняется только при точном нормируемом классе заделки инженерного прохода." },
  { legacyKey: "technical_opening_profiles", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "opening_frame_profile", reasonRu: "Должен стать точным профилем обрамления по топологии и размерам прохода." },
  { legacyKey: "technical_opening_reinforcement_fasteners", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "opening_frame_fastener", reasonRu: "Сохраняется по числу узлов с точным типом и размером крепежа." },
  { legacyKey: "technical_opening_screws", disposition: "MERGE_INTO_EXPECTED_FAMILY", targetFamilyId: "board_screw_tn", reasonRu: "Дополнительное количество вокруг проходов объединяется в закупку точного шурупа листовой обшивки." },
  { legacyKey: "wet_zone_adjustment_consumables", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "alignment_shim", reasonRu: "Абстрактные расходники заменяются точной регулировочной прокладкой по измеренным точкам." },
  { legacyKey: "wet_zone_corrosion_fasteners", disposition: "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION", targetFamilyId: null, reasonRu: "Коррозионностойкий крепёж требует точного типа, размера и узла, которых нет в текущем названии." },
  { legacyKey: "wet_zone_corrosion_protection", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "frame_corrosion_protection", reasonRu: "Сохраняется по длине открытых резов и только при требовании выбранной системы." },
  { legacyKey: "wet_zone_penetration_cuffs", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "penetration_cuff", reasonRu: "Сохраняется по числу и диапазону размеров фактических проходок." },
  { legacyKey: "wet_zone_penetration_sealant", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "penetration_sealant", reasonRu: "Сохраняется как точный совместимый герметик по периметру проходок." },
  { legacyKey: "wet_zone_waterproof_primer", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "waterproof_primer", reasonRu: "Сохраняется только для прямой влажной зоны в составе выбранной гидроизоляционной системы." },
  { legacyKey: "wet_zone_waterproof_tape", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "waterproof_tape", reasonRu: "Сохраняется по длине гидроизолируемых углов и примыканий." },
  { legacyKey: "wet_zone_waterproofing", disposition: "MAP_TO_EXPECTED_FAMILY", targetFamilyId: "waterproof_membrane", reasonRu: "Должна стать точной полимерной обмазочной гидроизоляцией с числом слоёв, расходом и фасовкой." },
] as const;

const WORK_TARGET_BY_LEGACY_KEY: Readonly<Record<string, string>> = {
  align_existing_frame: "align_frame",
  align_small_area_corners: "align_frame",
  align_technical_openings: "align_frame",
  cut_and_fix_boards: "install_boards",
  finish_joints_and_corners: "finish_joints",
  install_metal_frame: "install_frame",
  install_waterproofing: "waterproof_surface",
  prepare_surface: "prepare_surface",
  seal_service_openings: "seal_openings",
};

const EXACT_PUBLIC_SPEC = /\d+(?:[.,]\d+)?\s*(?:×\s*\d|мм|см|м\b|кг|л\b|кн|q[1-4])/iu;

function keyFromIdentity(value: string): string {
  return value.split(":").at(-1) ?? value;
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

export type Batch001RuntimeDeltaCaseR1 = {
  catalogId: string;
  selected50Case: boolean;
  operation: Batch001DrywallPassportOperationR1;
  passport: {
    sha256: string;
    reviewStatus: "DRAFT";
    decisionStatus: "RED";
    decisionErrors: readonly string[];
    requiredMaterialFamilyCount: number;
    conditionalMaterialFamilyCount: number;
    equipmentRuleCount: number;
  };
  currentRuntime: {
    materialRowCount: number;
    constructionWorkRowCount: number;
    equipmentRowCount: number;
    deliveryRowCount: number;
  };
  materialRows: readonly {
    rowId: string;
    titleRu: string;
    legacyKey: string;
    disposition: MaterialDispositionR1;
    targetFamilyId: string | null;
    targetExpectedByPassport: boolean;
    exactPublicSpecificationPresent: boolean;
    reasonRu: string;
  }[];
  missingRequiredMaterialFamilies: readonly string[];
  unresolvedConditionalMaterialFamilies: readonly string[];
  missingRequiredOperations: readonly string[];
  equipmentRulesWithoutRuntimeRows: readonly string[];
  currentDeliveryRowsWithoutCapacity: readonly string[];
  missingPassportRuntimeParameterIds: readonly string[];
  blockers: readonly string[];
  unclassifiedLegacyMaterialKeys: readonly string[];
  verdict: "RED";
};

export function auditBatch001DrywallRuntimeDeltaR1(
  definition: Batch001DrywallSuccessorDefinitionR3,
): Batch001RuntimeDeltaCaseR1 {
  const passport = buildBatch001DrywallTechnologyPassportDraftR1(definition.catalogId);
  const passportDecision = evaluateTechnologyPassportR1(passport, []);
  const adjudicationByKey = new Map(BATCH001_LEGACY_MATERIAL_ADJUDICATION_R1.map((item) => [item.legacyKey, item]));
  const expectedFamilies = new Set([
    ...passport.requiredMaterialFamilies,
    ...passport.conditionalMaterialFamilies,
  ].map((item) => item.familyId));
  const materialResources = definition.resources.filter((row) => row.group === "material");
  const materialRows = materialResources.map((row) => {
    const legacyKey = keyFromIdentity(row.resourceIdentity);
    const adjudication = adjudicationByKey.get(legacyKey);
    return {
      rowId: row.rowId,
      titleRu: row.titleRu,
      legacyKey,
      disposition: adjudication?.disposition ?? "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION" as const,
      targetFamilyId: adjudication?.targetFamilyId ?? null,
      targetExpectedByPassport: Boolean(adjudication?.targetFamilyId && expectedFamilies.has(adjudication.targetFamilyId)),
      exactPublicSpecificationPresent: EXACT_PUBLIC_SPEC.test(row.titleRu),
      reasonRu: adjudication?.reasonRu ?? "Ключ отсутствует в явной таблице remediation и должен блокировать продолжение.",
    };
  });
  const unclassifiedLegacyMaterialKeys = unique(materialRows
    .filter((row) => !adjudicationByKey.has(row.legacyKey))
    .map((row) => row.legacyKey));
  const presentTargetFamilies = new Set(materialRows
    .filter((row) => row.targetExpectedByPassport)
    .map((row) => row.targetFamilyId)
    .filter((value): value is string => value != null));
  const missingRequiredMaterialFamilies = passport.requiredMaterialFamilies
    .map((item) => item.familyId)
    .filter((familyId) => !presentTargetFamilies.has(familyId));
  const unresolvedConditionalMaterialFamilies = passport.conditionalMaterialFamilies.map((item) => item.familyId);
  const workResources = definition.resources.filter((row) => row.group === "construction_work");
  const presentOperations = new Set(workResources
    .map((row) => WORK_TARGET_BY_LEGACY_KEY[keyFromIdentity(row.resourceIdentity)])
    .filter((value): value is string => Boolean(value)));
  const missingRequiredOperations = passport.constructionOperations
    .map((item) => item.operationId)
    .filter((operationId) => !presentOperations.has(operationId));
  const equipmentResources = definition.resources.filter((row) => row.group === "machine_equipment");
  const equipmentRulesWithoutRuntimeRows = equipmentResources.length === 0
    ? passport.equipmentRules.map((item) => item.equipmentRuleId)
    : [];
  const currentDeliveryRowsWithoutCapacity = definition.resources
    .filter((row) => row.group === "delivery" && !/(?:5\s*т|грузоподъ[её]мност)/iu.test(row.titleRu))
    .map((row) => row.rowId);
  const currentParameterIds = new Set(definition.passport.parameters.map((item) => item.parameterId));
  const missingPassportRuntimeParameterIds = passport.userInputs
    .map((item) => item.parameterId)
    .filter((parameterId) => !currentParameterIds.has(parameterId));
  const blockers = unique([
    ...passportDecision.errors.map((error) => `PASSPORT:${error}`),
    ...unclassifiedLegacyMaterialKeys.map((key) => `UNCLASSIFIED_LEGACY_MATERIAL:${key}`),
    ...materialRows.filter((row) => !row.exactPublicSpecificationPresent)
      .map((row) => `MATERIAL_EXACT_PUBLIC_SPECIFICATION_MISSING:${row.legacyKey}`),
    ...materialRows.filter((row) => row.disposition === "AMBIGUOUS_REQUIRES_SYSTEM_SELECTION")
      .map((row) => `MATERIAL_SYSTEM_SELECTION_REQUIRED:${row.legacyKey}`),
    ...materialRows.filter((row) => row.disposition === "REMOVE_UNJUSTIFIED_PUBLIC_ROW")
      .map((row) => `MATERIAL_UNJUSTIFIED_PUBLIC_ROW:${row.legacyKey}`),
    ...materialRows.filter((row) => row.targetFamilyId != null && !row.targetExpectedByPassport)
      .map((row) => `MATERIAL_OUTSIDE_PASSPORT_DELTA:${row.legacyKey}:${row.targetFamilyId}`),
    ...missingRequiredMaterialFamilies.map((familyId) => `REQUIRED_MATERIAL_FAMILY_MISSING:${familyId}`),
    ...unresolvedConditionalMaterialFamilies.map((familyId) => `CONDITIONAL_MATERIAL_REQUIRES_INPUT_OR_EXCLUSION_PROOF:${familyId}`),
    ...missingRequiredOperations.map((operationId) => `REQUIRED_OPERATION_MISSING:${operationId}`),
    ...equipmentRulesWithoutRuntimeRows.map((ruleId) => `EQUIPMENT_RULE_REQUIRES_INPUT_OR_EXCLUSION_PROOF:${ruleId}`),
    ...currentDeliveryRowsWithoutCapacity.map((rowId) => `DELIVERY_CAPACITY_OR_TRIP_FORMULA_MISSING:${rowId}`),
    ...missingPassportRuntimeParameterIds.map((parameterId) => `PASSPORT_RUNTIME_PARAMETER_MISSING:${parameterId}`),
  ]);
  return {
    catalogId: definition.catalogId,
    selected50Case: (BATCH001_SELECTED_CASE_IDS_R1 as readonly string[]).includes(definition.catalogId),
    operation: definition.group,
    passport: {
      sha256: passportDecision.passportSha256,
      reviewStatus: "DRAFT",
      decisionStatus: "RED",
      decisionErrors: passportDecision.errors,
      requiredMaterialFamilyCount: passport.requiredMaterialFamilies.length,
      conditionalMaterialFamilyCount: passport.conditionalMaterialFamilies.length,
      equipmentRuleCount: passport.equipmentRules.length,
    },
    currentRuntime: {
      materialRowCount: materialResources.length,
      constructionWorkRowCount: workResources.length,
      equipmentRowCount: equipmentResources.length,
      deliveryRowCount: definition.resources.filter((row) => row.group === "delivery").length,
    },
    materialRows,
    missingRequiredMaterialFamilies,
    unresolvedConditionalMaterialFamilies,
    missingRequiredOperations,
    equipmentRulesWithoutRuntimeRows,
    currentDeliveryRowsWithoutCapacity,
    missingPassportRuntimeParameterIds,
    blockers,
    unclassifiedLegacyMaterialKeys,
    verdict: "RED",
  };
}

export function auditAllBatch001DrywallRuntimeDeltasR1(): readonly Batch001RuntimeDeltaCaseR1[] {
  return buildAllBatch001DrywallSuccessorsR3().map(auditBatch001DrywallRuntimeDeltaR1);
}
