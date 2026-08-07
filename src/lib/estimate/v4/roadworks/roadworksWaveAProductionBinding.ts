import { formatEstimateUnitLabel } from "../../../ai/globalEstimate";
import type { ConsumerRepairAiDraft } from "../../../consumerRequests";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../buildEstimateFromInlineWorkPrompt";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  compileRoadworksWaveAWork,
  getRoadworksWaveAParameterKeys,
  getRoadworksWaveAParameterDefinitions,
  resolveRoadworksWaveAWork,
  type RoadworksWaveAInputs,
  type RoadworksWaveAInventoryItem,
  type RoadworksWaveARow,
} from "./roadworksWaveA";
import { resolveRoadAsphaltProfileV3 } from "./roadworksWaveASemanticTruth";

export const ROADWORKS_WAVE_A_MIGRATION_VERSION = "roadworks-wave-a-v4.1";

export type RoadworksWaveAProductionRegistration = RoadworksWaveAInventoryItem & {
  migrationVersion: typeof ROADWORKS_WAVE_A_MIGRATION_VERSION;
  overlayId: string;
  formulaGraphId: string;
  parameterSchema: readonly string[];
  parameterDefinitions: ReturnType<typeof getRoadworksWaveAParameterDefinitions>;
  passport: {
    requestedCatalogWorkId: string;
    canonicalWorkId: string;
    canonicalModelId: string;
    canonicalModelVersion: "1";
    scopePresetId: string | null;
    professionalNameRu: string;
    technologyFamily: string;
    scopeProfile: string;
  };
};

export const RoadworksWaveAProductionRegistry: readonly RoadworksWaveAProductionRegistration[] =
  RoadworksWaveAInventory.map((item) => ({
    ...item,
    migrationVersion: ROADWORKS_WAVE_A_MIGRATION_VERSION,
    overlayId: `${item.workId}:overlay:v4`,
    formulaGraphId: `${item.canonicalModelId}:formula-graph:v1`,
    parameterSchema: getRoadworksWaveAParameterKeys(item.workId),
    parameterDefinitions: getRoadworksWaveAParameterDefinitions(item.workId),
    passport: {
      requestedCatalogWorkId: item.workId,
      canonicalWorkId: item.canonicalWorkId,
      canonicalModelId: item.canonicalModelId,
      canonicalModelVersion: "1",
      scopePresetId: item.scopePresetId,
      professionalNameRu: item.professionalNameRu,
      technologyFamily: item.technologyFamily,
      scopeProfile: item.scopeProfile,
    },
  }));

const registrationByWorkId = new Map(
  RoadworksWaveAProductionRegistry.map((registration) => [registration.workId, registration]),
);
const registrationByTemplateId = new Map(
  RoadworksWaveAProductionRegistry.map((registration) => [registration.templateId, registration]),
);

export function getRoadworksWaveAProductionRegistration(
  id: string | null | undefined,
): RoadworksWaveAProductionRegistration | null {
  if (!id) return null;
  return registrationByWorkId.get(id) ?? registrationByTemplateId.get(id) ?? null;
}

export function resolveRoadworksWaveAProductionWork(input: {
  selectedWorkKey?: string | null;
  selectedTemplateId?: string | null;
  rawInput: string;
}): RoadworksWaveAProductionRegistration | null {
  return getRoadworksWaveAProductionRegistration(input.selectedWorkKey)
    ?? getRoadworksWaveAProductionRegistration(input.selectedTemplateId)
    ?? getRoadworksWaveAProductionRegistration(resolveRoadworksWaveAWork(input.rawInput))
    ?? resolveRoadworksWaveAConversationalWork(input.rawInput).registration;
}

export type RoadworksWaveAConversationalResolution = {
  status: "resolved" | "ambiguous" | "unresolved" | "negated";
  registration: RoadworksWaveAProductionRegistration | null;
  candidateWorkIds: readonly string[];
};

const OPERATION_PATTERNS: readonly {
  operation: string;
  positive: RegExp;
  negative: RegExp;
}[] = [
  { operation: "repair", positive: /(?:ремонт[\p{L}]*\s+(?:асфальт|покрыт)|почин[\p{L}]*\s+асфальт|латк[\p{L}]*\s+асфальт)/iu, negative: /(?:не|без)\s+ремонт/iu },
  { operation: "compact", positive: /(?:уплотн[\p{L}]*|укат[\p{L}]*)\s+(?:асфальт|покрыт|смес)/iu, negative: /(?:не|без)\s+(?:уплотн|укат)/iu },
  { operation: "prepare", positive: /подготов[\p{L}]*\s+(?:поверхност|асфальт[\p{L}]*\s+покрыт)/iu, negative: /(?:не|без)\s+подготов/iu },
  { operation: "level", positive: /(?:выравнив[\p{L}]*\s+сло|выровн[\p{L}]*\s+асфальт)/iu, negative: /(?:не|без)\s+выравнив/iu },
  { operation: "drain", positive: /(?:водоотвод|уклон[\p{L}]*\s+для\s+сток|дренаж[\p{L}]*\s+профил)/iu, negative: /(?:не|без)\s+(?:водоотвод|дренаж)/iu },
  { operation: "finish", positive: /(?:финиш[\p{L}]*\s+обработ|герметизац[\p{L}]*\s+стык)/iu, negative: /(?:не|без)\s+(?:финиш|герметизац)/iu },
  { operation: "lay", positive: /(?:улож[\p{L}]*|уклад[\p{L}]*)(?:\s+и\s+[\p{L}]+)?\s+(?:асфальт|асфальтобетон|смес)/iu, negative: /(?:не|без)\s+уклад/iu },
  { operation: "install", positive: /(?:устро[\p{L}]*|сдела[\p{L}]*)\s+(?:асфальт[\p{L}]*\s+покрыт|покрыт[\p{L}]*\s+из\s+асфальт)/iu, negative: /(?:не|без)\s+(?:устройств|покрыт)/iu },
];

function conversationalScope(text: string): string {
  if (/(?:тех(?:ническ[\p{L}]*)?\s*помещ|внутри\s+цех)/iu.test(text)) return "technical_room";
  if (/(?:мокр[\p{L}]*\s+зон|влажн[\p{L}]*\s+участ)/iu.test(text)) return "wet_zone";
  if (/(?:мал[\p{L}]*|небольш[\p{L}]*|локальн[\p{L}]*)\s+(?:площад|участ|зон)/iu.test(text)) return "small_area";
  if (/(?:больш[\p{L}]*|крупн[\p{L}]*)\s+(?:площад|участ|территор)/iu.test(text)) return "large_area";
  return "standard";
}

export function resolveRoadworksWaveAConversationalWork(
  rawInput: string,
): RoadworksWaveAConversationalResolution {
  const matches = OPERATION_PATTERNS.filter((pattern) => pattern.positive.test(rawInput));
  const nonNegated = matches.filter((pattern) => !pattern.negative.test(rawInput));
  if (matches.length > 0 && nonNegated.length === 0) {
    return { status: "negated", registration: null, candidateWorkIds: [] };
  }
  const scope = conversationalScope(rawInput);
  const candidates = nonNegated.flatMap((match) =>
    RoadworksWaveAProductionRegistry.filter((item) =>
      item.workId.includes(`_asphalt_${match.operation}_`) && item.scopeProfile === scope
    )
  );
  if (candidates.length === 1) {
    return { status: "resolved", registration: candidates[0], candidateWorkIds: [candidates[0].workId] };
  }
  return {
    status: candidates.length > 1 ? "ambiguous" : "unresolved",
    registration: null,
    candidateWorkIds: candidates.map((item) => item.workId),
  };
}

function positiveOverride(
  input: BuildEstimateFromInlineWorkPromptInput,
  key: keyof RoadworksWaveAInputs,
): number | null {
  const raw = input.paramOverrides?.[key]?.value;
  const value = typeof raw === "number"
    ? raw
    : typeof raw === "string"
      ? Number(raw.replace(",", "."))
      : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function numberFromText(text: string, patterns: readonly RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1].replace(",", ".").replace(/\s+/g, ""));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

export function extractRoadworksWaveAProductionInputs(
  input: BuildEstimateFromInlineWorkPromptInput,
  workId?: string,
): { values: RoadworksWaveAInputs; assumptions: readonly string[] } {
  const text = input.rawInput;
  const extracted: Partial<RoadworksWaveAInputs> = {
    area_m2: numberFromText(text, [
      /(\d[\d\s]*(?:[.,]\d+)?)\s*(?:м(?:2|²)|кв(?:адратн[\p{L}]*)?\s*м)/iu,
      /площад[\p{L}]*\s*(?:—|:|=)?\s*(\d[\d\s]*(?:[.,]\d+)?)/iu,
    ]) ?? undefined,
    thickness_mm: numberFromText(text, [
      /толщин[\p{L}]*\s*(?:—|:|=)?\s*(\d+(?:[.,]\d+)?)\s*мм/iu,
      /сло[\p{L}]*\s+(\d+(?:[.,]\d+)?)\s*мм/iu,
    ]) ?? undefined,
    density_t_m3: numberFromText(text, [
      /плотност[\p{L}]*\s*(?:—|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:т\/м3|т\/м³)/iu,
    ]) ?? undefined,
    haul_distance_km: numberFromText(text, [
      /(?:доставк[\p{L}]*|завод[\p{L}]*)\s*(?:—|:|=|до)?\s*(\d+(?:[.,]\d+)?)\s*км/iu,
    ]) ?? undefined,
  };
  const values = { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS };
  const assumptions: string[] = [];
  const applicableKeys = new Set(workId ? getRoadworksWaveAParameterKeys(workId) : Object.keys(values));
  for (const key of Object.keys(values) as (keyof RoadworksWaveAInputs)[]) {
    const explicit = positiveOverride(input, key) ?? extracted[key] ?? null;
    if (explicit != null) values[key] = explicit;
    else if (applicableKeys.has(key)) assumptions.push(key);
  }
  return { values, assumptions };
}

function itemType(row: RoadworksWaveARow): ConsumerRepairAiDraft["items"][number]["itemType"] {
  if (row.category === "material") return "material";
  if (row.category === "work" || row.category === "labor") return "work";
  if (row.category === "document") return "document";
  return "service";
}

function wbsFor(row: RoadworksWaveARow): string {
  return ({
    material: "02",
    work: "03",
    labor: "04",
    equipment: "05",
    service: "06",
    logistics: "07",
    test: "08",
    document: "09",
  } satisfies Record<RoadworksWaveARow["category"], string>)[row.category];
}

function professionalCategoryFor(row: RoadworksWaveARow): string {
  return ({
    material: "MATERIAL",
    work: "WORK",
    labor: "LABOR",
    equipment: "EQUIPMENT",
    service: "SERVICE",
    logistics: "LOGISTICS",
    test: "LAB_CONTROL",
    document: "DOCUMENTATION",
  } satisfies Record<RoadworksWaveARow["category"], string>)[row.category];
}

export function buildRoadworksWaveAProductionDraft(
  input: BuildEstimateFromInlineWorkPromptInput,
): { draft: ConsumerRepairAiDraft; registration: RoadworksWaveAProductionRegistration } | null {
  const registration = resolveRoadworksWaveAProductionWork(input);
  if (!registration) return null;
  const parameters = extractRoadworksWaveAProductionInputs(input, registration.workId);
  const resolvedProfile = resolveRoadAsphaltProfileV3(registration.workId);
  const executable = resolvedProfile.domainDecision === "ROADS_AND_PAVEMENTS" && resolvedProfile.scopePresetId !== null;
  const conditionalRow: RoadworksWaveARow = {
    rowId: `${registration.canonicalWorkId}:applicability_blocker`,
    category: "document",
    nameRu: "Требуется подтверждение области применения и состава работ",
    unit: "pcs",
    quantity: 1,
    formulaId: "conditional_no_certified_quantity",
    affectedBy: [],
    sourceIds: ["catalog_applicability_review"],
    procurementOwner: "customer",
  };
  const compilation = executable
    ? compileRoadworksWaveAWork(registration.canonicalWorkId, parameters.values, { scopeProfile: registration.scopeProfile })
    : { workId: registration.workId, rows: [conditionalRow] };
  const currency = input.currency ?? "KGS";
  const draft: ConsumerRepairAiDraft = {
    titleRu: `Предварительная профессиональная смета: ${registration.professionalNameRu}`,
    summaryRu: executable
      ? `Рассчитано ${compilation.rows.length} позиций. Цены не заполнены; требуется проверка дорожным инженером и сметчиком.`
      : "Асфальтовая смета не рассчитана: сначала подтвердите дорожную область применения и состав работ.",
    repairType: registration.workId,
    selectedWork: {
      selectedWorkKey: registration.workId,
      selectedWorkTitleRu: registration.professionalNameRu,
      selectedWorkCategoryKey: "roadworks",
      selectedWorkCategoryTitleRu: "Дорожные работы",
      selectedWorkRawInput: input.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    },
    dangerousDiyBlocked: false,
    missingData: executable
      ? parameters.assumptions.map((key) => `Уточнить: ${key}`)
      : ["Подтвердить дорожную область применения, конструкцию и технологическую операцию."],
    items: compilation.rows.map((row, rowIndex) => ({
      itemType: itemType(row),
      titleRu: row.nameRu,
      quantity: row.quantity,
      unit: row.unit,
      unitLabel: formatEstimateUnitLabel(row.unit),
      unitPrice: null,
      currency,
      source: "reference_price_book",
      category: row.category,
      sourceId: row.sourceIds[0],
      sourceLabel: "Источник цены не выбран",
      formulaId: row.formulaId,
      quantityFormula: row.formulaId,
      calculationTrace: `${row.formulaId}; work=${registration.workId}`,
      sourceParameters: {
        rowCode: row.rowId,
        wbsCode: wbsFor(row),
        includedInProcurement: row.procurementOwner === "buyer",
        procurementOwner: row.procurementOwner,
        roadworksWaveA: true,
        asphaltV4ProfessionalCategory: professionalCategoryFor(row),
        requestedCatalogWorkId: registration.workId,
        selectedWorkId: registration.workId,
        canonicalWorkId: registration.canonicalWorkId,
        canonicalModelId: registration.canonicalModelId,
        canonicalModelVersion: registration.passport.canonicalModelVersion,
        scopePresetId: registration.scopePresetId,
        semanticOwner: registration.canonicalModelId,
        migrationVersion: registration.migrationVersion,
        scopeProfile: registration.scopeProfile,
        parameterSnapshot: parameters.values,
        assumptionKeys: parameters.assumptions,
        affectedBy: row.affectedBy,
        formulaGraphId: registration.formulaGraphId,
        executableAsphaltProfile: executable,
        certificationClass: resolvedProfile.certificationClass,
        applicabilityBlockers: resolvedProfile.blockers,
        canonicalPayloadFingerprintSeed: `${registration.canonicalModelId}:${registration.scopePresetId ?? "no-preset"}`,
        inlineWorkPrompt: true,
        inlineWorkPromptTemplateId: registration.templateId,
        inlineWorkPromptFamilyId: registration.workId,
        inlineWorkPromptRowIndex: rowIndex,
      },
      templateId: registration.templateId,
      templateVersion: registration.migrationVersion,
      normId: `norm:roadworks-wave-a:${row.rowId}`,
      normFamilyId: `norm_family:${registration.technologyFamily}`,
      normSourceId: row.sourceIds[0],
      normSourceTitle: "Нормативный пакет дорожных работ — требуется экспертное подтверждение",
      normVersion: registration.migrationVersion,
      normReviewStatus: "road_engineer_review_required",
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Цена не заполнена",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.category === "material" ? row.rowId : null,
      rateKey: `${registration.workId}:${row.rowId}`,
    })),
  };
  return { draft, registration };
}
