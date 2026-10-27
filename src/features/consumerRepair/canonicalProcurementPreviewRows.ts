import type { ConsumerRepairRequestItem } from '../../lib/consumerRequests/consumerRequestTypes';
import type { EstimateDraftRevision } from '../../lib/estimate/estimateDraftRevisionContract';
import { canonicalPublicEstimateRowNameRu, canonicalPublicEstimateWorkTitleRu, canonicalPublicEstimateOperationReferenceRu } from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import { canonicalPublicResourceDisplayPresentationV1 } from '../../lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import { canonicalMaterialQuantityBasisFromRow } from '../../lib/estimate/backendPlatform/canonicalMaterialQuantityProjection';
import { canonicalArtifactPurchaseBalance, canonicalArtifactPurchaseRequirement } from '../../lib/estimate/backendPlatform/canonicalPersistedPurchaseBalance';
import { formatEstimateQuantityRu } from '../../lib/estimatePresentation/formatEstimateQuantityRu';
import { publicBoqDisplayNameRu } from '../../lib/estimate/publicBoqNaming';
import { formatEstimateUnitLabel } from '../../lib/ai/globalEstimate/formatEstimateUnitLabel';
import { canonicalPurchaseSupplyWarningV1, parseCanonicalExactPurchaseQuantityV1 } from '../../lib/estimate/backendPlatform/canonicalPurchaseSupplyReadinessV1';
import { canonicalEstimateOperationReference, canonicalEstimateResourceOperationSections,
  type CanonicalEstimateOperationReference } from '../../lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

export type CanonicalProcurementPreviewRow = {
  rowId: string;
  titleRu: string;
  quantity: number | string | null;
  preliminary?: boolean;
  supplyBlocked?: boolean;
  unit: string;
  unitPrice: number | null;
  currency: string;
  quantityDetails: string[];
  operation?: CanonicalEstimateOperationReference;
};

function operationMetadata(source: Record<string, unknown> | null | undefined) {
  const operation = canonicalPublicEstimateOperationReferenceRu(canonicalEstimateOperationReference(source?.canonicalOperationComposition));
  return operation ? { operation } : {};
}

/** Keep the saved graph's full presence context, then show only purchasing
 * owners and their references. A shared material never becomes another order. */
export function buildCanonicalProcurementPreviewSections(
  revision: EstimateDraftRevision | null,
  rows: readonly CanonicalProcurementPreviewRow[],
  items: readonly ConsumerRepairRequestItem[] = [],
) {
  const purchasingIds = new Set(rows.map(row => row.rowId));
  const resources = new Map((revision?.boq.rows ?? []).map(row => [row.rowId, {
    rowId: row.rowId, titleRu: row.titleRu, operation: row.sourceParameters?.canonicalOperationComposition,
  }]));
  for (const item of items) if (revision && item.sourceParameters?.canonicalBackendRevisionId === revision.revisionId) {
    const rowId = String(item.sourceParameters.rowCode ?? item.id);
    if (!resources.has(rowId)) resources.set(rowId, {
      rowId, titleRu: item.titleRu, operation: item.sourceParameters.canonicalOperationComposition,
    });
  }
  for (const row of rows) resources.set(row.rowId, { rowId: row.rowId, titleRu: row.titleRu, operation: row.operation });
  return canonicalEstimateResourceOperationSections([...resources.values()]).map(section => ({
    ...section,
    operation: canonicalPublicEstimateOperationReferenceRu(section.operation),
    resourceIds: section.resourceIds.filter(id => purchasingIds.has(id)),
    sharedResources: section.sharedResources.filter(resource => purchasingIds.has(resource.rowId)).map(resource => ({ ...resource,
      ownerOperationTitleRu: canonicalPublicEstimateWorkTitleRu(resource.ownerOperationTitleRu),
    })),
  })).filter(section => section.resourceIds.length > 0 || section.sharedResources.length > 0);
}

function supplyWarning(rowId: string, unit: unknown, titleRu: string, source: Record<string, unknown> | null | undefined): string | null {
  return canonicalPurchaseSupplyWarningV1({ row_id: rowId, unit_id: unit, title_ru: titleRu,
    calculation_trace: { purchaseSupplyBlocksV1: source?.canonicalPurchaseSupplyBlocksV1 } });
}

function exactQuantity(source: Record<string, unknown> | null | undefined, fallback: number | string | null): number | string | null {
  const saved = parseCanonicalExactPurchaseQuantityV1(source?.canonicalExactPurchaseQuantityV1);
  return saved ? saved.quantityText : fallback;
}

export function buildCanonicalProcurementPreviewRows(
  revision: EstimateDraftRevision | null,
  items: readonly ConsumerRepairRequestItem[] = [],
): CanonicalProcurementPreviewRow[] {
  if (!revision) return [];
  const rows: CanonicalProcurementPreviewRow[] = revision.boq.rows
    .filter((row) => row.includedInProcurement || supplyWarning(row.rowId, row.unit, row.titleRu, row.sourceParameters) != null)
    .map((row) => {
      const manualTitleOverride = row.sourceParameters?.canonicalManualTitleOverride === true;
      const presentation = canonicalPublicResourceDisplayPresentationV1({ rowId: row.rowId, titleRu: row.titleRu,
        descriptor: row.sourceParameters?.canonicalPublicResourcePresentationV1, manualTitleOverride });
      const titleRu = canonicalPublicEstimateRowNameRu({ rowId: row.rowId, sourceTitleRu: row.titleRu,
        titleRu: manualTitleOverride ? row.titleRu : presentation?.nameRu
          ?? publicBoqDisplayNameRu({ sourceNameRu: row.titleRu, rowType: row.rowType }), manualTitleOverride });
      const warning = supplyWarning(row.rowId, row.unit, titleRu, row.sourceParameters);
      if (warning) return { rowId: row.rowId, titleRu, quantity: null, preliminary: true, supplyBlocked: true,
        ...operationMetadata(row.sourceParameters),
        unit: formatEstimateUnitLabel(row.unitLabel ?? row.unit), unitPrice: row.unitPrice ?? null,
        currency: row.currency, quantityDetails: [warning] };
      const balance = canonicalArtifactPurchaseBalance({
        row_id: row.rowId, unit_id: row.unit,
        calculation_trace: { purchaseBalance: row.sourceParameters?.canonicalPurchaseBalance },
      });
      const quantityBasis = balance ? null : row.materialQuantity ?? canonicalMaterialQuantityBasisFromRow(row);
      const unit = formatEstimateUnitLabel(balance?.unitId ?? quantityBasis?.procurementUnit ?? row.unitLabel ?? row.unit);
      const orderScope = balance?.balanceScope === "new_order_vs_required_consumption";
      const quantityDetails = balance ? [
        `${orderScope ? balance.requirementBasis === "selected_supply_order" ? "Исходная потребность к заказу" : "Плановая потребность" : "Расход"}: ${formatEstimateQuantityRu(balance.netQuantity)} ${unit}`,
        ...(!orderScope ? [
          `В наличии: ${formatEstimateQuantityRu(balance.stock)} ${unit}`,
          `Сохраняемый резерв: ${formatEstimateQuantityRu(balance.reserve)} ${unit}`,
          `Остаток после расхода: ${formatEstimateQuantityRu(balance.remaining)} ${unit}`,
        ] : []),
        ...(balance.quantum ? [`Шаг поставки: ${formatEstimateQuantityRu(balance.quantum)} ${unit}`] : []),
      ] : quantityBasis ? [
        `Расход с учётом потерь: ${formatEstimateQuantityRu(quantityBasis.grossQuantity)} ${formatEstimateUnitLabel(quantityBasis.unit)}`,
        `Шаг поставки: ${formatEstimateQuantityRu(quantityBasis.procurementPackageSize)} ${unit}`,
      ] : [];
      return {
        rowId: row.rowId,
        ...operationMetadata(row.sourceParameters),
        titleRu,
        quantity: exactQuantity(row.sourceParameters, balance?.effectiveOrder ?? quantityBasis?.procurementQuantity ?? row.quantity),
        unit,
        unitPrice: row.unitPrice ?? null,
        currency: row.currency,
        quantityDetails,
      };
    });
  const includedIds = new Set(rows.map(row => row.rowId));
  for (const item of items) {
    const source = item.sourceParameters;
    if (source?.canonicalPreliminaryNeed !== true || source.canonicalBackendRevisionId !== revision.revisionId) continue;
    const rowId = String(source.rowCode ?? item.id);
    if (includedIds.has(rowId)) continue;
    const titleRu = canonicalPublicEstimateRowNameRu({ rowId, titleRu: item.titleRu,
      manualTitleOverride: source.canonicalManualTitleOverride === true });
    const warning = supplyWarning(rowId, item.unit, titleRu, source);
    if (warning) {
      rows.push({ rowId, titleRu, quantity: null, preliminary: true, supplyBlocked: true,
        ...operationMetadata(source),
        unit: formatEstimateUnitLabel(item.unit), unitPrice: item.unitPrice ?? null, currency: item.currency,
        quantityDetails: [warning] });
      includedIds.add(rowId);
      continue;
    }
    if (source.includedInProcurement !== true) continue;
    const requirement = canonicalArtifactPurchaseRequirement({ row_id: rowId, unit_id: item.unit,
      calculation_trace: { purchaseRequirementV1: source.canonicalPurchaseRequirement } });
    rows.push({ rowId, titleRu: canonicalPublicEstimateRowNameRu({ rowId, titleRu: item.titleRu,
      manualTitleOverride: source.canonicalManualTitleOverride === true }), quantity: exactQuantity(source, item.quantity ?? null), preliminary: true,
      ...operationMetadata(source),
      unit: formatEstimateUnitLabel(item.unit), unitPrice: item.unitPrice ?? null, currency: item.currency,
      quantityDetails: requirement ? [`${requirement.labelRu}: ${formatEstimateQuantityRu(requirement.quantity)} ${formatEstimateUnitLabel(requirement.unitId)}`] : [],
    });
    includedIds.add(rowId);
  }
  return rows;
}

