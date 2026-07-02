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
  return payload.selectedWork
    ? {
        selectedWorkKey: payload.selectedWork.selectedWorkKey,
        selectedWorkTitleRu: payload.selectedWork.selectedTitleRu,
        selectedWorkCategoryKey: payload.selectedWork.selectedCategoryKey,
        selectedWorkCategoryTitleRu: payload.selectedWork.selectedCategoryTitleRu,
        selectedWorkRawInput: payload.selectedWork.rawInput,
        selectedWorkSource: "user_selected",
        selectedWorkResolverReGuessed: false,
      }
    : undefined;
}

function visibleDraftItemTitle(row: StructuredEstimatePayload["rows"][number]): string {
  const name = row.visibleName.trim();
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
      priceSourceLabel: trace?.visible_source_label ?? "PRICE_MISSING",
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
  return {
    titleRu: payload.workTitle,
    summaryRu: formatRequestEstimateSummary(payload.sourceEstimate),
    repairType: payload.workCategory,
    selectedWork: selectedWorkForRequest(payload),
    estimatePresentation: payload.presentation,
    dangerousDiyBlocked: dangerous,
    safetyMessageRu: dangerous
      ? "\u0420\u0430\u0431\u043e\u0442\u0430 \u043f\u043e\u0432\u044b\u0448\u0435\u043d\u043d\u043e\u0439 \u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438: DIY-\u0438\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u0438 \u043d\u0435 \u0432\u044b\u0434\u0430\u044e\u0442\u0441\u044f. \u0418\u0441\u043f\u043e\u043b\u044c\u0437\u0443\u0439\u0442\u0435 \u0441\u043c\u0435\u0442\u0443 \u043a\u0430\u043a \u043e\u0441\u043d\u043e\u0432\u0443 \u0437\u0430\u044f\u0432\u043a\u0438 \u0434\u043b\u044f \u043f\u0440\u043e\u0444\u0438\u043b\u044c\u043d\u043e\u0433\u043e \u0441\u043f\u0435\u0446\u0438\u0430\u043b\u0438\u0441\u0442\u0430."
      : undefined,
    missingData: payload.presentation.clarifyingQuestions,
    items: payload.rows.map((row) => {
      const binding = bindingByRowId.get(row.rowId) ?? bindingByRowId.get(row.code || row.rowNumber);
      const pricePolicy = editablePricePolicyForRow(row);
      return {
        itemType: itemTypeFor(row.sectionType),
        titleRu: visibleDraftItemTitle(row),
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
  };
}
