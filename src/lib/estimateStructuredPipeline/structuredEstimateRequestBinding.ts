import type { EstimateCatalogBindingResult } from "../ai/globalEstimate/catalogBinding/globalEstimateCatalogBindingTypes";
import { formatEstimateUnitLabel } from "../ai/globalEstimate/formatEstimateUnitLabel";
import { formatRequestEstimateSummary } from "../ai/globalEstimate/formatRequestEstimateSummary";
import type {
  ConsumerRepairAiDraft,
  ConsumerRepairItemSource,
  ConsumerRepairItemType,
  ConsumerRepairSelectedWork,
  ConsumerRepairRequestItem,
} from "../consumerRequests";
import type { StructuredEstimatePayload } from "./structuredEstimateTypes";
import { professionalEstimateRowVisibleName } from "./professionalEstimateRowDisplay";
import { normalizeCanonicalEstimateRowCategory } from "../estimate/backendPlatform/canonicalEstimateRowCategory";

const DANGEROUS_CATEGORIES = new Set(["electrical", "roofing", "demolition", "foundation", "concrete"]);

function itemTypeFor(sectionType: string): ConsumerRepairItemType {
  if (sectionType === "materials") return "material";
  if (sectionType === "labor") return "work";
  if (sectionType === "delivery" || sectionType === "equipment") return "service";
  return "other";
}

function isDangerousEstimate(payload: StructuredEstimatePayload): boolean {
  return payload.sourceEstimate.requiresReview && DANGEROUS_CATEGORIES.has(payload.workCategory);
}

function selectedWorkForRequest(payload: StructuredEstimatePayload): ConsumerRepairSelectedWork | undefined {
  const canonicalCatalogId = payload.rows
    .map((row) => String(row.sourceParameters?.canonicalBackendCatalogId ?? "").trim())
    .find(Boolean);
  return payload.selectedWork
    ? {
        selectedCatalogWorkId: canonicalCatalogId || payload.selectedWork.selectedWorkKey,
        selectedWorkKey: payload.selectedWork.selectedWorkKey,
        selectedWorkTitleRu: payload.selectedWork.selectedTitleRu,
        selectedWorkCategoryKey: payload.selectedWork.selectedCategoryKey,
        selectedWorkCategoryTitleRu: payload.selectedWork.selectedCategoryTitleRu,
        selectedWorkRawInput: payload.selectedWork.rawInput,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      }
    : canonicalCatalogId
      ? {
          selectedCatalogWorkId: canonicalCatalogId,
          selectedWorkKey: payload.workKey,
          selectedWorkTitleRu: payload.workTitle,
          selectedWorkCategoryKey: payload.workCategory,
          selectedWorkCategoryTitleRu: payload.workCategory.replace(/[_-]+/g, " "),
          selectedWorkRawInput: payload.inputText || payload.workTitle,
          selectedWorkSource: "user_selected",
          selectedWorkResolverReGuessed: false,
        }
      : undefined;
}

function admissionVerifiedCanonicalPayloadRow(
  payload: StructuredEstimatePayload,
  row: StructuredEstimatePayload["rows"][number],
): boolean {
  const metadata = payload.canonicalBackend;
  const source = row.sourceParameters ?? {};
  return Boolean(
    metadata?.compilerOwner === "backend"
    && /^[0-9a-f]{64}$/u.test(metadata.checksumSha256)
    && String(source.canonicalBackendRevisionId ?? "").trim() === metadata.revisionId
    && String(source.canonicalBackendReleaseId ?? "").trim() === metadata.releaseId
    && String(source.canonicalBackendCatalogId ?? "").trim() === metadata.catalogId
    && String(source.rowCode ?? "").trim() === String(row.code ?? "").trim()
    && /^[0-9a-f]{64}$/u.test(String(source.rowSha256 ?? "").trim())
    && ["OWNED", "OWNED_EXCLUDED", "MANUAL_SERVER_OWNED", "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL"]
      .includes(String(source.canonicalBackendOwnershipStatus ?? "").trim())
  );
}

function visibleDraftItemTitle(
  payload: StructuredEstimatePayload,
  row: StructuredEstimatePayload["rows"][number],
): string {
  const name = professionalEstimateRowVisibleName(row).trim();
  if (admissionVerifiedCanonicalPayloadRow(payload, row)) return name;
  if (!row.rowNumber) return name;
  if (name.startsWith(`${row.rowNumber} `)) return name;
  return `${row.rowNumber} ${name}`.trim();
}

function itemSourceForRow(row: StructuredEstimatePayload["rows"][number]): ConsumerRepairItemSource {
  if (row.priceTrace?.price_source_type === "price_catalog") return "catalog_item";
  if (row.priceTrace?.price_source_type === "manual_override") return "custom";
  return "reference_price_book";
}

function editablePricePolicyForRow(row: StructuredEstimatePayload["rows"][number]): Pick<
  ConsumerRepairRequestItem,
  "priceStatus" | "priceSource" | "priceSourceId" | "priceSourceLabel"
> {
  const trace = row.priceTrace;
  if (!trace || trace.price_status === "missing" || row.unitPrice == null) {
    return {
      priceStatus: "PRICE_MISSING",
      priceSource: "missing",
      priceSourceId: null,
      priceSourceLabel: trace?.visible_source_label ?? "Источник цены не выбран",
    };
  }
  if (trace.price_source_type === "manual_override") {
    return {
      priceStatus: "USER_PRICE_OVERRIDE",
      priceSource: "user",
      priceSourceId: null,
      priceSourceLabel: trace.visible_source_label,
    };
  }
  if (trace.price_source_type === "price_catalog") {
    return {
      priceStatus: "CATALOG_PRICE_VERIFIED",
      priceSource: "catalog_item",
      priceSourceId: trace.price_source_id,
      priceSourceLabel: trace.visible_source_label,
    };
  }
  if (
    trace.price_source_type === "supplier_pricebook" ||
    trace.price_source_type === "supplier_quote" ||
    trace.price_source_type === "market_listing"
  ) {
    return {
      priceStatus: "PRICEBOOK_VERIFIED",
      priceSource: "pricebook",
      priceSourceId: trace.price_source_id,
      priceSourceLabel: trace.visible_source_label,
    };
  }
  return {
    priceStatus: "REFERENCE_PRICE_ESTIMATE",
    priceSource: "reference_price_book",
    priceSourceId: trace.price_source_id,
    priceSourceLabel: trace.visible_source_label,
  };
}

export function buildStructuredEstimateRequestDraft(
  payload: StructuredEstimatePayload,
  catalogBinding?: EstimateCatalogBindingResult,
): ConsumerRepairAiDraft {
  const dangerous = isDangerousEstimate(payload);
  const bindingByRowId = new Map((catalogBinding?.rows ?? []).map((row) => [row.rowId, row]));
  const parameterRequirementById = new Map(
    (payload.canonicalBackend?.parameterRequirements ?? []).map((requirement) => [
      requirement.parameterId,
      requirement,
    ] as const),
  );
  return {
    titleRu: payload.workTitle,
    summaryRu: formatRequestEstimateSummary(payload.sourceEstimate),
    repairType: payload.workCategory,
    structuredEstimatePayload: payload,
    selectedWork: selectedWorkForRequest(payload),
    estimatePresentation: payload.presentation,
    dangerousDiyBlocked: dangerous,
    safetyMessageRu: dangerous
      ? "\u0420\u0430\u0431\u043e\u0442\u0430 \u043f\u043e\u0432\u044b\u0448\u0435\u043d\u043d\u043e\u0439 \u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438: DIY-\u0438\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u0438 \u043d\u0435 \u0432\u044b\u0434\u0430\u044e\u0442\u0441\u044f. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u0441\u043c\u0435\u0442\u0443 \u043a\u0430\u043a \u043e\u0441\u043d\u043e\u0432\u0443 \u0437\u0430\u044f\u0432\u043a\u0438 \u0434\u043b\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u044c\u043d\u043e\u0433\u043e \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0430."
      : undefined,
    missingData: payload.presentation.clarifyingQuestions,
    items: [
      ...payload.rows.map((row) => {
      const binding = bindingByRowId.get(row.rowId) ?? bindingByRowId.get(row.code || row.rowNumber);
      const pricePolicy = editablePricePolicyForRow(row);
      return {
        itemType: itemTypeFor(row.sectionType),
        titleRu: visibleDraftItemTitle(payload, row),
        quantity: row.quantity,
        unit: row.unit,
        unitLabel: formatEstimateUnitLabel(row.unit),
        unitPrice: row.unitPrice,
        currency: row.currency,
        source: itemSourceForRow(row),
        sourceId: row.priceTrace?.price_source_id ?? row.sourceId,
        sourceLabel: row.priceTrace?.visible_source_label ?? row.visibleSourceLabel,
        formulaId: row.formulaId ?? null,
        quantityFormula: row.quantityFormula ?? null,
        calculationTrace: row.calculationTrace ?? null,
        sourceParameters: row.sourceParameters ?? null,
        templateId: row.templateId ?? null,
        templateVersion: row.templateVersion ?? null,
        normId: row.normId ?? null,
        normFamilyId: row.normFamilyId ?? null,
        normSourceId: row.normSourceId ?? null,
        normSourceTitle: row.normSourceTitle ?? null,
        normVersion: row.normVersion ?? null,
        normReviewStatus: row.normReviewStatus ?? null,
        confidence: row.confidence,
        addedBy: "ai" as const,
        materialKey: row.materialKey ?? null,
        rateKey: row.rateKey ?? null,
        catalogBindingStatus: binding?.bindingStatus ?? (row.sectionType === "materials" ? "no_catalog_match" : "not_material_row"),
        catalogCandidates: binding?.catalogCandidates ?? [],
        selectedCatalogItemId: binding?.selectedCatalogItemId ?? null,
        category: row.sectionType,
        priceStatus: pricePolicy.priceStatus,
        priceSource: pricePolicy.priceSource,
        priceSourceId: pricePolicy.priceSourceId,
        priceSourceLabel: pricePolicy.priceSourceLabel,
        priceTrace: row.priceTrace ?? null,
        priceCandidates: row.priceCandidates ?? [],
        costConfidence: row.costConfidence,
        };
      }),
      ...(payload.canonicalBackend?.preliminaryNeeds ?? []).map((need) => {
        const normalizedCategory = normalizeCanonicalEstimateRowCategory(need.section, need.category);
        const itemType: ConsumerRepairItemType = normalizedCategory === "material"
          ? "material"
          : normalizedCategory === "work"
            ? "work"
            : "service";
        return {
          itemType,
          titleRu: need.titleRu,
          quantity: need.quantity == null ? null : Number(need.quantity),
          unit: need.unitId,
          unitLabel: formatEstimateUnitLabel(need.unitId),
          unitPrice: need.unitPrice == null ? null : Number(need.unitPrice),
          currency: payload.canonicalBackend ? payload.totals.currency : "KGS",
          source: "reference_price_book" as const,
          category: normalizedCategory,
          sourceId: "canonical-definition-preliminary-need",
          sourceLabel: "Предварительная потребность из утверждённого определения",
          formulaId: need.formulaId,
          quantityFormula: null,
          calculationTrace: JSON.stringify(need.calculationTrace),
          sourceParameters: {
            rowCode: need.rowId,
            rowSha256: need.needSha256,
            normativeTrace: need.normativeTrace,
            normativeRowTraceV3: need.normativeTrace,
            canonicalBackendRevisionId: payload.canonicalBackend?.revisionId,
            canonicalBackendReleaseId: payload.canonicalBackend?.releaseId,
            canonicalBackendCatalogId: payload.canonicalBackend?.catalogId,
            canonicalBackendOwnershipStatus: "PRELIMINARY_NEED",
            canonicalPreliminaryNeed: true,
            canonicalPreliminaryNeedState: need.needState,
            missingParameterIds: need.missingParameterIds,
            missingParameterRequirements: need.missingParameterIds.flatMap((parameterId) => {
              const requirement = parameterRequirementById.get(parameterId);
              return requirement ? [requirement] : [];
            }),
            includedInEstimate: need.selected,
            includedInProcurement: false,
            payable: false,
            smartEstimateProjectionV2: {
              progressiveDisclosure: true,
              stage: need.section,
              category: normalizedCategory,
              sourceCategory: need.category,
              initiallyCollapsed: false,
              rowReachable: false,
              preliminaryNeed: true,
              parameterDependencies: need.missingParameterIds,
            },
          },
          priceStatus: "PRICE_MISSING" as const,
          priceSource: "missing" as const,
          priceSourceId: null,
          priceSourceLabel: "Цена применяется после уточнения количества и условий",
          confidence: "medium" as const,
          addedBy: "ai" as const,
          catalogBindingStatus: itemType === "material" ? "no_catalog_match" as const : "not_material_row" as const,
          catalogCandidates: [],
          selectedCatalogItemId: null,
          costConfidence: "missing" as const,
        };
      }),
    ],
  };
}
