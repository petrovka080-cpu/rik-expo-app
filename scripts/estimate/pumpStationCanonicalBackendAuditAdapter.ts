import acceptanceFixture from "../../data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json";
import type { ConsumerRepairAiDraft, ConsumerRepairItemType } from "../../src/lib/consumerRequests/consumerRequestTypes";
import { applyUserParamPatch } from "../../src/lib/estimate/applyUserParamPatch";
import { compareEstimateDraftRevisions } from "../../src/lib/estimate/compareEstimateDraftRevisions";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionDiff,
  EstimateDraftRevisionParam,
  EstimateDraftRevisionSource,
} from "../../src/lib/estimate/estimateDraftRevisionContract";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import {
  evaluateR4A6PumpStationRows,
  R4_A6_PUMP_STATION_METHOD_ID,
  R4_A6_PUMP_STATION_PARAMETERS,
  type R4A6PumpRow,
} from "../../src/lib/estimate/r4A6PumpStationProfessional";
import type { ProfessionalWorkPassport } from "../../src/lib/estimate/workPassportContract";
import type { UserParamPatchOperation } from "../../src/lib/estimate/validateUserParamPatch";

const AUDIT_BACKEND_VERSION = "r4-a8-pump-station-canonical-backend-audit-v1";

type PumpStationAuditRevisionInput = {
  passport: ProfessionalWorkPassport;
  estimateDraftId: string;
  rawInput: string;
  createdAt: string;
  revisionIndex?: number;
  previousRevisionId?: string | null;
  source?: EstimateDraftRevisionSource;
  paramOverrides?: EstimateDraftRevision["params"];
  assumptionOverrides?: EstimateDraftRevision["assumptions"];
  changedParamKey?: string | null;
  artifacts?: EstimateDraftRevision["artifacts"];
};

export function isPumpStationCanonicalBackendPassport(passport: ProfessionalWorkPassport): boolean {
  return ["pumping_station", "booster_pumping_station"].includes(passport.workKey) &&
    passport.boqRecipe.rowCount === acceptanceFixture.expectedRowCount &&
    passport.boqRecipe.allRows.every((row) => row.normFamilyId === R4_A6_PUMP_STATION_METHOD_ID);
}

function itemType(rowType: R4A6PumpRow["rowType"]): ConsumerRepairItemType {
  if (rowType === "material") return "material";
  if (rowType === "labor") return "work";
  return "service";
}

function professionalBoqCategory(row: R4A6PumpRow): string {
  if (row.category === "labor") return "work";
  if (row.category === "delivery") return "transport";
  return row.category;
}

function parameterValues(
  overrides: EstimateDraftRevision["params"] | undefined,
): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = { ...acceptanceFixture.parameters };
  for (const [key, param] of Object.entries(overrides ?? {})) values[key] = param.value;
  return values;
}

function auditParams(
  values: Readonly<Record<string, string | number | boolean>>,
  createdAt: string,
  overrides: EstimateDraftRevision["params"] | undefined,
): Record<string, EstimateDraftRevisionParam> {
  return Object.fromEntries(R4_A6_PUMP_STATION_PARAMETERS.flatMap((parameter) => {
    const value = values[parameter.parameterId];
    if (value == null) return [];
    const override = overrides?.[parameter.parameterId];
    return [[parameter.parameterId, override ?? {
      value,
      ...(parameter.unitId ? { canonicalUnit: parameter.unitId } : {}),
      source: "user_input" as const,
      sourceText: `${AUDIT_BACKEND_VERSION}:${acceptanceFixture.sourceClassification}`,
      lastChangedAt: createdAt,
    }]];
  }));
}

function buildPumpStationAuditDraft(input: {
  passport: ProfessionalWorkPassport;
  rawInput: string;
  values: Readonly<Record<string, string | number | boolean>>;
}): ConsumerRepairAiDraft {
  const compiled = evaluateR4A6PumpStationRows(input.values);
  if (compiled.length !== acceptanceFixture.expectedRowCount) {
    throw new Error(`PUMP_STATION_AUDIT_BACKEND_COMPILE_FAILED:${input.passport.templateId}:${compiled.length}`);
  }
  const recipeByRowId = new Map(input.passport.boqRecipe.allRows.map((row) => [row.rowId, row]));
  const parameterSnapshot = { ...input.values };
  const parameterKeys = R4_A6_PUMP_STATION_PARAMETERS
    .map((parameter) => parameter.parameterId)
    .filter((key) => parameterSnapshot[key] != null);
  const professionalDomainParameterMetadata = Object.fromEntries(R4_A6_PUMP_STATION_PARAMETERS.map((parameter) => [
    parameter.parameterId,
    {
      labelRu: parameter.titleRu,
      unit: parameter.unitId,
      tier: parameter.tier,
      sourceId: `${AUDIT_BACKEND_VERSION}:${acceptanceFixture.sourceClassification}`,
    },
  ]));
  const commonSource = {
    canonicalBackendProjectionV1: true,
    domainId: "water-supply-r4-a8",
    catalogId: input.passport.templateId,
    workKey: input.passport.workKey,
    canonicalTechnologyId: R4_A6_PUMP_STATION_METHOD_ID,
    professionalEstimatePassportId: input.passport.templateId,
    parameterSchemaId: input.passport.parameterSchema.schemaId,
    parameterKeys,
    parameterSnapshot,
    parameterSourceTypes: Object.fromEntries(parameterKeys.map((key) => [key, "SYNTHETIC_ACCEPTANCE_FIXTURE"])),
    assumptionKeys: [],
    professionalDomainParameterMetadata,
    projectAssemblyId: `${R4_A6_PUMP_STATION_METHOD_ID}:full-assembly`,
    formulaGraphVersion: `${R4_A6_PUMP_STATION_METHOD_ID}:formula-graph:v1`,
    canonicalModelId: R4_A6_PUMP_STATION_METHOD_ID,
    canonicalModelVersion: "2026-09-04",
  };
  return {
    titleRu: input.passport.localizedNameRu,
    summaryRu: `${input.passport.localizedNameRu}: ${compiled.length} canonical backend BOQ rows`,
    repairType: input.passport.workKey,
    selectedWork: {
      selectedCatalogWorkId: input.passport.templateId,
      selectedWorkKey: input.passport.workKey,
      selectedWorkTitleRu: input.passport.localizedNameRu,
      selectedWorkCategoryKey: input.passport.category,
      selectedWorkCategoryTitleRu: input.passport.category,
      selectedWorkRawInput: input.rawInput,
      selectedWorkSource: "user_selected",
      selectedWorkResolverReGuessed: false,
    },
    items: compiled.map((row) => {
      const recipe = recipeByRowId.get(row.rowId);
      if (!recipe) throw new Error(`PUMP_STATION_AUDIT_RECIPE_ROW_MISSING:${row.rowId}`);
      return {
        itemType: itemType(row.rowType),
        titleRu: row.titleRu,
        quantity: row.quantity,
        unit: row.unitId,
        unitLabel: row.unitId,
        unitPrice: null,
        currency: "KGS",
        source: "reference_price_book" as const,
        category: row.category,
        sourceId: R4_A6_PUMP_STATION_METHOD_ID,
        sourceLabel: row.sourceLocator,
        formulaId: recipe.formulaId,
        quantityFormula: row.expression,
        calculationTrace: `formula=${row.expression}; scopeOwner=${row.scopeOwner}`,
        sourceParameters: {
          ...commonSource,
          rowCode: row.rowId,
          professionalBoqCategory: professionalBoqCategory(row),
          includedInProcurement: row.procurementEligible && row.rowType !== "labor",
          semanticOwner: row.scopeOwner,
          specificationRu: row.specificationRu,
          inclusionAst: row.inclusionAst,
          affectedBy: R4_A6_PUMP_STATION_PARAMETERS
            .map((parameter) => parameter.parameterId)
            .filter((key) => new RegExp(`(^|[^a-zA-Z0-9_])${key}($|[^a-zA-Z0-9_])`).test(row.expression)),
        },
        templateId: input.passport.templateId,
        templateVersion: "2026-09-04",
        normId: recipe.normId,
        normFamilyId: recipe.normFamilyId,
        normSourceId: recipe.normSourceId,
        normSourceTitle: recipe.normSourceTitle,
        normVersion: recipe.normVersion,
        normReviewStatus: recipe.normReviewStatus,
        priceStatus: "PRICE_MISSING" as const,
        priceSource: "reference_price_book" as const,
        materialKey: row.rowType === "material" ? row.scopeOwner : null,
        rateKey: recipe.normId,
        confidence: "high" as const,
        addedBy: "system" as const,
      };
    }),
    missingData: [],
    dangerousDiyBlocked: false,
  };
}

/** Audit-only projection of the accepted R4-A8 backend pump definition. */
export function createPumpStationCanonicalBackendAuditRevision(
  input: PumpStationAuditRevisionInput,
): EstimateDraftRevision {
  if (!isPumpStationCanonicalBackendPassport(input.passport)) {
    throw new Error(`PUMP_STATION_AUDIT_PASSPORT_MISMATCH:${input.passport.templateId}`);
  }
  const values = parameterValues(input.paramOverrides);
  const params = auditParams(values, input.createdAt, input.paramOverrides);
  const draft = buildPumpStationAuditDraft({
    passport: input.passport,
    rawInput: input.rawInput,
    values,
  });
  return createEstimateDraftRevision({
    estimateDraftId: input.estimateDraftId,
    previousRevisionId: input.previousRevisionId,
    rawInput: input.rawInput,
    selectedWorkKey: input.passport.workKey,
    selectedTemplateId: input.passport.templateId,
    selectedTemplateName: input.passport.localizedNameRu,
    currency: "KGS",
    countryCode: "KG",
    source: input.source,
    createdAt: input.createdAt,
    revisionIndex: input.revisionIndex,
    paramOverrides: params,
    assumptionOverrides: input.assumptionOverrides,
    changedParamKey: input.changedParamKey,
    artifacts: input.artifacts,
    prebuiltExactDraft: draft,
  });
}

export function recalculatePumpStationCanonicalBackendAuditRevision(input: {
  passport: ProfessionalWorkPassport;
  previous: EstimateDraftRevision;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  createdAt: string;
  revisionIndex: number;
}): { revision: EstimateDraftRevision; diff: EstimateDraftRevisionDiff } {
  const patch = parseUserParamPatch({
    revision: input.previous,
    operation: input.operation,
    paramKey: input.paramKey,
    rawValue: input.rawValue,
  });
  const patched = applyUserParamPatch(input.previous, patch, input.createdAt);
  const source: EstimateDraftRevisionSource = input.operation === "add_param"
    ? "param_add"
    : input.operation === "replace_assumption"
      ? "assumption_override"
      : "param_edit";
  const revision = createPumpStationCanonicalBackendAuditRevision({
    passport: input.passport,
    estimateDraftId: input.previous.estimateDraftId,
    previousRevisionId: input.previous.revisionId,
    rawInput: input.previous.rawInput,
    source,
    createdAt: input.createdAt,
    revisionIndex: input.revisionIndex,
    paramOverrides: patched.params,
    assumptionOverrides: patched.assumptions,
    changedParamKey: input.paramKey,
  });
  return {
    revision,
    diff: compareEstimateDraftRevisions(input.previous, revision),
  };
}
