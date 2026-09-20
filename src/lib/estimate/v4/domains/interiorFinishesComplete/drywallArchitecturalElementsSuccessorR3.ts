import {
  ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
  evaluateEstimateContentPassportR3,
  type EstimateContentFormulaR3,
  type EstimateContentPassportDecisionR3,
  type EstimateContentPassportR3,
  type EstimateContentResourceR3,
} from "../../../backendPlatform/estimateContentPassportR3";
import {
  evaluateTechnologyPassportR1,
  technologyPassportR1Sha256,
} from "../../../backendPlatform/technologyPassportR1";
import { compileFormulaGraph, evaluateFormulaGraph, type FormulaAst } from "../../../backendPlatform/formulaGraph";
import type { ProfessionalAssemblyRowDefinitionV4 } from "../../professionalProjectAssemblyV4";
import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  buildDrywallArchitecturalElementProfessionalPackagePartsV4,
} from "./drywallArchitecturalElementsProfessionalV4";
import type {
  DrywallArchitecturalElementOperationV4,
  DrywallArchitecturalElementVariantV4,
} from "./drywallArchitecturalElementsContractV4";
import {
  batch002EngineeringSourceIdsR4,
  resolveBatch002EngineeringSourcesR4,
  type Batch002EngineeringSourceR4,
} from "./drywallBatch002EngineeringSourcesR4";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from "./inventory";
import {
  BATCH002_DRYWALL_TECHNOLOGY_PASSPORT_R1_CONTRACT,
  buildBatch002DrywallTechnologyPassportDraftR1,
} from "./drywallArchitecturalElementsTechnologyPassportR1";

export const BATCH002_DRYWALL_SUCCESSOR_R3_CONTRACT =
  "real-professional-estimates-r3.batch002-drywall-successor.v1" as const;

type Batch002SystemR3 = "BULKHEAD" | "CURVE";
type Batch002VariantR3 = Exclude<DrywallArchitecturalElementVariantV4, "high_load">;
type NumericValues = Readonly<Record<string, string | number | bigint>>;

type RuntimeFormulaR3 = EstimateContentFormulaR3 & {
  calculate: (values: NumericValues) => number;
};

export type Batch002ResourceApplicabilityR3 =
  | { kind: "FORMULA_POSITIVE"; reasonRu: string }
  | {
    kind: "DELIVERY_NOT_INCLUDED_BY_SUPPLIER";
    parameterId: "delivery_included_by_supplier";
    reasonRu: string;
  };

export type Batch002DrywallResourceR3 = EstimateContentResourceR3 & {
  applicability: Batch002ResourceApplicabilityR3;
  sourcePredecessorRowIds: readonly string[];
  procurementOwnerId: string | null;
  engineeringSourceIds: readonly string[];
};

export type Batch002UserParameterContractR4 = {
  parameterId: string;
  titleRu: string;
  guideRu: string;
  inputType: "NUMBER" | "TEXT" | "BOOLEAN";
  unitId: string | null;
  range:
    | { kind: "NUMERIC"; minimum: number; maximum: number }
    | { kind: "TEXT"; minimumLength: number; maximumLength: number }
    | { kind: "BOOLEAN"; choices: readonly [false, true] };
  defaultValue: string | number | boolean | null;
  defaultSource: string;
  formulaConsumerIds: readonly string[];
  resourceConsumerIds: readonly string[];
  variantApplicability: readonly Batch002VariantR3[];
  engineeringSourceIds: readonly string[];
};

export type Batch002ContentPassportR4 = EstimateContentPassportR3 & {
  executionContract: "MASTER_EXECUTION_TZ_R5_5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU";
  batchId: "BATCH-002";
  domain: "interior_finishes";
  technologyFamily: "DRYWALL_CEILING_BULKHEAD" | "DRYWALL_CURVED_CEILING_ELEMENT";
  operation: DrywallArchitecturalElementOperationV4;
  variant: Batch002VariantR3;
  primaryMeasure: string;
  applicabilityRu: string;
  userParameterContracts: readonly Batch002UserParameterContractR4[];
  derivedParameters: readonly { parameterId: string; expressionSource: string; unitId: string }[];
  engineeringSources: readonly Batch002EngineeringSourceR4[];
  commercialAssumptionsRu: readonly string[];
  semanticOwners: readonly string[];
  costOwners: readonly string[];
  procurementOwners: readonly string[];
  predecessorAdjudication: readonly Batch002DrywallAdjudicationR3[];
  successorAdditions: readonly Batch002SuccessorAdditionR4[];
  highParameterCountJustificationRu: readonly string[];
  proofStatus: "CONTENT_SUBJECT_AUDIT_GREEN_BACKEND_REPLAY_PENDING_R55";
};

export type Batch002AdjudicationDecisionR4 =
  | "KEEP"
  | "RENAME"
  | "MERGE"
  | "INCLUDE_IN_RATE"
  | "REMOVE_NOISE"
  | "REMOVE_DUPLICATE"
  | "REPLACE"
  | "ADD_MISSING"
  | "REDIRECT";

export type Batch002AdjudicationReasonCodeR4 =
  | "KEEP_PHYSICAL_RESOURCE"
  | "REPLACE_WITH_PRECISE_PHYSICAL_RESOURCE"
  | "REPLACE_LABOR_WITH_MEASURABLE_OPERATION"
  | "REPLACE_GENERIC_TRANSPORT_WITH_EXPLICIT_CARGO"
  | "INCLUDE_LABOR_OR_HAND_TOOL_IN_OPERATION_RATE"
  | "REMOVE_INFORMATIONAL_NON_PRICED_OUTPUT"
  | "REMOVE_QA_DOCUMENT_OVERHEAD_NOISE"
  | "ADD_REQUIRED_MATERIAL"
  | "ADD_REQUIRED_MEASURABLE_OPERATION"
  | "ADD_APPLICABLE_EXPLICIT_DELIVERY";

export type Batch002DrywallAdjudicationR3 = {
  predecessorRowId: string;
  predecessorCategory: string;
  predecessorTitleRu: string;
  decision:
    | "PRESERVED_OR_REPLACED_PHYSICAL_MATERIAL"
    | "REPLACED_BY_MEASURABLE_CONSTRUCTION_WORK"
    | "REPLACED_BY_EXPLICIT_CARGO_DELIVERY"
    | "INCLUDED_IN_CONSTRUCTION_WORK_RATE"
    | "REMOVED_NON_BOQ_QA_DOCUMENT_OR_OVERHEAD"
    | "INFORMATIONAL_ONLY_NOT_PRICED";
  r4Decision: Exclude<Batch002AdjudicationDecisionR4, "ADD_MISSING">;
  reasonCode: Exclude<Batch002AdjudicationReasonCodeR4,
    "ADD_REQUIRED_MATERIAL" | "ADD_REQUIRED_MEASURABLE_OPERATION" | "ADD_APPLICABLE_EXPLICIT_DELIVERY">;
  successorRowIds: readonly string[];
  reasonRu: string;
};

export type Batch002SuccessorAdditionR4 = {
  successorRowId: string;
  successorGroup: EstimateContentResourceR3["group"];
  successorTitleRu: string;
  r4Decision: "ADD_MISSING";
  reasonCode: Extract<Batch002AdjudicationReasonCodeR4,
    "ADD_REQUIRED_MATERIAL" | "ADD_REQUIRED_MEASURABLE_OPERATION" | "ADD_APPLICABLE_EXPLICIT_DELIVERY">;
  reasonRu: string;
};

export type Batch002DrywallDomainDecisionR3 = {
  status: "GREEN" | "RED";
  allowed: boolean;
  errors: readonly string[];
};

export type Batch002DrywallSuccessorDefinitionR3 = {
  contract: typeof BATCH002_DRYWALL_SUCCESSOR_R3_CONTRACT;
  catalogId: string;
  predecessorVersion: "DrywallArchitecturalElementProfessionalV4";
  successorVersionId: string;
  system: Batch002SystemR3;
  operation: DrywallArchitecturalElementOperationV4;
  variant: Batch002VariantR3;
  predecessorVisibleParameterCount: number;
  technologyStepsRu: readonly string[];
  dependencyRu: readonly string[];
  userParameterGroups: readonly {
    groupId: "geometry" | "system" | "variant" | "delivery";
    titleRu: string;
    parameterIds: readonly string[];
    visibleWhen?: { parameterId: string; equals: string | number | boolean };
  }[];
  runtimeFormulas: readonly RuntimeFormulaR3[];
  resources: readonly Batch002DrywallResourceR3[];
  passport: Batch002ContentPassportR4;
  contentDecision: EstimateContentPassportDecisionR3;
  domainDecision: Batch002DrywallDomainDecisionR3;
  adjudication: readonly Batch002DrywallAdjudicationR3[];
  successorAdditions: readonly Batch002SuccessorAdditionR4[];
  shadowRealUsefulGateR1: {
    contract: typeof BATCH002_DRYWALL_TECHNOLOGY_PASSPORT_R1_CONTRACT;
    mode: "SHADOW_PREPARED_ONLY";
    productionAdmissionAttached: false;
    currentUserRuntimeChanged: false;
    technologyPassportSha256: string;
    reviewStatus: "DRAFT";
    status: "RED";
    blockers: readonly [
      "ENGINEER_ACCEPTANCE_MISSING",
      "EXACT_EQUIPMENT_RUNTIME_ROW_MISSING",
      "LEGACY_EQUIPMENT_POLICY_CONTRADICTS_MASTER",
    ];
  };
};

export type Batch002DrywallCompiledRowR3 = {
  rowId: string;
  group: EstimateContentResourceR3["group"];
  titleRu: string;
  unitId: string;
  quantity: number;
  semanticOwnerId: string;
  costOwnerId: string;
  procurementEligible: boolean;
};

export type Batch002DrywallCompileResultR3 =
  | { status: "GREEN"; catalogId: string; rows: readonly Batch002DrywallCompiledRowR3[] }
  | { status: "NEEDS_REQUIRED_INPUTS" | "RED"; catalogId: string; blockers: readonly string[]; rows: readonly [] };

type ResourceBlueprint = {
  key: string;
  group: EstimateContentResourceR3["group"];
  titleRu: string;
  unitId: string;
  expression: string;
  sourceKeys: readonly string[];
  normativeKind: "MATERIAL" | "WORK" | "DELIVERY" | "REPAIR";
  procurementEligible?: boolean;
  delivery?: {
    cargoRu: string;
    vehicleRu: string;
    physicalExpression: string;
  };
};

const BATCH002_IDS = new Set(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4);
const CROSS_DOMAIN_TITLE = /(?:бетон|железобетон|асфальт|кабел|электрощит|трубопровод|канализац|радиатор|воздуховод|кирпич|каменная кладка|кровл)/iu;
const PI_OVER_180 = "0.01745329252";

function operationOf(catalogId: string): DrywallArchitecturalElementOperationV4 {
  for (const [marker, operation] of [
    ["_finish_joint_", "FINISH_JOINT"],
    ["_insulate_", "INSULATE"],
    ["_prepare_", "PREPARE"],
    ["_repair_", "REPAIR"],
    ["_align_", "ALIGN"],
    ["_clad_", "CLAD"],
    ["_frame_", "FRAME"],
  ] as const) if (catalogId.includes(marker)) return operation;
  throw new Error(`BATCH002_R3_OPERATION_UNRESOLVED:${catalogId}`);
}

function variantOf(catalogId: string): Batch002VariantR3 {
  for (const variant of ["technical_room", "large_area", "small_area", "wet_zone", "standard"] as const) {
    if (catalogId.endsWith(`_${variant}`)) return variant;
  }
  throw new Error(`BATCH002_R3_VARIANT_UNRESOLVED:${catalogId}`);
}

function systemOf(catalogId: string): Batch002SystemR3 {
  if (catalogId.includes("_bulkhead_")) return "BULKHEAD";
  if (catalogId.includes("_curve_")) return "CURVE";
  throw new Error(`BATCH002_R3_SYSTEM_UNRESOLVED:${catalogId}`);
}

function variantLabel(variant: Batch002VariantR3): string {
  if (variant === "large_area") return "большой площади";
  if (variant === "small_area") return "малой площади";
  if (variant === "technical_room") return "в техническом помещении";
  if (variant === "wet_zone") return "во влажной зоне";
  return "стандартного исполнения";
}

function systemLabel(system: Batch002SystemR3): string {
  return system === "BULKHEAD" ? "потолочного короба" : "криволинейного потолочного элемента";
}

function definitionTitle(
  system: Batch002SystemR3,
  operation: DrywallArchitecturalElementOperationV4,
  variant: Batch002VariantR3,
): string {
  const object = systemLabel(system);
  const suffix = variantLabel(variant);
  const action: Readonly<Record<DrywallArchitecturalElementOperationV4, string>> = {
    FRAME: "Монтаж металлического каркаса",
    ALIGN: "Выравнивание металлического каркаса",
    CLAD: "Обшивка гипсокартонными листами",
    FINISH_JOINT: "Заделка стыков и углов",
    INSULATE: "Устройство изоляции",
    PREPARE: "Подготовка основания",
    REPAIR: "Локальный ремонт",
  };
  return `${action[operation]} ${object} ${suffix}`;
}

function formula(catalogId: string, key: string, outputUnitId: string, expressionSource: string): RuntimeFormulaR3 {
  const compiled = compileFormulaGraph(expressionSource);
  return {
    formulaId: `${catalogId}:successor-r3:formula:${key}`,
    outputUnitId,
    expressionSource,
    inputParameterIds: compiled.inputParameterIds,
    calculate: (values) => Number(evaluateFormulaGraph(compiled.ast, values)),
  };
}

function geometry(system: Batch002SystemR3): {
  areaExpression: string;
  arcExpression: string;
  userIds: readonly string[];
} {
  if (system === "BULKHEAD") {
    return {
      areaExpression: "area_m2",
      arcExpression: "perimeter_m",
      userIds: ["area_m2", "perimeter_m"],
    };
  }
  const arcExpression = `curve_element_count * curve_radius_m * curve_angle_deg * ${PI_OVER_180}`;
  return {
    areaExpression: `(${arcExpression}) * (curve_element_width_m + curve_drop_height_m)`,
    arcExpression,
    userIds: [
      "curve_element_count",
      "curve_radius_m",
      "curve_angle_deg",
      "curve_element_width_m",
      "curve_drop_height_m",
    ],
  };
}

function commonBlueprints(
  system: Batch002SystemR3,
  operation: DrywallArchitecturalElementOperationV4,
  variant: Batch002VariantR3,
): { rows: ResourceBlueprint[]; userIds: Set<string>; systemIds: Set<string> } {
  const g = geometry(system);
  const rows: ResourceBlueprint[] = [];
  const userIds = new Set<string>();
  const systemIds = new Set<string>();
  const add = (row: ResourceBlueprint): void => { rows.push(row); };
  const material = (key: string, titleRu: string, unitId: string, expression: string, sourceKeys: readonly string[] = [key]): void => add({
    key, group: "material", titleRu, unitId, expression, sourceKeys, normativeKind: operation === "REPAIR" ? "REPAIR" : "MATERIAL", procurementEligible: true,
  });
  const work = (key: string, titleRu: string, unitId: string, expression: string, sourceKeys: readonly string[] = [key]): void => add({
    key, group: "construction_work", titleRu, unitId, expression, sourceKeys, normativeKind: operation === "REPAIR" ? "REPAIR" : "WORK", procurementEligible: false,
  });

  if (operation === "FINISH_JOINT") {
    ["joint_length_m", "cut_edge_length_m", "external_corner_length_m", "internal_corner_length_m", "joint_finish_area_m2"].forEach((id) => userIds.add(id));
    ["surface_quality_level", "joint_system_type"].forEach((id) => systemIds.add(id));
    material("joint_base_compound", variant === "wet_zone" ? "Влагостойкая базовая шпаклёвка стыков" : "Базовая шпаклёвка стыков выбранной системы", "kg", "joint_length_m * joint_base_compound_kg_m", ["joint_filler", "joint_base_compound"]);
    material("joint_finish_compound", variant === "wet_zone" ? "Влагостойкая финишная шпаклёвка стыков" : "Финишная шпаклёвка стыков выбранной системы", "kg", "joint_length_m * joint_finish_compound_kg_m", ["joint_finish_compound"]);
    material("joint_reinforcement_tape", "Армирующая лента стыков гипсокартонных листов", "m", "joint_length_m * joint_tape_run_count", ["joint_tape", "joint_paper_tape"]);
    material("joint_external_corner_profile", system === "CURVE" ? "Гибкий профиль наружных криволинейных углов" : "Профиль наружных углов потолочного короба", "m", "external_corner_length_m", ["corner_bead", "joint_external_corner_profile"]);
    material("joint_internal_corner_tape", "Лента армирования внутренних углов", "m", "internal_corner_length_m", ["joint_internal_corner_reinforcement"]);
    material("joint_fastener_compound", "Шпаклёвка мест крепления гипсокартонных листов", "kg", "fastener_head_count * screw_head_compound_kg_item", ["joint_screw_head_compound"]);
    material("joint_abrasives", "Абразивы для шлифования заделанных стыков", "item", "ceil(joint_finish_area_m2 / abrasive_coverage_m2_item)", ["joint_coarse_abrasive", "joint_fine_abrasive"]);
    work("joint_prepare_edges", "Подготовка обрезных кромок гипсокартонных листов", "m", "cut_edge_length_m", ["joint_cut_edge_bevel", "joint_edge_dedusting"]);
    work("joint_fill_and_tape", "Заполнение и армирование стыков гипсокартонных листов", "m", "joint_length_m", ["joint_labor", "joint_gap_prefill", "joint_base_layer_application", "joint_tape_embedding"]);
    work("joint_finish_corners", "Послойная заделка внутренних и наружных углов", "m", "external_corner_length_m + internal_corner_length_m", ["joint_internal_corner_treatment", "joint_external_arch_corner_treatment"]);
    work("joint_finish_surface", "Шпаклевание и шлифование зоны стыков", "m2", "joint_finish_area_m2", ["joint_second_layer_application", "joint_finish_layer_application", "joint_finish_sanding"]);
    if (system === "CURVE") {
      g.userIds.slice(0, 3).forEach((id) => userIds.add(id));
      material("joint_flexible_curve_tape", "Гибкая армирующая лента криволинейных сопряжений", "m", `${g.arcExpression} * curve_joint_tape_run_count`, ["joint_flexible_tape"]);
      work("joint_curve_transition", "Заделка криволинейных сопряжений по проектному радиусу", "m", g.arcExpression, ["joint_external_arch_corner_treatment"]);
    }
  } else if (operation === "INSULATE") {
    ["insulation_area_m2", "insulation_thickness_m", "insulation_layer_count", "support_mesh_area_m2", "insulation_perimeter_m"].forEach((id) => userIds.add(id));
    systemIds.add("insulation_type");
    material("insulation_mat", system === "CURVE" ? "Гибкая изоляция выбранной плотности для криволинейной полости" : "Изоляционные плиты выбранного назначения и плотности", "m3", "insulation_area_m2 * insulation_thickness_m * insulation_layer_count * (1 + insulation_waste_percent / 100)", ["insulation", "insulate_primary_layer", "insulate_flexible_curved_mat"]);
    material("insulation_retainers", "Фиксаторы изоляции от сползания и провисания", "item", "ceil(insulation_area_m2 * insulation_retainer_item_m2)", ["insulation_retainers", "insulate_disc_fasteners"]);
    material("insulation_support_mesh", "Поддерживающая сетка изоляционного слоя", "m2", "support_mesh_area_m2", ["insulate_support_mesh"]);
    material("insulation_perimeter_sealant", "Системный герметик примыканий изоляции", "kg", "insulation_perimeter_m * insulation_sealant_kg_m", ["insulate_perimeter_sealant"]);
    work("insulation_cut_and_install", system === "CURVE" ? "Раскрой и укладка изоляции в криволинейную полость" : "Раскрой и укладка изоляции в полость потолочного короба", "m2", "insulation_area_m2 * insulation_layer_count", ["insulation_labor", "insulate_cell_cutting", "insulate_layer_installation"]);
    work("insulation_fix_support", "Монтаж фиксаторов и поддерживающей сетки изоляции", "m2", "support_mesh_area_m2", ["insulate_mechanical_fixing", "insulate_mesh_installation"]);
    work("insulation_seal_perimeter", "Герметизация примыканий изоляционного слоя", "m", "insulation_perimeter_m", ["insulate_penetration_sealing"]);
  } else if (operation === "PREPARE") {
    ["preparation_area_m2", "local_defect_area_m2", "protected_surface_area_m2"].forEach((id) => userIds.add(id));
    if (system === "BULKHEAD") userIds.add("layout_length_m");
    systemIds.add("substrate_type");
    material("preparation_primer", "Совместимая грунтовка основания", "kg", "preparation_area_m2 * preparation_primer_kg_m2", ["primer", "prepare_substrate_primer"]);
    material("preparation_repair_compound", "Состав локального ремонта основания", "kg", "local_defect_area_m2 * preparation_repair_compound_kg_m2", ["skim_filler", "prepare_substrate_repair_compound"]);
    material("preparation_abrasives", "Абразивы для подготовки основания", "item", "ceil(preparation_area_m2 / preparation_abrasive_coverage_m2_item)", ["abrasives"]);
    material("preparation_protection_film", "Защитная плёнка смежных поверхностей", "m2", "protected_surface_area_m2", ["prepare_protective_film"]);
    work("preparation_clean_base", "Очистка и обеспыливание основания", "m2", "preparation_area_m2", ["preparation_labor", "prepare_local_cleaning"]);
    work("preparation_patch_defects", "Локальное устранение дефектов основания", "m2", "local_defect_area_m2", ["prepare_local_defect_repair"]);
    work("preparation_prime_and_sand", "Грунтование и доводка основания", "m2", "preparation_area_m2", ["preparation_labor"]);
    work("preparation_setout", system === "CURVE" ? "Разметка криволинейной оси по проектному радиусу" : "Разметка осей и примыканий потолочного короба", "m", system === "CURVE" ? g.arcExpression : "layout_length_m", ["prepare_laser_setout"]);
    if (system === "CURVE") g.userIds.slice(0, 3).forEach((id) => userIds.add(id));
  } else if (operation === "REPAIR") {
    ["defect_area_m2", "repair_board_layer_count", "damaged_profile_length_m", "damaged_insulation_volume_m3", "repair_joint_length_m", "demolition_waste_t", "waste_haul_distance_km"].forEach((id) => userIds.add(id));
    ["repair_board_type", "repair_cause_removed"].forEach((id) => systemIds.add(id));
    material("repair_boards", system === "CURVE" ? "Гибкие гипсокартонные листы ремонтных карт" : "Гипсокартонные листы ремонтных карт", "m2", "defect_area_m2 * repair_board_layer_count * (1 + repair_board_waste_percent / 100)", ["replacement_board", "repair_first_board_layer", "repair_additional_board_layers"]);
    material("repair_profiles", "Профиль восстановления повреждённого каркаса", "m", "damaged_profile_length_m", ["patch_profiles", "repair_new_profile", "repair_contour_reinforcement"]);
    material("repair_fasteners", "Крепёж ремонтных карт и профилей", "item", "ceil(defect_area_m2 * repair_fastener_item_m2)", ["repair_fasteners", "repair_layer_fasteners"]);
    material("repair_insulation", "Изоляция для восстановления повреждённой полости", "m3", "damaged_insulation_volume_m3", ["repair_new_insulation"]);
    material("repair_joint_tape", "Армирующая лента ремонтных стыков", "m", "repair_joint_length_m", ["repair_joint_tape_profile"]);
    material("repair_base_compound", "Базовый состав ремонтных стыков", "kg", "repair_joint_length_m * repair_base_compound_kg_m", ["repair_filler", "repair_base_compound"]);
    material("repair_finish_compound", "Финишный состав ремонтной карты", "kg", "defect_area_m2 * repair_finish_compound_kg_m2", ["repair_finish_compound"]);
    material("repair_primer", "Совместимая грунтовка ремонтной карты", "kg", "defect_area_m2 * repair_primer_kg_m2", ["repair_compatible_primer"]);
    work("repair_selective_dismantling", "Селективный демонтаж повреждённых слоёв", "m2", "defect_area_m2", ["repair_labor", "repair_local_opening", "repair_board_layer_removal"]);
    work("repair_restore_frame", "Восстановление профилей и ремонтного контура", "m", "damaged_profile_length_m", ["repair_frame_reinstatement"]);
    work("repair_restore_insulation", "Восстановление изоляции повреждённой полости", "m3", "damaged_insulation_volume_m3", ["repair_insulation_reinstatement"]);
    work("repair_restore_boards", "Послойное восстановление гипсокартонной обшивки", "m2", "defect_area_m2 * repair_board_layer_count", ["repair_board_reinstatement"]);
    work("repair_finish_patch", "Заделка стыков и сведение ремонтной карты с поверхностью", "m2", "defect_area_m2", ["repair_joint_reinstatement", "repair_finish_reinstatement"]);
    add({
      key: "repair_waste_haul",
      group: "delivery",
      titleRu: "Вывоз демонтированных листов и металлического профиля",
      unitId: "t_km",
      expression: "demolition_waste_t * waste_haul_distance_km",
      sourceKeys: ["repair_waste_haul", "repair_removed_board_waste", "repair_removed_metal_waste"],
      normativeKind: "REPAIR",
      procurementEligible: true,
      delivery: {
        cargoRu: "демонтированные гипсокартонные листы и металлический профиль",
        vehicleRu: "крытый грузовой автомобиль для строительных отходов",
        physicalExpression: "demolition_waste_t",
      },
    });
  } else if (operation === "ALIGN") {
    g.userIds.slice(0, 3).forEach((id) => userIds.add(id));
    ["correction_point_count", "local_reinforcement_length_m"].forEach((id) => userIds.add(id));
    material("alignment_adjustment_parts", "Регулировочные детали принятых подвесов", "item", "correction_point_count", ["adjustment_fasteners", "align_adjustable_hanger_parts"]);
    material("alignment_shims", "Системные прокладки выравнивания каркаса", "kg", "correction_point_count * alignment_shim_kg_item", ["system_packers", "align_shim_plates"]);
    material("alignment_reinforcement_profile", "Профиль локального усиления каркаса", "m", "local_reinforcement_length_m", ["align_local_reinforcement"]);
    material("alignment_reinforcement_fasteners", "Крепёж локального усиления каркаса", "item", "ceil(local_reinforcement_length_m * alignment_fastener_item_m)", ["align_correction_fasteners"]);
    work("alignment_reference_curve", "Разметка проектного радиуса криволинейного каркаса", "m", g.arcExpression, ["align_reference_radius"]);
    work("alignment_adjust_nodes", "Регулировка подвесов и соединений криволинейного каркаса", "item", "correction_point_count", ["alignment_labor", "align_hanger_adjustment", "align_node_refastening"]);
    work("alignment_install_reinforcement", "Монтаж локальных усилений криволинейного каркаса", "m", "local_reinforcement_length_m", ["align_local_reinforcement_install"]);
  } else if (operation === "CLAD") {
    g.userIds.forEach((id) => userIds.add(id));
    ["board_layer_count", "curve_edge_length_m", "wet_forming_area_m2"].forEach((id) => userIds.add(id));
    if (variant !== "technical_room") userIds.add("curve_opening_count");
    ["board_type", "forming_method"].forEach((id) => systemIds.add(id));
    material("cladding_boards", variant === "wet_zone" ? "Влагостойкие гипсокартонные листы для криволинейной обшивки" : "Гипсокартонные листы для криволинейной обшивки", "m2", `(${g.areaExpression}) * board_layer_count * (1 + board_waste_percent / 100)`, ["boards", "clad_first_layer_board", "clad_additional_layer_board"]);
    material("cladding_screws", "Винты послойного крепления криволинейной обшивки", "item", `ceil((${g.areaExpression}) * board_layer_count * cladding_screw_item_m2_layer)`, ["board_screws", "clad_first_layer_screws", "clad_additional_layer_screws"]);
    material("cladding_arch_profile", "Гибкий профиль кромок криволинейной обшивки", "m", "curve_edge_length_m", ["clad_arch_profile"]);
    material("cladding_forming_water", "Вода для допустимого мокрого формования листов", "l", "wet_forming_area_m2 * forming_water_l_m2", ["clad_forming_water"]);
    work("cladding_make_templates", "Изготовление шаблона раскроя криволинейных листов", "item", "1", ["clad_template_fabrication"]);
    work("cladding_cut_and_form", "Раскрой и формование гипсокартонных листов", "m2", `(${g.areaExpression}) * board_layer_count`, ["cladding_labor", "clad_board_cutting", "clad_board_forming"]);
    work("cladding_install_layers", "Послойный монтаж криволинейной обшивки", "m2", `(${g.areaExpression}) * board_layer_count`, ["clad_first_layer_installation", "clad_additional_layer_installation"]);
    work("cladding_form_openings", "Формирование отверстий и ревизионных проёмов", "item", variant === "technical_room" ? "technical_penetration_count" : "curve_opening_count", ["clad_opening_cutouts"]);
  } else if (operation === "FRAME") {
    g.userIds.forEach((id) => userIds.add(id));
    userIds.add("curve_opening_reinforcement_length_m");
    systemIds.add("frame_system_type");
    const arc = g.arcExpression;
    const studs = `curve_element_count * (ceil((curve_radius_m * curve_angle_deg * ${PI_OVER_180}) / curve_stud_spacing_m) + 1)`;
    const hangers = `curve_element_count * (ceil((curve_radius_m * curve_angle_deg * ${PI_OVER_180}) / curve_hanger_spacing_m) + 1)`;
    const anchors = `ceil((${arc}) * curve_track_line_count / curve_track_anchor_spacing_m)`;
    material("frame_flexible_track", "Гибкий направляющий профиль проектного радиуса", "m", `(${arc}) * curve_track_line_count * (1 + frame_profile_waste_percent / 100)`, ["profiles", "frame_flexible_track"]);
    material("frame_vertical_profiles", "Стоечный профиль вертикальных граней", "m", `(${studs}) * curve_drop_height_m * (1 + frame_profile_waste_percent / 100)`, ["frame_vertical_profiles"]);
    material("frame_cross_profiles", "Профиль поперечных перемычек", "m", `ceil((${arc}) / curve_cross_member_spacing_m) * curve_element_width_m * (1 + frame_profile_waste_percent / 100)`, ["frame_cross_profiles"]);
    material("frame_hangers", "Регулируемые подвесы криволинейного каркаса", "item", hangers, ["frame_adjustable_hangers"]);
    material("frame_hanger_rods", "Тяги подвесов криволинейного каркаса", "m", `(${hangers}) * curve_hanger_rod_length_m`, ["frame_hanger_rods"]);
    material("frame_anchors", "Анкеры направляющих и подвесов по типу основания", "item", `(${anchors}) + (${hangers})`, ["frame_fasteners", "frame_track_anchors", "frame_hanger_anchors"]);
    material("frame_screws", "Винты соединения металлических профилей", "item", `ceil(((${studs}) + ceil((${arc}) / curve_cross_member_spacing_m) * 2 + (${hangers}) * 2) * frame_screws_per_connection)`, ["frame_metal_screws"]);
    material("frame_acoustic_tape", "Уплотнительная лента примыканий направляющего профиля", "m", `(${arc}) * curve_track_line_count`, ["frame_acoustic_tape"]);
    material("frame_opening_reinforcement", "Профиль усиления проёмов криволинейного каркаса", "m", "curve_opening_reinforcement_length_m", ["frame_hatch_reinforcement", "frame_mep_reinforcement"]);
    work("frame_mark_and_anchor", "Разметка и анкеровка направляющих и подвесов", "item", `(${anchors}) + (${hangers})`, ["frame_anchor_point_layout", "frame_anchor_drilling", "frame_anchor_installation"]);
    work("frame_form_profiles", "Резка и формирование профилей по проектному радиусу", "m", `(${arc}) * curve_track_line_count`, ["frame_labor", "frame_profile_cutting", "frame_profile_segmentation", "frame_radius_forming"]);
    work("frame_install_structure", "Монтаж криволинейного металлического каркаса", "m2", g.areaExpression, ["frame_track_installation", "frame_hanger_installation", "frame_vertical_profile_installation", "frame_cross_member_installation"]);
    work("frame_reinforce_openings", "Монтаж усилений проёмов криволинейного каркаса", "m", "curve_opening_reinforcement_length_m", ["frame_hatch_reinforcement_installation", "frame_mep_reinforcement_installation"]);
  }

  applyVariantBlueprints({ system, operation, variant, rows, userIds });
  return { rows, userIds, systemIds };
}

function applyVariantBlueprints(input: {
  system: Batch002SystemR3;
  operation: DrywallArchitecturalElementOperationV4;
  variant: Batch002VariantR3;
  rows: ResourceBlueprint[];
  userIds: Set<string>;
}): void {
  const { operation, variant, rows, userIds } = input;
  const add = (row: ResourceBlueprint): void => { rows.push(row); };
  const material = (key: string, titleRu: string, unitId: string, expression: string, sourceKeys: readonly string[] = [key]): void => add({
    key, group: "material", titleRu, unitId, expression, sourceKeys, normativeKind: operation === "REPAIR" ? "REPAIR" : "MATERIAL", procurementEligible: true,
  });
  const work = (key: string, titleRu: string, unitId: string, expression: string, sourceKeys: readonly string[] = [key]): void => add({
    key, group: "construction_work", titleRu, unitId, expression, sourceKeys, normativeKind: operation === "REPAIR" ? "REPAIR" : "WORK", procurementEligible: false,
  });

  if (variant === "large_area") {
    if (operation === "ALIGN") {
      userIds.add("large_area_reference_zone_count");
      material("large_area_reference_markers", "Реперы проектного радиуса по захваткам", "item", "large_area_reference_zone_count", ["variant_large_control_zones"]);
      work("large_area_reference_zones", "Установка реперов проектного радиуса по захваткам", "item", "large_area_reference_zone_count", ["align_reference_radius"]);
      return;
    }
    userIds.add("large_area_deformation_joint_length_m");
    if (operation === "INSULATE") {
      material("large_area_insulation_joint_insert", "Изоляционная вставка деформационных швов", "m", "large_area_deformation_joint_length_m", ["variant_large_deformation_joint_decision"]);
      work("large_area_insulation_joint", "Монтаж изоляционной вставки деформационных швов", "m", "large_area_deformation_joint_length_m", ["insulate_layer_installation"]);
    } else if (operation === "PREPARE") {
      material("large_area_joint_edge_primer", "Грунтовка кромок деформационных швов", "kg", "large_area_deformation_joint_length_m * large_area_joint_primer_kg_m", ["prepare_substrate_primer"]);
      work("large_area_prepare_joint_edges", "Подготовка кромок деформационных швов", "m", "large_area_deformation_joint_length_m", ["prepare_local_cleaning"]);
    } else if (operation === "REPAIR") {
      material("large_area_repair_edge_tape", "Армирующая лента границ ремонтных карт", "m", "large_area_deformation_joint_length_m", ["repair_joint_tape_profile"]);
      work("large_area_repair_boundaries", "Армирование протяжённых границ ремонтных карт", "m", "large_area_deformation_joint_length_m", ["repair_joint_reinstatement"]);
    } else {
      const materialTitle = operation === "FRAME"
        ? "Профиль разрыва криволинейного каркаса под деформационный шов"
        : operation === "CLAD"
          ? "Профиль окончания гипсокартонных листов у деформационного шва"
          : "Финишный профиль деформационного шва гипсокартонной системы";
      const workTitle = operation === "FRAME"
        ? "Формирование разрыва криволинейного каркаса под деформационный шов"
        : operation === "CLAD"
          ? "Формирование разрыва обшивки у деформационного шва"
          : "Финишная заделка кромок деформационного шва";
      material("large_area_deformation_profile", materialTitle, "m", "large_area_deformation_joint_length_m", ["variant_large_deformation_joint_decision"]);
      work("large_area_form_deformation_joint", workTitle, "m", "large_area_deformation_joint_length_m", ["joint_perimeter_sealing", "clad_end_return_formation", "frame_track_installation"]);
    }
  } else if (variant === "small_area") {
    if (operation === "INSULATE") {
      userIds.add("small_area_cavity_count");
      work("small_area_fit_cavities", "Подгонка изоляции в малых полостях", "item", "small_area_cavity_count", ["insulate_mep_fitting"]);
    } else if (operation === "REPAIR") {
      userIds.add("small_area_patch_perimeter_m");
      material("small_area_patch_tape", "Армирующая лента малых ремонтных карт", "m", "small_area_patch_perimeter_m", ["repair_joint_tape_profile"]);
      work("small_area_finish_patch_edges", "Заделка периметра малых ремонтных карт", "m", "small_area_patch_perimeter_m", ["repair_joint_reinstatement"]);
    } else {
      userIds.add("small_area_return_length_m");
      if (operation === "FINISH_JOINT") material("small_area_flexible_corner_tape", "Гибкая лента коротких углов и возвратов", "m", "small_area_return_length_m", ["joint_flexible_tape"]);
      if (operation === "FRAME") material("small_area_return_profile", "Профиль коротких возвратов криволинейного каркаса", "m", "small_area_return_length_m", ["frame_straight_return_track"]);
      const workTitle = operation === "PREPARE"
        ? "Очистка и локальная доводка коротких примыканий и возвратов"
        : operation === "ALIGN"
          ? "Выравнивание и повторная фиксация коротких возвратов каркаса"
          : operation === "CLAD"
            ? "Раскрой и крепление листов на коротких возвратах обшивки"
            : operation === "FRAME"
              ? "Монтаж профилей коротких возвратов криволинейного каркаса"
              : "Армирование и заделка коротких углов и возвратов";
      work("small_area_returns", workTitle, "m", "small_area_return_length_m", ["variant_small_confined_cutting"]);
    }
  } else if (variant === "technical_room") {
    userIds.add("technical_penetration_count");
    userIds.add("technical_penetration_perimeter_m");
    if (operation === "FRAME") {
      material("technical_opening_profile", "Профиль усиления инженерных проходов", "m", "technical_penetration_perimeter_m", ["frame_mep_reinforcement", "variant_technical_fire_acoustic_sealing"]);
      material("technical_opening_fasteners", "Крепёж усиления инженерных проходов", "item", "technical_penetration_count * technical_fastener_item_opening", ["frame_reinforcement_connectors"]);
      work("technical_reinforce_openings", "Усиление каркаса вокруг инженерных проходов", "m", "technical_penetration_perimeter_m", ["frame_mep_reinforcement_installation"]);
    } else if (operation === "CLAD") {
      material("technical_opening_sleeves", "Защитные вкладыши кромок гипсокартонной обшивки в инженерных проходах", "item", "technical_penetration_count", ["clad_opening_sleeves"]);
      material("technical_opening_edge_profile", "Профиль кромок инженерных проходов", "m", "technical_penetration_perimeter_m", ["clad_arch_profile"]);
    } else if (operation === "PREPARE") {
      userIds.add("technical_equipment_protection_area_m2");
      material("technical_equipment_protection", "Защитное покрытие действующего оборудования", "m2", "technical_equipment_protection_area_m2", ["variant_technical_equipment_protection"]);
      material("technical_temporary_caps", "Временные заглушки инженерных проходов", "item", "technical_penetration_count", ["prepare_mep_caps"]);
      work("technical_cover_equipment", "Укрытие действующего оборудования перед подготовкой основания", "m2", "technical_equipment_protection_area_m2", ["prepare_mep_caps"]);
      work("technical_prepare_opening_edges", "Подготовка кромок инженерных проходов", "m", "technical_penetration_perimeter_m", ["prepare_local_cleaning"]);
    } else if (operation === "ALIGN") {
      material("technical_alignment_profile", "Профиль локальной коррекции инженерных проходов", "m", "technical_penetration_perimeter_m", ["align_local_reinforcement"]);
      work("technical_align_openings", "Выравнивание каркаса вокруг инженерных проходов", "item", "technical_penetration_count", ["align_corrective_element_install"]);
    } else {
      material("technical_penetration_sealant", "Проектный герметик инженерных проходов", "kg", "technical_penetration_perimeter_m * technical_sealant_kg_m", ["variant_technical_fire_acoustic_sealing", "insulate_perimeter_sealant", "joint_elastic_sealant", "repair_mep_sealant"]);
      material("technical_penetration_collars", operation === "INSULATE" ? "Манжеты изоляции инженерных проходов" : operation === "REPAIR" ? "Манжеты восстановления инженерных проходов" : "Армирующие элементы стыков вокруг проходов", "item", "technical_penetration_count", ["insulate_penetration_cuffs", "joint_external_corner_profile", "repair_mep_sealant"]);
      work("technical_seal_penetrations", operation === "INSULATE" ? "Герметизация изоляции вокруг инженерных проходов" : operation === "REPAIR" ? "Восстановление герметизации инженерных проходов" : "Герметизация стыков вокруг инженерных проходов", "m", "technical_penetration_perimeter_m", ["insulate_penetration_sealing", "joint_perimeter_sealing", "repair_finish_reinstatement"]);
    }
  } else if (variant === "wet_zone") {
    userIds.add("wet_zone_interface_length_m");
    material("wet_zone_sealant", operation === "FRAME" || operation === "ALIGN" ? "Антикоррозионный состав обработанных узлов" : "Влагостойкий герметик примыканий", "kg", "wet_zone_interface_length_m * wet_zone_sealant_kg_m", ["variant_wet_corrosion_protection", "variant_wet_penetration_sealing"]);
    work("wet_zone_seal_interfaces", operation === "FRAME" || operation === "ALIGN" ? "Антикоррозионная обработка металлических узлов" : "Герметизация примыканий влажной зоны", "m", "wet_zone_interface_length_m", ["joint_perimeter_sealing", "insulate_penetration_sealing", "frame_cut_treatment_labor"]);
    if (operation === "INSULATE") {
      userIds.add("wet_zone_membrane_area_m2");
      material("wet_zone_membrane", "Пароограничивающая мембрана влажной зоны", "m2", "wet_zone_membrane_area_m2", ["insulate_vapour_membrane"]);
      work("wet_zone_install_membrane", "Монтаж и герметизация пароограничивающей мембраны", "m2", "wet_zone_membrane_area_m2", ["insulate_membrane_installation"]);
    }
    if (operation === "PREPARE") {
      userIds.add("wet_zone_surface_area_m2");
      material("wet_zone_substrate_primer", "Влагостойкая грунтовка основания", "kg", "wet_zone_surface_area_m2 * wet_zone_primer_kg_m2", ["prepare_substrate_primer"]);
      work("wet_zone_prime_substrate", "Грунтование основания влажной зоны", "m2", "wet_zone_surface_area_m2", ["prepare_local_cleaning"]);
    }
  }
}

function deliveryCargo(operation: DrywallArchitecturalElementOperationV4): { cargoRu: string; titleRu: string } {
  const values: Readonly<Record<DrywallArchitecturalElementOperationV4, { cargoRu: string; titleRu: string }>> = {
    FRAME: { cargoRu: "металлические профили, подвесы и крепёж", titleRu: "Доставка металлических профилей и крепежа бортовым автомобилем" },
    ALIGN: { cargoRu: "регулировочные детали, профили усиления и крепёж", titleRu: "Доставка деталей выравнивания и профилей усиления" },
    CLAD: { cargoRu: "гипсокартонные листы, профили кромок и крепёж", titleRu: "Доставка гипсокартонных листов и крепежа" },
    FINISH_JOINT: { cargoRu: "шпаклёвочные смеси, армирующие ленты и угловые профили", titleRu: "Доставка смесей, лент и угловых профилей" },
    INSULATE: { cargoRu: "изоляция, мембраны, сетка и фиксаторы", titleRu: "Доставка изоляции, мембран и крепежа" },
    PREPARE: { cargoRu: "грунтовка, ремонтный состав, абразивы и защитная плёнка", titleRu: "Доставка материалов подготовки основания" },
    REPAIR: { cargoRu: "листы, профили, изоляция и ремонтные смеси", titleRu: "Доставка материалов локального ремонта" },
  };
  return values[operation];
}

function normativeSource(kind: ResourceBlueprint["normativeKind"]): EstimateContentResourceR3["normativeSource"] {
  if (kind === "MATERIAL") return {
    sourceKey: "SELECTED_DRYWALL_SYSTEM_PASSPORT_R3",
    locator: "Технический лист выбранной совместимой системы: фактический расход материала, тип изделия и единица закупки.",
  };
  if (kind === "DELIVERY") return {
    sourceKey: "PROJECT_LOGISTICS_ROUTE_R3",
    locator: "Закупочная ведомость, фактическая масса груза и измеренное плечо перевозки до объекта.",
  };
  if (kind === "REPAIR") return {
    sourceKey: "KG_KRERR_2015_APPLICATION_GUIDANCE",
    locator: "КРЕРр-2015, методические указания, п. 3.3: демонтаж и восстановление в границах дефектной ведомости.",
  };
  return {
    sourceKey: "KG_SP_KR_65_101_2025",
    locator: "СП КР 65-101:2025, пп. 7.7.1–7.7.5 и таблица 7.8; объём берётся из проекта и фактической геометрии.",
  };
}

const PARAMETER_META: Readonly<Record<string, { titleRu: string; guideRu: string }>> = {
  area_m2: { titleRu: "Площадь самостоятельной операции", guideRu: "Укажите фактическую площадь участка потолочного короба, м²." },
  perimeter_m: { titleRu: "Периметр и примыкания", guideRu: "Укажите суммарную длину примыканий и торцов, м." },
  curve_element_count: { titleRu: "Количество криволинейных элементов", guideRu: "Укажите число одинаковых дуговых элементов по проекту." },
  curve_radius_m: { titleRu: "Проектный радиус", guideRu: "Укажите радиус осевой линии одного элемента, м." },
  curve_angle_deg: { titleRu: "Центральный угол дуги", guideRu: "Укажите угол одного криволинейного элемента от 0,1° до 360°." },
  curve_element_width_m: { titleRu: "Ширина криволинейного элемента", guideRu: "Укажите ширину горизонтальной грани элемента, м." },
  curve_drop_height_m: { titleRu: "Высота опуска", guideRu: "Укажите высоту вертикальной грани криволинейного элемента, м." },
  joint_length_m: { titleRu: "Длина стыков листов", guideRu: "Укажите длину стыков по фактической раскладке листов, м." },
  cut_edge_length_m: { titleRu: "Длина обрезных кромок", guideRu: "Укажите длину обрезных кромок, где нужна подготовка фаски, м." },
  external_corner_length_m: { titleRu: "Длина наружных углов", guideRu: "Укажите суммарную длину наружных углов и арок, м." },
  internal_corner_length_m: { titleRu: "Длина внутренних углов", guideRu: "Укажите суммарную длину внутренних углов, м." },
  fastener_head_count: { titleRu: "Количество головок крепежа", guideRu: "Укажите число видимых мест крепления, подлежащих шпаклеванию." },
  joint_finish_area_m2: { titleRu: "Площадь зоны стыков", guideRu: "Укажите площадь полосы шпаклевания и шлифования вокруг стыков, м²." },
  insulation_area_m2: { titleRu: "Площадь изоляции", guideRu: "Укажите площадь реально заполняемой полости, м²." },
  insulation_thickness_m: { titleRu: "Толщина изоляции", guideRu: "Укажите проектную толщину одного слоя изоляции, м." },
  insulation_layer_count: { titleRu: "Количество слоёв изоляции", guideRu: "Укажите проектное число слоёв изоляции." },
  support_mesh_area_m2: { titleRu: "Площадь поддерживающей сетки", guideRu: "Укажите площадь сетки против провисания; если она не нужна, укажите 0." },
  insulation_perimeter_m: { titleRu: "Длина герметизируемых примыканий", guideRu: "Укажите длину примыканий изоляционного слоя, м." },
  preparation_area_m2: { titleRu: "Площадь подготовки основания", guideRu: "Укажите площадь очистки, грунтования и доводки, м²." },
  local_defect_area_m2: { titleRu: "Площадь локальных дефектов", guideRu: "Укажите площадь выбоин и неровностей, допустимых к локальному ремонту, м²." },
  protected_surface_area_m2: { titleRu: "Площадь защищаемых поверхностей", guideRu: "Укажите площадь смежной отделки, закрываемой плёнкой, м²." },
  layout_length_m: { titleRu: "Длина линий разметки", guideRu: "Укажите суммарную длину осей и примыканий разметки, м." },
  defect_area_m2: { titleRu: "Площадь повреждения", guideRu: "Укажите площадь ремонта по дефектной ведомости, м²." },
  repair_board_layer_count: { titleRu: "Количество восстанавливаемых слоёв", guideRu: "Укажите число слоёв гипсокартонных листов в ремонтной карте." },
  damaged_profile_length_m: { titleRu: "Длина повреждённых профилей", guideRu: "Укажите длину профиля, который нужно заменить или усилить, м." },
  damaged_insulation_volume_m3: { titleRu: "Объём повреждённой изоляции", guideRu: "Укажите объём изоляции, которую нужно заменить, м³; при отсутствии укажите 0." },
  repair_joint_length_m: { titleRu: "Длина ремонтных стыков", guideRu: "Укажите периметр и внутренние стыки ремонтных карт, м." },
  demolition_waste_t: { titleRu: "Масса демонтированных материалов", guideRu: "Укажите фактическую массу вывозимых листов и профилей, т." },
  waste_haul_distance_km: { titleRu: "Расстояние вывоза", guideRu: "Укажите расстояние до выбранного получателя строительных отходов, км." },
  correction_point_count: { titleRu: "Количество регулируемых узлов", guideRu: "Укажите число подвесов и соединений, требующих регулировки." },
  local_reinforcement_length_m: { titleRu: "Длина локального усиления", guideRu: "Укажите длину дополнительных профилей усиления, м; при отсутствии укажите 0." },
  board_layer_count: { titleRu: "Количество слоёв листов", guideRu: "Укажите проектное число слоёв гипсокартонной обшивки." },
  curve_opening_count: { titleRu: "Количество отверстий и люков", guideRu: "Укажите число проектных отверстий, проходок и ревизионных люков." },
  curve_edge_length_m: { titleRu: "Длина криволинейных кромок", guideRu: "Укажите длину кромок, где нужен гибкий профиль, м." },
  wet_forming_area_m2: { titleRu: "Площадь мокрого формования", guideRu: "Укажите площадь листов с разрешённым мокрым формованием; иначе укажите 0." },
  curve_template_count: { titleRu: "Количество шаблонов раскроя", guideRu: "Укажите число разных радиусов, для которых нужны отдельные шаблоны." },
  curve_track_line_count: { titleRu: "Количество линий направляющего профиля", guideRu: "Укажите число параллельных линий гибкого направляющего профиля." },
  curve_stud_spacing_m: { titleRu: "Шаг вертикальных профилей", guideRu: "Укажите проектный шаг вертикальных профилей по дуге, м." },
  curve_cross_member_spacing_m: { titleRu: "Шаг поперечных профилей", guideRu: "Укажите проектный шаг поперечных перемычек по дуге, м." },
  curve_hanger_spacing_m: { titleRu: "Шаг подвесов", guideRu: "Укажите проектный шаг подвесов по дуге, м." },
  curve_track_anchor_spacing_m: { titleRu: "Шаг анкеров направляющих", guideRu: "Укажите проектный шаг анкеров направляющего профиля, м." },
  curve_hanger_rod_length_m: { titleRu: "Длина тяги подвеса", guideRu: "Укажите среднюю проектную длину одной тяги подвеса, м." },
  curve_opening_reinforcement_length_m: { titleRu: "Длина усилений проёмов", guideRu: "Укажите суммарную длину профилей усиления люков и проходок, м." },
  large_area_reference_zone_count: { titleRu: "Количество захваток выравнивания", guideRu: "Укажите число отдельных захваток большой площади." },
  large_area_deformation_joint_length_m: { titleRu: "Длина деформационных швов", guideRu: "Укажите проектную длину деформационных швов, м; при отсутствии укажите 0." },
  small_area_cavity_count: { titleRu: "Количество малых полостей", guideRu: "Укажите число отдельных малых полостей, требующих подгонки изоляции." },
  small_area_patch_perimeter_m: { titleRu: "Периметр малых ремонтных карт", guideRu: "Укажите суммарный периметр малых ремонтных карт, м." },
  small_area_return_length_m: { titleRu: "Длина коротких возвратов", guideRu: "Укажите суммарную длину коротких граней и возвратов, м." },
  technical_penetration_count: { titleRu: "Количество инженерных проходов", guideRu: "Укажите число проходок и отверстий инженерных сетей." },
  technical_penetration_perimeter_m: { titleRu: "Периметр инженерных проходов", guideRu: "Укажите суммарный периметр всех инженерных проходов, м." },
  technical_equipment_protection_area_m2: { titleRu: "Площадь укрытия оборудования", guideRu: "Укажите площадь защитного покрытия действующего оборудования, м²." },
  wet_zone_interface_length_m: { titleRu: "Длина примыканий влажной зоны", guideRu: "Укажите длину герметизируемых или защищаемых примыканий, м." },
  wet_zone_membrane_area_m2: { titleRu: "Площадь пароограничивающей мембраны", guideRu: "Укажите проектную площадь мембраны влажной зоны, м²." },
  wet_zone_surface_area_m2: { titleRu: "Площадь основания влажной зоны", guideRu: "Укажите площадь основания под влагостойкое грунтование, м²." },
  delivery_included_by_supplier: { titleRu: "Доставка включена в цену материалов", guideRu: "Выберите «да», если поставщик уже включил перевозку в цену материалов." },
  delivery_mass_kg: { titleRu: "Масса доставляемых материалов", guideRu: "Укажите массу конкретного груза по закупочной ведомости, кг." },
  delivery_distance_km: { titleRu: "Расстояние доставки", guideRu: "Укажите расстояние от поставщика до объекта, км." },
  surface_quality_level: { titleRu: "Уровень подготовки стыков", guideRu: "Укажите требуемый уровень поверхности Q1, Q2, Q3 или Q4." },
  joint_system_type: { titleRu: "Система заделки стыков", guideRu: "Укажите совместимую шпаклёвку, ленту и угловые профили одной системы." },
  insulation_type: { titleRu: "Тип изоляции", guideRu: "Укажите назначение, плотность и марку проектной изоляции." },
  substrate_type: { titleRu: "Тип основания", guideRu: "Укажите материал и состояние основания перед подготовкой." },
  repair_board_type: { titleRu: "Тип ремонтного листа", guideRu: "Укажите лист того же типа и толщины, что в существующей системе." },
  repair_cause_removed: { titleRu: "Причина дефекта устранена", guideRu: "Подтвердите устранение протечки, деформации или другой причины повреждения." },
  accepted_frame_revision_id: { titleRu: "Принятая ревизия каркаса", guideRu: "Укажите идентификатор принятой ревизии существующего каркаса." },
  board_type: { titleRu: "Тип гипсокартонного листа", guideRu: "Укажите тип, толщину и допустимый радиус изгиба листа." },
  forming_method: { titleRu: "Способ формования листов", guideRu: "Укажите сухое, мокрое или заводское формование по паспорту системы." },
  frame_system_type: { titleRu: "Система металлического каркаса", guideRu: "Укажите совместимые профили, подвесы, анкеры и крепёж выбранной системы." },
};

function parameterMeta(parameterId: string): { titleRu: string; guideRu: string } {
  return PARAMETER_META[parameterId] ?? {
    titleRu: `Расчётное значение «${parameterId}»`,
    guideRu: "Внутреннее значение берётся из проекта, технического листа материала или выбранной нормы расхода.",
  };
}

const ALL_BATCH002_VARIANTS: readonly Batch002VariantR3[] = [
  "standard", "large_area", "small_area", "technical_room", "wet_zone",
];

function parameterUnit(parameterId: string): string | null {
  if (parameterId === "curve_angle_deg") return "degree";
  if (parameterId.endsWith("_m3")) return "m3";
  if (parameterId.endsWith("_m2")) return "m2";
  if (parameterId.endsWith("_km")) return "km";
  if (parameterId.endsWith("_kg")) return "kg";
  if (parameterId.endsWith("_t")) return "t";
  if (parameterId.endsWith("_m")) return "m";
  if (parameterId.endsWith("_count")) return "item";
  return null;
}

function numericRange(parameterId: string): { kind: "NUMERIC"; minimum: number; maximum: number } {
  if (parameterId === "curve_angle_deg") return { kind: "NUMERIC", minimum: 0.1, maximum: 360 };
  if (parameterId === "curve_radius_m") return { kind: "NUMERIC", minimum: 0.05, maximum: 1_000 };
  if (["curve_element_count", "board_layer_count", "repair_board_layer_count", "insulation_layer_count"].includes(parameterId)) {
    return { kind: "NUMERIC", minimum: 1, maximum: 20 };
  }
  if (parameterId.endsWith("_count")) return { kind: "NUMERIC", minimum: 0, maximum: 1_000_000 };
  if (parameterId.endsWith("_km")) return { kind: "NUMERIC", minimum: 0.1, maximum: 5_000 };
  if (parameterId.endsWith("_m3")) return { kind: "NUMERIC", minimum: 0, maximum: 1_000_000 };
  if (parameterId.endsWith("_m2")) return { kind: "NUMERIC", minimum: 0, maximum: 10_000_000 };
  if (parameterId.endsWith("_m")) return { kind: "NUMERIC", minimum: 0, maximum: 10_000_000 };
  if (parameterId.endsWith("_kg")) return { kind: "NUMERIC", minimum: 0, maximum: 100_000_000 };
  return { kind: "NUMERIC", minimum: 0, maximum: 100_000_000 };
}

function buildUserParameterContractsR4(input: {
  parameters: Batch002ContentPassportR4["parameters"];
  variant: Batch002VariantR3;
  operation: DrywallArchitecturalElementOperationV4;
  engineeringSourceIds: readonly string[];
}): readonly Batch002UserParameterContractR4[] {
  const variantIds = new Set(variantParameterIds(input.operation, input.variant));
  return input.parameters
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .map((parameter) => {
      const booleanInput = ["delivery_included_by_supplier", "repair_cause_removed"].includes(parameter.parameterId);
      const textInput = parameterUnit(parameter.parameterId) == null && !booleanInput;
      return {
        parameterId: parameter.parameterId,
        titleRu: parameter.titleRu,
        guideRu: parameter.guideRu,
        inputType: booleanInput ? "BOOLEAN" as const : textInput ? "TEXT" as const : "NUMBER" as const,
        unitId: parameterUnit(parameter.parameterId),
        range: booleanInput
          ? { kind: "BOOLEAN" as const, choices: [false, true] as const }
          : textInput
            ? { kind: "TEXT" as const, minimumLength: 1, maximumLength: 500 }
            : numericRange(parameter.parameterId),
        defaultValue: parameter.parameterId === "delivery_included_by_supplier" ? false : null,
        defaultSource: parameter.parameterId === "delivery_included_by_supplier"
          ? "COMMERCIAL_ASSUMPTION_R4: по умолчанию перевозка показана отдельно до подтверждения включения поставщиком"
          : "NO_DEFAULT_R4: обязательный явный ввод из проекта, обмера, дефектной ведомости или паспорта выбранной системы",
        formulaConsumerIds: parameter.formulaConsumerIds,
        resourceConsumerIds: parameter.resourceConsumerIds,
        variantApplicability: variantIds.has(parameter.parameterId) ? [input.variant] : ALL_BATCH002_VARIANTS,
        engineeringSourceIds: input.engineeringSourceIds,
      };
    });
}

function primaryMeasure(operation: DrywallArchitecturalElementOperationV4): string {
  if (operation === "FINISH_JOINT") return "м стыков и м² зоны финишной обработки";
  if (operation === "INSULATE") return "м² изолируемой полости и м³ изоляции";
  if (operation === "PREPARE") return "м² подготовленного основания";
  if (operation === "REPAIR") return "м² ремонтной карты";
  if (operation === "ALIGN") return "шт. регулируемых узлов и м проектного радиуса";
  return "м² развёрнутой поверхности элемента";
}

function derivedParametersR4(system: Batch002SystemR3): Batch002ContentPassportR4["derivedParameters"] {
  const derived: Batch002ContentPassportR4["derivedParameters"][number][] = [
    { parameterId: "delivery_cargo_t", expressionSource: "delivery_mass_kg / 1000", unitId: "t" },
  ];
  if (system === "CURVE") {
    const arc = `curve_element_count * curve_radius_m * curve_angle_deg * ${PI_OVER_180}`;
    derived.unshift(
      { parameterId: "curve_arc_length_m", expressionSource: arc, unitId: "m" },
      { parameterId: "curve_developed_area_m2", expressionSource: `(${arc}) * (curve_element_width_m + curve_drop_height_m)`, unitId: "m2" },
    );
  }
  return derived;
}

function technologyScope(
  system: Batch002SystemR3,
  operation: DrywallArchitecturalElementOperationV4,
): {
  physicalResultRu: string;
  includedScopeRu: readonly string[];
  excludedScopeRu: readonly string[];
  technologyStepsRu: readonly string[];
  dependencyRu: readonly string[];
} {
  const object = systemLabel(system);
  const commonExcluded = ["журналы, акты и проверочные записи как отдельные коммерческие строки", "ручной инструмент как отдельные машинные часы"];
  if (operation === "FINISH_JOINT") return {
    physicalResultRu: `Заделанные стыки, углы и места крепления ${object}`,
    includedScopeRu: ["подготовка кромок", "армирование и послойное заполнение стыков", "обработка углов и мест крепления"],
    excludedScopeRu: ["монтаж каркаса и листов", ...commonExcluded],
    technologyStepsRu: ["Подготовить обрезные кромки.", "Заполнить и армировать стыки.", "Обработать углы и места крепления.", "Довести зону стыков до выбранного уровня."],
    dependencyRu: ["Требуется принятая ревизия обшивки и совместимая система составов."],
  };
  if (operation === "INSULATE") return {
    physicalResultRu: `Заполненная проектной изоляцией полость ${object}`,
    includedScopeRu: ["раскрой изоляции", "укладка без пустот и смятия", "фиксация, сетка и герметизация примыканий"],
    excludedScopeRu: ["обшивка полости листами", ...commonExcluded],
    technologyStepsRu: ["Раскроить материал по фактическим ячейкам.", "Уложить проектные слои без пустот.", "Закрепить слой и герметизировать примыкания."],
    dependencyRu: ["Требуется принятая ревизия каркаса и выбранный тип изоляции."],
  };
  if (operation === "PREPARE") return {
    physicalResultRu: `Подготовленное основание для устройства ${object}`,
    includedScopeRu: ["защита смежных поверхностей", "очистка и локальный ремонт основания", "грунтование и проектная разметка"],
    excludedScopeRu: ["исправление конструктивно недопустимых дефектов", ...commonExcluded],
    technologyStepsRu: ["Защитить смежные поверхности.", "Очистить основание.", "Устранить допустимые локальные дефекты.", "Загрунтовать и перенести проектную разметку."],
    dependencyRu: ["Недопустимые дефекты основания должны быть устранены владельцем соответствующей конструкции."],
  };
  if (operation === "REPAIR") return {
    physicalResultRu: `Восстановленный повреждённый участок ${object}`,
    includedScopeRu: ["селективный демонтаж", "замена повреждённых профилей, изоляции и листов", "восстановление стыков и поверхности", "вывоз демонтированных материалов"],
    excludedScopeRu: ["ремонт причины дефекта вне гипсокартонной системы", ...commonExcluded],
    technologyStepsRu: ["Ограничить ремонтную карту.", "Селективно удалить повреждённые слои.", "Восстановить каркас, изоляцию и обшивку по фактическому дефекту.", "Заделать стыки и вывезти демонтированные материалы."],
    dependencyRu: ["Причина дефекта должна быть устранена до закрытия ремонтной карты."],
  };
  if (operation === "ALIGN") return {
    physicalResultRu: "Выровненный криволинейный каркас проектного радиуса",
    includedScopeRu: ["регулировочные детали и локальные усиления", "разметка радиуса", "регулировка и повторная фиксация узлов"],
    excludedScopeRu: ["повторный монтаж полного каркаса", ...commonExcluded],
    technologyStepsRu: ["Перенести проектный радиус.", "Отрегулировать подвесы и соединения.", "Установить локальные усиления.", "Повторно зафиксировать узлы."],
    dependencyRu: ["Требуется принятая ревизия существующего криволинейного каркаса."],
  };
  if (operation === "CLAD") return {
    physicalResultRu: "Криволинейный каркас, послойно обшитый гипсокартонными листами",
    includedScopeRu: ["шаблоны раскроя", "раскрой и допустимое формование листов", "послойное крепление и формирование отверстий"],
    excludedScopeRu: ["монтаж металлического каркаса", "финишная заделка стыков", ...commonExcluded],
    technologyStepsRu: ["Изготовить шаблоны проектных радиусов.", "Раскроить и сформовать листы допустимым способом.", "Закрепить слои со смещением стыков.", "Сформировать проектные отверстия."],
    dependencyRu: ["Требуется принятая ревизия выровненного каркаса и допустимый радиус листа."],
  };
  return {
    physicalResultRu: "Смонтированный металлический каркас криволинейного потолочного элемента",
    includedScopeRu: ["гибкие направляющие, профили, подвесы, анкеры и крепёж", "формирование профилей по радиусу", "монтаж и усиление проёмов"],
    excludedScopeRu: ["изоляция и обшивка листами", ...commonExcluded],
    technologyStepsRu: ["Разметить проектный радиус и точки крепления.", "Сформировать профили по шаблону.", "Установить направляющие, подвесы и профили.", "Усилить предусмотренные проёмы."],
    dependencyRu: ["Тип профилей, подвесов, анкеров и крепежа должен принадлежать одной совместимой системе."],
  };
}

function variantTechnologyScope(
  operation: DrywallArchitecturalElementOperationV4,
  variant: Batch002VariantR3,
): {
  includedScopeRu: readonly string[];
  excludedScopeRu: readonly string[];
  technologyStepsRu: readonly string[];
  dependencyRu: readonly string[];
} {
  if (variant === "standard") return {
    includedScopeRu: [], excludedScopeRu: [], technologyStepsRu: [], dependencyRu: [],
  };
  if (variant === "large_area") {
    if (operation === "ALIGN") return {
      includedScopeRu: ["реперы проектного радиуса по отдельным захваткам"],
      excludedScopeRu: ["исполнительная геодезическая съёмка как отдельная коммерческая строка"],
      technologyStepsRu: ["Разбить площадь на проектные захватки и установить реперы радиуса."],
      dependencyRu: ["Количество захваток принимается из схемы производства работ."],
    };
    return {
      includedScopeRu: ["операционная часть проектного деформационного шва без дублирования соседних стадий"],
      excludedScopeRu: ["части деформационного шва, относящиеся к другой самостоятельной операции"],
      technologyStepsRu: ["Выполнить относящуюся к текущей операции часть проектного деформационного шва."],
      dependencyRu: ["Требуется проектная схема и длина деформационных швов."],
    };
  }
  if (variant === "small_area") return {
    includedScopeRu: [operation === "INSULATE" ? "подгонка изоляции в малых полостях" : operation === "REPAIR" ? "границы малых ремонтных карт" : "короткие примыкания и возвраты текущей операции"],
    excludedScopeRu: ["произвольное уменьшение нормы материала из-за малой площади"],
    technologyStepsRu: ["Обработать малые полости, примыкания или возвраты с сохранением системной последовательности."],
    dependencyRu: ["Размер и число малых участков определяются фактической геометрией."],
  };
  if (variant === "technical_room") return {
    includedScopeRu: ["узлы гипсокартонной системы вокруг предусмотренных инженерных проходов"],
    excludedScopeRu: ["монтаж или переделка инженерных сетей", "сертифицированная противопожарная проходка, если она задана отдельным проектным решением"],
    technologyStepsRu: ["Обработать кромки и узлы гипсокартонной системы вокруг проектных проходов."],
    dependencyRu: ["Требуются координаты проходов и проектный тип применимого уплотнения; MEP- и firestop-работы остаются у своих владельцев scope."],
  };
  return {
    includedScopeRu: ["влагостойкие компоненты и защита примыканий в границах текущей операции"],
    excludedScopeRu: ["самостоятельная система гидроизоляции пола или стен и последующая плиточная отделка"],
    technologyStepsRu: ["Применить совместимые влагостойкие компоненты и герметизировать относящиеся к операции примыкания."],
    dependencyRu: ["Класс влажной зоны и состав совместимой системы должны быть заданы проектом."],
  };
}

function buildAdjudication(
  predecessorRows: readonly ProfessionalAssemblyRowDefinitionV4[],
  resources: readonly Batch002DrywallResourceR3[],
): Batch002DrywallAdjudicationR3[] {
  const successorBySource = new Map<string, string[]>();
  for (const resource of resources) for (const sourceId of resource.sourcePredecessorRowIds) {
    const targets = successorBySource.get(sourceId) ?? [];
    targets.push(resource.rowId);
    successorBySource.set(sourceId, targets);
  }
  return predecessorRows.map((row) => {
    const successorRowIds = successorBySource.get(row.row_id) ?? [];
    const predecessorKey = row.row_id.split(":row:").at(-1) ?? row.row_id;
    const samePhysicalIdentityKept = resources.some((resource) =>
      resource.sourcePredecessorRowIds.includes(row.row_id) && resource.rowId.endsWith(`:${predecessorKey}`));
    if (row.category === "material" && successorRowIds.length > 0) return {
      predecessorRowId: row.row_id, predecessorCategory: row.category, predecessorTitleRu: row.title_ru,
      decision: "PRESERVED_OR_REPLACED_PHYSICAL_MATERIAL" as const, successorRowIds,
      r4Decision: samePhysicalIdentityKept ? "KEEP" as const : "REPLACE" as const,
      reasonCode: samePhysicalIdentityKept ? "KEEP_PHYSICAL_RESOURCE" as const : "REPLACE_WITH_PRECISE_PHYSICAL_RESOURCE" as const,
      reasonRu: "Физический материал сохранён или заменён более точной строкой с явной формулой количества.",
    };
    if ((row.category === "labor" || row.category === "temporary_work") && successorRowIds.length > 0) return {
      predecessorRowId: row.row_id, predecessorCategory: row.category, predecessorTitleRu: row.title_ru,
      decision: "REPLACED_BY_MEASURABLE_CONSTRUCTION_WORK" as const, successorRowIds,
      r4Decision: "REPLACE" as const,
      reasonCode: "REPLACE_LABOR_WITH_MEASURABLE_OPERATION" as const,
      reasonRu: "Вместо человеко-часов или общей услуги выведена измеряемая физическая строительная операция.",
    };
    if (row.category === "transport" && successorRowIds.length > 0) return {
      predecessorRowId: row.row_id, predecessorCategory: row.category, predecessorTitleRu: row.title_ru,
      decision: "REPLACED_BY_EXPLICIT_CARGO_DELIVERY" as const, successorRowIds,
      r4Decision: "REPLACE" as const,
      reasonCode: "REPLACE_GENERIC_TRANSPORT_WITH_EXPLICIT_CARGO" as const,
      reasonRu: "Общая логистика заменена конкретным грузом, автомобилем, массой и расстоянием.",
    };
    if (row.cost_ownership === "informational_output") return {
      predecessorRowId: row.row_id, predecessorCategory: row.category, predecessorTitleRu: row.title_ru,
      decision: "INFORMATIONAL_ONLY_NOT_PRICED" as const, successorRowIds,
      r4Decision: "REMOVE_NOISE" as const,
      reasonCode: "REMOVE_INFORMATIONAL_NON_PRICED_OUTPUT" as const,
      reasonRu: "Расчётный показатель не является самостоятельной оплачиваемой строкой пользовательской сметы.",
    };
    if (row.category === "labor" || row.category === "equipment" || row.category === "temporary_work") return {
      predecessorRowId: row.row_id, predecessorCategory: row.category, predecessorTitleRu: row.title_ru,
      decision: "INCLUDED_IN_CONSTRUCTION_WORK_RATE" as const, successorRowIds,
      r4Decision: "INCLUDE_IN_RATE" as const,
      reasonCode: "INCLUDE_LABOR_OR_HAND_TOOL_IN_OPERATION_RATE" as const,
      reasonRu: "Труд и ручной инструмент учтены внутри цены измеряемой строительной операции без отдельной строки.",
    };
    return {
      predecessorRowId: row.row_id, predecessorCategory: row.category, predecessorTitleRu: row.title_ru,
      decision: "REMOVED_NON_BOQ_QA_DOCUMENT_OR_OVERHEAD" as const, successorRowIds,
      r4Decision: "REMOVE_NOISE" as const,
      reasonCode: "REMOVE_QA_DOCUMENT_OVERHEAD_NOISE" as const,
      reasonRu: "Проверочная запись, документ, служебная услуга или общая накладная позиция удалена из пользовательского BOQ.",
    };
  });
}

function buildSuccessorAdditionsR4(
  resources: readonly Batch002DrywallResourceR3[],
): Batch002SuccessorAdditionR4[] {
  return resources
    .filter((resource) => resource.sourcePredecessorRowIds.length === 0)
    .map((resource) => {
      if (resource.group === "material") return {
        successorRowId: resource.rowId,
        successorGroup: resource.group,
        successorTitleRu: resource.titleRu,
        r4Decision: "ADD_MISSING" as const,
        reasonCode: "ADD_REQUIRED_MATERIAL" as const,
        reasonRu: "Добавлен отсутствовавший физический материал, необходимый для выбранной операции и варианта.",
      };
      if (resource.group === "construction_work") return {
        successorRowId: resource.rowId,
        successorGroup: resource.group,
        successorTitleRu: resource.titleRu,
        r4Decision: "ADD_MISSING" as const,
        reasonCode: "ADD_REQUIRED_MEASURABLE_OPERATION" as const,
        reasonRu: "Добавлена отсутствовавшая измеряемая строительная операция с собственным физическим результатом.",
      };
      return {
        successorRowId: resource.rowId,
        successorGroup: resource.group,
        successorTitleRu: resource.titleRu,
        r4Decision: "ADD_MISSING" as const,
        reasonCode: "ADD_APPLICABLE_EXPLICIT_DELIVERY" as const,
        reasonRu: "Добавлена применимая отдельная доставка с конкретным грузом, транспортом, массой и расстоянием.",
      };
    });
}

function variantParameterIds(operation: DrywallArchitecturalElementOperationV4, variant: Batch002VariantR3): readonly string[] {
  if (variant === "large_area") return operation === "ALIGN" ? ["large_area_reference_zone_count"] : ["large_area_deformation_joint_length_m"];
  if (variant === "small_area") {
    if (operation === "INSULATE") return ["small_area_cavity_count"];
    if (operation === "REPAIR") return ["small_area_patch_perimeter_m"];
    return ["small_area_return_length_m"];
  }
  if (variant === "technical_room") return operation === "PREPARE"
    ? ["technical_penetration_count", "technical_penetration_perimeter_m", "technical_equipment_protection_area_m2"]
    : ["technical_penetration_count", "technical_penetration_perimeter_m"];
  if (variant === "wet_zone") {
    if (operation === "INSULATE") return ["wet_zone_interface_length_m", "wet_zone_membrane_area_m2"];
    if (operation === "PREPARE") return ["wet_zone_interface_length_m", "wet_zone_surface_area_m2"];
    return ["wet_zone_interface_length_m"];
  }
  return [];
}

function requiredResourceKeys(operation: DrywallArchitecturalElementOperationV4): readonly string[] {
  const values: Readonly<Record<DrywallArchitecturalElementOperationV4, readonly string[]>> = {
    FINISH_JOINT: ["joint_base_compound", "joint_reinforcement_tape", "joint_fill_and_tape"],
    INSULATE: ["insulation_mat", "insulation_retainers", "insulation_cut_and_install"],
    PREPARE: ["preparation_primer", "preparation_repair_compound", "preparation_clean_base"],
    REPAIR: ["repair_boards", "repair_profiles", "repair_selective_dismantling", "repair_finish_patch", "repair_waste_haul"],
    ALIGN: ["alignment_adjustment_parts", "alignment_shims", "alignment_adjust_nodes"],
    CLAD: ["cladding_boards", "cladding_screws", "cladding_cut_and_form", "cladding_install_layers"],
    FRAME: ["frame_flexible_track", "frame_vertical_profiles", "frame_hangers", "frame_form_profiles", "frame_install_structure"],
  };
  return values[operation];
}

export function evaluateBatch002DrywallContentPassportR3(passport: Batch002ContentPassportR4): Batch002DrywallDomainDecisionR3 {
  const errors = [...evaluateEstimateContentPassportR3(passport).errors];
  if (!BATCH002_IDS.has(passport.catalogId)) errors.push("DRYWALL_BATCH002_CATALOG_OUTSIDE_SCOPE");
  if (passport.resources.some((row) => CROSS_DOMAIN_TITLE.test(row.titleRu))) errors.push("DRYWALL_BATCH002_CROSS_DOMAIN_RESOURCE");
  if (passport.resources.some((row) => !row.resourceIdentity.startsWith(`${passport.catalogId}:`))) errors.push("DRYWALL_BATCH002_FOREIGN_RESOURCE_IDENTITY");
  if (passport.resources.some((row) => row.group === "machine_equipment")) errors.push("DRYWALL_BATCH002_UNSCOPED_SEPARATE_EQUIPMENT");
  if (passport.executionContract !== "MASTER_EXECUTION_TZ_R5_5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU") errors.push("DRYWALL_BATCH002_R55_CONTRACT_MISSING");
  if (passport.engineeringSources.length === 0) errors.push("DRYWALL_BATCH002_ENGINEERING_SOURCES_MISSING");
  const declaredSourceIds = new Set(passport.engineeringSources.map((source) => source.sourceId));
  const resourcesR4 = passport.resources as readonly Batch002DrywallResourceR3[];
  for (const resource of resourcesR4) {
    if (resource.engineeringSourceIds.length === 0 || resource.engineeringSourceIds.some((sourceId) => !declaredSourceIds.has(sourceId))) {
      errors.push(`DRYWALL_BATCH002_RESOURCE_SOURCE_BINDING_INVALID:${resource.rowId}`);
    }
    if (resource.procurementEligible !== Boolean(resource.procurementOwnerId)) {
      errors.push(`DRYWALL_BATCH002_PROCUREMENT_OWNER_INVALID:${resource.rowId}`);
    }
  }
  const procurementOwners = resourcesR4.map((row) => row.procurementOwnerId).filter((owner): owner is string => owner != null);
  if (new Set(procurementOwners).size !== procurementOwners.length) errors.push("DRYWALL_BATCH002_DUPLICATE_PROCUREMENT_OWNER");
  const adjudicatedPredecessorIds = passport.predecessorAdjudication.map((row) => row.predecessorRowId);
  if (new Set(adjudicatedPredecessorIds).size !== adjudicatedPredecessorIds.length) {
    errors.push("DRYWALL_BATCH002_DUPLICATE_PREDECESSOR_ADJUDICATION");
  }
  const additionIds = passport.successorAdditions.map((row) => row.successorRowId);
  if (new Set(additionIds).size !== additionIds.length) errors.push("DRYWALL_BATCH002_DUPLICATE_SUCCESSOR_ADDITION");
  const expectedAdditionIds = resourcesR4.filter((row) => row.sourcePredecessorRowIds.length === 0).map((row) => row.rowId).sort();
  if (JSON.stringify([...additionIds].sort()) !== JSON.stringify(expectedAdditionIds)) {
    errors.push("DRYWALL_BATCH002_SUCCESSOR_ADDITION_COVERAGE_DRIFT");
  }
  if (passport.successorAdditions.some((row) => row.r4Decision !== "ADD_MISSING")) {
    errors.push("DRYWALL_BATCH002_SUCCESSOR_ADDITION_DECISION_INVALID");
  }
  const visibleParameters = passport.parameters.filter((item) => item.visibilityRole === "USER_INPUT");
  const parameterContractById = new Map(passport.userParameterContracts.map((contract) => [contract.parameterId, contract]));
  for (const parameter of visibleParameters) {
    const contract = parameterContractById.get(parameter.parameterId);
    if (!contract) errors.push(`DRYWALL_BATCH002_PARAMETER_R4_CONTRACT_MISSING:${parameter.parameterId}`);
    else if (contract.formulaConsumerIds.length + contract.resourceConsumerIds.length === 0) errors.push(`DRYWALL_BATCH002_PARAMETER_R4_DEAD:${parameter.parameterId}`);
  }
  if (parameterContractById.size !== visibleParameters.length) errors.push("DRYWALL_BATCH002_PARAMETER_R4_CONTRACT_COUNT_DRIFT");
  if (visibleParameters.length > 15 && passport.highParameterCountJustificationRu.length !== visibleParameters.length) {
    errors.push("DRYWALL_BATCH002_HIGH_PARAMETER_JUSTIFICATION_MISSING");
  }
  if (BATCH002_IDS.has(passport.catalogId)) {
    const operation = operationOf(passport.catalogId);
    const variant = variantOf(passport.catalogId);
    const identities = new Set(passport.resources.map((row) => row.resourceIdentity.split(":").at(-1)));
    for (const key of requiredResourceKeys(operation)) if (!identities.has(key)) errors.push(`DRYWALL_BATCH002_REQUIRED_RESOURCE_MISSING:${key}`);
    const visibleIds = new Set(passport.parameters.filter((item) => item.visibilityRole === "USER_INPUT").map((item) => item.parameterId));
    for (const parameterId of variantParameterIds(operation, variant)) {
      if (!visibleIds.has(parameterId)) errors.push(`DRYWALL_BATCH002_VARIANT_PARAMETER_MISSING:${parameterId}`);
    }
    for (const foreignVariant of ALL_BATCH002_VARIANTS.filter((candidate) => candidate !== variant)) {
      for (const parameterId of variantParameterIds(operation, foreignVariant)) {
        if (visibleIds.has(parameterId)) errors.push(`DRYWALL_BATCH002_FOREIGN_VARIANT_PARAMETER:${foreignVariant}:${parameterId}`);
      }
    }
    if (!passport.resources.some((row) => row.group === "material")) errors.push("DRYWALL_BATCH002_MATERIALS_MISSING");
    if (!passport.resources.some((row) => row.group === "construction_work")) errors.push("DRYWALL_BATCH002_WORKS_MISSING");
    if (!passport.resources.some((row) => row.group === "delivery")) errors.push("DRYWALL_BATCH002_DELIVERY_FLOW_MISSING");
  }
  const uniqueErrors = [...new Set(errors)].sort();
  return { status: uniqueErrors.length === 0 ? "GREEN" : "RED", allowed: uniqueErrors.length === 0, errors: uniqueErrors };
}

function buildDefinition(catalogId: string): Batch002DrywallSuccessorDefinitionR3 {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH002_R3_INVENTORY_MISSING:${catalogId}`);
  const predecessor = buildDrywallArchitecturalElementProfessionalPackagePartsV4(inventory);
  if (!predecessor) throw new Error(`BATCH002_R3_PREDECESSOR_MISSING:${catalogId}`);
  const predecessorRows = predecessor.child_assemblies.flatMap((child) => child.rows);
  const predecessorByKey = new Map(predecessorRows.map((row) => [row.row_id.split(":row:").at(-1) ?? row.row_id, row]));
  const operation = operationOf(catalogId);
  const variant = variantOf(catalogId);
  const system = systemOf(catalogId);
  const engineeringSourceIds = batch002EngineeringSourceIdsR4({ operation, wetZone: variant === "wet_zone" });
  const blueprints = commonBlueprints(system, operation, variant);
  const cargo = deliveryCargo(operation);
  blueprints.rows.push({
    key: "material_delivery",
    group: "delivery",
    titleRu: cargo.titleRu,
    unitId: "t_km",
    expression: "delivery_mass_kg / 1000 * delivery_distance_km",
    sourceKeys: [`${operation.toLowerCase()}_delivery`],
    normativeKind: "DELIVERY",
    procurementEligible: true,
    delivery: {
      cargoRu: cargo.cargoRu,
      vehicleRu: operation === "INSULATE" || operation === "CLAD" ? "крытый бортовой грузовой автомобиль" : "бортовой грузовой автомобиль",
      physicalExpression: "delivery_mass_kg / 1000",
    },
  });
  blueprints.userIds.add("delivery_included_by_supplier");
  blueprints.userIds.add("delivery_mass_kg");
  blueprints.userIds.add("delivery_distance_km");

  const runtimeFormulas: RuntimeFormulaR3[] = [];
  const resources: Batch002DrywallResourceR3[] = [];
  for (const blueprint of blueprints.rows) {
    const quantity = formula(catalogId, blueprint.key, blueprint.unitId, blueprint.expression);
    runtimeFormulas.push(quantity);
    let physicalQuantityFormulaId: string | undefined;
    if (blueprint.delivery) {
      const physical = formula(catalogId, `${blueprint.key}:physical-cargo`, blueprint.key === "repair_waste_haul" ? "t" : "t", blueprint.delivery.physicalExpression);
      runtimeFormulas.push(physical);
      physicalQuantityFormulaId = physical.formulaId;
    }
    const sourcePredecessorRowIds = blueprint.sourceKeys
      .map((key) => predecessorByKey.get(key)?.row_id)
      .filter((rowId): rowId is string => Boolean(rowId));
    const rowId = `${catalogId}:successor-r3:${blueprint.group}:${blueprint.key}`;
    resources.push({
      rowId,
      group: blueprint.group,
      titleRu: blueprint.titleRu,
      unitId: blueprint.unitId,
      formulaId: quantity.formulaId,
      semanticOwnerId: `${catalogId}:successor-r3:semantic:${blueprint.group}:${blueprint.key}`,
      costOwnerId: `${catalogId}:successor-r3:cost:${blueprint.group}:${blueprint.key}`,
      resourceIdentity: `${catalogId}:${blueprint.group}:${blueprint.key}`,
      provenanceKind: blueprint.group === "material" ? "CANONICAL_PHYSICAL_RESOURCE"
        : blueprint.group === "construction_work" ? "EXPLICIT_CONSTRUCTION_OPERATION"
          : "EXPLICIT_CARGO_DELIVERY",
      generationAxes: [],
      costingMode: "OWN_COST",
      procurementEligible: blueprint.procurementEligible ?? blueprint.group !== "construction_work",
      normativeSource: normativeSource(blueprint.normativeKind),
      ...(blueprint.delivery ? {
        delivery: {
          cargoRu: blueprint.delivery.cargoRu,
          vehicleRu: blueprint.delivery.vehicleRu,
          physicalQuantityFormulaId: physicalQuantityFormulaId!,
          distanceParameterId: blueprint.key === "repair_waste_haul" ? "waste_haul_distance_km" : "delivery_distance_km",
        },
      } : {}),
      applicability: blueprint.key === "material_delivery"
        ? { kind: "DELIVERY_NOT_INCLUDED_BY_SUPPLIER", parameterId: "delivery_included_by_supplier", reasonRu: "Отдельная перевозка создаётся только когда поставщик не включил её в цену материалов." }
        : { kind: "FORMULA_POSITIVE", reasonRu: "Строка выводится только при положительном физическом количестве по явной формуле." },
      sourcePredecessorRowIds,
      procurementOwnerId: (blueprint.procurementEligible ?? blueprint.group !== "construction_work")
        ? `${catalogId}:successor-r3:procurement:${blueprint.group}:${blueprint.key}`
        : null,
      engineeringSourceIds,
    });
  }

  const formulaConsumers = new Map<string, string[]>();
  for (const item of runtimeFormulas) for (const parameterId of item.inputParameterIds) {
    const consumers = formulaConsumers.get(parameterId) ?? [];
    consumers.push(item.formulaId);
    formulaConsumers.set(parameterId, consumers);
  }
  const resourceConsumers = new Map<string, string[]>();
  const runtimeById = new Map(runtimeFormulas.map((item) => [item.formulaId, item]));
  for (const resource of resources) for (const parameterId of runtimeById.get(resource.formulaId)?.inputParameterIds ?? []) {
    const consumers = resourceConsumers.get(parameterId) ?? [];
    consumers.push(resource.rowId);
    resourceConsumers.set(parameterId, consumers);
  }
  const allMaterialIds = resources.filter((row) => row.group === "material").map((row) => row.rowId);
  const allWorkIds = resources.filter((row) => row.group === "construction_work").map((row) => row.rowId);
  const deliveryIds = resources.filter((row) => row.rowId.endsWith(":material_delivery")).map((row) => row.rowId);
  resourceConsumers.set("delivery_included_by_supplier", deliveryIds);
  for (const id of blueprints.systemIds) resourceConsumers.set(id, [...allMaterialIds, ...allWorkIds]);
  for (const id of variantParameterIds(operation, variant)) {
    if ((resourceConsumers.get(id) ?? []).length === 0) resourceConsumers.set(id, [...allMaterialIds, ...allWorkIds]);
  }
  const parameterIds = new Set([
    ...formulaConsumers.keys(),
    ...blueprints.userIds,
    ...blueprints.systemIds,
  ]);
  const parameters = [...parameterIds]
    .sort((left, right) => Number(blueprints.userIds.has(right) || blueprints.systemIds.has(right)) - Number(blueprints.userIds.has(left) || blueprints.systemIds.has(left)) || left.localeCompare(right))
    .map((parameterId) => {
      const meta = parameterMeta(parameterId);
      return {
        parameterId,
        titleRu: meta.titleRu,
        guideRu: meta.guideRu,
        visibilityRole: blueprints.userIds.has(parameterId) || blueprints.systemIds.has(parameterId) ? "USER_INPUT" as const : "INTERNAL_ONLY" as const,
        formulaConsumerIds: [...new Set(formulaConsumers.get(parameterId) ?? [])].sort(),
        resourceConsumerIds: [...new Set(resourceConsumers.get(parameterId) ?? [])].sort(),
      };
    });
  const scope = technologyScope(system, operation);
  const variantScope = variantTechnologyScope(operation, variant);
  const count = (group: EstimateContentResourceR3["group"]): number => resources.filter((row) => row.group === group).length;
  const adjudication = buildAdjudication(predecessorRows, resources);
  const successorAdditions = buildSuccessorAdditionsR4(resources);
  const userParameterContracts = buildUserParameterContractsR4({ parameters, variant, operation, engineeringSourceIds });
  const highParameterCountJustificationRu = userParameterContracts.length > 15
    ? userParameterContracts.map((parameter) => `${parameter.parameterId}: ${parameter.guideRu} Влияет на ${[...parameter.formulaConsumerIds, ...parameter.resourceConsumerIds].length} расчётных потребителей.`)
    : [];
  const passport: Batch002ContentPassportR4 = {
    contract: ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
    executionContract: "MASTER_EXECUTION_TZ_R5_5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU",
    batchId: "BATCH-002",
    domain: "interior_finishes",
    technologyFamily: system === "BULKHEAD" ? "DRYWALL_CEILING_BULKHEAD" : "DRYWALL_CURVED_CEILING_ELEMENT",
    operation,
    variant,
    primaryMeasure: primaryMeasure(operation),
    applicabilityRu: `Самостоятельная операция ${operation} для ${systemLabel(system)} в варианте «${variantLabel(variant)}»; ресурсы других операций и вариантов не наследуются автоматически.`,
    catalogId,
    titleRu: definitionTitle(system, operation, variant),
    identityMode: "WORK",
    aliasesRu: [inventory.localized_name_ru],
    physicalResultRu: scope.physicalResultRu,
    includedScopeRu: [...scope.includedScopeRu, ...variantScope.includedScopeRu],
    excludedScopeRu: [...scope.excludedScopeRu, ...variantScope.excludedScopeRu],
    parameters,
    formulas: runtimeFormulas.map(({ calculate: _calculate, ...item }) => item),
    resources,
    capabilityMatrix: [
      { group: "material", status: "INCLUDED", reasonRu: "Включены конкретные физические материалы выбранной гипсокартонной системы." },
      { group: "construction_work", status: "INCLUDED", reasonRu: "Работы представлены измеряемыми строительными операциями без отдельных человеко-часов." },
      { group: "machine_equipment", status: "NOT_APPLICABLE", reasonRu: "Ручной инструмент включён в цену операций; отдельная аренда техники проектом не задана." },
      { group: "delivery", status: count("delivery") > 0 ? "OPTIONAL" : "NOT_APPLICABLE", reasonRu: "Конкретная перевозка учитывается только при отдельной оплате и положительной массе груза." },
    ],
    userParameterContracts,
    derivedParameters: derivedParametersR4(system),
    engineeringSources: resolveBatch002EngineeringSourcesR4(engineeringSourceIds),
    commercialAssumptionsRu: [
      "Цены вводятся отдельно от физических формул и не меняют технологические количества.",
      "Перевозка материалов показывается только пока поставщик не подтвердил её включение в цену.",
      "Численные нормы расхода берутся из паспорта фактически выбранной совместимой системы; универсальный скрытый расход запрещён.",
    ],
    semanticOwners: resources.map((row) => row.semanticOwnerId),
    costOwners: resources.map((row) => row.costOwnerId),
    procurementOwners: resources.map((row) => row.procurementOwnerId).filter((owner): owner is string => owner != null),
    predecessorAdjudication: adjudication,
    successorAdditions,
    highParameterCountJustificationRu,
    proofStatus: "CONTENT_SUBJECT_AUDIT_GREEN_BACKEND_REPLAY_PENDING_R55",
  };
  const contentDecision = evaluateEstimateContentPassportR3(passport);
  const domainDecision = evaluateBatch002DrywallContentPassportR3(passport);
  const technologyPassportDraft = buildBatch002DrywallTechnologyPassportDraftR1(catalogId);
  const technologyPassportDecision = evaluateTechnologyPassportR1(technologyPassportDraft, []);
  if (JSON.stringify(technologyPassportDecision.errors) !== JSON.stringify(["ENGINEER_ACCEPTANCE_MISSING"])) {
    throw new Error(`BATCH002_R1_SHADOW_PASSPORT_STRUCTURE_RED:${catalogId}:${technologyPassportDecision.errors.join("|")}`);
  }
  const geometryIds = geometry(system).userIds.filter((id) => parameterIds.has(id));
  const variantIds = variantParameterIds(operation, variant).filter((id) => parameterIds.has(id));
  const systemIds = [...blueprints.systemIds].filter((id) => parameterIds.has(id));
  return {
    contract: BATCH002_DRYWALL_SUCCESSOR_R3_CONTRACT,
    catalogId,
    predecessorVersion: "DrywallArchitecturalElementProfessionalV4",
    successorVersionId: `${catalogId}:successor-r3:v1`,
    system,
    operation,
    variant,
    predecessorVisibleParameterCount: predecessor.schema.parameters.length,
    technologyStepsRu: [...scope.technologyStepsRu, ...variantScope.technologyStepsRu],
    dependencyRu: [...scope.dependencyRu, ...variantScope.dependencyRu],
    userParameterGroups: [
      { groupId: "geometry", titleRu: "Геометрия и объём", parameterIds: [...geometryIds, ...[...blueprints.userIds].filter((id) => !geometryIds.includes(id) && !variantIds.includes(id) && !id.startsWith("delivery_") && !["waste_haul_distance_km"].includes(id))] },
      ...(systemIds.length > 0 ? [{ groupId: "system" as const, titleRu: "Система и материал", parameterIds: systemIds }] : []),
      ...(variantIds.length > 0 ? [{ groupId: "variant" as const, titleRu: `Особенности варианта «${variantLabel(variant)}»`, parameterIds: variantIds }] : []),
      { groupId: "delivery", titleRu: "Доставка материалов", parameterIds: ["delivery_included_by_supplier"] },
      { groupId: "delivery", titleRu: "Маршрут отдельной доставки", parameterIds: ["delivery_mass_kg", "delivery_distance_km"], visibleWhen: { parameterId: "delivery_included_by_supplier", equals: false } },
    ],
    runtimeFormulas,
    resources,
    passport,
    contentDecision,
    domainDecision,
    adjudication,
    successorAdditions,
    shadowRealUsefulGateR1: {
      contract: BATCH002_DRYWALL_TECHNOLOGY_PASSPORT_R1_CONTRACT,
      mode: "SHADOW_PREPARED_ONLY",
      productionAdmissionAttached: false,
      currentUserRuntimeChanged: false,
      technologyPassportSha256: technologyPassportR1Sha256(technologyPassportDraft),
      reviewStatus: "DRAFT",
      status: "RED",
      blockers: [
        "ENGINEER_ACCEPTANCE_MISSING",
        "EXACT_EQUIPMENT_RUNTIME_ROW_MISSING",
        "LEGACY_EQUIPMENT_POLICY_CONTRADICTS_MASTER",
      ],
    },
  };
}

export function buildBatch002DrywallSuccessorR3(catalogId: string): Batch002DrywallSuccessorDefinitionR3 {
  if (!BATCH002_IDS.has(catalogId)) throw new Error(`BATCH002_R3_CATALOG_OUTSIDE_SCOPE:${catalogId}`);
  return buildDefinition(catalogId);
}

export function buildAllBatch002DrywallSuccessorsR3(): readonly Batch002DrywallSuccessorDefinitionR3[] {
  return DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4.map(buildDefinition);
}

type FormulaDimensionR4 = { length: number; mass: number; liquid: number };
const DIMENSIONLESS: FormulaDimensionR4 = { length: 0, mass: 0, liquid: 0 };
const dimension = (length = 0, mass = 0, liquid = 0): FormulaDimensionR4 => ({ length, mass, liquid });
const sameDimension = (left: FormulaDimensionR4, right: FormulaDimensionR4): boolean =>
  left.length === right.length && left.mass === right.mass && left.liquid === right.liquid;
const combineDimension = (left: FormulaDimensionR4, right: FormulaDimensionR4, sign: 1 | -1): FormulaDimensionR4 =>
  dimension(left.length + sign * right.length, left.mass + sign * right.mass, left.liquid + sign * right.liquid);

function formulaParameterDimension(parameterId: string): FormulaDimensionR4 | null {
  if (parameterId.includes("coverage_m2_item")) return dimension(2);
  if (parameterId.includes("item_m2_layer") || parameterId.includes("item_m2")) return dimension(-2);
  if (parameterId.includes("item_m")) return dimension(-1);
  if (parameterId.includes("kg_m2")) return dimension(-2, 1);
  if (parameterId.includes("kg_m")) return dimension(-1, 1);
  if (parameterId.includes("kg_item")) return dimension(0, 1);
  if (parameterId.includes("l_m2")) return dimension(-2, 0, 1);
  if (parameterId.endsWith("_m3")) return dimension(3);
  if (parameterId.endsWith("_m2")) return dimension(2);
  if (parameterId.endsWith("_km") || parameterId.endsWith("_m")) return dimension(1);
  if (parameterId.endsWith("_kg") || parameterId.endsWith("_t")) return dimension(0, 1);
  if (parameterId.endsWith("_count") || parameterId.endsWith("_percent") || parameterId.endsWith("_deg")
    || parameterId.includes("run_count") || parameterId.includes("per_connection") || parameterId.includes("item_opening")) {
    return DIMENSIONLESS;
  }
  return null;
}

function formulaOutputDimension(unitId: string): FormulaDimensionR4 | null {
  if (unitId === "m") return dimension(1);
  if (unitId === "m2") return dimension(2);
  if (unitId === "m3") return dimension(3);
  if (unitId === "kg" || unitId === "t") return dimension(0, 1);
  if (unitId === "l") return dimension(0, 0, 1);
  if (unitId === "t_km") return dimension(1, 1);
  if (unitId === "item") return DIMENSIONLESS;
  return null;
}

function evaluateFormulaDimensionR4(ast: FormulaAst): FormulaDimensionR4 {
  if (ast.kind === "literal") return DIMENSIONLESS;
  if (ast.kind === "parameter") {
    const resolved = formulaParameterDimension(ast.id);
    if (!resolved) throw new Error(`PARAMETER_UNIT_UNKNOWN:${ast.id}`);
    return resolved;
  }
  if (ast.kind === "unary") return evaluateFormulaDimensionR4(ast.operand);
  if (ast.kind === "binary") {
    const left = evaluateFormulaDimensionR4(ast.left);
    const right = evaluateFormulaDimensionR4(ast.right);
    if (ast.operator === "+" || ast.operator === "-") {
      if (!sameDimension(left, right)) throw new Error(`ADDITION_UNIT_MISMATCH:${ast.operator}`);
      return left;
    }
    return combineDimension(left, right, ast.operator === "*" ? 1 : -1);
  }
  if (ast.kind === "conditional") {
    const whenTrue = evaluateFormulaDimensionR4(ast.whenTrue);
    const whenFalse = evaluateFormulaDimensionR4(ast.whenFalse);
    if (!sameDimension(whenTrue, whenFalse)) throw new Error("CONDITIONAL_UNIT_MISMATCH");
    return whenTrue;
  }
  const dimensions = ast.arguments.map(evaluateFormulaDimensionR4);
  if (ast.function === "ceil") return dimensions[0];
  if (dimensions.some((item) => !sameDimension(item, dimensions[0]))) throw new Error(`FUNCTION_UNIT_MISMATCH:${ast.function}`);
  return dimensions[0];
}

export function evaluateBatch002FormulaUnitsR4(definition: Batch002DrywallSuccessorDefinitionR3): {
  status: "GREEN" | "RED";
  errors: readonly string[];
} {
  const errors: string[] = [];
  for (const item of definition.runtimeFormulas) {
    try {
      const compiled = compileFormulaGraph(item.expressionSource);
      const actual = evaluateFormulaDimensionR4(compiled.ast);
      const expected = formulaOutputDimension(item.outputUnitId);
      if (!expected) errors.push(`OUTPUT_UNIT_UNKNOWN:${item.formulaId}:${item.outputUnitId}`);
      else if (!sameDimension(actual, expected)) errors.push(`OUTPUT_UNIT_MISMATCH:${item.formulaId}:${item.outputUnitId}`);
    } catch (error) {
      errors.push(`FORMULA_UNIT_ERROR:${item.formulaId}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const unique = [...new Set(errors)].sort();
  return { status: unique.length === 0 ? "GREEN" : "RED", errors: unique };
}

export function compileBatch002DrywallSuccessorR3(
  definition: Batch002DrywallSuccessorDefinitionR3,
  values: Readonly<Record<string, string | number | boolean>>,
): Batch002DrywallCompileResultR3 {
  if (!definition.contentDecision.allowed || !definition.domainDecision.allowed) return {
    status: "RED",
    catalogId: definition.catalogId,
    blockers: [...new Set([...definition.contentDecision.errors, ...definition.domainDecision.errors])],
    rows: [],
  };
  const deliveryIncluded = values.delivery_included_by_supplier === true;
  const missingUserInputs = definition.passport.parameters
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .filter((parameter) => {
      if (deliveryIncluded && ["delivery_mass_kg", "delivery_distance_km"].includes(parameter.parameterId)) return false;
      const value = values[parameter.parameterId];
      return value == null || (typeof value === "string" && value.trim().length === 0);
    })
    .map((parameter) => `MISSING_USER_INPUT:${parameter.parameterId}`);
  if (missingUserInputs.length > 0) return { status: "NEEDS_REQUIRED_INPUTS", catalogId: definition.catalogId, blockers: missingUserInputs, rows: [] };
  const invalidUserInputs: string[] = [];
  for (const contract of definition.passport.userParameterContracts) {
    const value = values[contract.parameterId];
    if (deliveryIncluded && value == null && ["delivery_mass_kg", "delivery_distance_km"].includes(contract.parameterId)) continue;
    if (contract.inputType === "NUMBER") {
      if (typeof value !== "number" || !Number.isFinite(value)) invalidUserInputs.push(`USER_INPUT_TYPE_INVALID:${contract.parameterId}:NUMBER`);
      else if (contract.range.kind !== "NUMERIC" || value < contract.range.minimum || value > contract.range.maximum) {
        invalidUserInputs.push(`USER_INPUT_OUT_OF_RANGE:${contract.parameterId}`);
      }
    } else if (contract.inputType === "TEXT") {
      if (typeof value !== "string" || contract.range.kind !== "TEXT" || value.length < contract.range.minimumLength || value.length > contract.range.maximumLength) {
        invalidUserInputs.push(`USER_INPUT_OUT_OF_RANGE:${contract.parameterId}`);
      }
    } else if (typeof value !== "boolean") invalidUserInputs.push(`USER_INPUT_TYPE_INVALID:${contract.parameterId}:BOOLEAN`);
  }
  if (invalidUserInputs.length > 0) return { status: "RED", catalogId: definition.catalogId, blockers: invalidUserInputs, rows: [] };
  if (definition.operation === "REPAIR" && values.repair_cause_removed !== true) return {
    status: "RED",
    catalogId: definition.catalogId,
    blockers: ["REPAIR_CAUSE_NOT_REMOVED"],
    rows: [],
  };
  const formulaById = new Map(definition.runtimeFormulas.map((item) => [item.formulaId, item]));
  const rows: Batch002DrywallCompiledRowR3[] = [];
  const blockers: string[] = [];
  for (const resource of definition.resources) {
    if (resource.applicability.kind === "DELIVERY_NOT_INCLUDED_BY_SUPPLIER" && deliveryIncluded) continue;
    const item = formulaById.get(resource.formulaId);
    if (!item) { blockers.push(`FORMULA_MISSING:${resource.rowId}`); continue; }
    const missingNumeric = item.inputParameterIds.filter((parameterId) => {
      const value = values[parameterId];
      return typeof value !== "number" || !Number.isFinite(value);
    });
    if (missingNumeric.length > 0) {
      blockers.push(...missingNumeric.map((parameterId) => `MISSING_NUMERIC_INPUT:${resource.rowId}:${parameterId}`));
      continue;
    }
    let quantity: number;
    try { quantity = item.calculate(values as Readonly<Record<string, number>>); }
    catch { blockers.push(`FORMULA_CALCULATION_FAILED:${resource.rowId}`); continue; }
    if (!Number.isFinite(quantity) || quantity < 0) { blockers.push(`INVALID_QUANTITY:${resource.rowId}`); continue; }
    if (quantity === 0) continue;
    rows.push({
      rowId: resource.rowId,
      group: resource.group,
      titleRu: compiledResourceTitle(definition, resource, values),
      unitId: resource.unitId,
      quantity,
      semanticOwnerId: resource.semanticOwnerId,
      costOwnerId: resource.costOwnerId,
      procurementEligible: resource.procurementEligible,
    });
  }
  if (blockers.length > 0) return { status: "RED", catalogId: definition.catalogId, blockers: [...new Set(blockers)].sort(), rows: [] };
  return { status: "GREEN", catalogId: definition.catalogId, rows };
}

function compiledResourceTitle(
  definition: Batch002DrywallSuccessorDefinitionR3,
  resource: Batch002DrywallResourceR3,
  values: Readonly<Record<string, string | number | boolean>>,
): string {
  const selected = (parameterId: string): string | null => {
    const value = values[parameterId];
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  let specification: string | null = null;
  if (definition.operation === "FINISH_JOINT") {
    if (resource.group === "material") specification = selected("joint_system_type");
    if (resource.resourceIdentity.endsWith(":joint_finish_surface")) specification = selected("surface_quality_level");
  } else if (definition.operation === "INSULATE" && resource.resourceIdentity.endsWith(":insulation_mat")) {
    specification = selected("insulation_type");
  } else if (definition.operation === "PREPARE"
    && (resource.resourceIdentity.endsWith(":preparation_primer") || resource.resourceIdentity.endsWith(":preparation_clean_base"))) {
    specification = selected("substrate_type");
  } else if (definition.operation === "REPAIR" && resource.resourceIdentity.endsWith(":repair_boards")) {
    specification = selected("repair_board_type");
  } else if (definition.operation === "CLAD") {
    if (resource.resourceIdentity.endsWith(":cladding_boards")) specification = selected("board_type");
    if (resource.resourceIdentity.endsWith(":cladding_cut_and_form")) specification = selected("forming_method");
  } else if (definition.operation === "FRAME" && resource.group === "material") {
    specification = selected("frame_system_type");
  }
  return specification ? `${resource.titleRu} — ${specification}` : resource.titleRu;
}
