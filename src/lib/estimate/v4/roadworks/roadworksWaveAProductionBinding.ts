import { formatEstimateUnitLabel } from "../../../ai/globalEstimate/formatEstimateUnitLabel";
import type { ConsumerRepairAiDraft } from "../../../consumerRequests";
import type { BuildEstimateFromInlineWorkPromptInput } from "../../buildEstimateFromInlineWorkPrompt";
import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  ROADWORKS_WAVE_A_NUMERIC_INPUT_KEYS,
  ROADWORKS_WAVE_A_PARAMETER_PRESENTATION,
  ROADWORKS_WAVE_A_SCOPE_APPLICABILITY_PARAMETER_KEYS,
  RoadworksWaveAInventory,
  compileRoadworksWaveAWork,
  getRoadworksWaveAParameterKeys,
  getRoadworksWaveAParameterDefinitions,
  roadworksWaveAParameterPresentation,
  resolveRoadworksWaveAWork,
  type RoadworksWaveAInputs,
  type RoadworksWaveAApplicabilityInputKey,
  type RoadworksWaveAParameterKey,
  type RoadworksWaveANumericInputKey,
  type RoadworksWaveAMachineProductivityKey,
  type RoadworksWaveAInventoryItem,
  type RoadworksWaveARow,
} from "./roadworksWaveA";
import {
  buildRoadworksWaveAProfessionalPassportV4,
  resolveRoadAsphaltProfileV3,
} from "./roadworksWaveASemanticTruth";
import {
  resolveDomainResolutionReadiness,
  type DomainResolutionReadiness,
} from "../../estimateDraftRevisionContract";
import { applyProfessionalBoqRuntimeContract } from "../../professionalBoqAssumptions";
import { resolveAsphaltM1NormativeBindingV1 } from "../asphalt/asphaltM1NormativeBindingsV1";
import { logger } from "../../../logger";

export const ROADWORKS_WAVE_A_MIGRATION_VERSION = "roadworks-wave-a-v4.3";
export const ROADWORKS_WAVE_A_BASELINE_ASSUMPTION_VERSION =
  "roadworks-wave-a-visible-baseline:r5.2:2026-08-17.v1";

export type RoadworksWaveAProductionRegistration = RoadworksWaveAInventoryItem & {
  migrationVersion: typeof ROADWORKS_WAVE_A_MIGRATION_VERSION;
  overlayId: string;
  formulaGraphId: string;
  calculationProfileId: string;
  parameterSchemaId: string;
  normativeCompositionId: string;
  semanticFingerprint: string;
  parameterSchema: readonly RoadworksWaveAParameterKey[];
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
  professionalPassport: ReturnType<typeof buildRoadworksWaveAProfessionalPassportV4>;
};

export function buildRoadworksWaveAProductionRegistry(
  inventory: readonly RoadworksWaveAInventoryItem[] = RoadworksWaveAInventory,
  passportBuilder: typeof buildRoadworksWaveAProfessionalPassportV4 =
    buildRoadworksWaveAProfessionalPassportV4,
): readonly RoadworksWaveAProductionRegistration[] {
  return inventory.map((item) => {
    const calculationProfileId = `roadworks-wave-a:${item.workId}:calculation-profile:v4.3`;
    const parameterSchemaId = `${item.workId}:parameter-schema:v4.3`;
    let professionalPassport: ReturnType<typeof buildRoadworksWaveAProfessionalPassportV4> | null = null;
    let parameterSchema: readonly RoadworksWaveAParameterKey[] | null = null;
    let parameterDefinitions: ReturnType<typeof getRoadworksWaveAParameterDefinitions> | null = null;
    let semanticFingerprint: string | null = null;
    const getProfessionalPassport = () => {
      professionalPassport ??= passportBuilder(item.workId);
      return professionalPassport;
    };
    const registration = {
      ...item,
      migrationVersion: ROADWORKS_WAVE_A_MIGRATION_VERSION,
      overlayId: `${item.workId}:overlay:v4.3`,
      calculationProfileId,
      parameterSchemaId,
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
    };
    Object.defineProperties(registration, {
      professionalPassport: {
        enumerable: true,
        get: getProfessionalPassport,
      },
      formulaGraphId: {
        enumerable: true,
        get: () => getProfessionalPassport().calculation.formulaGraphVersion,
      },
      normativeCompositionId: {
        enumerable: true,
        get: () => getProfessionalPassport().normativeComposition.compositionId,
      },
      parameterSchema: {
        enumerable: true,
        get: () => {
          parameterSchema ??= getRoadworksWaveAParameterKeys(item.workId);
          return parameterSchema;
        },
      },
      parameterDefinitions: {
        enumerable: true,
        get: () => {
          parameterDefinitions ??= getRoadworksWaveAParameterDefinitions(item.workId);
          return parameterDefinitions;
        },
      },
      semanticFingerprint: {
        enumerable: true,
        get: () => {
          if (semanticFingerprint) return semanticFingerprint;
          const passport = getProfessionalPassport();
          const formulaGraphId = passport.calculation.formulaGraphVersion;
          const normativeCompositionId = passport.normativeComposition.compositionId;
          semanticFingerprint = estimateDeterministicHash({
            workKey: item.workId,
            canonicalModelId: item.canonicalModelId,
            scopePresetId: item.scopePresetId,
            scopeProfile: item.scopeProfile,
            passportId: passport.passportId,
            passportVersion: passport.version,
            calculationProfileId,
            parameterSchemaId,
            formulaGraphId,
            normativeCompositionId,
          });
          return semanticFingerprint;
        },
      },
    });
    return registration as RoadworksWaveAProductionRegistration;
  });
}

export const RoadworksWaveAProductionRegistry =
  buildRoadworksWaveAProductionRegistry();

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

export function getRoadworksWaveAResolutionReadiness(
  registration: RoadworksWaveAProductionRegistration | null,
  input: { scopeResolved?: boolean; requiredInputsPresent?: boolean } = {},
): DomainResolutionReadiness {
  if (!registration) {
    return resolveDomainResolutionReadiness({ resolutionExists: false });
  }
  const profile = resolveRoadAsphaltProfileV3(registration.workId);
  const normativeApplicabilityResolved = Boolean(profile.classificationVerdictId);
  const applicationAllowed = profile.domainDecision !== "DOMAIN_REVIEW_REQUIRED" && profile.blockers.length === 0;
  return resolveDomainResolutionReadiness({
    resolutionExists: true,
    scopeRequired: profile.scopePresetId === null,
    scopeResolved: input.scopeResolved ?? profile.scopePresetId !== null,
    requiredInputsPresent: input.requiredInputsPresent ?? true,
    normativeApplicabilityResolved,
    applicationAllowed,
    calculationStrategyAvailable: normativeApplicabilityResolved && applicationAllowed && profile.scopePresetId !== null,
  });
}

export function resolveRoadworksWaveAProductionWork(input: {
  selectedWorkKey?: string | null;
  selectedTemplateId?: string | null;
  rawInput: string;
}): RoadworksWaveAProductionRegistration | null {
  return resolveExactRoadworksWaveAProductionWork(input)
    ?? resolveRoadworksWaveAConversationalWork(input.rawInput).registration;
}

export function resolveExactRoadworksWaveAProductionWork(input: {
  selectedWorkKey?: string | null;
  selectedTemplateId?: string | null;
  rawInput: string;
}): RoadworksWaveAProductionRegistration | null {
  return getRoadworksWaveAProductionRegistration(input.selectedWorkKey)
    ?? getRoadworksWaveAProductionRegistration(input.selectedTemplateId)
    ?? getRoadworksWaveAProductionRegistration(resolveRoadworksWaveAWork(input.rawInput));
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
  key: RoadworksWaveANumericInputKey | RoadworksWaveAMachineProductivityKey,
): number | null {
  const override = input.paramOverrides?.[key];
  if (override?.source === "default_assumption" || override?.source === "derived") return null;
  const raw = override?.value;
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
): {
  values: RoadworksWaveAInputs;
  assumptions: readonly RoadworksWaveAParameterKey[];
  blockingAssumptions: readonly RoadworksWaveAParameterKey[];
} {
  const text = input.rawInput;
  const extracted: Partial<Record<RoadworksWaveANumericInputKey, number>> = {
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
  const values = { ...DEFAULT_ROADWORKS_WAVE_A_INPUTS } as RoadworksWaveAInputs & Record<string, unknown>;
  const assumptions: RoadworksWaveAParameterKey[] = [];
  const applicableParameterKeys = workId
    ? [...getRoadworksWaveAParameterKeys(workId)]
    : Object.keys(values) as RoadworksWaveAParameterKey[];
  const applicableKeys = new Set<RoadworksWaveAParameterKey>(applicableParameterKeys);
  const numericKeys = applicableParameterKeys.filter((key): key is RoadworksWaveANumericInputKey | RoadworksWaveAMachineProductivityKey =>
    roadworksWaveAParameterPresentation(key).inputKind === "number"
  );
  for (const key of numericKeys) {
    const explicit = positiveOverride(input, key) ?? (key in extracted ? extracted[key as RoadworksWaveANumericInputKey] : undefined) ?? null;
    if (explicit != null) values[key] = explicit;
    else if (applicableKeys.has(key)) assumptions.push(key);
  }
  const registration = getRoadworksWaveAProductionRegistration(workId);
  const applicabilityKeys = registration
    ? ROADWORKS_WAVE_A_SCOPE_APPLICABILITY_PARAMETER_KEYS[registration.scopeProfile]
    : [];
  const allowedValues: Readonly<Record<RoadworksWaveAApplicabilityInputKey, readonly unknown[]>> = {
    exterior_surface_kind: ["PARKING", "DRIVE", "INDUSTRIAL_SITE", "EXTERNAL_AREA"],
    drainage_outfall_confirmed: [true],
    base_dry_and_accepted: [true],
    floor_mechanical_impact_class: ["LOW", "MODERATE", "SIGNIFICANT"],
    floor_liquid_exposure_class: ["NONE", "LOW_PERIODIC"],
    approved_floor_mix_type: ["CAST_ASPHALT", "RIGID_ASPHALT_CONCRETE"],
  };
  for (const key of applicabilityKeys) {
    const override = input.paramOverrides?.[key];
    const explicit = override?.source === "default_assumption" || override?.source === "derived"
      ? undefined
      : override?.value;
    if (allowedValues[key].includes(explicit)) {
      Object.assign(values, { [key]: explicit });
    } else {
      assumptions.push(key);
    }
  }
  const tierByKey = new Map(
    getRoadworksWaveAParameterDefinitions(workId ?? "").map((definition) => [definition.key, definition.tier]),
  );
  const assumptionSet = new Set(assumptions);
  const orderedAssumptions = [
    ...applicableParameterKeys.filter((key) => assumptionSet.has(key)),
    ...assumptions.filter((key) => !applicableKeys.has(key)),
  ];
  return {
    values: values as RoadworksWaveAInputs,
    assumptions: orderedAssumptions,
    // Every applicable key has an explicit, versioned domain default in
    // DEFAULT_ROADWORKS_WAVE_A_INPUTS. Missing user input therefore remains a
    // visible assumption, but it cannot suppress the baseline estimate.
    blockingAssumptions: orderedAssumptions.filter((key) =>
      tierByKey.get(key) === "P0" && DEFAULT_ROADWORKS_WAVE_A_INPUTS[key] == null
    ),
  };
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
    waste_stream: "07",
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
    waste_stream: "WASTE_STREAM",
    test: "LAB_CONTROL",
    document: "DOCUMENTATION",
  } satisfies Record<RoadworksWaveARow["category"], string>)[row.category];
}

function recordRoadworksWaveABuildTiming(stage: string, startedAt: number): void {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  if (typeof navigator === "undefined" || navigator.product !== "ReactNative") return;
  logger.info("RikRoadworksBuild", JSON.stringify({
    stage,
    elapsedMs: Date.now() - startedAt,
  }));
}

export function buildRoadworksWaveAProductionDraft(
  input: BuildEstimateFromInlineWorkPromptInput,
): { draft: ConsumerRepairAiDraft; registration: RoadworksWaveAProductionRegistration } | null {
  const buildStartedAt = Date.now();
  const registration = resolveRoadworksWaveAProductionWork(input);
  if (!registration) return null;
  recordRoadworksWaveABuildTiming("WORK_RESOLVED", buildStartedAt);
  const parameters = extractRoadworksWaveAProductionInputs(input, registration.workId);
  const exactParameterSnapshot = Object.fromEntries(
    registration.parameterSchema.map((key) => [key, parameters.values[key]]),
  );
  recordRoadworksWaveABuildTiming("PARAMETERS_READY", buildStartedAt);
  const resolvedProfile = resolveRoadAsphaltProfileV3(registration.workId);
  const applicabilityBlockers = [
    ...resolvedProfile.blockers,
    ...parameters.blockingAssumptions.map((key) => `required_input_missing:${key}`),
  ];
  recordRoadworksWaveABuildTiming("PROFILE_READY", buildStartedAt);
  const domainResolutionReadiness = getRoadworksWaveAResolutionReadiness(registration, {
    requiredInputsPresent: parameters.blockingAssumptions.length === 0,
  });
  const executable = domainResolutionReadiness === "CALCULATION_READY";
  recordRoadworksWaveABuildTiming("READINESS_READY", buildStartedAt);
  const professionalPassport = registration.professionalPassport;
  recordRoadworksWaveABuildTiming("PASSPORT_READY", buildStartedAt);
  const conditionalRow: RoadworksWaveARow = {
    rowId: `${registration.workId}:applicability_blocker`,
    category: "document",
    rowType: "document",
    semanticOwner: professionalPassport.passportId,
    workKey: registration.workId,
    passportId: professionalPassport.passportId,
    nameRu: "Требуется подтверждение области применения и состава работ",
    unit: "pcs",
    uom: "pcs",
    quantity: 1,
    formulaId: "conditional_no_certified_quantity",
    affectedBy: [],
    sourceParameterKeys: [],
    sourceIds: ["catalog_applicability_review"],
    normativeSourceId: "catalog_applicability_review",
    normativeRateIds: [],
    roundingRule: "EXACT_ONE",
    wasteRule: "NOT_APPLICABLE",
    priceSourceId: null,
    priceDate: null,
    revisionId: "REFERENCE_UNSAVED",
    procurementEligibility: "EXCLUDED_CONTROL_DOCUMENT",
    payable: false,
    procurementOwner: "customer",
  };
  const compilation = executable
    ? compileRoadworksWaveAWork(registration.workId, parameters.values, { scopeProfile: registration.scopeProfile })
    : { workId: registration.workId, rows: [conditionalRow] };
  recordRoadworksWaveABuildTiming("COMPILATION_READY", buildStartedAt);
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
      ? []
      : parameters.blockingAssumptions.map((key) => `Уточнить обязательный параметр: ${key}`),
    items: compilation.rows.map((row, rowIndex) => {
      const normativeBinding = resolveAsphaltM1NormativeBindingV1({
        rowId: row.rowId,
        existingSourceIds: row.sourceIds,
      });
      const normativeSourceIds = normativeBinding.sourceIds.filter((sourceId) =>
        !sourceId.startsWith("project_quantity_inputs_")
      );
      return ({
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
        includedInProcurement: row.procurementEligibility === "ELIGIBLE",
        procurementOwner: row.procurementOwner,
        roadworksWaveA: true,
        domainResolutionReadiness,
        asphaltV4ProfessionalCategory: professionalCategoryFor(row),
        requestedCatalogWorkId: registration.workId,
        selectedWorkId: registration.workId,
        canonicalWorkId: registration.canonicalWorkId,
        canonicalModelId: registration.canonicalModelId,
        canonicalModelVersion: registration.passport.canonicalModelVersion,
        scopePresetId: registration.scopePresetId,
        semanticOwner: professionalPassport.passportId,
        professionalEstimatePassportId: professionalPassport.passportId,
        professionalEstimatePassportVersion: professionalPassport.version,
        calculationProfileId: registration.calculationProfileId,
        calculationProfileVersion: "roadworks-wave-a-calculation-profile:v4.3",
        parameterSchemaId: registration.parameterSchemaId,
        parameterSchemaVersion: registration.migrationVersion,
        normativeCompositionId: registration.normativeCompositionId,
        semanticFingerprint: registration.semanticFingerprint,
        migrationVersion: registration.migrationVersion,
        scopeProfile: registration.scopeProfile,
        parameterSnapshot: rowIndex === 0 ? exactParameterSnapshot : undefined,
        assumptionKeys: rowIndex === 0 ? parameters.assumptions : undefined,
        unresolvedParameterKeys: rowIndex === 0 ? parameters.blockingAssumptions : undefined,
        baselineAssumptionVersion: rowIndex === 0
          ? ROADWORKS_WAVE_A_BASELINE_ASSUMPTION_VERSION
          : undefined,
        roadworksWaveAParameterMetadata: rowIndex === 0
          ? Object.fromEntries(
            registration.parameterDefinitions.map((definition) => {
              const presentation = roadworksWaveAParameterPresentation(definition.key);
              return [definition.key, {
                ...presentation,
                tier: definition.tier,
                requiredFor: definition.tier === "P0" ? "contract_ready" : "better_accuracy",
                defaultValue: DEFAULT_ROADWORKS_WAVE_A_INPUTS[definition.key],
                defaultSourceId: "roadworks-wave-a-versioned-defaults",
                defaultSourceVersion: ROADWORKS_WAVE_A_BASELINE_ASSUMPTION_VERSION,
                defaultSourceType: "VISIBLE_BASELINE_ASSUMPTION",
                defaultReasonRu: `Видимое базовое допущение Roadworks Wave A для параметра «${presentation.labelRu}»; проверьте перед договором.`,
              }];
            }),
          )
          : undefined,
        affectedBy: row.sourceParameterKeys,
        normativeSources: normativeSourceIds,
        normativeSourceIds,
        normativeSourceId: row.normativeSourceId,
        normativeRateIds: row.normativeRateIds,
        normativeSourceRoles: normativeBinding.sourceRoles,
        kgStatusSourceIds: normativeBinding.kgStatusSourceIds,
        kgApplicabilitySourceIds: normativeBinding.kgApplicabilitySourceIds,
        constructionNormLocatorIds: normativeBinding.constructionNormLocatorIds,
        normativeApplicability: normativeBinding.applicability,
        normativeLocatorReviewStatus: normativeBinding.locatorReviewStatus,
        roundingRule: row.roundingRule,
        wasteRule: row.wasteRule,
        procurementEligibility: row.procurementEligibility,
        payable: row.payable,
        formulaGraphId: registration.formulaGraphId,
        executableAsphaltProfile: executable,
        certificationClass: resolvedProfile.certificationClass,
        applicabilityBlockers,
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
      normSourceId: row.normativeSourceId,
      normSourceTitle: "Официальный нормативный и сметно-ресурсный пакет работы",
      normVersion: registration.migrationVersion,
      normReviewStatus: normativeBinding.locatorReviewStatus,
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: "Цена не заполнена",
      confidence: "medium",
      addedBy: "ai",
      materialKey: row.category === "material" ? row.rowId : null,
      rateKey: `${registration.workId}:${row.rowId}`,
      });
    }),
  };
  recordRoadworksWaveABuildTiming("ITEMS_READY", buildStartedAt);
  // The Roadworks Wave A compiler owns the exact P0 schema. The shared open-world
  // contract may add generic clarifications (geometry, photos, address, etc.) that
  // do not belong to this selected catalog operation. Preserve the compiler's
  // exact result so a fully supplied passport cannot be turned back into a
  // NEEDS_REQUIRED_INPUTS draft after a successful compile.
  const exactMissingData = [...draft.missingData];
  const contractedDraft = applyProfessionalBoqRuntimeContract(draft, { prompt: input.rawInput });
  contractedDraft.missingData = exactMissingData;
  recordRoadworksWaveABuildTiming("CONTRACT_READY", buildStartedAt);
  return {
    draft: contractedDraft,
    registration,
  };
}
