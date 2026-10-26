import { canonicalPurchaseSupplyBlocksV1, parseCanonicalExactPurchaseQuantityV1 } from "./canonicalPurchaseSupplyReadinessV1";
import { canonicalEstimateOperationReference } from "./canonicalEstimateOperationComposition";
import { stableStructuredEstimateHash } from "../../estimateStructuredPipeline/buildStructuredEstimatePayload";
import type {
  StructuredEstimatePayload,
  StructuredEstimateRow,
  StructuredEstimateSection,
} from "../../estimateStructuredPipeline/structuredEstimateTypes";
import type { GlobalEstimateSectionType, GlobalEstimateResult } from "../../ai/globalEstimate/globalEstimateTypes";
import type { EstimatePresentationViewModel } from "../../ai/estimatePresentation";
import { buildStructuredEstimateForemanBinding } from "../../estimateStructuredPipeline/structuredEstimateForemanBinding";
import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "./contracts";
import {
  CANONICAL_ESTIMATE_PRELIMINARY_REVISION_CONTRACT_VERSION,
  isCanonicalEstimateRevisionContractVersion,
} from "./canonicalEstimateRevisionWriter";
import { normalizeCanonicalEstimateRowCategory } from "./canonicalEstimateRowCategory";
import {
  isCanonicalEstimateParameterRequiredForValues,
  isCanonicalEstimateSourceManagedParameter,
  canonicalEstimateParameterIsOptionalScopeChoice,
} from "./canonicalEstimateParameterSemantics";
import { readCanonicalPhysicalNormEvidenceV1, type CanonicalPhysicalNormProjectionV1 } from "./canonicalPhysicalNormEvidenceV1";
import { canonicalPublicResourcePresentationV1 } from './canonicalPublicResourcePresentationV1';

function sectionType(section: string, category: string): GlobalEstimateSectionType {
  const normalized = normalizeCanonicalEstimateRowCategory(section, category);
  if (normalized === "material") return "materials";
  if (normalized === "equipment") return "equipment";
  if (normalized === "delivery") return "delivery";
  return "labor";
}

function finiteNumber(value: string | null): number | null {
  if (value == null || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function publicNormativeTrace(row: CanonicalEstimateRevisionRowView): Record<string, unknown>[] {
  return row.normativeTrace.flatMap((value) => {
    const trace = record(value);
    if (!trace) return [];
    const documentCode = String(trace.document_code ?? trace.sourceId ?? trace.source_id ?? "").trim();
    const exactLocator = String(trace.exact_locator ?? trace.exactLocator ?? "").trim();
    return [{
      ...trace,
      document_code: documentCode,
      exact_locator: exactLocator,
    }];
  });
}

function sectionTitle(type: GlobalEstimateSectionType): string {
  if (type === "materials") return "Материалы";
  if (type === "equipment") return "Оборудование";
  if (type === "delivery") return "Доставка";
  if (type === "tax") return "Налоги";
  return "Работы и услуги";
}

function canonicalProjectMeasure(
  revision: CanonicalEstimateRevisionView,
  rows: readonly CanonicalEstimateRevisionRowView[],
): { quantity: number; unit: string } {
  if (!isCanonicalEstimateRevisionContractVersion(revision.revisionContractVersion)) {
    return {
      quantity: finiteNumber(rows[0]?.quantity) ?? 0,
      unit: rows[0]?.unitId ?? "item",
    };
  }

  const parameterId = String(revision.primaryMeasureParameterId ?? "").trim();
  const rawValue = String(revision.primaryMeasureValue ?? "").trim();
  const quantity = finiteNumber(rawValue);
  const resolvedParameter = parameterId ? revision.parameters[parameterId] : null;
  if (
    revision.revisionContractVersion === CANONICAL_ESTIMATE_PRELIMINARY_REVISION_CONTRACT_VERSION
    && parameterId
    && quantity == null
    && (revision.preliminaryNeeds ?? []).some((need) => need.missingParameterIds.includes(parameterId))
  ) {
    return {
      quantity: 0,
      unit: String(revision.primaryMeasureUnitId ?? "").trim() || "item",
    };
  }
  if (!parameterId || quantity == null
    || finiteNumber(resolvedParameter == null ? null : String(resolvedParameter)) !== quantity) {
    throw Object.assign(new Error("canonical revision primary measure identity is invalid"), {
      code: "CANONICAL_REVISION_IDENTITY_INVALID",
    });
  }
  return {
    quantity,
    unit: String(revision.primaryMeasureUnitId ?? "").trim() || "item",
  };
}

export function adaptCanonicalRevisionToStructuredEstimate(input: {
  catalog: CanonicalEstimateCatalogItem;
  revision: CanonicalEstimateRevisionView;
  rows: CanonicalEstimateRevisionRowView[];
  inputText?: string;
  assumptions?: string[];
}, projectPhysicalNorm: CanonicalPhysicalNormProjectionV1 = readCanonicalPhysicalNormEvidenceV1): StructuredEstimatePayload {
  const sourceRequestText = input.revision.sourceRequestText?.trim()
    || input.inputText?.trim()
    || input.catalog.titleRu;
  const displayTitleRu = input.revision.displayTitleRu?.trim()
    || input.catalog.titleRu;
  const sectionOrder: GlobalEstimateSectionType[] = ["materials", "labor", "equipment", "delivery"];
  const currency = input.revision.currencyCode;
  const projectMeasure = canonicalProjectMeasure(input.revision, input.rows);
  const rowsById = new Map(input.rows.map(row => [row.rowId, row]));
  const needsById = new Map((input.revision.preliminaryNeeds ?? []).map(need => [need.rowId, need]));
  const includedCostOwnerTitle = (row: CanonicalEstimateRevisionRowView): string | null => {
    const visited = new Set([row.rowId]);
    let current = row;
    while (true) {
      const graph = record(current.calculationTrace?.resourceGraph);
      const ownerId = graph?.costTreatment === 'INCLUDED_IN_RESOURCE_ROWS' ? graph.includedInResourceOwnerRowId : null;
      if (typeof ownerId !== 'string' || visited.has(ownerId)) return null;
      visited.add(ownerId);
      const owner = rowsById.get(ownerId);
      if (!owner) {
        const need = needsById.get(ownerId);
        if (need?.selected === true && (need.costTreatment === 'OWN_COST' || need.commercialRateCoverage?.active === true)) {
          return canonicalPublicResourcePresentationV1({ titleRu: need.titleRu, descriptor: need.publicResourcePresentation,
            manualTitleOverride: need.manualTitleOverride })?.nameRu ?? need.titleRu;
        }
        return null;
      }
      if (owner.includedInEstimate) return canonicalPublicResourcePresentationV1({ titleRu: owner.titleRu,
        descriptor: record(owner.calculationTrace?.resourceGraph)?.publicResourcePresentationV1,
        manualTitleOverride: owner.calculationTrace?.manualTitleOverride === true })?.nameRu ?? owner.titleRu;
      current = owner;
    }
  };
  const rows: StructuredEstimateRow[] = input.rows.map((row, index) => {
    const normalizedCategory = normalizeCanonicalEstimateRowCategory(row.section, row.category);
    const type = sectionType(row.section, row.category);
    const exactQuantity = parseCanonicalExactPurchaseQuantityV1(row.calculationTrace.exactPurchaseQuantityV1);
    const supplyBlocks = canonicalPurchaseSupplyBlocksV1(row.calculationTrace.purchaseSupplyBlocksV1);
    const quantity = finiteNumber(row.quantity) ?? 0;
    const unitPrice = finiteNumber(row.unitPrice);
    const total = finiteNumber(row.amount);
    const normativeTrace = publicNormativeTrace(row);
    const parameterDependencies = Array.isArray(row.calculationTrace?.inputParameterIds)
      ? row.calculationTrace.inputParameterIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    const resourceGraph = record(row.calculationTrace?.resourceGraph);
    const commercialRate = record(resourceGraph?.commercialCostCoverageOwnerDecisionV1);
    const costTreatment = String(resourceGraph?.costTreatment ?? "").trim() || null;
    const nonPayableComposition = [
      "INCLUDED_IN_RESOURCE_ROWS",
      "INFORMATIONAL_SCOPE",
      "CONTROL_OR_DOCUMENT",
    ].includes(costTreatment ?? "");
    const physicalNormApplicability = projectPhysicalNorm({
      revision: input.revision,
      row,
    });
    const primaryNormativeSource = physicalNormApplicability?.status === "APPLIED"
      ? normativeTrace.find((trace) => String(trace.source_id ?? trace.sourceId ?? trace.document_code ?? "")
        === physicalNormApplicability.source_id) ?? normativeTrace[0]
      : normativeTrace[0];
    return {
      rowId: row.rowId,
      sectionNumber: String(sectionOrder.indexOf(type) + 1),
      sectionTitle: sectionTitle(type),
      sectionType: type,
      rowNumber: String(index + 1),
      code: row.rowId,
      visibleName: row.titleRu,
      quantity,
      unit: row.unitId,
      displayQuantity: exactQuantity ? exactQuantity.manualQuantityText ?? exactQuantity.quantityText ?? "—" : row.quantity == null ? "—" : String(row.quantity),
      unitPrice,
      displayUnitPrice: unitPrice == null ? "Цена требует уточнения" : String(row.unitPrice),
      total,
      displayTotal: total == null ? "Итог после уточнения цены" : String(row.amount),
      currency,
      confidence: "high",
      ...(unitPrice != null && row.priceSource?.kind === "MANUAL" ? {
        priceTrace: {
          price_status: "priced" as const,
          price_source_type: "manual_override" as const,
          price_source_id: null,
          currency,
          unit_price: unitPrice,
          price_unit: row.unitId,
          price_unit_conversion: null,
          price_valid_at: null,
          supplier_id: null,
          region: null,
          city: null,
          confidence: "low" as const,
          is_manual_override: true,
          override_reason: String(record(row.priceSource.resolutionTrace.provenance)?.reason ?? "") || null,
          selected_quantity: quantity,
          selected_amount: total,
          effective_unit_price: unitPrice,
          visible_source_label: "Цена введена пользователем",
          calculation: `${quantity} × ${unitPrice}`,
          missing_reason: null,
        },
      } : {}),
      visibleSourceLabel: commercialRate?.active === true ? 'Явно выбранный состав расценки' : "Утверждённая технологическая карта",
      sourceId: commercialRate?.active === true ? 'canonical-commercial-payment-scope' : "canonical-approved-baseline",
      formulaId: String(row.calculationTrace?.formulaId ?? "") || null,
      quantityFormula: null,
      calculationTrace: JSON.stringify(row.calculationTrace),
      sourceParameters: {
        rowCode: row.rowId,
        canonicalSourceTitleRu: row.titleRu,
        canonicalPublicResourcePresentationV1: resourceGraph?.publicResourcePresentationV1 ?? null,
        canonicalManualTitleOverride: row.calculationTrace?.manualTitleOverride === true,
        ...(row.calculationTrace?.derivedQuantityEditPolicy == null ? {} : {
          canonicalDerivedQuantityEditPolicyV1: row.calculationTrace.derivedQuantityEditPolicy,
        }),
        canonicalOperationComposition: canonicalEstimateOperationReference(resourceGraph?.operationCompositionV1),
        ...(resourceGraph?.originalOperationCompositionV1 == null ? {} : {canonicalSourceOperationComposition:resourceGraph.originalOperationCompositionV1}),
        ...(resourceGraph?.scopeRequirementDecisionV1 == null ? {} : {canonicalScopeRequirementDecisionV1:resourceGraph.scopeRequirementDecisionV1}),
        ...(resourceGraph?.compositionSelectionDecisionV1 == null ? {} : {canonicalCompositionSelectionDecisionV1:resourceGraph.compositionSelectionDecisionV1}),
        ...(row.calculationTrace?.physicalScopeExcludedV1 == null ? {} : {canonicalPhysicalScopeExcludedV1:row.calculationTrace.physicalScopeExcludedV1}),
        canonicalPurchaseBalance: row.calculationTrace.purchaseBalance,
        ...(supplyBlocks.length ? {canonicalPurchaseSupplyBlocksV1:supplyBlocks} : {}),
        ...(exactQuantity ? {canonicalExactPurchaseQuantityV1:exactQuantity} : {}),
        canonicalMachineHourPriceCoverageV1:row.calculationTrace.machineHourPriceCoverageV1??null,
        canonicalPriceResolutionTrace:row.priceSource?.resolutionTrace??null,
        canonicalPriceSourceKind:row.priceSource?.kind??null,
        canonicalPriceSnapshotId:row.priceSource?.snapshotId??null,
        canonicalPurchaseRequirement: row.calculationTrace.purchaseRequirementV1,
        normativeTrace: row.normativeTrace,
        normativeRowTraceV3: normativeTrace,
        priceRouteV3: {
          kind: nonPayableComposition
            ? "NOT_APPLICABLE_INFORMATIONAL_OUTPUT"
            : unitPrice == null
              ? "CANONICAL_BACKEND_PRICE_MISSING"
              : "CANONICAL_BACKEND_ROW_PRICE",
        },
        smartEstimateProjectionV2: {
          progressiveDisclosure: true,
          stage: row.section,
          category: normalizedCategory,
          sourceCategory: row.category,
          initiallyCollapsed: false,
          rowReachable: true,
          formulaExplanation: row.calculationTrace,
          normativeExplanation: normativeTrace,
          parameterDependencies,
          parameterToCostDelta: "quantity_delta * verified_unit_price",
        },
        rowSha256: row.rowSha256,
        canonicalBackendRevisionId: input.revision.revisionId,
        canonicalBackendReleaseId: input.revision.releaseId,
        canonicalBackendCatalogId: input.revision.catalogId,
        canonicalBackendOwnershipStatus: row.ownershipStatus,
        canonicalCostTreatment: costTreatment,
        canonicalIncludedCostOwnerTitleRu: includedCostOwnerTitle(row),
        canonicalCommercialCostCoverageDecisionV1: resourceGraph?.commercialCostCoverageDecisionV1 ?? null,
        canonicalCommercialRateCoverageV1: resourceGraph?.commercialCostCoverageOwnerDecisionV1 ?? null,
        payable: costTreatment == null
          ? row.includedInEstimate
          : !nonPayableComposition,
        includedInEstimate: row.includedInEstimate,
        includedInProcurement: row.includedInProcurement,
        manualQuantityOverride: row.calculationTrace?.manualQuantityOverride === true,
        calculatedQuantityBeforeOverride:
          row.calculationTrace?.calculatedQuantityBeforeOverride ?? null,
        ...(physicalNormApplicability == null ? {} : {
          professionalPhysicalNormApplicabilityV1: physicalNormApplicability,
        }),
      },
      normId: String(primaryNormativeSource?.norm_id ?? primaryNormativeSource?.normId ?? "").trim() || null,
      normSourceId: String(primaryNormativeSource?.document_code ?? "").trim() || null,
      normSourceTitle: String(primaryNormativeSource?.source_title
        ?? primaryNormativeSource?.document_code ?? "").trim() || null,
      normVersion: String(primaryNormativeSource?.source_document_version
        ?? primaryNormativeSource?.normVersion ?? "").trim() || null,
      catalogItemId: null,
      includedInEstimate: row.includedInEstimate,
      includedInProcurement: row.includedInProcurement,
      optional: !row.includedInEstimate && !nonPayableComposition,
      editable: row.ownershipStatus !== "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
    };
  });
  const sections: StructuredEstimateSection[] = sectionOrder.map((type) => ({
    sectionNumber: String(sectionOrder.indexOf(type) + 1),
    title: sectionTitle(type),
    type,
    rows: rows.filter((row) => row.sectionType === type),
  })).filter((section) => section.rows.length > 0);
  const grandTotal = finiteNumber(String(input.revision.totals.amount ?? "0")) ?? rows.reduce((sum, row) => sum + (row.total ?? 0), 0);
  const totals = {
    materialsTotal: rows.filter((row) => row.sectionType === "materials" && row.includedInEstimate).reduce((sum, row) => sum + (row.total ?? 0), 0),
    laborTotal: rows.filter((row) => row.sectionType === "labor" && row.includedInEstimate).reduce((sum, row) => sum + (row.total ?? 0), 0),
    equipmentTotal: rows.filter((row) => row.sectionType === "equipment" && row.includedInEstimate).reduce((sum, row) => sum + (row.total ?? 0), 0),
    deliveryTotal: rows.filter((row) => row.sectionType === "delivery" && row.includedInEstimate).reduce((sum, row) => sum + (row.total ?? 0), 0),
    taxTotal: 0,
    grandTotal,
    currency,
    displayMaterialsTotal: "",
    displayLaborTotal: "",
    displayTaxTotal: "0",
    displayGrandTotal: String(grandTotal),
  };
  const tax = {
    taxType: "unknown" as const,
    taxLabel: "Налог определяется проектом",
    taxableBase: grandTotal,
    taxAmount: 0,
    included: false,
    requiresLocationPrecision: false,
  };
  const presentationRows = rows.map((row) => ({
    ...row,
    name: row.visibleName,
    sourceLabel: row.visibleSourceLabel,
    unitPrice: row.unitPrice ?? 0,
    total: row.total ?? 0,
    priceStatus: row.unitPrice == null ? "missing" as const : "resolved" as const,
    sourceEvidence: [],
  }));
  const presentation = {
    estimateId: input.revision.revisionId,
    workKey: input.catalog.workKey,
    workTitle: displayTitleRu,
    workCategory: input.catalog.domain,
    originalText: sourceRequestText,
    localContext: {
      countryCode: "KG",
      locationLabel: "Кыргызстан",
      currency,
      taxLabel: tax.taxLabel,
      confidence: "high" as const,
      displayLine: `KG · ${currency}`,
    },
    assumptions: input.assumptions ?? [],
    sections: sections.map((section) => ({ ...section, rows: presentationRows.filter((row) => row.sectionType === section.type) })),
    rows: presentationRows,
    totals,
    tax,
    sourceConfidence: "high" as const,
    sourceLabels: ["Утверждённая технологическая карта"],
    costIncreaseFactors: [],
    clarifyingQuestions: [],
    actions: [],
  } as unknown as EstimatePresentationViewModel;
  const sourceEstimate = {
    estimateId: input.revision.revisionId,
    locale: {
      countryCode: "KG", city: "Bishkek", addressPrecision: "city", language: "ru",
      locale: "ru-KG", unitSystem: "metric", currency, taxMode: "unknown",
      taxIncludedByDefault: false, source: "project_address", confidence: "high",
    },
    work: { workKey: input.catalog.workKey, title: displayTitleRu, category: input.catalog.domain },
    input: { volume: projectMeasure.quantity, unit: projectMeasure.unit, originalText: sourceRequestText },
    assumptions: input.assumptions ?? [], sections: [], tax, totals, regionalRisks: [], costIncreaseFactors: [],
    clarifyingQuestions: [], sources: [], confidence: "high", requiresReview: false,
  } as unknown as GlobalEstimateResult;
  const fingerprint = input.revision.checksumSha256 || stableStructuredEstimateHash(rows);
  return {
    version: "structured-estimate-v1",
    id: input.revision.revisionId,
    source: "foreman",
    inputText: sourceRequestText,
    estimateId: input.revision.revisionId,
    workKey: input.catalog.workKey,
    workTitle: displayTitleRu,
    workCategory: input.catalog.domain,
    locale: sourceEstimate.locale,
    sourceEstimate,
    classification: { status: "accepted", workKey: input.catalog.workKey, domainKey: input.catalog.domain, titleRu: displayTitleRu, confidence: 1, evidence: [] },
    quantity: { status: "accepted", quantity: projectMeasure.quantity, unit: projectMeasure.unit, measurementKind: "backend_primary_measure", assumptions: input.assumptions ?? [] },
    boq: {
      sections,
      totals: {
        subtotal: grandTotal,
        pricedSubtotal: grandTotal,
        missingPriceRowsCount: rows.filter((row) => row.unitPrice == null).length,
        allPricedRowsHaveSource: true,
        currency,
        manualPriceRequired: rows.some((row) => row.unitPrice == null),
      },
    },
    presentation,
    pdf: { rows: presentation.rows, tableFormat: true, noMojibakeRequired: true },
    catalogBinding: { searchLabels: rows.map((row) => ({ rowId: row.rowId, visibleQueryRu: row.visibleName, internalKeyVisible: false as const })) },
    assumptions: input.assumptions ?? [], clarifications: [], risks: [], sections, rows, totals, tax, fingerprint,
    canonicalBackend: {
      compilerOwner: "backend",
      revisionId: input.revision.revisionId,
      parentRevisionId: input.revision.parentRevisionId,
      revisionNumber: input.revision.revisionNumber,
      releaseId: input.revision.releaseId,
      catalogId: input.revision.catalogId,
      sourceRequestText: input.revision.sourceRequestText ?? null,
      contentWithdrawalReasonRu: input.revision.contentWithdrawalReasonRu ?? null,
      createdAt: input.revision.createdAt,
      checksumSha256: input.revision.checksumSha256,
      formulaGraphVersion: input.revision.formulaGraphVersion,
      parameterSchemaHash: input.revision.parameterSchemaHash,
      parameters: input.revision.parameters,
      ...(input.revision.roofPrimerPrerequisiteV1?{roofPrimerPrerequisiteV1:input.revision.roofPrimerPrerequisiteV1}:{}),
      ...(input.revision.compositionSelectionV1?{compositionSelectionV1:input.revision.compositionSelectionV1}:{}),
      parameterRequirements: input.catalog.parameterSchema.map((parameter) => ({
        parameterId: parameter.parameterId,
        titleRu: parameter.titleRu,
        unitId: parameter.unitId,
        visibilityRole: parameter.visibilityRole,
        valueSourceRole: parameter.valueSourceRole,
        sourceConfirmationRequired:
          isCanonicalEstimateSourceManagedParameter(parameter)
          && isCanonicalEstimateParameterRequiredForValues(parameter, input.revision.parameters),
        guideShortRu: parameter.guide?.guideShortRu?.trim() || null,
        ...(canonicalEstimateParameterIsOptionalScopeChoice(parameter)?{optionalScopeChoice:true}:{}),
      })),
      preliminaryNeeds: input.revision.preliminaryNeeds ?? [],
    },
    visiblePolicy: { noInternalKeysVisible: true, noGenericRowsVisible: true, controlRowsAreNotPaidItems: true, uiPdfSameRows: true },
    fakeGreenClaimed: false,
  };
}

function compilationRecord(value: unknown): {
  catalog: CanonicalEstimateCatalogItem;
  revision: CanonicalEstimateRevisionView;
  rows: CanonicalEstimateRevisionRowView[];
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const draft = value as Record<string, unknown>;
  if (draft.backendCanonical !== true) return null;
  if (!draft.catalog || typeof draft.catalog !== "object" || Array.isArray(draft.catalog)) return null;
  if (!draft.revision || typeof draft.revision !== "object" || Array.isArray(draft.revision)) return null;
  if (!Array.isArray(draft.rows)) return null;
  const revisionId = String((draft.revision as Record<string, unknown>).revisionId ?? "").trim();
  const releaseId = String((draft.revision as Record<string, unknown>).releaseId ?? "").trim();
  const catalogId = String((draft.catalog as Record<string, unknown>).catalogId ?? "").trim();
  if (!revisionId || !releaseId || !catalogId) return null;
  return {
    catalog: draft.catalog as CanonicalEstimateCatalogItem,
    revision: draft.revision as CanonicalEstimateRevisionView,
    rows: draft.rows as CanonicalEstimateRevisionRowView[],
  };
}

export function adaptCanonicalCompilationToAssistantProjection(
  draft: unknown,
  userId?: string,
  projectPhysicalNorm: CanonicalPhysicalNormProjectionV1 = readCanonicalPhysicalNormEvidenceV1,
) {
  const compilation = compilationRecord(draft);
  if (!compilation) return null;
  const payload = adaptCanonicalRevisionToStructuredEstimate(compilation, projectPhysicalNorm);
  const binding = buildStructuredEstimateForemanBinding(payload, userId);
  return {
    ...binding,
    revisionId: compilation.revision.revisionId,
    releaseId: compilation.revision.releaseId,
  };
}
