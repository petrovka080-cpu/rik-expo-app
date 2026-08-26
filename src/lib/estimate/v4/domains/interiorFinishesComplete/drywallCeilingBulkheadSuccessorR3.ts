import {
  ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
  evaluateEstimateContentPassportR3,
  type EstimateContentFormulaR3,
  type EstimateContentPassportDecisionR3,
  type EstimateContentPassportR3,
  type EstimateContentResourceR3,
} from "../../../backendPlatform/estimateContentPassportR3";
import { compileFormulaGraph, evaluateFormulaGraph } from "../../../backendPlatform/formulaGraph";
import {
  evaluateTechnologyPassportR1,
  type TechnologyPassportDecisionR1,
} from "../../../backendPlatform/technologyPassportR1";
import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyRowDefinitionV4,
} from "../../professionalProjectAssemblyV4";
import type { ProfessionalDomainParameterDefinitionV1 } from "../../domainFactory";
import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3,
  buildDrywallCeilingBulkheadProfessionalPackagePartsV3,
  type DrywallCeilingBulkheadProfessionalGroupV3,
  type DrywallCeilingBulkheadProfessionalVariantV3,
} from "./drywallCeilingBulkheadProfessionalV3";
import {
  batch001EngineeringSourceIdsR56,
  resolveBatch001EngineeringSourcesR56,
  type Batch001EngineeringSourceR56,
} from "./drywallBatch001EngineeringSourcesR56";
import { buildBatch001DrywallTechnologyPassportDraftR1 } from "./drywallCeilingBulkheadTechnologyPassportR1";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from "./inventory";

export const BATCH001_DRYWALL_SUCCESSOR_R3_CONTRACT =
  "real-professional-estimates-r3.batch001-drywall-successor.v1" as const;

const FRAME_MATERIAL_KEYS = new Set([
  "perimeter_profiles",
  "primary_profiles",
  "cross_profiles",
  "suspensions",
  "suspension_rods",
  "suspension_anchors",
  "profile_connectors",
  "profile_extensions",
  "profile_connection_screws",
  "corner_connectors",
  "anchors",
  "separation_tape",
  "sealing_tape",
  "profile_cut_protection",
  "large_area_control_joint_profile",
  "large_area_two_level_connectors",
  "small_area_self_supporting_guide_profiles",
  "small_area_self_supporting_stud_profiles",
  "technical_opening_profiles",
  "technical_opening_reinforcement_fasteners",
  "wet_zone_corrosion_protection",
  "wet_zone_corrosion_fasteners",
]);

const ALIGN_MATERIAL_KEYS = new Set([
  "wet_zone_adjustment_consumables",
]);

const CLAD_MATERIAL_KEYS = new Set([
  "gypsum_board_sheets",
  "sheet_screws",
  "cut_edge_primer",
  "joint_reinforcement_tape",
  "joint_compound",
  "fastener_recess_compound",
  "finish_putty",
  "surface_primer",
  "external_corner_profile",
  "internal_corner_tape",
  "edge_profile",
  "shadow_joint_profile",
  "acoustic_joint_sealant",
  "acoustic_tape",
  "acoustic_fire_insulation",
  "protective_membrane",
  "large_area_clad_control_joint",
  "small_area_edge_screws",
  "technical_opening_screws",
  "technical_fire_acoustic_sealant",
  "wet_zone_penetration_sealant",
  "wet_zone_waterproof_primer",
  "wet_zone_waterproofing",
  "wet_zone_waterproof_tape",
  "wet_zone_penetration_cuffs",
]);

const GEOMETRY_USER_PARAMETERS = [
  "horizontal_face_area_m2",
  "vertical_face_length_m",
  "vertical_face_count",
  "bulkhead_drop_height_m",
  "end_face_area_m2",
  "return_face_area_m2",
  "opening_area_m2",
] as const;

const PARAMETER_GUIDES_RU: Readonly<Record<string, string>> = {
  horizontal_face_area_m2: "Укажите суммарную площадь горизонтальных граней по чертежу или обмеру, м².",
  vertical_face_length_m: "Укажите суммарную длину вертикальных граней потолочного короба, м.",
  vertical_face_count: "Укажите число вертикальных граней одинаковой высоты опуска.",
  bulkhead_drop_height_m: "Укажите проектную высоту опуска потолочного короба, м.",
  end_face_area_m2: "Укажите суммарную площадь торцов потолочного короба, м².",
  return_face_area_m2: "Укажите площадь возвратов и переходов потолочного короба, м².",
  opening_area_m2: "Укажите площадь проёмов, которую нужно вычесть из обшиваемой поверхности, м².",
  perimeter_length_m: "Укажите длину примыканий и направляющих профилей по проекту, м.",
  exact_system_route: "Выберите совместимую систему профилей, подвесов и крепежа по проекту.",
  board_layer_count: "Укажите число слоёв гипсокартонных листов по проекту системы.",
  board_type: "Укажите тип листа: обычный, влагостойкий, огнестойкий или проектный аналог.",
  surface_quality_level: "Укажите требуемый уровень подготовки поверхности Q1–Q4 по отделочному заданию.",
  delivery_included_by_supplier: "Отметьте, включена ли доставка материалов в цену поставщика.",
  delivery_distance_km: "Если доставка оплачивается отдельно, укажите расстояние от поставщика до объекта, км.",
  large_area_control_joint_length_m: "Укажите проектную длину деформационных швов каркаса большой площади, м.",
  small_area_self_supporting_profile_length_m: "Укажите длину направляющих самонесущих участков малого короба, м.",
  small_area_self_supporting_stud_length_m: "Укажите длину стоечных профилей самонесущих участков малого короба, м.",
  technical_service_opening_count: "Укажите количество инженерных проходов и люков по проекту.",
  wet_zone_corrosion_fastener_count: "Укажите количество коррозионностойких креплений каркаса во влажной зоне.",
  large_area_instrument_zone_count: "Укажите количество захваток большой площади, выравниваемых по отдельным установкам нивелира.",
  small_area_corner_count: "Укажите количество коротких граней и углов, требующих отдельного выравнивания.",
  technical_obstruction_count: "Укажите количество инженерных вводов, возле которых требуется выровнять каркас.",
  wet_zone_adjustment_point_count: "Укажите количество точек регулировки каркаса во влажной зоне.",
  design_load_kn_m2: "Укажите проектную расчётную нагрузку на усиленную обшивку, кН/м².",
  large_area_clad_control_joint_length_m: "Укажите длину деформационных швов обшивки большой площади, м.",
  small_area_cut_edge_length_m: "Укажите суммарную длину подрезанных кромок малого короба, м.",
  technical_opening_perimeter_m_item: "Укажите средний периметр одного инженерного прохода, м.",
  wet_zone_penetration_count: "Укажите количество проходов, которые нужно герметизировать во влажной зоне.",
  wet_zone_cuff_count: "Укажите количество гидроизоляционных манжет по проекту проходок.",
};

const TITLE_BY_ROW_KEY: Readonly<Record<string, string>> = {
  suspensions: "Подвесы для потолочного каркаса выбранной системы",
  suspension_rods: "Тяги или шпильки подвесов выбранной системы",
  profile_connection_screws: "Шурупы для соединения металлических профилей",
  large_area_control_joint_profile: "Профиль деформационного шва большой площади",
  large_area_two_level_connectors: "Двухуровневые соединители каркаса большой площади",
  profile_cut_protection: "Антикоррозионный состав для мест реза стального профиля",
  wet_zone_corrosion_protection: "Антикоррозионный состав для каркаса во влажной зоне",
  wet_zone_corrosion_fasteners: "Коррозионностойкий крепёж каркаса во влажной зоне",
  gypsum_board_sheets: "Гипсокартонные листы типа и толщины по проекту",
  joint_compound: "Шпаклёвка для заполнения стыков гипсокартонных листов",
  fastener_recess_compound: "Шпаклёвка мест крепления гипсокартонных листов",
  finish_putty: "Финишная шпаклёвка требуемого уровня подготовки поверхности",
  large_area_clad_control_joint: "Профиль деформационного шва обшивки большой площади",
  acoustic_tape: "Уплотнительная акустическая лента примыканий обшивки",
  wet_zone_adjustment_consumables: "Коррозионностойкие регулировочные прокладки и крепёж",
};

type Batch001RuntimeFormulaR3 = EstimateContentFormulaR3 & {
  calculate: ProfessionalAssemblyFormulaV4["calculate"];
  sourcePredecessorFormulaId: string | null;
};

export type Batch001ResourceApplicabilityR3 =
  | { kind: "FORMULA_POSITIVE"; reasonRu: string }
  | {
    kind: "DELIVERY_NOT_INCLUDED_BY_SUPPLIER";
    parameterId: "delivery_included_by_supplier";
    reasonRu: string;
  };

export type Batch001DrywallSuccessorResourceR3 = EstimateContentResourceR3 & {
  applicability: Batch001ResourceApplicabilityR3;
  sourcePredecessorRowIds: readonly string[];
  procurementOwnerId: string | null;
  engineeringSourceIds: readonly string[];
};

export type Batch001UserParameterContractR56 = {
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
  variantApplicability: readonly DrywallCeilingBulkheadProfessionalVariantV3[];
  engineeringSourceIds: readonly string[];
};

export type Batch001ContentPassportR56 = EstimateContentPassportR3 & {
  executionContract: "MASTER_EXECUTION_TZ_R5_6_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU";
  batchId: "BATCH-001";
  domain: "interior_finishes";
  technologyFamily: "DRYWALL_CEILING_BULKHEAD";
  operation: DrywallCeilingBulkheadProfessionalGroupV3;
  variant: DrywallCeilingBulkheadProfessionalVariantV3;
  primaryMeasure: "м² поверхности и м геометрии потолочного короба";
  applicabilityRu: string;
  userParameterContracts: readonly Batch001UserParameterContractR56[];
  engineeringSources: readonly Batch001EngineeringSourceR56[];
  commercialAssumptionsRu: readonly string[];
  semanticOwners: readonly string[];
  costOwners: readonly string[];
  procurementOwners: readonly string[];
  predecessorAdjudication: readonly Batch001DrywallAdjudicationR3[];
  proofStatus: "CONTENT_RECONCILIATION_GREEN_BACKEND_REPLAY_PENDING_R56";
};

export type Batch001DrywallAdjudicationR3 = {
  predecessorRowId: string;
  predecessorCategory: string;
  predecessorTitleRu: string;
  decision:
    | "PRESERVED_PHYSICAL_RESOURCE"
    | "REPLACED_BY_MEASURABLE_CONSTRUCTION_WORK"
    | "REPLACED_BY_EXPLICIT_CARGO_DELIVERY"
    | "MOVED_TO_INTERNAL_WORK_COST_BREAKDOWN"
    | "INCLUDED_IN_CONSTRUCTION_WORK_RATE"
    | "REMOVED_NON_BOQ_OVERHEAD_QA_OR_DOCUMENT"
    | "INFORMATIONAL_ONLY_NOT_PRICED";
  successorRowIds: readonly string[];
  reasonRu: string;
};

export type Batch001DrywallSuccessorDefinitionR3 = {
  contract: typeof BATCH001_DRYWALL_SUCCESSOR_R3_CONTRACT;
  catalogId: string;
  predecessorVersion: "DrywallCeilingBulkheadProfessionalV3";
  successorVersionId: string;
  group: DrywallCeilingBulkheadProfessionalGroupV3;
  variant: DrywallCeilingBulkheadProfessionalVariantV3;
  predecessorVisibleParameterCount: number;
  technologyStepsRu: readonly string[];
  dependencyRu: readonly string[];
  userParameterGroups: readonly {
    groupId: "geometry" | "system" | "variant" | "delivery";
    titleRu: string;
    parameterIds: readonly string[];
    visibleWhen?: { parameterId: string; equals: string | number | boolean };
  }[];
  runtimeFormulas: readonly Batch001RuntimeFormulaR3[];
  resources: readonly Batch001DrywallSuccessorResourceR3[];
  passport: Batch001ContentPassportR56;
  contentDecision: EstimateContentPassportDecisionR3;
  domainDecision: Batch001DrywallDomainDecisionR3;
  shadowRealUsefulGateR1: {
    mode: "SHADOW_PREPARED_ONLY";
    productionAdmissionAttached: false;
    technologyPassportSha256: string;
    passportReviewStatus: "DRAFT";
    passportDecision: TechnologyPassportDecisionR1;
    runtimeRemediationBlockers: readonly string[];
    status: "RED";
  };
  adjudication: readonly Batch001DrywallAdjudicationR3[];
};

export type Batch001DrywallDomainDecisionR3 = {
  status: "GREEN" | "RED";
  allowed: boolean;
  errors: readonly string[];
};

export type Batch001DrywallCompiledRowR3 = {
  rowId: string;
  group: EstimateContentResourceR3["group"];
  titleRu: string;
  unitId: string;
  quantity: number;
  semanticOwnerId: string;
  costOwnerId: string;
  procurementEligible: boolean;
};

export type Batch001DrywallCompileResultR3 =
  | {
    status: "GREEN";
    catalogId: string;
    rows: readonly Batch001DrywallCompiledRowR3[];
  }
  | {
    status: "NEEDS_REQUIRED_INPUTS" | "RED";
    catalogId: string;
    blockers: readonly string[];
    rows: readonly [];
  };

function rowKey(row: ProfessionalAssemblyRowDefinitionV4): string {
  return row.row_id.split(":row:").at(-1) ?? row.row_id;
}

function variantLabel(variant: DrywallCeilingBulkheadProfessionalVariantV3): string {
  if (variant === "large_area") return "большой площади";
  if (variant === "small_area") return "малой площади";
  if (variant === "technical_room") return "в техническом помещении";
  if (variant === "wet_zone") return "во влажной зоне";
  if (variant === "high_load") return "для повышенной нагрузки";
  return "стандартного исполнения";
}

function definitionTitle(
  group: DrywallCeilingBulkheadProfessionalGroupV3,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
): string {
  const suffix = variantLabel(variant);
  if (group === "FRAME") return `Монтаж каркаса потолочного короба ${suffix}`;
  if (group === "ALIGN") return `Выравнивание каркаса потолочного короба ${suffix}`;
  return `Обшивка потолочного короба гипсокартонными листами ${suffix}`;
}

function cleanResourceTitle(row: ProfessionalAssemblyRowDefinitionV4): string {
  const key = rowKey(row);
  return (TITLE_BY_ROW_KEY[key] ?? row.title_ru)
    .replaceAll(" exact system route", " выбранной системы")
    .replaceAll(" FRAME", " каркаса")
    .replaceAll(" ALIGN", " выравнивания каркаса")
    .replaceAll(" CLAD", " обшивки")
    .replaceAll("контрольного шва", "деформационного шва")
    .replaceAll("Контрольного шва", "Деформационного шва")
    .trim();
}

function normativeSource(row: ProfessionalAssemblyRowDefinitionV4): {
  sourceKey: string;
  locator: string;
} {
  const trace = row.normative_trace_v3?.find((item) => item.source_role === "QUANTITY_NORM")
    ?? row.normative_trace_v3?.find((item) => item.source_role === "WORK_EXECUTION")
    ?? row.normative_trace_v3?.[0];
  if (!trace) throw new Error(`BATCH001_R3_NORMATIVE_TRACE_MISSING:${row.row_id}`);
  return { sourceKey: trace.source_id, locator: trace.exact_locator };
}

function clonedFormula(
  catalogId: string,
  key: string,
  source: ProfessionalAssemblyFormulaV4,
): Batch001RuntimeFormulaR3 {
  const compiled = compileFormulaGraph(source.expression);
  return {
    formulaId: `${catalogId}:successor-r3:formula:${key}`,
    outputUnitId: source.output_unit_id,
    expressionSource: source.expression,
    inputParameterIds: compiled.inputParameterIds,
    calculate: (values) => Number(evaluateFormulaGraph(compiled.ast, values)),
    sourcePredecessorFormulaId: source.formula_id,
  };
}

function syntheticFormula(input: {
  catalogId: string;
  key: string;
  outputUnitId: string;
  expressionSource: string;
  inputParameterIds: readonly string[];
  calculate: ProfessionalAssemblyFormulaV4["calculate"];
  sourcePredecessorFormulaId?: string | null;
}): Batch001RuntimeFormulaR3 {
  const compiled = compileFormulaGraph(input.expressionSource);
  return {
    formulaId: `${input.catalogId}:successor-r3:formula:${input.key}`,
    outputUnitId: input.outputUnitId,
    expressionSource: input.expressionSource,
    inputParameterIds: compiled.inputParameterIds,
    calculate: (values) => Number(evaluateFormulaGraph(compiled.ast, values)),
    sourcePredecessorFormulaId: input.sourcePredecessorFormulaId ?? null,
  };
}

function resourceEngineeringSourceIds(catalogId: string, normativeSourceId: string): readonly string[] {
  const identity = groupAndVariant(catalogId);
  if (!identity) throw new Error(`BATCH001_R56_RESOURCE_IDENTITY_UNRESOLVED:${catalogId}`);
  return batch001EngineeringSourceIdsR56({ ...identity, normativeSourceId });
}

function resourceFromSource(
  catalogId: string,
  row: ProfessionalAssemblyRowDefinitionV4,
  formula: Batch001RuntimeFormulaR3,
): Batch001DrywallSuccessorResourceR3 {
  const key = rowKey(row);
  const rowId = `${catalogId}:successor-r3:material:${key}`;
  const source = normativeSource(row);
  return {
    rowId,
    group: "material",
    titleRu: cleanResourceTitle(row),
    unitId: formula.outputUnitId,
    formulaId: formula.formulaId,
    semanticOwnerId: `${catalogId}:successor-r3:semantic:material:${key}`,
    costOwnerId: `${catalogId}:successor-r3:cost:material:${key}`,
    resourceIdentity: `${catalogId}:material:${key}`,
    provenanceKind: "CANONICAL_PHYSICAL_RESOURCE",
    generationAxes: [],
    costingMode: "OWN_COST",
    procurementEligible: true,
    procurementOwnerId: `${catalogId}:successor-r56:procurement:material:${key}`,
    normativeSource: source,
    engineeringSourceIds: resourceEngineeringSourceIds(catalogId, source.sourceKey),
    applicability: {
      kind: "FORMULA_POSITIVE",
      reasonRu: "Материал выводится только при положительном физическом количестве по формуле выбранной системы.",
    },
    sourcePredecessorRowIds: [row.row_id],
  };
}

function workResource(input: {
  catalogId: string;
  key: string;
  titleRu: string;
  formula: Batch001RuntimeFormulaR3;
  sourceRows: readonly ProfessionalAssemblyRowDefinitionV4[];
}): Batch001DrywallSuccessorResourceR3 {
  const rowId = `${input.catalogId}:successor-r3:work:${input.key}`;
  const normativeRow = input.sourceRows[0];
  if (!normativeRow) throw new Error(`BATCH001_R3_WORK_SOURCE_MISSING:${input.catalogId}:${input.key}`);
  const source = normativeSource(normativeRow);
  return {
    rowId,
    group: "construction_work",
    titleRu: input.titleRu,
    unitId: input.formula.outputUnitId,
    formulaId: input.formula.formulaId,
    semanticOwnerId: `${input.catalogId}:successor-r3:semantic:work:${input.key}`,
    costOwnerId: `${input.catalogId}:successor-r3:cost:work:${input.key}`,
    resourceIdentity: `${input.catalogId}:construction-work:${input.key}`,
    provenanceKind: "EXPLICIT_CONSTRUCTION_OPERATION",
    generationAxes: [],
    costingMode: "OWN_COST",
    procurementEligible: false,
    procurementOwnerId: null,
    normativeSource: source,
    engineeringSourceIds: resourceEngineeringSourceIds(input.catalogId, source.sourceKey),
    applicability: {
      kind: "FORMULA_POSITIVE",
      reasonRu: "Операция выводится при положительном измеряемом объёме физической работы.",
    },
    sourcePredecessorRowIds: input.sourceRows.map((row) => row.row_id),
  };
}

function deliveryResources(input: {
  catalogId: string;
  group: DrywallCeilingBulkheadProfessionalGroupV3;
  sourceRow: ProfessionalAssemblyRowDefinitionV4;
  deliveryFormula: Batch001RuntimeFormulaR3;
  cargoFormula: Batch001RuntimeFormulaR3;
}): Batch001DrywallSuccessorResourceR3 {
  const isFrame = input.group === "FRAME";
  const key = isFrame ? "steel_frame_materials" : "drywall_and_finishing_materials";
  const cargoRu = isFrame
    ? "стальные профили, подвесы и крепёж потолочного каркаса"
    : "гипсокартонные листы, шпаклёвочные смеси, ленты и крепёж";
  const vehicleRu = isFrame
    ? "бортовой грузовой автомобиль"
    : "бортовой грузовой автомобиль с защитой груза от влаги";
  const titleRu = isFrame
    ? "Доставка стальных профилей, подвесов и крепежа бортовым автомобилем"
    : "Доставка гипсокартонных листов и отделочных материалов бортовым автомобилем";
  const rowId = `${input.catalogId}:successor-r3:delivery:${key}`;
  const source = normativeSource(input.sourceRow);
  return {
    rowId,
    group: "delivery",
    titleRu,
    unitId: input.deliveryFormula.outputUnitId,
    formulaId: input.deliveryFormula.formulaId,
    semanticOwnerId: `${input.catalogId}:successor-r3:semantic:delivery:${key}`,
    costOwnerId: `${input.catalogId}:successor-r3:cost:delivery:${key}`,
    resourceIdentity: `${input.catalogId}:delivery:${key}`,
    provenanceKind: "EXPLICIT_CARGO_DELIVERY",
    generationAxes: [],
    costingMode: "OWN_COST",
    procurementEligible: true,
    procurementOwnerId: `${input.catalogId}:successor-r56:procurement:delivery:${key}`,
    normativeSource: source,
    engineeringSourceIds: resourceEngineeringSourceIds(input.catalogId, source.sourceKey),
    delivery: {
      cargoRu,
      vehicleRu,
      physicalQuantityFormulaId: input.cargoFormula.formulaId,
      distanceParameterId: "delivery_distance_km",
    },
    applicability: {
      kind: "DELIVERY_NOT_INCLUDED_BY_SUPPLIER",
      parameterId: "delivery_included_by_supplier",
      reasonRu: "Отдельная перевозка создаётся только когда она не включена в цену материалов.",
    },
    sourcePredecessorRowIds: [input.sourceRow.row_id],
  };
}

function physicalScope(group: DrywallCeilingBulkheadProfessionalGroupV3): {
  physicalResultRu: string;
  includedScopeRu: readonly string[];
  excludedScopeRu: readonly string[];
  technologyStepsRu: readonly string[];
  dependencyRu: readonly string[];
} {
  if (group === "FRAME") {
    return {
      physicalResultRu: "Смонтированный металлический каркас потолочного короба заданной геометрии",
      includedScopeRu: [
        "направляющие, несущие профили, подвесы, соединители и крепёж выбранной системы",
        "раскрой и монтаж металлического каркаса по проектной геометрии",
      ],
      excludedScopeRu: [
        "обшивка листами, обработка стыков и финишная отделка поверхности",
        "испытания, журналы, акты, согласования и проектирование",
      ],
      technologyStepsRu: [
        "Разметить проектное положение каркаса.",
        "Закрепить направляющие, подвесы и несущие профили.",
        "Собрать углы, торцы, переходы и предусмотренные проектом усиления.",
      ],
      dependencyRu: ["Тип профиля, подвесов и крепежа должен принадлежать одной совместимой системе."],
    };
  }
  if (group === "ALIGN") {
    return {
      physicalResultRu: "Выровненный существующий каркас потолочного короба, готовый к обшивке",
      includedScopeRu: ["регулировка положения существующего каркаса в проектную плоскость"],
      excludedScopeRu: [
        "повторная поставка и монтаж полного каркаса",
        "исполнительная съёмка, протоколы, акты и контрольные документы как коммерческие строки",
      ],
      technologyStepsRu: [
        "Определить проектную плоскость существующего каркаса.",
        "Отрегулировать подвесы и соединения без повторного устройства каркаса.",
      ],
      dependencyRu: ["Требуется принятая ревизия ранее смонтированного каркаса."],
    };
  }
  return {
    physicalResultRu: "Потолочный короб, обшитый гипсокартонными листами и подготовленный под отделку",
    includedScopeRu: [
      "раскрой и крепление листов выбранного типа и числа слоёв",
      "заделка стыков, углов и мест крепления совместимыми составами",
      "подготовка поверхности до заданного уровня качества",
    ],
    excludedScopeRu: [
      "поставка и монтаж металлического каркаса",
      "испытания, журналы, акты, согласования и проектирование",
    ],
    technologyStepsRu: [
      "Раскроить и закрепить листы на принятом каркасе.",
      "Обработать стыки, углы, кромки и места крепления.",
      "Подготовить поверхность до выбранного уровня отделки.",
    ],
    dependencyRu: ["Требуется принятая ревизия совместимого и выровненного каркаса."],
  };
}

function variantUserParameterIds(
  group: DrywallCeilingBulkheadProfessionalGroupV3,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
): readonly string[] {
  if (group === "FRAME") {
    if (variant === "large_area") return ["large_area_control_joint_length_m"];
    if (variant === "small_area") return ["small_area_self_supporting_profile_length_m", "small_area_self_supporting_stud_length_m"];
    if (variant === "technical_room") return ["technical_service_opening_count"];
    if (variant === "wet_zone") return ["wet_zone_corrosion_fastener_count"];
  }
  if (group === "ALIGN") {
    if (variant === "large_area") return ["large_area_instrument_zone_count"];
    if (variant === "small_area") return ["small_area_corner_count"];
    if (variant === "technical_room") return ["technical_obstruction_count"];
    if (variant === "wet_zone") return ["wet_zone_adjustment_point_count"];
  }
  if (group === "CLAD") {
    if (variant === "high_load") return ["design_load_kn_m2"];
    if (variant === "large_area") return ["large_area_clad_control_joint_length_m"];
    if (variant === "small_area") return ["small_area_cut_edge_length_m"];
    if (variant === "technical_room") return ["technical_service_opening_count", "technical_opening_perimeter_m_item"];
    if (variant === "wet_zone") return ["wet_zone_penetration_count", "wet_zone_cuff_count"];
  }
  return [];
}

function userParameterIds(
  group: DrywallCeilingBulkheadProfessionalGroupV3,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
): Set<string> {
  const ids = new Set<string>(GEOMETRY_USER_PARAMETERS);
  if (group === "FRAME") {
    ids.add("perimeter_length_m");
    ids.add("exact_system_route");
  }
  if (group === "CLAD") {
    ids.add("board_layer_count");
    ids.add("board_type");
    ids.add("surface_quality_level");
  }
  if (group !== "ALIGN") {
    ids.add("delivery_included_by_supplier");
    ids.add("delivery_distance_km");
  }
  for (const parameterId of variantUserParameterIds(group, variant)) ids.add(parameterId);
  return ids;
}

function userParameterGroups(
  group: DrywallCeilingBulkheadProfessionalGroupV3,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
  presentIds: ReadonlySet<string>,
): Batch001DrywallSuccessorDefinitionR3["userParameterGroups"] {
  const groups: Batch001DrywallSuccessorDefinitionR3["userParameterGroups"][number][] = [
    {
      groupId: "geometry",
      titleRu: "Геометрия короба",
      parameterIds: GEOMETRY_USER_PARAMETERS.filter((id) => presentIds.has(id)),
    },
  ];
  const systemIds = (group === "FRAME"
    ? ["perimeter_length_m", "exact_system_route"]
    : group === "CLAD"
      ? ["board_layer_count", "board_type", "surface_quality_level"]
      : []).filter((id) => presentIds.has(id));
  if (systemIds.length > 0) groups.push({ groupId: "system", titleRu: "Система и состав", parameterIds: systemIds });
  const variantIds = variantUserParameterIds(group, variant).filter((id) => presentIds.has(id));
  if (variantIds.length > 0) {
    groups.push({ groupId: "variant", titleRu: `Особенности варианта «${variantLabel(variant)}»`, parameterIds: variantIds });
  }
  if (group !== "ALIGN") {
    groups.push(
      {
        groupId: "delivery",
        titleRu: "Доставка",
        parameterIds: ["delivery_included_by_supplier"],
      },
      {
        groupId: "delivery",
        titleRu: "Маршрут отдельной доставки",
        parameterIds: ["delivery_distance_km"],
        visibleWhen: { parameterId: "delivery_included_by_supplier", equals: false },
      },
    );
  }
  return groups.filter((entry) => entry.parameterIds.length > 0);
}

function buildAdjudication(input: {
  predecessorRows: readonly ProfessionalAssemblyRowDefinitionV4[];
  resources: readonly Batch001DrywallSuccessorResourceR3[];
  group: DrywallCeilingBulkheadProfessionalGroupV3;
}): Batch001DrywallAdjudicationR3[] {
  const successorBySource = new Map<string, string[]>();
  for (const resource of input.resources) {
    for (const sourceRowId of resource.sourcePredecessorRowIds) {
      const rows = successorBySource.get(sourceRowId) ?? [];
      rows.push(resource.rowId);
      successorBySource.set(sourceRowId, rows);
    }
  }
  const deliveryKey = input.group === "FRAME" ? "frame_transport" : "clad_transport";
  return input.predecessorRows.map((row) => {
    const key = rowKey(row);
    const successorRowIds = successorBySource.get(row.row_id) ?? [];
    if (row.category === "material" && successorRowIds.length > 0) {
      return {
        predecessorRowId: row.row_id,
        predecessorCategory: row.category,
        predecessorTitleRu: row.title_ru,
        decision: "PRESERVED_PHYSICAL_RESOURCE" as const,
        successorRowIds,
        reasonRu: "Конкретный физический материал и его формула сохранены в successor.",
      };
    }
    if (key.endsWith("_geometry_output") && successorRowIds.length > 0) {
      return {
        predecessorRowId: row.row_id,
        predecessorCategory: row.category,
        predecessorTitleRu: row.title_ru,
        decision: "REPLACED_BY_MEASURABLE_CONSTRUCTION_WORK" as const,
        successorRowIds,
        reasonRu: "Информационная геометрия стала измерителем конкретной строительной операции.",
      };
    }
    if (key === deliveryKey && successorRowIds.length > 0) {
      return {
        predecessorRowId: row.row_id,
        predecessorCategory: row.category,
        predecessorTitleRu: row.title_ru,
        decision: "REPLACED_BY_EXPLICIT_CARGO_DELIVERY" as const,
        successorRowIds,
        reasonRu: "Универсальная логистика заменена конкретным грузом, транспортом и расстоянием.",
      };
    }
    if (row.category === "labor") {
      return {
        predecessorRowId: row.row_id,
        predecessorCategory: row.category,
        predecessorTitleRu: row.title_ru,
        decision: "MOVED_TO_INTERNAL_WORK_COST_BREAKDOWN" as const,
        successorRowIds,
        reasonRu: "Человеко-часы остаются внутренней калькуляцией цены физической работы и не сериализуются в BOQ.",
      };
    }
    if (row.category === "equipment" || row.category === "material") {
      return {
        predecessorRowId: row.row_id,
        predecessorCategory: row.category,
        predecessorTitleRu: row.title_ru,
        decision: "INCLUDED_IN_CONSTRUCTION_WORK_RATE" as const,
        successorRowIds,
        reasonRu: "Мелкий инструмент или непостоянный расходный ресурс не имеет отдельного подтверждённого закупочного scope.",
      };
    }
    if (row.cost_ownership === "informational_output") {
      return {
        predecessorRowId: row.row_id,
        predecessorCategory: row.category,
        predecessorTitleRu: row.title_ru,
        decision: "INFORMATIONAL_ONLY_NOT_PRICED" as const,
        successorRowIds,
        reasonRu: "Расчётный показатель хранится в trace, но не является оплачиваемой строкой сметы.",
      };
    }
    return {
      predecessorRowId: row.row_id,
      predecessorCategory: row.category,
      predecessorTitleRu: row.title_ru,
      decision: "REMOVED_NON_BOQ_OVERHEAD_QA_OR_DOCUMENT" as const,
      successorRowIds,
      reasonRu: "Контроль, документы, временные действия, безразмерные услуги и общая логистика не являются пользовательским BOQ.",
    };
  });
}

const CROSS_DOMAIN_RESOURCE_TITLE = /(?:бетон|железобетон|асфальт|кабел|электрощит|трубопровод|канализац|радиатор|воздуховод|кирпич|каменная кладка|кирпичная кладка|кровл)/iu;

function requiredMaterialKeys(
  group: DrywallCeilingBulkheadProfessionalGroupV3,
  variant: DrywallCeilingBulkheadProfessionalVariantV3,
): readonly string[] {
  if (group === "ALIGN") return variant === "wet_zone" ? ["wet_zone_adjustment_consumables"] : [];
  if (group === "FRAME") {
    const keys = [
      "perimeter_profiles",
      "profile_connection_screws",
      "corner_connectors",
      "anchors",
      "separation_tape",
      "sealing_tape",
    ];
    if (variant !== "small_area") {
      keys.push("primary_profiles", "cross_profiles", "suspensions", "suspension_rods", "suspension_anchors");
    }
    if (variant === "standard" || variant === "technical_room" || variant === "wet_zone") keys.push("profile_connectors");
    if (variant === "large_area") keys.push("large_area_control_joint_profile", "large_area_two_level_connectors");
    if (variant === "small_area") keys.push("small_area_self_supporting_guide_profiles", "small_area_self_supporting_stud_profiles");
    if (variant === "technical_room") keys.push("technical_opening_profiles", "technical_opening_reinforcement_fasteners");
    if (variant === "wet_zone") keys.push("wet_zone_corrosion_protection", "wet_zone_corrosion_fasteners");
    return keys;
  }
  const keys = [
    "gypsum_board_sheets",
    "sheet_screws",
    "cut_edge_primer",
    "joint_reinforcement_tape",
    "joint_compound",
    "fastener_recess_compound",
    "finish_putty",
    "surface_primer",
    "external_corner_profile",
    "internal_corner_tape",
  ];
  if (variant === "large_area") keys.push("large_area_clad_control_joint");
  if (variant === "small_area") keys.push("small_area_edge_screws");
  if (variant === "technical_room") keys.push("technical_opening_screws", "technical_fire_acoustic_sealant");
  if (variant === "wet_zone") {
    keys.push(
      "wet_zone_penetration_sealant",
      "wet_zone_waterproof_primer",
      "wet_zone_waterproofing",
      "wet_zone_waterproof_tape",
      "wet_zone_penetration_cuffs",
    );
  }
  return keys;
}

function groupAndVariant(catalogId: string): {
  group: DrywallCeilingBulkheadProfessionalGroupV3;
  variant: DrywallCeilingBulkheadProfessionalVariantV3;
} | null {
  const group = catalogId.includes("_frame_") ? "FRAME"
    : catalogId.includes("_align_") ? "ALIGN"
      : catalogId.includes("_clad_") ? "CLAD"
        : null;
  const variant = (["technical_room", "large_area", "small_area", "wet_zone", "high_load", "standard"] as const)
    .find((candidate) => catalogId.endsWith(`_${candidate}`)) ?? null;
  return group && variant ? { group, variant } : null;
}

const ALL_BATCH001_VARIANTS: readonly DrywallCeilingBulkheadProfessionalVariantV3[] = [
  "standard", "large_area", "small_area", "technical_room", "wet_zone", "high_load",
];

function buildUserParameterContractsR56(input: {
  parameters: Batch001ContentPassportR56["parameters"];
  schemaById: ReadonlyMap<string, ProfessionalDomainParameterDefinitionV1>;
  variant: DrywallCeilingBulkheadProfessionalVariantV3;
  group: DrywallCeilingBulkheadProfessionalGroupV3;
  engineeringSourceIds: readonly string[];
}): readonly Batch001UserParameterContractR56[] {
  const variantIds = new Set(variantUserParameterIds(input.group, input.variant));
  return input.parameters
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .map((parameter) => {
      const schema = input.schemaById.get(parameter.parameterId);
      const deliveryBoolean = parameter.parameterId === "delivery_included_by_supplier";
      const inputType = deliveryBoolean ? "boolean" : schema?.input_type;
      if (!inputType) throw new Error(`BATCH001_R56_PARAMETER_SCHEMA_MISSING:${parameter.parameterId}`);
      let range: Batch001UserParameterContractR56["range"];
      let contractInputType: Batch001UserParameterContractR56["inputType"];
      if (inputType === "number") {
        if (schema?.minimum == null || schema.maximum == null) {
          throw new Error(`BATCH001_R56_NUMERIC_RANGE_MISSING:${parameter.parameterId}`);
        }
        range = { kind: "NUMERIC", minimum: schema.minimum, maximum: schema.maximum };
        contractInputType = "NUMBER";
      } else if (inputType === "boolean") {
        range = { kind: "BOOLEAN", choices: [false, true] };
        contractInputType = "BOOLEAN";
      } else {
        range = { kind: "TEXT", minimumLength: 1, maximumLength: 500 };
        contractInputType = "TEXT";
      }
      return {
        parameterId: parameter.parameterId,
        titleRu: parameter.titleRu,
        guideRu: parameter.guideRu,
        inputType: contractInputType,
        unitId: schema?.unit_id ?? null,
        range,
        defaultValue: deliveryBoolean ? false : null,
        defaultSource: deliveryBoolean
          ? "COMMERCIAL_ASSUMPTION_R56: перевозка показана отдельно до подтверждения включения поставщиком"
          : "NO_DEFAULT_R56: обязательный явный ввод из проекта, обмера, дефектной ведомости или паспорта выбранной системы",
        formulaConsumerIds: parameter.formulaConsumerIds,
        resourceConsumerIds: parameter.resourceConsumerIds,
        variantApplicability: variantIds.has(parameter.parameterId) ? [input.variant] : ALL_BATCH001_VARIANTS,
        engineeringSourceIds: input.engineeringSourceIds,
      };
    });
}

export function evaluateBatch001DrywallContentPassportR3(
  passport: Batch001ContentPassportR56,
): Batch001DrywallDomainDecisionR3 {
  const errors = [...evaluateEstimateContentPassportR3(passport).errors];
  const identity = groupAndVariant(passport.catalogId);
  if (!(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as readonly string[]).includes(passport.catalogId)) {
    errors.push("DRYWALL_CATALOG_OUTSIDE_BATCH001");
  }
  if (!identity) errors.push("DRYWALL_GROUP_OR_VARIANT_UNRESOLVED");
  if (passport.resources.some((row) => CROSS_DOMAIN_RESOURCE_TITLE.test(row.titleRu))) {
    errors.push("DRYWALL_CROSS_DOMAIN_RESOURCE");
  }
  if (passport.resources.some((row) => !row.resourceIdentity.startsWith(`${passport.catalogId}:`))) {
    errors.push("DRYWALL_FOREIGN_RESOURCE_IDENTITY");
  }
  if (passport.executionContract !== "MASTER_EXECUTION_TZ_R5_6_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU") {
    errors.push("DRYWALL_BATCH001_R56_CONTRACT_MISSING");
  }
  if (passport.engineeringSources.length === 0) errors.push("DRYWALL_BATCH001_ENGINEERING_SOURCES_MISSING");
  const declaredSourceIds = new Set(passport.engineeringSources.map((source) => source.sourceId));
  for (const resource of passport.resources as readonly Batch001DrywallSuccessorResourceR3[]) {
    if (resource.engineeringSourceIds.length === 0
      || resource.engineeringSourceIds.some((sourceId) => !declaredSourceIds.has(sourceId))) {
      errors.push(`DRYWALL_BATCH001_RESOURCE_SOURCE_BINDING_INVALID:${resource.rowId}`);
    }
    if (resource.procurementEligible !== Boolean(resource.procurementOwnerId)) {
      errors.push(`DRYWALL_BATCH001_PROCUREMENT_OWNER_INVALID:${resource.rowId}`);
    }
  }
  const visibleParameters = passport.parameters.filter((parameter) => parameter.visibilityRole === "USER_INPUT");
  const contractsById = new Map(passport.userParameterContracts.map((contract) => [contract.parameterId, contract]));
  for (const parameter of visibleParameters) {
    const contract = contractsById.get(parameter.parameterId);
    if (!contract) errors.push(`DRYWALL_BATCH001_PARAMETER_R56_CONTRACT_MISSING:${parameter.parameterId}`);
    else if (contract.formulaConsumerIds.length + contract.resourceConsumerIds.length === 0) {
      errors.push(`DRYWALL_BATCH001_PARAMETER_R56_DEAD:${parameter.parameterId}`);
    }
  }
  if (contractsById.size !== visibleParameters.length) errors.push("DRYWALL_BATCH001_PARAMETER_R56_CONTRACT_COUNT_DRIFT");
  const procurementOwners = passport.procurementOwners;
  if (new Set(procurementOwners).size !== procurementOwners.length) errors.push("DRYWALL_BATCH001_DUPLICATE_PROCUREMENT_OWNER");
  const adjudicatedIds = passport.predecessorAdjudication.map((row) => row.predecessorRowId);
  if (new Set(adjudicatedIds).size !== adjudicatedIds.length) errors.push("DRYWALL_BATCH001_DUPLICATE_PREDECESSOR_ADJUDICATION");
  if (identity) {
    const materialIdentities = new Set(passport.resources
      .filter((row) => row.group === "material")
      .map((row) => row.resourceIdentity.split(":").at(-1)));
    for (const key of requiredMaterialKeys(identity.group, identity.variant)) {
      if (!materialIdentities.has(key)) errors.push(`DRYWALL_REQUIRED_MATERIAL_MISSING:${key}`);
    }
    const workCount = passport.resources.filter((row) => row.group === "construction_work").length;
    const expectedWorkCount = identity.group === "FRAME" ? 1
      : identity.group === "ALIGN" ? (["small_area", "technical_room"].includes(identity.variant) ? 2 : 1)
        : (["technical_room", "wet_zone"].includes(identity.variant) ? 4 : 3);
    if (workCount !== expectedWorkCount) errors.push(`DRYWALL_WORK_SEQUENCE_COUNT:${workCount}:${expectedWorkCount}`);
    const deliveryCount = passport.resources.filter((row) => row.group === "delivery").length;
    const expectedDeliveryCount = identity.group === "ALIGN" ? 0 : 1;
    if (deliveryCount !== expectedDeliveryCount) errors.push(`DRYWALL_DELIVERY_FLOW_COUNT:${deliveryCount}:${expectedDeliveryCount}`);
    if (passport.resources.some((row) => row.group === "machine_equipment")) {
      errors.push("DRYWALL_UNSCOPED_SEPARATE_EQUIPMENT");
    }
    const parameterIds = new Set(passport.parameters
      .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
      .map((parameter) => parameter.parameterId));
    for (const parameterId of variantUserParameterIds(identity.group, identity.variant)) {
      if (!parameterIds.has(parameterId)) errors.push(`DRYWALL_VARIANT_PARAMETER_MISSING:${parameterId}`);
    }
  }
  const uniqueErrors = [...new Set(errors)].sort();
  return { status: uniqueErrors.length === 0 ? "GREEN" : "RED", allowed: uniqueErrors.length === 0, errors: uniqueErrors };
}

function buildDefinition(catalogId: string): Batch001DrywallSuccessorDefinitionR3 {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId);
  if (!inventory) throw new Error(`BATCH001_R3_INVENTORY_MISSING:${catalogId}`);
  const parts = buildDrywallCeilingBulkheadProfessionalPackagePartsV3(inventory);
  if (!parts) throw new Error(`BATCH001_R3_PREDECESSOR_PARTS_MISSING:${catalogId}`);
  const predecessorRows = parts.child_assemblies.flatMap((assembly) => assembly.rows);
  const byKey = new Map(predecessorRows.map((row) => [rowKey(row), row]));
  const requiredRow = (key: string): ProfessionalAssemblyRowDefinitionV4 => {
    const found = byKey.get(key);
    if (!found) throw new Error(`BATCH001_R3_PREDECESSOR_ROW_MISSING:${catalogId}:${key}`);
    return found;
  };
  const runtimeFormulas: Batch001RuntimeFormulaR3[] = [];
  const resources: Batch001DrywallSuccessorResourceR3[] = [];
  const selectedMaterialKeys = parts.contract.group === "FRAME"
    ? FRAME_MATERIAL_KEYS
    : parts.contract.group === "CLAD"
      ? CLAD_MATERIAL_KEYS
      : ALIGN_MATERIAL_KEYS;
  for (const row of predecessorRows) {
    const key = rowKey(row);
    if (row.category !== "material" || !selectedMaterialKeys.has(key)) continue;
    const formula = clonedFormula(catalogId, `material:${key}`, row.formula);
    runtimeFormulas.push(formula);
    resources.push(resourceFromSource(catalogId, row, formula));
  }

  const groupPrefix = parts.contract.group.toLowerCase();
  const geometryRow = requiredRow(`${groupPrefix}_geometry_output`);
  const geometryFormula = clonedFormula(catalogId, "work-area", geometryRow.formula);
  runtimeFormulas.push(geometryFormula);
  if (parts.contract.group === "FRAME") {
    const internalRows = predecessorRows.filter((row) => row.category === "labor" && !rowKey(row).startsWith("frame_"));
    resources.push(workResource({
      catalogId,
      key: "install_metal_frame",
      titleRu: "Монтаж металлического каркаса потолочного короба",
      formula: geometryFormula,
      sourceRows: [geometryRow, ...internalRows],
    }));
  } else if (parts.contract.group === "ALIGN") {
    const separatelyMeasured = new Set(["small_area_corner_alignment", "technical_clearance_alignment"]);
    const internalRows = predecessorRows.filter((row) => row.category === "labor"
      && !rowKey(row).startsWith("align_")
      && !separatelyMeasured.has(rowKey(row)));
    resources.push(workResource({
      catalogId,
      key: "align_existing_frame",
      titleRu: `Выравнивание существующего каркаса потолочного короба ${variantLabel(parts.contract.variant)}`,
      formula: geometryFormula,
      sourceRows: [geometryRow, ...internalRows],
    }));
    if (parts.contract.variant === "small_area") {
      const source = requiredRow("small_area_corner_alignment");
      const formula = syntheticFormula({
        catalogId,
        key: "align-small-area-corners",
        outputUnitId: "item",
        expressionSource: "small_area_corner_count",
        inputParameterIds: ["small_area_corner_count"],
        calculate: (values) => values.small_area_corner_count,
        sourcePredecessorFormulaId: source.formula.formula_id,
      });
      runtimeFormulas.push(formula);
      resources.push(workResource({
        catalogId,
        key: "align_small_area_corners",
        titleRu: "Выравнивание коротких граней и углов потолочного короба",
        formula,
        sourceRows: [source],
      }));
    }
    if (parts.contract.variant === "technical_room") {
      const source = requiredRow("technical_clearance_alignment");
      const formula = syntheticFormula({
        catalogId,
        key: "align-technical-openings",
        outputUnitId: "item",
        expressionSource: "technical_obstruction_count",
        inputParameterIds: ["technical_obstruction_count"],
        calculate: (values) => values.technical_obstruction_count,
        sourcePredecessorFormulaId: source.formula.formula_id,
      });
      runtimeFormulas.push(formula);
      resources.push(workResource({
        catalogId,
        key: "align_technical_openings",
        titleRu: "Выравнивание каркаса у инженерных проходов",
        formula,
        sourceRows: [source],
      }));
    }
  } else {
    const laborRows = predecessorRows.filter((row) => row.category === "labor" && !rowKey(row).startsWith("clad_"));
    const labor = (...keys: string[]) => laborRows.filter((row) => keys.includes(rowKey(row)));
    resources.push(
      workResource({
        catalogId,
        key: "cut_and_fix_boards",
        titleRu: "Раскрой и монтаж гипсокартонных листов на каркас",
        formula: geometryFormula,
        sourceRows: [geometryRow, ...labor("sheet_layout_labor", "sheet_cutting_labor", "cut_edge_treatment_labor", "sheet_fixing_labor")],
      }),
      workResource({
        catalogId,
        key: "finish_joints_and_corners",
        titleRu: "Заделка стыков, углов и мест крепления гипсокартонных листов",
        formula: geometryFormula,
        sourceRows: [geometryRow, ...labor("joint_treatment_labor", "corner_treatment_labor")],
      }),
      workResource({
        catalogId,
        key: "prepare_surface",
        titleRu: "Шпаклевание, шлифование и грунтование поверхности обшивки",
        formula: geometryFormula,
        sourceRows: [geometryRow, ...labor("surface_putty_labor", "surface_sanding_labor", "surface_priming_labor")],
      }),
    );
    if (parts.contract.variant === "technical_room") {
      const source = requiredRow("technical_penetration_sealing_labor");
      const formula = syntheticFormula({
        catalogId,
        key: "seal-service-openings",
        outputUnitId: "item",
        expressionSource: "technical_service_opening_count",
        inputParameterIds: ["technical_service_opening_count"],
        calculate: (values) => values.technical_service_opening_count,
        sourcePredecessorFormulaId: source.formula.formula_id,
      });
      runtimeFormulas.push(formula);
      resources.push(workResource({
        catalogId,
        key: "seal_service_openings",
        titleRu: "Герметизация инженерных проходов в гипсокартонной обшивке",
        formula,
        sourceRows: [source],
      }));
    }
    if (parts.contract.variant === "wet_zone") {
      const source = requiredRow("wet_zone_waterproofing_labor");
      const formula = clonedFormula(catalogId, "install-waterproofing", geometryRow.formula);
      runtimeFormulas.push(formula);
      resources.push(workResource({
        catalogId,
        key: "install_waterproofing",
        titleRu: "Устройство гидроизоляции по гипсокартонной обшивке влажной зоны",
        formula,
        sourceRows: [source],
      }));
    }
  }

  if (parts.contract.group !== "ALIGN") {
    const deliveryRow = requiredRow(parts.contract.group === "FRAME" ? "frame_transport" : "clad_transport");
    const deliveryFormula = clonedFormula(catalogId, "delivery", deliveryRow.formula);
    const cargoFormula = syntheticFormula({
      catalogId,
      key: "cargo-mass",
      outputUnitId: "t",
      expressionSource: `(${deliveryRow.formula.expression}) ÷ delivery_distance_km`,
      // syntheticFormula derives the authoritative inputs and evaluator from
      // this exact expression, so the local proof and persisted AST cannot
      // diverge even when a predecessor carried unused declared parameters.
      inputParameterIds: deliveryRow.formula.input_parameter_ids,
      calculate: (values) => deliveryRow.formula.calculate({ ...values, delivery_distance_km: 1 }),
      sourcePredecessorFormulaId: deliveryRow.formula.formula_id,
    });
    runtimeFormulas.push(deliveryFormula, cargoFormula);
    resources.push(deliveryResources({
      catalogId,
      group: parts.contract.group,
      sourceRow: deliveryRow,
      deliveryFormula,
      cargoFormula,
    }));
  }

  const userIds = userParameterIds(parts.contract.group, parts.contract.variant);
  const formulaConsumers = new Map<string, string[]>();
  for (const formula of runtimeFormulas) {
    for (const parameterId of formula.inputParameterIds) {
      const consumers = formulaConsumers.get(parameterId) ?? [];
      consumers.push(formula.formulaId);
      formulaConsumers.set(parameterId, consumers);
    }
  }
  const groupExtraParameterIds = parts.contract.group === "FRAME"
    ? ["exact_system_route", "delivery_included_by_supplier"]
    : parts.contract.group === "CLAD"
      ? ["board_type", "surface_quality_level", "delivery_included_by_supplier"]
      : [];
  const extraParameterIds = [...groupExtraParameterIds, ...variantUserParameterIds(parts.contract.group, parts.contract.variant)];
  const parameterIds = new Set([...formulaConsumers.keys(), ...extraParameterIds]);
  const schemaById = new Map(parts.schema.parameters.map((parameter) => [parameter.parameter_id, parameter]));
  const resourceConsumers = new Map<string, string[]>();
  for (const resource of resources) {
    const formula = runtimeFormulas.find((candidate) => candidate.formulaId === resource.formulaId);
    for (const parameterId of formula?.inputParameterIds ?? []) {
      const consumers = resourceConsumers.get(parameterId) ?? [];
      consumers.push(resource.rowId);
      resourceConsumers.set(parameterId, consumers);
    }
  }
  const materialResourceIds = resources.filter((row) => row.group === "material").map((row) => row.rowId);
  if (parts.contract.group === "FRAME") resourceConsumers.set("exact_system_route", materialResourceIds);
  if (parts.contract.group === "CLAD") {
    const board = resources.filter((row) => row.resourceIdentity.endsWith(":gypsum_board_sheets")).map((row) => row.rowId);
    resourceConsumers.set("board_type", board);
    resourceConsumers.set("surface_quality_level", resources
      .filter((row) => row.rowId.includes("finish_putty") || row.rowId.includes("prepare_surface"))
      .map((row) => row.rowId));
  }
  const deliveryIds = resources.filter((row) => row.group === "delivery").map((row) => row.rowId);
  if (deliveryIds.length > 0) resourceConsumers.set("delivery_included_by_supplier", deliveryIds);
  const workResourceIds = resources.filter((row) => row.group === "construction_work").map((row) => row.rowId);
  for (const parameterId of variantUserParameterIds(parts.contract.group, parts.contract.variant)) {
    if ((resourceConsumers.get(parameterId) ?? []).length === 0) resourceConsumers.set(parameterId, workResourceIds);
  }

  const parameters = [...parameterIds]
    .sort((left, right) => Number(userIds.has(right)) - Number(userIds.has(left)) || left.localeCompare(right))
    .map((parameterId) => {
      const schema = schemaById.get(parameterId);
      if (!schema && parameterId !== "delivery_included_by_supplier") {
        throw new Error(`BATCH001_R3_PARAMETER_SOURCE_MISSING:${catalogId}:${parameterId}`);
      }
      return {
        parameterId,
        titleRu: parameterId === "delivery_included_by_supplier"
          ? "Доставка включена в цену поставщика"
          : schema!.label_ru,
        guideRu: PARAMETER_GUIDES_RU[parameterId]
          ?? "Внутреннее значение берётся из утверждённого проекта, нормы или паспорта выбранной системы.",
        visibilityRole: userIds.has(parameterId) ? "USER_INPUT" as const : "INTERNAL_ONLY" as const,
        formulaConsumerIds: [...new Set(formulaConsumers.get(parameterId) ?? [])].sort(),
        resourceConsumerIds: [...new Set(resourceConsumers.get(parameterId) ?? [])].sort(),
      };
    });
  const scope = physicalScope(parts.contract.group);
  const groupCounts = (group: EstimateContentResourceR3["group"]) => resources.filter((row) => row.group === group).length;
  const capabilityMatrix: EstimateContentPassportR3["capabilityMatrix"] = [
    {
      group: "material",
      status: groupCounts("material") > 0 ? "INCLUDED" : "NOT_APPLICABLE",
      reasonRu: groupCounts("material") > 0
        ? "Включены только конкретные материалы выбранной системы с положительным рассчитанным количеством."
        : "Для выравнивания принятого каркаса отдельная поставка материалов по умолчанию не требуется.",
    },
    {
      group: "construction_work",
      status: "INCLUDED",
      reasonRu: "Труд представлен измеряемыми физическими операциями, а не отдельными человеко-часами.",
    },
    {
      group: "machine_equipment",
      status: "NOT_APPLICABLE",
      reasonRu: "Ручной электроинструмент включён в расценку работ; отдельная аренда подъёмной техники не задана проектом.",
    },
    {
      group: "delivery",
      status: groupCounts("delivery") > 0 ? "OPTIONAL" : "NOT_APPLICABLE",
      reasonRu: groupCounts("delivery") > 0
        ? "Конкретный грузопоток включается только при отдельной оплате перевозки."
        : "Мелкие регулировочные операции выполняются на уже обеспеченном материалами объекте.",
    },
  ];
  const engineeringSourceIds = batch001EngineeringSourceIdsR56({
    group: parts.contract.group,
    variant: parts.contract.variant,
  });
  const adjudication = buildAdjudication({ predecessorRows, resources, group: parts.contract.group });
  const userParameterContracts = buildUserParameterContractsR56({
    parameters,
    schemaById,
    group: parts.contract.group,
    variant: parts.contract.variant,
    engineeringSourceIds,
  });
  const passport: Batch001ContentPassportR56 = {
    contract: ESTIMATE_CONTENT_PASSPORT_R3_CONTRACT,
    catalogId,
    titleRu: definitionTitle(parts.contract.group, parts.contract.variant),
    identityMode: "WORK",
    aliasesRu: [inventory.localized_name_ru],
    physicalResultRu: scope.physicalResultRu,
    includedScopeRu: scope.includedScopeRu,
    excludedScopeRu: scope.excludedScopeRu,
    parameters,
    formulas: runtimeFormulas.map(({ calculate: _calculate, sourcePredecessorFormulaId: _source, ...formula }) => formula),
    resources,
    capabilityMatrix,
    executionContract: "MASTER_EXECUTION_TZ_R5_6_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU",
    batchId: "BATCH-001",
    domain: "interior_finishes",
    technologyFamily: "DRYWALL_CEILING_BULKHEAD",
    operation: parts.contract.group,
    variant: parts.contract.variant,
    primaryMeasure: "м² поверхности и м геометрии потолочного короба",
    applicabilityRu: `Самостоятельная операция ${parts.contract.group} потолочного короба в варианте «${variantLabel(parts.contract.variant)}»; стоимость других операций и вариантов не наследуется автоматически.`,
    userParameterContracts,
    engineeringSources: resolveBatch001EngineeringSourcesR56(engineeringSourceIds),
    commercialAssumptionsRu: [
      "Доставка учитывается одной строкой конкретного грузопотока и исключается после подтверждения включения поставщиком.",
      "Тип листа, система профилей и уровень поверхности вводятся явно; скрытых проектных значений нет.",
    ],
    semanticOwners: resources.map((resource) => resource.semanticOwnerId),
    costOwners: resources.map((resource) => resource.costOwnerId),
    procurementOwners: resources
      .map((resource) => resource.procurementOwnerId)
      .filter((owner): owner is string => owner != null),
    predecessorAdjudication: adjudication,
    proofStatus: "CONTENT_RECONCILIATION_GREEN_BACKEND_REPLAY_PENDING_R56",
  };
  const contentDecision = evaluateEstimateContentPassportR3(passport);
  const domainDecision = evaluateBatch001DrywallContentPassportR3(passport);
  const shadowTechnologyPassport = buildBatch001DrywallTechnologyPassportDraftR1(catalogId);
  const shadowPassportDecision = evaluateTechnologyPassportR1(shadowTechnologyPassport, []);
  const shadowRuntimeRemediationBlockers = [
    ...(resources.some((resource) => resource.group === "material") ? [
      "RUNTIME_EXACT_MATERIAL_SPECIFICATION_PROJECTION_NOT_CONNECTED",
      "RUNTIME_NET_GROSS_LOSS_PACKAGE_FIELDS_NOT_CONNECTED",
    ] : []),
    "RUNTIME_ACCESS_METHOD_INPUT_NOT_CONNECTED",
    "RUNTIME_CONCRETE_EQUIPMENT_PROJECTION_NOT_CONNECTED",
    ...(resources.some((resource) => resource.group === "delivery") ? [
      "RUNTIME_DELIVERY_CAPACITY_AND_TRIP_PROJECTION_NOT_CONNECTED",
    ] : []),
  ];
  return {
    contract: BATCH001_DRYWALL_SUCCESSOR_R3_CONTRACT,
    catalogId,
    predecessorVersion: "DrywallCeilingBulkheadProfessionalV3",
    successorVersionId: `${catalogId}:successor-r3:v1`,
    group: parts.contract.group,
    variant: parts.contract.variant,
    predecessorVisibleParameterCount: parts.schema.parameters.length,
    technologyStepsRu: scope.technologyStepsRu,
    dependencyRu: scope.dependencyRu,
    userParameterGroups: userParameterGroups(
      parts.contract.group,
      parts.contract.variant,
      new Set(parameters.map((parameter) => parameter.parameterId)),
    ),
    runtimeFormulas,
    resources,
    passport,
    contentDecision,
    domainDecision,
    shadowRealUsefulGateR1: {
      mode: "SHADOW_PREPARED_ONLY",
      productionAdmissionAttached: false,
      technologyPassportSha256: shadowPassportDecision.passportSha256,
      passportReviewStatus: "DRAFT",
      passportDecision: shadowPassportDecision,
      runtimeRemediationBlockers: shadowRuntimeRemediationBlockers,
      status: "RED",
    },
    adjudication,
  };
}

export function buildBatch001DrywallSuccessorR3(catalogId: string): Batch001DrywallSuccessorDefinitionR3 {
  if (!(DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as readonly string[]).includes(catalogId)) {
    throw new Error(`BATCH001_R3_CATALOG_OUTSIDE_SCOPE:${catalogId}`);
  }
  return buildDefinition(catalogId);
}

export function buildAllBatch001DrywallSuccessorsR3(): readonly Batch001DrywallSuccessorDefinitionR3[] {
  return DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3.map(buildDefinition);
}

export function compileBatch001DrywallSuccessorR3(
  definition: Batch001DrywallSuccessorDefinitionR3,
  values: Readonly<Record<string, string | number | boolean>>,
): Batch001DrywallCompileResultR3 {
  if (!definition.contentDecision.allowed) {
    return {
      status: "RED",
      catalogId: definition.catalogId,
      blockers: definition.contentDecision.errors,
      rows: [],
    };
  }
  const missingUserInputs = definition.passport.parameters
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .filter((parameter) => {
      if (parameter.parameterId === "delivery_distance_km" && values.delivery_included_by_supplier === true) return false;
      const value = values[parameter.parameterId];
      return value == null || (typeof value === "string" && value.trim().length === 0);
    })
    .map((parameter) => `MISSING_USER_INPUT:${parameter.parameterId}`);
  if (missingUserInputs.length > 0) {
    return { status: "NEEDS_REQUIRED_INPUTS", catalogId: definition.catalogId, blockers: missingUserInputs, rows: [] };
  }
  const contractBlockers: string[] = [];
  for (const contract of definition.passport.userParameterContracts) {
    if (contract.parameterId === "delivery_distance_km" && values.delivery_included_by_supplier === true) continue;
    const value = values[contract.parameterId];
    if (contract.inputType === "NUMBER") {
      if (typeof value !== "number" || !Number.isFinite(value) || contract.range.kind !== "NUMERIC") {
        contractBlockers.push(`INVALID_NUMERIC_INPUT:${contract.parameterId}`);
      } else if (value < contract.range.minimum || value > contract.range.maximum) {
        contractBlockers.push(`NUMERIC_INPUT_OUT_OF_RANGE:${contract.parameterId}`);
      }
    } else if (contract.inputType === "BOOLEAN") {
      if (typeof value !== "boolean" || contract.range.kind !== "BOOLEAN") {
        contractBlockers.push(`INVALID_BOOLEAN_INPUT:${contract.parameterId}`);
      }
    } else if (typeof value !== "string" || contract.range.kind !== "TEXT"
      || value.trim().length < contract.range.minimumLength || value.length > contract.range.maximumLength) {
      contractBlockers.push(`INVALID_TEXT_INPUT:${contract.parameterId}`);
    }
  }
  if (contractBlockers.length > 0) {
    return {
      status: "NEEDS_REQUIRED_INPUTS",
      catalogId: definition.catalogId,
      blockers: [...new Set(contractBlockers)].sort(),
      rows: [],
    };
  }
  const formulaById = new Map(definition.runtimeFormulas.map((formula) => [formula.formulaId, formula]));
  const rows: Batch001DrywallCompiledRowR3[] = [];
  const blockers: string[] = [];
  for (const resource of definition.resources) {
    if (resource.applicability.kind === "DELIVERY_NOT_INCLUDED_BY_SUPPLIER"
      && values[resource.applicability.parameterId] === true) continue;
    const formula = formulaById.get(resource.formulaId);
    if (!formula) {
      blockers.push(`FORMULA_MISSING:${resource.rowId}`);
      continue;
    }
    const missingNumeric = formula.inputParameterIds.filter((parameterId) => {
      const value = values[parameterId];
      return typeof value !== "number" || !Number.isFinite(value);
    });
    if (missingNumeric.length > 0) {
      blockers.push(...missingNumeric.map((parameterId) => `MISSING_NUMERIC_INPUT:${resource.rowId}:${parameterId}`));
      continue;
    }
    let quantity: number;
    try {
      quantity = formula.calculate(values as Readonly<Record<string, number>>);
    } catch {
      blockers.push(`FORMULA_CALCULATION_FAILED:${resource.rowId}`);
      continue;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      blockers.push(`INVALID_QUANTITY:${resource.rowId}`);
      continue;
    }
    if (quantity === 0) continue;
    rows.push({
      rowId: resource.rowId,
      group: resource.group,
      titleRu: resource.titleRu,
      unitId: resource.unitId,
      quantity,
      semanticOwnerId: resource.semanticOwnerId,
      costOwnerId: resource.costOwnerId,
      procurementEligible: resource.procurementEligible,
    });
  }
  if (blockers.length > 0) {
    return { status: "NEEDS_REQUIRED_INPUTS", catalogId: definition.catalogId, blockers: [...new Set(blockers)].sort(), rows: [] };
  }
  return { status: "GREEN", catalogId: definition.catalogId, rows };
}
