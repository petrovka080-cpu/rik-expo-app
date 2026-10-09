import pack from '../../../../data/estimate-benchmarks/source-packs/water-valtec-ppr20-known-zero-s27-48.json';
import { compileCanonicalEstimateCore } from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { VALTEC_MIXED_ENDPOINTS_S2747_PARAMETERS as parameters, VALTEC_MIXED_ENDPOINTS_S2747_FORMULAS as formulas,
    VALTEC_MIXED_ENDPOINTS_S2747_RESOURCES as previous, VALTEC_MIXED_ENDPOINTS_S2747_RUNTIME_INPUT as runtime } from './waterValtecPpr20MixedEndpointsS2747';

export const VALTEC_KNOWN_ZERO_S2748 = pack;
export const VALTEC_KNOWN_ZERO_S2748_SOURCE_PACK_SHA256 = '2a222ebb738ac336b1a0ef3c7206d2edf6de3c093bff58d69506ab84129d3109';
export const VALTEC_KNOWN_ZERO_S2748_PARAMETERS = parameters;
export const VALTEC_KNOWN_ZERO_S2748_FORMULAS = formulas;
export const VALTEC_KNOWN_ZERO_S2748_RUNTIME_INPUT = runtime;
export const VALTEC_KNOWN_ZERO_S2748_RESOURCES = previous.map(resource => {
    if (!pack.rowIds.includes(resource.row_id)) return resource;
    const { row_sha256: _previousHash, ...definition } = resource;
    const updated = { ...definition, resource_graph: { ...resource.resource_graph, excludeKnownZeroQuantityV1: true },
        source_metadata: { ...resource.source_metadata, knownZeroSourcePackSha256: VALTEC_KNOWN_ZERO_S2748_SOURCE_PACK_SHA256 } };
    return { ...updated, row_sha256: estimateDeterministicHash(updated) };
});
export async function compileWaterValtecPpr20KnownZeroS2748(submittedParameters: Record<string, unknown>, options: {
    confirmedParameters?: Record<string, unknown>;
    rowOverrides?: Parameters<typeof compileCanonicalEstimateCore>[0]['rowOverrides'];
} = {}) {
    return compileCanonicalEstimateCore({ operation: options.confirmedParameters || options.rowOverrides ? 'recalculate' : 'compile',
        compilerVersion: 'canonical-estimate-compiler.water-valtec-known-zero.s2748.v1', catalogId: 'canonical-work:base:plumbing_interior_ppr_pipe_install_standard',
        primaryMeasureParameterId: 'route_length_m', parameterDefinitions: [...parameters], formulaDefinitions: [...formulas],
        resourceDefinitions: VALTEC_KNOWN_ZERO_S2748_RESOURCES, confirmedParameters: { ...runtime, ...options.confirmedParameters },
        submittedParameters, rowOverrides: options.rowOverrides, currencyCode: 'KGS', priceItems: [],
        maximumResourceRows: VALTEC_KNOWN_ZERO_S2748_RESOURCES.length, hashJson: value => estimateDeterministicHash(value) });
}
