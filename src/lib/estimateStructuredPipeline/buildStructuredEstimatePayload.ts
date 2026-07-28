import {
  buildEstimatePresentationViewModel as buildAiEstimatePresentationViewModel,
  validateEstimatePresentationViewModel,
  type EstimatePresentationRow,
  type EstimatePresentationViewModel,
} from "../ai/estimatePresentation";
import {
  resolveEstimateRowPrice,
  validateResolvedEstimatePricing,
  type ResolvedEstimatePrice,
} from "../../features/estimates/pricing/priceResolutionEngine";
import { formatEstimateMoney } from "../ai/globalEstimate/formatEstimateMoney";
import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
import type {
  StructuredEstimateSelectedWorkBinding,
  StructuredEstimatePayload,
  StructuredEstimatePayloadSource,
  StructuredEstimateRow,
  StructuredEstimateSection,
} from "./structuredEstimateTypes";
import {
  isProfessionalEstimateHelperRow,
  professionalEstimateRowVisibleName,
} from "./professionalEstimateRowDisplay";

export function stableStructuredEstimateHash(value: unknown): string {
  let hash = 2166136261;
  const emit = (text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
  };
  const walk = (entry: unknown): boolean => {
    if (Array.isArray(entry)) {
      emit("[");
      entry.forEach((item, index) => {
        if (index > 0) emit(",");
        // Array#join renders an undefined stableStringify result as an empty
        // field. Preserve that legacy byte stream exactly.
        walk(item);
      });
      emit("]");
      return true;
    }
    if (entry && typeof entry === "object") {
      emit("{");
      Object.entries(entry as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([key, item], index) => {
          if (index > 0) emit(",");
          emit(JSON.stringify(key));
          emit(":");
          // Template interpolation in the legacy object serializer emitted
          // the literal word for an undefined property value.
          if (!walk(item)) emit("undefined");
        });
      emit("}");
      return true;
    }
    const serialized = JSON.stringify(entry);
    if (serialized === undefined) return false;
    emit(serialized);
    return true;
  };
  if (!walk(value)) {
    throw new TypeError("STABLE_STRUCTURED_ESTIMATE_HASH_INPUT_UNDEFINED");
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function rowIdFor(row: EstimatePresentationViewModel["rows"][number]): string {
  return [row.sectionType, row.code || row.rowNumber, row.rowNumber]
    .filter(Boolean)
    .join(":");
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function trustedOwnedDomainSourcePrice(
  row: EstimatePresentationViewModel["rows"][number],
  estimate: GlobalEstimateResult,
): ResolvedEstimatePrice | null {
  const ownedDomain =
    estimate.work.workKey === "electrical_area_installation" ||
    estimate.work.workKey === "dynamic_waterproofing_estimate" ||
    estimate.work.workKey === "roof_waterproofing";
  const source = row.sourceEvidence[0];
  const compilerId = row.sourceParameters?.compilerId;
  const quantity = roundQuantity(row.quantity);
  const unitPrice = row.unitPrice;
  const total = roundMoney(row.total);
  if (
    !ownedDomain ||
    compilerId !== "DynamicProfessionalBoqCompiler" ||
    source?.sourceType !== "configured_reference" ||
    !row.sourceId ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0 ||
    !Number.isFinite(total) ||
    total <= 0 ||
    Math.abs(total - roundMoney(quantity * unitPrice)) > 0.01
  ) {
    return null;
  }
  const currency = row.currency || estimate.totals.currency;
  const visibleSourceLabel = row.sourceLabel || source.label;
  const conversion = {
    from_unit: row.unit,
    to_unit: row.unit,
    source_quantity: quantity,
    display_source_quantity: `${quantity} ${row.unit}`,
    source_unit_quantity: null,
    effective_unit_price: unitPrice,
    rounding_policy: "none" as const,
    formula: `${quantity} ${row.unit} x ${unitPrice} / ${row.unit}`,
  };
  const priceValidAt = "2026-07-02T00:00:00+06:00";
  const priceTrace = {
    price_status: "priced" as const,
    price_source_type: "historical_purchase_price" as const,
    price_source_id: row.sourceId,
    currency,
    unit_price: unitPrice,
    price_unit: row.unit,
    price_unit_conversion: conversion,
    price_valid_at: priceValidAt,
    supplier_id: null,
    region: estimate.locale.countryCode,
    city: estimate.locale.city ?? null,
    confidence: "low" as const,
    is_manual_override: false,
    override_reason: null,
    selected_quantity: quantity,
    selected_amount: total,
    effective_unit_price: unitPrice,
    visible_source_label: visibleSourceLabel,
    calculation: `${conversion.formula} = ${total} ${currency}`,
    missing_reason: null,
  };
  return {
    unitPrice,
    total,
    displayUnitPrice: row.displayUnitPrice,
    displayTotal: row.displayTotal,
    currency,
    costConfidence: "low",
    priceTrace,
    priceCandidates: [{
      price_source_type: "historical_purchase_price",
      price_source_id: row.sourceId,
      currency,
      unit_price: unitPrice,
      price_unit: row.unit,
      price_valid_at: priceValidAt,
      supplier_id: null,
      region: estimate.locale.countryCode,
      city: estimate.locale.city ?? null,
      confidence: "low",
      visible_source_label: visibleSourceLabel,
      selected_amount: total,
      effective_unit_price: unitPrice,
      price_unit_conversion: conversion,
    }],
  };
}

function buildRows(
  presentation: EstimatePresentationViewModel,
  estimate: GlobalEstimateResult,
): StructuredEstimateSection[] {
  return presentation.sections.map((section): StructuredEstimateSection => ({
    sectionNumber: section.sectionNumber,
    title: section.title,
    type: section.type,
    rows: section.rows.map((row): StructuredEstimateRow => {
      const visibleName = professionalEstimateRowVisibleName(row);
      const helperRow = isProfessionalEstimateHelperRow({ ...row, visibleName });
      const normBackedMaterialRow = row.sectionType === "materials" &&
        Boolean(row.formulaId) &&
        Boolean(row.templateVersion) &&
        Boolean(row.calculationTrace) &&
        Boolean(row.normId ?? row.sourceParameters?.normId) &&
        Boolean(row.normSourceId ?? row.sourceParameters?.normSourceId);
      const baseRow = {
        rowId: rowIdFor(row),
        code: row.code,
        visibleName,
        quantity: row.quantity,
        unit: row.unit,
        unitPrice: row.unitPrice,
        total: row.total,
        currency: row.currency,
        sourceId: row.sourceId,
        visibleSourceLabel: row.sourceLabel,
        sourceLabel: row.sourceLabel,
        sectionType: row.sectionType,
        rateKey: row.rateKey,
        materialKey: row.materialKey,
        catalogItemId: row.catalogItemId,
      };
      const resolvedPrice =
        trustedOwnedDomainSourcePrice(row, estimate) ??
        resolveEstimateRowPrice(baseRow, {
          currency: row.currency || estimate.totals.currency,
          countryCode: estimate.locale.countryCode,
          region: estimate.locale.countryCode,
          city: estimate.locale.city ?? estimate.locale.stateOrRegion,
        });
      return {
        rowId: baseRow.rowId,
        sectionNumber: row.sectionNumber,
        sectionTitle: row.sectionTitle,
        sectionType: row.sectionType,
        rowNumber: row.rowNumber,
        code: row.code,
        visibleName,
        quantity: row.quantity,
        unit: row.unit,
        displayQuantity: row.displayQuantity,
        unitPrice: resolvedPrice.unitPrice,
        displayUnitPrice: resolvedPrice.displayUnitPrice,
        total: resolvedPrice.total,
        displayTotal: resolvedPrice.displayTotal,
        currency: resolvedPrice.currency,
        confidence: resolvedPrice.costConfidence === "missing" ? "low" : resolvedPrice.costConfidence,
        visibleSourceLabel: resolvedPrice.priceTrace.visible_source_label,
        sourceId: resolvedPrice.priceTrace.price_source_id ?? row.sourceId,
        priceTrace: resolvedPrice.priceTrace,
        priceCandidates: resolvedPrice.priceCandidates,
        costConfidence: resolvedPrice.costConfidence,
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
        rateKey: row.rateKey,
        materialKey: row.materialKey,
        catalogItemId: row.catalogItemId,
        includedInEstimate: row.includedInEstimate,
        includedInProcurement:
          row.sectionType === "materials" &&
          row.includedInEstimate !== false &&
          row.includedInProcurement !== false &&
          (!helperRow || normBackedMaterialRow),
        optional: row.optional,
        editable: row.editable,
        deletedByUser: row.deletedByUser,
      };
    }),
  }));
}

const CONTROL_PAID_ROW_PATTERNS = [
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u0441\u043c\u0435\u0442\u043d/i,
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+\u043a\u0430\u0447\u0435\u0441\u0442\u0432\u0430/i,
  /\u043a\u043e\u043d\u0442\u0440\u043e\u043b\u044c\s+(?:\u0443\u043a\u043b\u043e\u043d|\u0440\u043e\u0432\u043d|\u0433\u0435\u043e\u043c\u0435\u0442\u0440|\u043e\u0442\u043c\u0435\u0442|\u043f\u0440\u043e\u0442\u0435\u0447|\u0433\u0435\u0440\u043c\u0435\u0442)/i,
  /\u043f\u0440\u0438[\u0435\u0451]\u043c\u043a/i,
  /\u0438\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d(?:\u0430\u044f|\u0443\u044e)\s+\u0444\u0438\u043a\u0441\u0430\u0446/i,
] as const;

function formatMoney(value: number, currency: string): string {
  return formatEstimateMoney(value, currency);
}

function isControlPaidRow(row: EstimatePresentationRow): boolean {
  if (row.sectionType !== "labor" && row.sectionType !== "equipment") return false;
  return CONTROL_PAID_ROW_PATTERNS.some((pattern) => pattern.test(row.name));
}

function sumRows(rows: readonly EstimatePresentationRow[], sectionType: EstimatePresentationRow["sectionType"]): number {
  return roundMoney(rows.filter((row) => row.sectionType === sectionType).reduce((sum, row) => sum + row.total, 0));
}

function sumStructuredRows(rows: readonly StructuredEstimateRow[], sectionType: StructuredEstimateRow["sectionType"]): number {
  return roundMoney(rows
    .filter((row) => row.sectionType === sectionType)
    .reduce((sum, row) => sum + (row.total ?? 0), 0));
}

function closeMoney(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.01;
}

function taxableBaseForVisibleRows(params: {
  presentation: EstimatePresentationViewModel;
  materialsTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  deliveryTotal: number;
}): number {
  const originalRows = params.presentation.rows;
  const originalTotals = {
    materials: sumRows(originalRows, "materials"),
    labor: sumRows(originalRows, "labor"),
    equipment: sumRows(originalRows, "equipment"),
    delivery: sumRows(originalRows, "delivery"),
  };
  const originalSubtotal = roundMoney(originalTotals.materials + originalTotals.labor + originalTotals.equipment + originalTotals.delivery);
  const visibleSubtotal = roundMoney(params.materialsTotal + params.laborTotal + params.equipmentTotal + params.deliveryTotal);
  const originalTaxableBase = params.presentation.tax.taxableBase;

  if (originalTaxableBase <= 0 || originalSubtotal <= 0) return 0;
  if (closeMoney(originalTaxableBase, originalTotals.materials)) return params.materialsTotal;
  if (closeMoney(originalTaxableBase, originalTotals.labor)) return params.laborTotal;
  if (closeMoney(originalTaxableBase, originalTotals.equipment)) return params.equipmentTotal;
  if (closeMoney(originalTaxableBase, originalTotals.delivery)) return params.deliveryTotal;
  if (closeMoney(originalTaxableBase, originalSubtotal)) return visibleSubtotal;
  return roundMoney(visibleSubtotal * (originalTaxableBase / originalSubtotal));
}

function withoutControlPaidRows(presentation: EstimatePresentationViewModel): EstimatePresentationViewModel {
  const sections = presentation.sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => !isControlPaidRow(row)),
    }))
    .filter((section) => section.rows.length > 0);
  const rows = sections.flatMap((section) => section.rows);
  if (rows.length === presentation.rows.length) return presentation;

  const materialsTotal = sumRows(rows, "materials");
  const laborTotal = sumRows(rows, "labor");
  const equipmentTotal = sumRows(rows, "equipment");
  const deliveryTotal = sumRows(rows, "delivery");
  const taxableBase = taxableBaseForVisibleRows({ presentation, materialsTotal, laborTotal, equipmentTotal, deliveryTotal });
  const taxTotal = presentation.tax.included || !presentation.tax.taxRate ? 0 : roundMoney(taxableBase * presentation.tax.taxRate);
  const grandTotal = roundMoney(materialsTotal + laborTotal + equipmentTotal + deliveryTotal + taxTotal);
  const currency = presentation.totals.currency;

  return {
    ...presentation,
    sections,
    rows,
    totals: {
      ...presentation.totals,
      materialsTotal,
      laborTotal,
      equipmentTotal,
      deliveryTotal,
      taxTotal,
      grandTotal,
      displayMaterialsTotal: formatMoney(materialsTotal, currency),
      displayLaborTotal: formatMoney(laborTotal, currency),
      displayTaxTotal: formatMoney(taxTotal, currency),
      displayGrandTotal: formatMoney(grandTotal, currency),
    },
    tax: {
      ...presentation.tax,
      taxableBase,
      taxAmount: taxTotal,
    },
  };
}

function withCanonicalVisibleRowNames(
  presentation: EstimatePresentationViewModel,
): EstimatePresentationViewModel {
  let changed = false;
  const sections = presentation.sections.map((section) => ({
    ...section,
    rows: section.rows.map((row) => {
      const name = professionalEstimateRowVisibleName(row);
      if (name === row.name) return row;
      changed = true;
      return { ...row, name };
    }),
  }));
  if (!changed) return presentation;
  return {
    ...presentation,
    sections,
    rows: sections.flatMap((section) => section.rows),
  };
}

export function buildStructuredEstimatePayload(
  estimate: GlobalEstimateResult,
  input: {
    source?: StructuredEstimatePayloadSource;
    presentation?: EstimatePresentationViewModel;
    selectedWork?: StructuredEstimateSelectedWorkBinding;
  } = {},
): StructuredEstimatePayload {
  if (!estimate || estimate.outputContract?.format !== "professional_boq") {
    throw new Error("STRUCTURED_ESTIMATE_PAYLOAD_REQUIRES_PROFESSIONAL_BOQ_GLOBAL_ESTIMATE_RESULT");
  }
  const rawPresentation = input.presentation ?? buildAiEstimatePresentationViewModel(estimate);
  const governedPresentation = input.selectedWork
    ? withoutControlPaidRows(rawPresentation)
    : rawPresentation;
  const presentation = withCanonicalVisibleRowNames(governedPresentation);
  const validation = validateEstimatePresentationViewModel(presentation);
  if (!validation.passed) {
    throw new Error(`STRUCTURED_ESTIMATE_PRESENTATION_INVALID:${validation.failures.join("|")}`);
  }
  const sections = buildRows(presentation, estimate);
  const rows = sections.flatMap((section) => section.rows);
  const pricingValidation = validateResolvedEstimatePricing(rows);
  if (!pricingValidation.passed) {
    throw new Error(`STRUCTURED_ESTIMATE_PRICING_INVALID:${pricingValidation.failures.join("|")}`);
  }
  const procurementRows = rows.filter((row) => row.includedInProcurement && !row.deletedByUser);
  const missingPriceRowsCount = rows.filter((row) => row.unitPrice == null || row.total == null || row.priceTrace?.price_status === "missing").length;
  const pricedRows = rows.filter((row) => row.unitPrice != null && row.total != null);
  const allPricedRowsHaveSource = pricedRows.every((row) => Boolean(row.priceTrace?.price_source_id));
  const materialsTotal = sumStructuredRows(rows, "materials");
  const laborTotal = sumStructuredRows(rows, "labor");
  const equipmentTotal = sumStructuredRows(rows, "equipment");
  const deliveryTotal = sumStructuredRows(rows, "delivery");
  const pricedSubtotal = roundMoney(materialsTotal + laborTotal + equipmentTotal + deliveryTotal);
  const originalSubtotal = roundMoney(
    sumRows(presentation.rows, "materials") +
      sumRows(presentation.rows, "labor") +
      sumRows(presentation.rows, "equipment") +
      sumRows(presentation.rows, "delivery"),
  );
  const taxableRatio = originalSubtotal > 0 && presentation.tax.taxableBase > 0
    ? Math.min(1, presentation.tax.taxableBase / originalSubtotal)
    : 0;
  const taxableBase = roundMoney(pricedSubtotal * taxableRatio);
  const taxTotal = presentation.tax.included || !presentation.tax.taxRate ? 0 : roundMoney(taxableBase * presentation.tax.taxRate);
  const pricedTotals = {
    ...presentation.totals,
    materialsTotal,
    laborTotal,
    equipmentTotal,
    deliveryTotal,
    taxTotal,
    grandTotal: roundMoney(pricedSubtotal + taxTotal),
    displayMaterialsTotal: formatMoney(materialsTotal, presentation.totals.currency),
    displayLaborTotal: formatMoney(laborTotal, presentation.totals.currency),
    displayTaxTotal: formatMoney(taxTotal, presentation.totals.currency),
    displayGrandTotal: formatMoney(roundMoney(pricedSubtotal + taxTotal), presentation.totals.currency),
  };
  const pricedTax = {
    ...presentation.tax,
    taxableBase,
    taxAmount: taxTotal,
  };
  const fingerprint = stableStructuredEstimateHash({
    estimateId: estimate.estimateId,
    workKey: estimate.work.workKey,
    selectedWorkKey: input.selectedWork?.selectedWorkKey,
    rows: rows.map((row) => ({
      rowId: row.rowId,
      visibleName: row.visibleName,
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unitPrice,
      total: row.total,
      currency: row.currency,
      priceTrace: row.priceTrace,
      costConfidence: row.costConfidence,
      formulaId: row.formulaId,
      quantityFormula: row.quantityFormula,
      calculationTrace: row.calculationTrace,
      sourceParameters: row.sourceParameters,
      templateId: row.templateId,
      templateVersion: row.templateVersion,
      normId: row.normId,
      normSourceId: row.normSourceId,
      normVersion: row.normVersion,
      includedInEstimate: row.includedInEstimate,
      includedInProcurement: row.includedInProcurement,
      optional: row.optional,
      editable: row.editable,
      deletedByUser: row.deletedByUser,
    })),
    totals: pricedTotals,
  });

  return {
    version: "structured-estimate-v1",
    id: estimate.estimateId,
    source: input.source ?? "ai_estimate",
    inputText: estimate.input.originalText ?? presentation.originalText ?? estimate.work.title,
    estimateId: estimate.estimateId,
    workKey: estimate.work.workKey,
    workTitle: presentation.workTitle,
    workCategory: presentation.workCategory,
    selectedWork: input.selectedWork,
    locale: estimate.locale,
    sourceEstimate: estimate,
    classification: {
      status: "accepted",
      workKey: estimate.work.workKey,
      domainKey: estimate.work.category,
      titleRu: presentation.workTitle,
      confidence: estimate.confidence === "high" ? 1 : estimate.confidence === "medium" ? 0.75 : 0.5,
      evidence: estimate.sources,
    },
    quantity: {
      status: Number.isFinite(estimate.input.volume) && estimate.input.volume > 0 ? "accepted" : "missing",
      quantity: estimate.input.volume,
      unit: estimate.input.unit,
      measurementKind: estimate.input.unit,
      dimensions: estimate.input.dimensions,
      assumptions: estimate.assumptions,
    },
    boq: {
      sections,
      totals: {
        subtotal: pricedSubtotal,
        pricedSubtotal,
        missingPriceRowsCount,
        allPricedRowsHaveSource,
        currency: estimate.totals.currency,
        manualPriceRequired: missingPriceRowsCount > 0,
      },
    },
    presentation,
    pdf: {
      rows: presentation.rows,
      tableFormat: true,
      noMojibakeRequired: true,
    },
    catalogBinding: {
      searchLabels: procurementRows.map((row) => ({
        rowId: row.rowId,
        visibleQueryRu: row.visibleName,
        internalKey: row.materialKey,
        internalKeyVisible: false,
      })),
    },
    assumptions: estimate.assumptions,
    clarifications: estimate.clarifyingQuestions,
    risks: estimate.regionalRisks.map((risk) => risk.text || risk.title),
    debug: {
      workKey: estimate.work.workKey,
      materialKeys: procurementRows.map((row) => row.materialKey).filter((key): key is string => Boolean(key)),
    },
    sections,
    rows,
    totals: pricedTotals,
    tax: pricedTax,
    fingerprint,
    visiblePolicy: {
      noInternalKeysVisible: true,
      noGenericRowsVisible: true,
      controlRowsAreNotPaidItems: true,
      uiPdfSameRows: true,
    },
    fakeGreenClaimed: false,
  };
}
