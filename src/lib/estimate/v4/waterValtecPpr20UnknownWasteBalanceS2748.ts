import pack from '../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-unknown-waste-balance-s27-48.json';
import { compileCanonicalEstimateCore } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { VALTEC_SOURCE_APPLICABILITY_S2748_PARAMETERS as parameters, VALTEC_SOURCE_APPLICABILITY_S2748_FORMULAS as formulas,
    VALTEC_SOURCE_APPLICABILITY_S2748_RESOURCES as previousResources, VALTEC_SOURCE_APPLICABILITY_S2748_RUNTIME_INPUT as runtime } from './waterValtecPpr20SourceApplicabilityS2748';

export const VALTEC_UNKNOWN_WASTE_BALANCE_S2748 = pack;
export const VALTEC_UNKNOWN_WASTE_BALANCE_S2748_SHA256 = '24f274dfb26f642844bc9aca82ed2c7bcbf33ff3a77a922a8f122e35f9185172';
export const VALTEC_UNKNOWN_WASTE_BALANCE_S2748_RESOURCES = previousResources.map(resource => {
    if (resource.row_id !== pack.affectedRowId) return resource;
    const { row_sha256: _oldHash, ...definition } = resource;
    const graph = definition.resource_graph;
    const balance = graph.purchaseBalanceV1 as Record<string, unknown>;
    const updated = { ...definition, resource_graph: { ...graph, purchaseBalanceV1: { ...balance,
        consumedExpression: pack.unresolvedParameterId, plannedConsumptionExpression: pack.unresolvedParameterId } },
        source_metadata: { ...definition.source_metadata, unknownWasteBalanceSha256: VALTEC_UNKNOWN_WASTE_BALANCE_S2748_SHA256 } };
    return { ...updated, row_sha256: estimateDeterministicHash(updated) };
});

export async function compileWaterValtecUnknownWasteBalanceS2748(submittedParameters: Record<string, unknown>, options: {
    rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides'];
} = {}) {
    return compileCanonicalEstimateCore({ operation: options.rowOverrides ? 'recalculate' : 'compile',
        compilerVersion: pack.contract, catalogId: pack.catalogId, primaryMeasureParameterId: 'route_length_m',
        parameterDefinitions: parameters, formulaDefinitions: formulas, resourceDefinitions: VALTEC_UNKNOWN_WASTE_BALANCE_S2748_RESOURCES,
        submittedParameters, confirmedParameters: runtime, rowOverrides: options.rowOverrides,
        currencyCode: 'KGS', priceItems: [], maximumResourceRows: VALTEC_UNKNOWN_WASTE_BALANCE_S2748_RESOURCES.length,
        hashJson: estimateDeterministicHash });
}
