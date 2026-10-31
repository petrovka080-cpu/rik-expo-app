import type { ForemanDraftEstimateRow } from '../../lib/foremanAiEstimate/foremanAiEstimateContracts';
import { formatEstimateUnitLabel } from '../../lib/ai/globalEstimate/formatEstimateUnitLabel';
import { consumerEstimateScopeStatusIsOpen, isConsumerEstimateCompositionVisibleItem } from '../../lib/consumerRequests/consumerEstimateReadiness';
import { canonicalScopeRequirementDecisionV1 } from '../../lib/estimate/backendPlatform/canonicalScopeRequirementV1';
import { canonicalPublicResourceDisplayPresentationV1 } from '../../lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import { consumerRepairRowIsNonPayable, consumerRepairRowIsTechnicalDetail } from './consumerRepairRowMetadata';

/** Count persisted physical quantities independently of outstanding source or
 * condition checks. A known preliminary need is not a missing quantity. */
export function canonicalPreviewQuantityCounts(input: {
    calculatedRowIds: readonly string[];
    preliminaryNeeds: readonly {
        rowId: string;
        quantity?: unknown;
        needState?: unknown;
        scopeRequirementDecision?: unknown;
    }[];
}): {
    knownQuantityCount: number;
    missingQuantityCount: number;
    preliminaryNeedCount: number;
} {
    const known = new Set(input.calculatedRowIds);
    const missing = new Set<string>();
    const outstanding = new Set<string>();
    for (const need of input.preliminaryNeeds) {
        const scope = need.needState === 'QUANTITY_REQUIRED' ? null
            : canonicalScopeRequirementDecisionV1(need.scopeRequirementDecision);
        if (scope?.rowId === need.rowId) {
            if (consumerEstimateScopeStatusIsOpen(scope.status)) outstanding.add(need.rowId);
            continue;
        }
        outstanding.add(need.rowId);
        const quantity = need.quantity;
        if ((typeof quantity === 'number' || typeof quantity === 'string')
            && String(quantity).trim() !== '' && Number.isFinite(Number(quantity)))
            known.add(need.rowId);
        else if (!known.has(need.rowId))
            missing.add(need.rowId);
    }
    for (const id of known)
        missing.delete(id);
    return { knownQuantityCount: known.size, missingQuantityCount: missing.size,
        preliminaryNeedCount: outstanding.size };
}

type PreviewCalculatedRow = Pick<ForemanDraftEstimateRow, 'rowId' | 'visibleName' | 'quantity' | 'unit'> & {
    structuredRow: Pick<ForemanDraftEstimateRow['structuredRow'],
        'quantity' | 'unitPrice' | 'includedInEstimate' | 'sourceParameters' | 'calculationTrace'>;
};

/** Like the saved summary, lead with cost-bearing resources. All other rows
 * remain in the full editor and quantity count. Explicit edits stay visible. */
export function canonicalPreviewPublicRows(rows: readonly PreviewCalculatedRow[]) {
    return rows.filter(row => {
        const item = { ...row.structuredRow, titleRu: row.visibleName };
        const source = item.sourceParameters;
        const explicitResource = source?.includedInEstimate === true || source?.includedInProcurement === true
            || item.unitPrice != null || source?.canonicalManualTitleOverride === true || source?.manualQuantityOverride === true;
        return isConsumerEstimateCompositionVisibleItem(item) && Number.isFinite(row.quantity)
            && (explicitResource || (!consumerRepairRowIsNonPayable(item) && !consumerRepairRowIsTechnicalDetail(item)));
    })
        .slice(0, 4).map(row => {
            const presentation = canonicalPublicResourceDisplayPresentationV1({ rowId: row.rowId, titleRu: row.visibleName,
                descriptor: row.structuredRow.sourceParameters?.canonicalPublicResourcePresentationV1,
                manualTitleOverride: row.structuredRow.sourceParameters?.canonicalManualTitleOverride === true });
            return { id: row.rowId, titleRu: presentation?.nameRu ?? row.visibleName,
                quantity: row.quantity, unit: formatEstimateUnitLabel(row.unit.trim() || 'ед.') };
        });
}
