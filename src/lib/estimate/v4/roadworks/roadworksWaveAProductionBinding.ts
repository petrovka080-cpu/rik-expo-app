import { formatEstimateUnitLabel } from "../../../ai/globalEstimate";
import type { ConsumerRepairAiDraft } from "../../../consumerRequests";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../buildEstimateFromInlineWorkPrompt";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  compileRoadworksWaveAWork,
  getRoadworksWaveAParameterKeys,
  resolveRoadworksWaveAWork,
  type RoadworksWaveAInputs,
  type RoadworksWaveAInventoryItem,
  type RoadworksWaveARow,
} from "./roadworksWaveA";

export const ROADWORKS_WAVE_A_MIGRATION_VERSION = "roadworks-wave-a-v4.1";

export type RoadworksWaveAProductionRegistration = RoadworksWaveAInventoryItem & {
  migrationVersion: typeof ROADWORKS_WAVE_A_MIGRATION_VERSION;
  overlayId: string;
  formulaGraphId: string;
  parameterSchema: readonly string[];
  passport: {
    canonicalWorkId: string;
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
    formulaGraphId: `${item.workId}:formula-graph:v4`,
    parameterSchema: getRoadworksWaveAParameterKeys(item.workId),
    passport: {
      canonicalWorkId: item.workId,
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
    ?? getRoadworksWaveAProductionRegistration(resolveRoadworksWaveAWork(input.rawInput));
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
): { values: RoadworksWaveAInputs; assumptions: readonly string[] } {
  const text = input.rawInput;
  const extracted: Partial<RoadworksWaveAInputs> = {
    area_m2: numberFromText(text, [
      /(\d[\d\s]*(?:[.,]\d+)?)\s*(?:м(?:2|²)|кв(?:адратн\w*)?\s*м)/iu,
      /площад\w*\s*(?:—|:|=)?\s*(\d[\d\s]*(?:[.,]\d+)?)/iu,
    ]) ?? undefined,
    thickness_mm: numberFromText(text, [
      /толщин\w*\s*(?:—|:|=)?\s*(\d+(?:[.,]\d+)?)\s*мм/iu,
      /сло\w*\s+(\d+(?:[.,]\d+)?)\s*мм/iu,
    ]) ?? undefined,
    density_t_m3: numberFromText(text, [
      /плотност\w*\s*(?:—|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:т\/м3|т\/м³)/iu,
    ]) ?? undefined,
    haul_distance_km: numberFromText(text, [
      /(?:доставк\w*|завод\w*)\s*(?:—|:|=|до)?\s*(\d+(?:[.,]\d+)?)\s*км/iu,
    ]) ?? undefined,
  };
  const values = { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS };
  const assumptions: string[] = [];
  for (const key of Object.keys(values) as (keyof RoadworksWaveAInputs)[]) {
    const explicit = positiveOverride(input, key) ?? extracted[key] ?? null;
    if (explicit != null) values[key] = explicit;
    else assumptions.push(key);
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

export function buildRoadworksWaveAProductionDraft(
  input: BuildEstimateFromInlineWorkPromptInput,
): { draft: ConsumerRepairAiDraft; registration: RoadworksWaveAProductionRegistration } | null {
  const registration = resolveRoadworksWaveAProductionWork(input);
  if (!registration) return null;
  const parameters = extractRoadworksWaveAProductionInputs(input);
  const compilation = compileRoadworksWaveAWork(registration.workId, parameters.values);
  const currency = input.currency ?? "KGS";
  const draft: ConsumerRepairAiDraft = {
    titleRu: `Предварительная профессиональная смета: ${registration.professionalNameRu}`,
    summaryRu: `Рассчитано ${compilation.rows.length} позиций. Цены не заполнены; требуется проверка дорожным инженером и сметчиком.`,
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
    missingData: parameters.assumptions.map((key) => `Уточнить: ${key}`),
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
        selectedWorkId: registration.workId,
        canonicalWorkId: registration.workId,
        migrationVersion: registration.migrationVersion,
        scopeProfile: registration.scopeProfile,
        parameterSnapshot: parameters.values,
        assumptionKeys: parameters.assumptions,
        affectedBy: row.affectedBy,
        formulaGraphId: registration.formulaGraphId,
        canonicalPayloadFingerprintSeed: `${registration.workId}:${registration.scopeProfile}`,
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
