import type {
  EstimatePdfInput,
  EstimatePdfSectionViewModel,
  EstimatePdfViewModel,
} from "../estimatePdf/estimatePdfTypes";
import type { StructuredEstimatePayload } from "./structuredEstimateTypes";

function percent(rate: number | undefined): string | undefined {
  if (rate === undefined) return undefined;
  return `${Math.round(rate * 10000) / 100}%`;
}

function sourceLabel(rowSource: string | undefined): string {
  return rowSource && rowSource.trim() ? rowSource.trim() : "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0441\u0442\u0430\u0432\u043e\u043a";
}

function requestMetaFields(input: EstimatePdfInput, payload: StructuredEstimatePayload): EstimatePdfViewModel["requestMetaFields"] {
  const details = input.requestDetails;
  const address = [details?.city, details?.addressText].map((value) => String(value ?? "").trim()).filter(Boolean).join(", ");
  return [
    { label: "\u0414\u0430\u0442\u0430", value: details?.approvedAt ?? details?.createdAt ?? input.generatedAt },
    { label: "\u0420\u0430\u0431\u043e\u0442\u0430", value: payload.workTitle },
    details?.status ? { label: "\u0421\u0442\u0430\u0442\u0443\u0441", value: details.status } : null,
    details?.repairType ? { label: "\u0422\u0438\u043f", value: details.repairType } : null,
    address ? { label: "\u0410\u0434\u0440\u0435\u0441", value: address } : null,
    details?.preferredTimeText ? { label: "\u041a\u043e\u0433\u0434\u0430 \u0443\u0434\u043e\u0431\u043d\u043e", value: details.preferredTimeText } : null,
    details?.contactPhone ? { label: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442", value: details.contactPhone } : null,
    typeof details?.attachmentsCount === "number" ? { label: "\u0412\u043b\u043e\u0436\u0435\u043d\u0438\u044f", value: String(details.attachmentsCount) } : null,
  ].filter((field): field is { label: string; value: string } => Boolean(field?.value));
}

export function buildStructuredEstimatePdfViewModel(
  payload: StructuredEstimatePayload,
  input: Omit<EstimatePdfInput, "estimate"> & { estimate?: EstimatePdfInput["estimate"] },
): EstimatePdfViewModel {
  const sections: EstimatePdfSectionViewModel[] = payload.sections.map((section) => ({
    sectionNumber: section.sectionNumber,
    title: section.title,
    type: section.type,
    rows: section.rows.map((row) => ({
      rowNumber: row.rowNumber,
      sectionTitle: section.title,
      name: row.visibleName,
      quantity: row.displayQuantity,
      unitPrice: row.displayUnitPrice,
      total: row.displayTotal,
      sourceLabels: [sourceLabel(row.visibleSourceLabel)],
      confidence: row.confidence,
    })),
  }));

  return {
    estimateId: payload.estimateId,
    title: `\u0421\u043c\u0435\u0442\u0430: ${payload.workTitle}`,
    workKey: payload.workKey,
    workTitle: payload.workTitle,
    generatedAt: input.generatedAt,
    language: input.language,
    originalText: payload.presentation.originalText,
    requestMetaFields: requestMetaFields({ ...input, estimate: payload.sourceEstimate }, payload),
    sections,
    totals: {
      materials: payload.totals.displayMaterialsTotal,
      labor: payload.totals.displayLaborTotal,
      tax: payload.totals.displayTaxTotal,
      grand: payload.totals.displayGrandTotal,
    },
    tax: {
      label: payload.tax.taxLabel,
      rate: percent(payload.sourceEstimate.tax.taxRate),
      included: payload.tax.included,
      amount: payload.totals.displayTaxTotal,
      warning: payload.tax.warning,
    },
    assumptions: payload.presentation.assumptions,
    costIncreaseFactors: payload.presentation.costIncreaseFactors,
    clarifyingQuestions: payload.presentation.clarifyingQuestions,
    sources: payload.presentation.sourceLabels,
    runtimeTrace: {
      ...(input.runtimeTrace ?? {}),
      traceId: input.runtimeTrace?.traceId,
      selectedRoute: input.runtimeTrace?.selectedRoute,
      selectedTool: "structured_estimate_payload",
      structuredPayloadFingerprint: payload.fingerprint,
      workKey: payload.workKey,
    },
  };
}
