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
import type { ProfessionalWorkPassport } from "../../src/lib/estimate/workPassportContract";
import {
  compileStripFoundationEstimate,
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_GOLD_INPUT,
  STRIP_FOUNDATION_INPUTS,
  type StripFoundationCategory,
  type StripFoundationInputValue,
} from "../../src/lib/estimate/v4/reinforcedConcreteStripFoundationR1";
import type { UserParamPatchOperation } from "../../src/lib/estimate/validateUserParamPatch";

const AUDIT_BACKEND_VERSION = "r6-strip-foundation-canonical-backend-audit-v1";

type StripFoundationAuditRevisionInput = {
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

export function isStripFoundationCanonicalBackendPassport(
  passport: ProfessionalWorkPassport,
): boolean {
  return passport.workKey === "strip_foundation" &&
    passport.contentPack.calculatorId === REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.definitionId;
}

function itemType(category: StripFoundationCategory): ConsumerRepairItemType {
  if (category === "material") return "material";
  if (category === "construction_work") return "work";
  return "service";
}

function professionalBoqCategory(category: StripFoundationCategory): string {
  if (category === "construction_work") return "work";
  if (category === "machine_equipment") return "equipment";
  if (category === "delivery") return "transport";
  return "material";
}

function parameterValues(
  overrides: EstimateDraftRevision["params"] | undefined,
): Record<string, StripFoundationInputValue> {
  const values: Record<string, StripFoundationInputValue> = { ...STRIP_FOUNDATION_GOLD_INPUT };
  for (const [key, param] of Object.entries(overrides ?? {})) values[key] = param.value;
  return values;
}

function auditParams(
  values: Readonly<Record<string, StripFoundationInputValue>>,
  createdAt: string,
  overrides: EstimateDraftRevision["params"] | undefined,
): Record<string, EstimateDraftRevisionParam> {
  return Object.fromEntries(STRIP_FOUNDATION_INPUTS.flatMap((parameter) => {
    const value = values[parameter.parameterId];
    if (value == null) return [];
    const override = overrides?.[parameter.parameterId];
    return [[parameter.parameterId, override ?? {
      value,
      ...(parameter.unitId ? { canonicalUnit: parameter.unitId } : {}),
      source: "user_input" as const,
      sourceText: `${AUDIT_BACKEND_VERSION}:sealed-gold-input`,
      lastChangedAt: createdAt,
    }]];
  }));
}

function buildStripFoundationAuditDraft(input: {
  passport: ProfessionalWorkPassport;
  rawInput: string;
  values: Readonly<Record<string, StripFoundationInputValue>>;
}): ConsumerRepairAiDraft {
  const compiled = compileStripFoundationEstimate(input.values);
  const formulaById = new Map(STRIP_FOUNDATION_FORMULAS.map((formula) => [formula.formulaId, formula]));
  const parameterSnapshot = { ...input.values };
  const parameterKeys = STRIP_FOUNDATION_INPUTS
    .map((parameter) => parameter.parameterId)
    .filter((key) => parameterSnapshot[key] != null);
  const professionalDomainParameterMetadata = Object.fromEntries(STRIP_FOUNDATION_INPUTS.map((parameter) => [
    parameter.parameterId,
    {
      labelRu: parameter.titleRu,
      unit: parameter.unitId,
      tier: parameter.required ? "P0" : "P1",
      sourceId: `${AUDIT_BACKEND_VERSION}:${parameter.sourceRole.toLowerCase()}`,
    },
  ]));
  const commonSource = {
    canonicalBackendProjectionV1: true,
    domainId: "concrete-r6",
    catalogId: input.passport.templateId,
    workKey: input.passport.workKey,
    canonicalTechnologyId: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.definitionId,
    professionalEstimatePassportId: input.passport.templateId,
    parameterSchemaId: input.passport.parameterSchema.schemaId,
    parameterKeys,
    parameterSnapshot,
    parameterSourceTypes: Object.fromEntries(parameterKeys.map((key) => [key, "AUDIT_CONFIRMED_INPUT"])),
    assumptionKeys: [],
    professionalDomainParameterMetadata,
    projectAssemblyId: `${REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.definitionId}:full-assembly`,
    formulaGraphVersion: `${REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.definitionId}:formula-graph:r4-a10`,
    canonicalModelId: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.definitionId,
    canonicalModelVersion: "R4-A10",
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
      const formula = formulaById.get(row.formulaId);
      if (!formula) throw new Error(`STRIP_FOUNDATION_AUDIT_FORMULA_MISSING:${row.formulaId}`);
      return {
        itemType: itemType(row.category),
        titleRu: row.canonicalRuName,
        quantity: Number(row.evaluatedQuantity),
        unit: row.normalizedUom,
        unitLabel: row.normalizedUom,
        unitPrice: null,
        currency: "KGS",
        source: "reference_price_book" as const,
        category: row.category,
        sourceId: row.normSource.sourceKey,
        sourceLabel: `${row.normSource.documentCode}: ${row.normSource.locator}`,
        formulaId: row.formulaId,
        quantityFormula: formula.source,
        calculationTrace: `${formula.formulaId}=${formula.source}`,
        sourceParameters: {
          ...commonSource,
          rowCode: row.rowId,
          professionalBoqCategory: professionalBoqCategory(row.category),
          includedInProcurement: row.procurementMode !== "none",
          semanticOwner: row.semanticOwnerId,
          resourceId: row.resourceId,
          rateItemId: row.rateItemId,
          costOwner: row.costOwner,
          includedInParentRate: row.includedInParentRate,
          procurementMode: row.procurementMode,
          ...(row.professionalPhysicalNormApplicabilityV1
            ? {
              normativeSourceIds: [row.professionalPhysicalNormApplicabilityV1.source_id],
              parameterSourceIds: [row.professionalPhysicalNormApplicabilityV1.source_id],
              professionalPhysicalNormApplicabilityV1: row.professionalPhysicalNormApplicabilityV1,
            }
            : {}),
        },
        templateId: input.passport.templateId,
        templateVersion: "R4-A10",
        normId: row.rateItemId,
        normFamilyId: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.definitionId,
        normSourceId: row.normSource.sourceKey,
        normSourceTitle: row.normSource.documentCode,
        normVersion: row.normSource.artifactSha256 ?? "R4-A10",
        normReviewStatus: "reviewed",
        priceStatus: "PRICE_MISSING" as const,
        priceSource: "reference_price_book" as const,
        materialKey: row.category === "material" ? row.resourceId : null,
        rateKey: row.rateItemId,
        confidence: "high" as const,
        addedBy: "system" as const,
      };
    }),
    missingData: [],
    dangerousDiyBlocked: false,
  };
}

/** Audit-only projection of the persisted R6 backend definition. */
export function createStripFoundationCanonicalBackendAuditRevision(
  input: StripFoundationAuditRevisionInput,
): EstimateDraftRevision {
  if (!isStripFoundationCanonicalBackendPassport(input.passport)) {
    throw new Error(`STRIP_FOUNDATION_AUDIT_PASSPORT_MISMATCH:${input.passport.templateId}`);
  }
  const values = parameterValues(input.paramOverrides);
  const params = auditParams(values, input.createdAt, input.paramOverrides);
  const draft = buildStripFoundationAuditDraft({
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

export function recalculateStripFoundationCanonicalBackendAuditRevision(input: {
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
  const revision = createStripFoundationCanonicalBackendAuditRevision({
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
